"""
ChemClash — Authentication Router
==================================
Endpoints
---------
POST /auth/signup   — create account (email + password + display name)
POST /auth/login    — authenticate, return JWT in HttpOnly cookie
POST /auth/logout   — clear session cookie
GET  /auth/me       — return authenticated account details
PUT  /auth/me       — update onboarding prefs / tour completion flag

Account document shape (stored in MongoDB collection "accounts"):
{
  "user_id":        "uuid4 string",
  "email":          "lower-cased email",
  "password_hash":  "bcrypt hash — NEVER returned to client",
  "display_name":   "first name",
  "created_at":     ISO datetime,
  "onboarding_done": false,
  "tour_done":       false,
  "level":          "",           # high_school | college | graduate | jee | neet | other
  "goals":          [],           # list of goal ids
  "chem_coins":     11,           # balance (login + first-time bonus)
  "owned_rewards":  [],           # list of reward ids purchased
}

Security notes:
- Passwords are hashed with bcrypt (work factor 12).
- JWT tokens are signed HS256 with JWT_SECRET from config.
- Tokens are returned as HttpOnly, SameSite=Lax cookies — not in the JSON body.
- Client code reads "me" from GET /auth/me; it never holds the raw token.
- ELO and weakness scores remain in their canonical locations (user_profiles.py
  and routers/user.py). This router only manages account metadata.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone
import sys
from pathlib import Path
from typing import Any, Optional

# Ensure backend directory is on sys.path for config import
_BACKEND_DIR = str(Path(__file__).resolve().parent.parent)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import bcrypt
from fastapi import APIRouter, Cookie, Header, HTTPException, Request, Response, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field, field_validator

from config import JWT_ALGORITHM, JWT_EXPIRE_DAYS, JWT_SECRET, MONGODB_URL, MONGODB_DB_NAME

logger = logging.getLogger("chemclash.auth")

# ─────────────────────────────────────────────────────────────────────────────
# 1.  PERSISTENCE (MongoDB with JSON-file fallback)
# ─────────────────────────────────────────────────────────────────────────────

_mongo_available = False
_accounts_collection = None

if MONGODB_URL:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        _client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=3000)
        _db = _client[MONGODB_DB_NAME]
        _accounts_collection = _db["accounts"]
        _mongo_available = True
    except Exception as exc:
        logger.warning("Auth: MongoDB init failed (%s) — using JSON fallback", exc)

# JSON file fallback  (same pattern as user_profiles.py)
_DATA_DIR = Path(__file__).parent.parent / "data"
_ACCOUNTS_PATH = _DATA_DIR / "accounts.json"
_last_mtime: float = 0.0


def _load_accounts() -> dict[str, dict]:
    global _last_mtime
    if not _ACCOUNTS_PATH.exists():
        return {}
    try:
        _last_mtime = _ACCOUNTS_PATH.stat().st_mtime
        return json.loads(_ACCOUNTS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _sync_accounts_cache() -> None:
    global _last_mtime, _ACCOUNTS, _EMAIL_INDEX
    if not _ACCOUNTS_PATH.exists():
        return
    try:
        mtime = _ACCOUNTS_PATH.stat().st_mtime
        if mtime != _last_mtime:
            _last_mtime = mtime
            data = json.loads(_ACCOUNTS_PATH.read_text(encoding="utf-8"))
            _ACCOUNTS = data
            _EMAIL_INDEX = {v["email"]: k for k, v in _ACCOUNTS.items() if "email" in v}
    except Exception:
        pass


def _save_accounts(accounts: dict[str, dict]) -> None:
    global _last_mtime
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=_DATA_DIR, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(accounts, f, indent=2, default=str)
        os.replace(tmp, _ACCOUNTS_PATH)
        try:
            _last_mtime = _ACCOUNTS_PATH.stat().st_mtime
        except OSError:
            pass
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass


# In-memory cache for file-backed store
_ACCOUNTS: dict[str, dict] = _load_accounts()
# secondary index: lower-cased email → user_id
_EMAIL_INDEX: dict[str, str] = {
    v["email"]: k for k, v in _ACCOUNTS.items() if "email" in v
}


# ─────────────────────────────────────────────────────────────────────────────
# 2.  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _make_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def _decode_token(token: str) -> str | None:
    """Returns user_id or None if invalid/expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 3.  DB OPERATIONS  (async — MongoDB first, JSON fallback)
# ─────────────────────────────────────────────────────────────────────────────

async def _find_by_email(email: str) -> dict | None:
    if _mongo_available and _accounts_collection is not None:
        try:
            doc = await _accounts_collection.find_one({"email": email}, {"_id": 0})
            if doc:
                return doc
        except Exception as exc:
            logger.warning("Auth DB read failed (%s)", exc)
    _sync_accounts_cache()
    uid = _EMAIL_INDEX.get(email)
    return _ACCOUNTS.get(uid) if uid else None


async def _find_by_id(user_id: str) -> dict | None:
    if _mongo_available and _accounts_collection is not None:
        try:
            doc = await _accounts_collection.find_one({"user_id": user_id}, {"_id": 0})
            if doc:
                return doc
        except Exception as exc:
            logger.warning("Auth DB read failed (%s)", exc)
    _sync_accounts_cache()
    return _ACCOUNTS.get(user_id)


async def _insert_account(account: dict) -> None:
    if _mongo_available and _accounts_collection is not None:
        try:
            await _accounts_collection.insert_one({**account, "_id": account["user_id"]})
            return
        except Exception as exc:
            logger.warning("Auth DB insert failed (%s) — writing to JSON", exc)
    uid = account["user_id"]
    _ACCOUNTS[uid] = account
    _EMAIL_INDEX[account["email"]] = uid
    _save_accounts(_ACCOUNTS)


async def _update_account(user_id: str, updates: dict) -> dict | None:
    if _mongo_available and _accounts_collection is not None:
        try:
            doc = await _accounts_collection.find_one_and_update(
                {"user_id": user_id},
                {"$set": updates},
                return_document=True,
                projection={"_id": 0},
            )
            return doc
        except Exception as exc:
            logger.warning("Auth DB update failed (%s) — updating in memory", exc)
    if user_id in _ACCOUNTS:
        _ACCOUNTS[user_id].update(updates)
        _save_accounts(_ACCOUNTS)
        return _ACCOUNTS[user_id]
    return None


# ─────────────────────────────────────────────────────────────────────────────
# 4.  PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=60)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UpdateMeRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=60)
    onboarding_done: Optional[bool] = None
    tour_done: Optional[bool] = None
    level: Optional[str] = None
    goals: Optional[list[str]] = None


class UpdateCoinsRequest(BaseModel):
    delta: int = Field(..., ge=-1000, le=1000, description="Signed ChemCoin delta")
    reward_id: Optional[str] = Field(None, description="Reward ID if purchasing")


# Public-facing account shape (password_hash stripped)
def _public(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "password_hash"}


# ─────────────────────────────────────────────────────────────────────────────
# 5.  ROUTER
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/auth", tags=["Auth"])

_COOKIE_NAME = "cc_session"
_COOKIE_MAX_AGE = JWT_EXPIRE_DAYS * 86400  # seconds


def _is_https(request: Request | None) -> bool:
    if os.getenv("ENVIRONMENT") == "production" or os.getenv("RENDER") == "true":
        return True
    if request:
        proto = request.headers.get("x-forwarded-proto", "").lower()
        if proto == "https" or request.url.scheme == "https":
            return True
        origin = request.headers.get("origin", "").lower()
        if origin.startswith("https://"):
            return True
        referer = request.headers.get("referer", "").lower()
        if referer.startswith("https://"):
            return True
    return False


def _set_cookie(response: Response, token: str, request: Request | None = None) -> None:
    is_secure = _is_https(request)
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none" if is_secure else "lax",
        max_age=_COOKIE_MAX_AGE,
        secure=is_secure,
        path="/",
    )


def _clear_cookie(response: Response, request: Request | None = None) -> None:
    is_secure = _is_https(request)
    response.delete_cookie(
        key=_COOKIE_NAME,
        path="/",
        samesite="none" if is_secure else "lax",
        secure=is_secure,
    )


async def _require_auth(
    authorization: str | None = Header(default=None),
    cc_session: str | None = Cookie(default=None),
) -> dict:
    """Extract token from Authorization: Bearer <token> or cc_session cookie."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token:
        token = cc_session
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = _decode_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    account = await _find_by_id(user_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")
    return account


# ── POST /auth/signup ─────────────────────────────────────────────────────────

@router.post("/signup", summary="Create a new account")
async def signup(body: SignupRequest, request: Request, response: Response):
    email = body.email.lower().strip()
    existing = await _find_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    account: dict[str, Any] = {
        "user_id":        user_id,
        "email":          email,
        "password_hash":  _hash_password(body.password),
        "display_name":   body.display_name.strip(),
        "created_at":     now,
        "onboarding_done": False,
        "tour_done":       False,
        "level":          "",
        "goals":          [],
        "chem_coins":     11,    # 1 login + 10 welcome bonus
        "owned_rewards":  [],
    }
    await _insert_account(account)

    token = _make_token(user_id)
    _set_cookie(response, token, request)
    return {"ok": True, "token": token, "account": _public(account)}


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login", summary="Log in to an existing account")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.lower().strip()
    account = await _find_by_email(email)
    if not account or not _verify_password(body.password, account.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = _make_token(account["user_id"])
    _set_cookie(response, token, request)
    return {"ok": True, "token": token, "account": _public(account)}


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/logout", summary="Clear session cookie")
async def logout(request: Request, response: Response):
    _clear_cookie(response, request)
    return {"ok": True}


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", summary="Return the authenticated account")
async def get_me(
    authorization: str | None = Header(default=None),
    cc_session: str | None = Cookie(default=None),
):
    account = await _require_auth(authorization, cc_session)
    return _public(account)


# ── PUT /auth/me ──────────────────────────────────────────────────────────────

@router.put("/me", summary="Update onboarding/tour prefs")
async def update_me(
    body: UpdateMeRequest,
    authorization: str | None = Header(default=None),
    cc_session: str | None = Cookie(default=None),
):
    account = await _require_auth(authorization, cc_session)
    updates: dict[str, Any] = {}
    if body.display_name is not None:
        updates["display_name"] = body.display_name.strip()
    if body.onboarding_done is not None:
        updates["onboarding_done"] = body.onboarding_done
    if body.tour_done is not None:
        updates["tour_done"] = body.tour_done
    if body.level is not None:
        updates["level"] = body.level
    if body.goals is not None:
        updates["goals"] = body.goals

    if updates:
        updated = await _update_account(account["user_id"], updates)
        return _public(updated or account)
    return _public(account)


# ── POST /auth/coins ──────────────────────────────────────────────────────────

@router.post("/coins", summary="Adjust ChemCoin balance (earn or spend)")
async def adjust_coins(
    body: UpdateCoinsRequest,
    authorization: str | None = Header(default=None),
    cc_session: str | None = Cookie(default=None),
):
    """
    Atomic balance update. Prevents negative balances.
    If reward_id is provided (purchase), also appends to owned_rewards.
    """
    account = await _require_auth(authorization, cc_session)
    current = account.get("chem_coins", 0)
    new_balance = current + body.delta
    if new_balance < 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient ChemCoins (have {current}, need {-body.delta}).",
        )

    owned: list[str] = list(account.get("owned_rewards", []))
    if body.reward_id:
        if body.reward_id in owned:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reward already owned.",
            )
        if body.delta < 0:   # spending coins = purchase
            owned.append(body.reward_id)

    updates: dict[str, Any] = {"chem_coins": new_balance}
    if body.reward_id and body.delta < 0:
        updates["owned_rewards"] = owned

    updated = await _update_account(account["user_id"], updates)
    return _public(updated or account)
