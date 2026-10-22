/**
 * Teams and rosters.
 *   teams/{teamId}                  public team profile
 *   teams/{teamId}/private/invite   { code } for the shareable join link (admins only)
 *   teams/{teamId}/activity/{id}    activity log (members only)
 *   teamMembers/{teamId}_{uid}      roster entry with role
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { initials, searchTokens, ROLE_LABELS } from '../lib/text';
import type { Team, TeamColors, TeamRole, UserProfile, WithId } from '../lib/types';
import { actorOf, logActivity, memberId, newId, type Actor } from './common';

export interface TeamInput {
  name: string;
  shortName: string;
  homeGround: string;
  colors: TeamColors;
  logoDataUrl: string | null;
}

/** 20 random URL-safe characters for the join link. */
export function makeInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_');
}

function rosterEntry(teamId: string, profile: UserProfile, role: TeamRole, via: 'owner' | 'invite' | 'link') {
  return {
    teamId,
    uid: profile.uid,
    role,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    jerseyNumber: profile.jerseyNumber,
    playerRole: profile.playerRole,
    via,
    joinedAt: serverTimestamp(),
  };
}

/** Create a team with the creator as owner, in one atomic batch. */
export async function createTeam(input: TeamInput, owner: UserProfile): Promise<string> {
  const teamId = newId('teams');
  const batch = writeBatch(db);
  batch.set(doc(db, 'teams', teamId), {
    name: input.name.trim(),
    shortName: (input.shortName.trim() || initials(input.name)).toUpperCase(),
    logoDataUrl: input.logoDataUrl,
    homeGround: input.homeGround.trim(),
    colors: input.colors,
    ownerUid: owner.uid,
    searchTokens: searchTokens(input.name, input.shortName),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'teamMembers', memberId(teamId, owner.uid)), rosterEntry(teamId, owner, 'owner', 'owner'));
  batch.set(doc(db, 'teams', teamId, 'private', 'invite'), { code: makeInviteCode(), updatedAt: serverTimestamp() });
  await batch.commit();
  await logActivity('teams', teamId, actorOf(owner), `${owner.displayName} created the team`);
  return teamId;
}

export async function updateTeam(teamId: string, input: TeamInput, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId), {
    name: input.name.trim(),
    shortName: (input.shortName.trim() || initials(input.name)).toUpperCase(),
    logoDataUrl: input.logoDataUrl,
    homeGround: input.homeGround.trim(),
    colors: input.colors,
    searchTokens: searchTokens(input.name, input.shortName),
    updatedAt: serverTimestamp(),
  });
  await logActivity('teams', teamId, actor, `${actor.name} updated the team details`);
}

export async function getInviteCode(teamId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'teams', teamId, 'private', 'invite'));
  return snap.exists() ? (snap.data().code as string) : null;
}

/** Replace the join code; old links stop working. */
export async function resetInviteCode(teamId: string, actor: Actor): Promise<string> {
  const code = makeInviteCode();
  const batch = writeBatch(db);
  batch.set(doc(db, 'teams', teamId, 'private', 'invite'), { code, updatedAt: serverTimestamp() });
  await batch.commit();
  await logActivity('teams', teamId, actor, `${actor.name} reset the invite link`);
  return code;
}

/** Join through a shareable link. The rules check the code against the private invite doc. */
export async function joinWithCode(teamId: string, code: string, profile: UserProfile): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'teamMembers', memberId(teamId, profile.uid)), {
    ...rosterEntry(teamId, profile, 'player', 'link'),
    joinCode: code,
  });
  await batch.commit();
  await logActivity('teams', teamId, actorOf(profile), `${profile.displayName} joined via invite link`);
}

export async function changeRole(teamId: string, uid: string, name: string, role: Exclude<TeamRole, 'owner'>, actor: Actor) {
  await updateDoc(doc(db, 'teamMembers', memberId(teamId, uid)), { role });
  await logActivity('teams', teamId, actor, `${actor.name} made ${name} ${ROLE_LABELS[role].toLowerCase()}`);
}

export async function removeMember(teamId: string, uid: string, name: string, actor: Actor) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'teamMembers', memberId(teamId, uid)));
  await batch.commit();
  await logActivity('teams', teamId, actor, `${actor.name} removed ${name} from the team`);
}

export async function leaveTeam(teamId: string, actor: Actor) {
  // Log first: once the membership is gone the activity log is no longer writable.
  await logActivity('teams', teamId, actor, `${actor.name} left the team`);
  const batch = writeBatch(db);
  batch.delete(doc(db, 'teamMembers', memberId(teamId, actor.uid)));
  await batch.commit();
}

/** Hand the team to another member. The old owner becomes an admin. */
export async function transferOwnership(teamId: string, newOwnerUid: string, newOwnerName: string, actor: Actor) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', teamId), { ownerUid: newOwnerUid, updatedAt: serverTimestamp() });
  batch.update(doc(db, 'teamMembers', memberId(teamId, newOwnerUid)), { role: 'owner' });
  batch.update(doc(db, 'teamMembers', memberId(teamId, actor.uid)), { role: 'admin' });
  await batch.commit();
  await logActivity('teams', teamId, actor, `${actor.name} handed ownership to ${newOwnerName}`);
}

/** Delete a team and its roster. Fixtures and results stay for the opponents' records. */
export async function deleteTeam(teamId: string): Promise<void> {
  const members = await getDocs(query(collection(db, 'teamMembers'), where('teamId', '==', teamId)));
  const batch = writeBatch(db);
  members.docs.forEach((m) => batch.delete(m.ref));
  batch.delete(doc(db, 'teams', teamId, 'private', 'invite'));
  batch.delete(doc(db, 'teams', teamId));
  await batch.commit();
}

export async function getTeam(teamId: string): Promise<WithId<Team> | null> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  return snap.exists() ? { ...(snap.data() as Team), id: snap.id } : null;
}
