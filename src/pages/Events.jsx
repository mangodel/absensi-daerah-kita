import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarDays, QrCode } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EVENT_LEVEL_LIST } from "@/lib/constants";
import { useAppConfig } from "@/lib/AppConfigContext";
import EventFormDialog from "@/components/events/EventFormDialog";
import EventList from "@/components/events/EventList";
import EventCalendar from "@/components/events/EventCalendar";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/lib/useUserRole";

export default function Events() {
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [filterMubaligh, setFilterMubaligh] = useState("all");
  const [filterIbuIbu, setFilterIbuIbu] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterParticipant, setFilterParticipant] = useState("all");
  const navigate = useNavigate();
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const { filterEvents, canManageEvents } = useUserRole();

  const queryClient = useQueryClient();

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date"),
  });
  const events = filterEvents(allEvents);

  const { data: sessions = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); setFormOpen(false); },
  });

  const createRecurringMutation = useMutation({
    mutationFn: (events) => base44.entities.Event.bulkCreate(events),
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

  const handleSaveRecurring = (events) => {
    createRecurringMutation.mutate(events);
  };

  const handleAddOnDate = (date) => {
    setEditEvent(null);
    if (date) {
      // Pre-fill date if clicked from calendar
      setPrefilledDate(date);
    }
    setFormOpen(true);
  };

  const handleSelectForAttendance = (event) => {
    navigate(`/attendance?event_id=${event.id}`);
  };

  const kelompokOptions = filterDesa !== "all" ? (config.desa_kelompok_map || {})[filterDesa] || [] : [];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const filtered = events.filter(e => {
    if (!e.date) return false;
    const eventDate = new Date(e.date);
    // Hanya tampilkan upcoming events di bulan ini
    const isUpcomingThisMonth =
      eventDate.getFullYear() === currentYear &&
      eventDate.getMonth() + 1 === currentMonth &&
      eventDate >= new Date(now.toISOString().split("T")[0]); // >= hari ini
    if (!isUpcomingThisMonth) return false;

    const matchLevel = filterLevel === "all" || e.level === filterLevel;
    const matchDesa = filterDesa === "all" || e.desa === filterDesa || (filterDesa !== "all" && e.level === "Daerah");
    const matchKelompok = filterKelompok === "all" || e.kelompok === filterKelompok;
    let matchMubaligh = true;
    if (filterMubaligh !== "all" && e.participant_dapukan && e.participant_dapukan.length > 0) {
      if (filterMubaligh === "both") matchMubaligh = e.participant_dapukan.some(d => d.toLowerCase().includes("muball"));
      else if (filterMubaligh === "mubaligh") matchMubaligh = e.participant_dapukan.some(d => d === "Muballigh" || d.toLowerCase().includes("muballigh"));
      else if (filterMubaligh === "mubalighot") matchMubaligh = e.participant_dapukan.some(d => d === "Muballighot" || d.toLowerCase().includes("muballighot"));
    }
    let matchIbuIbu = true;
    if (filterIbuIbu === "ibu_ibu") matchIbuIbu = e.participant_filter === "ibu_ibu";
    let matchGender = true;
    if (filterGender !== "all") matchGender = e.participant_filter === "ibu_ibu" || !e.participant_filter;
    let matchParticipant = true;
    if (filterParticipant !== "all") matchParticipant = e.participant_filter === filterParticipant;

    return matchLevel && matchDesa && matchKelompok && matchMubaligh && matchIbuIbu && matchGender && matchParticipant;
  }).sort((a, b) => {
    // Sort by desa → kelompok → date
    const desaCompare = (a.desa || "").localeCompare(b.desa || "");
    if (desaCompare !== 0) return desaCompare;
    const kelompokCompare = (a.kelompok || "").localeCompare(b.kelompok || "");
    if (kelompokCompare !== 0) return kelompokCompare;
    return new Date(a.date) - new Date(b.date);
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
        {canManageEvents && (
          <Button onClick={() => { setEditEvent(null); setPrefilledDate(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan
          </Button>
        )}
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="list">Daftar</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <EventCalendar
              events={events}
              sessions={sessions}
              onEdit={e => { setEditEvent(e); setPrefilledDate(null); setFormOpen(true); }}
              onDelete={setDeleteEvent}
              onAdd={handleAddOnDate}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
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
            <Select value={filterMubaligh} onValueChange={setFilterMubaligh}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jamaah</SelectItem>
                <SelectItem value="both">Mubaligh &amp; Mubalighot</SelectItem>
                <SelectItem value="mubaligh">Mubaligh Saja</SelectItem>
                <SelectItem value="mubalighot">Mubalighot Saja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGender} onValueChange={setFilterGender}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gender</SelectItem>
                <SelectItem value="perempuan">Perempuan</SelectItem>
                <SelectItem value="laki-laki">Laki-laki</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterParticipant} onValueChange={setFilterParticipant}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Filter Peserta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peserta</SelectItem>
                <SelectItem value="dewasa">Dewasa (18+)</SelectItem>
                <SelectItem value="ibu_ibu">Ibu-ibu</SelectItem>
                <SelectItem value="usia_nikah">Usia Nikah (Lajang 18+)</SelectItem>
                <SelectItem value="generus_smp">Generus SMP (12–14 thn)</SelectItem>
                <SelectItem value="generus_sma">Generus SMA (15–17 thn)</SelectItem>
                <SelectItem value="mubaligh_both">Mubaligh & Mubalighot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <p className="text-muted-foreground">Tidak ada kegiatan mendatang bulan {format(now, "MMMM yyyy", { locale: id })}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {byLevel.Daerah.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary" /> Tingkat Daerah
                  </h2>
                  <EventList events={byLevel.Daerah} sessions={sessions} onEdit={e => { setEditEvent(e); setFormOpen(true); }} onDelete={setDeleteEvent} onSelectForAttendance={handleSelectForAttendance} />
                </section>
              )}
              {byLevel.Desa.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-accent mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-accent" /> Tingkat Desa
                  </h2>
                  <EventList events={byLevel.Desa} sessions={sessions} onEdit={e => { setEditEvent(e); setFormOpen(true); }} onDelete={setDeleteEvent} onSelectForAttendance={handleSelectForAttendance} />
                </section>
              )}
              {byLevel.Kelompok.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500" /> Tingkat Kelompok
                  </h2>
                  <EventList events={byLevel.Kelompok} sessions={sessions} onEdit={e => { setEditEvent(e); setFormOpen(true); }} onDelete={setDeleteEvent} onSelectForAttendance={handleSelectForAttendance} />
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EventFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setPrefilledDate(null); }}
        event={editEvent}
        prefilledDate={prefilledDate}
        onSave={handleSave}
        onSaveRecurring={handleSaveRecurring}
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