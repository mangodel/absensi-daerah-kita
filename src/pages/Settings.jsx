import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save, Loader2, Plus, Trash2, Upload, Image, Users, ShieldCheck, GripVertical, ClipboardList } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserRoleManager from "@/components/settings/UserRoleManager";
import GoogleSheetSync from "@/components/settings/GoogleSheetSync";
import SurveyManager from "@/components/settings/SurveyManager";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const PAGE_TITLE_FIELDS = [
  { key: "dashboard", label: "Dashboard — Judul" },
  { key: "dashboard_subtitle", label: "Dashboard — Subtitle" },
  { key: "members", label: "Jamaah — Judul" },
  { key: "members_subtitle", label: "Jamaah — Subtitle" },
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
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false);
  const [uploadingLoginBg, setUploadingLoginBg] = useState(false);
  const [uploadingLoginBanner, setUploadingLoginBanner] = useState(false);
  const [uploadingAdminLoginBg, setUploadingAdminLoginBg] = useState(false);
  const [volunteerLogoUrl, setVolunteerLogoUrl] = useState("");
  const [uploadingVolunteerLogo, setUploadingVolunteerLogo] = useState(false);
  const [adminLoginBgUrl, setAdminLoginBgUrl] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSubtitle, setOrgSubtitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [registerBannerUrl, setRegisterBannerUrl] = useState("");
  const [loginLogoUrl, setLoginLogoUrl] = useState("");
  const [loginBgUrl, setLoginBgUrl] = useState("");
  const [loginBannerUrl, setLoginBannerUrl] = useState("");
  const [pageTitles, setPageTitles] = useState({});
  const [desaKelompokMap, setDesaKelompokMap] = useState({});

  const bannerInputRef = useRef();
  const loginLogoInputRef = useRef();
  const loginBgInputRef = useRef();
  const loginBannerInputRef = useRef();
  const adminLoginBgInputRef = useRef();
  const volunteerLogoInputRef = useRef();

  useEffect(() => {
    setOrgName(config.org_name || "");
    setOrgSubtitle(config.org_subtitle || "");
    setLogoUrl(config.logo_url || "");
    setRegisterBannerUrl(config.register_banner_url || "");
    setLoginLogoUrl(config.login_logo_url || "");
    setLoginBgUrl(config.login_bg_url || "");
    setLoginBannerUrl(config.login_banner_url || "");
    setAdminLoginBgUrl(config.admin_login_bg_url || "");
    setVolunteerLogoUrl(config.volunteer_logo_url || "");
    setPageTitles({ ...config.page_titles });
    setDesaKelompokMap(JSON.parse(JSON.stringify(config.desa_kelompok_map || {})));
  }, [config]);

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin";

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Akses ditolak. Hanya super admin yang bisa mengubah pengaturan.</p>
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

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setRegisterBannerUrl(file_url);
    setUploadingBanner(false);
  };

  const handleLoginLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLoginLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLoginLogoUrl(file_url);
    setUploadingLoginLogo(false);
  };

  const handleLoginBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLoginBg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLoginBgUrl(file_url);
    setUploadingLoginBg(false);
  };

  const handleVolunteerLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVolunteerLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setVolunteerLogoUrl(file_url);
    setUploadingVolunteerLogo(false);
  };

  const handleAdminLoginBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAdminLoginBg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAdminLoginBgUrl(file_url);
    setUploadingAdminLoginBg(false);
  };

  const handleLoginBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLoginBanner(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLoginBannerUrl(file_url);
    setUploadingLoginBanner(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await upsertConfig("org_name", orgName, "Nama Organisasi");
    await upsertConfig("org_subtitle", orgSubtitle, "Subtitle");
    await upsertConfig("logo_url", logoUrl, "Logo URL");
    await upsertConfig("register_banner_url", registerBannerUrl, "Banner Form Registrasi");
    await upsertConfig("login_logo_url", loginLogoUrl, "Logo Halaman Login");
    await upsertConfig("login_bg_url", loginBgUrl, "Background Portal Jamaah Login");
    await upsertConfig("admin_login_bg_url", adminLoginBgUrl, "Background Halaman Login Admin");
    await upsertConfig("login_banner_url", loginBannerUrl, "Banner Portal Jamaah Login");
    await upsertConfig("volunteer_logo_url", volunteerLogoUrl, "Logo Portal Volunteer");
    await upsertConfig("page_titles", pageTitles, "Judul Halaman");
    await upsertConfig("desa_kelompok_map", desaKelompokMap, "Peta Desa-Kelompok");
    await reload();
    queryClient.invalidateQueries();
    toast({ title: "Pengaturan disimpan!" });
    setSaving(false);
  };

  const addDesa = () => setDesaKelompokMap(prev => ({ ...prev, [`Desa Baru`]: [] }));

  const renameDesa = (oldName, newName) => {
    if (!newName || newName === oldName) return;
    setDesaKelompokMap(prev => {
      const entries = Object.entries(prev);
      const idx = entries.findIndex(([k]) => k === oldName);
      entries[idx] = [newName, entries[idx][1]];
      return Object.fromEntries(entries);
    });
  };

  const removeDesa = (desa) => setDesaKelompokMap(prev => { const next = { ...prev }; delete next[desa]; return next; });
  const addKelompok = (desa) => setDesaKelompokMap(prev => ({ ...prev, [desa]: [...(prev[desa] || []), `Kelompok Baru`] }));

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

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "DESA") {
      const entries = Object.entries(desaKelompokMap);
      const [removed] = entries.splice(source.index, 1);
      entries.splice(destination.index, 0, removed);
      setDesaKelompokMap(Object.fromEntries(entries));
    } else if (type === "KELOMPOK") {
      const desa = source.droppableId.replace("kelompok-", "");
      const list = [...(desaKelompokMap[desa] || [])];
      const [removed] = list.splice(source.index, 1);
      list.splice(destination.index, 0, removed);
      setDesaKelompokMap(prev => ({ ...prev, [desa]: list }));
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-20 md:pb-0">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="general" className="flex items-center gap-1.5"><SettingsIcon className="w-3.5 h-3.5" /> Umum</TabsTrigger>
          <TabsTrigger value="surveys" className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Survei</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Akses Pengguna</TabsTrigger>
          <TabsTrigger value="gsheet" className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Google Sheet</TabsTrigger>
        </TabsList>

        {/* ---- TAB UMUM ---- */}
        <TabsContent value="general" className="space-y-6 mt-4">
          {/* Identitas Organisasi */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground">Identitas Organisasi</h2>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Logo Organisasi</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Image className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    {uploadingLogo ? "Mengupload..." : "Upload Logo"}
                  </Button>
                  {logoUrl && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setLogoUrl("")}>Hapus Logo</Button>}
                </div>
              </div>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="Atau masukkan URL logo (https://...)" className="text-xs" />
            </div>
            {/* Banner Form Registrasi */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground">Banner / Logo Form Registrasi Peserta</Label>
              <p className="text-[11px] text-muted-foreground">Gambar ini muncul di bagian atas formulir pendaftaran event.</p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                  {registerBannerUrl ? <img src={registerBannerUrl} alt="Banner" className="w-full h-full object-cover" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  <Button size="sm" variant="outline" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                    {uploadingBanner ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    {uploadingBanner ? "Mengupload..." : "Upload Banner"}
                  </Button>
                  {registerBannerUrl && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setRegisterBannerUrl("")}>Hapus</Button>}
                </div>
              </div>
              <Input value={registerBannerUrl} onChange={e => setRegisterBannerUrl(e.target.value)} placeholder="Atau masukkan URL gambar banner (https://...)" className="text-xs" />
            </div>

            {/* Logo Halaman Login */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground">Logo Halaman Login</Label>
              <p className="text-[11px] text-muted-foreground">Logo khusus untuk portal masuk. Jika kosong, akan menggunakan logo organisasi.</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                  {loginLogoUrl ? <img src={loginLogoUrl} alt="Login Logo" className="w-full h-full object-contain" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input ref={loginLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLoginLogoUpload} />
                  <Button size="sm" variant="outline" onClick={() => loginLogoInputRef.current?.click()} disabled={uploadingLoginLogo}>
                    {uploadingLoginLogo ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    {uploadingLoginLogo ? "Mengupload..." : "Upload Logo Login"}
                  </Button>
                  {loginLogoUrl && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setLoginLogoUrl("")}>Hapus</Button>}
                </div>
              </div>
              <Input value={loginLogoUrl} onChange={e => setLoginLogoUrl(e.target.value)} placeholder="Atau masukkan URL logo login (https://...)" className="text-xs" />
              </div>

              {/* Logo Portal Volunteer */}
              <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground">Logo Portal Volunteer Scan</Label>
              <p className="text-[11px] text-muted-foreground">Logo yang muncul di halaman pemilihan event pada portal volunteer.</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                  {volunteerLogoUrl ? <img src={volunteerLogoUrl} alt="Volunteer Logo" className="w-full h-full object-contain" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input ref={volunteerLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleVolunteerLogoUpload} />
                  <Button size="sm" variant="outline" onClick={() => volunteerLogoInputRef.current?.click()} disabled={uploadingVolunteerLogo}>
                    {uploadingVolunteerLogo ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    {uploadingVolunteerLogo ? "Mengupload..." : "Upload Logo"}
                  </Button>
                  {volunteerLogoUrl && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setVolunteerLogoUrl("")}>Hapus</Button>}
                </div>
              </div>
              <Input value={volunteerLogoUrl} onChange={e => setVolunteerLogoUrl(e.target.value)} placeholder="Atau masukkan URL logo (https://...)" className="text-xs" />
              </div>

              {/* Background Halaman Login Admin */}
              <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground">Background Halaman Login Admin</Label>
              <p className="text-[11px] text-muted-foreground">Gambar latar belakang untuk halaman login admin.</p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                  {adminLoginBgUrl ? <img src={adminLoginBgUrl} alt="Admin Login BG" className="w-full h-full object-cover" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input ref={adminLoginBgInputRef} type="file" accept="image/*" className="hidden" onChange={handleAdminLoginBgUpload} />
                  <Button size="sm" variant="outline" onClick={() => adminLoginBgInputRef.current?.click()} disabled={uploadingAdminLoginBg}>
                    {uploadingAdminLoginBg ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    {uploadingAdminLoginBg ? "Mengupload..." : "Upload Background"}
                  </Button>
                  {adminLoginBgUrl && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setAdminLoginBgUrl("")}>Hapus</Button>}
                </div>
              </div>
              <Input value={adminLoginBgUrl} onChange={e => setAdminLoginBgUrl(e.target.value)} placeholder="Atau masukkan URL gambar background (https://...)" className="text-xs" />
              </div>

              {/* Background Portal Jamaah Login */}
              <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground">Background Portal Jamaah Login</Label>
              <p className="text-[11px] text-muted-foreground">Gambar latar belakang untuk halaman login portal jamaah.</p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                  {loginBgUrl ? <img src={loginBgUrl} alt="Login BG" className="w-full h-full object-cover" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input ref={loginBgInputRef} type="file" accept="image/*" className="hidden" onChange={handleLoginBgUpload} />
                  <Button size="sm" variant="outline" onClick={() => loginBgInputRef.current?.click()} disabled={uploadingLoginBg}>
                    {uploadingLoginBg ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    {uploadingLoginBg ? "Mengupload..." : "Upload Background"}
                  </Button>
                  {loginBgUrl && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setLoginBgUrl("")}>Hapus</Button>}
                </div>
              </div>
              <Input value={loginBgUrl} onChange={e => setLoginBgUrl(e.target.value)} placeholder="Atau masukkan URL gambar background (https://...)" className="text-xs" />
              </div>

              {/* Banner Portal Jamaah Login */}
              <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground">Banner Portal Jamaah Login</Label>
              <p className="text-[11px] text-muted-foreground">Gambar banner untuk halaman login portal jamaah.</p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                  {loginBannerUrl ? <img src={loginBannerUrl} alt="Login Banner" className="w-full h-full object-cover" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input ref={loginBannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleLoginBannerUpload} />
                  <Button size="sm" variant="outline" onClick={() => loginBannerInputRef.current?.click()} disabled={uploadingLoginBanner}>
                    {uploadingLoginBanner ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                    {uploadingLoginBanner ? "Mengupload..." : "Upload Banner"}
                  </Button>
                  {loginBannerUrl && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setLoginBannerUrl("")}>Hapus</Button>}
                </div>
              </div>
              <Input value={loginBannerUrl} onChange={e => setLoginBannerUrl(e.target.value)} placeholder="Atau masukkan URL gambar banner (https://...)" className="text-xs" />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground">Nama Organisasi</Label>
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
            <div className="grid grid-cols-1 gap-3">
              {PAGE_TITLE_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input value={pageTitles[key] || ""} onChange={e => setPageTitles(prev => ({ ...prev, [key]: e.target.value }))} placeholder={label} />
                </div>
              ))}
            </div>
          </div>

          {/* Desa & Kelompok — drag to reorder */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm text-foreground">Desa &amp; Kelompok</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Seret <GripVertical className="inline w-3 h-3" /> untuk mengubah urutan</p>
              </div>
              <Button size="sm" variant="outline" onClick={addDesa}><Plus className="w-3.5 h-3.5 mr-1" /> Tambah Desa</Button>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="desa-list" type="DESA">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {Object.entries(desaKelompokMap).map(([desa, kelompoks], desaIdx) => (
                      <Draggable key={desa} draggableId={`desa-${desa}`} index={desaIdx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border border-border rounded-xl p-4 space-y-3 bg-card ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <div {...provided.dragHandleProps} className="text-muted-foreground cursor-grab hover:text-foreground">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <Input className="font-semibold" defaultValue={desa} key={desa} onBlur={e => renameDesa(desa, e.target.value)} />
                              <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeDesa(desa)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                            <Droppable droppableId={`kelompok-${desa}`} type="KELOMPOK">
                              {(kProvided) => (
                                <div {...kProvided.droppableProps} ref={kProvided.innerRef} className="space-y-2 ml-6">
                                  {kelompoks.map((k, idx) => (
                                    <Draggable key={`${desa}-${idx}`} draggableId={`kelompok-${desa}-${idx}`} index={idx}>
                                      {(kDrag, kSnap) => (
                                        <div
                                          ref={kDrag.innerRef}
                                          {...kDrag.draggableProps}
                                          className={`flex items-center gap-2 ${kSnap.isDragging ? "shadow-md" : ""}`}
                                        >
                                          <div {...kDrag.dragHandleProps} className="text-muted-foreground cursor-grab hover:text-foreground">
                                            <GripVertical className="w-3.5 h-3.5" />
                                          </div>
                                          <Input className="text-sm" defaultValue={k} key={`${desa}-${idx}-${k}`} onBlur={e => renameKelompok(desa, idx, e.target.value)} />
                                          <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeKelompok(desa, idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {kProvided.placeholder}
                                  <Button size="sm" variant="outline" className="w-full" onClick={() => addKelompok(desa)}><Plus className="w-3.5 h-3.5 mr-1" /> Tambah Kelompok</Button>
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Pengaturan
          </Button>
        </TabsContent>

        {/* ---- TAB SURVEI ---- */}
        <TabsContent value="surveys" className="mt-4">
          <SurveyManager />
        </TabsContent>

        {/* ---- TAB AKSES PENGGUNA ---- */}
        <TabsContent value="users" className="mt-4">
          <UserRoleManager />
        </TabsContent>

        {/* ---- TAB GOOGLE SHEET ---- */}
        <TabsContent value="gsheet" className="mt-4">
          <GoogleSheetSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}