import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Default values (fallback jika belum ada di database)
const DEFAULTS = {
  org_name: "Attendance",
  org_subtitle: "Sistem Absensi Daerah",
  desa_list: ["Desa 1", "Desa 2"],
  desa_kelompok_map: {
    "Desa 1": ["Kelompok 1", "Kelompok 2", "Kelompok 3", "Kelompok 4", "Kelompok 5", "Kelompok 6", "Kelompok 7"],
    "Desa 2": ["Kelompok 8", "Kelompok 9", "Kelompok 10", "Kelompok 11", "Kelompok 12", "Kelompok 13"],
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

    // Derive flat kelompok list from map
    const kelompokList = Object.values(merged.desa_kelompok_map).flat();
    merged.kelompok_list = kelompokList;

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