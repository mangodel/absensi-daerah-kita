import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Loader2, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import SurveyResultSummary from "./SurveyResultSummary";
import { useUserRole } from "@/lib/useUserRole";
import { useAuth } from "@/lib/AuthContext";

const QUESTION_TYPES = ["text", "radio", "checkbox"];

export default function SurveyManager() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rekapSurvey, setRekapSurvey] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState("Draft");
  const [deadline, setDeadline] = useState("");
  const [targetScope, setTargetScope] = useState("Semua");
  const [targetDesa, setTargetDesa] = useState("");
  const [targetKelompok, setTargetKelompok] = useState("");

  const { data: allSurveys = [], isLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => base44.entities.SurveyConfig.list(),
  });

  // Scope surveys berdasarkan role:
  // super_admin → semua
  // admin_desa → Semua + Desa miliknya + Kelompok se-desanya
  // admin_kelompok → Semua + Desa miliknya + Kelompok miliknya saja
  const surveys = allSurveys.filter(s => {
    if (isSuperAdmin) return true;
    if (s.target_scope === "Semua") return true;
    if (isAdminDesa && userDesa) {
      if (s.target_scope === "Desa" && s.target_desa === userDesa) return true;
      if (s.target_scope === "Kelompok" && s.target_desa === userDesa) return true;
      return false;
    }
    if (isAdminKelompok && userDesa && userKelompok) {
      if (s.target_scope === "Desa" && s.target_desa === userDesa) return true;
      if (s.target_scope === "Kelompok" && s.target_desa === userDesa && s.target_kelompok === userKelompok) return true;
      return false;
    }
    return false;
  });

  // Hanya super_admin atau pembuat survei yang boleh hapus
  const canDelete = (s) => isSuperAdmin || s.created_by === user?.email;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SurveyConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey berhasil dibuat");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Gagal membuat survey"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SurveyConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey berhasil diupdate");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Gagal mengupdate survey"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SurveyConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Gagal menghapus survey"),
  });

  const resetForm = () => {
    setEditingSurvey(null);
    setTitle("");
    setDescription("");
    setQuestions([]);
    setStatus("Draft");
    setDeadline("");
    // Auto-set scope berdasarkan role admin
    setTargetScope(isAdminKelompok ? "Kelompok" : isAdminDesa ? "Desa" : "Semua");
    setTargetDesa(isAdminDesa || isAdminKelompok ? (userDesa || "") : "");
    setTargetKelompok(isAdminKelompok ? (userKelompok || "") : "");
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        question: "",
        type: "text",
        options: [],
        required: true,
      },
    ]);
  };

  const handleUpdateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Judul survey diperlukan");
      return;
    }
    if (questions.length === 0) {
      toast.error("Minimal 1 pertanyaan diperlukan");
      return;
    }

    // Validasi scope: admin_kelompok hanya bisa buat untuk kelompoknya
    if (targetScope === "Kelompok" && !targetDesa) {
      toast.error("Desa target diperlukan untuk scope Kelompok");
      return;
    }
    if (targetScope === "Desa" && !targetDesa) {
      toast.error("Desa target diperlukan untuk scope Desa");
      return;
    }

    const data = {
      title,
      description,
      questions: JSON.stringify(questions),
      status,
      deadline: deadline || null,
      target_scope: targetScope,
      target_desa: targetScope === "Semua" ? "" : targetDesa,
      target_kelompok: targetScope === "Kelompok" ? targetKelompok : "",
    };

    if (editingSurvey) {
      updateMutation.mutate({ id: editingSurvey.id, data });
    } else {
      createMutation.mutate({
        ...data,
        created_by: user?.email || "",
        created_by_name: user?.full_name || user?.email || "",
      });
    }
  };

  const handleEdit = (survey) => {
    setEditingSurvey(survey);
    setTitle(survey.title);
    setDescription(survey.description);
    setQuestions(JSON.parse(survey.questions));
    setStatus(survey.status);
    setDeadline(survey.deadline || "");
    setTargetScope(survey.target_scope || "Semua");
    setTargetDesa(survey.target_desa || "");
    setTargetKelompok(survey.target_kelompok || "");
    setDialogOpen(true);
  };

  if (rekapSurvey) {
    return <SurveyResultSummary survey={rekapSurvey} onBack={() => setRekapSurvey(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Manajemen Survei</h2>
          <p className="text-sm text-muted-foreground mt-1">Buat dan kelola survei untuk jamaah</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Survei Baru
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : surveys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Belum ada survei. Buat yang pertama!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{survey.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {survey.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{survey.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {JSON.parse(survey.questions).length} pertanyaan
                        {survey.deadline && ` • Deadline: ${new Date(survey.deadline).toLocaleDateString('id-ID')}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {survey.target_scope === "Desa" ? `Desa ${survey.target_desa}` :
                         survey.target_scope === "Kelompok" ? `Kel. ${survey.target_kelompok}` :
                         "Semua Jamaah"}
                      </Badge>
                      {survey.created_by_name && (
                        <span className="text-[11px] text-muted-foreground/70">
                          oleh {survey.created_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRekapSurvey(survey)}
                      className="text-primary hover:bg-primary/10"
                      title="Lihat Rekap"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </Button>
                    {canDelete(survey) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(survey)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete(survey) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(survey)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Edit/Create */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSurvey ? "Edit Survei" : "Buat Survei Baru"}
            </DialogTitle>
            <DialogDescription>
              Buat pertanyaan survei yang akan dikirim ke jamaah
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <Label>Judul Survei</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Kepuasan Program Dakwah"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Penjelasan singkat tentang survei ini"
                rows={2}
              />
            </div>

            {/* Deadline */}
            <div className="space-y-1">
              <Label>Batas Waktu Pengisian (Opsional)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
              >
                <option value="Draft">Draft</option>
                <option value="Aktif">Aktif</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>

            {/* Target Scope */}
            <div className="space-y-1">
              <Label>Target Penerima</Label>
              <select
                value={targetScope}
                onChange={(e) => setTargetScope(e.target.value)}
                disabled={isAdminDesa || isAdminKelompok}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm disabled:opacity-60"
              >
                <option value="Semua">Semua Jamaah</option>
                {(!isAdminKelompok) && <option value="Desa">Desa Tertentu</option>}
                <option value="Kelompok">Kelompok Tertentu</option>
              </select>
              {(isAdminDesa || isAdminKelompok) && (
                <p className="text-[11px] text-muted-foreground italic">
                  Scope terkunci sesuai level admin Anda
                </p>
              )}
            </div>

            {/* Target Desa */}
            {targetScope !== "Semua" && (
              <div className="space-y-1">
                <Label>Desa Target</Label>
                <Input
                  value={targetDesa}
                  onChange={(e) => setTargetDesa(e.target.value)}
                  disabled={isAdminDesa || isAdminKelompok}
                  placeholder="Nama desa"
                  className="disabled:opacity-60"
                />
              </div>
            )}

            {/* Target Kelompok */}
            {targetScope === "Kelompok" && (
              <div className="space-y-1">
                <Label>Kelompok Target</Label>
                <Input
                  value={targetKelompok}
                  onChange={(e) => setTargetKelompok(e.target.value)}
                  disabled={isAdminKelompok}
                  placeholder="Nama kelompok"
                  className="disabled:opacity-60"
                />
              </div>
            )}

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pertanyaan</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddQuestion}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Tambah Pertanyaan
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((q, idx) => (
                  <Card key={q.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Pertanyaan {idx + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <Input
                      value={q.question}
                      onChange={(e) => handleUpdateQuestion(q.id, "question", e.target.value)}
                      placeholder="Tuliskan pertanyaan Anda"
                      className="text-sm"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Tipe Jawaban</Label>
                        <select
                          value={q.type}
                          onChange={(e) => {
                            handleUpdateQuestion(q.id, "type", e.target.value);
                            if (e.target.value === "text") {
                              handleUpdateQuestion(q.id, "options", []);
                            }
                          }}
                          className="w-full h-8 px-2 rounded-md border border-input bg-transparent text-xs"
                        >
                          {QUESTION_TYPES.map(t => (
                            <option key={t} value={t}>{t === "text" ? "Teks Bebas" : t === "radio" ? "Pilihan Tunggal" : "Pilihan Ganda"}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => handleUpdateQuestion(q.id, "required", e.target.checked)}
                            className="w-4 h-4"
                          />
                          Wajib
                        </label>
                      </div>
                    </div>

                    {q.type !== "text" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Pilihan Jawaban</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateQuestion(q.id, "options", [...q.options, ""])}
                            className="h-6 text-xs px-2"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Tambah
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex gap-2 items-center">
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...q.options];
                                  newOpts[optIdx] = e.target.value;
                                  handleUpdateQuestion(q.id, "options", newOpts);
                                }}
                                placeholder={`Pilihan ${optIdx + 1}`}
                                className="text-xs h-8"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newOpts = q.options.filter((_, i) => i !== optIdx);
                                  handleUpdateQuestion(q.id, "options", newOpts);
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {q.options.length === 0 && (
                          <p className="text-[10px] text-muted-foreground italic">Tekan "Tambah" untuk membuat pilihan pertama</p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingSurvey ? "Update" : "Buat"} Survei
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Survei?</AlertDialogTitle>
            <AlertDialogDescription>
              Survei "{deleteTarget?.title}" akan dihapus permanen beserta semua respons yang sudah ada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Hapus
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}