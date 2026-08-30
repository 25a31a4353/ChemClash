"""
ChemClash — User Profile & Weakness Database Router
===================================================
Database: MongoDB via Motor (async driver) with in-memory fallback for local dev.
Authentication: Clerk user_id
Purpose: Track player ELO, daily streaks, and topic weaknesses for AI matchmaking.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger("chemclash.user")

# ─────────────────────────────────────────────────────────────────────────────
# 1. DATABASE CONFIGURATION & ASYNC CLIENT
# ─────────────────────────────────────────────────────────────────────────────

MONGODB_URL = os.environ.get("MONGODB_URL", "")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "chemclash")

_mongo_available = False
users_collection = None

if MONGODB_URL:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=3000)
        db = client[DB_NAME]
        users_collection = db["user_profiles"]
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
    user_id: str = Field(..., description="Unique Clerk User ID (e.g. user_2bXy...)")
    elo_rating: int = Field(default=1200, ge=0, description="Player ELO rating")
    streak_days: int = Field(default=1, ge=0, description="Consecutive daily activity streak")
    last_played: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the player's last recorded match or activity",
    )
    concept_weaknesses: Dict[str, int] = Field(
        default_factory=dict,
        description="Map of organic chemistry concept tags to failure counts (e.g. {'sn2': 3, 'aldol': 5})",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_2XYZ9876abc",
                "elo_rating": 1245,
                "streak_days": 4,
                "last_played": "2026-08-30T12:00:00Z",
                "concept_weaknesses": {
                    "sn2": 3,
                    "steric_hindrance": 4,
                    "markovnikov": 1,
                },
            }
        }


class UpdateMatchRequest(BaseModel):
    new_elo: Optional[int] = Field(None, description="Updated absolute ELO score")
    elo_delta: Optional[int] = Field(None, description="ELO points gained or lost (e.g. +10 or -5)")
    failed_concepts: List[str] = Field(
        default_factory=list,
        description="Concept tags missed during the match (e.g. ['sn2', 'neopentyl_halide'])",
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. ROUTER & ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

user_router = APIRouter(prefix="/user", tags=["User Profiles"])


@user_router.get("/{user_id}", response_model=UserProfile)
async def get_or_create_user_profile(user_id: str):
    """
    Fetch the player profile by Clerk user_id.
    If this is the player's first login, automatically create and return a default profile.
    """
    cleaned_id = user_id.strip()
    if not cleaned_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id cannot be empty")

    now = datetime.now(timezone.utc)

    # 1. MongoDB Query
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
    Update player stats after a match or PYQ attempt:
    - Adjusts ELO rating.
    - Dynamically increments failure counts for failed concept tags ($inc).
    - Updates consecutive daily streaks based on UTC timestamps.
    """
    cleaned_id = user_id.strip()
    now = datetime.now(timezone.utc)

    # Fetch current profile to calculate streak
    current_profile = await get_or_create_user_profile(cleaned_id)

    # ELO calculation
    updated_elo = current_profile.elo_rating
    if payload.new_elo is not None:
        updated_elo = max(0, payload.new_elo)
    elif payload.elo_delta is not None:
        updated_elo = max(0, current_profile.elo_rating + payload.elo_delta)

    # Streak calculation
    last_played = current_profile.last_played
    if last_played.tzinfo is None:
        last_played = last_played.replace(tzinfo=timezone.utc)

    days_diff = (now.date() - last_played.date()).days
    if days_diff == 1:
        new_streak = current_profile.streak_days + 1
    elif days_diff == 0:
        new_streak = current_profile.streak_days
    else:
        new_streak = 1

    # MongoDB update
    if _mongo_available and users_collection is not None:
        try:
            update_ops: dict = {
                "$set": {
                    "elo_rating": updated_elo,
                    "streak_days": new_streak,
                    "last_played": now,
                }
            }

            if payload.failed_concepts:
                inc_dict = {}
                for tag in payload.failed_concepts:
                    clean_tag = tag.strip().lower().replace(" ", "_").replace(".", "_")
                    if clean_tag:
                        inc_dict[f"concept_weaknesses.{clean_tag}"] = 1
                if inc_dict:
                    update_ops["$inc"] = inc_dict

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

    # In-memory update fallback
    mem = _IN_MEMORY_PROFILES.get(cleaned_id, current_profile.model_dump())
    mem["elo_rating"] = updated_elo
    mem["streak_days"] = new_streak
    mem["last_played"] = now

    for tag in payload.failed_concepts:
        clean_tag = tag.strip().lower().replace(" ", "_").replace(".", "_")
        if clean_tag:
            mem["concept_weaknesses"][clean_tag] = mem["concept_weaknesses"].get(clean_tag, 0) + 1

    _IN_MEMORY_PROFILES[cleaned_id] = mem
    return UserProfile(**mem)
