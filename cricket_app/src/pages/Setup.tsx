/** Shown when no Firebase config is present, instead of a blank or broken app. */
import { Logo } from '../components/Layout';

export default function Setup() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <Logo />
      <h1 className="text-5xl">Almost ready to bat</h1>
      <p className="text-lg text-ink-muted">
        CricketHub can't find its Firebase configuration. Add your project's web config to a <code className="font-semibold text-ink">.env</code> file and
        rebuild.
      </p>
      <ol className="card list-decimal space-y-2 p-5 pl-10 text-ink">
        <li>
          Copy <code>.env.example</code> to <code>.env</code> in the <code>cricket_app</code> folder.
        </li>
        <li>Fill in the values from Firebase console → Project settings → Your apps → Web app.</li>
        <li>
          Run <code>npm run dev</code> (or <code>npm run build</code> to deploy).
        </li>
      </ol>
      <p className="text-ink-muted">
        Just want to try it? Run <code className="font-semibold text-ink">npm run dev:demo</code> to start local emulators with demo data. See the README.
      </p>
    </main>
  );
}
