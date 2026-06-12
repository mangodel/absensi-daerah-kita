import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";

function decodeQRFromImage(imgEl) {
  const canvas = document.createElement("canvas");
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(imgData.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
}

export default function PortalAttendanceScanner({ member, user, volunteerLevel }) {
  const cameraFileRef = useRef(null);
  const galleryFileRef = useRef(null);
  const cooldown = useRef(false);

  // Dynamically set capture attribute after mount to ensure browser honors it
  const setCaptureAttr = (ref) => {
    if (ref.current) {
      ref.current.setAttribute("capture", "environment");
    }
  };

  const [scanStatus, setScanStatus] = useState(null); // null | "success" | "error"
  const [scanResultName, setScanResultName] = useState("");
  const [camError, setCamError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active-event-sessions"],
    queryFn: () => base44.entities.EventSession.filter({ status: "Active" }),
  });

  const handleCheckin = useCallback(async (qrValue) => {
    if (cooldown.current) return;
    cooldown.current = true;
    setProcessing(true);
    setCamError(null);
    const clean = qrValue.trim().toUpperCase();
    try {
      const participants = await base44.entities.EventParticipant.filter({ qr_code_value: clean });
      if (participants.length === 0) {
        setScanStatus("error");
        setProcessing(false);
        toast.error("QR tidak dikenali.");
        setTimeout(() => { cooldown.current = false; }, 3000);
        return;
      }
      const participant = participants[0];
      await base44.entities.EventCheckin.create({
        participant_id: participant.participant_id,
        participant_db_id: participant.id,
        participant_name: participant.full_name,
        event_id: participant.event_id,
        checkin_time: new Date().toISOString(),
        checkin_date: new Date().toISOString().split("T")[0],
        checkin_method: "QR Scan",
        volunteer_name: user?.full_name || "Portal Check-in",
        notes: "Check-in via Portal Jamaah",
      });
      await base44.entities.EventParticipant.update(participant.id, { attendance_status: "Present" });
      setScanResultName(participant.full_name);
      setScanStatus("success");
      setProcessing(false);
      toast.success(`Absensi berhasil! Selamat datang, ${participant.full_name}`);
    } catch {
      setScanStatus("error");
      setProcessing(false);
      toast.error("Terjadi kesalahan saat memproses absensi.");
      setTimeout(() => { cooldown.current = false; setScanStatus(null); }, 3000);
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCamError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const code = decodeQRFromImage(img);
      URL.revokeObjectURL(url);
      if (code?.data) {
        handleCheckin(code.data);
      } else {
        setCamError("QR Code tidak terdeteksi. Pastikan gambar jelas dan QR terlihat penuh.");
      }
      if (e.target) e.target.value = "";
    };
    img.onerror = () => { URL.revokeObjectURL(url); setCamError("Gagal membaca file gambar."); };
    img.src = url;
  };

  const resetScan = () => {
    setScanStatus(null);
    setScanResultName("");
    setCamError(null);
    cooldown.current = false;
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs — capture set dynamically for iOS/Android compatibility */}
      <input ref={cameraFileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={galleryFileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {activeSessions.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-accent mb-2">Event Aktif:</p>
            {activeSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.event_name}</span>
                <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">Aktif</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Scan QR untuk Absensi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status feedback */}
          {scanStatus === "success" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
              <CheckCircle className="w-8 h-8 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent">Absensi Berhasil!</p>
                {scanResultName && <p className="text-xs text-muted-foreground">Selamat datang, {scanResultName}</p>}
              </div>
            </div>
          )}
          {scanStatus === "error" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-8 h-8 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">QR Tidak Valid</p>
                <p className="text-xs text-muted-foreground">Pastikan QR code benar dan event masih aktif.</p>
              </div>
            </div>
          )}
          {processing && !scanStatus && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-primary">Memproses absensi...</p>
            </div>
          )}
          {camError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠️ {camError}
            </div>
          )}

          {/* Scan buttons — no live stream, purely file-based */}
          {scanStatus !== "success" && (
            <div className="grid grid-cols-1 gap-3">
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={() => { resetScan(); setCaptureAttr(cameraFileRef); cameraFileRef.current?.click(); }}
                disabled={processing}
              >
                <Camera className="w-5 h-5" />
                Foto QR dengan Kamera
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { resetScan(); galleryFileRef.current?.click(); }}
                disabled={processing}
              >
                <ImageIcon className="w-4 h-4" />
                Pilih dari Galeri / File
              </Button>
            </div>
          )}

          {(scanStatus || camError) && (
            <Button variant="ghost" onClick={resetScan} className="w-full gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Scan Ulang
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            📷 Tekan <strong>Foto QR</strong> → arahkan kamera ke QR code → ambil foto.<br />
            Atau pilih gambar QR dari galeri.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}