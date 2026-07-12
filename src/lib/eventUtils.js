/**
 * Filter utilities for event date ranges.
 * The app standardizes on a 4-week (28-day) forward window for upcoming events.
 */

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

/**
 * Returns true if a date string falls within the upcoming 4-week window (inclusive today).
 * @param {string} dateStr — ISO date string (YYYY-MM-DD)
 */
export function isWithinFourWeeks(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d >= today && d <= new Date(today.getTime() + FOUR_WEEKS_MS);
}

/**
 * Returns true if a date string is in the past (before today).
 * @param {string} dateStr — ISO date string (YYYY-MM-DD)
 */
export function isPastEvent(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d < today;
}