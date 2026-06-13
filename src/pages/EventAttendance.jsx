import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Users, BarChart3, Settings, Link2, Trash2, History } from "lucide-react";
import EventSessionManager from "@/components/event-attendance/EventSessionManager";
import ParticipantRegistration from "@/components/event-attendance/ParticipantRegistration";
import QRScanner from "@/components/event-attendance/QRScanner";
import CheckinDashboard from "@/components/event-attendance/CheckinDashboard";
import FormConfigEditor from "@/components/event-attendance/FormConfigEditor";
import DeletedEventsHistory from "@/components/event-attendance/DeletedEventsHistory";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

export default function EventAttendance() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeEventId, setActiveEventId] = useState(null);
  const [tab, setTab] = useState("scanner");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me(),
  });

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

  const deleteMut = useMutation({
    mutationFn: async (eventId) => {
      const event = events.find(e => e.id === eventId);
      const linkedEventName = mainEvents.find(e => e.id === event?.linked_event_id)?.name || event?.event_name || "Unknown";
      
      // Create audit log
      await base44.entities.AuditLog.create({
        action_type: "DELETE_EVENT",
        target_id: eventId,
        target_name: linkedEventName,
        performed_by: user?.email || "Unknown",
        performed_by_name: user?.full_name || "Unknown User",
        performed_at: new Date().toISOString(),
      });

      // Delete the event
      await base44.entities.EventSession.delete(eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-sessions"] });
      qc.invalidateQueries({ queryKey: ["audit-logs-delete-event"] });
      setActiveEventId(null);
      toast({ description: "Event QR berhasil dihapus." });
    },
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
        <TabsList className="grid grid-cols-6 w-full">
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
          <TabsTrigger value="deleted" className="text-xs sm:text-sm">
            <History className="w-4 h-4 mr-1 sm:mr-1.5" /><span className="hidden sm:inline">Dihapus</span><span className="sm:hidden">Log</span>
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
        <TabsContent value="deleted" className="mt-4">
          <DeletedEventsHistory />
        </TabsContent>
        </Tabs>

        {/* Delete QR Event Button - shown only if active event is QR event */}
        {activeEvent && activeEvent.linked_event_id && (
        <div className="fixed bottom-20 md:bottom-4 right-4 md:right-auto left-4 md:left-auto">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(`Hapus event QR "${activeEvent.event_name}"? Aksi ini tidak bisa dibatalkan.`)) {
                deleteMut.mutate(activeEventId);
              }
            }}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus Event QR
          </Button>
        </div>
        )}
        </div>
        );
        }