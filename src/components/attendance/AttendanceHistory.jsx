import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MONTHS } from "@/lib/constants";
import { format } from "date-fns";

const statusColors = {
  "Hadir": "bg-accent/10 text-accent border-accent/20",
  "Izin Sekolah": "bg-blue-50 text-blue-600 border-blue-200",
  "Izin Kerja": "bg-orange-50 text-orange-600 border-orange-200",
  "Alpa": "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AttendanceHistory({ attendances, members, month, year }) {
  const monthRecords = attendances.filter(a => a.month === month && a.year === year);

  // Group by member
  const memberMap = {};
  monthRecords.forEach(a => {
    if (!memberMap[a.member_id]) {
      memberMap[a.member_id] = { name: a.member_name, kelompok: a.kelompok, records: [] };
    }
    memberMap[a.member_id].records.push(a);
  });

  const entries = Object.entries(memberMap);

  if (entries.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Belum ada data absensi untuk {MONTHS[month - 1]} {year}.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Riwayat Absensi — {MONTHS[month - 1]} {year}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{monthRecords.length} record dari {entries.length} anggota</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="font-semibold text-xs">Nama</TableHead>
              <TableHead className="font-semibold text-xs">Kelompok</TableHead>
              <TableHead className="font-semibold text-xs">Tanggal</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.flatMap(([memberId, data]) =>
              data.records.map((record, idx) => (
                <TableRow key={`${memberId}-${idx}`} className="hover:bg-secondary/30">
                  <TableCell className="font-medium">{data.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{data.kelompok}</TableCell>
                  <TableCell className="text-sm">{record.date ? format(new Date(record.date), "dd MMM yyyy") : "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[record.status]}>
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}