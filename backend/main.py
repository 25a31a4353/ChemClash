"""
ChemClash — FastAPI Backend
Entry point. Mounts all routers and configures CORS so the Next.js
frontend (localhost:3000) can reach the API during development.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.mechanism import router as mechanism_router

app = FastAPI(
    title="ChemClash API",
    description="Backend for ChemClash — Organic Chemistry Arena",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the Next.js dev server and any deployed frontend origin.
# Tighten `allow_origins` to your production domain before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(mechanism_router, prefix="/api", tags=["Mechanism"])


@app.get("/", tags=["Health"])
async def root():
    """Health-check endpoint."""
    return {"status": "ok", "service": "ChemClash API v0.1.0"}
