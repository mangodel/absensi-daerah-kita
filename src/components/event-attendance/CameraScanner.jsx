/**
 * CameraScanner — Universal QR scanner
 * - Mobile (iOS/Android): uses <input capture="environment"> → file-based decode via jsQR
 * - PC/Laptop/Tablet with webcam: uses getUserMedia live stream + jsQR scan loop
 * - Fallback: file picker (gallery/file system) on any device
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, ScanLine, FlipHorizontal, CheckCircle, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function decodeQRFromFile(file, onResult, onError) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) onResult(code.data);
      else onError("QR Code tidak ditemukan di foto. Coba foto lebih jelas dan dekat.");
    } catch {
      onError("Gagal membaca foto. Coba gambar lain.");
    }
  };
  img.onerror = () => { URL.revokeObjectURL(url); onError("Gagal membaca file gambar."); };
  img.src = url;
}

export default function CameraScanner({ onScan, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const cameraInputRef = useRef(null);
  const scanCooldown = useRef(false);
  const mountedRef = useRef(true);

  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mountedRef.current) { setCameraOn(false); setLoading(false); }
  }, []);

  const doScan = useCallback((decoded) => {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    const val = decoded.trim().toUpperCase();
    setLastScan(val);
    onScan(val);
    setTimeout(() => {
      scanCooldown.current = false;
      if (mountedRef.current) setLastScan(null);
    }, 3000);
  }, [onScan]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    if (video.readyState < 2 || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code?.data) { doScan(code.data); return; }
    } catch { /* ignore */ }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [doScan]);

  const startLiveCamera = useCallback(async (facing) => {
    const mode = facing || facingMode;
    stopCamera();
    if (mountedRef.current) { setError(null); setLoading(true); }

    if (!navigator.mediaDevices?.getUserMedia) {
      if (mountedRef.current) setError("Browser tidak mendukung akses kamera langsung. Gunakan tombol Foto di bawah.");
      if (mountedRef.current) setLoading(false);
      return;
    }

    const constraints = [
      { video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: mode }, audio: false },
      { video: true, audio: false },
    ];

    let stream = null;
    for (const c of constraints) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break; }
      catch (e) {
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          if (mountedRef.current) setError("Izin kamera ditolak. Buka Pengaturan browser → izinkan kamera untuk situs ini, lalu refresh halaman.");
          if (mountedRef.current) setLoading(false);
          return;
        }
        if (e.name === "NotFoundError") break; // no camera on device, try next
      }
    }

    if (!stream) {
      if (mountedRef.current) setError("Kamera tidak ditemukan atau tidak dapat diakses. Gunakan tombol Foto atau Galeri di bawah.");
      if (mountedRef.current) setLoading(false);
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

    video.srcObject = stream;
    video.onloadedmetadata = () => {
      if (!mountedRef.current) return;
      video.play().then(() => {
        if (mountedRef.current) { setCameraOn(true); setLoading(false); rafRef.current = requestAnimationFrame(scanLoop); }
        else stopCamera();
      }).catch((err) => {
        if (mountedRef.current) { setError("Gagal memutar video: " + err.message); setLoading(false); }
      });
    };
    // Safety timeout
    setTimeout(() => { if (mountedRef.current && !cameraOn && loading) { setLoading(false); } }, 5000);
  }, [facingMode, stopCamera, scanLoop]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startLiveCamera(next);
  }, [facingMode, startLiveCamera]);

  const handleFileChange = useCallback((e, isCamera) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    decodeQRFromFile(
      file,
      (data) => doScan(data),
      (msg) => setError(msg)
    );
    if (e.target) e.target.value = "";
  }, [doScan]);

  // Auto-start/stop live camera on desktop when active changes
  useEffect(() => {
    if (!isMobileDevice()) {
      if (active) startLiveCamera();
      else stopCamera();
    } else {
      if (!active) stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    return () => { mountedRef.current = false; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mobile = isMobileDevice();

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      {/* Camera input — triggers native camera on mobile */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e, true)} />

      {/* Live video — always in DOM, visibility via height */}
      <div className="rounded-xl overflow-hidden bg-black transition-all duration-300" style={{ height: cameraOn ? "260px" : "0px" }}>
        <div className="relative h-full">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          {cameraOn && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/90 rounded-tl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/90 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/90 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/90 rounded-br" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/70 animate-pulse mx-4" />
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-2 z-10">
                <button type="button" onClick={flipCamera} className="bg-black/50 hover:bg-black/70 rounded-full p-2 text-white">
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button type="button" onClick={stopCamera} className="bg-black/50 hover:bg-black/70 rounded-full p-2 text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {lastScan && (
                <div className="absolute bottom-2 left-2 right-2 bg-accent/90 text-white rounded-lg px-3 py-2 text-sm font-medium text-center z-10 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />{lastScan}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-secondary/40 rounded-xl p-4 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Membuka kamera...</p>
        </div>
      )}

      {/* Idle state */}
      {!cameraOn && !loading && (
        <div className="bg-secondary/40 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
          <ScanLine className="w-10 h-10 text-primary/60" />
          <p className="text-sm text-muted-foreground">
            {mobile ? "Gunakan tombol di bawah untuk scan QR" : "Kamera siap diaktifkan"}
          </p>
          {error && (
            <div className="w-full bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive text-left">
              {error}
            </div>
          )}

          {/* Mobile: file-based scan (most reliable) */}
          {mobile && (
            <Button type="button" className="w-full" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-2" />
              Foto QR dengan Kamera
            </Button>
          )}

          {/* Desktop/Laptop: live camera stream */}
          {!mobile && (
            <Button type="button" className="w-full" onClick={() => startLiveCamera()}>
              <Monitor className="w-4 h-4 mr-2" />
              Aktifkan Webcam / Kamera
            </Button>
          )}
        </div>
      )}

      {!cameraOn && lastScan && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-sm text-accent font-medium text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />Berhasil scan: {lastScan}
        </div>
      )}
    </div>
  );
}