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
  const bgImageUrl = config.card_bg_image_url;
  const accentColor = config.card_accent_color || "#60a5fa";
  const cardLogo = config.card_logo_url || config.logo_url;
  const showMemberId = config.card_show_member_id !== false;
  const showDesaKelompok = config.card_show_desa_kelompok !== false;
  const showDapukan = config.card_show_dapukan !== false;
  const showBirthYear = config.card_show_birth_year !== false;
  const showQR = config.card_show_qr_code !== false;

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 4, useCORS: true, backgroundColor: null, logging: false });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `KartuMember-${member.member_id}.png`;
    a.click();
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(cardRef.current, { scale: 4, useCORS: true, backgroundColor: null, logging: false });
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
          <div ref={cardRef} className="rounded-xl overflow-hidden shadow-lg" style={{ 
            backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            background: bgImageUrl ? undefined : bgGradient,
            width: "100%", 
            aspectRatio: "1.586" 
          }}>
            <div className="px-5 pt-5 pb-4 flex flex-col justify-between h-full">
              {/* Header - Logo & Org */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {cardLogo && (
                    <img src={cardLogo} alt="Logo" className="h-9 object-contain" />
                  )}
                </div>
                <div className="text-white mb-3">
                  <p className="text-[9px] uppercase tracking-wider opacity-80 font-semibold">Kartu Anggota</p>
                </div>
              </div>

              {/* Main Content */}
              <div className="space-y-3 flex-1">
                {/* Member ID Section */}
                {showMemberId && (
                  <div>
                    <p className="text-white/70 text-[8px] uppercase tracking-wider font-semibold mb-0.5">ID Member</p>
                    <p className="text-white font-mono font-bold text-[14px] tracking-wide">{member.member_id}</p>
                  </div>
                )}

                {/* Name Section */}
                <div>
                  <p className="text-white/70 text-[8px] uppercase tracking-wider font-semibold mb-0.5">Nama Lengkap</p>
                  <p className="text-white font-bold text-[15px] leading-snug">{member.full_name}</p>
                </div>

                {/* Desa & Kelompok */}
                {showDesaKelompok && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-white/70 text-[7px] uppercase tracking-wider font-semibold mb-0.5">Desa</p>
                      <p className="text-white text-[11px] font-semibold truncate">{member.desa}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-[7px] uppercase tracking-wider font-semibold mb-0.5">Kelompok</p>
                      <p className="text-white text-[11px] font-semibold truncate">{member.kelompok}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code - Bottom Center */}
              {showQR && member.member_id && (
                <div className="flex justify-center mt-2">
                  <div className="bg-white rounded-lg p-1.5">
                    <QRCodeDisplay value={member.member_id} size={90} />
                  </div>
                </div>
              )}
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