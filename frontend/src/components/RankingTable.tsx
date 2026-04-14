"use client";

import { useState } from "react";
import type { EECountryData } from "@/types";

interface Props {
  data: EECountryData[] | null;
  selectedCountry: string | null;
  onCountryClick: (iso2: string | null) => void;
}

type SortField = "score" | "name";
type SortDir = "asc" | "desc";

function getScoreColor(score: number): string {
  if (score >= 80) return "#1a9641";
  if (score >= 70) return "#66bd63";
  if (score >= 60) return "#a6d96a";
  if (score >= 50) return "#d9ef8b";
  if (score >= 40) return "#fee08b";
  if (score >= 30) return "#fdae61";
  return "#d73027";
}

export function RankingTable({ data, selectedCountry, onCountryClick }: Props) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (!data) return null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "score" ? "desc" : "asc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return mul * a.name.localeCompare(b.name);
    return mul * (a.score - b.score);
  });

  const arrow = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">
        Country Rankings
      </h3>

      <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-2 text-left text-xs text-gray-500 w-10">#</th>
              <th
                className="px-2 py-2 text-left text-xs text-gray-500 cursor-pointer hover:text-gray-300"
                onClick={() => handleSort("name")}
              >
                Country{arrow("name")}
              </th>
              <th
                className="px-2 py-2 text-left text-xs text-gray-500 cursor-pointer hover:text-gray-300 w-32"
                onClick={() => handleSort("score")}
              >
                Score{arrow("score")}
              </th>
              <th className="px-4 py-2 text-center text-xs text-gray-500 w-16">Code</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((country, idx) => {
              const isSelected = selectedCountry === country.iso2;
              return (
                <tr
                  key={country.iso2}
                  onClick={() => onCountryClick(country.iso2)}
                  className={`cursor-pointer transition-colors border-b border-gray-700/50 ${
                    isSelected
                      ? "bg-blue-900/30"
                      : "hover:bg-gray-700/50"
                  }`}
                >
                  <td className="px-4 py-2 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="px-2 py-2 font-medium">{country.name}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${country.score}%`,
                            backgroundColor: getScoreColor(country.score),
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-7 text-right">
                        {country.score}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {country.mandatory_code ? (
                      <span className="text-green-400 text-base">&#10003;</span>
                    ) : (
                      <span className="text-gray-600 text-base">&#8212;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
