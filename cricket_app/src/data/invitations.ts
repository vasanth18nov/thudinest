/**
 * Team invitations (invitations/{id}). An invitation is addressed either to a known
 * player (inviteeUid, from search) or to an email address (inviteeEmail). Invitees see
 * pending invitations in their inbox and accept or decline them there.
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, emailEnabled, publicUrl } from '../firebase';
import type { Invitation, Team, UserProfile, WithId } from '../lib/types';
import { actorOf, logActivity, memberId, type Actor } from './common';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string) => EMAIL_RE.test(email.trim());

async function hasPendingInvite(teamId: string, field: 'inviteeUid' | 'inviteeEmail', value: string) {
  const snap = await getDocs(
    query(collection(db, 'invitations'), where('teamId', '==', teamId), where(field, '==', value), where('status', '==', 'pending')),
  );
  return !snap.empty;
}

/** Invite an existing player found through search. */
export async function inviteUser(
  team: WithId<Team>,
  invitee: { uid: string; displayName: string },
  actor: Actor,
): Promise<'sent' | 'already-invited'> {
  if (await hasPendingInvite(team.id, 'inviteeUid', invitee.uid)) return 'already-invited';
  await addDoc(collection(db, 'invitations'), {
    teamId: team.id,
    teamName: team.name,
    inviterUid: actor.uid,
    inviterName: actor.name,
    inviteeUid: invitee.uid,
    inviteeEmail: null,
    inviteeName: invitee.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
    respondedAt: null,
  });
  await logActivity('teams', team.id, actor, `${actor.name} invited ${invitee.displayName}`);
  return 'sent';
}

/**
 * Invite by email address. The invite appears in the person's inbox when they sign in
 * with that Google account. If the email extension is enabled, an email is queued too.
 */
export async function inviteEmail(team: WithId<Team>, email: string, actor: Actor): Promise<'sent' | 'already-invited'> {
  const address = email.trim().toLowerCase();
  if (await hasPendingInvite(team.id, 'inviteeEmail', address)) return 'already-invited';
  const ref = await addDoc(collection(db, 'invitations'), {
    teamId: team.id,
    teamName: team.name,
    inviterUid: actor.uid,
    inviterName: actor.name,
    inviteeUid: null,
    inviteeEmail: address,
    inviteeName: null,
    status: 'pending',
    createdAt: serverTimestamp(),
    respondedAt: null,
  });
  if (emailEnabled) {
    await addDoc(collection(db, 'mail'), {
      to: address,
      template: {
        name: 'team-invite',
        data: { teamName: team.name, inviterName: actor.name, link: publicUrl('/notifications') },
      },
      invitationId: ref.id,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
    }).catch((err) => console.warn('Invite email not queued', err));
  }
  await logActivity('teams', team.id, actor, `${actor.name} invited ${address} by email`);
  return 'sent';
}

/** Accept: create the roster entry and close the invitation atomically. */
export async function acceptInvitation(inv: WithId<Invitation>, profile: UserProfile): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'teamMembers', memberId(inv.teamId, profile.uid)), {
    teamId: inv.teamId,
    uid: profile.uid,
    role: 'player',
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    jerseyNumber: profile.jerseyNumber,
    playerRole: profile.playerRole,
    via: 'invite',
    inviteId: inv.id,
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'invitations', inv.id), {
    status: 'accepted',
    inviteeUid: profile.uid,
    respondedAt: serverTimestamp(),
  });
  await batch.commit();
  await logActivity('teams', inv.teamId, actorOf(profile), `${profile.displayName} accepted the invitation`);
}

export async function declineInvitation(inv: WithId<Invitation>, uid: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', inv.id), { status: 'declined', inviteeUid: uid, respondedAt: serverTimestamp() });
}

export async function revokeInvitation(inv: WithId<Invitation>, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'invitations', inv.id), { status: 'revoked', respondedAt: serverTimestamp() });
  await logActivity('teams', inv.teamId, actor, `${actor.name} withdrew the invitation to ${inv.inviteeName ?? inv.inviteeEmail}`);
}
