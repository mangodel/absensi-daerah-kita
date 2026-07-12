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

function PengrusSection({ members, level }) {
  const style = LEVEL_STYLES[level];
  const sorted = [...members].sort(compareByDapukanHierarchy);

  const initials = (name) => (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{style.label}</p>
        <Badge variant="outline" className="text-[10px] ml-auto">{sorted.length}</Badge>
      </div>
      <div className="space-y-2">
        {sorted.map(m => (
          <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full overflow-hidden ring-1 ${style.ring || "ring-border"} bg-secondary flex items-center justify-center shrink-0`}>
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground">{initials(m.full_name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                {m.phone && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-2.5 h-2.5" /> {m.phone}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${style.badge}`}>
              {getDapukanTitle(m.dapukan, m.dapukan_level)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortalPengurusDisplay({ desa, kelompok }) {
  // Daerah-level officials — visible to all jamaah
  const { data: daerahMembers = [], isLoading: loadingDaerah } = useQuery({
    queryKey: ["pengurus", "daerah"],
    queryFn: () => base44.entities.Member.filter({ dapukan_level: "Daerah", status: "Aktif" }),
  });

  // Members in user's desa — for Desa & Kelompok level officials
  const { data: desaMembers = [], isLoading: loadingDesa } = useQuery({
    queryKey: ["pengurus", "desa", desa],
    queryFn: () => base44.entities.Member.filter({ desa, status: "Aktif" }),
    enabled: !!desa,
  });

  if (loadingDaerah || (!!desa && loadingDesa)) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isOfficial = m => m.dapukan && m.dapukan !== "Jamaah";

  const daerahOfficials = daerahMembers.filter(isOfficial);
  const desaOfficials = desaMembers.filter(m => m.dapukan_level === "Desa" && isOfficial(m));
  const kelompokOfficials = desaMembers.filter(m => m.dapukan_level === "Kelompok" && m.kelompok === kelompok && isOfficial(m));

  if (daerahOfficials.length === 0 && desaOfficials.length === 0 && kelompokOfficials.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">Belum ada data pengurus</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Daftar Pengurus
        </CardTitle>
        <p className="text-xs text-muted-foreground">Pengurus Daerah, Desa {desa || ""}, dan Kelompok {kelompok || ""}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {daerahOfficials.length > 0 && <PengrusSection members={daerahOfficials} level="Daerah" />}
        {desaOfficials.length > 0 && <PengrusSection members={desaOfficials} level="Desa" />}
        {kelompokOfficials.length > 0 && <PengrusSection members={kelompokOfficials} level="Kelompok" />}
      </CardContent>
    </Card>
  );
}