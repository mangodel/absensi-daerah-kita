import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS, VISA_STATUS_LIST, DAPUKAN_LIST, DAPUKAN_4S } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { CalendarCheck, Save, Loader2, CalendarDays, QrCode } from "lucide-react";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import AttendanceHistory from "@/components/attendance/AttendanceHistory";
import AttendanceChart from "@/components/attendance/AttendanceChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import QREventTab from "@/components/attendance/QREventTab";
import PullToRefresh from "@/components/PullToRefresh";
import { MobileSelect } from "@/components/ui/mobile-select";
import { useIsMobile } from "@/hooks/use-mobile";
import ContinuousCameraScanner from "@/components/shared/ContinuousCameraScanner";
import { toast } from "sonner";

const levelColors = {
  "Daerah": "bg-primary/10 text-primary border-primary/20",
  "Desa": "bg-accent/10 text-accent border-accent/20",
  "Kelompok": "bg-orange-50 text-orange-600 border-orange-200",
};

export default function Attendance() {
  const isMobile = useIsMobile();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedEventId, setSelectedEventId] = useState("none");
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [filterVisa, setFilterVisa] = useState("all");
  const [filterMuballigh, setFilterMuballigh] = useState("all"); // "all" | "muballigh_only" | "muballighot_only" | "muballigh_both"
  const [filterDapukan, setFilterDapukan] = useState("all");
  const [filterAgeGroup, setFilterAgeGroup] = useState("all"); // "all" | "dewasa" | "generus"
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewYear, setViewYear] = useState(String(currentYear));
  const [viewMonth, setViewMonth] = useState(String(currentMonth));
  const [showQrScanner, setShowQrScanner] = useState(false);

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
  // Filter: from today onwards
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const events = filterEvents(allEvents).filter(e => {
    if (!e.date) return false;
    const eDate = new Date(e.date);
    eDate.setHours(0, 0, 0, 0);
    // Show events from today onwards
    if (eDate < today) return false;
    if (isAdminKelompok) {
      return e.level === "Daerah" ||
        (e.level === "Desa" && e.desa === userDesa) ||
        (e.level === "Kelompok" && e.kelompok === userKelompok);
    }
    return true;
  });

  // Group events by level for grouped select
  const groupedEvents = {
    "Daerah": events.filter(e => e.level === "Daerah"),
    "Desa": events.filter(e => e.level === "Desa"),
    "Kelompok": events.filter(e => e.level === "Kelompok"),
  };

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
    // Filter by participant_filter (preset, supports single or JSON multi-select)
    const pf = selectedEvent.participant_filter;
    if (pf) {
      const age = thisYear - (m.birth_year || thisYear);
      const matchPreset = (key) => {
        if (key === "4s") return DAPUKAN_4S.includes(m.dapukan);
        if (key === "mubaligh_both") return m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot";
        if (key === "mubaligh_only") return m.muballigh_status === "Muballigh";
        if (key === "mubalighot_only") return m.muballigh_status === "Muballighot";
        if (key === "generus_smp") return age >= 12 && age <= 14;
        if (key === "generus_sma") return age >= 15 && age <= 17;
        if (key === "dewasa") return age >= 18;
        if (key === "usia_nikah") return age >= 18 && (m.marital_status === "Belum Menikah" || !m.marital_status);
        if (key === "ibu_ibu") {
          const s = (m.marital_status || "").toLowerCase().trim();
          return (m.gender === "Perempuan") && ["menikah","cerai","janda/duda","janda","duda"].includes(s);
        }
        return true;
      };
      if (pf.startsWith("[")) {
        try {
          const keys = JSON.parse(pf);
          if (keys.length > 0) return keys.some(k => matchPreset(k));
        } catch {}
      } else {
        return matchPreset(pf);
      }
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
    let matchAge = true;
    if (filterAgeGroup === "dewasa") {
      const age = m.birth_year ? thisYear - m.birth_year : 999;
      matchAge = age >= 18;
    } else if (filterAgeGroup === "generus") {
      const age = m.birth_year ? thisYear - m.birth_year : 999;
      matchAge = age < 18;
    }
    return matchDesa && matchKelompok && matchVisa && matchDapukan && matchMuballigh && matchAge;
  });

  const handleStatusChange = (memberId, status) => {
    setAttendanceData(prev => {
      if (status === null) {
        const next = { ...prev };
        delete next[memberId];
        return next;
      }
      return { ...prev, [memberId]: status };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (records) => {
      if (records.length > 0) {
        await base44.entities.Attendance.bulkCreate(records);
      }
    },
    onMutate: async (records) => {
      await queryClient.cancelQueries({ queryKey: ["attendances"] });
      const prevData = queryClient.getQueryData(["attendances"]);
      queryClient.setQueryData(["attendances"], old => [...(old || []), ...records]);
      return { prevData };
    },
    onError: (err, newData, context) => {
      if (context?.prevData) queryClient.setQueryData(["attendances"], context.prevData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      setAttendanceData({});
    },
  });

  const handleSave = async () => {
    if (!selectedEvent) return;

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

    saveMutation.mutate(records);
  };

  const handleQrScan = (qrValue) => {
    if (!selectedEvent) {
      toast.error("Pilih kegiatan terlebih dahulu");
      return;
    }

    // Try to find member by member_id or participant_id
    const member = filteredMembers.find(m => m.member_id === qrValue || m.id === qrValue);
    if (!member) {
      toast.error(`Member tidak ditemukan: ${qrValue}`);
      return;
    }

    // Auto-record as "Hadir"
    handleStatusChange(member.id, "Hadir");
    toast.success(`✓ ${member.full_name} - Hadir`);
  };

  const filledCount = Object.keys(attendanceData).length;
  const isSaving = saveMutation.isPending;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" /> {pt.attendance || "Absensi"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pt.attendance_subtitle || "Kelola kehadiran jamaah per kegiatan"}</p>
        </div>
      </div>

      <Tabs defaultValue="input">
        <TabsList>
          <TabsTrigger value="input">Input Absensi</TabsTrigger>
          <TabsTrigger value="qr"><QrCode className="w-3.5 h-3.5 mr-1" />QR Event</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
          <TabsTrigger value="chart">Grafik</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4 mt-4">
          {/* QR Scanner Panel */}
          {selectedEventId !== "none" && selectedEvent && (
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">Scan QR Code Jamaah</h3>
                </div>
                <Button
                  size="sm"
                  variant={showQrScanner ? "default" : "outline"}
                  onClick={() => setShowQrScanner(!showQrScanner)}
                  className="text-xs"
                >
                  {showQrScanner ? "Sembunyikan" : "Buka"} Scanner
                </Button>
              </div>
              {showQrScanner && (
                <ContinuousCameraScanner
                  onScan={handleQrScan}
                  onError={(err) => toast.error(err)}
                />
              )}
            </div>
          )}

          {/* Event Selector */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Pilih Kegiatan
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedEventId} onValueChange={v => { setSelectedEventId(v); setAttendanceData({}); }}>
                <SelectTrigger className="flex-1 min-w-72">
                  <SelectValue placeholder="Pilih kegiatan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Pilih Kegiatan —</SelectItem>
                  {["Daerah", "Desa", "Kelompok"].map(level => {
                    const grp = groupedEvents[level];
                    if (!grp || grp.length === 0) return null;
                    return (
                      <SelectGroup key={level}>
                        <SelectLabel className={`text-xs font-bold px-2 py-1.5 uppercase tracking-wider rounded-md mx-1 mb-1 ${levelColors[level]}`}>
                          {level} ({grp.length})
                        </SelectLabel>
                        {grp.map(e => {
                          const displayLabel = `${e.name}`;
                          const displayDate = e.date ? format(new Date(e.date), "dd MMM", { locale: id }) : "";
                          const displayLocation = [];
                          if (e.desa) displayLocation.push(e.desa);
                          if (e.kelompok) displayLocation.push(e.kelompok);
                          const locationStr = displayLocation.length > 0 ? ` (${displayLocation.join(" / ")})` : "";
                          return (
                            <SelectItem key={e.id} value={e.id} className="pl-6">
                              <span className="font-medium">{displayLabel}</span>
                              {displayDate && <span className="text-muted-foreground ml-2">· {displayDate}</span>}
                              {locationStr && <span className="text-muted-foreground ml-1">{locationStr}</span>}
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

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
                      (() => {
                        const pf = selectedEvent.participant_filter;
                        const PRESET_LABELS = { "4s": "4S", mubaligh_both: "Semua Mubaligh & Mubalighot", mubaligh_only: "Mubaligh Saja", mubalighot_only: "Mubalighot Saja", generus_smp: "Generus SMP", generus_sma: "Generus SMA", dewasa: "Dewasa 18+", usia_nikah: "Usia Nikah (Lajang 18+)", ibu_ibu: "Ibu-ibu" };
                        let keys = [];
                        if (pf.startsWith("[")) { try { keys = JSON.parse(pf); } catch {} } else keys = [pf];
                        return keys.map(k => (
                          <Badge key={k} className="text-[10px] bg-accent/10 text-accent border-accent/20">{PRESET_LABELS[k] || k}</Badge>
                        ));
                      })()
                    ) : (
                      selectedEvent.participant_dapukan.map(d => (
                        <Badge key={d} className="text-[10px] bg-primary/10 text-primary border-primary/20">{d}</Badge>
                      ))
                    )}
                    <span className="text-xs text-muted-foreground ml-1">({filteredMembers.length} jamaah)</span>
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
                    isMobile ? (
                      <>
                        <MobileSelect value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }} label="Desa" options={["all", ...desaList]} placeholder="Desa" />
                        <MobileSelect value={filterKelompok} onValueChange={setFilterKelompok} label="Kelompok" options={["all", ...kelompokList]} placeholder="Kelompok" />
                      </>
                    ) : (
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
                    )
                  )}
                  {isMobile ? (
                    <>
                      <MobileSelect value={filterVisa} onValueChange={setFilterVisa} label="Visa" options={["all", ...VISA_STATUS_LIST]} placeholder="Visa" />
                      <MobileSelect value={filterMuballigh} onValueChange={setFilterMuballigh} label="Muballigh" options={["all", "muballigh_both", "muballigh_only", "muballighot_only"]} placeholder="Muballigh" />
                      {selectedEvent.level === "Daerah" && (
                       <MobileSelect value={filterDapukan} onValueChange={setFilterDapukan} label="Dapukan" options={["all", ...DAPUKAN_LIST]} placeholder="Dapukan" />
                      )}
                      <MobileSelect value={filterAgeGroup} onValueChange={setFilterAgeGroup} label="Usia" options={["all", "dewasa", "generus"]} placeholder="Usia" />
                      </>
                      ) : (
                      <>
                      <Select value={filterVisa} onValueChange={setFilterVisa}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Visa</SelectItem>
                          {VISA_STATUS_LIST.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterMuballigh} onValueChange={setFilterMuballigh}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Seluruh Jamaah</SelectItem>
                          <SelectItem value="muballigh_both">Mubaligh &amp; Mubalighot</SelectItem>
                          <SelectItem value="muballigh_only">Mubaligh Saja</SelectItem>
                          <SelectItem value="muballighot_only">Mubalighot Saja</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterAgeGroup} onValueChange={setFilterAgeGroup}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Usia</SelectItem>
                          <SelectItem value="dewasa">Jamaah Dewasa (18+)</SelectItem>
                          <SelectItem value="generus">Generus (&lt;18 thn)</SelectItem>
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
                      </>
                      )}
                  <Button onClick={handleSave} disabled={isSaving || filledCount === 0} className="ml-auto">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Simpan ({filledCount})
                  </Button>
              </div>

              <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ["attendances"] })}>
                <AttendanceTable
                  members={filteredMembers}
                  attendanceData={attendanceData}
                  onStatusChange={handleStatusChange}
                />
              </PullToRefresh>
            </>
          )}

          {selectedEventId === "none" && (
            <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
              <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Pilih kegiatan di atas untuk mulai input absensi.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="qr" className="mt-4">
          <QREventTab events={events} members={members} />
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
      </Tabs>
    </div>
  );
}