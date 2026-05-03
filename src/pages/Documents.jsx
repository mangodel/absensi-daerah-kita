import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useUserRole } from "@/lib/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Download, Trash2, Loader2, Eye, Clock, User, FileUp } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["Umum", "Kegiatan", "Laporan", "Surat", "Panduan", "Lainnya"];

const categoryColors = {
  Umum: "bg-slate-100 text-slate-700",
  Kegiatan: "bg-blue-50 text-blue-700",
  Laporan: "bg-green-50 text-green-700",
  Surat: "bg-yellow-50 text-yellow-700",
  Panduan: "bg-purple-50 text-purple-700",
  Lainnya: "bg-gray-100 text-gray-600",
};

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const { user } = useAuth();
  const { isSuperAdmin, isAdminDesa, userDesa, userKelompok } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", category: "Umum", scope: "Semua", target_desa: "" });
  const [file, setFile] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date"),
  });

  const { data: downloads = [] } = useQuery({
    queryKey: ["document_downloads"],
    queryFn: () => base44.entities.DocumentDownload.list("-downloaded_at"),
    enabled: isSuperAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleUpload = async () => {
    if (!file || !form.title) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Document.create({
      ...form,
      file_url,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: user?.email || "",
      uploaded_by_name: user?.full_name || user?.email || "",
    });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    setShowUpload(false);
    setForm({ title: "", description: "", category: "Umum", scope: "Semua", target_desa: "" });
    setFile(null);
    setUploading(false);
    toast({ title: "Dokumen berhasil diupload!" });
  };

  const handleDownload = async (doc) => {
    // Track download
    await base44.entities.DocumentDownload.create({
      document_id: doc.id,
      document_title: doc.title,
      downloaded_by: user?.email || "",
      downloaded_by_name: user?.full_name || user?.email || "",
      downloaded_at: new Date().toISOString(),
      desa: user?.desa || "",
      kelompok: user?.kelompok || "",
    });
    queryClient.invalidateQueries({ queryKey: ["document_downloads"] });
    window.open(doc.file_url, "_blank");
  };

  // Filter documents by role
  const visibleDocs = documents.filter(doc => {
    if (isSuperAdmin) return true;
    if (doc.scope === "Semua") return true;
    if (doc.scope === "Desa" && userDesa && doc.target_desa === userDesa) return true;
    if (doc.scope === "Kelompok" && userDesa && doc.target_desa === userDesa) return true;
    return false;
  }).filter(doc => filterCategory === "all" || doc.category === filterCategory);

  const docDownloads = (docId) => downloads.filter(d => d.document_id === docId);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Dokumen
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dokumen & arsip organisasi</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowUpload(true)}>
            <FileUp className="w-4 h-4 mr-2" /> Upload Dokumen
          </Button>
        )}
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Dokumen</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="tracking">Riwayat Download</TabsTrigger>}
        </TabsList>

        <TabsContent value="documents" className="space-y-4 mt-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {visibleDocs.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Belum ada dokumen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleDocs.map(doc => {
                const dlCount = downloads.filter(d => d.document_id === doc.id).length;
                return (
                  <div key={doc.id} className="bg-card rounded-2xl border border-border p-5 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{doc.title}</p>
                        {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`text-[10px] border-0 ${categoryColors[doc.category] || "bg-slate-100 text-slate-700"}`}>
                        {doc.category}
                      </Badge>
                      {doc.scope !== "Semua" && (
                        <Badge variant="outline" className="text-[10px]">{doc.scope}: {doc.target_desa}</Badge>
                      )}
                    </div>

                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      {doc.file_name && <p>📄 {doc.file_name} {doc.file_size ? `(${formatBytes(doc.file_size)})` : ""}</p>}
                      <p>📅 {doc.created_date ? format(new Date(doc.created_date), "dd MMM yyyy", { locale: id }) : ""}</p>
                      <p>👤 {doc.uploaded_by_name || doc.uploaded_by}</p>
                      {isSuperAdmin && dlCount > 0 && <p>⬇️ {dlCount}x didownload</p>}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleDownload(doc)}>
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </Button>
                      {isSuperAdmin && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setSelectedDoc(doc)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(doc.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="tracking" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Riwayat Download
                </h3>
              </div>
              {downloads.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Belum ada riwayat download.</p>
              ) : (
                <div className="divide-y divide-border">
                  {downloads.slice(0, 100).map(dl => (
                    <div key={dl.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dl.downloaded_by_name || dl.downloaded_by}</p>
                        <p className="text-xs text-muted-foreground truncate">📄 {dl.document_title}</p>
                        {(dl.desa || dl.kelompok) && (
                          <p className="text-[10px] text-muted-foreground">{dl.desa}{dl.kelompok ? ` / ${dl.kelompok}` : ""}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {dl.downloaded_at ? format(new Date(dl.downloaded_at), "dd MMM yyyy", { locale: id }) : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {dl.downloaded_at ? format(new Date(dl.downloaded_at), "HH:mm", { locale: id }) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Dokumen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Judul Dokumen *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Judul dokumen..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi singkat..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Akses</Label>
                <Select value={form.scope} onValueChange={v => setForm(p => ({ ...p, scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua</SelectItem>
                    <SelectItem value="Desa">Desa Tertentu</SelectItem>
                    <SelectItem value="Kelompok">Kelompok Tertentu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.scope !== "Semua" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Target Desa</Label>
                <Input value={form.target_desa} onChange={e => setForm(p => ({ ...p, target_desa: e.target.value }))} placeholder="Nama desa..." />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">File *</Label>
              <input
                type="file"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-muted-foreground">{file.name} ({formatBytes(file.size)})</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Batal</Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !form.title}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? "Mengupload..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Download Tracking Dialog */}
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detail Download — {selectedDoc.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {docDownloads(selectedDoc.id).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada yang mendownload dokumen ini.</p>
              ) : (
                docDownloads(selectedDoc.id).map(dl => (
                  <div key={dl.id} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{dl.downloaded_by_name || dl.downloaded_by}</p>
                      {(dl.desa || dl.kelompok) && <p className="text-xs text-muted-foreground">{dl.desa}{dl.kelompok ? ` / ${dl.kelompok}` : ""}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <p>{dl.downloaded_at ? format(new Date(dl.downloaded_at), "dd MMM yyyy HH:mm", { locale: id }) : ""}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}