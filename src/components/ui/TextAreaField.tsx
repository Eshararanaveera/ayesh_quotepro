import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { fieldClasses, labelClasses } from './field-styles';
import { cn } from '../../lib/cn';

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, error, hint, id, className, containerClassName, required, rows = 4, ...props },
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
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={fieldClasses({ invalid: !!error, className: cn('resize-y leading-relaxed', className) })}
        {...props}
      />
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
