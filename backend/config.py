"""
ChemClash — Configuration
Reads environment variables (from .env via python-dotenv).
Supports both the standard OpenAI SDK and IBM watsonx.ai.
"""

import os
from dotenv import load_dotenv

load_dotenv()

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
