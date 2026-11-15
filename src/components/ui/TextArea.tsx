import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ invalid, className, ...rest }: TextAreaProps) {
  return (
    <textarea
      rows={3}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && rest.id ? `${rest.id}-error` : undefined}
      className={cn(
        'min-h-[96px] w-full resize-none rounded-xl border bg-white p-4 text-[15px] font-medium text-navy-900 outline-none transition placeholder:text-muted',
        'focus:border-royal-600 focus:ring-2 focus:ring-royal-600/15',
        invalid ? 'border-danger' : 'border-line',
        className,
      )}
      {...rest}
    />
  );
}
