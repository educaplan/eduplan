import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  CalendarIcon,
  FlameIcon,
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  TasksIcon,
  TimerIcon,
} from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useReadiness } from '@/features/readiness/ReadinessContext';
import { computeDashboardStats } from '@/features/dashboard/stats';
import { useDashboardData } from '@/features/dashboard/useDashboardData';
import {
  ReadinessCard,
  StatCard,
  TodayPlan,
  UpcomingTasks,
  WeeklyChart,
} from '@/features/dashboard/widgets';
import { AddSessionModal } from '@/features/study/AddSessionModal';
import { NotificationsBell } from '@/features/study/NotificationsBell';
import { formatFullDate, formatHours, formatShortDate, greetingFor } from '@/lib/dates';

function weekDiffText(week: number, last: number): string {
  if (week === 0 && last === 0) return 'Belum ada sesi belajar selesai minggu ini';
  const diff = week - last;
  if (diff === 0) return 'Sama dengan minggu lalu';
  return `${diff > 0 ? 'Naik' : 'Turun'} ${formatHours(Math.abs(diff))} dari minggu lalu`;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { tasks, sessions, loading, error, reload } = useDashboardData();
  const { value: readiness } = useReadiness();
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const closeAdd = useCallback(() => setAddOpen(false), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = useMemo(() => computeDashboardStats(tasks, sessions, now), [tasks, sessions, now]);
  const name = profile?.nickname ?? 'Pelajar';

  const todayText =
    stats.dueTodayCount > 0
      ? `${stats.dueTodayCount} tugas perlu dikerjakan hari ini`
      : 'Tidak ada tugas yang jatuh tempo hari ini';

  const nextExam = stats.nextExam;
  const examCaption =
    nextExam && nextExam.due_at
      ? `Terdekat: ${nextExam.subject ?? nextExam.title}, ${formatShortDate(new Date(nextExam.due_at), now)}`
      : 'Belum ada ujian terjadwal';

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[30px]">
            {greetingFor(now)}, {name}!
          </h1>
          <p className="text-[15px] font-medium text-muted">
            {formatFullDate(now)} · {todayText}
          </p>
        </div>

        <div className="flex w-full items-center gap-3 xl:w-auto">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-white px-4 focus-within:border-royal-600 focus-within:ring-2 focus-within:ring-royal-600/15 sm:w-[280px] sm:flex-none">
            <SearchIcon size={18} className="shrink-0 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari tugas atau ujian"
              aria-label="Cari tugas atau ujian"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-navy-900 outline-none placeholder:text-muted"
            />
          </label>
          <NotificationsBell />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-cream-200 transition hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100"
          >
            <PlusIcon size={18} />
            Tambah tugas
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" className="!h-auto !px-0" onClick={() => void reload()}>
            Coba lagi
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-24 text-royal-600" role="status" aria-label="Memuat">
          <SpinnerIcon size={28} />
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              featured
              label="Tugas aktif"
              value={String(stats.activeTasks)}
              caption={`${stats.dueThisWeek} jatuh tempo minggu ini`}
              icon={<TasksIcon />}
            />
            <StatCard
              label="Ujian mendatang"
              value={String(stats.upcomingExams)}
              caption={examCaption}
              icon={<CalendarIcon />}
            />
            <StatCard
              label="Jam belajar minggu ini"
              value={formatHours(stats.weekMinutes)}
              caption={weekDiffText(stats.weekMinutes, stats.lastWeekMinutes)}
              icon={<TimerIcon />}
            />
            <StatCard
              label="Streak belajar"
              value={`${stats.streak} hari`}
              caption={
                stats.bestStreak > 0
                  ? `Rekor terbaikmu ${stats.bestStreak} hari`
                  : 'Selesaikan sesi belajar untuk memulai streak'
              }
              icon={<FlameIcon />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
            <UpcomingTasks tasks={tasks} query={query} now={now} />
            <TodayPlan sessions={stats.todaySessions} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <WeeklyChart days={stats.chart} />
            <ReadinessCard value={readiness} />
          </div>
        </>
      )}

      <AddSessionModal
        open={addOpen}
        onClose={closeAdd}
        onSaved={() => {
          closeAdd();
          void reload();
        }}
      />
    </div>
  );
}
