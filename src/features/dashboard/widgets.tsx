import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatDue, formatTime } from '@/lib/dates';
import { BookIcon, CalendarIcon, ClockIcon, TargetIcon, TasksIcon } from '@/components/icons';
import type { StudySession, Task, TaskCategory } from '@/types/tasks';
import type { ChartDay } from './stats';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-[20px] border border-line bg-cream-50 p-6 shadow-soft', className)}>
      {children}
    </section>
  );
}

function CardHeader({ title, linkLabel, to }: { title: string; linkLabel: string; to: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      <Link to={to} className="text-sm font-semibold text-royal-600 hover:text-navy-900">
        {linkLabel}
      </Link>
    </div>
  );
}

/* ---------- Kartu statistik ---------- */

interface StatCardProps {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  featured?: boolean;
}

export function StatCard({ label, value, caption, icon, featured = false }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-[20px] p-[22px]',
        featured ? 'bg-navy-800' : 'border border-line bg-cream-50 shadow-soft',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-sm font-semibold', featured ? 'text-cream-200' : 'text-muted')}>
          {label}
        </p>
        <span
          className={cn(
            'flex shrink-0 rounded-xl p-[9px]',
            featured ? 'bg-royal-600 text-cream-200' : 'bg-blue-100 text-royal-600',
          )}
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          'text-4xl font-extrabold leading-none',
          featured ? 'text-cream-200' : 'text-navy-900',
        )}
      >
        {value}
      </p>
      <p className={cn('text-[13px] font-medium', featured ? 'text-cream-300' : 'text-royal-600')}>
        {caption}
      </p>
    </div>
  );
}

/* ---------- Tugas & ujian mendatang ---------- */

const CATEGORY_ICON: Record<TaskCategory, (p: { size?: number }) => ReactElement> = {
  tugas: TasksIcon,
  ujian: CalendarIcon,
  latihan: TargetIcon,
  proyek: BookIcon,
};

function Chip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', className)}
    >
      {children}
    </span>
  );
}

function TaskChip({ task }: { task: Task }) {
  if (task.category === 'ujian') return <Chip className="bg-blue-100 text-royal-600">Ujian</Chip>;
  switch (task.priority) {
    case 'tinggi':
      return <Chip className="bg-danger-soft text-danger">Tinggi</Chip>;
    case 'sedang':
      return <Chip className="bg-cream-200 text-navy-800">Sedang</Chip>;
    case 'rendah':
      return <Chip className="bg-blue-50 text-muted">Rendah</Chip>;
    default:
      return null;
  }
}

interface UpcomingTasksProps {
  tasks: Task[];
  query: string;
  now: Date;
}

export function UpcomingTasks({ tasks, query, now }: UpcomingTasksProps) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? tasks.filter((t) => `${t.title} ${t.subject ?? ''}`.toLowerCase().includes(q))
    : tasks;
  const shown = matches.slice(0, q ? 8 : 4);

  return (
    <Card className="flex min-w-0 flex-col gap-2.5">
      <CardHeader title="Tugas & ujian mendatang" linkLabel="Lihat semua" to="/tasks" />
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-muted">
          {q
            ? `Tidak ada tugas atau ujian yang cocok dengan "${query.trim()}".`
            : 'Belum ada tugas aktif. Tambahkan tugas lewat tombol Tambah di halaman Kalender.'}
        </p>
      ) : (
        <ul>
          {shown.map((task) => {
            const Icon = CATEGORY_ICON[task.category];
            const meta = [task.subject, formatDue(task.due_at, task.due_all_day, now)]
              .filter(Boolean)
              .join(' · ');
            return (
              <li
                key={task.id}
                className="flex items-center gap-3.5 border-b border-line py-3 last:border-b-0"
              >
                <span className="flex shrink-0 rounded-xl bg-blue-100 p-[11px] text-royal-600">
                  <Icon size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="truncate text-[15px] font-semibold text-navy-900">{task.title}</p>
                  <p className="truncate text-[13px] font-medium text-muted">{meta}</p>
                </div>
                <TaskChip task={task} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Rencana belajar hari ini ---------- */

export function TodayPlan({ sessions }: { sessions: StudySession[] }) {
  return (
    <Card className="flex flex-col gap-2.5">
      <CardHeader title="Rencana belajar hari ini" linkLabel="Atur" to="/study-plan" />
      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-muted">
          Belum ada sesi belajar untuk hari ini.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3.5">
              <span className="w-11 shrink-0 text-[13px] font-bold text-royal-600">
                {formatTime(new Date(s.starts_at))}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px] rounded-[14px] bg-blue-50 p-3.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <ClockIcon size={14} />
                  {s.duration_minutes} menit
                  {s.completed_at ? ' · selesai' : ''}
                </span>
                <p
                  className={cn(
                    'truncate text-[15px] font-semibold',
                    s.completed_at ? 'text-muted line-through' : 'text-navy-900',
                  )}
                >
                  {s.title}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Progres belajar mingguan ---------- */

export function WeeklyChart({ days }: { days: ChartDay[] }) {
  const max = Math.max(60, ...days.map((d) => d.minutes));

  return (
    <Card className="flex min-w-0 flex-col gap-6">
      <CardHeader title="Progres belajar mingguan" linkLabel="Detail" to="/progress" />
      <div className="flex items-center gap-4 text-xs font-medium text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-navy-800" /> Sudah dikerjakan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cream-300" /> Direncanakan
        </span>
      </div>
      <div
        className="grid h-[170px] grid-cols-7 items-end gap-2"
        role="img"
        aria-label="Grafik menit belajar per hari dalam minggu ini"
      >
        {days.map((d) => {
          const height = d.minutes === 0 ? 6 : Math.max(10, Math.round((d.minutes / max) * 120));
          return (
            <div
              key={d.key}
              className="flex flex-col items-center gap-2"
              title={`${d.label}: ${d.minutes} menit${d.planned ? ' (direncanakan)' : ''}`}
            >
              <div
                className={cn(
                  'w-9 rounded-[10px] sm:w-11',
                  d.minutes === 0 ? 'bg-line' : d.planned ? 'bg-cream-300' : 'bg-navy-800',
                )}
                style={{ height }}
              />
              <span
                className={cn(
                  'text-[13px]',
                  d.isToday ? 'font-bold text-navy-900' : 'font-medium text-muted',
                )}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Kesiapan target ---------- */

/** value = persen kesiapan (lihat features/readiness/formula.ts); null = belum ada tugas. */
export function ReadinessCard({ value }: { value: number | null }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const pct = value === null ? 0 : Math.min(100, Math.max(0, value));

  return (
    <Card className="flex flex-col items-center gap-5">
      <h2 className="text-lg font-bold text-navy-900">Kesiapan UTBK</h2>
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 128 128" className="-rotate-90" aria-hidden="true">
          <circle cx="64" cy="64" r={radius} className="fill-none stroke-cream-300" strokeWidth="12" />
          {value !== null ? (
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="fill-none stroke-navy-800"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[28px] font-extrabold text-navy-900">
          {value === null ? '–' : `${Math.round(pct)}%`}
        </span>
      </div>
      <p className="text-center text-[13px] font-medium text-muted">
        {value === null ? 'Belum ada tugas untuk dihitung.' : 'Tugas dan latihan soal yang sudah selesai'}
      </p>
    </Card>
  );
}
