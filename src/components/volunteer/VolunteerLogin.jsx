import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Phone } from "lucide-react";

const SESSION_KEY = "volunteer_operator";

export default function VolunteerLogin({ onSuccess }) {
  const [nama, setNama] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const operator = {
      id: `vol_${Date.now()}`,
      nama: nama.trim(),
      phone: phone.trim(),
      desa: "",
      kelompok: "",
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(operator));
    onSuccess(operator);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Identitas Volunteer</h1>
          <p className="text-sm text-muted-foreground">Masukkan nama dan nomor telepon Anda</p>
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
                <label className="text-sm font-medium text-foreground">Nomor Telepon *</label>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="08xxxxxxxx"
                    disabled={isLoading}
                    className="h-11 flex-1"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={!nama.trim() || !phone.trim() || isLoading}
              >
                {isLoading ? "Menyimpan..." : "Mulai Scan →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}