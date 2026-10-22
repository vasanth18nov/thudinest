/**
 * Client-side validation. The limits here mirror firestore.rules, so a form that passes
 * validation is also accepted by the server (and the rules still enforce them for anyone
 * bypassing the UI).
 */
import { z } from 'zod';
import { BATTING_STYLES, BOWLING_STYLES, MATCH_TYPES, PLAYER_ROLES, TOURNAMENT_FORMATS } from './types';

export const LIMITS = {
  name: 60,
  shortName: 4,
  ground: 80,
  venue: 120,
  notes: 1000,
  reason: 300,
  entryRules: 2000,
  logoBytes: 150_000,
  maxOvers: 100,
  maxTeams: 64,
} as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour');
const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);

export const profileSchema = z.object({
  displayName: trimmed(2, LIMITS.name, 'Name'),
  playerRole: z.enum(PLAYER_ROLES),
  battingStyle: z.enum(BATTING_STYLES),
  bowlingStyle: z.enum(BOWLING_STYLES),
  jerseyNumber: z.number().int('Whole numbers only').min(0, '0–999').max(999, '0–999').nullable(),
  emailNotifications: z.boolean(),
});

export const teamSchema = z.object({
  name: trimmed(2, LIMITS.name, 'Team name'),
  shortName: z
    .string()
    .trim()
    .max(LIMITS.shortName, 'Up to 4 letters')
    .regex(/^[A-Za-z0-9]*$/, 'Letters and numbers only'),
  homeGround: z.string().trim().max(LIMITS.ground, `Up to ${LIMITS.ground} characters`),
  colors: z.object({ primary: hex, secondary: hex }),
  logoDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Unsupported image')
    .max(LIMITS.logoBytes, 'Logo is too large')
    .nullable(),
});

export const fixtureSchema = z.object({
  opponentName: trimmed(1, LIMITS.name, 'Opponent'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time'),
  venue: z.string().trim().max(LIMITS.venue, `Up to ${LIMITS.venue} characters`),
  overs: z.number().int('Whole overs only').min(1, 'At least 1 over').max(LIMITS.maxOvers, `At most ${LIMITS.maxOvers} overs`),
  matchType: z.enum(MATCH_TYPES),
  notes: z.string().trim().max(LIMITS.notes, `Up to ${LIMITS.notes} characters`),
});

export const tournamentSchema = z
  .object({
    name: trimmed(3, LIMITS.name, 'Tournament name'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick an end date'),
    format: z.enum(TOURNAMENT_FORMATS),
    overs: z.number().int().min(1, 'At least 1 over').max(LIMITS.maxOvers),
    matchType: z.enum(MATCH_TYPES),
    teamCount: z.number().int().min(2, 'At least 2 teams').max(LIMITS.maxTeams, `At most ${LIMITS.maxTeams} teams`),
    entryRules: z.string().trim().max(LIMITS.entryRules),
    venue: z.string().trim().max(LIMITS.venue),
    points: z.object({
      win: z.number().int().min(0).max(10),
      tie: z.number().int().min(0).max(10),
      noResult: z.number().int().min(0).max(10),
      loss: z.number().int().min(0).max(10),
    }),
    groupCount: z.number().int().min(1).max(8),
    qualifiersPerGroup: z.number().int().min(1).max(8),
    doubleRoundRobin: z.boolean(),
  })
  .refine((t) => t.endDate >= t.startDate, { path: ['endDate'], message: 'Ends before it starts' })
  .refine((t) => t.format !== 'groups' || t.groupCount >= 2, { path: ['groupCount'], message: 'At least 2 groups' })
  .refine((t) => t.format !== 'groups' || t.groupCount * 2 <= t.teamCount, {
    path: ['groupCount'],
    message: 'Each group needs at least 2 teams',
  });

/** Flatten zod issues to { field: message } for forms (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Parse "12" → 12, "" → null, "abc" → NaN (so the schema reports it). */
export function numberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  return Number(value);
}
