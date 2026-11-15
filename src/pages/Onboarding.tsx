import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SelectInput } from '@/components/ui/SelectInput';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { ArrowRightIcon, UserIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  EDUCATION_LEVELS,
  GRADE_OPTIONS,
  MAJOR_OPTIONS,
  SESSION_DURATIONS,
  gradeLabel,
  needsMajor,
} from '@/lib/education';
import { validateNickname, validateRequired } from '@/lib/validation';
import type { EducationLevel } from '@/types/profile';

type FieldName = 'nickname' | 'level' | 'school' | 'grade' | 'major' | 'goal';
type Errors = Partial<Record<FieldName, string>>;

const GOAL_MAX_LENGTH = 200;

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [level, setLevel] = useState<EducationLevel | ''>('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('45');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const busy = saving || skipping;
  const majorOptions = level ? MAJOR_OPTIONS[level] : undefined;
  const majorIsFreeText = level === 'Kuliah';
  const majorApplicable = needsMajor(level);

  function handleLevelChange(value: string) {
    setLevel(value as EducationLevel);
    // Pilihan kelas/jurusan bergantung pada jenjang, jadi direset.
    setGrade('');
    setMajor('');
    setErrors((prev) => ({ ...prev, level: undefined, grade: undefined, major: undefined }));
  }

  async function finish(payload: Record<string, unknown>): Promise<boolean> {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email ?? null, ...payload, onboarding_completed: true });
    if (error) {
      console.error('Gagal menyimpan onboarding:', error);
      setFormError('Data belum bisa disimpan. Periksa koneksi internetmu lalu coba lagi.');
      return false;
    }
    await refreshProfile();
    navigate('/dashboard', { replace: true });
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};
    const nicknameError = validateNickname(nickname);
    if (nicknameError) next.nickname = nicknameError;
    if (!level) next.level = 'Pilih jenjang pendidikan.';
    const schoolError = validateRequired(school, 'Nama sekolah/institusi');
    if (schoolError) next.school = schoolError;
    else if (school.trim().length > 100) next.school = 'Maksimal 100 karakter.';
    if (level && !grade) next.grade = `Pilih ${gradeLabel(level).toLowerCase()}.`;
    if (majorApplicable && !major.trim()) next.major = 'Jurusan wajib diisi.';
    if (goal.length > GOAL_MAX_LENGTH) next.goal = `Maksimal ${GOAL_MAX_LENGTH} karakter.`;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const ok = await finish({
      nickname: nickname.trim(),
      education_level: level,
      school_name: school.trim(),
      grade,
      major: majorApplicable ? major.trim() : null,
      academic_goal: goal.trim() || null,
      study_session_minutes: Number(duration),
    });
    if (!ok) setSaving(false);
  }

  async function handleSkip() {
    if (busy) return;
    setFormError(null);
    setSkipping(true);
    const ok = await finish({});
    if (!ok) setSkipping(false);
  }

  return (
    <AuthLayout cardWidth="lg" decor="b">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[28px]">
            Selamat datang di EduPlan
          </h1>
          <p className="text-sm font-medium leading-relaxed text-muted">
            Ceritakan sedikit tentang dirimu agar perencanaan terasa lebih pas. Semua isian bisa
            diubah nanti di Pengaturan.
          </p>
        </div>

        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Field label="Nama panggilan" htmlFor="nickname" error={errors.nickname}>
          <TextInput
            id="nickname"
            autoComplete="nickname"
            placeholder="Nama panggilan"
            icon={<UserIcon />}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            invalid={Boolean(errors.nickname)}
            disabled={busy}
          />
        </Field>

        <Field label="Jenjang pendidikan" htmlFor="level" error={errors.level}>
          <SelectInput
            id="level"
            placeholder="Pilih jenjang"
            value={level}
            onChange={(e) => handleLevelChange(e.target.value)}
            options={EDUCATION_LEVELS.map((l) => ({ value: l, label: l }))}
            invalid={Boolean(errors.level)}
            disabled={busy}
          />
        </Field>

        <Field label="Sekolah/institusi" htmlFor="school" error={errors.school}>
          <TextInput
            id="school"
            autoComplete="organization"
            placeholder="Contoh: SMKS Al-Hadid 1 Cileungsi"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            invalid={Boolean(errors.school)}
            disabled={busy}
          />
        </Field>

        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-4">
          <Field label="Kelas/Semester" htmlFor="grade" error={errors.grade}>
            <SelectInput
              id="grade"
              placeholder={level ? `Pilih ${gradeLabel(level).toLowerCase()}` : 'Pilih jenjang dulu'}
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setErrors((prev) => ({ ...prev, grade: undefined }));
              }}
              options={(level ? GRADE_OPTIONS[level] : []).map((g) => ({ value: g, label: g }))}
              invalid={Boolean(errors.grade)}
              disabled={busy || !level}
            />
          </Field>

          <Field label="Jurusan" htmlFor="major" error={errors.major}>
            {majorIsFreeText ? (
              <TextInput
                id="major"
                placeholder="Contoh: Teknik Informatika"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                invalid={Boolean(errors.major)}
                disabled={busy}
              />
            ) : (
              <SelectInput
                id="major"
                placeholder={
                  !level
                    ? 'Pilih jenjang dulu'
                    : majorApplicable
                      ? 'Pilih jurusan'
                      : 'Tidak perlu diisi'
                }
                value={major}
                onChange={(e) => {
                  setMajor(e.target.value);
                  setErrors((prev) => ({ ...prev, major: undefined }));
                }}
                options={(majorOptions ?? []).map((m) => ({ value: m, label: m }))}
                invalid={Boolean(errors.major)}
                disabled={busy || !majorApplicable}
              />
            )}
          </Field>
        </div>

        <Field label="Tujuan akademik (opsional)" htmlFor="goal" error={errors.goal}>
          <TextArea
            id="goal"
            placeholder="Contoh: lolos UTBK 2027"
            maxLength={GOAL_MAX_LENGTH + 50}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            invalid={Boolean(errors.goal)}
            disabled={busy}
          />
        </Field>

        <Field
          label="Durasi sesi belajar yang biasa kamu pakai"
          htmlFor="duration"
          hint="Dipakai sebagai default saat membuat rencana belajar."
        >
          <SelectInput
            id="duration"
            placeholder="Pilih durasi"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            options={SESSION_DURATIONS.map((d) => ({ value: String(d), label: `${d} menit` }))}
            disabled={busy}
          />
        </Field>

        <div className="mt-1 flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={handleSkip} loading={skipping} disabled={saving}>
            Lewati dulu
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={skipping}
            trailingIcon={<ArrowRightIcon size={18} />}
            className="!w-auto px-6"
          >
            Simpan dan mulai
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
