import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, CalendarDays, Link2, QrCode, Trash2, RefreshCw } from "lucide-react";
import EventQRCode from "@/components/event-attendance/EventQRCode";
import { format, addDays, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { id } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

const empty = { event_name: "", event_date: "", venue: "", description: "", status: "Draft", linked_event_id: "" };

const statusColor = {
  Draft: "bg-secondary text-muted-foreground",
  Active: "bg-accent/10 text-accent border-accent/20",
  Closed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function EventSessionManager({ onSelectEvent }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [qrEvent, setQrEvent] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list("-created_date"),
  });

  // Fetch kegiatan from main Events entity
  const { data: mainEvents = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date"),
  });

  // Filter events: only this week + next week, exclude recurring
  const getFilteredSessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const twoWeeksEnd = endOfWeek(addDays(today, 14), { weekStartsOn: 1 });

    return sessions.filter(s => {
      if (!s.event_date) return false;
      const eventDate = new Date(s.event_date);
      eventDate.setHours(0, 0, 0, 0);
      
      // Check if within this week + next week
      const isUpcoming = isWithinInterval(eventDate, { start: weekStart, end: twoWeeksEnd });
      
      // Check if recurring (via linked_event_id)
      const linkedEvent = mainEvents.find(e => e.id === s.linked_event_id);
      const isRecurring = linkedEvent?.recurring_pattern && linkedEvent.recurring_pattern !== "";
      
      return isUpcoming && !isRecurring;
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  };

  // Filter main events: only from today onwards, max 5-7, sorted by date
  const getUpcomingLinkedEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return mainEvents.filter(e => {
      if (!e.date) return false;
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      
      // Only show from today onwards
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 7); // Show max 7 events
  };

  const createMut = useMutation({
    mutationFn: d => base44.entities.EventSession.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-sessions"] }); setOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventSession.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-sessions"] }); setOpen(false); },
  });
  const deleteMut = useMutation({
    mutationFn: async (eventId) => {
      const event = sessions.find(e => e.id === eventId);
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
      toast({ description: "Event berhasil dihapus." });
    },
  });

  const handleOpen = (ev = null) => {
    setEditing(ev);
    setForm(ev ? { ...ev, linked_event_id: ev.linked_event_id || "" } : empty);
    setOpen(true);
  };

  // When selecting a main event to link, auto-fill fields
  const handleLinkEvent = (eventId) => {
    const ev = mainEvents.find(e => e.id === eventId);
    if (!ev) { setForm(p => ({ ...p, linked_event_id: "" })); return; }
    setForm(p => ({
      ...p,
      linked_event_id: eventId,
      event_name: ev.name,
      event_date: ev.date || "",
      venue: ev.location || p.venue,
      description: ev.description || p.description,
    }));
  };

  const handleSave = () => {
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Kelola Event Absensi</h3>
        <Button size="sm" onClick={() => handleOpen()}>
          <Plus className="w-4 h-4 mr-1" /> Buat Event
        </Button>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="sessions" className="text-xs">Event Absensi</TabsTrigger>
          <TabsTrigger value="linked" className="text-xs">Dari Jadwal Kegiatan</TabsTrigger>
        </TabsList>

        {/* All sessions - filtered for this week + next week */}
        <TabsContent value="sessions" className="space-y-3 mt-3">
          {getFilteredSessions().map(ev => (
            <div key={ev.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{ev.event_name}</p>
                <p className="text-xs text-muted-foreground">
                  {ev.event_date ? format(new Date(ev.event_date), "dd MMM yyyy", { locale: id }) : "-"}
                  {ev.venue ? ` · ${ev.venue}` : ""}
                </p>
                {ev.linked_event_id && (
                  <p className="text-xs text-primary/70 flex items-center gap-1 mt-0.5">
                    <Link2 className="w-3 h-3" /> Terhubung ke Jadwal Kegiatan
                  </p>
                )}
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${statusColor[ev.status]}`}>{ev.status}</Badge>
              <Button variant="ghost" size="icon" onClick={() => setQrEvent(ev)} title="Tampilkan QR">
                <QrCode className="w-4 h-4 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleOpen(ev)}>
                <Pencil className="w-4 h-4" />
              </Button>
              {ev.linked_event_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sinkron ID Member"
                  onClick={async () => {
                    try {
                      const res = await base44.functions.invoke('fixImportedParticipants', {
                        event_id: ev.id,
                      });
                      if (res.data.success) {
                        toast.success(`${res.data.updated} peserta diupdate`);
                        qc.invalidateQueries({ queryKey: ["event-participants", ev.id] });
                      }
                    } catch (err) {
                      toast.error('Gagal sinkron');
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 text-primary" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Hapus "${ev.event_name}"? Aksi ini tidak bisa dibatalkan.`)) {
                    deleteMut.mutate(ev.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {getFilteredSessions().length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Tidak ada event minggu ini & minggu depan. Buat event baru atau pilih dari Jadwal Kegiatan.</p>
          )}
        </TabsContent>

        {/* From main Events schedule - filtered */}
        <TabsContent value="linked" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">Pilih kegiatan dari jadwal untuk langsung membuat sesi absensi.</p>
          {getUpcomingLinkedEvents().map(ev => {
            const linked = sessions.find(s => s.linked_event_id === ev.id);
            return (
              <div key={ev.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{ev.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.date ? format(new Date(ev.date), "dd MMM yyyy", { locale: id }) : "-"}
                    {ev.location ? ` · ${ev.location}` : ""}
                    {ev.level ? ` · ${ev.level}` : ""}
                  </p>
                </div>
                {linked ? (
                  <Badge variant="outline" className={`text-xs shrink-0 ${statusColor[linked.status]}`}>{linked.status}</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditing(null);
                    setForm({
                      event_name: ev.name,
                      event_date: ev.date || "",
                      venue: ev.location || "",
                      description: ev.description || "",
                      status: "Draft",
                      linked_event_id: ev.id,
                    });
                    setOpen(true);
                  }}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Buat Sesi
                  </Button>
                )}
              </div>
            );
          })}
          {getUpcomingLinkedEvents().length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Tidak ada kegiatan mendatang. Tambahkan di menu Kegiatan.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <EventQRCode event={qrEvent} open={!!qrEvent} onClose={() => setQrEvent(null)} />

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Buat Event Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Link to main event */}
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hubungkan ke Jadwal Kegiatan (opsional)</Label>
                <Select value={form.linked_event_id || "none"} onValueChange={v => handleLinkEvent(v === "none" ? "" : v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih kegiatan..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak dihubungkan —</SelectItem>
                    {mainEvents.map(ev => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.name} {ev.date ? `(${format(new Date(ev.date), "dd MMM yyyy", { locale: id })})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nama Event *</Label>
              <Input value={form.event_name} onChange={e => set("event_name", e.target.value)} placeholder="cth: Seminar Tahunan 2025" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tanggal *</Label>
              <Input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Venue/Lokasi</Label>
              <Input value={form.venue} onChange={e => set("venue", e.target.value)} placeholder="Nama tempat..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Deskripsi</Label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Deskripsi singkat..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={!form.event_name || !form.event_date}>
                {editing ? "Simpan" : "Buat Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}