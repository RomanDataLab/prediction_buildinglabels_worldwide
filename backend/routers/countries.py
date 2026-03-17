"""Countries router – EE rankings and country-level data."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["countries"])

# Will be injected from main.py via app.state
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


def _total_certifications(metrics: dict, standards: list[str]) -> int:
    return int(sum(int(metrics.get(std, 0) or 0) for std in standards))


def _certified_share_pct(total_certified: int, total_buildings_stock: int) -> float:
    if total_buildings_stock <= 0:
        return 0.0
    return round(total_certified / total_buildings_stock * 100, 4)


def _international_share_of_local_pct(total_certified: int, local_certified_official: int) -> float:
    if local_certified_official <= 0:
        return 0.0
    return round(total_certified / local_certified_official * 100, 4)


def _derive_local_certified_fallback(
    metrics: dict,
    total_certified: int,
    total_buildings_stock: int,
) -> tuple[int, str, str, str]:
    """Build a fallback local-certified denominator for full country coverage."""
    local_label = int(metrics.get("local_energy_label", 0) or 0)
    if local_label > 0:
        return (
            local_label,
            "derived from local energy label proxy",
            "internal proxy (local_energy_label field)",
            "proxy_local_energy_label",
        )

    nzeb = int(metrics.get("zero_energy_buildings", 0) or 0)
    if nzeb > 0:
        value = max(nzeb, int(round(total_certified * 1.5)))
        return (
            value,
            "derived from NZEB floor and dashboard certifications",
            "internal proxy (zero_energy_buildings + standards)",
            "proxy_nzeb_floor",
        )

    if total_buildings_stock > 0:
        value = max(int(round(total_buildings_stock * 0.003)), int(round(total_certified * 2)))
        return (
            value,
            "derived from building stock ratio and dashboard certifications",
            "internal proxy (building_stock + standards)",
            "proxy_stock_ratio",
        )

    value = max(1, int(round(total_certified * 2)))
    return (
        value,
        "derived from dashboard certifications only",
        "internal proxy (standards only)",
        "proxy_dashboard_only",
    )


def _gba_stock_for_country(iso2: str) -> int:
    stock_data = _seed.get("gba_building_stock_2019", {})
    by_iso2 = stock_data.get("iso2_counts", {})
    return int(by_iso2.get(iso2, 0) or 0)

def _country_rows(year: str, standard: str | None = None) -> list[dict]:
    """Build a flat list of country records for a given year."""
    year_data = _seed.get("scores_by_year", {}).get(year)
    if year_data is None:
        return []

    countries_meta = _seed.get("countries", {})
    standards = _available_standards(year_data)
    rows: list[dict] = []

    for iso2, metrics in year_data.items():
        standard_map = {std: int(metrics.get(std, 0) or 0) for std in standards}
        total_certified = _total_certifications(metrics, standards)
        total_buildings_stock = int(metrics.get("total_buildings_stock", 0) or 0)
        if total_buildings_stock <= 0:
            total_buildings_stock = _gba_stock_for_country(iso2)
        local_certified_official = int(metrics.get("local_certified_buildings_official", 0) or 0)
        local_period = str(metrics.get("local_certified_period", "") or "")
        local_as_of = str(metrics.get("local_certified_as_of", "") or "")
        local_source = str(metrics.get("local_certified_source", "") or "")
        local_quality = str(metrics.get("local_certified_quality", "") or "")
        if local_certified_official <= 0:
            local_certified_official, local_period, local_source, local_quality = _derive_local_certified_fallback(
                metrics, total_certified, total_buildings_stock
            )
            local_as_of = year
        entry = {
            "iso2": iso2,
            "name": countries_meta.get(iso2, {}).get("name", iso2),
            **metrics,
            "local_certified_buildings_official": local_certified_official,
            "local_certified_period": local_period,
            "local_certified_as_of": local_as_of,
            "local_certified_source": local_source,
            "local_certified_quality": local_quality,
            "standards": standard_map,
            "total_certified_buildings": total_certified,
            "certified_share_pct": _certified_share_pct(total_certified, total_buildings_stock),
            "international_share_of_local_pct": _international_share_of_local_pct(total_certified, local_certified_official),
        }
        rows.append(entry)

    # Optional filter: only countries that have certifications for a standard
    if standard:
        key = standard.lower()
        if key not in standards:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown standard '{standard}'. Available: {standards}",
            )
        rows = [r for r in rows if r.get(key, 0) > 0]

    return rows


# ── endpoints ────────────────────────────────────────────────────────────────

@router.get("/countries")
def get_countries(
    year: str = Query(..., description="Year of data (e.g. 2018, 2021, 2025)"),
    standard: str | None = Query(None, description="Filter by standard key (detected from dataset)"),
):
    """Return all countries for a year with EE data, sorted by score descending."""
    rows = _country_rows(year, standard)
    if not rows:
        raise HTTPException(status_code=404, detail=f"No data for year {year}")

    rows.sort(key=lambda r: r.get("score", 0), reverse=True)

    return {
        "data": rows,
        "metadata": {
            "year": year,
            "count": len(rows),
            "building_stock_source": _seed.get("gba_building_stock_2019", {}).get("source"),
            "building_stock_year": _seed.get("gba_building_stock_2019", {}).get("year"),
        },
    }


@router.get("/rankings")
def get_rankings(
    sort_by: str = Query("score", description="Sort column: score, total_certified_buildings, or any standard key"),
    limit: int = Query(25, ge=1, le=200, description="Number of results"),
    year: str = Query("2025", description="Year of data"),
):
    """Return a sorted ranking of countries."""
    year_data = _seed.get("scores_by_year", {}).get(year)
    if year_data is None:
        raise HTTPException(status_code=404, detail=f"No data for year {year}")
    valid_keys = [
        "score",
        "total_certified_buildings",
        "certified_share_pct",
        "international_share_of_local_pct",
        *_available_standards(year_data),
    ]
    if sort_by not in valid_keys:
        raise HTTPException(status_code=400, detail=f"sort_by must be one of {valid_keys}")

    rows = _country_rows(year)

    rows.sort(key=lambda r: r.get(sort_by, 0), reverse=True)
    rows = rows[:limit]

    return {
        "data": rows,
        "metadata": {
            "year": year,
            "count": len(rows),
            "sort_by": sort_by,
            "limit": limit,
            "building_stock_source": _seed.get("gba_building_stock_2019", {}).get("source"),
            "building_stock_year": _seed.get("gba_building_stock_2019", {}).get("year"),
        },
    }
