import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface GoogleEvent {
  id: string;
  title: string;
  /** ISO datetime, atau "YYYY-MM-DD" untuk event sepanjang hari. */
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
}

export type GoogleCalendarErrorCode = 'not_connected' | 'reconnect' | 'network' | 'unknown';

export class GoogleCalendarError extends Error {
  code: GoogleCalendarErrorCode;
  constructor(code: GoogleCalendarErrorCode, message: string) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.code = code;
  }
}

async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (!error) return data as T;

  if (error instanceof FunctionsFetchError) {
    throw new GoogleCalendarError(
      'network',
      'Tidak bisa terhubung ke server. Periksa koneksi internetmu, atau pastikan Edge Function sudah dideploy.',
    );
  }
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    const code: GoogleCalendarErrorCode =
      payload?.error === 'not_connected' || payload?.error === 'reconnect' ? payload.error : 'unknown';
    throw new GoogleCalendarError(
      code,
      payload?.message ?? 'Terjadi kesalahan pada Google Calendar. Coba lagi.',
    );
  }
  throw new GoogleCalendarError('unknown', 'Terjadi kesalahan pada Google Calendar. Coba lagi.');
}

/** Apakah user sudah menghubungkan Google Calendar (tanpa membuka token apa pun). */
export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const { data, error } = await supabase.rpc('google_calendar_status');
  if (error) throw new GoogleCalendarError('unknown', 'Status Google Calendar belum bisa dimuat.');
  const row = (data as Array<{ connected: boolean; google_email: string | null }> | null)?.[0];
  return { connected: Boolean(row?.connected), email: row?.google_email ?? null };
}

/** Mengalihkan browser ke layar persetujuan Google. Halaman akan berpindah bila berhasil. */
export async function startGoogleCalendarConnect(): Promise<void> {
  const { url } = await invoke<{ url: string }>('google-calendar-connect', {
    origin: window.location.origin,
  });
  window.location.assign(url);
}

export async function listGoogleEvents(timeMin: Date, timeMax: Date): Promise<GoogleEvent[]> {
  const { events } = await invoke<{ events: GoogleEvent[] }>('google-calendar', {
    action: 'list',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  });
  return events;
}

interface CreateEventInput {
  title: string;
  description?: string;
  /** Event berjam: ISO datetime. Event sepanjang hari: "YYYY-MM-DD" (end bersifat eksklusif). */
  start: string;
  end: string;
  allDay?: boolean;
}

export async function createGoogleEvent(
  input: CreateEventInput,
): Promise<{ id: string; htmlLink: string | null }> {
  return invoke('google-calendar', { action: 'create', ...input });
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await invoke('google-calendar', { action: 'disconnect' });
}
