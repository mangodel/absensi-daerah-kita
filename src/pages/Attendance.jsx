import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import { CalendarCheck, Save, Loader2, CalendarDays } from "lucide-react";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import AttendanceHistory from "@/components/attendance/AttendanceHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const levelColors = {
  "Daerah": "bg-primary/10 text-primary border-primary/20",
  "Desa": "bg-accent/10 text-accent border-accent/20",
  "Kelompok": "bg-orange-50 text-orange-600 border-orange-200",
};

export default function Attendance() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedEventId, setSelectedEventId] = useState("none");
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewYear, setViewYear] = useState(String(currentYear));
  const [viewMonth, setViewMonth] = useState(String(currentMonth));

  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const kelompokList = config.kelompok_list || [];

  const queryClient = useQueryClient();

  // Read event_id from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event_id");
    if (eventId) setSelectedEventId(eventId);
  }, []);

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
    queryFn: () => base44.entities.Event.list("-date"),
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Auto-set filters based on selected event
  useEffect(() => {
    if (selectedEvent) {
      if (selectedEvent.level === "Daerah") {
        setFilterDesa("all");
        setFilterKelompok("all");
      } else if (selectedEvent.level === "Desa" && selectedEvent.desa) {
        setFilterDesa(selectedEvent.desa);
        setFilterKelompok("all");
      } else if (selectedEvent.level === "Kelompok" && selectedEvent.kelompok) {
        setFilterDesa(selectedEvent.desa || "all");
        setFilterKelompok(selectedEvent.kelompok);
      }
    }
  }, [selectedEventId, events.length]);

  const activeMembers = members.filter(m => m.status === "Aktif");
  const filteredMembers = activeMembers.filter(m => {
    const matchDesa = filterDesa === "all" || m.desa === filterDesa;
    const matchKelompok = filterKelompok === "all" || m.kelompok === filterKelompok;
    return matchDesa && matchKelompok;
  });

  const handleStatusChange = (memberId, status) => {
    setAttendanceData(prev => ({ ...prev, [memberId]: status }));
  };

  const handleSave = async () => {
    if (!selectedEvent) return;
    setSaving(true);

    const date = selectedEvent.date;
    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const records = Object.entries(attendanceData).map(([memberId, status]) => {
      const member = members.find(m => m.id === memberId);
      return {
        member_id: memberId,
        member_name: member?.full_name || "",
        desa: member?.desa || "",
        kelompok: member?.kelompok || "",
        date,
        status,
        month,
        year,
        event_id: selectedEvent.id,
        event_name: selectedEvent.name,
        event_level: selectedEvent.level,
      };
    });

    if (records.length > 0) {
      await base44.entities.Attendance.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      setAttendanceData({});
    }
    setSaving(false);
  };

  const filledCount = Object.keys(attendanceData).length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" /> Absensi
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola kehadiran anggota per kegiatan</p>
        </div>
      </div>

      <Tabs defaultValue="input">
        <TabsList>
          <TabsTrigger value="input">Input Absensi</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4 mt-4">
          {/* Event Selector */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Pilih Kegiatan
            </h3>
            <Select value={selectedEventId} onValueChange={v => { setSelectedEventId(v); setAttendanceData({}); }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kegiatan terlebih dahulu..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Pilih Kegiatan —</SelectItem>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    [{e.level}] {e.name} — {e.date ? format(new Date(e.date), "dd MMM yyyy", { locale: id }) : ""}
                    {e.desa ? ` (${e.desa}` : ""}
                    {e.kelompok ? ` / ${e.kelompok})` : (e.desa ? ")" : "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEvent && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary/50 rounded-xl">
                <Badge variant="outline" className={`text-xs ${levelColors[selectedEvent.level]}`}>
                  {selectedEvent.level}
                </Badge>
                <span className="font-semibold text-sm">{selectedEvent.name}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedEvent.date ? format(new Date(selectedEvent.date), "EEEE, dd MMMM yyyy", { locale: id }) : ""}
                </span>
                {selectedEvent.location && (
                  <span className="text-xs text-muted-foreground">· {selectedEvent.location}</span>
                )}
              </div>
            )}
          </div>

          {selectedEventId !== "none" && selectedEvent && (
            <>
              {/* Filter anggota */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Desa</SelectItem>
                    {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterKelompok} onValueChange={setFilterKelompok}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelompok</SelectItem>
                    {kelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleSave} disabled={saving || filledCount === 0} className="sm:ml-auto">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan ({filledCount})
                </Button>
              </div>

              <AttendanceTable
                members={filteredMembers}
                attendanceData={attendanceData}
                onStatusChange={handleStatusChange}
              />
            </>
          )}

          {selectedEventId === "none" && (
            <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
              <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Pilih kegiatan di atas untuk mulai input absensi.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={viewMonth} onValueChange={setViewMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={viewYear} onValueChange={setViewYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AttendanceHistory
            attendances={attendances}
            members={members}
            month={Number(viewMonth)}
            year={Number(viewYear)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}