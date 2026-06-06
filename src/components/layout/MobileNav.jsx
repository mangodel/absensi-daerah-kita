import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, Bell, FileBarChart, Settings, FolderOpen, LogOut, ScanLine, UserCircle } from "lucide-react";
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
  const [tabStacks, setTabStacks] = useState({});

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
    { label: "Portal", icon: UserCircle, path: "/jamaah" },
    ...(canAccessSettings ? [{ label: "Setelan", icon: Settings, path: "/settings" }] : []),
  ];

  // Handle tab press with stack reset on double-tap (no full reload)
  const handleTabPress = (path) => {
    const currentPath = location.pathname;
    const isCurrentTab = currentPath === path || currentPath.startsWith(path + '/');
    
    if (isCurrentTab && tabStacks[path]) {
      // Double tap: reset stack by navigating to root of this tab (React Router handles it)
      setTabStacks(prev => ({ ...prev, [path]: false }));
    } else if (!isCurrentTab) {
      // New tab: save as current
      setTabStacks(prev => ({ ...prev, [path]: true }));
    }
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 w-full safe-area-inset-bottom overflow-hidden">
        <div className="overflow-x-auto flex items-center h-20 px-1 gap-0.5 w-full scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link 
                 key={item.path} 
                 to={item.path} 
                 onClick={(e) => {
                    if (isActive) {
                      e.preventDefault();
                      handleTabPress(item.path);
                    } else {
                      handleTabPress(item.path);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 min-w-max px-2",
                    isActive ? "text-primary" : "text-gray-500"
                  )}
                >
                 <item.icon className="w-5 h-5" />
                 <span className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">{item.label}</span>
                 {item.badge > 0 && (
                   <span className="absolute top-1 right-1 w-5 h-5 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
                     {item.badge}
                   </span>
                 )}
               </Link>
             );
           })}
          <button
            onClick={() => setShowLogout(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-2 min-w-max px-2 text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">Keluar</span>
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
              onClick={() => {
                base44.auth.logout();
                window.location.href = "/login";
              }}
            >
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}