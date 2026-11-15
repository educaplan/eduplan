import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { ChevronDownIcon } from '@/components/icons';

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  invalid?: boolean;
}

export function SelectInput({
  placeholder,
  options,
  invalid,
  className,
  value,
  ...rest
}: SelectInputProps) {
  const empty = value === '' || value === undefined;
  return (
    <div className="relative">
      <select
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && rest.id ? `${rest.id}-error` : undefined}
        className={cn(
          'h-[52px] w-full appearance-none rounded-xl border bg-white pl-4 pr-11 text-[15px] font-medium outline-none transition',
          'focus:border-royal-600 focus:ring-2 focus:ring-royal-600/15 disabled:cursor-not-allowed disabled:bg-cream-50 disabled:opacity-70',
          empty ? 'text-muted' : 'text-navy-900',
          invalid ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-navy-900">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
        <ChevronDownIcon />
      </span>
    </div>
  );
}
