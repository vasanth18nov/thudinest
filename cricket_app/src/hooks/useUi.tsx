/**
 * Small UI hooks: colour scheme, online status, toasts and document titles.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/* ── Theme ─────────────────────────────────────────────────────────────── */

export type ThemePref = 'light' | 'dark' | 'system';
const THEME_KEY = 'ch-theme';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref);

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#07130d' : '#0d3b24');
    };
    apply();
    media.addEventListener('change', apply);
    try {
      localStorage.setItem(THEME_KEY, pref);
    } catch {
      /* private mode: preference just isn't remembered */
    }
    return () => media.removeEventListener('change', apply);
  }, [pref]);

  const cycle = useCallback(() => setPref((p) => (p === 'system' ? 'light' : p === 'light' ? 'dark' : 'system')), []);
  return { pref, setPref, cycle };
}

/* ── Online status ─────────────────────────────────────────────────────── */

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/* ── Document title ────────────────────────────────────────────────────── */

export function useTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · CricketHub` : 'CricketHub';
  }, [title]);
}

/* ── Toasts ────────────────────────────────────────────────────────────── */

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>(
    (message, tone = 'success', action) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), action ? 8000 : 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Polite live region so screen readers announce outcomes without stealing focus */}
      <div
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`animate-rise pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              t.tone === 'error'
                ? 'bg-leather text-white'
                : t.tone === 'info'
                  ? 'bg-ink text-bg'
                  : 'bg-pitch-800 text-chalk ring-1 ring-pitch-600'
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-md px-2 py-1 font-bold uppercase tracking-wide underline underline-offset-4"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" className="ml-1 opacity-70 hover:opacity-100" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
