"""
ChemClash — User Profile & Weakness Tracker

In-memory store for a prototype. Swap `_PROFILES` for a Redis hash or
PostgreSQL JSONB column when moving to production.

Schema per user
---------------
{
  "user_id": "u_123",
  "total_answered": 42,
  "total_correct": 31,
  "weakness_scores": {
    "SN2": 3,
    "steric_hindrance": 5,
    ...
  },
  "strength_scores": {
    "EAS": 4,
    ...
  },
  "history": [
    { "pyq_id": "PYQ-001", "correct": False, "ts": 1720000000.0 }
  ]
}
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import TypedDict


# ── In-memory store  ──────────────────────────────────────────────────────────
_PROFILES: dict[str, dict] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create(user_id: str) -> dict:
    if user_id not in _PROFILES:
        _PROFILES[user_id] = {
            "user_id": user_id,
            "total_answered": 0,
            "total_correct": 0,
            "weakness_scores": defaultdict(int),
            "strength_scores": defaultdict(int),
            "history": [],
        }
    return _PROFILES[user_id]


# ── Public API ────────────────────────────────────────────────────────────────

def update_user_profile(
    user_id: str,
    pyq_id: str,
    was_correct: bool,
    concept_tags: list[str],
) -> dict:
    """
    Record the result of one answered PYQ.

    Parameters
    ----------
    user_id      : Unique player identifier.
    pyq_id       : The PYQ that was answered (e.g. "PYQ-001").
    was_correct  : True if the player chose the right answer.
    concept_tags : Tags from the PYQ (e.g. ["SN2", "steric_hindrance"]).

    Returns
    -------
    The updated profile dict (weakness_scores as plain dict for serialisation).
    """
    profile = _get_or_create(user_id)

    profile["total_answered"] += 1
    if was_correct:
        profile["total_correct"] += 1

    for tag in concept_tags:
        if was_correct:
            # Correct answer: reduce weakness (floor 0), grow strength
            profile["weakness_scores"][tag] = max(
                0, profile["weakness_scores"][tag] - 1
            )
            profile["strength_scores"][tag] += 1
        else:
            # Wrong answer: grow weakness, reduce strength (floor 0)
            profile["weakness_scores"][tag] += 2          # penalise harder than reward
            profile["strength_scores"][tag] = max(
                0, profile["strength_scores"][tag] - 1
            )

    profile["history"].append({
        "pyq_id": pyq_id,
        "correct": was_correct,
        "ts": time.time(),
    })

    return get_profile(user_id)


def get_profile(user_id: str) -> dict:
    """Return the profile, converting defaultdicts to plain dicts for JSON."""
    profile = _get_or_create(user_id)
    return {
        **profile,
        "weakness_scores": dict(profile["weakness_scores"]),
        "strength_scores": dict(profile["strength_scores"]),
    }


def get_top_weaknesses(user_id: str, top_n: int = 5) -> list[str]:
    """Return the `top_n` concept tags the user struggles with most."""
    profile = _get_or_create(user_id)
    scores: dict[str, int] = profile["weakness_scores"]
    sorted_tags = sorted(scores.keys(), key=lambda t: scores[t], reverse=True)
    return sorted_tags[:top_n]


def get_accuracy(user_id: str) -> float:
    """Overall accuracy as a float 0.0–1.0. Returns 0 if no questions answered."""
    profile = _get_or_create(user_id)
    if profile["total_answered"] == 0:
        return 0.0
    return profile["total_correct"] / profile["total_answered"]
