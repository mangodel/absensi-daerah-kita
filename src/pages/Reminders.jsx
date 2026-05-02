import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Bell, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { id } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

const PRIORITY_CONFIG = {
  Tinggi: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  Sedang: { color: "bg-orange-50 text-orange-600 border-orange-200", icon: Clock },
  Rendah: { color: "bg-secondary text-muted-foreground border-border", icon: Bell },
};

const empty = { title: "", message: "", due_date: "", scope: "Daerah", desa: "", kelompok: "", priority: "Sedang", status: "Aktif" };

export default function Reminders() {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(empty);
  const [filterStatus, setFilterStatus] = useState("Aktif");

  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};
  const { isSuperAdmin, isAdminDesa, userDesa } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => base44.entities.Reminder.list("-due_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Reminder.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); closeForm(); toast({ title: "Pengingat ditambahkan!" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reminder.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); closeForm(); toast({ title: "Pengingat diperbarui!" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Reminder.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); setDeleteItem(null); },
  });

  const closeForm = () => { setFormOpen(false); setEditItem(null); setForm(empty); };

  const handleEdit = (r) => { setEditItem(r); setForm({ ...empty, ...r }); setFormOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  const markDone = (r) => updateMutation.mutate({ id: r.id, data: { ...r, status: "Selesai" } });

  const kelompokOptions = form.desa ? desaKelompokMap[form.desa] || [] : [];

  const filtered = reminders.filter(r => filterStatus === "all" || r.status === filterStatus);

  // Due-date urgency label
  const getDueLabel = (due_date) => {
    if (!due_date) return null;
    const d = new Date(due_date);
    if (isPast(d) && !isToday(d)) return { label: "Terlambat", cls: "bg-destructive/10 text-destructive" };
    if (isToday(d)) return { label: "Hari Ini!", cls: "bg-orange-50 text-orange-600" };
    const diff = differenceInDays(d, new Date());
    if (diff <= 3) return { label: `${diff} hari lagi`, cls: "bg-orange-50 text-orange-600" };
    return { label: `${diff} hari lagi`, cls: "bg-secondary text-muted-foreground" };
  };

  const canManage = isSuperAdmin || isAdminDesa;

  // Aktif reminders that are urgent (for banner)
  const urgentCount = reminders.filter(r => r.status === "Aktif" && r.due_date && (isPast(new Date(r.due_date)) || isToday(new Date(r.due_date)))).length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Pengingat
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{reminders.filter(r => r.status === "Aktif").length} pengingat aktif</p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-2" /> Tambah Pengingat</Button>
        )}
      </div>

      {urgentCount > 0 && (
        <div className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">{urgentCount} pengingat jatuh tempo hari ini atau sudah terlambat!</p>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["Aktif", "Selesai", "all"].map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)}>
            {s === "all" ? "Semua" : s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Belum ada pengingat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const pCfg = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.Sedang;
            const PIcon = pCfg.icon;
            const due = getDueLabel(r.due_date);
            return (
              <div key={r.id} className={`bg-card border border-border rounded-2xl p-4 flex gap-3 ${r.status === "Selesai" ? "opacity-60" : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pCfg.color}`}>
                  <PIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${r.status === "Selesai" ? "line-through text-muted-foreground" : ""}`}>{r.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${pCfg.color}`}>{r.priority}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${r.status === "Selesai" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>{r.status}</Badge>
                    </div>
                  </div>
                  {r.message && <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {r.due_date && (
                      <span className="text-xs text-muted-foreground">
                        📅 {format(new Date(r.due_date), "dd MMM yyyy", { locale: id })}
                      </span>
                    )}
                    {due && <Badge variant="outline" className={`text-[10px] ${due.cls}`}>{due.label}</Badge>}
                    <Badge variant="outline" className="text-[10px] bg-secondary text-muted-foreground">{r.scope}{r.desa ? ` · ${r.desa}` : ""}{r.kelompok ? ` / ${r.kelompok}` : ""}</Badge>
                  </div>
                </div>
                {canManage && r.status === "Aktif" && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-accent" onClick={() => markDone(r)} title="Tandai Selesai">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}>
                      <Bell className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteItem(r)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Pengingat" : "Tambah Pengingat"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Judul *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="cth: Laporan bulan ini" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Pesan</Label>
              <Input value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Deskripsi singkat..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tanggal Jatuh Tempo *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prioritas</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Tinggi", "Sedang", "Rendah"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Scope</Label>
              <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v, desa: "", kelompok: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daerah">Daerah (semua)</SelectItem>
                  <SelectItem value="Desa">Desa tertentu</SelectItem>
                  <SelectItem value="Kelompok">Kelompok tertentu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.scope === "Desa" || form.scope === "Kelompok") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Desa</Label>
                <Select value={form.desa} onValueChange={v => setForm({ ...form, desa: v, kelompok: "" })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
                  <SelectContent>{desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.scope === "Kelompok" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kelompok</Label>
                <Select value={form.kelompok} onValueChange={v => setForm({ ...form, kelompok: v })} disabled={!form.desa}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelompok" /></SelectTrigger>
                  <SelectContent>{kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengingat?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deleteItem.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}