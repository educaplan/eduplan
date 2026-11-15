import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { EyeIcon, EyeOffIcon, LockIcon } from '@/components/icons';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
}

const shell =
  'flex h-[52px] items-center gap-3 rounded-xl border bg-white px-4 transition focus-within:border-royal-600 focus-within:ring-2 focus-within:ring-royal-600/15';

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { icon, trailing, invalid, className, ...rest },
  ref,
) {
  return (
    <div className={cn(shell, invalid ? 'border-danger' : 'border-line', className)}>
      {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && rest.id ? `${rest.id}-error` : undefined}
        className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-navy-900 outline-none placeholder:text-muted disabled:cursor-not-allowed"
        {...rest}
      />
      {trailing}
    </div>
  );
});

type PasswordInputProps = Omit<TextInputProps, 'type' | 'icon' | 'trailing'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <TextInput
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        icon={<LockIcon />}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-pressed={visible}
            className="shrink-0 rounded text-muted transition hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />
    );
  },
);
