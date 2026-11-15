import { addDays, dateKey, diffInDays, endOfDay, shortDayName, startOfDay, startOfWeek } from '@/lib/dates';
import { computeStreaks } from '@/features/dashboard/stats';
import type { StudySession, Task } from '@/types/tasks';

export type Period = 'minggu' | 'bulan';

export interface Range {
  start: Date;
  end: Date;
}

/** Rentang periode berjalan dan periode sebelumnya (minggu lalu / bulan lalu). */
export function periodRanges(period: Period, now: Date): { cur: Range; prev: Range } {
  if (period === 'minggu') {
    const start = startOfWeek(now);
    return {
      cur: { start, end: endOfDay(addDays(start, 6)) },
      prev: { start: addDays(start, -7), end: endOfDay(addDays(start, -1)) },
    };
  }
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    cur: { start: new Date(y, m, 1), end: endOfDay(new Date(y, m + 1, 0)) },
    prev: { start: new Date(y, m - 1, 1), end: endOfDay(new Date(y, m, 0)) },
  };
}

function inRange(iso: string | null, r: Range): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
}

const sumMin = (list: StudySession[]) => list.reduce((n, s) => n + s.duration_minutes, 0);

export interface ChartBar {
  key: string;
  label: string;
  minutes: number;
}

export interface TaskBreakdown {
  total: number;
  /** Selesai sebelum atau tepat pada tenggat. */
  onTime: number;
  /** Belum selesai dan tenggat belum lewat. */
  inProgress: number;
  /** Belum selesai lewat tenggat, atau selesai setelah tenggat. */
  late: number;
  /** Persen selesai tepat waktu; null bila tidak ada tugas. */
  pct: number | null;
}

export interface SubjectProgress {
  name: string;
  pct: number;
  doneMin: number;
  plannedMin: number;
}

export interface ProgressData {
  hoursMin: number;
  prevHoursMin: number;
  chart: ChartBar[];
  /** Target per bar (menit): rata-rata jam sesi terjadwal per hari/minggu; null bila tak ada sesi terjadwal. */
  targetPerBarMin: number | null;
  tasks: TaskBreakdown;
  subjects: SubjectProgress[];
  tasksDone: number;
  streak: { current: number; best: number };
}

/** Bucket minggu dalam bulan: tgl 1-7, 8-14, 15-21, 22-28, 29-akhir. */
function weekOfMonth(d: Date): number {
  return Math.min(4, Math.floor((d.getDate() - 1) / 7));
}

export function computeProgress(
  period: Period,
  sessions: StudySession[],
  tasks: Task[],
  now: Date,
): ProgressData {
  const { cur, prev } = periodRanges(period, now);

  const curSessions = sessions.filter((s) => inRange(s.starts_at, cur));
  const doneCur = curSessions.filter((s) => s.completed_at);
  const hoursMin = sumMin(doneCur);
  const prevHoursMin = sumMin(
    sessions.filter((s) => s.completed_at && inRange(s.starts_at, prev)),
  );
  const plannedMin = sumMin(curSessions);

  // Grafik
  let chart: ChartBar[];
  if (period === 'minggu') {
    chart = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(cur.start, i);
      return { key: dateKey(d), label: shortDayName(d), minutes: 0 };
    });
    for (const s of doneCur) {
      const idx = diffInDays(startOfDay(new Date(s.starts_at)), cur.start);
      if (chart[idx]) chart[idx].minutes += s.duration_minutes;
    }
  } else {
    const lastDay = cur.end.getDate();
    const count = Math.min(5, Math.ceil(lastDay / 7));
    chart = Array.from({ length: count }, (_, i) => ({
      key: `w${i + 1}`,
      label: `Minggu ${i + 1}`,
      minutes: 0,
    }));
    for (const s of doneCur) {
      const bar = chart[weekOfMonth(new Date(s.starts_at))];
      if (bar) bar.minutes += s.duration_minutes;
    }
  }
  const targetPerBarMin = plannedMin > 0 ? plannedMin / chart.length : null;

  // Tugas yang tenggatnya jatuh di periode ini
  const due = tasks.filter((t) => inRange(t.due_at, cur));
  let onTime = 0;
  let inProgress = 0;
  let late = 0;
  for (const t of due) {
    const dueMs = new Date(t.due_at as string).getTime();
    if (t.status === 'selesai') {
      const doneMs = new Date(t.completed_at ?? t.updated_at).getTime();
      if (doneMs <= dueMs) onTime += 1;
      else late += 1;
    } else if (dueMs < now.getTime()) {
      late += 1;
    } else {
      inProgress += 1;
    }
  }
  const total = due.length;

  // Progres per mata pelajaran
  const bySubject = new Map<string, SubjectProgress>();
  for (const s of curSessions) {
    const name = s.subject?.trim() || 'Lainnya';
    const row = bySubject.get(name) ?? { name, pct: 0, doneMin: 0, plannedMin: 0 };
    row.plannedMin += s.duration_minutes;
    if (s.completed_at) row.doneMin += s.duration_minutes;
    bySubject.set(name, row);
  }
  const subjects = [...bySubject.values()]
    .map((r) => ({ ...r, pct: Math.round((r.doneMin / r.plannedMin) * 100) }))
    .sort((a, b) => b.plannedMin - a.plannedMin || a.name.localeCompare(b.name))
    .slice(0, 5);

  // Streak: hari dengan minimal satu sesi selesai (tidak tergantung periode)
  const days = new Set<string>();
  for (const s of sessions) if (s.completed_at) days.add(dateKey(new Date(s.starts_at)));

  return {
    hoursMin,
    prevHoursMin,
    chart,
    targetPerBarMin,
    tasks: {
      total,
      onTime,
      inProgress,
      late,
      pct: total > 0 ? Math.round((onTime / total) * 100) : null,
    },
    subjects,
    tasksDone: tasks.filter((t) => t.status === 'selesai' && inRange(t.completed_at, cur)).length,
    streak: computeStreaks(days, now),
  };
}
