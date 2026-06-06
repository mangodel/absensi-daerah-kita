import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export default function MemberTable({ members, onEdit, onDelete }) {
  if (members.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Belum ada anggota. Tambahkan anggota baru atau upload CSV.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="font-semibold text-xs">Nama</TableHead>
              <TableHead className="font-semibold text-xs">Email</TableHead>
              <TableHead className="font-semibold text-xs">Alamat</TableHead>
              <TableHead className="font-semibold text-xs">Desa</TableHead>
              <TableHead className="font-semibold text-xs">Kelompok</TableHead>
              <TableHead className="font-semibold text-xs">Dapukan</TableHead>
              <TableHead className="font-semibold text-xs">Telepon</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
              <TableHead className="font-semibold text-xs text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(member => (
              <TableRow key={member.id} className="hover:bg-secondary/30 transition-colors">
                <TableCell className="font-medium">
                  <div>{member.full_name}</div>
                  {member.birth_year && (
                    <div className="text-[10px] text-muted-foreground">{new Date().getFullYear() - member.birth_year} th ({member.birth_year})</div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {member.email ? <a href={`mailto:${member.email}`} className="text-primary hover:underline">{member.email}</a> : <span>-</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs">
                  {member.address || member.suburb || member.state || member.postcode
                    ? `${member.address || ""} ${member.suburb || ""} ${member.state || ""} ${member.postcode || ""}`.trim()
                    : <span className="text-muted-foreground">-</span>
                  }
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.desa}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.kelompok}</TableCell>
                <TableCell>
                  {member.dapukan && member.dapukan !== "Jamaah Biasa" && member.dapukan !== "Jamaah" ? (
                    <Badge variant="secondary" className="text-xs">{member.dapukan}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Jamaah</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
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
  );
}