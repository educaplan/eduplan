import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CheckIcon } from '@/components/icons';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
  children: ReactNode;
}

export function Checkbox({ id, checked, onChange, error, children }: CheckboxProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error) || undefined}
          className="peer sr-only"
        />
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-royal-600/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-cream-50',
            checked ? 'border-navy-800 bg-navy-800 text-cream-200' : 'border-line bg-white',
            error && !checked && 'border-danger',
          )}
        >
          {checked ? <CheckIcon size={14} /> : null}
        </span>
        <span className="text-sm font-medium text-muted">{children}</span>
      </label>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
