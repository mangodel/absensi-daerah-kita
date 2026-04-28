import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const DEFAULTS = {
  org_name: "Attendance",
  org_subtitle: "Sistem Absensi Daerah",
  logo_url: "",
  desa_list: ["Desa 1", "Desa 2"],
  desa_kelompok_map: {
    "Desa 1": ["Kelompok 1", "Kelompok 2", "Kelompok 3", "Kelompok 4", "Kelompok 5", "Kelompok 6", "Kelompok 7"],
    "Desa 2": ["Kelompok 8", "Kelompok 9", "Kelompok 10", "Kelompok 11", "Kelompok 12", "Kelompok 13"],
  },
  page_titles: {
    dashboard: "Dashboard",
    dashboard_subtitle: "Ringkasan data daerah",
    members: "Data Anggota",
    members_subtitle: "Daftar seluruh anggota",
    events: "Daftar Kegiatan",
    events_subtitle: "Kelola kegiatan organisasi",
    attendance: "Absensi",
    attendance_subtitle: "Kelola kehadiran anggota per kegiatan",
    transfers: "Pindah Kelompok",
    transfers_subtitle: "Tracking perpindahan anggota lintas desa/kelompok",
    structure: "Struktur Organisasi",
    structure_subtitle: "Daerah → Desa → Kelompok",
  },
};

const AppConfigContext = createContext(null);

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [rawConfigs, setRawConfigs] = useState([]);

  const loadConfig = async () => {
    const records = await base44.entities.AppConfig.list();
    setRawConfigs(records);

    const merged = { ...DEFAULTS };
    records.forEach(r => {
      try {
        merged[r.key] = JSON.parse(r.value);
      } catch {
        merged[r.key] = r.value;
      }
    });

    // Merge page_titles with defaults so missing keys still have fallback
    merged.page_titles = { ...DEFAULTS.page_titles, ...(merged.page_titles || {}) };

    // Derive flat kelompok list from map
    merged.desa_list = Object.keys(merged.desa_kelompok_map);
    merged.kelompok_list = Object.values(merged.desa_kelompok_map).flat();

    setConfig(merged);
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  return (
    <AppConfigContext.Provider value={{ config, loading, reload: loadConfig, rawConfigs }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error("useAppConfig must be used within AppConfigProvider");
  return ctx;
}