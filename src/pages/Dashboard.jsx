import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, UserCheck, UserX, CalendarCheck, Bell, FileBarChart, Home, Megaphone, Plus, ArrowRightLeft, AlertCircle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import GenerusBreakdown from "@/components/dashboard/GenerusBreakdown";
import AttendanceChart from "@/components/dashboard/AttendanceChart";
import DesaOverview from "@/components/dashboard/DesaOverview";
import AustraliaMap from "@/components/dashboard/AustraliaMap";
import OrganizationDisplay from "@/components/dashboard/OrganizationDisplay";
import MonthlyAttendanceSummary from "@/components/dashboard/MonthlyAttendanceSummary";
import BroadcastDialog from "@/components/broadcast/BroadcastDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { Link } from "react-router-dom";
import { isToday, isPast, format } from "date-fns";
import { id } from "date-fns/locale";
import { MONTHS } from "@/lib/constants";
import KelompokAttendanceDetail from "@/components/dashboard/KelompokAttendanceDetail";
import { toast } from "sonner";

function pct(val, total) {
  if (!total) return "0%";
  return `${Math.round((val / total) * 100)}%`;
}

function MiniMonthlyReport({ attendances, members, isAdminDesa, isAdminKelompok, userDesa, userKelompok, desaKelompokMap }) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));

  const monthAtts = attendances.filter(a => a.month === Number(month) && a.year === Number(year));

  const stats = useMemo(() => {
    if (isAdminKelompok && userKelompok) {
      const atts = monthAtts.filter(a => a.kelompok === userKelompok);
      const hadir = atts.filter(a => a.status === "Hadir").length;
      return [{ label: userKelompok, hadir, total: atts.length, rate: pct(hadir, atts.length) }];
    }
    if (isAdminDesa && userDesa) {
      const kelompoks = desaKelompokMap[userDesa] || [];
      return kelompoks.map(k => {
        const atts = monthAtts.filter(a => a.kelompok === k && a.desa === userDesa);
        const hadir = atts.filter(a => a.status === "Hadir").length;
        return { label: k, hadir, total: atts.length, rate: pct(hadir, atts.length) };
      }).filter(s => s.total > 0);
    }
    return [];
  }, [monthAtts, isAdminDesa, isAdminKelompok, userDesa, userKelompok, desaKelompokMap]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <FileBarChart className="w-4 h-4 text-primary" />
          Laporan Bulanan
        </h3>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {stats.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Belum ada data absensi bulan ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  {isAdminKelompok ? "Kelompok" : "Kelompok"}
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Hadir</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Total Absen</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">% Hadir</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.label} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-xs">{s.label}</td>
                  <td className="px-3 py-2 text-center text-accent font-medium text-xs">{s.hadir}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground text-xs">{s.total}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="outline" className={`text-[10px] ${s.total > 0 ? "bg-accent/10 text-accent border-accent/20" : "bg-secondary text-muted-foreground"}`}>
                      {s.rate}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-right">
        <Link to="/reports" className="text-xs text-primary hover:underline">Lihat laporan lengkap →</Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const queryClient = useQueryClient();
  const { filterMembers, filterEvents, isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();

  const handleSyncAttendance = async () => {
    setSyncingAttendance(true);
    try {
      const res = await base44.functions.invoke('syncEventAttendance', {});
      toast.success(res.data.message || 'Sinkronisasi berhasil');
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal sinkronisasi');
    } finally {
      setSyncingAttendance(false);
    }
  };

  const { data: allMembers = [] } = useQuery({ queryKey: ["members"], queryFn: () => base44.entities.Member.list() });
  const { data: attendances = [] } = useQuery({ queryKey: ["attendances"], queryFn: () => base44.entities.Attendance.list() });
  const { data: allEvents = [] } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.Event.list() });
  const { data: reminders = [] } = useQuery({ queryKey: ["reminders"], queryFn: () => base44.entities.Reminder.list() });

  const members = filterMembers(allMembers);
  const events = filterEvents(allEvents);

  const activeMembers = members.filter(m => m.status === "Aktif").length;
  const inactiveMembers = members.filter(m => m.status === "Tidak Aktif").length;

  // Hitung total KK: family_group unik = 1 KK + member tanpa family_group = mandiri (1 KK)
  // Hitung berdasarkan members AKTIF yang sudah difilter (sesuai scope admin)
  const totalKK = useMemo(() => {
    const scopedMems = isAdminKelompok && userKelompok
      ? members.filter(m => m.kelompok === userKelompok && m.status === "Aktif")
      : isAdminDesa && userDesa
      ? members.filter(m => m.desa === userDesa && m.status === "Aktif")
      : members.filter(m => m.status === "Aktif");
    
    const groupsSet = new Set();
    scopedMems.forEach(m => {
      if (m.family_group && m.family_group.trim()) {
        groupsSet.add(m.family_group.trim());
      }
    });
    // KK berkelompok + KK mandiri (yang tidak punya family_group)
    const berkelompok = groupsSet.size;
    const mandiri = scopedMems.filter(m => !m.family_group || !m.family_group.trim()).length;
    return berkelompok + mandiri;
  }, [members, isAdminKelompok, isAdminDesa, userKelompok, userDesa]);
  const yearAttendances = attendances.filter(a => a.year === Number(selectedYear));
  // Admin kelompok: only kelompok-level events attendance (exclude Daerah events)
  // Kelompok: all attendance for their kelompok (including Daerah/Desa events they attend)
  const scopedAttendances = isAdminKelompok && userKelompok
    ? yearAttendances.filter(a => a.kelompok === userKelompok)
    : isAdminDesa && userDesa
    ? yearAttendances.filter(a => a.desa === userDesa)
    : yearAttendances;
  const hadirCount = scopedAttendances.filter(a => a.status === "Hadir").length;
  const attendanceRate = scopedAttendances.length > 0
    ? Math.round((hadirCount / scopedAttendances.length) * 100)
    : 0;

  const urgentReminders = reminders.filter(r =>
    r.status === "Aktif" && r.due_date && (isPast(new Date(r.due_date)) || isToday(new Date(r.due_date)))
  );
  const upcomingEvents = events
    .filter(e => e.date && !isPast(new Date(e.date + "T23:59:59")))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const scopeLabel = isAdminKelompok && userKelompok
    ? userKelompok
    : isAdminDesa && userDesa
    ? userDesa
    : "Daerah";

  // Hitung kehadiran bulan lalu untuk filter "jarang hadir"
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthNum = lastMonth.getMonth() + 1;
  const lastMonthYear = lastMonth.getFullYear();
  
  const lowAttendanceMembers = useMemo(() => {
    const lastMonthAtts = attendances.filter(a => a.month === lastMonthNum && a.year === lastMonthYear);
    
    return members.filter(m => {
      const memberAtts = lastMonthAtts.filter(a => a.member_id === m.id);
      if (memberAtts.length === 0) return false; // Tidak ada data absensi
      const hadirCount = memberAtts.filter(a => a.status === "Hadir").length;
      const rate = (hadirCount / memberAtts.length) * 100;
      return rate < 50;
    });
  }, [members, attendances, lastMonthNum, lastMonthYear]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-2">
         <div className="flex-1">
           <h1 className="text-3xl font-bold text-foreground mb-2">{pt.dashboard || "Dashboard"}</h1>
           <div className="flex flex-col sm:flex-row sm:items-center gap-2">
             <p className="text-base text-muted-foreground">{pt.dashboard_subtitle || "Ringkasan data"}</p>
             <Badge variant="outline" className="text-[11px] bg-primary/5 border-primary/20 text-primary w-fit">{scopeLabel}</Badge>
           </div>
         </div>
         <div className="shrink-0 flex items-center gap-3">
           {isSuperAdmin && (
             <Button size="sm" variant="outline" onClick={handleSyncAttendance} disabled={syncingAttendance} className="text-xs h-9">
               {syncingAttendance ? '🔄 Sinkronisasi...' : '⚡ Sinkronisasi Absensi'}
             </Button>
           )}
           <Select value={selectedYear} onValueChange={setSelectedYear}>
             <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
             <SelectContent>
               {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
             </SelectContent>
           </Select>
         </div>
       </div>

      {urgentReminders.length > 0 && (
        <Link to="/reminders" className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 hover:bg-destructive/10 transition-colors">
          <Bell className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {urgentReminders.length} pengingat jatuh tempo — <span className="underline">lihat sekarang</span>
          </p>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Total Jamaah" value={members.length} icon={Users} color="primary" />
         <StatCard title="Aktif" value={activeMembers} icon={UserCheck} color="accent" />
         <StatCard title="Total KK" value={totalKK} icon={Home} color="warning" />
         <StatCard title="Kehadiran" value={`${attendanceRate}%`} subtitle={`Tahun ${selectedYear}`} icon={CalendarCheck} color="primary" />
       </div>



       <GenerusBreakdown members={members} />

      {/* Daftar anggota bernomor urut: Dewasa (18+) dulu lalu Generus — admin desa & kelompok */}
      {(isAdminDesa || isAdminKelompok) && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {isAdminKelompok ? `Daftar Anggota — ${userKelompok}` : `Daftar Anggota per Kelompok — ${userDesa}`}
          </h3>
          {isAdminKelompok && (
            <KelompokAttendanceDetail
              members={members}
              attendances={attendances}
              kelompok={userKelompok}
              month={new Date().getMonth() + 1}
              year={new Date().getFullYear()}
            />
          )}
          {isAdminDesa && userDesa && (() => {
            const kelompoks = (config.desa_kelompok_map || {})[userDesa] || [];
            if (kelompoks.length === 0) return <p className="text-xs text-muted-foreground">Belum ada kelompok terdaftar.</p>;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kelompoks.map(k => (
                  <div key={k} className="rounded-xl border border-border p-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{k}</p>
                    <KelompokAttendanceDetail
                      members={members}
                      attendances={attendances}
                      kelompok={k}
                      month={new Date().getMonth() + 1}
                      year={new Date().getFullYear()}
                    />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm text-foreground mb-3">Kegiatan Mendatang</h3>
          <div className="space-y-2">
            {upcomingEvents.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(e.date), "dd MMM yyyy", { locale: id })}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 ml-auto">{e.level}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdminKelompok && (
        <>
          <AustraliaMap members={members} />
          <AttendanceChart attendances={scopedAttendances} year={Number(selectedYear)} />
        </>
      )}

      {(isSuperAdmin || isAdminDesa) && <DesaOverview members={members} />}

      {(isAdminDesa || isAdminKelompok) && <MonthlyAttendanceSummary />}



      {/* Pindah Kelompok — untuk admin desa & kelompok */}
      {(isAdminDesa || isAdminKelompok) && (
        <Link to="/transfers" className="block">
          <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Pindah Kelompok</h3>
                </div>
                <p className="text-sm text-muted-foreground">Kelola pemindahan anggota antar kelompok</p>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Jamaah Jarang Hadir — untuk admin desa & kelompok */}
      {(isAdminDesa || isAdminKelompok) && lowAttendanceMembers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Jamaah Jarang Hadir</h3>
              <p className="text-sm text-amber-800 mb-3">Kehadiran di bawah 50% pada {format(lastMonth, "MMMM yyyy", { locale: id })}</p>
              <div className="space-y-2">
                {lowAttendanceMembers.slice(0, 5).map(m => {
                  const memberAtts = attendances.filter(a => a.member_id === m.id && a.month === lastMonthNum && a.year === lastMonthYear);
                  const hadirCount = memberAtts.filter(a => a.status === "Hadir").length;
                  const rate = Math.round((hadirCount / memberAtts.length) * 100);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-100">
                      <span className="text-sm text-foreground">{m.full_name}</span>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">{rate}%</Badge>
                    </div>
                  );
                })}
              </div>
              {lowAttendanceMembers.length > 5 && (
                <p className="text-xs text-amber-700 mt-2">+{lowAttendanceMembers.length - 5} lainnya</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdminKelompok && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Ringkasan Kelompok {userKelompok}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{members.filter(m => m.status === "Aktif").length}</p>
              <p className="text-xs text-muted-foreground mt-1">Jamaah Aktif</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">{totalKK}</p>
              <p className="text-xs text-muted-foreground mt-1">Total KK</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-accent">{attendanceRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Kehadiran {selectedYear}</p>
            </div>
          </div>

          <AttendanceChart attendances={scopedAttendances} year={Number(selectedYear)} />
          {upcomingEvents.length > 0 && (
            <div>
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">Kegiatan Mendatang</h4>
              <div className="space-y-2">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                      <CalendarCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{e.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(e.date), "dd MMM yyyy", { locale: id })}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{e.level}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini Laporan Bulanan — untuk admin desa & kelompok */}
      {(isAdminDesa || isAdminKelompok) && (
        <MiniMonthlyReport
          attendances={attendances}
          members={members}
          isAdminDesa={isAdminDesa}
          isAdminKelompok={isAdminKelompok}
          userDesa={userDesa}
          userKelompok={userKelompok}
          desaKelompokMap={config.desa_kelompok_map || {}}
        />
      )}

      {/* Quick Broadcast — untuk admin desa & kelompok */}
      {(isAdminDesa || isAdminKelompok) && (
        <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Kirim Pengumuman</h3>
              </div>
              <p className="text-sm text-muted-foreground">Sampaikan informasi penting kepada jamaah {isAdminKelompok ? `kelompok ${userKelompok}` : `desa ${userDesa}`}</p>
            </div>
          </div>
          <Button onClick={() => setBroadcastOpen(true)} className="w-full gap-2" variant="default">
            <Plus className="w-4 h-4" />
            Buat Broadcast
          </Button>
        </div>
      )}

      <BroadcastDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        members={members}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["broadcasts"] })}
        scopeOverride={isAdminKelompok ? "Kelompok" : isAdminDesa ? "Desa" : undefined}
        desaOverride={userDesa}
        kelompokOverride={userKelompok}
      />
    </div>
  );
}