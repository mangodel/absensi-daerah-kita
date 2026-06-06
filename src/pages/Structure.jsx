import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useUserRole } from "@/lib/useUserRole";
import { Building2, Users, Shield, Phone, Home, Filter, Pencil, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Kategori 4S
const KATEGORI_4S = [
  {
    label: "Keimaman",
    color: "bg-primary/5 border-primary/20",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    dapukan: ["Ki", "Wakil"],
    isKeimaman: true,
  },
  {
    label: "KU & PKU",
    color: "bg-accent/5 border-accent/20",
    badgeClass: "bg-accent/10 text-accent border-accent/20",
    dapukan: ["KU", "PKU"],
  },
  {
    label: "Penerobos",
    color: "bg-orange-50 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    dapukan: ["Penerobos"],
  },
  {
    label: "Aghnia",
    color: "bg-pink-50 border-pink-200",
    badgeClass: "bg-pink-100 text-pink-700 border-pink-200",
    dapukan: ["Aghnia"],
  },
  {
    label: "Mubaligh",
    color: "bg-violet-50 border-violet-200",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    dapukan: ["Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok"],
    isMubaligh: true,
  },
  {
    label: "Tim & Pengurus Lainnya",
    color: "bg-slate-50 border-slate-200",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dapukan: [],
    isOther: true,
  },
];

const KNOWN_DAPUKAN = KATEGORI_4S.flatMap(k => k.dapukan);

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
      members = pengurusList.filter(m =>
        kat.dapukan.includes(m.dapukan) ||
        m.dapukan?.toLowerCase().includes("muball") ||
        m.dapukan?.toLowerCase().includes("mubaligh")
      );
    } else {
      members = pengurusList.filter(m => kat.dapukan.includes(m.dapukan));
    }
    if (members.length > 0) {
      result.push({ ...kat, members });
    }
  });
  return result;
}

function isPengurus(m) {
  return m.dapukan && m.dapukan !== "Jamaah Biasa" && m.dapukan !== "Jamaah";
}

// Helper: apakah mubaligh 4S (punya dapukan mubaligh level tertentu)
function getMubalighBadge(member) {
  const d = member.dapukan || "";
  if (d === "Muballigh 4S") return { label: "4S", color: "bg-violet-100 text-violet-700 border-violet-300" };
  if (d === "Muballigh Daerah") return { label: "Daerah", color: "bg-violet-100 text-violet-700 border-violet-300" };
  if (d === "Muballigh Desa") return { label: "Desa", color: "bg-violet-100 text-violet-700 border-violet-300" };
  if (d === "Muballigh Kelompok") return { label: "Kelompok", color: "bg-violet-100 text-violet-700 border-violet-300" };
  // Mubaligh biasa (hanya dari muballigh_status, tanpa dapukan khusus)
  if (member.muballigh_status === "Muballigh" || member.muballigh_status === "Muballighot") return null;
  return null;
}

// Keimaman section: Ki kiri, Wakil numbered + sortable
function KeimananSection({ members, isSuperAdmin, editingId, editDapukan, onStartEdit, onSaveEdit, onCancelEdit, setEditDapukan, onMoveUp, onMoveDown }) {
  const ki = members.filter(m => m.dapukan === "Ki");
  // Sort wakil by sort_order
  const wakil = members
    .filter(m => m.dapukan !== "Ki")
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const renderMember = (m, idx, isWakil, totalWakil) => (
    <div key={m.id} className="px-3 py-2.5 rounded-xl border bg-white/70 border-primary/20">
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm">{m.full_name}</span>
            {isWakil && (
              <span className="text-[9px] font-semibold text-primary/60">Wakil {idx + 1}</span>
            )}
          </div>
          {isSuperAdmin && (
            editingId === m.id ? (
              <div className="flex items-center gap-1 mt-1">
                <Input className="h-5 text-[10px] px-1 py-0" value={editDapukan} onChange={e => setEditDapukan(e.target.value)} autoFocus />
                <button onClick={() => onSaveEdit(m.id)} className="text-accent"><Check className="w-3 h-3" /></button>
                <button onClick={onCancelEdit} className="text-muted-foreground"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => onStartEdit(m.id, m.dapukan)} className="text-muted-foreground hover:text-primary mt-0.5">
                <Pencil className="w-2.5 h-2.5" />
              </button>
            )
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
    <div className="rounded-xl border bg-primary/5 border-primary/20 px-3 py-2">
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
  const mubalighBadge = isMubalighKat ? getMubalighBadge(member) : null;
  // Apakah mubaligh "biasa" (hanya dari muballigh_status, bukan dapukan 4S)
  const isMubalighBiasa = isMubalighKat && !mubalighBadge && (member.muballigh_status === "Muballigh" || member.muballigh_status === "Muballighot");

  return (
    <div className={`px-3 py-2.5 rounded-xl border bg-white/70 ${colorClass} ${isMubalighBiasa ? "opacity-75" : ""}`}>
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm">{member.full_name}</span>
            {mubalighBadge && (
              <Badge className={`text-[9px] px-1.5 py-0 ${mubalighBadge.color}`} variant="outline">
                {mubalighBadge.label}
              </Badge>
            )}
            {isMubalighBiasa && (
              <span className="text-[9px] text-muted-foreground italic">biasa</span>
            )}
          </div>
          {isSuperAdmin && !isOther && (
            editingId === member.id ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Input className="h-5 text-[10px] px-1 py-0" value={editDapukan} onChange={e => setEditDapukan(e.target.value)} autoFocus />
                <button onClick={() => onSaveEdit(member.id)} className="text-accent"><Check className="w-3 h-3" /></button>
                <button onClick={onCancelEdit} className="text-muted-foreground"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => onStartEdit(member.id, member.dapukan)} className="text-muted-foreground hover:text-primary mt-0.5">
                <Pencil className="w-2.5 h-2.5" />
              </button>
            )
          )}
          {member.phone && <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground"><Phone className="w-2.5 h-2.5" />{member.phone}</div>}
        </div>
      </div>
    </div>
  );
}

function KategoriSection({ kategoriList, isSuperAdmin, editingId, editDapukan, onStartEdit, onSaveEdit, onCancelEdit, setEditDapukan, onMoveUp, onMoveDown }) {
  if (kategoriList.length === 0) return null;
  return (
    <div className="space-y-3">
      {kategoriList.map(kat => {
        if (kat.isKeimaman) {
          return (
            <KeimananSection
              key="Keimaman"
              members={kat.members}
              isSuperAdmin={isSuperAdmin}
              editingId={editingId}
              editDapukan={editDapukan}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              setEditDapukan={setEditDapukan}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          );
        }
        return (
          <div key={kat.label} className={`rounded-xl border ${kat.color} overflow-hidden`}>
            <div className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{kat.label}</span>
              <Badge variant="outline" className="text-[10px]">{kat.members.length}</Badge>
            </div>
            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {kat.members.map(m => (
                <PengurusCard
                  key={m.id}
                  member={m}
                  badgeClass={kat.badgeClass}
                  colorClass={kat.color}
                  isSuperAdmin={isSuperAdmin}
                  editingId={editingId}
                  editDapukan={editDapukan}
                  onStartEdit={onStartEdit}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  setEditDapukan={setEditDapukan}
                  isOther={kat.isOther}
                  isMubalighKat={kat.isMubaligh}
                />
              ))}
            </div>
          </div>
        );
      })}
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

  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
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
    editingId: editingMemberId,
    editDapukan,
    onStartEdit: (id, dap) => { setEditingMemberId(id); setEditDapukan(dap); },
    onSaveEdit: handleSaveDapukan,
    onCancelEdit: () => setEditingMemberId(null),
    setEditDapukan,
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
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Tingkat Daerah
          </h2>
          {daerahKategori.length > 0 ? (
            <KategoriSection kategoriList={daerahKategori} {...editProps} />
          ) : (
            <p className="text-xs text-muted-foreground">Belum ada pengurus tingkat daerah.</p>
          )}
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
              {!isAdminKelompok && (
                <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent" /> Pengurus {desa}
                  </h3>
                  {desaKategori.length > 0 ? (
                    <KategoriSection kategoriList={desaKategori} {...editProps} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada pengurus desa.</p>
                  )}
                </div>
              )}

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
                      <Badge key={k} variant="outline" className="text-[10px] bg-background">{k}</Badge>
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
                        <KategoriSection kategoriList={kelompokKategori} {...editProps} />
                      )}

                      {subKelompoks.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {subKelompoks.map(sk => (
                            <Badge key={sk} variant="outline" className="text-[9px] bg-secondary/50">{sk}</Badge>
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
                              <div key={m.id} className="text-xs flex items-center justify-between">
                                <span>{m.full_name}</span>
                                {m.phone && <span className="text-muted-foreground text-[10px]">{m.phone}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 text-[10px] flex-wrap">
                        {kelompokMembers.length > 0 ? (
                          <>
                            <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">{active} aktif</Badge>
                            <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">{kelompokMembers.length - active} tidak aktif</Badge>
                            {kelompokMembers.filter(m => m.muballigh_status === "Muballigh" || m.muballigh_status === "Muballighot").length > 0 && (
                              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
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