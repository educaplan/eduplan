import {
  addDays,
  dateKey,
  diffInDays,
  endOfDay,
  endOfWeek,
  parseDateKey,
  startOfDay,
  shortDayName,
  startOfWeek,
} from '@/lib/dates';
import type { StudySession, Task } from '@/types/tasks';

export interface ChartDay {
  key: string;
  label: string;
  minutes: number;
  /** true = hari yang belum tiba: menunjukkan menit yang DIRENCANAKAN, bukan yang sudah dikerjakan. */
  planned: boolean;
  isToday: boolean;
}

export interface DashboardStats {
  activeTasks: number;
  /** Tugas aktif dengan tenggat di minggu ini (Senin sampai Minggu). */
  dueThisWeek: number;
  /** Tugas aktif yang jatuh tempo hari ini atau sudah terlambat. */
  dueTodayCount: number;
  upcomingExams: number;
  nextExam: Task | null;
  weekMinutes: number;
  lastWeekMinutes: number;
  streak: number;
  bestStreak: number;
  chart: ChartDay[];
  todaySessions: StudySession[];
}


export function computeStreaks(
  days: Set<string>,
  today: Date,
): { current: number; best: number } {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = parseDateKey(key);
    run = prev && diffInDays(d, prev) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  // Streak berjalan: berakhir hari ini, atau kemarin bila hari ini belum belajar.
  let cursor = startOfDay(today);
  if (!days.has(dateKey(cursor))) cursor = addDays(cursor, -1);
  let current = 0;
  while (days.has(dateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

export function computeDashboardStats(
  tasks: Task[],
  sessions: StudySession[],
  now: Date,
): DashboardStats {
  const active = tasks.filter((t) => t.status === 'todo');
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now).getTime();
  const weekStart = startOfWeek(now);
  const weekStartMs = weekStart.getTime();
  const weekEndMs = endOfWeek(now).getTime();

  const dueMs = (t: Task): number | null => (t.due_at ? new Date(t.due_at).getTime() : null);

  const dueThisWeek = active.filter((t) => {
    const ms = dueMs(t);
    return ms !== null && ms >= weekStartMs && ms <= weekEndMs;
  }).length;

  const dueTodayCount = active.filter((t) => {
    const ms = dueMs(t);
    return ms !== null && ms <= todayEnd;
  }).length;

  const exams = active
    .filter((t) => {
      const ms = dueMs(t);
      return t.category === 'ujian' && ms !== null && ms >= todayStart.getTime();
    })
    .sort((a, b) => (dueMs(a) as number) - (dueMs(b) as number));

  // Menit per hari: selesai (completed) dan terencana (semua sesi).
  const completedByDay = new Map<string, number>();
  const plannedByDay = new Map<string, number>();
  const studyDays = new Set<string>();
  for (const s of sessions) {
    const key = dateKey(new Date(s.starts_at));
    plannedByDay.set(key, (plannedByDay.get(key) ?? 0) + s.duration_minutes);
    if (s.completed_at) {
      completedByDay.set(key, (completedByDay.get(key) ?? 0) + s.duration_minutes);
      studyDays.add(key);
    }
  }

  const todayKey = dateKey(now);
  const chart: ChartDay[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const key = dateKey(day);
    const label = shortDayName(day);
    const future = key > todayKey;
    return {
      key,
      label,
      planned: future,
      isToday: key === todayKey,
      minutes: future ? (plannedByDay.get(key) ?? 0) : (completedByDay.get(key) ?? 0),
    };
  });

  const weekMinutes = chart.reduce((sum, d) => (d.planned ? sum : sum + d.minutes), 0);

  let lastWeekMinutes = 0;
  const lastWeekStart = addDays(weekStart, -7);
  for (let i = 0; i < 7; i += 1) {
    lastWeekMinutes += completedByDay.get(dateKey(addDays(lastWeekStart, i))) ?? 0;
  }

  const { current, best } = computeStreaks(studyDays, now);

  const todaySessions = sessions
    .filter((s) => dateKey(new Date(s.starts_at)) === todayKey)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return {
    activeTasks: active.length,
    dueThisWeek,
    dueTodayCount,
    upcomingExams: exams.length,
    nextExam: exams[0] ?? null,
    weekMinutes,
    lastWeekMinutes,
    streak: current,
    bestStreak: best,
    chart,
    todaySessions,
  };
}
