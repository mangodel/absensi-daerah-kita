import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Simple QR code renderer using qrcode canvas approach via a CDN-free method
// We'll use the browser's canvas + a pure JS QR lib approach via dynamic import

export default function EventQRCode({ event, open, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!open || !event || !canvasRef.current) return;

    // Use QRCode library dynamically
    import("https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js").catch(() => {});

    const renderQR = async () => {
      try {
        // Use QRCode from window if available, otherwise use a simple URL approach
        const QRCode = window.QRCode;
        if (QRCode) {
          await QRCode.toCanvas(canvasRef.current, `EVENT:${event.id}`, {
            width: 280,
            margin: 2,
            color: { dark: "#1e293b", light: "#ffffff" }
          });
        }
      } catch (e) {
        console.error("QR render error", e);
      }
    };

    // Load QRCode library
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
    script.onload = renderQR;
    // If already loaded
    if (window.QRCode) {
      renderQR();
    } else {
      document.head.appendChild(script);
    }
  }, [open, event]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr-event-${event?.event_name?.replace(/\s+/g, "-") || "event"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <QrCode className="w-4 h-4 text-primary" />
            QR Absensi Event
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-inner">
            <canvas ref={canvasRef} width={280} height={280} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">{event.event_name}</p>
            {event.event_date && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(event.event_date), "dd MMMM yyyy", { locale: id })}
              </p>
            )}
            {event.venue && (
              <p className="text-xs text-muted-foreground">{event.venue}</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center px-2">
            Jamaah scan QR ini melalui Portal Jamaah untuk otomatis mengisi daftar hadir
          </p>
          <Button size="sm" variant="outline" onClick={handleDownload} className="w-full gap-2">
            <Download className="w-3.5 h-3.5" /> Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}