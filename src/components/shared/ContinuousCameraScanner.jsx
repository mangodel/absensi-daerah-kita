import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

export default function ContinuousCameraScanner({ onScan, onError, autoStart = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [detected, setDetected] = useState(false);
  // Use refs for cooldown — avoids stale closures in requestAnimationFrame loop
  const lastScannedRef = useRef(null);
  const cooldownRef = useRef(false);
  const animFrameRef = useRef(null);
  const isScanningRef = useRef(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      // Try high-res first, fall back to lower
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          focusMode: "continuous",
          advanced: [{ torch: false }],
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        isScanningRef.current = true;
        setIsScanning(true);
      }
    } catch (err) {
      const msg = err.name === "NotAllowedError" ? "Akses kamera ditolak" : "Kamera tidak tersedia";
      setError(msg);
      onError?.(msg);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setDetected(false);
  }, []);

  // Stable scan loop — uses only refs, never causes re-render in the hot path
  useEffect(() => {
    if (!isScanning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const scan = () => {
      if (!isScanningRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Pass 1: raw image
        let code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        // Pass 2: high-contrast binarized image (better for printed/TV QR)
        if (!code) {
          const bin = new Uint8ClampedArray(imageData.data.length);
          for (let i = 0; i < imageData.data.length; i += 4) {
            const gray =
              imageData.data[i] * 0.299 +
              imageData.data[i + 1] * 0.587 +
              imageData.data[i + 2] * 0.114;
            const v = gray > 140 ? 255 : 0;
            bin[i] = bin[i + 1] = bin[i + 2] = v;
            bin[i + 3] = 255;
          }
          code = jsQR(bin, canvas.width, canvas.height, {
            inversionAttempts: "attemptBoth",
          });
        }

        if (code?.data && !cooldownRef.current && code.data !== lastScannedRef.current) {
          lastScannedRef.current = code.data;
          cooldownRef.current = true;
          setDetected(true);
          onScan?.(code.data);
          // 3-second hard cooldown — prevents duplicate records on TV display
          setTimeout(() => {
            cooldownRef.current = false;
            lastScannedRef.current = null;
            setDetected(false);
          }, 3000);
        }
      }

      animFrameRef.current = requestAnimationFrame(scan);
    };

    animFrameRef.current = requestAnimationFrame(scan);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isScanning, onScan]);

  useEffect(() => {
    if (autoStart) startCamera();
    return () => stopCamera();
  }, [autoStart]);

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
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Button onClick={startCamera} className="gap-2">
              <Camera className="w-4 h-4" />
              Buka Kamera
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner markers */}
            <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-md" />
            <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-md" />
            <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-md" />
            <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-md" />
          </div>
        )}

        {detected && (
          <div className="absolute top-3 inset-x-3 bg-green-500 text-white text-sm px-3 py-2 rounded-lg font-medium text-center animate-pulse">
            ✓ QR Terdeteksi
          </div>
        )}
      </div>

      {isScanning && (
        <Button onClick={stopCamera} variant="outline" className="w-full">
          Tutup Kamera
        </Button>
      )}
    </div>
  );
}