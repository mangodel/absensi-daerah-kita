import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, Users, CalendarCheck, ChevronDown, ChevronUp } from "lucide-react";
import { MONTHS } from "@/lib/constants";

const STATUS_COLOR = {
  Hadir: "bg-accent/10 text-accent border-accent/20",
  "Izin Sekolah": "bg-primary/10 text-primary border-primary/20",
  "Izin Kerja": "bg-blue-50 text-blue-600 border-blue-200",
  Alpa: "bg-destructive/10 text-destructive border-destructive/20",
};

function pct(val, total) {
  if (!total) return "0%";
  return `${Math.round((val / total) * 100)}%`;
}

function SummaryCard({ title, value, sub, color = "primary" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colors[color].split(" ")[1]}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MonthlyReport() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [expandedDesa, setExpandedDesa] = useState(null);

  const { config } = useAppConfig();
  const desaKelompokMap = config.desa_kelompok_map || {};
  const { filterMembers, filterEvents, isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();

  const { data: allMembers = [] } = useQuery({ queryKey: ["members"], queryFn: () => base44.entities.Member.list() });
  const { data: allAttendances = [] } = useQuery({ queryKey: ["attendances"], queryFn: () => base44.entities.Attendance.list() });
  const { data: allEvents = [] } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.Event.list() });

  const members = filterMembers(allMembers);
  const events = filterEvents(allEvents);

  const month = Number(selectedMonth);
  const year = Number(selectedYear);

  const monthAttendances = allAttendances.filter(a => a.month === month && a.year === year);
  const monthEvents = events.filter(e => e.month === month && e.year === year);

  // Per-desa stats
  const desaStats = useMemo(() => {
    const desaList = isSuperAdmin ? Object.keys(desaKelompokMap) :
      isAdminDesa && userDesa ? [userDesa] :
      isAdminKelompok && userDesa ? [userDesa] : [];

    return desaList.map(desa => {
      const desaMembers = members.filter(m => m.desa === desa && m.status === "Aktif");
      const kelompoks = (desaKelompokMap[desa] || []).filter(k =>
        isAdminKelompok ? k === userKelompok : true
      );

      const kelompokStats = kelompoks.map(kelompok => {
        const km = desaMembers.filter(m => m.kelompok === kelompok);
        const kAtts = monthAttendances.filter(a => a.kelompok === kelompok);
        const hadir = kAtts.filter(a => a.status === "Hadir").length;
        const total = kAtts.length;
        const kEvents = monthEvents.filter(e => e.kelompok === kelompok || e.level !== "Kelompok");
        return { kelompok, memberCount: km.length, hadir, total, events: kEvents.length, rate: pct(hadir, total) };
      });

      const desaAtts = monthAttendances.filter(a => a.desa === desa);
      const totalHadir = desaAtts.filter(a => a.status === "Hadir").length;
      const totalAtt = desaAtts.length;

      return { desa, memberCount: desaMembers.length, totalHadir, totalAtt, kelompokStats, rate: pct(totalHadir, totalAtt) };
    });
  }, [members, monthAttendances, monthEvents, desaKelompokMap, isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok]);

  const totalActiveMembers = members.filter(m => m.status === "Aktif").length;
  const totalHadir = monthAttendances.filter(a => a.status === "Hadir").length;
  const overallRate = pct(totalHadir, monthAttendances.length);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-primary" /> Laporan Bulanan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rekap kehadiran dan kegiatan per bulan</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Jamaah Aktif" value={totalActiveMembers} color="primary" />
        <SummaryCard title="Total Kehadiran" value={totalHadir} sub={`dari ${monthAttendances.length} absensi`} color="accent" />
        <SummaryCard title="Tingkat Kehadiran" value={overallRate} color="warning" />
        <SummaryCard title="Total Kegiatan" value={monthEvents.length} sub={`Bulan ${MONTHS[month - 1]} ${year}`} color="primary" />
      </div>

      {/* Per-Desa Breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Rekap per Desa</h2>
        {desaStats.map(({ desa, memberCount, totalHadir, totalAtt, kelompokStats, rate }) => (
          <div key={desa} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              onClick={() => setExpandedDesa(expandedDesa === desa ? null : desa)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{desa}</p>
                  <p className="text-xs text-muted-foreground">{memberCount} anggota aktif · {kelompokStats.length} kelompok</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-accent">{rate}</p>
                  <p className="text-xs text-muted-foreground">{totalHadir}/{totalAtt} hadir</p>
                </div>
                {expandedDesa === desa ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {expandedDesa === desa && (
              <div className="border-t border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Kelompok</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Anggota</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Hadir</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Total Absen</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">% Hadir</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Kegiatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kelompokStats.map(({ kelompok, memberCount, hadir, total, events, rate }) => (
                        <tr key={kelompok} className="border-t border-border hover:bg-secondary/20">
                          <td className="px-4 py-2.5 font-medium">{kelompok}</td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">{memberCount}</td>
                          <td className="px-4 py-2.5 text-center text-accent font-medium">{hadir}</td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">{total}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant="outline" className={total > 0 ? "bg-accent/10 text-accent border-accent/20" : "bg-secondary text-muted-foreground"}>
                              {rate}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">{events}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
        {desaStats.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground text-sm">Tidak ada data untuk periode ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}