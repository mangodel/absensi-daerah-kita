import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `KartuMember-${member.member_id || member.full_name}.png`;
    a.click();
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    // Simple PDF generation - convert to canvas then use jsPDF
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
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
           background: bgImageUrl ? undefined : bgGradient
         }}>
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cardLogo && (
                <img src={cardLogo} alt="Logo" className="w-8 h-8 object-contain rounded" />
              )}
              <div>
                <p className="text-white font-bold text-xs leading-tight">{config.org_name || "Organisasi"}</p>
                <p className="text-white/70 text-[9px] leading-tight">{config.org_subtitle || ""}</p>
              </div>
            </div>
            <Badge className={`text-[9px] px-2 py-0.5 ${isGenerus ? "bg-amber-500/80 text-white" : "text-white/70"}`}>
              {isGenerus ? "Generus" : "Jamaah"}
            </Badge>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-white/20 mb-4" />

          {/* Body */}
          <div className="px-5 pb-5 flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* ID */}
                  {showMemberId && (
                    <div>
                      <p className="text-white font-mono font-bold text-lg tracking-widest">
                        {member.member_id || "—"}
                      </p>
                    </div>
                  )}
                  {/* Name */}
                  <div>
                    <p className="text-white font-bold text-base leading-tight">{member.full_name}</p>
                  </div>
                  {/* Desa / Kelompok */}
                  {showDesaKelompok && (
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-white/70 text-[8px] uppercase tracking-wider">Desa</p>
                        <p className="text-white font-semibold text-sm truncate">{member.desa || "—"}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-[8px] uppercase tracking-wider">Kelompok</p>
                        <p className="text-white font-semibold text-sm truncate">{member.kelompok || "—"}</p>
                      </div>
                    </div>
                  )}
              {/* Dapukan */}
              {showDapukan && member.dapukan && member.dapukan !== "Jamaah" && (
                <div>
                  <p className="text-white/70 text-[9px] uppercase tracking-wider">Dapukan</p>
                  <p className="text-white text-xs">{member.dapukan}</p>
                </div>
              )}
            </div>

            {/* QR Code */}
            {showQR && member.member_id && (
              <div className="bg-white rounded-xl p-1.5 shrink-0">
                <QRCodeDisplay value={member.member_id} size={72} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-black/20 px-5 py-2 flex items-center justify-between">
            <p className="text-white/70 text-[9px]">Status: <span className={`font-semibold ${member.status === "Aktif" ? "text-green-400" : "text-red-400"}`}>{member.status || "Aktif"}</span></p>
            {showBirthYear && age && <p className="text-white/70 text-[9px]">Lahir: {member.birth_year} ({age} th)</p>}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Tekan "Unduh" untuk menyimpan kartu sebagai gambar PNG.
        </p>
      </DialogContent>
    </Dialog>
  );
}