import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIV_ID = "qr-camera-reader";

export default function CameraScanner({ onScan, active }) {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const cooldown = useRef(false);
  const lastVal = useRef("");

  useEffect(() => {
    if (!active) stopScanner();
    return () => { stopScanner(); };
  }, [active]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const s = scannerRef.current;
        scannerRef.current = null;
        const state = s.getState();
        if (state === 2) await s.stop();
        s.clear();
      } catch (_) {}
    }
    setStarted(false);
    setLoading(false);
  };

  const startScanner = useCallback(async () => {
    setError(null);
    setLoading(true);

    // Request camera permission explicitly first (required for iOS Safari)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(t => t.stop()); // just to get permission, stop immediately
    } catch (err) {
      setLoading(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Akses kamera ditolak. Buka Pengaturan → Safari/Browser → Kamera → Izinkan, lalu refresh halaman.");
      } else if (err.name === "NotFoundError") {
        setError("Kamera tidak ditemukan di perangkat ini.");
      } else {
        setError("Tidak dapat mengakses kamera. Pastikan halaman dibuka via HTTPS.");
      }
      return;
    }

    // Small delay for DOM to be ready
    await new Promise(r => setTimeout(r, 200));

    const el = document.getElementById(DIV_ID);
    if (!el) { setLoading(false); setError("Elemen kamera tidak ditemukan."); return; }

    try {
      const scanner = new Html5Qrcode(DIV_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          const val = text.trim().toUpperCase();
          if (cooldown.current || val === lastVal.current) return;
          cooldown.current = true;
          lastVal.current = val;
          onScan(val);
          setTimeout(() => {
            cooldown.current = false;
            lastVal.current = "";
          }, 2500);
        },
        () => {}
      );

      setStarted(true);
      setError(null);
    } catch (err) {
      scannerRef.current = null;
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("permission") || msg.includes("denied")) {
        setError("Akses kamera ditolak. Periksa izin kamera di pengaturan browser.");
      } else if (msg.includes("notfound") || msg.includes("not found")) {
        setError("Kamera tidak ditemukan.");
      } else {
        setError("Gagal memulai kamera. Coba refresh halaman dan izinkan akses kamera.");
      }
    } finally {
      setLoading(false);
    }
  }, [onScan]);

  return (
    <div className="space-y-3">
      {/* Camera viewport - always in DOM so Html5Qrcode can find it */}
      <div
        id={DIV_ID}
        className={started ? "rounded-xl overflow-hidden border border-border w-full max-w-sm mx-auto" : "hidden"}
      />

      {!started && (
        <div className="bg-secondary/40 rounded-xl p-8 flex flex-col items-center gap-3">
          <Camera className="w-10 h-10 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground text-center">
            Tekan tombol di bawah, lalu izinkan akses kamera saat diminta.
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
        disabled={loading}
        onClick={started ? stopScanner : startScanner}
      >
        {loading ? (
          <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> Membuka Kamera...</>
        ) : started ? (
          <><CameraOff className="w-4 h-4 mr-2" /> Stop Kamera</>
        ) : (
          <><Camera className="w-4 h-4 mr-2" /> Aktifkan Kamera</>
        )}
      </Button>

      {started && (
        <p className="text-xs text-center text-muted-foreground">
          Arahkan kamera ke QR Code peserta.
        </p>
      )}
    </div>
  );
}