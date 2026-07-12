import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { getDapukanTitle, compareByDapukanHierarchy } from "@/lib/constants";

function getCategoryColor(category) {
  const colors = {
    "4_Serangkai": "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30",
    "Tim_7": "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30",
    "Tim_Lainnya": "bg-secondary/50 border-border"
  };
  return colors[category] || colors["Tim_Lainnya"];
}

// Resolve members from TimConfig based on mode (manual/filter/hybrid)
function resolveTimMembers(tim, allMembers) {
  const mode = tim.mode || "hybrid";
  let candidates = [];

  // manual/hybrid: include explicitly named member_ids
  if ((mode === "manual" || mode === "hybrid") && tim.member_ids?.length) {
    candidates = tim.member_ids.map(id => allMembers.find(m => m.id === id)).filter(Boolean);
    if (mode === "manual") return candidates;
  }

  // filter/hybrid: apply filter_criteria
  if (mode === "filter" || mode === "hybrid") {
    let criteria = {};
    try { criteria = JSON.parse(tim.filter_criteria || "{}"); } catch (_) {}

    const scope = allMembers.filter(m => {
      if (tim.level === "Kelompok" && tim.desa && tim.kelompok)
        return m.desa === tim.desa && m.kelompok === tim.kelompok;
      if (tim.level === "Desa" && tim.desa)
        return m.desa === tim.desa;
      return m.dapukan_level === tim.level || (!m.dapukan_level && tim.level === "Kelompok");
    });

    const filtered = scope.filter(m => {
      const byDapukan = !criteria.dapukan?.length || criteria.dapukan.includes(m.dapukan);
      const byGender = !criteria.gender?.length || criteria.gender.includes(m.gender);
      const byStatus = !criteria.status?.length || criteria.status.includes(m.status);
      return byDapukan && byGender && byStatus;
    });

    // hybrid: merge, avoid duplicates
    const existingIds = new Set(candidates.map(m => m.id));
    filtered.forEach(m => { if (!existingIds.has(m.id)) candidates.push(m); });
  }

  // Exclude explicitly removed members
  const excluded = new Set(tim.excluded_member_ids || []);
  return candidates.filter(m => !excluded.has(m.id));
}

function TeamCard({ tim, allMembers }) {
  const timMembers = resolveTimMembers(tim, allMembers).sort(compareByDapukanHierarchy);

  const initials = (name) => (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className={`rounded-lg border p-4 ${getCategoryColor(tim.tim_category)}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">{tim.tim_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{timMembers.length} anggota</p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {tim.level}
        </Badge>
      </div>
      {timMembers.length > 0 ? (
        <div className="space-y-2">
          {timMembers.map(member => (
            <div key={member.id} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-border bg-secondary flex items-center justify-center shrink-0">
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-muted-foreground">{initials(member.full_name)}</span>
                )}
              </div>
              <div className="text-xs min-w-0">
                <p className="font-medium text-foreground truncate">{member.full_name}</p>
                <p className="text-muted-foreground truncate">
                  {getDapukanTitle(member.dapukan, member.dapukan_level)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Belum ada anggota</p>
      )}
    </div>
  );
}

export default function OrganizationDisplay({ level, desa, kelompok }) {
  const { data: timConfigs = [] } = useQuery({
    queryKey: ["timConfigs"],
    queryFn: () => base44.entities.TimConfig.list(),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  // Filter tim configs berdasarkan scope admin
  const relevantTims = timConfigs.filter(t => {
    if (!t.is_active && t.is_active !== undefined) return false;
    if (level === "Daerah") return t.level === "Daerah";
    if (level === "Desa") return t.level === "Daerah" || (t.level === "Desa" && t.desa === desa);
    if (level === "Kelompok") {
      return t.level === "Daerah"
        || (t.level === "Desa" && t.desa === desa)
        || (t.level === "Kelompok" && t.desa === desa && t.kelompok === kelompok);
    }
    return false;
  });

  const serangkai = relevantTims.filter(t => t.tim_category === "4_Serangkai");
  const tim7 = relevantTims.filter(t => t.tim_category === "Tim_7");
  const timLainnya = relevantTims.filter(t => t.tim_category === "Tim_Lainnya");

  if (serangkai.length === 0 && tim7.length === 0 && timLainnya.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Struktur Kepemimpinan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {serangkai.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Empat Serangkai</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {serangkai.map(tim => (
                <TeamCard key={tim.id} tim={tim} allMembers={allMembers} />
              ))}
            </div>
          </div>
        )}
        {tim7.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">Tim 7</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tim7.map(tim => (
                <TeamCard key={tim.id} tim={tim} allMembers={allMembers} />
              ))}
            </div>
          </div>
        )}
        {timLainnya.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tim Lainnya</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {timLainnya.map(tim => (
                <TeamCard key={tim.id} tim={tim} allMembers={allMembers} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}