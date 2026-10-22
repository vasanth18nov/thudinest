/** Signed-in home: next match with one-tap RSVP, upcoming fixtures, teams, tournaments and invites. */
import { collection, orderBy, query, where } from 'firebase/firestore';
import { Link } from 'react-router';
import { ArrowUpRight, Bell, Plus } from 'lucide-react';
import { FixtureCard } from '../components/FixtureCard';
import { TeamChip } from '../components/TeamChip';
import { Badge, ButtonLink, EmptyState, OfflineNote, Segmented, SectionTitle, SkeletonList } from '../components/ui';
import { availabilityId, friendlyError } from '../data/common';
import { setAvailability } from '../data/fixtures';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useDocData, useQueryData } from '../hooks/useFirestore';
import { useInbox } from '../hooks/useInbox';
import { useTitle, useToast } from '../hooks/useUi';
import { RSVP_LABELS, ROLE_LABELS } from '../lib/text';
import { RSVP_STATUSES, type Availability, type Fixture, type RsvpStatus, type WithId } from '../lib/types';

function QuickRsvp({ fixture, teamId }: { fixture: WithId<Fixture>; teamId: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const mine = useDocData<Availability>(profile ? `availability/${availabilityId(fixture.id, profile.uid)}` : null);
  if (!profile) return null;
  return (
    <Segmented
      label="My availability"
      size="sm"
      value={mine.data?.status ?? null}
      onChange={(s: RsvpStatus) =>
        setAvailability(fixture.id, teamId, profile, s)
          .then(() => toast.show(`Marked ${RSVP_LABELS[s].toLowerCase()}`))
          .catch((err) => toast.show(friendlyError(err), 'error'))
      }
      options={RSVP_STATUSES.map((s) => ({ value: s, label: RSVP_LABELS[s], tone: s === 'available' ? 'good' : s === 'maybe' ? 'meh' : 'bad' }))}
    />
  );
}

export default function Dashboard() {
  useTitle('Home');
  const { profile, memberships } = useAuth();
  const { invitations } = useInbox();
  const teamIds = memberships.map((m) => m.teamId).sort().slice(0, 30);
  const since = new Date(Date.now() - 12 * 3600 * 1000);
  const fixtures = useQueryData<Fixture>(teamIds.length ? `dash-fixtures-${teamIds.join(',')}` : null, () =>
    query(collection(db, 'fixtures'), where('teamIds', 'array-contains-any', teamIds), where('startsAt', '>=', since), orderBy('startsAt', 'asc')),
  );
  const upcoming = fixtures.data.filter((f) => f.status !== 'completed').slice(0, 6);
  const [next, ...rest] = upcoming;
  const myTeamFor = (f: Fixture) => f.teamIds.find((id) => teamIds.includes(id)) ?? null;
  const firstName = profile?.displayName.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-5xl sm:text-6xl">
            {greeting}, {firstName}
          </h1>
        </div>
        <OfflineNote show={fixtures.fromCache} />
      </header>

      {invitations.length > 0 && (
        <Link to="/notifications" className="press flex items-center gap-3 rounded-2xl bg-leather p-4 text-white">
          <Bell size={22} aria-hidden />
          <span className="flex-1 font-semibold">
            {invitations.length === 1 ? `${invitations[0].teamName} wants you in their squad` : `${invitations.length} teams have invited you`}
          </span>
          <ArrowUpRight size={20} aria-hidden />
        </Link>
      )}

      {/* Next match, front and centre */}
      <section aria-labelledby="next-h">
        <SectionTitle id="next-h" title="Next up" action={teamIds.length > 0 && <Link to="/fixtures" className="link text-sm">All fixtures</Link>} />
        {fixtures.loading ? (
          <SkeletonList rows={1} height={170} />
        ) : !teamIds.length ? (
          <EmptyState
            title="Find your team"
            body="Create a team for your club, or open the invite link your captain shared. Pending invitations show in your inbox."
            action={<ButtonLink to="/teams/new" icon={<Plus size={18} aria-hidden />}>Create a team</ButtonLink>}
          />
        ) : !next ? (
          <EmptyState title="No fixtures scheduled" body="When a match is scheduled you'll see it here and get a notification." />
        ) : (
          <div className="flex flex-col gap-3">
            <FixtureCard fixture={next} />
            {next.status === 'scheduled' && myTeamFor(next) && (
              <div className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <p className="shrink-0 font-semibold">Can you play?</p>
                <div className="flex-1">
                  <QuickRsvp fixture={next} teamId={myTeamFor(next)!} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {rest.length > 0 && (
        <section aria-labelledby="later-h">
          <SectionTitle id="later-h" title="Later" />
          <ul className="grid gap-3 lg:grid-cols-2">
            {rest.map((f) => (
              <li key={f.id}>
                <FixtureCard fixture={f} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {memberships.length > 0 && (
        <section aria-labelledby="teams-h">
          <SectionTitle id="teams-h" title="My teams" action={<Link to="/teams/new" className="link text-sm">New team</Link>} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link to={`/teams/${m.teamId}`} className="card press flex items-center justify-between gap-3 p-4 font-display text-xl font-bold uppercase hover:border-ink-muted">
                  <TeamChip teamId={m.teamId} size={36} />
                  <Badge>{ROLE_LABELS[m.role]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="turf flex flex-col items-start gap-3 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl text-chalk">Running a cup?</h2>
          <p className="text-chalk/85">Draw fixtures, keep a live table with NRR and share a public link.</p>
        </div>
        <ButtonLink to="/tournaments" className="!bg-chalk !text-pitch-900">
          Tournaments
        </ButtonLink>
      </section>
    </div>
  );
}
