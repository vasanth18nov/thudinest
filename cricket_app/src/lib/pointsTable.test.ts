import { describe, expect, it } from 'vitest';
import { buildPointsTable, formatNrr, netRunRate, nrrBalls, type TableMatch, type TableTeam } from './pointsTable';

const score = (runs: number, wickets: number, balls: number) => ({ runs, wickets, balls });
const teams: TableTeam[] = [
  { id: 'a', name: 'Avengers' },
  { id: 'b', name: 'Bulls' },
  { id: 'c', name: 'Chargers' },
];
const match = (m: Partial<TableMatch> & Pick<TableMatch, 'home' | 'away' | 'winner'>): TableMatch => ({
  homeScore: null,
  awayScore: null,
  oversLimit: 20,
  ...m,
});

describe('netRunRate', () => {
  it('is runs-per-over scored minus runs-per-over conceded', () => {
    // 180 in 20 overs (9.0) vs 170 in 20 overs (8.5)
    expect(netRunRate(180, 120, 170, 120)).toBeCloseTo(0.5, 10);
    expect(netRunRate(170, 120, 180, 120)).toBeCloseTo(-0.5, 10);
  });

  it('uses true overs for partial overs (4.3 overs = 4.5 overs)', () => {
    // 45 off 27 balls = 10 rpo; 40 off 30 balls = 8 rpo
    expect(netRunRate(45, 27, 40, 30)).toBeCloseTo(2, 10);
  });

  it('is zero before a side has both batted and bowled', () => {
    expect(netRunRate(0, 0, 0, 0)).toBe(0);
    expect(netRunRate(100, 60, 0, 0)).toBe(0);
  });
});

describe('nrrBalls', () => {
  it('counts the full quota when bowled out', () => {
    expect(nrrBalls(score(98, 10, 87), 20)).toBe(120);
  });
  it('counts balls actually faced otherwise', () => {
    expect(nrrBalls(score(151, 3, 108), 20)).toBe(108);
  });
});

describe('formatNrr', () => {
  it('signs and rounds to three places', () => {
    expect(formatNrr(0.5)).toBe('+0.500');
    expect(formatNrr(-0.46875)).toBe('-0.469');
    expect(formatNrr(0)).toBe('0.000');
    expect(formatNrr(-0.0001)).toBe('0.000');
  });
});

describe('buildPointsTable', () => {
  it('awards points for wins, ties, no results and losses', () => {
    const table = buildPointsTable(teams, [
      match({ home: 'a', away: 'b', winner: 'home' }),
      match({ home: 'b', away: 'c', winner: 'tie' }),
      match({ home: 'c', away: 'a', winner: 'noResult' }),
    ]);
    const row = (id: string) => table.find((r) => r.teamId === id)!;
    expect(row('a')).toMatchObject({ played: 2, won: 1, lost: 0, noResult: 1, points: 3 });
    expect(row('b')).toMatchObject({ played: 2, won: 0, lost: 1, tied: 1, points: 1 });
    expect(row('c')).toMatchObject({ played: 2, tied: 1, noResult: 1, points: 2 });
    expect(table.map((r) => r.teamId)).toEqual(['a', 'c', 'b']);
  });

  it('supports custom points rules', () => {
    const table = buildPointsTable(teams, [match({ home: 'a', away: 'b', winner: 'away' })], {
      win: 4,
      tie: 2,
      noResult: 2,
      loss: 1,
    });
    expect(table[0]).toMatchObject({ teamId: 'b', points: 4 });
    expect(table.find((r) => r.teamId === 'a')!.points).toBe(1);
  });

  it('computes NRR with the all-out rule', () => {
    // a bowled out for 150 in 15 overs; b chase 151/3 in 18 overs
    const table = buildPointsTable(teams, [
      match({ home: 'a', away: 'b', winner: 'away', homeScore: score(150, 10, 90), awayScore: score(151, 3, 108) }),
    ]);
    const a = table.find((r) => r.teamId === 'a')!;
    const b = table.find((r) => r.teamId === 'b')!;
    expect(a.ballsFaced).toBe(120); // all out → full 20 overs
    expect(a.ballsBowled).toBe(108);
    expect(a.nrr).toBeCloseTo(150 / 20 - 151 / 18, 10);
    expect(b.nrr).toBeCloseTo(151 / 18 - 150 / 20, 10);
    expect(a.nrr + b.nrr).toBeCloseTo(0, 10);
  });

  it('aggregates NRR over the tournament rather than averaging per match', () => {
    const table = buildPointsTable(teams, [
      // a: 200/4 (20) beat c: 150 all out (17)
      match({ home: 'a', away: 'c', winner: 'home', homeScore: score(200, 4, 120), awayScore: score(150, 10, 102) }),
      // a: 120/9 (20) lost to b: 121/2 (12)
      match({ home: 'a', away: 'b', winner: 'away', homeScore: score(120, 9, 120), awayScore: score(121, 2, 72) }),
    ]);
    const a = table.find((r) => r.teamId === 'a')!;
    // for: 320 runs / 40 overs = 8.0; against: (150 + 121) / (20 + 12) overs = 8.46875
    expect(a.runsFor).toBe(320);
    expect(a.ballsFaced).toBe(240);
    expect(a.runsAgainst).toBe(271);
    expect(a.ballsBowled).toBe(192);
    expect(a.nrr).toBeCloseTo(8 - 8.46875, 10);
    expect(formatNrr(a.nrr)).toBe('-0.469');
  });

  it('excludes no-result matches and matches without scores from NRR', () => {
    const table = buildPointsTable(teams, [
      match({ home: 'a', away: 'b', winner: 'noResult', homeScore: score(80, 2, 60), awayScore: score(0, 0, 0) }),
      match({ home: 'a', away: 'c', winner: 'home' }), // walkover, no scores
    ]);
    const a = table.find((r) => r.teamId === 'a')!;
    expect(a.points).toBe(3);
    expect(a.ballsFaced).toBe(0);
    expect(a.nrr).toBe(0);
  });

  it('includes tied matches in NRR', () => {
    const table = buildPointsTable(teams, [
      match({ home: 'a', away: 'b', winner: 'tie', homeScore: score(160, 6, 120), awayScore: score(160, 10, 114) }),
    ]);
    const a = table.find((r) => r.teamId === 'a')!;
    // b were bowled out, so their innings counts as 20 overs → both rates are 8.0
    expect(a.nrr).toBeCloseTo(0, 10);
    expect(a.ballsBowled).toBe(120);
  });

  it('breaks points ties on NRR, then wins, then name', () => {
    const table = buildPointsTable(
      [...teams, { id: 'd', name: 'Dragons' }],
      [
        match({ home: 'a', away: 'b', winner: 'home', homeScore: score(150, 5, 120), awayScore: score(149, 8, 120) }),
        match({ home: 'c', away: 'd', winner: 'home', homeScore: score(200, 5, 120), awayScore: score(100, 10, 90) }),
      ],
    );
    expect(table.map((r) => r.teamId)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('ignores matches involving teams outside the table (e.g. another group)', () => {
    const table = buildPointsTable(teams.slice(0, 2), [match({ home: 'a', away: 'c', winner: 'home' })]);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });

  it('keeps the last five results as form, most recent last', () => {
    const results = ['home', 'away', 'home', 'tie', 'home', 'noResult'] as const;
    const table = buildPointsTable(
      teams,
      results.map((winner) => match({ home: 'a', away: 'b', winner })),
    );
    expect(table.find((r) => r.teamId === 'a')!.form).toEqual(['L', 'W', 'T', 'W', 'N']);
  });
});
