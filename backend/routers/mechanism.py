"""
ChemClash — Mechanism Router  (v2 — fast-path + streaming + pre-fetch)

Endpoints
---------
POST /api/evaluate-mechanism   → instant rule-based verdict (<1ms), async LLM fallback
GET  /api/hint/stream          → SSE stream of Socratic hint tokens
GET  /api/challenges/prefetch  → batch of pre-built challenge payloads
GET  /api/challenges/{id}      → single challenge by id
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from fast_validator import evaluate_fast, Verdict
from challenge_bank import get_batch, get_challenge, CHALLENGES
from llm_client import evaluate_move  # module-level so tests can patch it
from config import OPENAI_API_KEY, _NO_KEY

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────────

class MechanismMoveRequest(BaseModel):
    source: str = Field(..., min_length=1, max_length=120)
    target: str = Field(..., min_length=1, max_length=120)

    @field_validator("source", "target", mode="before")
    @classmethod
    def normalise(cls, v: str) -> str:
        return str(v).strip().lower()


class MechanismMoveResponse(BaseModel):
    status: str
    hint: str
    explanation: str
    source: str
    target: str
    cached: bool
    latency_ms: float


# ── POST /api/evaluate-mechanism ─────────────────────────────────────────────

@router.post("/evaluate-mechanism", response_model=MechanismMoveResponse)
async def evaluate_mechanism(payload: MechanismMoveRequest) -> MechanismMoveResponse:
    """
    Fast-path rule-based evaluation (<1 ms).
    Falls back to LLM only if no rule matches AND an API key is configured.

    Error contract:
      • 422  — request validation failure (Pydantic, handled by FastAPI)
      • 502  — LLM returned a response we could not parse (ValueError)
      • 503  — LLM service is unreachable or timed out (RuntimeError / OSError)
      • 200  — all other cases (fast-validator hit, or no key configured)
    """
    t0 = time.perf_counter()

    # 1. Try the rule-based fast path (always works, no API key needed)
    verdict = evaluate_fast(source=payload.source, target=payload.target)

    if verdict is None:
        # 2. No rule matched — use LLM if a key is present, else safe default
        if OPENAI_API_KEY and OPENAI_API_KEY not in _NO_KEY:
            try:
                raw = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: evaluate_move(payload.source, payload.target)
                )
            except ValueError as exc:
                # LLM replied but the response could not be parsed as valid JSON/schema
                logger.warning("LLM parse error: %s", exc)
                raise HTTPException(status_code=502, detail="LLM returned an unparseable response") from exc
            except (RuntimeError, OSError, Exception) as exc:  # noqa: BLE001
                # Distinguish service errors (RuntimeError/OSError) from unexpected bugs.
                # We re-raise RuntimeError/OSError as 503; anything else propagates normally.
                if isinstance(exc, (RuntimeError, OSError)):
                    logger.warning("LLM service error: %s", exc)
                    raise HTTPException(status_code=503, detail="LLM service is unavailable") from exc
                raise  # unexpected programming error — do not hide it

            verdict = Verdict(
                status=raw.get("status", "pass"),
                hint=raw.get("hint", ""),
                explanation=raw.get("explanation", ""),
                cached=False,
            )
        else:
            # No API key configured — return a safe informational default
            verdict = Verdict(
                status="pass",
                hint="Interesting move — think about electron flow carefully.",
                explanation=(
                    "This combination does not match a common pattern in our rule set. "
                    "Consider whether there is a good leaving group and whether "
                    "the nucleophile is suitably electron-rich."
                ),
                cached=True,
            )

    verdict.latency_ms = (time.perf_counter() - t0) * 1000
    logger.info(
        "evaluate_mechanism %s→%s  status=%s  %.2fms  cached=%s",
        payload.source, payload.target, verdict.status,
        verdict.latency_ms, verdict.cached,
    )

    return MechanismMoveResponse(
        status=verdict.status,
        hint=verdict.hint,
        explanation=verdict.explanation,
        source=payload.source,
        target=payload.target,
        cached=verdict.cached,
        latency_ms=round(verdict.latency_ms, 2),
    )


# ── GET /api/hint/stream ──────────────────────────────────────────────────────

async def _stream_hint_tokens(hint: str, delay: float = 0.04) -> AsyncGenerator[str, None]:
    """Simulate token streaming — yields one word at a time as SSE events."""
    words = hint.split()
    for i, word in enumerate(words):
        chunk = word + (" " if i < len(words) - 1 else "")
        yield f"data: {json.dumps({'token': chunk})}\n\n"
        await asyncio.sleep(delay)
    yield "data: [DONE]\n\n"


@router.get("/hint/stream")
async def stream_hint(
    source: str = Query(..., description="Electron donor species"),
    target: str = Query(..., description="Electron acceptor species"),
):
    """
    Server-Sent Events endpoint that streams the Socratic hint token by token.
    The frontend fires this *after* the optimistic UI update so the user sees
    motion instantly and the hint appears progressively — no blocking wait.
    """
    verdict = evaluate_fast(source=source.lower().strip(), target=target.lower().strip())
    hint = verdict.hint if verdict else "Think about electron flow and leaving group ability."

    return StreamingResponse(
        _stream_hint_tokens(hint),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── GET /api/challenges/prefetch ─────────────────────────────────────────────

@router.get("/challenges/prefetch")
async def prefetch_challenges(
    start_id: int = Query(1, ge=1, description="First challenge id to include"),
    count: int = Query(3, ge=1, le=8, description="How many challenges to return"),
):
    """
    Returns a batch of challenge payloads so the frontend can pre-cache the
    next N rounds before the user finishes the current one.
    Zero LLM calls — all data is pre-built in the challenge bank.
    """
    return {
        "challenges": get_batch(start_id, count),
        "total": len(CHALLENGES),
    }


# ── GET /api/challenges/{challenge_id} ───────────────────────────────────────

@router.get("/challenges/{challenge_id}")
async def get_single_challenge(challenge_id: int):
    """Fetch one challenge by id."""
    ch = get_challenge(challenge_id)
    if ch is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Challenge {challenge_id} not found")
    return ch


# ── GET /api/challenges ───────────────────────────────────────────────────────

@router.get("/challenges")
async def list_challenges():
    """List all available challenges (ids + difficulty only)."""
    return [
        {"id": c["id"], "difficulty": c["difficulty"], "mechanism": c["mechanism"]}
        for c in CHALLENGES
    ]
