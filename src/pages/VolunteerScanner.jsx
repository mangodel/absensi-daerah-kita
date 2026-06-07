import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, QrCode, Search, UserCheck, AlertCircle, Camera, Calendar, Users, ArrowLeft, LogOut } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraScanner from "@/components/event-attendance/CameraScanner";
import VolunteerLogin from "@/components/volunteer/VolunteerLogin";
import { useAppConfig } from "@/lib/AppConfigContext";

const SESSION_KEY = "volunteer_operator";

// ─── Step 1: Pilih Event ─────────────────────────────────────────────────────
function EventSelector({ onSelect }) {
  const { config } = useAppConfig();
  const loginBgUrl = config.login_bg_url || "";

  const { data: events = [] } = useQuery({
    queryKey: ["event-sessions-volunteer"],
    queryFn: () => base44.entities.EventSession.filter({ status: "Active" }),
  });

  const sorted = [...events].sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: loginBgUrl ? `url(${loginBgUrl})` : "linear-gradient(to bottom right, rgb(243 232 255), rgb(240 249 255))",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Portal Volunteer</h1>
          <p className="text-sm text-muted-foreground">Pilih kegiatan yang akan dicatat absensinya</p>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Tidak ada kegiatan aktif saat ini
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(ev => (
              <button
                key={ev.id}
                onClick={() => onSelect(ev)}
                className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{ev.event_name}</p>
                  <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] shrink-0">Aktif</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ev.event_date ? format(new Date(ev.event_date), "EEEE, dd MMM yyyy", { locale: id }) : ""}
                  {ev.venue ? ` · ${ev.venue}` : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Step 2: Form Identitas Operator dengan Login ─────────────────────────────────────────
function OperatorForm({ onSave }) {
  const { config } = useAppConfig();
  const loginBgUrl = config.login_bg_url || "";

  const handleLoginSuccess = (operator) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(operator));
    onSave(operator);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: loginBgUrl ? `url(${loginBgUrl})` : "linear-gradient(to bottom right, rgb(243 232 255), rgb(240 249 255))",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10">
        <VolunteerLogin onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}

// ─── Step 3: Scanner Utama ────────────────────────────────────────────────────
function ScannerPanel({ event, operator, onBack }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState("camera");
  const [manualId, setManualId] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("scan"); // "scan" | "list"

  const { data: participants = [] } = useQuery({
    queryKey: ["vol-participants", event.id],
    queryFn: () => base44.entities.EventParticipant.filter({ event_id: event.id }),
    enabled: !!event.id,
  });

  const { data: checkins = [], refetch: refetchCheckins } = useQuery({
    queryKey: ["vol-checkins", event.id],
    queryFn: () => base44.entities.EventCheckin.filter({ event_id: event.id }, "-checkin_time", 500),
    enabled: !!event.id,
    refetchInterval: 8000,
  });

  const checkinMut = useMutation({
    mutationFn: async (participant) => {
      const existing = checkins.find(c => c.participant_db_id === participant.id);
      if (existing) return { type: "duplicate", participant, checkin: existing };

      const now = new Date();
      await base44.entities.EventCheckin.create({
        participant_id: participant.participant_id,
        participant_db_id: participant.id,
        participant_name: participant.full_name,
        event_id: event.id,
        checkin_time: now.toISOString(),
        checkin_date: now.toISOString().split("T")[0],
        checkin_method: mode === "camera" ? "QR Scan" : "Manual",
        scanner_station: operator.desa && operator.kelompok ? `${operator.desa} - ${operator.kelompok}` : operator.desa || "Volunteer",
        volunteer_name: operator.nama,
      });
      await base44.entities.EventParticipant.update(participant.id, { attendance_status: "Present" });
      return { type: "success", participant };
    },
    onSuccess: (res) => {
      setResult(res);
      qc.invalidateQueries({ queryKey: ["vol-checkins", event.id] });
      qc.invalidateQueries({ queryKey: ["vol-participants", event.id] });
      if (res.type === "success") {
        setTimeout(() => { setResult(null); setManualId(""); setSearch(""); }, 4000);
      }
    },
  });

  const handleCheckin = (participant) => checkinMut.mutate(participant);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const pid = manualId.trim().toUpperCase();
    const p = participants.find(x => x.participant_id === pid);
    if (!p) { setResult({ type: "notfound" }); return; }
    handleCheckin(p);
  };

  const handleCameraScan = (decoded) => {
    if (checkinMut.isPending) return;
    const p = participants.find(x => x.participant_id === decoded || x.qr_code_value === decoded);
    if (!p) { setResult({ type: "notfound" }); return; }
    handleCheckin(p);
  };

  const filteredSearch = search.length > 1
    ? participants.filter(p =>
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search) || p.participant_id?.includes(search)
      )
    : [];

  const hadirCount = checkins.length;
  const totalCount = participants.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{event.event_name}</p>
          <p className="text-xs text-muted-foreground">
            {event.event_date ? format(new Date(event.event_date), "dd MMM yyyy", { locale: id }) : ""}
            {" · "}<span className="text-primary font-medium">{operator.nama}</span>
            {operator.desa ? ` · ${operator.desa}` : ""}
            {operator.kelompok ? ` - ${operator.kelompok}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-primary">{hadirCount}</p>
          <p className="text-[10px] text-muted-foreground">/{totalCount} hadir</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-secondary/50 mx-4 mt-4 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("scan")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "scan" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          <QrCode className="w-4 h-4 inline mr-1.5" />Scan Absensi
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />Daftar Hadir ({hadirCount})
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">

        {/* ── TAB SCAN ── */}
        {activeTab === "scan" && (
          <>
            {/* Result Banner */}
            {result && (
              <div className={`rounded-2xl p-4 flex items-center gap-3 ${
                result.type === "success" ? "bg-accent/10 border border-accent/30" :
                result.type === "duplicate" ? "bg-amber-50 border border-amber-200" :
                "bg-destructive/10 border border-destructive/20"
              }`}>
                {result.type === "success" && <CheckCircle className="w-10 h-10 text-accent shrink-0" />}
                {result.type !== "success" && <AlertCircle className="w-10 h-10 text-amber-500 shrink-0" />}
                <div className="flex-1">
                  {result.type === "success" && (
                    <>
                      <p className="font-bold text-accent text-lg">✓ Check-in Berhasil!</p>
                      <p className="text-sm">{result.participant?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{result.participant?.participant_id}</p>
                    </>
                  )}
                  {result.type === "duplicate" && (
                    <>
                      <p className="font-semibold text-amber-700">Sudah Check-in</p>
                      <p className="text-sm text-amber-600">{result.participant?.full_name}</p>
                    </>
                  )}
                  {result.type === "notfound" && (
                    <p className="font-semibold text-destructive">ID tidak ditemukan dalam daftar peserta</p>
                  )}
                </div>
                {result.type !== "success" && (
                  <button onClick={() => setResult(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                )}
              </div>
            )}

            {/* Mode Buttons */}
            <div className="flex gap-2">
              {[
                { key: "camera", label: "Kamera QR", icon: Camera },
                { key: "manual", label: "Input ID", icon: QrCode },
                { key: "search", label: "Cari Nama", icon: Search },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setMode(key); setResult(null); }}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${
                    mode === key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            {/* Camera Mode */}
            {mode === "camera" && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-center text-sm font-medium">Arahkan kamera ke QR Code peserta</p>
                <CameraScanner onScan={handleCameraScan} active={mode === "camera"} />
              </div>
            )}

            {/* Manual ID */}
            {mode === "manual" && (
              <form onSubmit={handleManualSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <p className="text-center text-sm font-medium">Scan barcode atau ketik ID Peserta</p>
                <Input
                  autoFocus
                  value={manualId}
                  onChange={e => setManualId(e.target.value.toUpperCase())}
                  placeholder="P000001"
                  className="text-center text-2xl font-mono h-14 tracking-widest"
                />
                <Button type="submit" className="w-full h-12 text-base" disabled={!manualId || checkinMut.isPending}>
                  <UserCheck className="w-5 h-5 mr-2" />
                  {checkinMut.isPending ? "Memproses..." : "Tandai Hadir"}
                </Button>
              </form>
            )}

            {/* Search Mode */}
            {mode === "search" && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <Input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama, telepon, atau ID peserta..."
                  className="h-11"
                />
                {search.length > 1 && filteredSearch.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">Peserta tidak ditemukan</p>
                )}
                {filteredSearch.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filteredSearch.map(p => {
                      const alreadyIn = checkins.some(c => c.participant_db_id === p.id);
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                          <div>
                            <p className="font-medium text-sm">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground">{p.participant_id}{p.phone ? ` · ${p.phone}` : ""}</p>
                          </div>
                          {alreadyIn ? (
                            <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">✓ Hadir</Badge>
                          ) : (
                            <Button size="sm" onClick={() => handleCheckin(p)} disabled={checkinMut.isPending}>
                              <UserCheck className="w-3.5 h-3.5 mr-1" /> Hadir
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5 Check-in Terbaru */}
            {checkins.slice(0, 5).length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <h4 className="font-semibold text-sm">Check-in Terbaru</h4>
                {checkins.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-1">
                    <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.participant_name}</p>
                      <p className="text-xs text-muted-foreground">{c.checkin_method} · {c.volunteer_name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {c.checkin_time ? format(new Date(c.checkin_time), "HH:mm") : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB LIST ── */}
        {activeTab === "list" && (
          <div className="space-y-3">
            <div className="flex gap-3 text-center">
              <div className="flex-1 bg-accent/10 border border-accent/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-accent">{hadirCount}</p>
                <p className="text-xs text-muted-foreground">Sudah Hadir</p>
              </div>
              <div className="flex-1 bg-secondary border border-border rounded-xl p-3">
                <p className="text-2xl font-bold text-foreground">{totalCount - hadirCount}</p>
                <p className="text-xs text-muted-foreground">Belum Hadir</p>
              </div>
              <div className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-primary">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Terdaftar</p>
              </div>
            </div>

            {/* Daftar Check-in */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peserta yang Sudah Hadir</p>
              </div>
              {checkins.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Belum ada yang check-in</p>
              ) : (
                <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                  {checkins.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.participant_name}</p>
                        <p className="text-xs text-muted-foreground">{c.participant_id} · {c.volunteer_name || "-"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-foreground">{c.checkin_time ? format(new Date(c.checkin_time), "HH:mm") : ""}</p>
                        <p className="text-[10px] text-muted-foreground">{c.checkin_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VolunteerScanner() {
  const [step, setStep] = useState("event"); // "event" | "operator" | "scan"
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [operator, setOperator] = useState(null);

  // Restore operator from session
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try { setOperator(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleEventSelect = (ev) => {
    setSelectedEvent(ev);
    setStep(operator ? "scan" : "operator");
  };

  const handleOperatorSave = (op) => {
    setOperator(op);
    setStep("scan");
  };

  const handleBack = () => {
    setStep("event");
    setSelectedEvent(null);
  };

  const handleChangeOperator = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setOperator(null);
    setStep("operator");
  };

  if (step === "event") return <EventSelector onSelect={handleEventSelect} />;
  if (step === "operator") return <OperatorForm onSave={handleOperatorSave} />;
  return (
    <ScannerPanel
      event={selectedEvent}
      operator={operator}
      onBack={handleBack}
    />
  );
}