import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileBarChart, Users, CalendarCheck, ChevronDown, ChevronUp, Download, Image } from "lucide-react";
import { MONTHS } from "@/lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const STATUS_COLOR = {
  Hadir: "bg-accent/10 text-accent border-accent/20",
  "Izin Sekolah": "bg-primary/10 text-primary border-primary/20",
  "Izin Kerja": "bg-blue-50 text-blue-600 border-blue-200",
  Alpa: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_CHART_COLORS = {
  Hadir: "#22c55e",
  "Izin Sekolah": "#f59e0b",
  "Izin Kerja": "#3b82f6",
  Alpa: "#ef4444",
};

function pct(val, total) {
  if (!total) return "0%";
  return `${Math.round((val / total) * 100)}%`;
}

function SummaryCard({ title, value, sub, color = "primary" }) {
  const colors = {
    primary: "text-primary",
    accent: "text-accent",
    destructive: "text-destructive",
    warning: "text-orange-600",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MonthlyReport() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [reportType, setReportType] = useState("monthly"); // "monthly" | "quarterly"
  const [viewMode, setViewMode] = useState("summary"); // "summary" | "individual" | "family"
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [expandedDesa, setExpandedDesa] = useState(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

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

  // Determine months for report
  const reportMonths = reportType === "quarterly"
    ? [Math.floor((month - 1) / 3) * 3 + 1, Math.floor((month - 1) / 3) * 3 + 2, Math.floor((month - 1) / 3) * 3 + 3]
    : [month];

  const allMonthAttendances = allAttendances.filter(a => reportMonths.includes(a.month) && a.year === year);
  const monthAttendances = useMemo(() => {
    if (isSuperAdmin) return allMonthAttendances;
    if (isAdminDesa && userDesa) return allMonthAttendances.filter(a => a.desa === userDesa);
    if (isAdminKelompok && userKelompok) return allMonthAttendances.filter(a => a.kelompok === userKelompok);
    return [];
  }, [allMonthAttendances, isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok]);

  const monthEvents = events.filter(e => reportMonths.includes(e.month) && e.year === year);

  const desaStats = useMemo(() => {
    let desaList = isSuperAdmin ? Object.keys(desaKelompokMap) :
      isAdminDesa && userDesa ? [userDesa] :
      isAdminKelompok && userDesa ? [userDesa] : [];

    // Apply filter
    if (filterDesa !== "all") {
      desaList = desaList.filter(d => d === filterDesa);
    }

    return desaList.map(desa => {
      const desaMembers = members.filter(m => m.desa === desa && m.status === "Aktif");
      const kelompoks = (desaKelompokMap[desa] || []).filter(k =>
        isAdminKelompok ? k === userKelompok : true
      );

      let filteredKelompoks = kelompoks;
      if (filterKelompok !== "all") {
        filteredKelompoks = kelompoks.filter(k => k === filterKelompok);
      }

      const kelompokStats = filteredKelompoks.map(kelompok => {
        const km = desaMembers.filter(m => m.kelompok === kelompok);
        const kAtts = allMonthAttendances.filter(a => a.kelompok === kelompok && a.desa === desa);
        const hadir = kAtts.filter(a => a.status === "Hadir").length;
        const total = kAtts.length;
        const kEvents = allEvents.filter(e =>
          e.month === month && e.year === year && (
            e.level === "Daerah" ||
            (e.level === "Desa" && e.desa === desa) ||
            (e.level === "Kelompok" && e.kelompok === kelompok)
          )
        );
        return { kelompok, memberCount: km.length, hadir, total, events: kEvents.length, rate: pct(hadir, total) };
      });

      const desaAtts = allMonthAttendances.filter(a => a.desa === desa);
      const totalHadir = desaAtts.filter(a => a.status === "Hadir").length;
      const totalAtt = desaAtts.length;

      return { desa, memberCount: desaMembers.length, totalHadir, totalAtt, kelompokStats, rate: pct(totalHadir, totalAtt) };
    });
  }, [members, allMonthAttendances, allEvents, desaKelompokMap, isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok, month, year, filterDesa, filterKelompok]);

  const totalActiveMembers = members.filter(m => m.status === "Aktif").length;
  const totalHadir = monthAttendances.filter(a => a.status === "Hadir").length;
  const totalIzinSekolah = monthAttendances.filter(a => a.status === "Izin Sekolah").length;
  const totalIzinKerja = monthAttendances.filter(a => a.status === "Izin Kerja").length;
  const totalAlpa = monthAttendances.filter(a => a.status === "Alpa").length;
  const overallRate = pct(totalHadir, monthAttendances.length);

  const scopeLabel = isAdminKelompok && userKelompok
    ? `Kelompok ${userKelompok}`
    : isAdminDesa && userDesa
    ? `Desa ${userDesa}`
    : "Daerah";

  // Chart: Bar per desa
  const desaChartData = desaStats.map(d => ({
    name: d.desa,
    Hadir: d.totalHadir,
    "Tidak Hadir": d.totalAtt - d.totalHadir,
    Total: d.totalAtt,
  }));

  // Chart: Pie status
  const pieData = [
    { name: "Hadir", value: totalHadir, color: STATUS_CHART_COLORS.Hadir },
    { name: "Izin Sekolah", value: totalIzinSekolah, color: STATUS_CHART_COLORS["Izin Sekolah"] },
    { name: "Izin Kerja", value: totalIzinKerja, color: STATUS_CHART_COLORS["Izin Kerja"] },
    { name: "Alpa", value: totalAlpa, color: STATUS_CHART_COLORS.Alpa },
  ].filter(d => d.value > 0);

  // Chart: per kelompok (flattened)
  const kelompokChartData = desaStats.flatMap(d =>
    d.kelompokStats.map(k => ({
      name: k.kelompok.replace(/kelompok /i, "K"),
      Hadir: k.hadir,
      Total: k.total,
      rate: k.total > 0 ? Math.round((k.hadir / k.total) * 100) : 0,
    }))
  );

  const handleExport = async (format) => {
    setExporting(true);
    const html2canvas = (await import("html2canvas")).default;
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });

    if (format === "jpg") {
      const link = document.createElement("a");
      link.download = `laporan-absensi-${MONTHS[month - 1]}-${year}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } else if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`laporan-absensi-${MONTHS[month - 1]}-${year}.pdf`);
    }
    setExporting(false);
  };

  const availableDesas = isSuperAdmin ? Object.keys(desaKelompokMap) :
    isAdminDesa && userDesa ? [userDesa] :
    isAdminKelompok && userDesa ? [userDesa] : [];

  const availableKelompoks = filterDesa !== "all" && desaKelompokMap[filterDesa]
    ? desaKelompokMap[filterDesa]
    : filterDesa === "all" && availableDesas.length > 0
    ? Array.from(new Set(availableDesas.flatMap(d => desaKelompokMap[d] || [])))
    : [];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-primary" /> Laporan Kehadiran
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rekap kehadiran dan kegiatan {reportType === "quarterly" ? "per triwulan" : "per bulan"}
            <span className="ml-2 inline-block text-[10px] bg-primary/5 border border-primary/20 text-primary rounded-md px-2 py-0.5">{scopeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Laporan Bulanan</SelectItem>
              <SelectItem value="quarterly">Laporan Triwulan (3 Bulan)</SelectItem>
            </SelectContent>
          </Select>
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
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={exporting}>
            <Download className="w-4 h-4 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("jpg")} disabled={exporting}>
            <Image className="w-4 h-4 mr-1.5" /> JPG
          </Button>
        </div>
      </div>

      {/* Filter & View Mode */}
      <div className="flex flex-wrap gap-2 items-center">
        {!isAdminKelompok && (
          <>
            <Select value={filterDesa} onValueChange={d => { setFilterDesa(d); setFilterKelompok("all"); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Semua Desa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Desa</SelectItem>
                {availableDesas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {availableKelompoks.length > 0 && (
              <Select value={filterKelompok} onValueChange={setFilterKelompok}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Semua Kelompok" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelompok</SelectItem>
                  {availableKelompoks.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </>
        )}
        
        {!isAdminKelompok && (
          <div className="flex gap-1 ml-auto bg-secondary rounded-lg p-1">
            {[
              { key: "summary", label: "Ringkasan" },
              { key: "individual", label: "Per Individu" },
              { key: "family", label: "Per KK" }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exportable content */}
      <div ref={reportRef} className="space-y-6 bg-background p-2">
        {/* Report title (visible in export) */}
        <div className="hidden print:block text-center mb-2">
          <h2 className="text-lg font-bold">
            Laporan Absensi {reportType === "quarterly" ? `Triwulan ${Math.floor((month - 1) / 3) + 1}` : MONTHS[month - 1]} {year} — {scopeLabel}
          </h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Jamaah Aktif" value={totalActiveMembers} color="primary" />
          <SummaryCard title="Total Kehadiran" value={totalHadir} sub={`dari ${monthAttendances.length} absensi`} color="accent" />
          <SummaryCard title="Tingkat Kehadiran" value={overallRate} color="warning" />
          <SummaryCard title="Total Kegiatan" value={monthEvents.length} sub={`Bulan ${MONTHS[month - 1]} ${year}`} color="primary" />
        </div>

        {/* Charts */}
        {monthAttendances.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-3">Distribusi Status Kehadiran</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 min-w-[120px]">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name}</span>
                      <span className="text-xs font-semibold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bar per Desa */}
            {desaChartData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-3">Kehadiran per Desa</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={desaChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Hadir" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Tidak Hadir" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar per Kelompok */}
            {kelompokChartData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold mb-3">Tingkat Kehadiran per Kelompok (%)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={kelompokChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, "Kehadiran"]} />
                    <Bar dataKey="rate" fill="#6366f1" radius={[3, 3, 0, 0]} name="% Hadir" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Per Individual View */}
        {!isAdminKelompok && viewMode === "individual" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Rekap Kehadiran Per Individu</h2>
            {desaStats.map(({ desa, kelompokStats }) => (
              <div key={desa} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <p className="text-sm font-semibold">{desa}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Nama</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Kelompok</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Hadir</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Izin</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Alpa</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">% Hadir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kelompokStats.map(({ kelompok }) => {
                        const kMembers = members.filter(m => m.desa === desa && m.kelompok === kelompok && m.status === "Aktif");
                        return kMembers.map(member => {
                          const memberAtts = allMonthAttendances.filter(a => a.member_id === member.id);
                          const hadir = memberAtts.filter(a => a.status === "Hadir").length;
                          const izin = memberAtts.filter(a => ["Izin Sekolah", "Izin Kerja"].includes(a.status)).length;
                          const alpa = memberAtts.filter(a => a.status === "Alpa").length;
                          const total = memberAtts.length;
                          const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
                          
                          return (
                            <tr key={member.id} className="border-t border-border hover:bg-secondary/20">
                              <td className="px-4 py-2 font-medium text-xs">{member.full_name}</td>
                              <td className="px-4 py-2 text-center text-xs text-muted-foreground">{kelompok}</td>
                              <td className="px-4 py-2 text-center text-xs text-accent font-medium">{hadir}</td>
                              <td className="px-4 py-2 text-center text-xs text-primary">{izin}</td>
                              <td className="px-4 py-2 text-center text-xs text-destructive">{alpa}</td>
                              <td className="px-4 py-2 text-center">
                                <Badge variant="outline" className={total > 0 ? "bg-accent/10 text-accent border-accent/20 text-[10px]" : "bg-secondary text-muted-foreground text-[10px]"}>
                                  {rate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Per Family (KK) View */}
        {!isAdminKelompok && viewMode === "family" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Rekap Kehadiran Per Kepala Keluarga (KK)</h2>
            {desaStats.map(({ desa }) => {
              const desaMembers = members.filter(m => m.desa === desa && m.status === "Aktif");
              const familyGroups = new Map();
              
              desaMembers.forEach(m => {
                const key = m.family_group || `${m.full_name}-${m.id}`;
                if (!familyGroups.has(key)) {
                  familyGroups.set(key, []);
                }
                familyGroups.get(key).push(m);
              });

              return (
                <div key={desa} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/30">
                    <p className="text-sm font-semibold">{desa} ({familyGroups.size} KK)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Kepala Keluarga</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Anggota</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Hadir (Rerata)</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">% Kehadiran</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(familyGroups.entries()).map(([familyKey, familyMembers]) => {
                          let totalHadir = 0;
                          let totalRecords = 0;
                          
                          familyMembers.forEach(m => {
                            const memberAtts = allMonthAttendances.filter(a => a.member_id === m.id);
                            totalHadir += memberAtts.filter(a => a.status === "Hadir").length;
                            totalRecords += memberAtts.length;
                          });

                          const avgRate = totalRecords > 0 ? Math.round((totalHadir / totalRecords) * 100) : 0;
                          const kepala = familyMembers.find(m => m.id === familyMembers[0].id);

                          return (
                            <tr key={familyKey} className="border-t border-border hover:bg-secondary/20">
                              <td className="px-4 py-2 font-medium text-xs">{kepala.full_name}</td>
                              <td className="px-4 py-2 text-center text-xs text-muted-foreground">{familyMembers.length}</td>
                              <td className="px-4 py-2 text-center text-xs text-accent font-medium">{totalHadir}/{totalRecords}</td>
                              <td className="px-4 py-2 text-center">
                                <Badge variant="outline" className={totalRecords > 0 ? "bg-accent/10 text-accent border-accent/20 text-[10px]" : "bg-secondary text-muted-foreground text-[10px]"}>
                                  {avgRate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Per-Desa Breakdown (Summary) */}
        {!isAdminKelompok && viewMode === "summary" && (
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
                      <p className="text-xs text-muted-foreground">{memberCount} jamaah aktif · {kelompokStats.length} kelompok</p>
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
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Jamaah</th>
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
        )}

        {/* Kelompok View */}
        {isAdminKelompok && userKelompok && (() => {
          const myStats = desaStats.flatMap(d => d.kelompokStats).find(k => k.kelompok === userKelompok);
          if (!myStats) return (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
              <p className="text-muted-foreground text-sm">Tidak ada data absensi untuk kelompok ini bulan ini.</p>
            </div>
          );

          const kelompokAtts = allMonthAttendances.filter(a => a.kelompok === userKelompok);

          return (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold">Detail Kelompok {userKelompok}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard title="Jamaah Aktif" value={myStats.memberCount} color="primary" />
                <SummaryCard title="Hadir" value={myStats.hadir} color="accent" />
                <SummaryCard title="% Kehadiran" value={myStats.rate} color="warning" />
                <SummaryCard title="Kegiatan" value={myStats.events} color="primary" />
              </div>
              {kelompokAtts.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold">Rincian Status Kehadiran</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Nama</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Tanggal</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Kegiatan</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kelompokAtts.sort((a, b) => new Date(a.date) - new Date(b.date)).map(a => (
                          <tr key={a.id} className="border-t border-border hover:bg-secondary/20">
                            <td className="px-4 py-2 font-medium text-xs">{a.member_name}</td>
                            <td className="px-4 py-2 text-center text-xs text-muted-foreground">{a.date}</td>
                            <td className="px-4 py-2 text-center text-xs text-muted-foreground">{a.event_name || "-"}</td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[a.status] || ""}`}>{a.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}