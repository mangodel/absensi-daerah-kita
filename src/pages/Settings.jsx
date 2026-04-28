import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save, Loader2, Plus, Trash2, Upload, Image } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PAGE_TITLE_FIELDS = [
  { key: "dashboard", label: "Dashboard — Judul" },
  { key: "dashboard_subtitle", label: "Dashboard — Subtitle" },
  { key: "members", label: "Anggota — Judul" },
  { key: "members_subtitle", label: "Anggota — Subtitle" },
  { key: "events", label: "Kegiatan — Judul" },
  { key: "events_subtitle", label: "Kegiatan — Subtitle" },
  { key: "attendance", label: "Absensi — Judul" },
  { key: "attendance_subtitle", label: "Absensi — Subtitle" },
  { key: "transfers", label: "Pindah Kelompok — Judul" },
  { key: "transfers_subtitle", label: "Pindah Kelompok — Subtitle" },
  { key: "structure", label: "Struktur — Judul" },
  { key: "structure_subtitle", label: "Struktur — Subtitle" },
];

export default function Settings() {
  const { user } = useAuth();
  const { config, reload } = useAppConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoInputRef = useRef();

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSubtitle, setOrgSubtitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [pageTitles, setPageTitles] = useState({});
  const [desaKelompokMap, setDesaKelompokMap] = useState({});

  useEffect(() => {
    setOrgName(config.org_name || "");
    setOrgSubtitle(config.org_subtitle || "");
    setLogoUrl(config.logo_url || "");
    setPageTitles({ ...config.page_titles });
    setDesaKelompokMap(JSON.parse(JSON.stringify(config.desa_kelompok_map || {})));
  }, [config]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Akses ditolak. Hanya admin yang bisa mengubah pengaturan.</p>
      </div>
    );
  }

  const upsertConfig = async (key, value, label) => {
    const existing = await base44.entities.AppConfig.filter({ key });
    const strVal = typeof value === "string" ? value : JSON.stringify(value);
    if (existing.length > 0) {
      await base44.entities.AppConfig.update(existing[0].id, { value: strVal });
    } else {
      await base44.entities.AppConfig.create({ key, value: strVal, label });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await upsertConfig("org_name", orgName, "Nama Organisasi");
    await upsertConfig("org_subtitle", orgSubtitle, "Subtitle");
    await upsertConfig("logo_url", logoUrl, "Logo URL");
    await upsertConfig("page_titles", pageTitles, "Judul Halaman");
    await upsertConfig("desa_kelompok_map", desaKelompokMap, "Peta Desa-Kelompok");
    await reload();
    queryClient.invalidateQueries();
    toast({ title: "Pengaturan disimpan!" });
    setSaving(false);
  };

  const addDesa = () => {
    const name = `Desa Baru`;
    setDesaKelompokMap(prev => ({ ...prev, [name]: [] }));
  };

  const renameDesa = (oldName, newName) => {
    if (!newName || newName === oldName) return;
    setDesaKelompokMap(prev => {
      const entries = Object.entries(prev);
      const idx = entries.findIndex(([k]) => k === oldName);
      entries[idx] = [newName, entries[idx][1]];
      return Object.fromEntries(entries);
    });
  };

  const removeDesa = (desa) => {
    setDesaKelompokMap(prev => {
      const next = { ...prev };
      delete next[desa];
      return next;
    });
  };

  const addKelompok = (desa) => {
    setDesaKelompokMap(prev => ({
      ...prev,
      [desa]: [...(prev[desa] || []), `Kelompok Baru`],
    }));
  };

  const renameKelompok = (desa, idx, newName) => {
    setDesaKelompokMap(prev => {
      const list = [...(prev[desa] || [])];
      list[idx] = newName;
      return { ...prev, [desa]: list };
    });
  };

  const removeKelompok = (desa, idx) => {
    setDesaKelompokMap(prev => {
      const list = [...(prev[desa] || [])];
      list.splice(idx, 1);
      return { ...prev, [desa]: list };
    });
  };

  return (
    <div className="space-y-6 max-w-2xl pb-20 md:pb-0">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
      </div>

      {/* Identitas Organisasi */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-sm text-foreground">Identitas Organisasi</h2>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Logo Organisasi</Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Image className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1.5 flex-1">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                {uploadingLogo ? "Mengupload..." : "Upload Logo"}
              </Button>
              {logoUrl && (
                <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setLogoUrl("")}>
                  Hapus Logo
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG (maks 2MB)</p>
            </div>
          </div>
          {/* Or enter URL manually */}
          <Input
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="Atau masukkan URL logo (https://...)"
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nama Organisasi (tampil di sidebar)</Label>
          <Input value={orgName} onChange={e => setOrgName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Subtitle Organisasi</Label>
          <Input value={orgSubtitle} onChange={e => setOrgSubtitle(e.target.value)} />
        </div>
      </div>

      {/* Judul Halaman */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-sm text-foreground">Judul Halaman</h2>
        <p className="text-xs text-muted-foreground">Ubah judul dan subtitle yang tampil di setiap halaman.</p>
        <div className="grid grid-cols-1 gap-3">
          {PAGE_TITLE_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                value={pageTitles[key] || ""}
                onChange={e => setPageTitles(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desa & Kelompok */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-foreground">Desa &amp; Kelompok</h2>
          <Button size="sm" variant="outline" onClick={addDesa}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Desa
          </Button>
        </div>

        {Object.entries(desaKelompokMap).map(([desa, kelompoks]) => (
          <div key={desa} className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                className="font-semibold"
                defaultValue={desa}
                onBlur={e => renameDesa(desa, e.target.value)}
              />
              <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeDesa(desa)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 ml-2">
              {kelompoks.map((k, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    className="text-sm"
                    defaultValue={k}
                    onBlur={e => renameKelompok(desa, idx, e.target.value)}
                  />
                  <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeKelompok(desa, idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full" onClick={() => addKelompok(desa)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Kelompok
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Simpan Pengaturan
      </Button>
    </div>
  );
}