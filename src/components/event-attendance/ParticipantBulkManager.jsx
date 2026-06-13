import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ParticipantBulkManager({ eventId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [filterDapukan, setFilterDapukan] = useState("all");

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
        try {
          obj[c.key] = c.value.startsWith('{') ? JSON.parse(c.value) : c.value;
        } catch {
          obj[c.key] = c.value;
        }
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
      setShowDialog(false);
      setSelectedMembers(new Set());
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (participantIds) => {
      const promises = participantIds.map(id => base44.entities.EventParticipant.delete(id));
      await Promise.all(promises);
    },
    onSuccess: (_, participantIds) => {
      qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
      toast({ description: `${participantIds.length} peserta dihapus.` });
    },
  });

  const desaList = appConfig.desa_list || [];
  const kelompokList = appConfig.kelompok_list || [];
  const dapukanList = appConfig.dapukan_list || [];

  const filteredMembers = members.filter(m => {
    if (m.status !== "Aktif") return false;
    if (filterDesa !== "all" && m.desa !== filterDesa) return false;
    if (filterKelompok !== "all" && m.kelompok !== filterKelompok) return false;
    if (filterDapukan !== "all" && m.dapukan !== filterDapukan) return false;
    // Don't show already registered participants
    return !participants.some(p => p.participant_id === m.member_id);
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    } else {
      setSelectedMembers(new Set());
    }
  };

  const handleSelectMember = (memberId, checked) => {
    const newSet = new Set(selectedMembers);
    if (checked) {
      newSet.add(memberId);
    } else {
      newSet.delete(memberId);
    }
    setSelectedMembers(newSet);
  };

  const handleAddMembers = () => {
    const membersToAdd = filteredMembers.filter(m => selectedMembers.has(m.id));
    if (membersToAdd.length === 0) {
      toast({ description: "Pilih minimal 1 jamaah", variant: "destructive" });
      return;
    }
    createMut.mutate(membersToAdd);
  };

  const handleDeleteParticipants = (participantIds) => {
    if (confirm(`Hapus ${participantIds.length} peserta dari daftar?`)) {
      deleteMut.mutate(participantIds);
    }
  };

  if (!eventId) return null;

  return (
    <div className="space-y-4">
      {/* Delete participants in list */}
      {participants.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Kelola Peserta Terdaftar</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Hapus peserta yang tidak sesuai dari daftar</p>
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
            {participants.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-card rounded border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.organization || "-"}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteParticipants([p.id])}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick filters & bulk add */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm">Filter Cepat & Tambah Peserta</h3>
        </div>

        {/* Quick filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Desa</label>
            <Select value={filterDesa} onValueChange={setFilterDesa}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Desa</SelectItem>
                {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kelompok</label>
            <Select value={filterKelompok} onValueChange={setFilterKelompok}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelompok</SelectItem>
                {kelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dapukan</label>
            <Select value={filterDapukan} onValueChange={setFilterDapukan}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dapukan</SelectItem>
                {dapukanList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => setShowDialog(true)}
          className="w-full"
          disabled={filteredMembers.length === 0}
        >
          Tampilkan {filteredMembers.length} Jamaah · Multi Selection
        </Button>
      </div>

      {/* Multi-selection dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pilih Jamaah untuk Ditambahkan sebagai Peserta</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Select all checkbox */}
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
              <Checkbox
                checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label className="text-sm font-medium flex-1 cursor-pointer">
                Pilih Semua ({filteredMembers.length})
              </label>
              {selectedMembers.size > 0 && (
                <Badge variant="outline">{selectedMembers.size} dipilih</Badge>
              )}
            </div>

            {/* Members list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada jamaah yang sesuai dengan filter</p>
              ) : (
                filteredMembers.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-secondary/20 cursor-pointer"
                    onClick={() => handleSelectMember(m.id, !selectedMembers.has(m.id))}
                  >
                    <Checkbox
                      checked={selectedMembers.has(m.id)}
                      onCheckedChange={(checked) => handleSelectMember(m.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.desa}{m.kelompok ? ` / ${m.kelompok}` : ""} · {m.dapukan}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={selectedMembers.size === 0 || createMut.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Tambahkan ({selectedMembers.size})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}