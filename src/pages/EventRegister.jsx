import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CalendarDays, MapPin, Users, QrCode } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import QRCodeDisplay from "@/components/event-attendance/QRCodeDisplay";

function generateParticipantId(existing) {
  const maxNum = existing.reduce((max, p) => {
    const num = parseInt((p.participant_id || "P000000").replace("P", ""), 10);
    return num > max ? num : max;
  }, 0);
  return `P${String(maxNum + 1).padStart(6, "0")}`;
}

export default function EventRegister() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event_id");
  const qc = useQueryClient();

  const [form, setForm] = useState({ full_name: "", phone: "", email: "", organization: "" });
  const [step, setStep] = useState("form"); // form | success
  const [registered, setRegistered] = useState(null);

  const { data: event } = useQuery({
    queryKey: ["event-session", eventId],
    queryFn: () => base44.entities.EventSession.list().then(list => list.find(e => e.id === eventId)),
    enabled: !!eventId,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventId ? base44.entities.EventParticipant.filter({ event_id: eventId }) : [],
    enabled: !!eventId,
  });

  const regMut = useMutation({
    mutationFn: async (data) => {
      // Check if already registered (by phone or name)
      const existing = participants.find(
        p => (data.phone && p.phone === data.phone) || p.full_name?.toLowerCase() === data.full_name.toLowerCase()
      );
      if (existing) return existing;

      const pid = generateParticipantId(participants);
      const record = {
        ...data,
        event_id: eventId,
        participant_id: pid,
        qr_code_value: pid,
        registration_date: new Date().toISOString(),
        attendance_status: "Absent",
      };
      const created = await base44.entities.EventParticipant.create(record);
      return { ...record, id: created.id };
    },
    onSuccess: (result) => {
      setRegistered(result);
      setStep("success");
      qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
    },
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name) return;
    regMut.mutate(form);
  };

  if (!eventId) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center text-muted-foreground space-y-2">
        <QrCode className="w-12 h-12 mx-auto opacity-30" />
        <p className="text-lg font-semibold">Link registrasi tidak valid.</p>
        <p className="text-sm">Pastikan Anda menggunakan link yang benar dari panitia.</p>
      </div>
    </div>
  );

  if (!event) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  // Event closed/draft
  if (event.status === "Closed") return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center text-muted-foreground space-y-2 max-w-sm">
        <CalendarDays className="w-12 h-12 mx-auto opacity-30" />
        <p className="text-lg font-semibold">Pendaftaran Ditutup</p>
        <p className="text-sm">Pendaftaran untuk event ini sudah ditutup.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Event Info Card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 space-y-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{event.event_name}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {event.event_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {format(new Date(event.event_date), "EEEE, dd MMMM yyyy", { locale: id })}
                  </span>
                )}
                {event.venue && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {event.venue}
                  </span>
                )}
              </div>
            </div>
          </div>
          {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
          <div className="flex items-center gap-2 pt-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{participants.length} peserta terdaftar</span>
            <Badge className="ml-auto text-xs bg-accent/10 text-accent border-accent/20">
              {event.status === "Active" ? "Pendaftaran Dibuka" : "Draft"}
            </Badge>
          </div>
        </div>

        {/* Form / Success */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {step === "form" ? (
            <>
              <h2 className="text-lg font-bold mb-1">Formulir Pendaftaran</h2>
              <p className="text-sm text-muted-foreground mb-5">Isi data di bawah untuk mendaftar dan mendapatkan QR Code kehadiran Anda.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Nama lengkap Anda" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">No. WhatsApp / Telepon</Label>
                  <Input inputMode="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+61 4xx xxx xxx" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@contoh.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Kelompok / Desa</Label>
                  <Input value={form.organization} onChange={e => set("organization", e.target.value)} placeholder="Kelompok atau desa Anda" />
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={!form.full_name || regMut.isPending}>
                  {regMut.isPending ? "Mendaftarkan..." : "Daftar Sekarang"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Pendaftaran Berhasil!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Selamat, <strong>{registered?.full_name}</strong>! Anda telah terdaftar sebagai peserta.
                </p>
              </div>

              <div className="bg-secondary/40 rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">ID Peserta & QR Code</p>
                <p className="text-2xl font-mono font-bold text-primary">{registered?.participant_id}</p>
                <div className="flex justify-center">
                  <QRCodeDisplay value={registered?.qr_code_value || registered?.participant_id} size={200} />
                </div>
                <p className="text-xs text-muted-foreground">Simpan QR Code ini. Tunjukkan kepada panitia saat check-in di hari acara.</p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">📋 Ringkasan Pendaftaran</p>
                <p>Nama: <strong>{registered?.full_name}</strong></p>
                {registered?.phone && <p>Telepon: {registered.phone}</p>}
                {registered?.organization && <p>Kelompok: {registered.organization}</p>}
                <p>Event: <strong>{event.event_name}</strong></p>
                {event.event_date && <p>Tanggal: {format(new Date(event.event_date), "dd MMM yyyy", { locale: id })}</p>}
              </div>

              <p className="text-xs text-muted-foreground">
                Anda akan menerima konfirmasi melalui WhatsApp/email jika sudah terdaftar (fitur reminder akan segera tersedia).
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Didukung oleh sistem manajemen jamaah
        </p>
      </div>
    </div>
  );
}