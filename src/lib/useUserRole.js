import { useAuth } from "@/lib/AuthContext";

/**
 * Hook untuk mendapatkan role dan scope akses user saat ini.
 *
 * Roles:
 *   super_admin / admin -> akses penuh semua data Daerah
 *   admin_desa          -> akses semua kelompok dalam desanya (view terbatas)
 *   admin_kelompok      -> akses kelompoknya saja (view sangat terbatas)
 *   user                -> sama dengan admin_kelompok
 */
export function useUserRole() {
  const { user } = useAuth();
  const role = user?.role || "user";
  const userDesa = user?.desa || null;
  const userKelompok = user?.kelompok || null;

  const isSuperAdmin = role === "super_admin" || role === "admin";
  const isAdminDesa = role === "admin_desa";
  const isAdminKelompok = role === "admin_kelompok";
  const isJamaah = role === "user";

  /** Filter members berdasarkan role */
  const filterMembers = (members) => {
    if (isSuperAdmin) return members;
    if (isAdminDesa && userDesa) return members.filter(m => m.desa === userDesa);
    if (isAdminKelompok && userDesa && userKelompok) return members.filter(m => m.desa === userDesa && m.kelompok === userKelompok);
    return [];
  };

  /**
   * Filter events berdasarkan role:
   * - super_admin: semua
   * - admin_desa: Daerah + Desa desanya + Kelompok se-desanya
   * - admin_kelompok: Daerah + Desa desanya + Kelompok miliknya saja
   */
  /**
   * Aturan visibilitas event:
   * - Daerah: tampil untuk semua level
   * - Desa: tampil untuk admin_desa desanya & semua kelompok dalam desa tsb
   * - Kelompok: hanya tampil untuk kelompok ybs
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
    return [];
  };

  // Permissions
  const canEdit = isSuperAdmin || isAdminDesa;
  const canEditKelompok = isSuperAdmin || isAdminDesa || isAdminKelompok;
  const canManageMembers = isSuperAdmin || isAdminDesa || isAdminKelompok;
  const canAccessSettings = isSuperAdmin;

  // Broadcast: only admins can manage, jamaah cannot
  const canManageBroadcasts = isSuperAdmin || isAdminDesa || isAdminKelompok;

  // Survey: only admins can manage, jamaah cannot
  const canManageSurveys = isSuperAdmin || isAdminDesa || isAdminKelompok;

  // Event management: admin_kelompok hanya bisa buat/edit event Kelompok
  const canManageEvents = isSuperAdmin || isAdminDesa || isAdminKelompok;
  const canManageOnlyKelompokEvents = isAdminKelompok && !isSuperAdmin && !isAdminDesa;

  // Attendance: semua bisa absen, tapi scope terbatas
  const canInputAttendance = true;

  // Reports: semua bisa lihat, scope sesuai role
  const canViewReports = true;

  // Reminders: super_admin & admin_desa bisa manage
  const canManageReminders = isSuperAdmin || isAdminDesa;

  // Transfers: hanya super_admin & admin_desa
  const canManageTransfers = isSuperAdmin || isAdminDesa;

  // Invite users: hanya super_admin
  const canInviteUsers = isSuperAdmin;

  return {
    role,
    userDesa,
    userKelompok,
    isSuperAdmin,
    isAdminDesa,
    isAdminKelompok,
    isJamaah,
    filterMembers,
    filterEvents,
    canEdit,
    canEditKelompok,
    canManageMembers,
    canManageEvents,
    canManageOnlyKelompokEvents,
    canInputAttendance,
    canViewReports,
    canManageReminders,
    canManageTransfers,
    canInviteUsers,
    canAccessSettings,
    canManageBroadcasts,
    canManageSurveys,
  };
}