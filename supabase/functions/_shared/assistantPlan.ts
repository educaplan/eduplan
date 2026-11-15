// Logika murni (tanpa API Deno) untuk memvalidasi rencana belajar dari AI, supaya bisa dites.

export interface PlanSession {
  date: string; // YYYY-MM-DD (waktu lokal user)
  start: string; // HH:mm
  durationMinutes: number;
  subject: string;
  title: string;
}

export interface BusySlot {
  date: string;
  start: string;
  durationMinutes: number;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_PLAN_SESSIONS = 30;

export function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export function toMin(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

export function toHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

interface Opts {
  /** Hari ini (lokal user). */
  today: string;
  /** Menit sejak tengah malam saat ini (lokal user); sesi hari ini harus mulai setelahnya. */
  nowMinutes: number;
  /** Batas akhir tanggal yang diterima. */
  maxDate: string;
  busy: BusySlot[];
}

/** Menyaring rencana dari AI: format, rentang tanggal, jam wajar, dan tidak bentrok. */
export function validatePlan(raw: unknown, opts: Opts): PlanSession[] {
  const list = (raw as { sessions?: unknown } | null)?.sessions;
  if (!Array.isArray(list)) return [];
  const taken = opts.busy
    .filter((b) => DATE_RE.test(b.date) && TIME_RE.test(b.start))
    .map((b) => ({ date: b.date, from: toMin(b.start), to: toMin(b.start) + b.durationMinutes }));
  const out: PlanSession[] = [];

  for (const item of list) {
    if (out.length >= MAX_PLAN_SESSIONS) break;
    const date = typeof item?.date === 'string' ? item.date : '';
    const start = typeof item?.start === 'string' ? item.start : '';
    if (!DATE_RE.test(date) || date < opts.today || date > opts.maxDate) continue;
    if (!TIME_RE.test(start)) continue;
    const from = toMin(start);
    if (from < 5 * 60 || from > 23 * 60) continue;
    if (date === opts.today && from <= opts.nowMinutes) continue;
    const dur = Math.min(180, Math.max(15, Math.round(Number(item?.durationMinutes) || 45)));
    const subject = clean(item?.subject, 60);
    const title = clean(item?.title, 120);
    if (!subject || !title) continue;
    const to = from + dur;
    if (taken.some((t) => t.date === date && from < t.to && to > t.from)) continue;
    taken.push({ date, from, to });
    out.push({ date, start: toHHMM(from), durationMinutes: dur, subject, title });
  }
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
