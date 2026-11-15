import { formatShortDate, formatTime, startOfDay } from '@/lib/dates';
import type { StudySession, Task } from '@/types/tasks';
import { dueReminders } from './model';

export interface NoticePrefs {
  deadline: boolean;
  daily: boolean;
  ai: boolean;
}

export interface Notice {
  id: string;
  title: string;
  detail: string;
  /** Tujuan tautan di dalam aplikasi, bila ada. */
  to?: string;
}

interface Input {
  /** Sesi belum selesai dari awal hari ini sampai 7 hari ke depan. */
  sessions: StudySession[];
  /** Tugas/ujian belum selesai dengan tenggat dari sekarang sampai 7 hari ke depan. */
  tasks: Task[];
  prefs: NoticePrefs;
  now: Date;
}

const DAY = 24 * 3600_000;

/**
 * Pengingat dalam aplikasi (tanpa push/email), dihitung ulang tiap lonceng dimuat.
 * - Pengingat sesi: sesi dengan "Ingatkan saya" yang mulai dalam 24 jam (selalu aktif).
 * - Pengingat tenggat (notif_deadline): tugas/ujian jatuh tempo dalam 24 jam.
 * - Ringkasan harian (notif_daily): sesi belum selesai hari ini, tampil mulai pukul 05.00.
 * - Saran AI (notif_ai): ada tugas jatuh tempo dalam 7 hari tetapi belum ada sesi belajar terjadwal.
 */
export function buildNotices({ sessions, tasks, prefs, now }: Input): Notice[] {
  const out: Notice[] = [];

  for (const s of dueReminders(sessions, now)) {
    out.push({
      id: `remind-${s.id}`,
      title: `${s.subject ? `${s.subject}: ` : ''}${s.title}`,
      detail: `Sesi belajar ${formatShortDate(new Date(s.starts_at), now)}, ${formatTime(new Date(s.starts_at))} · ${s.duration_minutes} menit`,
      to: '/study-plan',
    });
  }

  if (prefs.deadline) {
    const limit = now.getTime() + DAY;
    for (const t of tasks) {
      if (!t.due_at) continue;
      const due = new Date(t.due_at);
      if (due.getTime() < now.getTime() || due.getTime() > limit) continue;
      out.push({
        id: `due-${t.id}`,
        title: t.title,
        detail: `${t.category === 'ujian' ? 'Ujian' : 'Tenggat'} ${formatShortDate(due, now)}, ${formatTime(due)}`,
        to: '/study-plan',
      });
    }
  }

  if (prefs.daily && now.getHours() >= 5) {
    const dayStart = startOfDay(now).getTime();
    const dayEnd = dayStart + DAY;
    const today = sessions
      .filter((s) => {
        const t = new Date(s.starts_at).getTime();
        return !s.completed_at && t >= dayStart && t < dayEnd;
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    if (today.length > 0) {
      const minutes = today.reduce((n, s) => n + s.duration_minutes, 0);
      out.push({
        id: 'daily',
        title: 'Rencana belajar hari ini',
        detail: `${today.length} sesi belum selesai · ${Math.round((minutes / 60) * 10) / 10} jam · mulai ${formatTime(new Date(today[0].starts_at))}`,
        to: '/study-plan',
      });
    }
  }

  if (prefs.ai && tasks.length > 0) {
    const pending = sessions.filter(
      (s) => !s.completed_at && new Date(s.starts_at).getTime() >= now.getTime(),
    );
    if (pending.length === 0) {
      out.push({
        id: 'ai-suggestion',
        title: `${tasks.length} tugas atau ujian jatuh tempo dalam 7 hari`,
        detail: 'Belum ada sesi belajar terjadwal. Minta Asisten AI menyusun jadwal.',
        to: '/assistant',
      });
    }
  }

  return out;
}
