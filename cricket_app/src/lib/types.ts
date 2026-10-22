/**
 * Domain types shared by the UI, the Firestore data layer and the pure logic modules.
 *
 * Firestore collections (see README → Data model):
 *   users, userPrivate, userEmails, teams (+ /private, /activity), teamMembers, invitations,
 *   fixtures (+ /lineups), availability, matchResults (+ /history), playerStats,
 *   tournaments (+ /activity), tournamentTeams, notifications, mail
 */
import type { Timestamp } from 'firebase/firestore';

export type WithId<T> = T & { id: string };

/* ── Players ────────────────────────────────────────────────────────────── */

export const PLAYER_ROLES = ['batter', 'bowler', 'allRounder', 'wicketkeeper'] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];

export const BATTING_STYLES = ['right', 'left'] as const;
export type BattingStyle = (typeof BATTING_STYLES)[number];

export const BOWLING_STYLES = [
  'none',
  'rightFast',
  'rightMedium',
  'leftFast',
  'leftMedium',
  'offSpin',
  'legSpin',
  'leftOrthodox',
  'leftWrist',
] as const;
export type BowlingStyle = (typeof BOWLING_STYLES)[number];

/** users/{uid} — public profile, readable by any signed-in user. Email lives in userPrivate. */
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  playerRole: PlayerRole;
  jerseyNumber: number | null;
  /** Lower-cased word prefixes, used for array-contains search. */
  searchTokens: string[];
  onboarded: boolean;
  /** Whether this player wants copies of notifications by email (needs the email extension). */
  emailNotifications: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ── Teams ──────────────────────────────────────────────────────────────── */

export const TEAM_ROLES = ['owner', 'admin', 'captain', 'viceCaptain', 'player'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export interface TeamColors {
  primary: string;
  secondary: string;
}

/** teams/{teamId} — public. */
export interface Team {
  name: string;
  shortName: string;
  logoDataUrl: string | null;
  homeGround: string;
  colors: TeamColors;
  ownerUid: string;
  searchTokens: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** teamMembers/{teamId}_{uid} — public roster entry, denormalised for cheap roster reads. */
export interface TeamMember {
  teamId: string;
  uid: string;
  role: TeamRole;
  displayName: string;
  photoURL: string | null;
  jerseyNumber: number | null;
  playerRole: PlayerRole;
  via: 'owner' | 'invite' | 'link';
  inviteId?: string | null;
  joinCode?: string | null;
  joinedAt: Timestamp;
}

/** invitations/{id} — addressed to a known user (inviteeUid) or an email address. */
export interface Invitation {
  teamId: string;
  teamName: string;
  inviterUid: string;
  inviterName: string;
  inviteeUid: string | null;
  inviteeEmail: string | null;
  inviteeName: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdAt: Timestamp;
  respondedAt: Timestamp | null;
}

/* ── Fixtures ───────────────────────────────────────────────────────────── */

export const MATCH_TYPES = ['T20', 'ODI', 'Custom'] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export type Side = 'home' | 'away';

/** One side of a fixture. teamId is set for teams in the app, null for external opponents. */
export interface FixtureSide {
  teamId: string | null;
  /** tournamentTeams doc id, for tournament fixtures */
  ttId: string | null;
  name: string;
  shortName: string;
  color: string | null;
  /** Placeholder text for knockout slots not yet decided, e.g. "Winner M3" */
  placeholder: string | null;
}

export interface FixtureStage {
  kind: 'league' | 'group' | 'knockout';
  group: string | null;
  round: number;
  roundLabel: string;
  matchNo: number;
  /** Knockout progression: the winner goes to this fixture's slot */
  nextMatchId: string | null;
  nextSlot: Side | null;
}

export interface InningsScore {
  runs: number;
  wickets: number;
  /** Legal balls faced. 4.3 overs = 27 balls. */
  balls: number;
}

export type ResultWinner = 'home' | 'away' | 'tie' | 'noResult';

/** Short result copy stored on the fixture so lists never need a second read. */
export interface FixtureResultSummary {
  winner: ResultWinner;
  /** For knockout ties / no results: who goes through */
  advancing: Side | null;
  summary: string;
  home: InningsScore | null;
  away: InningsScore | null;
}

export type FixtureStatus = 'scheduled' | 'cancelled' | 'completed';

/** fixtures/{id} — public. Owned by a team (ownerTeamId) or a tournament (tournamentId). */
export interface Fixture {
  ownerTeamId: string | null;
  tournamentId: string | null;
  tournamentName: string | null;
  teamIds: string[];
  home: FixtureSide;
  away: FixtureSide;
  startsAt: Timestamp;
  venue: string;
  overs: number;
  matchType: MatchType;
  status: FixtureStatus;
  cancelReason: string | null;
  notes: string;
  stage: FixtureStage | null;
  result: FixtureResultSummary | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** fixtures/{id}/lineups/{teamId} — the playing XI picked by that team's captain. */
export interface Lineup {
  teamId: string;
  uids: string[];
  updatedBy: string;
  updatedAt: Timestamp;
}

export const RSVP_STATUSES = ['available', 'maybe', 'unavailable'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

/** availability/{fixtureId}_{uid} */
export interface Availability {
  fixtureId: string;
  teamId: string;
  uid: string;
  displayName: string;
  status: RsvpStatus;
  updatedAt: Timestamp;
}

/* ── Results and stats ──────────────────────────────────────────────────── */

export interface BattingLine {
  side: Side;
  uid: string | null;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOut: boolean;
}

export interface BowlingLine {
  /** The side the bowler plays for */
  side: Side;
  uid: string | null;
  name: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
}

/** matchResults/{fixtureId} */
export interface MatchResult {
  fixtureId: string;
  tournamentId: string | null;
  ownerTeamId: string | null;
  teamIds: string[];
  homeTeamId: string | null;
  awayTeamId: string | null;
  oversLimit: number;
  battedFirst: Side;
  winner: ResultWinner;
  advancing: Side | null;
  margin: string;
  innings: { home: InningsScore; away: InningsScore } | null;
  manOfTheMatch: { uid: string | null; name: string } | null;
  batting: BattingLine[];
  bowling: BowlingLine[];
  revision: number;
  enteredBy: string;
  enteredAt: Timestamp;
}

/** playerStats/{fixtureId}_{uid} — one player's contribution to one match. */
export interface PlayerMatchStats {
  uid: string;
  fixtureId: string;
  teamId: string | null;
  tournamentId: string | null;
  playedAt: Timestamp;
  opponent: string;
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

/* ── Tournaments ────────────────────────────────────────────────────────── */

export const TOURNAMENT_FORMATS = ['league', 'knockout', 'groups'] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export interface PointsRules {
  win: number;
  tie: number;
  noResult: number;
  loss: number;
}

/** tournaments/{id} — public. */
export interface Tournament {
  name: string;
  searchTokens: string[];
  startDate: string;
  endDate: string;
  format: TournamentFormat;
  overs: number;
  matchType: MatchType;
  teamCount: number;
  entryRules: string;
  venue: string;
  ownerUid: string;
  ownerName: string;
  adminUids: string[];
  status: 'setup' | 'live' | 'completed';
  points: PointsRules;
  groupCount: number;
  qualifiersPerGroup: number;
  doubleRoundRobin: boolean;
  fixturesGenerated: boolean;
  knockoutGenerated: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** tournamentTeams/{id} */
export interface TournamentTeam {
  tournamentId: string;
  teamId: string | null;
  name: string;
  shortName: string;
  color: string;
  group: string | null;
  seed: number;
  addedAt: Timestamp;
}

/* ── Notifications and activity ─────────────────────────────────────────── */

export type NotificationType =
  | 'fixture_new'
  | 'fixture_updated'
  | 'fixture_cancelled'
  | 'rsvp_reminder'
  | 'result_posted'
  | 'lineup_set'
  | 'role_changed';

/** notifications/{id} — private to the recipient (uid). */
export interface AppNotification {
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  teamId: string;
  fixtureId: string | null;
  tournamentId: string | null;
  actorUid: string;
  actorName: string;
  read: boolean;
  createdAt: Timestamp;
}

/** teams/{id}/activity/{id} and tournaments/{id}/activity/{id} */
export interface ActivityEntry {
  actorUid: string;
  actorName: string;
  message: string;
  link: string | null;
  createdAt: Timestamp;
}
