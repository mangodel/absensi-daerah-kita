import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { useAppConfig } from "@/lib/AppConfigContext";

const SESSION_KEY = "volunteer_operator";

export default function VolunteerLogin({ onSuccess }) {
  const { config } = useAppConfig();
  const [nama, setNama] = useState("");
  const [phone, setPhone] = useState("");
  const [kelompok, setKelompok] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Ambil daftar kelompok dari AppConfig
  const desaKelompokMap = (() => {
    try { return JSON.parse(config.desa_kelompok_map || "{}"); } catch { return {}; }
  })();
  const allKelompok = Object.values(desaKelompokMap).flat();

  // Cari desa berdasarkan kelompok yang dipilih
  const desaFromKelompok = Object.entries(desaKelompokMap).find(([, arr]) => arr.includes(kelompok))?.[0] || "";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nama.trim() || !kelompok) return;
    setIsLoading(true);

    const operator = {
      id: `vol_${Date.now()}`,
      nama: nama.trim(),
      phone: phone.trim(),
      desa: desaFromKelompok,
      kelompok: kelompok,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(operator));
    onSuccess(operator);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Identitas Volunteer</h1>
        <p className="text-sm text-muted-foreground">Masukkan nama dan pilih kelompok Anda</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="text-sm font-medium text-foreground">Nomor Telepon</label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Nomor telepon (opsional)"
                type="tel"
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Asal Kelompok *</label>
              {allKelompok.length > 0 ? (
                <Select value={kelompok} onValueChange={setKelompok} required>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Pilih kelompok Anda..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(desaKelompokMap).map(([desa, kelompoklist]) => (
                      kelompoklist.map(k => (
                        <SelectItem key={k} value={k}>
                          {k} <span className="text-muted-foreground text-xs">({desa})</span>
                        </SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={kelompok}
                  onChange={e => setKelompok(e.target.value)}
                  placeholder="Nama kelompok..."
                  disabled={isLoading}
                  className="h-11"
                  required
                />
              )}
              {desaFromKelompok && (
                <p className="text-xs text-muted-foreground">Desa: {desaFromKelompok}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={!nama.trim() || !kelompok || isLoading}
            >
              {isLoading ? "Menyimpan..." : "Mulai Scan →"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}