import { addDays, dateKey, diffInDays, parseDateKey, startOfDay, startOfWeek } from '@/lib/dates';
import type { GoogleEvent } from '@/lib/googleCalendar';
import type { StudySession, Task } from '@/types/tasks';

export type CalKind = 'tugas' | 'ujian' | 'sesi' | 'terlambat' | 'google';

export interface CalItem {
  id: string;
  kind: CalKind;
  title: string;
  /** Waktu mulai/tenggat. */
  at: Date;
  allDay: boolean;
  /** Ujian berprioritas rendah ("Kuis" di desain) ditampilkan lebih pudar. */
  soft?: boolean;
}

export interface MonthGrid {
  /** Hari pertama grid (Senin). */
  start: Date;
  /** Hari terakhir grid (Minggu), 23.59. */
  end: Date;
  weeks: Date[][];
}

/** Grid bulan: 5 atau 6 baris, Senin-Minggu, termasuk hari dari bulan sebelum/sesudahnya. */
export function buildMonthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  const lastOfMonth = new Date(year, month + 1, 0);
  const weekCount = Math.ceil((diffInDays(lastOfMonth, start) + 1) / 7);
  const weeks: Date[][] = [];
  for (let w = 0; w < weekCount; w++) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  }
  const end = addDays(start, weekCount * 7 - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end, weeks };
}

export function buildItems(
  tasks: Task[],
  sessions: StudySession[],
  events: GoogleEvent[],
  now: Date,
): CalItem[] {
  const items: CalItem[] = [];

  for (const t of tasks) {
    if (!t.due_at || t.status === 'selesai') continue;
    const at = new Date(t.due_at);
    if (Number.isNaN(at.getTime())) continue;
    const isExam = t.category === 'ujian';
    items.push({
      id: `task-${t.id}`,
      kind: isExam ? 'ujian' : at.getTime() < now.getTime() ? 'terlambat' : 'tugas',
      title: t.title,
      at,
      allDay: t.due_all_day,
      soft: isExam && t.priority === 'rendah',
    });
  }

  for (const s of sessions) {
    const at = new Date(s.starts_at);
    if (Number.isNaN(at.getTime())) continue;
    items.push({ id: `session-${s.id}`, kind: 'sesi', title: s.title, at, allDay: false });
  }

  for (const e of events) {
    if (!e.start) continue;
    const at = e.allDay ? parseDateKey(e.start.slice(0, 10)) : new Date(e.start);
    if (Number.isNaN(at.getTime())) continue;
    items.push({ id: `google-${e.id}`, kind: 'google', title: e.title, at, allDay: e.allDay });
  }

  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Peta "YYYY-MM-DD" -> item hari itu (urutan waktu dipertahankan). */
export function groupByDay(items: CalItem[]): Map<string, CalItem[]> {
  const map = new Map<string, CalItem[]>();
  for (const item of items) {
    const key = dateKey(item.at);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** Jumlah ujian dan tugas (termasuk yang terlambat) pada bulan tertentu. */
export function monthSummary(items: CalItem[], year: number, month: number) {
  let exams = 0;
  let tasks = 0;
  for (const i of items) {
    if (i.at.getFullYear() !== year || i.at.getMonth() !== month) continue;
    if (i.kind === 'ujian') exams += 1;
    else if (i.kind === 'tugas' || i.kind === 'terlambat') tasks += 1;
  }
  return { exams, tasks };
}

/** "Hari ini", "Besok" atau "N hari lagi". */
export function countdownText(target: Date, now: Date): string {
  const diff = diffInDays(target, now);
  if (diff <= 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  return `${diff} hari lagi`;
}

export function isSameMonth(d: Date, year: number, month: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month;
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
