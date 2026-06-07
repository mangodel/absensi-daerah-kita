import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIV_ID = "qr-camera-reader";

export default function CameraScanner({ onScan, active }) {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCam, setSelectedCam] = useState(null);
  const scannerRef = useRef(null);
  const lastScanned = useRef("");
  const cooldown = useRef(false);

  // cleanup on unmount or when active turns false
  useEffect(() => {
    if (!active) stopScanner();
    return () => { stopScanner(); };
  }, [active]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const s = scannerRef.current;
        scannerRef.current = null;
        if (await s.getState() === 2 /* SCANNING */) await s.stop();
        s.clear();
      } catch (_) {}
    }
    setStarted(false);
  };

  const startScanner = useCallback(async (cameraId) => {
    setError(null);
    const el = document.getElementById(DIV_ID);
    if (!el) { setError("Elemen kamera tidak ditemukan."); return; }

    if (scannerRef.current) {
      try {
        const s = scannerRef.current;
        scannerRef.current = null;
        if (await s.getState() === 2) await s.stop();
        s.clear();
      } catch (_) {}
    }

    try {
      const scanner = new Html5Qrcode(DIV_ID, { verbose: false });
      scannerRef.current = scanner;

      const camConfig = cameraId ? cameraId : { facingMode: "environment" };

      // Optimize camera config untuk kompatibilitas lebih baik
      const scanConfig = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
        disableFlip: false,
        formatsToSupport: [Html5Qrcode.SupportedFormats.QR_CODE],
      };

      // Tambah timeout untuk device yang lambat
      const scannerPromise = scanner.start(camConfig, scanConfig, (text) => {
        const val = text.trim().toUpperCase();
        if (cooldown.current || val === lastScanned.current) return;
        cooldown.current = true;
        lastScanned.current = val;
        onScan(val);
        setTimeout(() => {
          cooldown.current = false;
          lastScanned.current = "";
        }, 2500);
      }, () => {});

      await Promise.race([
        scannerPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
      ]);

      setStarted(true);
      setError(null);
    } catch (err) {
      scannerRef.current = null;
      const msg = (err?.message || "").toLowerCase();
      
      if (msg.includes("permission") || msg.includes("denied")) {
        setError("Akses kamera ditolak. Buka Settings → izinkan Kamera untuk situs ini, lalu refresh halaman.");
      } else if (msg.includes("notfound") || msg.includes("not found") || msg.includes("no camera")) {
        setError("Kamera tidak ditemukan di perangkat ini.");
      } else if (msg.includes("timeout") || msg.includes("abort")) {
        setError("Waktu tunggu kamera habis. Periksa permission kamera dan refresh halaman.");
      } else {
        setError(`Gagal mengakses kamera: ${msg || "unknown error"}`);
      }
    }
  }, [onScan]);

  const loadCameras = async () => {
    try {
      const list = await Html5Qrcode.getCameras();
      setCameras(list || []);
      return list || [];
    } catch (_) {
      return [];
    }
  };

  const handleStart = async () => {
    const list = await loadCameras();
    // prefer back/environment camera
    const backCam = list.find(c => /back|rear|environment/i.test(c.label));
    const cam = backCam || list[0];
    setSelectedCam(cam?.id || null);
    await startScanner(cam?.id || null);
  };

  const switchCamera = async () => {
    const others = cameras.filter(c => c.id !== selectedCam);
    const next = others[0];
    if (!next) return;
    setSelectedCam(next.id);
    await startScanner(next.id);
  };

  return (
    <div className="space-y-3">
      {/* Camera viewport */}
      <div
        id={DIV_ID}
        className={started ? "rounded-xl overflow-hidden border border-border w-full max-w-sm mx-auto" : "hidden"}
      />

      {!started && (
        <div className="bg-secondary/40 rounded-xl p-8 flex flex-col items-center gap-3">
          <Camera className="w-10 h-10 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground text-center">
            Kamera belum aktif. Izinkan akses kamera saat diminta browser.
          </p>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive text-center max-w-xs">
              {error}
            </div>
          )}
        </div>
      )}

      {started && error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant={started ? "outline" : "default"}
          className="flex-1"
          onClick={started ? stopScanner : handleStart}
        >
          {started ? (
            <><CameraOff className="w-4 h-4 mr-2" /> Stop Kamera</>
          ) : (
            <><Camera className="w-4 h-4 mr-2" /> Aktifkan Kamera</>
          )}
        </Button>
        {started && cameras.length > 1 && (
          <Button type="button" variant="outline" size="icon" onClick={switchCamera} title="Ganti kamera">
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {started && (
        <p className="text-xs text-center text-muted-foreground">
          Arahkan kamera ke QR Code peserta. Setiap scan memiliki jeda 2.5 detik.
        </p>
      )}
    </div>
  );
}