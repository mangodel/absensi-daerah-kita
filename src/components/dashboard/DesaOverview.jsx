import { useAppConfig } from "@/lib/AppConfigContext";
import { Users, CheckCircle, XCircle, Home } from "lucide-react";

const currentYear = new Date().getFullYear();
const GENERUS_CATS = [
  { key: "balita",    label: "Balita",     color: "#f9a8d4", minAge: 0,  maxAge: 4  },
  { key: "paud",      label: "PAUD",       color: "#fdba74", minAge: 5,  maxAge: 6  },
  { key: "caberawit", label: "Caberawit",  color: "#fde047", minAge: 7,  maxAge: 12 },
  { key: "praremaja", label: "Pra-Remaja", color: "#86efac", minAge: 13, maxAge: 15 },
  { key: "remaja",    label: "Remaja",     color: "#93c5fd", minAge: 16, maxAge: 18 },
  { key: "pranikah",  label: "Pra-Nikah",  color: "#c4b5fd", minAge: 19, maxAge: 24 },
];

function GenerusMiniChart({ memberList }) {
  const active = memberList.filter(m => m.birth_year && m.status === "Aktif");
  const counts = GENERUS_CATS.map(c => ({
    ...c,
    count: active.filter(m => {
      const age = currentYear - m.birth_year;
      return age >= c.minAge && age <= c.maxAge;
    }).length,
  }));
  const total = counts.reduce((s, c) => s + c.count, 0);
  if (total === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Generus ({total})</p>
      {/* Bar chart */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px bg-secondary">
        {counts.map(c => c.count > 0 && (
          <div
            key={c.key}
            style={{ width: `${(c.count / total) * 100}%`, backgroundColor: c.color }}
            title={`${c.label}: ${c.count}`}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {counts.filter(c => c.count > 0).map(c => (
          <span key={c.key} className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: c.color }} />
            {c.label} <strong className="text-foreground">{c.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function countKK(memberList) {
  // Setiap family_group unik = 1 KK; anggota tanpa family_group masing-masing = 1 KK
  const groups = new Set();
  let noGroupCount = 0;
  memberList.forEach(m => {
    if (m.family_group && m.family_group.trim()) {
      groups.add(m.family_group.trim());
    } else {
      noGroupCount++;
    }
  });
  return groups.size + noGroupCount;
}

export default function DesaOverview({ members }) {
  const { config } = useAppConfig();
  const desaKelompokMap = config.desa_kelompok_map || {};

  const totalKK = countKK(members);

  return (
    <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ringkasan Per Desa</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-1">
          <Home className="w-3.5 h-3.5" />
          <span>Total KK Daerah: <strong className="text-foreground">{totalKK}</strong></span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(desaKelompokMap).map(([desa, kelompoks]) => {
          const desaMembers = members.filter(m => m.desa === desa);
          const active = desaMembers.filter(m => m.status === "Aktif").length;
          const inactive = desaMembers.filter(m => m.status === "Tidak Aktif").length;
          const desaKK = countKK(desaMembers);

          return (
            <div key={desa} className="p-4 rounded-xl bg-secondary/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">{desa}</h4>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Home className="w-3 h-3" />{desaKK} KK
                </span>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{desaMembers.length} anggota</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-accent" />
                  <span className="text-accent font-medium">{active} aktif</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-destructive font-medium">{inactive} tidak aktif</span>
                </div>
              </div>
              <div className="space-y-2">
                {kelompoks.map(k => {
                  const kMembers = desaMembers.filter(m => m.kelompok === k && m.status === "Aktif");
                  const kKK = countKK(kMembers);
                  const thisYear = new Date().getFullYear();
                  const dewasa = kMembers.filter(m => !m.birth_year || (thisYear - m.birth_year) >= 22);
                  const generus = kMembers.filter(m => m.birth_year && (thisYear - m.birth_year) < 22);
                  const sortedKMembers = [...dewasa, ...generus];
                  return (
                    <div key={k} className="text-xs space-y-1.5 bg-card/60 rounded-lg p-2 border border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{k}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <Home className="w-2.5 h-2.5" />{kKK} KK
                          </span>
                          <span className="font-semibold text-foreground">{kMembers.length}</span>
                        </div>
                      </div>
                      {/* Ringkasan dewasa & generus dengan nomor */}
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span className="text-primary font-medium">Dewasa: {dewasa.length}</span>
                        <span className="text-purple-600 font-medium">Generus: {generus.length}</span>
                      </div>
                      {sortedKMembers.length > 0 && (
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                          {sortedKMembers.map((m, i) => {
                            const age = m.birth_year ? (new Date().getFullYear() - m.birth_year) : null;
                            const isGenerus = age !== null && age < 22;
                            return (
                              <div key={m.id} className="flex items-center gap-1.5">
                                <span className="w-4 text-[9px] text-muted-foreground text-right shrink-0">{i + 1}.</span>
                                <span className={isGenerus ? "text-purple-600" : "text-foreground"}>{m.full_name}</span>
                                {isGenerus && <span className="text-[9px] text-purple-400">(Generus)</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <GenerusMiniChart memberList={kMembers} />
                    </div>
                  );
                })}
              </div>
              <GenerusMiniChart memberList={desaMembers} />
            </div>
          );
        })}
      </div>
    </div>
  );
}