import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Camera, X } from "lucide-react";

export default function PhotoUploadField({ value, onChange, size = "md" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Ukuran foto maksimal 3MB");
      return;
    }
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      onChange(res.file_url);
    } catch {
      alert("Gagal upload foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const dimensions = size === "lg" ? "w-20 h-20" : size === "sm" ? "w-12 h-12" : "w-16 h-16";

  return (
    <div className="flex items-center gap-4">
      <div className={`${dimensions} rounded-full overflow-hidden border-2 border-border bg-secondary flex items-center justify-center shrink-0`}>
        {value ? (
          <img src={value} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {uploading ? "Mengunggah..." : value ? "Ganti Foto" : "Upload Foto"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} className="text-destructive text-xs h-7">
            <X className="w-3 h-3" /> Hapus
          </Button>
        )}
      </div>
    </div>
  );
}