import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Building2, Users, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Structure() {
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const desaKelompokMap = config.desa_kelompok_map || {};
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const daerahLeaders = members.filter(m => m.dapukan_level === "Daerah" && m.dapukan !== "Anggota");

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
          <div className="flex flex-wrap gap-3">
            {daerahLeaders.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10">
                <span className="font-medium text-sm">{m.full_name}</span>
                <Badge className="bg-primary/10 text-primary text-[10px]">{m.dapukan}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Belum ada pengurus tingkat daerah.</p>
        )}
      </div>

      {/* Desa Level */}
      <Tabs defaultValue={Object.keys(desaKelompokMap)[0] || ""}>
        <TabsList>
          {Object.keys(desaKelompokMap).map(desa => (
            <TabsTrigger key={desa} value={desa}>{desa}</TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(desaKelompokMap).map(([desa, kelompoks]) => {
          const desaLeaders = members.filter(m => m.desa === desa && m.dapukan_level === "Desa" && m.dapukan !== "Anggota");

          return (
            <TabsContent key={desa} value={desa} className="space-y-4 mt-4">
              {/* Desa Leaders */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" /> Pengurus {desa}
                </h3>
                {desaLeaders.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {desaLeaders.map(m => (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 rounded-lg border border-accent/10">
                        <span className="text-sm font-medium">{m.full_name}</span>
                        <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">{m.dapukan}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada pengurus desa.</p>
                )}
              </div>

              {/* Desa Summary */}
              {(() => {
                const desaMembers = members.filter(m => m.desa === desa);
                const desaActive = desaMembers.filter(m => m.status === "Aktif").length;
                return (
                  <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex flex-wrap gap-4">
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
                    <div className="ml-auto flex flex-wrap gap-1 items-center">
                      {kelompoks.map(k => (
                        <Badge key={k} variant="outline" className="text-[10px] bg-background">{k}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Kelompok Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kelompoks.map(kelompok => {
                  const kelompokMembers = members.filter(m => m.desa === desa && m.kelompok === kelompok);
                  const active = kelompokMembers.filter(m => m.status === "Aktif").length;
                  const leaders = kelompokMembers.filter(m => m.dapukan !== "Anggota" && m.dapukan_level === "Kelompok");

                  return (
                    <div key={kelompok} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-sm">{kelompok}</h4>
                          <p className="text-[10px] text-muted-foreground">{desa}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>{active}/{kelompokMembers.length}</span>
                        </div>
                      </div>

                      {leaders.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {leaders.map(l => (
                            <div key={l.id} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{l.full_name}</span>
                              <Badge variant="secondary" className="text-[10px]">{l.dapukan}</Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 text-[10px]">
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