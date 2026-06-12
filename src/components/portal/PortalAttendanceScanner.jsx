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
  const [scanStatus, setScanStatus] = useState(null);
  const [scanResultName, setScanResultName] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const [camError, setCamError] = useState(null);

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active-event-sessions"],
    queryFn: () => base44.entities.EventSession.filter({ status: "Active" }),
  });

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
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
        toast.error("QR tidak dikenali.");
        setTimeout(() => { cooldown.current = false; setScanStatus(null); }, 3000);
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
      toast.success(`Absensi berhasil! Selamat datang, ${participant.full_name}`);
      stopCamera();
    } catch {
      setScanStatus("error");
      toast.error("Terjadi kesalahan saat memproses absensi.");
      setTimeout(() => { cooldown.current = false; setScanStatus(null); }, 3000);
    }
  }, [stopCamera, user]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, canvas.width, canvas.height, { inversionAttempts: "dontInvert" });
    if (code?.data) { handleCheckin(code.data); return; }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [handleCheckin]);

  const startCamera = useCallback(async (fm) => {
    const facing = fm || facingMode;
    setCamError(null);
    setScanStatus(null);
    setScanResultName("");
    stopCamera();
    cooldown.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Browser ini tidak mendukung akses kamera. Gunakan Upload Foto.");
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCamError("Izin kamera ditolak. Buka pengaturan browser → izinkan kamera, lalu refresh.");
        } else if (err.name === "NotFoundError") {
          setCamError("Kamera tidak ditemukan. Gunakan Upload Foto.");
        } else {
          setCamError(`Tidak dapat membuka kamera (${err.name}). Gunakan Upload Foto.`);
        }
        return;
      }
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
    video.srcObject = stream;
    let played = false;
    const onReady = () => {
      if (played) return;
      played = true;
      video.onloadedmetadata = null;
      video.oncanplay = null;
      video.play().then(() => {
        setCameraActive(true);
        rafRef.current = requestAnimationFrame(scanLoop);
      }).catch(err => setCamError("Gagal memulai video: " + err.message));
    };
    if (video.readyState >= 1) {
      onReady();
    } else {
      video.onloadedmetadata = onReady;
      video.oncanplay = onReady;
      setTimeout(onReady, 2500);
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
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const imgData = canvas.getContext("2d").getImageData(0, 0, img.width, img.height);
      const code = jsQR(imgData.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      URL.revokeObjectURL(url);
      if (code?.data) handleCheckin(code.data);
      else setCamError("QR Code tidak ditemukan di foto. Coba foto yang lebih jelas.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    img.src = url;
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const resetScan = () => {
    setScanStatus(null);
    setScanResultName("");
    setCamError(null);
    cooldown.current = false;
  };

  return (
    <div className="space-y-4">
      {/* Hidden always-in-DOM elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />

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

          {/* Video always in DOM — overflow-hidden hides without display:none which breaks stream */}
          <div className={`overflow-hidden rounded-xl transition-all duration-300 bg-black ${cameraActive ? "max-h-72" : "max-h-0"}`}>
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-md" />
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary/80 animate-pulse" />
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                <button onClick={flipCamera} className="bg-black/50 rounded-full p-1.5 text-white hover:bg-black/70">
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button onClick={stopCamera} className="bg-black/50 rounded-full p-1.5 text-white hover:bg-black/70">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>


          {!cameraActive && (
            <Button onClick={() => startCamera()} className="w-full gap-2" disabled={scanStatus === "success"}>
              <Camera className="w-4 h-4" /> Buka Kamera & Scan QR
            </Button>
          )}
          {cameraActive && (
            <Button variant="outline" onClick={stopCamera} className="w-full gap-2">
              <X className="w-4 h-4" /> Hentikan Kamera
            </Button>
          )}

          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2" disabled={scanStatus === "success"}>
            <Upload className="w-4 h-4" /> Upload Foto QR (alternatif)
          </Button>

          {(scanStatus || camError) && (
            <Button variant="ghost" onClick={resetScan} className="w-full gap-2 text-xs">
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