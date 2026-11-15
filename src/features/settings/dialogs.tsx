import { useState } from 'react';
import type { FormEvent } from 'react';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PasswordInput, TextInput } from '@/components/ui/TextInput';
import { mapAuthError } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';
import { validateConfirmPassword, validateNewPassword } from '@/lib/validation';

const outlined = '!h-11 rounded-xl border border-line bg-white';

/* ---------- Ubah kata sandi ---------- */

function PasswordForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const next = {
      password: validateNewPassword(password) ?? undefined,
      confirm: validateConfirmPassword(password, confirm) ?? undefined,
    };
    setErrors(next);
    setFormError(null);
    if (next.password || next.confirm) return;

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      console.error('Gagal mengubah kata sandi:', error);
      setFormError(mapAuthError(error));
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      <Field label="Kata sandi baru" htmlFor="new-password" error={errors.password} hint="Minimal 8 karakter.">
        <PasswordInput
          id="new-password"
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={Boolean(errors.password)}
          disabled={saving}
        />
      </Field>
      <Field label="Konfirmasi kata sandi" htmlFor="confirm-password" error={errors.confirm}>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          invalid={Boolean(errors.confirm)}
          disabled={saving}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={saving} className={outlined}>
          Batal
        </Button>
        <Button type="submit" loading={saving} className="!h-11 !w-auto px-5 !text-sm">
          Simpan kata sandi
        </Button>
      </div>
    </form>
  );
}

export function PasswordDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ubah kata sandi"
      description="Kata sandi baru berlaku untuk login berikutnya."
    >
      <PasswordForm onClose={onClose} onDone={onDone} />
    </Modal>
  );
}

/* ---------- Hapus akun ---------- */

const CONFIRM_WORD = 'HAPUS';

function DeleteForm({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (deleting || text.trim() !== CONFIRM_WORD) return;
    setDeleting(true);
    setError(null);
    const { error: fnError } = await supabase.functions.invoke('delete-account', { body: {} });
    if (fnError) {
      console.error('Gagal menghapus akun:', fnError);
      if (fnError instanceof FunctionsFetchError) {
        setError(
          'Tidak bisa terhubung ke server. Periksa koneksi internetmu, atau pastikan Edge Function delete-account sudah dideploy.',
        );
      } else if (fnError instanceof FunctionsHttpError) {
        const payload = (await fnError.context.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? 'Akun belum bisa dihapus. Coba lagi.');
      } else {
        setError('Akun belum bisa dihapus. Coba lagi.');
      }
      setDeleting(false);
      return;
    }
    onDeleted();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <p className="text-sm font-medium text-muted">
        Profil, tugas, sesi belajar, riwayat Asisten AI, dan koneksi Google Calendar akan dihapus
        permanen dan <strong className="text-danger">tidak bisa dikembalikan</strong>.
      </p>
      <Field label={`Ketik ${CONFIRM_WORD} untuk melanjutkan`} htmlFor="delete-confirm">
        <TextInput
          id="delete-confirm"
          autoFocus
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={deleting}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={deleting} className={outlined}>
          Batal
        </Button>
        <Button
          type="submit"
          loading={deleting}
          disabled={text.trim() !== CONFIRM_WORD}
          className="!h-11 !w-auto bg-danger px-5 !text-sm hover:bg-danger"
        >
          Hapus akun permanen
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountDialog({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Hapus akun" description="Tindakan ini tidak bisa dibatalkan.">
      <DeleteForm onClose={onClose} onDeleted={onDeleted} />
    </Modal>
  );
}
