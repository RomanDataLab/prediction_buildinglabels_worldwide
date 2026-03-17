"use client";

import { useMemo } from "react";
import type { EECountryData } from "@/types";
import logoStandardData from "@/data/logostandard.json";

interface Props {
  active: string | null;
  onChange: (standard: string | null) => void;
  standards: string[];
  data: EECountryData[] | null;
}

interface LogoMeta {
  name: string;
  shortCode: string;
  brandColor: string;
  fullName: string;
  description?: string | null;
  origin?: string | null;
  organization?: string | null;
  externalUrl?: string | null;
}

const logoMeta = logoStandardData as Record<string, LogoMeta>;

const palette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

function humanizeStandard(key: string): string {
  const parts = key.split("_").map((p) => p.slice(0, 1).toUpperCase() + p.slice(1));
  return parts.join(" ");
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function StandardFilter({ active, onChange, standards, data }: Props) {
  const standardItems = useMemo(
    () =>
      standards.map((key, index) => {
        const meta = logoMeta[key];
        return {
          key,
          name: meta?.name ?? humanizeStandard(key),
          shortCode: meta?.shortCode ?? key.slice(0, 2).toUpperCase(),
          color: meta?.brandColor ?? palette[index % palette.length],
          certifiedBuildings: (data || []).reduce(
            (sum, country) => sum + (country.standards[key] || 0),
            0,
          ),
          countriesWithStandard: (data || []).filter(
            (country) => (country.standards[key] || 0) > 0,
          ).length,
        };
      }),
    [standards, data],
  );

  const activeMeta = active ? logoMeta[active] : null;
  const activeItem = active ? standardItems.find((s) => s.key === active) : null;

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Certified Buildings by Standard
      </h3>
      <div className="flex gap-2 flex-wrap">
        {standardItems.map((std) => {
          const isActive = active === std.key;
          return (
            <button
              key={std.key}
              onClick={() => onChange(isActive ? null : std.key)}
              className={`min-w-[96px] flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border transition-all ${
                isActive
                  ? "border-opacity-100 bg-opacity-20"
                  : "border-gray-700 bg-gray-900 hover:bg-gray-700/50"
              }`}
              style={{
                borderColor: isActive ? std.color : undefined,
                backgroundColor: isActive ? `${std.color}20` : undefined,
              }}
              title={logoMeta[std.key]?.fullName ?? std.name}
            >
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              >
                {std.name}
              </span>
              <span className={`text-[10px] ${isActive ? "text-cyan-300" : "text-gray-500"}`}>
                {formatCount(std.certifiedBuildings)} buildings
              </span>
            </button>
          );
        })}
      </div>

      {active && activeMeta && activeItem && (
        <div
          className="mt-3 rounded-lg border p-3 space-y-2"
          style={{
            borderColor: `${activeItem.color}60`,
            backgroundColor: `${activeItem.color}10`,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className="text-sm font-semibold"
                style={{ color: activeItem.color }}
              >
                {activeMeta.fullName || activeItem.name}
              </span>
              {activeMeta.origin && (
                <span className="text-[11px] text-gray-500 ml-2">
                  {activeMeta.origin}
                </span>
              )}
            </div>
            <button
              onClick={() => onChange(null)}
              className="text-gray-500 hover:text-gray-300 text-xs shrink-0"
              title="Close"
            >
              ✕
            </button>
          </div>

          {activeMeta.organization && (
            <div className="text-[11px] text-gray-400">
              {activeMeta.organization}
            </div>
          )}

          {activeMeta.description && (
            <p className="text-xs text-gray-300 leading-relaxed">
              {activeMeta.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1">
            <span>
              <span className="text-white font-medium">
                {formatCount(activeItem.certifiedBuildings)}
              </span>{" "}
              certified buildings
            </span>
            <span>
              <span className="text-white font-medium">
                {activeItem.countriesWithStandard}
              </span>{" "}
              countries
            </span>
          </div>

          {activeMeta.externalUrl && (
            <a
              href={activeMeta.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline mt-1"
              style={{ color: activeItem.color }}
            >
              Official website ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
