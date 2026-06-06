import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Copy, ExternalLink, MapPin, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_FIELDS = [
  { key: "full_name", label: "Nama Lengkap", type: "text", required: true },
  { key: "phone", label: "No. Telepon / WhatsApp", type: "tel", required: false },
  { key: "email", label: "Email", type: "email", required: false },
];

const FIELD_TYPES = [
  { value: "text", label: "Teks" },
  { value: "tel", label: "Telepon" },
  { value: "email", label: "Email" },
  { value: "number", label: "Angka" },
  { value: "select", label: "Pilihan (dropdown)" },
  { value: "textarea", label: "Teks Panjang" },
];

export default function FormConfigEditor({ eventId, eventName }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [welcome, setWelcome] = useState("");
  const [successMsg, setSuccessMsg] = useState("Anda telah terdaftar sebagai peserta.");
  const [sendQr, setSendQr] = useState(true);
  const [maxPax, setMaxPax] = useState("");
  const [geofence, setGeofence] = useState(false);
  const [venueLat, setVenueLat] = useState("");
  const [venueLng, setVenueLng] = useState("");
  const [venueRadius, setVenueRadius] = useState("200");
  const [configId, setConfigId] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const { data: configs = [] } = useQuery({
    queryKey: ["event-form-config", eventId],
    queryFn: () => base44.entities.EventFormConfig.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  useEffect(() => {
    if (configs.length > 0) {
      const c = configs[0];
      setConfigId(c.id);
      try { setFields(JSON.parse(c.fields || JSON.stringify(DEFAULT_FIELDS))); } catch {}
      setWelcome(c.welcome_message || "");
      setSuccessMsg(c.success_message || "Anda telah terdaftar sebagai peserta.");
      setSendQr(c.send_qr_email !== false);
      setMaxPax(c.max_participants ? String(c.max_participants) : "");
      setGeofence(!!c.geofence_enabled);
      setVenueLat(c.venue_lat ? String(c.venue_lat) : "");
      setVenueLng(c.venue_lng ? String(c.venue_lng) : "");
      setVenueRadius(c.venue_radius_m ? String(c.venue_radius_m) : "200");
    }
  }, [configs.length]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const data = {
        event_id: eventId,
        fields: JSON.stringify(fields),
        welcome_message: welcome,
        success_message: successMsg,
        send_qr_email: sendQr,
        max_participants: maxPax ? Number(maxPax) : 0,
        geofence_enabled: geofence,
        venue_lat: venueLat ? Number(venueLat) : null,
        venue_lng: venueLng ? Number(venueLng) : null,
        venue_radius_m: venueRadius ? Number(venueRadius) : 200,
      };
      if (configId) return base44.entities.EventFormConfig.update(configId, data);
      return base44.entities.EventFormConfig.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-form-config", eventId] });
      toast({ description: "Konfigurasi form berhasil disimpan." });
    },
  });

  const addField = () => setFields(f => [...f, { key: `field_${Date.now()}`, label: "Field Baru", type: "text", required: false }]);
  const removeField = (i) => setFields(f => f.filter((_, idx) => idx !== i));
  const updateField = (i, k, v) => setFields(f => f.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  const regLink = `${window.location.origin}/event-register/${eventId}`;

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setVenueLat(String(pos.coords.latitude.toFixed(6)));
        setVenueLng(String(pos.coords.longitude.toFixed(6)));
        setDetectingLocation(false);
      },
      () => { setDetectingLocation(false); toast({ description: "Gagal mendeteksi lokasi.", variant: "destructive" }); }
    );
  };

  if (!eventId) return (
    <div className="text-center py-10 text-muted-foreground text-sm">Pilih event untuk konfigurasi form.</div>
  );

  return (
    <div className="space-y-5">
      {/* Reg Link */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-primary">Link Registrasi Online</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(regLink); toast({ description: "Link disalin!" }); }}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Salin Link
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(regLink, "_blank")}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Buka
            </Button>
          </div>
        </div>
        <p className="text-xs font-mono text-muted-foreground bg-background rounded-lg px-3 py-2 break-all">{regLink}</p>
      </div>

      {/* Email QR */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold">Kirim QR via Email Otomatis</Label>
          </div>
          <Switch checked={sendQr} onCheckedChange={setSendQr} />
        </div>
        <p className="text-xs text-muted-foreground">Setelah mendaftar online, peserta yang mengisi email akan otomatis menerima QR code via email.</p>
      </div>

      {/* Geo-fence */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold">Validasi Lokasi (Geo-fence)</Label>
          </div>
          <Switch checked={geofence} onCheckedChange={setGeofence} />
        </div>
        <p className="text-xs text-muted-foreground">Jika aktif, scan QR hanya valid jika peserta berada dalam radius venue. Cegah check-in dari luar lokasi acara.</p>
        {geofence && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Latitude Venue</Label>
                <Input value={venueLat} onChange={e => setVenueLat(e.target.value)} placeholder="-33.8688" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Longitude Venue</Label>
                <Input value={venueLng} onChange={e => setVenueLng(e.target.value)} placeholder="151.2093" className="text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Radius (meter)</Label>
              <Input value={venueRadius} onChange={e => setVenueRadius(e.target.value)} placeholder="200" type="number" className="text-xs" />
            </div>
            <Button size="sm" variant="outline" onClick={detectLocation} disabled={detectingLocation}>
              <MapPin className="w-3.5 h-3.5 mr-1" />
              {detectingLocation ? "Mendeteksi..." : "Gunakan Lokasi Saat Ini sebagai Venue"}
            </Button>
          </div>
        )}
      </div>

      {/* Pesan */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold">Pesan Form</p>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Pesan Selamat Datang</Label>
          <Input value={welcome} onChange={e => setWelcome(e.target.value)} placeholder="Selamat datang di form pendaftaran..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Pesan Setelah Mendaftar</Label>
          <Input value={successMsg} onChange={e => setSuccessMsg(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Batas Peserta (0 = tak terbatas)</Label>
          <Input type="number" value={maxPax} onChange={e => setMaxPax(e.target.value)} placeholder="0" className="w-32" />
        </div>
      </div>

      {/* Fields */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Field Formulir</p>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Field
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.key} className="flex items-center gap-2 p-3 border border-border rounded-lg bg-secondary/20">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  value={f.label} placeholder="Label..."
                  onChange={e => updateField(i, "label", e.target.value)}
                  className="h-8 text-xs"
                />
                <Select value={f.type} onValueChange={v => updateField(i, "type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {f.type === "select" && (
                <Input
                  value={(f.options || []).join(",")} placeholder="Op1,Op2,Op3..."
                  onChange={e => updateField(i, "options", e.target.value.split(",").map(s => s.trim()))}
                  className="h-8 text-xs w-36"
                />
              )}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Wajib</span>
                <Switch checked={!!f.required} onCheckedChange={v => updateField(i, "required", v)} className="scale-75" />
              </div>
              {!["full_name", "phone", "email"].includes(f.key) && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeField(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
        {saveMut.isPending ? "Menyimpan..." : "Simpan Konfigurasi"}
      </Button>
    </div>
  );
}