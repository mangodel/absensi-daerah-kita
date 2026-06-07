import { useEffect, useCallback } from "react";

const STORAGE_KEY = "jamaah_event_reminders";

export function getReminders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveReminder(eventId, minutesBefore) {
  const reminders = getReminders();
  if (minutesBefore === null) {
    delete reminders[eventId];
  } else {
    reminders[eventId] = minutesBefore;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export function getReminderForEvent(eventId) {
  const reminders = getReminders();
  return reminders[eventId] ?? null;
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function sendNotification(title, body, icon) {
  if (Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    icon: icon || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `event-reminder-${Date.now()}`,
    vibrate: [200, 100, 200],
  });
}

// Check all saved reminders and fire notifications for events coming up soon
export function checkAndFireReminders(events) {
  const reminders = getReminders();
  const now = new Date();
  const firedKey = "jamaah_fired_reminders";
  let fired = {};
  try { fired = JSON.parse(localStorage.getItem(firedKey) || "{}"); } catch {}

  for (const [eventId, minutesBefore] of Object.entries(reminders)) {
    const event = events.find(e => e.id === eventId);
    if (!event || !event.date) continue;

    // Build event datetime (event.date is YYYY-MM-DD, assume 00:00 if no time)
    const eventTime = new Date(event.date + "T00:00:00");
    const reminderTime = new Date(eventTime.getTime() - minutesBefore * 60 * 1000);
    const windowStart = new Date(now.getTime() - 60 * 1000); // 1 minute window
    const windowEnd = new Date(now.getTime() + 60 * 1000);

    const firedId = `${eventId}-${minutesBefore}`;
    if (fired[firedId]) continue; // already fired

    if (reminderTime >= windowStart && reminderTime <= windowEnd) {
      const label = formatMinutes(minutesBefore);
      sendNotification(
        `🗓️ Kegiatan dalam ${label}`,
        `${event.name}${event.location ? ` • ${event.location}` : ""}`,
      );
      fired[firedId] = true;
      localStorage.setItem(firedKey, JSON.stringify(fired));
    }
  }
}

export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} menit`;
  if (minutes < 1440) return `${minutes / 60} jam`;
  return `${minutes / 1440} hari`;
}

export const REMINDER_OPTIONS = [
  { label: "10 menit sebelum", value: 10 },
  { label: "30 menit sebelum", value: 30 },
  { label: "1 jam sebelum", value: 60 },
  { label: "2 jam sebelum", value: 120 },
  { label: "3 jam sebelum", value: 180 },
  { label: "6 jam sebelum", value: 360 },
  { label: "12 jam sebelum", value: 720 },
  { label: "1 hari sebelum", value: 1440 },
  { label: "2 hari sebelum", value: 2880 },
  { label: "3 hari sebelum", value: 4320 },
  { label: "1 minggu sebelum", value: 10080 },
];

// Register Service Worker for background notifications
export async function registerReminderSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (e) {
    console.warn("SW registration failed:", e);
    return null;
  }
}

// Send all active reminders to the Service Worker so it can fire them when page is closed
export async function syncRemindersToSW(events) {
  if (!("serviceWorker" in navigator)) return;
  const reminders = getReminders();
  const payload = [];
  for (const [eventId, minutesBefore] of Object.entries(reminders)) {
    const event = events.find(e => e.id === eventId);
    if (!event || !event.date) continue;
    payload.push({
      eventId,
      eventName: event.name,
      eventLocation: event.location || "",
      minutesBefore,
      eventDate: event.date,
    });
  }
  const reg = await navigator.serviceWorker.ready;
  if (reg && reg.active) {
    reg.active.postMessage({ type: "SCHEDULE_REMINDERS", reminders: payload });
  }
}

export function useEventReminderChecker(events) {
  useEffect(() => {
    if (!events || events.length === 0) return;
    // Check immediately (in-page fallback)
    checkAndFireReminders(events);
    // Check every minute
    const interval = setInterval(() => checkAndFireReminders(events), 60 * 1000);
    return () => clearInterval(interval);
  }, [events]);

  useEffect(() => {
    if (!events || events.length === 0) return;
    // Register SW and sync reminders for background support
    registerReminderSW().then(() => syncRemindersToSW(events));
  }, [events]);
}