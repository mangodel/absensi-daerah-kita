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
            placeholder="Cari alamat, nama tempat..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="text-sm"
          />
          <Button size="sm" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {searchError && <p className="text-xs text-destructive">{searchError}</p>}

        {/* Map */}
        <div className="rounded-lg overflow-hidden border border-border" style={{ height: 360 }}>
          <MapContainer
            center={defaultCenter}
            zoom={markerPos ? 16 : 12}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onPick={handlePick} />
            {markerPos && <Marker position={[markerPos.lat, markerPos.lng]} />}
          </MapContainer>
        </div>

        <p className="text-xs text-muted-foreground">Klik pada peta untuk menentukan titik venue.</p>

        {markerPos && (
          <div className="bg-secondary/30 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground">
            Lat: {markerPos.lat.toFixed(6)}, Lng: {markerPos.lng.toFixed(6)}
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