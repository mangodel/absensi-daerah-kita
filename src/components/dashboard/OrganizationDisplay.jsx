import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

function getMemberDetails(memberId, allMembers) {
  return allMembers.find(m => m.id === memberId) || null;
}

function getCategoryColor(category) {
  const colors = {
    "4_Serangkai": "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30",
    "Tim_7": "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30",
    "Tim_Lainnya": "bg-secondary/50 border-border"
  };
  return colors[category] || colors["Tim_Lainnya"];
}

function getCategoryLabel(category) {
  const labels = {
    "4_Serangkai": "Empat Serangkai",
    "Tim_7": "Tim 7",
    "Tim_Lainnya": "Tim Lainnya"
  };
  return labels[category] || category;
}

function TeamCard({ tim, members, allMembers }) {
  const timMembers = tim.member_ids?.map(id => getMemberDetails(id, allMembers)).filter(Boolean) || [];

  return (
    <div className={`rounded-lg border p-4 ${getCategoryColor(tim.tim_category)}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">{tim.tim_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{timMembers.length} anggota</p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {tim.tim_category === "4_Serangkai" ? "4S" : tim.tim_category === "Tim_7" ? "T7" : "Lain"}
        </Badge>
      </div>
      {timMembers.length > 0 && (
        <div className="space-y-1.5">
          {timMembers.map(member => (
            <div key={member.id} className="text-xs">
              <p className="font-medium text-foreground">{member.full_name}</p>
              <p className="text-muted-foreground">{member.dapukan || "Member"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrganizationDisplay({ level, desa, kelompok }) {
  const { data: timConfigs = [] } = useQuery({
    queryKey: ["timConfigs", level, desa, kelompok],
    queryFn: () => base44.entities.TimConfig.list(),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  // Filter tim configs berdasarkan level dan location
  const relevantTims = timConfigs.filter(t => {
    if (t.level !== level) return false;
    if (level === "Desa" && t.desa !== desa) return false;
    if (level === "Kelompok" && (t.desa !== desa || t.kelompok !== kelompok)) return false;
    return true;
  });

  // Pisahkan berdasarkan kategori
  const serangkai = relevantTims.filter(t => t.tim_category === "4_Serangkai");
  const tim7 = relevantTims.filter(t => t.tim_category === "Tim_7");

  // Jika tidak ada tim, jangan tampilkan
  if (serangkai.length === 0 && tim7.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Struktur Kepemimpinan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {serangkai.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Empat Serangkai</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {serangkai.map(tim => (
                <TeamCard key={tim.id} tim={tim} members={allMembers} allMembers={allMembers} />
              ))}
            </div>
          </div>
        )}

        {tim7.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">Tim 7</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tim7.map(tim => (
                <TeamCard key={tim.id} tim={tim} members={allMembers} allMembers={allMembers} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}