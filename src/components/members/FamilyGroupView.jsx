import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, Crown, User, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Kelompokkan anggota berdasarkan family_group
function buildFamilyGroups(members) {
  const grouped = {};
  const noGroup = [];

  members.forEach(m => {
    const fg = m.family_group?.trim();
    if (fg) {
      if (!grouped[fg]) grouped[fg] = [];
      grouped[fg].push(m);
    } else {
      noGroup.push(m);
    }
  });

  // Sort: kepala keluarga (Menikah/Laki-laki) dulu, lalu anggota lain
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const aScore = (a.marital_status === "Menikah" && a.gender === "Laki-laki") ? 0
        : (a.marital_status === "Menikah") ? 1
        : 2;
      const bScore = (b.marital_status === "Menikah" && b.gender === "Laki-laki") ? 0
        : (b.marital_status === "Menikah") ? 1
        : 2;
      return aScore - bScore;
    });
  });

  return { grouped, noGroup };
}

function getAgeLabel(birth_year) {
  if (!birth_year) return null;
  const age = new Date().getFullYear() - birth_year;
  return `${age} th`;
}

function MemberRow({ member, index, isHead, onEdit, onDelete }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors hover:bg-secondary/40 ${isHead ? "bg-primary/5 border border-primary/10" : ""}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isHead ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        {isHead ? <Crown className="w-3.5 h-3.5" /> : index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${isHead ? "text-primary" : "text-foreground"}`}>
            {member.full_name}
          </span>
          {isHead && (
            <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20" variant="outline">
              KK
            </Badge>
          )}
          {member.dapukan && member.dapukan !== "Jamaah" && member.dapukan !== "Jamaah Biasa" && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{member.dapukan}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {member.gender && <span>{member.gender}</span>}
          {member.birth_year && <span>· {getAgeLabel(member.birth_year)}</span>}
          {member.marital_status && <span>· {member.marital_status}</span>}
          {member.visa_status && <span>· {member.visa_status}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Badge
          className={member.status === "Aktif"
            ? "text-[10px] bg-accent/10 text-accent border-accent/20 py-0"
            : "text-[10px] bg-destructive/10 text-destructive border-destructive/20 py-0"
          }
          variant="outline"
        >
          {member.status}
        </Badge>
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(member)}>
            <Pencil className="w-3 h-3" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(member)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FamilyCard({ familyName, members, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  const head = members[0];
  const others = members.slice(1);
  const activeCount = members.filter(m => m.status === "Aktif").length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">Keluarga {familyName}</p>
          <p className="text-xs text-muted-foreground">{members.length} anggota · {activeCount} aktif</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{members[0]?.kelompok}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1 border-t border-border">
              <div className="pt-2">
                <MemberRow member={head} index={1} isHead={true} onEdit={onEdit} onDelete={onDelete} />
                {others.map((m, i) => (
                  <MemberRow key={m.id} member={m} index={i + 2} isHead={false} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FamilyGroupView({ members, onEdit, onDelete }) {
  const [groupByKelompok, setGroupByKelompok] = useState(true);
  const { grouped, noGroup } = buildFamilyGroups(members);

  // Group families by kelompok
  const familyByKelompok = {};
  Object.entries(grouped).forEach(([famName, mems]) => {
    const kelompok = mems[0]?.kelompok || "Lainnya";
    if (!familyByKelompok[kelompok]) familyByKelompok[kelompok] = [];
    familyByKelompok[kelompok].push({ famName, mems });
  });

  const sortedKelompok = Object.keys(familyByKelompok).sort();

  if (members.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Belum ada data anggota.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant={groupByKelompok ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupByKelompok(true)}
        >
          Per Kelompok
        </Button>
        <Button
          variant={!groupByKelompok ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupByKelompok(false)}
        >
          Semua Keluarga
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {Object.keys(grouped).length} keluarga · {noGroup.length} tanpa grup
        </span>
      </div>

      {groupByKelompok ? (
        // Grouped by kelompok
        <div className="space-y-8">
          {sortedKelompok.map(kel => (
            <div key={kel}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">{kel}</h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {familyByKelompok[kel].map(({ famName, mems }) => (
                  <FamilyCard
                    key={famName}
                    familyName={famName}
                    members={mems}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* No family group */}
          {noGroup.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Tanpa Grup Keluarga</h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                {noGroup.map((m, i) => (
                  <MemberRow key={m.id} member={m} index={i + 1} isHead={false} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // All families flat
        <div className="space-y-3">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([famName, mems]) => (
            <FamilyCard
              key={famName}
              familyName={famName}
              members={mems}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {noGroup.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-2 mt-4">Tanpa Grup Keluarga ({noGroup.length})</p>
              <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                {noGroup.map((m, i) => (
                  <MemberRow key={m.id} member={m} index={i + 1} isHead={false} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}