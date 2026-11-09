// Day-of-cycle math. The user's local calendar day is the source of truth (as in the native
// app), so day-number is computed client-side from the stored start date and the device clock,
// then passed to the server for persistence.

export const TOTAL_DAYS = 120;

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format a Date as YYYY-MM-DD in local time. */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Current day number (1..120) given the cycle start date and "now".
 * Before the start date → day 1. After 120 days → clamped to 120.
 */
export function computeDayNumber(startISO: string, now: Date = new Date()): number {
  const start = startOfDay(parseLocalDate(startISO));
  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  if (diffDays < 0) return 1;
  return Math.min(TOTAL_DAYS, diffDays + 1);
}

/** The calendar date for a given day number, as YYYY-MM-DD. */
export function dateForDay(startISO: string, dayNumber: number): string {
  const start = parseLocalDate(startISO);
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (dayNumber - 1));
  return toLocalISODate(d);
}

/** "Monday, November 9, 2026" */
export function formatLongDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
