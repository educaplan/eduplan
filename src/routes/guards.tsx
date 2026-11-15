import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader, ScreenMessage } from '@/components/ScreenMessage';
import { Button } from '@/components/ui/Button';

function ProfileLoadError() {
  const { profileError, refreshProfile, signOut } = useAuth();
  return (
    <ScreenMessage
      title="Profil belum bisa dimuat"
      actions={
        <>
          <Button className="!w-auto px-6" onClick={() => void refreshProfile()}>
            Coba lagi
          </Button>
          <Button variant="secondary" onClick={() => void signOut()}>
            Keluar
          </Button>
        </>
      }
    >
      <p>
        Pastikan file <code className="font-bold">supabase/migrations/0001_init.sql</code> sudah
        dijalankan di SQL Editor Supabase, lalu coba lagi.
      </p>
      {profileError ? (
        <p className="break-words text-xs">Detail: {profileError}</p>
      ) : null}
    </ScreenMessage>
  );
}

/** Halaman untuk tamu (login/register/lupa kata sandi). User yang sudah login diarahkan pergi. */
export function GuestRoute({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;
  return children;
}

/** Wajib login, tetapi boleh belum onboarding (dipakai halaman Onboarding). */
export function RequireSession({ children }: { children: ReactElement }) {
  const { session, profile, profileError, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileError) return <ProfileLoadError />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  return children;
}

/** Wajib login dan sudah onboarding (dipakai halaman utama aplikasi). */
export function RequireOnboarded({ children }: { children: ReactElement }) {
  const { session, profile, profileError, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileError) return <ProfileLoadError />;
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return children;
}

/** Titik masuk "/": arahkan ke tujuan yang tepat sesuai status user. */
export function RootRedirect() {
  const { session, profile, profileError, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileError) return <ProfileLoadError />;
  return <Navigate to={profile?.onboarding_completed ? '/dashboard' : '/onboarding'} replace />;
}
