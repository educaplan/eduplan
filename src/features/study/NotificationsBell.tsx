import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { addDays, startOfDay } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { StudySession, Task } from '@/types/tasks';
import { buildNotices } from './notices';

/** Lonceng: pengingat dalam aplikasi sesuai pilihan di Pengaturan. */
export function NotificationsBell() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const current = new Date();
    const horizon = addDays(current, 7).toISOString();
    const [sessionsRes, tasksRes] = await Promise.all([
      supabase
        .from('study_sessions')
        .select('*')
        .is('completed_at', null)
        .gte('starts_at', startOfDay(current).toISOString())
        .lte('starts_at', horizon)
        .order('starts_at', { ascending: true })
        .limit(100),
      supabase
        .from('tasks')
        .select('*')
        .eq('status', 'todo')
        .gte('due_at', current.toISOString())
        .lte('due_at', horizon)
        .order('due_at', { ascending: true })
        .limit(50),
    ]);
    const failure = sessionsRes.error ?? tasksRes.error;
    if (failure) {
      console.error('Gagal memuat pengingat:', failure);
      setFailed(true);
      return;
    }
    setFailed(false);
    setSessions((sessionsRes.data ?? []) as StudySession[]);
    setTasks((tasksRes.data ?? []) as Task[]);
    setNow(current);
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const notices = useMemo(
    () =>
      buildNotices({
        sessions,
        tasks,
        now,
        prefs: {
          deadline: profile?.notif_deadline ?? true,
          daily: profile?.notif_daily ?? true,
          ai: profile?.notif_ai ?? true,
        },
      }),
    [sessions, tasks, now, profile?.notif_deadline, profile?.notif_daily, profile?.notif_ai],
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={notices.length > 0 ? `Pengingat, ${notices.length} baru` : 'Pengingat'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-navy-900 transition hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
      >
        <BellIcon />
        {notices.length > 0 ? (
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-danger" />
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Pengingat"
          className="absolute right-0 top-full z-20 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-4 shadow-card"
        >
          <p className="mb-2 text-sm font-bold text-navy-900">Pengingat</p>
          {failed ? (
            <p className="py-4 text-center text-sm font-medium text-muted">
              Pengingat belum bisa dimuat. Periksa koneksi internetmu.
            </p>
          ) : notices.length === 0 ? (
            <p className="py-4 text-center text-sm font-medium text-muted">
              Tidak ada pengingat sekarang. Atur jenisnya di Pengaturan.
            </p>
          ) : (
            <ul>
              {notices.map((n) => (
                <li key={n.id} className="border-b border-line last:border-b-0">
                  {n.to ? (
                    <Link
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg py-2.5 hover:bg-blue-50"
                    >
                      <p className="truncate text-sm font-semibold text-navy-900">{n.title}</p>
                      <p className="text-xs font-medium text-muted">{n.detail}</p>
                    </Link>
                  ) : (
                    <div className="py-2.5">
                      <p className="truncate text-sm font-semibold text-navy-900">{n.title}</p>
                      <p className="text-xs font-medium text-muted">{n.detail}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
