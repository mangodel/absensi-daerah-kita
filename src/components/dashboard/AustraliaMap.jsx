import { useMemo, useState } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";

// Equirectangular projection: lng 112..180 -> x, lat -10..-55 -> y
// ViewBox: 0 0 760 480
const W = 760, H = 480;
const LNG_MIN = 112, LNG_MAX = 180;
const LAT_MIN = -10, LAT_MAX = -55;

const lx = (lng) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W;
const ly = (lat) => ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H;

const CITIES = {
  "Perth":        { lat: -31.95, lng: 115.86 },
  "Darwin":       { lat: -12.46, lng: 130.84 },
  "Adelaide":     { lat: -34.93, lng: 138.60 },
  "Brisbane":     { lat: -27.47, lng: 153.02 },
  "Sydney":       { lat: -33.87, lng: 151.21 },
  "Canberra":     { lat: -35.28, lng: 149.13 },
  "Melbourne":    { lat: -37.81, lng: 144.96 },
  "Hobart":       { lat: -42.88, lng: 147.33 },
  "Gold Coast":   { lat: -28.02, lng: 153.43 },
  "Cairns":       { lat: -16.92, lng: 145.77 },
  "Auckland":     { lat: -36.86, lng: 174.76 },
  "Wellington":   { lat: -41.29, lng: 174.78 },
  "Christchurch": { lat: -43.53, lng: 172.62 },
};

const CITY_COORDS = Object.fromEntries(
  Object.entries(CITIES).map(([name, { lat, lng }]) => [name, { x: lx(lng), y: ly(lat) }])
);

// Build SVG path string (M ... L ... Z) from array of [lng, lat]
function toPath(coords) {
  return coords.map(([lng, lat], i) =>
    `${i === 0 ? "M" : "L"}${lx(lng).toFixed(1)},${ly(lat).toFixed(1)}`
  ).join(" ") + " Z";
}

const AU_D = toPath([
  [114.1,-21.7],[114.5,-21.9],[114.6,-22.4],[113.9,-24.0],[113.7,-25.0],
  [113.9,-26.5],[114.2,-28.0],[114.9,-28.9],[114.7,-30.0],[115.0,-30.9],
  [115.6,-31.6],[115.7,-33.6],[116.5,-35.0],[118.4,-35.0],[121.8,-33.9],
  [124.0,-33.7],[126.5,-33.9],[129.0,-34.7],[130.1,-33.7],[131.0,-31.6],
  [132.4,-33.0],[135.5,-34.9],[137.8,-35.7],[138.8,-35.6],[139.7,-35.6],
  [140.5,-38.0],[141.9,-38.5],[143.4,-38.7],[144.8,-38.4],[145.7,-38.9],
  [147.0,-38.9],[148.3,-37.8],[150.1,-37.5],[150.5,-36.3],[151.1,-34.5],
  [151.3,-33.4],[153.2,-28.1],[153.6,-27.3],[153.5,-25.5],[152.5,-24.7],
  [151.3,-23.5],[150.5,-22.5],[149.5,-22.2],[148.1,-20.5],[147.5,-19.3],
  [146.3,-18.5],[145.5,-17.5],[145.4,-16.4],[144.9,-14.9],[145.3,-14.3],
  [144.9,-13.5],[144.3,-14.0],[143.8,-14.4],[143.5,-14.8],[142.5,-10.7],
  [141.5,-11.5],[141.0,-11.8],[140.0,-12.5],[139.3,-12.8],[138.7,-13.5],
  [136.1,-14.0],[136.8,-12.1],[135.5,-12.0],[135.9,-14.5],[135.8,-15.1],
  [134.0,-13.9],[133.0,-12.8],[131.5,-11.5],[130.5,-11.0],[130.8,-12.0],
  [131.5,-13.5],[130.5,-12.5],[130.2,-12.2],[129.5,-12.2],[128.5,-13.6],
  [127.5,-14.0],[126.5,-14.5],[125.5,-14.0],[124.0,-15.6],[123.3,-16.0],
  [122.4,-17.5],[122.0,-18.0],[121.3,-19.0],[120.9,-19.7],[119.5,-20.5],
  [118.5,-20.5],[118.0,-21.1],[116.6,-21.0],[115.5,-21.0],[114.5,-21.7],
]);

const TAS_D = toPath([
  [144.6,-40.6],[145.1,-40.7],[146.0,-41.0],[148.0,-41.5],[148.3,-42.5],
  [148.1,-43.2],[147.5,-43.6],[146.8,-43.7],[145.8,-43.6],[145.0,-43.2],
  [144.7,-42.8],[144.5,-41.5],
]);

const NZ_N_D = toPath([
  [172.6,-34.4],[173.1,-35.0],[174.4,-36.0],[175.0,-36.5],[175.6,-37.1],
  [176.2,-37.6],[177.9,-38.7],[178.5,-38.8],[177.8,-39.1],[176.9,-40.0],
  [175.7,-40.6],[175.3,-41.3],[174.8,-41.3],[174.2,-41.0],[173.7,-40.0],
  [173.2,-39.0],[173.8,-37.5],[174.5,-36.8],[174.8,-36.9],[174.5,-36.2],
  [173.8,-35.5],[173.3,-35.0],[172.7,-34.5],
]);

const NZ_S_D = toPath([
  [172.6,-40.5],[173.9,-41.3],[174.2,-41.6],[174.2,-42.0],[173.5,-42.5],
  [172.7,-43.5],[171.9,-44.0],[171.1,-44.3],[170.4,-44.5],[169.5,-45.0],
  [168.3,-45.5],[167.5,-46.5],[168.3,-46.6],[169.8,-46.5],[170.7,-45.8],
  [171.5,-45.5],[172.5,-43.8],[173.4,-43.2],[173.8,-42.5],[173.8,-41.5],
  [172.9,-41.0],
]);

export default function AustraliaMap({ members }) {
  const { config } = useAppConfig();
  const desaKelompokMap = config.desa_kelompok_map || {};
  const [hoveredCity, setHoveredCity] = useState(null);

  const cityData = useMemo(() => {
    const counts = {};
    Object.entries(desaKelompokMap).forEach(([desa, kelompoks]) => {
      kelompoks.forEach(kelompok => {
        const key = Object.keys(CITIES).find(city =>
          kelompok.toLowerCase().includes(city.toLowerCase()) ||
          desa.toLowerCase().includes(city.toLowerCase())
        );
        if (key) {
          counts[key] = (counts[key] || 0) + members.filter(m => m.kelompok === kelompok).length;
        }
      });
      const desaKey = Object.keys(CITIES).find(city => desa.toLowerCase().includes(city.toLowerCase()));
      if (desaKey && !counts[desaKey]) {
        counts[desaKey] = members.filter(m => m.desa === desa).length;
      }
    });
    // Fallback: distribute members across cities by desa index
    if (Object.keys(counts).length === 0 && members.length > 0) {
      const desaNames = Object.keys(desaKelompokMap);
      const cityKeys = Object.keys(CITIES);
      desaNames.forEach((desa, i) => {
        const city = cityKeys[i % cityKeys.length];
        counts[city] = (counts[city] || 0) + members.filter(m => m.desa === desa).length;
      });
    }
    return counts;
  }, [members, desaKelompokMap]);

  const maxCount = Math.max(...Object.values(cityData), 1);
  const activeCities = Object.entries(cityData).filter(([, c]) => c > 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-sm text-foreground mb-0.5">Sebaran Jamaah</h3>
      <p className="text-xs text-muted-foreground mb-4">Australia &amp; New Zealand — hover kota untuk detail</p>

      <div className="w-full rounded-xl overflow-hidden" style={{ background: "#bfdbfe" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", width: "100%", height: "auto" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ocean */}
          <rect x="0" y="0" width={W} height={H} fill="#bfdbfe" />

          {/* Grid lines */}
          {[120, 130, 140, 150, 160, 170].map(lng => (
            <line key={`lg${lng}`} x1={lx(lng)} y1="0" x2={lx(lng)} y2={H} stroke="#93c5fd" strokeWidth="0.5" opacity="0.4" />
          ))}
          {[-15, -20, -25, -30, -35, -40, -45].map(lat => (
            <line key={`lt${lat}`} x1="0" y1={ly(lat)} x2={W} y2={ly(lat)} stroke="#93c5fd" strokeWidth="0.5" opacity="0.4" />
          ))}

          {/* Land masses */}
          <path d={AU_D} fill="#d1fae5" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round" />
          <path d={TAS_D} fill="#d1fae5" stroke="#4ade80" strokeWidth="1" strokeLinejoin="round" />
          <path d={NZ_N_D} fill="#d1fae5" stroke="#4ade80" strokeWidth="1" strokeLinejoin="round" />
          <path d={NZ_S_D} fill="#d1fae5" stroke="#4ade80" strokeWidth="1" strokeLinejoin="round" />

          {/* State borders */}
          <line x1={lx(129)} y1={ly(-14)} x2={lx(129)} y2={ly(-35.5)} stroke="#86efac" strokeWidth="0.8" strokeDasharray="4,3" />
          <line x1={lx(141)} y1={ly(-26)} x2={lx(141)} y2={ly(-38)} stroke="#86efac" strokeWidth="0.8" strokeDasharray="4,3" />
          <line x1={lx(141)} y1={ly(-29)} x2={lx(153.5)} y2={ly(-29)} stroke="#86efac" strokeWidth="0.8" strokeDasharray="4,3" />

          {/* Labels */}
          <text x={lx(134)} y={ly(-27)} textAnchor="middle" fontSize="14" fill="#166534" fontWeight="800" opacity="0.2" fontFamily="Inter,sans-serif" letterSpacing="4">AUSTRALIA</text>
          <text x={lx(173)} y={ly(-43)} textAnchor="middle" fontSize="8" fill="#166534" fontWeight="700" opacity="0.35" fontFamily="Inter,sans-serif">NEW ZEALAND</text>

          {/* City markers */}
          {Object.entries(CITY_COORDS).map(([city, pos]) => {
            const count = cityData[city] || 0;
            const isActive = count > 0;
            const ratio = count / maxCount;
            const r = isActive ? Math.max(9, Math.min(24, 9 + ratio * 16)) : 4;
            const isHovered = hoveredCity === city;

            return (
              <g
                key={city}
                style={{ cursor: isActive ? "pointer" : "default" }}
                onMouseEnter={() => isActive && setHoveredCity(city)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                {/* Pulse ring when hovered */}
                {isActive && (
                  <circle cx={pos.x} cy={pos.y} r={r + (isHovered ? 14 : 8)}
                    fill="hsl(243,75%,59%)" opacity={isHovered ? 0.25 : 0.12} />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={isHovered ? r + 3 : r}
                  fill={isActive ? "hsl(243,75%,59%)" : "#94a3b8"}
                  stroke="white" strokeWidth={isActive ? 2 : 1}
                  opacity={isActive ? 1 : 0.45}
                  style={{ transition: "r 0.15s ease" }}
                />
                {isActive && (
                  <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize={count >= 100 ? "6" : "7.5"} fill="white" fontWeight="900" fontFamily="Inter,sans-serif">
                    {count}
                  </text>
                )}
                {/* City label with white outline */}
                <text
                  x={pos.x} y={pos.y - r - (isHovered ? 8 : 5)}
                  textAnchor="middle" fontSize="7.5"
                  fill={isActive ? (isHovered ? "#4f46e5" : "#1e3a5f") : "#64748b"}
                  fontWeight={isActive ? "700" : "400"}
                  fontFamily="Inter,sans-serif"
                  stroke="white" strokeWidth="3" paintOrder="stroke"
                >
                  {city}
                </text>

                {/* Tooltip on hover */}
                {isHovered && isActive && (() => {
                  const tw = 110, th = 36;
                  const tx = Math.min(Math.max(pos.x - tw / 2, 4), W - tw - 4);
                  const ty = pos.y - r - 50;
                  return (
                    <g>
                      <rect x={tx} y={ty} width={tw} height={th} rx="5" fill="white" stroke="hsl(243,75%,59%)" strokeWidth="1.5" filter="url(#shadow)" />
                      <text x={tx + tw / 2} y={ty + 13} textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(243,75%,59%)" fontFamily="Inter,sans-serif">{city}</text>
                      <text x={tx + tw / 2} y={ty + 26} textAnchor="middle" fontSize="8" fill="#374151" fontFamily="Inter,sans-serif">{count} jamaah</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Drop shadow filter */}
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
            </filter>
          </defs>
        </svg>
      </div>

      {activeCities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
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
        <p className="text-xs text-muted-foreground text-center mt-3">
          Tambahkan nama kota (Perth, Sydney, Melbourne, dll.) pada nama Desa/Kelompok di Pengaturan untuk menampilkan sebaran.
        </p>
      )}
    </div>
  );
}