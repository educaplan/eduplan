// Langkah 2: Google mengarahkan browser ke sini setelah user setuju.
// Fungsi ini HARUS dideploy dengan --no-verify-jwt (browser datang dari Google, tanpa JWT).
// Keamanannya bergantung pada `state` bertanda tangan HMAC yang dibuat di google-calendar-connect.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { isAllowedOrigin } from '../_shared/cors.ts';
import {
  CALENDAR_SCOPE,
  emailFromIdToken,
  exchangeCode,
  requiredEnv,
  verifyState,
} from '../_shared/google.ts';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const payload = await verifyState(url.searchParams.get('state') ?? '');

  if (!payload || !isAllowedOrigin(payload.origin)) {
    return new Response(
      'Permintaan tidak valid atau sudah kedaluwarsa. Tutup tab ini dan coba hubungkan lagi dari EduPlan.',
      { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const back = (status: string) =>
    Response.redirect(`${payload.origin}/calendar?google=${status}`, 302);

  if (url.searchParams.get('error')) return back('denied');
  const code = url.searchParams.get('code');
  if (!code) return back('error');

  try {
    const tokens = await exchangeCode(code);

    // User bisa mencabut centang izin kalender di layar persetujuan Google.
    const granted = (tokens.scope ?? '').split(' ');
    if (!granted.includes(CALENDAR_SCOPE)) return back('denied');
    if (!tokens.refresh_token) return back('error');

    const admin = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    );
    const { error } = await admin.from('google_calendar_connections').upsert(
      {
        user_id: payload.uid,
        google_email: emailFromIdToken(tokens.id_token),
        refresh_token: tokens.refresh_token,
        scope: tokens.scope ?? null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      console.error('Gagal menyimpan koneksi Google Calendar:', error);
      return back('error');
    }
    return back('connected');
  } catch (e) {
    console.error(e);
    return back('error');
  }
});
