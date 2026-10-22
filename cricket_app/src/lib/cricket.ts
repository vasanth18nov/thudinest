/**
 * Cricket arithmetic. Everything is stored as legal balls (integers) so that
 * "4.3 overs" (= 27 balls) never gets mangled by floating point.
 */
import type { InningsScore, ResultWinner, Side } from './types';

export const BALLS_PER_OVER = 6;
export const MAX_WICKETS = 10;

/**
 * Convert cricket overs notation to balls: "4.3" → 27, 20 → 120.
 * Returns NaN for impossible values such as "4.6" or negative numbers.
 */
export function oversToBalls(overs: string | number): number {
  const text = String(overs).trim();
  if (!/^\d+(\.\d)?$/.test(text)) return Number.NaN;
  const [whole, part = '0'] = text.split('.');
  const balls = Number(part);
  if (balls >= BALLS_PER_OVER) return Number.NaN;
  return Number(whole) * BALLS_PER_OVER + balls;
}

/** Convert balls to cricket overs notation: 27 → "4.3", 120 → "20". */
export function ballsToOvers(balls: number): string {
  const whole = Math.floor(balls / BALLS_PER_OVER);
  const rest = balls % BALLS_PER_OVER;
  return rest === 0 ? String(whole) : `${whole}.${rest}`;
}

/** True overs as a decimal, for rate calculations: 27 balls → 4.5. */
export function ballsToDecimalOvers(balls: number): number {
  return balls / BALLS_PER_OVER;
}

/** Runs per 100 balls, or null if no balls faced. */
export function strikeRate(runs: number, balls: number): number | null {
  return balls > 0 ? (runs / balls) * 100 : null;
}

/** Runs conceded per over, or null if no balls bowled. */
export function economy(runsConceded: number, ballsBowled: number): number | null {
  return ballsBowled > 0 ? runsConceded / ballsToDecimalOvers(ballsBowled) : null;
}

/** Runs per dismissal. Null when never dismissed (shown as "–"). */
export function battingAverage(runs: number, dismissals: number): number | null {
  return dismissals > 0 ? runs / dismissals : null;
}

/** Runs per wicket for a bowler. */
export function bowlingAverage(runsConceded: number, wickets: number): number | null {
  return wickets > 0 ? runsConceded / wickets : null;
}

/** "156/7 (20)" or "212 (38.4)" when all out. */
export function formatScore(score: InningsScore | null | undefined): string {
  if (!score) return '–';
  const wkts = score.wickets >= MAX_WICKETS ? `${score.runs}` : `${score.runs}/${score.wickets}`;
  return `${wkts} (${ballsToOvers(score.balls)})`;
}

export function formatDecimal(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? '–' : value.toFixed(digits);
}

export function otherSide(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

/**
 * Work out the winner and the conventional margin text from the two innings.
 *   - Side batting first ahead → "won by N runs"
 *   - Chasing side ahead      → "won by N wickets" (with balls remaining when known)
 *   - Level                   → tie
 */
export function computeMargin(input: {
  battedFirst: Side;
  home: InningsScore;
  away: InningsScore;
  oversLimit: number;
}): { winner: ResultWinner; margin: string } {
  const first = input[input.battedFirst];
  const chasingSide = otherSide(input.battedFirst);
  const second = input[chasingSide];

  if (first.runs === second.runs) return { winner: 'tie', margin: 'Match tied' };

  if (first.runs > second.runs) {
    const runs = first.runs - second.runs;
    return { winner: input.battedFirst, margin: `by ${runs} run${runs === 1 ? '' : 's'}` };
  }

  const wicketsLeft = Math.max(0, MAX_WICKETS - second.wickets);
  const ballsLeft = Math.max(0, input.oversLimit * BALLS_PER_OVER - second.balls);
  const tail = ballsLeft > 0 ? ` (${ballsLeft} ball${ballsLeft === 1 ? '' : 's'} left)` : '';
  return {
    winner: chasingSide,
    margin: `by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}${tail}`,
  };
}

/** A one-line result such as "Strikers won by 23 runs". */
export function resultSummary(
  winner: ResultWinner,
  margin: string,
  names: { home: string; away: string },
  advancing: Side | null = null,
): string {
  if (winner === 'noResult') {
    return advancing ? `No result — ${names[advancing]} go through` : 'No result';
  }
  if (winner === 'tie') {
    return advancing ? `Match tied — ${names[advancing]} won the tie-break` : 'Match tied';
  }
  return `${names[winner]} won ${margin}`.trim();
}
