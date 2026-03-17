"""Standards router – LEED / BREEAM / Passivhaus market data."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["standards"])

_seed: dict = {}
NON_STANDARD_KEYS = {
    "score",
    "mandatory",
    "buildings",
    "industry",
    "transport",
    "barriers",
    "total_buildings_stock",
    "zero_energy_buildings",
    "local_energy_label",
    "local_certified_buildings_official",
    "local_certified_period",
    "local_certified_as_of",
    "local_certified_source",
    "local_certified_quality",
}


def set_seed(data: dict) -> None:
    global _seed
    _seed = data


# ── helpers ──────────────────────────────────────────────────────────────────

def _available_standards(year_data: dict) -> list[str]:
    keys: set[str] = set()
    for metrics in year_data.values():
        for key, value in metrics.items():
            if key in NON_STANDARD_KEYS:
                continue
            if isinstance(value, (int, float)):
                keys.add(key)
    return sorted(keys)

def _aggregate_standard(year: str) -> dict:
    """Aggregate certification counts per standard for a given year."""
    year_data = _seed.get("scores_by_year", {}).get(year)
    if year_data is None:
        return {}

    standards = _available_standards(year_data)
    totals = {s: 0 for s in standards}
    country_count = 0

    for _iso2, metrics in year_data.items():
        country_count += 1
        for s in standards:
            totals[s] += metrics.get(s, 0)

    grand_total = sum(totals.values()) or 1  # avoid division by zero

    result = {}
    for s in standards:
        result[s] = {
            "total_certifications": totals[s],
            "market_share_pct": round(totals[s] / grand_total * 100, 2),
            "countries_with_certifications": sum(1 for _iso2, m in year_data.items() if (m.get(s, 0) or 0) > 0),
        }

    return result


def _standard_detail(name: str, year: str) -> dict:
    """Per-country breakdown for a single standard."""
    year_data = _seed.get("scores_by_year", {}).get(year)
    if year_data is None:
        return {}

    countries_meta = _seed.get("countries", {})
    rows: list[dict] = []

    for iso2, metrics in year_data.items():
        count = metrics.get(name, 0)
        rows.append({
            "iso2": iso2,
            "name": countries_meta.get(iso2, {}).get("name", iso2),
            "certifications": count,
            "score": metrics.get("score", 0),
            "mandatory": metrics.get("mandatory", False),
        })

    rows.sort(key=lambda r: r["certifications"], reverse=True)
    return {
        "standard": name,
        "countries": rows,
        "total": sum(r["certifications"] for r in rows),
    }


# ── endpoints ────────────────────────────────────────────────────────────────

@router.get("/market-share")
def get_market_share(
    year: str = Query("2025", description="Year of data"),
):
    """Return LEED / BREEAM / Passivhaus market-share data for a year."""
    agg = _aggregate_standard(year)
    if not agg:
        raise HTTPException(status_code=404, detail=f"No data for year {year}")

    return {
        "data": agg,
        "metadata": {
            "year": year,
            "standards": list(agg.keys()),
        },
    }


@router.get("/standards/{name}")
def get_standard_detail(
    name: str,
    year: str = Query("2025", description="Year of data"),
):
    """Detailed per-country data for one certification standard."""
    year_data = _seed.get("scores_by_year", {}).get(year)
    if year_data is None:
        raise HTTPException(status_code=404, detail=f"No data for year {year}")
    standards = _available_standards(year_data)
    key = name.lower()
    if key not in standards:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown standard '{name}'. Use one of {standards}.",
        )

    detail = _standard_detail(key, year)
    if not detail:
        raise HTTPException(status_code=404, detail=f"No data for year {year}")

    return {
        "data": detail,
        "metadata": {
            "year": year,
            "standard": key,
            "country_count": len(detail.get("countries", [])),
        },
    }
