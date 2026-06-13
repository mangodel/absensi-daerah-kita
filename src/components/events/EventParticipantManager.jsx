import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Trash2, X, Users, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Manages participant_member_ids — a specific list of member IDs for an event.
 * Shows as a collapsible panel inside EventFormDialog.
 *
 * Props:
 *   members: Member[]        — all members from DB
 *   selectedIds: string[]    — current participant_member_ids (DB ids)
 *   onChange: (ids) => void  — update parent form state
 *   eventDesa: string
 *   eventKelompok: string
 *   eventLevel: string
 *   desaList: string[]
 *   desaKelompokMap: object
 */
export default function EventParticipantManager({
  members = [],
  selectedIds = [],
  onChange,
  eventDesa,
  eventKelompok,
  eventLevel,
  desaList = [],
  desaKelompokMap = {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchAdd, setSearchAdd] = useState("");
  const [searchList, setSearchList] = useState("");
  const [filterDesa, setFilterDesa] = useState(eventDesa || "all");
  const [filterKelompok, setFilterKelompok] = useState(eventKelompok || "all");
  const [pendingAdd, setPendingAdd] = useState(new Set()); // member DB ids
  const [selectedRemove, setSelectedRemove] = useState(new Set()); // member DB ids

  const kelompokOptions = filterDesa !== "all" ? desaKelompokMap[filterDesa] || [] : [];

  // Members already in specific list
  const includedMembers = useMemo(
    () => members.filter(m => selectedIds.includes(m.id)),
    [members, selectedIds]
  );

  // Members NOT yet in list, for add dialog
  const availableMembers = useMemo(() => {
    return members.filter(m => {
      if (m.status !== "Aktif") return false;
      if (selectedIds.includes(m.id)) return false;
      if (filterDesa !== "all" && m.desa !== filterDesa) return false;
      if (filterKelompok !== "all" && m.kelompok !== filterKelompok) return false;
      if (searchAdd && !m.full_name?.toLowerCase().includes(searchAdd.toLowerCase())) return false;
      return true;
    });
  }, [members, selectedIds, filterDesa, filterKelompok, searchAdd]);

  const filteredIncluded = useMemo(() =>
    includedMembers.filter(m =>
      !searchList || m.full_name?.toLowerCase().includes(searchList.toLowerCase())
    ),
    [includedMembers, searchList]
  );

  const handleAddConfirm = () => {
    const newIds = [...selectedIds, ...Array.from(pendingAdd)];
    onChange([...new Set(newIds)]);
    setPendingAdd(new Set());
    setShowAddDialog(false);
  };

  const handleRemoveSelected = () => {
    onChange(selectedIds.filter(id => !selectedRemove.has(id)));
    setSelectedRemove(new Set());
  };

  const handleRemoveOne = (id) => {
    onChange(selectedIds.filter(x => x !== id));
    setSelectedRemove(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const togglePending = (id) => {
    setPendingAdd(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const toggleRemove = (id) => {
    setSelectedRemove(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const selectAllAvailable = () => setPendingAdd(new Set(availableMembers.map(m => m.id)));
  const selectAllRemove = () => setSelectedRemove(new Set(filteredIncluded.map(m => m.id)));

  return (
    <div className="border border-border rounded-xl bg-secondary/10">
      {/* Header toggle */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Daftar Spesifik Jamaah
          {selectedIds.length > 0 && (
            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 ml-1">
              {selectedIds.length} dipilih
            </Badge>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {selectedIds.length === 0 ? "Opsional — override filter" : `${selectedIds.length} jamaah`}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Jika terisi, daftar ini <strong>menggantikan</strong> filter cepat/dapukan — hanya jamaah yang ada di sini yang muncul di absensi.
          </p>

          {/* Toolbar */}
          <div className="flex gap-2 flex-wrap">
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => { setSearchAdd(""); setFilterDesa(eventDesa || "all"); setFilterKelompok(eventKelompok || "all"); setShowAddDialog(true); }}>
              <Plus className="w-3.5 h-3.5" /> Tambah dari Database
            </Button>
            {selectedRemove.size > 0 && (
              <Button type="button" size="sm" variant="destructive" className="gap-1" onClick={handleRemoveSelected}>
                <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedRemove.size})
              </Button>
            )}
            {selectedIds.length > 0 && (
              <Button type="button" size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive ml-auto" onClick={() => { onChange([]); setSelectedRemove(new Set()); }}>
                <X className="w-3.5 h-3.5" /> Hapus Semua
              </Button>
            )}
          </div>

          {/* Search included */}
          {selectedIds.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Cari dalam daftar..." value={searchList} onChange={e => setSearchList(e.target.value)} />
            </div>
          )}

          {/* Select all / remove toggle */}
          {filteredIncluded.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={selectedRemove.size === filteredIncluded.length && filteredIncluded.length > 0}
                onCheckedChange={c => c ? selectAllRemove() : setSelectedRemove(new Set())}
              />
              <span className="text-muted-foreground">Pilih semua untuk dihapus</span>
            </div>
          )}

          {/* Included list */}
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filteredIncluded.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {selectedIds.length === 0 ? "Belum ada jamaah spesifik." : "Tidak ada hasil pencarian."}
              </p>
            ) : (
              filteredIncluded.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-card border border-border hover:bg-secondary/20 cursor-pointer"
                  onClick={() => toggleRemove(m.id)}
                >
                  <Checkbox checked={selectedRemove.has(m.id)} onCheckedChange={() => {}} onClick={e => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desa}{m.kelompok ? ` / ${m.kelompok}` : ""} · {m.dapukan || "-"}</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); handleRemoveOne(m.id); }} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* === Add Dialog === */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tambah Jamaah ke Daftar</DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 text-sm" placeholder="Cari nama..." value={searchAdd} onChange={e => setSearchAdd(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Desa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Desa</SelectItem>
                  {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKelompok} onValueChange={setFilterKelompok} disabled={filterDesa === "all"}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Kelompok" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelompok</SelectItem>
                  {kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Select all */}
          <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg text-sm shrink-0">
            <Checkbox
              checked={pendingAdd.size === availableMembers.length && availableMembers.length > 0}
              onCheckedChange={c => c ? selectAllAvailable() : setPendingAdd(new Set())}
            />
            <span className="flex-1 font-medium">Pilih Semua ({availableMembers.length})</span>
            {pendingAdd.size > 0 && <Badge variant="outline">{pendingAdd.size} dipilih</Badge>}
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada jamaah tersedia.</p>
            ) : (
              availableMembers.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 bg-card border border-border rounded-lg hover:bg-secondary/20 cursor-pointer"
                  onClick={() => togglePending(m.id)}
                >
                  <Checkbox checked={pendingAdd.has(m.id)} onCheckedChange={() => {}} onClick={e => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.desa}{m.kelompok ? ` / ${m.kelompok}` : ""} · {m.dapukan || "-"}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => { setPendingAdd(new Set()); setShowAddDialog(false); }}>Batal</Button>
            <Button type="button" onClick={handleAddConfirm} disabled={pendingAdd.size === 0}>
              Tambahkan ({pendingAdd.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}