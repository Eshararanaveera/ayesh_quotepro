/**
 * Date helpers that work with local calendar dates (`YYYY-MM-DD`).
 *
 * `new Date('2026-10-01')` is parsed as UTC midnight and
 * `toISOString()` converts back to UTC, so both shift the day for users
 * outside UTC (e.g. before 05:30 in Colombo). These helpers avoid that.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date as a local `YYYY-MM-DD` string. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses `YYYY-MM-DD` as a local date (midnight local time). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Today's local date as `YYYY-MM-DD`. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Adds (or subtracts) whole days to a `YYYY-MM-DD` string. */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole days from `fromISO` to `toISO` (negative if `toISO` is earlier). */
export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

/** Whether a `YYYY-MM-DD` date is before today. */
export function isPast(iso: string): boolean {
  return iso < todayISO();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `2026-10-01` → `01 Oct 2026` (the common Sri Lankan business format).
 * Built by hand because browsers disagree on short months ("Sep" vs "Sept").
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseISODate(iso);
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
