import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MONTHS } from "@/lib/constants";

const STATUS_COLORS = {
  Hadir: "#22c55e",
  "Izin Sekolah": "#f59e0b",
  "Izin Kerja": "#3b82f6",
  Alpa: "#ef4444",
};

export default function AttendanceChart({ attendances, members, year, filterDesa, filterKelompok }) {
  const [chartType, setChartType] = useState("bar");
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const monthlyData = useMemo(() => {
    // Only show months up to current month for the selected year
    const maxMonth = year === currentYear ? currentMonth : 12;
    return MONTHS.slice(0, maxMonth).map((month, idx) => {
      const monthAtts = attendances.filter(a => {
        const matchMonth = a.month === idx + 1 && a.year === year;
        const matchDesa = !filterDesa || filterDesa === "all" || a.desa === filterDesa;
        const matchKelompok = !filterKelompok || filterKelompok === "all" || a.kelompok === filterKelompok;
        return matchMonth && matchDesa && matchKelompok;
      });
      const hadir = monthAtts.filter(a => a.status === "Hadir").length;
      const izinSekolah = monthAtts.filter(a => a.status === "Izin Sekolah").length;
      const izinKerja = monthAtts.filter(a => a.status === "Izin Kerja").length;
      const alpa = monthAtts.filter(a => a.status === "Alpa").length;
      const total = monthAtts.length;
      return {
        month: month.substring(0, 3),
        Hadir: hadir,
        "Izin Sekolah": izinSekolah,
        "Izin Kerja": izinKerja,
        Alpa: alpa,
        total,
        rate: total > 0 ? Math.round((hadir / total) * 100) : 0,
      };
    });
  }, [attendances, year, filterDesa, filterKelompok]);

  // For chart rendering, only include months that have actual data
  const chartData = monthlyData.filter(d => d.total > 0);

  const totalHadir = monthlyData.reduce((s, d) => s + d.Hadir, 0);
  const totalAll = monthlyData.reduce((s, d) => s + d.total, 0);
  const avgRate = totalAll > 0 ? Math.round((totalHadir / totalAll) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Grafik Kehadiran {year}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rata-rata kehadiran: <span className="font-semibold text-accent">{avgRate}%</span>
            <span className="ml-2 text-muted-foreground">({totalHadir}/{totalAll} hadir)</span>
          </p>
        </div>
        <Select value={chartType} onValueChange={setChartType}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">Bar Chart</SelectItem>
            <SelectItem value="line">Line Chart</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground bg-secondary/20 rounded-xl">
          Belum ada data absensi untuk tahun {year}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} formatter={(value, name) => [value, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hadir" fill={STATUS_COLORS.Hadir} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Izin Sekolah" fill={STATUS_COLORS["Izin Sekolah"]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Izin Kerja" fill={STATUS_COLORS["Izin Kerja"]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Alpa" fill={STATUS_COLORS.Alpa} radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} formatter={(value, name) => [value, name === "rate" ? `${value}%` : value]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Hadir" stroke={STATUS_COLORS.Hadir} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Alpa" stroke={STATUS_COLORS.Alpa} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Izin Sekolah" stroke={STATUS_COLORS["Izin Sekolah"]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Izin Kerja" stroke={STATUS_COLORS["Izin Kerja"]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}

      {/* Summary per bulan jika ada data */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1">
        {monthlyData.map(d => (
          <div key={d.month} className="text-center">
            <p className="text-[9px] text-muted-foreground">{d.month}</p>
            <p className={`text-[10px] font-bold ${d.total > 0 ? (d.rate >= 75 ? "text-accent" : d.rate >= 50 ? "text-yellow-600" : "text-destructive") : "text-muted-foreground"}`}>
              {d.total > 0 ? `${d.rate}%` : "-"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}