/**
 * Authentication context: the Firebase user, their player profile and their team
 * memberships (used across the app for permissions).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, useEmulators } from '../firebase';
import { ensureUserProfile } from '../data/users';
import type { TeamMember, TeamRole, UserProfile, WithId } from '../lib/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: User | null;
  profile: WithId<UserProfile> | null;
  memberships: WithId<TeamMember>[];
  /** Error from creating/loading the profile, shown on the welcome screen */
  error: string | null;
  signIn: () => Promise<void>;
  /** Emulator only: sign in as a seeded demo player without a Google popup */
  signInAsDemo: (player: { sub: string; email: string; name: string }) => Promise<void>;
  signOut: () => Promise<void>;
  roleIn: (teamId: string | null | undefined) => TeamRole | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<WithId<UserProfile> | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [memberships, setMemberships] = useState<WithId<TeamMember>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
        if (!u) {
          setProfile(null);
          setMemberships([]);
          setProfileReady(false);
        }
      }),
    [],
  );

  // Create the profile on first sign-in, then keep it live.
  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    setProfileReady(false);
    ensureUserProfile(user)
      .catch((err) => {
        console.error('Profile setup failed', err);
        setError('We could not set up your profile. Check your connection and reload.');
      })
      .finally(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            setProfile(snap.exists() ? ({ ...(snap.data() as UserProfile), id: snap.id }) : null);
            setProfileReady(true);
          },
          (err) => {
            console.error('Profile listener failed', err);
            setProfileReady(true);
          },
        );
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'teamMembers'), where('uid', '==', user.uid)),
      (snap) => setMemberships(snap.docs.map((d) => ({ ...(d.data() as TeamMember), id: d.id }))),
      (err) => console.error('Memberships listener failed', err),
    );
  }, [user]);

  const signIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      // Popups are blocked in some in-app browsers; fall back to a full-page redirect.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  }, []);

  const signInAsDemo = useCallback(async (player: { sub: string; email: string; name: string }) => {
    if (!useEmulators) throw new Error('Demo sign-in only works with the local emulators.');
    // The Auth emulator accepts an unsigned JSON "id token" for federated providers.
    const credential = GoogleAuthProvider.credential(JSON.stringify({ ...player, email_verified: true }));
    await signInWithCredential(auth, credential);
  }, []);

  const signOut = useCallback(() => firebaseSignOut(auth), []);

  const roleIn = useCallback(
    (teamId: string | null | undefined) => (teamId ? memberships.find((m) => m.teamId === teamId)?.role ?? null : null),
    [memberships],
  );

  const status: Status = !authReady ? 'loading' : !user ? 'signedOut' : profileReady ? 'signedIn' : 'loading';

  const value = useMemo(
    () => ({ status, user, profile, memberships, error, signIn, signInAsDemo, signOut, roleIn }),
    [status, user, profile, memberships, error, signIn, signInAsDemo, signOut, roleIn],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Roles allowed to edit team details and the roster. */
export const canAdminTeam = (role: TeamRole | null) => role === 'owner' || role === 'admin';
/** Roles allowed to manage fixtures, RSVPs, playing XIs and results. */
export const canManageMatches = (role: TeamRole | null) =>
  role === 'owner' || role === 'admin' || role === 'captain' || role === 'viceCaptain';
