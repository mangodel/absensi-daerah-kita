import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Users, LogIn } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function VolunteerLogViewer() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["volunteer-logs"],
    queryFn: () => base44.entities.AuditLog.filter({ action_type: "VOLUNTEER_LOGIN" }, "-performed_at", 100),
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Memuat log...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        Belum ada log volunteer
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <LogIn className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Log Aktivitas Volunteer ({logs.length})</h3>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {logs.map((log, i) => (
            <div key={log.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.target_name}</p>
                <p className="text-xs text-muted-foreground">
                  {log.kelompok_asal || "-"}
                  {log.daerah_asal ? ` · ${log.daerah_asal}` : ""}
                  {log.performed_by && log.performed_by !== "-" ? ` · ${log.performed_by}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">
                  {log.performed_at ? format(new Date(log.performed_at), "dd MMM yyyy", { locale: id }) : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {log.performed_at ? format(new Date(log.performed_at), "HH:mm") : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}