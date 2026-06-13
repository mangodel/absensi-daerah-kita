import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, QrCode, Search, UserCheck, AlertCircle, Camera, Monitor, MapPin, ClipboardList, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraScanner from "./CameraScanner";
import { checkGeofence } from "./GeoCheckin";

export default function QRScanner({ eventId, eventName, formConfig }) {
  const qc = useQueryClient();
  const [manualId, setManualId] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState(null);
  const [scannerStation, setScannerStation] = useState("Pintu Utama");
  const [volunteerName, setVolunteerName] = useState("");
  const [mode, setMode] = useState("manual"); // "manual" | "camera" | "search" | "absen"
  const [absenData, setAbsenData] = useState({}); // participantId -> status
  const [savingAbsen, setSavingAbsen] = useState(false);

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventId ? base44.entities.EventParticipant.filter({ event_id: eventId }) : [],
    enabled: !!eventId,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["event-checkins", eventId],
    queryFn: () => eventId ? base44.entities.EventCheckin.filter({ event_id: eventId }, "-checkin_time", 200) : [],
    enabled: !!eventId,
    refetchInterval: 5000,
  });

  const checkinMut = useMutation({
    mutationFn: async (participant) => {
      // Anti-double: check if already checked in
      const existing = checkins.find(c => c.participant_db_id === participant.id);
      if (existing) return { type: "duplicate", participant, checkin: existing };

      // Geo-fence validation
      if (formConfig?.geofence_enabled && formConfig?.venue_lat && formConfig?.venue_lng) {
        const geo = await checkGeofence({
          venueLat: formConfig.venue_lat,
          venueLng: formConfig.venue_lng,
          radiusM: formConfig.venue_radius_m || 200,
        });
        if (!geo.allowed) return { type: "geofence", error: geo.error };
      }

      const now = new Date();
      await base44.entities.EventCheckin.create({
        participant_id: participant.participant_id,
        participant_db_id: participant.id,
        participant_name: participant.full_name,
        event_id: eventId,
        checkin_time: now.toISOString(),
        checkin_date: now.toISOString().split("T")[0],
        checkin_method: mode === "camera" ? "QR Scan" : mode === "manual" ? "Manual" : "Manual",
        scanner_station: scannerStation,
        volunteer_name: volunteerName,
      });
      await base44.entities.EventParticipant.update(participant.id, { attendance_status: "Present" });
      return { type: "success", participant };
    },
    onSuccess: (res) => {
      setResult(res);
      qc.invalidateQueries({ queryKey: ["event-checkins", eventId] });
      qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
      if (res.type === "success") {
        setTimeout(() => { setResult(null); setManualId(""); setSearch(""); }, 3000);
      }
    },
  });

  const handleCheckin = (participant) => {
    if (!eventId) return;
    checkinMut.mutate(participant);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const pid = manualId.trim().toUpperCase();
    const p = participants.find(x => x.participant_id === pid);
    if (!p) { setResult({ type: "notfound" }); return; }
    handleCheckin(p);
  };

  // Called by camera scanner when QR decoded
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

  const recentCheckins = checkins.slice(0, 5);

  const openDisplay = () => {
    const params = new URLSearchParams(window.location.search);
    window.open(`/event-display?event_id=${eventId}`, "_blank");
  };

  if (!eventId) return (
    <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
      <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>Pilih event aktif terlebih dahulu</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Geo-fence indicator */}
      {formConfig?.geofence_enabled && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-primary">Geo-fence aktif — radius {formConfig.venue_radius_m || 200}m. Check-in hanya valid di area venue.</p>
        </div>
      )}

      {/* Settings Bar */}
      <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Pos Scanner</label>
          <Input value={scannerStation} onChange={e => setScannerStation(e.target.value)} placeholder="cth: Pintu Utama" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Nama Volunteer</label>
          <Input value={volunteerName} onChange={e => setVolunteerName(e.target.value)} placeholder="Nama Anda..." className="h-8 text-sm" />
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={mode === "manual" ? "default" : "outline"} size="sm" onClick={() => { setMode("manual"); setResult(null); }}>
          <QrCode className="w-4 h-4 mr-1" /> Input ID
        </Button>
        <Button variant={mode === "camera" ? "default" : "outline"} size="sm" onClick={() => { setMode("camera"); setResult(null); }}>
          <Camera className="w-4 h-4 mr-1" /> Kamera
        </Button>
        <Button variant={mode === "search" ? "default" : "outline"} size="sm" onClick={() => { setMode("search"); setResult(null); }}>
          <Search className="w-4 h-4 mr-1" /> Cari Nama
        </Button>
        <Button variant={mode === "absen" ? "default" : "outline"} size="sm" onClick={() => { setMode("absen"); setResult(null); }}>
          <ClipboardList className="w-4 h-4 mr-1" /> Absen Manual
        </Button>
        <Button variant="outline" size="sm" className="ml-auto" onClick={openDisplay}>
          <Monitor className="w-4 h-4 mr-1" /> Tampilan TV
        </Button>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${
          result.type === "success" ? "bg-accent/10 border border-accent/30" :
          result.type === "duplicate" ? "bg-amber-50 border border-amber-200" :
          "bg-destructive/10 border border-destructive/20"
        }`}>
          {result.type === "success" && <CheckCircle className="w-8 h-8 text-accent shrink-0" />}
          {(result.type === "duplicate" || result.type === "notfound" || result.type === "geofence") && <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />}
          <div>
            {result.type === "success" && (
              <>
                <p className="font-semibold text-accent text-lg">✓ Check-in Berhasil!</p>
                <p className="text-sm">{result.participant?.full_name} · {result.participant?.participant_id}</p>
              </>
            )}
            {result.type === "duplicate" && (
              <>
                <p className="font-semibold text-amber-700">Sudah Check-in Sebelumnya</p>
                <p className="text-sm text-amber-600">{result.participant?.full_name} — {result.checkin?.checkin_time ? format(new Date(result.checkin.checkin_time), "HH:mm:ss", { locale: id }) : ""}</p>
              </>
            )}
            {result.type === "notfound" && (
              <p className="font-semibold text-destructive">ID peserta tidak ditemukan</p>
            )}
            {result.type === "geofence" && (
              <>
                <p className="font-semibold text-amber-700">Di Luar Lokasi Venue</p>
                <p className="text-sm text-amber-600">{result.error}</p>
              </>
            )}
          </div>
          {result.type !== "success" && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setResult(null)}>Tutup</Button>
          )}
        </div>
      )}

      {/* Manual ID Input */}
      {mode === "manual" && (
        <form onSubmit={handleManualSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-center text-lg">Scan / Ketik ID Peserta</h3>
          <p className="text-xs text-center text-muted-foreground">Arahkan scanner barcode ke kolom ini, atau ketik manual ID peserta (AUNZ000001)</p>
          <Input
            autoFocus
            value={manualId}
            onChange={e => setManualId(e.target.value.toUpperCase())}
            placeholder="AUNZ000001"
            className="text-center text-2xl font-mono h-14 tracking-widest"
          />
          <Button type="submit" className="w-full h-12 text-base" disabled={!manualId || checkinMut.isPending}>
            <UserCheck className="w-5 h-5 mr-2" />
            {checkinMut.isPending ? "Memproses..." : "Tandai Hadir"}
          </Button>
        </form>
      )}

      {/* Camera Mode — always rendered so video element stays in DOM */}
      <div className={`bg-card border border-border rounded-xl p-4 space-y-3 ${mode !== "camera" ? "hidden" : ""}`}>
        <h3 className="font-semibold text-center">Scan QR dengan Kamera</h3>
        <p className="text-xs text-center text-muted-foreground">Arahkan kamera ke QR Code peserta</p>
        <CameraScanner onScan={handleCameraScan} active={mode === "camera"} />
      </div>

      {/* Search Mode */}
      {mode === "search" && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, telepon, atau ID..."
            className="h-10"
          />
          {filteredSearch.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredSearch.map(p => {
                const alreadyCheckin = checkins.some(c => c.participant_db_id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.participant_id} {p.phone ? `· ${p.phone}` : ""}</p>
                    </div>
                    {alreadyCheckin ? (
                      <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">Hadir</Badge>
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
          {search.length > 1 && filteredSearch.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">Peserta tidak ditemukan.</p>
          )}
        </div>
      )}

      {/* Absen Manual Mode */}
      {mode === "absen" && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Absen Manual ({participants.length} peserta)
            </h3>
            <Button
              size="sm"
              disabled={Object.keys(absenData).length === 0 || savingAbsen}
              onClick={async () => {
                setSavingAbsen(true);
                const entries = Object.entries(absenData);
                const now = new Date();
                for (const [pid, status] of entries) {
                  const p = participants.find(x => x.id === pid);
                  if (!p) continue;
                  const alreadyCheckin = checkins.some(c => c.participant_db_id === pid);
                  if (status === "Hadir" && !alreadyCheckin) {
                    await base44.entities.EventCheckin.create({
                      participant_id: p.participant_id,
                      participant_db_id: p.id,
                      participant_name: p.full_name,
                      event_id: eventId,
                      checkin_time: now.toISOString(),
                      checkin_date: now.toISOString().split("T")[0],
                      checkin_method: "Manual",
                      scanner_station: scannerStation,
                      volunteer_name: volunteerName,
                    });
                    await base44.entities.EventParticipant.update(p.id, { attendance_status: "Present" });
                  } else if (status !== "Hadir") {
                    await base44.entities.EventParticipant.update(p.id, { attendance_status: "Absent" });
                  }
                }
                qc.invalidateQueries({ queryKey: ["event-checkins", eventId] });
                qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
                setAbsenData({});
                setSavingAbsen(false);
              }}
              className="gap-1"
            >
              {savingAbsen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan ({Object.keys(absenData).length})
            </Button>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada peserta terdaftar.</p>
            ) : (
              participants.map((p, idx) => {
                const alreadyCheckin = checkins.some(c => c.participant_db_id === p.id);
                const currentStatus = absenData[p.id] || (alreadyCheckin ? "Hadir" : null);
                const statusOptions = ["Hadir", "Alpa", "Izin"];
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 bg-secondary/20 rounded-lg">
                    <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.participant_id}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {statusOptions.map(s => (
                        <button
                          key={s}
                          onClick={() => setAbsenData(prev => ({ ...prev, [p.id]: s }))}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            currentStatus === s
                              ? s === "Hadir" ? "bg-accent text-white border-accent"
                              : s === "Alpa" ? "bg-destructive text-white border-destructive"
                              : "bg-amber-500 text-white border-amber-500"
                              : "bg-card border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-sm">Check-in Terbaru</h4>
          {recentCheckins.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.participant_name}</p>
                <p className="text-xs text-muted-foreground">{c.participant_id} · {c.checkin_method}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {c.checkin_time ? format(new Date(c.checkin_time), "HH:mm") : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}