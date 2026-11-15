import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { setWeekStartsOn } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/profile';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** true selama sesi atau profil awal masih dimuat. */
  loading: boolean;
  /** Pesan error bila profil gagal dimuat (mis. migrasi SQL belum dijalankan). */
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 1. Sesi: ambil sesi awal lalu dengarkan perubahan (login, logout, refresh token).
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Jangan memanggil Supabase lain di dalam callback ini (bisa deadlock);
      // profil dimuat di effect terpisah di bawah.
      setSession(nextSession);
      setSessionReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const fetchProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Gagal memuat profil:', error);
      setProfile(null);
      setProfileError(error.message);
      return;
    }
    setProfileError(null);
    const loaded = (data as Profile | null) ?? null;
    // Diatur sebelum setProfile supaya halaman yang langsung dirender memakai awal minggu yang benar.
    setWeekStartsOn(loaded?.week_starts_on === 0 ? 0 : 1);
    setProfile(loaded);
  }, []);

  // 2. Profil: dimuat ulang hanya saat user berganti (bukan saat token di-refresh).
  useEffect(() => {
    if (!sessionReady) return;

    if (!userId) {
      setWeekStartsOn(1);
      setProfile(null);
      setProfileError(null);
      setProfileReady(true);
      return;
    }

    let active = true;
    setProfileReady(false);
    fetchProfile(userId).finally(() => {
      if (active) setProfileReady(true);
    });
    return () => {
      active = false;
    };
  }, [sessionReady, userId, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (userId) await fetchProfile(userId);
  }, [userId, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading: !sessionReady || !profileReady,
      profileError,
      refreshProfile,
      signOut,
    }),
    [session, profile, sessionReady, profileReady, profileError, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>.');
  return ctx;
}
