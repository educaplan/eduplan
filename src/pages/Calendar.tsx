import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SpinnerIcon } from '@/components/icons';
import { useReadiness } from '@/features/readiness/ReadinessContext';
import { AddTaskModal } from '@/features/tasks/AddTaskModal';
import { buildItems, buildMonthGrid, groupByDay, monthSummary } from '@/features/calendar/model';
import { useCalendarData } from '@/features/calendar/useCalendarData';
import { AgendaCard, GoogleCard, MonthPanel, NextExamCard } from '@/features/calendar/widgets';
import { dateKey } from '@/lib/dates';
import {
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  GoogleCalendarError,
  startGoogleCalendarConnect,
} from '@/lib/googleCalendar';
import type { GoogleCalendarStatus } from '@/lib/googleCalendar';

const monthYear = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' });

const GOOGLE_NOTICE: Record<string, { variant: 'success' | 'error'; text: string }> = {
  connected: { variant: 'success', text: 'Google Calendar berhasil terhubung.' },
  denied: { variant: 'error', text: 'Izin Google Calendar tidak diberikan, jadi belum terhubung.' },
  error: { variant: 'error', text: 'Gagal menghubungkan Google Calendar. Coba lagi.' },
};

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function Calendar() {
  const { refresh: refreshReadiness } = useReadiness();
  const [params, setParams] = useSearchParams();
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const closeAdd = useCallback(() => setAddOpen(false), []);

  const [gStatus, setGStatus] = useState<GoogleCalendarStatus | null>(null);
  const [gStatusLoading, setGStatusLoading] = useState(true);
  const [gBusy, setGBusy] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [gActionError, setGActionError] = useState<string | null>(null);

  // Banner hasil OAuth (?google=...). Dibaca sekali lalu parameternya dihapus dari URL.
  const [notice] = useState(() => GOOGLE_NOTICE[params.get('google') ?? ''] ?? null);
  useEffect(() => {
    if (params.has('google')) {
      const next = new URLSearchParams(params);
      next.delete('google');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getGoogleCalendarStatus()
      .then((s) => {
        if (!cancelled) setGStatus(s);
      })
      .catch((e) => {
        console.error('Status Google Calendar gagal dimuat:', e);
        if (!cancelled) setGStatus({ connected: false, email: null });
      })
      .finally(() => {
        if (!cancelled) setGStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);
  const googleConnected = Boolean(gStatus?.connected) && !needsReconnect;

  const onGoogleReconnect = useCallback(() => setNeedsReconnect(true), []);
  const { tasks, sessions, events, nextExam, loading, error, googleError, reload } =
    useCalendarData({
      rangeStart: grid.start,
      rangeEnd: grid.end,
      googleConnected,
      onGoogleReconnect,
    });

  const items = useMemo(() => buildItems(tasks, sessions, events, now), [tasks, sessions, events, now]);
  const byDay = useMemo(() => groupByDay(items), [items]);
  const summary = useMemo(() => monthSummary(items, year, monthIndex), [items, year, monthIndex]);
  const agenda = byDay.get(dateKey(selected)) ?? [];

  const title = monthYear.format(month);
  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);

  function goToMonth(offset: number) {
    const next = new Date(year, monthIndex + offset, 1);
    setMonth(next);
    setSelected(next);
  }

  function goToday() {
    const today = new Date();
    setMonth(firstOfMonth(today));
    setSelected(today);
  }

  async function connectGoogle() {
    setGBusy(true);
    setGActionError(null);
    try {
      await startGoogleCalendarConnect(); // halaman berpindah ke Google bila berhasil
    } catch (e) {
      setGActionError(e instanceof GoogleCalendarError ? e.message : 'Gagal memulai koneksi Google.');
      setGBusy(false);
    }
  }

  async function disconnectGoogle() {
    setGBusy(true);
    setGActionError(null);
    try {
      await disconnectGoogleCalendar();
      setGStatus({ connected: false, email: null });
      setNeedsReconnect(false);
    } catch (e) {
      setGActionError(e instanceof GoogleCalendarError ? e.message : 'Gagal memutus koneksi Google.');
    } finally {
      setGBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[30px]">Kalender</h1>
          <p className="text-[15px] font-medium text-muted">
            {capitalized} · {summary.exams} ujian dan {summary.tasks} tugas bulan ini
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Bulan sebelumnya"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-navy-900 transition hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Bulan berikutnya"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-navy-900 transition hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
          >
            <ChevronRightIcon size={18} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="h-12 rounded-xl border border-line bg-white px-[18px] text-sm font-bold text-navy-900 transition hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
          >
            Hari ini
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-12 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-cream-200 transition hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100"
          >
            <PlusIcon size={18} />
            Tambah
          </button>
        </div>
      </header>

      {notice ? <Alert variant={notice.variant}>{notice.text}</Alert> : null}
      {gActionError ? <Alert variant="error">{gActionError}</Alert> : null}
      {googleError ? <Alert variant="error">{googleError}</Alert> : null}

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
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <MonthPanel
            title={capitalized}
            year={year}
            month={monthIndex}
            weeks={grid.weeks}
            byDay={byDay}
            now={now}
            selected={selected}
            onSelect={setSelected}
            showGoogle={googleConnected}
          />
          <div className="flex w-full shrink-0 flex-col gap-6 xl:w-[340px]">
            <NextExamCard exam={nextExam} now={now} />
            <AgendaCard title={`Agenda ${dayMonth.format(selected)}`} items={agenda} />
            <GoogleCard
              status={gStatus}
              statusLoading={gStatusLoading}
              busy={gBusy}
              needsReconnect={needsReconnect}
              onConnect={() => void connectGoogle()}
              onDisconnect={() => void disconnectGoogle()}
            />
          </div>
        </div>
      )}

      <AddTaskModal
        open={addOpen}
        onClose={closeAdd}
        initialDate={dateKey(selected)}
        onSaved={() => {
          closeAdd();
          void reload();
          void refreshReadiness();
        }}
      />
    </div>
  );
}
