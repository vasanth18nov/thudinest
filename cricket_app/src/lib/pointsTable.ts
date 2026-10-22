/**
 * Points table and Net Run Rate (NRR).
 *
 * NRR = (runs scored / overs faced) − (runs conceded / overs bowled), summed over the
 * tournament. Standard ICC conventions apply:
 *   - A side bowled out is treated as having faced its full quota of overs.
 *   - No-result matches give points but do not count towards NRR.
 *   - Tied matches count towards NRR.
 *   - A result entered without scores (e.g. a walkover) gives points but no NRR.
 *
 * Sort order: points, then NRR, then wins, then name.
 */
import { BALLS_PER_OVER, MAX_WICKETS } from './cricket';
import type { InningsScore, PointsRules, ResultWinner } from './types';

export const DEFAULT_POINTS: PointsRules = { win: 2, tie: 1, noResult: 1, loss: 0 };

export interface TableTeam {
  id: string;
  name: string;
  shortName?: string;
  group?: string | null;
}

/** A completed match between two table teams, in the order it was played. */
export interface TableMatch {
  home: string;
  away: string;
  winner: ResultWinner;
  homeScore: InningsScore | null;
  awayScore: InningsScore | null;
  oversLimit: number;
}

export type FormLetter = 'W' | 'L' | 'T' | 'N';

export interface PointsRow {
  teamId: string;
  name: string;
  shortName: string;
  group: string | null;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsFor: number;
  ballsFaced: number;
  runsAgainst: number;
  ballsBowled: number;
  nrr: number;
  /** Most recent last */
  form: FormLetter[];
}

/** Balls that count for NRR: the full quota if bowled out, otherwise the balls actually faced. */
export function nrrBalls(score: InningsScore, oversLimit: number): number {
  if (score.wickets >= MAX_WICKETS && oversLimit > 0) return oversLimit * BALLS_PER_OVER;
  return score.balls;
}

/** NRR from aggregate figures. Zero until the side has both batted and bowled. */
export function netRunRate(runsFor: number, ballsFaced: number, runsAgainst: number, ballsBowled: number): number {
  if (ballsFaced <= 0 || ballsBowled <= 0) return 0;
  const forRate = runsFor / (ballsFaced / BALLS_PER_OVER);
  const againstRate = runsAgainst / (ballsBowled / BALLS_PER_OVER);
  return forRate - againstRate;
}

/** "+1.234", "-0.500", "0.000" */
export function formatNrr(nrr: number): string {
  const rounded = Math.round(nrr * 1000) / 1000;
  if (rounded === 0) return '0.000';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(3)}`;
}

function emptyRow(team: TableTeam): PointsRow {
  return {
    teamId: team.id,
    name: team.name,
    shortName: team.shortName ?? team.name.slice(0, 3).toUpperCase(),
    group: team.group ?? null,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    noResult: 0,
    points: 0,
    runsFor: 0,
    ballsFaced: 0,
    runsAgainst: 0,
    ballsBowled: 0,
    nrr: 0,
    form: [],
  };
}

export function comparePointsRows(a: PointsRow, b: PointsRow): number {
  return b.points - a.points || b.nrr - a.nrr || b.won - a.won || a.name.localeCompare(b.name);
}

/**
 * Build a sorted points table. Matches involving teams not in `teams` are ignored,
 * so the same function serves whole leagues and individual groups.
 */
export function buildPointsTable(
  teams: TableTeam[],
  matches: TableMatch[],
  rules: PointsRules = DEFAULT_POINTS,
): PointsRow[] {
  const rows = new Map(teams.map((t) => [t.id, emptyRow(t)]));

  for (const m of matches) {
    const home = rows.get(m.home);
    const away = rows.get(m.away);
    if (!home || !away || m.home === m.away) continue;

    home.played += 1;
    away.played += 1;

    switch (m.winner) {
      case 'home':
        home.won += 1;
        away.lost += 1;
        home.points += rules.win;
        away.points += rules.loss;
        home.form.push('W');
        away.form.push('L');
        break;
      case 'away':
        away.won += 1;
        home.lost += 1;
        away.points += rules.win;
        home.points += rules.loss;
        away.form.push('W');
        home.form.push('L');
        break;
      case 'tie':
        home.tied += 1;
        away.tied += 1;
        home.points += rules.tie;
        away.points += rules.tie;
        home.form.push('T');
        away.form.push('T');
        break;
      case 'noResult':
        home.noResult += 1;
        away.noResult += 1;
        home.points += rules.noResult;
        away.points += rules.noResult;
        home.form.push('N');
        away.form.push('N');
        break;
    }

    // NRR only for matches with a result on the field and both scores recorded
    if (m.winner !== 'noResult' && m.homeScore && m.awayScore) {
      const homeBalls = nrrBalls(m.homeScore, m.oversLimit);
      const awayBalls = nrrBalls(m.awayScore, m.oversLimit);
      home.runsFor += m.homeScore.runs;
      home.ballsFaced += homeBalls;
      home.runsAgainst += m.awayScore.runs;
      home.ballsBowled += awayBalls;
      away.runsFor += m.awayScore.runs;
      away.ballsFaced += awayBalls;
      away.runsAgainst += m.homeScore.runs;
      away.ballsBowled += homeBalls;
    }
  }

  const result = [...rows.values()];
  for (const row of result) {
    row.nrr = netRunRate(row.runsFor, row.ballsFaced, row.runsAgainst, row.ballsBowled);
    row.form = row.form.slice(-5);
  }
  return result.sort(comparePointsRows);
}
