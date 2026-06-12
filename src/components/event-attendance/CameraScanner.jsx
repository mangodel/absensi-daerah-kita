/**
 * CameraScanner — wrapper around QRPhotoScanner for use in EventAttendance / QRScanner.
 * Replaced live video stream with photo-based scanning for universal iPad/mobile compatibility.
 */
import QRPhotoScanner from "@/components/shared/QRPhotoScanner";

export default function CameraScanner({ onScan, active }) {
  if (!active) return null;
  return (
    <div className="py-2">
      <QRPhotoScanner
        onScan={onScan}
        label="Foto QR Peserta"
      />
    </div>
  );
}