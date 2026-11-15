import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SparklesIcon,
  SpinnerIcon,
} from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useReadiness } from '@/features/readiness/ReadinessContext';
import { AddSessionModal } from '@/features/study/AddSessionModal';
import { AutoPlanModal } from '@/features/study/AutoPlanModal';
import {
  countByDay,
  sessionsOfDay,
  sessionState,
  sortTasksForTable,
  swapStartTimes,
  weekDays,
  weeklyTarget,
} from '@/features/study/model';
import { TimerModal } from '@/features/study/TimerModal';
import { useStudyData } from '@/features/study/useStudyData';
import { DaySessions, TasksTable, WeeklyTargetCard, WeekStrip } from '@/features/study/widgets';
import { addDays, dateKey, endOfDay, formatShortDate, startOfDay } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { StudySession, Task } from '@/types/tasks';

const fullDay = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

export default function StudyPlan() {
  const { profile } = useAuth();
  const { refresh: refreshReadiness } = useReadiness();
  const [now, setNow] = useState(() => new Date());
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const weekStart = days[0];
  const weekEnd = useMemo(() => endOfDay(days[6]), [days]);
  const { sessions, tasks, loading, error, reload } = useStudyData(weekStart, weekEnd);

  const [addOpen, setAddOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [timerId, setTimerId] = useState<string | null>(null);

  const closeAdd = useCallback(() => setAddOpen(false), []);
  const closeAuto = useCallback(() => setAutoOpen(false), []);
  const closeTimer = useCallback(() => setTimerId(null), []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const daySessions = useMemo(() => sessionsOfDay(sessions, selected), [sessions, selected]);
  const counts = useMemo(() => countByDay(sessions), [sessions]);
  const target = useMemo(() => weeklyTarget(sessions), [sessions]);
  const tableTasks = useMemo(() => sortTasksForTable(tasks).slice(0, 12), [tasks]);
  const running = sessions.find((s) => sessionState(s) === 'berjalan') ?? null;
  const timerSession = sessions.find((s) => s.id === timerId) ?? null;
  const isToday = dateKey(selected) === dateKey(now);

  function shiftWeek(n: number) {
    const next = addDays(weekStart, n * 7);
    setAnchor(next);
    const today = new Date();
    const inside = today >= startOfDay(next) && today <= endOfDay(addDays(next, 6));
    setSelected(inside ? today : next);
    setReordering(false);
  }

  function goThisWeek() {
    const today = new Date();
    setAnchor(today);
    setSelected(today);
  }

  /** Jalankan satu aksi tulis ke database dengan penanganan error yang sama. */
  async function run(id: string, fail: string, action: () => PromiseLike<{ error: unknown }>) {
    setBusyId(id);
    setActionError(null);
    const { error: dbError } = await action();
    if (dbError) {
      console.error(fail, dbError);
      setActionError(fail);
    }
    await reload();
    setBusyId(null);
    return !dbError;
  }

  async function startSession(s: StudySession) {
    const ok = await run(s.id, 'Sesi belum bisa dimulai. Coba lagi.', () =>
      supabase.from('study_sessions').update({ started_at: new Date().toISOString() }).eq('id', s.id),
    );
    if (ok) setTimerId(s.id);
  }

  async function finishSession(s: StudySession) {
    const ok = await run(s.id, 'Sesi belum bisa diselesaikan. Coba lagi.', () =>
      supabase.from('study_sessions').update({ completed_at: new Date().toISOString() }).eq('id', s.id),
    );
    if (ok) setTimerId(null);
  }

  async function cancelSession(s: StudySession) {
    const ok = await run(s.id, 'Sesi belum bisa dibatalkan. Coba lagi.', () =>
      supabase.from('study_sessions').update({ started_at: null }).eq('id', s.id),
    );
    if (ok) setTimerId(null);
  }

  async function moveSession(index: number, dir: -1 | 1) {
    const updates = swapStartTimes(daySessions, index, dir);
    if (!updates) return;
    await run(updates[0].id, 'Urutan sesi belum bisa diubah. Coba lagi.', async () => {
      const results = await Promise.all(
        updates.map((u) =>
          supabase.from('study_sessions').update({ starts_at: u.starts_at }).eq('id', u.id),
        ),
      );
      return { error: results.find((r) => r.error)?.error ?? null };
    });
  }

  async function toggleTask(t: Task) {
    const done = t.status === 'selesai';
    const ok = await run(t.id, 'Status tugas belum bisa diubah. Coba lagi.', () =>
      supabase
        .from('tasks')
        .update({
          status: done ? 'todo' : 'selesai',
          completed_at: done ? null : new Date().toISOString(),
        })
        .eq('id', t.id),
    );
    if (ok) void refreshReadiness();
  }

  async function deleteTask(t: Task) {
    const ok = await run(t.id, 'Tugas belum bisa dihapus. Coba lagi.', () =>
      supabase.from('tasks').delete().eq('id', t.id),
    );
    if (ok) void refreshReadiness();
  }

  const rangeLabel = `${formatShortDate(days[0], now)} - ${formatShortDate(days[6], now)}`;
  const dayTitle = (() => {
    const t = fullDay.format(selected);
    return `Sesi belajar · ${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  })();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[30px]">Rencana Belajar</h1>
          <p className="text-[15px] font-medium text-muted">
            Atur sesi belajar agar target UTBK-mu tercapai
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoOpen(true)}
            className="flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-navy-900 transition hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
          >
            <SparklesIcon size={18} />
            Buat rencana otomatis
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-12 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-cream-200 transition hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100"
          >
            <PlusIcon size={18} />
            Tambah sesi
          </button>
        </div>
      </header>

      {actionError ? <Alert variant="error">{actionError}</Alert> : null}

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
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftWeek(-1)}
                aria-label="Minggu sebelumnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-navy-900 hover:bg-cream-50"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                type="button"
                onClick={() => shiftWeek(1)}
                aria-label="Minggu berikutnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-navy-900 hover:bg-cream-50"
              >
                <ChevronRightIcon size={16} />
              </button>
              <span className="text-sm font-semibold text-navy-900">{rangeLabel}</span>
              <button
                type="button"
                onClick={goThisWeek}
                className="ml-1 text-xs font-semibold text-royal-600 hover:text-navy-900"
              >
                Minggu ini
              </button>
            </div>
            <WeekStrip days={days} counts={counts} selected={selected} onSelect={setSelected} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <DaySessions
              title={dayTitle}
              sessions={daySessions}
              now={now}
              isToday={isToday}
              reordering={reordering}
              busyId={busyId}
              runningId={running?.id ?? null}
              onToggleReorder={() => setReordering((v) => !v)}
              onStart={(s) => void startSession(s)}
              onOpenTimer={(s) => setTimerId(s.id)}
              onMove={(i, d) => void moveSession(i, d)}
            />
            <WeeklyTargetCard target={target} />
          </div>

          <TasksTable
            tasks={tableTasks}
            now={now}
            busyId={busyId}
            onToggle={(t) => void toggleTask(t)}
            onDelete={(t) => void deleteTask(t)}
          />
        </>
      )}

      <AddSessionModal
        open={addOpen}
        onClose={closeAdd}
        initialDate={dateKey(selected)}
        onSaved={() => {
          closeAdd();
          void reload();
        }}
      />
      <AutoPlanModal
        open={autoOpen}
        onClose={closeAuto}
        weekDays={days}
        tasks={tasks}
        weekSessions={sessions}
        goal={profile?.academic_goal?.trim() ?? ''}
        onSaved={() => {
          closeAuto();
          void reload();
        }}
      />
      <TimerModal
        session={timerSession}
        busy={busyId !== null}
        onClose={closeTimer}
        onFinish={(s) => void finishSession(s)}
        onCancel={(s) => void cancelSession(s)}
      />
    </div>
  );
}
