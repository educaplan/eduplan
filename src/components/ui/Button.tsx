import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SpinnerIcon } from '@/components/icons';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  /** Icon di kanan label (mis. panah). Diganti spinner saat loading. */
  trailingIcon?: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({
  loading = false,
  trailingIcon,
  variant = 'primary',
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2.5 rounded-xl text-base font-bold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'h-[54px] w-full bg-navy-800 text-cream-200 shadow-btn hover:bg-navy-900',
        variant === 'secondary' &&
          'h-[54px] px-4 text-[15px] font-semibold text-royal-600 hover:text-navy-900',
        className,
      )}
      {...rest}
    >
      {children}
      {loading ? <SpinnerIcon size={18} /> : trailingIcon}
    </button>
  );
}
