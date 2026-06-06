import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, Mail, User, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function JamaahSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState("register"); // "register" | "match" | "claim" | "family" | "success"
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [matchedMembers, setMatchedMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyForm, setFamilyForm] = useState({ full_name: "", gender: "", marital_status: "" });

  // Fungsi untuk mencocokkan nama (fuzzy match sederhana)
  const fuzzyMatch = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 80;
    
    // Cek kesamaan kata per kata
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2))).length;
    return (commonWords / Math.max(words1.length, words2.length)) * 100;
  };

  // Step 1: Register user baru
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Isi semua field terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      // Register via auth SDK (tanpa login)
      await base44.auth.register({ email: formData.email, password: formData.password });
      
      // Cari member yang mirip berdasarkan nama & email
      const allMembers = await base44.entities.Member.list();
      const matched = allMembers
        .map(m => ({
          ...m,
          nameScore: fuzzyMatch(m.full_name, formData.fullName),
          emailScore: m.email ? (m.email.toLowerCase() === formData.email.toLowerCase() ? 100 : 0) : 0,
        }))
        .filter(m => m.nameScore >= 40 || m.emailScore >= 90)
        .sort((a, b) => (b.nameScore + b.emailScore) - (a.nameScore + a.emailScore));

      setMatchedMembers(matched);
      setRegisteredUser({ email: formData.email, fullName: formData.fullName });
      
      if (matched.length > 0) {
        setStep("match");
      } else {
        setStep("family");
      }
    } catch (err) {
      toast.error(err.message || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Claim member yang cocok
  const handleClaim = async () => {
    if (!selectedMember || !registeredUser) return;

    setLoading(true);
    try {
      // Tunggu user terdaftar di DB
      await new Promise(r => setTimeout(r, 1000));
      
      // Cari user yang baru register
      const allUsers = await base44.entities.User.list();
      const newUser = allUsers.find(u => u.email?.toLowerCase() === registeredUser.email.toLowerCase());
      
      if (newUser) {
        // Link member ke user dengan update email
        await base44.entities.Member.update(selectedMember.id, {
          email: registeredUser.email
        });
        
        // Update user dengan nama dari member
        await base44.entities.User.update(newUser.id, {
          full_name: selectedMember.full_name
        });
        
        toast.success("Data kepala keluarga berhasil diklaim!");
      }
      
      setStep("family");
    } catch (err) {
      toast.error(err.message || "Gagal mengklaim data");
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Skip claim (buat user baru tanpa member)
  const handleSkipClaim = () => {
    setStep("family");
  };

  // Add family member
  const handleAddFamilyMember = () => {
    if (!familyForm.full_name) {
      toast.error("Masukkan nama anggota keluarga");
      return;
    }
    setFamilyMembers(prev => [...prev, { ...familyForm, id: Date.now() }]);
    setFamilyForm({ full_name: "", gender: "", marital_status: "" });
  };

  // Remove family member
  const handleRemoveFamilyMember = (id) => {
    setFamilyMembers(prev => prev.filter(m => m.id !== id));
  };

  // Submit family members
  const handleSaveFamily = async () => {
    setLoading(true);
    try {
      // Tunggu user terdaftar
      await new Promise(r => setTimeout(r, 1000));
      
      // Cari user yang baru register
      const allUsers = await base44.entities.User.list();
      const newUser = allUsers.find(u => u.email?.toLowerCase() === registeredUser.email.toLowerCase());
      
      if (!newUser) throw new Error("User tidak ditemukan");

      // Get desa & kelompok dari claimed member atau gunakan default
      let desa = "Default";
      let kelompok = "Default";
      let family_group = formData.fullName;

      if (selectedMember) {
        desa = selectedMember.desa;
        kelompok = selectedMember.kelompok;
        family_group = selectedMember.family_group || formData.fullName;
      }

      // Buat member records untuk setiap anggota keluarga
      const memberRecords = [
        {
          full_name: formData.fullName,
          email: registeredUser.email,
          desa,
          kelompok,
          family_group,
          status: "Aktif"
        },
        ...familyMembers.map(m => ({
          full_name: m.full_name,
          gender: m.gender || undefined,
          marital_status: m.marital_status || undefined,
          desa,
          kelompok,
          family_group,
          status: "Aktif"
        }))
      ];

      // Batch create members (atau create satu per satu jika tidak ada bulkCreate)
      for (const memberData of memberRecords) {
        try {
          await base44.entities.Member.create(memberData);
        } catch (err) {
          console.error("Error creating member:", err);
        }
      }

      toast.success(`Pendaftaran berhasil! ${memberRecords.length} anggota keluarga terdaftar.`);
      setStep("success");
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan data keluarga");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {step === "register" && (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl">Daftar Portal Jamaah</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Buat akun untuk mengakses data jamaah Anda</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Nama Anda"
                      value={formData.fullName}
                      onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="email"
                      placeholder="email@contoh.com"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Password</Label>
                  <Input
                    type="password"
                    placeholder="Minimal 8 karakter"
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {loading ? "Mendaftar..." : "Daftar"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>
                  Sudah punya akun? Login
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === "match" && (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Data Jamaah Cocok Ditemukan</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Pilih data Anda untuk diklaim:</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {matchedMembers.map(member => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedMember?.id === member.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-semibold text-sm">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">{member.desa} / {member.kelompok}</p>
                  {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleClaim}
                  disabled={!selectedMember || loading}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Klaim Data Ini
                </Button>
                <Button variant="outline" onClick={handleSkipClaim} disabled={loading} className="flex-1">
                  Skip
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === "family" && (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Daftarkan Anggota Keluarga</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Opsional: Tambahkan data istri, anak, dan keluarga lainnya</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Kepala keluarga info */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Kepala Keluarga:</p>
                <p className="font-semibold text-sm">{formData.fullName}</p>
              </div>

              {/* Form tambah anggota */}
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs font-semibold">Tambah Anggota Keluarga</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Nama lengkap"
                    value={familyForm.full_name}
                    onChange={e => setFamilyForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="text-sm"
                  />
                  <select
                    value={familyForm.gender}
                    onChange={e => setFamilyForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2"
                  >
                    <option value="">Jenis Kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                  <select
                    value={familyForm.marital_status}
                    onChange={e => setFamilyForm(prev => ({ ...prev, marital_status: e.target.value }))}
                    className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2"
                  >
                    <option value="">Status Pernikahan</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Cerai">Cerai</option>
                    <option value="Janda/Duda">Janda/Duda</option>
                  </select>
                  <Button
                    type="button"
                    onClick={handleAddFamilyMember}
                    variant="outline"
                    size="sm"
                    className="w-full text-sm gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah Anggota
                  </Button>
                </div>
              </div>

              {/* List anggota yang sudah ditambah */}
              {familyMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Anggota Keluarga ({familyMembers.length}):</p>
                  {familyMembers.map(member => (
                    <div key={member.id} className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.gender && `${member.gender}`}
                          {member.gender && member.marital_status && ' • '}
                          {member.marital_status}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFamilyMember(member.id)}
                        className="text-destructive hover:bg-destructive/10 p-1.5 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveFamily}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {familyMembers.length > 0 ? `Simpan ${familyMembers.length + 1} Anggota` : "Lanjut Tanpa Anggota"}
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === "success" && (
          <>
            <CardHeader className="pb-3 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Pendaftaran Berhasil!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-center">
              {selectedMember ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Data <strong>{selectedMember.full_name}</strong> sudah diklaim.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Anda bisa login sekarang dan mengakses portal jamaah.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Akun baru Anda berhasil dibuat.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hubungi admin jika ingin menautkan dengan data anggota yang sudah terdaftar.
                  </p>
                </>
              )}
              <Button onClick={() => navigate("/login")} className="w-full mt-4">
                Lanjut ke Login
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}