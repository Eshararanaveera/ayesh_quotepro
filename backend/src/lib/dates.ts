/**
 * Calendar-date helpers. Dates are exchanged as `YYYY-MM-DD` strings and stored
 * in MySQL DATE columns. Prisma returns DATE columns as JS Dates at UTC
 * midnight, so all maths here is done in UTC to avoid time-zone shifts.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** `2026-10-19` → Date at 2026-10-19T00:00:00Z (for DATE columns). */
export function toDbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Date (from a DATE or TIMESTAMP column) → `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = toDbDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Today's date in the business time zone (e.g. Asia/Colombo), as `YYYY-MM-DD`. */
export function todayISO(timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
