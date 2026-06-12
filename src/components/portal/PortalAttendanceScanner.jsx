import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import QRPhotoScanner from "@/components/shared/QRPhotoScanner";

export default function PortalAttendanceScanner({ member, user, volunteerLevel }) {
  const cooldown = { current: false };

  const [scanStatus, setScanStatus] = useState(null); // null | "success" | "error"
  const [scanResultName, setScanResultName] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["active-event-sessions"],
    queryFn: () => base44.entities.EventSession.filter({ status: "Active" }),
  });

  const handleCheckin = useCallback(async (qrValue) => {
    if (cooldown.current || processing) return;
    cooldown.current = true;
    setProcessing(true);
    const clean = qrValue.trim().toUpperCase();
    try {
      const participants = await base44.entities.EventParticipant.filter({ qr_code_value: clean });
      if (participants.length === 0) {
        setScanStatus("error");
        setProcessing(false);
        toast.error("QR tidak dikenali.");
        setTimeout(() => { cooldown.current = false; }, 3000);
        return;
      }
      const participant = participants[0];
      await base44.entities.EventCheckin.create({
        participant_id: participant.participant_id,
        participant_db_id: participant.id,
        participant_name: participant.full_name,
        event_id: participant.event_id,
        checkin_time: new Date().toISOString(),
        checkin_date: new Date().toISOString().split("T")[0],
        checkin_method: "QR Scan",
        volunteer_name: user?.full_name || "Portal Check-in",
        notes: "Check-in via Portal Jamaah",
      });
      await base44.entities.EventParticipant.update(participant.id, { attendance_status: "Present" });
      setScanResultName(participant.full_name);
      setScanStatus("success");
      setProcessing(false);
      toast.success(`Absensi berhasil! Selamat datang, ${participant.full_name}`);
    } catch {
      setScanStatus("error");
      setProcessing(false);
      toast.error("Terjadi kesalahan saat memproses absensi.");
      setTimeout(() => { cooldown.current = false; setScanStatus(null); }, 3000);
    }
  }, [user, processing]);

  const resetScan = () => {
    setScanStatus(null);
    setScanResultName("");
    cooldown.current = false;
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {activeSessions.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-accent mb-2">Event Aktif:</p>
            {activeSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.event_name}</span>
                <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">Aktif</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Scan QR untuk Absensi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanStatus === "success" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
              <CheckCircle className="w-8 h-8 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent">Absensi Berhasil!</p>
                {scanResultName && <p className="text-xs text-muted-foreground">Selamat datang, {scanResultName}</p>}
              </div>
            </div>
          )}
          {scanStatus === "error" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-8 h-8 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">QR Tidak Valid</p>
                <p className="text-xs text-muted-foreground">Pastikan QR code benar dan event masih aktif.</p>
              </div>
            </div>
          )}

          {scanStatus !== "success" && (
            <QRPhotoScanner onScan={handleCheckin} processing={processing} />
          )}

          {(scanStatus || processing) && (
            <Button variant="ghost" onClick={resetScan} className="w-full gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Scan Ulang
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}