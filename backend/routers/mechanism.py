"""
ChemClash — Mechanism Router
Exposes the /api/evaluate-mechanism endpoint.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from llm_client import evaluate_move

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request / Response models ─────────────────────────────────────────────────

class MechanismMoveRequest(BaseModel):
    """Payload sent by the frontend when the student draws an electron arrow."""

    source: str = Field(
        ...,
        min_length=1,
        max_length=120,
        examples=["nucleophile", "hydroxide", "cyanide"],
        description="The reactive species or atom the student is moving electrons FROM.",
    )
    target: str = Field(
        ...,
        min_length=1,
        max_length=120,
        examples=["tertiary_carbon", "primary_carbon", "bromine"],
        description="The atom or group the student is moving electrons TOWARD.",
    )

    # Normalise to lowercase + strip whitespace so the LLM prompt is consistent
    @field_validator("source", "target", mode="before")
    @classmethod
    def normalise(cls, v: str) -> str:
        return str(v).strip().lower()


class MechanismMoveResponse(BaseModel):
    """Structured verdict returned to the frontend."""

    status: str = Field(
        ...,
        pattern="^(pass|fail)$",
        description='"pass" if the move is chemically sound, "fail" otherwise.',
    )
    hint: str = Field(
        ...,
        description="Short Socratic nudge to guide the student.",
    )
    explanation: str = Field(
        ...,
        description="Two-to-three sentence chemical explanation.",
    )
    # Echo the original move so the frontend can match requests to responses
    source: str
    target: str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/evaluate-mechanism",
    response_model=MechanismMoveResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate a student's mechanism move via an LLM Socratic tutor",
    response_description="Verdict (pass/fail) plus a Socratic hint and explanation",
)
async def evaluate_mechanism(payload: MechanismMoveRequest) -> MechanismMoveResponse:
    """
    Accepts a mechanism move (`source` → `target`) and asks an LLM Socratic
    tutor to evaluate it.

    **Example request body**
    ```json
    { "source": "nucleophile", "target": "tertiary_carbon" }
    ```

    **Example response**
    ```json
    {
      "status": "fail",
      "hint": "Watch out for steric hindrance!",
      "explanation": "SN2 reactions require a backside attack ...",
      "source": "nucleophile",
      "target": "tertiary_carbon"
    }
    ```
    """
    logger.info("evaluate_mechanism called: %s → %s", payload.source, payload.target)

    try:
        verdict = evaluate_move(source=payload.source, target=payload.target)
    except ValueError as exc:
        # LLM returned something we couldn't parse as JSON
        logger.error("LLM parse error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned an unparseable response: {exc}",
        )
    except Exception as exc:
        # Network error, auth failure, quota exhausted, etc.
        logger.error("LLM call failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM service error: {exc}",
        )

    # Validate the LLM honours the schema before forwarding to the client
    if verdict.get("status") not in {"pass", "fail"}:
        logger.error("LLM returned unexpected status: %s", verdict)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned unexpected status value: {verdict.get('status')!r}",
        )

    return MechanismMoveResponse(
        status=verdict["status"],
        hint=verdict.get("hint", ""),
        explanation=verdict.get("explanation", ""),
        source=payload.source,
        target=payload.target,
    )
