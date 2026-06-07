// Service Worker for background event reminders
const CACHE_NAME = "jamaah-sw-v1";
const REMINDER_ALARM_KEY = "sw_reminder_alarms";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Listen for messages from the main page
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_REMINDERS") {
    const { reminders } = event.data;
    scheduleReminders(reminders);
  }
});

function scheduleReminders(reminders) {
  // Store alarms in IndexedDB-like via a simple approach
  // Clear existing timers and reschedule
  if (self._reminderTimers) {
    self._reminderTimers.forEach(t => clearTimeout(t));
  }
  self._reminderTimers = [];

  const now = Date.now();

  for (const reminder of reminders) {
    const { eventId, eventName, eventLocation, minutesBefore, eventDate } = reminder;
    // eventDate is YYYY-MM-DD, treat as local midnight
    const eventTime = new Date(eventDate + "T00:00:00").getTime();
    const fireAt = eventTime - minutesBefore * 60 * 1000;
    const delay = fireAt - now;

    // Only schedule future reminders (within next 7 days, and not in the past)
    if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        self.registration.showNotification(`🗓️ Kegiatan dalam ${formatMinutes(minutesBefore)}`, {
          body: eventName + (eventLocation ? ` • ${eventLocation}` : ""),
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `event-${eventId}-${minutesBefore}`,
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: { url: "/jamaah/events" },
        });
      }, delay);
      self._reminderTimers.push(timer);
    }
  }
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} menit`;
  if (minutes < 1440) return `${minutes / 60} jam`;
  return `${minutes / 1440} hari`;
}

// When user clicks the notification, open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/jamaah/events";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
