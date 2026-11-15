import { addDays, dateKey, startOfWeek } from '@/lib/dates';
import type { StudySession, Task } from '@/types/tasks';

/* ---------- Minggu & sesi ---------- */

/** Tujuh hari (Senin-Minggu) dari minggu yang memuat `anchor`. */
export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sessionsOfDay(sessions: StudySession[], day: Date): StudySession[] {
  const key = dateKey(day);
  return sessions
    .filter((s) => dateKey(new Date(s.starts_at)) === key)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

export function countByDay(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dateKey(new Date(s.starts_at));
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export type SessionState = 'selesai' | 'berjalan' | 'terjadwal';

export function sessionState(s: StudySession): SessionState {
  if (s.completed_at) return 'selesai';
  if (s.started_at) return 'berjalan';
  return 'terjadwal';
}

/** Warna aksen kartu sesi, tetap per mata pelajaran. */
const ACCENTS = ['#0d1c42', '#e0a82e', '#22396f', '#b3382c', '#067647'];
export function accentFor(subject: string | null): string {
  const key = (subject ?? '').trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

/**
 * Tukar jam mulai sesi pada indeks `index` dengan tetangganya (-1 = naik, +1 = turun).
 * Mengembalikan dua pembaruan {id, starts_at}, atau null bila di ujung daftar.
 */
export function swapStartTimes(
  daySessions: StudySession[],
  index: number,
  dir: -1 | 1,
): Array<{ id: string; starts_at: string }> | null {
  const other = index + dir;
  if (index < 0 || other < 0 || index >= daySessions.length || other >= daySessions.length) {
    return null;
  }
  const a = daySessions[index];
  const b = daySessions[other];
  return [
    { id: a.id, starts_at: b.starts_at },
    { id: b.id, starts_at: a.starts_at },
  ];
}

/* ---------- Target mingguan ---------- */

export interface TargetRow {
  name: string;
  doneMin: number;
  plannedMin: number;
}

export interface WeeklyTarget {
  doneMin: number;
  plannedMin: number;
  rows: TargetRow[];
}

const OTHER = 'Lainnya';

/**
 * Target mingguan = jam dari SEMUA sesi yang dijadwalkan minggu itu;
 * tercapai = jam dari sesi yang sudah selesai. Tiga mata pelajaran terbesar
 * ditampilkan sendiri, sisanya digabung jadi "Lainnya".
 */
export function weeklyTarget(sessions: StudySession[], maxRows = 4): WeeklyTarget {
  const bySubject = new Map<string, TargetRow>();
  let doneMin = 0;
  let plannedMin = 0;
  for (const s of sessions) {
    const name = s.subject?.trim() || OTHER;
    const row = bySubject.get(name) ?? { name, doneMin: 0, plannedMin: 0 };
    row.plannedMin += s.duration_minutes;
    plannedMin += s.duration_minutes;
    if (s.completed_at) {
      row.doneMin += s.duration_minutes;
      doneMin += s.duration_minutes;
    }
    bySubject.set(name, row);
  }

  const named = [...bySubject.values()]
    .filter((r) => r.name !== OTHER)
    .sort((a, b) => b.plannedMin - a.plannedMin || a.name.localeCompare(b.name));
  const keep = named.slice(0, maxRows - 1);
  const rest = [...named.slice(maxRows - 1), ...(bySubject.has(OTHER) ? [bySubject.get(OTHER)!] : [])];

  const rows = [...keep];
  if (rest.length > 0) {
    rows.push({
      name: OTHER,
      doneMin: rest.reduce((n, r) => n + r.doneMin, 0),
      plannedMin: rest.reduce((n, r) => n + r.plannedMin, 0),
    });
  }
  return { doneMin, plannedMin, rows };
}

const hourFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
/** 750 -> "12,5" */
export function hoursText(minutes: number): string {
  return hourFmt.format(minutes / 60);
}

/* ---------- Tabel tugas ---------- */

export type TaskState = 'selesai' | 'terlambat' | 'belum';

export function taskState(t: Task, now: Date): TaskState {
  if (t.status === 'selesai') return 'selesai';
  if (t.due_at && new Date(t.due_at).getTime() < now.getTime()) return 'terlambat';
  return 'belum';
}

/** Tugas aktif dulu (tenggat terdekat di atas, tanpa tenggat di bawah), lalu yang selesai. */
export function sortTasksForTable(tasks: Task[]): Task[] {
  const due = (t: Task) => (t.due_at ? new Date(t.due_at).getTime() : Number.POSITIVE_INFINITY);
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'selesai' ? 1 : 0;
    const bDone = b.status === 'selesai' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (aDone) {
      return (
        new Date(b.completed_at ?? b.updated_at).getTime() -
        new Date(a.completed_at ?? a.updated_at).getTime()
      );
    }
    return due(a) - due(b);
  });
}

/* ---------- Timer sesi ---------- */

/** Detik tersisa (bisa negatif bila waktu habis). null bila sesi belum dimulai. */
export function remainingSeconds(s: StudySession, now: Date): number | null {
  if (!s.started_at) return null;
  const end = new Date(s.started_at).getTime() + s.duration_minutes * 60_000;
  return Math.round((end - now.getTime()) / 1000);
}

/** 3725 -> "1:02:05", 125 -> "02:05" */
export function clock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const t = Math.abs(totalSeconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${sign}${h > 0 ? `${h}:` : ''}${pad(m)}:${pad(sec)}`;
}

/* ---------- Pengingat ---------- */

/** Sesi yang minta diingatkan, belum selesai, dan mulai dalam 24 jam ke depan. */
export function dueReminders(sessions: StudySession[], now: Date): StudySession[] {
  const from = now.getTime();
  const to = from + 24 * 3600_000;
  return sessions
    .filter((s) => {
      if (!s.remind_me || s.completed_at) return false;
      const t = new Date(s.starts_at).getTime();
      return t >= from && t <= to;
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}
