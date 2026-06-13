import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import ContinuousCameraScanner from "@/components/shared/ContinuousCameraScanner";

const LEVEL_COLORS = {
  Daerah: "bg-indigo-100 text-indigo-700 border-indigo-300",
  Desa: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Kelompok: "bg-amber-100 text-amber-700 border-amber-300",
};

export default function EventQRScanner({ member }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all events
  const { data: allEvents = [] } = useQuery({
    queryKey: ["events-qr-scan"],
    queryFn: () => base44.entities.Event.list("-date"),
  });

  // Fetch member's attendances
  const { data: myAttendances = [] } = useQuery({
    queryKey: ["my-attendances", member?.id],
    queryFn: () => base44.entities.Attendance.filter({ member_id: member.id }),
    enabled: !!member,
  });

  // Checkin mutation
  const checkinMutation = useMutation({
    mutationFn: async (event) => {
      if (!member) throw new Error("Data anggota tidak ditemukan");

      const today = new Date().toISOString().slice(0, 10);
      const alreadyIn = myAttendances.find(a => a.event_id === event.id && a.date === today);
      if (alreadyIn) throw new Error("Anda sudah mengisi absensi untuk event ini hari ini");

      return base44.entities.Attendance.create({
        member_id: member.id,
        member_name: member.full_name,
        desa: member.desa,
        kelompok: member.kelompok,
        date: event.date || today,
        status: "Hadir",
        month: new Date(event.date || today).getMonth() + 1,
        year: new Date(event.date || today).getFullYear(),
        event_id: event.id,
        event_name: event.name,
        event_level: event.level || "Daerah",
      });
    },
    onSuccess: (_, event) => {
      queryClient.invalidateQueries({ queryKey: ["my-attendances"] });
      toast.success(`✓ Hadir: ${event.name}`);
      setIsOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mencatat absensi");
    },
  });

  const handleQRDetected = (qrValue) => {
    // QR format: EVENT:eventId
    if (qrValue.startsWith("EVENT:")) {
      const eventId = qrValue.replace("EVENT:", "");
      const event = allEvents.find(e => e.id === eventId);
      if (event) {
        // Auto-record attendance langsung
        checkinMutation.mutate(event);
      } else {
        toast.error("Event tidak ditemukan");
      }
    } else if (qrValue.startsWith("MEMBER:")) {
      // Fallback jika QR adalah member card
      toast.error("Ini QR Member Card, bukan QR Event");
    } else {
      toast.error("QR ini bukan QR Event yang valid");
    }
  };



  return (
    <>
      {/* Trigger Button */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow border-accent/20 hover:border-accent/50"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold">Scan QR Event</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Absensi event dengan QR</p>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-accent" />
              Scan QR Event
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-muted/50 rounded-xl overflow-hidden border border-border">
              <ContinuousCameraScanner 
                onScan={handleQRDetected}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Arahkan kamera ke QR Code event — Absensi akan tercatat otomatis
            </p>
            {checkinMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-accent">
                <Loader2 className="w-4 h-4 animate-spin" />
                Mencatat absensi...
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              className="w-full"
              disabled={checkinMutation.isPending}
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}