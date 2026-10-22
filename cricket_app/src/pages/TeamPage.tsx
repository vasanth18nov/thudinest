/**
 * Team page. Public and read-only for visitors; members see availability and activity;
 * owners and admins manage the squad and settings; captains manage fixtures.
 */
import { useMemo, useState } from 'react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Crown, LogOut, MapPin, Plus, Trash2, UserPlus } from 'lucide-react';
import { ActivityFeed } from '../components/ActivityFeed';
import { FixtureCard } from '../components/FixtureCard';
import { FixtureList } from '../components/FixtureList';
import { ShareButton } from '../components/Share';
import { TeamForm } from '../components/TeamForm';
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageLoader,
  SectionTitle,
  SelectField,
  SkeletonList,
  Stat,
  TabPanel,
  Tabs,
  TeamBadge,
} from '../components/ui';
import { actorOf, friendlyError } from '../data/common';
import { changeRole, deleteTeam, leaveTeam, removeMember, transferOwnership, updateTeam } from '../data/teams';
import { db } from '../firebase';
import { canAdminTeam, canManageMatches, useAuth } from '../hooks/useAuth';
import { useDocData, useQueryData } from '../hooks/useFirestore';
import { useTitle, useToast } from '../hooks/useUi';
import { aggregateCareer, teamRecord } from '../lib/stats';
import { PLAYER_ROLE_LABELS, ROLE_LABELS } from '../lib/text';
import { TEAM_ROLES, type Fixture, type MatchResult, type PlayerMatchStats, type Team, type TeamMember, type TeamRole, type WithId } from '../lib/types';

type Tab = 'overview' | 'squad' | 'fixtures' | 'activity' | 'settings';
const ROLE_ORDER: Record<TeamRole, number> = { owner: 0, captain: 1, viceCaptain: 2, admin: 3, player: 4 };

export default function TeamPage() {
  const { teamId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { status, profile, roleIn } = useAuth();
  const role = roleIn(teamId);
  const isMember = role !== null;

  const team = useDocData<Team>(`teams/${teamId}`);
  const roster = useQueryData<TeamMember>(`roster-${teamId}`, () => query(collection(db, 'teamMembers'), where('teamId', '==', teamId)));
  const fixtures = useQueryData<Fixture>(`team-fixtures-${teamId}`, () =>
    query(collection(db, 'fixtures'), where('teamIds', 'array-contains', teamId), orderBy('startsAt', 'asc')),
  );
  const results = useQueryData<MatchResult>(`team-results-${teamId}`, () =>
    query(collection(db, 'matchResults'), where('teamIds', 'array-contains', teamId)),
  );
  useTitle(team.data?.name);

  const tabs = useMemo(() => {
    const t: { value: Tab; label: string; count?: number }[] = [
      { value: 'overview', label: 'Overview' },
      { value: 'squad', label: 'Squad', count: roster.data.length },
      { value: 'fixtures', label: 'Fixtures' },
    ];
    if (isMember) t.push({ value: 'activity', label: 'Activity' });
    if (canAdminTeam(role)) t.push({ value: 'settings', label: 'Settings' });
    return t;
  }, [isMember, role, roster.data.length]);
  const requested = params.get('tab') as Tab | null;
  const tab: Tab = tabs.some((t) => t.value === requested) ? requested! : 'overview';
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  if (team.loading) return <PageLoader />;
  if (team.error) return <ErrorState error={team.error} />;
  if (!team.data) {
    return <EmptyState title="Team not found" body="This team doesn't exist or has been deleted." action={<ButtonLink to="/">Home</ButtonLink>} />;
  }
  const t = team.data;
  const record = teamRecord(teamId, results.data);

  return (
    <div className="flex flex-col gap-6">
      <header
        className="turf relative -mx-4 overflow-hidden px-4 py-7 sm:mx-0 sm:rounded-3xl sm:px-7"
        style={{ boxShadow: `inset 0 6px 0 ${t.colors.primary}` }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <TeamBadge name={t.name} shortName={t.shortName} logo={t.logoDataUrl} colors={t.colors} size={88} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-willow">{role ? `You're ${ROLE_LABELS[role].toLowerCase()}` : 'Team'}</p>
            <h1 className="break-words text-5xl text-chalk sm:text-6xl">{t.name}</h1>
            {t.homeGround && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-chalk/85">
                <MapPin size={16} aria-hidden /> {t.homeGround}
              </p>
            )}
          </div>
          <div className="no-print flex w-full flex-wrap gap-2 sm:w-auto">
            <ShareButton path={`/teams/${teamId}`} title={t.name} />
            {canAdminTeam(role) && (
              <ButtonLink to={`/teams/${teamId}/invite`} size="sm" icon={<UserPlus size={16} aria-hidden />} className="!bg-chalk !text-pitch-900">
                Invite
              </ButtonLink>
            )}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-5 gap-2 rounded-2xl bg-black/25 p-3 text-center text-chalk">
          {(
            [
              ['P', record.played],
              ['W', record.won],
              ['L', record.lost],
              ['T', record.tied],
              ['NR', record.noResult],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-bold tracking-widest text-willow">{k}</dt>
              <dd className="score text-3xl">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {status === 'signedOut' && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Play for {t.name}? <Link to={`/signin?next=/teams/${teamId}`} className="link">Sign in</Link> and ask an admin for an invite link.
        </p>
      )}

      <div>
        <Tabs label="Team sections" tabs={tabs} value={tab} onChange={setTab} />
        <TabPanel value={tab}>
          {tab === 'overview' && <Overview teamId={teamId} fixtures={fixtures.data} loading={fixtures.loading} role={role} />}
          {tab === 'squad' && <Squad team={{ ...t, id: teamId }} roster={roster.data} loading={roster.loading} role={role} myUid={profile?.uid ?? null} signedIn={status === 'signedIn'} />}
          {tab === 'fixtures' && (
            <div className="flex flex-col gap-4">
              {canManageMatches(role) && (
                <ButtonLink to={`/fixtures/new?team=${teamId}`} icon={<Plus size={18} aria-hidden />} className="self-start">
                  New fixture
                </ButtonLink>
              )}
              <FixtureList
                fixtures={fixtures.data}
                loading={fixtures.loading}
                error={fixtures.error}
                fromCache={fixtures.fromCache}
                exportName={t.name}
                printPath={`/print/team/${teamId}`}
                empty={<EmptyState title="No fixtures yet" body={canManageMatches(role) ? 'Schedule your first match.' : 'Fixtures will appear here once scheduled.'} />}
              />
            </div>
          )}
          {tab === 'activity' && <ActivityFeed scope="teams" id={teamId} />}
          {tab === 'settings' && profile && <Settings team={{ ...t, id: teamId }} role={role} />}
        </TabPanel>
      </div>
    </div>
  );
}

function Overview({ teamId, fixtures, loading, role }: { teamId: string; fixtures: WithId<Fixture>[]; loading: boolean; role: TeamRole | null }) {
  const now = Date.now() - 12 * 3600 * 1000;
  const next = fixtures.filter((f) => f.status === 'scheduled' && f.startsAt.toMillis() >= now).slice(0, 3);
  const recent = fixtures.filter((f) => f.status === 'completed').slice(-3).reverse();
  if (loading) return <SkeletonList rows={3} height={104} />;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="next-h">
        <SectionTitle
          id="next-h"
          title="Coming up"
          action={canManageMatches(role) && <ButtonLink to={`/fixtures/new?team=${teamId}`} size="sm" variant="secondary" icon={<Plus size={16} aria-hidden />}>Fixture</ButtonLink>}
        />
        {next.length ? (
          <ul className="flex flex-col gap-3">
            {next.map((f) => (
              <li key={f.id}>
                <FixtureCard fixture={f} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No upcoming fixtures" />
        )}
      </section>
      <section aria-labelledby="recent-h">
        <SectionTitle id="recent-h" title="Recent results" />
        {recent.length ? (
          <ul className="flex flex-col gap-3">
            {recent.map((f) => (
              <li key={f.id}>
                <FixtureCard fixture={f} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No results yet" />
        )}
      </section>
    </div>
  );
}

function Squad({
  team,
  roster,
  loading,
  role,
  myUid,
  signedIn,
}: {
  team: WithId<Team>;
  roster: WithId<TeamMember>[];
  loading: boolean;
  role: TeamRole | null;
  myUid: string | null;
  signedIn: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<null | { kind: 'remove' | 'transfer' | 'leave'; member: WithId<TeamMember> }>(null);
  const stats = useQueryData<PlayerMatchStats>(`team-stats-${team.id}`, () => query(collection(db, 'playerStats'), where('teamId', '==', team.id)));

  const statsByUid = useMemo(() => {
    const grouped = new Map<string, PlayerMatchStats[]>();
    stats.data.forEach((s) => grouped.set(s.uid, [...(grouped.get(s.uid) ?? []), s]));
    return new Map([...grouped].map(([uid, lines]) => [uid, aggregateCareer(lines)]));
  }, [stats.data]);

  const sorted = [...roster].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.displayName.localeCompare(b.displayName));
  const isAdmin = canAdminTeam(role);
  const actor = profile ? actorOf(profile) : null;

  const onRole = async (m: WithId<TeamMember>, next: Exclude<TeamRole, 'owner'>) => {
    if (!actor) return;
    try {
      await changeRole(team.id, m.uid, m.displayName, next, actor);
      toast.show(`${m.displayName} is now ${ROLE_LABELS[next].toLowerCase()}`);
    } catch (err) {
      toast.show(friendlyError(err), 'error');
    }
  };

  if (loading) return <SkeletonList rows={4} height={88} />;
  if (!roster.length) return <EmptyState title="No players yet" />;

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((m) => {
          const s = statsByUid.get(m.uid);
          const editable = isAdmin && m.role !== 'owner' && m.uid !== myUid;
          const name = signedIn ? (
            <Link to={`/players/${m.uid}`} className="hover:underline">
              {m.displayName}
            </Link>
          ) : (
            m.displayName
          );
          return (
            <li key={m.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar name={m.displayName} photoURL={m.photoURL} size={52} />
                  {m.jerseyNumber !== null && (
                    <span className="score absolute -bottom-1 -right-2 rounded-md bg-pitch-800 px-1 text-sm text-chalk">{m.jerseyNumber}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-bold uppercase">{name}</p>
                  <p className="text-sm text-ink-muted">{PLAYER_ROLE_LABELS[m.playerRole]}</p>
                </div>
                {m.role !== 'player' && <Badge tone={m.role === 'owner' || m.role === 'captain' ? 'accent' : 'neutral'}>{ROLE_LABELS[m.role]}</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 px-3 py-2 text-center">
                <Stat value={s?.matches ?? 0} label="Mat" />
                <Stat value={s?.runs ?? 0} label="Runs" />
                <Stat value={s?.wickets ?? 0} label="Wkts" />
              </div>
              {editable && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <SelectField
                      label={`Role for ${m.displayName}`}
                      value={m.role}
                      onChange={(e) => onRole(m, e.target.value as Exclude<TeamRole, 'owner'>)}
                      options={TEAM_ROLES.filter((r) => r !== 'owner').map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                    />
                  </div>
                  {role === 'owner' && (
                    <Button variant="ghost" size="md" aria-label={`Make ${m.displayName} owner`} title="Hand over ownership" onClick={() => setConfirm({ kind: 'transfer', member: m })}>
                      <Crown size={18} aria-hidden />
                    </Button>
                  )}
                  <Button variant="ghost" size="md" aria-label={`Remove ${m.displayName}`} title="Remove from team" onClick={() => setConfirm({ kind: 'remove', member: m })}>
                    <Trash2 size={18} aria-hidden />
                  </Button>
                </div>
              )}
              {m.uid === myUid && m.role !== 'owner' && (
                <Button variant="ghost" size="sm" icon={<LogOut size={16} aria-hidden />} onClick={() => setConfirm({ kind: 'leave', member: m })}>
                  Leave team
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {role === 'owner' && <p className="mt-4 text-sm text-ink-muted">You own this team. To leave it, hand ownership to another member with the crown button first.</p>}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        danger={confirm?.kind !== 'transfer'}
        title={confirm?.kind === 'remove' ? 'Remove player?' : confirm?.kind === 'transfer' ? 'Hand over ownership?' : 'Leave team?'}
        body={
          confirm?.kind === 'remove'
            ? `${confirm.member.displayName} will lose access to ${team.name}. Their stats stay on old scorecards.`
            : confirm?.kind === 'transfer'
              ? `${confirm?.member.displayName} will become the owner and you'll become an admin.`
              : `You'll stop seeing ${team.name}'s fixtures. An admin can invite you back.`
        }
        confirmLabel={confirm?.kind === 'remove' ? 'Remove' : confirm?.kind === 'transfer' ? 'Hand over' : 'Leave'}
        onConfirm={async () => {
          if (!confirm || !actor) return;
          try {
            if (confirm.kind === 'remove') await removeMember(team.id, confirm.member.uid, confirm.member.displayName, actor);
            if (confirm.kind === 'transfer') await transferOwnership(team.id, confirm.member.uid, confirm.member.displayName, actor);
            if (confirm.kind === 'leave') {
              await leaveTeam(team.id, actor);
              navigate('/teams');
            }
          } catch (err) {
            throw new Error(friendlyError(err));
          }
        }}
      />
    </>
  );
}

function Settings({ team, role }: { team: WithId<Team>; role: TeamRole | null }) {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  if (!profile) return null;
  return (
    <div className="flex flex-col gap-10">
      <TeamForm
        initial={{ name: team.name, shortName: team.shortName, homeGround: team.homeGround, colors: team.colors, logoDataUrl: team.logoDataUrl }}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          try {
            await updateTeam(team.id, input, actorOf(profile));
            toast.show('Team updated');
          } catch (err) {
            throw new Error(friendlyError(err));
          }
        }}
      />
      {role === 'owner' && (
        <section className="rounded-2xl border border-leather/40 p-5">
          <h2 className="text-2xl text-danger">Danger zone</h2>
          <p className="mb-3 text-ink-muted">Deleting the team removes the roster. Past fixtures and scorecards stay so opponents' records are intact.</p>
          <Button variant="danger" icon={<Trash2 size={16} aria-hidden />} onClick={() => setDeleting(true)}>
            Delete team
          </Button>
          <ConfirmDialog
            open={deleting}
            danger
            onClose={() => setDeleting(false)}
            title={`Delete ${team.name}?`}
            body="This cannot be undone."
            confirmLabel="Delete team"
            onConfirm={async () => {
              try {
                await deleteTeam(team.id);
                toast.show('Team deleted');
                navigate('/teams', { replace: true });
              } catch (err) {
                throw new Error(friendlyError(err));
              }
            }}
          />
        </section>
      )}
    </div>
  );
}
