// Menghapus akun user yang sedang login beserta semua datanya.
// Semua tabel milik user memakai "on delete cascade" ke auth.users, jadi cukup menghapus user auth.
// Foto profil di Storage dihapus manual karena tidak ikut cascade.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { requiredEnv } from '../_shared/google.ts';

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

    const admin = createClient(supabaseUrl, requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Hapus foto profil (folder avatars/<user_id>/). Kegagalan di sini tidak menghentikan penghapusan akun.
    try {
      const { data: files } = await admin.storage.from('avatars').list(user.id, { limit: 100 });
      if (files && files.length > 0) {
        await admin.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
      }
    } catch (e) {
      console.error('Gagal menghapus foto profil', e);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Gagal menghapus akun', deleteError);
      return json({ error: 'delete_failed', message: 'Akun belum bisa dihapus. Coba lagi.' }, 500, origin);
    }
    return json({ ok: true }, 200, origin);
  } catch (e) {
    console.error('delete-account error', e);
    return json({ error: 'internal', message: 'Terjadi kesalahan di server.' }, 500, origin);
  }
});
