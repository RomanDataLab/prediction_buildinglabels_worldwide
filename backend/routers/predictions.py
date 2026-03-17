"""Predictions router – linear regression forecasts of EE scores."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
import numpy as np

router = APIRouter(tags=["predictions"])

_seed: dict = {}


def set_seed(data: dict) -> None:
    global _seed
    _seed = data


# ── helpers ──────────────────────────────────────────────────────────────────

def _historical_scores(iso2: str) -> list[tuple[int, float]]:
    """Return [(year, score), ...] sorted by year for a country."""
    scores_by_year = _seed.get("scores_by_year", {})
    points: list[tuple[int, float]] = []

    for year_str, countries in scores_by_year.items():
        if iso2 in countries:
            score = countries[iso2].get("score")
            if score is not None:
                points.append((int(year_str), float(score)))

    points.sort(key=lambda p: p[0])
    return points


def _forecast_country(iso2: str, target_year: int) -> dict | None:
    """Linear regression forecast for one country to a target year."""
    points = _historical_scores(iso2)
    if len(points) < 2:
        return None

    years = np.array([p[0] for p in points], dtype=float)
    scores = np.array([p[1] for p in points], dtype=float)

    # numpy polyfit degree 1 (linear)
    coeffs = np.polyfit(years, scores, 1)
    slope, intercept = float(coeffs[0]), float(coeffs[1])

    projected_score = slope * target_year + intercept
    # Clamp to 0-100 range
    projected_score = max(0.0, min(100.0, projected_score))

    countries_meta = _seed.get("countries", {})

    return {
        "iso2": iso2,
        "name": countries_meta.get(iso2, {}).get("name", iso2),
        "historical": [{"year": y, "score": s} for y, s in points],
        "target_year": target_year,
        "projected_score": round(projected_score, 2),
        "slope": round(slope, 4),
        "intercept": round(intercept, 2),
    }


# ── endpoints ────────────────────────────────────────────────────────────────

@router.get("/forecast/{iso2}")
def forecast_country(
    iso2: str,
    years: int = Query(5, ge=1, le=30, description="Years ahead from latest data point"),
):
    """Linear interpolation/extrapolation of EE score for a country."""
    iso2_upper = iso2.upper()

    # Determine the latest year in the dataset
    all_years = [int(y) for y in _seed.get("scores_by_year", {}).keys()]
    if not all_years:
        raise HTTPException(status_code=404, detail="No data available")

    target_year = max(all_years) + years

    result = _forecast_country(iso2_upper, target_year)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No historical data for country '{iso2_upper}'",
        )

    return {
        "data": result,
        "metadata": {
            "method": "linear_regression",
            "degree": 1,
            "target_year": target_year,
            "years_ahead": years,
        },
    }


@router.get("/forecast-all")
def forecast_all(
    target_year: int = Query(2030, description="Target year for projection"),
):
    """All countries projected to a target year (default 2030)."""
    countries_meta = _seed.get("countries", {})
    results: list[dict] = []

    for iso2 in countries_meta:
        result = _forecast_country(iso2, target_year)
        if result is not None:
            results.append(result)

    results.sort(key=lambda r: r["projected_score"], reverse=True)

    return {
        "data": results,
        "metadata": {
            "method": "linear_regression",
            "degree": 1,
            "target_year": target_year,
            "country_count": len(results),
        },
    }
