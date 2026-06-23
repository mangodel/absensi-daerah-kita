import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, Mail, Lock, QrCode, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAppConfig } from "@/lib/AppConfigContext";

export default function JamaahLogin() {
  const navigate = useNavigate();
  const { config } = useAppConfig();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await base44.auth.loginViaEmailPassword(formData.email, formData.password);
      // Hard redirect untuk reload auth state
      window.location.href = "/jamaah";
    } catch (err) {
      setError(err.message || "Email atau password salah");
      toast.error("Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await base44.auth.resetPasswordRequest(forgotEmail);
    } catch {}
    setForgotSuccess(true);
    setForgotLoading(false);
  };

  const loginBgUrl = config.login_bg_url || "";
  const loginBannerUrl = config.login_banner_url || "";
  const loginLogoUrl = config.login_logo_url || "";

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: loginBgUrl ? `url(${loginBgUrl})` : "linear-gradient(to bottom right, rgb(243 232 255), rgb(240 249 255))",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />
      
      <Card className="w-full max-w-md relative z-10">
        {loginBannerUrl && (
          <div className="w-full h-32 overflow-hidden rounded-t-lg">
            <img src={loginBannerUrl} alt="Banner" className="w-full h-full object-cover" />
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex flex-col items-center gap-3">
            {loginLogoUrl && (
              <img src={loginLogoUrl} alt="Logo" className="h-12 object-contain" />
            )}
            <div className="text-center">
              <CardTitle className="text-2xl">Portal Jamaah</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Login untuk mengakses data Anda</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

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
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Password</Label>
                <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(formData.email); }} className="text-xs text-primary hover:underline">
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  type="password"
                  placeholder="Password Anda"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? "Masuk..." : "Masuk"}
            </Button>

            {showForgot && !forgotSuccess && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-center space-y-1">
                  <KeyRound className="w-8 h-8 text-primary mx-auto" />
                  <p className="font-semibold text-sm">Reset Password</p>
                  <p className="text-xs text-muted-foreground">Masukkan email Anda untuk menerima link reset password.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <Button type="submit" variant="outline" className="w-full" disabled={forgotLoading}>
                    {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Kirim Link Reset
                  </Button>
                  <button type="button" onClick={() => setShowForgot(false)} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
                    ← Batal
                  </button>
                </form>
              </div>
            )}

            {forgotSuccess && (
              <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/10 p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-accent mx-auto" />
                <p className="text-sm font-medium">Link reset password telah dikirim ke email Anda (jika terdaftar).</p>
                <button type="button" onClick={() => { setShowForgot(false); setForgotSuccess(false); setForgotEmail(""); }} className="text-xs text-primary hover:underline">
                  ← Kembali ke login
                </button>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">atau</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/jamaah/signup")}
              disabled={loading}
            >
              Daftar Akun Baru
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate("/scanner-volunteer")}
            >
              <QrCode className="w-4 h-4" />
              Akses Volunteer Scan Absensi
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => navigate("/login")}
            >
              Kembali ke Login Admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}