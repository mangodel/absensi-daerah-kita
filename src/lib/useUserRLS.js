import { useAuth } from "@/lib/AuthContext";
import { useAppConfig } from "@/lib/AppConfigContext";

/**
 * Hook untuk filter data member berdasarkan role + desa/kelompok user
 * - super_admin: lihat semua
 * - admin_desa: lihat anggota desanya + semua kelompok di desa itu
 * - admin_kelompok: lihat anggota kelompok itu saja
 * - user: tidak ada akses
 */
export const useUserRLS = () => {
  const { user } = useAuth();
  const { config } = useAppConfig();

  // Filter members berdasarkan role user
  const filterMembers = (members) => {
    if (!members) return [];
    if (user?.role === "super_admin" || user?.role === "admin") return members;

    if (user?.role === "admin_desa") {
      // Admin desa lihat semua anggota di desanya
      return members.filter(m => m.desa === user?.desa);
    }

    if (user?.role === "admin_kelompok") {
      // Admin kelompok lihat anggota kelompoknya saja
      return members.filter(m => m.desa === user?.desa && m.kelompok === user?.kelompok);
    }

    // User biasa tidak ada akses
    return [];
  };

  // Filter events berdasarkan scope user
  const filterEvents = (events) => {
    if (!events) return [];
    if (user?.role === "super_admin" || user?.role === "admin") return events;

    if (user?.role === "admin_desa") {
      // Admin desa lihat event desa level + kelompok di desa itu
      return events.filter(e => 
        (e.level === "Desa" && e.desa === user?.desa) ||
        (e.level === "Kelompok" && e.desa === user?.desa)
      );
    }

    if (user?.role === "admin_kelompok") {
      // Admin kelompok lihat event kelompok itu saja + event desa
      return events.filter(e => 
        (e.level === "Desa" && e.desa === user?.desa) ||
        (e.level === "Kelompok" && e.desa === user?.desa && e.kelompok === user?.kelompok)
      );
    }

    return [];
  };

  // Filter attendance records berdasarkan scope user
  const filterAttendance = (records) => {
    if (!records) return [];
    if (user?.role === "super_admin" || user?.role === "admin") return records;

    if (user?.role === "admin_desa") {
      return records.filter(r => r.desa === user?.desa);
    }

    if (user?.role === "admin_kelompok") {
      return records.filter(r => r.desa === user?.desa && r.kelompok === user?.kelompok);
    }

    return [];
  };

  // Filter documents berdasarkan scope
  const filterDocuments = (docs) => {
    if (!docs) return [];
    if (user?.role === "super_admin" || user?.role === "admin") return docs;

    return docs.filter(d => {
      if (d.scope === "Semua") return true;
      if (d.scope === "Desa" && d.target_desa === user?.desa) return true;
      if (d.scope === "Kelompok" && d.target_desa === user?.desa && d.target_kelompok === user?.kelompok) return true;
      return false;
    });
  };

  // Filter surveys berdasarkan scope
  const filterSurveys = (surveys) => {
    if (!surveys) return [];
    if (user?.role === "super_admin" || user?.role === "admin") return surveys;

    return surveys.filter(s => {
      if (s.target_scope === "Semua") return true;
      if (s.target_scope === "Desa" && s.target_desa === user?.desa) return true;
      if (s.target_scope === "Kelompok" && s.target_desa === user?.desa) return true;
      return false;
    });
  };

  // Get allowed desa list untuk filter UI
  const getAllowedDesaList = () => {
    if (user?.role === "super_admin" || user?.role === "admin") {
      return Object.keys(config.desa_kelompok_map || {});
    }
    if (user?.desa) {
      return [user.desa];
    }
    return [];
  };

  // Get allowed kelompok list untuk filter UI
  const getAllowedKelompokList = () => {
    if (user?.role === "super_admin" || user?.role === "admin") {
      return [];
    }
    if (user?.role === "admin_desa" && user?.desa) {
      return config.desa_kelompok_map?.[user.desa] || [];
    }
    if (user?.role === "admin_kelompok" && user?.kelompok) {
      return [user.kelompok];
    }
    return [];
  };

  return {
    filterMembers,
    filterEvents,
    filterAttendance,
    filterDocuments,
    filterSurveys,
    getAllowedDesaList,
    getAllowedKelompokList,
    hasAccess: user?.role && ["admin", "super_admin", "admin_desa", "admin_kelompok"].includes(user.role),
  };
};