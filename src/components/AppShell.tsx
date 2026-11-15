import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { ReadinessProvider, useReadiness } from '@/features/readiness/ReadinessContext';
import type { Profile } from '@/types/profile';
import {
  CalendarIcon,
  CapIcon,
  ChartIcon,
  CloseIcon,
  DashboardIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  SparklesIcon,
  TargetIcon,
  TimerIcon,
} from '@/components/icons';

interface NavItem {
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactElement;
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/calendar', label: 'Kalender', icon: CalendarIcon },
  { to: '/study-plan', label: 'Rencana Belajar', icon: TimerIcon },
  { to: '/progress', label: 'Progres', icon: ChartIcon },
  { to: '/assistant', label: 'Asisten AI', icon: SparklesIcon },
  { to: '/settings', label: 'Pengaturan', icon: SettingsIcon },
];

/** Contoh: "SMK · 12 Teknik Komputer dan Jaringan". */
function profileSubtitle(p: Profile | null): string {
  if (!p?.education_level) return 'Pelajar';
  const grade = p.grade ? (p.education_level === 'Kuliah' ? `Semester ${p.grade}` : p.grade) : null;
  const detail = [grade, p.major].filter(Boolean).join(' ');
  return detail ? `${p.education_level} · ${detail}` : p.education_level;
}

function Shell() {
  const { profile, user, signOut } = useAuth();
  const { value: readiness } = useReadiness();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const displayName = profile?.nickname ?? user?.email ?? 'Pelajar';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'P';
  const goal = profile?.academic_goal?.trim();

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Bilah atas (ponsel/tablet) */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-cream-100 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu"
          className="rounded-lg p-1.5 text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
        >
          <MenuIcon size={24} />
        </button>
        <span className="flex items-center gap-2 text-lg font-extrabold text-navy-900">
          <span className="flex rounded-lg bg-navy-800 p-1.5 text-cream-200">
            <CapIcon size={16} />
          </span>
          EduPlan
        </span>
        <span className="w-9" />
      </div>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-navy-900/45 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col gap-1.5 bg-navy-800 px-5 py-7 transition-transform duration-200 lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Menu utama"
      >
        <div className="flex items-center justify-between pb-6 pl-2">
          <div className="flex items-center gap-3">
            <span className="flex rounded-xl bg-cream-200 p-[9px] text-navy-800">
              <CapIcon size={22} />
            </span>
            <span className="text-2xl font-extrabold text-cream-200">EduPlan</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-1 text-cream-200 lg:hidden"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-4 py-[13px] text-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-200/60',
                  isActive
                    ? 'bg-cream-200 font-bold text-navy-900'
                    : 'font-medium text-cream-200/85 hover:bg-royal-600/50',
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {goal ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-royal-600 p-4 text-cream-200">
            <div className="flex items-center gap-2">
              <TargetIcon size={18} className="shrink-0" />
              <p className="line-clamp-2 text-sm font-bold">{goal}</p>
            </div>
            {readiness !== null ? (
              <>
                <div className="h-2 overflow-hidden rounded bg-navy-900">
                  <div className="h-2 rounded bg-cream-200" style={{ width: `${readiness}%` }} />
                </div>
                <p className="text-xs font-medium opacity-85">{readiness}% siap</p>
              </>
            ) : (
              <p className="text-xs font-medium opacity-85">Target akademikmu</p>
            )}
          </div>
        ) : null}

        <div className="flex items-center gap-3 px-2 py-3.5">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-royal-600 text-base font-bold text-cream-200">
              {initial}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-cream-200">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-[10px] font-medium opacity-60">{profileSubtitle(profile)}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Keluar"
            title="Keluar"
            className="shrink-0 rounded-lg p-2 text-cream-200/80 transition hover:bg-royal-600/50 hover:text-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-200/60"
          >
            <LogoutIcon size={18} />
          </button>
        </div>
      </aside>

      <main className="px-4 py-6 sm:px-8 lg:pl-[calc(18rem+3rem)] lg:pr-12 lg:py-9">
        <Outlet />
      </main>
    </div>
  );
}

export default function AppShell() {
  return (
    <ReadinessProvider>
      <Shell />
    </ReadinessProvider>
  );
}
