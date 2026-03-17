"use client";

import { useMemo } from "react";
import eeSeedData from "../../public/data/ee_seed.json";
import eeSeedExpansion from "../../public/data/ee_seed_expansion.json";
import eeSeedSupplemental from "../../public/data/ee_seed_supplemental.json";
import localCertifiedOfficial from "../../public/data/local_certified_official.json";
import gbaBuildingStock from "../../public/data/gba_building_stock_2019.json";
import type { EECountryData } from "@/types";

interface SeedScoreEntry {
  score: number;
  [key: string]: number | boolean | string | string[] | undefined;
  mandatory: boolean;
  buildings: number;
  industry: number;
  transport: number;
  barriers: string[];
}

type YearScores = Record<string, SeedScoreEntry>;
type ScoresByYear = Record<string, YearScores>;
type CountryMap = Record<string, { name: string }>;

const NON_STANDARD_KEYS = new Set([
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
]);

function deepMerge(base: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const existing = result[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

const mergedSeed = deepMerge(
  deepMerge(
    deepMerge(
      eeSeedData as unknown as Record<string, unknown>,
      eeSeedExpansion as unknown as Record<string, unknown>
    ),
    eeSeedSupplemental as unknown as Record<string, unknown>
  ),
  localCertifiedOfficial as unknown as Record<string, unknown>
);
const gbaStockByIso2 = (gbaBuildingStock as { iso2_counts: Record<string, number> }).iso2_counts;
const scoresByYear = mergedSeed.scores_by_year as ScoresByYear;
const countries = mergedSeed.countries as CountryMap;
const availableYears = Object.keys(scoresByYear).map(Number).sort((a, b) => a - b);

function getStandardKeys(entry: SeedScoreEntry | undefined): string[] {
  if (!entry) return [];
  return Object.keys(entry).filter((key) => {
    if (NON_STANDARD_KEYS.has(key)) return false;
    return typeof entry[key] === "number";
  });
}

const standardKeys = Array.from(
  new Set(
    Object.values(scoresByYear)
      .flatMap((yearEntries) => Object.values(yearEntries))
      .flatMap((entry) => getStandardKeys(entry))
  )
).sort();

// Linear regression: y = slope * x + intercept
function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) * (xs[i] - mx);
  }
  const slope = den > 0 ? num / den : 0;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

function interpolate(y1: number, y2: number, yearStart: number, yearEnd: number, target: number): number {
  const t = (target - yearStart) / (yearEnd - yearStart);
  return y1 + (y2 - y1) * t;
}

function projectField(iso2: string, field: keyof SeedScoreEntry, targetYear: number): number {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const yr of availableYears) {
    const entry = scoresByYear[String(yr)]?.[iso2];
    if (entry) {
      const val = entry[field];
      if (typeof val === "number") {
        xs.push(yr);
        ys.push(val);
      }
    }
  }

  if (xs.length < 2) return ys[ys.length - 1] || 0;

  const { slope, intercept } = linearFit(xs, ys);
  const result = slope * targetYear + intercept;
  return Math.max(0, Math.round(result * 100) / 100);
}

function getBarriersForYear(iso2: string, year: number): string[] {
  // Use barriers from the closest available year
  let closest = availableYears[0];
  let minDist = Math.abs(year - closest);
  for (const yr of availableYears) {
    const dist = Math.abs(year - yr);
    if (dist < minDist) {
      minDist = dist;
      closest = yr;
    }
  }
  return scoresByYear[String(closest)]?.[iso2]?.barriers || [];
}

function getMandatoryForYear(iso2: string, year: number): boolean {
  // Use mandatory status from closest year; once mandatory, stays mandatory
  for (const yr of [...availableYears].reverse()) {
    if (yr <= year) {
      const entry = scoresByYear[String(yr)]?.[iso2];
      if (entry?.mandatory) return true;
    }
  }
  // Check all years
  for (const yr of availableYears) {
    const entry = scoresByYear[String(yr)]?.[iso2];
    if (entry?.mandatory) return true;
  }
  return false;
}

function normalizeCountryRecord(
  iso2: string,
  info: { name: string } | undefined,
  score: number,
  mandatory: boolean,
  buildings: number,
  industry: number,
  transport: number,
  barriers: string[],
  standards: Record<string, number>,
  totalBuildingsStock?: number,
  zeroEnergyBuildings?: number,
  localEnergyLabel?: number,
  localCertifiedOfficial?: number,
  localCertifiedPeriod?: string,
  localCertifiedAsOf?: string,
  localCertifiedSource?: string,
  localCertifiedQuality?: string
): EECountryData {
  const effectiveBuildingStock = totalBuildingsStock && totalBuildingsStock > 0
    ? totalBuildingsStock
    : gbaStockByIso2[iso2];
  const totalCerts = Object.values(standards).reduce((sum, value) => sum + value, 0);
  let effectiveLocalCertified = Number(localCertifiedOfficial || 0);
  let effectiveLocalPeriod = localCertifiedPeriod || "";
  let effectiveLocalAsOf = localCertifiedAsOf || "";
  let effectiveLocalSource = localCertifiedSource || "";
  let effectiveLocalQuality = localCertifiedQuality || "";

  if (effectiveLocalCertified <= 0) {
    if (Number(localEnergyLabel || 0) > 0) {
      effectiveLocalCertified = Number(localEnergyLabel || 0);
      effectiveLocalPeriod = "derived from local energy label proxy";
      effectiveLocalAsOf = String(new Date().getFullYear());
      effectiveLocalSource = "internal proxy (local_energy_label field)";
      effectiveLocalQuality = "proxy_local_energy_label";
    } else if (Number(zeroEnergyBuildings || 0) > 0) {
      effectiveLocalCertified = Math.max(
        Number(zeroEnergyBuildings || 0),
        Math.round(totalCerts * 1.5)
      );
      effectiveLocalPeriod = "derived from NZEB floor and dashboard certifications";
      effectiveLocalAsOf = String(new Date().getFullYear());
      effectiveLocalSource = "internal proxy (zero_energy_buildings + standards)";
      effectiveLocalQuality = "proxy_nzeb_floor";
    } else if (effectiveBuildingStock && effectiveBuildingStock > 0) {
      effectiveLocalCertified = Math.max(
        Math.round(effectiveBuildingStock * 0.003),
        Math.round(totalCerts * 2)
      );
      effectiveLocalPeriod = "derived from building stock ratio and dashboard certifications";
      effectiveLocalAsOf = String(new Date().getFullYear());
      effectiveLocalSource = "internal proxy (building_stock + standards)";
      effectiveLocalQuality = "proxy_stock_ratio";
    } else {
      effectiveLocalCertified = Math.max(1, Math.round(totalCerts * 2));
      effectiveLocalPeriod = "derived from dashboard certifications only";
      effectiveLocalAsOf = String(new Date().getFullYear());
      effectiveLocalSource = "internal proxy (standards only)";
      effectiveLocalQuality = "proxy_dashboard_only";
    }
  }

  const certifiedSharePct =
    effectiveBuildingStock && effectiveBuildingStock > 0
      ? Math.round((totalCerts / effectiveBuildingStock) * 1000000) / 10000
      : undefined;
  const internationalShareOfLocalPct =
    effectiveLocalCertified && effectiveLocalCertified > 0
      ? Math.round((totalCerts / effectiveLocalCertified) * 1000000) / 10000
      : undefined;
  return {
    iso2,
    name: info?.name || iso2,
    score: Math.round(score),
    leed_certs: Math.round(standards.leed ?? 0),
    breeam_certs: Math.round(standards.breeam ?? 0),
    passivhaus_certs: Math.round(standards.passivhaus ?? 0),
    standards,
    total_certified_buildings: Math.round(totalCerts),
    total_buildings_stock: effectiveBuildingStock,
    certified_share_pct: certifiedSharePct,
    zero_energy_buildings: zeroEnergyBuildings,
    local_energy_label: localEnergyLabel,
    local_certified_buildings_official: Math.round(effectiveLocalCertified),
    local_certified_period: effectiveLocalPeriod,
    local_certified_as_of: effectiveLocalAsOf,
    local_certified_source: effectiveLocalSource,
    local_certified_quality: effectiveLocalQuality,
    international_share_of_local_pct: internationalShareOfLocalPct,
    mandatory_code: mandatory,
    sector_buildings: Math.round(buildings),
    sector_industry: Math.round(industry),
    sector_transport: Math.round(transport),
    barriers,
  };
}

function getDataForYear(year: number): EECountryData[] {
  const yearStr = String(year);
  const countryIds = Object.keys(countries);

  // Check if we have exact data for this year
  if (scoresByYear[yearStr]) {
    const rows = countryIds.map((iso2) => {
      const entry = scoresByYear[yearStr][iso2];
      if (!entry) return null;
      const info = countries[iso2];
      const standards = Object.fromEntries(
        getStandardKeys(entry).map((key) => [key, Math.round(Number(entry[key] || 0))])
      );
      return normalizeCountryRecord(
        iso2,
        info,
        Number(entry.score || 0),
        Boolean(entry.mandatory),
        Number(entry.buildings || 0),
        Number(entry.industry || 0),
        Number(entry.transport || 0),
        (entry.barriers as string[]) || [],
        standards,
        Number(entry.total_buildings_stock || 0),
        Number(entry.zero_energy_buildings || 0),
        Number(entry.local_energy_label || 0),
        Number(entry.local_certified_buildings_official || 0),
        String(entry.local_certified_period || ""),
        String(entry.local_certified_as_of || ""),
        String(entry.local_certified_source || ""),
        String(entry.local_certified_quality || "")
      );
    }).filter(Boolean) as EECountryData[];
    return rows;
  }

  // Check if year is between two available years (interpolation)
  const lowerYears = availableYears.filter((y) => y <= year);
  const upperYears = availableYears.filter((y) => y >= year);

  if (lowerYears.length > 0 && upperYears.length > 0 && year <= availableYears[availableYears.length - 1]) {
    const y1 = lowerYears[lowerYears.length - 1];
    const y2 = upperYears[0];

    const rows = countryIds.map((iso2) => {
      const e1 = scoresByYear[String(y1)]?.[iso2];
      const e2 = scoresByYear[String(y2)]?.[iso2];
      if (!e1 || !e2) return null;
      const info = countries[iso2];
      const keys = Array.from(new Set([...getStandardKeys(e1), ...getStandardKeys(e2)]));
      const standards = Object.fromEntries(
        keys.map((key) => [
          key,
          Math.round(interpolate(Number(e1[key] || 0), Number(e2[key] || 0), y1, y2, year)),
        ])
      );
      return normalizeCountryRecord(
        iso2,
        info,
        interpolate(Number(e1.score || 0), Number(e2.score || 0), y1, y2, year),
        Boolean(e1.mandatory) || Boolean(e2.mandatory),
        interpolate(Number(e1.buildings || 0), Number(e2.buildings || 0), y1, y2, year),
        interpolate(Number(e1.industry || 0), Number(e2.industry || 0), y1, y2, year),
        interpolate(Number(e1.transport || 0), Number(e2.transport || 0), y1, y2, year),
        getBarriersForYear(iso2, year),
        standards,
        Math.round(
          interpolate(
            Number(e1.total_buildings_stock || 0),
            Number(e2.total_buildings_stock || 0),
            y1,
            y2,
            year
          )
        ),
        Math.round(
          interpolate(
            Number(e1.zero_energy_buildings || 0),
            Number(e2.zero_energy_buildings || 0),
            y1,
            y2,
            year
          )
        ),
        Math.round(
          interpolate(
            Number((e1 as Record<string, unknown>).local_energy_label as number || 0),
            Number((e2 as Record<string, unknown>).local_energy_label as number || 0),
            y1,
            y2,
            year
          )
        ),
        Math.round(
          interpolate(
            Number((e1 as Record<string, unknown>).local_certified_buildings_official as number || 0),
            Number((e2 as Record<string, unknown>).local_certified_buildings_official as number || 0),
            y1,
            y2,
            year
          )
        ),
        "",
        "",
        "",
        ""
      );
    }).filter(Boolean) as EECountryData[];
    return rows;
  }

  // Project for future years using linear regression
  const rows = countryIds.map((iso2) => {
    const info = countries[iso2];
    const standards = Object.fromEntries(
      standardKeys.map((key) => [key, Math.round(projectField(iso2, key as keyof SeedScoreEntry, year))])
    );
    return normalizeCountryRecord(
      iso2,
      info,
      projectField(iso2, "score", year),
      getMandatoryForYear(iso2, year),
      projectField(iso2, "buildings", year),
      projectField(iso2, "industry", year),
      projectField(iso2, "transport", year),
      getBarriersForYear(iso2, year),
      standards,
      Math.round(projectField(iso2, "total_buildings_stock", year)),
      Math.round(projectField(iso2, "zero_energy_buildings", year)),
      0,
      0,
      "",
      "",
      "",
      ""
    );
  });
  return rows;
}

export function useEEData(year: number) {
  const data = useMemo(() => {
    const result = getDataForYear(year);
    return result.length > 0 ? result : null;
  }, [year]);

  return { data, loading: false, availableStandards: standardKeys };
}
