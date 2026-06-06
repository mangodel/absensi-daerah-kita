import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PortalAttendanceScanner({ member, user }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanStatus, setScanStatus] = useState(null); // 'success' | 'error' | null
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active-event-sessions"],
    queryFn: () => base44.entities.EventSession.filter({ status: "Active" }),
  });

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        await html5QrRef.current.clear();
      } catch (e) { /* ignore */ }
      html5QrRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setScanResult(null);
    setScanStatus(null);
    setScanning(true);

    await new Promise(r => setTimeout(r, 200));

    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("portal-qr-reader");
    html5QrRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScanner();
          await handleCheckin(decodedText);
        },
        () => {}
      );
    } catch (err) {
      toast.error("Tidak dapat mengakses kamera. Izinkan akses kamera di browser Anda.");
      setScanning(false);
    }
  };

  const handleCheckin = async (qrValue) => {
    setScanResult(qrValue);
    // Cari peserta berdasarkan QR
    try {
      const participants = await base44.entities.EventParticipant.filter({ qr_code_value: qrValue });
      if (participants.length === 0) {
        setScanStatus("error");
        toast.error("QR tidak dikenali. Pastikan Anda sudah terdaftar di event ini.");
        return;
      }
      const participant = participants[0];
      // Buat record checkin
      await base44.entities.EventCheckin.create({
        participant_id: participant.participant_id,
        participant_db_id: participant.id,
        participant_name: participant.full_name,
        event_id: participant.event_id,
        checkin_time: new Date().toISOString(),
        checkin_date: new Date().toISOString().split("T")[0],
        checkin_method: "QR Scan",
        volunteer_name: user?.full_name || "Self Check-in",
        notes: "Self check-in via Portal Jamaah",
      });
      // Update attendance status
      await base44.entities.EventParticipant.update(participant.id, { attendance_status: "Present" });
      setScanStatus("success");
      toast.success(`Absensi berhasil! Selamat datang, ${participant.full_name}`);
    } catch (e) {
      setScanStatus("error");
      toast.error("Terjadi kesalahan saat memproses absensi.");
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="space-y-4">
      {/* Event aktif */}
      {activeSessions.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-accent mb-2">Event Aktif Saat Ini:</p>
            {activeSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.event_name}</span>
                <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">Aktif</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Scanner area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Scan QR untuk Absensi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Result */}
          {scanStatus === "success" && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
              <CheckCircle className="w-6 h-6 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent">Absensi Berhasil!</p>
                <p className="text-xs text-muted-foreground">Data kehadiran Anda telah tercatat.</p>
              </div>
            </div>
          )}
          {scanStatus === "error" && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-6 h-6 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">QR Tidak Valid</p>
                <p className="text-xs text-muted-foreground">Pastikan QR code Anda benar dan event masih aktif.</p>
              </div>
            </div>
          )}

          {/* Camera viewer */}
          {scanning && (
            <div className="rounded-xl overflow-hidden border border-border bg-black">
              <div id="portal-qr-reader" className="w-full" />
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            {!scanning ? (
              <Button onClick={startScanner} className="w-full gap-2">
                <Camera className="w-4 h-4" />
                Buka Kamera & Scan QR
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanner} className="w-full gap-2">
                <XCircle className="w-4 h-4" />
                Hentikan Kamera
              </Button>
            )}
            {scanStatus && (
              <Button
                variant="ghost"
                onClick={() => { setScanResult(null); setScanStatus(null); }}
                className="w-full gap-2 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Scan Ulang
              </Button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Arahkan kamera ke QR Code yang ditampilkan panitia event. <br />
            Bekerja di HP, tablet, maupun laptop dengan webcam.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}