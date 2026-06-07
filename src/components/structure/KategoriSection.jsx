import { Phone, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Kategori 4S configuration (reuse dari Structure)
const KATEGORI_4S = [
  {
    label: "Empat Serangkai (4S)",
    color: "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
    badgeClass: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/40",
    dapukan: ["Ki", "Wakil"],
    isKeimaman: true,
  },
  {
    label: "KU & PKU",
    color: "bg-accent/5 border-accent/20 dark:bg-accent/10 dark:border-accent/30",
    badgeClass: "bg-accent/10 text-accent border-accent/20 dark:bg-accent/20 dark:text-accent dark:border-accent/40",
    dapukan: ["KU", "PKU"],
  },
  {
    label: "Penerobos",
    color: "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-700",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
    dapukan: ["Penerobos"],
  },
  {
    label: "Aghnia",
    color: "bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-700",
    badgeClass: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700",
    dapukan: ["Aghnia"],
  },
  {
    label: "Mubaligh",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-700",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:border-violet-700",
    dapukan: ["Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok"],
    isMubaligh: true,
  },
];

const KNOWN_DAPUKAN = KATEGORI_4S.flatMap((k) => k.dapukan);

function getDapukanLabel(member) {
  const d = member.dapukan || "";
  const level = member.dapukan_level || "";
  if (!d || d === "Jamaah" || d === "Jamaah Biasa") return null;

  if (d === "Muballigh 4S") return "Mubaligh 4S";
  if (d === "Muballigh Daerah") return "Mubaligh Daerah";
  if (d === "Muballigh Desa") return "Mubaligh Desa";
  if (d === "Muballigh Kelompok") return "Mubaligh Kelompok";

  if (d === "Wakil") {
    if (level) return `Wakil Ki ${level}`;
    return "Wakil Ki";
  }

  if (level) return `${d} ${level}`;
  return d;
}

function KeimananSection({ members, isSuperAdmin, onMoveUp, onMoveDown, level }) {
  const ki = members.filter((m) => m.dapukan === "Ki");
  const wakil = members.filter((m) => m.dapukan !== "Ki").sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const renderMember = (m, idx, isWakil, totalWakil) => (
    <div key={m.id} className="px-3 py-2.5 rounded-xl border bg-white/70 dark:bg-slate-800/70 border-primary/20 dark:border-primary/40">
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm text-foreground">{m.full_name}</span>
            {isWakil && <span className="text-[9px] font-semibold text-primary/60 dark:text-primary/80">Wakil {idx + 1}{level ? ` - ${level}` : ""}</span>}
          </div>
          {getDapukanLabel(m) && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 mt-0.5 bg-primary/5 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/40">
              {getDapukanLabel(m)}
            </Badge>
          )}
          {m.phone && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Phone className="w-2.5 h-2.5" />
              {m.phone}
            </div>
          )}
        </div>
        {isSuperAdmin && isWakil && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              disabled={idx === 0}
              onClick={() => onMoveUp(m, wakil)}
              className="text-muted-foreground hover:text-primary disabled:opacity-20"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={idx === totalWakil - 1}
              onClick={() => onMoveDown(m, wakil)}
              className="text-muted-foreground hover:text-primary disabled:opacity-20"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30 px-3 py-2">
      <div className="text-[10px] font-semibold text-muted-foreground mb-2">Keimaman</div>
      <div className="flex flex-wrap gap-2">
        {ki.map((m) => renderMember(m, 0, false, 0))}
        {wakil.map((m, idx) => renderMember(m, idx, true, wakil.length))}
      </div>
    </div>
  );
}

function PengurusCard({ member, badgeClass }) {
  return (
    <div className="px-3 py-2.5 rounded-xl border bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-foreground">{member.full_name}</span>
          {getDapukanLabel(member) && (
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 mt-0.5 ${badgeClass}`}>
              {getDapukanLabel(member)}
            </Badge>
          )}
          {member.phone && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Phone className="w-2.5 h-2.5" />
              {member.phone}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function KategoriSection({ kategoriList, isSuperAdmin, onMoveUp, onMoveDown, level }) {
  if (kategoriList.length === 0) return null;

  return (
    <div className="space-y-3">
      {kategoriList.map((kat) => {
        if (kat.isKeimaman) {
          return <KeimananSection key="Keimaman" members={kat.members} isSuperAdmin={isSuperAdmin} onMoveUp={onMoveUp} onMoveDown={onMoveDown} level={level} />;
        }

        return (
          <div key={kat.label} className={`rounded-xl border ${kat.color} overflow-hidden`}>
            <div className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground dark:text-foreground">{kat.label}</span>
              <Badge variant="outline" className="text-[10px]">
                {kat.members.length}
              </Badge>
            </div>
            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {kat.members.map((m) => (
                <PengurusCard key={m.id} member={m} badgeClass={kat.badgeClass} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}