import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAPUKAN_LIST, DAPUKAN_LEVEL_LIST, BIRTHPLACE_LIST, VISA_STATUS_LIST, MUBALLIGH_STATUS_LIST, EMPLOYMENT_LIST, MEMBER_STATUS_LIST, GENDER_LIST, MARITAL_STATUS_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import FamilyGroupField from "@/components/members/FamilyGroupField";
import { base44 } from "@/api/base44Client";

// Field wrapper — defined OUTSIDE parent component to prevent remount on every render
function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// Combobox: select from list OR type custom value
// Defined OUTSIDE parent so it never remounts due to parent re-renders
function ComboField({ value, onChange, options, placeholder }) {
  // showCustom is purely derived: true if current value is not in options list
  const isInList = options.includes(value);
  const showCustom = !!value && !isInList;

  return (
    <div className="space-y-1">
      <Select
        value={showCustom ? "__custom__" : (isInList ? value : "")}
        onValueChange={v => {
          if (v === "__custom__") {
            onChange("");
          } else {
            onChange(v);
          }
        }}
      >
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value="__custom__">Lainnya (ketik manual)</SelectItem>
        </SelectContent>
      </Select>
      {showCustom && (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Ketik ${placeholder}...`}
        />
      )}
    </div>
  );
}

const emptyMember = {
  full_name: "", email: "", gender: "", marital_status: "", desa: "", kelompok: "", sub_kelompok: "",
  family_group: "", birth_year: "", birthplace: "", visa_status: "", muballigh_status: "",
  employment: "", dapukan: "Jamaah", dapukan_level: "Kelompok", status: "Aktif",
  phone: "", address: "", suburb: "", state: "", postcode: "", notes: ""
};

export default function MemberFormDialog({ open, onOpenChange, member, onSave, allMembers = [] }) {
  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};

  const [form, setForm] = useState(emptyMember);
  const isEdit = !!member;

  useEffect(() => {
    if (open) {
      if (member) {
        setForm({ ...emptyMember, ...member, birth_year: member.birth_year ? String(member.birth_year) : "" });
      } else {
        setForm(emptyMember);
      }
    }
  }, [member, open]);

  const kelompokOptions = form.desa ? desaKelompokMap[form.desa] || [] : [];
  // Anggota di kelompok yang sama (untuk pilihan KK)
  const membersInKelompok = allMembers.filter(m => m.kelompok === form.kelompok);

  const set = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, birth_year: form.birth_year ? Number(form.birth_year) : undefined };

    // Auto-set family_group if dapukan is "Kepala Keluarga"
    if (form.dapukan === "Kepala Keluarga") {
      data.family_group = form.full_name;
    }

    // Auto-record transfer history if desa or kelompok changed
    if (member && member.id && (member.desa !== form.desa || member.kelompok !== form.kelompok)) {
      const today = new Date().toISOString().split("T")[0];
      base44.entities.TransferHistory.create({
        member_id: member.id,
        member_name: member.full_name,
        from_desa: member.desa || "",
        from_kelompok: member.kelompok || "",
        to_desa: form.desa || "",
        to_kelompok: form.kelompok || "",
        transfer_date: today,
        reason: "Diubah via edit data jamaah",
      }).catch(() => {}); // fire-and-forget
    }

    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Data Jamaah" : "Tambah Jamaah Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Data Pribadi */}
          <div className="text-xs font-semibold text-primary uppercase tracking-wider pt-1">Data Pribadi</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama Lengkap *">
              <Input
                value={form.full_name}
                onChange={e => set("full_name", e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="email@example.com"
              />
            </Field>
            <Field label="No. Telepon">
              <Input
                type="text"
                inputMode="tel"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="cth: +61 4xx xxx xxx"
              />
            </Field>
            <Field label="Jenis Kelamin">
              <Select value={form.gender} onValueChange={v => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {GENDER_LIST.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status Pernikahan">
              <Select value={form.marital_status} onValueChange={v => set("marital_status", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tahun Lahir">
              <Input
                type="text"
                inputMode="numeric"
                value={form.birth_year}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  set("birth_year", val);
                }}
                placeholder="cth: 1990"
                maxLength={4}
              />
            </Field>
            <Field label="Tempat Lahir">
              <Select value={form.birthplace} onValueChange={v => set("birthplace", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {BIRTHPLACE_LIST.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status Visa">
              <Select value={form.visa_status} onValueChange={v => set("visa_status", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {VISA_STATUS_LIST.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pekerjaan">
              <Select value={form.employment} onValueChange={v => set("employment", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_LIST.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Muballigh / Muballighot">
              <Select value={form.muballigh_status} onValueChange={v => set("muballigh_status", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {MUBALLIGH_STATUS_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Dapukan & Status */}
          <div className="text-xs font-semibold text-primary uppercase tracking-wider pt-1">Dapukan & Status</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Dapukan">
              <ComboField
                value={form.dapukan}
                onChange={v => set("dapukan", v)}
                options={DAPUKAN_LIST}
                placeholder="Pilih atau ketik dapukan"
              />
            </Field>
            <Field label="Tingkat Dapukan">
              <Select value={form.dapukan_level} onValueChange={v => set("dapukan_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAPUKAN_LEVEL_LIST.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status Keanggotaan">
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEMBER_STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Lokasi */}
          <div className="text-xs font-semibold text-primary uppercase tracking-wider pt-1">Lokasi / Kelompok</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Desa *">
              <ComboField
                value={form.desa}
                onChange={v => setForm(prev => ({ ...prev, desa: v, kelompok: "" }))}
                options={desaList}
                placeholder="Pilih atau ketik Desa"
              />
            </Field>
            <Field label="Kelompok *">
              <ComboField
                value={form.kelompok}
                onChange={v => set("kelompok", v)}
                options={kelompokOptions}
                placeholder="Pilih atau ketik Kelompok"
              />
            </Field>
            <Field label="Sub Kelompok">
              <Input
                value={form.sub_kelompok}
                onChange={e => set("sub_kelompok", e.target.value)}
                placeholder="Sub kelompok (opsional)"
              />
            </Field>
            <Field label="Grup Keluarga (KK)">
              <FamilyGroupField
                value={form.family_group}
                onChange={v => set("family_group", v)}
                membersInKelompok={membersInKelompok}
                currentMemberId={member?.id}
              />
            </Field>
          </div>

          {/* Alamat Australia */}
          <div className="text-xs font-semibold text-primary uppercase tracking-wider pt-1">Alamat Rumah (Australia)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Jalan / Nomor Rumah">
                <Input
                  value={form.address}
                  onChange={e => set("address", e.target.value)}
                  placeholder="cth: 42 Smith Street"
                />
              </Field>
            </div>
            <Field label="Suburb / Kota">
              <Input
                value={form.suburb}
                onChange={e => set("suburb", e.target.value)}
                placeholder="cth: Adelaide"
              />
            </Field>
            <Field label="State">
              <Select value={form.state} onValueChange={v => set("state", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih State" /></SelectTrigger>
                <SelectContent>
                  {["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Postcode">
              <Input
                value={form.postcode}
                onChange={e => set("postcode", e.target.value)}
                placeholder="cth: 5000"
              />
            </Field>
          </div>

          <Field label="Catatan">
            <Input
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Catatan tambahan (opsional)"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
             <Button type="submit">{isEdit ? "Simpan Perubahan" : "Tambah Jamaah"}</Button>
           </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}