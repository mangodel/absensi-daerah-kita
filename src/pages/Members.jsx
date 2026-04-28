import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Search } from "lucide-react";
import { DESA_LIST, KELOMPOK_LIST } from "@/lib/constants";
import MemberFormDialog from "@/components/members/MemberFormDialog";
import CsvUploadDialog from "@/components/members/CsvUploadDialog";
import MemberTable from "@/components/members/MemberTable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Members() {
  const [formOpen, setFormOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterKelompok, setFilterKelompok] = useState("all");

  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Member.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); setFormOpen(false); setEditMember(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Member.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); setDeleteMember(null); },
  });

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
    return matchSearch && matchDesa && matchKelompok;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Anggota</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{members.length} anggota terdaftar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Upload CSV
          </Button>
          <Button onClick={() => { setEditMember(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Tambah
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama anggota..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <MemberTable
          members={filtered}
          onEdit={(m) => { setEditMember(m); setFormOpen(true); }}
          onDelete={setDeleteMember}
        />
      )}

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editMember}
        onSave={handleSave}
      />

      <CsvUploadDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["members"] })}
      />

      <AlertDialog open={!!deleteMember} onOpenChange={() => setDeleteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
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