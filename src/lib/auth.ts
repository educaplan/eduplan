import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/authErrors';

/** Mulai login/daftar dengan Google. Mengembalikan pesan error, atau null bila redirect dimulai. */
export async function signInWithGoogle(): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  return error ? mapAuthError(error) : null;
}
