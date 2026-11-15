import type { ButtonHTMLAttributes } from 'react';
import { GoogleIcon, SpinnerIcon } from '@/components/icons';

interface GoogleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function GoogleButton({ loading = false, children, disabled, ...rest }: GoogleButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-[15px] font-semibold text-navy-900 transition hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40 disabled:cursor-not-allowed disabled:opacity-60"
      {...rest}
    >
      {loading ? <SpinnerIcon size={20} /> : <GoogleIcon />}
      {children}
    </button>
  );
}

export function Divider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[13px] font-medium text-muted">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
