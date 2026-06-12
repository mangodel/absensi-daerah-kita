import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Users, UserCheck, Clock, Award } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAppConfig } from "@/lib/AppConfigContext";

// Halaman ini dirancang untuk ditampilkan di TV/monitor eksternal
// Buka /event-display?event_id=XXX di tab baru untuk tampilan fullscreen
export default function ExternalDisplay({ eventId, eventName }) {
  const { config } = useAppConfig();
  const [popupData, setPopupData] = useState(null);
  const [recentQueue, setRecentQueue] = useState([]);
  const lastCheckinIdRef = useRef(null);
  const popupTimerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: formConfig } = useQuery({
    queryKey: ["event-form-config", eventId],
    queryFn: () => eventId ? base44.entities.EventFormConfig.filter({ event_id: eventId }).then(r => r[0]) : null,
    enabled: !!eventId,
  });

  const logoUrl = formConfig?.display_logo_url || config.event_logo || config.logo_url || "";
  const bannerBg = formConfig?.display_background_color || config.event_banner_color || "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)";

  const { data: participants = [] } = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => eventId ? base44.entities.EventParticipant.filter({ event_id: eventId }) : [],
    enabled: !!eventId,
    refetchInterval: 3000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-light"],
    queryFn: () => base44.entities.Member.list(),
    staleTime: 60000,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["event-checkins", eventId],
    queryFn: () => eventId ? base44.entities.EventCheckin.filter({ event_id: eventId }, "-checkin_time", 50) : [],
    enabled: !!eventId,
    refetchInterval: 2000,
  });

  const total = participants.length;
  const present = participants.filter(p => p.attendance_status === "Present").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const recent = checkins.slice(0, 10);

  // Detect new check-in and show popup
  useEffect(() => {
    if (checkins.length === 0) return;
    const newest = checkins[0];
    if (newest.id === lastCheckinIdRef.current) return;

    lastCheckinIdRef.current = newest.id;

    // Try to find desa & kelompok from members
    let desa = newest.desa || "";
    let kelompok = newest.kelompok || "";
    let family_group = "";

    if (!desa || !kelompok) {
      // Try to match via participant_db_id -> participant -> member
      const participant = participants.find(p => p.id === newest.participant_db_id);
      if (participant) {
        // Try to match participant with member by name
        const member = members.find(m => m.full_name?.toLowerCase() === participant.full_name?.toLowerCase());
        if (member) {
          desa = member.desa || "";
          kelompok = member.kelompok || "";
          family_group = member.family_group || "";
        }
      }
      if (!desa) {
        // Fallback: search members by name directly
        const member = members.find(m => m.full_name?.toLowerCase() === newest.participant_name?.toLowerCase());
        if (member) {
          desa = member.desa || "";
          kelompok = member.kelompok || "";
          family_group = member.family_group || "";
        }
      }
    }

    // Add to queue
    const newItem = {
      id: newest.id,
      name: newest.participant_name,
      participant_id: newest.participant_id,
      desa,
      kelompok,
      family_group,
      time: newest.checkin_time,
    };

    setRecentQueue(q => [newItem, ...q.slice(0, 9)]);

    // Show popup
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setPopupData(newItem);
    popupTimerRef.current = setTimeout(() => setPopupData(null), 5000);
  }, [checkins, participants, members]);

  if (!eventId) return (
    <div className="bg-slate-950 min-h-screen flex items-center justify-center text-white">
      <p className="text-2xl opacity-50">Pilih event aktif terlebih dahulu</p>
    </div>
  );

  return (
    <div
      className="min-h-screen text-white flex flex-col overflow-hidden"
      style={{ background: bannerBg || "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-xl bg-white/10 p-1" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{eventName || "Event"}</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {format(currentTime, "EEEE, dd MMMM yyyy", { locale: id })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <Clock className="w-5 h-5 text-slate-400" />
          <span className="text-3xl font-mono font-bold tabular-nums">
            {format(currentTime, "HH:mm:ss")}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-6 p-8">

        {/* Left: Stats */}
        <div className="col-span-1 flex flex-col gap-5">
          {/* Big percentage */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
            <div className="relative inline-flex items-center justify-center mb-3">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" strokeWidth="10" stroke="rgba(255,255,255,0.1)" fill="none" />
                <circle
                  cx="60" cy="60" r="50"
                  strokeWidth="10"
                  stroke={pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#6366f1"}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-4xl font-bold">{pct}%</p>
                <p className="text-xs text-slate-400">Hadir</p>
              </div>
            </div>
            <p className="text-slate-300 font-semibold">Tingkat Kehadiran</p>
          </div>

          {/* Stat cards */}
          <div className="bg-indigo-900/40 border border-indigo-700/40 rounded-2xl p-5">
            <Users className="w-6 h-6 text-indigo-400 mb-2" />
            <p className="text-5xl font-bold">{total}</p>
            <p className="text-slate-400 text-sm mt-1">Total Terdaftar</p>
          </div>

          <div className="bg-emerald-900/40 border border-emerald-700/40 rounded-2xl p-5">
            <UserCheck className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-5xl font-bold text-emerald-400">{present}</p>
            <p className="text-slate-400 text-sm mt-1">Sudah Hadir</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-5">
            <Award className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-5xl font-bold text-slate-400">{total - present}</p>
            <p className="text-slate-400 text-sm mt-1">Belum Hadir</p>
          </div>
        </div>

        {/* Right: Recent Check-ins */}
        <div className="col-span-2 flex flex-col gap-5">
          {/* Progress bar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Progress Kehadiran</span>
              <span>{present} / {total} peserta</span>
            </div>
            <div className="bg-white/10 rounded-full h-5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: pct >= 80
                    ? "linear-gradient(90deg, #059669, #10b981)"
                    : pct >= 50
                    ? "linear-gradient(90deg, #d97706, #f59e0b)"
                    : "linear-gradient(90deg, #4f46e5, #6366f1)"
                }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Recent check-ins list */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 overflow-hidden flex flex-col">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Check-in Terbaru
            </h2>
            <div className="flex-1 overflow-hidden space-y-2">
              <AnimatePresence initial={false}>
                {recent.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35 }}
                    className={`flex items-center gap-4 p-3 rounded-xl ${i === 0
                      ? "bg-emerald-900/50 border border-emerald-600/40"
                      : "bg-white/5 border border-white/5"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${i === 0 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"}`}>
                      {i === 0 ? <CheckCircle className="w-5 h-5" /> : (i + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-base truncate ${i === 0 ? "text-emerald-300" : "text-white"}`}>
                        {c.participant_name}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {c.desa ? `${c.desa} · ` : ""}{c.kelompok || c.scanner_station || ""}
                      </p>
                    </div>
                    <span className="text-slate-400 text-sm shrink-0 font-mono">
                      {c.checkin_time ? format(new Date(c.checkin_time), "HH:mm") : ""}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {recent.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-center text-slate-600 py-8 text-lg">Menunggu check-in pertama...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Popup Overlay */}
      <AnimatePresence>
        {popupData && (
          <motion.div
            key="checkin-popup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          >
            <motion.div
              initial={{ scale: 0.7, y: 60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="relative max-w-lg w-full mx-6"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-2xl scale-110" />
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/50 rounded-3xl p-10 text-center shadow-2xl">
                {/* Success icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 15 }}
                  className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>

                <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">
                  {formConfig?.success_message ? "✓ " + formConfig.success_message : "✓ Check-in Berhasil"}
                </p>
                <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                  {popupData.name}
                </h2>
                {formConfig?.success_subtext && (
                  <p className="text-slate-300 text-sm mb-4">{formConfig.success_subtext}</p>
                )}

                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {popupData.desa && (
                    <span className="px-4 py-1.5 bg-indigo-900/60 border border-indigo-500/40 rounded-full text-indigo-300 text-sm font-medium">
                      📍 {popupData.desa}
                    </span>
                  )}
                  {popupData.kelompok && (
                    <span className="px-4 py-1.5 bg-slate-700/60 border border-slate-500/40 rounded-full text-slate-300 text-sm font-medium">
                      👥 {popupData.kelompok}
                    </span>
                  )}
                  {popupData.family_group && (
                    <span className="px-4 py-1.5 bg-amber-900/60 border border-amber-500/40 rounded-full text-amber-300 text-sm font-medium">
                      🏠 {popupData.family_group}
                    </span>
                  )}
                </div>

                <p className="text-slate-500 text-xs mt-5">
                  {popupData.participant_id} · {popupData.time ? format(new Date(popupData.time), "HH:mm:ss") : ""}
                </p>

                {/* Progress dots (5 detik) */}
                <div className="mt-5 flex justify-center gap-1.5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      className="h-1.5 rounded-full bg-emerald-500/40"
                      initial={{ width: 24 }}
                      animate={{ width: 6, opacity: 0.2 }}
                      transition={{ delay: i * 1, duration: 0.4 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}