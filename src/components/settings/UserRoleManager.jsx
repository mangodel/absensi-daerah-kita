import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ROLE_OPTIONS = [
  { value: "user", label: "User Biasa", color: "bg-secondary text-secondary-foreground" },
  { value: "admin_kelompok", label: "Admin Kelompok", color: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: "admin_desa", label: "Admin Desa", color: "bg-accent/10 text-accent border-accent/20" },
  { value: "super_admin", label: "Super Admin", color: "bg-primary/10 text-primary border-primary/20" },
];

export default function UserRoleManager() {
  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ role: "user", desa: "", kelompok: "" });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users_list"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_list"] });
      setEditingId(null);
      toast({ title: "Role pengguna diperbarui!" });
    },
  });

  const handleEdit = (u) => {
    setEditingId(u.id);
    setEditForm({ role: u.role || "user", desa: u.desa || "", kelompok: u.kelompok || "" });
  };

  const handleSave = (id) => {
    const data = { role: editForm.role, desa: editForm.desa, kelompok: editForm.kelompok };
    updateMutation.mutate({ id, data });
  };

  const getRoleStyle = (role) => ROLE_OPTIONS.find(r => r.value === role)?.color || "bg-secondary text-secondary-foreground";
  const getRoleLabel = (role) => ROLE_OPTIONS.find(r => r.value === role)?.label || role || "User Biasa";

  const kelompokOptions = editForm.desa ? desaKelompokMap[editForm.desa] || [] : [];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Manajemen Akses Pengguna</h2>
        </div>
        <p className="text-xs text-muted-foreground">Atur role dan scope akses tiap pengguna. Admin Desa hanya bisa melihat data desanya, Admin Kelompok hanya kelompoknya.</p>

        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="border border-border rounded-xl p-4">
              {editingId === u.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{u.full_name || u.email}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium">Role</label>
                      <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v, desa: "", kelompok: "" }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {(editForm.role === "admin_desa" || editForm.role === "admin_kelompok") && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">Desa</label>
                        <Select value={editForm.desa} onValueChange={v => setEditForm(f => ({ ...f, desa: v, kelompok: "" }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
                          <SelectContent>
                            {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {editForm.role === "admin_kelompok" && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">Kelompok</label>
                        <Select value={editForm.kelompok} onValueChange={v => setEditForm(f => ({ ...f, kelompok: v }))} disabled={!editForm.desa}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih Kelompok" /></SelectTrigger>
                          <SelectContent>
                            {kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleSave(u.id)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                      Simpan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Batal</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {(u.desa || u.kelompok) && (
                        <p className="text-xs text-muted-foreground">{u.desa}{u.kelompok ? ` / ${u.kelompok}` : ""}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${getRoleStyle(u.role)}`}>{getRoleLabel(u.role)}</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(u)}>Edit</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada pengguna terdaftar.</p>
          )}
        </div>
      </div>
    </div>
  );
}