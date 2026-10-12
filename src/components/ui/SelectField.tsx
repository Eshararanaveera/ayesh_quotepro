import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { fieldClasses, labelClasses } from './field-styles';
import { cn } from '../../lib/cn';

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  containerClassName?: string;
}

/** Native <select> styled to match the inputs — accessible and mobile-friendly. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, icon, id, className, containerClassName, required, children, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const messageId = `${fieldId}-message`;
  const message = error || hint;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={fieldId} className={labelClasses}>
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
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={fieldClasses({ invalid: !!error, hasIcon: !!icon, className: cn('appearance-none pr-10', className) })}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
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
});
