/**
 * Player profiles.
 *   users/{uid}          public profile (signed-in users can read)
 *   userPrivate/{uid}    email + preferences (owner only; also read by the email extension)
 *   userEmails/{email}   { uid } lookup for "invite by email" / search by exact email
 */
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { matchesQuery, queryToken, searchTokens } from '../lib/text';
import type { BattingStyle, BowlingStyle, PlayerRole, TeamMember, UserProfile, WithId } from '../lib/types';
import { withId } from './common';

/** Create the profile documents on first sign-in. Safe to call on every sign-in. */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  const displayName = (user.displayName || user.email?.split('@')[0] || 'New player').slice(0, 60);
  const batch = writeBatch(db);
  batch.set(ref, {
    uid: user.uid,
    displayName,
    photoURL: user.photoURL ?? null,
    battingStyle: 'right',
    bowlingStyle: 'none',
    playerRole: 'batter',
    jerseyNumber: null,
    searchTokens: searchTokens(displayName),
    onboarded: false,
    emailNotifications: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (user.email) {
    const email = user.email.toLowerCase();
    batch.set(doc(db, 'userPrivate', user.uid), { email, createdAt: serverTimestamp() });
    batch.set(doc(db, 'userEmails', email), { uid: user.uid });
  }
  await batch.commit();
}

export interface ProfileInput {
  displayName: string;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  playerRole: PlayerRole;
  jerseyNumber: number | null;
  emailNotifications: boolean;
}

/**
 * Save the profile and copy the fields shown on rosters into every teamMembers doc,
 * so roster pages need one query rather than one read per player.
 */
export async function saveProfile(uid: string, input: ProfileInput, photoURL: string | null): Promise<void> {
  const memberships = await getDocs(query(collection(db, 'teamMembers'), where('uid', '==', uid)));
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), {
    ...input,
    displayName: input.displayName.trim(),
    searchTokens: searchTokens(input.displayName),
    onboarded: true,
    updatedAt: serverTimestamp(),
  });
  const rosterFields: Partial<TeamMember> = {
    displayName: input.displayName.trim(),
    jerseyNumber: input.jerseyNumber,
    playerRole: input.playerRole,
    photoURL,
  };
  memberships.docs.forEach((m) => batch.update(m.ref, rosterFields));
  await batch.commit();
}

export async function getUser(uid: string): Promise<WithId<UserProfile> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? withId<UserProfile>(snap.id, snap.data()) : null;
}

/** Find players by name (word prefixes) or by exact email address. */
export async function searchUsers(text: string, max = 20): Promise<WithId<UserProfile>[]> {
  const q = text.trim();
  if (!q) return [];

  if (q.includes('@')) {
    const lookup = await getDoc(doc(db, 'userEmails', q.toLowerCase()));
    if (!lookup.exists()) return [];
    const user = await getUser(lookup.data().uid as string);
    return user ? [user] : [];
  }

  const token = queryToken(q);
  if (!token) return [];
  const snap = await getDocs(
    query(collection(db, 'users'), where('searchTokens', 'array-contains', token), limit(max)),
  );
  return snap.docs
    .map((d) => withId<UserProfile>(d.id, d.data()))
    .filter((u) => matchesQuery(u.displayName, q));
}
