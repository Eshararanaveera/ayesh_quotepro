import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { fieldClasses, labelClasses } from './field-styles';
import { cn } from '../../lib/cn';

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Shown in red under the field; also marks the input invalid for screen readers. */
  error?: string;
  /** Helper text shown under the field when there's no error. */
  hint?: string;
  /** Icon inside the input, on the left. */
  icon?: ReactNode;
  /** Text inside the input, on the right (e.g. "%" or "days"). */
  suffix?: ReactNode;
  containerClassName?: string;
  /** Extra classes for the label, e.g. 'md:sr-only' to hide it visually on larger screens. */
  labelClassName?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, hint, icon, suffix, id, className, containerClassName, labelClassName, required, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error || hint;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className={cn(labelClasses, labelClassName)}>
          {label}
          {required && <span className="ml-0.5 text-rose-500" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={fieldClasses({ invalid: !!error, hasIcon: !!icon, className: cn(suffix ? 'pr-12' : undefined, className) })}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={cn(
            'mt-1.5 flex items-center gap-1 text-xs',
            error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-zinc-400',
          )}
        >
          {error && <CircleAlert size={12} aria-hidden className="shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
});
