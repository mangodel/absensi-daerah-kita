import { useAuth } from "@/lib/AuthContext";

/**
 * Hook untuk mendapatkan role dan scope akses user saat ini.
 * 
 * Roles:
 *   super_admin / admin -> akses semua data
 *   admin_desa          -> akses semua kelompok dalam desanya
 *   admin_kelompok      -> akses kelompoknya saja
 *   user                -> sama dengan admin_kelompok (akses kelompok)
 */
export function useUserRole() {
  const { user } = useAuth();
  const role = user?.role || "user";
  const userDesa = user?.desa || null;
  const userKelompok = user?.kelompok || null;

  const isSuperAdmin = role === "super_admin" || role === "admin";
  const isAdminDesa = role === "admin_desa";
  const isAdminKelompok = role === "admin_kelompok" || role === "user";

  /**
   * Filter members berdasarkan role
   */
  const filterMembers = (members) => {
    if (isSuperAdmin) return members;
    if (isAdminDesa && userDesa) return members.filter(m => m.desa === userDesa);
    if (isAdminKelompok && userKelompok) return members.filter(m => m.kelompok === userKelompok);
    return members;
  };

  /**
   * Filter events berdasarkan role:
   * - super_admin: semua
   * - admin_desa: Daerah + Desa desanya + Kelompok se-desanya
   * - admin_kelompok: Daerah + Desa desanya + Kelompok miliknya
   */
  const filterEvents = (events) => {
    if (isSuperAdmin) return events;
    if (isAdminDesa && userDesa) {
      return events.filter(e =>
        e.level === "Daerah" ||
        (e.level === "Desa" && e.desa === userDesa) ||
        (e.level === "Kelompok" && e.desa === userDesa)
      );
    }
    if (isAdminKelompok) {
      return events.filter(e =>
        e.level === "Daerah" ||
        (e.level === "Desa" && e.desa === userDesa) ||
        (e.level === "Kelompok" && e.kelompok === userKelompok)
      );
    }
    return events;
  };

  /**
   * Apakah user boleh edit/hapus data
   */
  const canEdit = isSuperAdmin || isAdminDesa;
  const canEditKelompok = isSuperAdmin || isAdminDesa || isAdminKelompok;
  const canManageMembers = isSuperAdmin || isAdminDesa || isAdminKelompok;
  const canManageEvents = isSuperAdmin || isAdminDesa;
  const canAccessSettings = isSuperAdmin;

  return {
    role,
    userDesa,
    userKelompok,
    isSuperAdmin,
    isAdminDesa,
    isAdminKelompok,
    filterMembers,
    filterEvents,
    canEdit,
    canEditKelompok,
    canManageMembers,
    canManageEvents,
    canAccessSettings,
  };
}