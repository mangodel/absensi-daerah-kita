import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Field: pilih nama KK dari anggota di kelompok yang sama, atau ketik manual
// Menerima value (string) dan onChange
export default function FamilyGroupField({ value, onChange, membersInKelompok = [], currentMemberId }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Kumpulkan nama-nama KK unik dari kelompok ini (gabung dari family_group & full_name)
  const existingGroups = Array.from(new Set(
    membersInKelompok
      .filter(m => m.id !== currentMemberId)
      .flatMap(m => {
        const names = [];
        if (m.family_group && m.family_group.trim()) names.push(m.family_group.trim());
        else names.push(m.full_name.trim());
        return names;
      })
  )).sort();

  const filtered = existingGroups.filter(n =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (name) => value === name;

  const handleSelect = (name) => {
    onChange(name === value ? "" : name);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer hover:bg-secondary/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "Pilih atau ketik nama KK..."}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau ketik baru..."
              className="h-7 text-xs"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {/* Opsi ketik manual jika tidak ada di list */}
            {search && !existingGroups.includes(search) && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-accent/10 flex items-center gap-2 text-primary"
                onClick={() => { onChange(search); setOpen(false); setSearch(""); }}
              >
                <span className="font-medium">+ Gunakan: "{search}"</span>
              </button>
            )}
            {filtered.length === 0 && !search && (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                {membersInKelompok.length === 0 ? "Pilih kelompok dulu untuk melihat daftar KK" : "Belum ada anggota lain di kelompok ini"}
              </p>
            )}
            {filtered.map(name => (
              <button
                key={name}
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-secondary/60 flex items-center gap-2"
                onClick={() => handleSelect(name)}
              >
                {isSelected(name) && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                <span className={isSelected(name) ? "font-medium text-primary" : ""}>{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}