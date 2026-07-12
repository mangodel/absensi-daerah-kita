import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Phone } from "lucide-react";
import { getDapukanTitle, compareByDapukanHierarchy } from "@/lib/constants";

const LEVEL_STYLES = {
  Daerah: { label: "Pengurus Daerah", dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", ring: "ring-indigo-200" },
  Desa: { label: "Pengurus Desa", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", ring: "ring-emerald-200" },
  Kelompok: { label: "Pengurus Kelompok", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200", ring: "ring-amber-200" },
};

function PengurusPhotoCard({ member, levelStyle }) {
  const initials = (member.full_name || "?")
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border hover:shadow-sm transition-shadow">
      <div className={`w-16 h-16 rounded-full overflow-hidden ring-2 ${levelStyle.ring} bg-secondary flex items-center justify-center shrink-0`}>
        {member.photo_url ? (
          <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-muted-foreground">{initials}</span>
        )}
      </div>
      <div className="min-w-0 w-full">
        <p className="text-xs font-semibold text-foreground truncate">{member.full_name}</p>
        <Badge variant="outline" className={`text-[10px] mt-1 ${levelStyle.badge}`}>
          {getDapukanTitle(member.dapukan, member.dapukan_level)}
        </Badge>
        {member.phone && (
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Phone className="w-2.5 h-2.5" /> {member.phone}
          </p>
        )}
      </div>
    </div>
  );
}

function PengurusLevelSection({ members, level }) {
  const style = LEVEL_STYLES[level];
  const sorted = [...members].sort(compareByDapukanHierarchy);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{style.label}</p>
        <Badge variant="outline" className="text-[10px] ml-auto">{sorted.length}</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sorted.map(m => (
          <PengurusPhotoCard key={m.id} member={m} levelStyle={style} />
        ))}
      </div>
    </div>
  );
}

export default function PengurusStructureWithPhotos({ desa, kelompok, showLevels = ["Daerah", "Desa"] }) {
  const { data: daerahMembers = [], isLoading: loadingDaerah } = useQuery({
    queryKey: ["pengurus-photos", "daerah"],
    queryFn: () => base44.entities.Member.filter({ dapukan_level: "Daerah", status: "Aktif" }),
    enabled: showLevels.includes("Daerah"),
  });

  const { data: desaMembers = [], isLoading: loadingDesa } = useQuery({
    queryKey: ["pengurus-photos", "desa", desa],
    queryFn: () => base44.entities.Member.filter({ desa, status: "Aktif" }),
    enabled: showLevels.includes("Desa") && !!desa,
  });

  const { data: kelompokMembers = [], isLoading: loadingKelompok } = useQuery({
    queryKey: ["pengurus-photos", "kelompok", desa, kelompok],
    queryFn: () => base44.entities.Member.filter({ desa, kelompok, status: "Aktif" }),
    enabled: showLevels.includes("Kelompok") && !!desa && !!kelompok,
  });

  if (loadingDaerah || (showLevels.includes("Desa") && !!desa && loadingDesa) || (showLevels.includes("Kelompok") && !!desa && !!kelompok && loadingKelompok)) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isOfficial = m => m.dapukan && m.dapukan !== "Jamaah";

  const daerahOfficials = showLevels.includes("Daerah") ? daerahMembers.filter(isOfficial) : [];
  const desaOfficials = showLevels.includes("Desa") ? desaMembers.filter(m => m.dapukan_level === "Desa" && isOfficial(m)) : [];
  const kelompokOfficials = showLevels.includes("Kelompok") ? kelompokMembers.filter(m => m.dapukan_level === "Kelompok" && isOfficial(m)) : [];

  if (daerahOfficials.length === 0 && desaOfficials.length === 0 && kelompokOfficials.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Susunan Pengurus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {daerahOfficials.length > 0 && <PengurusLevelSection members={daerahOfficials} level="Daerah" />}
        {desaOfficials.length > 0 && <PengurusLevelSection members={desaOfficials} level="Desa" />}
        {kelompokOfficials.length > 0 && <PengurusLevelSection members={kelompokOfficials} level="Kelompok" />}
      </CardContent>
    </Card>
  );
}