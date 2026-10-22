/**
 * In-app notifications (notifications/{id}), with optional email copies queued in `mail`
 * for the "Trigger Email from Firestore" extension when VITE_ENABLE_EMAIL=true.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, emailEnabled, publicUrl } from '../firebase';
import type { NotificationType } from '../lib/types';
import { chunk, type Actor } from './common';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  /** In-app path, e.g. /fixtures/abc */
  link: string;
  /** The team whose members are being notified (security rules check membership) */
  teamId: string;
  fixtureId?: string | null;
  tournamentId?: string | null;
}

/**
 * Send one notification per recipient. Individual writes rather than a batch: one recipient
 * who has just left the team must not block everyone else's notification.
 */
export async function notify(recipientUids: readonly string[], payload: NotificationPayload, actor: Actor): Promise<void> {
  const uids = [...new Set(recipientUids)].filter((u) => u !== actor.uid);
  if (!uids.length) return;

  const results = await Promise.allSettled(
    uids.map(async (uid) => {
      const ref = await addDoc(collection(db, 'notifications'), {
        uid,
        type: payload.type,
        title: payload.title.slice(0, 120),
        body: payload.body.slice(0, 500),
        link: payload.link,
        teamId: payload.teamId,
        fixtureId: payload.fixtureId ?? null,
        tournamentId: payload.tournamentId ?? null,
        actorUid: actor.uid,
        actorName: actor.name,
        read: false,
        createdAt: serverTimestamp(),
      });
      return { uid, notificationId: ref.id };
    }),
  );

  if (emailEnabled) {
    const sent = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    await queueNotificationEmails(sent, payload, actor).catch((err) => console.warn('Email queue failed', err));
  }
}

/** Queue emails for recipients who opted in. The extension resolves uids to addresses server-side. */
async function queueNotificationEmails(
  sent: { uid: string; notificationId: string }[],
  payload: NotificationPayload,
  actor: Actor,
): Promise<void> {
  const optedIn = new Set<string>();
  for (const part of chunk(sent.map((s) => s.uid), 30)) {
    // The users rule requires an explicit limit on queries
    const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', part), limit(30)));
    snap.docs.forEach((d) => d.data().emailNotifications === true && optedIn.add(d.id));
  }
  await Promise.allSettled(
    sent
      .filter((s) => optedIn.has(s.uid))
      .map((s) =>
        addDoc(collection(db, 'mail'), {
          toUids: [s.uid],
          template: {
            name: 'notification',
            data: { title: payload.title, body: payload.body, link: publicUrl(payload.link) },
          },
          notificationId: s.notificationId,
          createdBy: actor.uid,
          createdAt: serverTimestamp(),
        }),
      ),
  );
}

export function markRead(id: string) {
  return updateDoc(doc(db, 'notifications', id), { read: true });
}

export async function markAllRead(ids: readonly string[]) {
  for (const part of chunk(ids, 400)) {
    const batch = writeBatch(db);
    part.forEach((id) => batch.update(doc(db, 'notifications', id), { read: true }));
    await batch.commit();
  }
}

export function deleteNotification(id: string) {
  return deleteDoc(doc(db, 'notifications', id));
}
