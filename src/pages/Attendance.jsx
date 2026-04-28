import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DESA_LIST, KELOMPOK_LIST, ATTENDANCE_STATUS_LIST, MONTHS } from "@/lib/constants";
import { CalendarCheck, Save, Loader2 } from "lucide-react";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import AttendanceHistory from "@/components/attendance/AttendanceHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Attendance() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewYear, setViewYear] = useState(String(currentYear));
  const [viewMonth, setViewMonth] = useState(String(currentMonth));

  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances"],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const activeMembers = members.filter(m => m.status === "Aktif");
  const filteredMembers = activeMembers.filter(m => {
    const matchDesa = filterDesa === "all" || m.desa === filterDesa;
    const matchKelompok = filterKelompok === "all" || m.kelompok === filterKelompok;
    return matchDesa && matchKelompok;
  });

  const handleStatusChange = (memberId, status) => {
    setAttendanceData(prev => ({ ...prev, [memberId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const records = Object.entries(attendanceData).map(([memberId, status]) => {
      const member = members.find(m => m.id === memberId);
      return {
        member_id: memberId,
        member_name: member?.full_name || "",
        desa: member?.desa || "",
        kelompok: member?.kelompok || "",
        date,
        status,
        month,
        year,
      };
    });

    if (records.length > 0) {
      await base44.entities.Attendance.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      setAttendanceData({});
    }
    setSaving(false);
  };

  const filledCount = Object.keys(attendanceData).length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" /> Absensi
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola kehadiran anggota</p>
        </div>
      </div>

      <Tabs defaultValue="input">
        <TabsList>
          <TabsTrigger value="input">Input Absensi</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
            <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Desa</SelectItem>
                {DESA_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterKelompok} onValueChange={setFilterKelompok}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelompok</SelectItem>
                {KELOMPOK_LIST.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving || filledCount === 0} className="ml-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Simpan ({filledCount})
            </Button>
          </div>

          <AttendanceTable
            members={filteredMembers}
            attendanceData={attendanceData}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <Select value={viewMonth} onValueChange={setViewMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={viewYear} onValueChange={setViewYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AttendanceHistory
            attendances={attendances}
            members={members}
            month={Number(viewMonth)}
            year={Number(viewYear)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}