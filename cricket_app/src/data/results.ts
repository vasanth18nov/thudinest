/**
 * Results, scorecards and per-match player stats.
 *   matchResults/{fixtureId}                    current result + full scorecard
 *   matchResults/{fixtureId}/history/{rev}      earlier versions, for "undo last result"
 *   playerStats/{fixtureId}_{uid}               each registered player's line for the match
 *
 * Saving or undoing a result rewrites all of these, the fixture's summary and (for knockouts)
 * the next round's slot in one atomic batch, so the table and stats can never disagree.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { resultSummary } from '../lib/cricket';
import { contributionsFromScorecard } from '../lib/stats';
import type {
  BattingLine,
  BowlingLine,
  Fixture,
  FixtureSide,
  InningsScore,
  Lineup,
  MatchResult,
  ResultWinner,
  Side,
  WithId,
} from '../lib/types';
import { logActivity, playerStatsId, teamMemberUids, type Actor } from './common';
import { fixtureTitle } from './fixtures';
import { notify } from './notifications';

export interface ResultInput {
  battedFirst: Side;
  winner: ResultWinner;
  advancing: Side | null;
  margin: string;
  innings: { home: InningsScore; away: InningsScore } | null;
  manOfTheMatch: { uid: string | null; name: string } | null;
  batting: BattingLine[];
  bowling: BowlingLine[];
}

/** Who goes through from a knockout match, if decided. */
export function knockoutWinner(r: Pick<MatchResult, 'winner' | 'advancing'>): Side | null {
  if (r.winner === 'home' || r.winner === 'away') return r.winner;
  return r.advancing;
}

function placeholderSide(fixture: Fixture): FixtureSide {
  return {
    teamId: null,
    ttId: null,
    name: '',
    shortName: 'TBD',
    color: null,
    placeholder: `Winner of M${fixture.stage?.matchNo ?? '?'}`,
  };
}

async function loadLineupPlayers(fixture: WithId<Fixture>) {
  const snap = await getDocs(collection(db, 'fixtures', fixture.id, 'lineups'));
  const players: { uid: string; side: Side; name: string }[] = [];
  snap.docs.forEach((d) => {
    const lineup = d.data() as Lineup;
    const side: Side | null =
      fixture.home.teamId === lineup.teamId ? 'home' : fixture.away.teamId === lineup.teamId ? 'away' : null;
    if (side) lineup.uids.forEach((uid) => players.push({ uid, side, name: '' }));
  });
  return players;
}

/**
 * Add the writes that make the stored state match `result` (or "no result yet" when null):
 * the fixture summary, the per-player stat lines and the knockout progression.
 */
async function writeResultState(
  batch: WriteBatch,
  fixture: WithId<Fixture>,
  result: Omit<MatchResult, 'enteredAt'> | null,
) {
  const fixtureRef = doc(db, 'fixtures', fixture.id);

  // Fixture summary
  if (result) {
    batch.update(fixtureRef, {
      status: 'completed',
      result: {
        winner: result.winner,
        advancing: result.advancing,
        summary: resultSummary(result.winner, result.margin, { home: fixture.home.name, away: fixture.away.name }, result.advancing),
        home: result.innings?.home ?? null,
        away: result.innings?.away ?? null,
      },
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(fixtureRef, { status: 'scheduled', result: null, updatedAt: serverTimestamp() });
  }

  // Player stat lines: clear the old set, write the new one
  const existing = await getDocs(query(collection(db, 'playerStats'), where('fixtureId', '==', fixture.id)));
  const lines = result
    ? contributionsFromScorecard(result.batting, result.bowling, result.manOfTheMatch?.uid ?? null, await loadLineupPlayers(fixture))
    : [];
  const keep = new Set(lines.map((l) => playerStatsId(fixture.id, l.uid)));
  existing.docs.forEach((d) => !keep.has(d.id) && batch.delete(d.ref));
  for (const line of lines) {
    const { uid, side, name: _name, ...stats } = line;
    batch.set(doc(db, 'playerStats', playerStatsId(fixture.id, uid)), {
      uid,
      fixtureId: fixture.id,
      teamId: fixture[side].teamId,
      tournamentId: fixture.tournamentId,
      playedAt: fixture.startsAt,
      opponent: fixture[side === 'home' ? 'away' : 'home'].name,
      ...stats,
    });
  }

  // Knockout: put the winner into the next round (or put the placeholder back)
  const next = fixture.stage?.nextMatchId;
  const slot = fixture.stage?.nextSlot;
  if (next && slot) {
    const nextSnap = await getDoc(doc(db, 'fixtures', next));
    if (nextSnap.exists()) {
      const nextFixture = nextSnap.data() as Fixture;
      if (nextFixture.status === 'completed') {
        throw new Error('The next round has already been played. Undo that result first.');
      }
      const through = result ? knockoutWinner(result) : null;
      const side: FixtureSide = through ? { ...fixture[through], placeholder: null } : placeholderSide(fixture);
      const sides = { home: nextFixture.home, away: nextFixture.away, [slot]: side };
      batch.update(nextSnap.ref, {
        [slot]: side,
        teamIds: [...new Set([sides.home.teamId, sides.away.teamId].filter((x): x is string => !!x))],
        updatedAt: serverTimestamp(),
      });
    }
  }
}

async function announce(fixture: WithId<Fixture>, text: string, actor: Actor) {
  const link = `/fixtures/${fixture.id}`;
  if (fixture.tournamentId) await logActivity('tournaments', fixture.tournamentId, actor, text, link);
  if (fixture.ownerTeamId) await logActivity('teams', fixture.ownerTeamId, actor, text, link);
}

/** Save (or correct) a result. Earlier versions are kept so the last entry can be undone. */
export async function saveResult(fixture: WithId<Fixture>, input: ResultInput, actor: Actor): Promise<void> {
  const resultRef = doc(db, 'matchResults', fixture.id);
  const prevSnap = await getDoc(resultRef);
  const prev = prevSnap.exists() ? (prevSnap.data() as MatchResult) : null;

  const result: Omit<MatchResult, 'enteredAt'> = {
    fixtureId: fixture.id,
    tournamentId: fixture.tournamentId,
    ownerTeamId: fixture.ownerTeamId,
    teamIds: fixture.teamIds,
    homeTeamId: fixture.home.teamId,
    awayTeamId: fixture.away.teamId,
    oversLimit: fixture.overs,
    battedFirst: input.battedFirst,
    winner: input.winner,
    advancing: input.advancing,
    margin: input.margin.trim(),
    innings: input.winner === 'noResult' && !input.innings ? null : input.innings,
    manOfTheMatch: input.manOfTheMatch,
    batting: input.batting,
    bowling: input.bowling,
    revision: (prev?.revision ?? 0) + 1,
    enteredBy: actor.uid,
  };

  const batch = writeBatch(db);
  if (prev) batch.set(doc(db, 'matchResults', fixture.id, 'history', String(prev.revision)), prev);
  batch.set(resultRef, { ...result, enteredAt: serverTimestamp() });
  await writeResultState(batch, fixture, result);
  await batch.commit();

  const summary = resultSummary(result.winner, result.margin, { home: fixture.home.name, away: fixture.away.name }, result.advancing);
  const title = fixtureTitle(fixture);
  await announce(fixture, `${actor.name} ${prev ? 'corrected' : 'posted'} the result of ${title}: ${summary}`, actor);

  // Tell both in-app squads
  try {
    for (const teamId of fixture.teamIds) {
      await notify(
        await teamMemberUids(teamId),
        { type: 'result_posted', title: `Result: ${title}`, body: summary, link: `/fixtures/${fixture.id}`, teamId, fixtureId: fixture.id, tournamentId: fixture.tournamentId },
        actor,
      );
    }
  } catch (err) {
    console.warn('Result notifications failed', err);
  }
}

/**
 * Undo the most recent result entry: restore the previous version if there is one,
 * otherwise clear the result and put the fixture back to scheduled.
 */
export async function undoLastResult(fixture: WithId<Fixture>, actor: Actor): Promise<'restored' | 'cleared'> {
  const resultRef = doc(db, 'matchResults', fixture.id);
  const current = await getDoc(resultRef);
  if (!current.exists()) throw new Error('There is no result to undo.');

  const history = await getDocs(query(collection(db, 'matchResults', fixture.id, 'history'), orderBy('revision', 'desc'), limit(1)));
  const previous = history.docs[0];

  const batch = writeBatch(db);
  if (previous) {
    const restored = previous.data() as MatchResult;
    batch.set(resultRef, restored);
    batch.delete(previous.ref);
    await writeResultState(batch, fixture, restored);
  } else {
    batch.delete(resultRef);
    await writeResultState(batch, fixture, null);
  }
  await batch.commit();
  await announce(fixture, `${actor.name} undid the last result entry for ${fixtureTitle(fixture)}`, actor);
  return previous ? 'restored' : 'cleared';
}
