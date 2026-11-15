import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addDays } from '@/lib/dates';
import { isMissingTable, MIGRATION_HINT } from '@/lib/dbErrors';
import type { StudySession, Task } from '@/types/tasks';

export function useDashboardData() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const since = addDays(new Date(), -400).toISOString();
      const [tasksRes, sessionsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('status', 'todo')
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(500),
        supabase
          .from('study_sessions')
          .select('*')
          .gte('starts_at', since)
          .order('starts_at', { ascending: true })
          .limit(1000),
      ]);

      const failure = tasksRes.error ?? sessionsRes.error;
      if (failure) {
        console.error('Gagal memuat dashboard:', failure);
        setError(
          isMissingTable(failure)
            ? MIGRATION_HINT
            : 'Data dashboard belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.',
        );
      } else {
        setTasks((tasksRes.data ?? []) as Task[]);
        setSessions((sessionsRes.data ?? []) as StudySession[]);
        setError(null);
      }
    } catch (e) {
      console.error('Gagal memuat dashboard:', e);
      setError('Data dashboard belum bisa dimuat. Periksa koneksi internetmu lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { tasks, sessions, loading, error, reload: load };
}
