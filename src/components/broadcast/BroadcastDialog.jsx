import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Users, Mail, Bell, AlertCircle, Video } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useToast } from "@/components/ui/use-toast";

export default function BroadcastDialog({ 
  open, 
  onOpenChange, 
  members = [], 
  onSent,
  scopeOverride,
  desaOverride,
  kelompokOverride
}) {
  const { config } = useAppConfig();
  const { toast } = useToast();
  const desaList = config.desa_list || [];
  const kelompokList = config.kelompok_list || [];

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [scope, setScope] = useState(scopeOverride || "Semua");
  const [targetDesa, setTargetDesa] = useState(desaOverride || "");
  const [targetKelompok, setTargetKelompok] = useState(kelompokOverride || "");
  const [channel, setChannel] = useState("Portal");
  const [sending, setSending] = useState(false);

  // Hitung estimasi penerima
  const estimatedRecipients = (() => {
    const active = members.filter(m => m.status !== "Tidak Aktif");
    if (scope === "Semua") return active.length;
    if (scope === "Desa" && targetDesa) return active.filter(m => m.desa === targetDesa).length;
    if (scope === "Kelompok" && targetKelompok) return active.filter(m => m.kelompok === targetKelompok).length;
    return 0;
  })();

  const emailCount = (() => {
    const active = members.filter(m => m.status !== "Tidak Aktif");
    let targets = active;
    if (scope === "Desa" && targetDesa) targets = active.filter(m => m.desa === targetDesa);
    if (scope === "Kelompok" && targetKelompok) targets = active.filter(m => m.kelompok === targetKelompok);
    return targets.filter(m => m.email && m.email.includes("@")).length;
  })();

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Judul dan pesan wajib diisi", variant: "destructive" });
      return;
    }
    if (scope === "Desa" && !targetDesa) {
      toast({ title: "Pilih Desa terlebih dahulu", variant: "destructive" });
      return;
    }
    if (scope === "Kelompok" && !targetKelompok) {
      toast({ title: "Pilih Kelompok terlebih dahulu", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const res = await base44.functions.invoke("sendBroadcast", {
        title,
        message,
        zoom_link: zoomLink,
        target_scope: scope,
        target_desa: targetDesa,
        target_kelompok: targetKelompok,
        channel
      });

      const data = res.data;
      toast({
        title: "Broadcast berhasil dikirim!",
        description: channel === "Email"
          ? `${data.emails_sent} email terkirim ke jamaah.`
          : `Pesan tersimpan untuk ${data.recipients_targeted} jamaah.`
      });

      // Reset form
      setTitle(""); setMessage(""); setZoomLink(""); setScope("Semua");
      setTargetDesa(""); setTargetKelompok(""); setChannel("Portal");
      onSent?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Gagal mengirim broadcast", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Kirim Broadcast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Channel */}
          <div className="flex gap-2">
            <button
              onClick={() => setChannel("Portal")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${channel === "Portal" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
            >
              <Bell className="w-4 h-4" />
              Notifikasi Portal
            </button>
            <button
              onClick={() => setChannel("Email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${channel === "Email" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Penerima</Label>
            <Select value={scope} onValueChange={v => { setScope(v); setTargetDesa(""); setTargetKelompok(""); }} disabled={!!scopeOverride}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Jamaah Aktif</SelectItem>
                <SelectItem value="Desa">Per Desa</SelectItem>
                <SelectItem value="Kelompok">Per Kelompok</SelectItem>
              </SelectContent>
            </Select>
            {scope === "Desa" && (
              <Select value={targetDesa} onValueChange={setTargetDesa} disabled={!!desaOverride}>
                <SelectTrigger><SelectValue placeholder="Pilih Desa..." /></SelectTrigger>
                <SelectContent>
                  {desaList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {scope === "Kelompok" && (
              <Select value={targetKelompok} onValueChange={setTargetKelompok} disabled={!!kelompokOverride}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelompok..." /></SelectTrigger>
                <SelectContent>
                  {kelompokList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Estimasi penerima */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${estimatedRecipients === 0 ? "bg-amber-50 text-amber-700" : "bg-primary/5 text-primary"}`}>
            <Users className="w-4 h-4 shrink-0" />
            <span>
              {estimatedRecipients > 0
                ? <>Estimasi <strong>{estimatedRecipients}</strong> penerima{channel === "Email" && ` (${emailCount} punya email)`}</>
                : "Tidak ada penerima yang cocok"
              }
            </span>
          </div>

          {/* Email warning jika tidak ada email */}
          {channel === "Email" && emailCount === 0 && estimatedRecipients > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Tidak ada jamaah dalam target ini yang memiliki email terdaftar.
            </div>
          )}

          {/* Judul */}
          <div className="space-y-1.5">
            <Label>Judul Pesan</Label>
            <Input
              placeholder="cth: Perubahan Jadwal Pengajian Minggu Ini"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Isi Pesan */}
          <div className="space-y-1.5">
            <Label>Isi Pesan</Label>
            <Textarea
              placeholder="Tulis isi pesan broadcast di sini..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Zoom Link (Opsional) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Link Zoom (Opsional)
            </Label>
            <Input
              placeholder="https://zoom.us/j/..."
              value={zoomLink}
              onChange={e => setZoomLink(e.target.value)}
              type="url"
            />
          </div>

          {/* Tombol */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={sending}>
              Batal
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSend} disabled={sending || estimatedRecipients === 0}>
              {sending ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Mengirim...</>
              ) : (
                <><Send className="w-4 h-4" />Kirim Sekarang</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}