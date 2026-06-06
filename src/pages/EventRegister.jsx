import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, CalendarDays, MapPin, Users, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import QRCodeDisplay from "@/components/event-attendance/QRCodeDisplay";
import { useParams } from "react-router-dom";

function getEventIdFromUrl() {
  const parts = window.location.pathname.split("/");
  const last = parts[parts.length - 1];
  if (last && last !== "event-register") return last;
  return new URLSearchParams(window.location.search).get("event_id");
}

const DEFAULT_FIELDS = [
  { key: "full_name", label: "Nama Lengkap", type: "text", required: true },
  { key: "phone", label: "No. Telepon / WhatsApp", type: "tel", required: false },
  { key: "email", label: "Email", type: "email", required: false },
];

function generatePid(existing) {
  const max = existing.reduce((m, p) => {
    const n = parseInt((p.participant_id || "P000000").replace("P", ""), 10);
    return n > m ? n : m;
  }, 0);
  return `P${String(max + 1).padStart(6, "0")}`;
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function EventRegister() {
  const { eventId: paramId } = useParams();
  const eventId = paramId || getEventIdFromUrl();
  const [form, setForm] = useState({});
  const [step, setStep] = useState("form"); // form | success | duplicate
  const [participantId, setParticipantId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["event-sessions"],
    queryFn: () => base44.entities.EventSession.list(),
  });

  const { data: formConfigs = [] } = useQuery({
    queryKey: ["event-form-config", eventId],
    queryFn: () => base44.entities.EventFormConfig.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventId ? base44.entities.EventParticipant.filter({ event_id: eventId }) : [],
    enabled: !!eventId,
  });

  const event = sessions.find(e => e.id === eventId);
  const config = formConfigs[0] || {};
  const fields = (() => {
    try { return config.fields ? JSON.parse(config.fields) : DEFAULT_FIELDS; }
    catch { return DEFAULT_FIELDS; }
  })();

  const maxParticipants = config.max_participants || 0;
  const isFull = maxParticipants > 0 && participants.length >= maxParticipants;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate required
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) {
        setError(`${f.label} wajib diisi.`);
        return;
      }
    }

    // Check duplicate by phone/email
    const phone = form.phone?.trim();
    const email = form.email?.trim()?.toLowerCase();
    if (phone) {
      const dup = participants.find(p => p.phone === phone);
      if (dup) { setParticipantId(dup.participant_id); setStep("duplicate"); return; }
    }
    if (email) {
      const dup = participants.find(p => p.email?.toLowerCase() === email);
      if (dup) { setParticipantId(dup.participant_id); setStep("duplicate"); return; }
    }

    setSubmitting(true);
    const pid = generatePid(participants);
    const extraKeys = Object.keys(form).filter(k => !["full_name", "phone", "email"].includes(k));
    const extraData = extraKeys.length > 0 ? JSON.stringify(Object.fromEntries(extraKeys.map(k => [k, form[k]]))) : "";

    // Create participant
    await base44.entities.EventParticipant.create({
      full_name: form.full_name,
      phone: phone || "",
      email: email || "",
      organization: form.organization || "",
      event_id: eventId,
      participant_id: pid,
      qr_code_value: pid,
      registration_date: new Date().toISOString(),
      attendance_status: "Absent",
      notes: `online_reg`,
    });

    // Log registration
    await base44.entities.EventRegistration.create({
      event_id: eventId,
      full_name: form.full_name,
      phone: phone || "",
      email: email || "",
      extra_data: extraData,
      status: "Approved",
      participant_id: pid,
      qr_sent: false,
      source: "online",
    });

    // Send QR email if email provided and config enabled
    if (email && config.send_qr_email !== false) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${pid}&size=200x200`;
      const eventDate = event?.event_date ? format(new Date(event.event_date), "EEEE, dd MMMM yyyy", { locale: id }) : "";
      base44.integrations.Core.SendEmail({
        to: email,
        subject: `✅ Pendaftaran Berhasil — ${event?.event_name || "Event"}`,
        body: `
Assalamu'alaikum ${form.full_name},

Pendaftaran Anda berhasil! 🎉

📋 Detail Peserta:
• Nama  : ${form.full_name}
• ID    : ${pid}
• Event : ${event?.event_name || eventId}
• Tanggal: ${eventDate}
${event?.venue ? `• Lokasi: ${event.venue}` : ""}

🔲 QR Code Anda:
${qrUrl}

Simpan QR code ini untuk digunakan saat check-in. Tunjukkan QR code kepada petugas atau scan sendiri di gate masuk.

⚠️ QR code ini bersifat personal dan tidak boleh dibagikan kepada orang lain.

Jazakumullah khairan,
Panitia ${event?.event_name || "Event"}
        `.trim(),
      }).catch(() => {});
    }

    setParticipantId(pid);
    setSubmitting(false);
    setStep("success");
  };

  if (!eventId) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground">Link registrasi tidak valid.</p>
      </div>
    </div>
  );

  if (step === "success") return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-lg">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Pendaftaran Berhasil!</h2>
          <p className="text-sm text-muted-foreground mt-1">{config.success_message || "Anda telah terdaftar sebagai peserta."}</p>
        </div>
        <div className="bg-secondary/40 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">ID Peserta Anda</p>
          <p className="text-2xl font-mono font-bold text-primary">{participantId}</p>
        </div>
        <QRCodeDisplay value={participantId} size={200} />
        <p className="text-xs text-muted-foreground">
          Screenshot QR code ini untuk check-in pada hari acara.
          {form.email ? " QR code juga telah dikirim ke email Anda." : ""}
        </p>
        {event?.event_date && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5" />
            {format(new Date(event.event_date), "EEEE, dd MMMM yyyy", { locale: id })}
          </div>
        )}
      </div>
    </div>
  );

  if (step === "duplicate") return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-background to-background flex items-center justify-center p-6">
      <div className="bg-card border border-amber-200 rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-lg">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Sudah Terdaftar</h2>
          <p className="text-sm text-muted-foreground mt-1">Nomor telepon / email ini sudah terdaftar sebelumnya.</p>
        </div>
        <div className="bg-secondary/40 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">ID Peserta Anda</p>
          <p className="text-2xl font-mono font-bold text-primary">{participantId}</p>
        </div>
        <QRCodeDisplay value={participantId} size={180} />
        <Button variant="outline" className="w-full" onClick={() => setStep("form")}>Kembali</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-lg space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <CalendarDays className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{event?.event_name || "Formulir Pendaftaran"}</h1>
          {event?.event_date && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(new Date(event.event_date), "EEEE, dd MMMM yyyy", { locale: id })}
            </p>
          )}
          {event?.venue && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {event.venue}
            </p>
          )}
          {config.welcome_message && (
            <p className="text-sm text-muted-foreground bg-secondary/40 rounded-xl p-3 mt-2">{config.welcome_message}</p>
          )}
        </div>

        {isFull ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 text-center">
            <p className="text-sm font-medium text-destructive">Pendaftaran telah ditutup. Kuota peserta penuh.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                {f.type === "select" ? (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form[f.key] || ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required}
                  >
                    <option value="">Pilih...</option>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder={f.placeholder || ""}
                    value={form[f.key] || ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required}
                  />
                ) : (
                  <Input
                    type={f.type || "text"}
                    placeholder={f.placeholder || ""}
                    value={form[f.key] || ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required}
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mendaftarkan...</> : "Daftar Sekarang"}
            </Button>
          </form>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {participants.length} peserta terdaftar
          {maxParticipants > 0 && ` dari ${maxParticipants}`}
        </div>
      </div>
    </div>
  );
}