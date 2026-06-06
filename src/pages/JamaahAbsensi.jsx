import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, QrCode, ArrowLeft, LogOut, AlertCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import PortalAttendanceScanner from "@/components/portal/PortalAttendanceScanner";

export default function JamaahAbsensi() {
  const { user } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["my-member", user?.email],
    queryFn: () => base44.entities.Member.list(),
    enabled: !!user,
  });

  const myMember = members.find(
    m => m.phone === user?.phone ||
    (user?.full_name && m.full_name?.toLowerCase() === user?.full_name?.toLowerCase())
  ) || members[0];

  // Check if user is a registered volunteer
  const isVolunteer = myMember && myMember.dapukan_level && (myMember.dapukan_level === "Daerah" || myMember.dapukan_level === "Desa" || myMember.dapukan_level === "Kelompok");
  const volunteerLevel = myMember?.dapukan_level;

  const handleLogout = () => {
    base44.auth.logout();
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Akses ditolak jika bukan volunteer terdaftar
  if (!isVolunteer) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-30 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/jamaah">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Absensi QR</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10 gap-1.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <Lock className="w-12 h-12 text-destructive opacity-50" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Akses Terbatas</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fitur scanner absensi hanya dapat diakses oleh volunteer yang terdaftar di tingkat Daerah, Desa, atau Kelompok.
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Hubungi admin untuk mendaftarkan Anda sebagai volunteer.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Absensi QR</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Volunteer {volunteerLevel}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10 gap-1.5">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PortalAttendanceScanner member={myMember} user={user} volunteerLevel={volunteerLevel} />
      </div>
    </div>
  );
}