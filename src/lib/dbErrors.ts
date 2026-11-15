interface DbErrorLike {
  code?: string;
  message?: string;
}

/** true bila tabel/kolom belum ada (migrasi SQL belum dijalankan). */
export function isMissingTable(error: DbErrorLike): boolean {
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /schema cache|does not exist/i.test(error.message ?? '')
  );
}

export const MIGRATION_HINT =
  'Tabel atau kolom belum ada. Jalankan supabase/migrations/0002_tasks_sessions_google.sql lalu 0003_session_details.sql di SQL Editor Supabase.';
