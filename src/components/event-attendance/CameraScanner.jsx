import { useRef, useState, useEffect } from "react";
import { Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

// Decode QR from an image file using BarcodeDetector (if available)
async function decodeQRFromFile(file) {
  if (!("BarcodeDetector" in window)) {
    throw new Error("Browser ini tidak mendukung pemindaian otomatis. Gunakan tab 'Input ID' untuk memasukkan ID secara manual.");
  }
  const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
  const bitmap = await createImageBitmap(file);
  const codes = await detector.detect(bitmap);
  if (!codes || codes.length === 0) {
    throw new Error("QR Code tidak ditemukan. Coba foto ulang dengan lebih jelas dan pencahayaan cukup.");
  }
  return codes[0].rawValue.trim().toUpperCase();
}

export default function CameraScanner({ onScan, active }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [supported, setSupported] = useState(true);
  const inputRef = useRef(null);
  const cooldown = useRef(false);

  useEffect(() => {
    // Check BarcodeDetector support on mount
    setSupported("BarcodeDetector" in window);
  }, []);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const value = await decodeQRFromFile(file);
      if (!cooldown.current) {
        cooldown.current = true;
        setLastScanned(value);
        onScan(value);
        setTimeout(() => {
          cooldown.current = false;
          setLastScanned(null);
        }, 3000);
      }
    } catch (err) {
      setError(err.message || "QR Code tidak terbaca.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!active) return null;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <div className="bg-secondary/40 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
        {supported ? (
          <>
            <ScanLine className="w-12 h-12 text-primary opacity-70" />
            <p className="text-sm text-muted-foreground">
              Tekan tombol di bawah, arahkan kamera ke QR Code peserta, lalu foto.
            </p>
          </>
        ) : (
          <>
            <Camera className="w-12 h-12 text-amber-500 opacity-70" />
            <p className="text-sm text-amber-700 font-medium">
              Scan kamera tidak didukung di browser ini.
            </p>
            <p className="text-xs text-muted-foreground">
              Gunakan tab <strong>Input ID</strong> untuk memasukkan ID peserta secara manual, atau buka di Chrome/Edge.
            </p>
          </>
        )}

        {lastScanned && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-sm text-accent font-medium w-full">
            ✓ Scanned: {lastScanned}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive max-w-xs">
            {error}
          </div>
        )}
      </div>

      {supported && (
        <Button
          type="button"
          className="w-full"
          disabled={loading}
          onClick={() => {
            setError(null);
            inputRef.current?.click();
          }}
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Memproses...</>
          ) : (
            <><Camera className="w-4 h-4 mr-2" />Buka Kamera / Scan QR</>
          )}
        </Button>
      )}
    </div>
  );
}