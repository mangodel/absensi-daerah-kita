import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useState } from "react";

export default function BroadcastInbox({ member }) {
  const [showAll, setShowAll] = useState(false);

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["broadcasts-portal", member?.desa, member?.kelompok],
    queryFn: () => base44.entities.Broadcast.list("-sent_at"),
    enabled: !!member,
  });

  // Filter broadcast yang relevan untuk member ini
  const relevant = broadcasts.filter(b => {
    if (b.target_scope === "Semua") return true;
    if (b.target_scope === "Desa" && b.target_desa === member?.desa) return true;
    if (b.target_scope === "Kelompok" && b.target_kelompok === member?.kelompok) return true;
    if (b.target_scope === "Custom") {
      try {
        const ids = JSON.parse(b.recipient_ids || "[]");
        return ids.includes(member?.id);
      } catch { return false; }
    }
    return false;
  });

  const displayed = showAll ? relevant : relevant.slice(0, 3);

  if (isLoading || relevant.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          Pesan dari Pengurus
          {relevant.length > 0 && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{relevant.length}</span>
          )}
        </h3>
        {relevant.length > 3 && (
          <button onClick={() => setShowAll(v => !v)} className="text-xs text-primary font-medium">
            {showAll ? "Tampilkan lebih sedikit" : `Lihat semua (${relevant.length})`}
          </button>
        )}
      </div>

      {displayed.map(b => (
        <div key={b.id} className="bg-primary/5 border border-primary/15 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">{b.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{b.message}</p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                {b.sent_at ? format(new Date(b.sent_at), "dd MMM yyyy, HH:mm", { locale: idLocale }) : ""}
                {b.sent_by_name && ` · ${b.sent_by_name}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}