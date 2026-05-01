import { useMemo } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";

/**
 * Koordinat kota dikonversi dari lat/lng ke SVG viewBox 0 0 1100 700
 * 
 * Mapping geografis:
 *   Longitude: 110°E - 180°E  => x: 0 - 1000  (scale: ~14.28 px/deg)
 *   Latitude:  -10°S - -55°S  => y: 0 - 700   (scale: ~15.56 px/deg)
 * 
 * formula: x = (lng - 110) * 14.28
 *          y = (lat + 10)  * 15.56  (lat negative)
 * 
 * Rarotonga (Cook Islands): lng=201 => dipetakan secara manual di kanan NZ
 */

const toSVG = (lat, lng) => ({
  x: Math.round((lng - 110) * 14.28),
  y: Math.round((-lat - 10) * 15.56),
});

const CITY_COORDS = {
  // Australia
  "Perth":        toSVG(-31.95, 115.86),  // x≈83,  y≈341
  "Darwin":       toSVG(-12.46, 130.84),  // x≈298, y≈38
  "Adelaide":     toSVG(-34.93, 138.60),  // x≈408, y≈389
  "Brisbane":     toSVG(-27.47, 153.02),  // x≈614, y≈271
  "Sydney":       toSVG(-33.87, 151.21),  // x≈588, y≈374
  "Canberra":     toSVG(-35.28, 149.13),  // x≈559, y≈396
  "Melbourne":    toSVG(-37.81, 144.96),  // x≈499, y≈435
  "Hobart":       toSVG(-42.88, 147.33),  // x≈533, y≈514
  "Gold Coast":   toSVG(-28.02, 153.43),  // x≈620, y≈280
  "Cairns":       toSVG(-16.92, 145.77),  // x≈511, y≈106
  "Townsville":   toSVG(-19.26, 146.82),  // x≈525, y≈143
  "Newcastle":    toSVG(-32.93, 151.78),  // x≈596, y≈355
  // New Zealand
  "Auckland":     toSVG(-36.86, 174.76),  // x≈926, y≈420
  "Wellington":   toSVG(-41.29, 174.78),  // x≈926, y≈490
  "Christchurch": toSVG(-43.53, 172.62),  // x≈895, y≈523
  "Dunedin":      toSVG(-45.88, 170.50),  // x≈865, y≈560
  "Hamilton":     toSVG(-37.79, 175.28),  // x≈934, y≈436
  // Rarotonga (Cook Islands) - manual placement
  "Rarotonga":    { x: 1040, y: 370 },
};

// Australia mainland - path mengikuti garis pantai nyata (simplified)
const AUSTRALIA_PATH = `
  M 83 341
  L 75 310 L 68 270 L 72 230 L 80 200 L 90 170 L 102 145
  L 120 130 L 140 120 L 160 115 L 180 108 L 200 102 L 220 95
  L 240 88 L 265 82 L 290 78 L 310 72 L 330 68 L 350 65
  L 370 62 L 395 60 L 420 62 L 445 65 L 470 70 L 490 75
  L 510 80 L 535 82 L 555 85 L 575 88 L 595 95
  L 610 108 L 625 125 L 635 145 L 640 170
  L 630 195 L 620 220 L 615 245
  L 620 265 L 625 285 L 628 305
  L 622 325 L 615 345
  L 605 365 L 598 380
  L 592 395 L 588 410
  L 580 425 L 565 435
  L 548 440 L 530 438
  L 512 432 L 495 425
  L 478 420 L 460 415
  L 440 412 L 420 410
  L 395 408 L 370 405
  L 345 400 L 320 398
  L 295 396 L 270 395
  L 245 393 L 220 390
  L 195 385 L 175 375
  L 155 360 L 140 345
  L 118 338 L 100 340 Z
`;

// Gulf of Carpentaria indent
const GULF_PATH = `M 400 78 L 415 100 L 430 118 L 445 128 L 460 120 L 470 102 L 475 80`;

// Cape York
const CAPE_YORK = `M 575 88 L 590 68 L 600 50 L 608 65 L 614 88`;

// Tasmania
const TASMANIA_PATH = `M 518 518 L 535 510 L 550 515 L 558 530 L 553 548 L 538 558 L 521 553 L 513 540 Z`;

// New Zealand - North Island (lebih akurat)
const NZ_NORTH = `
  M 930 385
  L 940 368 L 952 350 L 960 332 L 962 315
  L 956 300 L 946 288 L 934 282
  L 922 285 L 915 298 L 912 315
  L 910 332 L 912 350 L 916 368
  L 920 382 Z
`;

// New Zealand - South Island
const NZ_SOUTH = `
  M 912 395
  L 930 390 L 948 392 L 963 400
  L 972 415 L 975 432 L 970 450
  L 958 468 L 942 480 L 924 488
  L 905 488 L 890 480 L 878 465
  L 872 448 L 874 430 L 882 415
  L 896 405 Z
`;

// Rarotonga (Cook Islands) - small island
const RAROTONGA_PATH = `M 1038 368 L 1044 366 L 1048 370 L 1046 375 L 1040 377 L 1035 374 Z`;

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
      <h3 className="font-semibold text-sm text-foreground mb-1">Sebaran Jamaah</h3>
      <p className="text-xs text-muted-foreground mb-4">Australia, New Zealand & Rarotonga</p>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox="40 30 1060 580"
          className="w-full"
          style={{ minHeight: 260 }}
        >
          {/* Ocean */}
          <rect x="40" y="30" width="1060" height="580" fill="#dbeafe" rx="10" />

          {/* Grid lines (subtle) */}
          {[100, 200, 300, 400, 500].map(y => (
            <line key={y} x1="40" y1={y} x2="1100" y2={y} stroke="#bfdbfe" strokeWidth="0.5" />
          ))}

          {/* Australia mainland */}
          <path d={AUSTRALIA_PATH} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />
          {/* Gulf indent & Cape York overlaid */}
          <path d={GULF_PATH} fill="#dbeafe" stroke="#6ee7b7" strokeWidth="1" />
          <path d={CAPE_YORK} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />

          {/* Tasmania */}
          <path d={TASMANIA_PATH} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />

          {/* New Zealand */}
          <path d={NZ_NORTH} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />
          <path d={NZ_SOUTH} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />

          {/* Rarotonga */}
          <path d={RAROTONGA_PATH} fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />

          {/* Country labels */}
          <text x="370" y="290" textAnchor="middle" fontSize="13" fill="#065f46" fontFamily="Inter,sans-serif" fontWeight="600" opacity="0.5">Australia</text>
          <text x="930" y="445" textAnchor="middle" fontSize="9" fill="#065f46" fontFamily="Inter,sans-serif" fontWeight="600" opacity="0.6">NZ</text>
          <text x="1042" y="390" textAnchor="middle" fontSize="7" fill="#065f46" fontFamily="Inter,sans-serif" opacity="0.7">Rarotonga</text>

          {/* City dots */}
          {Object.entries(CITY_COORDS).map(([city, pos]) => {
            const count = cityData[city] || 0;
            const isActive = count > 0;
            const ratio = normalize(count, maxCount);
            const r = isActive ? Math.max(8, Math.min(22, 8 + ratio * 18)) : 3.5;

            return (
              <g key={city}>
                {isActive && (
                  <circle cx={pos.x} cy={pos.y} r={r + 6} fill="hsl(243,75%,59%)" opacity="0.12" />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={isActive ? "hsl(243,75%,59%)" : "#94a3b8"}
                  stroke={isActive ? "white" : "#cbd5e1"}
                  strokeWidth="1.5"
                  opacity={isActive ? 1 : 0.45}
                />
                {isActive && (
                  <text
                    x={pos.x} y={pos.y + 0.5}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={count >= 100 ? "6" : "7.5"} fill="white" fontWeight="700"
                    fontFamily="Inter,sans-serif"
                  >{count}</text>
                )}
                <text
                  x={pos.x} y={pos.y - r - 4}
                  textAnchor="middle" fontSize="7.5"
                  fill={isActive ? "#1e293b" : "#94a3b8"}
                  fontWeight={isActive ? "600" : "400"}
                  fontFamily="Inter,sans-serif"
                >{city}</text>
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