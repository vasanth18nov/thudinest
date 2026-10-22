/**
 * Career and team statistics, derived from per-match records.
 *
 * Career stats are never stored as running totals: each match writes one playerStats
 * document per player, and careers are summed on read. That keeps edits and "undo last
 * result" exact, and lets the security rules tie every stat line to its fixture.
 */
import { battingAverage, bowlingAverage, economy, strikeRate } from './cricket';
import type { BattingLine, BowlingLine, ResultWinner, Side } from './types';

/** The fields of a playerStats document needed for aggregation. */
export interface StatLine {
  batted: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  bowled: boolean;
  ballsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  manOfTheMatch: boolean;
}

export interface CareerStats {
  matches: number;
  innings: number;
  notOuts: number;
  runs: number;
  balls: number;
  highest: number;
  highestNotOut: boolean;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  average: number | null;
  strikeRate: number | null;
  bowlingInnings: number;
  ballsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  best: { wickets: number; runs: number } | null;
  bowlingAverage: number | null;
  economy: number | null;
  playerOfMatch: number;
}

export function aggregateCareer(lines: readonly StatLine[]): CareerStats {
  const s: CareerStats = {
    matches: lines.length,
    innings: 0,
    notOuts: 0,
    runs: 0,
    balls: 0,
    highest: 0,
    highestNotOut: false,
    fours: 0,
    sixes: 0,
    fifties: 0,
    hundreds: 0,
    average: null,
    strikeRate: null,
    bowlingInnings: 0,
    ballsBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    best: null,
    bowlingAverage: null,
    economy: null,
    playerOfMatch: 0,
  };

  for (const l of lines) {
    if (l.manOfTheMatch) s.playerOfMatch += 1;
    if (l.batted) {
      s.innings += 1;
      if (!l.out) s.notOuts += 1;
      s.runs += l.runs;
      s.balls += l.balls;
      s.fours += l.fours;
      s.sixes += l.sixes;
      if (l.runs >= 100) s.hundreds += 1;
      else if (l.runs >= 50) s.fifties += 1;
      if (l.runs > s.highest || (l.runs === s.highest && !l.out)) {
        s.highest = l.runs;
        s.highestNotOut = !l.out;
      }
    }
    if (l.bowled) {
      s.bowlingInnings += 1;
      s.ballsBowled += l.ballsBowled;
      s.maidens += l.maidens;
      s.runsConceded += l.runsConceded;
      s.wickets += l.wickets;
      const better =
        !s.best || l.wickets > s.best.wickets || (l.wickets === s.best.wickets && l.runsConceded < s.best.runs);
      if (better) s.best = { wickets: l.wickets, runs: l.runsConceded };
    }
  }

  s.average = battingAverage(s.runs, s.innings - s.notOuts);
  s.strikeRate = strikeRate(s.runs, s.balls);
  s.bowlingAverage = bowlingAverage(s.runsConceded, s.wickets);
  s.economy = economy(s.runsConceded, s.ballsBowled);
  return s;
}

export interface TeamRecord {
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
}

/** Won/lost/tied/no-result for one team across a set of results. */
export function teamRecord(
  teamId: string,
  results: readonly { homeTeamId: string | null; awayTeamId: string | null; winner: ResultWinner }[],
): TeamRecord {
  const rec: TeamRecord = { played: 0, won: 0, lost: 0, tied: 0, noResult: 0 };
  for (const r of results) {
    const side: Side | null = r.homeTeamId === teamId ? 'home' : r.awayTeamId === teamId ? 'away' : null;
    if (!side) continue;
    rec.played += 1;
    if (r.winner === 'tie') rec.tied += 1;
    else if (r.winner === 'noResult') rec.noResult += 1;
    else if (r.winner === side) rec.won += 1;
    else rec.lost += 1;
  }
  return rec;
}

/** Contribution of each registered player (uid) in a scorecard. */
export interface PlayerContribution extends StatLine {
  uid: string;
  side: Side;
  name: string;
}

/**
 * Merge batting and bowling lines into one record per registered player.
 * Lines without a uid (guests, external players) stay on the scorecard only.
 */
export function contributionsFromScorecard(
  batting: readonly BattingLine[],
  bowling: readonly BowlingLine[],
  manOfTheMatchUid: string | null,
  playedUids: readonly { uid: string; side: Side; name: string }[] = [],
): PlayerContribution[] {
  const byUid = new Map<string, PlayerContribution>();
  const get = (uid: string, side: Side, name: string) => {
    let c = byUid.get(uid);
    if (!c) {
      c = {
        uid,
        side,
        name,
        batted: false,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        bowled: false,
        ballsBowled: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        manOfTheMatch: uid === manOfTheMatchUid,
      };
      byUid.set(uid, c);
    }
    return c;
  };

  // Players in the XI who neither batted nor bowled still get a match played.
  for (const p of playedUids) get(p.uid, p.side, p.name);

  for (const b of batting) {
    if (!b.uid) continue;
    const c = get(b.uid, b.side, b.name);
    c.batted = true;
    c.runs += b.runs;
    c.balls += b.balls;
    c.fours += b.fours;
    c.sixes += b.sixes;
    c.out = !b.notOut;
  }
  for (const b of bowling) {
    if (!b.uid) continue;
    const c = get(b.uid, b.side, b.name);
    c.bowled = true;
    c.ballsBowled += b.balls;
    c.maidens += b.maidens;
    c.runsConceded += b.runs;
    c.wickets += b.wickets;
  }
  if (manOfTheMatchUid && byUid.has(manOfTheMatchUid)) byUid.get(manOfTheMatchUid)!.manOfTheMatch = true;
  return [...byUid.values()];
}
