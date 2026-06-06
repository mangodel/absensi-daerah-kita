import { useMemo, useState } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [zoom, setZoom] = useState(1);
  const [showCityBreakdown, setShowCityBreakdown] = useState(null);

  const cityData = useMemo(() => {
    const data = {};
    Object.entries(desaKelompokMap).forEach(([desa, kelompoks]) => {
      kelompoks.forEach(kelompok => {
        const key = Object.keys(CITIES).find(city =>
          kelompok.toLowerCase().includes(city.toLowerCase()) ||
          desa.toLowerCase().includes(city.toLowerCase())
        );
        if (key) {
          const kelompokMembers = members.filter(m => m.kelompok === kelompok);
          if (!data[key]) data[key] = { total: 0, male: 0, female: 0, adult: 0, generus: 0 };
          data[key].total += kelompokMembers.length;
          data[key].male += kelompokMembers.filter(m => m.gender === "Laki-laki").length;
          data[key].female += kelompokMembers.filter(m => m.gender === "Perempuan").length;
          data[key].adult += kelompokMembers.filter(m => !m.birth_year || new Date().getFullYear() - m.birth_year >= 18).length;
          data[key].generus += kelompokMembers.filter(m => m.birth_year && new Date().getFullYear() - m.birth_year < 18).length;
        }
      });
      const desaKey = Object.keys(CITIES).find(city => desa.toLowerCase().includes(city.toLowerCase()));
      if (desaKey && !data[desaKey]) {
        const desaMembers = members.filter(m => m.desa === desa);
        data[desaKey] = {
          total: desaMembers.length,
          male: desaMembers.filter(m => m.gender === "Laki-laki").length,
          female: desaMembers.filter(m => m.gender === "Perempuan").length,
          adult: desaMembers.filter(m => !m.birth_year || new Date().getFullYear() - m.birth_year >= 18).length,
          generus: desaMembers.filter(m => m.birth_year && new Date().getFullYear() - m.birth_year < 18).length,
        };
      }
    });
    // Fallback
    if (Object.keys(data).length === 0 && members.length > 0) {
      const desaNames = Object.keys(desaKelompokMap);
      const cityKeys = Object.keys(CITIES);
      desaNames.forEach((desa, i) => {
        const city = cityKeys[i % cityKeys.length];
        const desaMembers = members.filter(m => m.desa === desa);
        if (!data[city]) data[city] = { total: 0, male: 0, female: 0, adult: 0, generus: 0 };
        data[city].total += desaMembers.length;
        data[city].male += desaMembers.filter(m => m.gender === "Laki-laki").length;
        data[city].female += desaMembers.filter(m => m.gender === "Perempuan").length;
        data[city].adult += desaMembers.filter(m => !m.birth_year || new Date().getFullYear() - m.birth_year >= 18).length;
        data[city].generus += desaMembers.filter(m => m.birth_year && new Date().getFullYear() - m.birth_year < 18).length;
      });
    }
    return data;
  }, [members, desaKelompokMap]);

  const maxCount = Math.max(...Object.values(cityData).map(c => c.total), 1);
  const activeCities = Object.entries(cityData).filter(([, c]) => c.total > 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Sebaran Jamaah</h3>
          <p className="text-xs text-muted-foreground">Australia &amp; New Zealand</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="w-full rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #dbeafe 100%)", transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", width: "100%", height: "auto" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ocean gradient background */}
          <defs>
            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="50%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#oceanGrad)" />

          {/* Grid lines */}
          {[120, 130, 140, 150, 160, 170].map(lng => (
            <line key={`lg${lng}`} x1={lx(lng)} y1="0" x2={lx(lng)} y2={H} stroke="#93c5fd" strokeWidth="0.5" opacity="0.4" />
          ))}
          {[-15, -20, -25, -30, -35, -40, -45].map(lat => (
            <line key={`lt${lat}`} x1="0" y1={ly(lat)} x2={W} y2={ly(lat)} stroke="#93c5fd" strokeWidth="0.5" opacity="0.4" />
          ))}

          {/* Land masses dengan warna state */}
          {/* WA, NT, SA (Utara/Barat) */}
          <path d={AU_D} fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" opacity="0.95" />
          {/* Tasmania */}
          <path d={TAS_D} fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5" strokeLinejoin="round" />
          {/* New Zealand */}
          <path d={NZ_N_D} fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
          <path d={NZ_S_D} fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />

          {/* State borders */}
          <line x1={lx(129)} y1={ly(-14)} x2={lx(129)} y2={ly(-35.5)} stroke="#bbf7d0" strokeWidth="1" strokeDasharray="5,4" opacity="0.6" />
          <line x1={lx(141)} y1={ly(-26)} x2={lx(141)} y2={ly(-38)} stroke="#fde047" strokeWidth="1" strokeDasharray="5,4" opacity="0.6" />
          <line x1={lx(141)} y1={ly(-29)} x2={lx(153.5)} y2={ly(-29)} stroke="#fde047" strokeWidth="1" strokeDasharray="5,4" opacity="0.6" />

          {/* Labels */}
          <text x={lx(134)} y={ly(-27)} textAnchor="middle" fontSize="16" fill="#15803d" fontWeight="900" opacity="0.15" fontFamily="Inter,sans-serif" letterSpacing="3">AUSTRALIA</text>
          <text x={lx(173)} y={ly(-43)} textAnchor="middle" fontSize="9" fill="#4f46e5" fontWeight="800" opacity="0.2" fontFamily="Inter,sans-serif" letterSpacing="1">NZ</text>

          {/* City markers with enhanced interactivity */}
          {Object.entries(CITY_COORDS).map(([city, pos]) => {
            const count = cityData[city] || 0;
            const isActive = count > 0;
            const ratio = count / maxCount;
            const r = isActive ? Math.max(10, Math.min(28, 10 + ratio * 18)) : 5;
            const isHovered = hoveredCity === city;

            return (
              <g
                key={city}
                style={{ cursor: isActive ? "pointer" : "default" }}
                onMouseEnter={() => isActive && setHoveredCity(city)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                {/* Animated glow ring when active */}
                {isActive && (
                  <>
                    <circle cx={pos.x} cy={pos.y} r={r + 6}
                      fill="hsl(243,75%,59%)" opacity={isHovered ? 0.3 : 0.15}
                      style={{
                        animation: isHovered ? "none" : "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                      }}
                    />
                    {isHovered && (
                      <circle cx={pos.x} cy={pos.y} r={r + 14}
                        fill="hsl(243,75%,59%)" opacity="0.2"
                        style={{
                          animation: "pulse 1.5s ease-out"
                        }}
                      />
                    )}
                  </>
                )}
                {/* Main marker circle */}
                <circle
                  cx={pos.x} cy={pos.y} r={isHovered ? r + 4 : r}
                  fill={isActive ? "hsl(243,75%,59%)" : "#cbd5e1"}
                  stroke="white" strokeWidth={isActive ? 2.5 : 1.5}
                  opacity={isActive ? 1 : 0.5}
                  style={{
                    transition: "all 0.2s ease",
                    filter: isActive ? "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" : "none"
                  }}
                />
                {/* Member count badge */}
                {isActive && (
                  <text x={pos.x} y={pos.y + 0.5} textAnchor="middle" dominantBaseline="middle"
                    fontSize={count >= 100 ? "5.5" : count >= 10 ? "7" : "8"} fill="white" fontWeight="900" fontFamily="Inter,sans-serif">
                    {count}
                  </text>
                )}
                {/* City label */}
                <text
                  x={pos.x} y={pos.y - r - (isHovered ? 9 : 6)}
                  textAnchor="middle" fontSize={isHovered ? "8.5" : "7.5"}
                  fill={isActive ? (isHovered ? "#4f46e5" : "#1e293b") : "#64748b"}
                  fontWeight={isActive ? (isHovered ? "800" : "700") : "500"}
                  fontFamily="Inter,sans-serif"
                  stroke="white" strokeWidth="3" paintOrder="stroke"
                  style={{ transition: "font-size 0.2s ease" }}
                >
                  {city}
                </text>

                {/* Enhanced tooltip on hover */}
                {isHovered && isActive && (() => {
                  const tw = 140, th = 80;
                  const tx = Math.min(Math.max(pos.x - tw / 2, 4), W - tw - 4);
                  const ty = pos.y - r - 90;
                  return (
                    <g filter="url(#glow)">
                      <rect x={tx} y={ty} width={tw} height={th} rx="6" fill="white" stroke="hsl(243,75%,59%)" strokeWidth="2" opacity="0.98" />
                      <text x={tx + tw / 2} y={ty + 15} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="hsl(243,75%,59%)" fontFamily="Inter,sans-serif">{city}</text>
                      <text x={tx + tw / 2} y={ty + 32} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e293b" fontFamily="Inter,sans-serif">{cityData[city]?.total || 0} jamaah</text>
                      <text x={tx + tw / 2} y={ty + 45} textAnchor="middle" fontSize="6.5" fill="#64748b" fontFamily="Inter,sans-serif">♂ {cityData[city]?.male || 0} | ♀ {cityData[city]?.female || 0}</text>
                      <text x={tx + tw / 2} y={ty + 58} textAnchor="middle" fontSize="6.5" fill="#64748b" fontFamily="Inter,sans-serif">Dewasa {cityData[city]?.adult || 0} | Generus {cityData[city]?.generus || 0}</text>
                      <text x={tx + tw / 2} y={ty + 72} textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="Inter,sans-serif" style={{ cursor: "pointer" }}>(Klik untuk toggle)</text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Animation styles */}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0; }
              50% { opacity: 1; }
            }
          `}</style>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-muted-foreground">Populasi Kecil</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Menengah</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary" />
          <span className="text-muted-foreground">Besar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary" />
          <span className="text-muted-foreground">Terbesar</span>
        </div>
      </div>

      {activeCities.length > 0 && (
        <div className="mt-2 space-y-2">
          {showCityBreakdown && cityData[showCityBreakdown] && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{showCityBreakdown}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>Total: <span className="font-bold text-primary">{cityData[showCityBreakdown].total}</span></div>
                <div>Laki-laki: <span className="font-bold">{cityData[showCityBreakdown].male}</span></div>
                <div>Perempuan: <span className="font-bold">{cityData[showCityBreakdown].female}</span></div>
                <div>Dewasa: <span className="font-bold">{cityData[showCityBreakdown].adult}</span></div>
                <div>Generus: <span className="font-bold">{cityData[showCityBreakdown].generus}</span></div>
              </div>
              <Button size="sm" variant="ghost" className="w-full h-6 text-xs mt-1" onClick={() => setShowCityBreakdown(null)}>
                Tutup
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {activeCities.sort((a, b) => b[1].total - a[1].total).map(([city, info]) => (
              <button
                key={city}
                onClick={() => setShowCityBreakdown(showCityBreakdown === city ? null : city)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition ${
                  showCityBreakdown === city
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/5 text-foreground hover:bg-primary/10"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${showCityBreakdown === city ? "bg-primary-foreground" : "bg-primary"}`} />
                <span className="font-medium">{city}</span>
                <span className="font-bold">{info.total}</span>
              </button>
            ))}
          </div>
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