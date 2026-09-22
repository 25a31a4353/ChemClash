"""
ChemClash — Configuration
Reads environment variables (from .env via python-dotenv).
Supports both the standard OpenAI SDK and IBM watsonx.ai.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Placeholder-key sentinel (shared across modules) ─────────────────────────
# Any key matching one of these values is treated as "not configured".
_NO_KEY: frozenset[str] = frozenset({"sk-...", "", "your-key-here"})

# ── LLM Provider ──────────────────────────────────────────────────────────────
# Set LLM_PROVIDER=watsonx  to use IBM watsonx.ai
# Set LLM_PROVIDER=openai   to use OpenAI / any OpenAI-compatible endpoint
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai")

# ── OpenAI / OpenAI-compatible settings ───────────────────────────────────────
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
# Override base_url to point at a local proxy, Azure, or any OpenAI-compatible API
OPENAI_BASE_URL: str | None = os.getenv("OPENAI_BASE_URL", None)
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# ── IBM watsonx.ai settings ───────────────────────────────────────────────────
WATSONX_API_KEY: str = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID: str = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL: str = os.getenv(
    "WATSONX_URL", "https://us-south.ml.cloud.ibm.com"
)
WATSONX_MODEL: str = os.getenv("WATSONX_MODEL", "ibm/granite-13b-chat-v2")

# ── LLM generation parameters ────────────────────────────────────────────────
LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "512"))
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))

# ── MongoDB ───────────────────────────────────────────────────────────────────
# MONGO_URI  — used by main.py's Motor client (always-on connection)
# MONGODB_URL / MONGODB_DB_NAME — used by routers/user.py (optional, with
#   in-memory fallback when the var is absent)
MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGODB_URL: str = os.getenv("MONGODB_URL", "")
MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "chemclash")

# ── Authentication ────────────────────────────────────────────────────────────
# JWT_SECRET — used to sign/verify session tokens.
# In development, a stable fallback is used so tokens survive server restarts.
# In production, set JWT_SECRET in environment variables.
JWT_SECRET: str = os.getenv(
    "JWT_SECRET",
    "chemclash-dev-secret-key-stable-session-2026-fallback-32b",
)
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", "30"))
