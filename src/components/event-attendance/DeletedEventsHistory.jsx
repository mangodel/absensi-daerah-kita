import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Trash2 } from "lucide-react";

export default function DeletedEventsHistory() {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["audit-logs-delete-event"],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.filter({
        action_type: "DELETE_EVENT"
      }, "-performed_at");
      return logs;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>;
  }

  if (auditLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Trash2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Belum ada event yang dihapus</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {auditLogs.map(log => (
        <div key={log.id} className="bg-card border border-destructive/20 rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">{log.target_name}</p>
                <Badge variant="destructive" className="text-xs">Dihapus</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                ID: <span className="font-mono">{log.target_id}</span>
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {log.performed_at && format(new Date(log.performed_at), "dd MMM yyyy, HH:mm", { locale: id })}
            </div>
          </div>

          <div className="bg-secondary/30 rounded p-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Dihapus oleh:</span>
              <span className="font-semibold text-foreground">{log.performed_by_name || log.performed_by}</span>
            </div>
            {log.reason && (
              <div className="flex items-start gap-2 text-xs">
                <span className="font-medium text-muted-foreground flex-shrink-0">Alasan:</span>
                <span className="text-foreground">{log.reason}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}