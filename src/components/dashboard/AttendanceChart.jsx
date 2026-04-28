import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MONTHS } from "@/lib/constants";

export default function AttendanceChart({ attendances, year }) {
  const data = MONTHS.map((month, idx) => {
    const monthRecords = attendances.filter(a => a.year === year && a.month === idx + 1);
    const hadir = monthRecords.filter(a => a.status === "Hadir").length;
    const tidakHadir = monthRecords.filter(a => a.status !== "Hadir").length;
    return { name: month.substring(0, 3), Hadir: hadir, "Tidak Hadir": tidakHadir };
  });

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">Rekap Absensi Bulanan {year}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Hadir" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Tidak Hadir" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}