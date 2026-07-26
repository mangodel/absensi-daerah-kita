import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

/**
 * Optimized continuous QR/barcode scanner.
 * - Throttled decode loop (~12fps) for stable performance on webcam/tablet/phone
 * - Center-region-first decode, then full-frame fallback
 * - Grayscale + contrast enhancement fallback for blurry/low-light frames
 * - Ref-based dedup so a scan fires exactly once and immediately
 */
export default function ContinuousCameraScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScannedValue, setLastScannedValue] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  // Refs to avoid stale closures inside the rAF loop
  const lastScannedRef = useRef(null);
  const onScanRef = useRef(onScan);
  const scanTimeoutRef = useRef(null);
  const rafRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    try {
      setError(null);
      // Balanced constraints: enough detail for small QR, not so heavy it lags on mobile
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          focusMode: "continuous",
          focusDistance: { ideal: 0.3 },
          exposureMode: "continuous",
        },
        audio: false,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback: drop advanced constraints for devices that reject them
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        lastScannedRef.current = null;
        setLastScannedValue(null);
        setIsScanning(true);
      }
    } catch (err) {
      const msg = err.name === "NotAllowedError"
        ? "Akses kamera ditolak. Izinkan kamera di pengaturan browser."
        : "Kamera tidak tersedia di perangkat ini.";
      setError(msg);
      onError?.(msg);
    } finally {
      setIsStarting(false);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setLastScannedValue(null);
    lastScannedRef.current = null;
  }, []);

  // Optimized continuous scanning loop
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const SCAN_INTERVAL_MS = 80; // ~12fps — enough for instant pickup, light on CPU
    const CENTER_RATIO = 0.65;   // scan center 65% first (where guide box is)

    const tryDecode = (data, width, height) =>
      jsQR(data, width, height, {
        inversionAttempts: "attemptBoth",
      });

    const scan = (now) => {
      rafRef.current = requestAnimationFrame(scan);

      // Throttle: skip if too soon since last decode attempt
      if (now - lastScanTimeRef.current < SCAN_INTERVAL_MS) return;
      lastScanTimeRef.current = now;

      if (video.readyState < video.HAVE_ENOUGH_DATA) return;
      if (!video.videoWidth || !video.videoHeight) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Pass 1: center region (fast path)
      const cw = Math.floor(vw * CENTER_RATIO);
      const ch = Math.floor(vh * CENTER_RATIO);
      const cx = Math.floor((vw - cw) / 2);
      const cy = Math.floor((vh - ch) / 2);

      canvas.width = cw;
      canvas.height = ch;
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);
      let imageData = ctx.getImageData(0, 0, cw, ch);
      let code = tryDecode(imageData.data, cw, ch);

      // Pass 2: full frame (only if center miss)
      if (!code) {
        canvas.width = vw;
        canvas.height = vh;
        ctx.drawImage(video, 0, 0, vw, vh);
        imageData = ctx.getImageData(0, 0, vw, vh);
        code = tryDecode(imageData.data, vw, vh);
      }

      // Pass 3: enhanced contrast on full frame (blurry/low-light)
      if (!code) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          const v = gray > 128 ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = v;
        }
        code = tryDecode(data, vw, vh);
      }

      if (code && code.data && code.data !== lastScannedRef.current) {
        lastScannedRef.current = code.data;
        setLastScannedValue(code.data);
        onScanRef.current?.(code.data);

        // Reset dedup after 2s so the same QR can be scanned again later
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = setTimeout(() => {
          lastScannedRef.current = null;
          setLastScannedValue(null);
        }, 2000);
      }
    };

    rafRef.current = requestAnimationFrame(scan);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isScanning]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [stopCamera]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Button
              onClick={startCamera}
              variant="default"
              className="gap-2"
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {isStarting ? "Memulai..." : "Buka Kamera"}
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Center guide box (65% region) */}
            <div className="absolute inset-[17.5%] border-2 border-primary/80 rounded-xl" />
            <div className="absolute top-[17.5%] left-[17.5%] w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-xl" />
            <div className="absolute top-[17.5%] right-[17.5%] w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-xl" />
            <div className="absolute bottom-[17.5%] left-[17.5%] w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-xl" />
            <div className="absolute bottom-[17.5%] right-[17.5%] w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-xl" />
          </div>
        )}

        {isScanning && lastScannedValue && (
          <div className="absolute top-4 left-4 right-4 bg-accent text-white text-sm px-3 py-2 rounded-lg font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            QR Terdeteksi — terekam
          </div>
        )}
      </div>

      {isScanning && (
        <Button
          onClick={stopCamera}
          variant="outline"
          className="w-full"
        >
          Tutup Kamera
        </Button>
      )}
    </div>
  );
}