"use client";

import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import type { EECountryData } from "@/types";

interface Props {
  data: EECountryData[] | null;
  selectedCountry: string | null;
  onCountryClick: (iso2: string | null) => void;
}

function getColor(score: number): string {
  if (score >= 80) return "#1a9641";
  if (score >= 70) return "#66bd63";
  if (score >= 60) return "#a6d96a";
  if (score >= 50) return "#d9ef8b";
  if (score >= 40) return "#fee08b";
  if (score >= 30) return "#fdae61";
  return "#d73027";
}

const ISO2_NAME_OVERRIDES: Record<string, string> = {
  France: "FR",
  Norway: "NO",
  Kosovo: "XK",
  "Northern Cyprus": "CY",
  "Somaliland": "SO",
  "Baykonur Cosmodrome": "KZ",
  "Cyprus No Mans Area": "CY",
  "Dhekelia Sovereign Base Area": "GB",
  "Akrotiri Sovereign Base Area": "GB",
  "US Naval Base Guantanamo Bay": "US",
  "Indian Ocean Territories": "AU",
  "Coral Sea Islands": "AU",
  "Ashmore and Cartier Islands": "AU",
  "Clipperton Island": "FR",
  "Brazilian Island": "BR",
  "Southern Patagonian Ice Field": "AR",
};

export default function WorldChoropleth({ data, selectedCountry, onCountryClick }: Props) {
  const formatNumber = (value: number): string => value.toLocaleString();
  const resolveIso2 = (featureProps: maplibregl.MapGeoJSONFeature["properties"] | undefined): string | null => {
    if (!featureProps) return null;
    const effectiveIso2 = String(featureProps["EFFECTIVE_ISO2"] || "");
    if (effectiveIso2) return effectiveIso2;
    const iso2 = String(featureProps["ISO3166-1-Alpha-2"] || "");
    if (iso2 && iso2 !== "-99") return iso2;
    const name = String(featureProps["name"] || "").toLowerCase();
    if (!name || !data) return null;
    const match = data.find((d) => d.name.toLowerCase() === name);
    return match?.iso2 || null;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19,
            paint: {
              "raster-saturation": -0.8,
              "raster-brightness-max": 0.4,
            },
          },
        ],
      },
      center: [10, 25],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 8,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", async () => {
      const response = await fetch("/data/world_countries.geojson");
      const worldGeojson = (await response.json()) as FeatureCollection<Geometry, GeoJsonProperties>;
      for (const feature of worldGeojson.features) {
        const props = feature.properties ?? {};
        const iso2 = String(props["ISO3166-1-Alpha-2"] || "");
        const name = String(props["name"] || "");
        const effectiveIso2 =
          iso2 && iso2 !== "-99" ? iso2 : (ISO2_NAME_OVERRIDES[name] || "");
        feature.properties = { ...props, EFFECTIVE_ISO2: effectiveIso2 };
      }

      map.addSource("world-countries", {
        type: "geojson",
        data: worldGeojson,
      });

      map.addLayer({
        id: "world-fill",
        type: "fill",
        source: "world-countries",
        paint: {
          "fill-color": "#666",
          "fill-opacity": 0.8,
        },
      });

      map.addLayer({
        id: "world-border",
        type: "line",
        source: "world-countries",
        paint: {
          "line-color": "#fff",
          "line-width": 0.8,
        },
      });

      map.addLayer({
        id: "world-highlight",
        type: "line",
        source: "world-countries",
        paint: {
          "line-color": "#00d4ff",
          "line-width": 3,
        },
        // Start with a non-matching filter so no country is highlighted by default.
        filter: ["==", ["get", "EFFECTIVE_ISO2"], "__none__"],
      });

      map.on("click", "world-fill", (e) => {
        const feature = e.features?.[0];
        if (feature?.properties) {
          const iso2 = resolveIso2(feature.properties);
          const isKnownCountry = !!iso2 && !!data?.some((country) => country.iso2 === iso2);
          onCountryClick(isKnownCountry ? iso2 : null);
        }
      });

      map.on("mouseenter", "world-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "world-fill", () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      map.on("mousemove", "world-fill", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const iso2 = resolveIso2(feature.properties);
        const name = feature.properties["name"];

        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "map-tooltip",
          });
        }

        // Look up score from data
        const countryData = iso2 ? data?.find((d) => d.iso2 === iso2) : undefined;
        const scoreText = countryData ? `Score: ${countryData.score}` : "";
        const certifiedText = countryData
          ? `Certified: ${formatNumber(countryData.total_certified_buildings)}`
          : "";
        const totalText =
          countryData && typeof countryData.total_buildings_stock === "number"
            ? `Total buildings: ${formatNumber(countryData.total_buildings_stock)}`
            : "";
        const shareText =
          countryData && typeof countryData.certified_share_pct === "number"
            ? `Coverage: ${countryData.certified_share_pct.toFixed(3)}%`
            : "";

        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${name}</strong>
            ${scoreText ? `<br/><span class="tooltip-score">${scoreText}</span>` : ""}
            ${certifiedText ? `<br/><span class="tooltip-cert">${certifiedText}</span>` : ""}
            ${totalText ? `<br/><span class="tooltip-total">${totalText}</span>` : ""}
            ${shareText ? `<br/><span class="tooltip-share">${shareText}</span>` : ""}`
          )
          .addTo(map);
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update choropleth colors when data or mapReady changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !data) return;

    const parts: (string | string[])[] = ["match", ["get", "EFFECTIVE_ISO2"]];
    for (const country of data) {
      parts.push(country.iso2, getColor(country.score));
    }
    parts.push("#333");

    map.setPaintProperty("world-fill", "fill-color", parts as unknown);
  }, [data, mapReady]);

  // Update highlight border
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!selectedCountry) {
      map.setFilter("world-highlight", ["==", ["get", "EFFECTIVE_ISO2"], "__none__"]);
      return;
    }

    map.setFilter("world-highlight", ["==", ["get", "EFFECTIVE_ISO2"], selectedCountry]);
  }, [selectedCountry, mapReady]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full" />
      <style jsx global>{`
        .map-tooltip .maplibregl-popup-content {
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .map-tooltip .maplibregl-popup-tip {
          border-top-color: rgba(0, 0, 0, 0.85);
        }
        .tooltip-score {
          color: #93c5fd;
          font-size: 12px;
        }
        .tooltip-cert {
          color: #a7f3d0;
          font-size: 12px;
        }
        .tooltip-total {
          color: #c4b5fd;
          font-size: 12px;
        }
        .tooltip-share {
          color: #f9a8d4;
          font-size: 12px;
        }
      `}</style>
    </>
  );
}
