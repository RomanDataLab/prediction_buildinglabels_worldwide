# Energy Efficiency Dataset Methodology

## 1) Country coverage

- Base dataset: `backend/static/seed/ee_data.json` and `frontend/public/data/ee_seed.json`
- Expansion dataset: `backend/static/seed/ee_data_expansion.json` and `frontend/public/data/ee_seed_expansion.json`
- Runtime merge is applied in both backend and frontend, so the effective country list is the union of base + expansion.

## 2) Time coverage

- Anchor years are `2018`, `2021`, and `2025`.
- For years between anchors, values are interpolated linearly.
- For years after `2025`, values are projected with linear regression (degree 1) using available anchor points.

## 3) Standards coverage

- Certification standards are not hardcoded.
- Standards are discovered from numeric country fields that are not one of:
  - `score`, `mandatory`, `buildings`, `industry`, `transport`, `barriers`
- This allows extra standards (for example `dgnb`) to be included automatically when present in country records.

## 4) Certified buildings by country

- Per-country certified buildings are computed as:
  - `total_certified_buildings = sum(all detected standard counts for that country and year)`
- This value is now returned by API country endpoints and used in the frontend stats and country detail views.

## 5) Building-stock coverage and zero-energy buildings

- Optional per-country fields are supported:
  - `total_buildings_stock`
  - `zero_energy_buildings`
- When `total_buildings_stock` is present, certified share is computed as:
  - `certified_share_pct = total_certified_buildings / total_buildings_stock * 100`
- `zero_energy_buildings` is tracked separately and not mixed into certification totals.
- `local_certified_buildings_official` is tracked separately and represents
  official local-registry certification counts where available.
- Comparison metric:
  - `international_share_of_local_pct = total_certified_buildings / local_certified_buildings_official * 100`

## 6) Additional national standards

- Country-specific standards are supported automatically when present as numeric keys in country records.
- Example keys now included: `hqe`, `minergie`, `estidama`, `three_star`, `casbee`, `nabers`.
- These are surfaced in:
  - standards filter UI,
  - market-share endpoint,
  - country certification breakdown.

## 7) Score interpretation

- `score` is currently stored directly in the seed records.
- The code does not currently recompute the score from sector fields.
- Recommended next step for full transparency:
  - move to an explicit formula and compute score at load time for all countries.

## 8) Data source direction

- For global building stock by country, a practical source candidate is the Global Building Atlas (TUM).
- Current supplemental values are seed/demo placeholders until a direct ingestion pipeline is connected.

## 9) Official local certification data (phase 1)

- New seed layer:
  - `backend/static/seed/local_certified_official.json`
  - `frontend/public/data/local_certified_official.json`
- Included countries (phase 1 + phase 2):
  - France (DPE, ADEME/data.gouv.fr)
  - Ireland (BER, CSO)
  - Netherlands (EP-Online/RVO)
  - United Kingdom (EPC, GOV.UK, England+Wales Q4 snapshot)
  - Sweden (Boverket cumulative registry)
  - Belgium (regional Flanders report)
  - Italy (SIAPE / ENEA annual report)
  - Portugal (SCE/ADENE quarterly CSVs aggregated to annual)
  - Denmark (valid-label snapshot; secondary public summary)
  - Poland (registry total snapshot; secondary public summary)
  - Spain (Madrid regional open-data register; partial national scope)
  - Finland (ARA energiatodistusrekisteri; 290k valid certificates)
  - Hungary (Lechner OÉNY; 1.2M+ authentic certificates)
  - United States (EPA Energy Star; 43k certified commercial buildings)
  - Singapore (BCA Green Mark; 2,590 certified buildings)
  - Japan (BELS registry; 1.04M cumulative certificates)
  - South Korea (G-SEED; ~25k estimated cumulative; secondary)
  - Greece (easykenak; ~350k EPCs on one platform; secondary)
  - India (IGBC 7k + GRIHA 3.9k projects; ~10.9k total)
  - Turkey (EKB/Enerji Kimlik Belgesi; 1.43M cumulative)
  - Taiwan (EEWH; 12,585 cumulative certified)
  - Malaysia (GBI; 783 certified projects)
  - Colombia (EDGE; 1,313 certified projects — global EDGE leader)
  - Kenya (EDGE; 212 certified buildings — East Africa leader)
  - New Zealand (NZGBC Green Star; ~240 unique buildings)
  - Australia (GBCA Green Star; 5,660 cumulative projects)
  - UAE (Estidama Pearl; 11,311 rated buildings+villas; secondary)
  - South Africa (GBCSA; 1,200+ certified projects; secondary)
  - Vietnam (all green systems; 559 buildings; secondary)
  - Indonesia (Greenship; ~170 certifications; secondary)
  - Canada (NRCan Greener Homes; 402k completed retrofits)
- Metadata fields added per country:
  - `local_certified_period`
  - `local_certified_as_of`
  - `local_certified_source`
  - `local_certified_quality`
- Recommended filtering by quality:
  - keep `official_*` for strict comparisons,
  - treat `*_partial_scope` and `secondary_*` as indicative only.

## 10) Full-country local denominator coverage

- To guarantee comparison coverage for all countries, the pipeline now derives
  `local_certified_buildings_official` when no direct registry number is present.
- Fallback order:
  1. `local_energy_label` (proxy),
  2. `zero_energy_buildings` + dashboard standards floor,
  3. building-stock ratio + dashboard standards floor,
  4. dashboard-only floor.
- These are explicitly marked with quality tags:
  - `proxy_local_energy_label`
  - `proxy_nzeb_floor`
  - `proxy_stock_ratio`
  - `proxy_dashboard_only`
