import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, UserCheck, UserX, CalendarCheck } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import AttendanceChart from "@/components/dashboard/AttendanceChart";
import DesaOverview from "@/components/dashboard/DesaOverview";
import AustraliaMap from "@/components/dashboard/AustraliaMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";

export default function Dashboard() {
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
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

  const activeMembers = members.filter(m => m.status === "Aktif").length;
  const inactiveMembers = members.filter(m => m.status === "Tidak Aktif").length;
  const yearAttendances = attendances.filter(a => a.year === Number(selectedYear));
  const hadirCount = yearAttendances.filter(a => a.status === "Hadir").length;
  const attendanceRate = yearAttendances.length > 0
    ? Math.round((hadirCount / yearAttendances.length) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pt.dashboard || "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pt.dashboard_subtitle || "Ringkasan data daerah"}</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jamaah" value={members.length} icon={Users} color="primary" />
        <StatCard title="Aktif" value={activeMembers} icon={UserCheck} color="accent" />
        <StatCard title="Tidak Aktif" value={inactiveMembers} icon={UserX} color="destructive" />
        <StatCard title="Kehadiran" value={`${attendanceRate}%`} subtitle={`Tahun ${selectedYear}`} icon={CalendarCheck} color="warning" />
      </div>

      <AustraliaMap members={members} />
      <AttendanceChart attendances={attendances} year={Number(selectedYear)} />
      <DesaOverview members={members} />
    </div>
  );
}