import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { dateKey, diffInDays, formatShortDate, formatTime, shortDayName, startOfDay } from '@/lib/dates';
import {
  CheckIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MoreIcon,
  PlayIcon,
  TrashIcon,
} from '@/components/icons';
import { Card } from '@/features/dashboard/widgets';
import { CATEGORY_LABEL, PRIORITY_LABEL } from '@/types/tasks';
import type { StudySession, Task } from '@/types/tasks';
import { accentFor, hoursText, sessionState, taskState } from './model';
import type { TaskState, WeeklyTarget } from './model';

/* ---------- Strip minggu ---------- */

interface WeekStripProps {
  days: Date[];
  counts: Map<string, number>;
  selected: Date;
  onSelect: (d: Date) => void;
}

export function WeekStrip({ days, counts, selected, onSelect }: WeekStripProps) {
  const selKey = dateKey(selected);
  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-3">
      {days.map((d) => {
        const key = dateKey(d);
        const active = key === selKey;
        const n = counts.get(key) ?? 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(d)}
            aria-pressed={active}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1 py-3 transition sm:gap-1.5 sm:py-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/50',
              active
                ? 'border-navy-800 bg-navy-800 text-cream-200'
                : 'border-line bg-cream-50 text-navy-900 hover:bg-white',
            )}
          >
            <span className={cn('text-xs font-semibold', active ? 'text-cream-300' : 'text-muted')}>
              {shortDayName(d)}
            </span>
            <span className="text-xl font-extrabold leading-none sm:text-2xl">{d.getDate()}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px]',
                active ? 'bg-royal-600 text-cream-200' : 'bg-blue-100 text-royal-600',
              )}
            >
              {n} sesi
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Sesi belajar hari terpilih ---------- */

interface DaySessionsProps {
  title: string;
  sessions: StudySession[];
  now: Date;
  isToday: boolean;
  reordering: boolean;
  busyId: string | null;
  runningId: string | null;
  onToggleReorder: () => void;
  onStart: (s: StudySession) => void;
  onOpenTimer: (s: StudySession) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}

export function DaySessions({
  title,
  sessions,
  now,
  isToday,
  reordering,
  busyId,
  runningId,
  onToggleReorder,
  onStart,
  onOpenTimer,
  onMove,
}: DaySessionsProps) {
  const firstPending = sessions.find((s) => sessionState(s) === 'terjadwal')?.id ?? null;
  const dayStart = startOfDay(now).getTime();

  return (
    <Card className="flex min-w-0 flex-col gap-3 !p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-navy-900">{title}</h2>
        {sessions.length > 1 ? (
          <button
            type="button"
            onClick={onToggleReorder}
            className="text-xs font-semibold text-royal-600 hover:text-navy-900"
          >
            {reordering ? 'Selesai mengatur' : 'Atur urutan'}
          </button>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="py-10 text-center text-sm font-medium text-muted">
          Belum ada sesi belajar di hari ini.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s, i) => {
            const state = sessionState(s);
            const start = new Date(s.starts_at);
            const accent = accentFor(s.subject);
            const missed = state === 'terjadwal' && start.getTime() < dayStart;
            const canStart = isToday && s.id === firstPending && runningId === null;
            return (
              <li key={s.id} className="flex items-center gap-3">
                <div className="flex w-12 shrink-0 flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-navy-900">{formatTime(start)}</span>
                  <span className="text-[11px] font-medium text-muted">{s.duration_minutes} menit</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] bg-blue-50 p-3">
                  <span className="h-10 w-1 shrink-0 rounded" style={{ backgroundColor: accent }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p
                      className={cn(
                        'truncate text-sm font-bold text-navy-900',
                        state === 'selesai' && 'text-muted line-through',
                      )}
                    >
                      {s.subject ?? s.title}
                    </p>
                    <p className="truncate text-xs font-medium text-muted">
                      {s.subject ? s.title : (s.notes ?? '')}
                    </p>
                  </div>

                  {reordering ? (
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Pindah ke atas"
                        disabled={i === 0 || busyId !== null}
                        onClick={() => onMove(i, -1)}
                        className="rounded-lg border border-line bg-white p-1.5 text-navy-900 disabled:opacity-40"
                      >
                        <ChevronUpIcon size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Pindah ke bawah"
                        disabled={i === sessions.length - 1 || busyId !== null}
                        onClick={() => onMove(i, 1)}
                        className="rounded-lg border border-line bg-white p-1.5 text-navy-900 disabled:opacity-40"
                      >
                        <ChevronDownIcon size={14} />
                      </button>
                    </span>
                  ) : state === 'berjalan' ? (
                    <button
                      type="button"
                      onClick={() => onOpenTimer(s)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-royal-600 px-3 py-1.5 text-xs font-bold text-cream-200"
                    >
                      Berjalan
                    </button>
                  ) : canStart ? (
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => onStart(s)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-bold text-cream-200 transition hover:bg-navy-900 disabled:opacity-60"
                    >
                      <PlayIcon size={12} />
                      Mulai
                    </button>
                  ) : (
                    <span
                      className={cn(
                        'shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold',
                        state === 'selesai'
                          ? 'border-success/25 bg-success-soft text-success'
                          : missed
                            ? 'border-danger/25 bg-danger-soft text-danger'
                            : 'border-line bg-white text-navy-900',
                      )}
                    >
                      {state === 'selesai' ? 'Selesai' : missed ? 'Terlewat' : 'Terjadwal'}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Target mingguan ---------- */

export function WeeklyTargetCard({ target }: { target: WeeklyTarget }) {
  const pct = (done: number, planned: number) =>
    planned <= 0 ? 0 : Math.min(100, Math.round((done / planned) * 100));
  return (
    <Card className="flex flex-col gap-4 !p-5">
      <h2 className="text-base font-bold text-navy-900">Target mingguan</h2>
      {target.plannedMin === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-muted">
          Belum ada sesi minggu ini. Tambahkan sesi untuk menyusun targetmu.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-extrabold leading-none text-navy-900">
                {hoursText(target.doneMin)}
              </span>
              <span className="text-sm font-medium text-muted">/ {hoursText(target.plannedMin)} jam</span>
            </p>
            <div className="h-2 overflow-hidden rounded bg-decor-yellow">
              <div
                className="h-2 rounded bg-navy-800"
                style={{ width: `${pct(target.doneMin, target.plannedMin)}%` }}
              />
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {target.rows.map((r) => (
              <li key={r.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-bold text-navy-900">{r.name}</span>
                  <span className="shrink-0 font-medium text-muted">
                    {hoursText(r.doneMin)} / {hoursText(r.plannedMin)} jam
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-decor-yellow">
                  <div
                    className="h-1.5 rounded bg-navy-800"
                    style={{ width: `${pct(r.doneMin, r.plannedMin)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ---------- Tabel tugas ---------- */

const STATE_CHIP: Record<TaskState, { label: string; cls: string }> = {
  selesai: { label: 'Selesai', cls: 'bg-success-soft text-success' },
  terlambat: { label: 'Terlambat', cls: 'bg-danger-soft text-danger' },
  belum: { label: 'Belum mulai', cls: 'bg-blue-50 text-muted' },
};

const PRIORITY_DOT: Record<string, string> = {
  tinggi: 'bg-danger',
  sedang: 'bg-[#e0a82e]',
  rendah: 'bg-royal-600',
};

function dueText(t: Task, now: Date): string {
  if (!t.due_at) return 'Tanpa tenggat';
  const d = new Date(t.due_at);
  const diff = diffInDays(d, now);
  const day = diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : formatShortDate(d, now);
  return `${day}, ${formatTime(d)}`;
}

function RowMenu({ task, busy, onToggle, onDelete }: { task: Task; busy: boolean; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setConfirm(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Menu tugas"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-muted transition hover:bg-blue-50 hover:text-navy-900 disabled:opacity-50"
      >
        <MoreIcon size={18} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 flex w-48 flex-col rounded-xl border border-line bg-white p-1 shadow-card"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onToggle();
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-navy-900 hover:bg-blue-50"
          >
            <CheckIcon size={14} />
            {task.status === 'selesai' ? 'Tandai belum selesai' : 'Tandai selesai'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (!confirm) {
                setConfirm(true);
                return;
              }
              setOpen(false);
              setConfirm(false);
              onDelete();
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <TrashIcon size={14} />
            {confirm ? 'Yakin hapus?' : 'Hapus tugas'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface TasksTableProps {
  tasks: Task[];
  now: Date;
  busyId: string | null;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
}

const COLS = 'md:grid-cols-[28px_minmax(0,2.2fr)_84px_minmax(0,1.3fr)_96px_104px_36px]';

export function TasksTable({ tasks, now, busyId, onToggle, onDelete }: TasksTableProps) {
  return (
    <Card className="flex min-w-0 flex-col gap-2 !p-3 sm:!p-4">
      <div className={cn('hidden items-center gap-3 rounded-xl bg-blue-50 px-4 py-2.5 text-[11px] font-semibold text-muted md:grid', COLS)}>
        <span />
        <span>Judul</span>
        <span>Jenis</span>
        <span>Tanggal</span>
        <span>Prioritas</span>
        <span>Status</span>
        <span />
      </div>

      {tasks.length === 0 ? (
        <p className="py-10 text-center text-sm font-medium text-muted">
          Belum ada tugas. Tambahkan lewat tombol Tambah di halaman Kalender.
        </p>
      ) : (
        <ul>
          {tasks.map((t) => {
            const state = taskState(t, now);
            const chip = STATE_CHIP[state];
            const done = t.status === 'selesai';
            const busy = busyId === t.id;
            return (
              <li
                key={t.id}
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-2 py-3 last:border-b-0 md:grid md:px-4',
                  COLS,
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={done ? `Batalkan selesai: ${t.title}` : `Tandai selesai: ${t.title}`}
                  disabled={busy}
                  onClick={() => onToggle(t)}
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition disabled:opacity-50',
                    done ? 'border-navy-800 bg-navy-800 text-cream-200' : 'border-line bg-white hover:border-royal-600',
                  )}
                >
                  {done ? <CheckIcon size={12} /> : null}
                </button>
                <div className="min-w-0 flex-1 md:flex-none">
                  <p className={cn('truncate text-[13px] font-bold text-navy-900', done && 'text-muted')}>
                    {t.title}
                  </p>
                  {t.subject ? <p className="truncate text-xs font-medium text-muted">{t.subject}</p> : null}
                </div>
                <span
                  className={cn(
                    'justify-self-start rounded-md px-2 py-1 text-[11px] font-semibold',
                    t.category === 'ujian' ? 'bg-navy-800 text-cream-200' : 'bg-blue-100 text-royal-600',
                  )}
                >
                  {CATEGORY_LABEL[t.category]}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-navy-900">
                  <CalendarIcon size={14} className="shrink-0 text-muted" />
                  <span className="truncate">{dueText(t, now)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-navy-900">
                  {t.priority ? (
                    <>
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[t.priority])} />
                      {PRIORITY_LABEL[t.priority]}
                    </>
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                </span>
                <span
                  className={cn(
                    'justify-self-start rounded-md px-2 py-1 text-[11px] font-semibold',
                    chip.cls,
                  )}
                >
                  {chip.label}
                </span>
                <RowMenu
                  task={t}
                  busy={busy}
                  onToggle={() => onToggle(t)}
                  onDelete={() => onDelete(t)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
