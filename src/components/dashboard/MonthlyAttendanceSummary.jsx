import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/lib/useUserRole";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, Users } from "lucide-react";
import { MONTHS } from "@/lib/constants";
import { isAdult } from "@/lib/ageUtils";

export default function MonthlyAttendanceSummary() {
  const { config } = useAppConfig();
  const { isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();
  const desaKelompokMap = config.desa_kelompok_map || {};

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor((month - 1) / 3) + 1);

  const { data: allMembers = [] } = useQuery({ queryKey: ["members"], queryFn: () => base44.entities.Member.list() });
  const { data: allAttendances = [] } = useQuery({ queryKey: ["attendances"], queryFn: () => base44.entities.Attendance.list() });

  const year = new Date().getFullYear();
  
  // Tentukan bulan untuk laporan
  const reportMonths = quarter === 1 ? [1, 2, 3] : quarter === 2 ? [4, 5, 6] : quarter === 3 ? [7, 8, 9] : [10, 11, 12];
  
  const stats = useMemo(() => {
    // Filter berdasarkan role
    let relevantMembers = allMembers.filter(m => m.status === "Aktif" && isAdult(m));
    
    if (isAdminKelompok && userKelompok) {
      relevantMembers = relevantMembers.filter(m => m.kelompok === userKelompok);
    } else if (isAdminDesa && userDesa) {
      relevantMembers = relevantMembers.filter(m => m.desa === userDesa);
    }

    const relevantAtts = allAttendances.filter(a => 
      reportMonths.includes(a.month) && a.year === year
    );

    const memberStats = relevantMembers.map(member => {
      const memberAtts = relevantAtts.filter(a => a.member_id === member.id);
      const hadir = memberAtts.filter(a => a.status === "Hadir").length;
      const total = memberAtts.length;
      const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;

      return {
        ...member,
        hadir,
        total,
        rate,
        attendance_records: memberAtts,
      };
    });

    // Kelompokkan per kelompok
    const groupedByKelompok = {};
    memberStats.forEach(ms => {
      const key = ms.kelompok;
      if (!groupedByKelompok[key]) {
        groupedByKelompok[key] = [];
      }
      groupedByKelompok[key].push(ms);
    });

    return Object.entries(groupedByKelompok).map(([kelompok, members]) => {
      // Urutin berdasarkan tingkat kehadiran: jarang hadir dulu (< 50%)
      const sorted = [...members].sort((a, b) => {
        // Prioritas: 0 kehadiran, < 50%, >= 50%
        const aPriority = a.total === 0 ? 3 : a.rate < 50 ? 2 : 1;
        const bPriority = b.total === 0 ? 3 : b.rate < 50 ? 2 : 1;
        if (aPriority !== bPriority) return bPriority - aPriority;
        return a.rate - b.rate;
      });

      return {
        kelompok,
        members: sorted,
        totalMembers: members.length,
        totalHadir: members.reduce((s, m) => s + m.hadir, 0),
        totalRecords: members.reduce((s, m) => s + m.total, 0),
        lowAttendanceCount: members.filter(m => m.total > 0 && m.rate < 50).length,
        noAttendanceCount: members.filter(m => m.total === 0).length,
      };
    });
  }, [allMembers, allAttendances, year, reportMonths, isAdminKelompok, isAdminDesa, userKelompok, userDesa]);

  if (stats.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 text-center">
        <AlertCircle className="w-5 h-5 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground">Tidak ada data kehadiran untuk periode ini</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          Ringkasan Kehadiran Bulanan
        </h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={`px-2 py-1 text-xs rounded-lg font-medium transition-all ${
                quarter === q
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              T{q}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {stats.map(({ kelompok, members, lowAttendanceCount, noAttendanceCount }) => (
          <div key={kelompok} className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{kelompok}</p>
              <div className="flex gap-2">
                {noAttendanceCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                    {noAttendanceCount} Tidak Hadir
                  </Badge>
                )}
                {lowAttendanceCount > 0 && (
                  <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">
                    {lowAttendanceCount} Jarang
                  </Badge>
                )}
              </div>
            </div>

            {/* Anggota dengan kehadiran rendah */}
            {members.filter(m => m.total === 0 || m.rate < 50).length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-border">
                {members.filter(m => m.total === 0 || m.rate < 50).slice(0, 3).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{member.full_name}</p>
                      {member.total === 0 && (
                        <p className="text-[10px] text-destructive font-medium">Belum ada absensi</p>
                      )}
                      {member.total > 0 && (
                        <p className="text-[10px] text-muted-foreground">{member.hadir}/{member.total} hadir</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        member.total === 0
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : member.rate < 50
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-accent/10 text-accent border-accent/20"
                      }`}
                    >
                      {member.total === 0 ? "0%" : `${member.rate}%`}
                    </Badge>
                  </div>
                ))}
                {members.filter(m => m.total === 0 || m.rate < 50).length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    +{members.filter(m => m.total === 0 || m.rate < 50).length - 3} lainnya
                  </p>
                )}
              </div>
            )}

            {members.filter(m => m.total === 0 || m.rate < 50).length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-1">Semua anggota aktif hadir</p>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <a href="/reports" className="text-xs text-primary hover:underline font-medium">
          Lihat laporan lengkap →
        </a>
      </div>
    </div>
  );
}