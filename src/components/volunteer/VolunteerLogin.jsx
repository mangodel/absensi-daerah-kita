import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Users, Phone } from "lucide-react";

const SESSION_KEY = "volunteer_operator";

export default function VolunteerLogin({ onSuccess }) {
  const [nama, setNama] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members-volunteer"],
    queryFn: () => base44.entities.Member.list(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Cari member dengan nama dan nomor telepon yang cocok
      const cleanPhone = phone.replace(/\D/g, "");
      const matched = members.find(m => 
        m.full_name?.toLowerCase().trim() === nama.toLowerCase().trim() &&
        (m.phone?.replace(/\D/g, "") === cleanPhone || m.whatsapp?.replace(/\D/g, "") === cleanPhone)
      );

      if (!matched) {
        setError("Nama dan nomor telepon tidak cocok dengan database. Periksa kembali data Anda.");
        return;
      }

      const operator = {
        id: matched.id,
        nama: matched.full_name,
        phone: phone.trim(),
        desa: matched.desa || "",
        kelompok: matched.kelompok || "",
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(operator));
      onSuccess(operator);
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Login Volunteer</h1>
          <p className="text-sm text-muted-foreground">Masukkan nama dan nomor telepon Anda</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nama Lengkap *</label>
                <Input
                  autoFocus
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="Nama lengkap Anda..."
                  disabled={isLoading}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nomor Telepon *</label>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="08xxxxxxxx atau 02xxxxxxxx"
                    disabled={isLoading}
                    className="h-11 flex-1"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Gunakan nomor yang terdaftar di database anggota</p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base" 
                disabled={!nama.trim() || !phone.trim() || isLoading}
              >
                {isLoading ? "Memverifikasi..." : "Masuk →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}