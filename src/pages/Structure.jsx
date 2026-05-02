import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Building2, Users, Shield, Phone, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAPUKAN_PENGURUS_ORDER } from "@/lib/constants";

// Sort pengurus: Ki > Wakil > Muballigh 4S > Penerobos > lainnya
function sortPengurus(list) {
  return [...list].sort((a, b) => {
    const ai = DAPUKAN_PENGURUS_ORDER.indexOf(a.dapukan);
    const bi = DAPUKAN_PENGURUS_ORDER.indexOf(b.dapukan);
    const av = ai === -1 ? 999 : ai;
    const bv = bi === -1 ? 999 : bi;
    return av - bv;
  });
}

// Only show pengurus (bukan Jamaah Biasa)
function isPengurus(m) {
  return m.dapukan && m.dapukan !== "Jamaah Biasa";
}

function PengurusCard({ member, colorClass }) {
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${colorClass}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{member.full_name}</span>
          <Badge className="text-[10px] shrink-0">{member.dapukan}</Badge>
        </div>
        {member.phone && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Structure() {
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const desaKelompokMap = config.desa_kelompok_map || {};
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const daerahLeaders = sortPengurus(
    members.filter(m => m.dapukan_level === "Daerah" && isPengurus(m))
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" /> {pt.structure || "Struktur Organisasi"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{pt.structure_subtitle || "Daerah → Desa → Kelompok"}</p>
      </div>

      {/* Daerah Level */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" /> Tingkat Daerah
        </h2>
        {daerahLeaders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {daerahLeaders.map(m => (
              <PengurusCard key={m.id} member={m} colorClass="bg-primary/5 border-primary/10" />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Belum ada pengurus tingkat daerah.</p>
        )}
      </div>

      {/* Desa Level */}
      <Tabs defaultValue={Object.keys(desaKelompokMap)[0] || ""}>
        <TabsList className="flex-wrap h-auto gap-1">
          {Object.keys(desaKelompokMap).map(desa => (
            <TabsTrigger key={desa} value={desa}>{desa}</TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(desaKelompokMap).map(([desa, kelompoks]) => {
          const desaLeaders = sortPengurus(
            members.filter(m => m.desa === desa && m.dapukan_level === "Desa" && isPengurus(m))
          );
          const desaMembers = members.filter(m => m.desa === desa);
          const desaActive = desaMembers.filter(m => m.status === "Aktif").length;

          // KK count per desa
          const desaKKSet = new Set(desaMembers.filter(m => m.family_group).map(m => m.family_group));
          const desaKKCount = desaKKSet.size;

          return (
            <TabsContent key={desa} value={desa} className="space-y-4 mt-4">
              {/* Desa Leaders */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" /> Pengurus {desa}
                </h3>
                {desaLeaders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {desaLeaders.map(m => (
                      <PengurusCard key={m.id} member={m} colorClass="bg-accent/5 border-accent/10" />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada pengurus desa.</p>
                )}
              </div>

              {/* Desa Summary */}
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

              {/* Kelompok Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kelompoks.map(kelompok => {
                  const kelompokMembers = members.filter(m => m.desa === desa && m.kelompok === kelompok);
                  const active = kelompokMembers.filter(m => m.status === "Aktif").length;
                  const leaders = sortPengurus(
                    kelompokMembers.filter(m => isPengurus(m) && m.dapukan_level === "Kelompok")
                  );
                  // KK count
                  const kkSet = new Set(kelompokMembers.filter(m => m.family_group).map(m => m.family_group));
                  const kkCount = kkSet.size;
                  // Sub kelompok
                  const subKelompoks = [...new Set(kelompokMembers.filter(m => m.sub_kelompok).map(m => m.sub_kelompok))];

                  return (
                    <div key={kelompok} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
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
                              <Home className="w-3 h-3" />
                              <span>{kkCount} KK</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {leaders.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {leaders.map(l => (
                            <div key={l.id} className="space-y-0.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-foreground font-medium">{l.full_name}</span>
                                <Badge variant="secondary" className="text-[10px]">{l.dapukan}</Badge>
                              </div>
                              {l.phone && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-0">
                                  <Phone className="w-2.5 h-2.5" />{l.phone}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {subKelompoks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {subKelompoks.map(sk => (
                            <Badge key={sk} variant="outline" className="text-[9px] bg-secondary/50">{sk}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 text-[10px] flex-wrap">
                        {kelompokMembers.length > 0 ? (
                          <>
                            <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">{active} aktif</Badge>
                            <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">{kelompokMembers.length - active} tidak aktif</Badge>
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