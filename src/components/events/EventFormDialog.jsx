import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EVENT_LEVEL_LIST, DAPUKAN_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Users, X, CheckSquare } from "lucide-react";

const empty = {
  name: "", level: "Kelompok", desa: "", kelompok: "",
  date: "", description: "", location: "",
  participant_dapukan: [], // [] = semua jamaah
  participant_filter: "", // special filter: mubaligh_both, mubaligh_only, mubalighot_only, generus_smp, generus_sma, usia_nikah
};

const currentYear = new Date().getFullYear();

function applyParticipantFilter(pool, filter) {
  if (!filter) return pool;
  if (filter === "mubaligh_both") return pool.filter(m => m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot");
  if (filter === "mubaligh_only") return pool.filter(m => m.muballigh_status === "Muballigh");
  if (filter === "mubalighot_only") return pool.filter(m => m.muballigh_status === "Muballighot");
  if (filter === "generus_smp") return pool.filter(m => {
    const age = currentYear - (m.birth_year || currentYear);
    return age >= 12 && age <= 14;
  });
  if (filter === "generus_sma") return pool.filter(m => {
    const age = currentYear - (m.birth_year || currentYear);
    return age >= 15 && age <= 17;
  });
  if (filter === "usia_nikah") return pool.filter(m => {
    const age = currentYear - (m.birth_year || currentYear);
    return age >= 18 && (m.marital_status === "Belum Menikah" || !m.marital_status);
  });
  // Ibu-ibu: perempuan yang sudah menikah atau pernah menikah
  if (filter === "ibu_ibu") {
    const statusNikah = ["menikah", "cerai", "janda/duda", "janda", "duda"];
    return pool.filter(m =>
      (m.gender === "Perempuan" || (m.gender || "").toLowerCase() === "perempuan") &&
      statusNikah.includes((m.marital_status || "").toLowerCase().trim())
    );
  }
  return pool;
}

function getEligibleCount(members, dapukanList, participantFilter, desa, kelompok, level) {
  let pool = members.filter(m => m.status === "Aktif");
  if (level === "Desa" && desa) pool = pool.filter(m => m.desa === desa);
  if (level === "Kelompok" && kelompok) pool = pool.filter(m => m.kelompok === kelompok && (!desa || m.desa === desa));
  if (participantFilter) return applyParticipantFilter(pool, participantFilter).length;
  if (!dapukanList || dapukanList.length === 0) return pool.length;
  return pool.filter(m => dapukanList.includes(m.dapukan)).length;
}

const PRESET_FILTERS = [
  { value: "mubaligh_both", label: "Semua Mubaligh & Mubalighot" },
  { value: "mubaligh_only", label: "Mubaligh Saja" },
  { value: "mubalighot_only", label: "Mubalighot Saja" },
  { value: "generus_smp", label: "Generus SMP (12–14 thn)" },
  { value: "generus_sma", label: "Generus SMA (15–17 thn)" },
  { value: "usia_nikah", label: "Usia Nikah (Lajang 18+)" },
  { value: "ibu_ibu", label: "Ibu-ibu" },
];

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
      setForm({ ...empty, ...event, participant_dapukan: event.participant_dapukan || [], participant_filter: event.participant_filter || "" });
    } else if (prefilledDate) {
      const iso = `${prefilledDate.getFullYear()}-${String(prefilledDate.getMonth()+1).padStart(2,"0")}-${String(prefilledDate.getDate()).padStart(2,"0")}`;
      setForm({ ...empty, date: iso });
    } else {
      setForm(empty);
    }
  }, [event, prefilledDate, open]);

  const kelompokOptions = form.desa ? desaKelompokMap[form.desa] || [] : [];
  const eligibleCount = getEligibleCount(members, form.participant_dapukan, form.participant_filter, form.desa, form.kelompok, form.level);

  const toggleDapukan = (d) => {
    setForm(prev => {
      const cur = prev.participant_dapukan || [];
      if (cur.includes(d)) return { ...prev, participant_dapukan: cur.filter(x => x !== d) };
      return { ...prev, participant_dapukan: [...cur, d] };
    });
  };

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

  // All dapukan options except "Jamaah" / "Jamaah Biasa"
  const dapukanOptions = DAPUKAN_LIST.filter(d => d !== "Jamaah Biasa" && d !== "Jamaah");
  const selectedDapukan = form.participant_dapukan || [];
  const allSelected = selectedDapukan.length === 0 && !form.participant_filter;

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

          {/* Multi-dapukan participant selector */}
          <div className="space-y-3 border border-border rounded-xl p-4 bg-secondary/20">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> Peserta Kegiatan
            </Label>
            <p className="text-xs text-muted-foreground">Pilih filter peserta. Kosongkan = <strong>semua jamaah aktif</strong>.</p>

            {/* Reset */}
            <button type="button"
              onClick={() => setForm(f => ({ ...f, participant_dapukan: [], participant_filter: "" }))}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${allSelected ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              Semua Jamaah
            </button>

            {/* Preset filter khusus */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Filter Cepat</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_FILTERS.map(pf => {
                  const active = form.participant_filter === pf.value;
                  return (
                    <button key={pf.value} type="button"
                      onClick={() => setForm(f => ({ ...f, participant_filter: active ? "" : pf.value, participant_dapukan: [] }))}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${active ? "bg-accent text-accent-foreground border-accent" : "border-border bg-card hover:bg-secondary"}`}>
                      {pf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Per-dapukan manual (only if no preset active) */}
            {!form.participant_filter && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pilih Dapukan Manual</p>
                  <button type="button" onClick={() => setForm(f => ({ ...f, participant_dapukan: [...dapukanOptions] }))}
                    className="text-[10px] text-primary hover:underline">Pilih Semua</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dapukanOptions.map(d => {
                    const selected = selectedDapukan.includes(d);
                    return (
                      <button key={d} type="button" onClick={() => toggleDapukan(d)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-secondary"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                {eligibleCount} anggota eligible
              </Badge>
              {form.participant_filter && (
                <span className="text-accent font-medium">{PRESET_FILTERS.find(p => p.value === form.participant_filter)?.label}</span>
              )}
              {!form.participant_filter && selectedDapukan.length > 0 && (
                <span>{selectedDapukan.length} dapukan dipilih</span>
              )}
            </div>
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