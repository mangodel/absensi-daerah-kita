import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Check, Filter, Search, X, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ParticipantBulkManager({ eventId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [filterDapukans, setFilterDapukans] = useState([]); // multi-select
  const [searchAdd, setSearchAdd] = useState("");
  const [searchManage, setSearchManage] = useState("");

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

  const { data: appConfig = {} } = useQuery({
    queryKey: ["app-config"],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.list();
      const obj = {};
      configs.forEach(c => {
        try { obj[c.key] = c.value.startsWith('{') || c.value.startsWith('[') ? JSON.parse(c.value) : c.value; }
        catch { obj[c.key] = c.value; }
      });
      return obj;
    },
  });

  const createMut = useMutation({
    mutationFn: async (membersToAdd) => {
      const existingIds = new Set(participants.map(p => p.participant_id));
      const newParticipants = membersToAdd
        .filter(m => !existingIds.has(m.member_id))
        .map(m => ({
          event_id: eventId,
          full_name: m.full_name,
          phone: m.phone,
          email: m.email,
          organization: m.dapukan,
          participant_id: m.member_id,
          qr_code_value: m.member_id,
          registration_date: new Date().toISOString(),
          attendance_status: "Absent",
        }));
      if (newParticipants.length > 0) {
        await base44.entities.EventParticipant.bulkCreate(newParticipants);
      }
      return newParticipants.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
      toast({ description: `${count} peserta berhasil ditambahkan.` });
      setShowAddDialog(false);
      setSelectedMembers(new Set());
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (participantDbIds) => {
      await Promise.all(participantDbIds.map(id => base44.entities.EventParticipant.delete(id)));
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
      toast({ description: `${ids.length} peserta dihapus.` });
      setSelectedParticipants(new Set());
    },
  });

  const desaList = appConfig.desa_list || [];
  const kelompokList = appConfig.kelompok_list || [];
  const dapukanList = appConfig.dapukan_list || [];

  const filteredMembers = members.filter(m => {
    if (m.status !== "Aktif") return false;
    if (filterDesa !== "all" && m.desa !== filterDesa) return false;
    if (filterKelompok !== "all" && m.kelompok !== filterKelompok) return false;
    if (filterDapukans.length > 0 && !filterDapukans.includes(m.dapukan)) return false;
    if (searchAdd && !m.full_name?.toLowerCase().includes(searchAdd.toLowerCase())) return false;
    return !participants.some(p => p.participant_id === m.member_id);
  });

  const filteredParticipants = participants.filter(p =>
    !searchManage || p.full_name?.toLowerCase().includes(searchManage.toLowerCase())
  );

  const toggleDapukan = (d) => {
    setFilterDapukans(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSelectAll = (checked) => {
    setSelectedMembers(checked ? new Set(filteredMembers.map(m => m.id)) : new Set());
  };

  const handleSelectAllParticipants = (checked) => {
    setSelectedParticipants(checked ? new Set(filteredParticipants.map(p => p.id)) : new Set());
  };

  const handleAddMembers = () => {
    const membersToAdd = filteredMembers.filter(m => selectedMembers.has(m.id));
    if (membersToAdd.length === 0) {
      toast({ description: "Pilih minimal 1 jamaah", variant: "destructive" });
      return;
    }
    createMut.mutate(membersToAdd);
  };

  const handleDeleteSelected = () => {
    if (selectedParticipants.size === 0) return;
    if (confirm(`Hapus ${selectedParticipants.size} peserta dari daftar?`)) {
      deleteMut.mutate([...selectedParticipants]);
    }
  };

  if (!eventId) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {/* Tambah Peserta (bulk) */}
      <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="gap-1">
        <Plus className="w-3.5 h-3.5" /> Tambah dari Database
      </Button>
      {/* Kelola / Hapus Peserta */}
      <Button size="sm" variant="outline" onClick={() => setShowManageDialog(true)} className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5">
        <Trash2 className="w-3.5 h-3.5" /> Kelola Peserta ({participants.length})
      </Button>

      {/* === Dialog Tambah === */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tambah Jamaah sebagai Peserta</DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 text-sm" placeholder="Cari nama..." value={searchAdd} onChange={e => setSearchAdd(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Desa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Desa</SelectItem>
                  {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKelompok} onValueChange={setFilterKelompok}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Kelompok" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelompok</SelectItem>
                  {kelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Multi-select dapukan chips */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Dapukan (pilih beberapa)</p>
              <div className="flex flex-wrap gap-1.5">
                {dapukanList.map(d => (
                  <button
                    key={d}
                    onClick={() => toggleDapukan(d)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      filterDapukans.includes(d)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
                {filterDapukans.length > 0 && (
                  <button onClick={() => setFilterDapukans([])} className="px-2 py-1 rounded-full text-xs border border-destructive/30 text-destructive hover:bg-destructive/5">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Select all */}
          <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg shrink-0">
            <Checkbox
              checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm font-medium flex-1 cursor-pointer">
              Pilih Semua ({filteredMembers.length} tersedia)
            </label>
            {selectedMembers.size > 0 && <Badge variant="outline">{selectedMembers.size} dipilih</Badge>}
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada jamaah sesuai filter</p>
            ) : (
              filteredMembers.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 bg-card border border-border rounded-lg hover:bg-secondary/20 cursor-pointer"
                  onClick={() => {
                    const s = new Set(selectedMembers);
                    s.has(m.id) ? s.delete(m.id) : s.add(m.id);
                    setSelectedMembers(s);
                  }}
                >
                  <Checkbox checked={selectedMembers.has(m.id)} onCheckedChange={() => {}} onClick={e => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.desa}{m.kelompok ? ` / ${m.kelompok}` : ""} · {m.dapukan || "-"}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddMembers} disabled={selectedMembers.size === 0 || createMut.isPending}>
              <Check className="w-4 h-4 mr-2" /> Tambahkan ({selectedMembers.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog Kelola/Hapus === */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Kelola Peserta Terdaftar</DialogTitle>
          </DialogHeader>

          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 text-sm" placeholder="Cari nama..." value={searchManage} onChange={e => setSearchManage(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg shrink-0">
            <Checkbox
              checked={selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0}
              onCheckedChange={handleSelectAllParticipants}
            />
            <label className="text-sm font-medium flex-1">Pilih Semua ({filteredParticipants.length})</label>
            {selectedParticipants.size > 0 && (
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={deleteMut.isPending} className="h-7 text-xs">
                <Trash2 className="w-3 h-3 mr-1" /> Hapus ({selectedParticipants.size})
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {filteredParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada peserta terdaftar.</p>
            ) : (
              filteredParticipants.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 bg-card border border-border rounded-lg hover:bg-secondary/20 cursor-pointer"
                  onClick={() => {
                    const s = new Set(selectedParticipants);
                    s.has(p.id) ? s.delete(p.id) : s.add(p.id);
                    setSelectedParticipants(s);
                  }}
                >
                  <Checkbox checked={selectedParticipants.has(p.id)} onCheckedChange={() => {}} onClick={e => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.participant_id}</p>
                  </div>
                  <Badge variant={p.attendance_status === "Present" ? "default" : "secondary"} className="text-xs shrink-0">
                    {p.attendance_status === "Present" ? "Hadir" : "Absen"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={e => { e.stopPropagation(); deleteMut.mutate([p.id]); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowManageDialog(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}