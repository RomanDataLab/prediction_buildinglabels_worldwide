"""Energy Efficiency Worldwide API – FastAPI application."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import countries, standards, predictions

# ── Load seed data ───────────────────────────────────────────────────────────

SEED_PATH = Path(__file__).resolve().parent / "static" / "seed" / "ee_data.json"
EXPANSION_SEED_PATH = Path(__file__).resolve().parent / "static" / "seed" / "ee_data_expansion.json"
SUPPLEMENTAL_SEED_PATH = Path(__file__).resolve().parent / "static" / "seed" / "ee_data_supplemental.json"
LOCAL_CERTIFIED_OFFICIAL_PATH = Path(__file__).resolve().parent / "static" / "seed" / "local_certified_official.json"
GBA_BUILDING_STOCK_PATH = Path(__file__).resolve().parent / "static" / "seed" / "gba_building_stock_2019.json"


def _deep_merge(base: dict, extra: dict) -> dict:
    merged = dict(base)
    for key, value in extra.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


with open(SEED_PATH, "r", encoding="utf-8") as f:
    SEED_DATA: dict = json.load(f)

if EXPANSION_SEED_PATH.exists():
    with open(EXPANSION_SEED_PATH, "r", encoding="utf-8") as f:
        expansion_seed: dict = json.load(f)
    SEED_DATA = _deep_merge(SEED_DATA, expansion_seed)

if SUPPLEMENTAL_SEED_PATH.exists():
    with open(SUPPLEMENTAL_SEED_PATH, "r", encoding="utf-8") as f:
        supplemental_seed: dict = json.load(f)
    SEED_DATA = _deep_merge(SEED_DATA, supplemental_seed)

if LOCAL_CERTIFIED_OFFICIAL_PATH.exists():
    with open(LOCAL_CERTIFIED_OFFICIAL_PATH, "r", encoding="utf-8") as f:
        local_certified_seed: dict = json.load(f)
    SEED_DATA = _deep_merge(SEED_DATA, local_certified_seed)

if GBA_BUILDING_STOCK_PATH.exists():
    with open(GBA_BUILDING_STOCK_PATH, "r", encoding="utf-8") as f:
        gba_stock_seed: dict = json.load(f)
    SEED_DATA["gba_building_stock_2019"] = gba_stock_seed

# Inject seed data into each router
countries.set_seed(SEED_DATA)
standards.set_seed(SEED_DATA)
predictions.set_seed(SEED_DATA)

# ── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Energy Efficiency Worldwide API",
    description="Backend API for the Energy Efficiency Worldwide dashboard (App 2).",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ─────────────────────────────────────────────────────────────

STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(countries.router, prefix="/api")
app.include_router(standards.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
# Vercel Python routing can vary by deployment shape; expose unprefixed aliases too.
app.include_router(countries.router)
app.include_router(standards.router)
app.include_router(predictions.router)


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
def health_check():
    available_years = list(SEED_DATA.get("scores_by_year", {}).keys())
    country_count = len(SEED_DATA.get("countries", {}))
    return {
        "status": "healthy",
        "data": {
            "years": available_years,
            "country_count": country_count,
        },
    }
