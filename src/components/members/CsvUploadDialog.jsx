import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";

export default function CsvUploadDialog({ open, onOpenChange, onComplete }) {
  const [file, setFile] = useState(null);
  const [desa, setDesa] = useState("");
  const [kelompok, setKelompok] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};
  const kelompokOptions = desa ? desaKelompokMap[desa] || [] : [];

  const handleUpload = async () => {
    if (!file || !desa || !kelompok) return;
    setLoading(true);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          members: {
            type: "array",
            items: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                birth_year: { type: "number" },
                birthplace: { type: "string" },
                visa_status: { type: "string" },
                muballigh_status: { type: "string" },
                employment: { type: "string" },
                phone: { type: "string" },
                dapukan: { type: "string" },
              }
            }
          }
        }
      }
    });

    if (extracted.status === "success" && extracted.output?.members) {
      const membersData = extracted.output.members.map(m => ({
        ...m,
        desa,
        kelompok,
        status: "Aktif",
        dapukan: m.dapukan || "Anggota",
        dapukan_level: "Kelompok",
      }));

      await base44.entities.Member.bulkCreate(membersData);
      setResult({ success: true, count: membersData.length });
      onComplete();
    } else {
      setResult({ success: false, error: extracted.details || "Gagal mengekstrak data" });
    }

    setLoading(false);
  };

  const handleClose = () => {
    setFile(null);
    setDesa("");
    setKelompok("");
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Upload CSV / Excel
          </DialogTitle>
          <DialogDescription>
            Upload file CSV dari Google Sheet. Pastikan ada kolom: full_name, birth_year, phone, dll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Desa *</Label>
            <Select value={desa} onValueChange={v => { setDesa(v); setKelompok(""); }}>
              <SelectTrigger><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
              <SelectContent>
                {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Kelompok *</Label>
            <Select value={kelompok} onValueChange={setKelompok} disabled={!desa}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelompok" /></SelectTrigger>
              <SelectContent>
                {kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">File CSV / Excel *</Label>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={e => setFile(e.target.files[0])}
                className="max-w-[200px] mx-auto"
              />
              {file && <p className="text-xs text-accent mt-2 font-medium">{file.name}</p>}
            </div>
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.success ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
              {result.success
                ? `Berhasil menambahkan ${result.count} anggota!`
                : `Error: ${result.error}`}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>Tutup</Button>
            <Button onClick={handleUpload} disabled={loading || !file || !desa || !kelompok}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload & Tambah
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}