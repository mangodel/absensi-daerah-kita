import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw, ImageIcon, X, FlipHorizontal } from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";

// Decode QR from an image element using a temp canvas
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const cameraFileRef = useRef(null);   // input[capture] — opens native camera on mobile
  const galleryFileRef = useRef(null);  // input without capture — opens gallery/file picker
  const cooldown = useRef(false);
  const playAttempted = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanResultName, setScanResultName] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const [camError, setCamError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active-event-sessions"],
    queryFn: () => base44.entities.EventSession.filter({ status: "Active" }),
  });

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    playAttempted.current = false;
    setCameraActive(false);
  }, []);

  const handleCheckin = useCallback(async (qrValue) => {
    if (cooldown.current) return;
    cooldown.current = true;
    setProcessing(true);
    const clean = qrValue.trim().toUpperCase();
    try {
      const participants = await base44.entities.EventParticipant.filter({ qr_code_value: clean });
      if (participants.length === 0) {
        setScanStatus("error");
        toast.error("QR tidak dikenali.");
        setTimeout(() => { cooldown.current = false; setScanStatus(null); setProcessing(false); }, 3000);
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
      stopCamera();
    } catch {
      setScanStatus("error");
      setProcessing(false);
      toast.error("Terjadi kesalahan saat memproses absensi.");
      setTimeout(() => { cooldown.current = false; setScanStatus(null); }, 3000);
    }
  }, [stopCamera, user]);

  // Scanning loop for live camera
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, canvas.width, canvas.height, { inversionAttempts: "dontInvert" });
      if (code?.data) {
        handleCheckin(code.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [handleCheckin]);

  const startCamera = useCallback(async (fm) => {
    const facing = fm || facingMode;
    setCamError(null);
    setScanStatus(null);
    setScanResultName("");
    stopCamera();
    cooldown.current = false;
    playAttempted.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Browser tidak mendukung akses kamera langsung. Gunakan tombol 'Foto QR' di bawah.");
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCamError("Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu refresh.");
        } else if (err.name === "NotFoundError") {
          setCamError("Kamera tidak ditemukan. Gunakan 'Foto QR' di bawah.");
        } else {
          setCamError(`Kamera gagal dibuka (${err.name}). Gunakan 'Foto QR' di bawah.`);
        }
        return;
      }
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

    video.srcObject = stream;

    // Use onloadedmetadata + direct play, avoid double-trigger
    const tryPlay = () => {
      if (playAttempted.current) return;
      playAttempted.current = true;
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          setCameraActive(true);
          rafRef.current = requestAnimationFrame(scanLoop);
        }).catch(err => {
          setCamError(`Video gagal play: ${err.message}. Gunakan 'Foto QR' di bawah.`);
          stopCamera();
        });
      } else {
        setCameraActive(true);
        rafRef.current = requestAnimationFrame(scanLoop);
      }
    };

    video.onloadedmetadata = tryPlay;
    // Fallback: if already loaded (some browsers fire before listener)
    if (video.readyState >= 1) tryPlay();
  }, [facingMode, stopCamera, scanLoop]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  // Handle file from either camera capture or gallery
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

  useEffect(() => () => stopCamera(), [stopCamera]);

  const resetScan = () => {
    setScanStatus(null);
    setScanResultName("");
    setCamError(null);
    cooldown.current = false;
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Hidden canvases and file inputs */}
      <canvas ref={canvasRef} className="hidden" />
      {/* capture="environment" triggers native camera on mobile */}
      <input ref={cameraFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      {/* No capture — opens gallery/file picker */}
      <input ref={galleryFileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {activeSessions.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-accent mb-2">Event Aktif:</p>
            {activeSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between" key={s.id}>
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

          {/* Live camera view — always in DOM, visibility via max-h */}
          <div
            className="overflow-hidden rounded-xl bg-black transition-all duration-300"
            style={{ maxHeight: cameraActive ? "288px" : "0px" }}
          >
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-72 object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 relative">
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-md" />
                  <div className="absolute inset-x-6 top-1/2 h-0.5 bg-red-400/80 animate-pulse" />
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                <button onClick={flipCamera} className="bg-black/50 rounded-full p-2 text-white">
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button onClick={stopCamera} className="bg-black/50 rounded-full p-2 text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main action buttons */}
          <div className="grid grid-cols-1 gap-3">
            {/* Primary: take photo with native camera (most reliable on mobile) */}
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => cameraFileRef.current?.click()}
              disabled={scanStatus === "success" || processing}
            >
              <Camera className="w-5 h-5" />
              Foto QR dengan Kamera
            </Button>

            {/* Secondary: live stream scan (works on desktop / modern Android Chrome) */}
            {!cameraActive ? (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => startCamera()}
                disabled={scanStatus === "success" || processing}
              >
                <QrCode className="w-4 h-4" />
                Scan Langsung (Live Camera)
              </Button>
            ) : (
              <Button variant="outline" onClick={stopCamera} className="w-full gap-2">
                <X className="w-4 h-4" /> Hentikan Kamera
              </Button>
            )}

            {/* Tertiary: pick from gallery */}
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => galleryFileRef.current?.click()}
              disabled={scanStatus === "success" || processing}
            >
              <ImageIcon className="w-4 h-4" />
              Pilih dari Galeri / File
            </Button>
          </div>

          {(scanStatus || camError) && (
            <Button variant="ghost" onClick={resetScan} className="w-full gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Scan Ulang
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            💡 Di HP: gunakan <strong>Foto QR</strong> untuk membuka kamera langsung.<br />
            Di laptop/desktop: gunakan <strong>Scan Langsung</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}