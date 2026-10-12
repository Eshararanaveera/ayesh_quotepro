import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes inner padding, e.g. for tables that run edge to edge. */
  flush?: boolean;
}

/** Frosted-glass panel used for every content block. */
export function Card({ flush = false, className, children, ...props }: CardProps) {
  return (
    <div className={cn('glass rounded-3xl', !flush && 'p-5 md:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, icon, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="shrink-0 rounded-xl bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
