import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { FullScreenLoader } from '@/components/ScreenMessage';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/TextInput';
import { ArrowRightIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/authErrors';
import { validateConfirmPassword, validateNewPassword } from '@/lib/validation';

/**
 * Halaman tujuan tautan "reset kata sandi" dari email.
 * CATATAN: desain halaman ini belum ada di Figma; tampilan ini sementara
 * (memakai komponen yang sama) sampai desainnya dikirim.
 */
export default function ResetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;

  if (!session) {
    return (
      <AuthLayout cardWidth="sm" decor="a">
        <div className="flex flex-col gap-5">
          <h1 className="text-[28px] font-extrabold text-navy-900">Tautan tidak valid</h1>
          <p className="text-sm font-medium leading-relaxed text-muted">
            Tautan atur ulang kata sandi ini tidak valid atau sudah kedaluwarsa. Minta tautan baru
            untuk melanjutkan.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex h-[54px] w-full items-center justify-center rounded-xl bg-navy-800 text-base font-bold text-cream-200 shadow-btn transition hover:bg-navy-900"
          >
            Minta tautan baru
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const next: { password?: string; confirm?: string } = {};
    const passwordError = validateNewPassword(password);
    const confirmError = validateConfirmPassword(password, confirm);
    if (passwordError) next.password = passwordError;
    if (!passwordError && confirmError) next.confirm = confirmError;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setFormError(mapAuthError(error));
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <AuthLayout cardWidth="sm" decor="a">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h1 className="text-[28px] font-extrabold text-navy-900 sm:text-[32px]">
            Atur kata sandi baru
          </h1>
          <p className="text-sm font-medium leading-relaxed text-muted">
            Buat kata sandi baru untuk akun EduPlan-mu.
          </p>
        </div>

        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Field label="Kata sandi baru" htmlFor="password" error={errors.password}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(errors.password)}
            disabled={submitting}
          />
        </Field>

        <Field label="Konfirmasi Kata Sandi" htmlFor="confirm" error={errors.confirm}>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            placeholder="Ulangi kata sandi baru"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={Boolean(errors.confirm)}
            disabled={submitting}
          />
        </Field>

        <Button type="submit" loading={submitting} trailingIcon={<ArrowRightIcon size={18} />}>
          Simpan kata sandi
        </Button>
      </form>
    </AuthLayout>
  );
}
