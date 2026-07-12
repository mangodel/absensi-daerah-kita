import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Chrome, KeyRound, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { config } = useAppConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const logoSrc = config.login_logo_url || config.logo_url;
  const orgName = config.org_name || "Sistem Organisasi";
  const orgSubtitle = config.org_subtitle || "";
  const adminLoginBg = config.admin_login_bg_url || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    base44.auth.loginWithProvider("google", "/");
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

  const bgStyle = adminLoginBg
    ? { backgroundImage: `url(${adminLoginBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }
    : { background: "linear-gradient(to bottom right, hsl(var(--primary) / 0.05), hsl(var(--background)), hsl(var(--accent) / 0.05))" };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={bgStyle}>
      {adminLoginBg && <div className="absolute inset-0 bg-black/40" />}
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full shadow-lg space-y-6 relative z-10">
        {/* Logo & Nama Organisasi */}
        <div className="text-center space-y-3">
          {logoSrc ? (
            <img src={logoSrc} alt={orgName} className="h-16 w-auto object-contain mx-auto" />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <LogIn className="w-7 h-7 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{orgName}</h1>
            {orgSubtitle && <p className="text-sm text-muted-foreground mt-0.5">{orgSubtitle}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Masuk untuk mengakses portal admin</p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <a href="/jamaah-login" className="text-primary hover:underline">
              Portal Jamaah →
            </a>
            <span className="text-border">|</span>
            <a href="/scanner-volunteer" className="text-primary hover:underline">
              Volunteer Scanner →
            </a>
          </div>
        </div>

        {!showForgot ? (
          <>
            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Masuk dengan Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">atau</span></div>
            </div>

            {/* Form Email/Password */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input type="email" placeholder="email@contoh.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Password</Label>
                  <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); }} className="text-xs text-primary hover:underline">
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                {loading ? "Masuk..." : "Masuk"}
              </Button>
            </form>
          </>
        ) : (
          /* Forgot Password */
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <KeyRound className="w-10 h-10 text-primary mx-auto" />
              <p className="font-semibold text-sm">Reset Password</p>
              <p className="text-xs text-muted-foreground">Masukkan email Anda dan kami akan kirim link reset password.</p>
            </div>
            {!forgotSuccess ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input type="email" placeholder="email@contoh.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoFocus />
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Kirim Link Reset
                </Button>
                <button type="button" onClick={() => { setShowForgot(false); setForgotSuccess(false); }} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
                  ← Kembali ke login
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="bg-accent/10 text-accent rounded-xl p-4 text-sm font-medium">
                  ✅ Link reset password telah dikirim ke email Anda (jika terdaftar).
                </div>
                <button type="button" onClick={() => { setShowForgot(false); setForgotSuccess(false); setForgotEmail(""); }} className="text-xs text-primary hover:underline">
                  ← Kembali ke login
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}