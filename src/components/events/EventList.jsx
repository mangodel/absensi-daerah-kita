import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MapPin, Calendar, Users, RefreshCw, BookOpen, Mic, FileText, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { RECURRING_PATTERNS } from "@/lib/recurringUtils";

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
                {event.recurring_pattern && (
                  <Badge variant="outline" className="text-xs bg-violet-50 text-violet-600 border-violet-200 flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5" />
                    {RECURRING_PATTERNS.find(p => p.value === event.recurring_pattern)?.label || "Berulang"}
                  </Badge>
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

              {/* Materi, Pemateri, Notes, Dokumen */}
              {(event.materi || event.pemateri || event.notes || event.document_url) && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                  {event.materi && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-primary/70" />
                      <span className="font-medium text-foreground">{event.materi}</span>
                    </span>
                  )}
                  {event.pemateri && (
                    <span className="flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-accent/80" />
                      {event.pemateri}
                    </span>
                  )}
                  {event.notes && (
                    <span className="flex items-center gap-1">
                      <StickyNote className="w-3.5 h-3.5 text-orange-400" />
                      {event.notes}
                    </span>
                  )}
                  {event.document_url && (
                    <a href={event.document_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline">
                      <FileText className="w-3.5 h-3.5" />
                      {event.document_name || "Lihat Dokumen"}
                    </a>
                  )}
                </div>
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