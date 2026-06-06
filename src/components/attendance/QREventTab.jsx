/**
 * QREventTab — bridge between the main Attendance page and the EventAttendance QR system.
 * Shows active EventSessions that correspond to main Event schedules,
 * and allows quick check-in / scan from within the regular attendance workflow.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, ExternalLink, CalendarDays, Users, BarChart3, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import QRScanner from "@/components/event-attendance/QRScanner";
import CheckinDashboard from "@/components/event-attendance/CheckinDashboard";

const statusColor = {
  Active: "bg-accent/10 text-accent border-accent/20",
  Draft: "bg-secondary text-muted-foreground border-border",
  Closed: "bg-secondary text-muted-foreground border-border",
};

export default function QREventTab({ events = [], members = [] }) {
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [view, setView] = useState("list"); // list | scanner | dashboard

  const { data: sessions = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list("-created_date"),
  });

  const { data: formConfigs = [] } = useQuery({
    queryKey: ["event-form-config-all"],
    queryFn: () => base44.entities.EventFormConfig.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants-all"],
    queryFn: () => base44.entities.EventParticipant.list(),
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["event-checkins-all"],
    queryFn: () => base44.entities.EventCheckin.list(),
    refetchInterval: 10000,
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const formConfig = formConfigs.find(c => c.event_id === selectedSessionId) || null;

  // Enrich sessions with linked Event info
  const enrichedSessions = sessions.map(s => {
    const linked = s.linked_event_id ? events.find(e => e.id === s.linked_event_id) : null;
    const paxCount = participants.filter(p => p.event_id === s.id).length;
    const checkinCount = checkins.filter(c => c.event_id === s.id).length;
    return { ...s, linkedEvent: linked, paxCount, checkinCount };
  });

  if (view === "scanner" && selectedSessionId) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => { setView("list"); setSelectedSessionId(null); }}>
          ← Kembali
        </Button>
        <div>
          <p className="font-semibold text-sm">{selectedSession?.event_name}</p>
          <p className="text-xs text-muted-foreground">{selectedSession?.event_date ? format(new Date(selectedSession.event_date), "dd MMMM yyyy", { locale: id }) : ""}</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setView("dashboard")}>
          <BarChart3 className="w-4 h-4 mr-1" /> Dashboard
        </Button>
      </div>
      <QRScanner eventId={selectedSessionId} eventName={selectedSession?.event_name} formConfig={formConfig} />
    </div>
  );

  if (view === "dashboard" && selectedSessionId) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setView("scanner")}>← Scanner</Button>
        <Button variant="outline" size="sm" onClick={() => { setView("list"); setSelectedSessionId(null); }}>
          Daftar Event
        </Button>
      </div>
      <CheckinDashboard eventId={selectedSessionId} eventName={selectedSession?.event_name} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Pilih event untuk mulai scan QR atau lihat statistik kehadiran.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/event-attendance"}>
          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Buka Halaman Event
        </Button>
      </div>

      {enrichedSessions.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <QrCode className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">Belum ada event. Buat event di halaman Absensi Event.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = "/event-attendance"}>
            Buka Absensi Event <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {enrichedSessions.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{s.event_name}</p>
                <Badge variant="outline" className={`text-xs ${statusColor[s.status] || ""}`}>{s.status}</Badge>
                {s.linkedEvent && (
                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                    {s.linkedEvent.level}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.event_date ? format(new Date(s.event_date), "dd MMMM yyyy", { locale: id }) : ""}
                {s.venue ? ` · ${s.venue}` : ""}
              </p>
              {s.linkedEvent && (
                <p className="text-xs text-primary/70 mt-0.5">↗ Dari jadwal: {s.linkedEvent.name}</p>
              )}
              <div className="flex items-center gap-4 mt-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {s.paxCount} peserta
                </span>
                <span className="text-xs text-accent flex items-center gap-1">
                  <QrCode className="w-3 h-3" /> {s.checkinCount} hadir
                </span>
                {s.paxCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round((s.checkinCount / s.paxCount) * 100)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm" variant="outline"
                onClick={() => { setSelectedSessionId(s.id); setView("dashboard"); }}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1" /> Stats
              </Button>
              <Button
                size="sm"
                disabled={s.status === "Closed"}
                onClick={() => { setSelectedSessionId(s.id); setView("scanner"); }}
              >
                <QrCode className="w-3.5 h-3.5 mr-1" /> Scan
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}