import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Users, BarChart3, Settings, Link2, Copy, ExternalLink } from "lucide-react";
import EventSessionManager from "@/components/event-attendance/EventSessionManager";
import ParticipantRegistration from "@/components/event-attendance/ParticipantRegistration";
import QRScanner from "@/components/event-attendance/QRScanner";
import CheckinDashboard from "@/components/event-attendance/CheckinDashboard";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function EventAttendancePanel() {
  const [activeEventId, setActiveEventId] = useState(null);
  const [tab, setTab] = useState("scanner");
  const { toast } = useToast();

  const { data: events = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list(),
  });

  const activeEvents = events.filter(e => e.status === "Active");
  const allSelectableEvents = events; // allow selecting any event
  const activeEvent = events.find(e => e.id === activeEventId);

  const registrationLink = activeEventId
    ? `${window.location.origin}/event-register?event_id=${activeEventId}`
    : null;

  const copyLink = () => {
    if (!registrationLink) return;
    navigator.clipboard.writeText(registrationLink);
    toast({ description: "Link registrasi disalin!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 space-y-2">
          <Select value={activeEventId || ""} onValueChange={v => setActiveEventId(v || null)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Pilih Event..." />
            </SelectTrigger>
            <SelectContent>
              {allSelectableEvents.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.event_name}
                  {e.status !== "Active" ? ` (${e.status})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Registration Link */}
          {activeEventId && (
            <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/15 rounded-xl">
              <Link2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{registrationLink}</span>
              <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Salin
              </Button>
              <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2" asChild>
                <a href={registrationLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {activeEvent && (
          <Badge className="bg-accent/10 text-accent border-accent/20 text-xs self-start mt-1">
            {activeEvent.status}
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="scanner" className="text-xs sm:text-sm">
            <QrCode className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">QR </span>Scan
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 mr-1 sm:mr-2" />Peserta
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