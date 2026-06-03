import { useAppConfig } from "@/lib/AppConfigContext";
import { Users, CheckCircle, XCircle, Home } from "lucide-react";

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
              <div className="space-y-1.5">
                {kelompoks.map(k => {
                  const kMembers = desaMembers.filter(m => m.kelompok === k);
                  const kKK = countKK(kMembers);
                  return (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground flex items-center gap-0.5">
                          <Home className="w-2.5 h-2.5" />{kKK} KK
                        </span>
                        <span className="font-medium text-foreground w-8 text-right">{kMembers.length}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}