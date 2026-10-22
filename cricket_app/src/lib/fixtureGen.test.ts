import { describe, expect, it } from 'vitest';
import {
  bracketSize,
  knockoutBracket,
  knockoutSeedsFromGroups,
  roundRobin,
  seedOrder,
  shuffle,
  splitIntoGroups,
} from './fixtureGen';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const pairKey = (a: string, b: string) => [a, b].sort().join('-');

describe('roundRobin', () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 10])('every pair meets exactly once with %i teams', (n) => {
    const rounds = roundRobin(ids(n));
    const all = rounds.flat();
    expect(all).toHaveLength((n * (n - 1)) / 2);
    expect(new Set(all.map((p) => pairKey(p.home, p.away))).size).toBe(all.length);
    expect(rounds).toHaveLength(n % 2 === 0 ? n - 1 : n);
  });

  it('never schedules a team twice in one round', () => {
    for (const round of roundRobin(ids(8))) {
      const teams = round.flatMap((p) => [p.home, p.away]);
      expect(new Set(teams).size).toBe(teams.length);
    }
  });

  it('plays a return leg with home and away swapped when double', () => {
    const rounds = roundRobin(ids(4), true);
    expect(rounds).toHaveLength(6);
    const all = rounds.flat();
    expect(all).toHaveLength(12);
    const directed = new Set(all.map((p) => `${p.home}>${p.away}`));
    expect(directed.size).toBe(12);
    expect(rounds[3][0].round).toBe(4);
  });

  it('returns nothing for fewer than two teams', () => {
    expect(roundRobin(['solo'])).toEqual([]);
  });
});

describe('knockoutBracket', () => {
  it('seeds so the top two can only meet in the final', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(bracketSize(5)).toBe(8);
  });

  it('builds a full bracket for a power of two', () => {
    const matches = knockoutBracket(ids(8));
    expect(matches).toHaveLength(7);
    expect(matches.filter((m) => m.round === 1).map((m) => [m.home, m.away])).toEqual([
      ['t1', 't8'],
      ['t4', 't5'],
      ['t2', 't7'],
      ['t3', 't6'],
    ]);
    const final = matches.find((m) => m.roundLabel === 'Final')!;
    expect(final).toMatchObject({ round: 3, homeFrom: 'R2-M1', awayFrom: 'R2-M2', nextKey: null });
    expect(matches.find((m) => m.key === 'R1-M2')).toMatchObject({ nextKey: 'R2-M1', nextSlot: 'away' });
  });

  it('gives byes to the top seeds when the count is not a power of two', () => {
    const matches = knockoutBracket(ids(6));
    // 6 teams → bracket of 8 → seeds 1 and 2 get byes → 2 first-round matches + 2 semis + final
    expect(matches).toHaveLength(5);
    const semis = matches.filter((m) => m.roundLabel === 'Semi-final');
    expect(semis[0]).toMatchObject({ home: 't1', homeFrom: null, away: null, awayFrom: 'R1-M2' });
    expect(semis[1]).toMatchObject({ home: 't2', awayFrom: 'R1-M4' });
  });

  it('handles two teams as a single final', () => {
    expect(knockoutBracket(['x', 'y'])).toEqual([
      expect.objectContaining({ home: 'x', away: 'y', roundLabel: 'Final', nextKey: null }),
    ]);
  });

  it('labels rounds from the end', () => {
    const labels = new Set(knockoutBracket(ids(16)).map((m) => m.roundLabel));
    expect([...labels]).toEqual(['Round of 16', 'Quarter-final', 'Semi-final', 'Final']);
  });
});

describe('groups', () => {
  it('snake-drafts teams into balanced groups', () => {
    expect(splitIntoGroups(ids(8), 2)).toEqual([
      ['t1', 't4', 't5', 't8'],
      ['t2', 't3', 't6', 't7'],
    ]);
  });

  it('never makes more groups than teams can fill', () => {
    expect(splitIntoGroups(ids(4), 4)).toHaveLength(2);
  });

  it('crosses group winners with runners-up in the knockout', () => {
    const seeds = knockoutSeedsFromGroups(
      [
        ['A1', 'A2', 'A3'],
        ['B1', 'B2', 'B3'],
      ],
      2,
    );
    expect(seeds).toEqual(['A1', 'B1', 'A2', 'B2']);
    const semis = knockoutBracket(seeds).map((m) => [m.home, m.away]);
    expect(semis).toEqual([
      ['A1', 'B2'],
      ['B1', 'A2'],
      [null, null],
    ]);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = ids(10);
    const out = shuffle(input);
    expect(out).toHaveLength(10);
    expect([...out].sort()).toEqual([...input].sort());
    expect(input).toEqual(ids(10));
  });

  it('is deterministic with an injected random source', () => {
    expect(shuffle(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
  });
});
