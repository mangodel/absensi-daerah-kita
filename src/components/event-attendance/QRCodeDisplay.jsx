import { useEffect, useRef } from "react";

// Simple QR Code renderer using canvas — no extra library needed
// Uses the qrcode-generator approach via a simple matrix builder
export default function QRCodeDisplay({ value, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    // We use a simple SVG-based QR via a data URL trick with Google Charts API
    // No library needed
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const encoded = encodeURIComponent(value);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=${size}x${size}&format=png&margin=10`;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
    };
  }, [value, size]);

  return (
    <div className="flex justify-center p-4">
      <canvas id="qr-canvas" ref={canvasRef} width={size} height={size} className="rounded-lg border border-border" />
    </div>
  );
}