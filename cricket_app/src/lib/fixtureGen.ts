/**
 * Tournament fixture generation. Pure functions over team ids, so they are easy to test
 * and the Firestore layer only has to turn the output into documents.
 */
import type { Side } from './types';

export interface Pairing {
  home: string;
  away: string;
  /** 1-based round number */
  round: number;
}

/** Fisher–Yates shuffle (returns a copy). `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Round robin by the circle method. Every team meets every other team once
 * (twice with `double`, with home and away swapped). Odd counts get a bye each round.
 * Returns pairings grouped by round.
 */
export function roundRobin(teamIds: readonly string[], double = false): Pairing[][] {
  if (teamIds.length < 2) return [];
  const slots: (string | null)[] = [...teamIds];
  if (slots.length % 2 === 1) slots.push(null); // bye

  const n = slots.length;
  const rounds: Pairing[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const round: Pairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = slots[i];
      const b = slots[n - 1 - i];
      if (a === null || b === null) continue;
      // Alternate who is "home" so nobody is home every week
      const flip = (r + i) % 2 === 1;
      round.push({ home: flip ? b : a, away: flip ? a : b, round: r + 1 });
    }
    rounds.push(round);
    // Rotate every slot except the first one clockwise
    slots.splice(1, 0, slots.pop()!);
  }

  if (double) {
    const firstLegRounds = rounds.length;
    const returnLegs = rounds.map((round, idx) =>
      round.map((p) => ({ home: p.away, away: p.home, round: firstLegRounds + idx + 1 })),
    );
    rounds.push(...returnLegs);
  }
  return rounds;
}

/** Smallest power of two ≥ n (and at least 2). */
export function bracketSize(n: number): number {
  let size = 2;
  while (size < n) size *= 2;
  return size;
}

/**
 * Standard bracket seed order, so seed 1 and seed 2 can only meet in the final:
 * size 4 → [1, 4, 2, 3]; size 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const next = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, next - seed]);
  }
  return order;
}

export function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semi-final';
  if (fromEnd === 2) return 'Quarter-final';
  return `Round of ${2 ** (fromEnd + 1)}`;
}

export interface BracketMatch {
  /** Stable key such as "R1-M2" (round 1, 2nd match in that round) */
  key: string;
  round: number;
  roundLabel: string;
  /** Position within its round, 1-based, top to bottom */
  position: number;
  /** Team id if already known, otherwise null (decided by an earlier match) */
  home: string | null;
  away: string | null;
  /** Feeder match keys, for "Winner R1-M1" placeholders */
  homeFrom: string | null;
  awayFrom: string | null;
  nextKey: string | null;
  nextSlot: Side | null;
}

/**
 * Single-elimination bracket from teams in seed order (best first).
 * Top seeds get byes when the count is not a power of two: a bye is not a match,
 * the team is placed straight into round 2. Returns playable matches only.
 */
export function knockoutBracket(seededIds: readonly string[]): BracketMatch[] {
  if (seededIds.length < 2) return [];
  const size = bracketSize(seededIds.length);
  const totalRounds = Math.log2(size);
  const order = seedOrder(size);

  // Build the full tree, round by round, including bye "matches".
  type Node = BracketMatch & { bye: boolean; winnerKnown: string | null };
  const rounds: Node[][] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const count = size / 2 ** round;
    const nodes: Node[] = [];
    for (let p = 1; p <= count; p++) {
      nodes.push({
        key: `R${round}-M${p}`,
        round,
        roundLabel: roundLabel(round, totalRounds),
        position: p,
        home: null,
        away: null,
        homeFrom: null,
        awayFrom: null,
        nextKey: round < totalRounds ? `R${round + 1}-M${Math.ceil(p / 2)}` : null,
        nextSlot: round < totalRounds ? (p % 2 === 1 ? 'home' : 'away') : null,
        bye: false,
        winnerKnown: null,
      });
    }
    rounds.push(nodes);
  }

  // Seed round 1
  rounds[0].forEach((node, i) => {
    const homeSeed = order[i * 2];
    const awaySeed = order[i * 2 + 1];
    node.home = seededIds[homeSeed - 1] ?? null;
    node.away = seededIds[awaySeed - 1] ?? null;
    if (node.home === null || node.away === null) {
      node.bye = true;
      node.winnerKnown = node.home ?? node.away;
    }
  });

  // Wire later rounds: known winners (byes) fill slots, otherwise reference the feeder
  for (let r = 1; r < rounds.length; r++) {
    rounds[r].forEach((node, i) => {
      const feederHome = rounds[r - 1][i * 2];
      const feederAway = rounds[r - 1][i * 2 + 1];
      if (feederHome.bye) node.home = feederHome.winnerKnown;
      else node.homeFrom = feederHome.key;
      if (feederAway.bye) node.away = feederAway.winnerKnown;
      else node.awayFrom = feederAway.key;
    });
  }

  return rounds.flat().filter((n) => !n.bye).map(({ bye: _bye, winnerKnown: _w, ...match }) => match);
}

export function groupName(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C…
}

/**
 * Split teams (in seed order) into groups by snake draft so groups are balanced:
 * 8 teams, 2 groups → A: 1,4,5,8  B: 2,3,6,7.
 */
export function splitIntoGroups(seededIds: readonly string[], groupCount: number): string[][] {
  const count = Math.max(1, Math.min(groupCount, Math.floor(seededIds.length / 2) || 1));
  const groups: string[][] = Array.from({ length: count }, () => []);
  seededIds.forEach((id, i) => {
    const lap = Math.floor(i / count);
    const pos = i % count;
    groups[lap % 2 === 0 ? pos : count - 1 - pos].push(id);
  });
  return groups;
}

/**
 * Knockout seeds from final group standings: all group winners first, then all runners-up,
 * and so on. Fed into knockoutBracket this gives A1 v B2 and B1 v A2 for two groups,
 * so teams from the same group cannot meet in the first knockout round.
 */
export function knockoutSeedsFromGroups(standings: readonly (readonly string[])[], qualifiersPerGroup: number): string[] {
  const seeds: string[] = [];
  for (let place = 0; place < qualifiersPerGroup; place++) {
    for (const group of standings) {
      if (group[place]) seeds.push(group[place]);
    }
  }
  return seeds;
}

/** Dates for each round: start, start + gap, start + 2·gap… */
export function scheduleRounds(roundCount: number, start: Date, daysBetweenRounds: number): Date[] {
  return Array.from({ length: roundCount }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * daysBetweenRounds);
    return d;
  });
}
