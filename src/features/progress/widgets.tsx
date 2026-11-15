import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Card } from '@/features/dashboard/widgets';
import { hoursText } from '@/features/study/model';
import type { Period, ChartBar, SubjectProgress, TaskBreakdown } from './model';

/* ---------- Pilihan periode ---------- */

export function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const options: Array<{ id: Period; label: string }> = [
    { id: 'minggu', label: 'Minggu ini' },
    { id: 'bulan', label: 'Bulan ini' },
  ];
  return (
    <div role="radiogroup" aria-label="Periode" className="flex gap-1 rounded-xl bg-cream-200 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'h-10 rounded-[10px] px-4 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40',
            value === o.id ? 'bg-navy-800 text-cream-200' : 'text-navy-900 hover:bg-cream-300/60',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Kartu statistik ---------- */

export function ProgressStat({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-line bg-cream-50 p-[22px] shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy-900">{label}</p>
        <span className="flex shrink-0 rounded-xl bg-blue-100 p-[9px] text-royal-600">{icon}</span>
      </div>
      <p className="text-[30px] font-extrabold leading-none text-navy-900">{value}</p>
      <p className="text-[13px] font-medium text-success">{caption}</p>
    </div>
  );
}

/* ---------- Grafik jam belajar ---------- */

interface HoursChartProps {
  title: string;
  targetLabel: string | null;
  bars: ChartBar[];
  targetMin: number | null;
}

export function HoursChart({ title, targetLabel, bars, targetMin }: HoursChartProps) {
  const max = Math.max(60, ...bars.map((b) => b.minutes), targetMin ?? 0);
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-navy-900">{title}</h2>
        {targetLabel ? <span className="text-xs font-semibold text-royal-600">{targetLabel}</span> : null}
      </div>
      <div
        className="flex h-[210px] items-end justify-between gap-2 sm:gap-4"
        role="img"
        aria-label={`${title}: ${bars.map((b) => `${b.label} ${hoursText(b.minutes)} jam`).join(', ')}`}
      >
        {bars.map((b) => {
          const reached = targetMin !== null && b.minutes >= targetMin;
          const height = b.minutes === 0 ? 6 : Math.max(14, Math.round((b.minutes / max) * 150));
          return (
            <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-bold text-navy-900">{hoursText(b.minutes)}</span>
              <div
                className={cn(
                  'w-full max-w-[56px] rounded-[10px]',
                  b.minutes === 0 ? 'bg-line' : reached ? 'bg-navy-800' : 'bg-royal-600',
                )}
                style={{ height }}
              />
              <span className="truncate text-[11px] font-medium text-muted sm:text-xs">{b.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Penyelesaian tugas ---------- */

export function TaskDonut({ tasks }: { tasks: TaskBreakdown }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = tasks.pct ?? 0;
  const rows = [
    { label: 'Selesai tepat waktu', n: tasks.onTime, dot: 'bg-navy-800' },
    { label: 'Sedang berjalan', n: tasks.inProgress, dot: 'bg-royal-600' },
    { label: 'Terlambat', n: tasks.late, dot: 'bg-danger' },
  ];
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <h2 className="text-base font-bold text-navy-900">Penyelesaian tugas</h2>
      {tasks.total === 0 ? (
        <p className="py-10 text-center text-sm font-medium text-muted">
          Belum ada tugas dengan tenggat di periode ini.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6 py-2">
          <div className="relative h-[132px] w-[132px] shrink-0">
            <svg viewBox="0 0 128 128" className="-rotate-90" aria-hidden="true">
              <circle cx="64" cy="64" r={r} className="fill-none stroke-cream-300" strokeWidth="12" />
              <circle
                cx="64"
                cy="64"
                r={r}
                className="fill-none stroke-navy-800"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(c * pct) / 100} ${c}`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[26px] font-extrabold text-navy-900">
              {pct}%
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.label} className="flex items-start gap-2.5">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', row.dot)} />
                <div>
                  <p className="text-base font-extrabold leading-tight text-navy-900">{row.n}</p>
                  <p className="text-xs font-medium text-muted">{row.label}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/* ---------- Progres per mata pelajaran ---------- */

export function SubjectProgressCard({ subjects }: { subjects: SubjectProgress[] }) {
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-navy-900">Progres per mata pelajaran</h2>
        <Link to="/study-plan" className="text-xs font-semibold text-royal-600 hover:text-navy-900">
          Lihat semua
        </Link>
      </div>
      {subjects.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-muted">
          Belum ada sesi belajar di periode ini.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {subjects.map((s) => (
            <li key={s.name} className="grid grid-cols-[minmax(0,110px)_1fr_40px] items-center gap-3 sm:grid-cols-[minmax(0,150px)_1fr_40px]">
              <span className="truncate text-[13px] font-bold text-navy-900">{s.name}</span>
              <div className="h-2 overflow-hidden rounded bg-decor-yellow">
                <div
                  className={cn('h-2 rounded', s.pct < 65 ? 'bg-[#d4881c]' : 'bg-royal-600')}
                  style={{ width: `${Math.min(100, s.pct)}%` }}
                />
              </div>
              <span className="text-right text-xs font-bold text-navy-900">{s.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Pencapaian ---------- */

export function AchievementsCard({
  focusText,
  tasksDone,
  periodLabel,
  focusIcon,
  taskIcon,
}: {
  focusText: string;
  tasksDone: number;
  periodLabel: string;
  focusIcon: ReactNode;
  taskIcon: ReactNode;
}) {
  const tiles = [
    { icon: focusIcon, value: focusText, label: `Total ${periodLabel}`, tone: 'bg-blue-100 text-royal-600' },
    { icon: taskIcon, value: `${tasksDone} tugas`, label: `Selesai ${periodLabel}`, tone: 'bg-cream-200 text-navy-800' },
  ];
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <h2 className="text-base font-bold text-navy-900">Pencapaian</h2>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-50 px-3 py-8 text-center"
          >
            <span className={cn('flex rounded-full p-3', t.tone)}>{t.icon}</span>
            <p className="text-[15px] font-extrabold text-navy-900">{t.value}</p>
            <p className="text-xs font-medium text-muted">{t.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
