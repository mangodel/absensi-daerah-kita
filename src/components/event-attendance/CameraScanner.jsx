import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CameraScanner({ onScan, active }) {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const divId = "qr-camera-reader";

  useEffect(() => {
    if (!active) {
      stopScanner();
    }
    return () => stopScanner();
  }, [active]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setStarted(false);
  };

  const startScanner = async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText.trim().toUpperCase());
        },
        () => {}
      );
      setStarted(true);
    } catch (err) {
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
      scannerRef.current = null;
    }
  };

  return (
    <div className="space-y-3">
      <div id={divId} className={started ? "rounded-xl overflow-hidden border border-border" : "hidden"} />
      {!started && (
        <div className="bg-secondary/40 rounded-xl p-8 flex flex-col items-center gap-3">
          <Camera className="w-10 h-10 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground text-center">Kamera belum aktif. Klik tombol di bawah untuk mulai scan.</p>
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
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
    </div>
  );
}