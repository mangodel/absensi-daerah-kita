import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  REMINDER_OPTIONS,
  getReminderForEvent,
  saveReminder,
  requestNotificationPermission,
  formatMinutes,
} from "@/hooks/useEventReminders";
import { toast } from "sonner";

export default function EventReminderButton({ event }) {
  const [current, setCurrent] = useState(null);
  const [permission, setPermission] = useState("default");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setCurrent(getReminderForEvent(event.id));
    if ("Notification" in window) setPermission(Notification.permission);
  }, [event.id]);

  const handleSelect = async (minutes) => {
    let perm = permission;
    if (perm !== "granted") {
      perm = await requestNotificationPermission();
      setPermission(perm);
    }

    if (perm === "denied") {
      toast.error("Izin notifikasi ditolak. Aktifkan di pengaturan browser/HP Anda.");
      setOpen(false);
      return;
    }

    if (perm !== "granted") {
      toast.error("Izin notifikasi belum diberikan.");
      setOpen(false);
      return;
    }

    if (minutes === current) {
      // Toggle off
      saveReminder(event.id, null);
      setCurrent(null);
      toast.success("Pengingat dinonaktifkan");
    } else {
      saveReminder(event.id, minutes);
      setCurrent(minutes);
      toast.success(`Pengingat diaktifkan: ${formatMinutes(minutes)} sebelum acara`);
    }
    setOpen(false);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    saveReminder(event.id, null);
    setCurrent(null);
    toast.success("Pengingat dihapus");
  };

  const isSet = current !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors border
            ${isSet
              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
            }`}
        >
          {isSet ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
          {isSet ? formatMinutes(current) : "Ingatkan"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold text-foreground mb-2 px-1">Ingatkan saya:</p>
        <div className="space-y-0.5">
          {REMINDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors
                ${current === opt.value
                  ? "bg-amber-100 text-amber-800 font-semibold"
                  : "hover:bg-secondary text-foreground"
                }`}
            >
              <span>{opt.label}</span>
              {current === opt.value && <Check className="w-3 h-3 text-amber-600" />}
            </button>
          ))}
        </div>
        {isSet && (
          <button
            onClick={handleRemove}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-1 rounded-md text-xs text-destructive hover:bg-destructive/10 border-t border-border pt-2"
          >
            <BellOff className="w-3 h-3" /> Hapus pengingat
          </button>
        )}
        {permission === "unsupported" && (
          <p className="text-[10px] text-muted-foreground px-1 mt-2">Browser tidak mendukung notifikasi</p>
        )}
      </PopoverContent>
    </Popover>
  );
}