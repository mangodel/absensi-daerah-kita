import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EVENT_LEVEL_LIST, DAPUKAN_LIST, DAPUKAN_4S } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Users, X, CheckSquare, RefreshCw, Upload, FileText, Loader2 } from "lucide-react";
import { RECURRING_PATTERNS, RECURRING_DURATIONS, generateRecurringDates, dateToISO } from "@/lib/recurringUtils";

const empty = {
  name: "", level: "Kelompok", desa: "", kelompok: "",
  date: "", time: "", description: "", location: "",
  materi: "", pemateri: "", notes: "",
  document_url: "", document_name: "",
  participant_dapukan: [],
  participant_filter: "",
  recurring_pattern: "",
  recurring_duration: 3,
};

const currentYear = new Date().getFullYear();

function applyParticipantFilter(pool, filter) {
  if (!filter) return pool;
  if (filter === "4s") return pool.filter(m => DAPUKAN_4S.includes(m.dapukan));
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
  { value: "4s", label: "4S (Keimaman, PKU/KU, Penerobos, Aghniya, Mubaligh)" },
  { value: "mubaligh_both", label: "Semua Mubaligh & Mubalighot" },
  { value: "mubaligh_only", label: "Mubaligh Saja" },
  { value: "mubalighot_only", label: "Mubalighot Saja" },
  { value: "generus_smp", label: "Generus SMP (12–14 thn)" },
  { value: "generus_sma", label: "Generus SMA (15–17 thn)" },
  { value: "usia_nikah", label: "Usia Nikah (Lajang 18+)" },
  { value: "ibu_ibu", label: "Ibu-ibu" },
];

export default function EventFormDialog({ open, onOpenChange, event, prefilledDate, onSave, onSaveRecurring }) {
  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};

  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!event;

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
    enabled: open,
  });

  useEffect(() => {
    if (event) {
      setForm({ ...empty, ...event, participant_dapukan: event.participant_dapukan || [], participant_filter: event.participant_filter || "", recurring_pattern: "", recurring_duration: 3 });
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

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, document_url: file_url, document_name: file.name }));
    setUploading(false);
  };

  const recurringPreview = form.recurring_pattern && form.date
    ? generateRecurringDates(form.date, form.recurring_pattern, form.recurring_duration)
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const baseData = {
      ...form,
      desa: form.level === "Daerah" ? "" : form.desa,
      kelompok: form.level !== "Kelompok" ? "" : form.kelompok,
      recurring_pattern: undefined,
      recurring_duration: undefined,
    };

    // Jika ada recurring pattern dan bukan edit
    if (form.recurring_pattern && !event && recurringPreview.length > 1 && onSaveRecurring) {
      const groupId = `recurring_${Date.now()}`;
      const allDates = recurringPreview;
      const events = allDates.map(dt => {
        const iso = dateToISO(dt);
        const d = new Date(dt);
        return {
          ...baseData,
          date: iso,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          recurring_group: groupId,
          recurring_pattern: form.recurring_pattern,
        };
      });
      onSaveRecurring(events);
      return;
    }

    // Single event
    const dateObj = new Date(form.date);
    onSave({
      ...baseData,
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
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
            <Label className="text-xs font-medium">Waktu (Jam)</Label>
            <Input type="time" value={form.time || ""} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="HH:MM" />
          </div>

          {/* Recurring — hanya saat tambah baru */}
          {!event && (
            <div className="space-y-3 border border-border rounded-xl p-4 bg-secondary/20">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-primary" /> Pengulangan Kegiatan
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">Pola</p>
                  <Select value={form.recurring_pattern} onValueChange={v => setForm({ ...form, recurring_pattern: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Tidak berulang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Tidak Berulang</SelectItem>
                      {RECURRING_PATTERNS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.recurring_pattern && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">Durasi</p>
                    <Select value={String(form.recurring_duration)} onValueChange={v => setForm({ ...form, recurring_duration: Number(v) })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECURRING_DURATIONS.map(d => (
                          <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {recurringPreview.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    Akan dibuat <span className="font-semibold text-primary">{recurringPreview.length}</span> event:
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {recurringPreview.map((dt, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0.5 bg-primary/5 border-primary/20 text-primary">
                        {dateToISO(dt)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Lokasi</Label>
            <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Opsional" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Deskripsi</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opsional" />
          </div>

          {/* Materi & Pemateri */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Materi / Topik</Label>
              <Input value={form.materi} onChange={e => setForm({ ...form, materi: e.target.value })} placeholder="cth: Fiqih Sholat" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Pemateri / Pengajar</Label>
              <Input value={form.pemateri} onChange={e => setForm({ ...form, pemateri: e.target.value })} placeholder="cth: Ust. Ahmad" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Catatan Tambahan</Label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan, pesan, atau info penting lainnya" />
          </div>

          {/* Upload Dokumen */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Dokumen / Susunan Acara</Label>
            {form.document_url ? (
              <div className="flex items-center gap-2 p-2.5 border border-border rounded-lg bg-secondary/30">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <a href={form.document_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex-1 truncate">{form.document_name || "Lihat Dokumen"}</a>
                <button type="button" onClick={() => setForm(f => ({ ...f, document_url: "", document_name: "" }))}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className={`flex items-center gap-2 p-2.5 border border-dashed border-border rounded-lg bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">{uploading ? "Mengupload..." : "Klik untuk upload PDF / Word / Excel"}</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleDocumentUpload} />
              </label>
            )}
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