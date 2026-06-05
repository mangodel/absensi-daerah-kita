import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ExternalDisplay from "@/components/event-attendance/ExternalDisplay";

export default function EventDisplay() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event_id");

  const { data: events = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list(),
  });

  const event = events.find(e => e.id === eventId);

  return <ExternalDisplay eventId={eventId} eventName={event?.event_name} />;
}