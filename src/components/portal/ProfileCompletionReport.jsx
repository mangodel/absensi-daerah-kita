import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const FIELD_CHECKS = [
  { key: "full_name", label: "Nama Lengkap", required: true },
  { key: "gender", label: "Jenis Kelamin", required: true },
  { key: "marital_status", label: "Status Pernikahan" },
  { key: "birth_year", label: "Tahun Lahir" },
  { key: "birthplace", label: "Tempat Kelahiran" },
  { key: "visa_status", label: "Status Visa" },
  { key: "employment", label: "Pekerjaan" },
  { key: "phone", label: "Nomor Telepon" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "address", label: "Alamat" },
  { key: "suburb", label: "Suburb/Kota" },
  { key: "state", label: "State" },
  { key: "emergency_contact", label: "Kontak Darurat (Nama)" },
  { key: "emergency_phone", label: "Kontak Darurat (Telepon)" },
];

export default function ProfileCompletionReport({ member, onEditClick }) {
  const [expanded, setExpanded] = useState(false);

  if (!member) return null;

  const missing = FIELD_CHECKS.filter(f => !member[f.key]);
  const filled = FIELD_CHECKS.filter(f => !!member[f.key]);
  const pct = Math.round((filled.length / FIELD_CHECKS.length) * 100);

  const isComplete = missing.length === 0;
  const requiredMissing = missing.filter(f => f.required);

  return (
    <div className={`rounded-xl border p-4 ${isComplete ? "border-accent/30 bg-accent/5" : "border-amber-200 bg-amber-50"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isComplete
            ? <CheckCircle className="w-5 h-5 text-accent" />
            : <AlertCircle className="w-5 h-5 text-amber-600" />
          }
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isComplete ? "Profil Lengkap" : "Lengkapi Profil Anda"}
            </p>
            <p className="text-xs text-muted-foreground">{pct}% terisi ({filled.length}/{FIELD_CHECKS.length} kolom)</p>
          </div>
        </div>
        {!isComplete && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-amber-700 flex items-center gap-1 font-medium"
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Sembunyikan</> : <><ChevronDown className="w-3.5 h-3.5" /> Lihat Detail</>}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-amber-100 overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? "bg-accent" : "bg-amber-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Missing fields */}
      {!isComplete && expanded && (
        <div className="mt-3 space-y-1.5">
          {requiredMissing.length > 0 && (
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide mb-1">Wajib diisi:</p>
          )}
          {requiredMissing.map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-xs text-red-700 font-medium">{f.label}</span>
            </div>
          ))}
          {missing.filter(f => !f.required).length > 0 && (
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mt-2 mb-1">Disarankan diisi:</p>
          )}
          {missing.filter(f => !f.required).map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-xs text-amber-800">{f.label}</span>
            </div>
          ))}
          <button
            onClick={onEditClick}
            className="mt-3 w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
          >
            Lengkapi Sekarang →
          </button>
        </div>
      )}
    </div>
  );
}