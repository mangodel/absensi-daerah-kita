import { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function VenueLocationPicker({ lat, lng, onConfirm, onClose }) {
  const [markerPos, setMarkerPos] = useState(
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const mapRef = useRef(null);

  const defaultCenter = markerPos
    ? [markerPos.lat, markerPos.lng]
    : [-33.8688, 151.2093]; // Default: Sydney

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "id,en" } }
      );
      const data = await res.json();
      if (data.length === 0) {
        setSearchError("Alamat tidak ditemukan. Coba kata kunci lain.");
      } else {
        const { lat: foundLat, lon: foundLng } = data[0];
        const pos = { lat: Number(foundLat), lng: Number(foundLng) };
        setMarkerPos(pos);
        if (mapRef.current) {
          mapRef.current.setView([pos.lat, pos.lng], 16);
        }
      }
    } catch {
      setSearchError("Gagal mencari alamat. Periksa koneksi internet.");
    } finally {
      setSearching(false);
    }
  };

  const handlePick = (lat, lng) => {
    setMarkerPos({ lat, lng });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" /> Pilih Lokasi Venue
          </p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Cari alamat, nama tempat, kota..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="text-sm text-gray-900 placeholder:text-gray-500"
          />
          <Button size="sm" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {searchError && <p className="text-xs font-medium text-red-600">{searchError}</p>}

        {/* Hint */}
        <p className="text-xs font-medium text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          🗺️ Cari alamat di atas <strong>atau klik langsung pada peta</strong> untuk menentukan titik venue.
        </p>

        {/* Map */}
        <div className="rounded-lg overflow-hidden border-2 border-gray-300 shadow-md" style={{ height: 380 }}>
          <MapContainer
            center={defaultCenter}
            zoom={markerPos ? 16 : 12}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, USGS'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            />
            <MapClickHandler onPick={handlePick} />
            {markerPos && <Marker position={[markerPos.lat, markerPos.lng]} />}
          </MapContainer>
        </div>

        {markerPos ? (
          <div className="bg-green-50 border border-green-300 rounded-lg px-3 py-2 text-xs font-semibold text-green-800">
            ✅ Titik dipilih: {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500">
            Belum ada titik dipilih.
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button
            size="sm"
            disabled={!markerPos}
            onClick={() => {
              onConfirm(markerPos.lat.toFixed(6), markerPos.lng.toFixed(6));
              onClose();
            }}
          >
            Gunakan Lokasi Ini
          </Button>
        </div>
      </div>
    </div>
  );
}