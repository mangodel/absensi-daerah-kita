import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Status options ───────────────────────────────────────────────
const MAIN_OPTIONS = [
  { value: "Hadir",  label: "Hadir",           color: "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20" },
  { value: "Alpa",   label: "Tidak Hadir",      color: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" },
  { value: "Telat",  label: "Telat",            color: "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100" },
  { value: "Izin",   label: "Izin",             color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" },
];

const TELAT_OPTIONS = [
  { value: "Telat 5 menit",          label: "≤ 5 menit" },
  { value: "Telat 10 menit",         label: "≤ 10 menit" },
  { value: "Telat lebih dari 10 menit", label: "> 10 menit" },
];

const IZIN_OPTIONS = [
  { value: "Izin Sekolah",  label: "Sekolah" },
  { value: "Izin Kerja",    label: "Kerja" },
  { value: "Izin Lainnya",  label: "Alasan Lainnya" },
];

const statusColors = {
  "Hadir":                      "bg-accent/10 text-accent border-accent/20",
  "Alpa":                       "bg-destructive/10 text-destructive border-destructive/20",
  "Telat 5 menit":              "bg-amber-50 text-amber-700 border-amber-300",
  "Telat 10 menit":             "bg-amber-50 text-amber-700 border-amber-300",
  "Telat lebih dari 10 menit":  "bg-amber-100 text-amber-800 border-amber-400",
  "Izin Sekolah":               "bg-blue-50 text-blue-600 border-blue-200",
  "Izin Kerja":                 "bg-orange-50 text-orange-600 border-orange-200",
  "Izin Lainnya":               "bg-purple-50 text-purple-600 border-purple-200",
};

// ─── Sub-option button strip ───────────────────────────────────────
function SubOptions({ options, selected, onSelect, activeColor }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={cn(
            "text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all active:scale-95",
            selected === opt.value
              ? activeColor
              : "bg-card border-border text-muted-foreground hover:border-primary/40"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Single member row ─────────────────────────────────────────────
function MemberRow({ member, idx, onStatusChange }) {
  const [phase, setPhase] = useState("idle"); // idle | telat_sub | izin_sub | done
  const [savedStatus, setSavedStatus] = useState(null);
  const [telatChoice, setTelatChoice] = useState("");
  const [izinChoice, setIzinChoice] = useState("");
  const [izinNote, setIzinNote] = useState("");

  const currentYear = new Date().getFullYear();
  const age = member.birth_year ? currentYear - member.birth_year : null;
  const isDewasa = age === null || age >= 18;

  const commit = (status) => {
    setSavedStatus(status);
    onStatusChange(member.id, status);
    setPhase("done");
  };

  const handleMain = (val) => {
    if (val === "Hadir" || val === "Alpa") { commit(val); }
    else if (val === "Telat") { setTelatChoice(""); setPhase("telat_sub"); }
    else if (val === "Izin")  { setIzinChoice(""); setIzinNote(""); setPhase("izin_sub"); }
  };

  const handleTelatSelect = (val) => {
    setTelatChoice(val);
    commit(val);
  };

  const handleIzinSelect = (val) => {
    setIzinChoice(val);
    if (val !== "Izin Lainnya") commit(val);
  };

  const handleIzinNoteSave = () => {
    const status = izinNote.trim() ? `Izin: ${izinNote.trim()}` : "Izin Lainnya";
    commit(status);
  };

  const handleReset = () => {
    setPhase("idle");
    setSavedStatus(null);
    setTelatChoice("");
    setIzinChoice("");
    setIzinNote("");
    onStatusChange(member.id, null);
  };

  // ── Done state (compact) ──
  if (phase === "done") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-secondary/10">
        <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{member.full_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{member.kelompok}{member.desa ? ` · ${member.desa}` : ""}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px] shrink-0 gap-1", statusColors[savedStatus] || "bg-secondary text-muted-foreground")}>
          <CheckCircle className="w-2.5 h-2.5" />
          <span className="max-w-[120px] truncate">{savedStatus}</span>
        </Badge>
        <button type="button" onClick={handleReset} className="text-[10px] text-muted-foreground hover:text-destructive underline shrink-0 ml-1">ubah</button>
      </div>
    );
  }

  return (
    <div className={cn("px-3 py-3 border-b border-border space-y-2", phase !== "idle" ? "bg-primary/5" : "hover:bg-secondary/20")}>
      {/* Name row + main buttons */}
      <div className="flex items-start gap-2">
        <span className="w-5 text-xs text-muted-foreground text-right shrink-0 pt-1">{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium">{member.full_name}</p>
            {!isDewasa && age !== null && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 text-purple-600 border-purple-200 shrink-0">Generus</Badge>
            )}
            {member.gender && (
              <Badge variant="outline" className={cn("text-[9px] px-1 py-0 shrink-0", member.gender === "Laki-laki" ? "bg-sky-50 text-sky-600 border-sky-200" : "bg-pink-50 text-pink-600 border-pink-200")}>
                {member.gender === "Laki-laki" ? "L" : "P"}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{member.kelompok}{member.desa ? ` · ${member.desa}` : ""}</p>
        </div>

        {/* Main buttons — only show when idle */}
        {phase === "idle" && (
          <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[200px] sm:max-w-none">
            {MAIN_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleMain(opt.value)}
                className={cn("text-xs px-2 py-1.5 rounded-lg border font-medium transition-all active:scale-95 whitespace-nowrap", opt.color)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Telat sub-options */}
      {phase === "telat_sub" && (
        <div className="ml-7 space-y-2">
          <p className="text-xs text-amber-700 font-medium">Berapa lama telatnya?</p>
          <SubOptions options={TELAT_OPTIONS} selected={telatChoice} onSelect={handleTelatSelect} activeColor="bg-amber-100 text-amber-800 border-amber-400" />
          <button type="button" onClick={() => setPhase("idle")} className="text-[10px] text-muted-foreground hover:text-foreground underline">← batal</button>
        </div>
      )}

      {/* Izin sub-options */}
      {phase === "izin_sub" && (
        <div className="ml-7 space-y-2">
          <p className="text-xs text-blue-600 font-medium">Jenis izin:</p>
          <SubOptions options={IZIN_OPTIONS} selected={izinChoice} onSelect={handleIzinSelect} activeColor="bg-blue-100 text-blue-700 border-blue-300" />
          {izinChoice === "Izin Lainnya" && (
            <div className="flex gap-2 mt-1">
              <Input
                value={izinNote}
                onChange={e => setIzinNote(e.target.value)}
                placeholder="Tulis alasan izin..."
                className="h-8 text-sm flex-1"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleIzinNoteSave()}
              />
              <Button type="button" size="sm" className="h-8 px-3" onClick={handleIzinNoteSave}>Simpan</Button>
            </div>
          )}
          <button type="button" onClick={() => setPhase("idle")} className="text-[10px] text-muted-foreground hover:text-foreground underline">← batal</button>
        </div>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────
export default function AttendanceTable({ members, attendanceData, onStatusChange }) {
  const currentYear = new Date().getFullYear();

  if (members.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Pilih desa/kelompok untuk menampilkan anggota.</p>
      </div>
    );
  }

  // Sort: Laki-laki dewasa → Perempuan dewasa → Laki-laki generus → Perempuan generus
  const sorted = [...members].sort((a, b) => {
    const ageA = a.birth_year ? currentYear - a.birth_year : 999;
    const ageB = b.birth_year ? currentYear - b.birth_year : 999;
    const isDewasaA = ageA >= 18;
    const isDewasaB = ageB >= 18;
    const gA = a.gender === "Laki-laki" ? 0 : 1;
    const gB = b.gender === "Laki-laki" ? 0 : 1;
    if (isDewasaA && !isDewasaB) return -1;
    if (!isDewasaA && isDewasaB) return 1;
    return gA - gB;
  });

  const filled = Object.values(attendanceData).filter(Boolean).length;
  const total = members.length;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{total} jamaah</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-accent">{filled}</span> sudah diisi
        </p>
      </div>
      <div className="divide-y divide-border/50">
        {sorted.map((member, idx) => (
          <MemberRow key={member.id} member={member} idx={idx} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}