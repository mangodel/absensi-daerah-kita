import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Parse CSV text (handles BOM, quoted fields, multiple delimiters)
 */
function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split(/\r?\n/);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const candidates = [",", ";", "\t", "|"];
  const delimiter = candidates.reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best, ",");

  const parseLine = (line) => {
    const result = [];
    let cur = "", inQuote = false, quoteChar = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === quoteChar) {
          if (line[i + 1] === quoteChar) { cur += ch; i++; }
          else inQuote = false;
        } else cur += ch;
      } else if ((ch === '"' || ch === "'") && cur === "") {
        inQuote = true; quoteChar = ch;
      } else if (ch === delimiter) {
        result.push(cur.trim()); cur = "";
      } else cur += ch;
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
  desa:             ["desa", "village"],
  kelompok:         ["kelompok", "group", "kelompok_id"],
};

function getField(row, field) {
  for (const alias of COLUMN_ALIASES[field] || [field]) {
    if (row[alias] !== undefined && row[alias] !== "") return row[alias];
    const spaced = alias.replace(/_/g, " ");
    if (row[spaced] !== undefined && row[spaced] !== "") return row[spaced];
  }
  return "";
}

export default function GoogleSheetSync() {
  const { config } = useAppConfig();
  const desaList = config.desa_list || [];
  const desaKelompokMap = config.desa_kelompok_map || {};
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetUrl, setSheetUrl] = useState("");
  const [defaultDesa, setDefaultDesa] = useState("");
  const [defaultKelompok, setDefaultKelompok] = useState("");
  const [mode, setMode] = useState("append"); // append | replace
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  const kelompokOptions = defaultDesa ? desaKelompokMap[defaultDesa] || [] : [];

  // Convert Google Sheet URL to CSV export URL
  const toCsvUrl = (url) => {
    // Handle /edit, /view, /pub URLs
    const match = url.match(/\/spreadsheets\/d\/([\w-]+)/);
    if (!match) return null;
    const id = match[1];
    // Check for specific gid
    const gidMatch = url.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  };

  const handlePreview = async () => {
    const csvUrl = toCsvUrl(sheetUrl);
    if (!csvUrl) {
      toast({ title: "URL tidak valid", description: "Pastikan URL adalah Google Sheet yang benar.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setPreview(null);

    // Fetch via LLM proxy (bypass CORS) — use InvokeLLM to fetch the sheet as text
    const csvText = await base44.integrations.Core.InvokeLLM({
      prompt: `Fetch the following Google Sheets CSV export URL and return ONLY the raw CSV text content, no commentary, no markdown formatting, just the raw CSV:\n\n${csvUrl}`,
      add_context_from_internet: true,
    });

    const rows = parseCsv(csvText);
    setPreview(rows.slice(0, 3));
    setLoading(false);
    toast({ title: `Preview: ${rows.length} baris ditemukan` });
  };

  const handleSync = async () => {
    const csvUrl = toCsvUrl(sheetUrl);
    if (!csvUrl) {
      toast({ title: "URL tidak valid", variant: "destructive" });
      return;
    }
    if (!defaultDesa) {
      toast({ title: "Pilih Desa default terlebih dahulu", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);

    const csvText = await base44.integrations.Core.InvokeLLM({
      prompt: `Fetch the following Google Sheets CSV export URL and return ONLY the raw CSV text content, no commentary:\n\n${csvUrl}`,
      add_context_from_internet: true,
    });

    const rows = parseCsv(csvText);

    const membersData = rows
      .map(r => ({
        full_name:        getField(r, "full_name"),
        birth_year:       getField(r, "birth_year") ? Number(getField(r, "birth_year")) : undefined,
        birthplace:       getField(r, "birthplace") || undefined,
        visa_status:      getField(r, "visa_status") || undefined,
        muballigh_status: getField(r, "muballigh_status") || undefined,
        employment:       getField(r, "employment") || undefined,
        phone:            getField(r, "phone") || undefined,
        dapukan:          getField(r, "dapukan") || "Jamaah Biasa",
        desa:             getField(r, "desa") || defaultDesa,
        kelompok:         getField(r, "kelompok") || defaultKelompok || "",
        status:           "Aktif",
        dapukan_level:    "Kelompok",
      }))
      .filter(m => m.full_name);

    if (membersData.length === 0) {
      setResult({ success: false, error: "Tidak ada data valid ditemukan di sheet." });
      setLoading(false);
      return;
    }

    if (mode === "replace") {
      // Delete existing members from that desa first
      const existing = await base44.entities.Member.filter({ desa: defaultDesa });
      for (const m of existing) await base44.entities.Member.delete(m.id);
    }

    await base44.entities.Member.bulkCreate(membersData);
    queryClient.invalidateQueries({ queryKey: ["members"] });
    setResult({ success: true, count: membersData.length });
    setLoading(false);
    toast({ title: `${membersData.length} anggota berhasil disinkronkan!` });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <div>
          <h2 className="font-semibold text-sm text-foreground mb-1">Sinkronisasi Google Sheet</h2>
          <p className="text-xs text-muted-foreground">Import data anggota langsung dari Google Sheet. Sheet harus dibagikan (Anyone with link can view).</p>
        </div>

        {/* Petunjuk */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Cara setup Google Sheet:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Buka Google Sheet → klik <strong>Share</strong> → <strong>Anyone with the link → Viewer</strong></li>
              <li>Kolom yang dikenali: <span className="font-mono bg-background px-1 rounded">nama</span>, <span className="font-mono bg-background px-1 rounded">hp</span>, <span className="font-mono bg-background px-1 rounded">desa</span>, <span className="font-mono bg-background px-1 rounded">kelompok</span>, <span className="font-mono bg-background px-1 rounded">visa_status</span>, <span className="font-mono bg-background px-1 rounded">dapukan</span>, dll</li>
              <li>Jika kolom desa/kelompok ada di sheet, akan dipakai. Jika tidak, gunakan default di bawah.</li>
            </ol>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">URL Google Sheet *</Label>
          <div className="flex gap-2">
            <Input
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1"
            />
            {sheetUrl && (
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline"><ExternalLink className="w-4 h-4" /></Button>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Desa Default *</Label>
            <Select value={defaultDesa} onValueChange={v => { setDefaultDesa(v); setDefaultKelompok(""); }}>
              <SelectTrigger><SelectValue placeholder="Pilih Desa" /></SelectTrigger>
              <SelectContent>
                {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Kelompok Default</Label>
            <Select value={defaultKelompok} onValueChange={setDefaultKelompok} disabled={!defaultDesa}>
              <SelectTrigger><SelectValue placeholder="Opsional" /></SelectTrigger>
              <SelectContent>
                {kelompokOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Mode Import</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="append">Tambah (append) — tidak hapus data lama</SelectItem>
              <SelectItem value="replace">Ganti (replace) — hapus dulu data desa ini lalu import ulang</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div className="text-xs">
            <p className="font-medium text-foreground mb-1.5">Preview ({preview.length} baris pertama):</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="text-[10px] w-full">
                <thead className="bg-secondary/50">
                  <tr>{Object.keys(preview[0]).slice(0, 7).map(h => <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground truncate max-w-[90px]">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.values(row).slice(0, 7).map((v, j) => <td key={j} className="px-2 py-1 truncate max-w-[90px]">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${result.success ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
            {result.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {result.success ? `Berhasil menyinkronkan ${result.count} anggota!` : result.error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePreview} disabled={loading || !sheetUrl}>
            {loading && !result ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Preview Data
          </Button>
          <Button onClick={handleSync} disabled={loading || !sheetUrl || !defaultDesa}>
            {loading && result === null ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sinkronkan Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}