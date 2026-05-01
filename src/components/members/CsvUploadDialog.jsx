import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";

/**
 * Parse CSV robust: handle BOM, quoted fields, mixed delimiters, whitespace
 */
function parseCsv(text) {
  // Strip UTF-8 BOM
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detect delimiter from first line
  const firstLine = lines[0];
  const candidates = [",", ";", "\t", "|"];
  const delimiter = candidates.reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best
  , ",");

  // Parse a single CSV line respecting quoted fields
  const parseLine = (line) => {
    const result = [];
    let cur = "";
    let inQuote = false;
    let quoteChar = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === quoteChar) {
          // Escaped quote?
          if (line[i + 1] === quoteChar) { cur += ch; i++; }
          else inQuote = false;
        } else {
          cur += ch;
        }
      } else if ((ch === '"' || ch === "'") && cur === "") {
        inQuote = true;
        quoteChar = ch;
      } else if (ch === delimiter) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));

  return lines.slice(1)
    .map(line => {
      if (!line.trim()) return null;
      const vals = parseLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    })
    .filter(Boolean)
    .filter(row => Object.values(row).some(v => v !== ""));
}

const COLUMN_ALIASES = {
  full_name:        ["full_name", "nama", "name", "nama_lengkap", "nama lengkap"],
  birth_year:       ["birth_year", "tahun_lahir", "tahun lahir", "thn_lahir", "born"],
  birthplace:       ["birthplace", "tempat_lahir", "tempat lahir", "kota_lahir"],
  visa_status:      ["visa_status", "visa", "status_visa"],
  muballigh_status: ["muballigh_status", "muballigh", "status_muballigh"],
  employment:       ["employment", "pekerjaan", "kerja"],
  phone:            ["phone", "telepon", "hp", "handphone", "no_hp", "nomor_hp", "no hp"],
  dapukan:          ["dapukan", "jabatan", "role"],
};

function getField(row, field) {
  for (const alias of COLUMN_ALIASES[field]) {
    if (row[alias] !== undefined && row[alias] !== "") return row[alias];
    // Also try with spaces replaced by underscore
    const spaced = alias.replace(/_/g, " ");
    if (row[spaced] !== undefined && row[spaced] !== "") return row[spaced];
  }
  return "";
}

export default function CsvUploadDialog({ open, onOpenChange, onComplete }) {
  const [file, setFile] = useState(null);
  const [desa, setDesa] = useState("");
  const [kelompok, setKelompok] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};
  const kelompokOptions = desa ? desaKelompokMap[desa] || [] : [];

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    // Show preview of first 3 rows
    const text = await f.text();
    const rows = parseCsv(text);
    setPreview(rows.slice(0, 3));
  };

  const handleUpload = async () => {
    if (!file || !desa || !kelompok) return;
    setLoading(true);
    setResult(null);

    const text = await file.text();
    const rows = parseCsv(text);

    const membersRaw = rows.map(r => ({
      full_name:        getField(r, "full_name"),
      birth_year:       getField(r, "birth_year") ? Number(getField(r, "birth_year")) : undefined,
      birthplace:       getField(r, "birthplace"),
      visa_status:      getField(r, "visa_status"),
      muballigh_status: getField(r, "muballigh_status"),
      employment:       getField(r, "employment"),
      phone:            getField(r, "phone"),
      dapukan:          getField(r, "dapukan") || "Anggota",
    })).filter(m => m.full_name);

    if (membersRaw.length > 0) {
      const membersData = membersRaw.map(m => ({
        ...m,
        desa,
        kelompok,
        status: "Aktif",
        dapukan_level: "Kelompok",
      }));

      await base44.entities.Member.bulkCreate(membersData);
      setResult({ success: true, count: membersData.length });
      onComplete();
    } else {
      setResult({
        success: false,
        error: `Tidak ada data valid. Pastikan file CSV memiliki kolom: full_name (atau "nama"), birth_year, phone, dll. Terdeteksi ${rows.length} baris.`
      });
    }

    setLoading(false);
  };

  const handleClose = () => {
    setFile(null);
    setDesa("");
    setKelompok("");
    setResult(null);
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Upload CSV dari Google Sheet
          </DialogTitle>
          <DialogDescription>
            Di Google Sheet: File → Download → Comma Separated Values (.csv)
          </DialogDescription>
        </DialogHeader>

        {/* Petunjuk kolom */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-1">Kolom yang dikenali:</p>
            <p><span className="font-mono bg-background px-1 rounded">full_name</span> atau <span className="font-mono bg-background px-1 rounded">nama</span> · <span className="font-mono bg-background px-1 rounded">birth_year</span> · <span className="font-mono bg-background px-1 rounded">phone</span> atau <span className="font-mono bg-background px-1 rounded">hp</span> · <span className="font-mono bg-background px-1 rounded">visa_status</span> · <span className="font-mono bg-background px-1 rounded">dapukan</span> · dll</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">File CSV *</Label>
            <div className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="max-w-[220px] mx-auto text-xs"
              />
              {file && <p className="text-xs text-accent mt-2 font-medium">{file.name}</p>}
            </div>
          </div>

          {/* Preview rows */}
          {preview && preview.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-foreground mb-1.5">Preview ({preview.length} baris pertama):</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="text-[10px] w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      {Object.keys(preview[0]).slice(0, 6).map(h => (
                        <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground truncate max-w-[80px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {Object.values(row).slice(0, 6).map((v, j) => (
                          <td key={j} className="px-2 py-1 truncate max-w-[80px]">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.success ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
              {result.success
                ? `✓ Berhasil menambahkan ${result.count} anggota ke ${kelompok}!`
                : `✗ ${result.error}`}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>Tutup</Button>
            <Button onClick={handleUpload} disabled={loading || !file || !desa || !kelompok}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload & Tambah
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}