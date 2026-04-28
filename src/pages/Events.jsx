import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarDays } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EVENT_LEVEL_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import EventFormDialog from "@/components/events/EventFormDialog";
import EventList from "@/components/events/EventList";
import { useNavigate } from "react-router-dom";

export default function Events() {
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const navigate = useNavigate();
  const { config } = useAppConfig();
  const pt = config.page_titles || {};

  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); setFormOpen(false); setEditEvent(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); setDeleteEvent(null); },
  });

  const handleSave = (data) => {
    if (editEvent) updateMutation.mutate({ id: editEvent.id, data });
    else createMutation.mutate(data);
  };

  const handleSelectForAttendance = (event) => {
    navigate(`/attendance?event_id=${event.id}`);
  };

  const kelompokOptions = filterDesa !== "all" ? (config.desa_kelompok_map || {})[filterDesa] || [] : [];

  const filtered = events.filter(e => {
    const matchLevel = filterLevel === "all" || e.level === filterLevel;
    const matchDesa = filterDesa === "all" || e.desa === filterDesa || (filterDesa !== "all" && e.level === "Daerah");
    const matchKelompok = filterKelompok === "all" || e.kelompok === filterKelompok;
    return matchLevel && matchDesa && matchKelompok;
  });

  // Group by level for display
  const byLevel = {
    Daerah: filtered.filter(e => e.level === "Daerah"),
    Desa: filtered.filter(e => e.level === "Desa"),
    Kelompok: filtered.filter(e => e.level === "Kelompok"),
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> {pt.events || "Daftar Kegiatan"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{events.length} {pt.events_subtitle || "kegiatan terdaftar"}</p>
        </div>
        <Button onClick={() => { setEditEvent(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterLevel} onValueChange={v => { setFilterLevel(v); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Level</SelectItem>
            {EVENT_LEVEL_LIST.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Desa</SelectItem>
            {(config.desa_list || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        {filterDesa !== "all" && (
          <Select value={filterKelompok} onValueChange={setFilterKelompok}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelompok</SelectItem>
              {kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground">Belum ada kegiatan. Tambahkan kegiatan baru.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {byLevel.Daerah.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                Tingkat Daerah
              </h2>
              <EventList
                events={byLevel.Daerah}
                onEdit={e => { setEditEvent(e); setFormOpen(true); }}
                onDelete={setDeleteEvent}
                onSelectForAttendance={handleSelectForAttendance}
              />
            </section>
          )}
          {byLevel.Desa.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-accent mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent" />
                Tingkat Desa
              </h2>
              <EventList
                events={byLevel.Desa}
                onEdit={e => { setEditEvent(e); setFormOpen(true); }}
                onDelete={setDeleteEvent}
                onSelectForAttendance={handleSelectForAttendance}
              />
            </section>
          )}
          {byLevel.Kelompok.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                Tingkat Kelompok
              </h2>
              <EventList
                events={byLevel.Kelompok}
                onEdit={e => { setEditEvent(e); setFormOpen(true); }}
                onDelete={setDeleteEvent}
                onSelectForAttendance={handleSelectForAttendance}
              />
            </section>
          )}
        </div>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editEvent}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteEvent} onOpenChange={() => setDeleteEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kegiatan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus "{deleteEvent?.name}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deleteEvent.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}