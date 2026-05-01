import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAPUKAN_LIST, DAPUKAN_LEVEL_LIST, BIRTHPLACE_LIST, VISA_STATUS_LIST, MUBALLIGH_STATUS_LIST, EMPLOYMENT_LIST, MEMBER_STATUS_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";

// Combobox: dropdown list + free-text fallback
function ComboField({ value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1">
      <Select value={options.includes(value) ? value : "__custom__"} onValueChange={v => { if (v !== "__custom__") onChange(v); }}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value="__custom__">Lainnya (ketik manual)</SelectItem>
        </SelectContent>
      </Select>
      {(!options.includes(value) || value === "") && (
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

const emptyMember = {
  full_name: "", desa: "", kelompok: "", birth_year: "",
  birthplace: "", visa_status: "", muballigh_status: "", employment: "",
  dapukan: "Jamaah Biasa", dapukan_level: "Kelompok", status: "Aktif", phone: "", notes: ""
};

export default function MemberFormDialog({ open, onOpenChange, member, onSave }) {
  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};

  const [form, setForm] = useState(emptyMember);
  const isEdit = !!member;

  useEffect(() => {
    if (member) {
      setForm({ ...emptyMember, ...member, birth_year: member.birth_year ? String(member.birth_year) : "" });
    } else {
      setForm(emptyMember);
    }
  }, [member, open]);

  const kelompokOptions = form.desa ? desaKelompokMap[form.desa] || [] : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, birth_year: form.birth_year ? Number(form.birth_year) : undefined };
    onSave(data);
  };

  const Field = ({ label, children }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Anggota" : "Tambah Anggota Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Lengkap *">
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
            </Field>
            <Field label="No. Telepon">
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Desa *">
              <ComboField
                value={form.desa}
                onChange={v => setForm({ ...form, desa: v, kelompok: "" })}
                options={desaList}
                placeholder="Pilih atau ketik Desa"
              />
            </Field>
            <Field label="Kelompok *">
              <ComboField
                value={form.kelompok}
                onChange={v => setForm({ ...form, kelompok: v })}
                options={kelompokOptions}
                placeholder="Pilih atau ketik Kelompok"
              />
            </Field>
            <Field label="Tahun Lahir">
              <Input type="number" value={form.birth_year} onChange={e => setForm({ ...form, birth_year: e.target.value })} placeholder="cth: 1990" />
            </Field>
            <Field label="Tempat Lahir">
              <Select value={form.birthplace} onValueChange={v => setForm({ ...form, birthplace: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {BIRTHPLACE_LIST.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status Visa">
              <Select value={form.visa_status} onValueChange={v => setForm({ ...form, visa_status: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {VISA_STATUS_LIST.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Muballigh / Muballighot">
              <Select value={form.muballigh_status} onValueChange={v => setForm({ ...form, muballigh_status: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {MUBALLIGH_STATUS_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pekerjaan">
              <Select value={form.employment} onValueChange={v => setForm({ ...form, employment: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_LIST.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Dapukan">
              <Select value={form.dapukan} onValueChange={v => setForm({ ...form, dapukan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAPUKAN_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tingkat Dapukan">
              <Select value={form.dapukan_level} onValueChange={v => setForm({ ...form, dapukan_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAPUKAN_LEVEL_LIST.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEMBER_STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Catatan">
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit">{isEdit ? "Simpan Perubahan" : "Tambah Anggota"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}