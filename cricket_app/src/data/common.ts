/**
 * Shared Firestore helpers for the data layer.
 */
import { addDoc, collection, doc, getDocs, query, serverTimestamp, where, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile, WithId } from '../lib/types';

/** Who is doing something — written into activity, notifications and audit fields. */
export interface Actor {
  uid: string;
  name: string;
}

export function actorOf(profile: Pick<UserProfile, 'uid' | 'displayName'>): Actor {
  return { uid: profile.uid, name: profile.displayName };
}

/** Allocate a document id without writing, so batches can cross-reference new docs. */
export function newId(collectionPath: string): string {
  return doc(collection(db, collectionPath)).id;
}

export const memberId = (teamId: string, uid: string) => `${teamId}_${uid}`;
export const availabilityId = (fixtureId: string, uid: string) => `${fixtureId}_${uid}`;
export const playerStatsId = (fixtureId: string, uid: string) => `${fixtureId}_${uid}`;

/** Attach the document id to its data. */
export function withId<T>(id: string, data: DocumentData): WithId<T> {
  return { ...(data as T), id };
}

/** uids of everyone on a team's roster. */
export async function teamMemberUids(teamId: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'teamMembers'), where('teamId', '==', teamId)));
  return snap.docs.map((d) => d.data().uid as string);
}

/** Append to a team's or tournament's activity log. Never throws: logging must not break the action. */
export async function logActivity(
  scope: 'teams' | 'tournaments',
  id: string,
  actor: Actor,
  message: string,
  link: string | null = null,
): Promise<void> {
  try {
    await addDoc(collection(db, scope, id, 'activity'), {
      actorUid: actor.uid,
      actorName: actor.name,
      message: message.slice(0, 300),
      link,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Activity log write failed', err);
  }
}

/** Split an array into chunks (Firestore `in` queries take at most 30 values). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Turn Firebase error codes into sentences people can act on. */
export function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) return "You don't have permission to do that.";
  if (code.includes('unavailable')) return "You're offline. Changes will sync when you reconnect.";
  if (code.includes('not-found')) return "That item doesn't exist any more.";
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return 'Sign-in was cancelled.';
  if (code.includes('unauthorized-domain'))
    return 'This domain is not authorised for sign-in. Add it under Firebase → Authentication → Settings → Authorized domains.';
  if (code.includes('network-request-failed')) return 'Network problem. Check your connection and try again.';
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}
