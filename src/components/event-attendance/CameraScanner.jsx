import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";

// Decode QR from an image element using jsQR
async function decodeQRFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) resolve(code.data.trim().toUpperCase());
        else reject(new Error("QR Code tidak ditemukan dalam gambar."));
      };
      img.onerror = () => reject(new Error("Gagal memuat gambar."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

export default function CameraScanner({ onScan, active }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const inputRef = useRef(null);
  const cooldown = useRef(false);

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
      // Reset input so same file can be captured again
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!active) return null;

  return (
    <div className="space-y-3">
      {/* Hidden file input for camera capture */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <div className="bg-secondary/40 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
        <Camera className="w-12 h-12 text-primary opacity-70" />
        <p className="text-sm text-muted-foreground">
          Tekan tombol di bawah, arahkan kamera ke QR Code peserta, lalu foto.
        </p>

        {lastScanned && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 text-sm text-accent font-medium">
            ✓ Scanned: {lastScanned}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive max-w-xs">
            {error}
          </div>
        )}
      </div>

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
          <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> Memproses...</>
        ) : (
          <><Camera className="w-4 h-4 mr-2" /> Buka Kamera / Scan QR</>
        )}
      </Button>
    </div>
  );
}