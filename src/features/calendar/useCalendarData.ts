import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isMissingTable, MIGRATION_HINT } from '@/lib/dbErrors';
import { GoogleCalendarError, listGoogleEvents } from '@/lib/googleCalendar';
import type { GoogleEvent } from '@/lib/googleCalendar';
import type { StudySession, Task } from '@/types/tasks';

interface Options {
  rangeStart: Date;
  rangeEnd: Date;
  googleConnected: boolean;
  /** Dipanggil bila Google meminta sambung ulang (token dicabut/kedaluwarsa). */
  onGoogleReconnect: () => void;
}

export function useCalendarData({ rangeStart, rangeEnd, googleConnected, onGoogleReconnect }: Options) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [nextExam, setNextExam] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();

  const load = useCallback(async () => {
    const from = new Date(startMs);
    const to = new Date(endMs);
    try {
      const [tasksRes, sessionsRes, examRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('status', 'todo')
          .gte('due_at', from.toISOString())
          .lte('due_at', to.toISOString())
          .order('due_at', { ascending: true })
          .limit(500),
        supabase
          .from('study_sessions')
          .select('*')
          .gte('starts_at', from.toISOString())
          .lte('starts_at', to.toISOString())
          .order('starts_at', { ascending: true })
          .limit(500),
        supabase
          .from('tasks')
          .select('*')
          .eq('status', 'todo')
          .eq('category', 'ujian')
          .gte('due_at', new Date().toISOString())
          .order('due_at', { ascending: true })
          .limit(1),
      ]);

      const failure = tasksRes.error ?? sessionsRes.error ?? examRes.error;
      if (failure) {
        console.error('Gagal memuat kalender:', failure);
        setError(
          isMissingTable(failure)
            ? MIGRATION_HINT
            : 'Data kalender belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.',
        );
      } else {
        setTasks((tasksRes.data ?? []) as Task[]);
        setSessions((sessionsRes.data ?? []) as StudySession[]);
        setNextExam(((examRes.data ?? []) as Task[])[0] ?? null);
        setError(null);
      }
    } catch (e) {
      console.error('Gagal memuat kalender:', e);
      setError('Data kalender belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.');
    } finally {
      setLoading(false);
    }

    // Google terpisah: kegagalannya tidak boleh menutupi tugas dan sesi belajar.
    if (!googleConnected) {
      setEvents([]);
      setGoogleError(null);
      return;
    }
    try {
      setEvents(await listGoogleEvents(from, to));
      setGoogleError(null);
    } catch (e) {
      setEvents([]);
      if (e instanceof GoogleCalendarError && (e.code === 'reconnect' || e.code === 'not_connected')) {
        onGoogleReconnect();
      } else {
        setGoogleError(
          e instanceof GoogleCalendarError ? e.message : 'Acara Google Calendar belum bisa dimuat.',
        );
      }
    }
  }, [startMs, endMs, googleConnected, onGoogleReconnect]);

  useEffect(() => {
    void load();
  }, [load]);

  return { tasks, sessions, events, nextExam, loading, error, googleError, reload: load };
}
