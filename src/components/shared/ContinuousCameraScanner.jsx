import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

export default function ContinuousCameraScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScannedValue, setLastScannedValue] = useState(null);
  const scanTimeoutRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          focusMode: 'continuous',
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch(() => {});
        setIsScanning(true);
      }
    } catch (err) {
      const msg = err.name === "NotAllowedError" ? "Camera akses ditolak" : "Kamera tidak tersedia";
      setError(msg);
      onError?.(msg);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
    setLastScannedValue(null);
  }, []);

  // Continuous scanning loop
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Try multiple regions for better QR detection
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let code = jsQR(imageData.data, imageData.width, imageData.height);

        // If not found in center, try the entire frame with adjusted sensitivity
        if (!code && imageData.data.length > 0) {
          // Enhance contrast for better detection
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const enhanced = gray > 128 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = enhanced;
          }
          code = jsQR(data, imageData.width, imageData.height);
        }

        if (code && code.data !== lastScannedValue) {
          setLastScannedValue(code.data);
          onScan?.(code.data);

          // Prevent duplicate scans for 1.5 seconds
          if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = setTimeout(() => setLastScannedValue(null), 1500);
        }
      }
      requestAnimationFrame(scan);
    };

    const frameId = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(frameId);
  }, [isScanning, lastScannedValue, onScan]);

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
            >
              <Camera className="w-4 h-4" />
              Buka Kamera
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 border-2 border-primary pointer-events-none">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary" />
          </div>
        )}

        {isScanning && lastScannedValue && (
          <div className="absolute top-4 left-4 right-4 bg-green-500 text-white text-sm px-3 py-2 rounded-lg font-medium">
            ✓ QR Terdeteksi
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