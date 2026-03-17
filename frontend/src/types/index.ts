export interface EECountryData {
  iso2: string;
  name: string;
  score: number;
  leed_certs: number;
  breeam_certs: number;
  passivhaus_certs: number;
  standards: Record<string, number>;
  total_certified_buildings: number;
  total_buildings_stock?: number;
  certified_share_pct?: number;
  zero_energy_buildings?: number;
  local_energy_label?: number;
  local_certified_buildings_official?: number;
  local_certified_period?: string;
  local_certified_as_of?: string;
  local_certified_source?: string;
  local_certified_quality?: string;
  international_share_of_local_pct?: number;
  mandatory_code: boolean;
  sector_buildings: number;
  sector_industry: number;
  sector_transport: number;
  barriers: string[];
}

export interface StandardMarket {
  name: string;
  buildings: number;
  countries: number;
  color: string;
}

export const STANDARDS: StandardMarket[] = [
  { name: "BREEAM", buildings: 610000, countries: 106, color: "#10b981" },
  { name: "LEED", buildings: 112000, countries: 186, color: "#3b82f6" },
  { name: "HQE", buildings: 620000, countries: 27, color: "#00897B" },
  { name: "Minergie", buildings: 61000, countries: 1, color: "#E53935" },
  { name: "Passivhaus", buildings: 47400, countries: 45, color: "#f59e0b" },
  { name: "DGNB", buildings: 12900, countries: 32, color: "#1565C0" },
  { name: "NABERS", buildings: 5200, countries: 1, color: "#6A1B9A" },
  { name: "Three Star", buildings: 28000, countries: 1, color: "#F44336" },
  { name: "Estidama", buildings: 1200, countries: 1, color: "#C6893F" },
  { name: "CASBEE", buildings: 500, countries: 1, color: "#D32F2F" },
  { name: "LBC", buildings: 208, countries: 10, color: "#2E7D32" },
];
