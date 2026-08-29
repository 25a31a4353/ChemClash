"""
ChemClash — Curriculum Router

Endpoints
---------
GET /api/curriculum/modules              — list all modules (id, title, difficulty, tags)
GET /api/curriculum/modules/{module_id}  — full module with tutorial sequence
GET /api/curriculum/modules/by-tag       — filter modules by game_tag(s)
GET /api/curriculum/summary              — stats (counts per tier, total tags)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Load once at startup ─────────────────────────────────────────────────────
_CT_PATH = Path(__file__).parent.parent / "concept_tree.json"

with _CT_PATH.open(encoding="utf-8") as _f:
    _MODULES: list[dict[str, Any]] = json.load(_f)

_MOD_BY_ID: dict[str, dict] = {m["module_id"]: m for m in _MODULES}

# Build an inverted tag → module_id index for fast lookup
_TAG_INDEX: dict[str, list[str]] = {}
for _m in _MODULES:
    for _tag in _m.get("game_tags", []):
        _TAG_INDEX.setdefault(_tag, []).append(_m["module_id"])


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/modules", summary="List all curriculum modules")
async def list_modules(
    difficulty: str | None = Query(None, description="Filter by: basics | medium | advanced"),
):
    """Returns a lightweight listing — no tutorial_sequence payload."""
    modules = _MODULES
    if difficulty:
        modules = [m for m in modules if m["difficulty"] == difficulty.lower()]
    return [
        {
            "module_id":      m["module_id"],
            "title":          m["title"],
            "difficulty":     m["difficulty"],
            "difficulty_tier": m["difficulty_tier"],
            "game_tags":      m["game_tags"],
            "slide_count":    len(m.get("tutorial_sequence", [])),
        }
        for m in modules
    ]


@router.get("/modules/by-tag", summary="Find modules matching one or more game tags")
async def modules_by_tag(
    tags: str = Query(..., description="Comma-separated game tags, e.g. SN2,steric_hindrance"),
):
    """
    Returns all modules whose game_tags overlap with the requested tags.
    Ordered by number of overlapping tags (most relevant first).
    """
    requested = {t.strip() for t in tags.split(",") if t.strip()}
    scored: list[tuple[int, dict]] = []
    for m in _MODULES:
        overlap = len(requested & set(m["game_tags"]))
        if overlap:
            scored.append((overlap, m))
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


@router.get("/modules/{module_id}", summary="Get a single module with full tutorial sequence")
async def get_module(module_id: str):
    m = _MOD_BY_ID.get(module_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")
    return m


@router.get("/summary", summary="Curriculum statistics")
async def curriculum_summary():
    tier_counts: dict[str, int] = {}
    all_tags: set[str] = set()
    for m in _MODULES:
        d = m["difficulty"]
        tier_counts[d] = tier_counts.get(d, 0) + 1
        all_tags.update(m["game_tags"])
    return {
        "total_modules":   len(_MODULES),
        "by_difficulty":   tier_counts,
        "total_slides":    sum(len(m.get("tutorial_sequence", [])) for m in _MODULES),
        "unique_tags":     len(all_tags),
        "tag_index_size":  len(_TAG_INDEX),
        "all_tags_sorted": sorted(all_tags),
    }
