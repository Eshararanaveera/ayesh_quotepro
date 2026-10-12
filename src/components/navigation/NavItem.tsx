import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface NavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Optional count shown on the right, e.g. pending quotations. */
  badge?: number;
  /** Icon-only mode for the collapsed sidebar (label becomes a tooltip). */
  collapsed?: boolean;
  /** Match the path exactly (use for the dashboard root). */
  end?: boolean;
  onNavigate?: () => void;
}

/** Sidebar link that highlights itself when its route is active. */
export function NavItem({ to, label, icon: Icon, badge, collapsed = false, end, onNavigate }: NavItemProps) {
  const showBadge = badge !== undefined && badge > 0;

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-xl text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          collapsed ? 'h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-500/15 dark:text-brand-300'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 dark:bg-brand-400" aria-hidden />
          )}
          <Icon
            size={20}
            aria-hidden
            className={cn(
              'shrink-0 transition-colors',
              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300',
            )}
          />
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
          {showBadge && !collapsed && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                isActive
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/30 dark:text-brand-200'
                  : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
              )}
            >
              {badge}
            </span>
          )}
          {showBadge && collapsed && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-zinc-900" aria-hidden />
          )}
        </>
      )}
    </NavLink>
  );
}
