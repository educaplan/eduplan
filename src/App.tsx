import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { ScreenMessage } from '@/components/ScreenMessage';
import { isSupabaseConfigured } from '@/lib/supabase';
import { GuestRoute, RequireOnboarded, RequireSession, RootRedirect } from '@/routes/guards';
import AuthCallback from '@/pages/AuthCallback';
import Assistant from '@/pages/Assistant';
import Calendar from '@/pages/Calendar';
import ComingSoon from '@/pages/ComingSoon';
import Dashboard from '@/pages/Dashboard';
import ForgotPassword from '@/pages/ForgotPassword';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import Register from '@/pages/Register';
import Progress from '@/pages/Progress';
import Settings from '@/pages/Settings';
import StudyPlan from '@/pages/StudyPlan';
import ResetPassword from '@/pages/ResetPassword';

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <ScreenMessage title="Konfigurasi Supabase belum diisi">
        <p>
          Salin <code className="font-bold">.env.example</code> menjadi{' '}
          <code className="font-bold">.env</code>, isi{' '}
          <code className="font-bold">VITE_SUPABASE_URL</code> dan{' '}
          <code className="font-bold">VITE_SUPABASE_ANON_KEY</code>, lalu jalankan ulang{' '}
          <code className="font-bold">npm run dev</code>.
        </p>
      </ScreenMessage>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={<RequireSession><Onboarding /></RequireSession>} />

      {/* Halaman utama aplikasi: wajib login dan sudah onboarding, dibungkus sidebar. */}
      <Route element={<RequireOnboarded><AppShell /></RequireOnboarded>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/tasks" element={<ComingSoon title="Tugas" />} />
        <Route path="/study-plan" element={<StudyPlan />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
