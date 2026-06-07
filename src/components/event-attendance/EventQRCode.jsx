import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function EventQRCode({ event, open, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!open || !event) return;
    QRCode.toDataURL(`EVENT:${event.id}`, {
      width: 260,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    }).then(setQrDataUrl).catch(console.error);
  }, [open, event?.id]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `qr-event-${event?.event_name?.replace(/\s+/g, "-") || "event"}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <QrCode className="w-4 h-4 text-primary" />
            QR Absensi Event
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {qrDataUrl ? (
            <div className="bg-white p-3 rounded-xl border-2 border-primary/20 shadow-inner">
              <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 object-contain" />
            </div>
          ) : (
            <div className="w-56 h-56 flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30">
              <QrCode className="w-10 h-10 text-muted-foreground animate-pulse" />
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-sm">{event.event_name}</p>
            {event.event_date && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(event.event_date), "dd MMMM yyyy", { locale: id })}
              </p>
            )}
            {event.venue && <p className="text-xs text-muted-foreground">{event.venue}</p>}
          </div>
          <p className="text-[11px] text-muted-foreground text-center px-2">
            Jamaah scan QR ini melalui Portal Jamaah untuk otomatis mengisi daftar hadir
          </p>
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={!qrDataUrl} className="w-full gap-2">
            <Download className="w-3.5 h-3.5" /> Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}