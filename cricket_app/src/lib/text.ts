/**
 * Small text helpers: search tokens, initials, CSV and display labels.
 */
import type { BowlingStyle, BattingStyle, PlayerRole, RsvpStatus, TeamRole, TournamentFormat } from './types';

const MAX_PREFIX = 15;

/**
 * Lower-cased prefixes of every word, for Firestore `array-contains` search:
 * "Royal Strikers" → ["r","ro","roy","roya","royal","s","st",…].
 * Firestore has no full-text search, and this keeps search free and index-friendly.
 */
export function searchTokens(...texts: (string | null | undefined)[]): string[] {
  const tokens = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      for (let i = 1; i <= Math.min(word.length, MAX_PREFIX); i++) tokens.add(word.slice(0, i));
    }
  }
  return [...tokens].slice(0, 120);
}

/** The single token to query Firestore with: the longest word, cut to the max prefix. */
export function queryToken(query: string): string | null {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return null;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  return longest.slice(0, MAX_PREFIX);
}

/** Every word of the query must prefix-match a word of the name (client-side refinement). */
export function matchesQuery(name: string, query: string): boolean {
  const words = name.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .every((q) => words.some((w) => w.startsWith(q)));
}

/** "Royal Challengers Bangalore" → "RCB", "Strikers" → "STR". */
export function initials(name: string, max = 3): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, max)
    .toUpperCase();
}

/** RFC 4180 CSV: quote fields containing commas, quotes or newlines. */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Neutralise spreadsheet formula injection from user-entered names
    const safe = /^[=+\-@]/.test(s) && !/^[+-]?\d/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  captain: 'Captain',
  viceCaptain: 'Vice-captain',
  player: 'Player',
};

export const PLAYER_ROLE_LABELS: Record<PlayerRole, string> = {
  batter: 'Batter',
  bowler: 'Bowler',
  allRounder: 'All-rounder',
  wicketkeeper: 'Wicketkeeper',
};

export const BATTING_LABELS: Record<BattingStyle, string> = {
  right: 'Right-hand bat',
  left: 'Left-hand bat',
};

export const BOWLING_LABELS: Record<BowlingStyle, string> = {
  none: 'Does not bowl',
  rightFast: 'Right-arm fast',
  rightMedium: 'Right-arm medium',
  leftFast: 'Left-arm fast',
  leftMedium: 'Left-arm medium',
  offSpin: 'Right-arm off-spin',
  legSpin: 'Right-arm leg-spin',
  leftOrthodox: 'Slow left-arm orthodox',
  leftWrist: 'Left-arm wrist spin',
};

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  available: 'Available',
  maybe: 'Maybe',
  unavailable: 'Unavailable',
};

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  league: 'League (round robin)',
  knockout: 'Knockout',
  groups: 'Groups, then knockout',
};

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
