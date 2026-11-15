// Operasi Google Calendar untuk user yang sudah terhubung.
// Body JSON: { action: 'list', timeMin, timeMax } | { action: 'create', ... } | { action: 'disconnect' }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import {
  GoogleAuthRevokedError,
  refreshAccessToken,
  requiredEnv,
  revokeToken,
} from '../_shared/google.ts';

const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

interface GoogleEventItem {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401, origin);

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const userClient = createClient(supabaseUrl, requiredEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'unauthorized' }, 401, origin);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'bad_request', message: 'Body harus berupa JSON.' }, 400, origin);
    }

    const admin = createClient(supabaseUrl, requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
    const { data: connection, error: connectionError } = await admin
      .from('google_calendar_connections')
      .select('refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (connectionError) throw connectionError;

    const dropConnection = () =>
      admin.from('google_calendar_connections').delete().eq('user_id', user.id);

    if (body.action === 'disconnect') {
      if (connection) {
        await revokeToken(connection.refresh_token);
        await dropConnection();
      }
      return json({ ok: true }, 200, origin);
    }

    if (!connection) {
      return json(
        { error: 'not_connected', message: 'Google Calendar belum terhubung.' },
        409,
        origin,
      );
    }

    try {
      const accessToken = await refreshAccessToken(connection.refresh_token);
      const authHeaders = { Authorization: `Bearer ${accessToken}` };

      if (body.action === 'list') {
        if (!validDate(body.timeMin) || !validDate(body.timeMax)) {
          return json({ error: 'bad_request', message: 'timeMin dan timeMax tidak valid.' }, 400, origin);
        }
        const params = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          timeMin: new Date(body.timeMin).toISOString(),
          timeMax: new Date(body.timeMax).toISOString(),
          maxResults: '250',
        });
        const res = await fetch(`${EVENTS_URL}?${params}`, { headers: authHeaders });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new GoogleAuthRevokedError();
        if (!res.ok) throw new Error(data?.error?.message ?? `Google Calendar API ${res.status}`);

        const events = ((data.items ?? []) as GoogleEventItem[])
          .filter((e) => e.status !== 'cancelled')
          .map((e) => ({
            id: e.id,
            title: e.summary ?? '(Tanpa judul)',
            start: e.start?.dateTime ?? e.start?.date ?? null,
            end: e.end?.dateTime ?? e.end?.date ?? null,
            allDay: Boolean(e.start?.date),
            location: e.location ?? null,
            htmlLink: e.htmlLink ?? null,
          }));
        return json({ events }, 200, origin);
      }

      if (body.action === 'create') {
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title || title.length > 200) {
          return json({ error: 'bad_request', message: 'Judul wajib diisi (maks. 200 karakter).' }, 400, origin);
        }
        const allDay = body.allDay === true;
        const { start, end } = body;
        const valid = allDay
          ? typeof start === 'string' && typeof end === 'string' && DATE_ONLY.test(start) && DATE_ONLY.test(end)
          : validDate(start) && validDate(end);
        if (!valid) {
          return json({ error: 'bad_request', message: 'Waktu mulai/selesai tidak valid.' }, 400, origin);
        }

        const event = {
          summary: title,
          description: typeof body.description === 'string' ? body.description : undefined,
          start: allDay ? { date: start } : { dateTime: new Date(start as string).toISOString() },
          end: allDay ? { date: end } : { dateTime: new Date(end as string).toISOString() },
          // Penanda bahwa event ini dibuat oleh EduPlan.
          extendedProperties: { private: { eduplan: '1' } },
        };
        const res = await fetch(EVENTS_URL, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new GoogleAuthRevokedError();
        if (!res.ok) throw new Error(data?.error?.message ?? `Google Calendar API ${res.status}`);
        return json({ id: data.id, htmlLink: data.htmlLink ?? null }, 200, origin);
      }

      return json({ error: 'bad_request', message: 'Aksi tidak dikenal.' }, 400, origin);
    } catch (e) {
      if (e instanceof GoogleAuthRevokedError) {
        await dropConnection();
        return json(
          { error: 'reconnect', message: 'Akses Google Calendar berakhir. Hubungkan ulang.' },
          409,
          origin,
        );
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    return json(
      {
        error: 'google_api_error',
        message: e instanceof Error ? e.message : 'Terjadi kesalahan pada Google Calendar.',
      },
      502,
      origin,
    );
  }
});
