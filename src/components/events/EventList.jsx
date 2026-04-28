import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MapPin, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const levelColors = {
  "Daerah": "bg-primary/10 text-primary border-primary/20",
  "Desa": "bg-accent/10 text-accent border-accent/20",
  "Kelompok": "bg-orange-50 text-orange-600 border-orange-200",
};

export default function EventList({ events, onEdit, onDelete, onSelectForAttendance }) {
  if (events.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Belum ada event. Tambahkan event baru.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(event => (
        <div key={event.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground">{event.name}</h3>
                <Badge variant="outline" className={`text-xs ${levelColors[event.level]}`}>
                  {event.level}
                </Badge>
                {event.desa && (
                  <Badge variant="secondary" className="text-xs">{event.desa}</Badge>
                )}
                {event.kelompok && (
                  <Badge variant="secondary" className="text-xs">{event.kelompok}</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {event.date ? format(new Date(event.date), "EEEE, dd MMM yyyy", { locale: id }) : "-"}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.location}
                  </span>
                )}
              </div>

              {event.description && (
                <p className="text-xs text-muted-foreground">{event.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onSelectForAttendance && (
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onSelectForAttendance(event)}>
                  <Users className="w-3.5 h-3.5 mr-1" /> Input Absensi
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(event)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(event)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}