import { cn } from '../../lib/cn';

/** Shared look for inputs, selects and textareas. */
export function fieldClasses({ invalid, hasIcon, className }: { invalid?: boolean; hasIcon?: boolean; className?: string } = {}) {
  return cn(
    'w-full rounded-xl border bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition',
    'placeholder:text-slate-400 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder:text-zinc-600',
    'focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100/80 disabled:text-slate-500 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500',
    invalid
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500/60'
      : 'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-zinc-800 dark:hover:border-zinc-700',
    hasIcon && 'pl-10',
    className,
  );
}

export const labelClasses = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300';
