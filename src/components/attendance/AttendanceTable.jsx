import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "Hadir", label: "Hadir", color: "bg-accent/10 text-accent border-accent/20" },
  { value: "Alpa", label: "Tidak Hadir / Alpa", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { value: "Izin", label: "Izin...", color: "bg-blue-50 text-blue-600 border-blue-200" },
];

const IZIN_OPTIONS = [
  { value: "Izin Sekolah", label: "Izin Sekolah" },
  { value: "Izin Kerja", label: "Izin Kerja" },
  { value: "Izin Telat", label: "Telat (tulis alasan)" },
];

const statusColors = {
  "Hadir": "bg-accent/10 text-accent border-accent/20",
  "Alpa": "bg-destructive/10 text-destructive border-destructive/20",
  "Izin Sekolah": "bg-blue-50 text-blue-600 border-blue-200",
  "Izin Kerja": "bg-orange-50 text-orange-600 border-orange-200",
  "Izin Telat": "bg-amber-50 text-amber-600 border-amber-200",
};

function MemberRow({ member, idx, onStatusChange }) {
  const [phase, setPhase] = useState("idle"); // "idle" | "picking" | "izin_sub" | "done"
  const [savedStatus, setSavedStatus] = useState(null);
  const [izinType, setIzinType] = useState("");
  const [telatReason, setTelatReason] = useState("");

  const handleMainChoice = (val) => {
    if (val === "Hadir" || val === "Alpa") {
      setSavedStatus(val);
      onStatusChange(member.id, val);
      setPhase("done");
    } else if (val === "Izin") {
      setPhase("izin_sub");
    }
  };

  const handleIzinChoice = (val) => {
    setIzinType(val);
    if (val !== "Izin Telat") {
      setSavedStatus(val);
      onStatusChange(member.id, val);
      setPhase("done");
    }
  };

  const handleTelatSave = () => {
    const finalStatus = telatReason.trim() ? `Izin Telat: ${telatReason.trim()}` : "Izin Telat";
    setSavedStatus(finalStatus);
    onStatusChange(member.id, "Izin Telat");
    setPhase("done");
  };

  const handleReset = () => {
    setPhase("idle");
    setSavedStatus(null);
    setIzinType("");
    setTelatReason("");
    onStatusChange(member.id, null);
  };

  // Resolve age category
  const currentYear = new Date().getFullYear();
  const age = member.birth_year ? currentYear - member.birth_year : null;
  const isDewasa = age === null || age >= 18;

  if (phase === "done") {
    // Dissolve after save — show compact badge row
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-secondary/10 animate-fade-in">
        <span className="w-6 text-xs text-muted-foreground text-right shrink-0">{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{member.full_name}</p>
          <p className="text-xs text-muted-foreground">{member.kelompok}</p>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[izinType || savedStatus] || "bg-secondary text-muted-foreground"}`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          {savedStatus}
        </Badge>
        <button onClick={handleReset} className="text-[10px] text-muted-foreground hover:text-destructive underline shrink-0">ubah</button>
      </div>
    );
  }

  return (
    <div className={cn(
      "px-4 py-3 border-b border-border space-y-2",
      phase !== "idle" ? "bg-primary/5" : "hover:bg-secondary/20"
    )}>
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="w-6 text-xs text-muted-foreground text-right shrink-0">{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{member.full_name}</p>
            {!isDewasa && age !== null && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 text-purple-600 border-purple-200 shrink-0">Generus</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{member.kelompok}{member.desa ? ` · ${member.desa}` : ""}</p>
        </div>

        {/* Main status picker */}
        {phase === "idle" && (
          <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleMainChoice(opt.value)}
                className={cn(
                  "text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all",
                  opt.color,
                  "hover:opacity-80 active:scale-95"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-choice for Izin */}
      {phase === "izin_sub" && (
        <div className="ml-9 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Pilih jenis izin:</p>
          <div className="flex flex-wrap gap-2">
            {IZIN_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleIzinChoice(opt.value)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                  izinType === opt.value ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-card border-border text-muted-foreground hover:border-blue-300",
                  "active:scale-95"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Telat reason input */}
          {izinType === "Izin Telat" && (
            <div className="flex gap-2 mt-2">
              <Input
                value={telatReason}
                onChange={e => setTelatReason(e.target.value)}
                placeholder="Alasan telat (opsional)..."
                className="h-8 text-sm flex-1"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleTelatSave()}
              />
              <Button size="sm" className="h-8 px-3" onClick={handleTelatSave}>Simpan</Button>
            </div>
          )}

          <button onClick={() => setPhase("idle")} className="text-[10px] text-muted-foreground hover:text-foreground underline">
            ← batal
          </button>
        </div>
      )}
    </div>
  );
}

export default function AttendanceTable({ members, attendanceData, onStatusChange }) {
  const currentYear = new Date().getFullYear();

  if (members.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Pilih desa/kelompok untuk menampilkan anggota.</p>
      </div>
    );
  }

  // Sort: dewasa (22+) first, then generus
  const sorted = [...members].sort((a, b) => {
    const ageA = a.birth_year ? currentYear - a.birth_year : 999;
    const ageB = b.birth_year ? currentYear - b.birth_year : 999;
    const isDewasaA = ageA >= 18;
    const isDewasaB = ageB >= 18;
    if (isDewasaA && !isDewasaB) return -1;
    if (!isDewasaA && isDewasaB) return 1;
    return 0;
  });

  const filled = Object.values(attendanceData).filter(Boolean).length;
  const total = members.length;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{total} anggota</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-accent">{filled}</span> sudah diisi
        </p>
      </div>
      <div className="divide-y divide-border">
        {sorted.map((member, idx) => (
          <MemberRow
            key={member.id}
            member={member}
            idx={idx}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}