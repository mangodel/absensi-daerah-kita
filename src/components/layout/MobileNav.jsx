import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, Bell, FileBarChart, Settings, FolderOpen, LogOut, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isToday, isPast } from "date-fns";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MobileNav() {
  const location = useLocation();
  const { canAccessSettings, isSuperAdmin, isAdminDesa } = useUserRole();
  const [showLogout, setShowLogout] = useState(false);

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
    { label: "Dokumen", icon: FolderOpen, path: "/documents" },
    { label: "Absensi Event", icon: ScanLine, path: "/event-attendance" },
    { label: "Pengingat", icon: Bell, path: "/reminders", badge: urgentCount },
    ...(canAccessSettings ? [{ label: "Setelan", icon: Settings, path: "/settings" }] : []),
  ];
  // Limit to 5 items + logout to avoid overflow; show most important first
  const visibleNavItems = navItems.slice(0, 5);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-1 py-1 safe-area-pb">
        <div className="flex justify-around overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[9px] font-medium transition-colors relative shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="w-5 h-5" />
                <span className="truncate max-w-[40px] text-center">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setShowLogout(true)}
            className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[9px] font-medium transition-colors text-destructive shrink-0"
          >
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      </nav>

      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
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
    </>
  );
}