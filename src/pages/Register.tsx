import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Divider, GoogleButton } from '@/components/ui/GoogleButton';
import { Field } from '@/components/ui/Field';
import { PasswordInput, TextInput } from '@/components/ui/TextInput';
import { ArrowRightIcon, MailIcon, UserIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/auth';
import { mapAuthError } from '@/lib/authErrors';
import {
  validateConfirmPassword,
  validateEmail,
  validateNewPassword,
  validateNickname,
} from '@/lib/validation';

interface Errors {
  nickname?: string;
  email?: string;
  password?: string;
  confirm?: string;
  agree?: string;
}

export default function Register() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const busy = submitting || googleLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};
    const nicknameError = validateNickname(nickname);
    const emailError = validateEmail(email);
    const passwordError = validateNewPassword(password);
    const confirmError = validateConfirmPassword(password, confirm);
    if (nicknameError) next.nickname = nicknameError;
    if (emailError) next.email = emailError;
    if (passwordError) next.password = passwordError;
    if (!passwordError && confirmError) next.confirm = confirmError;
    if (!agree) next.agree = 'Kamu perlu menyetujui ketentuan untuk melanjutkan.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const cleanEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { nickname: nickname.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);

    if (error) {
      setFormError(mapAuthError(error));
      return;
    }

    // Supabase tidak melempar error untuk email yang sudah terdaftar (anti-enumerasi);
    // tandanya: user dikembalikan dengan daftar identities kosong.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setFormError('Email ini sudah terdaftar. Silakan masuk.');
      return;
    }

    // Bila konfirmasi email dimatikan, sesi langsung ada dan GuestRoute mengarahkan user.
    if (!data.session) setSentTo(cleanEmail);
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

  if (sentTo) {
    return (
      <AuthLayout cardWidth="md" decor="b">
        <div className="flex flex-col gap-5">
          <h1 className="text-[28px] font-extrabold text-navy-900 sm:text-[32px]">
            Cek emailmu
          </h1>
          <Alert variant="success">
            Kami mengirim tautan verifikasi ke <strong>{sentTo}</strong>.
          </Alert>
          <p className="text-sm font-medium leading-relaxed text-muted">
            Buka emailmu, klik tautan verifikasinya, lalu masuk ke EduPlan. Jika belum ada,
            periksa folder spam.
          </p>
          <Link
            to="/login"
            className="inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-navy-800 text-base font-bold text-cream-200 shadow-btn transition hover:bg-navy-900"
          >
            Ke halaman masuk
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout cardWidth="xl" decor="b">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[18px]">
        <h1 className="text-[28px] font-extrabold text-navy-900 sm:text-[32px]">
          Buat akun EduPlan
        </h1>

        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <GoogleButton onClick={handleGoogle} loading={googleLoading} disabled={busy}>
          Daftar dengan Google
        </GoogleButton>

        <Divider>atau daftar dengan email</Divider>

        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-4">
          <Field label="Nama panggilan" htmlFor="nickname" error={errors.nickname}>
            <TextInput
              id="nickname"
              name="nickname"
              autoComplete="nickname"
              placeholder="Nama panggilan"
              icon={<UserIcon />}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              invalid={Boolean(errors.nickname)}
              disabled={busy}
            />
          </Field>
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
        </div>

        <Field label="Kata sandi" htmlFor="password" error={errors.password}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(errors.password)}
            disabled={busy}
          />
        </Field>

        <Field label="Konfirmasi Kata Sandi" htmlFor="confirm" error={errors.confirm}>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            placeholder="Ulangi kata sandi"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={Boolean(errors.confirm)}
            disabled={busy}
          />
        </Field>

        <Checkbox id="agree" checked={agree} onChange={setAgree} error={errors.agree}>
          Saya menyetujui Ketentuan dan Kebijakan Privasi EduPlan
        </Checkbox>

        <Button
          type="submit"
          loading={submitting}
          disabled={googleLoading}
          trailingIcon={<ArrowRightIcon size={18} />}
        >
          Daftar dan mulai
        </Button>

        <p className="flex justify-center gap-1.5 text-sm">
          <span className="font-medium text-muted">Sudah punya akun?</span>
          <Link to="/login" className="font-bold text-royal-600 hover:text-navy-900">
            Masuk
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
