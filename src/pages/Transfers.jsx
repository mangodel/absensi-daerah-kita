import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, ArrowRight, Plus } from "lucide-react";
import { DESA_LIST, DESA_KELOMPOK_MAP } from "@/lib/constants";
import { format } from "date-fns";

export default function Transfers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [toDesa, setToDesa] = useState("");
  const [toKelompok, setToKelompok] = useState("");
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => base44.entities.TransferHistory.list("-created_date"),
  });

  const toKelompokOptions = toDesa ? DESA_KELOMPOK_MAP[toDesa] || [] : [];
  const member = members.find(m => m.id === selectedMember);

  const handleTransfer = async () => {
    if (!member || !toDesa || !toKelompok) return;

    await base44.entities.TransferHistory.create({
      member_id: member.id,
      member_name: member.full_name,
      from_desa: member.desa,
      from_kelompok: member.kelompok,
      to_desa: toDesa,
      to_kelompok: toKelompok,
      transfer_date: new Date().toISOString().split("T")[0],
      reason,
    });

    await base44.entities.Member.update(member.id, { desa: toDesa, kelompok: toKelompok });

    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["transfers"] });
    setDialogOpen(false);
    setSelectedMember("");
    setToDesa("");
    setToKelompok("");
    setReason("");
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" /> Pindah Kelompok
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tracking perpindahan anggota lintas desa/kelompok</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Pindahkan Anggota
        </Button>
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
                {transfers.map(t => (
                  <TableRow key={t.id} className="hover:bg-secondary/30">
                    <TableCell className="font-medium">{t.member_name}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-muted-foreground">{t.from_desa}</span>
                        <br />
                        <Badge variant="outline" className="text-[10px] mt-0.5">{t.from_kelompok}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pindahkan Anggota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Pilih Anggota *</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name} — {m.kelompok}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {member && (
              <div className="p-3 bg-secondary/50 rounded-lg text-xs">
                <span className="text-muted-foreground">Saat ini di: </span>
                <span className="font-medium">{member.desa} / {member.kelompok}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Desa Tujuan *</Label>
              <Select value={toDesa} onValueChange={v => { setToDesa(v); setToKelompok(""); }}>
                <SelectTrigger><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
                <SelectContent>
                  {DESA_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Alasan</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Opsional" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleTransfer} disabled={!selectedMember || !toDesa || !toKelompok}>
                Pindahkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}