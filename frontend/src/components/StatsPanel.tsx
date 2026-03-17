"use client";

import type { EECountryData } from "@/types";

interface Props {
  data: EECountryData[] | null;
  year: number;
  loading: boolean;
}

export function StatsPanel({ data, year, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
        <div className="h-20 bg-gray-700 rounded" />
      </div>
    );
  }

  const avgScore = Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length);

  const totalCerts = data.reduce((sum, d) => sum + d.total_certified_buildings, 0);
  const totalStock = data.reduce((sum, d) => sum + (d.total_buildings_stock || 0), 0);
  const avgCoveragePct = totalStock > 0 ? (totalCerts / totalStock) * 100 : 0;

  const mandatoryCount = data.filter((d) => d.mandatory_code).length;

  const sorted = [...data].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Global Overview {year}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-2xl font-bold text-emerald-400">{avgScore}</div>
          <div className="text-xs text-gray-500">Avg. EE Score</div>
        </div>

        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-400">
            {totalCerts >= 1000 ? `${(totalCerts / 1000).toFixed(0)}k` : totalCerts}
          </div>
          <div className="text-xs text-gray-500">Certified Buildings</div>
          {totalStock > 0 && (
            <div className="text-[10px] text-gray-600 mt-0.5">
              of {totalStock >= 1000000 ? `${(totalStock / 1000000).toFixed(1)}M` : totalStock} total
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-2xl font-bold text-amber-400">{mandatoryCount}</div>
          <div className="text-xs text-gray-500">Mandatory Codes</div>
        </div>

        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-2xl font-bold text-cyan-400">{avgCoveragePct.toFixed(2)}%</div>
          <div className="text-xs text-gray-500">Avg. Certified Coverage</div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex-1 bg-gray-900 rounded-lg p-2">
          <div className="text-xs text-gray-500">Best Performer</div>
          <div className="text-sm font-semibold text-green-400">
            {best.name}{" "}
            <span className="text-gray-400 font-normal">({best.score})</span>
          </div>
        </div>
        <div className="flex-1 bg-gray-900 rounded-lg p-2">
          <div className="text-xs text-gray-500">Needs Improvement</div>
          <div className="text-sm font-semibold text-red-400">
            {worst.name}{" "}
            <span className="text-gray-400 font-normal">({worst.score})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
