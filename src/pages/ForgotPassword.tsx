import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';
import { ArrowLeftIcon, ArrowRightIcon, LockIcon, MailIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/authErrors';
import { validateEmail } from '@/lib/validation';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || cooldown > 0) return;

    const error = validateEmail(email);
    setEmailError(error);
    setFormError(null);
    if (error) return;

    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (resetError) {
      setFormError(mapAuthError(resetError));
      return;
    }
    setSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <AuthLayout
      cardWidth="sm"
      decor="a"
      footer="Tidak menerima email? Periksa folder spam atau coba lagi beberapa menit lagi."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-200 text-navy-800">
            <LockIcon size={22} />
          </span>
          <h1 className="text-[28px] font-extrabold text-navy-900 sm:text-[32px]">
            Lupa kata sandi?
          </h1>
          <p className="text-sm font-medium leading-relaxed text-muted">
            Masukkan emailmu. Kami akan mengirim tautan untuk mengatur ulang kata sandi.
          </p>
        </div>

        {formError ? <Alert variant="error">{formError}</Alert> : null}
        {sent ? (
          <Alert variant="success">
            Jika email itu terdaftar, tautan untuk mengatur ulang kata sandi sudah kami kirim.
          </Alert>
        ) : null}

        <Field label="Email" htmlFor="email" error={emailError}>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nama@email.com"
            icon={<MailIcon />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(emailError)}
            disabled={submitting}
          />
        </Field>

        <Button
          type="submit"
          loading={submitting}
          disabled={cooldown > 0}
          trailingIcon={cooldown > 0 ? undefined : <ArrowRightIcon size={18} />}
        >
          {cooldown > 0 ? `Kirim ulang dalam ${cooldown} dtk` : sent ? 'Kirim ulang tautan' : 'Kirim tautan reset'}
        </Button>

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm font-semibold text-royal-600 hover:text-navy-900"
        >
          <ArrowLeftIcon size={16} />
          Kembali ke halaman masuk
        </Link>
      </form>
    </AuthLayout>
  );
}
