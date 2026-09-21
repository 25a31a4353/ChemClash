"""
ChemClash — User Profile Router  (canonical implementation)
============================================================
Database: MongoDB via Motor (async driver) with in-memory fallback for local dev.
Collection: user_profiles  (single source of truth)
Mounted in main.py under prefix "/user".

POST /user/{user_id}/update-match accepts the frontend contract:
    { elo_change: int, weakness_updates: Dict[str, float] }
and also preserves streak-day-difference logic.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

from config import MONGODB_URL, MONGODB_DB_NAME

logger = logging.getLogger("chemclash.user")

# ─────────────────────────────────────────────────────────────────────────────
# 1. DATABASE CONFIGURATION & ASYNC CLIENT
# ─────────────────────────────────────────────────────────────────────────────

DB_NAME = MONGODB_DB_NAME

_mongo_available = False
users_collection = None

if MONGODB_URL:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        _client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=3000)
        _db = _client[DB_NAME]
        users_collection = _db["user_profiles"]   # canonical collection name
        _mongo_available = True
    except Exception as exc:
        logger.warning("MongoDB client init failed (%s) — using in-memory store", exc)
        _mongo_available = False

# In-memory fallback if MongoDB is not configured or offline
_IN_MEMORY_PROFILES: dict[str, dict] = {}


async def init_db_indexes():
    """Ensure unique index on user_id for fast lookups if MongoDB is active."""
    if _mongo_available and users_collection is not None:
        try:
            await users_collection.create_index("user_id", unique=True)
            logger.info("MongoDB user_profiles indexes initialised.")
        except Exception as exc:
            logger.warning("Failed to create MongoDB indexes: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# 2. PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    user_id: str = Field(..., description="Unique user ID")
    elo_rating: int = Field(default=1200, ge=0, description="Player ELO rating")
    streak_days: int = Field(default=1, ge=0, description="Consecutive daily activity streak")
    last_played: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the player's last recorded match or activity",
    )
    concept_weaknesses: Dict[str, float] = Field(
        default_factory=dict,
        description="Map of organic chemistry concept tags to cumulative failure weight",
    )


# Maximum absolute ELO delta accepted from the client.
# All current game modes send deltas in the range [-6, +12].
# This bound prevents arbitrary score manipulation while leaving ample headroom
# for future game modes, without redesigning ELO calculation.
_ELO_DELTA_MAX = 50

class UpdateMatchRequest(BaseModel):
    """
    Frontend contract (api.ts syncMatchResult):
        { elo_change: int, weakness_updates: Record<string, number> }

    elo_change  — signed ELO delta in [-50, +50]; rejected with 422 outside this range
    weakness_updates — concept tag → weight to accumulate (1.0 per wrong answer)
    """
    elo_change: int = Field(
        ...,
        ge=-_ELO_DELTA_MAX,
        le=_ELO_DELTA_MAX,
        description=f"Signed ELO delta, bounded to [{-_ELO_DELTA_MAX}, {_ELO_DELTA_MAX}]",
    )
    weakness_updates: Dict[str, float] = Field(
        default_factory=dict,
        description="Concept tags to accumulate (pass {} when answer was correct)",
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. ROUTER & ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

user_router = APIRouter(prefix="/user", tags=["User Profiles"])


@user_router.get("/{user_id}", response_model=UserProfile)
async def get_or_create_user_profile(user_id: str):
    """
    Fetch the player profile by user_id.
    If this is the player's first visit, automatically create and return a default profile.
    """
    cleaned_id = user_id.strip()
    if not cleaned_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id cannot be empty")

    now = datetime.now(timezone.utc)

    # 1. MongoDB path
    if _mongo_available and users_collection is not None:
        try:
            doc = await users_collection.find_one({"user_id": cleaned_id}, {"_id": 0})
            if doc:
                return UserProfile(**doc)

            new_profile = UserProfile(
                user_id=cleaned_id,
                elo_rating=1200,
                streak_days=1,
                last_played=now,
                concept_weaknesses={},
            )
            await users_collection.insert_one(new_profile.model_dump())
            return new_profile
        except Exception as exc:
            logger.warning("MongoDB read failed (%s) — falling back to memory", exc)

    # 2. In-memory fallback
    if cleaned_id not in _IN_MEMORY_PROFILES:
        _IN_MEMORY_PROFILES[cleaned_id] = {
            "user_id": cleaned_id,
            "elo_rating": 1200,
            "streak_days": 1,
            "last_played": now,
            "concept_weaknesses": {},
        }

    return UserProfile(**_IN_MEMORY_PROFILES[cleaned_id])


@user_router.post("/{user_id}/update-match", response_model=UserProfile)
async def update_match_results(user_id: str, payload: UpdateMatchRequest):
    """
    Update player stats after a match or PYQ attempt.
    Applies elo_change, accumulates weakness_updates, and advances streak_days.
    """
    cleaned_id = user_id.strip()
    now = datetime.now(timezone.utc)

    # Fetch current profile (creates if absent)
    current_profile = await get_or_create_user_profile(cleaned_id)

    # ELO — apply signed delta, floor at 0
    updated_elo = max(0, current_profile.elo_rating + payload.elo_change)

    # Streak — day-difference calculation
    last_played = current_profile.last_played
    if last_played.tzinfo is None:
        last_played = last_played.replace(tzinfo=timezone.utc)

    days_diff = (now.date() - last_played.date()).days
    if days_diff == 1:
        new_streak = current_profile.streak_days + 1
    elif days_diff == 0:
        new_streak = current_profile.streak_days
    else:
        new_streak = 1  # reset if gap > 1 day

    # weakness_updates is accepted for frontend API compatibility but intentionally
    # NOT applied here. concept_weaknesses are tracked exclusively by user_profiles.py
    # (the canonical weakness source) which is updated by POST /api/adaptive/answer.

    # MongoDB update — ELO and streak only
    if _mongo_available and users_collection is not None:
        try:
            update_ops: dict = {
                "$set": {
                    "elo_rating": updated_elo,
                    "streak_days": new_streak,
                    "last_played": now,
                }
            }

            updated_doc = await users_collection.find_one_and_update(
                {"user_id": cleaned_id},
                update_ops,
                upsert=True,
                return_document=True,
                projection={"_id": 0},
            )
            return UserProfile(**updated_doc)
        except Exception as exc:
            logger.warning("MongoDB update failed (%s) — updating in memory", exc)

    # In-memory fallback — ELO and streak only
    mem = dict(_IN_MEMORY_PROFILES.get(cleaned_id, current_profile.model_dump()))
    mem["elo_rating"] = updated_elo
    mem["streak_days"] = new_streak
    mem["last_played"] = now

    _IN_MEMORY_PROFILES[cleaned_id] = mem
    return UserProfile(**mem)
