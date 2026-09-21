"""
ChemClash — User Profile & Weakness Tracker  (canonical weakness source)

Persists to backend/data/user_profiles.json using atomic temp-file + os.replace
writes. Loaded once at import time; survives server restarts.

All scoring logic is unchanged:
  wrong answer  → weakness_scores[tag] += 2,  strength_scores[tag] = max(0, s-1)
  correct answer → weakness_scores[tag] = max(0, w-1), strength_scores[tag] += 1

Schema per user (stored in JSON)
---------------------------------
{
  "user_id": "u_123",
  "total_answered": 42,
  "total_correct": 31,
  "weakness_scores":  { "SN2": 3, "steric_hindrance": 5 },
  "strength_scores":  { "EAS": 4 },
  "history": [{ "pyq_id": "PYQ-001", "correct": false, "ts": 1720000000.0 }]
}
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from collections import defaultdict
from pathlib import Path


# ── Persistence path ──────────────────────────────────────────────────────────

_DATA_DIR  = Path(__file__).parent / "data"
_SAVE_PATH = _DATA_DIR / "user_profiles.json"


def _load_from_disk() -> dict[str, dict]:
    """
    Load all profiles from the JSON file on startup.
    Returns an empty dict if the file does not yet exist or is corrupt.
    weakness_scores and strength_scores are re-wrapped as defaultdict(int)
    so existing in-memory code continues to work without modification.
    """
    if not _SAVE_PATH.exists():
        return {}
    try:
        raw: dict[str, dict] = json.loads(_SAVE_PATH.read_text(encoding="utf-8"))
        for uid, p in raw.items():
            p["weakness_scores"] = defaultdict(int, p.get("weakness_scores", {}))
            p["strength_scores"] = defaultdict(int, p.get("strength_scores", {}))
        return raw
    except Exception:
        # Corrupt file — start fresh rather than crash
        return {}


def _persist() -> None:
    """
    Atomically write all profiles to disk (temp file + os.replace).
    Serialises defaultdicts to plain dicts for JSON compatibility.
    Single-process safe; not designed for multi-worker deployments.
    """
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    serialisable = {
        uid: {
            **p,
            "weakness_scores": dict(p["weakness_scores"]),
            "strength_scores": dict(p["strength_scores"]),
        }
        for uid, p in _PROFILES.items()
    }
    fd, tmp_path = tempfile.mkstemp(dir=_DATA_DIR, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(serialisable, f, indent=2, default=str)
        os.replace(tmp_path, _SAVE_PATH)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ── In-memory store (loaded from disk at import time) ────────────────────────
_PROFILES: dict[str, dict] = _load_from_disk()


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
    Record the result of one answered PYQ and persist to disk.

    Scoring (unchanged):
      wrong  → weakness_scores[tag] += 2,  strength_scores[tag] = max(0, s-1)
      correct → weakness_scores[tag] = max(0, w-1), strength_scores[tag] += 1
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

    _persist()   # atomic write — survives server restarts
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
