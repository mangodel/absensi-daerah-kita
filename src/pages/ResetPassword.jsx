import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { useAppConfig } from "@/lib/AppConfigContext";

export default function ResetPassword() {
   const { config } = useAppConfig();
   const logoSrc = config.login_logo_url || config.logo_url;
   const daerahLogoSrc = config.daerah_logo_url;
   const orgName = config.org_name || "Sistem Organisasi";

  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (!resetToken) {
      setError("Token reset tidak valid. Gunakan link dari email Anda.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Gagal mereset password. Link mungkin sudah kadaluarsa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full shadow-lg space-y-6">
        <div className="text-center space-y-3">
          {daerahLogoSrc && (
            <div className="flex justify-center mb-2">
              <img src={daerahLogoSrc} alt="Logo Daerah" className="h-12 w-auto object-contain" />
            </div>
          )}
          {logoSrc ? (
            <img src={logoSrc} alt={orgName} className="h-16 w-auto object-contain mx-auto" />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{orgName}</h1>
            <p className="text-sm text-muted-foreground mt-1">Buat Password Baru</p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-12 h-12 text-accent" />
              <p className="font-semibold text-foreground">Password Berhasil Diubah!</p>
              <p className="text-sm text-muted-foreground">Silakan login dengan password baru Anda.</p>
            </div>
            <Button className="w-full" onClick={() => window.location.href = "/login"}>
              Ke Halaman Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Password Baru</Label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Konfirmasi Password</Label>
              <Input
                type="password"
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {!resetToken && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Token tidak ditemukan. Pastikan Anda membuka link dari email reset password.
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading || !resetToken}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </Button>

            <button
              type="button"
              onClick={() => window.location.href = "/login"}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
            >
              ← Kembali ke login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}