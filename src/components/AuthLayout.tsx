import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CapIcon } from '@/components/icons';

type DecorVariant = 'a' | 'b';

interface Circle {
  tone: 'gray' | 'yellow';
  left: number;
  top: number;
  size: number;
}

/**
 * Posisi lingkaran dekorasi diambil dari Figma (frame 1728px) lalu diubah ke satuan vw
 * agar ikut menyesuaikan lebar layar.
 * - 'b' = Register & Onboarding, 'a' = Login & Lupa kata sandi.
 */
const DECOR: Record<DecorVariant, Circle[]> = {
  b: [
    { tone: 'gray', left: 75.2, top: -13.9, size: 39.4 },
    { tone: 'gray', left: -13.9, top: 38.2, size: 32.4 },
    { tone: 'yellow', left: -6.9, top: -5.8, size: 18.5 },
    { tone: 'yellow', left: 86.8, top: 49.8, size: 11.6 },
  ],
  a: [
    { tone: 'gray', left: -12.7, top: -15, size: 39.4 },
    { tone: 'gray', left: 82.2, top: 37, size: 32.4 },
    { tone: 'yellow', left: 78.7, top: -6.9, size: 18.5 },
    { tone: 'yellow', left: 5.2, top: 47.5, size: 11.6 },
  ],
};

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex rounded-[14px] bg-navy-800 p-2.5 text-cream-200">
        <CapIcon size={24} />
      </span>
      <span className="text-[26px] font-extrabold text-navy-900">EduPlan</span>
    </div>
  );
}

interface AuthLayoutProps {
  children: ReactNode;
  /** Teks kecil di bawah card (opsional). */
  footer?: ReactNode;
  cardWidth: 'sm' | 'md' | 'lg' | 'xl';
  decor: DecorVariant;
}

const WIDTHS = {
  sm: 'max-w-[480px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[560px]',
  xl: 'max-w-[640px]',
} as const;

export function AuthLayout({ children, footer, cardWidth, decor }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {DECOR[decor].map((c, i) => (
          <span
            key={i}
            className={cn(
              'absolute rounded-full',
              c.tone === 'gray' ? 'bg-decor-gray' : 'bg-decor-yellow',
            )}
            style={{
              left: `${c.left}vw`,
              top: `${c.top}vw`,
              width: `${c.size}vw`,
              height: `${c.size}vw`,
            }}
          />
        ))}
      </div>

      <Logo />

      <main
        className={cn(
          'relative z-10 w-full rounded-3xl border border-line bg-cream-50 p-6 shadow-card sm:p-10',
          WIDTHS[cardWidth],
        )}
      >
        {children}
      </main>

      {footer ? (
        <p className="relative z-10 max-w-[480px] text-center text-xs font-medium text-muted">
          {footer}
        </p>
      ) : null}
    </div>
  );
}
