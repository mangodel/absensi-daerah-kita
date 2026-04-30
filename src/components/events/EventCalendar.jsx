import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LEVEL_COLORS = {
  "Daerah": "bg-primary text-white",
  "Desa":   "bg-accent text-white",
  "Kelompok": "bg-orange-500 text-white",
};

const LEVEL_DOT = {
  "Daerah": "bg-primary",
  "Desa":   "bg-accent",
  "Kelompok": "bg-orange-500",
};

export default function EventCalendar({ events, onEdit, onDelete, onAdd }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayPopupOpen, setDayPopupOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build calendar weeks
  const weeks = [];
  let day = startDate;
  while (day <= endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const getEventsForDay = (d) =>
    events.filter(e => e.date && isSameDay(parseISO(e.date), d));

  const handleDayClick = (d) => {
    const dayEvents = getEventsForDay(d);
    setSelectedDate(d);
    setDayPopupOpen(true);
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base font-semibold text-foreground capitalize">
            {format(currentDate, "MMMM yyyy", { locale: id })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(LEVEL_DOT).map(([level, cls]) => (
              <span key={level} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${cls}`} />
                {level}
              </span>
            ))}
          </div>
          <Button size="sm" onClick={() => onAdd()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="divide-y divide-border">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-border">
            {week.map((d, di) => {
              const dayEvents = getEventsForDay(d);
              const isCurrentMonth = isSameMonth(d, currentDate);
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={di}
                  onClick={() => handleDayClick(d)}
                  className={`min-h-[72px] p-1.5 cursor-pointer transition-colors hover:bg-secondary/40 ${
                    !isCurrentMonth ? "bg-secondary/20" : ""
                  }`}
                >
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                  }`}>
                    {format(d, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div
                        key={e.id}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${LEVEL_COLORS[e.level] || "bg-muted text-muted-foreground"}`}
                      >
                        {e.name}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} lagi</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Day detail popup */}
      <Dialog open={dayPopupOpen} onOpenChange={setDayPopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedDate ? format(selectedDate, "EEEE, d MMMM yyyy", { locale: id }) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Tidak ada kegiatan</p>
                <Button size="sm" onClick={() => { setDayPopupOpen(false); onAdd(selectedDate); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Kegiatan
                </Button>
              </div>
            ) : (
              <>
                {selectedDayEvents.map(e => (
                  <div key={e.id} className="flex items-start justify-between gap-2 p-3 bg-secondary/40 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] ${LEVEL_COLORS[e.level]}`}>{e.level}</Badge>
                        <span className="font-medium text-sm">{e.name}</span>
                      </div>
                      {e.location && <p className="text-xs text-muted-foreground mt-0.5">📍 {e.location}</p>}
                      {e.desa && <p className="text-xs text-muted-foreground">{e.desa}{e.kelompok ? ` / ${e.kelompok}` : ""}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDayPopupOpen(false); onEdit(e); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setDayPopupOpen(false); onDelete(e); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full" onClick={() => { setDayPopupOpen(false); onAdd(selectedDate); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Kegiatan di Tanggal Ini
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}