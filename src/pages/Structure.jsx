import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { Building2, Users, Shield, Phone, Home, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ViewSwitcher from "@/components/structure/ViewSwitcher";
import TimConfigManager from "@/components/structure/TimConfigManager";
import DaerahSection from "@/components/structure/DaerahSection";
import { KategoriSection } from "@/components/structure/KategoriSection";

// Kategori 4S
const KATEGORI_4S = [
  {
    label: "Keimaman",
    color: "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
    badgeClass: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/40",
    dapukan: ["Ki", "Wakil"],
    isKeimaman: true,
  },
  {
    label: "KU & PKU",
    color: "bg-accent/5 border-accent/20 dark:bg-accent/10 dark:border-accent/30",
    badgeClass: "bg-accent/10 text-accent border-accent/20 dark:bg-accent/20 dark:text-accent dark:border-accent/40",
    dapukan: ["KU", "PKU"],
  },
  {
    label: "Penerobos",
    color: "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-700",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
    dapukan: ["Penerobos"],
  },
  {
    label: "Aghnia",
    color: "bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-700",
    badgeClass: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700",
    dapukan: ["Aghnia"],
  },
  {
    label: "Mubaligh",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-700",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:border-violet-700",
    dapukan: ["Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok"],
    isMubaligh: true,
  },
  {
    label: "Tim & Pengurus Lainnya",
    color: "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    dapukan: [],
    isOther: true,
  },
];

const KNOWN_DAPUKAN = KATEGORI_4S.flatMap(k => k.dapukan);

// Helper untuk ambil TimConfig dari entitas
const fetchTimConfigs = async (level = "Daerah") => {
  return await base44.entities.TimConfig.filter({ level });
};

function getPengurusKategori(pengurusList) {
  const result = [];
  KATEGORI_4S.forEach(kat => {
    let members;
    if (kat.isOther) {
      members = pengurusList.filter(m =>
        !KNOWN_DAPUKAN.includes(m.dapukan) &&
        m.dapukan !== "Jamaah Biasa" &&
        m.dapukan !== "Jamaah" &&
        !m.dapukan?.toLowerCase().includes("muball") &&
        !m.dapukan?.toLowerCase().includes("mubaligh")
      );
    } else if (kat.isMubaligh) {
      // Hanya tampilkan yang punya dapukan mubaligh eksplisit (4S/Daerah/Desa/Kelompok)
      members = pengurusList.filter(m => kat.dapukan.includes(m.dapukan));
    } else {
      members = pengurusList.filter(m => kat.dapukan.includes(m.dapukan));
    }
    // Sort by sort_order
    members.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    if (members.length > 0) {
      result.push({ ...kat, members });
    }
  });
  return result;
}

function isPengurus(m) {
  return m.dapukan && m.dapukan !== "Jamaah Biasa" && m.dapukan !== "Jamaah";
}

// Helper: dapatkan label dapukan beserta tingkatannya
function getDapukanLabel(member) {
  const d = member.dapukan || "";
  const level = member.dapukan_level || "";
  if (!d || d === "Jamaah" || d === "Jamaah Biasa") return null;

  // Mubaligh sudah mengandung level di nama dapukannya
  if (d === "Muballigh 4S") return "Mubaligh 4S";
  if (d === "Muballigh Daerah") return "Mubaligh Daerah";
  if (d === "Muballigh Desa") return "Mubaligh Desa";
  if (d === "Muballigh Kelompok") return "Mubaligh Kelompok";

  // Wakil Ki: tampilkan "Wakil Ki Level"
  if (d === "Wakil") {
    if (level) return `Wakil Ki ${level}`;
    return "Wakil Ki";
  }

  // Dapukan lain: tambahkan level jika ada
  if (level) return `${d} ${level}`;
  return d;
}

// Keimaman section: Ki kiri, Wakil numbered + sortable
function KeimananSection({ members, isSuperAdmin, editingId, editDapukan, onStartEdit, onSaveEdit, onCancelEdit, setEditDapukan, onMoveUp, onMoveDown, level }) {
  const ki = members.filter(m => m.dapukan === "Ki");
  // Sort wakil by sort_order
  const wakil = members
    .filter(m => m.dapukan !== "Ki")
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const renderMember = (m, idx, isWakil, totalWakil) => (
    <div key={m.id} className="px-3 py-2.5 rounded-xl border bg-white/70 dark:bg-slate-800/70 border-primary/20 dark:border-primary/40">
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm text-foreground">{m.full_name}</span>
            {isWakil && (
              <span className="text-[9px] font-semibold text-primary/60 dark:text-primary/80">Wakil {idx + 1} - Ki{level ? ` - ${level}` : ""}</span>
            )}
          </div>
          {getDapukanLabel(m) && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 mt-0.5 bg-primary/5 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/40">{getDapukanLabel(m)}</Badge>
          )}

          {m.phone && <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground"><Phone className="w-2.5 h-2.5" />{m.phone}</div>}
        </div>
        {isSuperAdmin && isWakil && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              disabled={idx === 0}
              onClick={() => onMoveUp(m, wakil)}
              className="text-muted-foreground hover:text-primary disabled:opacity-20"
            ><ChevronUp className="w-3.5 h-3.5" /></button>
            <button
              disabled={idx === totalWakil - 1}
              onClick={() => onMoveDown(m, wakil)}
              className="text-muted-foreground hover:text-primary disabled:opacity-20"
            ><ChevronDown className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30 px-3 py-2">
      <div className="text-[10px] font-semibold text-muted-foreground mb-2">Keimaman</div>
      <div className="flex flex-wrap gap-2">
      {ki.map(m => renderMember(m, 0, false, 0))}
      {wakil.map((m, idx) => renderMember(m, idx, true, wakil.length))}
      </div>
    </div>
  );
}

// Generic pengurus card for non-keimaman
function PengurusCard({ member, badgeClass, colorClass, isSuperAdmin, editingId, editDapukan, onStartEdit, onSaveEdit, onCancelEdit, setEditDapukan, isOther, isMubalighKat }) {
  return (
    <div className={`px-3 py-2.5 rounded-xl border bg-white/70 dark:bg-slate-800/70 ${colorClass}`}>
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm text-foreground">{member.full_name}</span>
          </div>
          {getDapukanLabel(member) && (
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 mt-0.5 ${badgeClass}`}>{getDapukanLabel(member)}</Badge>
          )}

          {member.phone && <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground"><Phone className="w-2.5 h-2.5" />{member.phone}</div>}
        </div>
      </div>
    </div>
  );
}



export default function Structure() {
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const desaKelompokMap = config.desa_kelompok_map || {};
  const { isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();

  const [filterMubaligh, setFilterMubaligh] = useState("all");
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editDapukan, setEditDapukan] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("structureViewMode") || "hierarchical");
  const [managingCategory, setManagingCategory] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    localStorage.setItem("structureViewMode", viewMode);
  }, [viewMode]);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: timConfigs = [] } = useQuery({
    queryKey: ["timConfigs"],
    queryFn: () => base44.entities.TimConfig.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const handleSaveDapukan = (memberId) => {
    updateMutation.mutate({ id: memberId, data: { dapukan: editDapukan } });
    setEditingMemberId(null);
  };

  // Geser wakil naik: tukar sort_order dengan item sebelumnya
  const handleMoveUp = (member, sortedWakil) => {
    const idx = sortedWakil.findIndex(m => m.id === member.id);
    if (idx <= 0) return;
    const prev = sortedWakil[idx - 1];
    const prevOrder = prev.sort_order ?? idx - 1;
    const curOrder = member.sort_order ?? idx;
    updateMutation.mutate({ id: member.id, data: { sort_order: prevOrder } });
    updateMutation.mutate({ id: prev.id, data: { sort_order: curOrder } });
  };

  // Geser wakil turun: tukar sort_order dengan item berikutnya
  const handleMoveDown = (member, sortedWakil) => {
    const idx = sortedWakil.findIndex(m => m.id === member.id);
    if (idx >= sortedWakil.length - 1) return;
    const next = sortedWakil[idx + 1];
    const nextOrder = next.sort_order ?? idx + 1;
    const curOrder = member.sort_order ?? idx;
    updateMutation.mutate({ id: member.id, data: { sort_order: nextOrder } });
    updateMutation.mutate({ id: next.id, data: { sort_order: curOrder } });
  };

  const editProps = {
    isSuperAdmin,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
  };

  // Scope filter based on role
  const scopedDesa = isSuperAdmin
    ? Object.keys(desaKelompokMap)
    : isAdminDesa && userDesa
    ? [userDesa]
    : isAdminKelompok && userDesa
    ? [userDesa]
    : Object.keys(desaKelompokMap);

  const daerahLeaders = members.filter(m => m.dapukan_level === "Daerah" && isPengurus(m));
  const daerahKategori = getPengurusKategori(daerahLeaders);

  function applyMubalighFilter(memberList) {
    if (filterMubaligh === "mubaligh") return memberList.filter(m => m.muballigh_status === "Muballigh");
    if (filterMubaligh === "mubalighot") return memberList.filter(m => m.muballigh_status === "Muballighot");
    if (filterMubaligh === "both") return memberList.filter(m => m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot");
    return memberList;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> {pt.structure || "Struktur Organisasi"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pt.structure_subtitle || "Daerah → Desa → Kelompok"}</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterMubaligh} onValueChange={setFilterMubaligh}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jamaah</SelectItem>
              <SelectItem value="both">Mubaligh &amp; Mubalighot</SelectItem>
              <SelectItem value="mubaligh">Mubaligh Saja</SelectItem>
              <SelectItem value="mubalighot">Mubalighot Saja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daerah Level */}
      {(isSuperAdmin || isAdminDesa) && (
        <>
          <DaerahSection
            daerahKategori={daerahKategori}
            daerahMembers={members.filter(m => m.dapukan_level === "Daerah" && isPengurus(m))}
            timConfigs={timConfigs.filter(t => t.level === "Daerah")}
            isSuperAdmin={isSuperAdmin}
            editProps={editProps}
            onManageTeam={setManagingCategory}
          />
          
          {/* Tim Config Manager (jika super admin) */}
          {isSuperAdmin && managingCategory && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Kelola {managingCategory === "Tim_7" ? "Tim 7" : "Tim Lainnya"}</h3>
                <button onClick={() => setManagingCategory(null)} className="text-sm text-muted-foreground hover:text-foreground">Tutup</button>
              </div>
              <TimConfigManager 
                timConfigs={timConfigs.filter(t => t.tim_category === managingCategory && t.level === "Daerah")}
                level="Daerah"
              />
            </div>
          )}
        </>
      )}

      {/* Stat Cards Pengurus Daerah — tampilkan untuk admin kelompok yang tidak melihat DaerahSection */}
      {isAdminKelompok && daerahKategori.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Pengurus Daerah
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {daerahKategori.flatMap(kat => kat.members).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-primary/5 border-primary/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{getDapukanLabel(m) || m.dapukan}</p>
                </div>
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="text-[10px] text-primary shrink-0 flex items-center gap-1 hover:underline">
                    <Phone className="w-3 h-3" />{m.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desa Level Tabs */}
      <Tabs defaultValue={scopedDesa[0] || ""}>
        <TabsList className="flex-wrap h-auto gap-1">
          {scopedDesa.map(desa => (
            <TabsTrigger key={desa} value={desa}>{desa}</TabsTrigger>
          ))}
        </TabsList>

        {scopedDesa.map(desa => {
          const kelompoks = (desaKelompokMap[desa] || []).filter(k =>
            isAdminKelompok ? k === userKelompok : true
          );
          const desaLeaders = members.filter(m => m.desa === desa && m.dapukan_level === "Desa" && isPengurus(m));
          const desaKategori = getPengurusKategori(desaLeaders);
          const desaMembers = members.filter(m => m.desa === desa);
          const desaActive = desaMembers.filter(m => m.status === "Aktif").length;
          const desaKKSet = new Set(desaMembers.filter(m => m.family_group).map(m => m.family_group));
          const desaKKCount = desaKKSet.size;

          return (
            <TabsContent key={desa} value={desa} className="space-y-4 mt-4">
              {/* Desa Leaders */}
              <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" /> Pengurus {desa}
                </h3>
                {desaKategori.length > 0 ? (
                  isAdminKelompok ? (
                    // Admin kelompok: tampilkan stat cards ringkasan
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {desaKategori.flatMap(kat => kat.members).map(m => (
                        <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-accent/5 border-accent/20">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{getDapukanLabel(m) || m.dapukan}</p>
                          </div>
                          {m.phone && (
                            <a href={`tel:${m.phone}`} className="text-[10px] text-accent shrink-0 flex items-center gap-1 hover:underline">
                              <Phone className="w-3 h-3" />{m.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <KategoriSection kategoriList={desaKategori} {...editProps} level="Desa" />
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada pengurus desa.</p>
                )}
              </div>

              {/* Desa Summary */}
              {!isAdminKelompok && (
                <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex flex-wrap gap-6 items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{desaMembers.length}</div>
                    <div className="text-xs text-muted-foreground">Total Jamaah</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{desaActive}</div>
                    <div className="text-xs text-muted-foreground">Aktif</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">{desaMembers.length - desaActive}</div>
                    <div className="text-xs text-muted-foreground">Tidak Aktif</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{kelompoks.length}</div>
                    <div className="text-xs text-muted-foreground">Kelompok</div>
                  </div>
                  {desaKKCount > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground flex items-center gap-1 justify-center">
                        <Home className="w-4 h-4 text-muted-foreground" />{desaKKCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Kepala Keluarga</div>
                    </div>
                  )}
                  <div className="ml-auto flex flex-wrap gap-1 items-center">
                    {kelompoks.map(k => (
                      <Badge key={k} variant="outline" className="text-[10px] bg-background dark:bg-slate-800 dark:text-foreground">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Kelompok Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kelompoks.map(kelompok => {
                  const kelompokMembers = members.filter(m => m.desa === desa && m.kelompok === kelompok);
                  const active = kelompokMembers.filter(m => m.status === "Aktif").length;
                  const leaders = kelompokMembers.filter(m => isPengurus(m) && m.dapukan_level === "Kelompok");
                  const kelompokKategori = getPengurusKategori(leaders);
                  const kkSet = new Set(kelompokMembers.filter(m => m.family_group).map(m => m.family_group));
                  const kkCount = kkSet.size;
                  const subKelompoks = [...new Set(kelompokMembers.filter(m => m.sub_kelompok).map(m => m.sub_kelompok))];
                  const jamaahBiasa = applyMubalighFilter(kelompokMembers.filter(m => !isPengurus(m) && m.dapukan !== "Jamaah" && m.dapukan !== "Jamaah Biasa"));

                  return (
                    <div key={kelompok} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{kelompok}</h4>
                          <p className="text-[10px] text-muted-foreground">{desa}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span>{active}/{kelompokMembers.length}</span>
                          </div>
                          {kkCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Home className="w-3 h-3" /><span>{kkCount} KK</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {kelompokKategori.length > 0 && (
                        <KategoriSection kategoriList={kelompokKategori} {...editProps} level="Kelompok" />
                      )}

                      {subKelompoks.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {subKelompoks.map(sk => (
                                    <Badge key={sk} variant="outline" className="text-[9px] bg-secondary/50 dark:bg-secondary/40 dark:text-foreground">{sk}</Badge>
                                  ))}
                        </div>
                      )}

                      {filterMubaligh !== "all" && jamaahBiasa.length > 0 && (
                        <div className="border-t border-border pt-2">
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">
                            {filterMubaligh === "mubaligh" ? "Mubaligh" : filterMubaligh === "mubalighot" ? "Mubalighot" : "Mubaligh & Mubalighot"}
                            <span className="ml-1 text-primary">({jamaahBiasa.length})</span>
                          </p>
                          <div className="space-y-1">
                            {jamaahBiasa.map(m => (
                              <div key={m.id} className="text-xs flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5 flex-wrap">
                                      {m.full_name}
                                      {m.dapukan && m.dapukan !== "Jamaah" && m.dapukan !== "Jamaah Biasa" && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:border-violet-700">{m.dapukan}</Badge>
                                      )}
                                    </span>
                                    {m.phone && <span className="text-muted-foreground text-[10px] shrink-0">{m.phone}</span>}
                                  </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 text-[10px] flex-wrap">
                        {kelompokMembers.length > 0 ? (
                          <>
                            <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 dark:bg-accent/20 dark:text-accent dark:border-accent/40">{active} aktif</Badge>
                            <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/40">{kelompokMembers.length - active} tidak aktif</Badge>
                            {kelompokMembers.filter(m => m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot").length > 0 && (
                              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:border-violet-700">
                                {kelompokMembers.filter(m => m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot").length} mubaligh
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Belum ada jamaah</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}