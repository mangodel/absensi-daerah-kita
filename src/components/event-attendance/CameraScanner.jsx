import ContinuousCameraScanner from "@/components/shared/ContinuousCameraScanner";

export default function CameraScanner({ onScan, active }) {
  return (
    <div className={`py-2 ${active ? "block" : "hidden"}`}>
      <ContinuousCameraScanner onScan={onScan} />
    </div>
  );
}