import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, ScanLine, FlipHorizontal, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

/**
 * CameraScanner — universal QR scanner via jsQR + getUserMedia
 * 
 * Key design: <video> and <canvas> are ALWAYS mounted in the DOM so refs
 * are always valid before startCamera() is called.  Visibility is toggled
 * via CSS classes, never via conditional rendering.
 */
export default function CameraScanner({ onScan, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const fileInputRef = useRef(null);
  const cooldown = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  const triggerScan = useCallback((value) => {
    if (cooldown.current) return;
    cooldown.current = true;
    const clean = value.trim().toUpperCase();
    setLastScanned(clean);
    onScan(clean);
    setTimeout(() => { cooldown.current = false; setLastScanned(null); }, 3000);
  }, [onScan]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

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
    if (code?.data) { triggerScan(code.data); return; }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [triggerScan]);

  const startCamera = useCallback(async (fm) => {
    const facing = fm || facingMode;
    setError(null);
    stopCamera();
    cooldown.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser tidak mendukung akses kamera langsung. Gunakan Upload Foto di bawah.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current; // always in DOM
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().then(() => {
          setCameraActive(true);
          rafRef.current = requestAnimationFrame(scanLoop);
        }).catch(err => setError("Gagal memulai video: " + err.message));
      };
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Izin kamera ditolak. Izinkan akses kamera di pengaturan browser lalu coba lagi.");
      } else if (err.name === "NotFoundError") {
        setError("Kamera tidak ditemukan. Gunakan Upload Foto sebagai alternatif.");
      } else if (err.name === "NotReadableError") {
        setError("Kamera sedang dipakai aplikasi lain. Tutup lalu coba lagi.");
      } else {
        setError(`Gagal mengakses kamera (${err.name}). Coba Upload Foto.`);
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
    setError(null);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const imgData = canvas.getContext("2d").getImageData(0, 0, img.width, img.height);
      const code = jsQR(imgData.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      URL.revokeObjectURL(url);
      if (code?.data) triggerScan(code.data);
      else setError("QR Code tidak ditemukan di foto. Coba foto yang lebih jelas.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    img.src = url;
  };

  useEffect(() => {
    if (!active) stopCamera();
    return () => stopCamera();
  }, [active, stopCamera]);

  if (!active) return null;

  return (
    <div className="space-y-3">
      {/* Always in DOM — refs always valid */}
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />

      {/* Camera view — always in DOM, CSS controls visibility */}
      <div className={`relative rounded-xl overflow-hidden bg-black ${cameraActive ? "block" : "hidden"}`}>
        <video ref={videoRef} className="w-full max-h-72 object-cover" autoPlay playsInline muted />
        {/* Viewfinder corners */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-52 h-52 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-md" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-md" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-md" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-md" />
            <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary/80 animate-pulse" />
          </div>
        </div>
        {/* Controls */}
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button onClick={flipCamera} className="bg-black/50 rounded-full p-2 text-white hover:bg-black/70">
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button onClick={stopCamera} className="bg-black/50 rounded-full p-2 text-white hover:bg-black/70">
            <X className="w-4 h-4" />
          </button>
        </div>
        {lastScanned && (
          <div className="absolute bottom-2 left-2 right-2 bg-accent text-white rounded-lg px-3 py-2 text-sm font-medium text-center z-10">
            ✓ Scanned: {lastScanned}
          </div>
        )}
      </div>

      {/* Idle state — shown when camera not active */}
      {!cameraActive && (
        <div className="bg-secondary/40 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <ScanLine className="w-12 h-12 text-primary opacity-70" />
          <p className="text-sm text-muted-foreground">Tekan tombol di bawah untuk membuka kamera dan scan QR Code secara otomatis.</p>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive w-full text-left">
              {error}
            </div>
          )}
          <Button type="button" className="w-full" onClick={() => startCamera()}>
            <Camera className="w-4 h-4 mr-2" /> Buka Kamera
          </Button>
          <div className="w-full border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Atau upload foto QR Code:</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Upload Foto QR
            </Button>
          </div>
        </div>
      )}

      {!cameraActive && lastScanned && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-sm text-accent font-medium text-center">
          ✓ Berhasil scan: {lastScanned}
        </div>
      )}
    </div>
  );
}