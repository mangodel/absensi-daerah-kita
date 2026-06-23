import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, Crown, User, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Kelompokkan anggota berdasarkan family_group
// KK yang namanya = family_group tapi tidak punya family_group sendiri
// akan diambil dari noGroup dan dimasukkan ke dalam grup sebagai member pertama
function buildFamilyGroups(members) {
  const grouped = {};
  const noGroupMap = {}; // nama lowercase -> member

  // Pass 1: pisahkan yang punya family_group dan yang tidak
  members.forEach(m => {
    const fg = m.family_group?.trim();
    if (fg) {
      if (!grouped[fg]) grouped[fg] = [];
      grouped[fg].push(m);
    } else {
      // Simpan di map berdasarkan nama untuk lookup cepat
      const nameLower = m.full_name?.trim().toLowerCase();
      if (nameLower) noGroupMap[nameLower] = m;
    }
  });

  // Pass 2: untuk setiap grup, cari apakah si KK (nama = nama grup)
  // belum ada di dalam grup — jika ada di noGroupMap, tarik masuk sebagai anggota pertama
  const injectedIds = new Set();
  Object.keys(grouped).forEach(key => {
    const keyLower = key.trim().toLowerCase();
    const alreadyInGroup = grouped[key].some(
      m => m.full_name?.trim().toLowerCase() === keyLower
    );
    if (!alreadyInGroup && noGroupMap[keyLower]) {
      // Inject KK ke posisi pertama
      grouped[key].unshift(noGroupMap[keyLower]);
      injectedIds.add(noGroupMap[keyLower].id);
    }
  });

  // Pass 3: noGroup = yang tidak punya family_group DAN tidak diinjeksi ke grup manapun
  const noGroup = members.filter(
    m => !m.family_group?.trim() && !injectedIds.has(m.id)
  );

  // Sort setiap grup: KK (nama cocok) selalu pertama,
  // lalu laki-laki menikah, laki-laki, perempuan, tertua, A-Z
  Object.keys(grouped).forEach(key => {
    const keyLower = key.trim().toLowerCase();
    grouped[key].sort((a, b) => {
      // KK eksplisit (nama cocok dengan nama grup) selalu pertama
      const aIsKK = a.full_name?.trim().toLowerCase() === keyLower;
      const bIsKK = b.full_name?.trim().toLowerCase() === keyLower;
      if (aIsKK && !bIsKK) return -1;
      if (!aIsKK && bIsKK) return 1;
      // Lalu laki-laki menikah > laki-laki > perempuan
      const score = (m) => {
        const isMale = m.gender === "Laki-laki";
        const isMarried = m.marital_status === "Menikah";
        if (isMale && isMarried) return 0;
        if (isMale) return 1;
        return 2;
      };
      const sa = score(a), sb = score(b);
      if (sa !== sb) return sa - sb;
      // Lalu tertua
      const aYear = a.birth_year || 9999;
      const bYear = b.birth_year || 9999;
      if (aYear !== bYear) return aYear - bYear;
      return (a.full_name || "").localeCompare(b.full_name || "");
    });
  });

  return { grouped, noGroup };
}

function getAgeLabel(birth_year) {
  if (!birth_year) return null;
  const age = new Date().getFullYear() - birth_year;
  return `${age} th`;
}

// KK adalah member pertama dalam array (sudah diurutkan di buildFamilyGroups)
// Tanpa grup = selalu KK sendiri

function MemberRow({ member, index, isHead, onEdit, onDelete }) {
  const infoChunks = [
    member.gender,
    member.birth_year ? getAgeLabel(member.birth_year) : null,
    member.marital_status,
    member.visa_status,
  ].filter(Boolean).join(" · ");

  return (
    <div className={`flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors hover:bg-secondary/40 ${isHead ? "bg-primary/5 border border-primary/10" : ""}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isHead ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        {isHead ? <Crown className="w-3.5 h-3.5" /> : <span>{index}</span>}
      </div>

      {/* Info utama */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-medium text-sm leading-tight ${isHead ? "text-primary" : "text-foreground"}`}>
            {member.full_name}
          </span>
          {isHead && (
            <Badge className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/20" variant="outline">KK</Badge>
          )}
          {member.dapukan && member.dapukan !== "Jamaah" && member.dapukan !== "Jamaah Biasa" && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{member.dapukan}</Badge>
          )}
        </div>
        {infoChunks && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{infoChunks}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Badge
          className={`text-[9px] px-1.5 py-0 h-4 ${member.status === "Aktif" ? "bg-accent/10 text-accent border-accent/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}
          variant="outline"
        >
          {member.status}
        </Badge>
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(member)}>
            <Pencil className="w-3 h-3" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(member)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Row khusus untuk KK Mandiri (belum punya grup / belum tunjuk KK)
function MemberRowMandiri({ member, onEdit, onDelete }) {
  const infoChunks = [
    member.gender,
    member.birth_year ? getAgeLabel(member.birth_year) : null,
    member.marital_status,
    member.visa_status,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors hover:bg-secondary/40">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
        <User className="w-3.5 h-3.5" />
      </div>

      {/* Info utama */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-sm leading-tight text-foreground">
            {member.full_name}
          </span>
          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-400 dark:border-violet-700" variant="outline">
            KK Mandiri
          </Badge>
          {member.dapukan && member.dapukan !== "Jamaah" && member.dapukan !== "Jamaah Biasa" && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{member.dapukan}</Badge>
          )}
        </div>
        {infoChunks && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{infoChunks}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Badge
          className={`text-[9px] px-1.5 py-0 h-4 ${member.status === "Aktif" ? "bg-accent/10 text-accent border-accent/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}
          variant="outline"
        >
          {member.status}
        </Badge>
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(member)}>
            <Pencil className="w-3 h-3" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(member)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FamilyCard({ familyName, members, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  // Cari member yang namanya = familyName (KK terdaftar)
  // KK = member pertama setelah sorting (nama cocok > tertua > A-Z)
  const kkMember = members[0];
  const otherMembers = members.slice(1);

  const totalCount = members.length;
  const activeCount = members.filter(m => m.status === "Aktif").length;

  const kkSource = kkMember;
  const addressStr = kkSource && (kkSource.address || kkSource.suburb || kkSource.state || kkSource.postcode)
    ? `${kkSource.address || ""} ${kkSource.suburb || ""} ${kkSource.state || ""} ${kkSource.postcode || ""}`.trim()
    : null;

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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground truncate">Keluarga {kkMember?.full_name || familyName}</p>
            <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20" variant="outline">KK</Badge>
          </div>
          <div className="flex flex-col gap-1 mt-0.5">
            <p className="text-xs text-muted-foreground">{totalCount} anggota · {activeCount} aktif</p>
            {addressStr && <p className="text-xs text-muted-foreground truncate">{addressStr}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{kkMember?.kelompok}</span>
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
                {/* KK selalu ada — member pertama setelah sorting */}
                <MemberRow member={kkMember} index={1} isHead={true} onEdit={onEdit} onDelete={onDelete} />
                {otherMembers.map((m, i) => (
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
          <span className="font-semibold text-foreground">{Object.keys(grouped).length + noGroup.length}</span> KK total ·{" "}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
            <span>{Object.keys(grouped).length} berkelompok</span>
          </span>{" "}·{" "}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
            <span>{noGroup.length} mandiri</span>
          </span>
        </span>
      </div>

      {groupByKelompok ? (
        // Grouped by kelompok
        <div className="space-y-8">
          {sortedKelompok.map(kel => {
            const kkCount = familyByKelompok[kel].length;
            const mandiriCount = noGroup.filter(m => (m.kelompok || "Lainnya") === kel).length;
            return (
            <div key={kel}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-2">
                  {kel}
                  <span className="normal-case font-normal text-[10px] text-muted-foreground">
                    <span className="text-primary font-semibold">{kkCount}</span> KK
                    {mandiriCount > 0 && (
                      <> · <span className="text-amber-500 font-semibold">{mandiriCount}</span> mandiri</>
                    )}
                    {" "}· total <span className="font-semibold">{kkCount + mandiriCount}</span>
                  </span>
                </h3>
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
          );})}

          {/* No family group - KK Mandiri */}
          {noGroup.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                  KK Mandiri ({noGroup.length})
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                {noGroup.map((m, i) => (
                  <MemberRowMandiri key={m.id} member={m} onEdit={onEdit} onDelete={onDelete} />
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
              <p className="text-xs text-muted-foreground font-semibold mb-2 mt-4 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                KK Mandiri ({noGroup.length})
              </p>
              <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                {noGroup.map((m, i) => (
                  <MemberRowMandiri key={m.id} member={m} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}