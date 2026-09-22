"""
ChemClash — FastAPI Backend  (single-file entry point)
Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
or directly:
    python main.py

All logic (fast validator, user profiles, challenge bank, adaptive PYQ,
curriculum) lives in this one file so any hosting service can point straight
at main.py with zero extra imports.
"""

from __future__ import annotations

# ── Standard library ──────────────────────────────────────────────────────────
import logging
import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path regardless of how or where uvicorn is launched
_BACKEND_DIR = str(Path(__file__).resolve().parent)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# ── Third-party ───────────────────────────────────────────────────────────────
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Dedicated modules (single source of truth) ────────────────────────────────
from challenge_bank import CHALLENGES
from config import OPENAI_API_KEY, _NO_KEY
from routers.adaptive import _PYQ_DB       # loaded once in adaptive router
from routers.curriculum import _MODULES    # loaded once in curriculum router

# config.py calls load_dotenv() at import time — no second call needed here.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chemclash")


def _llm_available() -> bool:
    """True when a real API key is configured (used by the health endpoint)."""
    return bool(OPENAI_API_KEY) and OPENAI_API_KEY not in _NO_KEY


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 8 — FASTAPI APP + CORS
# ═════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="ChemClash API",
    description=(
        "Backend for ChemClash — Organic Chemistry Arena.\n\n"
        "Interactive docs: http://localhost:8000/docs\n"
        "All routes work without an API key (rule-based fast path)."
    ),
    version="0.3.0",
)

# allow_origin_regex dynamically reflects the requesting origin so that
# allow_credentials=True adheres to the CORS specification (which forbids '*' with credentials).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 10 — HEALTH
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    """Health check. Returns service status and whether LLM is configured."""
    return {
        "status":       "ok",
        "service":      "ChemClash API v0.3.0",
        "llm_enabled":  _llm_available(),
        "pyq_count":    len(_PYQ_DB),
        "modules":      len(_MODULES),
        "challenges":   len(CHALLENGES),
        "docs":         "/docs",
    }


@app.get("/api/ping", tags=["Health"])
async def ping():
    """
    Ultra-lightweight keep-alive endpoint.
    The frontend fires this on every page load so the Render free-tier
    server is already warm by the time the first real API call is made.
    Returns in <1 ms — no DB, no disk, no computation.
    """
    return {"ok": True}


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 11 — MECHANISM ROUTES  (delegated to routers/mechanism.py)
# ═════════════════════════════════════════════════════════════════════════════
from routers.mechanism import router as _mechanism_router  # noqa: E402
app.include_router(_mechanism_router, prefix="/api", tags=["Mechanism"])

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 12 — ADAPTIVE PYQ ROUTES  (delegated to routers/adaptive.py)
# ═════════════════════════════════════════════════════════════════════════════
from routers.adaptive import router as _adaptive_router  # noqa: E402
app.include_router(_adaptive_router, prefix="/api/adaptive", tags=["Adaptive PYQ"])

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 13 — CURRICULUM ROUTES  (delegated to routers/curriculum.py)
# ═════════════════════════════════════════════════════════════════════════════
from routers.curriculum import router as _curriculum_router  # noqa: E402
app.include_router(_curriculum_router, prefix="/api/curriculum", tags=["Curriculum"])

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 14 — USER PROFILES  (delegated to routers/user.py)
# ═════════════════════════════════════════════════════════════════════════════
from routers.user import user_router as _user_router  # noqa: E402
app.include_router(_user_router)   # prefix="/user" is declared inside user_router

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 14b — AUTH ROUTES  (email/password accounts + JWT session cookies)
# ═════════════════════════════════════════════════════════════════════════════
from routers.auth import router as _auth_router  # noqa: E402
app.include_router(_auth_router)   # prefix="/auth" is declared inside auth router

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 15 — SNAP-TO-SOLVE  (image-based Socratic doubt resolution)
# ═════════════════════════════════════════════════════════════════════════════

class SnapRequest(BaseModel):
    image_b64: str = Field(..., description="Base-64 encoded image (JPEG/PNG), without data-URL prefix")
    media_type: str = Field("image/jpeg", description="MIME type of the uploaded image")
    persona: str = Field("socratic", description="Mentor persona: socratic | concept_coach | exam_coach | quick_revision")
    language: str = Field("english", description="Response language: english | telugu | hindi")


# Vision-capable model name prefixes (OpenAI)
_VISION_PREFIXES = ("gpt-4o", "gpt-4-vision", "gpt-4-turbo")

def _vision_available() -> bool:
    """True when the current provider/model combo supports image inputs."""
    from config import LLM_PROVIDER, OPENAI_API_KEY, OPENAI_MODEL, _NO_KEY  # noqa: PLC0415
    if LLM_PROVIDER != "openai":
        return False
    if not OPENAI_API_KEY or OPENAI_API_KEY in _NO_KEY:
        return False
    return any(OPENAI_MODEL.startswith(p) for p in _VISION_PREFIXES)


# ── Per-persona behaviour instructions ───────────────────────────────────────

_PERSONA_INSTRUCTIONS: dict[str, str] = {
    "socratic": (
        "You are a Socratic mentor. Your ONLY tool is the well-placed question.\n"
        "- Do NOT explain the concept directly.\n"
        "- Do NOT give worked steps.\n"
        "- Identify the first questionable step and ask ONE guiding question that "
        "  leads the student to reason their way to the answer themselves.\n"
        "- Your socratic_question must end with a '?'."
    ),
    "concept_coach": (
        "You are a Concept Coach. Your goal is conceptual clarity.\n"
        "- Identify what chemistry principle is being tested.\n"
        "- In 'principle', give a clear one-sentence explanation of the underlying concept.\n"
        "- In 'socratic_question', ask the student to apply that concept to their specific step.\n"
        "- Do NOT give the final numerical answer or complete solution."
    ),
    "exam_coach": (
        "You are an Exam Coach focused on JEE/competitive exam strategy.\n"
        "- Identify the concept being tested and name the common exam trap.\n"
        "- In 'first_issue', highlight the step where most students lose marks.\n"
        "- In 'principle', name the rule or shortcut that applies in an exam context.\n"
        "- In 'socratic_question', ask a concise strategy question (\"Which rule eliminates "
        "  wrong options here?\").\n"
        "- Do NOT give the final answer."
    ),
    "quick_revision": (
        "You are a Quick Revision assistant. Be maximally concise.\n"
        "- In 'identified', give a 5-word label for the topic.\n"
        "- In 'first_issue', state the key gap in one short phrase.\n"
        "- In 'principle', give the single most important revision point.\n"
        "- In 'socratic_question', give a one-sentence recall prompt.\n"
        "- Do NOT write full paragraphs."
    ),
}

# ── Per-language instruction suffix ──────────────────────────────────────────

_LANGUAGE_SUFFIXES: dict[str, str] = {
    "english": (
        "Respond entirely in English."
    ),
    "telugu": (
        "Respond entirely in Telugu (తెలుగు). All four JSON values must be written in Telugu script. "
        "If you cannot produce fluent Telugu for chemistry content, write the chemistry terms in "
        "English but all surrounding prose in Telugu."
    ),
    "hindi": (
        "Respond entirely in Hindi (हिन्दी). All four JSON values must be written in Hindi (Devanagari). "
        "If you cannot produce fluent Hindi for chemistry terms, write the chemistry terms in "
        "English but all surrounding prose in Hindi."
    ),
}

_SNAP_JSON_SCHEMA = """
Return ONLY a valid JSON object with exactly these keys — no markdown, no extra keys, no prose outside the JSON:
{
  "identified": "<one sentence: what you see in the image>",
  "first_issue": "<one sentence: the first questionable step or gap, or 'None apparent'>",
  "principle": "<the core chemistry concept at play>",
  "socratic_question": "<your single guiding question or recall prompt>"
}
""".strip()


def _build_snap_system(persona: str, language: str) -> str:
    """Compose the system prompt from persona + language blocks."""
    persona_block = _PERSONA_INSTRUCTIONS.get(persona, _PERSONA_INSTRUCTIONS["socratic"])
    language_block = _LANGUAGE_SUFFIXES.get(language, _LANGUAGE_SUFFIXES["english"])
    return (
        "You are a chemistry mentor inside ChemClash, a competitive chemistry game for JEE students.\n"
        "A student has uploaded an image of a chemistry question, reaction, or notebook page.\n\n"
        f"== YOUR PERSONA ==\n{persona_block}\n\n"
        f"== LANGUAGE ==\n{language_block}\n\n"
        f"== OUTPUT FORMAT ==\n{_SNAP_JSON_SCHEMA}"
    )


@app.post("/api/snap-analyze", tags=["Snap-to-Solve"])
async def snap_analyze(body: SnapRequest):
    """
    Analyse a base-64 encoded chemistry image using OpenAI vision.
    Supports persona (socratic|concept_coach|exam_coach|quick_revision)
    and language (english|telugu|hindi).
    Returns a Socratic diagnosis, or { "supported": false } if vision is unavailable.
    """
    if not _vision_available():
        return {
            "supported": False,
            "reason": (
                "Vision analysis requires LLM_PROVIDER=openai with a vision-capable model "
                "(gpt-4o, gpt-4o-mini, gpt-4-vision-preview) and a valid OPENAI_API_KEY. "
                "The current configuration does not meet these requirements."
            ),
        }

    from openai import OpenAI  # noqa: PLC0415
    from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE  # noqa: PLC0415
    import json as _json  # noqa: PLC0415

    system_prompt = _build_snap_system(
        persona=body.persona.lower().strip(),
        language=body.language.lower().strip(),
    )

    client_kwargs: dict = {"api_key": OPENAI_API_KEY}
    if OPENAI_BASE_URL:
        client_kwargs["base_url"] = OPENAI_BASE_URL
    client = OpenAI(**client_kwargs)

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{body.media_type};base64,{body.image_b64}",
                        "detail": "high",
                    },
                },
                {
                    "type": "text",
                    "text": "Analyse this chemistry image according to your instructions and return the JSON object.",
                },
            ],
        },
    ]

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,  # type: ignore[arg-type]
            max_tokens=LLM_MAX_TOKENS,
            temperature=LLM_TEMPERATURE,
        )
        raw = response.choices[0].message.content or ""
        result = _json.loads(raw)
        return {"supported": True, **result}
    except Exception as exc:
        logger.error("snap_analyze error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Vision model error: {exc}") from exc


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 16 — IGNITION BLOCK
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
