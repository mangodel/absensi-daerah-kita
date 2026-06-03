import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Users, BarChart3, Settings } from "lucide-react";
import EventSessionManager from "@/components/event-attendance/EventSessionManager";
import ParticipantRegistration from "@/components/event-attendance/ParticipantRegistration";
import QRScanner from "@/components/event-attendance/QRScanner";
import CheckinDashboard from "@/components/event-attendance/CheckinDashboard";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function EventAttendance() {
  const [activeEventId, setActiveEventId] = useState(null);
  const [tab, setTab] = useState("scanner");

  const { data: events = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list(),
  });

  const activeEvents = events.filter(e => e.status === "Active");
  const activeEvent = events.find(e => e.id === activeEventId);

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Absensi Event</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registrasi, QR scan & dashboard kehadiran</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeEventId || ""} onValueChange={v => setActiveEventId(v || null)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Pilih Event Aktif..." />
            </SelectTrigger>
            <SelectContent>
              {activeEvents.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.event_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeEvent && (
            <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">{activeEvent.event_name}</Badge>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="scanner" className="text-xs sm:text-sm">
            <QrCode className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">QR </span>Scanner
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Peserta</span><span className="sm:hidden">Peserta</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">
            <Settings className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Event</span><span className="sm:hidden">Event</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner">
          <QRScanner eventId={activeEventId} eventName={activeEvent?.event_name} />
        </TabsContent>
        <TabsContent value="participants">
          <ParticipantRegistration eventId={activeEventId} />
        </TabsContent>
        <TabsContent value="dashboard">
          <CheckinDashboard eventId={activeEventId} eventName={activeEvent?.event_name} />
        </TabsContent>
        <TabsContent value="settings">
          <EventSessionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}