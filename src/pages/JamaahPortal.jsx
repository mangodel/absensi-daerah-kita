import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, ClipboardList, QrCode, LogOut, CheckCircle, AlertCircle, Loader2, ChevronRight, Users, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const COUNTRY_CODES = [
  { label: "Indonesia (+62)", value: "Indonesia" },
  { label: "Australia (+61)", value: "Australia" },
  { label: "New Zealand (+64)", value: "New Zealand" },
  { label: "Cook Islands (+682)", value: "Cook Islands" },
];

const EDITABLE_FIELDS = [
  { key: "full_name", label: "Nama Lengkap", type: "text", placeholder: "Nama lengkap Anda" },
  { key: "gender", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"] },
  { key: "marital_status", label: "Status Pernikahan", type: "select", options: ["Menikah", "Belum Menikah", "Cerai", "Janda/Duda"] },
  { key: "birth_year", label: "Tahun Lahir", type: "number", placeholder: "1990" },
  { key: "visa_status", label: "Status Visa", type: "select", options: ["PR", "Citizen", "Student", "Sponsor", "Bridging", "WHV", "Tourist", "Partner", "Lainnya"] },
  { key: "employment", label: "Jenis Pekerjaan", type: "select", options: ["Bekerja", "Tidak Bekerja", "Belum Bekerja", "Student", "Retired"] },
  { key: "address", label: "Alamat", type: "textarea", placeholder: "Alamat Anda" },
  { key: "phone", label: "Nomor Telepon", type: "phone", placeholder: "08xxxx / 02xxxx" },
  { key: "whatsapp", label: "Nomor WhatsApp", type: "phone", placeholder: "08xxxx / 02xxxx" },
  { key: "emergency_contact", label: "Kontak Darurat (Nama)", type: "text", placeholder: "Nama orang yang dapat dihubungi" },
  { key: "emergency_phone", label: "Nomor Telepon Kontak Darurat", type: "phone", placeholder: "08xxxx / 02xxxx" },
];

const READONLY_FIELDS = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "email", label: "Email" },
  { key: "desa", label: "Desa" },
  { key: "kelompok", label: "Kelompok" },
  { key: "dapukan", label: "Dapukan" },
  { key: "visa_status", label: "Status Visa" },
  { key: "employment", label: "Pekerjaan" },
];

export default function JamaahPortal() {
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();
  const [jamaahUser, setJamaahUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [emailError, setEmailError] = useState("");
  const [registeringEmail, setRegisteringEmail] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [familyEditData, setFamilyEditData] = useState({});

  // Check jamaah login status on mount
  useEffect(() => {
    const checkJamaahAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setJamaahUser(currentUser);
      } catch (error) {
        setJamaahUser(null);
      }
    };
    checkJamaahAuth();
  }, []);

  // Cari data member berdasarkan email user jamaah
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["my-member", jamaahUser?.email],
    queryFn: () => base44.entities.Member.list(),
    enabled: !!jamaahUser,
  });

  const myMember = jamaahUser?.email
    ? members.find(m => m.email?.toLowerCase() === jamaahUser?.email?.toLowerCase())
    : null;

  // Ambil semua anggota keluarga dengan family_group yang sama
  const familyMembers = myMember
    ? members.filter(m => m.family_group === myMember.family_group)
    : [];

  useEffect(() => {
    if (myMember) {
      setEditData({
        full_name: myMember.full_name || "",
        gender: myMember.gender || "",
        marital_status: myMember.marital_status || "",
        birth_year: myMember.birth_year || "",
        visa_status: myMember.visa_status || "",
        employment: myMember.employment || "",
        address: myMember.address || "",
        phone: myMember.phone || "",
        phone_country_code: myMember.phone_country_code || "Indonesia",
        whatsapp: myMember.whatsapp || "",
        whatsapp_country_code: myMember.whatsapp_country_code || "Indonesia",
        emergency_contact: myMember.emergency_contact || "",
        emergency_phone: myMember.emergency_phone || "",
        emergency_phone_country_code: myMember.emergency_phone_country_code || "Indonesia",
      });
    }
  }, [myMember?.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Member.update(myMember.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-member"] });
      toast.success("Profil berhasil diperbarui");
    },
    onError: () => toast.error("Gagal menyimpan perubahan"),
  });

  const updateFamilyMutation = useMutation({
    mutationFn: (data) => base44.entities.Member.update(editingFamily.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-member"] });
      setEditingFamily(null);
      toast.success("Data anggota keluarga berhasil diperbarui");
    },
    onError: () => toast.error("Gagal menyimpan perubahan"),
  });

  const handleSave = () => {
    if (!myMember) return;
    updateMutation.mutate(editData);
  };

  const handleEditFamilyMember = (member) => {
    setEditingFamily(member);
    setFamilyEditData({
      full_name: member.full_name || "",
      gender: member.gender || "",
      marital_status: member.marital_status || "",
      phone: member.phone || "",
      phone_country_code: member.phone_country_code || "Indonesia",
      address: member.address || "",
    });
  };

  const handleSaveFamily = () => {
    if (!editingFamily) return;
    updateFamilyMutation.mutate(familyEditData);
  };

  const generateEmailFromName = (name) => {
    if (!name) return "";
    return name.toLowerCase().replace(/\s+/g, ".").substring(0, 20);
  };

  const handleRegisterEmail = async () => {
    try {
      setEmailError("");
      setRegisteringEmail(true);
      const suggestedEmail = generateEmailFromName(editData.full_name);
      if (!suggestedEmail) {
        setEmailError("Isikan nama lengkap terlebih dahulu");
        return;
      }

      // Check duplikasi email
      const existingUsers = await base44.entities.User.list();
      const emailExists = existingUsers.some(u => u.email.startsWith(suggestedEmail));
      if (emailExists) {
        setEmailError("Email sudah terdaftar. Silakan gunakan nama yang berbeda.");
        return;
      }

      // Update user email
      await base44.auth.updateMe({ email: suggestedEmail });
      toast.success(`Email terdaftar: ${suggestedEmail}`);
    } catch (err) {
      setEmailError(err.message || "Gagal mendaftarkan email");
    } finally {
      setRegisteringEmail(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    setJamaahUser(null);
    window.location.href = "/jamaah-login";
  };

  if (loadingMembers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{jamaahUser?.full_name || "Portal Jamaah"}</p>
              <p className="text-[10px] text-muted-foreground">{jamaahUser?.email || "Guest"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {jamaahUser?.email ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            ) : (
              <>
                <Link to="/jamaah-login">
                  <Button variant="outline" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link to="/jamaah/signup">
                  <Button size="sm">
                    Daftar
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!myMember && (
          <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Data jamaah tidak ditemukan</p>
              <p className="text-xs text-amber-700 mt-0.5">Hubungi admin untuk menautkan akun Anda dengan data anggota, atau <Link to="/jamaah/signup" className="underline font-semibold">daftar akun baru di sini</Link>.</p>
            </div>
          </div>
        )}

        {/* Profil */}
        <div className="space-y-4 mb-6">
          {myMember ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                   <CheckCircle className="w-4 h-4 text-accent" />
                   Data Jamaah
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {READONLY_FIELDS.map(f => {
                    const val = f.key === "email" ? (myMember?.email || jamaahUser?.email) : myMember[f.key];
                    if (!val) return null;
                    return (
                      <div key={f.key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{f.label}</span>
                        <span className="text-xs font-medium text-foreground">{val}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Data Jamaah / Data Diri (Dapat Diedit)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {EDITABLE_FIELDS.map(f => {
                    const isPhoneField = f.type === "phone";
                    const countryCodeKey = isPhoneField ? f.key.replace("phone", "country_code").replace("_phone", "_phone_country_code") : null;
                    
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs">{f.label}</Label>
                        {f.type === "textarea" ? (
                          <Textarea
                            value={editData[f.key] || ""}
                            onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            rows={3}
                            className="text-sm"
                          />
                        ) : f.type === "select" ? (
                          <Select value={editData[f.key] || ""} onValueChange={val => setEditData(prev => ({ ...prev, [f.key]: val }))}>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder={`Pilih ${f.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {f.options.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : f.type === "number" ? (
                          <Input
                            type="number"
                            value={editData[f.key] || ""}
                            onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value ? parseInt(e.target.value) : "" }))}
                            placeholder={f.placeholder}
                            className="text-sm"
                          />
                        ) : isPhoneField ? (
                          <div className="flex gap-2">
                            <Select value={editData[countryCodeKey] || "Indonesia"} onValueChange={val => setEditData(prev => ({ ...prev, [countryCodeKey]: val }))}>
                              <SelectTrigger className="w-32 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRY_CODES.map(c => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={editData[f.key] || ""}
                              onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="text-sm flex-1"
                            />
                          </div>
                        ) : (
                          <Input
                            value={editData[f.key] || ""}
                            onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                  <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Simpan Perubahan
                  </Button>
                </CardContent>
              </Card>

              {/* Email Registration */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Pendaftaran Email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Email akan dibuat otomatis dari nama lengkap Anda untuk keamanan (tidak dapat dirubah).</p>
                  <div className="bg-white rounded-md p-3 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Email yang akan didaftarkan:</p>
                    <p className="text-sm font-semibold text-foreground">{generateEmailFromName(editData.full_name) || "—"}</p>
                  </div>
                  {emailError && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">{emailError}</div>
                  )}
                  <Button 
                    onClick={handleRegisterEmail} 
                    disabled={registeringEmail || !editData.full_name} 
                    variant="outline" 
                    className="w-full"
                  >
                    {registeringEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Daftarkan Email
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">Data anggota belum tersedia</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Anggota Keluarga */}
        {familyMembers.length > 0 && (
          <Card className="mb-6 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                Anggota Keluarga ({familyMembers.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Grup: {myMember?.family_group}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...familyMembers].sort((a, b) => {
                const aIsKepala = a.id === myMember?.id ? 0 : 1;
                const bIsKepala = b.id === myMember?.id ? 0 : 1;
                return aIsKepala - bIsKepala;
              }).map(member => {
                const isKepalaKeluarga = member.id === myMember?.id;
                return (
                  <div key={member.id} className={`p-3 rounded-lg border ${isKepalaKeluarga ? 'border-primary/30 bg-primary/5' : 'border-border'} flex items-center justify-between`}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{member.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {isKepalaKeluarga && <Badge className="text-[10px] h-auto py-0.5">Kepala Keluarga</Badge>}
                        {member.gender && <span className="text-xs text-muted-foreground">{member.gender}</span>}
                        {member.marital_status && <span className="text-xs text-muted-foreground">• {member.marital_status}</span>}
                      </div>
                      {member.phone && <p className="text-xs text-muted-foreground mt-1">{member.phone}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditFamilyMember(member)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Navigasi ke halaman terpisah */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link to="/jamaah/survey">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 hover:border-primary/50">
              <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Survei</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Isi survei dari admin</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/jamaah/absensi">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-accent/20 hover:border-accent/50">
              <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Absensi QR</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Scan QR untuk hadir</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>


      </div>

      {/* Dialog Edit Anggota Keluarga */}
      <Dialog open={!!editingFamily} onOpenChange={(open) => !open && setEditingFamily(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Data Anggota Keluarga</DialogTitle>
          </DialogHeader>
          {editingFamily && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Nama Lengkap</Label>
                <Input
                  value={familyEditData.full_name || ""}
                  onChange={e => setFamilyEditData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Jenis Kelamin</Label>
                  <Select value={familyEditData.gender || ""} onValueChange={val => setFamilyEditData(prev => ({ ...prev, gender: val }))}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>-</SelectItem>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Status Pernikahan</Label>
                  <Select value={familyEditData.marital_status || ""} onValueChange={val => setFamilyEditData(prev => ({ ...prev, marital_status: val }))}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>-</SelectItem>
                      <SelectItem value="Menikah">Menikah</SelectItem>
                      <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                      <SelectItem value="Cerai">Cerai</SelectItem>
                      <SelectItem value="Janda/Duda">Janda/Duda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Nomor Telepon</Label>
                <div className="flex gap-2">
                  <Select value={familyEditData.phone_country_code || "Indonesia"} onValueChange={val => setFamilyEditData(prev => ({ ...prev, phone_country_code: val }))}>
                    <SelectTrigger className="w-32 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indonesia">+62</SelectItem>
                      <SelectItem value="Australia">+61</SelectItem>
                      <SelectItem value="New Zealand">+64</SelectItem>
                      <SelectItem value="Cook Islands">+682</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={familyEditData.phone || ""}
                    onChange={e => setFamilyEditData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="08xxxx"
                    className="text-sm flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Alamat</Label>
                <Textarea
                  value={familyEditData.address || ""}
                  onChange={e => setFamilyEditData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Alamat lengkap"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingFamily(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveFamily} disabled={updateFamilyMutation.isPending}>
              {updateFamilyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}