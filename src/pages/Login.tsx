import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Divider, GoogleButton } from '@/components/ui/GoogleButton';
import { Field } from '@/components/ui/Field';
import { PasswordInput, TextInput } from '@/components/ui/TextInput';
import { ArrowRightIcon, MailIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/auth';
import { mapAuthError } from '@/lib/authErrors';
import { validateEmail, validateRequired } from '@/lib/validation';

interface Errors {
  email?: string;
  password?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const busy = submitting || googleLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};
    const emailError = validateEmail(email);
    const passwordError = validateRequired(password, 'Kata sandi');
    if (emailError) next.email = emailError;
    if (passwordError) next.password = passwordError;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    // Bila berhasil, AuthProvider mendeteksi sesi dan GuestRoute mengarahkan user.
    if (error) setFormError(mapAuthError(error));
  }

  async function handleGoogle() {
    if (busy) return;
    setFormError(null);
    setGoogleLoading(true);
    const message = await signInWithGoogle();
    if (message) {
      setFormError(message);
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout cardWidth="md" decor="a">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <h1 className="text-[28px] font-extrabold text-navy-900 sm:text-[32px]">Masuk</h1>

        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <GoogleButton onClick={handleGoogle} loading={googleLoading} disabled={busy}>
          Lanjutkan dengan Google
        </GoogleButton>

        <Divider>atau dengan email</Divider>

        <Field label="Email" htmlFor="email" error={errors.email}>
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
            invalid={Boolean(errors.email)}
            disabled={busy}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Field label="Kata sandi" htmlFor="password" error={errors.password}>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={Boolean(errors.password)}
              disabled={busy}
            />
          </Field>
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-royal-600 hover:text-navy-900"
            >
              Lupa kata sandi?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={submitting} disabled={googleLoading} trailingIcon={<ArrowRightIcon size={18} />}>
          Masuk
        </Button>

        <p className="flex justify-center gap-1.5 text-sm">
          <span className="font-medium text-muted">Belum punya akun?</span>
          <Link to="/register" className="font-bold text-royal-600 hover:text-navy-900">
            Daftar sekarang
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
