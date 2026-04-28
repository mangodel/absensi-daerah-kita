import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, Building2, CalendarDays, Settings } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Anggota", icon: Users, path: "/members" },
  { label: "Kegiatan", icon: CalendarDays, path: "/events" },
  { label: "Absensi", icon: CalendarCheck, path: "/attendance" },
  { label: "Struktur", icon: Building2, path: "/structure" },
];

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = user?.role === "admin"
    ? [...baseNavItems, { label: "Pengaturan", icon: Settings, path: "/settings" }]
    : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-2 py-1 safe-area-pb">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}