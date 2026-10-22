/**
 * Organiser tools: settings, teams and seeding, fixture generation (with draw/shuffle),
 * the groups → knockout draw, co-admins and deletion.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowUp, Search, Shuffle, Trash2, UserPlus, X } from 'lucide-react';
import { TournamentForm } from '../components/TournamentForm';
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Segmented,
  SectionTitle,
  TeamBadge,
  TextField,
} from '../components/ui';
import { actorOf, friendlyError } from '../data/common';
import { searchTeams } from '../data/search';
import {
  addTournamentTeam,
  deleteTournament,
  generateFixtures,
  generateKnockoutStage,
  removeTournamentTeam,
  reorderTournamentTeams,
  setCoAdmins,
  updateTournament,
} from '../data/tournaments';
import { getUser, searchUsers } from '../data/users';
import { useAuth } from '../hooks/useAuth';
import { useTournament } from '../hooks/useTournament';
import { useTitle, useToast } from '../hooks/useUi';
import type { Team, Tournament, UserProfile, WithId } from '../lib/types';

const pad = (n: number) => String(n).padStart(2, '0');

export default function TournamentManage() {
  const { tournamentId = '' } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { tournament, teams, fixtures, tables } = useTournament(tournamentId);
  useTitle(tournament.data ? `Manage ${tournament.data.name}` : 'Manage');

  if (tournament.loading || teams.loading || fixtures.loading) return <PageLoader />;
  const t = tournament.data;
  if (!t) return <EmptyState title="Tournament not found" />;
  if (!profile || (t.ownerUid !== profile.uid && !t.adminUids.includes(profile.uid))) return <ErrorState error="permission-denied" />;

  const tw: WithId<Tournament> = t;
  const actor = actorOf(profile);
  const isOwner = t.ownerUid === profile.uid;
  const anyResults = fixtures.data.some((f) => f.status === 'completed');
  const groupFixtures = fixtures.data.filter((f) => f.stage?.kind === 'group');
  const groupStageDone = groupFixtures.length > 0 && groupFixtures.every((f) => f.status !== 'scheduled');

  return (
    <div className="flex flex-col gap-12">
      <PageHeader eyebrow="Manage tournament" title={t.name}>
        <p className="mt-2">
          <Link to={`/tournaments/${tournamentId}`} className="link">
            View public page
          </Link>
        </p>
      </PageHeader>

      <TeamsSection t={tw} teams={teams.data} locked={t.fixturesGenerated && anyResults} actor={actor} />

      <section aria-labelledby="gen-h" className="flex flex-col gap-4">
        <SectionTitle id="gen-h" title={t.fixturesGenerated ? 'Fixtures' : 'Draw the fixtures'} />
        <GenerateFixtures
          t={tw}
          teamCount={teams.data.length}
          generated={t.fixturesGenerated}
          disabledReason={anyResults ? 'Results are in, so the schedule is locked. Edit individual fixtures instead.' : teams.data.length < 2 ? 'Add at least two teams first.' : null}
          onGenerate={async (opts) => {
            const n = await generateFixtures(tw, teams.data, opts, actor);
            toast.show(`${n} fixtures created`);
          }}
        />
        {t.format === 'groups' && t.fixturesGenerated && (
          <div className="card flex flex-col gap-3 p-5">
            <h3 className="text-2xl">Knockout stage</h3>
            <p className="text-ink-muted">
              The top {t.qualifiersPerGroup} from each group go through, seeded so group winners meet runners-up from another group.
              {!groupStageDone && ' Some group fixtures are still to be played — you can draw now, but the standings may change.'}
            </p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {tables.map((g) => (
                <li key={g.group} className="rounded-lg bg-surface-2 px-2.5 py-1">
                  <span className="font-bold">Group {g.group}:</span> {g.rows.slice(0, t.qualifiersPerGroup).map((r) => r.shortName).join(', ')}
                </li>
              ))}
            </ul>
            <KnockoutDraw
              redraw={t.knockoutGenerated}
              onDraw={async (firstMatch, gap) => {
                const n = await generateKnockoutStage(tw, teams.data, tables.map((g) => g.rows.map((r) => r.teamId)), firstMatch, gap, actor);
                toast.show(`Knockout drawn: ${n} matches`);
              }}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="settings-h">
        <SectionTitle id="settings-h" title="Settings" />
        <div className="mb-5 max-w-md">
          <p className="mb-2 text-sm font-semibold">Status</p>
          <Segmented
            label="Tournament status"
            value={t.status}
            onChange={(status) =>
              updateTournament(tournamentId, { status }, actor)
                .then(() => toast.show(`Marked ${status}`))
                .catch((err) => toast.show(friendlyError(err), 'error'))
            }
            options={[
              { value: 'setup', label: 'Setting up' },
              { value: 'live', label: 'Live' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
        </div>
        <TournamentForm
          initial={t}
          locked={t.fixturesGenerated}
          submitLabel="Save settings"
          onSubmit={async (input) => {
            try {
              await updateTournament(tournamentId, input, actor);
              toast.show('Settings saved');
            } catch (err) {
              throw new Error(friendlyError(err));
            }
          }}
        />
      </section>

      <CoAdmins t={tw} isOwner={isOwner} actor={actor} />

      {isOwner && (
        <DangerZone
          onDelete={async () => {
            await deleteTournament(tw, teams.data);
            toast.show('Tournament deleted');
            navigate('/tournaments', { replace: true });
          }}
        />
      )}
    </div>
  );
}

/* ── Teams ─────────────────────────────────────────────────────────────── */

function TeamsSection({
  t,
  teams,
  locked,
  actor,
}: {
  t: WithId<Tournament>;
  teams: ReturnType<typeof useTournament>['teams']['data'];
  locked: boolean;
  actor: ReturnType<typeof actorOf>;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<'app' | 'external'>('app');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WithId<Team>[] | null>(null);
  const [externalName, setExternalName] = useState('');
  const [busy, setBusy] = useState(false);
  const full = teams.length >= t.teamCount;
  const enteredIds = new Set(teams.map((tt) => tt.teamId).filter(Boolean));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.show(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  };
  const search = (e: FormEvent) => {
    e.preventDefault();
    run(async () => setResults(await searchTeams(q)));
  };
  const nextSeed = teams.length ? Math.max(...teams.map((x) => x.seed)) + 1 : 1;
  const move = (i: number, delta: number) => {
    const order = [...teams];
    const [item] = order.splice(i, 1);
    order.splice(i + delta, 0, item);
    run(() => reorderTournamentTeams(order));
  };

  return (
    <section aria-labelledby="teams-h" className="flex flex-col gap-4">
      <SectionTitle id="teams-h" title={`Teams (${teams.length}/${t.teamCount})`} />
      {teams.length > 0 && (
        <ol className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {teams.map((tt, i) => (
            <li key={tt.id} className="flex items-center gap-3 px-3 py-2">
              <span className="score w-6 text-right text-ink-muted" title="Seed">
                {i + 1}
              </span>
              <TeamBadge name={tt.name} shortName={tt.shortName} colors={{ primary: tt.color, secondary: '#f7f4ea' }} size={32} />
              <span className="min-w-0 flex-1 truncate font-semibold">{tt.name}</span>
              {tt.group && <Badge>Group {tt.group}</Badge>}
              {!tt.teamId && (
                <span className="hidden sm:inline-flex">
                  <Badge tone="warn">External</Badge>
                </span>
              )}
              {!t.fixturesGenerated && (
                <span className="flex">
                  <button type="button" aria-label={`Move ${tt.name} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)} className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 disabled:opacity-30">
                    <ArrowUp size={16} aria-hidden />
                  </button>
                  <button type="button" aria-label={`Move ${tt.name} down`} disabled={i === teams.length - 1 || busy} onClick={() => move(i, 1)} className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 disabled:opacity-30">
                    <ArrowDown size={16} aria-hidden />
                  </button>
                </span>
              )}
              {!locked && (
                <button type="button" aria-label={`Remove ${tt.name}`} disabled={busy} onClick={() => run(() => removeTournamentTeam(t.id, tt, actor))} className="rounded-lg p-2 text-ink-muted hover:text-danger">
                  <X size={16} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {!t.fixturesGenerated && teams.length > 1 && <p className="text-sm text-ink-muted">Order is the seeding (1 = strongest) used when you draw without shuffling.</p>}

      {full ? (
        <p className="text-ink-muted">The tournament is full. Raise “Max teams” in settings to add more.</p>
      ) : locked ? null : (
        <div className="card flex flex-col gap-3 p-4">
          <Segmented
            label="Add a team"
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'app', label: 'Team on CricketHub' },
              { value: 'external', label: 'External team' },
            ]}
          />
          {kind === 'app' ? (
            <>
              <form onSubmit={search} className="flex items-end gap-2" role="search">
                <div className="flex-1">
                  <TextField label="Search teams" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <Button type="submit" variant="secondary" loading={busy} icon={<Search size={16} aria-hidden />}>
                  Find
                </Button>
              </form>
              {results && (
                <ul className="flex flex-col gap-1">
                  {results.length === 0 && <li className="text-sm text-ink-muted">No teams found.</li>}
                  {results.map((team) => (
                    <li key={team.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                      <TeamBadge name={team.name} shortName={team.shortName} logo={team.logoDataUrl} colors={team.colors} size={32} />
                      <span className="flex-1 font-semibold">{team.name}</span>
                      {enteredIds.has(team.id) ? (
                        <Badge>Entered</Badge>
                      ) : (
                        <Button size="sm" disabled={busy} onClick={() => run(() => addTournamentTeam(t, { team }, nextSeed, actor))}>
                          Add
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = externalName.trim();
                if (name.length < 2) return;
                setExternalName(''); // clear now so the next name can be typed straight away
                run(() => addTournamentTeam(t, { externalName: name }, nextSeed, actor));
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1">
                <TextField label="Team name" value={externalName} maxLength={60} onChange={(e) => setExternalName(e.target.value)} hint="For teams that don't use CricketHub" />
              </div>
              <Button type="submit" loading={busy}>
                Add
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Fixture generation ────────────────────────────────────────────────── */

function defaultStart(t: Tournament) {
  return { date: t.startDate, time: '10:00' };
}

function GenerateFixtures({
  t,
  teamCount,
  generated,
  disabledReason,
  onGenerate,
}: {
  t: Tournament;
  teamCount: number;
  generated: boolean;
  disabledReason: string | null;
  onGenerate: (opts: { shuffle: boolean; firstMatch: Date; daysBetweenRounds: number }) => Promise<void>;
}) {
  const [shuffle, setShuffle] = useState(false);
  const [{ date, time }, setStart] = useState(() => defaultStart(t));
  const [gap, setGap] = useState('7');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const go = async () => {
    setBusy(true);
    try {
      await onGenerate({ shuffle, firstMatch: new Date(`${date}T${time}`), daysBetweenRounds: Math.max(0, Number(gap) || 0) });
    } catch (err) {
      toast.show(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const summary =
    t.format === 'league'
      ? `${(teamCount * (teamCount - 1)) / (t.doubleRoundRobin ? 1 : 2)} league matches`
      : t.format === 'knockout'
        ? `${Math.max(0, teamCount - 1)} knockout matches`
        : `${t.groupCount} groups, then a knockout`;

  return (
    <div className="card flex flex-col gap-4 p-5">
      <p className="text-ink-muted">
        {teamCount} teams → <span className="font-semibold text-ink">{summary}</span>. Rounds are spaced {gap || 0} day{gap === '1' ? '' : 's'} apart; you can move any fixture afterwards.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="First round date" type="date" value={date} onChange={(e) => setStart((s) => ({ ...s, date: e.target.value }))} />
        <TextField label="Start time" type="time" value={time} onChange={(e) => setStart((s) => ({ ...s, time: e.target.value }))} />
        <TextField label="Days between rounds" inputMode="numeric" value={gap} onChange={(e) => setGap(e.target.value.replace(/\D/g, '').slice(0, 2))} hint="0 = all on one day" />
      </div>
      <Checkbox label="Shuffle the draw" hint="Random order instead of your seeding" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
      {disabledReason ? (
        <p className="text-sm font-semibold text-warn">{disabledReason}</p>
      ) : (
        <Button className="sm:self-start" loading={busy} icon={<Shuffle size={16} aria-hidden />} onClick={() => (generated ? setConfirming(true) : go())}>
          {generated ? 'Regenerate fixtures' : 'Generate fixtures'}
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        danger
        onClose={() => setConfirming(false)}
        title="Regenerate all fixtures?"
        body="The current schedule, including any date or venue edits and playing XIs, will be replaced."
        confirmLabel="Regenerate"
        onConfirm={go}
      />
    </div>
  );
}

function KnockoutDraw({ redraw, onDraw }: { redraw: boolean; onDraw: (first: Date, gap: number) => Promise<void> }) {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const [date, setDate] = useState(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  const [time, setTime] = useState('10:00');
  const [gap, setGap] = useState('7');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Knockout starts" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Start time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <TextField label="Days between rounds" inputMode="numeric" value={gap} onChange={(e) => setGap(e.target.value.replace(/\D/g, '').slice(0, 2))} />
      </div>
      <Button
        className="sm:self-start"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onDraw(new Date(`${date}T${time}`), Number(gap) || 0);
          } catch (err) {
            toast.show(friendlyError(err), 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        {redraw ? 'Redraw knockout' : 'Draw knockout'}
      </Button>
    </div>
  );
}

/* ── Co-admins ─────────────────────────────────────────────────────────── */

function CoAdmins({ t, isOwner, actor }: { t: WithId<Tournament>; isOwner: boolean; actor: ReturnType<typeof actorOf> }) {
  const toast = useToast();
  const [admins, setAdmins] = useState<WithId<UserProfile>[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WithId<UserProfile>[] | null>(null);
  const key = t.adminUids.join(',');

  useEffect(() => {
    let cancelled = false;
    Promise.all(t.adminUids.map(getUser)).then((users) => !cancelled && setAdmins(users.filter((u): u is WithId<UserProfile> => !!u)));
    return () => {
      cancelled = true;
    };
  }, [key]); // `key` stands in for t.adminUids

  const update = async (uids: string[], message: string) => {
    try {
      await setCoAdmins(t.id, uids, message, actor);
      toast.show('Co-admins updated');
    } catch (err) {
      toast.show(friendlyError(err), 'error');
    }
  };

  return (
    <section aria-labelledby="admins-h" className="flex flex-col gap-4">
      <SectionTitle id="admins-h" title="Co-admins" />
      <p className="text-ink-muted">Co-admins can edit fixtures and enter results. {isOwner ? '' : 'Only the owner can change this list.'}</p>
      <ul className="flex flex-col gap-2">
        {admins.map((a) => (
          <li key={a.uid} className="flex items-center gap-3">
            <Avatar name={a.displayName} photoURL={a.photoURL} size={32} />
            <span className="flex-1 font-semibold">{a.displayName}</span>
            {isOwner && (
              <Button variant="ghost" size="sm" icon={<Trash2 size={14} aria-hidden />} onClick={() => update(t.adminUids.filter((u) => u !== a.uid), `${actor.name} removed ${a.displayName} as co-admin`)}>
                Remove
              </Button>
            )}
          </li>
        ))}
        {!admins.length && <li className="text-sm text-ink-muted">No co-admins yet.</li>}
      </ul>
      {isOwner && (
        <div className="card flex flex-col gap-3 p-4">
          <form
            role="search"
            className="flex items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setResults(await searchUsers(q));
              } catch (err) {
                toast.show(friendlyError(err), 'error');
              }
            }}
          >
            <div className="flex-1">
              <TextField label="Find a player" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or exact email" />
            </div>
            <Button type="submit" variant="secondary" icon={<Search size={16} aria-hidden />}>
              Find
            </Button>
          </form>
          {results?.map((u) => (
            <div key={u.uid} className="flex items-center gap-3">
              <Avatar name={u.displayName} photoURL={u.photoURL} size={32} />
              <span className="flex-1 font-semibold">{u.displayName}</span>
              {u.uid === t.ownerUid || t.adminUids.includes(u.uid) ? (
                <Badge>Admin</Badge>
              ) : (
                <Button size="sm" icon={<UserPlus size={14} aria-hidden />} onClick={() => update([...t.adminUids, u.uid], `${actor.name} made ${u.displayName} a co-admin`)}>
                  Add
                </Button>
              )}
            </div>
          ))}
          {results && !results.length && <p className="text-sm text-ink-muted">No players found.</p>}
        </div>
      )}
    </section>
  );
}

function DangerZone({ onDelete }: { onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-leather/40 p-5">
      <h2 className="text-2xl text-danger">Danger zone</h2>
      <p className="mb-3 text-ink-muted">Delete the tournament and all its fixtures. Only possible before any results are entered.</p>
      <Button variant="danger" icon={<Trash2 size={16} aria-hidden />} onClick={() => setOpen(true)}>
        Delete tournament
      </Button>
      <ConfirmDialog
        open={open}
        danger
        onClose={() => setOpen(false)}
        title="Delete this tournament?"
        body="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await onDelete();
          } catch (err) {
            throw new Error(friendlyError(err));
          }
        }}
      />
    </section>
  );
}
