import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS, VISA_STATUS_LIST, DAPUKAN_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { CalendarCheck, Save, Loader2, CalendarDays, ScanLine, Link2 } from "lucide-react";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import AttendanceHistory from "@/components/attendance/AttendanceHistory";
import AttendanceChart from "@/components/attendance/AttendanceChart";
import EventAttendancePanel from "@/components/attendance/EventAttendancePanel";
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
  const [filterVisa, setFilterVisa] = useState("all");
  const [filterMuballigh, setFilterMuballigh] = useState("all"); // "all" | "muballigh_only" | "muballighot_only" | "muballigh_both"
  const [filterDapukan, setFilterDapukan] = useState("all");
  const [filterGender, setFilterGender] = useState("all"); // "all" | "ibu_ibu" | "perempuan_all"
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewYear, setViewYear] = useState(String(currentYear));
  const [viewMonth, setViewMonth] = useState(String(currentMonth));

  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const desaList = config.desa_list || [];
  const kelompokList = config.kelompok_list || [];
  const { filterMembers, filterEvents, isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();

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

  const { data: allEvents = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date"),
  });

  // Admin kelompok: show their kelompok events + Daerah + Desa of their desa
  const events = filterEvents(allEvents).filter(e => {
    if (isAdminKelompok) {
      return e.level === "Daerah" ||
        (e.level === "Desa" && e.desa === userDesa) ||
        (e.level === "Kelompok" && e.kelompok === userKelompok);
    }
    return true;
  });

  const selectedEvent = allEvents.find(e => e.id === selectedEventId);

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

  const scopedMembers = filterMembers(members);
  const activeMembers = scopedMembers.filter(m => m.status === "Aktif");

  const thisYear = new Date().getFullYear();

  // Auto-filter base member pool berdasarkan event config
  const eventBasedMembers = activeMembers.filter(m => {
    if (!selectedEvent) return true;
    // Scope by event level
    if (selectedEvent.level === "Desa" && selectedEvent.desa && m.desa !== selectedEvent.desa) return false;
    if (selectedEvent.level === "Kelompok") {
      if (selectedEvent.desa && m.desa !== selectedEvent.desa) return false;
      if (selectedEvent.kelompok && m.kelompok !== selectedEvent.kelompok) return false;
    }
    // Filter by participant_filter (preset)
    const pf = selectedEvent.participant_filter;
    if (pf) {
      const age = thisYear - (m.birth_year || thisYear);
      if (pf === "mubaligh_both") return m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot";
      if (pf === "mubaligh_only") return m.muballigh_status === "Muballigh";
      if (pf === "mubalighot_only") return m.muballigh_status === "Muballighot";
      if (pf === "generus_smp") return age >= 12 && age <= 14;
      if (pf === "generus_sma") return age >= 15 && age <= 17;
      if (pf === "usia_nikah") return age >= 18 && (m.marital_status === "Belum Menikah" || !m.marital_status);
    }
    // Filter by participant_dapukan if set
    const pDap = selectedEvent.participant_dapukan;
    if (pDap && pDap.length > 0) return pDap.includes(m.dapukan);
    return true;
  });

  // Additional manual filters (still available for extra refinement)
  const filteredMembers = eventBasedMembers.filter(m => {
    const matchDesa = filterDesa === "all" || m.desa === filterDesa;
    const matchKelompok = filterKelompok === "all" || m.kelompok === filterKelompok;
    const matchVisa = filterVisa === "all" || m.visa_status === filterVisa;
    const matchDapukan = filterDapukan === "all" || m.dapukan === filterDapukan;
    let matchMuballigh = true;
    if (filterMuballigh === "muballigh_only") matchMuballigh = m.muballigh_status === "Muballigh";
    else if (filterMuballigh === "muballighot_only") matchMuballigh = m.muballigh_status === "Muballighot";
    else if (filterMuballigh === "muballigh_both") matchMuballigh = m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot";
    let matchGender = true;
    if (filterGender === "ibu_ibu") {
      // Wanita yang sudah menikah, janda/duda, atau cerai
      matchGender = m.gender === "Perempuan" &&
        (m.marital_status === "Menikah" || m.marital_status === "Janda/Duda" || m.marital_status === "Cerai");
    } else if (filterGender === "perempuan_all") {
      matchGender = m.gender === "Perempuan";
    } else if (filterGender === "laki_laki") {
      matchGender = m.gender === "Laki-laki";
    }
    return matchDesa && matchKelompok && matchVisa && matchDapukan && matchMuballigh && matchGender;
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
    <div className="space-y-6 pb-28 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" /> {pt.attendance || "Absensi"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pt.attendance_subtitle || "Kelola kehadiran anggota per kegiatan"}</p>
        </div>
      </div>

      <Tabs defaultValue="input">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="input" className="text-xs sm:text-sm">Input Absensi</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">Riwayat</TabsTrigger>
          <TabsTrigger value="chart" className="text-xs sm:text-sm">Grafik</TabsTrigger>
          <TabsTrigger value="event" className="text-xs sm:text-sm">
            <ScanLine className="w-3.5 h-3.5 mr-1" />Absensi Event
          </TabsTrigger>
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
              <div className="space-y-2">
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
                {(selectedEvent.participant_filter || (selectedEvent.participant_dapukan && selectedEvent.participant_dapukan.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-primary/5 border border-primary/15 rounded-xl">
                    <span className="text-xs text-primary font-medium">Peserta terdaftar:</span>
                    {selectedEvent.participant_filter ? (
                      <Badge className="text-[10px] bg-accent/10 text-accent border-accent/20">
                        {{ mubaligh_both: "Semua Mubaligh & Mubalighot", mubaligh_only: "Mubaligh Saja", mubalighot_only: "Mubalighot Saja", generus_smp: "Generus SMP", generus_sma: "Generus SMA", usia_nikah: "Usia Nikah (Lajang 18+)" }[selectedEvent.participant_filter] || selectedEvent.participant_filter}
                      </Badge>
                    ) : (
                      selectedEvent.participant_dapukan.map(d => (
                        <Badge key={d} className="text-[10px] bg-primary/10 text-primary border-primary/20">{d}</Badge>
                      ))
                    )}
                    <span className="text-xs text-muted-foreground ml-1">({filteredMembers.length} anggota)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedEventId !== "none" && selectedEvent && (
            <>
              {/* Filter anggota */}
              <div className="flex flex-wrap gap-3">
                {/* Filter Desa & Kelompok hanya tampil untuk event Daerah */}
                {selectedEvent.level === "Daerah" && (
                  <>
                    <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Desa</SelectItem>
                        {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterKelompok} onValueChange={setFilterKelompok}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kelompok</SelectItem>
                        {kelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Select value={filterVisa} onValueChange={setFilterVisa}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Visa</SelectItem>
                    {VISA_STATUS_LIST.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMuballigh} onValueChange={setFilterMuballigh}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Seluruh Jamaah</SelectItem>
                    <SelectItem value="muballigh_both">Mubaligh &amp; Mubalighot</SelectItem>
                    <SelectItem value="muballigh_only">Mubaligh Saja</SelectItem>
                    <SelectItem value="muballighot_only">Mubalighot Saja</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis Kelamin</SelectItem>
                    <SelectItem value="ibu_ibu">👩 Ibu-ibu (Menikah/Janda)</SelectItem>
                    <SelectItem value="perempuan_all">Semua Perempuan</SelectItem>
                    <SelectItem value="laki_laki">Laki-laki</SelectItem>
                  </SelectContent>
                </Select>
                {selectedEvent.level === "Daerah" && (
                  <Select value={filterDapukan} onValueChange={setFilterDapukan}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Dapukan</SelectItem>
                      {DAPUKAN_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={handleSave} disabled={saving || filledCount === 0} className="ml-auto">
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

        <TabsContent value="chart" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 mb-2">
            <Select value={viewYear} onValueChange={setViewYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AttendanceChart
            attendances={attendances}
            members={members}
            year={Number(viewYear)}
            filterDesa={isAdminDesa ? userDesa : isAdminKelompok ? userDesa : undefined}
            filterKelompok={isAdminKelompok ? userKelompok : undefined}
          />
        </TabsContent>

        <TabsContent value="event" className="mt-4">
          <EventAttendancePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}