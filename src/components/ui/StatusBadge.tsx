import { statusStyles, type StatusKey } from '../../styles/colors';
import { cn } from '../../lib/cn';

export interface StatusBadgeProps {
  status: StatusKey;
  className?: string;
}

/** Coloured pill for quotation (Draft, Pending, Approved, Rejected, Expired) and invoice statuses. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        style.badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}
