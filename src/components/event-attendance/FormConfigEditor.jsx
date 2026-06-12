/**
 * FormConfigEditor — Edit EventFormConfig per event
 * Termasuk customize background, logo, success message untuk TV display
 */
import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, MessageSquare, Image as ImageIcon, Settings } from "lucide-react";
import { toast } from "sonner";

export default function FormConfigEditor({ eventId, open, onClose }) {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    welcome_message: "",
    success_message: "Selamat Telah Terdaftar",
    success_subtext: "",
    display_background_color: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
    display_logo_url: "",
  });

  const { data: config } = useQuery({
    queryKey: ["event-form-config", eventId],
    queryFn: () => eventId ? base44.entities.EventFormConfig.filter({ event_id: eventId }).then(r => r[0]) : null,
    enabled: !!eventId && open,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        welcome_message: config.welcome_message || "",
        success_message: config.success_message || "Selamat Telah Terdaftar",
        success_subtext: config.success_subtext || "",
        display_background_color: config.display_background_color || "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        display_logo_url: config.display_logo_url || "",
      });
    }
  }, [config]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!config) {
        // Create new
        await base44.entities.EventFormConfig.create({
          event_id: eventId,
          ...formData,
        });
      } else {
        // Update
        await base44.entities.EventFormConfig.update(config.id, formData);
      }
    },
    onSuccess: () => {
      toast.success("Konfigurasi disimpan");
      qc.invalidateQueries({ queryKey: ["event-form-config"] });
      onClose();
    },
    onError: (err) => {
      toast.error("Gagal menyimpan: " + err.message);
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Konfigurasi Event Display</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Pesan
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2">
              <Palette className="w-3.5 h-3.5" /> Tampilan
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2">
              <ImageIcon className="w-3.5 h-3.5" /> Media
            </TabsTrigger>
          </TabsList>

          {/* Pesan Tab */}
          <TabsContent value="messages" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="welcome_message">Pesan Selamat Datang (Form Registrasi)</Label>
              <Textarea
                id="welcome_message"
                value={formData.welcome_message}
                onChange={e => handleChange('welcome_message', e.target.value)}
                placeholder="Ketik pesan sambutan untuk form registrasi..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Ditampilkan di halaman registrasi event</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="success_message">Pesan Sukses (TV Display)</Label>
              <Input
                id="success_message"
                value={formData.success_message}
                onChange={e => handleChange('success_message', e.target.value)}
                placeholder="Selamat Telah Terdaftar"
              />
              <p className="text-xs text-muted-foreground">Ditampilkan di TV saat ada check-in baru (akan di-prefix dengan ✓)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="success_subtext">Sub-text Sukses (opsional)</Label>
              <Textarea
                id="success_subtext"
                value={formData.success_subtext}
                onChange={e => handleChange('success_subtext', e.target.value)}
                placeholder="Teks tambahan yang muncul di bawah nama peserta..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Baris tambahan di popup check-in TV display</p>
            </div>
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="bg_color">Warna Background TV Display</Label>
              <div className="flex gap-2">
                <Input
                  id="bg_color"
                  type="text"
                  value={formData.display_background_color}
                  onChange={e => handleChange('display_background_color', e.target.value)}
                  placeholder="linear-gradient(...) atau hex color"
                  className="flex-1"
                />
                <div
                  className="w-12 h-11 rounded-md border border-input shrink-0"
                  style={{ background: formData.display_background_color }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Contoh gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)</p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-lg h-32 w-full border border-border flex items-center justify-center text-white text-sm"
                  style={{ background: formData.display_background_color }}
                >
                  Preview Background
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL Logo (TV Display Header)</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.display_logo_url}
                onChange={e => handleChange('display_logo_url', e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">Gambar logo yang ditampilkan di header TV display. Ukuran optimal: 56x56px</p>
            </div>

            {formData.display_logo_url && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Preview Logo</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={formData.display_logo_url}
                    alt="Logo Preview"
                    className="h-16 w-16 object-contain rounded-lg border border-border p-2 bg-muted"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}