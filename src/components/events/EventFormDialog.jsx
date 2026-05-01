import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EVENT_LEVEL_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Users } from "lucide-react";

const empty = {
  name: "", level: "Kelompok", desa: "", kelompok: "",
  date: "", description: "", location: "",
  participant_filter: "all",
};

// Participant filter options
const PARTICIPANT_FILTERS = [
  { value: "all", label: "Seluruh Jamaah", desc: "Semua anggota aktif" },
  { value: "muballigh", label: "Muballigh / Muballighot", desc: "Hanya yang berstatus Muballigh atau Muballighot" },
  { value: "dapukan", label: "Yang Memiliki Dapukan", desc: "Semua kecuali Jamaah Biasa" },
  { value: "smp", label: "Usia SMP", desc: "Lahir tahun " + (new Date().getFullYear() - 15) + "–" + (new Date().getFullYear() - 12) },
  { value: "sma", label: "Usia SMA", desc: "Lahir tahun " + (new Date().getFullYear() - 18) + "–" + (new Date().getFullYear() - 15) },
  { value: "muda_mudi", label: "Muda Mudi", desc: "Lahir tahun " + (new Date().getFullYear() - 30) + "–" + (new Date().getFullYear() - 18) },
];

function getEligibleCount(members, filter, desa, kelompok, level) {
  let pool = members.filter(m => m.status === "Aktif");
  if (level === "Desa" && desa) pool = pool.filter(m => m.desa === desa);
  if (level === "Kelompok" && kelompok) pool = pool.filter(m => m.kelompok === kelompok);

  const year = new Date().getFullYear();
  switch (filter) {
    case "muballigh": return pool.filter(m => m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot").length;
    case "dapukan": return pool.filter(m => m.dapukan && m.dapukan !== "Jamaah Biasa").length;
    case "smp": return pool.filter(m => m.birth_year && m.birth_year >= year - 15 && m.birth_year <= year - 12).length;
    case "sma": return pool.filter(m => m.birth_year && m.birth_year >= year - 18 && m.birth_year < year - 15).length;
    case "muda_mudi": return pool.filter(m => m.birth_year && m.birth_year >= year - 30 && m.birth_year < year - 18).length;
    default: return pool.length;
  }
}

export default function EventFormDialog({ open, onOpenChange, event, prefilledDate, onSave }) {
  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};

  const [form, setForm] = useState(empty);
  const isEdit = !!event;

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
    enabled: open,
  });

  useEffect(() => {
    if (event) {
      setForm({ ...empty, ...event });
    } else if (prefilledDate) {
      const iso = `${prefilledDate.getFullYear()}-${String(prefilledDate.getMonth()+1).padStart(2,"0")}-${String(prefilledDate.getDate()).padStart(2,"0")}`;
      setForm({ ...empty, date: iso });
    } else {
      setForm(empty);
    }
  }, [event, prefilledDate, open]);

  const kelompokOptions = form.desa ? desaKelompokMap[form.desa] || [] : [];

  const eligibleCount = getEligibleCount(members, form.participant_filter, form.desa, form.kelompok, form.level);
  const selectedFilter = PARTICIPANT_FILTERS.find(f => f.value === form.participant_filter);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dateObj = new Date(form.date);
    onSave({
      ...form,
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
      desa: form.level === "Daerah" ? "" : form.desa,
      kelompok: form.level !== "Kelompok" ? "" : form.kelompok,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Event" : "Tambah Event Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nama Kegiatan *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="cth: Pengajian Daerah" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tingkat Event *</Label>
            <Select value={form.level} onValueChange={v => setForm({ ...form, level: v, desa: "", kelompok: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_LEVEL_LIST.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(form.level === "Desa" || form.level === "Kelompok") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Desa *</Label>
              <Select value={form.desa} onValueChange={v => setForm({ ...form, desa: v, kelompok: "" })}>
                <SelectTrigger><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
                <SelectContent>
                  {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.level === "Kelompok" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kelompok *</Label>
              <Select value={form.kelompok} onValueChange={v => setForm({ ...form, kelompok: v })} disabled={!form.desa}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelompok" /></SelectTrigger>
                <SelectContent>
                  {kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tanggal *</Label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Lokasi</Label>
            <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Opsional" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Deskripsi</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opsional" />
          </div>

          {/* Participant Filter */}
          <div className="space-y-2 border border-border rounded-xl p-4 bg-secondary/20">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> Peserta Kegiatan
            </Label>
            <Select value={form.participant_filter} onValueChange={v => setForm({ ...form, participant_filter: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARTICIPANT_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    <div>
                      <span className="font-medium">{f.label}</span>
                      <span className="text-muted-foreground text-xs ml-2">— {f.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFilter && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                  {eligibleCount} anggota eligible
                </Badge>
                <span>{selectedFilter.desc}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit">{isEdit ? "Simpan" : "Tambah Event"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}