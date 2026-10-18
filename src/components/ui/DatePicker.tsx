import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { fieldClasses, labelClasses } from './field-styles';
import { FloatingPanel } from './FloatingPanel';
import { addDays, formatDate, parseISODate, toISODate, todayISO } from '../../utils/date';
import { cn } from '../../lib/cn';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface DatePickerProps {
  /** Date as `YYYY-MM-DD` (empty string for none). */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  /** Earliest / latest selectable date, `YYYY-MM-DD`. */
  min?: string;
  max?: string;
  id?: string;
  containerClassName?: string;
}

/** First day shown in the 6-week grid for a month (the Sunday on/before the 1st). */
function gridStart(year: number, month: number): string {
  const first = new Date(year, month, 1);
  return toISODate(new Date(year, month, 1 - first.getDay()));
}

/**
 * Styled calendar that replaces the browser's native date picker,
 * so it matches the glass theme in light and dark mode.
 *
 * Keyboard: ← → ↑ ↓ move by day/week, PageUp/PageDown change month,
 * Home/End go to start/end of week, Enter picks, Esc closes.
 */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Pick a date',
  error,
  hint,
  required,
  disabled,
  min,
  max,
  id,
  containerClassName,
}: DatePickerProps) {
  const autoId = useId();
  const buttonId = id ?? autoId;
  const dialogId = `${buttonId}-calendar`;
  const messageId = `${buttonId}-message`;
  const message = error || hint;
  const today = todayISO();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'days' | 'months'>('days');
  /** The day with keyboard focus; its month is the one shown. */
  const [focused, setFocused] = useState(value || today);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const focusedDate = parseISODate(focused);
  const year = focusedDate.getFullYear();
  const month = focusedDate.getMonth();

  const days = useMemo(() => {
    const start = gridStart(year, month);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [year, month]);

  const isDisabled = (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max);

  const openCalendar = () => {
    if (disabled) return;
    setFocused(value || today);
    setView('days');
    setOpen(true);
  };

  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const pick = (iso: string) => {
    if (isDisabled(iso)) return;
    onChange(iso);
    close();
  };

  /** Moves focus to the same day in another month, clamped to that month's length. */
  const shiftMonth = (delta: number) => {
    const target = new Date(year, month + delta, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(focusedDate.getDate(), lastDay));
    setFocused(toISODate(target));
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep real DOM focus on the focused day so screen readers follow along.
  useEffect(() => {
    if (open && view === 'days') {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
    }
  }, [open, view, focused]);

  const handleGridKeys = (e: KeyboardEvent) => {
    const moves: Record<string, () => void> = {
      ArrowLeft: () => setFocused(addDays(focused, -1)),
      ArrowRight: () => setFocused(addDays(focused, 1)),
      ArrowUp: () => setFocused(addDays(focused, -7)),
      ArrowDown: () => setFocused(addDays(focused, 7)),
      Home: () => setFocused(addDays(focused, -focusedDate.getDay())),
      End: () => setFocused(addDays(focused, 6 - focusedDate.getDay())),
      PageUp: () => shiftMonth(e.shiftKey ? -12 : -1),
      PageDown: () => shiftMonth(e.shiftKey ? 12 : 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(focused);
    }
  };

  const navButton =
    'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

  return (
    <div ref={containerRef} className={cn('relative w-full', containerClassName)}>
      {label && (
        <label htmlFor={buttonId} className={labelClasses}>
          {label}
          {required && <span className="ml-0.5 text-rose-500" aria-hidden>*</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        onClick={() => (open ? close() : openCalendar())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            openCalendar();
          }
        }}
        className={fieldClasses({
          invalid: !!error,
          className: cn('flex items-center justify-between gap-2 pr-3 text-left', open && 'border-brand-500 ring-2 ring-brand-500/30'),
        })}
      >
        <span className={cn('truncate', !value && 'text-slate-400 dark:text-zinc-500')}>{value ? formatDate(value) : placeholder}</span>
        <CalendarDays size={17} className="shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && (
        <FloatingPanel
          ref={panelRef}
          anchorRef={buttonRef}
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label={label ? `Choose ${label.toLowerCase()}` : 'Choose date'}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
          className="w-[18.5rem] rounded-2xl p-3"
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (view === 'days' ? shiftMonth(-1) : shiftMonth(-12))}
              className={navButton}
              aria-label={view === 'days' ? 'Previous month' : 'Previous year'}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setView((v) => (v === 'days' ? 'months' : 'days'))}
              aria-live="polite"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {view === 'days' ? `${MONTHS[month]} ${year}` : year}
            </button>
            <button
              type="button"
              onClick={() => (view === 'days' ? shiftMonth(1) : shiftMonth(12))}
              className={navButton}
              aria-label={view === 'days' ? 'Next month' : 'Next year'}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {view === 'days' ? (
            <div ref={gridRef} role="grid" aria-label={`${MONTHS[month]} ${year}`} onKeyDown={handleGridKeys}>
              <div role="row" className="grid grid-cols-7">
                {WEEKDAYS.map((d) => (
                  <span key={d} role="columnheader" className="py-1.5 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">
                    {d}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, week) => (
                <div role="row" key={week} className="grid grid-cols-7 gap-y-0.5">
                  {days.slice(week * 7, week * 7 + 7).map((iso) => {
                    const date = parseISODate(iso);
                    const inMonth = date.getMonth() === month;
                    const isSelected = iso === value;
                    const isToday = iso === today;
                    const off = isDisabled(iso);
                    return (
                      <div role="gridcell" key={iso} aria-selected={isSelected} className="flex justify-center">
                        <button
                          type="button"
                          data-date={iso}
                          tabIndex={iso === focused ? 0 : -1}
                          disabled={off}
                          onClick={() => pick(iso)}
                          aria-label={formatDate(iso)}
                          aria-current={isToday ? 'date' : undefined}
                          className={cn(
                            'relative flex h-9 w-9 items-center justify-center rounded-xl text-sm tabular-nums transition outline-none',
                            'focus-visible:ring-2 focus-visible:ring-brand-500/60',
                            isSelected
                              ? 'bg-gradient-to-br from-brand-600 to-accent-600 font-semibold text-white shadow-md shadow-brand-600/30'
                              : inMonth
                                ? 'text-slate-700 hover:bg-brand-50 hover:text-brand-700 dark:text-zinc-200 dark:hover:bg-brand-500/15 dark:hover:text-white'
                                : 'text-slate-300 hover:bg-slate-100 dark:text-zinc-600 dark:hover:bg-zinc-800',
                            isToday && !isSelected && 'font-semibold text-brand-600 ring-1 ring-inset ring-brand-300 dark:text-brand-300 dark:ring-brand-500/40',
                            off && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                          )}
                        >
                          {date.getDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 py-1">
              {MONTHS.map((name, m) => {
                const isCurrent = m === month;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      const lastDay = new Date(year, m + 1, 0).getDate();
                      setFocused(toISODate(new Date(year, m, Math.min(focusedDate.getDate(), lastDay))));
                      setView('days');
                    }}
                    className={cn(
                      'rounded-xl py-3 text-sm transition',
                      isCurrent
                        ? 'bg-gradient-to-br from-brand-600 to-accent-600 font-semibold text-white'
                        : 'text-slate-700 hover:bg-brand-50 hover:text-brand-700 dark:text-zinc-200 dark:hover:bg-brand-500/15',
                    )}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2.5 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400">{value ? formatDate(value) : 'No date selected'}</span>
            <button
              type="button"
              onClick={() => pick(today)}
              disabled={isDisabled(today)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-500/15"
            >
              Today
            </button>
          </div>
        </FloatingPanel>
      )}

      {message && (
        <p
          id={messageId}
          className={cn('mt-1.5 text-xs', error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-zinc-400')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
