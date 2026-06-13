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
    // Calculate proper dimensions (ISO/IEC 7810 ID-1: 85.6mm x 53.98mm)
    const pngWidth = canvas.width;
    const pngHeight = (pngWidth * 53.98) / 85.6; // Maintain aspect ratio
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = pngWidth;
    resizedCanvas.height = pngHeight;
    const ctx = resizedCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0, pngWidth, pngHeight);
    
    const a = document.createElement("a");
    a.href = resizedCanvas.toDataURL("image/png");
    a.download = `KartuMember-${member.member_id}.png`;
    a.click();
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(cardRef.current, { scale: 4, useCORS: true, backgroundColor: null, logging: false });
    const imgData = canvas.toDataURL("image/png");
    
    // ISO/IEC 7810 ID-1 dimensions: 85.6mm x 53.98mm
    const pdfWidth = 85.6;
    const pdfHeight = 53.98;
    
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [pdfHeight, pdfWidth],
    });
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`KartuMember-${member.member_id}.pdf`);
  };

  const handleGenerateWallet = async () => {
    setGeneratingWallet(true);
    try {
      // Generate member card as PNG first, then open in Google Wallet intent
      if (!cardRef.current) {
        toast.error('Kartu tidak ditemukan');
        return;
      }

      const canvas = await html2canvas(cardRef.current, { scale: 4, useCORS: true, backgroundColor: null, logging: false });
      const pngWidth = canvas.width;
      const pngHeight = (pngWidth * 53.98) / 85.6;
      const resizedCanvas = document.createElement("canvas");
      resizedCanvas.width = pngWidth;
      resizedCanvas.height = pngHeight;
      const ctx = resizedCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, 0, pngWidth, pngHeight);
      
      const pngDataUrl = resizedCanvas.toDataURL("image/png");
      
      // Try to open Google Wallet for Android
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = userAgent.includes('android');
      const isIOS = userAgent.includes('iphone') || userAgent.includes('ipad');
      
      if (isAndroid) {
        // For Android, try Google Wallet deep link
        const googleWalletUrl = `https://pay.google.com/gp/w/u/0/save/generic`;
        window.open(googleWalletUrl, '_blank');
        toast.success('Buka Google Wallet untuk menambahkan kartu member');
      } else if (isIOS) {
        // For iOS, try Apple Wallet deep link
        const appleWalletUrl = `https://wallet.apple.com`;
        window.open(appleWalletUrl, '_blank');
        toast.success('Buka Apple Wallet untuk menambahkan kartu member');
      } else {
        // For desktop, show PNG download option
        const a = document.createElement("a");
        a.href = pngDataUrl;
        a.download = `KartuMember-${member.member_id}.png`;
        a.click();
        toast.success('Kartu member diunduh. Anda dapat menambahkannya ke wallet secara manual.');
      }
    } catch (error) {
      console.error('Wallet error:', error);
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
            <div className="px-7 pt-5 pb-6 flex flex-col justify-between h-full">
              {/* Header */}
              <div className="flex items-center gap-3">
                {cardLogo && (
                  <div className="bg-white rounded-xl p-2 flex items-center justify-center">
                    <img src={cardLogo} alt="Logo" className="h-10 object-contain" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-bold text-[18px] leading-tight">DAERAH AUSTRALIA & NEW ZEALAND</p>
                </div>
              </div>

              {/* Main Content - Bottom Section */}
              <div className="flex items-flex-end justify-between">
                {/* Left - Member Details */}
                <div className="flex-1">
                  {/* Member ID */}
                  {showMemberId && (
                    <div className="mb-4">
                      <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold mb-1">Member ID</p>
                      <p className="text-white font-mono font-bold text-[24px] tracking-wide leading-none">{member.member_id}</p>
                    </div>
                  )}

                  {/* Nama Lengkap */}
                  <div className="mb-5">
                    <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold mb-1">Nama Lengkap</p>
                    <p className="text-white font-bold text-[20px] leading-tight">{member.full_name}</p>
                  </div>

                  {/* Desa & Kelompok */}
                  {showDesaKelompok && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mb-0.5">Desa</p>
                        <p className="text-white font-semibold text-[14px]">{member.desa}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mb-0.5">Kelompok</p>
                        <p className="text-white font-semibold text-[14px]">{member.kelompok}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right - QR Code */}
                {showQR && member.member_id && (
                  <div className="flex justify-center">
                    <div className="bg-white rounded-2xl p-3">
                      <QRCodeDisplay value={member.member_id} size={130} />
                    </div>
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