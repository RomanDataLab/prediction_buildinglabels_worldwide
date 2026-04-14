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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Auto-open sidebar on mobile when a country is selected
  useEffect(() => {
    if (selectedCountry) setSidebarOpen(true);
  }, [selectedCountry]);

  return (
    <div className="h-dvh flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-3 py-2 md:px-6 md:py-3 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm md:text-xl font-bold truncate">
            Energy Efficiency Implementation Worldwide
          </h1>
          <p className="text-xs md:text-sm text-gray-400 hidden sm:block">
            Global Progress, Standards &amp; 5-Year Forecast
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-right">
            <div className="text-xl md:text-3xl font-bold text-blue-400">{year}</div>
            <div className="text-[10px] md:text-xs text-gray-500">
              {year > 2025 ? "Projected" : "Actual"} Data
            </div>
          </div>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-gray-300"
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Map area */}
        <div className="flex-1 relative min-h-[40vh] md:min-h-0">
          <WorldChoropleth
            data={filteredData}
            selectedCountry={selectedCountry}
            onCountryClick={setSelectedCountry}
          />
          {/* Timeline slider overlay at bottom */}
          <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4">
            <TimelineSlider year={year} onChange={setYear} min={2018} max={2030} />
          </div>
        </div>

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 right-0 z-40
            w-[85vw] max-w-[420px] md:w-[420px]
            bg-gray-900 border-l border-gray-800 overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "translate-x-full"} md:translate-x-0
          `}
        >
          {/* Mobile sidebar header */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-gray-300">Dashboard</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
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
