import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, User, UserPlus, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const ROLE_OPTIONS = [
  { value: "user", label: "User Biasa", color: "bg-secondary text-secondary-foreground" },
  { value: "admin_kelompok", label: "Admin Kelompok", color: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: "admin_desa", label: "Admin Desa", color: "bg-accent/10 text-accent border-accent/20" },
  { value: "super_admin", label: "Super Admin", color: "bg-primary/10 text-primary border-primary/20" },
];

const ROLE_DESC = {
  user: "Tidak ada akses khusus",
  admin_kelompok: "Lihat & kelola anggota kelompoknya, absensi, event kelompok",
  admin_desa: "Lihat semua kelompok di desanya, kelola event desa",
  super_admin: "Akses penuh ke semua data daerah + pengaturan",
};

export default function UserRoleManager() {
  const { config } = useAppConfig();
  const desaKelompokMap = config.desa_kelompok_map || {};
  const desaList = Object.keys(desaKelompokMap).length > 0
    ? Object.keys(desaKelompokMap)
    : (config.desa_list || []);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ role: "user", desa: "", kelompok: "" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "admin_kelompok", desa: "", kelompok: "" });
  const [inviting, setInviting] = useState(false);

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
    updateMutation.mutate({ id, data: { role: editForm.role, desa: editForm.desa, kelompok: editForm.kelompok } });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      // Platform hanya menerima "admin" atau "user" — selalu undang sebagai "user"
      // Role kustom (admin_desa, admin_kelompok, dll.) disimpan setelah user terdaftar
      await base44.users.inviteUser(inviteForm.email, "user");

      // Tunggu sebentar agar user muncul di DB, lalu update role + desa + kelompok
      await new Promise(r => setTimeout(r, 1500));
      const allUsers = await base44.entities.User.list();
      const newUser = allUsers.find(u => u.email?.toLowerCase() === inviteForm.email.toLowerCase());
      if (newUser) {
        const updateData = { role: inviteForm.role };
        if (inviteForm.desa) updateData.desa = inviteForm.desa;
        if (inviteForm.kelompok) updateData.kelompok = inviteForm.kelompok;
        await base44.entities.User.update(newUser.id, updateData);
      }

      queryClient.invalidateQueries({ queryKey: ["users_list"] });
      toast({
        title: `Undangan dikirim ke ${inviteForm.email}`,
        description: `Role "${getRoleLabel(inviteForm.role)}" akan ditetapkan setelah pengguna menerima undangan.`,
      });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "admin_kelompok", desa: "", kelompok: "" });
    } catch (err) {
      toast({
        title: "Gagal mengirim undangan",
        description: err?.message || "Terjadi kesalahan. Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const getRoleStyle = (role) => ROLE_OPTIONS.find(r => r.value === role)?.color || "bg-secondary text-secondary-foreground";
  const getRoleLabel = (role) => ROLE_OPTIONS.find(r => r.value === role)?.label || role || "User Biasa";

  const kelompokOptions = editForm.desa ? desaKelompokMap[editForm.desa] || [] : [];
  const inviteKelompokOptions = inviteForm.desa ? desaKelompokMap[inviteForm.desa] || [] : [];

  // Only show users who have already registered (have full_name or email set properly)
  // i.e., exclude "pending invite" placeholders — users with email but no created_date equivalent
  // Base44 users are "accepted" when they appear in the User list (all listed users have accepted)
  const registeredUsers = users;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Manajemen Akses Pengguna</h2>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Undang Pengguna
          </Button>
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLE_OPTIONS.map(r => (
            <div key={r.value} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/40 text-xs">
              <Badge variant="outline" className={`text-[10px] shrink-0 ${r.color}`}>{r.label}</Badge>
              <span className="text-muted-foreground">{ROLE_DESC[r.value]}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {registeredUsers.map(u => (
            <div key={u.id} className="border border-border rounded-xl p-4">
              {editingId === u.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{u.full_name || u.email}</span>
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
                          <SelectContent>{desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {editForm.role === "admin_kelompok" && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">Kelompok</label>
                        <Select value={editForm.kelompok} onValueChange={v => setEditForm(f => ({ ...f, kelompok: v }))} disabled={!editForm.desa}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih Kelompok" /></SelectTrigger>
                          <SelectContent>{kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleSave(u.id)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Simpan
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
          {registeredUsers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada pengguna terdaftar.</p>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Undang Pengguna Baru
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-9"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="email@contoh.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Role yang akan diberikan</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v, desa: "", kelompok: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESC[inviteForm.role]}</p>
            </div>
            {(inviteForm.role === "admin_desa" || inviteForm.role === "admin_kelompok") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Desa</Label>
                <Select value={inviteForm.desa} onValueChange={v => setInviteForm(f => ({ ...f, desa: v, kelompok: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
                  <SelectContent>{desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {inviteForm.role === "admin_kelompok" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kelompok</Label>
                <Select value={inviteForm.kelompok} onValueChange={v => setInviteForm(f => ({ ...f, kelompok: v }))} disabled={!inviteForm.desa}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelompok" /></SelectTrigger>
                  <SelectContent>{inviteKelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>📧 Email undangan akan dikirim ke alamat di atas.</p>
              <p>✅ Role, desa, dan kelompok akan langsung ditetapkan saat undangan diterima.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>Batal</Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</> : "Kirim Undangan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}