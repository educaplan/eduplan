import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { AlertIcon, CheckCircleIcon } from '@/components/icons';

interface AlertProps {
  variant: 'error' | 'success';
  children: ReactNode;
}

export function Alert({ variant, children }: AlertProps) {
  const isError = variant === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium',
        isError
          ? 'border-danger/25 bg-danger-soft text-danger'
          : 'border-success/25 bg-success-soft text-success',
      )}
    >
      <span className="mt-0.5 shrink-0">
        {isError ? <AlertIcon size={18} /> : <CheckCircleIcon size={18} />}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
