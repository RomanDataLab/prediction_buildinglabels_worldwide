"use client";

import type { EECountryData } from "@/types";

interface Props {
  iso2: string;
  data: EECountryData[] | null;
  year: number;
  onClose: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#1a9641";
  if (score >= 70) return "#66bd63";
  if (score >= 60) return "#a6d96a";
  if (score >= 50) return "#d9ef8b";
  if (score >= 40) return "#fee08b";
  if (score >= 30) return "#fdae61";
  return "#d73027";
}

function qualityMeta(quality?: string): { label: string; className: string } {
  if (!quality) {
    return { label: "Unknown quality", className: "bg-gray-700/60 text-gray-200 border-gray-600" };
  }
  if (quality.startsWith("official_") && quality.includes("partial_scope")) {
    return { label: "Official (partial scope)", className: "bg-amber-700/30 text-amber-200 border-amber-600/60" };
  }
  if (quality.startsWith("official_")) {
    return { label: "Official", className: "bg-emerald-700/30 text-emerald-200 border-emerald-600/60" };
  }
  if (quality.startsWith("secondary_")) {
    return { label: "Secondary source", className: "bg-orange-700/30 text-orange-200 border-orange-600/60" };
  }
  if (quality.startsWith("proxy_")) {
    return { label: "Estimated proxy", className: "bg-violet-700/30 text-violet-200 border-violet-600/60" };
  }
  return { label: quality.replace(/_/g, " "), className: "bg-gray-700/60 text-gray-200 border-gray-600" };
}

export function CountryDetail({ iso2, data, year, onClose }: Props) {
  const country = data?.find((d) => d.iso2 === iso2);

  if (!country) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Country not found</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            &#10005;
          </button>
        </div>
      </div>
    );
  }

  const sectors = [
    { label: "Buildings", value: country.sector_buildings, color: "#3b82f6" },
    { label: "Industry", value: country.sector_industry, color: "#8b5cf6" },
    { label: "Transport", value: country.sector_transport, color: "#ec4899" },
  ];

  const palette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
  const certs = Object.entries(country.standards)
    .map(([key, value], index) => ({
      key,
      label: key === "leed" ? "LEED" : key === "breeam" ? "BREEAM" : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      color: palette[index % palette.length],
    }))
    .filter((cert) => cert.value > 0)
    .sort((a, b) => b.value - a.value);
  const localQuality = qualityMeta(country.local_certified_quality);
  const localLabelTitle =
    country.local_certified_quality?.startsWith("official_")
      ? "Official local-certified buildings"
      : "Local-certified buildings (proxy)";

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold">{country.name}</h3>
          <span className="text-xs text-gray-500">{country.iso2} &middot; {year}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none p-1"
        >
          &#10005;
        </button>
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="text-3xl font-bold"
          style={{ color: getScoreColor(country.score) }}
        >
          {country.score}
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">EE Score</div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${country.score}%`,
                backgroundColor: getScoreColor(country.score),
              }}
            />
          </div>
        </div>
      </div>

      {/* Mandatory Code */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-900 rounded-lg">
        <span
          className={`text-sm ${
            country.mandatory_code ? "text-green-400" : "text-gray-500"
          }`}
        >
          {country.mandatory_code ? "\u2713" : "\u2717"}
        </span>
        <span className="text-sm text-gray-300">
          Mandatory Energy Code:{" "}
          <span className={country.mandatory_code ? "text-green-400" : "text-red-400"}>
            {country.mandatory_code ? "Yes" : "No"}
          </span>
        </span>
      </div>

      {/* Certifications */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Certifications
        </div>
        <div className="mb-2 px-2 py-1.5 rounded-md bg-gray-900 text-xs text-gray-300 border border-gray-700">
          Total certified buildings:{" "}
          <span className="text-cyan-400 font-semibold">
            {country.total_certified_buildings.toLocaleString()}
          </span>
        </div>
        {typeof country.total_buildings_stock === "number" && country.total_buildings_stock > 0 && (
          <div className="mb-2 px-2 py-1.5 rounded-md bg-gray-900 text-xs text-gray-300 border border-gray-700">
            Total building stock:{" "}
            <span className="text-blue-300 font-semibold">
              {country.total_buildings_stock.toLocaleString()}
            </span>
            {typeof country.certified_share_pct === "number" && (
              <>
                {" "}&middot; Certified share:{" "}
                <span className="text-emerald-300 font-semibold">
                  {country.certified_share_pct.toFixed(3)}%
                </span>
              </>
            )}
          </div>
        )}
        {typeof country.zero_energy_buildings === "number" && country.zero_energy_buildings > 0 && (
          <div className="mb-2 px-2 py-1.5 rounded-md bg-gray-900 text-xs text-gray-300 border border-gray-700">
            Zero-energy buildings:{" "}
            <span className="text-purple-300 font-semibold">
              {country.zero_energy_buildings.toLocaleString()}
            </span>
          </div>
        )}
        {typeof country.local_energy_label === "number" && country.local_energy_label > 0 && (
          <div className="mb-2 px-2 py-1.5 rounded-md bg-gray-900 text-xs text-gray-300 border border-gray-700 border-l-2 border-l-gray-500">
            Local Energy Label:{" "}
            <span className="text-gray-300 font-semibold">
              {country.local_energy_label.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 ml-1">(national standard, not directly comparable)</span>
          </div>
        )}
        {typeof country.local_certified_buildings_official === "number" &&
          country.local_certified_buildings_official > 0 && (
            <div className="mb-2 px-2 py-1.5 rounded-md bg-gray-900 text-xs text-gray-300 border border-gray-700 border-l-2 border-l-blue-400">
              {localLabelTitle}:{" "}
              <span className="text-blue-300 font-semibold">
                {country.local_certified_buildings_official.toLocaleString()}
              </span>
              {typeof country.international_share_of_local_pct === "number" && (
                <>
                  {" "}&middot; Dashboard standards share:{" "}
                  <span className="text-emerald-300 font-semibold">
                    {country.international_share_of_local_pct.toFixed(3)}%
                  </span>
                </>
              )}
              {country.local_certified_period && (
                <div className="text-[10px] text-gray-500 mt-1">
                  Period: {country.local_certified_period}
                </div>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${localQuality.className}`}
                >
                  {localQuality.label}
                </span>
                {country.local_certified_source && (
                  <a
                    href={country.local_certified_source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-sky-300 hover:text-sky-200 underline"
                  >
                    source
                  </a>
                )}
              </div>
            </div>
          )}
        <div className="grid grid-cols-3 gap-2">
          {certs.map((cert) => (
            <div key={cert.key} className="bg-gray-900 rounded-lg p-2 text-center">
              <div
                className="text-lg font-bold"
                style={{ color: cert.color }}
              >
                {cert.value >= 1000
                  ? `${(cert.value / 1000).toFixed(1)}k`
                  : cert.value}
              </div>
              <div className="text-[10px] text-gray-500">{cert.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sector Scores */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Sector Scores
        </div>
        <div className="space-y-2">
          {sectors.map((sector) => (
            <div key={sector.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16">{sector.label}</span>
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${sector.value}%`,
                    backgroundColor: sector.color,
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 w-6 text-right">
                {sector.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Barriers */}
      {country.barriers.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Key Barriers
          </div>
          <div className="flex flex-wrap gap-1.5">
            {country.barriers.map((barrier, i) => (
              <span
                key={i}
                className="text-xs bg-gray-900 text-gray-400 px-2 py-1 rounded-md border border-gray-700"
              >
                {barrier}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
