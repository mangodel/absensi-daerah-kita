import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, ScanLine, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

export default function CameraScanner({ onScan, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const cooldown = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  // Scan loop using jsQR
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data && !cooldown.current) {
      cooldown.current = true;
      const value = code.data.trim().toUpperCase();
      setLastScanned(value);
      onScan(value);
      setTimeout(() => {
        cooldown.current = false;
        setLastScanned(null);
      }, 3000);
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScan]);

  // Start camera
  const startCamera = useCallback(async (facing = facingMode) => {
    setError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.");
      } else if (err.name === "NotFoundError") {
        setError("Kamera tidak ditemukan di perangkat ini.");
      } else {
        setError("Gagal mengakses kamera: " + (err.message || err.name));
      }
    }
  }, [facingMode, stopCamera, scanLoop]);

  // Flip camera
  const flipCamera = useCallback(async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  }, [facingMode, startCamera]);

  // Cleanup on unmount or when inactive
  useEffect(() => {
    if (!active) stopCamera();
    return () => stopCamera();
  }, [active, stopCamera]);

  if (!active) return null;

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="hidden" />

      {!cameraActive ? (
        <div className="bg-secondary/40 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <ScanLine className="w-12 h-12 text-primary opacity-70" />
          <p className="text-sm text-muted-foreground">
            Tekan tombol di bawah untuk membuka kamera dan scan QR Code peserta.
          </p>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive w-full text-left">
              {error}
            </div>
          )}
          <Button type="button" className="w-full" onClick={() => startCamera()}>
            <Camera className="w-4 h-4 mr-2" />
            Buka Kamera
          </Button>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black">
          {/* Video stream */}
          <video
            ref={videoRef}
            className="w-full max-h-72 object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 relative">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-md" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-md" />
              {/* Scanning line animation */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-bounce" style={{ animationDuration: "1.5s" }} />
            </div>
          </div>

          {/* Top controls */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={flipCamera}
              className="bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
              title="Ganti kamera"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={stopCamera}
              className="bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
              title="Tutup kamera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scan result */}
          {lastScanned && (
            <div className="absolute bottom-2 left-2 right-2 bg-accent text-white rounded-lg px-3 py-2 text-sm font-medium text-center">
              ✓ Berhasil scan: {lastScanned}
            </div>
          )}
        </div>
      )}
    </div>
  );
}