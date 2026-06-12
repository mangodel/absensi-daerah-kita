/**
 * QRPhotoScanner — Universal photo-based QR scanner
 * Works reliably on all devices including iPad Safari.
 * Uses a fresh <input> element on each tap to avoid Safari caching issues.
 * No live video stream — user takes photo or picks from gallery.
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import jsQR from "jsqr";

function decodeQRFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const result = jsQR(imgData.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
      resolve(result?.data || null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gagal membaca gambar")); };
    img.src = url;
  });
}

/**
 * Props:
 *   onScan(value: string) — called when QR decoded successfully
 *   processing?: boolean — show spinner state
 *   disabled?: boolean
 *   label?: string — button label
 */
export default function QRPhotoScanner({ onScan, processing = false, disabled = false, label = "Foto QR dengan Kamera" }) {
  const [status, setStatus] = useState(null); // null | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerCamera = useCallback(() => {
    setStatus(null);
    setErrorMsg("");

    // Create a completely fresh input element each time to avoid Safari caching
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Direct property assignment for maximum compatibility

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      try {
        const value = await decodeQRFromFile(file);
        if (value) {
          setStatus("success");
          onScan(value);
          setTimeout(() => setStatus(null), 2000);
        } else {
          setStatus("error");
          setErrorMsg("QR Code tidak terdeteksi. Pastikan gambar jelas, pencahayaan cukup, dan QR terlihat penuh.");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Gagal memproses foto. Coba lagi.");
      } finally {
        setIsProcessing(false);
        input.remove();
      }
    };

    // Append and trigger click immediately
    document.body.appendChild(input);
    input.click();
  }, [onScan]);

  const busy = isProcessing || processing;

  return (
    <div className="space-y-3">
      {status === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/30">
          <CheckCircle className="w-5 h-5 text-accent shrink-0" />
          <p className="text-sm font-medium text-accent">QR terdeteksi!</p>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">{errorMsg}</p>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full gap-2"
        onClick={triggerCamera}
        disabled={disabled || busy}
      >
        {busy ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <Camera className="w-5 h-5" />
        )}
        {busy ? "Memproses..." : label}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        📷 Tekan tombol → arahkan kamera ke QR code → ambil foto.
      </p>
    </div>
  );
}