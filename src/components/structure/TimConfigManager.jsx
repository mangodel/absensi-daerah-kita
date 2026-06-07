import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TimConfigManager({ timConfigs = [], level = "Daerah" }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    tim_name: "",
    tim_category: "Tim_Lainnya",
    mode: "hybrid",
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timConfigs"] });
      toast.success("Tim berhasil dibuat");
      setOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timConfigs"] });
      toast.success("Tim berhasil diperbarui");
      setOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timConfigs"] });
      toast.success("Tim berhasil dihapus");
    },
  });

  const resetForm = () => {
    setEditing(null);
    setFormData({ tim_name: "", tim_category: "Tim_Lainnya", mode: "hybrid" });
  };

  const handleSave = () => {
    if (!formData.tim_name.trim()) {
      toast.error("Nama tim tidak boleh kosong");
      return;
    }

    const submitData = {
      ...formData,
      level,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (tim) => {
    setEditing(tim);
    setFormData({
      tim_name: tim.tim_name,
      tim_category: tim.tim_category,
      mode: tim.mode || "hybrid",
    });
    setOpen(true);
  };

  const categoryLabel = {
    "4_Serangkai": "4 Serangkai",
    "Tim_7": "Tim 7",
    "Tim_Lainnya": "Tim Lainnya",
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={resetForm} variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Tim
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tim" : "Buat Tim Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Tim</label>
              <Input
                value={formData.tim_name}
                onChange={(e) => setFormData({ ...formData, tim_name: e.target.value })}
                placeholder="Contoh: Tim 7 - Sektor A"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Kategori</label>
              <Select value={formData.tim_category} onValueChange={(val) => setFormData({ ...formData, tim_category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4_Serangkai">Empat Serangkai (4S)</SelectItem>
                  <SelectItem value="Tim_7">Tim 7</SelectItem>
                  <SelectItem value="Tim_Lainnya">Tim Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Mode Penentuan Anggota</label>
              <Select value={formData.mode} onValueChange={(val) => setFormData({ ...formData, mode: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (Pilih satu-satu)</SelectItem>
                  <SelectItem value="filter">Filter Otomatis</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Manual + Filter)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>{editing ? "Simpan Perubahan" : "Buat Tim"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {timConfigs.map((tim) => (
          <div key={tim.id} className="bg-card border border-border rounded-lg p-3 flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-sm">{tim.tim_name}</p>
              <p className="text-xs text-muted-foreground">{categoryLabel[tim.tim_category]} • {tim.mode}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(tim)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tim.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}