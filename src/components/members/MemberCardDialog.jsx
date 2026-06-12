import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import QRCodeDisplay from "@/components/event-attendance/QRCodeDisplay";
import { useAppConfig } from "@/lib/AppConfigContext";
import { useRef } from "react";
import html2canvas from "html2canvas";

export default function MemberCardDialog({ member, open, onClose }) {
  const { config } = useAppConfig();
  const cardRef = useRef(null);

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

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 4, useCORS: true, backgroundColor: null, logging: false });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `KartuMember-${member.member_id || member.full_name}.png`;
    a.click();
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    // Simple PDF generation - convert to canvas then use jsPDF
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(cardRef.current, { scale: 4, useCORS: true, backgroundColor: null, logging: false });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85.6, 53.98], // Credit card size
    });
    pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
    pdf.save(`KartuMember-${member.member_id || member.full_name}.pdf`);
  };

  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWindow = window.open("", "", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Kartu Member - ${member.full_name}</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${cardRef.current.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Kartu Member Digital</h3>
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1" /> Cetak
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1" /> PNG
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* Card */}
         <div ref={cardRef} className="rounded-2xl overflow-hidden shadow-xl" style={{ 
           backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : "none",
           backgroundSize: "cover",
           backgroundPosition: "center",
           background: bgImageUrl ? undefined : bgGradient,
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

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Tekan "Unduh" untuk menyimpan kartu sebagai gambar PNG.
        </p>
      </DialogContent>
    </Dialog>
  );
}