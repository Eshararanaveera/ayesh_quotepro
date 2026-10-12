import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 ' +
  'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-lg shadow-brand-600/25 ' +
    'hover:from-brand-700 hover:to-accent-700 border border-brand-500/50',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 shadow-sm ' +
    'dark:bg-white dark:text-slate-900 dark:hover:bg-zinc-200',
  outline:
    'border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur hover:bg-slate-50 hover:border-slate-300 ' +
    'dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 ' +
    'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger:
    'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700 border border-rose-500/50',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9 p-0',
};

/** Button classes, also usable on <Link> so links look like buttons. */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}
