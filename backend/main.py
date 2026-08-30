"""
ChemClash — FastAPI Backend  (single-file entry point)
Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
or directly:
    python main.py

All logic (fast validator, user profiles, challenge bank, adaptive PYQ,
curriculum) lives in this one file so any hosting service can point straight
at main.py with zero extra imports.
"""

from __future__ import annotations

# ── Standard library ──────────────────────────────────────────────────────────
import asyncio
import json
import logging
import os
import time
import datetime
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Optional

# ── Third-party ───────────────────────────────────────────────────────────────
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from motor.motor_asyncio import AsyncIOMotorClient

# ── Load .env (optional — safe to run without one) ────────────────────────────
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chemclash")

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 1 — CONFIGURATION
# ═════════════════════════════════════════════════════════════════════════════

LLM_PROVIDER:     str       = os.getenv("LLM_PROVIDER",   "openai")
OPENAI_API_KEY:   str       = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL:  str | None = os.getenv("OPENAI_BASE_URL", None)
OPENAI_MODEL:     str       = os.getenv("OPENAI_MODEL",   "gpt-4o-mini")
WATSONX_API_KEY:  str       = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID: str     = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL:      str       = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
WATSONX_MODEL:    str       = os.getenv("WATSONX_MODEL", "ibm/granite-13b-chat-v2")
LLM_MAX_TOKENS:   int       = int(os.getenv("LLM_MAX_TOKENS", "512"))
LLM_TEMPERATURE:  float     = float(os.getenv("LLM_TEMPERATURE", "0.2"))

_NO_KEY = {"sk-...", "", "your-key-here"}

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.chemclash
users_collection = db.users

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 2 — RULE-BASED FAST VALIDATOR  (<1 ms, no API key needed)
# ═════════════════════════════════════════════════════════════════════════════

STRONG_NUCLEOPHILES = {
    "oh-", "hydroxide", "cn-", "cyanide", "hs-", "hydrosulfide",
    "i-", "iodide", "br-", "bromide", "cl-", "chloride",
    "f-", "fluoride", "nh2-", "amide", "ch3o-", "methoxide",
    "ethoxide", "rco2-", "carboxylate", "acetate",
    "n3-", "azide", "rs-", "thiolate", "nucleophile",
}

WEAK_NUCLEOPHILES = {
    "h2o", "water", "nh3", "ammonia", "roh", "alcohol", "ch3oh", "methanol",
}

NON_NUCLEOPHILES = {
    "h+", "proton", "h3o+", "hydronium", "hcl", "hbr", "hi",
    "alcl3", "fecl3", "bf3", "lewis acid", "electrophile",
    "h2so4", "hno3", "bh3",
}

GOOD_LEAVING_GROUPS = {
    "bromine", "br", "br-", "chlorine", "cl", "cl-",
    "iodine", "i", "i-", "ots", "tosylate", "oms", "mesylate",
    "leaving group", "primary_carbon", "ch3br", "ch3cl", "ch3i", "carbon",
}

TERTIARY_TARGETS = {
    "tertiary_carbon", "tertiary carbon", "t-carbon", "(ch3)3c+",
    "tert-butyl", "carbocation", "t-butyl cation",
}

SECONDARY_TARGETS = {
    "secondary_carbon", "secondary carbon", "s-carbon", "cyclohexyl", "isopropyl carbon",
}

AROMATIC_TARGETS = {
    "benzene", "toluene", "naphthalene", "aromatic", "phenyl", "aromatic carbon",
}


@dataclass
class Verdict:
    status:     str
    hint:       str
    explanation: str
    cached:     bool  = True
    latency_ms: float = 0.0


def evaluate_fast(source: str, target: str) -> Verdict | None:
    """Rule-based evaluation. Returns Verdict or None (→ try LLM)."""
    s, t = source.lower().strip(), target.lower().strip()

    if s in NON_NUCLEOPHILES:
        return Verdict(
            status="fail",
            hint="Is that species actually electron-rich?",
            explanation=(
                f"'{source}' is an electrophile or acid, not a nucleophile. "
                "A valid mechanism step requires the electron-rich species to attack the electron-poor centre."
            ),
        )
    if t in TERTIARY_TARGETS and s in STRONG_NUCLEOPHILES:
        return Verdict(
            status="fail",
            hint="What does steric hindrance do to backside attack?",
            explanation=(
                "SN2 requires simultaneous bond-forming and bond-breaking via backside attack. "
                "A tertiary carbon is surrounded by three bulky substituents, making this geometry impossible. "
                "SN1 is preferred here."
            ),
        )
    if t in GOOD_LEAVING_GROUPS and s in STRONG_NUCLEOPHILES:
        return Verdict(
            status="pass",
            hint="Correct — what does inversion of configuration mean here?",
            explanation=(
                "A strong nucleophile attacking a primary electrophilic carbon proceeds via SN2: "
                "concerted backside attack with inversion of configuration (Walden inversion)."
            ),
        )
    if t in SECONDARY_TARGETS:
        return Verdict(
            status="pass",
            hint="Could elimination compete here under strong base conditions?",
            explanation=(
                "Attack on a secondary carbon can proceed SN2, but strong bases may favour E2 elimination. "
                "The outcome depends on temperature, solvent polarity, and base strength."
            ),
        )
    if t in AROMATIC_TARGETS:
        return Verdict(
            status="fail",
            hint="Does benzene's π system allow direct nucleophilic attack?",
            explanation=(
                "Aromatic rings resist nucleophilic addition because it would destroy aromaticity. "
                "NAS requires strong electron-withdrawing groups ortho/para to the leaving group."
            ),
        )
    return None   # no rule fired — defer to LLM


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 3 — CHALLENGE BANK  (8 pre-built puzzles, zero LLM calls)
# ═════════════════════════════════════════════════════════════════════════════

CHALLENGES: list[dict] = [
    {"id": 1, "nucleophile": "OH⁻",  "electrophile": "CH₃Br",       "shouldReact": True,  "hint": "Hydroxide attacks the carbon bearing the leaving group (SN2).", "mechanism": "SN2",    "explanation": "Strong hydroxide nucleophile attacks the primary carbon of CH₃Br via backside attack. Br⁻ departs as the C–O bond forms simultaneously.", "difficulty": "easy"},
    {"id": 2, "nucleophile": "H₂O",  "electrophile": "CH₄",         "shouldReact": False, "hint": "Methane has no electrophilic carbon — no leaving group, no reaction.", "mechanism": "", "explanation": "CH₄ has no leaving group and no electrophilic carbon. Water is a weak nucleophile. No driving force for any substitution.", "difficulty": "easy"},
    {"id": 3, "nucleophile": "NH₃",  "electrophile": "CH₃Cl",       "shouldReact": True,  "hint": "Ammonia acts as a nucleophile toward the electrophilic carbon (SN2).", "mechanism": "SN2", "explanation": "Ammonia's lone pair attacks the electrophilic carbon of CH₃Cl, displacing Cl⁻ in an SN2 step.", "difficulty": "easy"},
    {"id": 4, "nucleophile": "Cl⁻",  "electrophile": "Benzene",     "shouldReact": False, "hint": "Cl⁻ alone cannot react with benzene — a Lewis acid catalyst is required.", "mechanism": "", "explanation": "Benzene undergoes EAS, not nucleophilic attack. Cl⁻ cannot directly attack the electron-rich aromatic ring.", "difficulty": "medium"},
    {"id": 5, "nucleophile": "CN⁻",  "electrophile": "(CH₃)₃C⁺",   "shouldReact": True,  "hint": "Cyanide attacks the carbocation readily (SN1 scenario).", "mechanism": "SN1", "explanation": "The stable tertiary carbocation is attacked by CN⁻. Both faces are accessible — no inversion.", "difficulty": "medium"},
    {"id": 6, "nucleophile": "Br⁻",  "electrophile": "CH₃CH₂Cl",   "shouldReact": True,  "hint": "Bromide is an excellent SN2 nucleophile — polarisable and not too bulky.", "mechanism": "SN2", "explanation": "Br⁻ attacks the primary carbon of ethyl chloride via backside attack, displacing Cl⁻.", "difficulty": "easy"},
    {"id": 7, "nucleophile": "OH⁻",  "electrophile": "(CH₃)₂CHBr", "shouldReact": True,  "hint": "Secondary substrates — will SN2 or E2 dominate?", "mechanism": "SN2/E2", "explanation": "With OH⁻ and a secondary substrate, SN2 and E2 compete. Heating and hindered base favour E2.", "difficulty": "hard"},
    {"id": 8, "nucleophile": "H₂O",  "electrophile": "CH₃CH₂Br",   "shouldReact": True,  "hint": "Water is a weak nucleophile — reaction is slow but possible under forcing conditions.", "mechanism": "SN2", "explanation": "Water can act as a weak nucleophile toward primary alkyl halides, giving an alcohol after deprotonation.", "difficulty": "medium"},
]


def _get_challenge(challenge_id: int) -> dict | None:
    return next((c for c in CHALLENGES if c["id"] == challenge_id), None)


def _get_batch(start_id: int, count: int = 3) -> list[dict]:
    ids = [(start_id + i - 1) % len(CHALLENGES) for i in range(count)]
    return [CHALLENGES[i] for i in ids]


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 4 — USER PROFILES & WEAKNESS TRACKER  (in-memory)
# ═════════════════════════════════════════════════════════════════════════════

_PROFILES: dict[str, dict] = {}


def _get_or_create_profile(user_id: str) -> dict:
    if user_id not in _PROFILES:
        _PROFILES[user_id] = {
            "user_id":        user_id,
            "total_answered": 0,
            "total_correct":  0,
            "weakness_scores": defaultdict(int),
            "strength_scores": defaultdict(int),
            "history":        [],
        }
    return _PROFILES[user_id]


def update_user_profile(user_id: str, pyq_id: str, was_correct: bool, concept_tags: list[str]) -> dict:
    p = _get_or_create_profile(user_id)
    p["total_answered"] += 1
    if was_correct:
        p["total_correct"] += 1
    for tag in concept_tags:
        if was_correct:
            p["weakness_scores"][tag] = max(0, p["weakness_scores"][tag] - 1)
            p["strength_scores"][tag] += 1
        else:
            p["weakness_scores"][tag] += 2
            p["strength_scores"][tag] = max(0, p["strength_scores"][tag] - 1)
    p["history"].append({"pyq_id": pyq_id, "correct": was_correct, "ts": time.time()})
    return _serialise_profile(user_id)


def _serialise_profile(user_id: str) -> dict:
    p = _get_or_create_profile(user_id)
    return {**p, "weakness_scores": dict(p["weakness_scores"]), "strength_scores": dict(p["strength_scores"])}


def get_top_weaknesses(user_id: str, top_n: int = 5) -> list[str]:
    p = _get_or_create_profile(user_id)
    scores: dict[str, int] = p["weakness_scores"]
    return sorted(scores, key=lambda t: scores[t], reverse=True)[:top_n]


def get_accuracy(user_id: str) -> float:
    p = _get_or_create_profile(user_id)
    return p["total_correct"] / p["total_answered"] if p["total_answered"] else 0.0


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 5 — PYQ DATABASE  (loaded from pyq_db.json at startup)
# ═════════════════════════════════════════════════════════════════════════════

_PYQ_PATH = Path(__file__).parent / "pyq_db.json"
with _PYQ_PATH.open(encoding="utf-8") as _fh:
    _PYQ_DB: list[dict[str, Any]] = json.load(_fh)
_PYQ_BY_ID: dict[str, dict] = {q["id"]: q for q in _PYQ_DB}


def _filter_by_tags(tags: list[str], exclude_ids: set[str]) -> list[dict]:
    if not tags:
        return [q for q in _PYQ_DB if q["id"] not in exclude_ids]
    tag_set = set(tags)
    diff_order = {"easy": 0, "medium": 1, "hard": 2}
    scored = [
        (len(tag_set & set(q["concept_tags"])), q)
        for q in _PYQ_DB
        if q["id"] not in exclude_ids and (tag_set & set(q["concept_tags"]))
    ]
    scored.sort(key=lambda x: (-x[0], diff_order.get(x[1]["difficulty_level"], 1)))
    return [q for _, q in scored]


def _rule_based_pick(candidates: list[dict], accuracy: float) -> dict:
    if not candidates:
        return _PYQ_DB[0]
    pref = (
        ["easy", "medium", "hard"] if accuracy < 0.40 else
        ["medium", "easy", "hard"] if accuracy < 0.70 else
        ["hard", "medium", "easy"]
    )
    for diff in pref:
        for q in candidates:
            if q["difficulty_level"] == diff:
                return q
    return candidates[0]


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 6 — CURRICULUM TREE  (loaded from concept_tree.json at startup)
# ═════════════════════════════════════════════════════════════════════════════

_CT_PATH = Path(__file__).parent / "concept_tree.json"
with _CT_PATH.open(encoding="utf-8") as _fh2:
    _MODULES: list[dict[str, Any]] = json.load(_fh2)
_MOD_BY_ID: dict[str, dict] = {m["module_id"]: m for m in _MODULES}

_TAG_INDEX: dict[str, list[str]] = {}
for _m in _MODULES:
    for _tag in _m.get("game_tags", []):
        _TAG_INDEX.setdefault(_tag, []).append(_m["module_id"])


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 7 — LLM HELPERS  (optional — gracefully skipped without API key)
# ═════════════════════════════════════════════════════════════════════════════

_MATCHMAKER_SYSTEM = """
You are an adaptive tutoring engine for ChemClash. Your ONLY job is to select
the single best question for a student from a provided list.

STRICT RULES:
1. Return ONLY a valid JSON object: {"selected_id": "PYQ-XXX"}
2. "selected_id" MUST be one of the `id` values from the candidate list. Do NOT invent an id.
3. Do NOT add prose, markdown, or extra keys.
4. Do NOT generate a new question. If unsure, pick the first candidate.
""".strip()

_SOCRATIC_SYSTEM = """
You are a Socratic organic-chemistry tutor in ChemClash. Evaluate a student's
mechanism move and return ONLY valid JSON — no markdown, no extra keys:
{
  "status": "pass" | "fail",
  "hint": "<one Socratic sentence>",
  "explanation": "<two or three chemistry sentences>"
}
Rules: tertiary carbon + strong nucleophile → SN2 fail. Primary carbon + strong nucleophile → SN2 pass.
""".strip()


def _llm_available() -> bool:
    return bool(OPENAI_API_KEY) and OPENAI_API_KEY not in _NO_KEY


def _chat_openai(messages: list[dict]) -> str:
    from openai import OpenAI  # type: ignore
    kwargs: dict[str, Any] = {"api_key": OPENAI_API_KEY}
    if OPENAI_BASE_URL:
        kwargs["base_url"] = OPENAI_BASE_URL
    client = OpenAI(**kwargs)
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,  # type: ignore[arg-type]
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or ""


def _chat_watsonx(messages: list[dict]) -> str:
    from ibm_watsonx_ai import Credentials  # type: ignore
    from ibm_watsonx_ai.foundation_models import ModelInference  # type: ignore
    model = ModelInference(
        model_id=WATSONX_MODEL,
        credentials=Credentials(url=WATSONX_URL, api_key=WATSONX_API_KEY),
        project_id=WATSONX_PROJECT_ID,
        params={"max_new_tokens": LLM_MAX_TOKENS, "temperature": LLM_TEMPERATURE},
    )
    return model.chat(messages=messages)["choices"][0]["message"]["content"]


def _llm_chat(messages: list[dict]) -> str:
    return _chat_watsonx(messages) if LLM_PROVIDER == "watsonx" else _chat_openai(messages)


def _llm_pick_pyq(candidates: list[dict], weakness_tags: list[str], accuracy: float) -> str | None:
    if not _llm_available():
        return None
    summary = [
        {"id": q["id"], "difficulty": q["difficulty_level"],
         "concept_tags": q["concept_tags"], "preview": q["question_text"][:120]}
        for q in candidates[:8]
    ]
    user_msg = (
        f"Student accuracy: {accuracy:.0%}\nTop weakness tags: {weakness_tags}\n\n"
        f"Candidates:\n{json.dumps(summary, indent=2)}\n\n"
        f'Return ONLY: {{"selected_id": "PYQ-XXX"}}'
    )
    try:
        raw = _llm_chat([
            {"role": "system", "content": _MATCHMAKER_SYSTEM},
            {"role": "user",   "content": user_msg},
        ])
        selected_id = json.loads(raw).get("selected_id", "")
        valid_ids = {q["id"] for q in candidates}
        return selected_id if selected_id in valid_ids else None
    except Exception as exc:
        logger.warning("LLM matchmaker failed (%s) — using rule-based fallback", exc)
        return None


def _llm_evaluate_mechanism(source: str, target: str) -> Verdict:
    user_msg = (
        f'Mechanism step:\n  source: "{source}"\n  target: "{target}"\n\n'
        "Evaluate and return ONLY the JSON object."
    )
    try:
        raw = _llm_chat([
            {"role": "system", "content": _SOCRATIC_SYSTEM},
            {"role": "user",   "content": user_msg},
        ])
        data = json.loads(raw)
        return Verdict(
            status=data.get("status", "pass"),
            hint=data.get("hint", ""),
            explanation=data.get("explanation", ""),
            cached=False,
        )
    except Exception:
        return Verdict(
            status="pass",
            hint="Interesting move — think about electron flow carefully.",
            explanation=(
                "This combination does not match a common pattern. "
                "Consider whether there is a good leaving group and whether the nucleophile is electron-rich."
            ),
            cached=True,
        )


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 8 — FASTAPI APP + CORS
# ═════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="ChemClash API",
    description=(
        "Backend for ChemClash — Organic Chemistry Arena.\n\n"
        "Interactive docs: http://localhost:8000/docs\n"
        "All routes work without an API key (rule-based fast path)."
    ),
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your deployed frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 9 — PYDANTIC MODELS
# ═════════════════════════════════════════════════════════════════════════════

class MechanismMoveRequest(BaseModel):
    source: str = Field(..., min_length=1, max_length=120, examples=["hydroxide"])
    target: str = Field(..., min_length=1, max_length=120, examples=["primary_carbon"])

    @field_validator("source", "target", mode="before")
    @classmethod
    def normalise(cls, v: str) -> str:
        return str(v).strip().lower()


class MechanismMoveResponse(BaseModel):
    status:      str
    hint:        str
    explanation: str
    source:      str
    target:      str
    cached:      bool
    latency_ms:  float


class AnswerSubmission(BaseModel):
    user_id:        str = Field(..., min_length=1, max_length=80)
    pyq_id:         str = Field(..., pattern=r"^PYQ-\d{3}$")
    chosen_answer:  str = Field(..., min_length=1, max_length=1)


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 10 — HEALTH
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    """Health check. Returns service status and whether LLM is configured."""
    return {
        "status":       "ok",
        "service":      "ChemClash API v0.3.0",
        "llm_enabled":  _llm_available(),
        "pyq_count":    len(_PYQ_DB),
        "modules":      len(_MODULES),
        "challenges":   len(CHALLENGES),
        "docs":         "/docs",
    }


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 11 — MECHANISM ROUTES  (/api/*)
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/evaluate-mechanism", response_model=MechanismMoveResponse, tags=["Mechanism"])
async def evaluate_mechanism(payload: MechanismMoveRequest):
    """
    Evaluate a student's electron-arrow move.
    - Fast-path rule engine (<1 ms, no API key needed).
    - Falls back to LLM Socratic tutor if a key is configured and no rule fires.
    """
    t0 = time.perf_counter()

    verdict = evaluate_fast(payload.source, payload.target)

    if verdict is None:
        if _llm_available():
            verdict = await asyncio.get_event_loop().run_in_executor(
                None, lambda: _llm_evaluate_mechanism(payload.source, payload.target)
            )
        else:
            verdict = Verdict(
                status="pass",
                hint="Interesting move — think about electron flow carefully.",
                explanation=(
                    "This combination does not match a common pattern in our rule set. "
                    "Consider whether there is a good leaving group and whether the nucleophile is electron-rich."
                ),
                cached=True,
            )

    verdict.latency_ms = (time.perf_counter() - t0) * 1000
    logger.info("evaluate_mechanism %s→%s  status=%s  %.2fms", payload.source, payload.target, verdict.status, verdict.latency_ms)

    return MechanismMoveResponse(
        status=verdict.status,
        hint=verdict.hint,
        explanation=verdict.explanation,
        source=payload.source,
        target=payload.target,
        cached=verdict.cached,
        latency_ms=round(verdict.latency_ms, 2),
    )


async def _sse_tokens(hint: str, delay: float = 0.04) -> AsyncGenerator[str, None]:
    for i, word in enumerate(hint.split()):
        chunk = word + (" " if i < len(hint.split()) - 1 else "")
        yield f"data: {json.dumps({'token': chunk})}\n\n"
        await asyncio.sleep(delay)
    yield "data: [DONE]\n\n"


@app.get("/api/hint/stream", tags=["Mechanism"])
async def stream_hint(
    source: str = Query(..., description="Electron donor species"),
    target: str = Query(..., description="Electron acceptor species"),
):
    """SSE endpoint — streams Socratic hint tokens one word at a time."""
    verdict = evaluate_fast(source.lower().strip(), target.lower().strip())
    hint = verdict.hint if verdict else "Think about electron flow and leaving group ability."
    return StreamingResponse(
        _sse_tokens(hint),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/challenges/prefetch", tags=["Mechanism"])
async def prefetch_challenges(
    start_id: int = Query(1, ge=1),
    count:    int = Query(3, ge=1, le=8),
):
    """Return a batch of pre-built challenge payloads for client-side prefetching."""
    return {"challenges": _get_batch(start_id, count), "total": len(CHALLENGES)}


@app.get("/api/challenges/{challenge_id}", tags=["Mechanism"])
async def get_single_challenge(challenge_id: int):
    ch = _get_challenge(challenge_id)
    if ch is None:
        raise HTTPException(status_code=404, detail=f"Challenge {challenge_id} not found")
    return ch


@app.get("/api/challenges", tags=["Mechanism"])
async def list_challenges():
    return [{"id": c["id"], "difficulty": c["difficulty"], "mechanism": c["mechanism"]} for c in CHALLENGES]


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 12 — ADAPTIVE PYQ ROUTES  (/api/adaptive/*)
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/adaptive/answer", tags=["Adaptive PYQ"])
async def submit_answer(body: AnswerSubmission):
    """Record a student's answer and update their concept-level weakness scores."""
    question = _PYQ_BY_ID.get(body.pyq_id)
    if question is None:
        raise HTTPException(status_code=404, detail=f"PYQ {body.pyq_id} not found")

    was_correct = body.chosen_answer.upper() == question["correct_answer"].upper()
    updated = update_user_profile(body.user_id, body.pyq_id, was_correct, question["concept_tags"])

    return {
        "was_correct":    was_correct,
        "correct_answer": question["correct_answer"],
        "explanation_tags": question["concept_tags"],
        "profile_summary": {
            "total_answered": updated["total_answered"],
            "total_correct":  updated["total_correct"],
            "accuracy":       round(get_accuracy(body.user_id), 3),
            "top_weaknesses": get_top_weaknesses(body.user_id, 5),
        },
    }


@app.get("/api/adaptive/pyq/demo", tags=["Adaptive PYQ"])
async def get_demo_pyq():
    """Demo — simulates a student weak in SN2 and steric_hindrance."""
    demo_tags = ["SN2", "steric_hindrance", "tertiary_halide"]
    candidates = _filter_by_tags(demo_tags, set())
    question = _rule_based_pick(candidates, accuracy=0.35)
    return {
        "question": question,
        "meta": {
            "selection_method":    "demo_rule_based",
            "simulated_weakness_tags": demo_tags,
            "candidate_pool_size": len(candidates),
        },
    }


@app.get("/api/adaptive/pyq/{user_id}", tags=["Adaptive PYQ"])
async def get_adaptive_pyq(
    user_id: str,
    exclude: str = Query("", description="Comma-separated PYQ ids to skip"),
):
    """
    Adaptive PYQ Matchmaker — hallucination-proof.
    Filters pyq_db.json by the student's weakness tags, then:
    - Uses the LLM to pick the best match (if API key is set), OR
    - Falls back to the deterministic rule-based picker.
    The LLM can only return an id from the filtered list — it cannot invent questions.
    """
    exclude_ids = {x.strip() for x in exclude.split(",") if x.strip()}
    weakness_tags = get_top_weaknesses(user_id, top_n=5)
    accuracy = get_accuracy(user_id)

    candidates = _filter_by_tags(weakness_tags, exclude_ids)
    if not candidates:
        candidates = [q for q in _PYQ_DB if q["id"] not in exclude_ids] or _PYQ_DB

    selected_id = await asyncio.get_event_loop().run_in_executor(
        None, lambda: _llm_pick_pyq(candidates, weakness_tags, accuracy)
    )

    if selected_id:
        question, method = _PYQ_BY_ID[selected_id], "llm"
    else:
        question, method = _rule_based_pick(candidates, accuracy), "rule_based"

    return {
        "question": question,
        "meta": {
            "selection_method":      method,
            "matched_weakness_tags": list(set(weakness_tags) & set(question["concept_tags"])),
            "student_accuracy":      round(accuracy, 3),
            "candidate_pool_size":   len(candidates),
        },
    }


@app.get("/api/adaptive/profile/{user_id}", tags=["Adaptive PYQ"])
async def get_student_profile(user_id: str):
    """Return the student's full weakness profile."""
    return {
        **_serialise_profile(user_id),
        "accuracy":       round(get_accuracy(user_id), 3),
        "top_weaknesses": get_top_weaknesses(user_id, 10),
    }


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 13 — CURRICULUM ROUTES  (/api/curriculum/*)
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/curriculum/modules", tags=["Curriculum"])
async def list_modules(
    difficulty: str | None = Query(None, description="basics | medium | advanced"),
):
    """List all curriculum modules (no tutorial slides in this view)."""
    mods = _MODULES if not difficulty else [m for m in _MODULES if m["difficulty"] == difficulty.lower()]
    return [
        {
            "module_id":       m["module_id"],
            "title":           m["title"],
            "difficulty":      m["difficulty"],
            "difficulty_tier": m["difficulty_tier"],
            "game_tags":       m["game_tags"],
            "slide_count":     len(m.get("tutorial_sequence", [])),
        }
        for m in mods
    ]


@app.get("/api/curriculum/modules/by-tag", tags=["Curriculum"])
async def modules_by_tag(
    tags: str = Query(..., description="Comma-separated game tags, e.g. SN2,steric_hindrance"),
):
    """Find modules matching one or more game tags — most relevant first."""
    requested = {t.strip() for t in tags.split(",") if t.strip()}
    scored = [
        (len(requested & set(m["game_tags"])), m)
        for m in _MODULES
        if requested & set(m["game_tags"])
    ]
    scored.sort(key=lambda x: (-x[0], x[1]["difficulty_tier"]))
    return [
        {
            "module_id":     m["module_id"],
            "title":         m["title"],
            "difficulty":    m["difficulty"],
            "matched_tags":  list(requested & set(m["game_tags"])),
            "overlap_score": score,
        }
        for score, m in scored
    ]


@app.get("/api/curriculum/modules/{module_id}", tags=["Curriculum"])
async def get_module(module_id: str):
    """Return a single module with its full 3-slide tutorial sequence."""
    m = _MOD_BY_ID.get(module_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")
    return m


@app.get("/api/curriculum/summary", tags=["Curriculum"])
async def curriculum_summary():
    """High-level stats for the full curriculum tree."""
    tier_counts: dict[str, int] = {}
    all_tags: set[str] = set()
    for m in _MODULES:
        tier_counts[m["difficulty"]] = tier_counts.get(m["difficulty"], 0) + 1
        all_tags.update(m["game_tags"])
    return {
        "total_modules":   len(_MODULES),
        "by_difficulty":   tier_counts,
        "total_slides":    sum(len(m.get("tutorial_sequence", [])) for m in _MODULES),
        "unique_tags":     len(all_tags),
        "all_tags_sorted": sorted(all_tags),
    }


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 14 — USER PROFILES (MongoDB)
# ═════════════════════════════════════════════════════════════════════════════

class UserProfile(BaseModel):
    user_id: str
    elo_rating: int = 1200
    streak_days: int = 0
    last_played: Optional[datetime.datetime] = None
    concept_weaknesses: Dict[str, float] = Field(default_factory=dict)

class MatchUpdate(BaseModel):
    elo_change: int
    weakness_updates: Dict[str, float] = Field(default_factory=dict)

@app.get("/user/{user_id}", response_model=UserProfile, tags=["User"])
async def get_user(user_id: str):
    """Fetch a user profile from MongoDB, or create one if it doesn't exist."""
    user = await users_collection.find_one({"user_id": user_id})
    if not user:
        new_profile = UserProfile(user_id=user_id)
        await users_collection.insert_one(new_profile.model_dump())
        return new_profile
    return UserProfile(**user)

@app.post("/user/{user_id}/update-match", response_model=UserProfile, tags=["User"])
async def update_match(user_id: str, update: MatchUpdate):
    """Update a user's ELO and weaknesses after a match."""
    user = await users_collection.find_one({"user_id": user_id})
    if not user:
        profile = UserProfile(user_id=user_id)
    else:
        profile = UserProfile(**user)

    profile.elo_rating += update.elo_change
    profile.last_played = datetime.datetime.now(datetime.timezone.utc)
    
    # Simple logic to merge weaknesses
    for concept, value in update.weakness_updates.items():
        profile.concept_weaknesses[concept] = profile.concept_weaknesses.get(concept, 0.0) + value

    await users_collection.update_one(
        {"user_id": user_id},
        {"$set": profile.model_dump()},
        upsert=True
    )
    return profile

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 15 — IGNITION BLOCK
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
