"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { TimelineSlider } from "@/components/TimelineSlider";
import { StatsPanel } from "@/components/StatsPanel";
import { StandardFilter } from "@/components/StandardFilter";
import { RankingTable } from "@/components/RankingTable";
import { CountryDetail } from "@/components/CountryDetail";
import { useEEData } from "@/hooks/useEEData";

const WorldChoropleth = dynamic(() => import("@/components/WorldChoropleth"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-gray-400">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const [year, setYear] = useState(2025);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeStandard, setActiveStandard] = useState<string | null>(null);
  const { data, loading, availableStandards } = useEEData(year);

  const filteredData = useMemo(() => {
    if (!data || !activeStandard) return data;
    return data.filter((c) => (c.standards[activeStandard] || 0) > 0);
  }, [data, activeStandard]);

  useEffect(() => {
    if (!selectedCountry || !filteredData) return;
    if (!filteredData.some((c) => c.iso2 === selectedCountry)) {
      setSelectedCountry(null);
    }
  }, [selectedCountry, filteredData]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">
            Energy Efficiency Implementation Worldwide
          </h1>
          <p className="text-sm text-gray-400">
            Global Progress, Standards &amp; 5-Year Forecast
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-400">{year}</div>
          <div className="text-xs text-gray-500">
            {year > 2025 ? "Projected" : "Actual"} Data
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative">
          <WorldChoropleth
            data={filteredData}
            selectedCountry={selectedCountry}
            onCountryClick={setSelectedCountry}
          />
          {/* Timeline slider overlay at bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <TimelineSlider year={year} onChange={setYear} min={2018} max={2030} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-[420px] bg-gray-900 border-l border-gray-800 overflow-y-auto">
          <div className="p-4 space-y-4">
            <StatsPanel data={filteredData} year={year} loading={loading} />
            <StandardFilter
              active={activeStandard}
              onChange={setActiveStandard}
              standards={availableStandards}
              data={data}
            />

            {selectedCountry && filteredData ? (
              <CountryDetail
                iso2={selectedCountry}
                data={filteredData}
                year={year}
                onClose={() => setSelectedCountry(null)}
              />
            ) : (
              <RankingTable
                data={filteredData}
                selectedCountry={selectedCountry}
                onCountryClick={setSelectedCountry}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
