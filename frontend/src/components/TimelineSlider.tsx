"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  year: number;
  onChange: (year: number) => void;
  min: number;
  max: number;
}

export function TimelineSlider({ year, onChange, min, max }: Props) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        onChange(year >= max ? min : year + 1);
      }, 1200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, year, min, max, onChange]);

  const years = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-gray-700">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors text-white shrink-0"
          title={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="4" height="12" />
              <rect x="9" y="1" width="4" height="12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="2,0 14,7 2,14" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={min}
            max={max}
            value={year}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 touch-none"
          />
          <div className="flex justify-between mt-1">
            {years.map((y) => (
              <span
                key={y}
                className={`text-[8px] md:text-[10px] ${
                  y === year ? "text-blue-400 font-bold" : y > 2025 ? "text-yellow-500/60" : "text-gray-500"
                }`}
              >
                {y}
              </span>
            ))}
          </div>
        </div>
      </div>
      {year > 2025 && (
        <div className="mt-2 text-center text-xs text-yellow-500/80">
          Projected data (linear regression)
        </div>
      )}
    </div>
  );
}
