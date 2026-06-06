import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";

export default function Login() {
  const { config } = useAppConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const logoSrc = config.login_logo_url || config.logo_url;
  const orgName = config.org_name || "Sistem Organisasi";
  const orgSubtitle = config.org_subtitle || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await base44.auth.loginViaEmailPassword(email, password);
    window.location.href = "/";
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full shadow-lg space-y-6">
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
          <p className="text-xs text-muted-foreground">Masuk untuk mengakses portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Email</Label>
            <Input
              type="email"
              placeholder="email@contoh.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
            {loading ? "Masuk..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}