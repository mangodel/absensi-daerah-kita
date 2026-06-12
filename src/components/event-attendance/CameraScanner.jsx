import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CameraScanner({ onScan, active }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const detectorRef = useRef(null);
  const cooldownRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) stopScanner();
    return () => stopScanner();
  }, [active]);

  const stopScanner = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStarted(false);
  }, []);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;

    if (!video || !canvas || !detector || video.readyState < 2) {
      animRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    detector.detect(canvas)
      .then(codes => {
        if (codes.length > 0 && !cooldownRef.current) {
          const val = codes[0].rawValue.trim().toUpperCase();
          cooldownRef.current = true;
          onScan(val);
          setTimeout(() => { cooldownRef.current = false; }, 2500);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (streamRef.current) {
          animRef.current = requestAnimationFrame(scanLoop);
        }
      });
  }, [onScan]);

  const startScanner = useCallback(async () => {
    setError(null);

    if (!("BarcodeDetector" in window)) {
      setError("Browser Anda belum mendukung scanner otomatis. Gunakan mode 'Input ID' atau 'Cari Nama' sebagai alternatif.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser tidak mendukung akses kamera. Gunakan HTTPS dan browser terbaru.");
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStarted(true);
      animRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      streamRef.current = null;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Akses kamera ditolak. Buka pengaturan browser → Izin → aktifkan Kamera untuk situs ini, lalu refresh.");
      } else if (err.name === "NotFoundError") {
        setError("Kamera tidak ditemukan di perangkat ini.");
      } else if (err.name === "NotReadableError") {
        setError("Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain lalu coba lagi.");
      } else {
        setError("Gagal mengakses kamera. Pastikan izin kamera sudah diberikan dan gunakan koneksi HTTPS.");
      }
    }
  }, [scanLoop]);

  return (
    <div className="space-y-3">
      {/* Video viewport */}
      <div className={started ? "rounded-xl overflow-hidden border border-border w-full max-w-sm mx-auto" : "hidden"}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full block"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {!started && (
        <div className="bg-secondary/40 rounded-xl p-8 flex flex-col items-center gap-3">
          <Camera className="w-10 h-10 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground text-center">
            Kamera belum aktif. Tekan tombol di bawah dan izinkan akses kamera.
          </p>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive text-center max-w-xs">
              {error}
            </div>
          )}
        </div>
      )}

      <Button
        type="button"
        variant={started ? "outline" : "default"}
        className="w-full"
        onClick={started ? stopScanner : startScanner}
      >
        {started ? (
          <><CameraOff className="w-4 h-4 mr-2" /> Stop Kamera</>
        ) : (
          <><Camera className="w-4 h-4 mr-2" /> Aktifkan Kamera</>
        )}
      </Button>

      {started && (
        <p className="text-xs text-center text-muted-foreground">
          Arahkan kamera ke QR Code peserta. Jeda 2.5 detik antar scan.
        </p>
      )}
    </div>
  );
}