import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, ArrowRightLeft, Building2, ChevronLeft, ChevronRight, CalendarDays, Settings, FileBarChart, Bell, FolderOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useAuth } from "@/lib/AuthContext";
import { useUserRole } from "@/lib/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isToday, isPast } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Jamaah", icon: Users, path: "/members" },
  { label: "Kegiatan", icon: CalendarDays, path: "/events" },
  { label: "Absensi", icon: CalendarCheck, path: "/attendance" },
  { label: "Laporan Bulanan", icon: FileBarChart, path: "/reports" },
  { label: "Dokumen", icon: FolderOpen, path: "/documents" },
  { label: "Pindah Kelompok", icon: ArrowRightLeft, path: "/transfers" },
  { label: "Struktur Organisasi", icon: Building2, path: "/structure" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { config } = useAppConfig();
  const { user } = useAuth();
  const { canAccessSettings, role, userDesa, userKelompok, isSuperAdmin, isAdminDesa } = useUserRole();

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => base44.entities.Reminder.list(),
  });

  const urgentReminders = reminders.filter(r =>
    r.status === "Aktif" && r.due_date && (isPast(new Date(r.due_date)) || isToday(new Date(r.due_date)))
  ).length;

  // Filter nav based on role
  const visibleNav = navItems.filter(item => {
    if (item.path === "/transfers") return isSuperAdmin || isAdminDesa;
    if (item.path === "/structure") return isSuperAdmin || isAdminDesa;
    return true;
  });

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-40 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-64"
    )}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            {config.logo_url && <img src={config.logo_url} alt="Logo" className="w-8 h-8 object-contain shrink-0 rounded" />}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-primary tracking-tight truncate">{config.org_name}</h1>
              <p className="text-[11px] text-muted-foreground font-medium truncate">{config.org_subtitle}</p>
            </div>
          </div>
        )}
        {collapsed && config.logo_url && <img src={config.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded mx-auto" />}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Reminders with badge */}
        <Link to="/reminders" className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
          location.pathname === "/reminders" ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}>
          <Bell className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Pengingat</span>}
          {urgentReminders > 0 && (
            <span className={cn(
              "flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-white min-w-[18px] h-[18px] px-1",
              collapsed ? "absolute top-1.5 right-1.5" : "ml-auto"
            )}>
              {urgentReminders}
            </span>
          )}
        </Link>
      </nav>

      <div className={cn("p-3 border-t border-border space-y-1", collapsed && "px-2")}>
        {canAccessSettings && (
          <Link to="/settings" className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            location.pathname === "/settings" ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}>
            <Settings className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Pengaturan</span>}
          </Link>
        )}
        {!collapsed && (
          <div className="mt-2 px-2">
            <div className="text-[10px] text-muted-foreground font-medium truncate">{user?.full_name || user?.email}</div>
            <div className="text-[10px] text-primary/70 font-medium capitalize">{role?.replace(/_/g, " ")}{userDesa ? ` · ${userDesa}` : ""}{userKelompok ? ` / ${userKelompok}` : ""}</div>
          </div>
        )}

        {/* Logout button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-destructive hover:bg-destructive/10",
              collapsed && "justify-center"
            )}>
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>Keluar</span>}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin keluar dari aplikasi? Anda perlu login kembali untuk mengakses aplikasi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => base44.auth.logout()}
              >
                Ya, Keluar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!collapsed && <div className="text-[10px] text-muted-foreground text-center pt-1">© 2026 {config.org_name}</div>}
      </div>
    </aside>
  );
}