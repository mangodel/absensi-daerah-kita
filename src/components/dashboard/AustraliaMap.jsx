import { useMemo } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";

// Approximate city coordinates (lat/lng converted to SVG viewBox 0 0 900 700)
// Australia viewBox roughly: lng 113-154, lat -10 to -44 => mapped to SVG
// New Zealand roughly: lng 166-178, lat -34 to -47

const CITY_COORDS = {
  // Australia
  "Sydney":       { x: 820, y: 440 },
  "Melbourne":    { x: 750, y: 510 },
  "Brisbane":     { x: 830, y: 350 },
  "Perth":        { x: 210, y: 430 },
  "Adelaide":     { x: 640, y: 470 },
  "Canberra":     { x: 795, y: 480 },
  "Darwin":       { x: 450, y: 90  },
  "Hobart":       { x: 740, y: 590 },
  "Gold Coast":   { x: 845, y: 365 },
  "Newcastle":    { x: 830, y: 415 },
  "Wollongong":   { x: 820, y: 455 },
  "Geelong":      { x: 740, y: 520 },
  "Cairns":       { x: 710, y: 170 },
  "Townsville":   { x: 710, y: 220 },
  // New Zealand
  "Auckland":     { x: 1040, y: 290 },
  "Wellington":   { x: 1045, y: 390 },
  "Christchurch": { x: 1040, y: 460 },
  "Hamilton":     { x: 1038, y: 320 },
  "Dunedin":      { x: 1030, y: 510 },
};

// Australia SVG path (simplified polygon)
const AUSTRALIA_PATH = "M 210 90 L 340 70 L 460 80 L 580 60 L 700 80 L 760 100 L 820 130 L 870 180 L 880 240 L 860 300 L 870 360 L 850 420 L 820 460 L 790 500 L 760 530 L 720 540 L 680 520 L 640 510 L 600 530 L 580 500 L 550 480 L 500 490 L 460 470 L 420 480 L 380 460 L 340 470 L 300 450 L 260 430 L 230 400 L 200 360 L 190 300 L 180 240 L 185 180 L 195 130 Z";

// Tasmania
const TASMANIA_PATH = "M 730 565 L 760 555 L 775 570 L 770 590 L 745 600 L 725 585 Z";

// New Zealand North Island
const NZ_NORTH_PATH = "M 1025 270 L 1060 275 L 1075 295 L 1070 330 L 1055 360 L 1035 380 L 1015 370 L 1010 340 L 1020 300 Z";

// New Zealand South Island
const NZ_SOUTH_PATH = "M 1010 390 L 1045 385 L 1070 400 L 1075 430 L 1060 460 L 1040 480 L 1015 490 L 998 470 L 992 440 L 1000 415 Z";

function normalize(value, max) {
  if (max === 0) return 0;
  return value / max;
}

export default function AustraliaMap({ members }) {
  const { config } = useAppConfig();
  const desaKelompokMap = config.desa_kelompok_map || {};

  // Build city -> member count from kelompok names matching city names
  const cityData = useMemo(() => {
    const counts = {};
    Object.entries(desaKelompokMap).forEach(([desa, kelompoks]) => {
      kelompoks.forEach(kelompok => {
        // Try to match city from kelompok name or desa name
        const cityKey = Object.keys(CITY_COORDS).find(city =>
          kelompok.toLowerCase().includes(city.toLowerCase()) ||
          desa.toLowerCase().includes(city.toLowerCase())
        );
        if (cityKey) {
          const count = members.filter(m => m.kelompok === kelompok || (m.desa === desa && kelompoks.length === 1)).length;
          counts[cityKey] = (counts[cityKey] || 0) + count;
        }
      });

      // Also check desa name directly
      const desaCityKey = Object.keys(CITY_COORDS).find(city =>
        desa.toLowerCase().includes(city.toLowerCase())
      );
      if (desaCityKey && !counts[desaCityKey]) {
        counts[desaCityKey] = members.filter(m => m.desa === desa).length;
      }
    });

    // If no city mapping found, try to place all members on Sydney as default
    if (Object.keys(counts).length === 0 && members.length > 0) {
      // Show per desa on known cities fallback
      const desaNames = Object.keys(desaKelompokMap);
      desaNames.forEach((desa, idx) => {
        const cityKeys = Object.keys(CITY_COORDS);
        const city = cityKeys[idx % cityKeys.length];
        counts[city] = (counts[city] || 0) + members.filter(m => m.desa === desa).length;
      });
    }

    return counts;
  }, [members, desaKelompokMap]);

  const maxCount = Math.max(...Object.values(cityData), 1);

  const activeCities = Object.entries(cityData).filter(([, count]) => count > 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-sm text-foreground mb-1">Sebaran Jamaah</h3>
      <p className="text-xs text-muted-foreground mb-4">Australia & New Zealand</p>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox="150 50 950 580"
          className="w-full"
          style={{ minHeight: 280 }}
        >
          {/* Ocean background */}
          <rect x="150" y="50" width="950" height="580" fill="#e8f4f8" rx="12" />

          {/* Australia mainland */}
          <path d={AUSTRALIA_PATH} fill="#d4e6b5" stroke="#8fbc5a" strokeWidth="1.5" />
          {/* Tasmania */}
          <path d={TASMANIA_PATH} fill="#d4e6b5" stroke="#8fbc5a" strokeWidth="1.5" />

          {/* New Zealand */}
          <path d={NZ_NORTH_PATH} fill="#d4e6b5" stroke="#8fbc5a" strokeWidth="1.5" />
          <path d={NZ_SOUTH_PATH} fill="#d4e6b5" stroke="#8fbc5a" strokeWidth="1.5" />

          {/* Labels */}
          <text x="490" y="310" textAnchor="middle" fontSize="11" fill="#6b7280" fontFamily="Inter, sans-serif" fontWeight="500">Australia</text>
          <text x="1040" y="260" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="Inter, sans-serif">NZ</text>

          {/* City dots + labels */}
          {Object.entries(CITY_COORDS).map(([city, pos]) => {
            const count = cityData[city] || 0;
            const isActive = count > 0;
            const ratio = normalize(count, maxCount);
            const r = isActive ? Math.max(8, Math.min(24, 8 + ratio * 20)) : 4;

            return (
              <g key={city}>
                {isActive && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r + 4}
                    fill="hsl(243, 75%, 59%)"
                    opacity="0.15"
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={isActive ? "hsl(243, 75%, 59%)" : "#cbd5e1"}
                  stroke={isActive ? "white" : "#94a3b8"}
                  strokeWidth="1.5"
                  opacity={isActive ? 1 : 0.5}
                />
                {isActive && (
                  <text
                    x={pos.x}
                    y={pos.y + 0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={count >= 100 ? "7" : "8"}
                    fill="white"
                    fontWeight="700"
                    fontFamily="Inter, sans-serif"
                  >
                    {count}
                  </text>
                )}
                <text
                  x={pos.x}
                  y={pos.y - r - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isActive ? "#1e293b" : "#94a3b8"}
                  fontWeight={isActive ? "600" : "400"}
                  fontFamily="Inter, sans-serif"
                >
                  {city}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      {activeCities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeCities.sort((a, b) => b[1] - a[1]).map(([city, count]) => (
            <div key={city} className="flex items-center gap-1.5 bg-primary/5 rounded-lg px-2.5 py-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-medium text-foreground">{city}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      )}

      {activeCities.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Tambahkan nama kota pada nama Desa/Kelompok di Pengaturan untuk menampilkan sebaran.
        </p>
      )}
    </div>
  );
}