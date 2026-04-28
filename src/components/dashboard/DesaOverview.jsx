import { DESA_KELOMPOK_MAP } from "@/lib/constants";
import { Users, CheckCircle, XCircle } from "lucide-react";

export default function DesaOverview({ members }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">Ringkasan Per Desa</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(DESA_KELOMPOK_MAP).map(([desa, kelompoks]) => {
          const desaMembers = members.filter(m => m.desa === desa);
          const active = desaMembers.filter(m => m.status === "Aktif").length;
          const inactive = desaMembers.filter(m => m.status === "Tidak Aktif").length;

          return (
            <div key={desa} className="p-4 rounded-xl bg-secondary/50 space-y-3">
              <h4 className="font-semibold text-foreground">{desa}</h4>
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
                  const count = desaMembers.filter(m => m.kelompok === k).length;
                  return (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-foreground">{count}</span>
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