import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SelectInput } from '@/components/ui/SelectInput';
import { TextInput } from '@/components/ui/TextInput';
import { supabase } from '@/lib/supabase';
import { isMissingTable, MIGRATION_HINT } from '@/lib/dbErrors';
import { CATEGORY_LABEL, PRIORITY_LABEL } from '@/types/tasks';
import type { TaskCategory, TaskPriority } from '@/types/tasks';

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABEL) as TaskCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABEL[value],
}));
const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABEL[value],
}));

interface Errors {
  title?: string;
  subject?: string;
  date?: string;
}

interface FormProps {
  onClose: () => void;
  onSaved: () => void;
  /** Tanggal awal tenggat "YYYY-MM-DD" (mis. hari yang dipilih di Kalender). */
  initialDate?: string;
}

function AddTaskForm({ onClose, onSaved, initialDate }: FormProps) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TaskCategory>('tugas');
  const [priority, setPriority] = useState<TaskPriority>('sedang');
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const next: Errors = {};
    if (!title.trim()) next.title = 'Judul wajib diisi.';
    else if (title.trim().length > 120) next.title = 'Judul maksimal 120 karakter.';
    if (subject.trim().length > 60) next.subject = 'Maksimal 60 karakter.';
    if (!date) next.date = 'Tenggat wajib diisi.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    const due = new Date(`${date}T${time || '23:59'}:00`);
    if (Number.isNaN(due.getTime())) {
      setErrors({ date: 'Tanggal atau jam tidak valid.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      subject: subject.trim() || null,
      category,
      priority,
      due_at: due.toISOString(),
      due_all_day: !time,
    });
    setSaving(false);

    if (error) {
      console.error('Gagal menyimpan tugas:', error);
      setFormError(
        isMissingTable(error)
          ? MIGRATION_HINT
          : 'Tugas belum bisa disimpan. Periksa koneksi internetmu lalu coba lagi.',
      );
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[18px]">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <Field label="Judul" htmlFor="task-title" error={errors.title}>
        <TextInput
          id="task-title"
          autoFocus
          placeholder="Contoh: Latihan Barisan dan Deret"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          invalid={Boolean(errors.title)}
          disabled={saving}
        />
      </Field>

      <Field label="Mata pelajaran (opsional)" htmlFor="task-subject" error={errors.subject}>
        <TextInput
          id="task-subject"
          placeholder="Contoh: Matematika"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          invalid={Boolean(errors.subject)}
          disabled={saving}
        />
      </Field>

      <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-4">
        <Field label="Kategori" htmlFor="task-category">
          <SelectInput
            id="task-category"
            placeholder="Pilih kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            options={CATEGORY_OPTIONS}
            disabled={saving}
          />
        </Field>
        <Field label="Prioritas" htmlFor="task-priority">
          <SelectInput
            id="task-priority"
            placeholder="Pilih prioritas"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={PRIORITY_OPTIONS}
            disabled={saving}
          />
        </Field>
      </div>

      <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-4">
        <Field label="Tenggat" htmlFor="task-date" error={errors.date}>
          <TextInput
            id="task-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            invalid={Boolean(errors.date)}
            disabled={saving}
          />
        </Field>
        <Field label="Jam (opsional)" htmlFor="task-time" hint="Kosongkan bila sepanjang hari.">
          <TextInput
            id="task-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={saving}
          />
        </Field>
      </div>

      <div className="mt-1 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button type="submit" loading={saving} className="!w-auto px-6">
          Simpan tugas
        </Button>
      </div>
    </form>
  );
}

interface AddTaskModalProps extends FormProps {
  open: boolean;
}

/**
 * SEMENTARA: form sederhana supaya Dashboard bisa diisi data nyata.
 * Akan diganti saat desain "Tambah tugas" dikirim.
 */
export function AddTaskModal({ open, onClose, onSaved, initialDate }: AddTaskModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah tugas"
      description="Tugas dan ujian muncul di Dashboard dan Kalender."
    >
      <AddTaskForm onClose={onClose} onSaved={onSaved} initialDate={initialDate} />
    </Modal>
  );
}
