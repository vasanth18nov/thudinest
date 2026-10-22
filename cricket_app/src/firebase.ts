/**
 * Firebase initialisation. Config comes from Vite env vars (.env, see .env.example).
 * Only public web config lives here — no admin credentials ever reach the browser.
 */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === 'true';
export const emailEnabled = env.VITE_ENABLE_EMAIL === 'true';

/** True when a real project (or the emulators) is configured; otherwise the app shows setup help. */
export const firebaseConfigured = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);

export const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'missing',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-crickethub',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);

/**
 * Firestore with an IndexedDB cache shared across tabs, so the last loaded fixtures,
 * teams and tables are still there when the phone is offline at the ground.
 */
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: typeof indexedDB === 'undefined'
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
}

/** Public origin + base path, for links people share outside the app. */
export function publicUrl(path: string): string {
  const origin = (env.VITE_PUBLIC_ORIGIN || window.location.origin).replace(/\/$/, '');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${origin}${base}${path.startsWith('/') ? path : `/${path}`}`;
}
