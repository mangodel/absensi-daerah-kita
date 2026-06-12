import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRightLeft, ArrowRight, Plus, Search, Users, UserCheck } from "lucide-react";
import { useAppConfig } from "@/lib/AppConfigContext";
import { format, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Transfers() {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Multi-select state
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [filterKK, setFilterKK] = useState("all");
  const [searchTransfer, setSearchTransfer] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const [toDesa, setToDesa] = useState("");
  const [toKelompok, setToKelompok] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [searchHistory, setSearchHistory] = useState("");
   const [filterHistoryDesa, setFilterHistoryDesa] = useState("all");
   const [filterHistoryKelompok, setFilterHistoryKelompok] = useState("all");
   const [activeTab, setActiveTab] = useState("new");

  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => base44.entities.TransferHistory.list("-created_date"),
  });

  // --- Transfer dialog: filter members ---
  const filterKelompokOptions = filterDesa !== "all" ? (config.desa_kelompok_map || {})[filterDesa] || [] : [];
  const allKKOptions = useMemo(() => {
    const base = filterDesa !== "all" ? members.filter(m => m.desa === filterDesa) : members;
    const kkSet = [...new Set(base.map(m => m.family_group).filter(Boolean))].sort();
    return kkSet;
  }, [members, filterDesa]);

  const filteredMembersForTransfer = useMemo(() => members.filter(m => {
    if (filterDesa !== "all" && m.desa !== filterDesa) return false;
    if (filterKelompok !== "all" && m.kelompok !== filterKelompok) return false;
    if (filterKK !== "all" && m.family_group !== filterKK) return false;
    if (searchTransfer) {
      const q = searchTransfer.toLowerCase();
      if (!m.full_name?.toLowerCase().includes(q) && !m.kelompok?.toLowerCase().includes(q) && !m.desa?.toLowerCase().includes(q) && !m.family_group?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [members, filterDesa, filterKelompok, filterKK, searchTransfer]);

  // --- History filter ---
  const historyDesaList = [...new Set([...transfers.map(t => t.from_desa), ...transfers.map(t => t.to_desa)].filter(Boolean))].sort();
  const historyKelompokList = [...new Set([...transfers.map(t => t.from_kelompok), ...transfers.map(t => t.to_kelompok)].filter(Boolean))].sort();

  // Filter for recent transfers (current month + previous month)
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const currentMonthEnd = endOfMonth(now);

  const recentTransfers = transfers.filter(t => {
    if (!t.transfer_date) return false;
    const tDate = new Date(t.transfer_date);
    return isWithinInterval(tDate, { start: prevMonthStart, end: currentMonthEnd });
  });

  const filteredTransfers = transfers.filter(t => {
    if (searchHistory) {
      const q = searchHistory.toLowerCase();
      if (!t.member_name?.toLowerCase().includes(q) && !t.from_kelompok?.toLowerCase().includes(q) && !t.to_kelompok?.toLowerCase().includes(q) && !t.from_desa?.toLowerCase().includes(q) && !t.to_desa?.toLowerCase().includes(q)) return false;
    }
    if (filterHistoryDesa !== "all") {
      if (t.from_desa !== filterHistoryDesa && t.to_desa !== filterHistoryDesa) return false;
    }
    if (filterHistoryKelompok !== "all") {
      if (t.from_kelompok !== filterHistoryKelompok && t.to_kelompok !== filterHistoryKelompok) return false;
    }
    return true;
  });

  // Sort by desa, then kelompok
  const sortByDesaKelompok = (a, b) => {
    const aDesa = a.to_desa || a.from_desa;
    const bDesa = b.to_desa || b.from_desa;
    if (aDesa !== bDesa) return (aDesa || "").localeCompare(bDesa || "");
    const aKel = a.to_kelompok || a.from_kelompok;
    const bKel = b.to_kelompok || b.from_kelompok;
    return (aKel || "").localeCompare(bKel || "");
  };

  const recentTransfersSorted = [...recentTransfers].sort(sortByDesaKelompok);

  const toKelompokOptions = toDesa ? (config.desa_kelompok_map || {})[toDesa] || [] : [];

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (selectedIds.length === filteredMembersForTransfer.length) setSelectedIds([]);
    else setSelectedIds(filteredMembersForTransfer.map(m => m.id));
  };

  // Select whole KK
  const selectKK = (kkName) => {
    const ids = filteredMembersForTransfer.filter(m => m.family_group === kkName).map(m => m.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...ids])]);
  };

  const handleTransfer = async () => {
    if (!selectedIds.length || !toDesa || !toKelompok) return;
    setSaving(true);
    const selectedMembers = members.filter(m => selectedIds.includes(m.id));
    await Promise.all(selectedMembers.map(async (m) => {
      await base44.entities.TransferHistory.create({
        member_id: m.id,
        member_name: m.full_name,
        from_desa: m.desa,
        from_kelompok: m.kelompok,
        to_desa: toDesa,
        to_kelompok: toKelompok,
        transfer_date: new Date().toISOString().split("T")[0],
        reason,
      });
      await base44.entities.Member.update(m.id, { desa: toDesa, kelompok: toKelompok });
    }));
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["transfers"] });
    setSaving(false);
    setDialogOpen(false);
    setSelectedIds([]);
    setToDesa("");
    setToKelompok("");
    setReason("");
  };

  const resetDialog = () => {
    setSelectedIds([]);
    setFilterDesa("all");
    setFilterKelompok("all");
    setFilterKK("all");
    setSearchTransfer("");
    setToDesa("");
    setToKelompok("");
    setReason("");
  };

  // Group filtered members by KK for display
  const groupedByKK = useMemo(() => {
    const map = {};
    filteredMembersForTransfer.forEach(m => {
      const kk = m.family_group || "__noKK__";
      if (!map[kk]) map[kk] = [];
      map[kk].push(m);
    });
    return map;
  }, [filteredMembersForTransfer]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" /> {pt.transfers || "Pindah Kelompok"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pt.transfers_subtitle || "Tracking perpindahan anggota lintas desa/kelompok"}</p>
        </div>
        <Button onClick={() => { resetDialog(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Pindahkan Anggota
        </Button>
      </div>

      {/* Tabs: Baru vs History */}
       <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
         <TabsList className="grid w-full sm:w-80 grid-cols-2">
           <TabsTrigger value="new">Baru ({transfers.length})</TabsTrigger>
           <TabsTrigger value="history">Riwayat Bulan Ini ({recentTransfers.length})</TabsTrigger>
         </TabsList>

         {/* Baru Tab */}
         <TabsContent value="new" className="space-y-4">
           {/* Search + filter history */}
           <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input placeholder="Cari nama, desa, atau kelompok..." className="pl-10" value={searchHistory} onChange={e => setSearchHistory(e.target.value)} />
             </div>
             <Select value={filterHistoryDesa} onValueChange={v => { setFilterHistoryDesa(v); setFilterHistoryKelompok("all"); }}>
               <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter Desa" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Semua Desa</SelectItem>
                 {historyDesaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
               </SelectContent>
             </Select>
             <Select value={filterHistoryKelompok} onValueChange={setFilterHistoryKelompok}>
               <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Filter Kelompok" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Semua Kelompok</SelectItem>
                 {historyKelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
               </SelectContent>
             </Select>
           </div>

           {transfers.length === 0 ? (
             <div className="bg-card rounded-2xl border border-border p-12 text-center">
               <p className="text-muted-foreground">Belum ada riwayat perpindahan.</p>
             </div>
           ) : (
             <div className="bg-card rounded-2xl border border-border overflow-hidden">
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                     <TableRow className="bg-secondary/50">
                       <TableHead className="font-semibold text-xs">Nama</TableHead>
                       <TableHead className="font-semibold text-xs">Dari</TableHead>
                       <TableHead className="font-semibold text-xs"></TableHead>
                       <TableHead className="font-semibold text-xs">Ke</TableHead>
                       <TableHead className="font-semibold text-xs">Tanggal</TableHead>
                       <TableHead className="font-semibold text-xs">Alasan</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredTransfers.map(t => (
                       <TableRow key={t.id} className="hover:bg-secondary/30">
                         <TableCell className="font-medium">{t.member_name}</TableCell>
                         <TableCell>
                           <div className="text-xs">
                             <span className="text-muted-foreground">{t.from_desa}</span>
                             <br />
                             <Badge variant="outline" className="text-[10px] mt-0.5">{t.from_kelompok}</Badge>
                           </div>
                         </TableCell>
                         <TableCell><ArrowRight className="w-4 h-4 text-primary" /></TableCell>
                         <TableCell>
                           <div className="text-xs">
                             <span className="text-muted-foreground">{t.to_desa}</span>
                             <br />
                             <Badge variant="outline" className="text-[10px] mt-0.5 border-primary/30 text-primary">{t.to_kelompok}</Badge>
                           </div>
                         </TableCell>
                         <TableCell className="text-xs text-muted-foreground">
                           {t.transfer_date ? format(new Date(t.transfer_date), "dd MMM yyyy") : "-"}
                         </TableCell>
                         <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{t.reason || "-"}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             </div>
           )}
         </TabsContent>

         {/* History Tab */}
         <TabsContent value="history" className="space-y-4">
           {recentTransfers.length === 0 ? (
             <div className="bg-card rounded-2xl border border-border p-12 text-center">
               <p className="text-muted-foreground">Belum ada perpindahan bulan lalu atau bulan ini.</p>
             </div>
           ) : (
             <div className="bg-card rounded-2xl border border-border overflow-hidden">
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                     <TableRow className="bg-secondary/50">
                       <TableHead className="font-semibold text-xs">Nama</TableHead>
                       <TableHead className="font-semibold text-xs">Dari</TableHead>
                       <TableHead className="font-semibold text-xs"></TableHead>
                       <TableHead className="font-semibold text-xs">Ke</TableHead>
                       <TableHead className="font-semibold text-xs">Tanggal</TableHead>
                       <TableHead className="font-semibold text-xs">Alasan</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {recentTransfersSorted.map(t => (
                       <TableRow key={t.id} className="hover:bg-secondary/30">
                         <TableCell className="font-medium">{t.member_name}</TableCell>
                         <TableCell>
                           <div className="text-xs">
                             <span className="text-muted-foreground">{t.from_desa}</span>
                             <br />
                             <Badge variant="outline" className="text-[10px] mt-0.5">{t.from_kelompok}</Badge>
                           </div>
                         </TableCell>
                         <TableCell><ArrowRight className="w-4 h-4 text-primary" /></TableCell>
                         <TableCell>
                           <div className="text-xs">
                             <span className="text-muted-foreground">{t.to_desa}</span>
                             <br />
                             <Badge variant="outline" className="text-[10px] mt-0.5 border-primary/30 text-primary">{t.to_kelompok}</Badge>
                           </div>
                         </TableCell>
                         <TableCell className="text-xs text-muted-foreground">
                           {t.transfer_date ? format(new Date(t.transfer_date), "dd MMM yyyy") : "-"}
                         </TableCell>
                         <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{t.reason || "-"}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             </div>
           )}
         </TabsContent>
       </Tabs>

      {/* Transfer Dialog — multi select */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetDialog(); setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Pindahkan Anggota
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); setFilterKK("all"); setSelectedIds([]); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Desa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Desa</SelectItem>
                  {(config.desa_list || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKelompok} onValueChange={v => { setFilterKelompok(v); setSelectedIds([]); }} disabled={filterDesa === "all"}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Kelompok" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelompok</SelectItem>
                  {filterKelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKK} onValueChange={v => { setFilterKK(v); setSelectedIds([]); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua KK" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua KK</SelectItem>
                  {allKKOptions.map(kk => <SelectItem key={kk} value={kk}>{kk}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Cari nama..." className="pl-7 h-8 text-xs" value={searchTransfer} onChange={e => setSearchTransfer(e.target.value)} />
              </div>
            </div>

            {/* Member list grouped by KK */}
            <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              {/* Header row */}
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border sticky top-0">
                <Checkbox
                  checked={filteredMembersForTransfer.length > 0 && selectedIds.length === filteredMembersForTransfer.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs font-semibold text-muted-foreground">Pilih Semua ({filteredMembersForTransfer.length} anggota)</span>
                {selectedIds.length > 0 && (
                  <Badge className="ml-auto bg-primary text-primary-foreground text-xs">{selectedIds.length} dipilih</Badge>
                )}
              </div>

              {filteredMembersForTransfer.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">Tidak ada anggota ditemukan.</div>
              )}

              {Object.entries(groupedByKK).map(([kk, kkMembers]) => {
                const kkSelected = kkMembers.every(m => selectedIds.includes(m.id));
                const kkPartial = !kkSelected && kkMembers.some(m => selectedIds.includes(m.id));
                return (
                  <div key={kk}>
                    {kk !== "__noKK__" && (
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border-b border-border cursor-pointer hover:bg-primary/10"
                        onClick={() => selectKK(kk)}
                      >
                        <Checkbox
                          checked={kkSelected}
                          data-state={kkPartial ? "indeterminate" : kkSelected ? "checked" : "unchecked"}
                          onCheckedChange={() => selectKK(kk)}
                          onClick={e => e.stopPropagation()}
                        />
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">KK: {kk}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{kkMembers.length} anggota</span>
                      </div>
                    )}
                    {kkMembers.map(m => (
                      <div
                        key={m.id}
                        className={`flex items-center gap-2 px-3 py-2 border-b border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors ${selectedIds.includes(m.id) ? "bg-primary/5" : ""}`}
                        onClick={() => toggleSelect(m.id)}
                      >
                        <Checkbox
                          checked={selectedIds.includes(m.id)}
                          onCheckedChange={() => toggleSelect(m.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">{m.desa} / {m.kelompok}</p>
                        </div>
                        {m.gender && (
                          <Badge variant="outline" className="text-[10px] shrink-0">{m.gender}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Destination */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Desa Tujuan *</Label>
                <Select value={toDesa} onValueChange={v => { setToDesa(v); setToKelompok(""); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
                  <SelectContent>
                    {(config.desa_list || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kelompok Tujuan *</Label>
                <Select value={toKelompok} onValueChange={setToKelompok} disabled={!toDesa}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelompok" /></SelectTrigger>
                  <SelectContent>
                    {toKelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Alasan Pindah</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Opsional" />
            </div>

            {selectedIds.length > 0 && toDesa && toKelompok && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary">
                <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                {selectedIds.length} anggota akan dipindahkan ke {toDesa} / {toKelompok}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { resetDialog(); setDialogOpen(false); }}>Batal</Button>
              <Button onClick={handleTransfer} disabled={!selectedIds.length || !toDesa || !toKelompok || saving}>
                {saving ? "Memproses..." : `Pindahkan (${selectedIds.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}