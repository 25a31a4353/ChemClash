"""
ChemClash — FastAPI Backend  v2
Entry point. Mounts all routers and configures CORS.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.mechanism import router as mechanism_router
from routers.adaptive  import router as adaptive_router
from routers.curriculum import router as curriculum_router

app = FastAPI(
    title="ChemClash API",
    description="Backend for ChemClash — Organic Chemistry Arena",
    version="0.2.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(mechanism_router,  prefix="/api",            tags=["Mechanism"])
app.include_router(adaptive_router,   prefix="/api/adaptive",   tags=["Adaptive PYQ"])
app.include_router(curriculum_router, prefix="/api/curriculum", tags=["Curriculum"])


@app.get("/", tags=["Health"])
async def root():
    """Health-check endpoint."""
    return {"status": "ok", "service": "ChemClash API v0.2.0"}
