import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Download, QrCode, CheckCircle, XCircle, Pencil, Users, Trash2 } from "lucide-react";
import QRCodeDisplay from "@/components/event-attendance/QRCodeDisplay";
import MemberImport from "@/components/event-attendance/MemberImport";
import ParticipantBulkManager from "@/components/event-attendance/ParticipantBulkManager";
import { useToast } from "@/components/ui/use-toast";

function generateParticipantId(existing) {
  const maxNum = existing.reduce((max, p) => {
    const num = parseInt((p.participant_id || "AUNZ000000").replace("AUNZ", ""), 10);
    return num > max ? num : max;
  }, 0);
  return `AUNZ${String(maxNum + 1).padStart(6, "0")}`;
}

const empty = { full_name: "", phone: "", email: "", organization: "", notes: "" };

export default function ParticipantRegistration({ eventId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [qrView, setQrView] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventId
      ? base44.entities.EventParticipant.filter({ event_id: eventId }, "-created_date")
      : [],
    enabled: !!eventId,
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.EventParticipant.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-participants", eventId] }); setOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventParticipant.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-participants", eventId] }); setOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.EventParticipant.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-participants", eventId] }); toast({ description: "Peserta dihapus." }); },
  });

  const handleOpen = (p = null) => {
    setEditing(p);
    setForm(p ? { full_name: p.full_name, phone: p.phone || "", email: p.email || "", organization: p.organization || "", notes: p.notes || "" } : empty);
    setOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form });
    } else {
      // Check if participant exists in Member database
      const matchedMember = members.find(m => 
        m.full_name?.toLowerCase() === form.full_name.toLowerCase()
      );
      
      const pid = matchedMember ? matchedMember.member_id : generateParticipantId(participants);
      createMut.mutate({
        ...form,
        event_id: eventId,
        participant_id: pid,
        qr_code_value: pid,
        registration_date: new Date().toISOString(),
        attendance_status: "Absent",
        is_database_member: !!matchedMember,
      });
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = participants.filter(p =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) || p.participant_id?.includes(search)
  );

  const exportCSV = () => {
    const rows = [
      ["Participant ID", "Nama", "Telepon", "Email", "Organisasi", "Status"],
      ...filtered.map(p => [p.participant_id, p.full_name, p.phone, p.email, p.organization, p.attendance_status])
    ];
    const csv = rows.map(r => r.map(c => `"${c || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "peserta.csv"; a.click();
  };

  if (!eventId) return (
    <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
      <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>Pilih event aktif terlebih dahulu</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stat Card: Registered Participants at Top */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{participants.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Peserta Terdaftar</p>
        </div>
        <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-accent">{participants.filter(p => p.attendance_status === "Present").length}</p>
          <p className="text-xs text-muted-foreground mt-1">Hadir</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-3xl font-bold text-orange-600">{participants.filter(p => p.attendance_status === "Absent").length}</p>
          <p className="text-xs text-muted-foreground mt-1">Belum Hadir</p>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="list"><QrCode className="w-4 h-4 mr-1" /> Daftar Peserta</TabsTrigger>
          <TabsTrigger value="import"><Users className="w-4 h-4 mr-1" /> Import dari Database</TabsTrigger>
        </TabsList>

        {/* ===== LIST TAB ===== */}
        <TabsContent value="list" className="space-y-3 mt-3">
          <ParticipantBulkManager eventId={eventId} />
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari nama, telepon, ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleOpen()}>
                <Plus className="w-4 h-4 mr-1" /> Manual
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground px-1">{participants.length} peserta terdaftar · {participants.filter(p => p.attendance_status === "Present").length} hadir</div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">ID</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Nama</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Organisasi/Kelompok</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Tipe</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">QR</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.participant_id}</td>
                      <td className="px-4 py-3 font-medium text-sm">{p.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">{p.organization || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {members.some(m => m.member_id === p.participant_id) ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                            Jamaah
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-full font-medium">
                            Eksternal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.attendance_status === "Present" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Hadir
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="w-3.5 h-3.5" /> Absen
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQrView(p)}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </td>
                      <td className="px-4 py-3 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpen(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Hapus ${p.full_name} dari peserta?`)) {
                              deleteMut.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Belum ada peserta terdaftar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ===== IMPORT TAB ===== */}
        <TabsContent value="import" className="mt-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-sm">Import Jamaah dari Database</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Filter berdasarkan desa, kelompok, atau dapukan, lalu pilih jamaah yang akan didaftarkan sebagai peserta.</p>
            </div>
            <MemberImport
              eventId={eventId}
              participants={participants}
              onImported={(count) => {
                toast({ description: `${count} peserta berhasil diimport.` });
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Peserta" : "Tambah Peserta Manual"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nama Lengkap *</Label>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">No. Telepon</Label>
              <Input inputMode="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+62 8xx..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@domain.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Organisasi/Kelompok</Label>
              <Input value={form.organization} onChange={e => set("organization", e.target.value)} placeholder="Nama kelompok..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={!form.full_name}>
                {editing ? "Simpan" : "Daftarkan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR View Dialog */}
      {qrView && (
        <Dialog open={!!qrView} onOpenChange={() => setQrView(null)}>
          <DialogContent className="max-w-xs text-center">
            <DialogHeader>
              <DialogTitle>QR Code Peserta</DialogTitle>
            </DialogHeader>
            <p className="font-semibold text-lg">{qrView.full_name}</p>
            <p className="text-sm text-muted-foreground font-mono">{qrView.participant_id}</p>
            <QRCodeDisplay value={qrView.qr_code_value || qrView.participant_id} size={220} />
            <Button variant="outline" onClick={() => {
              const canvas = document.querySelector("#qr-canvas");
              if (canvas) {
                const a = document.createElement("a");
                a.href = canvas.toDataURL();
                a.download = `QR-${qrView.participant_id}.png`;
                a.click();
              }
            }}>
              <Download className="w-4 h-4 mr-2" /> Download QR
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}