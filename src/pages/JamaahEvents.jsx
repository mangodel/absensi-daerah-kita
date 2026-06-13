import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CalendarDays, QrCode, CheckCircle, Loader2, X, MapPin, Clock, BookOpen, Mic, StickyNote, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { format, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EventReminderButton from "@/components/portal/EventReminderButton";
import { useEventReminderChecker } from "@/hooks/useEventReminders";

const LEVEL_COLORS = {
  Daerah: "bg-indigo-100 text-indigo-700 border-indigo-300",
  Desa: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Kelompok: "bg-amber-100 text-amber-700 border-amber-300",
};

const LEVEL_DOT = {
  Daerah: "bg-indigo-500",
  Desa: "bg-emerald-500",
  Kelompok: "bg-amber-500",
};

const LEVEL_ICON_BG = {
  Daerah: "bg-indigo-100",
  Desa: "bg-emerald-100",
  Kelompok: "bg-amber-100",
};

const LEVEL_ICON_COLOR = {
  Daerah: "text-indigo-600",
  Desa: "text-emerald-600",
  Kelompok: "text-amber-600",
};

const LEVEL_CARD_BORDER = {
  Daerah: "border-indigo-200 bg-indigo-50/40",
  Desa: "border-emerald-200 bg-emerald-50/40",
  Kelompok: "border-amber-200 bg-amber-50/40",
};

export default function JamaahEvents() {
  const queryClient = useQueryClient();
  const [jamaahUser, setJamaahUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanEvent, setScanEvent] = useState(null); // event being scanned for
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(null);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => setJamaahUser(u)).catch(() => setJamaahUser(null)).finally(() => setCheckingAuth(false));
  }, []);

  const { data: members = [] } = useQuery({
    queryKey: ["my-member-events", jamaahUser?.email],
    queryFn: () => base44.entities.Member.list(),
    enabled: !!jamaahUser,
  });

  const myMember = jamaahUser?.email
    ? members.find(m => m.email?.toLowerCase() === jamaahUser.email?.toLowerCase())
    : null;

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["events-public"],
    queryFn: () => base44.entities.Event.list("-date"),
    enabled: !!jamaahUser,
  });

  // Filter events based on member's desa/kelompok
  const visibleEvents = allEvents.filter(ev => {
    if (ev.level === "Daerah") return true;
    if (ev.level === "Desa") return myMember && ev.desa === myMember.desa;
    if (ev.level === "Kelompok") return myMember && ev.desa === myMember.desa && ev.kelompok === myMember.kelompok;
    return false;
  });

  // Events this month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOffset = (getDay(monthStart) + 6) % 7; // Monday start

  const getEventsForDay = (day) =>
    visibleEvents.filter(ev => ev.date && isSameDay(new Date(ev.date), day));

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // Check existing attendance for today
  const { data: myAttendances = [] } = useQuery({
    queryKey: ["my-attendances", myMember?.id],
    queryFn: () => base44.entities.Attendance.filter({ member_id: myMember.id }),
    enabled: !!myMember,
  });

  const checkinMutation = useMutation({
    mutationFn: async ({ eventId, eventName, eventLevel }) => {
      if (!myMember) throw new Error("Data anggota tidak ditemukan");
      const event = allEvents.find(e => e.id === eventId);
      if (!event) throw new Error("Event tidak ditemukan");

      // Check if already checked in
      const today = new Date().toISOString().slice(0, 10);
      const alreadyIn = myAttendances.find(a => a.event_id === eventId && a.date === today);
      if (alreadyIn) throw new Error("Anda sudah mengisi absensi untuk event ini hari ini");

      return base44.entities.Attendance.create({
        member_id: myMember.id,
        member_name: myMember.full_name,
        desa: myMember.desa,
        kelompok: myMember.kelompok,
        date: event.date || today,
        status: "Hadir",
        month: new Date(event.date || today).getMonth() + 1,
        year: new Date(event.date || today).getFullYear(),
        event_id: eventId,
        event_name: eventName,
        event_level: eventLevel,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-attendances"] });
      setCheckinSuccess(vars.eventName);
      setScanOpen(false);
      stopScanner();
      toast.success("Absensi berhasil dicatat!");
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mencatat absensi");
    },
  });

  const startScanner = async (eventForScan) => {
    setScanEvent(eventForScan);
    setScanResult(null);
    setScanOpen(true);
  };

  useEffect(() => {
    if (!scanOpen) { stopScanner(); return; }
    // Small delay for DOM
    const timer = setTimeout(() => initScanner(), 300);
    return () => clearTimeout(timer);
  }, [scanOpen]);

  const initScanner = async () => {
    if (!scannerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrRef.current = new Html5Qrcode("event-qr-scanner");
      setScanning(true);
      await html5QrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
          if (decodedText.startsWith("EVENT:")) {
            const eventId = decodedText.replace("EVENT:", "");
            const found = allEvents.find(e => e.id === eventId);
            if (!found) { toast.error("QR event tidak valid"); return; }
            setScanResult(found);
            stopScanner();
          } else {
            toast.error("QR ini bukan QR absensi event");
          }
        },
        () => {}
      );
    } catch (e) {
      console.error("Scanner init error", e);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {}).finally(() => {
        html5QrRef.current = null;
        setScanning(false);
      });
    }
  };

  const handleScanClose = () => {
    stopScanner();
    setScanOpen(false);
    setScanResult(null);
    setScanEvent(null);
  };

  const handleDirectCheckin = (event) => {
    checkinMutation.mutate({ eventId: event.id, eventName: event.name, eventLevel: event.level });
  };

  const handleConfirmScanCheckin = () => {
    if (!scanResult) return;
    checkinMutation.mutate({ eventId: scanResult.id, eventName: scanResult.name, eventLevel: scanResult.level });
  };

  // Fire browser notifications for saved reminders
  useEventReminderChecker(visibleEvents);

  const prevMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!jamaahUser) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Silakan login untuk melihat kegiatan</p>
          <Link to="/jamaah-login"><Button className="w-full">Masuk</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  // Grouped upcoming events for Daftar tab
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingEvents = visibleEvents
    .filter(ev => ev.date && new Date(ev.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const byLevel = {
    Daerah: upcomingEvents.filter(e => e.level === "Daerah"),
    Desa: upcomingEvents.filter(e => e.level === "Desa"),
    Kelompok: upcomingEvents.filter(e => e.level === "Kelompok"),
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Kegiatan</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => startScanner(null)}>
            <QrCode className="w-3.5 h-3.5" /> Scan QR
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Info scope */}
        {myMember && (
          <div className="mb-3 p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Menampilkan kegiatan untuk: <span className="font-semibold text-foreground">{myMember.desa}</span>
              {myMember.kelompok && <> · <span className="font-semibold text-foreground">{myMember.kelompok}</span></>}
            </p>
          </div>
        )}

        <Tabs defaultValue="daftar">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="daftar" className="flex-1">Daftar</TabsTrigger>
            <TabsTrigger value="kalender" className="flex-1">Kalender</TabsTrigger>
          </TabsList>

          {/* ===== TAB DAFTAR ===== */}
          <TabsContent value="daftar" className="space-y-5">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : upcomingEvents.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-10 text-center">
                <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">Tidak ada kegiatan mendatang</p>
              </div>
            ) : (
              <>
                {byLevel.Daerah.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> Tingkat Daerah
                    </h2>
                    <div className="space-y-3">
                      {byLevel.Daerah.map(ev => (
                        <DetailEventCard key={ev.id} event={ev} myMember={myMember} myAttendances={myAttendances} onCheckin={handleDirectCheckin} isPending={checkinMutation.isPending} />
                      ))}
                    </div>
                  </section>
                )}
                {byLevel.Desa.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Tingkat Desa
                    </h2>
                    <div className="space-y-3">
                      {byLevel.Desa.map(ev => (
                        <DetailEventCard key={ev.id} event={ev} myMember={myMember} myAttendances={myAttendances} onCheckin={handleDirectCheckin} isPending={checkinMutation.isPending} />
                      ))}
                    </div>
                  </section>
                )}
                {byLevel.Kelompok.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Tingkat Kelompok
                    </h2>
                    <div className="space-y-3">
                      {byLevel.Kelompok.map(ev => (
                        <DetailEventCard key={ev.id} event={ev} myMember={myMember} myAttendances={myAttendances} onCheckin={handleDirectCheckin} isPending={checkinMutation.isPending} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </TabsContent>

          {/* ===== TAB KALENDER ===== */}
          <TabsContent value="kalender">
            {/* Calendar navigation */}
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="sm" onClick={prevMonth}>‹</Button>
              <h2 className="text-sm font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: id })}
              </h2>
              <Button variant="ghost" size="sm" onClick={nextMonth}>›</Button>
            </div>

            {/* Calendar grid */}
            <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
              <div className="grid grid-cols-7 border-b border-border">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {daysInMonth.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                      className={`aspect-square flex flex-col items-center justify-center gap-0.5 text-xs transition-colors
                        ${isToday(day) ? "font-bold text-primary" : "text-foreground"}
                        ${isSelected ? "bg-primary/10 rounded-lg" : "hover:bg-secondary/50"}
                      `}
                    >
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs
                        ${isToday(day) ? "bg-primary text-white font-bold" : ""}
                        ${isSelected && !isToday(day) ? "bg-primary/20 text-primary" : ""}
                      `}>{format(day, "d")}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5">
                          {dayEvents.slice(0, 3).map((ev, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${LEVEL_DOT[ev.level] || "bg-gray-400"}`} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {[["Daerah", "bg-indigo-500"], ["Desa", "bg-emerald-500"], ["Kelompok", "bg-amber-500"]].map(([label, dot]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  {format(selectedDay, "EEEE, dd MMMM yyyy", { locale: id })}
                </h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Tidak ada kegiatan</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(ev => <DetailEventCard key={ev.id} event={ev} myMember={myMember} myAttendances={myAttendances} onCheckin={handleDirectCheckin} isPending={checkinMutation.isPending} />)}
                  </div>
                )}
              </div>
            )}

            {/* All events this month */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Semua Kegiatan — {format(currentMonth, "MMMM yyyy", { locale: id })}
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-2">
                  {visibleEvents
                    .filter(ev => ev.date && isSameMonth(new Date(ev.date), currentMonth))
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(ev => <DetailEventCard key={ev.id} event={ev} myMember={myMember} myAttendances={myAttendances} onCheckin={handleDirectCheckin} isPending={checkinMutation.isPending} />)
                  }
                  {visibleEvents.filter(ev => ev.date && isSameMonth(new Date(ev.date), currentMonth)).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Tidak ada kegiatan bulan ini</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Checkin success modal */}
      {checkinSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCheckinSuccess(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-xs w-full text-center space-y-3 shadow-2xl">
            <CheckCircle className="w-16 h-16 text-accent mx-auto" />
            <p className="font-bold text-lg">Absensi Berhasil!</p>
            <p className="text-sm text-muted-foreground">{checkinSuccess}</p>
            <Button className="w-full" onClick={() => setCheckinSuccess(null)}>Tutup</Button>
          </div>
        </div>
      )}

      {/* QR Scanner Dialog */}
      <Dialog open={scanOpen} onOpenChange={handleScanClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <QrCode className="w-4 h-4 text-primary" /> Scan QR Absensi Event
            </DialogTitle>
          </DialogHeader>

          {!scanResult ? (
            <div className="space-y-3">
              <div id="event-qr-scanner" className="w-full rounded-xl overflow-hidden border border-border" style={{ minHeight: 280 }} />
              <p className="text-xs text-muted-foreground text-center">Arahkan kamera ke QR Code event</p>
              <Button variant="outline" onClick={handleScanClose} className="w-full">Batal</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-accent/10 rounded-xl p-4 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-accent mx-auto" />
                <p className="font-semibold text-sm">{scanResult.name}</p>
                {scanResult.date && <p className="text-xs text-muted-foreground">{format(new Date(scanResult.date), "dd MMMM yyyy", { locale: id })}</p>}
                <Badge variant="outline" className={`text-xs ${LEVEL_COLORS[scanResult.level]}`}>{scanResult.level}</Badge>
              </div>
              <p className="text-xs text-muted-foreground text-center">Konfirmasi absensi Anda untuk kegiatan ini?</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleScanClose} className="flex-1">Batal</Button>
                <Button onClick={handleConfirmScanCheckin} disabled={checkinMutation.isPending} className="flex-1 bg-accent hover:bg-accent/90">
                  {checkinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Konfirmasi Hadir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailEventCard({ event, myMember, myAttendances, onCheckin, isPending }) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const isEventToday = event.date === today;
  const alreadyCheckedIn = myAttendances?.some(a => a.event_id === event.id && a.date === event.date);
  const hasDetails = event.materi || event.pemateri || event.notes || event.description || event.document_url;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${isEventToday ? "ring-2 ring-offset-1 ring-indigo-400" : ""} ${LEVEL_CARD_BORDER[event.level] || "border-border bg-card"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${LEVEL_ICON_BG[event.level]}`}>
            <CalendarDays className={`w-5 h-5 ${LEVEL_ICON_COLOR[event.level]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm leading-tight">{event.name}</p>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${LEVEL_COLORS[event.level]}`}>{event.level}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {event.date && format(new Date(event.date), "EEEE, dd MMM yyyy", { locale: id })}
              </span>
              {event.time && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {event.time}
                </span>
              )}
              {event.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {event.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <EventReminderButton event={event} />
          {isEventToday && myMember && (
            alreadyCheckedIn ? (
              <div className="flex items-center gap-1.5 text-accent">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Sudah Hadir</span>
              </div>
            ) : (
              <Button size="sm" className="h-7 text-xs px-3 bg-accent hover:bg-accent/90" onClick={() => onCheckin(event)} disabled={isPending}>
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Catat Hadir"}
              </Button>
            )
          )}
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Sembunyikan</> : <><ChevronDown className="w-3.5 h-3.5" /> Detail</>}
            </button>
          )}
        </div>
      </div>

      {/* Expandable detail section */}
      {expanded && hasDetails && (
        <div className="border-t border-border/50 px-4 py-3 bg-white/60 dark:bg-slate-900/40 space-y-2">
          {event.description && (
            <p className="text-xs text-muted-foreground">{event.description}</p>
          )}
          {event.materi && (
            <div className="flex items-start gap-2 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-primary/70 shrink-0 mt-0.5" />
              <div><span className="font-semibold text-foreground">Materi: </span>{event.materi}</div>
            </div>
          )}
          {event.pemateri && (
            <div className="flex items-start gap-2 text-xs">
              <Mic className="w-3.5 h-3.5 text-accent/80 shrink-0 mt-0.5" />
              <div><span className="font-semibold text-foreground">Pemateri: </span>{event.pemateri}</div>
            </div>
          )}
          {event.notes && (
            <div className="flex items-start gap-2 text-xs">
              <StickyNote className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
              <div><span className="font-semibold text-foreground">Catatan: </span>{event.notes}</div>
            </div>
          )}
          {event.document_url && (
            <a href={event.document_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline">
              <FileText className="w-3.5 h-3.5" />
              {event.document_name || "Lihat Dokumen"}
            </a>
          )}
        </div>
      )}
    </div>
  );
}