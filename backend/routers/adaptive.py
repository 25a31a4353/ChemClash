"""
ChemClash — Adaptive PYQ Router

Endpoints
---------
POST /api/adaptive/answer          — record a student's answer, update weakness scores
GET  /api/adaptive/pyq/{user_id}   — get the best-matched PYQ for this student
GET  /api/adaptive/profile/{user_id} — view the student's weakness profile
GET  /api/adaptive/pyq/demo        — demo endpoint (no user_id needed)

Hallucination-Proof Design
--------------------------
The LLM is given ONLY the pre-filtered candidate list from pyq_db.json.
The prompt explicitly forbids the model from generating new content.
It must return one of the provided `id` values — nothing else.
If the LLM returns an invalid id, the system falls back to the
top-scoring rule-based match automatically.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from user_profiles import (
    update_user_profile,
    get_profile,
    get_top_weaknesses,
    get_accuracy,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Load PYQ database once at startup ────────────────────────────────────────
_DB_PATH = Path(__file__).parent.parent / "pyq_db.json"

with _DB_PATH.open(encoding="utf-8") as _f:
    _PYQ_DB: list[dict[str, Any]] = json.load(_f)

_PYQ_BY_ID: dict[str, dict] = {q["id"]: q for q in _PYQ_DB}


# ── Models ────────────────────────────────────────────────────────────────────

class AnswerSubmission(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=80)
    pyq_id: str = Field(..., pattern=r"^PYQ-\d{3}$")
    chosen_answer: str = Field(..., min_length=1, max_length=1)   # "A" | "B" | "C" | "D"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _filter_by_tags(tags: list[str], exclude_ids: set[str]) -> list[dict]:
    """
    Return questions that share at least one concept_tag with the student's
    top weaknesses, sorted by tag-overlap score descending.
    Excludes recently answered questions so the student sees variety.
    """
    if not tags:
        return [q for q in _PYQ_DB if q["id"] not in exclude_ids]

    tag_set = set(tags)
    scored: list[tuple[int, dict]] = []
    for q in _PYQ_DB:
        if q["id"] in exclude_ids:
            continue
        overlap = len(tag_set & set(q["concept_tags"]))
        if overlap > 0:
            scored.append((overlap, q))

    # Sort by overlap DESC, difficulty ASC (easy first for struggling students)
    diff_order = {"easy": 0, "medium": 1, "hard": 2}
    scored.sort(key=lambda x: (-x[0], diff_order.get(x[1]["difficulty_level"], 1)))
    return [q for _, q in scored]


def _rule_based_pick(candidates: list[dict], accuracy: float) -> dict:
    """
    Pick the best candidate using only deterministic logic.
    Students with low accuracy (<40%) get easy questions first.
    Students with high accuracy (>70%) get hard questions first.
    """
    if not candidates:
        return _PYQ_DB[0]  # absolute fallback

    diff_pref: list[str]
    if accuracy < 0.40:
        diff_pref = ["easy", "medium", "hard"]
    elif accuracy < 0.70:
        diff_pref = ["medium", "easy", "hard"]
    else:
        diff_pref = ["hard", "medium", "easy"]

    for diff in diff_pref:
        for q in candidates:
            if q["difficulty_level"] == diff:
                return q
    return candidates[0]


# ── LLM Matchmaker (hallucination-proof) ─────────────────────────────────────

_MATCHMAKER_SYSTEM = """
You are an adaptive tutoring engine for ChemClash, a competitive organic
chemistry game. Your ONLY job is to select the single best question for a
student from a provided list.

STRICT RULES — violating any of these will break the game:
1. You MUST return ONLY a valid JSON object with one key: "selected_id".
2. The value of "selected_id" MUST be one of the `id` values from the
   candidate list provided in the user message. Do NOT invent an id.
3. Do NOT add any text, markdown, prose, explanation, or extra keys.
4. Do NOT generate a new question. Do NOT modify any question text.
5. If you cannot decide, pick the first candidate in the list.

Response shape (the ONLY acceptable output):
{"selected_id": "PYQ-XXX"}
""".strip()


def _llm_pick(
    candidates: list[dict],
    weakness_tags: list[str],
    accuracy: float,
) -> str | None:
    """
    Ask the LLM to select the best PYQ id from the candidate list.
    Returns the selected id string, or None if unavailable / invalid.
    """
    from config import OPENAI_API_KEY, LLM_PROVIDER  # noqa: PLC0415

    # Skip LLM if no valid key is configured
    if not OPENAI_API_KEY or OPENAI_API_KEY in ("sk-...", "", "your-key-here"):
        return None

    # Build a minimal candidate summary to stay within token budget
    candidate_summary = [
        {
            "id": q["id"],
            "exam": q["exam"],
            "year": q["exam_year"],
            "difficulty": q["difficulty_level"],
            "concept_tags": q["concept_tags"],
            "question_preview": q["question_text"][:120],
        }
        for q in candidates[:8]   # cap at 8 to stay within context
    ]

    user_message = (
        f"Student accuracy: {accuracy:.0%}\n"
        f"Top weakness tags: {weakness_tags}\n\n"
        f"Candidate questions (select exactly ONE id from this list):\n"
        f"{json.dumps(candidate_summary, indent=2)}\n\n"
        f"Return ONLY the JSON object: {{\"selected_id\": \"PYQ-XXX\"}}"
    )

    try:
        if LLM_PROVIDER == "watsonx":
            from llm_client import _chat_watsonx  # noqa: PLC0415
            raw = _chat_watsonx([
                {"role": "system", "content": _MATCHMAKER_SYSTEM},
                {"role": "user", "content": user_message},
            ])
        else:
            from llm_client import _chat_openai  # noqa: PLC0415
            raw = _chat_openai([
                {"role": "system", "content": _MATCHMAKER_SYSTEM},
                {"role": "user", "content": user_message},
            ])

        parsed = json.loads(raw)
        selected_id: str = parsed.get("selected_id", "")

        # Validate the LLM honoured the constraint
        valid_ids = {q["id"] for q in candidates}
        if selected_id in valid_ids:
            logger.info("LLM matchmaker selected %s", selected_id)
            return selected_id

        logger.warning(
            "LLM returned invalid id %r — falling back to rule-based pick",
            selected_id,
        )
        return None

    except Exception as exc:
        logger.warning("LLM matchmaker failed (%s) — using rule-based fallback", exc)
        return None


# ── POST /api/adaptive/answer ─────────────────────────────────────────────────

@router.post("/answer", summary="Submit an answer and update weakness scores")
async def submit_answer(body: AnswerSubmission):
    """
    Record whether the student answered correctly and update their
    concept-level weakness scores accordingly.
    """
    question = _PYQ_BY_ID.get(body.pyq_id)
    if question is None:
        raise HTTPException(status_code=404, detail=f"PYQ {body.pyq_id} not found")

    was_correct = body.chosen_answer.upper() == question["correct_answer"].upper()

    updated = update_user_profile(
        user_id=body.user_id,
        pyq_id=body.pyq_id,
        was_correct=was_correct,
        concept_tags=question["concept_tags"],
    )

    return {
        "was_correct": was_correct,
        "correct_answer": question["correct_answer"],
        "explanation_tags": question["concept_tags"],
        "profile_summary": {
            "total_answered": updated["total_answered"],
            "total_correct": updated["total_correct"],
            "accuracy": round(get_accuracy(body.user_id), 3),
            "top_weaknesses": get_top_weaknesses(body.user_id, 5),
        },
    }


# ── GET /api/adaptive/pyq/{user_id} ──────────────────────────────────────────

@router.get("/pyq/{user_id}", summary="Get the best-matched PYQ for a student")
async def get_adaptive_pyq(
    user_id: str,
    exclude: str = Query("", description="Comma-separated PYQ ids to skip (recently seen)"),
):
    """
    Adaptive PYQ Matchmaker:
    1. Loads the student's top weakness tags.
    2. Filters pyq_db.json for overlapping questions.
    3. Attempts LLM selection from the filtered list (hallucination-proof).
    4. Falls back to deterministic rule-based pick if LLM unavailable.

    The LLM CANNOT invent questions — it can only return one of the
    provided candidate ids. If it returns anything else, it is discarded.
    """
    exclude_ids: set[str] = {x.strip() for x in exclude.split(",") if x.strip()}
    weakness_tags = get_top_weaknesses(user_id, top_n=5)
    accuracy = get_accuracy(user_id)

    # 1. Filter candidates by weakness tags
    candidates = _filter_by_tags(weakness_tags, exclude_ids)

    if not candidates:
        # If no tag match, return any unseen question
        candidates = [q for q in _PYQ_DB if q["id"] not in exclude_ids] or _PYQ_DB

    # 2. Try LLM pick (hallucination-proof — will be None if no key)
    selected_id = _llm_pick(candidates, weakness_tags, accuracy)

    # 3. Fallback: rule-based deterministic selection
    if selected_id:
        question = _PYQ_BY_ID[selected_id]
        selection_method = "llm"
    else:
        question = _rule_based_pick(candidates, accuracy)
        selection_method = "rule_based"

    return {
        "question": question,
        "meta": {
            "selection_method": selection_method,
            "matched_weakness_tags": list(
                set(weakness_tags) & set(question["concept_tags"])
            ),
            "student_accuracy": round(accuracy, 3),
            "candidate_pool_size": len(candidates),
        },
    }


# ── GET /api/adaptive/pyq/demo ────────────────────────────────────────────────

@router.get("/pyq/demo", summary="Demo — adaptive PYQ for a sample weak student")
async def get_demo_pyq():
    """
    Demo endpoint. Simulates a student who has failed SN2 and steric_hindrance
    questions, then returns the best matching PYQ without needing a real user_id.
    """
    demo_tags = ["SN2", "steric_hindrance", "tertiary_halide"]
    candidates = _filter_by_tags(demo_tags, set())
    question = _rule_based_pick(candidates, accuracy=0.35)
    return {
        "question": question,
        "meta": {
            "selection_method": "demo_rule_based",
            "simulated_weakness_tags": demo_tags,
            "candidate_pool_size": len(candidates),
        },
    }


# ── GET /api/adaptive/profile/{user_id} ───────────────────────────────────────

@router.get("/profile/{user_id}", summary="Get a student's weakness profile")
async def get_student_profile(user_id: str):
    profile = get_profile(user_id)
    return {
        **profile,
        "accuracy": round(get_accuracy(user_id), 3),
        "top_weaknesses": get_top_weaknesses(user_id, 10),
    }
