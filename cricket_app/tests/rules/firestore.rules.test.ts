/**
 * Security rules tests. Run with `npm run test:rules` (starts the Firestore emulator).
 * Each test seeds data with rules disabled, then checks what each role can and cannot do.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const OWNER = 'owner1';
const ADMIN = 'admin1';
const CAPTAIN = 'captain1';
const PLAYER = 'player1';
const OUTSIDER = 'outsider1';
const CODE = 'join-code-0123456789abcdef';

const as = (uid: string, email = `${uid}@test.com`) =>
  env.authenticatedContext(uid, { email, email_verified: true }).firestore() as unknown as Firestore;
const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore;
const seed = (fn: (db: Firestore) => Promise<void>) =>
  env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore() as unknown as Firestore));

/* ── Document builders (shapes match the app's data layer) ─────────────── */

const user = (uid: string, extra: Record<string, unknown> = {}) => ({
  uid,
  displayName: 'Test Player',
  photoURL: null,
  battingStyle: 'right',
  bowlingStyle: 'none',
  playerRole: 'batter',
  jerseyNumber: null,
  searchTokens: ['t', 'te', 'test'],
  onboarded: false,
  emailNotifications: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const team = (ownerUid: string, extra: Record<string, unknown> = {}) => ({
  name: 'Royal Strikers',
  shortName: 'RS',
  logoDataUrl: null,
  homeGround: 'Oval Park',
  colors: { primary: '#146c3c', secondary: '#f7f4ea' },
  ownerUid,
  searchTokens: ['r', 'ro', 'roy'],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const member = (teamId: string, uid: string, role: string, extra: Record<string, unknown> = {}) => ({
  teamId,
  uid,
  role,
  displayName: `Player ${uid}`,
  photoURL: null,
  jerseyNumber: null,
  playerRole: 'batter',
  via: role === 'owner' ? 'owner' : 'invite',
  joinedAt: serverTimestamp(),
  ...extra,
});

const side = (teamId: string | null, name: string) => ({ teamId, ttId: null, name, shortName: name.slice(0, 3).toUpperCase(), color: null, placeholder: null });

const fixture = (createdBy: string, extra: Record<string, unknown> = {}) => ({
  ownerTeamId: 'T1',
  tournamentId: null,
  tournamentName: null,
  teamIds: ['T1'],
  home: side('T1', 'Royal Strikers'),
  away: side(null, 'Village XI'),
  startsAt: Timestamp.fromDate(new Date('2026-11-07T10:00:00Z')),
  venue: 'Oval Park',
  overs: 20,
  matchType: 'T20',
  status: 'scheduled',
  cancelReason: null,
  notes: '',
  stage: null,
  result: null,
  createdBy,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const tournament = (ownerUid: string, extra: Record<string, unknown> = {}) => ({
  name: 'Winter Cup',
  searchTokens: ['w', 'wi'],
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  format: 'league',
  overs: 20,
  matchType: 'T20',
  teamCount: 8,
  entryRules: '',
  venue: '',
  ownerUid,
  ownerName: 'Owner',
  adminUids: [],
  status: 'setup',
  points: { win: 2, tie: 1, noResult: 1, loss: 0 },
  groupCount: 2,
  qualifiersPerGroup: 2,
  doubleRoundRobin: false,
  fixturesGenerated: false,
  knockoutGenerated: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const stats = (fixtureId: string, uid: string) => ({
  uid,
  fixtureId,
  teamId: 'T1',
  tournamentId: null,
  playedAt: Timestamp.now(),
  opponent: 'Village XI',
  batted: true,
  runs: 42,
  balls: 30,
  fours: 4,
  sixes: 1,
  out: true,
  bowled: false,
  ballsBowled: 0,
  maidens: 0,
  runsConceded: 0,
  wickets: 0,
  manOfTheMatch: false,
});

const result = (fixtureId: string, enteredBy: string) => ({
  fixtureId,
  tournamentId: null,
  ownerTeamId: 'T1',
  teamIds: ['T1'],
  homeTeamId: 'T1',
  awayTeamId: null,
  oversLimit: 20,
  battedFirst: 'home',
  winner: 'home',
  advancing: null,
  margin: 'by 10 runs',
  innings: { home: { runs: 150, wickets: 6, balls: 120 }, away: { runs: 140, wickets: 9, balls: 120 } },
  manOfTheMatch: null,
  batting: [],
  bowling: [],
  revision: 1,
  enteredBy,
  enteredAt: serverTimestamp(),
});

const notification = (to: string, actor: string, extra: Record<string, unknown> = {}) => ({
  uid: to,
  type: 'fixture_new',
  title: 'New fixture',
  body: 'Saturday',
  link: '/fixtures/F1',
  teamId: 'T1',
  fixtureId: 'F1',
  tournamentId: null,
  actorUid: actor,
  actorName: 'Someone',
  read: false,
  createdAt: serverTimestamp(),
  ...extra,
});

/** Team T1 with an owner, admin, captain and player, a join code and fixture F1. */
async function seedTeam() {
  await seed(async (db) => {
    await setDoc(doc(db, 'teams/T1'), team(OWNER));
    await setDoc(doc(db, 'teams/T1/private/invite'), { code: CODE, updatedAt: serverTimestamp() });
    for (const [uid, role] of [
      [OWNER, 'owner'],
      [ADMIN, 'admin'],
      [CAPTAIN, 'captain'],
      [PLAYER, 'player'],
    ]) {
      await setDoc(doc(db, `teamMembers/T1_${uid}`), member('T1', uid, role));
    }
    await setDoc(doc(db, 'fixtures/F1'), fixture(CAPTAIN));
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-crickethub',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

/* ── Users ─────────────────────────────────────────────────────────────── */

describe('users', () => {
  it('lets a player create and update only their own profile', async () => {
    await assertSucceeds(setDoc(doc(as('u1'), 'users/u1'), user('u1')));
    await assertFails(setDoc(doc(as('u1'), 'users/u2'), user('u2')));
    await assertSucceeds(updateDoc(doc(as('u1'), 'users/u1'), { displayName: 'New Name', onboarded: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('u2'), 'users/u1'), { displayName: 'Hacked', updatedAt: serverTimestamp() }));
  });

  it('rejects unknown fields and bad values', async () => {
    await assertFails(setDoc(doc(as('u1'), 'users/u1'), user('u1', { isAdmin: true })));
    await assertFails(setDoc(doc(as('u1'), 'users/u1'), user('u1', { playerRole: 'umpire' })));
    await assertFails(setDoc(doc(as('u1'), 'users/u1'), user('u1', { jerseyNumber: 1000 })));
    await assertFails(setDoc(doc(as('u1'), 'users/u1'), user('u1', { displayName: 'x'.repeat(61) })));
  });

  it('only lets signed-in players read profiles, with a limit on listing', async () => {
    await seed((db) => setDoc(doc(db, 'users/u1'), user('u1')));
    await assertSucceeds(getDoc(doc(as('u2'), 'users/u1')));
    await assertFails(getDoc(doc(anon(), 'users/u1')));
    await assertSucceeds(getDocs(query(collection(as('u2'), 'users'), where('searchTokens', 'array-contains', 'te'), limit(20))));
    await assertFails(getDocs(collection(as('u2'), 'users')));
  });

  it('keeps email private and the email index un-listable', async () => {
    await assertSucceeds(setDoc(doc(as('u1', 'Asha@Example.com'), 'userPrivate/u1'), { email: 'asha@example.com', createdAt: serverTimestamp() }));
    await assertFails(getDoc(doc(as('u2'), 'userPrivate/u1')));
    await assertSucceeds(setDoc(doc(as('u1', 'asha@example.com'), 'userEmails/asha@example.com'), { uid: 'u1' }));
    await assertFails(setDoc(doc(as('u2', 'ben@example.com'), 'userEmails/asha@example.com'), { uid: 'u2' }));
    await assertSucceeds(getDoc(doc(as('u2'), 'userEmails/asha@example.com')));
    await assertFails(getDocs(collection(as('u2'), 'userEmails')));
  });
});

/* ── Teams and rosters ─────────────────────────────────────────────────── */

describe('teams', () => {
  it('creates a team only together with the owner roster entry', async () => {
    const db = as('u1');
    const b = writeBatch(db);
    b.set(doc(db, 'teams/NEW'), team('u1'));
    b.set(doc(db, 'teamMembers/NEW_u1'), member('NEW', 'u1', 'owner'));
    b.set(doc(db, 'teams/NEW/private/invite'), { code: CODE, updatedAt: serverTimestamp() });
    await assertSucceeds(b.commit());

    await assertFails(setDoc(doc(as('u2'), 'teams/LONE'), team('u2')));
  });

  it('cannot create a team owned by someone else', async () => {
    const db = as('u1');
    const b = writeBatch(db);
    b.set(doc(db, 'teams/NEW'), team('u2'));
    b.set(doc(db, 'teamMembers/NEW_u1'), member('NEW', 'u1', 'owner'));
    await assertFails(b.commit());
  });

  it('is public to read but only owners and admins edit it', async () => {
    await seedTeam();
    await assertSucceeds(getDoc(doc(anon(), 'teams/T1')));
    const edit = { homeGround: 'New Ground', updatedAt: serverTimestamp() };
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'teams/T1'), edit));
    await assertFails(updateDoc(doc(as(CAPTAIN), 'teams/T1'), edit));
    await assertFails(updateDoc(doc(as(PLAYER), 'teams/T1'), edit));
    await assertFails(updateDoc(doc(as(OUTSIDER), 'teams/T1'), edit));
  });

  it('validates logos and colours', async () => {
    await seedTeam();
    const db = as(OWNER);
    await assertSucceeds(updateDoc(doc(db, 'teams/T1'), { logoDataUrl: 'data:image/webp;base64,UklGRg==', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'teams/T1'), { logoDataUrl: 'https://evil.example/x.png', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'teams/T1'), { logoDataUrl: `data:image/png;base64,${'A'.repeat(150_001)}`, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'teams/T1'), { colors: { primary: 'red', secondary: '#ffffff' }, updatedAt: serverTimestamp() }));
  });

  it('hides the join code from non-admins', async () => {
    await seedTeam();
    await assertSucceeds(getDoc(doc(as(ADMIN), 'teams/T1/private/invite')));
    await assertFails(getDoc(doc(as(PLAYER), 'teams/T1/private/invite')));
    await assertFails(getDoc(doc(as(OUTSIDER), 'teams/T1/private/invite')));
  });

  it('lets anyone with the right join code join as a player only', async () => {
    await seedTeam();
    const join = (uid: string, extra: Record<string, unknown>) =>
      setDoc(doc(as(uid), `teamMembers/T1_${uid}`), member('T1', uid, 'player', { via: 'link', ...extra }));
    await assertFails(join(OUTSIDER, { joinCode: 'wrong-code-0000000000' }));
    await assertFails(join(OUTSIDER, { joinCode: CODE, role: 'admin' }));
    await assertSucceeds(join(OUTSIDER, { joinCode: CODE }));
  });

  it('never lets someone add another person to a roster directly', async () => {
    await seedTeam();
    await assertFails(setDoc(doc(as(ADMIN), 'teamMembers/T1_newbie'), member('T1', 'newbie', 'player', { via: 'link', joinCode: CODE })));
  });

  it('lets owners and admins change roles, but never to owner', async () => {
    await seedTeam();
    await assertSucceeds(updateDoc(doc(as(ADMIN), `teamMembers/T1_${PLAYER}`), { role: 'viceCaptain' }));
    await assertFails(updateDoc(doc(as(ADMIN), `teamMembers/T1_${PLAYER}`), { role: 'owner' }));
    await assertFails(updateDoc(doc(as(ADMIN), `teamMembers/T1_${OWNER}`), { role: 'player' }));
    await assertFails(updateDoc(doc(as(CAPTAIN), `teamMembers/T1_${PLAYER}`), { role: 'admin' }));
    await assertFails(updateDoc(doc(as(PLAYER), `teamMembers/T1_${PLAYER}`), { role: 'admin' }));
  });

  it('lets a player refresh their own roster details', async () => {
    await seedTeam();
    await assertSucceeds(updateDoc(doc(as(PLAYER), `teamMembers/T1_${PLAYER}`), { displayName: 'Renamed', jerseyNumber: 10 }));
    await assertFails(updateDoc(doc(as(OUTSIDER), `teamMembers/T1_${PLAYER}`), { displayName: 'Renamed' }));
  });

  it('handles leaving and removal', async () => {
    await seedTeam();
    await assertSucceeds(deleteDoc(doc(as(PLAYER), `teamMembers/T1_${PLAYER}`)));
    await assertFails(deleteDoc(doc(as(OWNER), `teamMembers/T1_${OWNER}`))); // owner must transfer first
    await assertFails(deleteDoc(doc(as(CAPTAIN), `teamMembers/T1_${ADMIN}`)));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), `teamMembers/T1_${CAPTAIN}`)));
  });

  it('transfers ownership only as a complete batch', async () => {
    await seedTeam();
    await assertFails(updateDoc(doc(as(OWNER), 'teams/T1'), { ownerUid: ADMIN, updatedAt: serverTimestamp() }));

    const db = as(OWNER);
    const b = writeBatch(db);
    b.update(doc(db, 'teams/T1'), { ownerUid: ADMIN, updatedAt: serverTimestamp() });
    b.update(doc(db, `teamMembers/T1_${ADMIN}`), { role: 'owner' });
    b.update(doc(db, `teamMembers/T1_${OWNER}`), { role: 'admin' });
    await assertSucceeds(b.commit());
  });

  it('lets the owner delete the team and its roster', async () => {
    await seedTeam();
    const db = as(OWNER);
    const b = writeBatch(db);
    for (const uid of [OWNER, ADMIN, CAPTAIN, PLAYER]) b.delete(doc(db, `teamMembers/T1_${uid}`));
    b.delete(doc(db, 'teams/T1/private/invite'));
    b.delete(doc(db, 'teams/T1'));
    await assertSucceeds(b.commit());
  });

  it('keeps team activity for members only', async () => {
    await seedTeam();
    const entry = (actorUid: string) => ({ actorUid, actorName: 'X', message: 'Did a thing', link: null, createdAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(as(PLAYER), 'teams/T1/activity/a1'), entry(PLAYER)));
    await assertFails(setDoc(doc(as(PLAYER), 'teams/T1/activity/a2'), entry(OWNER)));
    await assertFails(setDoc(doc(as(OUTSIDER), 'teams/T1/activity/a3'), entry(OUTSIDER)));
    await assertFails(getDocs(collection(as(OUTSIDER), 'teams/T1/activity')));
  });
});

/* ── Invitations ───────────────────────────────────────────────────────── */

describe('invitations', () => {
  const invite = (extra: Record<string, unknown>) => ({
    teamId: 'T1',
    teamName: 'Royal Strikers',
    inviterUid: ADMIN,
    inviterName: 'Admin',
    inviteeUid: null,
    inviteeEmail: null,
    inviteeName: null,
    status: 'pending',
    createdAt: serverTimestamp(),
    respondedAt: null,
    ...extra,
  });

  it('only owners and admins can invite', async () => {
    await seedTeam();
    await assertSucceeds(setDoc(doc(as(ADMIN), 'invitations/i1'), invite({ inviteeUid: OUTSIDER, inviteeName: 'Out' })));
    await assertFails(setDoc(doc(as(PLAYER), 'invitations/i2'), invite({ inviterUid: PLAYER, inviteeUid: OUTSIDER })));
    await assertFails(setDoc(doc(as(ADMIN), 'invitations/i3'), invite({ inviteeEmail: 'Not-Lower@Example.com' })));
    await assertFails(setDoc(doc(as(ADMIN), 'invitations/i4'), invite({ inviteeUid: PLAYER })), /* already a member */);
  });

  it('lets the invitee accept, creating their roster entry in the same batch', async () => {
    await seedTeam();
    await seed((db) => setDoc(doc(db, 'invitations/i1'), invite({ inviteeUid: OUTSIDER })));
    const accept = (uid: string) => {
      const db = as(uid);
      const b = writeBatch(db);
      b.set(doc(db, `teamMembers/T1_${uid}`), member('T1', uid, 'player', { via: 'invite', inviteId: 'i1' }));
      b.update(doc(db, 'invitations/i1'), { status: 'accepted', inviteeUid: uid, respondedAt: serverTimestamp() });
      return b.commit();
    };
    await assertFails(accept('stranger'));
    await assertSucceeds(accept(OUTSIDER));
  });

  it('matches email invitations against the verified Google email', async () => {
    await seedTeam();
    await seed((db) => setDoc(doc(db, 'invitations/i1'), invite({ inviteeEmail: 'new@club.com' })));
    await assertSucceeds(getDocs(query(collection(as('newbie', 'New@Club.com'), 'invitations'), where('inviteeEmail', '==', 'new@club.com'), where('status', '==', 'pending'))));
    await assertFails(getDoc(doc(as('someone', 'other@club.com'), 'invitations/i1')));

    const db = as('newbie', 'new@club.com');
    const b = writeBatch(db);
    b.set(doc(db, 'teamMembers/T1_newbie'), member('T1', 'newbie', 'player', { via: 'invite', inviteId: 'i1' }));
    b.update(doc(db, 'invitations/i1'), { status: 'accepted', inviteeUid: 'newbie', respondedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  });

  it('cannot accept without joining, and admins can withdraw', async () => {
    await seedTeam();
    await seed((db) => setDoc(doc(db, 'invitations/i1'), invite({ inviteeUid: OUTSIDER })));
    await assertFails(updateDoc(doc(as(OUTSIDER), 'invitations/i1'), { status: 'accepted', inviteeUid: OUTSIDER, respondedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'invitations/i1'), { status: 'revoked', respondedAt: serverTimestamp() }));
  });

  it('lets invitees list their pending invitations', async () => {
    await seedTeam();
    await seed((db) => setDoc(doc(db, 'invitations/i1'), invite({ inviteeUid: OUTSIDER })));
    await assertSucceeds(getDocs(query(collection(as(OUTSIDER), 'invitations'), where('inviteeUid', '==', OUTSIDER), where('status', '==', 'pending'))));
    await assertFails(getDocs(query(collection(as('nosy'), 'invitations'), where('inviteeUid', '==', OUTSIDER))));
    await assertSucceeds(getDocs(query(collection(as(ADMIN), 'invitations'), where('teamId', '==', 'T1'), where('status', '==', 'pending'))));
  });
});

/* ── Fixtures, availability and lineups ────────────────────────────────── */

describe('fixtures', () => {
  it('lets captains and above create team fixtures, not players', async () => {
    await seedTeam();
    await assertSucceeds(setDoc(doc(as(CAPTAIN), 'fixtures/F2'), fixture(CAPTAIN)));
    await assertFails(setDoc(doc(as(PLAYER), 'fixtures/F3'), fixture(PLAYER)));
    await assertFails(setDoc(doc(as(OUTSIDER), 'fixtures/F4'), fixture(OUTSIDER)));
  });

  it('requires teamIds to match the sides', async () => {
    await seedTeam();
    await assertFails(setDoc(doc(as(CAPTAIN), 'fixtures/F2'), fixture(CAPTAIN, { teamIds: ['T1', 'OTHER'] })));
    await assertFails(setDoc(doc(as(CAPTAIN), 'fixtures/F3'), fixture(CAPTAIN, { home: side(null, 'A'), teamIds: [] })));
  });

  it('is public to read; managers edit and cancel with a reason', async () => {
    await seedTeam();
    await assertSucceeds(getDoc(doc(anon(), 'fixtures/F1')));
    await assertSucceeds(updateDoc(doc(as(CAPTAIN), 'fixtures/F1'), { status: 'cancelled', cancelReason: 'Rain', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(PLAYER), 'fixtures/F1'), { venue: 'Elsewhere', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(CAPTAIN), 'fixtures/F1'), { ownerTeamId: 'T2', updatedAt: serverTimestamp() }));
  });

  it('lets members RSVP for themselves only', async () => {
    await seedTeam();
    const rsvp = (uid: string, asUid = uid) =>
      setDoc(doc(as(asUid), `availability/F1_${uid}`), { fixtureId: 'F1', teamId: 'T1', uid, displayName: 'P', status: 'available', updatedAt: serverTimestamp() });
    await assertSucceeds(rsvp(PLAYER));
    await assertFails(rsvp(CAPTAIN, PLAYER));
    await assertFails(rsvp(OUTSIDER));
  });

  it('shows RSVPs to the team only, and your own RSVP before it exists', async () => {
    await seedTeam();
    await assertSucceeds(getDoc(doc(as(OUTSIDER), `availability/F1_${OUTSIDER}`)));
    await assertSucceeds(getDocs(query(collection(as(PLAYER), 'availability'), where('fixtureId', '==', 'F1'), where('teamId', '==', 'T1'))));
    await assertFails(getDocs(query(collection(as(OUTSIDER), 'availability'), where('fixtureId', '==', 'F1'), where('teamId', '==', 'T1'))));
  });

  it('lets captains pick the XI', async () => {
    await seedTeam();
    const xi = (uid: string) => setDoc(doc(as(uid), 'fixtures/F1/lineups/T1'), { teamId: 'T1', uids: [PLAYER], updatedBy: uid, updatedAt: serverTimestamp() });
    await assertSucceeds(xi(CAPTAIN));
    await assertFails(xi(PLAYER));
  });
});

/* ── Results and stats ─────────────────────────────────────────────────── */

describe('results', () => {
  it('saves a result, fixture summary and 30 stat lines in one batch', async () => {
    await seedTeam();
    const db = as(CAPTAIN);
    const b = writeBatch(db);
    b.set(doc(db, 'matchResults/F1'), result('F1', CAPTAIN));
    b.update(doc(db, 'fixtures/F1'), { status: 'completed', result: { winner: 'home' }, updatedAt: serverTimestamp() });
    for (let i = 0; i < 30; i++) b.set(doc(db, `playerStats/F1_p${i}`), stats('F1', `p${i}`));
    await assertSucceeds(b.commit());
  });

  it('blocks players and outsiders from entering results or stats', async () => {
    await seedTeam();
    await assertFails(setDoc(doc(as(PLAYER), 'matchResults/F1'), result('F1', PLAYER)));
    await assertFails(setDoc(doc(as(OUTSIDER), 'playerStats/F1_x'), stats('F1', 'x')));
  });

  it('validates stat lines and their ids', async () => {
    await seedTeam();
    await assertFails(setDoc(doc(as(CAPTAIN), 'playerStats/F1_x'), { ...stats('F1', 'x'), wickets: 11 }));
    await assertFails(setDoc(doc(as(CAPTAIN), 'playerStats/WRONG'), stats('F1', 'x')));
  });

  it('lets managers keep and remove history for undo', async () => {
    await seedTeam();
    await seed((db) => setDoc(doc(db, 'matchResults/F1'), result('F1', CAPTAIN)));
    await assertSucceeds(setDoc(doc(as(ADMIN), 'matchResults/F1/history/1'), { revision: 1 }));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), 'matchResults/F1')));
    await assertFails(getDocs(collection(as(PLAYER), 'matchResults/F1/history')));
  });
});

/* ── Tournaments ───────────────────────────────────────────────────────── */

describe('tournaments', () => {
  const tFixture = (by: string) =>
    fixture(by, { ownerTeamId: null, tournamentId: 'C1', tournamentName: 'Winter Cup', teamIds: [], home: side(null, 'Alpha'), away: side(null, 'Bravo') });

  it('any signed-in player can create one; it is public to read', async () => {
    await assertSucceeds(setDoc(doc(as('u1'), 'tournaments/C1'), tournament('u1')));
    await assertFails(setDoc(doc(as('u1'), 'tournaments/C2'), tournament('u2')));
    await assertFails(setDoc(doc(anon(), 'tournaments/C3'), tournament('u1')));
    await assertSucceeds(getDoc(doc(anon(), 'tournaments/C1')));
  });

  it('lets co-admins edit fixtures but not the co-admin list', async () => {
    await seed((db) => setDoc(doc(db, 'tournaments/C1'), tournament('boss', { adminUids: ['helper'] })));
    await assertSucceeds(setDoc(doc(as('helper'), 'fixtures/TF1'), tFixture('helper')));
    await assertFails(setDoc(doc(as('random'), 'fixtures/TF2'), tFixture('random')));
    await assertSucceeds(updateDoc(doc(as('helper'), 'tournaments/C1'), { status: 'live', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('helper'), 'tournaments/C1'), { adminUids: ['helper', 'friend'], updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('boss'), 'tournaments/C1'), { adminUids: ['helper', 'friend'], updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('helper'), 'tournaments/C1'), { ownerUid: 'helper', updatedAt: serverTimestamp() }));
  });

  it('lets co-admins enter results for tournament fixtures', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'tournaments/C1'), tournament('boss', { adminUids: ['helper'] }));
      await setDoc(doc(db, 'fixtures/TF1'), tFixture('boss'));
    });
    await assertSucceeds(setDoc(doc(as('helper'), 'matchResults/TF1'), { ...result('TF1', 'helper'), ownerTeamId: null, tournamentId: 'C1', teamIds: [], homeTeamId: null }));
    await assertFails(setDoc(doc(as('random'), 'matchResults/TF1'), { ...result('TF1', 'random'), ownerTeamId: null, tournamentId: 'C1', teamIds: [], homeTeamId: null }));
  });

  it('manages participating teams', async () => {
    await seed((db) => setDoc(doc(db, 'tournaments/C1'), tournament('boss')));
    const entry = { tournamentId: 'C1', teamId: null, name: 'Bravo', shortName: 'BRA', color: '#1d4e89', group: null, seed: 1, addedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(as('boss'), 'tournamentTeams/E1'), entry));
    await assertFails(setDoc(doc(as('random'), 'tournamentTeams/E2'), entry));
    await assertFails(setDoc(doc(as('boss'), 'tournamentTeams/E3'), { ...entry, teamId: 'does-not-exist' }));
    await assertSucceeds(getDocs(query(collection(anon(), 'tournamentTeams'), where('tournamentId', '==', 'C1'))));
  });
});

/* ── Notifications and email queue ─────────────────────────────────────── */

describe('notifications', () => {
  it('lets managers notify team members only', async () => {
    await seedTeam();
    await assertSucceeds(setDoc(doc(as(CAPTAIN), 'notifications/n1'), notification(PLAYER, CAPTAIN)));
    await assertFails(setDoc(doc(as(CAPTAIN), 'notifications/n2'), notification(OUTSIDER, CAPTAIN)));
    await assertFails(setDoc(doc(as(PLAYER), 'notifications/n3'), notification(ADMIN, PLAYER)));
    await assertFails(setDoc(doc(as(CAPTAIN), 'notifications/n4'), notification(PLAYER, OWNER)));
  });

  it('only allows in-app links', async () => {
    await seedTeam();
    await assertFails(setDoc(doc(as(CAPTAIN), 'notifications/n1'), notification(PLAYER, CAPTAIN, { link: 'javascript:alert(1)' })));
    await assertFails(setDoc(doc(as(CAPTAIN), 'notifications/n2'), notification(PLAYER, CAPTAIN, { link: 'https://evil.example' })));
  });

  it('is private to the recipient, who can mark it read', async () => {
    await seedTeam();
    await seed((db) => setDoc(doc(db, 'notifications/n1'), notification(PLAYER, CAPTAIN)));
    await assertSucceeds(getDoc(doc(as(PLAYER), 'notifications/n1')));
    await assertFails(getDoc(doc(as(CAPTAIN), 'notifications/n1')));
    await assertSucceeds(updateDoc(doc(as(PLAYER), 'notifications/n1'), { read: true }));
    await assertFails(updateDoc(doc(as(PLAYER), 'notifications/n1'), { title: 'Edited' }));
  });

  it('queues email only for real invitations, never free-form', async () => {
    await seedTeam();
    await seed((db) =>
      setDoc(doc(db, 'invitations/i1'), {
        teamId: 'T1',
        teamName: 'Royal Strikers',
        inviterUid: ADMIN,
        inviterName: 'A',
        inviteeUid: null,
        inviteeEmail: 'new@club.com',
        inviteeName: null,
        status: 'pending',
        createdAt: serverTimestamp(),
        respondedAt: null,
      }),
    );
    const mail = (to: string, by: string) => ({
      to,
      template: { name: 'team-invite', data: { teamName: 'Royal Strikers' } },
      invitationId: 'i1',
      createdBy: by,
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(setDoc(doc(as(ADMIN), 'mail/m1'), mail('new@club.com', ADMIN)));
    await assertFails(setDoc(doc(as(ADMIN), 'mail/m2'), mail('victim@else.com', ADMIN)));
    await assertFails(setDoc(doc(as(PLAYER), 'mail/m3'), mail('new@club.com', PLAYER)));
    await assertFails(setDoc(doc(as(ADMIN), 'mail/m4'), { to: 'x@y.com', message: { subject: 'Hi', html: 'spam' }, createdBy: ADMIN, createdAt: serverTimestamp() }));
    await assertFails(getDoc(doc(as(ADMIN), 'mail/m1')));
  });
});
