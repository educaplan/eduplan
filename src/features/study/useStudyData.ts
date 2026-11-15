import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isMissingTable, MIGRATION_HINT } from '@/lib/dbErrors';
import type { StudySession, Task } from '@/types/tasks';

/** Sesi pada rentang minggu yang dilihat + semua tugas (untuk tabel di bawah). */
export function useStudyData(weekStart: Date, weekEnd: Date) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startMs = weekStart.getTime();
  const endMs = weekEnd.getTime();

  const load = useCallback(async () => {
    try {
      const [sessionsRes, tasksRes] = await Promise.all([
        supabase
          .from('study_sessions')
          .select('*')
          .gte('starts_at', new Date(startMs).toISOString())
          .lte('starts_at', new Date(endMs).toISOString())
          .order('starts_at', { ascending: true })
          .limit(300),
        supabase.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false }).limit(300),
      ]);
      const failure = sessionsRes.error ?? tasksRes.error;
      if (failure) {
        console.error('Gagal memuat rencana belajar:', failure);
        setError(
          isMissingTable(failure)
            ? MIGRATION_HINT
            : 'Data rencana belajar belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.',
        );
      } else {
        setSessions((sessionsRes.data ?? []) as StudySession[]);
        setTasks((tasksRes.data ?? []) as Task[]);
        setError(null);
      }
    } catch (e) {
      console.error('Gagal memuat rencana belajar:', e);
      setError('Data rencana belajar belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [startMs, endMs]);

  useEffect(() => {
    void load();
  }, [load]);

  return { sessions, tasks, loading, error, reload: load };
}
