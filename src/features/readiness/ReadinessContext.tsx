import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { computeReadiness } from './formula';

interface ReadinessValue {
  /** Persen kesiapan, atau null bila belum ada tugas. */
  value: number | null;
  /** Hitung ulang (panggil setelah tugas ditambah/diubah). */
  refresh: () => Promise<void>;
}

const ReadinessContext = createContext<ReadinessValue | null>(null);

/** Satu sumber data kesiapan untuk sidebar dan Dashboard. */
export function ReadinessProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [totalRes, doneRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'selesai')
          .in('category', ['latihan', 'tugas']),
      ]);
      const failure = totalRes.error ?? doneRes.error;
      if (failure) {
        console.error('Gagal menghitung kesiapan:', failure);
        return;
      }
      setValue(computeReadiness(doneRes.count ?? 0, totalRes.count ?? 0));
    } catch (e) {
      console.error('Gagal menghitung kesiapan:', e);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ctx = useMemo(() => ({ value, refresh }), [value, refresh]);
  return <ReadinessContext.Provider value={ctx}>{children}</ReadinessContext.Provider>;
}

export function useReadiness(): ReadinessValue {
  const ctx = useContext(ReadinessContext);
  if (!ctx) throw new Error('useReadiness harus dipakai di dalam <ReadinessProvider>.');
  return ctx;
}
