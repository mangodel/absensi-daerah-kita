import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, Mail, User, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function JamaahSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState("register"); // "register" | "otp" | "success"
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Register user baru
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Isi semua field terlebih dahulu");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.register({ email: formData.email, password: formData.password });
      toast.success("Kode OTP telah dikirim ke email Anda");
      setStep("otp");
    } catch (err) {
      toast.error(err.message || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verifikasi OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      toast.error("Masukkan kode OTP yang valid");
      return;
    }

    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: formData.email, otpCode });
      base44.auth.setToken(result.access_token);
      let claimedMemberName = null;
      // Simpan nama lengkap ke profil user
      if (formData.fullName) {
        try {
          await base44.auth.updateMe({ full_name: formData.fullName });
        } catch {}

        // Auto-claim: cari member dengan nama yang sama yang belum punya email, lalu tautkan
        try {
          const matchingMembers = await base44.entities.Member.filter({ full_name: formData.fullName });
          const unclaimed = matchingMembers.find(m => !m.email);
          if (unclaimed) {
            await base44.entities.Member.update(unclaimed.id, { email: formData.email });
            claimedMemberName = unclaimed.full_name;
          }
        } catch {}
      }
      if (claimedMemberName) {
        toast.success(`Data jamaah "${claimedMemberName}" berhasil diklaim! Mengarahkan ke portal...`);
      } else {
        toast.success("Pendaftaran berhasil! Mengarahkan ke portal...");
      }
      setStep("success");
    } catch (err) {
      toast.error(err.message || "Verifikasi OTP gagal");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    try {
      await base44.auth.resendOtp(formData.email);
      toast.success("Kode OTP baru telah dikirim");
    } catch (err) {
      toast.error(err.message || "Gagal mengirim ulang OTP");
    }
  };

  // Auto-redirect ke portal setelah sukses
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        window.location.href = "/jamaah";
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Redirect ke portal jamaah
  const goToPortal = () => {
    window.location.href = "/jamaah";
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 8 karakter"
                      value={formData.password}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {loading ? "Mendaftar..." : "Daftar"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/jamaah-login")}>
                  Sudah punya akun? Login
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === "otp" && (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Verifikasi Email
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Masukkan kode OTP yang dikirim ke <strong>{formData.email}</strong>
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Kode OTP"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {loading ? "Memverifikasi..." : "Verifikasi"}
                </Button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="w-full text-xs text-primary hover:underline"
                >
                  Tidak menerima kode? Kirim ulang
                </button>
              </form>
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
              <p className="text-sm text-muted-foreground">
                Akun <strong>{formData.email}</strong> telah terverifikasi.
              </p>
              <p className="text-xs text-muted-foreground">
                Anda akan diarahkan ke Portal Jamaah secara otomatis...
              </p>
              <Button onClick={goToPortal} className="w-full mt-4">
                Masuk ke Portal Jamaah
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}