import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, CheckCircle, Users } from "lucide-react";
import { useAppConfig } from "@/lib/AppConfigContext";
import { DAPUKAN_LIST } from "@/lib/constants";

function generateParticipantId(existing) {
  const maxNum = existing.reduce((max, p) => {
    const num = parseInt((p.participant_id || "AUNZ000000").replace("AUNZ", ""), 10);
    return num > max ? num : max;
  }, 0);
  return `AUNZ${String(maxNum + 1).padStart(6, "0")}`;
}

export default function MemberImport({ eventId, participants, onImported }) {
  const qc = useQueryClient();
  const { config } = useAppConfig();
  const desaKelompokMap = config.desa_kelompok_map || {};
  const desaList = Object.keys(desaKelompokMap);

  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [filterDapukan, setFilterDapukan] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const kelompokList = filterDesa !== "all" ? (desaKelompokMap[filterDesa] || []) : [];
  const existingIds = new Set(participants.map(p => p.notes).filter(Boolean)); // store member_id in notes or match by name

  const filtered = useMemo(() => {
    return members.filter(m => {
      if (filterDesa !== "all" && m.desa !== filterDesa) return false;
      if (filterKelompok !== "all" && m.kelompok !== filterKelompok) return false;
      if (filterDapukan !== "all" && m.dapukan !== filterDapukan) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.full_name?.toLowerCase().includes(q) || m.kelompok?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [members, filterDesa, filterKelompok, filterDapukan, search]);

  // Which members are already registered
  const alreadyRegistered = new Set(
    participants.map(p => p.notes).filter(Boolean)
  );

  const toggleAll = () => {
    const unregistered = filtered.filter(m => !alreadyRegistered.has(m.id));
    if (selected.size === unregistered.length && unregistered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unregistered.map(m => m.id)));
    }
  };

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (!eventId || selected.size === 0) return;
    setImporting(true);
    const existing = participants;
    const toImport = members.filter(m => selected.has(m.id));
    let counter = existing.length;
    const maxNum = existing.reduce((max, p) => {
      const num = parseInt((p.participant_id || "AUNZ000000").replace("AUNZ", ""), 10);
      return num > max ? num : max;
    }, 0);

    const records = toImport.map((m) => {
      return {
        full_name: m.full_name,
        phone: m.phone || "",
        organization: `${m.desa || ""} / ${m.kelompok || ""}`,
        event_id: eventId,
        participant_id: m.member_id, // Use actual member_id from database
        qr_code_value: m.member_id,
        registration_date: new Date().toISOString(),
        attendance_status: "Absent",
        is_database_member: true, // Mark as database member
        notes: m.id, // store member db id for reference
      };
    });

    await base44.entities.EventParticipant.bulkCreate(records);
    qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
    setSelected(new Set());
    setImporting(false);
    if (onImported) onImported(records.length);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Desa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Desa</SelectItem>
            {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterKelompok} onValueChange={setFilterKelompok} disabled={filterDesa === "all"}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Kelompok" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelompok</SelectItem>
            {kelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterDapukan} onValueChange={setFilterDapukan}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Dapukan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Dapukan</SelectItem>
            {DAPUKAN_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input className="pl-7 h-8 text-xs" placeholder="Cari nama..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Select All + Import Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={toggleAll} className="text-xs text-primary hover:underline">
            {selected.size === filtered.filter(m => !alreadyRegistered.has(m.id)).length && selected.size > 0
              ? "Batal Semua" : "Pilih Semua"}
          </button>
          {selected.size > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              {selected.size} dipilih
            </Badge>
          )}
        </div>
        <Button size="sm" disabled={selected.size === 0 || importing} onClick={handleImport}>
          <UserPlus className="w-3.5 h-3.5 mr-1" />
          {importing ? "Mengimpor..." : `Import ${selected.size > 0 ? selected.size : ""} Peserta`}
        </Button>
      </div>

      {/* Member List */}
      <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
        {filtered.map(m => {
          const isReg = alreadyRegistered.has(m.id);
          const isSel = selected.has(m.id);
          return (
            <div
              key={m.id}
              onClick={() => !isReg && toggle(m.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
                ${isReg ? "opacity-50 cursor-default bg-secondary/20 border-border" :
                  isSel ? "bg-primary/10 border-primary/30" : "bg-card border-border hover:bg-secondary/30"}`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                ${isReg ? "bg-accent/20 border-accent" : isSel ? "bg-primary border-primary" : "border-border"}`}>
                {isReg && <CheckCircle className="w-3 h-3 text-accent" />}
                {isSel && !isReg && <div className="w-2.5 h-2.5 rounded-sm bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{m.full_name}</p>
                <p className="text-xs text-muted-foreground">{m.desa} / {m.kelompok} · {m.dapukan || "Jamaah"}</p>
              </div>
              {isReg && <Badge variant="outline" className="text-xs text-accent border-accent/30 shrink-0">Terdaftar</Badge>}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Tidak ada jamaah ditemukan.</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">{filtered.length} jamaah ditemukan</p>
    </div>
  );
}