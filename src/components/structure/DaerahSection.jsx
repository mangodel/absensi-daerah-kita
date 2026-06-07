import { Shield, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KategoriSection } from "./KategoriSection";

export default function DaerahSection({
  daerahKategori,
  daerahMembers,
  timConfigs,
  isSuperAdmin,
  editProps,
  onManageTeam,
}) {
  const tim7Configs = timConfigs.filter((t) => t.tim_category === "Tim_7");
  const timLainnyaConfigs = timConfigs.filter((t) => t.tim_category === "Tim_Lainnya");

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" /> Tingkat Daerah
      </h2>

      {/* 4 Serangkai Section */}
      {daerahKategori.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">4 Serangkai</p>
          <KategoriSection kategoriList={daerahKategori} {...editProps} level="Daerah" />
        </div>
      )}

      {/* Tim 7 Section */}
      {tim7Configs.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Tim 7</p>
            {isSuperAdmin && <button onClick={() => onManageTeam("Tim_7")} className="text-[10px] text-primary hover:underline">Kelola</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tim7Configs.map((tim) => (
              <div key={tim.id} className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-200">{tim.tim_name}</p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{tim.mode === "hybrid" ? "Manual + Filter" : tim.mode === "manual" ? "Manual" : "Filter Otomatis"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tim Lainnya Section */}
      {timLainnyaConfigs.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Tim Lainnya</p>
            {isSuperAdmin && <button onClick={() => onManageTeam("Tim_Lainnya")} className="text-[10px] text-primary hover:underline">Kelola</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {timLainnyaConfigs.map((tim) => (
              <div key={tim.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tim.tim_name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{tim.mode === "hybrid" ? "Manual + Filter" : tim.mode === "manual" ? "Manual" : "Filter Otomatis"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!daerahKategori.length && tim7Configs.length === 0 && timLainnyaConfigs.length === 0 && (
        <p className="text-xs text-muted-foreground">Belum ada pengurus tingkat daerah.</p>
      )}
    </div>
  );
}