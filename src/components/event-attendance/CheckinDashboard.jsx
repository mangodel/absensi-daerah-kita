import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, UserCheck, UserX, BarChart3, Download, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function CheckinDashboard({ eventId, eventName }) {
  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventId ? base44.entities.EventParticipant.filter({ event_id: eventId }) : [],
    enabled: !!eventId,
    refetchInterval: 10000,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["event-checkins", eventId],
    queryFn: () => eventId ? base44.entities.EventCheckin.filter({ event_id: eventId }, "-checkin_time", 500) : [],
    enabled: !!eventId,
    refetchInterval: 10000,
  });

  if (!eventId) return (
    <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>Pilih event aktif terlebih dahulu</p>
    </div>
  );

  const total = participants.length;
  const present = participants.filter(p => p.attendance_status === "Present").length;
  const absent = total - present;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  // Chart: check-ins per hour
  const hourCounts = {};
  checkins.forEach(c => {
    if (c.checkin_time) {
      const h = new Date(c.checkin_time).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  });
  const hourData = Object.entries(hourCounts)
    .map(([h, count]) => ({ hour: `${h}:00`, count }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  // By station
  const stationCounts = {};
  checkins.forEach(c => {
    const s = c.scanner_station || "Tidak Diketahui";
    stationCounts[s] = (stationCounts[s] || 0) + 1;
  });

  const exportCSV = () => {
    const rows = [
      ["Participant ID", "Nama", "Telepon", "Waktu Check-in", "Metode", "Pos Scanner", "Volunteer"],
      ...checkins.map(c => {
        const p = participants.find(x => x.id === c.participant_db_id);
        return [c.participant_id, c.participant_name, p?.phone || "", c.checkin_time ? format(new Date(c.checkin_time), "dd/MM/yyyy HH:mm:ss") : "", c.checkin_method, c.scanner_station, c.volunteer_name];
      })
    ];
    const csv = rows.map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `checkin-${eventName || "event"}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{eventName || "Dashboard Kehadiran"}</h3>
          <p className="text-xs text-muted-foreground">Update otomatis setiap 10 detik</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Terdaftar" value={total} icon={Users} color="primary" />
        <StatCard label="Hadir" value={present} icon={UserCheck} color="accent" />
        <StatCard label="Belum Hadir" value={absent} icon={UserX} color="destructive" />
        <StatCard label="% Kehadiran" value={`${pct}%`} icon={BarChart3} color="warning" />
      </div>

      {/* Progress Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Tingkat Kehadiran</span>
          <span className="font-bold text-accent">{pct}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{present} hadir</span>
          <span>{absent} belum hadir</span>
        </div>
      </div>

      {/* Hour Chart */}
      {hourData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Check-in per Jam</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Check-in" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By Station */}
      {Object.keys(stationCounts).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-sm">Kehadiran per Pos</h4>
          {Object.entries(stationCounts).map(([station, count]) => (
            <div key={station} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{station}</span>
              <Badge variant="outline" className="font-semibold">{count} orang</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Recent Check-ins Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm">Check-in Terbaru</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Nama</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">ID</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Waktu</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Metode</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Pos</th>
              </tr>
            </thead>
            <tbody>
              {checkins.slice(0, 20).map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{c.participant_name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden sm:table-cell">{c.participant_id}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {c.checkin_time ? format(new Date(c.checkin_time), "HH:mm:ss") : "-"}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{c.checkin_method}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{c.scanner_station}</td>
                </tr>
              ))}
              {checkins.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">Belum ada check-in.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}