import { useQuery, useQueries } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, Calendar } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const STATUS_COLORS = {
  Hadir: "hsl(167 72% 40%)",
  Izin: "hsl(34 100% 50%)",
  Alpa: "hsl(0 84% 60%)",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function AttendanceSummary({ member, familyMembers = [] }) {
  const { data: myAttendance = [], isLoading } = useQuery({
    queryKey: ["attendance-summary", member?.id],
    queryFn: () => base44.entities.Attendance.filter({ member_id: member.id }),
    enabled: !!member?.id,
  });

  const otherFamily = (familyMembers || []).filter(fm => fm.id !== member?.id);

  const familyQueries = useQueries({
    queries: otherFamily.map(fm => ({
      queryKey: ["attendance-summary", fm.id],
      queryFn: () => base44.entities.Attendance.filter({ member_id: fm.id }),
      enabled: !!fm?.id,
    })),
  });

  const familyData = otherFamily.map((fm, idx) => ({
    member: fm,
    attendance: familyQueries[idx]?.data || [],
    isLoading: familyQueries[idx]?.isLoading,
  }));

  // Main member stats
  const hadirCount = myAttendance.filter(a => a.status === "Hadir").length;
  const izinCount = myAttendance.filter(a => a.status?.startsWith("Izin")).length;
  const alpaCount = myAttendance.filter(a => a.status === "Alpa").length;
  const totalRecords = myAttendance.length;
  const attendanceRate = totalRecords > 0 ? Math.round((hadirCount / totalRecords) * 100) : 0;

  const statusData = [
    { name: "Hadir", value: hadirCount, color: STATUS_COLORS.Hadir },
    { name: "Izin", value: izinCount, color: STATUS_COLORS.Izin },
    { name: "Alpa", value: alpaCount, color: STATUS_COLORS.Alpa },
  ].filter(d => d.value > 0);

  const currentYear = new Date().getFullYear();
  const monthlyData = MONTH_NAMES.map((month, idx) => ({
    month,
    count: myAttendance.filter(a => a.year === currentYear && a.month === idx + 1).length,
  })).filter(d => d.count > 0);

  const recentAttendance = [...myAttendance]
    .sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date))
    .slice(0, 5);

  const hasFamilyData = familyData.some(f => f.attendance.length > 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (totalRecords === 0 && !hasFamilyData) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Ringkasan Kehadiran
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">Belum ada riwayat kehadiran</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Personal Stats */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Ringkasan Kehadiran Saya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xl font-bold text-accent">{hadirCount}</p>
              <p className="text-[10px] text-muted-foreground">Hadir</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-orange-500">{izinCount}</p>
              <p className="text-[10px] text-muted-foreground">Izin</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-destructive">{alpaCount}</p>
              <p className="text-[10px] text-muted-foreground">Alpa</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{attendanceRate}%</p>
              <p className="text-[10px] text-muted-foreground">Rate</p>
            </div>
          </div>

          {/* Pie chart for status breakdown */}
          {statusData.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={55}
                  innerRadius={30}
                  label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}
                  labelLine={false}
                >
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} kali`, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Monthly bar chart */}
          {monthlyData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Kehadiran per Bulan ({currentYear})</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(val) => [`${val} kali`, "Hadir"]} />
                  <Bar dataKey="count" fill="hsl(243 75% 59%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent attendance list */}
          {recentAttendance.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Riwayat Terbaru</p>
              <div className="space-y-1.5">
                {recentAttendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{a.event_name || "Kegiatan"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {a.date ? new Date(a.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <Badge
                      variant={a.status === "Hadir" ? "default" : a.status === "Alpa" ? "destructive" : "secondary"}
                      className="text-[10px] h-auto py-0.5"
                    >
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Family attendance summary */}
      {hasFamilyData && (
        <Card className="border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              Kehadiran Keluarga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {familyData.map(({ member: fm, attendance: att }, idx) => {
              const fmHadir = att.filter(a => a.status === "Hadir").length;
              const fmIzin = att.filter(a => a.status?.startsWith("Izin")).length;
              const fmAlpa = att.filter(a => a.status === "Alpa").length;
              const fmTotal = att.length;
              const fmRate = fmTotal > 0 ? Math.round((fmHadir / fmTotal) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{fm.full_name}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-accent">{fmHadir} Hadir</span>
                      {fmIzin > 0 && <span className="text-[10px] text-orange-500">{fmIzin} Izin</span>}
                      {fmAlpa > 0 && <span className="text-[10px] text-destructive">{fmAlpa} Alpa</span>}
                    </div>
                  </div>
                  <Badge
                    variant={fmRate >= 75 ? "default" : fmRate >= 50 ? "secondary" : "destructive"}
                    className="text-[10px] h-auto py-0.5"
                  >
                    {fmRate}%
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}