/**
 * CameraScanner — wrapper around QRPhotoScanner for use in EventAttendance / QRScanner.
 * Replaced live video stream with photo-based scanning for universal iPad/mobile compatibility.
 */
import QRPhotoScanner from "@/components/shared/QRPhotoScanner";

export default function CameraScanner({ onScan, active }) {
  return (
    <div className={`py-2 ${active ? "block" : "hidden"}`}>
      <QRPhotoScanner
        onScan={onScan}
        label="Aktifkan Kamera & Foto QR"
      />
    </div>
  );
}