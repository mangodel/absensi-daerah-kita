import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, ArrowRightLeft, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Anggota", icon: Users, path: "/members" },
  { label: "Absensi", icon: CalendarCheck, path: "/attendance" },
  { label: "Pindah Kelompok", icon: ArrowRightLeft, path: "/transfers" },
  { label: "Struktur Organisasi", icon: Building2, path: "/structure" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-40 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-64"
    )}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">Attendance</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Sistem Absensi Daerah</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("p-4 border-t border-border", collapsed && "px-2")}>
        {!collapsed && (
          <div className="text-[11px] text-muted-foreground text-center">
            © 2026 Attendance System
          </div>
        )}
      </div>
    </aside>
  );
}