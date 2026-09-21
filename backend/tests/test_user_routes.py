"""
ChemClash — User Route Tests
Verifies that GET /user/{user_id} and POST /user/{user_id}/update-match
are reachable and behave correctly.

Routes are owned by routers/user.py and mounted in main.py under prefix "/user".
In-memory fallback is exercised by setting routers.user._mongo_available = False.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_mock_collection(doc: dict | None = None):
    """Return a mock Motor collection that returns `doc` from find_one."""
    mock_col = MagicMock()
    mock_col.find_one = AsyncMock(return_value=doc)
    mock_col.insert_one = AsyncMock(return_value=MagicMock(inserted_id="fake"))
    mock_col.update_one = AsyncMock(return_value=MagicMock(upserted_id="fake"))
    mock_col.find_one_and_update = AsyncMock(return_value=None)
    return mock_col


# ── Route Registration ─────────────────────────────────────────────────────────

class TestUserRouteRegistration:

    def test_get_user_route_is_registered(self):
        """GET /user/{user_id} must appear in the app's route list."""
        paths = [r.path for r in app.routes if hasattr(r, "path")]
        assert "/user/{user_id}" in paths, (
            "GET /user/{user_id} is not registered on the FastAPI app"
        )

    def test_update_match_route_is_registered(self):
        """POST /user/{user_id}/update-match must appear in the app's route list."""
        paths = [r.path for r in app.routes if hasattr(r, "path")]
        assert "/user/{user_id}/update-match" in paths, (
            "POST /user/{user_id}/update-match is not registered on the FastAPI app"
        )


# ── GET /user/{user_id} ────────────────────────────────────────────────────────

class TestGetUser:

    def test_returns_new_profile_when_user_not_found(self):
        """When MongoDB is bypassed (in-memory path), a default profile is returned."""
        # Force in-memory path by disabling mongo and clearing the store
        import routers.user as user_mod
        user_mod._IN_MEMORY_PROFILES.pop("test_user_001", None)
        with patch.object(user_mod, "_mongo_available", False):
            resp = client.get("/user/test_user_001")

        assert resp.status_code == 200
        body = resp.json()
        assert body["user_id"] == "test_user_001"
        assert body["elo_rating"] == 1200
        assert body["streak_days"] == 1          # router default is 1
        assert isinstance(body["concept_weaknesses"], dict)

    def test_returns_existing_profile(self):
        """When MongoDB returns a document, it is returned as-is."""
        import datetime
        existing = {
            "user_id": "existing_user",
            "elo_rating": 1450,
            "streak_days": 7,
            "last_played": datetime.datetime(2026, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc).isoformat(),
            "concept_weaknesses": {"sn2": 3.0},
        }
        import routers.user as user_mod
        mock_col = _make_mock_collection(doc=existing)
        with patch.object(user_mod, "users_collection", mock_col), \
             patch.object(user_mod, "_mongo_available", True):
            resp = client.get("/user/existing_user")

        assert resp.status_code == 200
        body = resp.json()
        assert body["user_id"] == "existing_user"
        assert body["elo_rating"] == 1450
        assert body["streak_days"] == 7


# ── POST /user/{user_id}/update-match ─────────────────────────────────────────

class TestUpdateMatch:

    def test_elo_increase_applied(self):
        """Posting elo_change=+50 should bump ELO from 1200 to 1250."""
        import routers.user as user_mod
        user_mod._IN_MEMORY_PROFILES.pop("player_123", None)
        with patch.object(user_mod, "_mongo_available", False):
            resp = client.post(
                "/user/player_123/update-match",
                json={"elo_change": 50, "weakness_updates": {}},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["elo_rating"] == 1250

    def test_elo_decrease_applied(self):
        """Posting elo_change=-30 should reduce ELO from 1200 to 1170."""
        import routers.user as user_mod
        user_mod._IN_MEMORY_PROFILES.pop("player_456", None)
        with patch.object(user_mod, "_mongo_available", False):
            resp = client.post(
                "/user/player_456/update-match",
                json={"elo_change": -30, "weakness_updates": {}},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["elo_rating"] == 1170

    def test_weakness_updates_accepted_but_not_applied_to_mongo_profile(self):
        """
        weakness_updates is still accepted in the request body (frontend compat)
        but is intentionally NOT written to concept_weaknesses in the user profile.
        Concept weaknesses are owned exclusively by user_profiles.py (the canonical
        weakness source), updated via POST /api/adaptive/answer.
        """
        import routers.user as user_mod
        user_mod._IN_MEMORY_PROFILES.pop("player_789", None)
        with patch.object(user_mod, "_mongo_available", False):
            resp = client.post(
                "/user/player_789/update-match",
                json={"elo_change": 0, "weakness_updates": {"sn2": 1.5, "e2": 2.0}},
            )

        assert resp.status_code == 200
        body = resp.json()
        # concept_weaknesses is NOT updated by this endpoint — canonical source is user_profiles.py
        assert body["concept_weaknesses"] == {}

    def test_elo_change_above_max_returns_422(self):
        """elo_change > +50 must be rejected with 422 (server-side bounds check)."""
        resp = client.post(
            "/user/player_elo_hi/update-match",
            json={"elo_change": 51, "weakness_updates": {}},
        )
        assert resp.status_code == 422

    def test_elo_change_below_min_returns_422(self):
        """elo_change < -50 must be rejected with 422 (server-side bounds check)."""
        resp = client.post(
            "/user/player_elo_lo/update-match",
            json={"elo_change": -51, "weakness_updates": {}},
        )
        assert resp.status_code == 422

    def test_elo_change_at_boundary_accepted(self):
        """elo_change of exactly ±50 must be accepted (boundary inclusive)."""
        import routers.user as user_mod
        user_mod._IN_MEMORY_PROFILES.pop("player_elo_bound", None)
        with patch.object(user_mod, "_mongo_available", False):
            resp = client.post(
                "/user/player_elo_bound/update-match",
                json={"elo_change": 50, "weakness_updates": {}},
            )
        assert resp.status_code == 200
        assert resp.json()["elo_rating"] == 1250   # 1200 + 50

    def test_missing_elo_change_returns_422(self):
        """Request body without required elo_change field should return 422."""
        resp = client.post(
            "/user/player_999/update-match",
            json={"weakness_updates": {}},
        )
        assert resp.status_code == 422
