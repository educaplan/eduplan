import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SelectInput } from '@/components/ui/SelectInput';
import { Field } from '@/components/ui/Field';
import { CheckIcon, CloseIcon, SparklesIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { dateKey, formatShortDate } from '@/lib/dates';
import { isMissingTable, MIGRATION_HINT } from '@/lib/dbErrors';
import { generateStudyPlan, StudyPlanError } from '@/lib/studyPlan';
import type { ProposedSession } from '@/lib/studyPlan';
import { supabase } from '@/lib/supabase';
import type { StudySession, Task } from '@/types/tasks';

const HOURS = [1, 2, 3, 4].map((h) => ({ value: String(h), label: `${h} jam per hari` }));

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  weekDays: Date[];
  tasks: Task[];
  weekSessions: StudySession[];
  goal: string;
}

function localDue(t: Task): string | null {
  if (!t.due_at) return null;
  const d = new Date(t.due_at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dateKey(d)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Body({ onClose, onSaved, weekDays, tasks, weekSessions, goal }: Omit<Props, 'open'>) {
  const { profile } = useAuth();
  // Nilai awal dari target jam per minggu di Pengaturan, dibagi 7 hari (1-4 jam).
  const [hours, setHours] = useState(() =>
    String(Math.min(4, Math.max(1, Math.round((profile?.weekly_target_hours ?? 15) / 7)))),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProposedSession[] | null>(null);
  const now = new Date();

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const p = (n: number) => String(n).padStart(2, '0');
      const result = await generateStudyPlan({
        weekStart: dateKey(weekDays[0]),
        today: dateKey(now),
        hoursPerDay: Number(hours),
        goal,
        tasks: tasks
          .filter((t) => t.status === 'todo')
          .slice(0, 40)
          .map((t) => ({
            title: t.title,
            subject: t.subject,
            category: t.category,
            priority: t.priority,
            due: localDue(t),
          })),
        busy: weekSessions.map((s) => {
          const d = new Date(s.starts_at);
          return {
            date: dateKey(d),
            start: `${p(d.getHours())}:${p(d.getMinutes())}`,
            durationMinutes: s.duration_minutes,
          };
        }),
      });
      // Sesi hari ini yang jamnya sudah lewat tidak berguna.
      const future = result.filter((s) => new Date(`${s.date}T${s.start}:00`).getTime() > now.getTime());
      if (future.length === 0) {
        setError('Semua usulan jatuh di waktu yang sudah lewat. Coba lagi atau pilih minggu berikutnya.');
      } else {
        setPlan(future);
      }
    } catch (e) {
      setError(e instanceof StudyPlanError ? e.message : 'Rencana otomatis gagal dibuat. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!plan || plan.length === 0) return;
    setSaving(true);
    setError(null);
    const { error: dbError } = await supabase.from('study_sessions').insert(
      plan.map((s) => ({
        title: s.title,
        subject: s.subject,
        starts_at: new Date(`${s.date}T${s.start}:00`).toISOString(),
        duration_minutes: s.durationMinutes,
      })),
    );
    setSaving(false);
    if (dbError) {
      console.error('Gagal menyimpan rencana:', dbError);
      setError(isMissingTable(dbError) ? MIGRATION_HINT : 'Rencana belum bisa disimpan. Coba lagi.');
      return;
    }
    onSaved();
  }

  if (plan) {
    return (
      <div className="flex flex-col gap-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <p className="text-sm font-medium text-muted">
          {plan.length} sesi diusulkan. Hapus yang tidak kamu mau, lalu simpan.
        </p>
        <ul className="flex max-h-[44vh] flex-col gap-2 overflow-y-auto pr-1">
          {plan.map((s, i) => (
            <li key={`${s.date}-${s.start}-${i}`} className="flex items-center gap-3 rounded-xl bg-blue-50 p-3">
              <div className="w-20 shrink-0 text-xs font-bold text-royal-600">
                <p>{formatShortDate(new Date(`${s.date}T00:00:00`), now)}</p>
                <p className="font-medium text-muted">
                  {s.start.replace(':', '.')} · {s.durationMinutes}m
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy-900">{s.subject}</p>
                <p className="truncate text-xs font-medium text-muted">{s.title}</p>
              </div>
              <button
                type="button"
                aria-label={`Hapus usulan ${s.title}`}
                disabled={saving}
                onClick={() => setPlan(plan.filter((_, j) => j !== i))}
                className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-white hover:text-danger"
              >
                <CloseIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setPlan(null)}
            disabled={saving}
            className="!h-11 rounded-xl border border-line bg-white"
          >
            Buat ulang
          </Button>
          <Button
            loading={saving}
            disabled={plan.length === 0}
            onClick={() => void save()}
            trailingIcon={<CheckIcon size={16} />}
            className="!h-11 !w-auto px-5 !text-sm"
          >
            Simpan {plan.length} sesi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <p className="text-sm font-medium text-muted">
        AI menyusun sesi untuk minggu ini dari tugas dan ujian yang belum selesai, tanpa menabrak
        sesi yang sudah ada. Hasilnya hanya usulan; belum disimpan sebelum kamu setuju.
      </p>
      <Field label="Jam belajar" htmlFor="plan-hours">
        <SelectInput
          id="plan-hours"
          placeholder="Pilih"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          options={HOURS}
          disabled={loading}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
          className="!h-11 rounded-xl border border-line bg-white"
        >
          Batal
        </Button>
        <Button
          loading={loading}
          onClick={() => void generate()}
          trailingIcon={<SparklesIcon size={16} />}
          className="!h-11 !w-auto px-5 !text-sm"
        >
          Buat rencana
        </Button>
      </div>
    </div>
  );
}

export function AutoPlanModal({ open, ...rest }: Props) {
  return (
    <Modal
      open={open}
      onClose={rest.onClose}
      title="Buat rencana otomatis"
      description="Usulan jadwal belajar dari AI untuk minggu yang sedang dilihat."
    >
      <Body {...rest} />
    </Modal>
  );
}
