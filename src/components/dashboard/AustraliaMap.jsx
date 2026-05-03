import { useMemo } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";

/**
 * SVG Map of Australia & New Zealand
 * ViewBox: 0 0 800 600
 * Projection: Simple equirectangular
 *   lng 110..180 => x 0..700  (10 px/deg)
 *   lat -10..-55 => y 0..450  (10 px/deg)
 */
const lngToX = (lng) => (lng - 110) * 10;
const latToY = (lat) => (-lat - 10) * 10;

// Key city coordinates
const CITY_COORDS = {
  "Perth":        { x: lngToX(115.86), y: latToY(-31.95) },
  "Darwin":       { x: lngToX(130.84), y: latToY(-12.46) },
  "Adelaide":     { x: lngToX(138.60), y: latToY(-34.93) },
  "Brisbane":     { x: lngToX(153.02), y: latToY(-27.47) },
  "Sydney":       { x: lngToX(151.21), y: latToY(-33.87) },
  "Canberra":     { x: lngToX(149.13), y: latToY(-35.28) },
  "Melbourne":    { x: lngToX(144.96), y: latToY(-37.81) },
  "Hobart":       { x: lngToX(147.33), y: latToY(-42.88) },
  "Gold Coast":   { x: lngToX(153.43), y: latToY(-28.02) },
  "Cairns":       { x: lngToX(145.77), y: latToY(-16.92) },
  "Auckland":     { x: lngToX(174.76), y: latToY(-36.86) },
  "Wellington":   { x: lngToX(174.78), y: latToY(-41.29) },
  "Christchurch": { x: lngToX(172.62), y: latToY(-43.53) },
  "Rarotonga":    { x: 730, y: 220 }, // Cook Islands, manual
};

// Australia outline (simplified but geographically correct)
// Going clockwise from SW corner
const AUSTRALIA = `
M ${lngToX(114)} ${latToY(-22)}
L ${lngToX(113.5)} ${latToY(-24)}
L ${lngToX(113.8)} ${latToY(-26)}
L ${lngToX(114.2)} ${latToY(-28)}
L ${lngToX(114.9)} ${latToY(-29)}
L ${lngToX(114.6)} ${latToY(-30)}
L ${lngToX(115)} ${latToY(-31)}
L ${lngToX(115.7)} ${latToY(-32)}
L ${lngToX(115.6)} ${latToY(-33)}
L ${lngToX(116.7)} ${latToY(-35)}
L ${lngToX(118.5)} ${latToY(-35)}
L ${lngToX(121.8)} ${latToY(-34)}
L ${lngToX(124)} ${latToY(-34)}
L ${lngToX(126.1)} ${latToY(-34)}
L ${lngToX(127.5)} ${latToY(-34)}
L ${lngToX(129)} ${latToY(-34.5)}
L ${lngToX(130.2)} ${latToY(-33.6)}
L ${lngToX(131)} ${latToY(-31.5)}
L ${lngToX(131.5)} ${latToY(-32)}
L ${lngToX(133)} ${latToY(-32.5)}
L ${lngToX(134)} ${latToY(-33)}
L ${lngToX(135.5)} ${latToY(-34.7)}
L ${lngToX(136.5)} ${latToY(-35.2)}
L ${lngToX(137.8)} ${latToY(-35.6)}
L ${lngToX(138.5)} ${latToY(-35.7)}
L ${lngToX(139.8)} ${latToY(-35.6)}
L ${lngToX(140.7)} ${latToY(-38)}
L ${lngToX(142)} ${latToY(-38.5)}
L ${lngToX(143.5)} ${latToY(-38.7)}
L ${lngToX(144.7)} ${latToY(-38.5)}
L ${lngToX(145.8)} ${latToY(-39)}
L ${lngToX(146.8)} ${latToY(-39)}
L ${lngToX(147.8)} ${latToY(-38)}
L ${lngToX(148.3)} ${latToY(-37.8)}
L ${lngToX(150)} ${latToY(-37.5)}
L ${lngToX(150.5)} ${latToY(-36.3)}
L ${lngToX(151)} ${latToY(-34.5)}
L ${lngToX(151.3)} ${latToY(-33.5)}
L ${lngToX(153.2)} ${latToY(-28.2)}
L ${lngToX(153.6)} ${latToY(-27.4)}
L ${lngToX(153.5)} ${latToY(-25.5)}
L ${lngToX(152.5)} ${latToY(-24.7)}
L ${lngToX(151.5)} ${latToY(-23.5)}
L ${lngToX(150.5)} ${latToY(-22.5)}
L ${lngToX(149.5)} ${latToY(-22.2)}
L ${lngToX(148)} ${latToY(-20.5)}
L ${lngToX(146.8)} ${latToY(-19.3)}
L ${lngToX(147.4)} ${latToY(-18.9)}
L ${lngToX(147.5)} ${latToY(-18.3)}
L ${lngToX(146.3)} ${latToY(-18.5)}
L ${lngToX(145.5)} ${latToY(-17.5)}
L ${lngToX(145.4)} ${latToY(-16.5)}
L ${lngToX(144.8)} ${latToY(-14.8)}
L ${lngToX(145.3)} ${latToY(-14.2)}
L ${lngToX(144.8)} ${latToY(-13.5)}
L ${lngToX(144.3)} ${latToY(-14)}
L ${lngToX(143.8)} ${latToY(-14.3)}
L ${lngToX(143.5)} ${latToY(-14.8)}
L ${lngToX(142.5)} ${latToY(-10.7)}
L ${lngToX(141.5)} ${latToY(-11.5)}
L ${lngToX(140.9)} ${latToY(-11.8)}
L ${lngToX(140)} ${latToY(-12.5)}
L ${lngToX(139.5)} ${latToY(-12.8)}
L ${lngToX(138.8)} ${latToY(-13.5)}
L ${lngToX(136.2)} ${latToY(-14)}
L ${lngToX(136.8)} ${latToY(-12)}
L ${lngToX(135.5)} ${latToY(-12)}
L ${lngToX(135.9)} ${latToY(-14.5)}
L ${lngToX(135.8)} ${latToY(-15)}
L ${lngToX(134)} ${latToY(-14)}
L ${lngToX(133)} ${latToY(-12.8)}
L ${lngToX(131.5)} ${latToY(-11.5)}
L ${lngToX(130.5)} ${latToY(-11)}
L ${lngToX(130.8)} ${latToY(-12)}
L ${lngToX(132.7)} ${latToY(-14.3)}
L ${lngToX(132.3)} ${latToY(-14.5)}
L ${lngToX(131.5)} ${latToY(-13.5)}
L ${lngToX(130.5)} ${latToY(-12.5)}
L ${lngToX(130.2)} ${latToY(-12.2)}
L ${lngToX(130)} ${latToY(-11.7)}
L ${lngToX(129.5)} ${latToY(-12.2)}
L ${lngToX(128.5)} ${latToY(-13.6)}
L ${lngToX(127.5)} ${latToY(-14)}
L ${lngToX(126.5)} ${latToY(-14.5)}
L ${lngToX(125.5)} ${latToY(-14)}
L ${lngToX(124)} ${latToY(-15.5)}
L ${lngToX(123.3)} ${latToY(-16)}
L ${lngToX(122.5)} ${latToY(-17.5)}
L ${lngToX(122)} ${latToY(-18)}
L ${lngToX(121.5)} ${latToY(-19)}
L ${lngToX(121)} ${latToY(-19.5)}
L ${lngToX(119.5)} ${latToY(-20.5)}
L ${lngToX(118.5)} ${latToY(-20.5)}
L ${lngToX(118)} ${latToY(-21.2)}
L ${lngToX(116.5)} ${latToY(-21)}
L ${lngToX(115.5)} ${latToY(-21)}
L ${lngToX(114.5)} ${latToY(-21.8)}
Z
`.trim();

// Tasmania
const TASMANIA = `
M ${lngToX(144.6)} ${latToY(-40.6)}
L ${lngToX(145)} ${latToY(-40.7)}
L ${lngToX(145.8)} ${latToY(-41)}
L ${lngToX(148)} ${latToY(-41.5)}
L ${lngToX(148.3)} ${latToY(-42.5)}
L ${lngToX(148.2)} ${latToY(-43.2)}
L ${lngToX(147.5)} ${latToY(-43.5)}
L ${lngToX(146.8)} ${latToY(-43.7)}
L ${lngToX(145.8)} ${latToY(-43.6)}
L ${lngToX(145)} ${latToY(-43.2)}
L ${lngToX(144.7)} ${latToY(-42.8)}
L ${lngToX(144.5)} ${latToY(-41.5)}
Z
`.trim();

// New Zealand North Island
const NZ_NORTH = `
M ${lngToX(172.6)} ${latToY(-34.4)}
L ${lngToX(173.1)} ${latToY(-35)}
L ${lngToX(174.4)} ${latToY(-36)}
L ${lngToX(175)} ${latToY(-36.5)}
L ${lngToX(175.5)} ${latToY(-37.1)}
L ${lngToX(175.6)} ${latToY(-37.5)}
L ${lngToX(176.2)} ${latToY(-37.6)}
L ${lngToX(177.9)} ${latToY(-38.7)}
L ${lngToX(178.5)} ${latToY(-38.8)}
L ${lngToX(177.8)} ${latToY(-39.1)}
L ${lngToX(176.9)} ${latToY(-40)}
L ${lngToX(175.7)} ${latToY(-40.6)}
L ${lngToX(175.3)} ${latToY(-41.3)}
L ${lngToX(174.8)} ${latToY(-41.3)}
L ${lngToX(174.2)} ${latToY(-41)}
L ${lngToX(173.7)} ${latToY(-40)}
L ${lngToX(173.2)} ${latToY(-39)}
L ${lngToX(173.8)} ${latToY(-37.5)}
L ${lngToX(174.5)} ${latToY(-36.8)}
L ${lngToX(174.8)} ${latToY(-36.9)}
L ${lngToX(174.5)} ${latToY(-36.2)}
L ${lngToX(173.8)} ${latToY(-35.5)}
L ${lngToX(173.3)} ${latToY(-35)}
L ${lngToX(172.7)} ${latToY(-34.5)}
Z
`.trim();

// New Zealand South Island
const NZ_SOUTH = `
M ${lngToX(172.6)} ${latToY(-40.5)}
L ${lngToX(173.9)} ${latToY(-41.3)}
L ${lngToX(174.2)} ${latToY(-41.6)}
L ${lngToX(174.2)} ${latToY(-42)}
L ${lngToX(173.5)} ${latToY(-42.5)}
L ${lngToX(172.7)} ${latToY(-43.5)}
L ${lngToX(171.9)} ${latToY(-44)}
L ${lngToX(171.1)} ${latToY(-44.3)}
L ${lngToX(170.4)} ${latToY(-44.5)}
L ${lngToX(169.5)} ${latToY(-45)}
L ${lngToX(168.3)} ${latToY(-45.5)}
L ${lngToX(167.5)} ${latToY(-46.5)}
L ${lngToX(168.3)} ${latToY(-46.6)}
L ${lngToX(169.8)} ${latToY(-46.5)}
L ${lngToX(170.7)} ${latToY(-45.8)}
L ${lngToX(171.5)} ${latToY(-45.5)}
L ${lngToX(172.5)} ${latToY(-43.8)}
L ${lngToX(173.4)} ${latToY(-43.2)}
L ${lngToX(173.9)} ${latToY(-42.5)}
L ${lngToX(173.8)} ${latToY(-41.5)}
L ${lngToX(172.9)} ${latToY(-41)}
Z
`.trim();

function normalize(value, max) {
  if (max === 0) return 0;
  return value / max;
}

export default function AustraliaMap({ members }) {
  const { config } = useAppConfig();
  const desaKelompokMap = config.desa_kelompok_map || {};

  const cityData = useMemo(() => {
    const counts = {};
    Object.entries(desaKelompokMap).forEach(([desa, kelompoks]) => {
      kelompoks.forEach(kelompok => {
        const cityKey = Object.keys(CITY_COORDS).find(city =>
          kelompok.toLowerCase().includes(city.toLowerCase()) ||
          desa.toLowerCase().includes(city.toLowerCase())
        );
        if (cityKey) {
          const count = members.filter(m => m.kelompok === kelompok).length;
          counts[cityKey] = (counts[cityKey] || 0) + count;
        }
      });
      const desaCityKey = Object.keys(CITY_COORDS).find(city =>
        desa.toLowerCase().includes(city.toLowerCase())
      );
      if (desaCityKey && !counts[desaCityKey]) {
        counts[desaCityKey] = members.filter(m => m.desa === desa).length;
      }
    });

    if (Object.keys(counts).length === 0 && members.length > 0) {
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
      <h3 className="font-semibold text-sm text-foreground mb-0.5">Sebaran Jamaah</h3>
      <p className="text-xs text-muted-foreground mb-3">Australia &amp; New Zealand</p>

      <div className="w-full rounded-xl overflow-hidden bg-[#dbeafe]">
        <svg viewBox="50 10 710 450" className="w-full" style={{ display: "block" }}>
          {/* Ocean background */}
          <rect x="50" y="10" width="710" height="450" fill="#dbeafe" />

          {/* Land masses */}
          <path d={AUSTRALIA} fill="#dcfce7" stroke="#4ade80" strokeWidth="1" />
          <path d={TASMANIA} fill="#dcfce7" stroke="#4ade80" strokeWidth="1" />
          <path d={NZ_NORTH} fill="#dcfce7" stroke="#4ade80" strokeWidth="1" />
          <path d={NZ_SOUTH} fill="#dcfce7" stroke="#4ade80" strokeWidth="1" />

          {/* Rarotonga island dot */}
          <circle cx={730} cy={220} r={4} fill="#dcfce7" stroke="#4ade80" strokeWidth="1" />

          {/* Country labels */}
          <text x={lngToX(134)} y={latToY(-26)} textAnchor="middle" fontSize="10" fill="#15803d" fontWeight="700" opacity="0.4" fontFamily="Inter,sans-serif" letterSpacing="2">AUSTRALIA</text>
          <text x={lngToX(172.5)} y={latToY(-42)} textAnchor="middle" fontSize="7" fill="#15803d" fontWeight="600" opacity="0.5" fontFamily="Inter,sans-serif">NZ</text>

          {/* City markers */}
          {Object.entries(CITY_COORDS).map(([city, pos]) => {
            const count = cityData[city] || 0;
            const isActive = count > 0;
            const ratio = normalize(count, maxCount);
            const r = isActive ? Math.max(8, Math.min(22, 8 + ratio * 16)) : 3;

            return (
              <g key={city}>
                {isActive && (
                  <circle cx={pos.x} cy={pos.y} r={r + 6} fill="hsl(243,75%,59%)" opacity="0.12" />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={isActive ? "hsl(243,75%,59%)" : "#cbd5e1"}
                  stroke={isActive ? "white" : "#e2e8f0"}
                  strokeWidth={isActive ? "1.5" : "1"}
                  opacity={isActive ? 1 : 0.5}
                />
                {isActive && (
                  <text x={pos.x} y={pos.y + 0.5} textAnchor="middle" dominantBaseline="middle"
                    fontSize={count >= 100 ? "5.5" : "6.5"} fill="white" fontWeight="800" fontFamily="Inter,sans-serif">
                    {count}
                  </text>
                )}
                <text x={pos.x} y={pos.y - r - 4} textAnchor="middle" fontSize="6.5"
                  fill={isActive ? "#1e293b" : "#94a3b8"}
                  fontWeight={isActive ? "600" : "400"} fontFamily="Inter,sans-serif">
                  {city}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

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