/**
 * The signed-in player's inbox: pending team invitations (by uid or by email) and
 * notifications. Shared by the nav badge and the notifications page.
 */
import { useMemo } from 'react';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppNotification, Invitation } from '../lib/types';
import { useAuth } from './useAuth';
import { useQueryData } from './useFirestore';

export function useInbox() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const email = user?.email?.toLowerCase() ?? null;

  const byUid = useQueryData<Invitation>(uid ? `inv-uid-${uid}` : null, () =>
    query(collection(db, 'invitations'), where('inviteeUid', '==', uid), where('status', '==', 'pending')),
  );
  const byEmail = useQueryData<Invitation>(email ? `inv-email-${email}` : null, () =>
    query(collection(db, 'invitations'), where('inviteeEmail', '==', email), where('status', '==', 'pending')),
  );
  const notifications = useQueryData<AppNotification>(uid ? `notif-${uid}` : null, () =>
    query(collection(db, 'notifications'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(100)),
  );

  const invitations = useMemo(() => {
    const seen = new Set<string>();
    return [...byUid.data, ...byEmail.data].filter((i) => !seen.has(i.id) && seen.add(i.id));
  }, [byUid.data, byEmail.data]);

  const unread = notifications.data.filter((n) => !n.read).length;

  return {
    invitations,
    notifications: notifications.data,
    loading: byUid.loading || byEmail.loading || notifications.loading,
    error: byUid.error || byEmail.error || notifications.error,
    badge: invitations.length + unread,
  };
}
