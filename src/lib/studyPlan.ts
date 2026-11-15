import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface PlanTaskInput {
  title: string;
  subject: string | null;
  category: string;
  priority: string | null;
  /** "YYYY-MM-DD HH:mm" waktu lokal. */
  due: string | null;
}

export interface PlanBusyInput {
  date: string;
  start: string;
  durationMinutes: number;
}

export interface PlanRequest {
  weekStart: string;
  today: string;
  hoursPerDay: number;
  goal: string;
  tasks: PlanTaskInput[];
  busy: PlanBusyInput[];
}

export interface ProposedSession {
  date: string;
  start: string;
  durationMinutes: number;
  subject: string;
  title: string;
}

export class StudyPlanError extends Error {}

export async function generateStudyPlan(req: PlanRequest): Promise<ProposedSession[]> {
  const { data, error } = await supabase.functions.invoke<{ sessions: ProposedSession[] }>(
    'generate-study-plan',
    { body: req },
  );
  if (!error) return data?.sessions ?? [];

  if (error instanceof FunctionsFetchError) {
    throw new StudyPlanError(
      'Tidak bisa terhubung ke server. Periksa koneksi internetmu, atau pastikan Edge Function generate-study-plan sudah dideploy.',
    );
  }
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as { message?: string } | null;
    throw new StudyPlanError(payload?.message ?? 'Rencana otomatis gagal dibuat. Coba lagi.');
  }
  throw new StudyPlanError('Rencana otomatis gagal dibuat. Coba lagi.');
}
