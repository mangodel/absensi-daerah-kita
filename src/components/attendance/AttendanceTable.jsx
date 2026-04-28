import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ATTENDANCE_STATUS_LIST } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  "Hadir": "bg-accent/10 text-accent border-accent/20",
  "Izin Sekolah": "bg-blue-50 text-blue-600 border-blue-200",
  "Izin Kerja": "bg-orange-50 text-orange-600 border-orange-200",
  "Alpa": "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AttendanceTable({ members, attendanceData, onStatusChange }) {
  if (members.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Pilih desa/kelompok untuk menampilkan anggota.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="font-semibold text-xs w-8">#</TableHead>
              <TableHead className="font-semibold text-xs">Nama</TableHead>
              <TableHead className="font-semibold text-xs">Kelompok</TableHead>
              <TableHead className="font-semibold text-xs">Status Kehadiran</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, idx) => (
              <TableRow key={member.id} className="hover:bg-secondary/30 transition-colors">
                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{member.full_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.kelompok}</TableCell>
                <TableCell>
                  <Select
                    value={attendanceData[member.id] || ""}
                    onValueChange={(v) => onStatusChange(member.id, v)}
                  >
                    <SelectTrigger className="w-44 h-8">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUS_LIST.map(s => (
                        <SelectItem key={s} value={s}>
                          <Badge variant="outline" className={`${statusColors[s]} text-xs`}>{s}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}