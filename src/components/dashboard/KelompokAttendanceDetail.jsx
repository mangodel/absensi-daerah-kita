import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { isAdult, isGenerus } from "@/lib/ageUtils";

export default function KelompokAttendanceDetail({ members, attendances, kelompok, month, year }) {
  const kelompokMembers = members.filter(
    m => m.kelompok === kelompok && m.status === "Aktif"
  );

  const filtered = attendances.filter(
    a => a.kelompok === kelompok && a.month === month && a.year === year
  );

  const memberStats = useMemo(() => {
    // Only show adults (18+) in attendance detail — generus excluded from attendance
    const dewasa = kelompokMembers.filter(m => isAdult(m));
    const sorted = [...dewasa];

    return sorted.map((m, i) => {
      const atts = filtered.filter(a => a.member_id === m.id);
      const hadir = atts.filter(a => a.status === "Hadir").length;
      const total = atts.length;
      const rate = total > 0 ? Math.round((hadir / total) * 100) : null;
      const generusFlag = isGenerus(m);
      return { ...m, hadir, total, rate, isGenerus: generusFlag, no: i + 1 };
    });
  }, [kelompokMembers, filtered]);

  const hadirTotal = memberStats.filter(m => m.hadir > 0).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{kelompokMembers.length} anggota</span>
        <span className="text-primary font-medium">
          {memberStats.length} Dewasa (18+) ·{" "}
          <span className="text-purple-600">{kelompokMembers.filter(m => isGenerus(m)).length} Generus</span>
        </span>
      </div>

      {memberStats.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Belum ada anggota aktif.</p>
      ) : (
        <div className="space-y-0.5 max-h-48 overflow-y-auto rounded-lg border border-border/50">
          {memberStats.map(m => (
            <div
              key={m.id}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs ${
                m.isGenerus ? "bg-purple-50 dark:bg-purple-950/20" : "bg-background"
              }`}
            >
                      <span className={`flex-1 truncate ${m.isGenerus ? "text-purple-700" : "text-foreground"}`}>
                {m.full_name}
              </span>
              {m.rate !== null ? (
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${
                    m.rate >= 75
                      ? "bg-accent/10 text-accent border-accent/20"
                      : m.rate >= 50
                      ? "bg-amber-50 text-amber-600 border-amber-200"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {m.hadir}/{m.total}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground shrink-0">—</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}