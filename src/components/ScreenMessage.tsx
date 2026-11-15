import type { ReactNode } from 'react';
import { SpinnerIcon } from '@/components/icons';

export function FullScreenLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center text-royal-600"
      role="status"
      aria-label="Memuat"
    >
      <SpinnerIcon size={32} />
    </div>
  );
}

interface ScreenMessageProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function ScreenMessage({ title, children, actions }: ScreenMessageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[520px] rounded-3xl border border-line bg-cream-50 p-8 shadow-card">
        <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
        <div className="mt-3 space-y-3 text-sm font-medium leading-relaxed text-muted">
          {children}
        </div>
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
