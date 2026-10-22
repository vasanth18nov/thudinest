import { describe, expect, it } from 'vitest';
import { aggregateCareer, contributionsFromScorecard, teamRecord, type StatLine } from './stats';
import { initials, matchesQuery, queryToken, searchTokens, toCsv } from './text';

const line = (l: Partial<StatLine>): StatLine => ({
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
  manOfTheMatch: false,
  ...l,
});

describe('aggregateCareer', () => {
  it('computes batting average over dismissals only', () => {
    const s = aggregateCareer([
      line({ batted: true, runs: 50, balls: 40, out: true }),
      line({ batted: true, runs: 30, balls: 20, out: false }),
      line({ batted: true, runs: 10, balls: 10, out: true }),
      line({}), // in the XI, did not bat
    ]);
    expect(s).toMatchObject({ matches: 4, innings: 3, notOuts: 1, runs: 90, fifties: 1 });
    expect(s.average).toBe(45);
    expect(s.strikeRate).toBeCloseTo(128.571, 2);
  });

  it('has no average when never dismissed', () => {
    expect(aggregateCareer([line({ batted: true, runs: 12, balls: 9 })]).average).toBeNull();
  });

  it('tracks highest score, preferring a not-out on equal runs', () => {
    const s = aggregateCareer([
      line({ batted: true, runs: 77, out: true }),
      line({ batted: true, runs: 77, out: false }),
    ]);
    expect(s).toMatchObject({ highest: 77, highestNotOut: true });
  });

  it('computes bowling economy, average and best figures', () => {
    const s = aggregateCareer([
      line({ bowled: true, ballsBowled: 24, runsConceded: 30, wickets: 2 }),
      line({ bowled: true, ballsBowled: 24, runsConceded: 18, wickets: 2, maidens: 1 }),
      line({ bowled: true, ballsBowled: 18, runsConceded: 40, wickets: 1 }),
    ]);
    expect(s.wickets).toBe(5);
    expect(s.economy).toBeCloseTo(88 / 11, 10);
    expect(s.bowlingAverage).toBeCloseTo(17.6, 10);
    expect(s.best).toEqual({ wickets: 2, runs: 18 });
  });
});

describe('teamRecord', () => {
  it('counts results from the team perspective', () => {
    const rec = teamRecord('x', [
      { homeTeamId: 'x', awayTeamId: null, winner: 'home' },
      { homeTeamId: 'y', awayTeamId: 'x', winner: 'home' },
      { homeTeamId: 'x', awayTeamId: 'y', winner: 'tie' },
      { homeTeamId: 'y', awayTeamId: 'x', winner: 'noResult' },
      { homeTeamId: 'y', awayTeamId: 'z', winner: 'home' },
    ]);
    expect(rec).toEqual({ played: 4, won: 1, lost: 1, tied: 1, noResult: 1 });
  });
});

describe('contributionsFromScorecard', () => {
  it('merges batting and bowling lines per registered player', () => {
    const c = contributionsFromScorecard(
      [
        { side: 'home', uid: 'u1', name: 'Asha', runs: 40, balls: 30, fours: 4, sixes: 1, notOut: false },
        { side: 'home', uid: null, name: 'Guest', runs: 5, balls: 3, fours: 1, sixes: 0, notOut: true },
      ],
      [{ side: 'home', uid: 'u1', name: 'Asha', balls: 24, maidens: 0, runs: 20, wickets: 3 }],
      'u1',
      [{ uid: 'u2', side: 'home', name: 'Ben' }],
    );
    expect(c).toHaveLength(2);
    expect(c.find((x) => x.uid === 'u1')).toMatchObject({ batted: true, out: true, bowled: true, wickets: 3, manOfTheMatch: true });
    expect(c.find((x) => x.uid === 'u2')).toMatchObject({ batted: false, bowled: false });
  });
});

describe('text helpers', () => {
  it('builds word-prefix search tokens', () => {
    const t = searchTokens('Royal Strikers');
    expect(t).toContain('roy');
    expect(t).toContain('strikers');
    expect(t).not.toContain('royal strikers');
  });
  it('picks the longest query word and matches every word client-side', () => {
    expect(queryToken('r strikers')).toBe('strikers');
    expect(matchesQuery('Royal Strikers', 'ro str')).toBe(true);
    expect(matchesQuery('Royal Strikers', 'ro bulls')).toBe(false);
  });
  it('makes initials', () => {
    expect(initials('Royal Challengers Bangalore')).toBe('RCB');
    expect(initials('Strikers')).toBe('STR');
  });
  it('escapes CSV and neutralises formulas', () => {
    expect(toCsv([['a,b', 'say "hi"', 3, null]])).toBe('"a,b","say ""hi""",3,');
    expect(toCsv([['=HYPERLINK("x")', '+0.512', '-3']])).toBe(`"'=HYPERLINK(""x"")",+0.512,-3`);
  });
});
