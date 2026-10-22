/**
 * Tournaments.
 *   tournaments/{id}                public; owner + co-admins (adminUids) can edit
 *   tournaments/{id}/activity/{id}  public activity log
 *   tournamentTeams/{id}            participating teams (in-app or external)
 * Tournament fixtures live in `fixtures` with tournamentId set and a `stage` block.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  knockoutBracket,
  knockoutSeedsFromGroups,
  groupName,
  roundRobin,
  scheduleRounds,
  shuffle,
  splitIntoGroups,
  type Pairing,
} from '../lib/fixtureGen';
import { initials, searchTokens } from '../lib/text';
import type {
  Fixture,
  FixtureSide,
  FixtureStage,
  MatchType,
  PointsRules,
  Team,
  Tournament,
  TournamentFormat,
  TournamentTeam,
  UserProfile,
  WithId,
} from '../lib/types';
import { actorOf, chunk, logActivity, newId, type Actor } from './common';

export interface TournamentInput {
  name: string;
  startDate: string;
  endDate: string;
  format: TournamentFormat;
  overs: number;
  matchType: MatchType;
  teamCount: number;
  entryRules: string;
  venue: string;
  points: PointsRules;
  groupCount: number;
  qualifiersPerGroup: number;
  doubleRoundRobin: boolean;
}

const TEAM_COLORS = ['#146c3c', '#b3202a', '#1d4e89', '#c47e00', '#6b2fa3', '#0f766e', '#9d174d', '#3f3f46'];

export async function createTournament(input: TournamentInput, owner: UserProfile): Promise<string> {
  const ref = await addDoc(collection(db, 'tournaments'), {
    ...input,
    name: input.name.trim(),
    entryRules: input.entryRules.trim(),
    venue: input.venue.trim(),
    searchTokens: searchTokens(input.name),
    ownerUid: owner.uid,
    ownerName: owner.displayName,
    adminUids: [],
    status: 'setup',
    fixturesGenerated: false,
    knockoutGenerated: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logActivity('tournaments', ref.id, actorOf(owner), `${owner.displayName} created the tournament`);
  return ref.id;
}

export async function updateTournament(id: string, input: Partial<TournamentInput> & { status?: Tournament['status'] }, actor: Actor) {
  await updateDoc(doc(db, 'tournaments', id), {
    ...input,
    ...(input.name ? { name: input.name.trim(), searchTokens: searchTokens(input.name) } : {}),
    updatedAt: serverTimestamp(),
  });
  await logActivity('tournaments', id, actor, `${actor.name} updated the tournament settings`);
}

/** Co-admins can edit fixtures and enter results. Only the owner may change this list. */
export async function setCoAdmins(id: string, adminUids: string[], change: string, actor: Actor) {
  await updateDoc(doc(db, 'tournaments', id), { adminUids, updatedAt: serverTimestamp() });
  await logActivity('tournaments', id, actor, change);
}

export async function addTournamentTeam(
  tournament: WithId<Tournament>,
  entry: { team: WithId<Team> } | { externalName: string },
  seed: number,
  actor: Actor,
): Promise<void> {
  const data =
    'team' in entry
      ? {
          teamId: entry.team.id,
          name: entry.team.name,
          shortName: entry.team.shortName,
          color: entry.team.colors.primary,
        }
      : {
          teamId: null,
          name: entry.externalName.trim(),
          shortName: initials(entry.externalName),
          color: TEAM_COLORS[seed % TEAM_COLORS.length],
        };
  await addDoc(collection(db, 'tournamentTeams'), {
    tournamentId: tournament.id,
    ...data,
    group: null,
    seed,
    addedAt: serverTimestamp(),
  });
  await logActivity('tournaments', tournament.id, actor, `${actor.name} added ${data.name}`);
}

export async function removeTournamentTeam(tournamentId: string, team: WithId<TournamentTeam>, actor: Actor) {
  await deleteDoc(doc(db, 'tournamentTeams', team.id));
  await logActivity('tournaments', tournamentId, actor, `${actor.name} removed ${team.name}`);
}

/** Save a new seed order (index = seed). */
export async function reorderTournamentTeams(teams: WithId<TournamentTeam>[]) {
  const batch = writeBatch(db);
  teams.forEach((t, i) => batch.update(doc(db, 'tournamentTeams', t.id), { seed: i + 1 }));
  await batch.commit();
}

function sideOf(t: WithId<TournamentTeam>): FixtureSide {
  return { teamId: t.teamId, ttId: t.id, name: t.name, shortName: t.shortName, color: t.color, placeholder: null };
}

const tbd = (placeholder: string): FixtureSide => ({
  teamId: null,
  ttId: null,
  name: '',
  shortName: 'TBD',
  color: null,
  placeholder,
});

export interface GenerateOptions {
  shuffle: boolean;
  /** Local date and time of the first round */
  firstMatch: Date;
  daysBetweenRounds: number;
}

interface PlannedFixture {
  id: string;
  home: FixtureSide;
  away: FixtureSide;
  startsAt: Date;
  stage: FixtureStage;
}

function fixtureDoc(t: WithId<Tournament>, p: PlannedFixture, actor: Actor) {
  return {
    ownerTeamId: null,
    tournamentId: t.id,
    tournamentName: t.name,
    teamIds: [...new Set([p.home.teamId, p.away.teamId].filter((x): x is string => !!x))],
    home: p.home,
    away: p.away,
    startsAt: Timestamp.fromDate(p.startsAt),
    venue: t.venue,
    overs: t.overs,
    matchType: t.matchType,
    status: 'scheduled',
    cancelReason: null,
    notes: '',
    stage: p.stage,
    result: null,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** Write planned fixtures in batches (each batch is atomic; 400 keeps well under Firestore's 500). */
async function writeFixtures(t: WithId<Tournament>, planned: PlannedFixture[], actor: Actor) {
  for (const part of chunk(planned, 400)) {
    const batch = writeBatch(db);
    part.forEach((p) => batch.set(doc(db, 'fixtures', p.id), fixtureDoc(t, p, actor)));
    await batch.commit();
  }
}

async function tournamentFixtures(tournamentId: string): Promise<WithId<Fixture>[]> {
  const snap = await getDocs(query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId)));
  return snap.docs.map((d) => ({ ...(d.data() as Fixture), id: d.id }));
}

async function deleteFixtures(fixtures: WithId<Fixture>[]) {
  for (const part of chunk(fixtures, 400)) {
    const batch = writeBatch(db);
    part.forEach((f) => batch.delete(doc(db, 'fixtures', f.id)));
    await batch.commit();
  }
}

function planRoundRobin(
  rounds: Pairing[][],
  byId: Map<string, WithId<TournamentTeam>>,
  dates: Date[],
  kind: 'league' | 'group',
  group: string | null,
): PlannedFixture[] {
  return rounds.flatMap((round, r) =>
    round.map((p) => ({
      id: newId('fixtures'),
      home: sideOf(byId.get(p.home)!),
      away: sideOf(byId.get(p.away)!),
      startsAt: dates[r],
      stage: {
        kind,
        group,
        round: p.round,
        roundLabel: group ? `Group ${group} · Round ${p.round}` : `Round ${p.round}`,
        matchNo: 0,
        nextMatchId: null,
        nextSlot: null,
      },
    })),
  );
}

/** Turn bracket matches into fixtures, linking each to the match its winner goes to. */
function planKnockout(
  seeds: string[],
  byId: Map<string, WithId<TournamentTeam>>,
  firstMatch: Date,
  daysBetweenRounds: number,
  firstMatchNo: number,
): PlannedFixture[] {
  const bracket = knockoutBracket(seeds);
  const ids = new Map(bracket.map((m) => [m.key, newId('fixtures')]));
  const numbers = new Map(bracket.map((m, i) => [m.key, firstMatchNo + i]));
  const rounds = Math.max(...bracket.map((m) => m.round));
  const dates = scheduleRounds(rounds, firstMatch, daysBetweenRounds);

  return bracket.map((m) => ({
    id: ids.get(m.key)!,
    home: m.home ? sideOf(byId.get(m.home)!) : tbd(`Winner of M${numbers.get(m.homeFrom!)}`),
    away: m.away ? sideOf(byId.get(m.away)!) : tbd(`Winner of M${numbers.get(m.awayFrom!)}`),
    startsAt: dates[m.round - 1],
    stage: {
      kind: 'knockout',
      group: null,
      round: m.round,
      roundLabel: m.roundLabel,
      matchNo: numbers.get(m.key)!,
      nextMatchId: m.nextKey ? ids.get(m.nextKey)! : null,
      nextSlot: m.nextSlot,
    },
  }));
}

/**
 * Generate the fixtures for the tournament's format. Allowed again (regenerate) only
 * while no results have been entered; the old schedule is deleted first.
 */
export async function generateFixtures(
  t: WithId<Tournament>,
  teams: WithId<TournamentTeam>[],
  opts: GenerateOptions,
  actor: Actor,
): Promise<number> {
  if (teams.length < 2) throw new Error('Add at least two teams first.');
  const existing = await tournamentFixtures(t.id);
  if (existing.some((f) => f.status === 'completed')) {
    throw new Error('Results have been entered, so the schedule can no longer be regenerated.');
  }

  const ordered = opts.shuffle ? shuffle(teams) : [...teams].sort((a, b) => a.seed - b.seed);
  const byId = new Map(teams.map((tt) => [tt.id, tt]));
  const ids = ordered.map((tt) => tt.id);
  let planned: PlannedFixture[] = [];

  if (t.format === 'league') {
    const rounds = roundRobin(ids, t.doubleRoundRobin);
    planned = planRoundRobin(rounds, byId, scheduleRounds(rounds.length, opts.firstMatch, opts.daysBetweenRounds), 'league', null);
  } else if (t.format === 'groups') {
    const groups = splitIntoGroups(ids, t.groupCount);
    const groupBatch = writeBatch(db);
    groups.forEach((g, gi) => g.forEach((ttId) => groupBatch.update(doc(db, 'tournamentTeams', ttId), { group: groupName(gi) })));
    await groupBatch.commit();
    const maxRounds = Math.max(...groups.map((g) => roundRobin(g, t.doubleRoundRobin).length));
    const dates = scheduleRounds(maxRounds, opts.firstMatch, opts.daysBetweenRounds);
    planned = groups.flatMap((g, gi) => planRoundRobin(roundRobin(g, t.doubleRoundRobin), byId, dates, 'group', groupName(gi)));
    // Interleave groups within each round so the schedule reads naturally
    planned.sort((a, b) => a.stage.round - b.stage.round || (a.stage.group ?? '').localeCompare(b.stage.group ?? ''));
  } else {
    planned = planKnockout(ids, byId, opts.firstMatch, opts.daysBetweenRounds, 1);
  }

  if (t.format !== 'knockout') planned.forEach((p, i) => (p.stage.matchNo = i + 1));

  await deleteFixtures(existing);
  await writeFixtures(t, planned, actor);
  await updateDoc(doc(db, 'tournaments', t.id), {
    fixturesGenerated: true,
    knockoutGenerated: t.format === 'knockout',
    status: 'live',
    updatedAt: serverTimestamp(),
  });
  await logActivity(
    'tournaments',
    t.id,
    actor,
    `${actor.name} ${existing.length ? 'regenerated' : 'generated'} ${planned.length} fixtures${opts.shuffle ? ' (shuffled draw)' : ''}`,
  );
  return planned.length;
}

/**
 * Groups → knockout: seed the bracket from the group tables (A1 v B2, B1 v A2, …).
 * `standings` is each group's team ids in table order.
 */
export async function generateKnockoutStage(
  t: WithId<Tournament>,
  teams: WithId<TournamentTeam>[],
  standings: string[][],
  firstMatch: Date,
  daysBetweenRounds: number,
  actor: Actor,
): Promise<number> {
  const existing = await tournamentFixtures(t.id);
  const oldKnockout = existing.filter((f) => f.stage?.kind === 'knockout');
  if (oldKnockout.some((f) => f.status === 'completed')) {
    throw new Error('Knockout results have been entered, so the bracket can no longer be regenerated.');
  }
  const seeds = knockoutSeedsFromGroups(standings, t.qualifiersPerGroup);
  if (seeds.length < 2) throw new Error('Not enough qualifiers for a knockout.');

  const lastNo = Math.max(0, ...existing.filter((f) => f.stage?.kind !== 'knockout').map((f) => f.stage?.matchNo ?? 0));
  const planned = planKnockout(seeds, new Map(teams.map((tt) => [tt.id, tt])), firstMatch, daysBetweenRounds, lastNo + 1);

  await deleteFixtures(oldKnockout);
  await writeFixtures(t, planned, actor);
  await updateDoc(doc(db, 'tournaments', t.id), { knockoutGenerated: true, updatedAt: serverTimestamp() });
  await logActivity('tournaments', t.id, actor, `${actor.name} drew the knockout stage (${seeds.length} teams)`);
  return planned.length;
}

export async function deleteTournament(t: WithId<Tournament>, teams: WithId<TournamentTeam>[]) {
  const fixtures = await tournamentFixtures(t.id);
  if (fixtures.some((f) => f.status === 'completed')) {
    throw new Error('This tournament has results. Mark it completed instead of deleting it.');
  }
  await deleteFixtures(fixtures);
  const batch = writeBatch(db);
  teams.forEach((tt) => batch.delete(doc(db, 'tournamentTeams', tt.id)));
  batch.delete(doc(db, 'tournaments', t.id));
  await batch.commit();
}
