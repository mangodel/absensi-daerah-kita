import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const empty = { event_name: "", event_date: "", venue: "", description: "", status: "Draft" };

const statusColor = {
  Draft: "bg-secondary text-muted-foreground",
  Active: "bg-accent/10 text-accent border-accent/20",
  Closed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function EventSessionManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list("-created_date"),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.EventSession.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-sessions"] }); setOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventSession.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-sessions"] }); setOpen(false); },
  });

  const handleOpen = (ev = null) => {
    setEditing(ev);
    setForm(ev ? { ...ev } : empty);
    setOpen(true);
  };

  const handleSave = () => {
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Kelola Event</h3>
        <Button size="sm" onClick={() => handleOpen()}>
          <Plus className="w-4 h-4 mr-1" /> Buat Event
        </Button>
      </div>

      <div className="space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{ev.event_name}</p>
              <p className="text-xs text-muted-foreground">
                {ev.event_date ? format(new Date(ev.event_date), "dd MMM yyyy", { locale: id }) : "-"}
                {ev.venue ? ` · ${ev.venue}` : ""}
              </p>
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 ${statusColor[ev.status]}`}>{ev.status}</Badge>
            <Button variant="ghost" size="icon" onClick={() => handleOpen(ev)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Belum ada event. Buat event baru.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Buat Event Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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