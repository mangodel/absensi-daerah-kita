import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_LEVEL_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";

const empty = {
  name: "", level: "Kelompok", desa: "", kelompok: "",
  date: "", description: "", location: ""
};

export default function EventFormDialog({ open, onOpenChange, event, prefilledDate, onSave }) {
  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};

  const [form, setForm] = useState(empty);
  const isEdit = !!event;

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
      <DialogContent className="max-w-md">
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

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit">{isEdit ? "Simpan" : "Tambah Event"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}