/**
 * Fixtures, availability (RSVP) and playing XIs.
 *   fixtures/{id}                     public
 *   fixtures/{id}/lineups/{teamId}    playing XI for an in-app team
 *   availability/{fixtureId}_{uid}    one player's RSVP (team members only)
 */
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Fixture, FixtureSide, MatchType, RsvpStatus, Team, WithId } from '../lib/types';
import { availabilityId, logActivity, teamMemberUids, type Actor } from './common';
import { notify } from './notifications';

export function teamSide(team: WithId<Team>): FixtureSide {
  return {
    teamId: team.id,
    ttId: null,
    name: team.name,
    shortName: team.shortName,
    color: team.colors.primary,
    placeholder: null,
  };
}

export function externalSide(name: string): FixtureSide {
  const trimmed = name.trim();
  return {
    teamId: null,
    ttId: null,
    name: trimmed,
    shortName: trimmed.slice(0, 3).toUpperCase(),
    color: null,
    placeholder: null,
  };
}

export interface FixtureInput {
  home: FixtureSide;
  away: FixtureSide;
  startsAt: Date;
  venue: string;
  overs: number;
  matchType: MatchType;
  notes: string;
}

export function fixtureTitle(f: Pick<Fixture, 'home' | 'away'>): string {
  return `${f.home.name || f.home.placeholder || 'TBD'} v ${f.away.name || f.away.placeholder || 'TBD'}`;
}

function whenText(date: Date): string {
  return date.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Everyone on the in-app teams playing in this fixture. */
async function participantsByTeam(teamIds: readonly string[]): Promise<Map<string, string[]>> {
  const entries = await Promise.all(teamIds.map(async (id) => [id, await teamMemberUids(id)] as const));
  return new Map(entries);
}

/** Notify both in-app teams. Errors are logged, not thrown: the fixture itself is saved. */
async function notifyFixture(
  fixtureId: string,
  fixture: Pick<Fixture, 'teamIds' | 'tournamentId'>,
  type: 'fixture_new' | 'fixture_updated' | 'fixture_cancelled',
  title: string,
  body: string,
  actor: Actor,
) {
  try {
    const byTeam = await participantsByTeam(fixture.teamIds);
    await Promise.all(
      [...byTeam].map(([teamId, uids]) =>
        notify(uids, { type, title, body, link: `/fixtures/${fixtureId}`, teamId, fixtureId, tournamentId: fixture.tournamentId }, actor),
      ),
    );
  } catch (err) {
    console.warn('Fixture notifications failed', err);
  }
}

/** Create a team fixture (owned by `ownerTeamId`). */
export async function createFixture(ownerTeamId: string, input: FixtureInput, actor: Actor): Promise<string> {
  const teamIds = [...new Set([input.home.teamId, input.away.teamId].filter((x): x is string => !!x))];
  const data = {
    ownerTeamId,
    tournamentId: null,
    tournamentName: null,
    teamIds,
    home: input.home,
    away: input.away,
    startsAt: Timestamp.fromDate(input.startsAt),
    venue: input.venue.trim(),
    overs: input.overs,
    matchType: input.matchType,
    status: 'scheduled' as const,
    cancelReason: null,
    notes: input.notes.trim(),
    stage: null,
    result: null,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'fixtures'), data);
  const title = fixtureTitle(data);
  await logActivity('teams', ownerTeamId, actor, `${actor.name} scheduled ${title}`, `/fixtures/${ref.id}`);
  await notifyFixture(ref.id, data, 'fixture_new', `New fixture: ${title}`, `${whenText(input.startsAt)} at ${data.venue || 'venue TBC'}. Mark your availability.`, actor);
  return ref.id;
}

/** Edit date, venue, format or notes. Teams are fixed once created. */
export async function updateFixture(
  fixture: WithId<Fixture>,
  patch: { startsAt: Date; venue: string; overs: number; matchType: MatchType; notes: string },
  actor: Actor,
): Promise<void> {
  await updateDoc(doc(db, 'fixtures', fixture.id), {
    startsAt: Timestamp.fromDate(patch.startsAt),
    venue: patch.venue.trim(),
    overs: patch.overs,
    matchType: patch.matchType,
    notes: patch.notes.trim(),
    updatedAt: serverTimestamp(),
  });
  const title = fixtureTitle(fixture);
  await logFixtureActivity(fixture, actor, `${actor.name} updated ${title}`);
  await notifyFixture(fixture.id, fixture, 'fixture_updated', `Fixture updated: ${title}`, `Now ${whenText(patch.startsAt)} at ${patch.venue || 'venue TBC'}.`, actor);
}

export async function cancelFixture(fixture: WithId<Fixture>, reason: string, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'fixtures', fixture.id), {
    status: 'cancelled',
    cancelReason: reason.trim(),
    updatedAt: serverTimestamp(),
  });
  const title = fixtureTitle(fixture);
  await logFixtureActivity(fixture, actor, `${actor.name} cancelled ${title}: ${reason.trim()}`);
  await notifyFixture(fixture.id, fixture, 'fixture_cancelled', `Cancelled: ${title}`, reason.trim(), actor);
}

export async function reinstateFixture(fixture: WithId<Fixture>, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'fixtures', fixture.id), { status: 'scheduled', cancelReason: null, updatedAt: serverTimestamp() });
  await logFixtureActivity(fixture, actor, `${actor.name} reinstated ${fixtureTitle(fixture)}`);
}

async function logFixtureActivity(fixture: WithId<Fixture>, actor: Actor, message: string) {
  const link = `/fixtures/${fixture.id}`;
  if (fixture.tournamentId) await logActivity('tournaments', fixture.tournamentId, actor, message, link);
  if (fixture.ownerTeamId) await logActivity('teams', fixture.ownerTeamId, actor, message, link);
}

/** A player's RSVP for one of their teams in this fixture. */
export function setAvailability(
  fixtureId: string,
  teamId: string,
  player: { uid: string; displayName: string },
  status: RsvpStatus,
) {
  return setDoc(doc(db, 'availability', availabilityId(fixtureId, player.uid)), {
    fixtureId,
    teamId,
    uid: player.uid,
    displayName: player.displayName,
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Save the playing XI for one team and tell the selected players. */
export async function setLineup(fixture: WithId<Fixture>, teamId: string, uids: string[], actor: Actor): Promise<void> {
  await setDoc(doc(db, 'fixtures', fixture.id, 'lineups', teamId), {
    teamId,
    uids,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
  await notify(
    uids,
    {
      type: 'lineup_set',
      title: `You're in the XI: ${fixtureTitle(fixture)}`,
      body: `${whenText(fixture.startsAt.toDate())} at ${fixture.venue || 'venue TBC'}`,
      link: `/fixtures/${fixture.id}`,
      teamId,
      fixtureId: fixture.id,
      tournamentId: fixture.tournamentId,
    },
    actor,
  ).catch((err) => console.warn('Lineup notifications failed', err));
}

/** Nudge players who haven't responded. */
export async function sendRsvpReminder(fixture: WithId<Fixture>, teamId: string, uids: string[], actor: Actor) {
  await notify(
    uids,
    {
      type: 'rsvp_reminder',
      title: `Are you available? ${fixtureTitle(fixture)}`,
      body: `${whenText(fixture.startsAt.toDate())}. Let your captain know.`,
      link: `/fixtures/${fixture.id}`,
      teamId,
      fixtureId: fixture.id,
      tournamentId: fixture.tournamentId,
    },
    actor,
  );
}
