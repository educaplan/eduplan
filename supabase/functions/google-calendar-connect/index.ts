// Langkah 1 menghubungkan Google Calendar: mengembalikan URL persetujuan (consent) Google.
// Dipanggil dari browser dengan JWT user (verify_jwt aktif, default).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, isAllowedOrigin, json } from '../_shared/cors.ts';
import { GOOGLE_SCOPES, callbackUrl, requiredEnv, signState } from '../_shared/google.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401, origin);

    const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'unauthorized' }, 401, origin);

    const body = await req.json().catch(() => ({}));
    const appOrigin = typeof body.origin === 'string' ? body.origin.replace(/\/+$/, '') : '';
    if (!isAllowedOrigin(appOrigin)) {
      return json(
        {
          error: 'origin_not_allowed',
          message: 'Alamat aplikasi belum terdaftar di secret APP_ORIGINS.',
        },
        400,
        origin,
      );
    }

    const state = await signState({
      uid: user.id,
      origin: appOrigin,
      exp: Date.now() + 10 * 60 * 1000,
      n: crypto.randomUUID(),
    });

    const params = new URLSearchParams({
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      redirect_uri: callbackUrl(),
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline', // minta refresh token
      prompt: 'consent', // pastikan refresh token selalu dikirim ulang
      include_granted_scopes: 'true',
      state,
    });

    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }, 200, origin);
  } catch (e) {
    console.error(e);
    return json(
      { error: 'server_error', message: e instanceof Error ? e.message : 'Kesalahan server.' },
      500,
      origin,
    );
  }
});
