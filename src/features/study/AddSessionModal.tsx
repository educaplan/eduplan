import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { CalendarIcon, CheckIcon, ClockIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import { dateKey } from '@/lib/dates';
import { isMissingTable, MIGRATION_HINT } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

const DURATIONS = [30, 45, 60, 90] as const;

interface Errors {
  title?: string;
  subject?: string;
  date?: string;
  time?: string;
  notes?: string;
}

interface FormProps {
  onClose: () => void;
  onSaved: () => void;
  /** Tanggal awal "YYYY-MM-DD". Bawaan: hari ini. */
  initialDate?: string;
}

/** Durasi di pilihan yang paling dekat dengan preferensi di Pengaturan. */
function nearestDuration(pref: number | undefined): number {
  if (!pref) return 45;
  return DURATIONS.reduce((best, d) => (Math.abs(d - pref) < Math.abs(best - pref) ? d : best), 45 as number);
}

function AddSessionForm({ onClose, onSaved, initialDate }: FormProps) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(initialDate ?? dateKey(new Date()));
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number>(() => nearestDuration(profile?.study_session_minutes));
  const [notes, setNotes] = useState('');
  const [remind, setRemind] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const next: Errors = {};
    if (!title.trim()) next.title = 'Judul sesi wajib diisi.';
    else if (title.trim().length > 120) next.title = 'Judul maksimal 120 karakter.';
    if (!subject.trim()) next.subject = 'Mata pelajaran wajib diisi.';
    else if (subject.trim().length > 60) next.subject = 'Maksimal 60 karakter.';
    if (!date) next.date = 'Tanggal wajib diisi.';
    if (!time) next.time = 'Jam mulai wajib diisi.';
    if (notes.length > 1000) next.notes = 'Catatan maksimal 1000 karakter.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      setErrors({ date: 'Tanggal atau jam tidak valid.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('study_sessions').insert({
      title: title.trim(),
      subject: subject.trim(),
      starts_at: startsAt.toISOString(),
      duration_minutes: duration,
      notes: notes.trim() || null,
      remind_me: remind,
    });
    setSaving(false);

    if (error) {
      console.error('Gagal menyimpan sesi:', error);
      setFormError(
        isMissingTable(error)
          ? MIGRATION_HINT
          : 'Sesi belum bisa disimpan. Periksa koneksi internetmu lalu coba lagi.',
      );
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Field label="Judul sesi" htmlFor="session-title" error={errors.title}>
        <TextInput
          id="session-title"
          autoFocus
          placeholder="Contoh: Limit dan Turunan Fungsi"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          invalid={Boolean(errors.title)}
          disabled={saving}
        />
      </Field>

      <Field label="Mata pelajaran" htmlFor="session-subject" error={errors.subject}>
        <TextInput
          id="session-subject"
          placeholder="Contoh: Matematika"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          invalid={Boolean(errors.subject)}
          disabled={saving}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal sesi" htmlFor="session-date" error={errors.date}>
          <TextInput
            id="session-date"
            type="date"
            icon={<CalendarIcon size={18} />}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            invalid={Boolean(errors.date)}
            disabled={saving}
          />
        </Field>
        <Field label="Jam mulai" htmlFor="session-time" error={errors.time}>
          <TextInput
            id="session-time"
            type="time"
            icon={<ClockIcon size={18} />}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            invalid={Boolean(errors.time)}
            disabled={saving}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span id="session-duration-label" className="text-sm font-semibold text-navy-900">
          Durasi sesi
        </span>
        <div
          role="radiogroup"
          aria-labelledby="session-duration-label"
          className="grid grid-cols-4 gap-1 rounded-xl bg-cream-200 p-1"
        >
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={duration === d}
              disabled={saving}
              onClick={() => setDuration(d)}
              className={cn(
                'h-10 rounded-[10px] text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40',
                duration === d ? 'bg-navy-800 text-cream-200' : 'text-navy-900 hover:bg-cream-300/60',
              )}
            >
              {d} menit
            </button>
          ))}
        </div>
      </div>

      <Field label="Catatan (opsional)" htmlFor="session-notes" error={errors.notes}>
        <TextArea
          id="session-notes"
          placeholder="Tambahkan detail, link, atau bahan yang perlu disiapkan"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          invalid={Boolean(errors.notes)}
          disabled={saving}
        />
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold text-navy-900">Ingatkan saya</p>
          <p className="text-xs font-medium text-muted">
            Pengingat muncul di lonceng Dashboard, 1 hari sebelum sesi
          </p>
        </div>
        <Switch checked={remind} onChange={setRemind} label="Ingatkan saya" disabled={saving} />
      </div>

      <div className="mt-1 flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={saving}
          className="!h-11 rounded-xl border border-line bg-white"
        >
          Batal
        </Button>
        <Button
          type="submit"
          loading={saving}
          trailingIcon={<CheckIcon size={16} />}
          className="!h-11 !w-auto px-5 !text-sm"
        >
          Simpan sesi
        </Button>
      </div>
    </form>
  );
}

interface AddSessionModalProps extends FormProps {
  open: boolean;
}

export function AddSessionModal({ open, onClose, onSaved, initialDate }: AddSessionModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah sesi belajar"
      description="Atur jadwal dan durasi belajar untuk mencapai targetmu!"
    >
      <AddSessionForm onClose={onClose} onSaved={onSaved} initialDate={initialDate} />
    </Modal>
  );
}
