import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addDays } from '@/lib/dates';
import { isMissingTable, MIGRATION_HINT } from '@/lib/dbErrors';
import type { StudySession, Task } from '@/types/tasks';

/** Sesi 400 hari terakhir (cukup untuk streak dan perbandingan) dan semua tugas. */
export function useProgressData() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const since = addDays(new Date(), -400).toISOString();
      const [sessionsRes, tasksRes] = await Promise.all([
        supabase
          .from('study_sessions')
          .select('*')
          .gte('starts_at', since)
          .order('starts_at', { ascending: false })
          .limit(2000),
        supabase.from('tasks').select('*').order('due_at', { ascending: false }).limit(2000),
      ]);
      const failure = sessionsRes.error ?? tasksRes.error;
      if (failure) {
        console.error('Gagal memuat progres:', failure);
        setError(
          isMissingTable(failure)
            ? MIGRATION_HINT
            : 'Data progres belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.',
        );
      } else {
        setSessions((sessionsRes.data ?? []) as StudySession[]);
        setTasks((tasksRes.data ?? []) as Task[]);
        setError(null);
      }
    } catch (e) {
      console.error('Gagal memuat progres:', e);
      setError('Data progres belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { sessions, tasks, loading, error, reload: load };
}
