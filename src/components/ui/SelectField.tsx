import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { fieldClasses, labelClasses } from './field-styles';
import { FloatingPanel } from './FloatingPanel';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  /** Small grey text under the label. */
  description?: string;
  /** Tailwind class for a coloured dot before the label, e.g. 'bg-emerald-500'. */
  dot?: string;
}

export interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Shows a search box at the top of the list (useful for long lists like clients). */
  searchable?: boolean;
  id?: string;
  className?: string;
  containerClassName?: string;
  'aria-label'?: string;
}

/**
 * Styled dropdown that replaces the native <select>.
 * The native list can't be styled on Windows, so it showed up as a plain grey box.
 * This one matches the glass theme in light and dark mode, and supports the keyboard
 * (↑ ↓ Home End Enter Esc, plus type-to-jump).
 */
export function SelectField({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select…',
  error,
  hint,
  icon,
  required,
  disabled,
  searchable = false,
  id,
  className,
  containerClassName,
  'aria-label': ariaLabel,
}: SelectFieldProps) {
  const autoId = useId();
  const buttonId = id ?? autoId;
  const listId = `${buttonId}-list`;
  const messageId = `${buttonId}-message`;
  const message = error || hint;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const typeAhead = useRef({ text: '', timer: 0 });

  const selected = options.find((o) => o.value === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const openList = () => {
    if (disabled) return;
    setQuery('');
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const choose = (option: SelectOption | undefined) => {
    if (!option) return;
    onChange(option.value);
    close();
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    if (searchable) searchRef.current?.focus();
    else listRef.current?.focus();
    return () => document.removeEventListener('pointerdown', onPointer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const handleListKeys = (e: KeyboardEvent) => {
    const last = visible.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(last);
        break;
      case 'Enter':
        e.preventDefault();
        choose(visible[activeIndex]);
        break;
      case ' ':
        if (!searchable) {
          e.preventDefault();
          choose(visible[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        // Type-ahead: jump to the first option starting with the typed letters.
        if (!searchable && e.key.length === 1 && /\S/.test(e.key)) {
          window.clearTimeout(typeAhead.current.timer);
          typeAhead.current.text += e.key.toLowerCase();
          typeAhead.current.timer = window.setTimeout(() => (typeAhead.current.text = ''), 600);
          const match = visible.findIndex((o) => o.label.toLowerCase().startsWith(typeAhead.current.text));
          if (match >= 0) setActiveIndex(match);
        }
    }
  };

  const handleButtonKeys = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', containerClassName)}>
      {label && (
        <label htmlFor={buttonId} className={labelClasses}>
          {label}
          {required && <span className="ml-0.5 text-rose-500" aria-hidden>*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-slate-400 dark:text-zinc-500">
            {icon}
          </span>
        )}
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          onClick={() => (open ? close() : openList())}
          onKeyDown={handleButtonKeys}
          className={fieldClasses({
            invalid: !!error,
            hasIcon: !!icon,
            className: cn('flex items-center justify-between gap-2 pr-3 text-left', open && 'border-brand-500 ring-2 ring-brand-500/30', className),
          })}
        >
          <span className={cn('flex min-w-0 items-center gap-2', !selected && 'text-slate-400 dark:text-zinc-500')}>
            {selected?.dot && <span className={cn('h-2 w-2 shrink-0 rounded-full', selected.dot)} aria-hidden />}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden
            className={cn('shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
      </div>

      {open && (
        <FloatingPanel ref={panelRef} anchorRef={buttonRef} matchWidth className="w-max min-w-[12rem] overflow-hidden rounded-2xl p-1.5">
          {searchable && (
            <div className="relative mb-1.5">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleListKeys}
                placeholder="Search…"
                aria-label="Search options"
                aria-controls={listId}
                aria-activedescendant={visible[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                className="w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100"
              />
            </div>
          )}

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={label ? buttonId : undefined}
            aria-label={label ? undefined : ariaLabel}
            aria-activedescendant={visible[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            onKeyDown={handleListKeys}
            className="custom-scrollbar max-h-64 overflow-y-auto outline-none"
          >
            {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500 dark:text-zinc-400">No matches</li>}
            {visible.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive ? 'bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-white' : 'text-slate-700 dark:text-zinc-300',
                    isSelected && 'font-semibold',
                  )}
                >
                  {option.dot && <span className={cn('h-2 w-2 shrink-0 rounded-full', option.dot)} aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs font-normal text-slate-500 dark:text-zinc-400">{option.description}</span>
                    )}
                  </span>
                  {isSelected && <Check size={16} className="shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />}
                </li>
              );
            })}
          </ul>
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
