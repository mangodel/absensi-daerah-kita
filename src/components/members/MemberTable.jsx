import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CreditCard } from "lucide-react";
import MemberCardDialog from "@/components/members/MemberCardDialog";
import { getDapukanTitle } from "@/lib/constants";

export default function MemberTable({ members, onEdit, onDelete }) {
  const currentYear = new Date().getFullYear();
  const [cardMember, setCardMember] = useState(null);

  // Sort: dewasa (18+) first, then generus (<18), within each group sort by name
  const sorted = [...members].sort((a, b) => {
    const ageA = a.birth_year ? currentYear - a.birth_year : 999;
    const ageB = b.birth_year ? currentYear - b.birth_year : 999;
    const isAdultA = ageA >= 18;
    const isAdultB = ageB >= 18;
    if (isAdultA !== isAdultB) return isAdultA ? -1 : 1; // dewasa first
    return (a.full_name || "").localeCompare(b.full_name || ""); // then by name
  });

  if (sorted.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Belum ada anggota. Tambahkan anggota baru atau upload CSV.</p>
      </div>
    );
  }

  return (
    <>
    <MemberCardDialog member={cardMember} open={!!cardMember} onClose={() => setCardMember(null)} />
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="font-semibold text-xs w-12">No.</TableHead>
              <TableHead className="font-semibold text-xs">ID Member</TableHead>
              <TableHead className="font-semibold text-xs">Nama</TableHead>
              <TableHead className="font-semibold text-xs">Email</TableHead>
              <TableHead className="font-semibold text-xs hidden lg:table-cell">Alamat</TableHead>
              <TableHead className="font-semibold text-xs">Desa</TableHead>
              <TableHead className="font-semibold text-xs">Kelompok</TableHead>
              <TableHead className="font-semibold text-xs hidden md:table-cell">Dapukan</TableHead>
              <TableHead className="font-semibold text-xs hidden md:table-cell">Telepon</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
              <TableHead className="font-semibold text-xs text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((member, idx) => (
              <TableRow key={member.id} className="hover:bg-secondary/30 transition-colors">
                <TableCell className="text-xs text-muted-foreground font-medium text-center">{idx + 1}</TableCell>
                <TableCell>
                  {member.member_id ? (
                    <span className="font-mono text-xs font-semibold text-primary">{member.member_id}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div>{member.full_name}</div>
                  {member.birth_year && (
                    <div className="text-[10px] text-muted-foreground">{new Date().getFullYear() - member.birth_year} th ({member.birth_year})</div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {member.email ? <a href={`mailto:${member.email}`} className="text-primary hover:underline">{member.email}</a> : <span>-</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs hidden lg:table-cell">
                  {member.address || member.suburb || member.state || member.postcode
                    ? `${member.address || ""} ${member.suburb || ""} ${member.state || ""} ${member.postcode || ""}`.trim()
                    : <span className="text-muted-foreground">-</span>
                  }
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.desa}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.kelompok}</TableCell>
                <TableCell className="hidden md:table-cell">
                 {member.dapukan && member.dapukan !== "Jamaah" ? (
                   <Badge variant="secondary" className="text-xs">{getDapukanTitle(member.dapukan, member.dapukan_level)}</Badge>
                 ) : (
                   <span className="text-xs text-muted-foreground">Jamaah</span>
                 )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                  {member.phone
                    ? <a href={`tel:${member.phone}`} className="text-primary hover:underline">{member.phone}</a>
                    : <span className="text-muted-foreground">-</span>
                  }
                </TableCell>
                <TableCell>
                  <Badge className={member.status === "Aktif"
                    ? "bg-accent/10 text-accent border-accent/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                  } variant="outline">
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {member.member_id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Kartu Member" onClick={() => setCardMember(member)}>
                        <CreditCard className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(member)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(member)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    </>
  );
}