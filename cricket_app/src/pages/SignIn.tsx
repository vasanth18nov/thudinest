/** Google sign-in. With the local emulators, also offers one-tap demo players. */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Avatar, Button, PageLoader } from '../components/ui';
import { friendlyError } from '../data/common';
import { useEmulators } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useTitle } from '../hooks/useUi';
import { DEMO_PLAYERS } from '../lib/demo';

/** Only allow in-app paths as the post-sign-in destination (no open redirects). */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function SignIn() {
  useTitle('Sign in');
  const { status, signIn, signInAsDemo } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signedIn') navigate(next, { replace: true });
  }, [status, next, navigate]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  };

  if (status === 'loading' && !busy) return <PageLoader />;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6">
      <div className="turf rounded-3xl p-7">
        <p className="eyebrow !text-willow">Welcome</p>
        <h1 className="mt-2 text-6xl text-chalk">Take guard</h1>
        <p className="mt-3 text-chalk/85">Sign in to see your fixtures, mark availability and manage your teams.</p>
      </div>

      <Button size="lg" variant="secondary" onClick={() => run('google', signIn)} loading={busy === 'google'} icon={<GoogleMark />} className="w-full">
        Continue with Google
      </Button>
      {error && (
        <p role="alert" className="rounded-xl bg-leather/10 p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <p className="text-center text-sm text-ink-muted">We only use your name, email and profile photo from Google.</p>

      {useEmulators && (
        <section aria-labelledby="demo-title" className="card p-5">
          <h2 id="demo-title" className="text-2xl">
            Demo players
          </h2>
          <p className="mb-3 text-sm text-ink-muted">Local emulator mode: sign in as a seeded player without Google.</p>
          <ul className="flex flex-col gap-1">
            {DEMO_PLAYERS.map((p) => (
              <li key={p.uid}>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(p.uid, () => signInAsDemo({ sub: p.sub, email: p.email, name: p.name }))}
                  className="press flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2 disabled:opacity-50"
                >
                  <Avatar name={p.name} size={34} />
                  <span className="font-semibold">{p.name}</span>
                  <span className="ml-auto text-xs text-ink-muted">{p.email}</span>
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-4 flex flex-col gap-2 border-t border-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const name = String(form.get('name') || '').trim();
              const email = String(form.get('email') || '').trim().toLowerCase();
              if (!name || !email.includes('@')) return;
              // A stable fake Google id per email, so signing in again returns the same account
              const sub = String([...email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
              run('custom', () => signInAsDemo({ sub, email, name }));
            }}
          >
            <p className="text-sm font-semibold">Or a brand-new test player</p>
            <div className="grid grid-cols-2 gap-2">
              <input name="name" aria-label="Test player name" placeholder="Name" className="rounded-lg border border-line bg-surface px-3 py-2" />
              <input name="email" type="email" aria-label="Test player email" placeholder="email@example.com" className="rounded-lg border border-line bg-surface px-3 py-2" />
            </div>
            <Button type="submit" variant="secondary" size="sm" loading={busy === 'custom'} disabled={!!busy}>
              Sign in as new player
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
