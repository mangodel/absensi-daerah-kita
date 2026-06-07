import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bell, Mail, Users, Clock, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import BroadcastDialog from "@/components/broadcast/BroadcastDialog";
import { useUserRole } from "@/lib/useUserRole";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Broadcast() {
  const { canManageMembers } = useUserRole();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: () => base44.entities.Broadcast.list("-sent_at"),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const handleDelete = async () => {
    if (!deleteItem) return;
    await base44.entities.Broadcast.delete(deleteItem.id);
    queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    setDeleteItem(null);
  };

  const channelIcon = (ch) => ch === "Email"
    ? <Mail className="w-3.5 h-3.5" />
    : <Bell className="w-3.5 h-3.5" />;

  const scopeLabel = (b) => {
    if (b.target_scope === "Desa") return `Desa ${b.target_desa}`;
    if (b.target_scope === "Kelompok") return `Kel. ${b.target_kelompok}`;
    return "Semua Jamaah";
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Broadcast Pesan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kirim informasi penting kepada jamaah secara cepat</p>
        </div>
        {canManageMembers && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Buat Broadcast
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Broadcast</p>
          <p className="text-2xl font-bold text-foreground">{broadcasts.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Via Email</p>
          <p className="text-2xl font-bold text-primary">{broadcasts.filter(b => b.channel === "Email").length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Via Portal</p>
          <p className="text-2xl font-bold text-accent">{broadcasts.filter(b => b.channel === "Portal").length}</p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada broadcast</p>
          <p className="text-sm mt-1">Klik "Buat Broadcast" untuk mengirim pesan pertama</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map(b => (
            <div key={b.id} className="bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{b.title}</span>
                    <Badge variant="outline" className="text-[11px] gap-1 shrink-0">
                      {channelIcon(b.channel)} {b.channel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{b.message}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {scopeLabel(b)} · {b.recipient_count || 0} penerima
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {b.sent_at ? format(new Date(b.sent_at), "dd MMM yyyy, HH:mm", { locale: idLocale }) : "-"}
                    </span>
                    {b.sent_by_name && (
                      <span className="text-muted-foreground/70">oleh {b.sent_by_name}</span>
                    )}
                  </div>
                </div>
                {canManageMembers && (
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setDeleteItem(b)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BroadcastDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={allMembers}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["broadcasts"] })}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Riwayat Broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              Riwayat broadcast "{deleteItem?.title}" akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}