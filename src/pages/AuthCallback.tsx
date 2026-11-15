import { Link, Navigate } from 'react-router-dom';
import { FullScreenLoader, ScreenMessage } from '@/components/ScreenMessage';
import { useAuth } from '@/context/AuthContext';

/** Membaca error yang dikirim Supabase lewat query (?error_description=) atau hash (#error_description=). */
function readCallbackError(): string | null {
  const fromSearch = new URLSearchParams(window.location.search);
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return fromSearch.get('error_description') ?? fromHash.get('error_description');
}

/** Tujuan redirect setelah login Google dan verifikasi email. */
export default function AuthCallback() {
  const { session, loading } = useAuth();
  const callbackError = readCallbackError();

  if (callbackError) {
    return (
      <ScreenMessage
        title="Proses masuk gagal"
        actions={
          <Link
            to="/login"
            className="inline-flex h-12 items-center rounded-xl bg-navy-800 px-6 text-[15px] font-bold text-cream-200 shadow-btn hover:bg-navy-900"
          >
            Kembali ke halaman masuk
          </Link>
        }
      >
        <p>
          Tautan tidak valid atau sudah kedaluwarsa. Coba masuk atau daftar sekali lagi.
        </p>
        <p className="break-words text-xs">Detail: {callbackError}</p>
      </ScreenMessage>
    );
  }

  if (loading) return <FullScreenLoader />;
  return <Navigate to={session ? '/' : '/login'} replace />;
}
