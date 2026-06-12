import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw, Upload, X, FlipHorizontal } from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";

export default function PortalAttendanceScanner({ member, user, volunteerLevel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const fileInputRef = useRef(null);
  const cooldown = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState(null); // 'success' | 'error' | null
  const [scanResultName, setScanResultName] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const [camError, setCamError] = useState(null);

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active-event-sessions", volunteerLevel],
    queryFn: async () => {
      const sessions = await base44.entities.EventSession.filter({ status: "Active" });
      if (!volunteerLevel) return sessions;
      return sessions.filter(s => {
        if (volunteerLevel === "Daerah") return true;
        if (volunteerLevel === "Desa" && member?.desa) return s.event_name?.includes(member.desa) || !s.event_name;
        if (volunteerLevel === "Kelompok" && member?.kelompok) return s.event_name?.includes(member.kelompok) || !s.event_name;
        return false;
      });
    },
  });

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const handleCheckin = useCallback(async (qrValue) => {
    if (cooldown.current) return;
    cooldown.current = true;
    const clean = qrValue.trim().toUpperCase();
    try {
      const participants = await base44.entities.EventParticipant.filter({ qr_code_value: clean });
      if (participants.length === 0) {
        setScanStatus("error");
        toast.error("QR tidak dikenali. Pastikan sudah terdaftar di event ini.");
        cooldown.current = false;
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
        volunteer_name: user?.full_name || "Self Check-in",
        notes: "Self check-in via Portal Jamaah",
      });
      await base44.entities.EventParticipant.update(participant.id, { attendance_status: "Present" });
      setScanResultName(participant.full_name);
      setScanStatus("success");
      toast.success(`Absensi berhasil! Selamat datang, ${participant.full_name}`);
      stopCamera();
    } catch (e) {
      setScanStatus("error");
      toast.error("Terjadi kesalahan saat memproses absensi.");
      cooldown.current = false;
    }
  }, [stopCamera, user]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) { rafRef.current = requestAnimationFrame(scanLoop); return; }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imgData.data, w, h, { inversionAttempts: "dontInvert" });
    if (code?.data) {
      handleCheckin(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [handleCheckin]);

  const startCamera = useCallback(async (facing) => {
    const fm = facing || facingMode;
    setCamError(null);
    setScanStatus(null);
    setScanResultName("");
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Browser ini tidak mendukung akses kamera. Gunakan fitur Upload Foto di bawah.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: fm }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraActive(true);
            rafRef.current = requestAnimationFrame(scanLoop);
          });
        };
      }
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCamError("Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.");
      } else {
        setCamError("Tidak dapat mengakses kamera. Gunakan Upload Foto sebagai alternatif.");
      }
    }
  }, [facingMode, stopCamera, scanLoop]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCamError(null);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(imgData.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      URL.revokeObjectURL(url);
      if (code?.data) {
        handleCheckin(code.data);
      } else {
        setCamError("QR Code tidak ditemukan di foto. Coba foto ulang dengan lebih jelas.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    img.src = url;
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />

      {activeSessions.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-accent mb-2">Event Aktif Saat Ini:</p>
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
          {scanStatus === "success" && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
              <CheckCircle className="w-6 h-6 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent">Absensi Berhasil!</p>
                {scanResultName && <p className="text-xs text-muted-foreground">Selamat datang, {scanResultName}</p>}
              </div>
            </div>
          )}
          {scanStatus === "error" && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-6 h-6 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">QR Tidak Valid</p>
                <p className="text-xs text-muted-foreground">Pastikan QR code benar dan event masih aktif.</p>
              </div>
            </div>
          )}

          {camError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              {camError}
            </div>
          )}

          {/* Live camera view */}
          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full max-h-64 object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-md" />
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary/80 animate-pulse" />
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={flipCamera} className="bg-black/50 rounded-full p-1.5 text-white hover:bg-black/70">
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button onClick={stopCamera} className="bg-black/50 rounded-full p-1.5 text-white hover:bg-black/70">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {!cameraActive && (
            <Button onClick={() => startCamera()} className="w-full gap-2" disabled={scanStatus === "success"}>
              <Camera className="w-4 h-4" />
              Buka Kamera & Scan QR
            </Button>
          )}

          {cameraActive && (
            <Button variant="outline" onClick={stopCamera} className="w-full gap-2">
              <X className="w-4 h-4" />
              Hentikan Kamera
            </Button>
          )}

          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2" disabled={scanStatus === "success"}>
            <Upload className="w-4 h-4" />
            Upload Foto QR (alternatif)
          </Button>

          {(scanStatus || camError) && (
            <Button variant="ghost" onClick={() => { setScanStatus(null); setScanResultName(""); setCamError(null); cooldown.current = false; }} className="w-full gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Scan Ulang
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Arahkan kamera ke QR Code. Bekerja di HP, tablet, dan laptop dengan webcam.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}