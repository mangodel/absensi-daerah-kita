import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function JamaahSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState("register"); // "register" | "match" | "claim" | "success"
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [matchedMembers, setMatchedMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [registeredUser, setRegisteredUser] = useState(null);

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
        setStep("success");
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
        
        toast.success("Data berhasil diklaim! Anda bisa login sekarang.");
      }
      
      setStep("success");
    } catch (err) {
      toast.error(err.message || "Gagal mengklaim data");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Skip claim (buat user baru tanpa member)
  const handleSkipClaim = () => {
    setStep("success");
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