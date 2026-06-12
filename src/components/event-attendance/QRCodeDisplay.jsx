import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QRCodeDisplay({ value, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    });
  }, [value, size]);

  return (
    <div className="flex justify-center p-4">
      <canvas id="qr-canvas" ref={canvasRef} width={size} height={size} className="rounded-lg border border-border" />
    </div>
  );
}