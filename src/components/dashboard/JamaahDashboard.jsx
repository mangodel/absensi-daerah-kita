import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users, CalendarCheck, ClipboardList, Home, Phone, Mail, MapPin } from "lucide-react";
import { getFamilyMembersWithHead, sortFamilyMembers, getFamilyRole } from "@/lib/familyUtils";
import { getDapukanTitle } from "@/lib/constants";
import { MONTHS } from "@/lib/constants";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppConfig } from "@/lib/AppConfigContext";

export default function JamaahDashboard() {
  const { user } = useAuth();
  const { config } = useAppConfig();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances"],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list(),
  });

  // Cari data member berdasarkan email user
  const myMember = user?.email
    ? members.find(m => m.email?.toLowerCase() === user.email.toLowerCase())
    : null;

  // Ambil anggota keluarga
  const { familyMembers, familyHead } = getFamilyMembersWithHead(members, myMember);
  const sortedFamilyMembers = sortFamilyMembers(familyMembers, familyHead);

  // Filter attendance untuk diri sendiri + keluarga
  const familyIds = familyMembers.map(m => m.id);
  const familyAttendances = attendances.filter(a => familyIds.includes(a.member_id));
  const yearFamilyAttendances = familyAttendances.filter(a => a.year === Number(selectedYear));

  // Statistik kehadiran
  const myAttendances = attendances.filter(a => a.member_id === myMember?.id && a.year === Number(selectedYear));
  const myHadir = myAttendances.filter(a => a.status === "Hadir").length;
  const myRate = myAttendances.length > 0 ? Math.round((myHadir / myAttendances.length) * 100) : 0;

  // Kegiatan mendatang
  const upcomingEvents = events
    .filter(e => {
      if (!e.date) return false;
      const eventDate = new Date(e.date + "T23:59:59");
      return eventDate >= new Date();
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  // Data absensi per bulan untuk diri sendiri
  const myMonthlyStats = MONTHS.map((monthName, idx) => {
    const monthAtts = myAttendances.filter(a => a.month === idx + 1);
    if (monthAtts.length === 0) return null;
    const hadir = monthAtts.filter(a => a.status === "Hadir").length;
    return { month: monthName, hadir, total: monthAtts.length, rate: Math.round((hadir / monthAtts.length) * 100) };
  }).filter(Boolean);

  if (!myMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-foreground mb-1">Data Anda Belum Terhubung</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Data jamaah dengan email <strong>{user?.email}</strong> belum ditemukan dalam database.
          Hubungi admin untuk menautkan data jamaah Anda.
        </p>
        <Link to="/jamaah" className="mt-4 text-sm text-primary hover:underline">
          Buka Portal Jamaah →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-2">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Jamaah</h1>
          <p className="text-base text-muted-foreground">Data diri dan keluarga Anda</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kartu Profil Singkat */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Data Diri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Nama</p>
              <p className="font-medium text-foreground">{myMember.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Email</p>
              <p className="font-medium text-foreground truncate">{myMember.email || user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Desa / Kelompok</p>
              <p className="font-medium text-foreground">{myMember.desa} / {myMember.kelompok}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Dapukan</p>
              <Badge variant="outline" className="text-xs">
                {getDapukanTitle(myMember.dapukan, myMember.dapukan_level)}
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/jamaah" className="text-xs text-primary hover:underline flex items-center gap-1">
              <User className="w-3 h-3" /> Lihat profil lengkap
            </Link>
            {myMember.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> {myMember.phone}
              </span>
            )}
            {myMember.address && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {myMember.suburb ? `${myMember.suburb}, ${myMember.state}` : myMember.address}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Kehadiran Saya</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{myRate}%</p>
          <p className="text-xs text-muted-foreground">{myHadir}/{myAttendances.length} kegiatan {selectedYear}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Anggota Keluarga</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{familyMembers.length}</p>
          <p className="text-xs text-muted-foreground">{familyHead ? `KK: ${familyHead.full_name}` : "-"}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Kehadiran Keluarga</p>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {yearFamilyAttendances.length > 0
              ? Math.round((yearFamilyAttendances.filter(a => a.status === "Hadir").length / yearFamilyAttendances.length) * 100)
              : 0}%
          </p>
          <p className="text-xs text-muted-foreground">{yearFamilyAttendances.filter(a => a.status === "Hadir").length}/{yearFamilyAttendances.length} kegiatan {selectedYear}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-muted-foreground">Keluarga</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{myMember.family_group || "Mandiri"}</p>
          <p className="text-xs text-muted-foreground">{myMember.family_group ? "Grup keluarga" : "Tanpa grup"}</p>
        </div>
      </div>

      {/* Kegiatan Mendatang */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-accent" />
              Kegiatan Mendatang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingEvents.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.date), "dd MMM yyyy", { locale: id })}
                      {e.location ? ` · ${e.location}` : ""}
                      {e.time ? ` · ${e.time}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{e.level}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daftar Keluarga */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Anggota Keluarga
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedFamilyMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data keluarga.</p>
          ) : (
            <div className="space-y-2">
              {sortedFamilyMembers.map((m, i) => {
                const role = getFamilyRole(m, familyHead);
                const memberAtts = attendances.filter(a => a.member_id === m.id && a.year === Number(selectedYear));
                const hadir = memberAtts.filter(a => a.status === "Hadir").length;
                const rate = memberAtts.length > 0 ? Math.round((hadir / memberAtts.length) * 100) : null;
                const isMe = m.id === myMember?.id;
                return (
                  <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <span className="w-7 h-7 rounded-full bg-secondary text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                        {isMe && <Badge className="text-[10px] py-0">Anda</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {role || (m.gender || "")} · {m.status === "Aktif" ? "Aktif" : "Tidak Aktif"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {rate !== null ? (
                        <Badge variant="outline" className={`text-[10px] ${rate >= 75 ? "bg-accent/10 text-accent border-accent/20" : rate >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                          {rate}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{hadir}/{memberAtts.length} hadir</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Laporan Absensi Pribadi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Laporan Absensi Saya — {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myMonthlyStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data absensi tahun {selectedYear}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Bulan</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Hadir</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">% Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  {myMonthlyStats.map(s => (
                    <tr key={s.month} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-xs">{s.month}</td>
                      <td className="px-3 py-2 text-center text-accent font-medium text-xs">{s.hadir}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground text-xs">{s.total}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className={`text-[10px] ${s.rate >= 75 ? "bg-accent/10 text-accent border-accent/20" : s.rate >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                          {s.rate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}