import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Search, SlidersHorizontal, X, IdCard, Loader2 } from "lucide-react";
import { useAppConfig } from "@/lib/AppConfigContext";
import { VISA_STATUS_LIST, MUBALLIGH_STATUS_LIST, DAPUKAN_LIST, DAPUKAN_4S } from "@/lib/constants";
import MemberFormDialog from "@/components/members/MemberFormDialog";
import CsvUploadDialog from "@/components/members/CsvUploadDialog";
import MemberTable from "@/components/members/MemberTable";
import FamilyGroupView from "@/components/members/FamilyGroupView";
import MemberSummaryBar from "@/components/members/MemberSummaryBar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUserRole } from "@/lib/useUserRole";
import PullToRefresh from "@/components/PullToRefresh";
import { MobileSelect } from "@/components/ui/mobile-select";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Members() {
  const isMobile = useIsMobile();
  const { config } = useAppConfig();
  const pt = config.page_titles || {};
  const desaList = config.desa_list || [];
  const kelompokList = config.kelompok_list || [];
  const { filterMembers, canManageMembers, isSuperAdmin, isAdminDesa, userDesa } = useUserRole();
  const [formOpen, setFormOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");
  const [filterVisa, setFilterVisa] = useState("all");
  const [filterMuballigh, setFilterMuballigh] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBirthYear, setFilterBirthYear] = useState("");
  const [filterDapukan, setFilterDapukan] = useState("all");
  const [filter4S, setFilter4S] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" | "family"

  const queryClient = useQueryClient();
  const [assigningIds, setAssigningIds] = useState(false);

  const { data: allMembers = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });
  const members = filterMembers(allMembers);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Member.create(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["members"] });
      const prevData = queryClient.getQueryData(["members"]);
      queryClient.setQueryData(["members"], old => [...(old || []), { ...newData, id: Date.now().toString() }]);
      return { prevData };
    },
    onError: (err, newData, context) => {
      if (context?.prevData) queryClient.setQueryData(["members"], context.prevData);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["members"] });
      const prevData = queryClient.getQueryData(["members"]);
      queryClient.setQueryData(["members"], old => old?.map(m => m.id === id ? { ...m, ...data } : m) || []);
      return { prevData };
    },
    onError: (err, newData, context) => {
      if (context?.prevData) queryClient.setQueryData(["members"], context.prevData);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); setFormOpen(false); setEditMember(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Member.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["members"] });
      const prevData = queryClient.getQueryData(["members"]);
      queryClient.setQueryData(["members"], old => old?.filter(m => m.id !== id) || []);
      return { prevData };
    },
    onError: (err, id, context) => {
      if (context?.prevData) queryClient.setQueryData(["members"], context.prevData);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); setDeleteMember(null); },
  });

  const handleAssignMissingIds = async () => {
    const noId = allMembers.filter(m => !m.member_id);
    if (noId.length === 0) return;
    setAssigningIds(true);
    // Find max existing number
    let maxNum = allMembers.reduce((max, m) => {
      if (!m.member_id) return max;
      const num = parseInt(m.member_id.replace("AUNZ", ""), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    for (const m of noId) {
      maxNum++;
      await base44.entities.Member.update(m.id, { member_id: `AUNZ${String(maxNum).padStart(6, "0")}` });
    }
    queryClient.invalidateQueries({ queryKey: ["members"] });
    setAssigningIds(false);
  };

  const handleSave = (data) => {
    if (editMember) {
      updateMutation.mutate({ id: editMember.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = members.filter(m => {
    const matchSearch = !search || m.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchDesa = filterDesa === "all" || m.desa === filterDesa;
    const matchKelompok = filterKelompok === "all" || m.kelompok === filterKelompok;
    const matchVisa = filterVisa === "all" || m.visa_status === filterVisa;
    const matchMuballigh = filterMuballigh === "all" || m.muballigh_status === filterMuballigh;
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    const matchBirthYear = !filterBirthYear || String(m.birth_year) === filterBirthYear;
    const matchDapukan = filterDapukan === "all" || m.dapukan === filterDapukan;
    const match4S = !filter4S || DAPUKAN_4S.includes(m.dapukan);
    return matchSearch && matchDesa && matchKelompok && matchVisa && matchMuballigh && matchStatus && matchBirthYear && matchDapukan && match4S;
  });

  const activeFilterCount = [filterDesa, filterKelompok, filterVisa, filterMuballigh, filterStatus, filterDapukan].filter(v => v !== "all").length + (filterBirthYear ? 1 : 0) + (filter4S ? 1 : 0);

  const resetFilters = () => {
    setFilterDesa("all"); setFilterKelompok("all"); setFilterVisa("all");
    setFilterMuballigh("all"); setFilterStatus("all"); setFilterBirthYear(""); setFilterDapukan("all"); setFilter4S(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pt.members || "Data Jamaah"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{members.length} {pt.members_subtitle || "jamaah terdaftar"}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9"
              onClick={() => setViewMode("table")}
            >
              Tabel
            </Button>
            <Button
              variant={viewMode === "family" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9"
              onClick={() => setViewMode("family")}
            >
              Per Keluarga
            </Button>
          </div>
          {canManageMembers && (
            <>
              {allMembers.some(m => !m.member_id) && (
                <Button variant="outline" onClick={handleAssignMissingIds} disabled={assigningIds} className="text-primary border-primary/30 hover:bg-primary/10">
                  {assigningIds ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <IdCard className="w-4 h-4 mr-2" />}
                  Assign ID ({allMembers.filter(m => !m.member_id).length})
                </Button>
              )}
              <Button variant="outline" onClick={() => setCsvOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />Upload CSV
              </Button>
              <Button onClick={() => { setEditMember(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />Tambah Jamaah
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama jamaah..." className="pl-10 bg-card" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setShowAdvanced(v => !v)} className="relative w-full justify-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Filter
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
          {activeFilterCount > 0 && (
            <span onClick={e => { e.stopPropagation(); resetFilters(); }} className="ml-auto text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></span>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-secondary/40 rounded-2xl border border-border p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {isMobile ? (
            <>
              <MobileSelect value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }} label="Desa" options={["all", ...desaList]} placeholder="Desa" />
              <MobileSelect value={filterKelompok} onValueChange={setFilterKelompok} label="Kelompok" options={["all", ...kelompokList]} placeholder="Kelompok" />
              <MobileSelect value={filterStatus} onValueChange={setFilterStatus} label="Status" options={["all", "Aktif", "Tidak Aktif"]} placeholder="Status" />
              <MobileSelect value={filterVisa} onValueChange={setFilterVisa} label="Visa" options={["all", ...VISA_STATUS_LIST]} placeholder="Visa" />
              <MobileSelect value={filterMuballigh} onValueChange={setFilterMuballigh} label="Muballigh" options={["all", ...MUBALLIGH_STATUS_LIST]} placeholder="Muballigh" />
              <MobileSelect value={filterDapukan} onValueChange={setFilterDapukan} label="Dapukan" options={["all", ...DAPUKAN_LIST]} placeholder="Dapukan" />
            </>
          ) : (
            <>
              <Select value={filterDesa} onValueChange={v => { setFilterDesa(v); setFilterKelompok("all"); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Desa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Desa</SelectItem>
                  {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKelompok} onValueChange={setFilterKelompok}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kelompok" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelompok</SelectItem>
                  {kelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterVisa} onValueChange={setFilterVisa}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Visa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Visa</SelectItem>
                  {VISA_STATUS_LIST.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMuballigh} onValueChange={setFilterMuballigh}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Muballigh" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {MUBALLIGH_STATUS_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDapukan} onValueChange={setFilterDapukan}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Dapukan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Dapukan</SelectItem>
                  {DAPUKAN_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
          <Input
            placeholder="Tahun Lahir (cth: 1990)"
            className="h-8 text-xs"
            value={filterBirthYear}
            onChange={e => setFilterBirthYear(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setFilter4S(v => !v)}
            className={`h-8 text-xs px-3 rounded-md border transition-colors ${filter4S ? "bg-primary text-primary-foreground border-primary" : "border-input bg-transparent hover:bg-secondary text-foreground"}`}
          >
            4S Saja
          </button>
        </div>
      )}

      <div className="relative">
        <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ["members"] })}>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : viewMode === "family" ? (
            <FamilyGroupView
              members={filtered}
              onEdit={canManageMembers ? (m) => { setEditMember(m); setFormOpen(true); } : null}
              onDelete={canManageMembers ? setDeleteMember : null}
            />
          ) : (
            <MemberTable
              members={filtered}
              onEdit={canManageMembers ? (m) => { setEditMember(m); setFormOpen(true); } : null}
              onDelete={canManageMembers ? setDeleteMember : null}
            />
          )}
        </PullToRefresh>
      </div>

      <MemberSummaryBar members={filtered} />

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editMember}
        onSave={handleSave}
        allMembers={allMembers}
      />

      <CsvUploadDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["members"] })}
      />

      <AlertDialog open={!!deleteMember} onOpenChange={() => setDeleteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Jamaah?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {deleteMember?.full_name}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deleteMember.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}