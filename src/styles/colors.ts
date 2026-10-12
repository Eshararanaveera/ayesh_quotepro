import type { QuotationStatus } from '../types/quotation';
import type { InvoiceStatus } from '../types/invoice';

export type StatusKey = QuotationStatus | InvoiceStatus;

interface StatusStyle {
  label: string;
  badge: string;
  dot: string;
  /** Solid colour for bars and charts. */
  bar: string;
}

/** Single source of truth for status colours across badges, filters and charts. */
export const statusStyles: Record<StatusKey, StatusStyle> = {
  draft: {
    label: 'Draft',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
  },
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
  expired: {
    label: 'Expired',
    badge: 'bg-zinc-100 text-zinc-500 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:ring-zinc-700',
    dot: 'bg-zinc-400',
    bar: 'bg-zinc-400',
  },
  paid: {
    label: 'Paid',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  unpaid: {
    label: 'Unpaid',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
  },
  overdue: {
    label: 'Overdue',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
};
