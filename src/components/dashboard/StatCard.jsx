import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, color = "primary", onClick }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-orange-100 text-orange-600",
  };

  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-5 border border-border hover:shadow-lg transition-shadow duration-300",
        onClick && "cursor-pointer hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold mt-2 text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {onClick && <p className="text-[10px] text-muted-foreground mt-2">Klik untuk lihat detail →</p>}
    </div>
  );
}