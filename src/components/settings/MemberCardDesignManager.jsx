import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Image as ImageIcon, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MemberCardDialog from "@/components/members/MemberCardDialog";

export default function MemberCardDesignManager() {
   const { config, reload } = useAppConfig();
   const { toast } = useToast();
   const logoInputRef = useRef();
   const bgImageInputRef = useRef();

   const [saving, setSaving] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [uploadingBg, setUploadingBg] = useState(false);
   const [showPreview, setShowPreview] = useState(false);
   const [cardDesign, setCardDesign] = useState({
     bg_gradient: config.card_bg_gradient || "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)",
     bg_image_url: config.card_bg_image_url || "",
     accent_color: config.card_accent_color || "#60a5fa",
     logo_url: config.card_logo_url || config.logo_url || "",
     show_member_id: config.card_show_member_id !== false,
     show_desa_kelompok: config.card_show_desa_kelompok !== false,
     show_dapukan: config.card_show_dapukan !== false,
     show_birth_year: config.card_show_birth_year !== false,
     show_qr_code: config.card_show_qr_code !== false,
     allow_register_portal: config.allow_register_portal !== false,
   });

  const previewMember = {
    member_id: "AUNZ000001",
    full_name: "Contoh Jamaah",
    desa: "Desa Contoh",
    kelompok: "Kelompok Contoh",
    dapukan: "Wakil Keimaman",
    birth_year: 1990,
    status: "Aktif",
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCardDesign(prev => ({ ...prev, logo_url: file_url }));
    setUploading(false);
  };

  const handleBgImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCardDesign(prev => ({ ...prev, bg_image_url: file_url }));
    setUploadingBg(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertConfig = async (key, value, label) => {
        const existing = await base44.entities.AppConfig.filter({ key });
        const strVal = typeof value === "string" ? value : JSON.stringify(value);
        if (existing.length > 0) {
          await base44.entities.AppConfig.update(existing[0].id, { value: strVal });
        } else {
          await base44.entities.AppConfig.create({ key, value: strVal, label });
        }
      };

      await upsertConfig("card_bg_gradient", cardDesign.bg_gradient, "Member Card Background Gradient");
       await upsertConfig("card_bg_image_url", cardDesign.bg_image_url, "Member Card Background Image");
       await upsertConfig("card_accent_color", cardDesign.accent_color, "Member Card Accent Color");
       await upsertConfig("card_logo_url", cardDesign.logo_url, "Member Card Logo");
       await upsertConfig("card_show_member_id", cardDesign.show_member_id, "Show Member ID");
       await upsertConfig("card_show_desa_kelompok", cardDesign.show_desa_kelompok, "Show Desa/Kelompok");
       await upsertConfig("card_show_dapukan", cardDesign.show_dapukan, "Show Dapukan");
       await upsertConfig("card_show_birth_year", cardDesign.show_birth_year, "Show Birth Year");
       await upsertConfig("card_show_qr_code", cardDesign.show_qr_code, "Show QR Code");
       await upsertConfig("allow_register_portal", cardDesign.allow_register_portal, "Allow Register Button in Portal");

      await reload();
      toast({ title: "Desain kartu berhasil disimpan!" });
    } catch (error) {
      toast({ title: "Gagal menyimpan desain kartu", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-sm text-foreground">Desain Kartu Member Digital</h2>
        <p className="text-xs text-muted-foreground">Sesuaikan tampilan kartu member yang ditampilkan di portal jamaah</p>

        {/* Background Options */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div>
            <Label className="text-xs text-muted-foreground">Background Gambar (opsional)</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Jika diupload, gambar akan digunakan sebagai background kartu</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
                {cardDesign.bg_image_url ? <img src={cardDesign.bg_image_url} alt="Background" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="space-y-1.5 flex-1">
                <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                <Button size="sm" variant="outline" onClick={() => bgImageInputRef.current?.click()} disabled={uploadingBg}>
                  {uploadingBg ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                  {uploadingBg ? "Mengupload..." : "Upload Gambar"}
                </Button>
                {cardDesign.bg_image_url && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCardDesign(prev => ({ ...prev, bg_image_url: "" }))}>Hapus</Button>}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Background Gradient CSS (fallback)</Label>
            <p className="text-[11px] text-muted-foreground">Digunakan jika gambar tidak ada. Contoh: linear-gradient(135deg, #color1 0%, #color2 100%)</p>
            <Input
              value={cardDesign.bg_gradient}
              onChange={e => setCardDesign(prev => ({ ...prev, bg_gradient: e.target.value }))}
              placeholder="linear-gradient(135deg, #1e1b4b 0%, #1e40af 100%)"
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground">Warna Accent (untuk text label)</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={cardDesign.accent_color}
              onChange={e => setCardDesign(prev => ({ ...prev, accent_color: e.target.value }))}
              className="w-16 h-10"
            />
            <Input
              value={cardDesign.accent_color}
              onChange={e => setCardDesign(prev => ({ ...prev, accent_color: e.target.value }))}
              placeholder="#60a5fa"
              className="text-xs font-mono flex-1"
            />
          </div>
        </div>

        {/* Card Logo */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground">Logo Kartu (opsional)</Label>
          <p className="text-[11px] text-muted-foreground">Jika kosong, akan menggunakan logo organisasi</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden shrink-0">
              {cardDesign.logo_url ? <img src={cardDesign.logo_url} alt="Card Logo" className="w-full h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="space-y-1.5 flex-1">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                {uploading ? "Mengupload..." : "Upload Logo"}
              </Button>
              {cardDesign.logo_url && <Button size="sm" variant="ghost" className="text-destructive ml-2" onClick={() => setCardDesign(prev => ({ ...prev, logo_url: "" }))}>Hapus</Button>}
            </div>
          </div>
        </div>

        {/* Visibility Toggles */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground">Tampilkan di Kartu</Label>
          <div className="space-y-2">
            {[
              { key: "show_member_id", label: "ID Member (AUNZ000001)" },
              { key: "show_desa_kelompok", label: "Desa & Kelompok" },
              { key: "show_dapukan", label: "Dapukan" },
              { key: "show_birth_year", label: "Tahun Lahir & Usia" },
              { key: "show_qr_code", label: "QR Code" },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cardDesign[item.key]}
                  onChange={e => setCardDesign(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </label>
            ))}
          </div>
          </div>

          {/* Portal Registration */}
          <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground">Portal Jamaah</Label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cardDesign.allow_register_portal}
              onChange={e => setCardDesign(prev => ({ ...prev, allow_register_portal: e.target.checked }))}
              className="rounded"
            />
            <span className="text-xs text-muted-foreground">Tampilkan tombol "Daftar Akun Baru" di portal</span>
          </label>
        </div>

        {/* Preview Button */}
        <div className="pt-2 border-t border-border">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
            <Eye className="w-3.5 h-3.5" /> Lihat Preview
          </Button>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Simpan Desain Kartu
      </Button>

      {/* Preview Dialog */}
      <MemberCardDialog member={previewMember} open={showPreview} onClose={() => setShowPreview(false)} />
    </div>
  );
}