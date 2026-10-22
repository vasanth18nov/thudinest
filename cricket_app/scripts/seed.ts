/**
 * Seed demo data: players, two teams with rosters, fixtures with RSVPs and scorecards,
 * a league (with a live points table) and a knockout cup, plus the email templates.
 *
 *   Emulators (default):  npm run dev:demo          (runs this automatically)
 *                         npm run seed               (with emulators already running)
 *   Real project:         GOOGLE_APPLICATION_CREDENTIALS=service-account.json \
 *                         npm run seed -- --prod --owner=<your uid>
 *
 * The Admin SDK bypasses security rules, so this only ever runs from your machine.
 * Never ship service-account keys to the browser or commit them (see .gitignore).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { computeMargin, resultSummary } from '../src/lib/cricket';
import { knockoutBracket, roundRobin } from '../src/lib/fixtureGen';
import { contributionsFromScorecard } from '../src/lib/stats';
import { initials, searchTokens } from '../src/lib/text';
import { DEMO_PLAYERS } from '../src/lib/demo';
import type { BattingLine, BowlingLine, FixtureSide, InningsScore, Side } from '../src/lib/types';

const args = new Map<string, string>(
  process.argv.slice(2).map((a) => {
    const [key, value = ''] = a.replace(/^--/, '').split('=');
    return [key, value];
  }),
);
const prod = args.has('prod');
const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!prod && !usingEmulator) {
  console.error('No emulator detected. Start the emulators (npm run emulators) or pass --prod to seed a real project.');
  process.exit(1);
}
if (prod && usingEmulator) {
  console.error('--prod given but FIRESTORE_EMULATOR_HOST is set. Unset it to seed a real project.');
  process.exit(1);
}

const app = initializeApp(prod ? { credential: applicationDefault() } : { projectId: process.env.GCLOUD_PROJECT || 'demo-crickethub' });
const db: Firestore = getFirestore(app);
const now = Timestamp.now();

// Deterministic pseudo-random numbers so every seed run produces the same scores
let rngState = 20261022;
const rand = () => ((rngState = (rngState * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const days = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return Timestamp.fromDate(d);
};
const isoDay = (n: number) => days(n).toDate().toISOString().slice(0, 10);

/* ── Players ───────────────────────────────────────────────────────────── */

async function seedPlayers(ownerUid: string | null) {
  if (!prod) {
    // Auth emulator accounts linked to a Google identity, so demo sign-in maps onto these uids
    await getAuth(app)
      .importUsers(
        DEMO_PLAYERS.map((p) => ({
          uid: p.uid,
          email: p.email,
          emailVerified: true,
          displayName: p.name,
          providerData: [{ uid: p.sub, providerId: 'google.com', email: p.email, displayName: p.name }],
        })),
      )
      .then((r) => r.errors.forEach((e) => console.warn('auth import:', e.error.message)));
  }
  const batch = db.batch();
  for (const p of DEMO_PLAYERS) {
    batch.set(db.doc(`users/${p.uid}`), {
      uid: p.uid,
      displayName: p.name,
      photoURL: null,
      battingStyle: p.batting,
      bowlingStyle: p.bowling,
      playerRole: p.role,
      jerseyNumber: p.jersey,
      searchTokens: searchTokens(p.name),
      onboarded: true,
      emailNotifications: false,
      createdAt: now,
      updatedAt: now,
    });
    if (!prod) {
      batch.set(db.doc(`userPrivate/${p.uid}`), { email: p.email, createdAt: now });
      batch.set(db.doc(`userEmails/${p.email}`), { uid: p.uid });
    }
  }
  await batch.commit();
  console.log(`✓ ${DEMO_PLAYERS.length} players`);
  return ownerUid;
}

/* ── Teams ─────────────────────────────────────────────────────────────── */

interface SeedTeam {
  id: string;
  name: string;
  shortName: string;
  ground: string;
  colors: { primary: string; secondary: string };
  roster: { uid: string; role: string }[];
}

function teamsFor(ownerUid: string | null): SeedTeam[] {
  const owner = (fallback: string) => ownerUid ?? fallback;
  return [
    {
      id: 'demo-strikers',
      name: 'Royal Strikers',
      shortName: 'RS',
      ground: 'Riverside Oval',
      colors: { primary: '#146c3c', secondary: '#f2d16b' },
      roster: [
        { uid: owner('demo-asha'), role: 'owner' },
        { uid: 'demo-ben', role: 'captain' },
        { uid: 'demo-chen', role: 'player' },
        { uid: 'demo-dev', role: 'viceCaptain' },
        ...(ownerUid ? [{ uid: 'demo-asha', role: 'admin' }] : []),
      ],
    },
    {
      id: 'demo-tigers',
      name: 'Thudi Tigers',
      shortName: 'TT',
      ground: 'Hilltop Ground',
      colors: { primary: '#c47e00', secondary: '#0e2318' },
      roster: [
        { uid: owner('demo-ellis'), role: 'owner' },
        { uid: 'demo-farah', role: 'captain' },
        ...(ownerUid ? [{ uid: 'demo-ellis', role: 'admin' }] : []),
      ],
    },
  ];
}

async function seedTeams(teams: SeedTeam[]) {
  const batch = db.batch();
  for (const t of teams) {
    batch.set(db.doc(`teams/${t.id}`), {
      name: t.name,
      shortName: t.shortName,
      logoDataUrl: null,
      homeGround: t.ground,
      colors: t.colors,
      ownerUid: t.roster[0].uid,
      searchTokens: searchTokens(t.name, t.shortName),
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.doc(`teams/${t.id}/private/invite`), { code: `demo-join-code-${t.id}`, updatedAt: now });
    for (const m of t.roster) {
      const p = DEMO_PLAYERS.find((x) => x.uid === m.uid);
      batch.set(db.doc(`teamMembers/${t.id}_${m.uid}`), {
        teamId: t.id,
        uid: m.uid,
        role: m.role,
        displayName: p?.name ?? 'Club owner',
        photoURL: null,
        jerseyNumber: p?.jersey ?? null,
        playerRole: p?.role ?? 'allRounder',
        via: m.role === 'owner' ? 'owner' : 'invite',
        joinedAt: now,
      });
    }
    batch.set(db.collection(`teams/${t.id}/activity`).doc(), {
      actorUid: t.roster[0].uid,
      actorName: 'CricketHub demo',
      message: `${t.name} was set up with demo data`,
      link: null,
      createdAt: now,
    });
  }
  // A pending invitation, so the inbox has something in it
  batch.set(db.doc('invitations/demo-invite'), {
    teamId: 'demo-tigers',
    teamName: 'Thudi Tigers',
    inviterUid: teams[1].roster[0].uid,
    inviterName: 'Ellis Okafor',
    inviteeUid: 'demo-ben',
    inviteeEmail: null,
    inviteeName: 'Ben Carter',
    status: 'pending',
    createdAt: now,
    respondedAt: null,
  });
  await batch.commit();
  console.log(`✓ ${teams.length} teams`);
}

/* ── Matches ───────────────────────────────────────────────────────────── */

const sideOf = (t: { id: string | null; name: string; shortName: string; color: string | null; ttId?: string | null }): FixtureSide => ({
  teamId: t.id,
  ttId: t.ttId ?? null,
  name: t.name,
  shortName: t.shortName,
  color: t.color,
  placeholder: null,
});

/** Plausible innings totals for an overs limit. */
function innings(overs: number, chasing?: InningsScore): InningsScore {
  const full = overs * 6;
  if (!chasing) {
    const wickets = between(3, 10);
    const balls = wickets === 10 ? between(full - 30, full - 1) : full;
    return { runs: between(overs * 6, overs * 9), wickets, balls };
  }
  const target = chasing.runs + 1;
  if (rand() < 0.55) return { runs: target + between(0, 4), wickets: between(2, 8), balls: between(full - 30, full - 1) };
  return { runs: Math.max(40, target - between(1, 40)), wickets: between(6, 10), balls: full };
}

/** Batting/bowling lines for a registered squad, roughly adding up to the innings. */
function scorecard(squad: { uid: string; name: string }[], side: Side, score: InningsScore, oppSquad: { uid: string; name: string }[]) {
  const batting: BattingLine[] = squad.map((p, i) => {
    const runs = Math.round((score.runs * (squad.length - i)) / ((squad.length * (squad.length + 1)) / 2));
    const balls = Math.max(1, Math.round(runs * (0.7 + rand() * 0.6)));
    return { side, uid: p.uid, name: p.name, runs, balls, fours: Math.floor(runs / 9), sixes: Math.floor(runs / 25), notOut: i === squad.length - 1 };
  });
  const opp: Side = side === 'home' ? 'away' : 'home';
  const bowling: BowlingLine[] = oppSquad.map((p, i) => ({
    side: opp,
    uid: p.uid,
    name: p.name,
    balls: 24,
    maidens: i === 0 ? 1 : 0,
    runs: between(15, 40),
    wickets: Math.min(score.wickets, between(0, 3)),
  }));
  return { batting, bowling };
}

interface PlannedMatch {
  id: string;
  home: FixtureSide;
  away: FixtureSide;
  startsAt: Timestamp;
  ownerTeamId: string | null;
  tournament: { id: string; name: string } | null;
  stage: Record<string, unknown> | null;
  overs: number;
  played: boolean;
}

const SQUADS: Record<string, { uid: string; name: string }[]> = {
  'demo-strikers': ['demo-ben', 'demo-chen', 'demo-dev', 'demo-asha'].map((uid) => ({ uid, name: DEMO_PLAYERS.find((p) => p.uid === uid)!.name })),
  'demo-tigers': ['demo-farah', 'demo-ellis'].map((uid) => ({ uid, name: DEMO_PLAYERS.find((p) => p.uid === uid)!.name })),
};

async function writeMatch(m: PlannedMatch, createdBy: string) {
  const teamIds = [m.home.teamId, m.away.teamId].filter((x): x is string => !!x);
  const batch = db.batch();
  const fixtureDoc: Record<string, unknown> = {
    ownerTeamId: m.ownerTeamId,
    tournamentId: m.tournament?.id ?? null,
    tournamentName: m.tournament?.name ?? null,
    teamIds,
    home: m.home,
    away: m.away,
    startsAt: m.startsAt,
    venue: m.home.teamId === 'demo-tigers' ? 'Hilltop Ground' : 'Riverside Oval',
    overs: m.overs,
    matchType: m.overs === 20 ? 'T20' : 'Custom',
    status: 'scheduled',
    cancelReason: null,
    notes: m.played ? '' : 'Meet 45 minutes before the start. Whites, please.',
    stage: m.stage,
    result: null,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  let winnerSide: Side | null = null;
  if (m.played) {
    const battedFirst: Side = rand() < 0.5 ? 'home' : 'away';
    const first = innings(m.overs);
    const second = innings(m.overs, first);
    const scores = battedFirst === 'home' ? { home: first, away: second } : { home: second, away: first };
    const { winner, margin } = computeMargin({ battedFirst, ...scores, oversLimit: m.overs });
    winnerSide = winner === 'home' || winner === 'away' ? winner : null;
    const advancing: Side | null = winner === 'tie' && m.stage?.kind === 'knockout' ? 'home' : null;
    if (advancing) winnerSide = advancing;

    const batting: BattingLine[] = [];
    const bowling: BowlingLine[] = [];
    for (const side of ['home', 'away'] as const) {
      const squad = m[side].teamId ? SQUADS[m[side].teamId!] ?? [] : [];
      const opp = side === 'home' ? m.away : m.home;
      const oppSquad = opp.teamId ? SQUADS[opp.teamId] ?? [] : [];
      if (squad.length || oppSquad.length) {
        const card = scorecard(squad, side, scores[side], oppSquad);
        batting.push(...card.batting);
        bowling.push(...card.bowling);
      }
    }
    const mom = batting.length ? [...batting].sort((a, b) => b.runs - a.runs)[0] : null;
    const names = { home: m.home.name, away: m.away.name };

    batch.set(db.doc(`matchResults/${m.id}`), {
      fixtureId: m.id,
      tournamentId: m.tournament?.id ?? null,
      ownerTeamId: m.ownerTeamId,
      teamIds,
      homeTeamId: m.home.teamId,
      awayTeamId: m.away.teamId,
      oversLimit: m.overs,
      battedFirst,
      winner,
      advancing,
      margin,
      innings: scores,
      manOfTheMatch: mom ? { uid: mom.uid, name: mom.name } : null,
      batting,
      bowling,
      revision: 1,
      enteredBy: createdBy,
      enteredAt: now,
    });
    fixtureDoc.status = 'completed';
    fixtureDoc.result = { winner, advancing, summary: resultSummary(winner, margin, names, advancing), home: scores.home, away: scores.away };

    for (const c of contributionsFromScorecard(batting, bowling, mom?.uid ?? null)) {
      const { uid, side, name: _n, ...line } = c;
      batch.set(db.doc(`playerStats/${m.id}_${uid}`), {
        uid,
        fixtureId: m.id,
        teamId: m[side].teamId,
        tournamentId: m.tournament?.id ?? null,
        playedAt: m.startsAt,
        opponent: m[side === 'home' ? 'away' : 'home'].name,
        ...line,
      });
    }
  } else {
    // Upcoming: some RSVPs so the captain's summary has data
    for (const teamId of teamIds) {
      for (const p of SQUADS[teamId] ?? []) {
        if (rand() < 0.25) continue; // a few haven't replied
        const status = rand() < 0.7 ? 'available' : rand() < 0.5 ? 'maybe' : 'unavailable';
        batch.set(db.doc(`availability/${m.id}_${p.uid}`), { fixtureId: m.id, teamId, uid: p.uid, displayName: p.name, status, updatedAt: now });
      }
    }
  }
  batch.set(db.doc(`fixtures/${m.id}`), fixtureDoc);
  await batch.commit();
  return winnerSide;
}

async function seedTeamFixtures(teams: SeedTeam[]) {
  const [strikers, tigers] = teams;
  const s = { id: strikers.id, name: strikers.name, shortName: strikers.shortName, color: strikers.colors.primary };
  const t = { id: tigers.id, name: tigers.name, shortName: tigers.shortName, color: tigers.colors.primary };
  const ext = (name: string) => ({ id: null, name, shortName: initials(name), color: null });
  const plan: [FixtureSide, FixtureSide, number, boolean][] = [
    [sideOf(s), sideOf(ext('Village XI')), -21, true],
    [sideOf(ext('Old Town XI')), sideOf(s), -14, true],
    [sideOf(s), sideOf(t), -7, true],
    [sideOf(s), sideOf(ext('Harbour Rovers')), 3, false],
    [sideOf(ext('Riverside CC')), sideOf(s), 10, false],
    [sideOf(t), sideOf(ext('Hilltop Hawks')), 5, false],
  ];
  for (const [i, [home, away, offset, played]] of plan.entries()) {
    const owner = home.teamId ?? away.teamId!;
    await writeMatch(
      { id: `demo-fx-${i + 1}`, home, away, startsAt: days(offset), ownerTeamId: owner, tournament: null, stage: null, overs: 20, played },
      teams.find((x) => x.id === owner)!.roster[0].uid,
    );
  }
  console.log(`✓ ${plan.length} team fixtures`);
}

/* ── Tournaments ───────────────────────────────────────────────────────── */

async function seedTournament(opts: {
  id: string;
  name: string;
  format: 'league' | 'knockout';
  ownerUid: string;
  ownerName: string;
  teams: { id: string | null; name: string; color: string }[];
  startOffset: number;
}) {
  const t = { id: opts.id, name: opts.name };
  const batch = db.batch();
  const entries = opts.teams.map((team, i) => ({ ttId: `${opts.id}-tt${i + 1}`, ...team, shortName: initials(team.name) }));
  entries.forEach((e, i) =>
    batch.set(db.doc(`tournamentTeams/${e.ttId}`), {
      tournamentId: opts.id,
      teamId: e.id,
      name: e.name,
      shortName: e.shortName,
      color: e.color,
      group: null,
      seed: i + 1,
      addedAt: now,
    }),
  );
  batch.set(db.doc(`tournaments/${opts.id}`), {
    name: opts.name,
    searchTokens: searchTokens(opts.name),
    startDate: isoDay(opts.startOffset),
    endDate: isoDay(opts.startOffset + 49),
    format: opts.format,
    overs: 20,
    matchType: 'T20',
    teamCount: Math.max(8, entries.length),
    entryRules:
      'Open to registered club sides.\nSquads of up to 15, named before the first match.\nPlaying conditions: standard T20 rules; one bouncer per over; free hit after a front-foot no-ball.\nPoints: win 2, tie or no result 1. Level on points → net run rate.',
    venue: 'Riverside Oval',
    ownerUid: opts.ownerUid,
    ownerName: opts.ownerName,
    adminUids: [],
    status: 'live',
    points: { win: 2, tie: 1, noResult: 1, loss: 0 },
    groupCount: 2,
    qualifiersPerGroup: 2,
    doubleRoundRobin: false,
    fixturesGenerated: true,
    knockoutGenerated: opts.format === 'knockout',
    createdAt: now,
    updatedAt: now,
  });
  batch.set(db.collection(`tournaments/${opts.id}/activity`).doc(), {
    actorUid: opts.ownerUid,
    actorName: opts.ownerName,
    message: `${opts.ownerName} generated the fixtures`,
    link: null,
    createdAt: now,
  });
  await batch.commit();

  const asSide = (e: (typeof entries)[number]) => sideOf({ id: e.id, name: e.name, shortName: e.shortName, color: e.color, ttId: e.ttId });

  if (opts.format === 'league') {
    const rounds = roundRobin(entries.map((e) => e.ttId));
    let n = 0;
    for (const [r, round] of rounds.entries()) {
      for (const p of round) {
        n += 1;
        const home = entries.find((e) => e.ttId === p.home)!;
        const away = entries.find((e) => e.ttId === p.away)!;
        await writeMatch(
          {
            id: `${opts.id}-m${n}`,
            home: asSide(home),
            away: asSide(away),
            startsAt: days(opts.startOffset + r * 7, 10 + (n % 2) * 4),
            ownerTeamId: null,
            tournament: t,
            stage: { kind: 'league', group: null, round: r + 1, roundLabel: `Round ${r + 1}`, matchNo: n, nextMatchId: null, nextSlot: null },
            overs: 20,
            played: r < 3, // first three rounds are in the books
          },
          opts.ownerUid,
        );
      }
    }
    console.log(`✓ ${opts.name}: ${n} league fixtures`);
    return;
  }

  // Knockout: round one played, winners carried through
  const bracket = knockoutBracket(entries.map((e) => e.ttId));
  const idOf = (key: string) => `${opts.id}-${key.toLowerCase()}`;
  const numberOf = new Map(bracket.map((m, i) => [m.key, i + 1]));
  const winners = new Map<string, FixtureSide>();
  for (const m of bracket) {
    const resolve = (team: string | null, from: string | null): FixtureSide =>
      team
        ? asSide(entries.find((e) => e.ttId === team)!)
        : winners.get(from!) ?? { teamId: null, ttId: null, name: '', shortName: 'TBD', color: null, placeholder: `Winner of M${numberOf.get(from!)}` };
    const home = resolve(m.home, m.homeFrom);
    const away = resolve(m.away, m.awayFrom);
    const played = m.round === 1 && !!home.name && !!away.name;
    const through = await writeMatch(
      {
        id: idOf(m.key),
        home,
        away,
        startsAt: days(opts.startOffset + (m.round - 1) * 7, 14),
        ownerTeamId: null,
        tournament: t,
        stage: {
          kind: 'knockout',
          group: null,
          round: m.round,
          roundLabel: m.roundLabel,
          matchNo: numberOf.get(m.key)!,
          nextMatchId: m.nextKey ? idOf(m.nextKey) : null,
          nextSlot: m.nextSlot,
        },
        overs: 20,
        played,
      },
      opts.ownerUid,
    );
    if (through) winners.set(m.key, { ...(through === 'home' ? home : away), placeholder: null });
  }
  console.log(`✓ ${opts.name}: ${bracket.length} knockout fixtures`);
}

/* ── Email templates (Trigger Email extension) ─────────────────────────── */

async function seedTemplates() {
  await db.doc('templates/team-invite').set({
    subject: "You're invited to join {{teamName}} on CricketHub",
    html: '<p>{{inviterName}} has invited you to join <strong>{{teamName}}</strong> on CricketHub.</p><p>Sign in with Google using this email address and accept the invitation in your inbox:</p><p><a href="{{link}}">{{link}}</a></p>',
  });
  await db.doc('templates/notification').set({
    subject: '{{title}}',
    html: '<p><strong>{{title}}</strong></p><p>{{body}}</p><p><a href="{{link}}">Open in CricketHub</a></p>',
  });
  console.log('✓ email templates');
}

/* ── Run ───────────────────────────────────────────────────────────────── */

async function main() {
  const ownerArg = args.get('owner');
  if (prod && !ownerArg) {
    console.error('Pass --owner=<your Firebase uid> so you own the demo teams and tournaments (Authentication → Users).');
    process.exit(1);
  }
  const ownerUid: string | null = prod ? ownerArg! : null;
  console.log(`Seeding ${prod ? 'REAL project' : 'emulator'} (${app.options.projectId ?? 'default project'})…`);

  await seedPlayers(ownerUid);
  const teams = teamsFor(ownerUid);
  await seedTeams(teams);
  await seedTeamFixtures(teams);

  const leagueOwner = ownerUid ?? 'demo-asha';
  await seedTournament({
    id: 'demo-sunday-league',
    name: 'Sunday League 2026',
    format: 'league',
    ownerUid: leagueOwner,
    ownerName: ownerUid ? 'You' : 'Asha Raman',
    startOffset: -21,
    teams: [
      { id: 'demo-strikers', name: 'Royal Strikers', color: '#146c3c' },
      { id: 'demo-tigers', name: 'Thudi Tigers', color: '#c47e00' },
      { id: null, name: 'Riverside CC', color: '#1d4e89' },
      { id: null, name: 'Hilltop Hawks', color: '#6b2fa3' },
      { id: null, name: 'Old Town XI', color: '#b3202a' },
      { id: null, name: 'Harbour Rovers', color: '#0f766e' },
    ],
  });
  await seedTournament({
    id: 'demo-floodlit-cup',
    name: 'Floodlit Knockout Cup',
    format: 'knockout',
    ownerUid: ownerUid ?? 'demo-ellis',
    ownerName: ownerUid ? 'You' : 'Ellis Okafor',
    startOffset: -6,
    teams: [
      { id: 'demo-tigers', name: 'Thudi Tigers', color: '#c47e00' },
      { id: 'demo-strikers', name: 'Royal Strikers', color: '#146c3c' },
      { id: null, name: 'Night Owls', color: '#3f3f46' },
      { id: null, name: 'Lakeside Lions', color: '#9d174d' },
      { id: null, name: 'Mill Lane', color: '#0f766e' },
      { id: null, name: 'Station Road', color: '#1d4e89' },
    ],
  });
  await seedTemplates();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
