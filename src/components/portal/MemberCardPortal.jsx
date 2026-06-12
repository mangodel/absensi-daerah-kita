import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Smartphone, Loader2 } from "lucide-react";
import MemberCardDialog from "@/components/members/MemberCardDialog";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { useAppConfig } from "@/lib/AppConfigContext";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/event-attendance/QRCodeDisplay";
import { Badge } from "@/components/ui/badge";

export default function MemberCardPortal({ member }) {
  const { config } = useAppConfig();
  const cardRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingWallet, setGeneratingWallet] = useState(false);

  if (!member) return null;

  const currentYear = new Date().getFullYear();
  const age = member.birth_year ? currentYear - member.birth_year : null;
  const isGenerus = age !== null && age < 18;

  const bgGradient = config.card_bg_gradient || "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)";
  const accentColor = config.card_accent_color || "#60a5fa";
  const cardLogo = config.card_logo_url || config.logo_url;
  const showMemberId = config.card_show_member_id !== false;
  const showDesaKelompok = config.card_show_desa_kelompok !== false;
  const showDapukan = config.card_show_dapukan !== false;
  const showBirthYear = config.card_show_birth_year !== false;
  const showQR = config.card_show_qr_code !== false;

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `KartuMember-${member.member_id}.png`;
    a.click();
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85.6, 53.98],
    });
    pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
    pdf.save(`KartuMember-${member.member_id}.pdf`);
  };

  const handleGenerateWallet = async () => {
    setGeneratingWallet(true);
    try {
      // Generate Apple Wallet PKPass
      const result = await base44.functions.invoke('generateWalletPass', {
        member_id: member.member_id,
        full_name: member.full_name,
        desa: member.desa,
        kelompok: member.kelompok,
        type: 'generic', // 'generic' untuk Apple Wallet
      });

      if (result.data?.wallet_url) {
        window.open(result.data.wallet_url, '_blank');
        toast.success('Wallet pass dibuat! File akan diunduh.');
      } else {
        toast.error('Gagal membuat wallet pass');
      }
    } catch (error) {
      toast.error('Gagal membuat wallet pass');
    } finally {
      setGeneratingWallet(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Kartu Member Digital</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-1">Kartu member Anda dapat diunduh dan dibagikan</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Card Preview */}
          <div ref={cardRef} className="rounded-xl overflow-hidden shadow-lg" style={{ background: bgGradient, width: "100%", aspectRatio: "1.586" }}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between h-full flex-col">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {cardLogo && (
                    <img src={cardLogo} alt="Logo" className="w-6 h-6 object-contain rounded" />
                  )}
                  <div>
                    <p className="text-white font-bold text-[10px] leading-tight">{config.org_name || "Organisasi"}</p>
                    <p className="text-white/70 text-[8px] leading-tight">{config.org_subtitle || ""}</p>
                  </div>
                </div>
                <Badge className={`text-[8px] px-1.5 py-0.5 ${isGenerus ? "bg-amber-500/80 text-white" : "text-white/70"}`}>
                  {isGenerus ? "Generus" : "Jamaah"}
                </Badge>
              </div>

              <div className="w-full flex items-end justify-between gap-2">
                <div className="flex-1 space-y-1">
                  {showMemberId && (
                    <div>
                      <p className="text-white/70 text-[7px] uppercase tracking-wider">ID</p>
                      <p className="text-white font-mono font-bold text-[11px]">{member.member_id}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-white/70 text-[7px] uppercase">Nama</p>
                    <p className="text-white font-semibold text-[9px] truncate">{member.full_name}</p>
                  </div>
                  {showDesaKelompok && (
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <p className="text-white/70 text-[7px] uppercase">Desa</p>
                        <p className="text-white text-[8px] truncate">{member.desa}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-[7px] uppercase">Kelompok</p>
                        <p className="text-white text-[8px] truncate">{member.kelompok}</p>
                      </div>
                    </div>
                  )}
                </div>

                {showQR && member.member_id && (
                  <div className="bg-white rounded-lg p-1 shrink-0">
                    <QRCodeDisplay value={member.member_id} size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleDownloadPNG} variant="outline" className="flex-1 gap-2 text-sm">
              <Download className="w-4 h-4" /> PNG
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 gap-2 text-sm">
              <Download className="w-4 h-4" /> PDF
            </Button>
            <Button onClick={() => setShowPreview(true)} variant="outline" className="flex-1 gap-2 text-sm">
              <Printer className="w-4 h-4" /> Cetak
            </Button>
            <Button onClick={handleGenerateWallet} disabled={generatingWallet} className="flex-1 gap-2 text-sm">
              {generatingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              {generatingWallet ? "Membuat..." : "Wallet"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Tambahkan ke Apple Wallet atau Google Wallet untuk akses mudah
          </p>
        </CardContent>
      </Card>

      {/* Full Preview Dialog */}
      <MemberCardDialog member={member} open={showPreview} onClose={() => setShowPreview(false)} />
    </div>
  );
}