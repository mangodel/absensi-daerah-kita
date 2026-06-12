import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Users, BarChart3, Settings, Link2 } from "lucide-react";
import EventSessionManager from "@/components/event-attendance/EventSessionManager";
import ParticipantRegistration from "@/components/event-attendance/ParticipantRegistration";
import QRScanner from "@/components/event-attendance/QRScanner";
import CheckinDashboard from "@/components/event-attendance/CheckinDashboard";
import FormConfigEditor from "@/components/event-attendance/FormConfigEditor";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function EventAttendance() {
  const [activeEventId, setActiveEventId] = useState(null);
  const [tab, setTab] = useState("scanner");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const { data: events = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list("-created_date"),
  });

  const { data: mainEvents = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date"),
  });

  const { data: formConfigs = [] } = useQuery({
    queryKey: ["event-form-config-all"],
    queryFn: () => base44.entities.EventFormConfig.list(),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter events from today onwards
  const filteredEvents = events.filter(e => {
    if (!e.event_date) return false;
    const eventDate = new Date(e.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today && e.status === "Active";
  });

  // Separate QR events (has linked_event_id) and non-QR events
  const qrEvents = filteredEvents.filter(e => e.linked_event_id);
  const nonQrEvents = filteredEvents.filter(e => !e.linked_event_id);

  const displayEvents = 
    eventTypeFilter === "qr" ? qrEvents :
    eventTypeFilter === "non-qr" ? nonQrEvents :
    filteredEvents;

  const activeEvents = filteredEvents.filter(e => e.status === "Active");
  const activeEvent = events.find(e => e.id === activeEventId);
  const formConfig = formConfigs.find(c => c.event_id === activeEventId) || null;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Absensi Event</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registrasi online, QR scan & dashboard kehadiran</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
             <SelectTrigger className="w-44">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Semua Event</SelectItem>
               <SelectItem value="qr">Event QR ({qrEvents.length})</SelectItem>
               <SelectItem value="non-qr">Event Non-QR ({nonQrEvents.length})</SelectItem>
             </SelectContent>
           </Select>
           <Select value={activeEventId || ""} onValueChange={v => setActiveEventId(v || null)}>
             <SelectTrigger className="w-56">
               <SelectValue placeholder="Pilih Event Aktif..." />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value={null}>— Semua Event —</SelectItem>
               {displayEvents.map(e => (
                 <SelectItem key={e.id} value={e.id}>
                   {e.event_name}
                   {e.event_date ? ` · ${format(new Date(e.event_date), "dd MMM", { locale: id })}` : ""}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
          {activeEvent && (
            <Badge className={`text-xs ${activeEvent.status === "Active" ? "bg-accent/10 text-accent border-accent/20" : "bg-secondary text-muted-foreground"}`}>
              {activeEvent.status}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="scanner" className="text-xs sm:text-sm">
            <QrCode className="w-4 h-4 mr-1 sm:mr-1.5" /><span className="hidden sm:inline">QR </span>Scan
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 mr-1 sm:mr-1.5" />Peserta
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 mr-1 sm:mr-1.5" /><span className="hidden sm:inline">Dash</span><span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="register" className="text-xs sm:text-sm">
            <Link2 className="w-4 h-4 mr-1 sm:mr-1.5" /><span className="hidden sm:inline">Form </span>Reg
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">
            <Settings className="w-4 h-4 mr-1 sm:mr-1.5" />Event
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="mt-4">
          <QRScanner eventId={activeEventId} eventName={activeEvent?.event_name} formConfig={formConfig} />
        </TabsContent>
        <TabsContent value="participants" className="mt-4">
          <ParticipantRegistration eventId={activeEventId} />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <CheckinDashboard eventId={activeEventId} eventName={activeEvent?.event_name} />
        </TabsContent>
        <TabsContent value="register" className="mt-4">
          <FormConfigEditor eventId={activeEventId} eventName={activeEvent?.event_name} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <EventSessionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}