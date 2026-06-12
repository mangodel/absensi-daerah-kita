/**
 * CameraScanner — scans QR codes using jsQR (no BarcodeDetector, no html5-qrcode)
 * 
 * Key design rules:
 * 1. <video> is ALWAYS in the DOM — never conditionally unmounted
 * 2. Visibility is controlled by CSS height/overflow, NOT display:none
 * 3. Camera auto-starts when active=true changes from false
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, ScanLine, FlipHorizontal, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

export default function CameraScanner({ onScan, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanCooldown = useRef(false);
  const mountedRef = useRef(true);

  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) setCameraOn(false);
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
    if (!video || !canvas) return;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code?.data) {
        doScan(code.data);
        return;
      }
    } catch (_) {
      // ignore scan frame errors
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [doScan]);

  const startCamera = useCallback(async (facing) => {
    const mode = facing || facingMode;
    if (mountedRef.current) setError(null);
    stopCamera();
    scanCooldown.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (mountedRef.current) setError("Browser tidak mendukung akses kamera. Gunakan Upload Foto.");
      return;
    }

    let stream = null;

    // Try preferred facing mode first, then fallback to any camera
    const constraints = [
      { video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: mode }, audio: false },
      { video: true, audio: false },
    ];

    for (const c of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        break;
      } catch (e) {
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          if (mountedRef.current) setError("Izin kamera ditolak. Buka Pengaturan → Safari/Chrome → izinkan kamera untuk situs ini, lalu refresh.");
          return;
        }
        if (e.name === "NotFoundError") {
          if (mountedRef.current) setError("Kamera tidak ditemukan di perangkat ini. Gunakan Upload Foto.");
          return;
        }
        // try next constraint
        continue;
      }
    }

    if (!stream) {
      if (mountedRef.current) setError("Tidak dapat membuka kamera. Coba Upload Foto QR.");
      return;
    }

    streamRef.current = stream;

    // Wait for video element to be ready
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach(t => t.stop());
      if (mountedRef.current) setError("Komponen video tidak siap. Coba refresh halaman.");
      return;
    }

    video.srcObject = stream;

    // Use a promise to wait for video to be playable
    await new Promise((resolve) => {
      const tryPlay = () => {
        if (!mountedRef.current) { resolve(); return; }
        video.play()
          .then(() => {
            if (mountedRef.current) {
              setCameraOn(true);
              rafRef.current = requestAnimationFrame(scanLoop);
            } else {
              stopCamera();
            }
            resolve();
          })
          .catch((playErr) => {
            if (mountedRef.current) setError("Gagal memutar video kamera: " + playErr.message);
            resolve();
          });
      };

      if (video.readyState >= 1) {
        tryPlay();
      } else {
        video.onloadedmetadata = () => { video.onloadedmetadata = null; tryPlay(); };
        video.oncanplay = () => { video.oncanplay = null; tryPlay(); };
        // Safety timeout
        setTimeout(() => { video.onloadedmetadata = null; video.oncanplay = null; tryPlay(); }, 2000);
      }
    });
  }, [facingMode, stopCamera, scanLoop]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code?.data) {
          doScan(code.data);
        } else {
          setError("QR Code tidak ditemukan di foto. Coba foto yang lebih jelas dan terang.");
        }
      } catch (_) {
        setError("Gagal membaca foto. Coba gambar lain.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); setError("Gagal membaca file gambar."); };
    img.src = objectUrl;
  }, [doScan]);

  // Auto-start when activated, auto-stop when deactivated
  useEffect(() => {
    if (active) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {/* These elements MUST stay in DOM always */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Video container — use height transition, NOT display:none */}
      <div
        className="rounded-xl overflow-hidden bg-black transition-all duration-300"
        style={{ height: cameraOn ? "260px" : "0px" }}
      >
        <div className="relative h-full">
          {/* video element always rendered */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {/* Viewfinder */}
          {cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/90 rounded-tl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/90 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/90 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/90 rounded-br" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/70 animate-pulse mx-4" />
              </div>
            </div>
          )}
          {/* Controls */}
          {cameraOn && (
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <button
                type="button"
                onClick={flipCamera}
                className="bg-black/50 hover:bg-black/70 rounded-full p-2 text-white"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-black/50 hover:bg-black/70 rounded-full p-2 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Scan success overlay */}
          {lastScan && (
            <div className="absolute bottom-2 left-2 right-2 bg-accent/90 text-white rounded-lg px-3 py-2 text-sm font-medium text-center z-10 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {lastScan}
            </div>
          )}
        </div>
      </div>

      {/* Idle state — shown when camera not active */}
      {!cameraOn && (
        <div className="bg-secondary/40 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <ScanLine className="w-12 h-12 text-primary/60" />
          <p className="text-sm text-muted-foreground">Kamera QR siap diaktifkan</p>
          {error && (
            <div className="w-full bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive text-left">
              {error}
            </div>
          )}
          <Button type="button" className="w-full" onClick={() => startCamera()}>
            <Camera className="w-4 h-4 mr-2" />
            Aktifkan Kamera
          </Button>
        </div>
      )}

      {/* Upload fallback */}
      <div className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground text-center mb-2">
          Atau upload foto QR Code jika kamera bermasalah:
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Foto QR
        </Button>
      </div>

      {/* Post-scan feedback (when camera stopped) */}
      {!cameraOn && lastScan && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-sm text-accent font-medium text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Berhasil scan: {lastScan}
        </div>
      )}
    </div>
  );
}