/**
 * App chrome: top bar (desktop nav, theme, account), bottom tab bar on phones,
 * offline banner and the route guards.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Bell, CalendarDays, House, LogIn, LogOut, Monitor, Moon, Search, Sun, Trophy, User, Users, WifiOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useInbox } from '../hooks/useInbox';
import { useOnline, useTheme } from '../hooks/useUi';
import { Avatar, ErrorState, PageLoader } from './ui';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0d3b24" />
        <rect x="9" y="8" width="2.6" height="17" rx="1.3" fill="#f7f4ea" />
        <rect x="14.7" y="8" width="2.6" height="17" rx="1.3" fill="#f7f4ea" />
        <rect x="20.4" y="8" width="2.6" height="17" rx="1.3" fill="#f7f4ea" />
        <rect x="8.5" y="5.6" width="15" height="1.8" rx=".9" fill="#dcc48e" />
        <circle cx="25" cy="24.5" r="4" fill="#b3202a" stroke="#0d3b24" strokeWidth="1.2" />
      </svg>
      <span className="font-display text-2xl font-black uppercase leading-none tracking-wide">
        Cricket<span className="text-accent">Hub</span>
      </span>
    </span>
  );
}

const NAV = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/fixtures', label: 'Fixtures', icon: CalendarDays },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/tournaments', label: 'Cups', longLabel: 'Tournaments', icon: Trophy },
] as const;

function ThemeButton() {
  const { pref, cycle } = useTheme();
  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Monitor;
  const label = pref === 'light' ? 'Light' : pref === 'dark' ? 'Dark' : 'System';
  return (
    <button
      type="button"
      onClick={cycle}
      className="press rounded-xl p-2.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
      aria-label={`Colour scheme: ${label}. Change`}
      title={`Theme: ${label}`}
    >
      <Icon size={20} aria-hidden />
    </button>
  );
}

function AccountMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!profile) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="press rounded-full"
      >
        <Avatar name={profile.displayName} photoURL={profile.photoURL} size={36} />
      </button>
      {open && (
        <div role="menu" className="animate-rise absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
          <p className="truncate px-4 py-2 text-sm font-semibold">{profile.displayName}</p>
          <Link role="menuitem" to="/profile" className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2">
            <User size={16} aria-hidden /> My profile & stats
          </Link>
          <Link role="menuitem" to="/search" className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2">
            <Search size={16} aria-hidden /> Search
          </Link>
          <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-surface-2">
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function InboxLink({ compact, badge }: { compact?: boolean; badge: number }) {
  return (
    <NavLink
      to="/notifications"
      aria-label={`Inbox${badge ? `, ${badge} new` : ''}`}
      className={({ isActive }) =>
        compact
          ? `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold ${isActive ? 'text-accent' : 'text-ink-muted'}`
          : `press relative rounded-xl p-2.5 hover:bg-surface-2 ${isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'}`
      }
    >
      <Bell size={compact ? 22 : 20} aria-hidden />
      {compact && <span>Inbox</span>}
      {badge > 0 && (
        <span className={`absolute ${compact ? 'left-1/2 top-1 ml-1.5' : 'right-1 top-1'} min-w-5 rounded-full bg-leather px-1 text-center text-[0.65rem] font-bold leading-5 text-white`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { status } = useAuth();
  const { badge } = useInbox();
  const online = useOnline();
  const signedIn = status === 'signedIn';

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" aria-label="CricketHub home" className="shrink-0">
            <Logo />
          </Link>
          {signedIn && (
            <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={'end' in n}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 font-display text-lg font-bold uppercase tracking-wide transition-colors ${
                      isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink'
                    }`
                  }
                >
                  {'longLabel' in n ? n.longLabel : n.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-1">
            {signedIn && (
              <Link to="/search" aria-label="Search" className="press hidden rounded-xl p-2.5 text-ink-muted hover:bg-surface-2 hover:text-ink sm:inline-flex">
                <Search size={20} aria-hidden />
              </Link>
            )}
            <ThemeButton />
            {signedIn && (
              <span className="hidden md:inline-flex">
                <InboxLink badge={badge} />
              </span>
            )}
            {signedIn ? (
              <AccountMenu />
            ) : status === 'signedOut' ? (
              <Link to="/signin" className="press ml-1 inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink">
                <LogIn size={16} aria-hidden /> Sign in
              </Link>
            ) : null}
          </div>
        </div>
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-willow px-4 py-1.5 text-sm font-semibold text-pitch-950">
            <WifiOff size={16} aria-hidden /> You're offline — showing the last fixtures and tables you loaded
          </div>
        )}
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 outline-none md:pb-16">
        <Outlet />
      </main>

      {signedIn && (
        <nav
          aria-label="Main"
          className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
          <div className="flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={'end' in n}
                className={({ isActive }) =>
                  `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold ${isActive ? 'text-accent' : 'text-ink-muted'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-accent" aria-hidden />}
                    <n.icon size={22} aria-hidden />
                    <span>{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <InboxLink compact badge={badge} />
          </div>
        </nav>
      )}
      <ScrollRestoration />
    </div>
  );
}

/** Routes for signed-in players only. Sends new players through the welcome form first. */
export function RequireAuth() {
  const { status, profile, error } = useAuth();
  const location = useLocation();
  const here = location.pathname + location.search;

  if (status === 'loading') return <PageLoader label="Warming up…" />;
  if (status === 'signedOut') return <Navigate to={`/signin?next=${encodeURIComponent(here)}`} replace />;
  if (!profile) return <ErrorState title="Profile unavailable" error={error ?? 'We could not load your profile.'} onRetry={() => window.location.reload()} />;
  if (!profile.onboarded && location.pathname !== '/welcome') {
    return <Navigate to={`/welcome?next=${encodeURIComponent(here)}`} replace />;
  }
  return <Outlet />;
}
