import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, Bell, FileBarChart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isToday, isPast } from "date-fns";

export default function MobileNav() {
  const location = useLocation();
  const { canAccessSettings, isSuperAdmin, isAdminDesa } = useUserRole();

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => base44.entities.Reminder.list(),
  });
  const urgentCount = reminders.filter(r => r.status === "Aktif" && r.due_date && (isPast(new Date(r.due_date)) || isToday(new Date(r.due_date)))).length;

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Jamaah", icon: Users, path: "/members" },
    { label: "Kegiatan", icon: CalendarDays, path: "/events" },
    { label: "Absensi", icon: CalendarCheck, path: "/attendance" },
    { label: "Laporan", icon: FileBarChart, path: "/reports" },
    { label: "Pengingat", icon: Bell, path: "/reminders", badge: urgentCount },
    ...(canAccessSettings ? [{ label: "Setelan", icon: Settings, path: "/settings" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-1 py-1 safe-area-pb">
      <div className="flex justify-around overflow-x-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-colors relative shrink-0",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}