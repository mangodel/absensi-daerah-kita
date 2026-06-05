import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Users, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Halaman ini dirancang untuk ditampilkan di TV/monitor eksternal
// Buka /event-display?event_id=XXX di tab baru untuk tampilan fullscreen
export default function ExternalDisplay({ eventId, eventName }) {
  const [lastCheckin, setLastCheckin] = useState(null);
  const [showFlash, setShowFlash] = useState(false);

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventId ? base44.entities.EventParticipant.filter({ event_id: eventId }) : [],
    enabled: !!eventId,
    refetchInterval: 3000,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["event-checkins", eventId],
    queryFn: () => eventId ? base44.entities.EventCheckin.filter({ event_id: eventId }, "-checkin_time", 50) : [],
    enabled: !!eventId,
    refetchInterval: 3000,
  });

  const total = participants.length;
  const present = participants.filter(p => p.attendance_status === "Present").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const recent = checkins.slice(0, 8);

  // Flash animation on new checkin
  useEffect(() => {
    if (checkins.length > 0) {
      const newest = checkins[0];
      if (!lastCheckin || newest.id !== lastCheckin.id) {
        setLastCheckin(newest);
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 2500);
      }
    }
  }, [checkins]);

  if (!eventId) return (
    <div className="bg-slate-950 min-h-screen flex items-center justify-center text-white">
      <p className="text-2xl opacity-50">Pilih event aktif terlebih dahulu</p>
    </div>
  );

  return (
    <div className="bg-slate-950 min-h-screen text-white p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{eventName || "Event"}</h1>
          <p className="text-slate-400 text-sm mt-1">{format(new Date(), "EEEE, dd MMMM yyyy · HH:mm", { locale: id })}</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-bold text-emerald-400">{pct}%</p>
          <p className="text-slate-400 text-sm">Tingkat Kehadiran</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-2xl p-5 text-center">
          <Users className="w-7 h-7 text-blue-400 mx-auto mb-2" />
          <p className="text-4xl font-bold">{total}</p>
          <p className="text-slate-400 text-sm mt-1">Terdaftar</p>
        </div>
        <div className="bg-emerald-900/60 rounded-2xl p-5 text-center border border-emerald-700/50">
          <UserCheck className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
          <p className="text-4xl font-bold text-emerald-400">{present}</p>
          <p className="text-slate-400 text-sm mt-1">Hadir</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-5 text-center">
          <div className="w-7 h-7 mx-auto mb-2 flex items-center justify-center">
            <span className="text-slate-400 text-xl">✗</span>
          </div>
          <p className="text-4xl font-bold text-slate-400">{total - present}</p>
          <p className="text-slate-400 text-sm mt-1">Belum Hadir</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-800 rounded-full h-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Flash Check-in Banner */}
      {showFlash && lastCheckin && (
        <div className="fixed inset-x-0 bottom-0 bg-emerald-500 text-white p-6 text-center animate-pulse z-50">
          <div className="flex items-center justify-center gap-4">
            <CheckCircle className="w-10 h-10" />
            <div>
              <p className="text-3xl font-bold">{lastCheckin.participant_name}</p>
              <p className="text-lg opacity-80">✓ Check-in berhasil · {lastCheckin.participant_id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      <div className="flex-1 bg-slate-900 rounded-2xl p-5 overflow-hidden">
        <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-4">Check-in Terbaru</h2>
        <div className="space-y-2">
          {recent.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${i === 0 ? "bg-emerald-900/50 border border-emerald-700/40" : "bg-slate-800/50"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-emerald-500" : "bg-slate-700"}`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-lg truncate ${i === 0 ? "text-emerald-300" : "text-white"}`}>{c.participant_name}</p>
                <p className="text-slate-500 text-xs">{c.participant_id} · {c.scanner_station}</p>
              </div>
              <span className="text-slate-400 text-sm shrink-0">
                {c.checkin_time ? format(new Date(c.checkin_time), "HH:mm:ss") : ""}
              </span>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="text-center text-slate-600 py-8">Menunggu check-in pertama...</p>
          )}
        </div>
      </div>
    </div>
  );
}