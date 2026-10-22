import { describe, expect, it } from 'vitest';
import { ballsToOvers, computeMargin, economy, formatScore, oversToBalls, resultSummary, strikeRate } from './cricket';

describe('overs and balls', () => {
  it('converts overs notation to balls', () => {
    expect(oversToBalls('4.3')).toBe(27);
    expect(oversToBalls(20)).toBe(120);
    expect(oversToBalls('0.5')).toBe(5);
  });
  it('rejects impossible overs', () => {
    expect(oversToBalls('4.6')).toBeNaN();
    expect(oversToBalls('-1')).toBeNaN();
    expect(oversToBalls('abc')).toBeNaN();
  });
  it('converts balls back to overs notation', () => {
    expect(ballsToOvers(27)).toBe('4.3');
    expect(ballsToOvers(120)).toBe('20');
    expect(ballsToOvers(0)).toBe('0');
  });
});

describe('rates', () => {
  it('computes strike rate and economy', () => {
    expect(strikeRate(50, 25)).toBe(200);
    expect(strikeRate(10, 0)).toBeNull();
    expect(economy(30, 24)).toBe(7.5);
    expect(economy(5, 0)).toBeNull();
  });
});

describe('computeMargin', () => {
  const s = (runs: number, wickets: number, balls: number) => ({ runs, wickets, balls });
  it('wins by runs when the side batting first is ahead', () => {
    expect(computeMargin({ battedFirst: 'home', home: s(180, 6, 120), away: s(157, 9, 120), oversLimit: 20 })).toEqual({
      winner: 'home',
      margin: 'by 23 runs',
    });
  });
  it('wins by wickets with balls left when chasing', () => {
    expect(computeMargin({ battedFirst: 'away', away: s(140, 8, 120), home: s(141, 4, 112), oversLimit: 20 })).toEqual({
      winner: 'home',
      margin: 'by 6 wickets (8 balls left)',
    });
  });
  it('detects a tie', () => {
    expect(computeMargin({ battedFirst: 'home', home: s(150, 7, 120), away: s(150, 10, 119), oversLimit: 20 }).winner).toBe(
      'tie',
    );
  });
  it('uses singular words for margins of one', () => {
    expect(computeMargin({ battedFirst: 'home', home: s(100, 6, 120), away: s(99, 9, 120), oversLimit: 20 }).margin).toBe(
      'by 1 run',
    );
  });
});

describe('formatting', () => {
  it('formats scores', () => {
    expect(formatScore({ runs: 156, wickets: 7, balls: 120 })).toBe('156/7 (20)');
    expect(formatScore({ runs: 98, wickets: 10, balls: 87 })).toBe('98 (14.3)');
    expect(formatScore(null)).toBe('–');
  });
  it('builds result summaries', () => {
    const names = { home: 'Bulls', away: 'Strikers' };
    expect(resultSummary('home', 'by 5 runs', names)).toBe('Bulls won by 5 runs');
    expect(resultSummary('tie', '', names, 'away')).toBe('Match tied — Strikers won the tie-break');
    expect(resultSummary('noResult', '', names)).toBe('No result');
  });
});
