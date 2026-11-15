import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SelectInput } from '@/components/ui/SelectInput';
import { Switch } from '@/components/ui/Switch';
import { TextInput } from '@/components/ui/TextInput';
import { CheckIcon, MailIcon, TargetIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/features/dashboard/widgets';
import { removeAvatarObject, uploadAvatar, validateAvatarFile } from '@/features/settings/avatar';
import { DeleteAccountDialog, PasswordDialog } from '@/features/settings/dialogs';
import { EDUCATION_LEVELS, SESSION_DURATIONS } from '@/lib/education';
import { supabase } from '@/lib/supabase';
import { validateNickname } from '@/lib/validation';
import type { EducationLevel } from '@/types/profile';

const GOAL_MAX = 200;
const SCHOOL_MAX = 100;
const WEEKLY_HOURS = [5, 10, 15, 20, 25, 30, 40];

interface Form {
  nickname: string;
  school: string;
  level: EducationLevel | '';
  goal: string;
  session: string;
  weekly: string;
  weekStart: string;
  nDeadline: boolean;
  nDaily: boolean;
  nAi: boolean;
}

interface Errors {
  nickname?: string;
  school?: string;
  goal?: string;
}

function toOptions(values: Array<string | number>, label: (v: string) => string) {
  return values.map((v) => ({ value: String(v), label: label(String(v)) }));
}

function Row({ title, caption, children }: { title: ReactNode; caption: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-bold text-navy-900">{title}</p>
        <p className="text-xs font-medium text-muted">{caption}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const smallBtn =
  'h-9 rounded-[10px] border border-line bg-white px-4 text-[13px] font-bold text-navy-900 transition hover:bg-cream-100 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40';

export default function Settings() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const base = useMemo<Form>(
    () => ({
      nickname: profile?.nickname ?? '',
      school: profile?.school_name ?? '',
      level: profile?.education_level ?? '',
      goal: profile?.academic_goal ?? '',
      session: String(profile?.study_session_minutes ?? 45),
      weekly: String(profile?.weekly_target_hours ?? 15),
      weekStart: String(profile?.week_starts_on ?? 1),
      nDeadline: profile?.notif_deadline ?? true,
      nDaily: profile?.notif_daily ?? true,
      nAi: profile?.notif_ai ?? true,
    }),
    // Baseline hanya dihitung sekali dari profil saat halaman dibuka; setelah simpan diperbarui manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [saved, setSaved] = useState<Form>(base);
  const [form, setForm] = useState<Form>(base);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [othersBusy, setOthersBusy] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const levelChanged = form.level !== saved.level;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const weeklyOptions = toOptions(
    WEEKLY_HOURS.includes(Number(form.weekly)) ? WEEKLY_HOURS : [...WEEKLY_HOURS, Number(form.weekly)].sort((a, b) => a - b),
    (v) => `${v} jam`,
  );
  const sessionOptions = toOptions(
    SESSION_DURATIONS.includes(Number(form.session) as (typeof SESSION_DURATIONS)[number])
      ? [...SESSION_DURATIONS]
      : [...SESSION_DURATIONS, Number(form.session)].sort((a, b) => a - b),
    (v) => `${v} menit`,
  );

  async function save() {
    if (saving || !user) return;
    const next: Errors = {};
    const nickErr = validateNickname(form.nickname);
    if (nickErr) next.nickname = nickErr;
    if (!form.school.trim()) next.school = 'Sekolah / institusi wajib diisi.';
    else if (form.school.trim().length > SCHOOL_MAX) next.school = `Maksimal ${SCHOOL_MAX} karakter.`;
    if (form.goal.length > GOAL_MAX) next.goal = `Maksimal ${GOAL_MAX} karakter.`;
    setErrors(next);
    setMessage(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: form.nickname.trim(),
        school_name: form.school.trim(),
        education_level: form.level || null,
        // Kelas dan jurusan hanya cocok untuk jenjang lamanya.
        ...(levelChanged ? { grade: null, major: null } : {}),
        academic_goal: form.goal.trim() || null,
        study_session_minutes: Number(form.session),
        weekly_target_hours: Number(form.weekly),
        week_starts_on: Number(form.weekStart),
        notif_deadline: form.nDeadline,
        notif_daily: form.nDaily,
        notif_ai: form.nAi,
      })
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      console.error('Gagal menyimpan pengaturan:', error);
      const missing = /schema cache|does not exist|column/i.test(error.message ?? '');
      setMessage({
        variant: 'error',
        text: missing
          ? 'Kolom pengaturan belum ada. Jalankan supabase/migrations/0005_settings.sql di SQL Editor Supabase.'
          : 'Perubahan belum bisa disimpan. Periksa koneksi internetmu lalu coba lagi.',
      });
      return;
    }
    await refreshProfile();
    setSaved(form);
    setMessage({ variant: 'success', text: 'Perubahan disimpan.' });
  }

  function cancel() {
    setForm(saved);
    setErrors({});
    setMessage(null);
  }

  async function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user || photoBusy) return;
    const problem = validateAvatarFile(file);
    if (problem) {
      setMessage({ variant: 'error', text: problem });
      return;
    }
    setPhotoBusy(true);
    setMessage(null);
    try {
      const url = await uploadAvatar(user.id, file);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (error) throw error;
      await removeAvatarObject(profile?.avatar_url ?? null);
      await refreshProfile();
      setMessage({ variant: 'success', text: 'Foto profil diperbarui.' });
    } catch (err) {
      console.error('Gagal mengunggah foto:', err);
      setMessage({
        variant: 'error',
        text: 'Foto belum bisa diunggah. Pastikan migrasi 0005_settings.sql sudah dijalankan, lalu coba lagi.',
      });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    if (!user || photoBusy) return;
    setPhotoBusy(true);
    setMessage(null);
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    if (error) {
      console.error('Gagal menghapus foto:', error);
      setMessage({ variant: 'error', text: 'Foto belum bisa dihapus. Coba lagi.' });
    } else {
      await removeAvatarObject(profile?.avatar_url ?? null);
      await refreshProfile();
      setMessage({ variant: 'success', text: 'Foto profil dihapus.' });
    }
    setPhotoBusy(false);
  }

  async function signOutOthers() {
    if (othersBusy) return;
    setOthersBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setOthersBusy(false);
    setMessage(
      error
        ? { variant: 'error', text: 'Belum bisa keluar dari perangkat lain. Coba lagi.' }
        : { variant: 'success', text: 'Semua perangkat lain sudah dikeluarkan. Perangkat ini tetap masuk.' },
    );
  }

  const initial = (form.nickname.trim().charAt(0) || user?.email?.charAt(0) || 'P').toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[30px]">Pengaturan</h1>
          <p className="text-[15px] font-medium text-muted">
            Atur profil, notifikasi, dan preferensi belajarmu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={!dirty || saving}
            className="h-12 rounded-xl border border-line bg-white px-5 text-sm font-bold text-navy-900 transition hover:bg-cream-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
          >
            Batal
          </button>
          <Button
            loading={saving}
            disabled={!dirty}
            onClick={() => void save()}
            trailingIcon={<CheckIcon size={16} />}
            className="!h-12 !w-auto px-5 !text-sm"
          >
            Simpan perubahan
          </Button>
        </div>
      </header>

      {message ? <Alert variant={message.variant}>{message.text}</Alert> : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-navy-900">Profil</h2>
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Foto profil"
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-royal-600 text-2xl font-bold text-cream-200">
                  {initial}
                </span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void onPickPhoto(e)}
              />
              <button type="button" className={smallBtn} disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                {photoBusy ? 'Memproses…' : 'Ubah foto'}
              </button>
              {profile?.avatar_url ? (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => void removePhoto()}
                  className="text-[13px] font-semibold text-danger hover:underline disabled:opacity-60"
                >
                  Hapus
                </button>
              ) : null}
            </div>
            <p className="-mt-2 text-xs font-medium text-muted">
              PNG, JPG, atau WebP, maksimal 2 MB. Foto langsung tersimpan.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama panggilan" htmlFor="set-nickname" error={errors.nickname}>
                <TextInput
                  id="set-nickname"
                  value={form.nickname}
                  maxLength={30}
                  onChange={(e) => set('nickname', e.target.value)}
                  invalid={Boolean(errors.nickname)}
                  disabled={saving}
                />
              </Field>
              <Field label="Email" htmlFor="set-email">
                <TextInput
                  id="set-email"
                  icon={<MailIcon size={18} />}
                  value={user?.email ?? profile?.email ?? ''}
                  readOnly
                  disabled
                  className="bg-cream-100"
                />
              </Field>
            </div>
            <Field label="Sekolah / institusi" htmlFor="set-school" error={errors.school}>
              <TextInput
                id="set-school"
                value={form.school}
                maxLength={SCHOOL_MAX + 20}
                onChange={(e) => set('school', e.target.value)}
                invalid={Boolean(errors.school)}
                disabled={saving}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Jenjang pendidikan"
                htmlFor="set-level"
                hint={levelChanged ? 'Kelas dan jurusan akan dikosongkan karena jenjang berubah.' : undefined}
              >
                <SelectInput
                  id="set-level"
                  placeholder="Pilih jenjang"
                  value={form.level}
                  onChange={(e) => set('level', e.target.value as EducationLevel)}
                  options={EDUCATION_LEVELS.map((l) => ({ value: l, label: l }))}
                  disabled={saving}
                />
              </Field>
              <Field label="Tujuan akademik" htmlFor="set-goal" error={errors.goal}>
                <TextInput
                  id="set-goal"
                  icon={<TargetIcon size={18} />}
                  placeholder="Contoh: UTBK 2027"
                  value={form.goal}
                  maxLength={GOAL_MAX + 50}
                  onChange={(e) => set('goal', e.target.value)}
                  invalid={Boolean(errors.goal)}
                  disabled={saving}
                />
              </Field>
            </div>
          </Card>

          <Card className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-navy-900">Preferensi belajar</h2>
              <p className="text-xs font-medium text-muted">
                Dipakai sebagai nilai awal saat membuat rencana belajar.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Durasi sesi belajar" htmlFor="set-session">
                <SelectInput
                  id="set-session"
                  placeholder="Pilih"
                  value={form.session}
                  onChange={(e) => set('session', e.target.value)}
                  options={sessionOptions}
                  disabled={saving}
                />
              </Field>
              <Field label="Target jam per minggu" htmlFor="set-weekly">
                <SelectInput
                  id="set-weekly"
                  placeholder="Pilih"
                  value={form.weekly}
                  onChange={(e) => set('weekly', e.target.value)}
                  options={weeklyOptions}
                  disabled={saving}
                />
              </Field>
              <Field label="Awal minggu" htmlFor="set-weekstart">
                <SelectInput
                  id="set-weekstart"
                  placeholder="Pilih"
                  value={form.weekStart}
                  onChange={(e) => set('weekStart', e.target.value)}
                  options={[
                    { value: '1', label: 'Senin' },
                    { value: '0', label: 'Minggu' },
                  ]}
                  disabled={saving}
                />
              </Field>
              <Field label="Bahasa" htmlFor="set-language" hint="Bahasa lain belum tersedia.">
                <SelectInput
                  id="set-language"
                  placeholder="Pilih"
                  value="id"
                  onChange={() => undefined}
                  options={[{ value: 'id', label: 'Bahasa Indonesia' }]}
                  disabled
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-navy-900">Notifikasi</h2>
              <p className="text-xs font-medium text-muted">
                Pengingat muncul di lonceng aplikasi saat kamu membukanya.
              </p>
            </div>
            <Row title="Pengingat tenggat" caption="Ingatkan 1 hari sebelum tugas atau ujian">
              <Switch checked={form.nDeadline} onChange={(v) => set('nDeadline', v)} label="Pengingat tenggat" disabled={saving} />
            </Row>
            <Row title="Ringkasan harian" caption="Rencana belajar hari ini setiap pagi">
              <Switch checked={form.nDaily} onChange={(v) => set('nDaily', v)} label="Ringkasan harian" disabled={saving} />
            </Row>
            <Row title="Saran Asisten AI" caption="Ajakan menyusun jadwal bila tugas mendekat tanpa sesi belajar">
              <Switch checked={form.nAi} onChange={(v) => set('nAi', v)} label="Saran Asisten AI" disabled={saving} />
            </Row>
            <Row
              title={
                <span className="flex items-center gap-2">
                  Email mingguan
                  <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-semibold text-navy-800">
                    Segera hadir
                  </span>
                </span>
              }
              caption="Laporan progres setiap Minggu"
            >
              <Switch checked={false} onChange={() => undefined} label="Email mingguan (segera hadir)" disabled />
            </Row>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-navy-900">Akun dan keamanan</h2>
            <Row title="Kata sandi" caption="Ganti kata sandi akunmu">
              <button type="button" className={smallBtn} onClick={() => setPasswordOpen(true)}>
                Ubah
              </button>
            </Row>
            <Row title="Keluar dari semua perangkat" caption="Akhiri sesi di perangkat lain">
              <button type="button" className={smallBtn} disabled={othersBusy} onClick={() => void signOutOthers()}>
                {othersBusy ? 'Memproses…' : 'Keluar'}
              </button>
            </Row>
            <Row
              title={<span className="text-danger">Hapus akun</span>}
              caption="Semua data akan dihapus permanen"
            >
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="h-9 rounded-[10px] bg-danger-soft px-4 text-[13px] font-bold text-danger transition hover:bg-danger hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
              >
                Hapus
              </button>
            </Row>
          </Card>
        </div>
      </div>

      <PasswordDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onDone={() => {
          setPasswordOpen(false);
          setMessage({ variant: 'success', text: 'Kata sandi berhasil diubah.' });
        }}
      />
      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          void signOut().finally(() => navigate('/login', { replace: true }));
        }}
      />
    </div>
  );
}
