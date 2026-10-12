import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  /** Tailwind gradient stops for the icon tile, e.g. 'from-emerald-500 to-teal-500'. */
  gradient: string;
  /** Small line under the value, e.g. "3 awaiting approval". */
  footnote?: ReactNode;
}

export function StatCard({ label, value, icon, gradient, footnote }: StatCardProps) {
  return (
    <div className="glass group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-glass-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{label}</p>
        <div className={cn('rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg', gradient)}>{icon}</div>
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">{value}</p>
      {footnote && <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{footnote}</p>}
    </div>
  );
}
