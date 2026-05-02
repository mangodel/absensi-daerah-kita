import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, UserCheck, UserX, CalendarCheck, Bell } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import AttendanceChart from "@/components/dashboard/AttendanceChart";
import DesaOverview from "@/components/dashboard/DesaOverview";
import AustraliaMap from "@/components/dashboard/AustraliaMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { Link } from "react-router-dom";
import { isToday, isPast, format } from "date-fns";
import { id } from "date-fns/locale";

export default function Dashboard() {
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const { filterMembers, filterEvents, isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();

  const { data: allMembers = [] } = useQuery({ queryKey: ["members"], queryFn: () => base44.entities.Member.list() });
  const { data: attendances = [] } = useQuery({ queryKey: ["attendances"], queryFn: () => base44.entities.Attendance.list() });
  const { data: allEvents = [] } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.Event.list() });
  const { data: reminders = [] } = useQuery({ queryKey: ["reminders"], queryFn: () => base44.entities.Reminder.list() });

  const members = filterMembers(allMembers);
  const events = filterEvents(allEvents);

  const activeMembers = members.filter(m => m.status === "Aktif").length;
  const inactiveMembers = members.filter(m => m.status === "Tidak Aktif").length;
  const yearAttendances = attendances.filter(a => a.year === Number(selectedYear));
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
    ? `Kelompok ${userKelompok}`
    : isAdminDesa && userDesa
    ? `Desa ${userDesa}`
    : "Daerah";

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pt.dashboard || "Dashboard"}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">{pt.dashboard_subtitle || "Ringkasan data"}</p>
            <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">{scopeLabel}</Badge>
          </div>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <StatCard title="Tidak Aktif" value={inactiveMembers} icon={UserX} color="destructive" />
        <StatCard title="Kehadiran" value={`${attendanceRate}%`} subtitle={`Tahun ${selectedYear}`} icon={CalendarCheck} color="warning" />
      </div>

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

      {isAdminKelompok && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm text-foreground mb-3">Ringkasan Kelompok {userKelompok}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{members.filter(m => m.status === "Aktif").length}</p>
              <p className="text-xs text-muted-foreground mt-1">Anggota Aktif</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-accent">{attendanceRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Kehadiran {selectedYear}</p>
            </div>
          </div>
          <AttendanceChart attendances={scopedAttendances} year={Number(selectedYear)} />
        </div>
      )}
    </div>
  );
}