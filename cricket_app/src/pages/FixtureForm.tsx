/**
 * Create a team fixture (/fixtures/new?team=ID) or edit one (/fixtures/:id/edit).
 * Editing also offers cancel (with a reason players will see) and reinstate.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Ban, RotateCcw, Search } from 'lucide-react';
import { TeamName } from '../components/TeamChip';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Segmented,
  SelectField,
  TeamBadge,
  TextAreaField,
  TextField,
} from '../components/ui';
import { actorOf, friendlyError } from '../data/common';
import { cancelFixture, createFixture, externalSide, fixtureTitle, reinstateFixture, teamSide, updateFixture } from '../data/fixtures';
import { searchTeams } from '../data/search';
import { getTeam } from '../data/teams';
import { canManageMatches, useAuth } from '../hooks/useAuth';
import { useDocData } from '../hooks/useFirestore';
import { useTitle, useToast } from '../hooks/useUi';
import { MATCH_TYPES, type Fixture, type MatchType, type Team, type Tournament, type WithId } from '../lib/types';
import { fieldErrors, fixtureSchema } from '../lib/validation';

const DEFAULT_OVERS: Record<MatchType, number> = { T20: 20, ODI: 50, Custom: 30 };

const pad = (n: number) => String(n).padStart(2, '0');
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Next Saturday at 10:00, a sensible default for club cricket. */
function nextSaturday(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(10, 0, 0, 0);
  return d;
}

export default function FixtureForm() {
  const { fixtureId } = useParams();
  const fixture = useDocData<Fixture>(fixtureId ? `fixtures/${fixtureId}` : null);
  if (fixtureId) {
    if (fixture.loading) return <PageLoader />;
    if (fixture.error) return <ErrorState error={fixture.error} />;
    if (!fixture.data) return <EmptyState title="Fixture not found" />;
    return <EditFixture fixture={fixture.data} />;
  }
  return <NewFixture />;
}

/* ── Shared match-details fields ───────────────────────────────────────── */

interface Details {
  date: string;
  time: string;
  venue: string;
  overs: string;
  matchType: MatchType;
  notes: string;
}

function DetailsFields({ value, onChange, errors }: { value: Details; onChange: (d: Details) => void; errors: Record<string, string> }) {
  const set = <K extends keyof Details>(k: K, v: Details[K]) => onChange({ ...value, [k]: v });
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Date" type="date" value={value.date} onChange={(e) => set('date', e.target.value)} error={errors.date} required />
        <TextField label="Start time" type="time" value={value.time} onChange={(e) => set('time', e.target.value)} error={errors.time} required />
      </div>
      <TextField label="Venue" optional value={value.venue} maxLength={120} onChange={(e) => set('venue', e.target.value)} error={errors.venue} />
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Match type"
          value={value.matchType}
          onChange={(e) => {
            const mt = e.target.value as MatchType;
            onChange({ ...value, matchType: mt, overs: mt === 'Custom' ? value.overs : String(DEFAULT_OVERS[mt]) });
          }}
          options={MATCH_TYPES.map((m) => ({ value: m, label: m === 'Custom' ? 'Custom' : `${m} (${DEFAULT_OVERS[m]} overs)` }))}
        />
        <TextField label="Overs per side" inputMode="numeric" value={value.overs} onChange={(e) => set('overs', e.target.value.replace(/\D/g, '').slice(0, 3))} error={errors.overs} />
      </div>
      <TextAreaField label="Notes for players" optional value={value.notes} maxLength={1000} onChange={(e) => set('notes', e.target.value)} hint="Meet time, kit colour, parking…" error={errors.notes} />
    </>
  );
}

function validate(details: Details, opponentName: string) {
  return fixtureSchema.safeParse({
    opponentName,
    date: details.date,
    time: details.time,
    venue: details.venue,
    overs: Number(details.overs),
    matchType: details.matchType,
    notes: details.notes,
  });
}

/* ── New ───────────────────────────────────────────────────────────────── */

function NewFixture() {
  useTitle('New fixture');
  const [params] = useSearchParams();
  const { profile, memberships } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const manageable = memberships.filter((m) => canManageMatches(m.role));
  const [teamId, setTeamId] = useState(() => {
    const wanted = params.get('team');
    return manageable.find((m) => m.teamId === wanted)?.teamId ?? manageable[0]?.teamId ?? '';
  });
  const team = useDocData<Team>(teamId ? `teams/${teamId}` : null);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const manageableKey = manageable.map((m) => m.teamId).join(',');
  useEffect(() => {
    if (!manageableKey) return;
    let cancelled = false;
    Promise.all(manageableKey.split(',').map(getTeam)).then((teams) => {
      if (!cancelled) setTeamNames(Object.fromEntries(teams.flatMap((t) => (t ? [[t.id, t.name]] : []))));
    });
    return () => {
      cancelled = true;
    };
  }, [manageableKey]);

  const [venueSide, setVenueSide] = useState<'home' | 'away'>('home');
  const [opponentKind, setOpponentKind] = useState<'external' | 'app'>('external');
  const [opponentName, setOpponentName] = useState('');
  const [opponentTeam, setOpponentTeam] = useState<WithId<Team> | null>(null);
  const [teamQuery, setTeamQuery] = useState('');
  const [teamResults, setTeamResults] = useState<WithId<Team>[] | null>(null);
  const start = useMemo(nextSaturday, []);
  const [details, setDetails] = useState<Details>({ date: dateInput(start), time: '10:00', venue: '', overs: '20', matchType: 'T20', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Default the venue to our home ground when we're at home
  useEffect(() => {
    if (team.data && venueSide === 'home') setDetails((d) => (d.venue ? d : { ...d, venue: team.data!.homeGround }));
  }, [team.data, venueSide]);

  if (!manageable.length) {
    return <ErrorState error="permission-denied: only owners, admins and captains can schedule fixtures." />;
  }

  const findTeams = async (e?: { preventDefault(): void }) => {
    e?.preventDefault();
    try {
      setTeamResults((await searchTeams(teamQuery)).filter((t) => t.id !== teamId));
    } catch (err) {
      toast.show(friendlyError(err), 'error');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !team.data) return;
    const oppName = opponentKind === 'app' ? opponentTeam?.name ?? '' : opponentName;
    const parsed = validate(details, oppName);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const us = teamSide({ ...team.data, id: teamId });
      const them = opponentKind === 'app' && opponentTeam ? teamSide(opponentTeam) : externalSide(oppName);
      const id = await createFixture(
        teamId,
        {
          home: venueSide === 'home' ? us : them,
          away: venueSide === 'home' ? them : us,
          startsAt: new Date(`${details.date}T${details.time}`),
          venue: parsed.data.venue,
          overs: parsed.data.overs,
          matchType: parsed.data.matchType,
          notes: parsed.data.notes,
        },
        actorOf(profile),
      );
      toast.show('Fixture scheduled. Your squad has been notified.');
      navigate(`/fixtures/${id}`, { replace: true });
    } catch (err) {
      toast.show(friendlyError(err), 'error');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Fixtures" title="New fixture" />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {manageable.length > 1 ? (
          <SelectField
            label="Your team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            options={manageable.map((m) => ({ value: m.teamId, label: teamNames[m.teamId] ?? 'Loading…' }))}
            hint="Teams where you're an owner, admin or captain"
          />
        ) : null}
        {team.data && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <TeamBadge name={team.data.name} shortName={team.data.shortName} logo={team.data.logoDataUrl} colors={team.data.colors} size={40} />
            <span className="font-display text-2xl font-bold uppercase">{team.data.name}</span>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold">We are</p>
          <Segmented
            label="Home or away"
            value={venueSide}
            onChange={setVenueSide}
            options={[
              { value: 'home', label: 'Home' },
              { value: 'away', label: 'Away' },
            ]}
          />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-semibold">Opponent</legend>
          <Segmented
            label="Opponent type"
            value={opponentKind}
            onChange={setOpponentKind}
            options={[
              { value: 'external', label: 'Type a name' },
              { value: 'app', label: 'Team on CricketHub' },
            ]}
          />
          {opponentKind === 'external' ? (
            <TextField label="Opponent name" value={opponentName} maxLength={60} onChange={(e) => setOpponentName(e.target.value)} error={errors.opponentName} />
          ) : opponentTeam ? (
            <div className="flex items-center gap-3 rounded-xl border border-accent bg-accent-soft p-3">
              <TeamBadge name={opponentTeam.name} shortName={opponentTeam.shortName} logo={opponentTeam.logoDataUrl} colors={opponentTeam.colors} size={36} />
              <span className="flex-1 font-semibold">{opponentTeam.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setOpponentTeam(null)}>
                Change
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField label="Search teams" value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findTeams(e)} error={errors.opponentName} />
                </div>
                <Button variant="secondary" icon={<Search size={16} aria-hidden />} onClick={() => findTeams()}>
                  Find
                </Button>
              </div>
              {teamResults && (
                <ul className="flex flex-col gap-1">
                  {teamResults.length === 0 && <li className="text-sm text-ink-muted">No teams found. Use “Type a name” instead.</li>}
                  {teamResults.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => setOpponentTeam(t)} className="press flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
                        <TeamBadge name={t.name} shortName={t.shortName} logo={t.logoDataUrl} colors={t.colors} size={32} />
                        <span className="font-semibold">{t.name}</span>
                        {t.homeGround && <span className="ml-auto truncate text-xs text-ink-muted">{t.homeGround}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </fieldset>

        <DetailsFields value={details} onChange={setDetails} errors={errors} />
        <Button type="submit" size="lg" loading={saving}>
          Schedule fixture
        </Button>
      </form>
    </div>
  );
}

/* ── Edit ──────────────────────────────────────────────────────────────── */

function EditFixture({ fixture }: { fixture: WithId<Fixture> }) {
  const { profile, roleIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const tournament = useDocData<Tournament>(fixture.tournamentId ? `tournaments/${fixture.tournamentId}` : null);
  const start = fixture.startsAt.toDate();
  const [details, setDetails] = useState<Details>({
    date: dateInput(start),
    time: timeInput(start),
    venue: fixture.venue,
    overs: String(fixture.overs),
    matchType: fixture.matchType,
    notes: fixture.notes,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  useTitle(`Edit ${fixtureTitle(fixture)}`);

  const canEdit =
    (fixture.ownerTeamId && canManageMatches(roleIn(fixture.ownerTeamId))) ||
    (tournament.data && profile && (tournament.data.ownerUid === profile.uid || tournament.data.adminUids.includes(profile.uid)));
  if (fixture.tournamentId && tournament.loading) return <PageLoader />;
  if (!canEdit || !profile) return <ErrorState error="permission-denied" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = validate(details, 'n/a');
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      await updateFixture(
        fixture,
        { startsAt: new Date(`${details.date}T${details.time}`), venue: parsed.data.venue, overs: parsed.data.overs, matchType: parsed.data.matchType, notes: parsed.data.notes },
        actorOf(profile),
      );
      toast.show('Fixture updated. Players have been told.');
      navigate(`/fixtures/${fixture.id}`);
    } catch (err) {
      toast.show(friendlyError(err), 'error');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Edit fixture" title={fixtureTitle(fixture)}>
        {fixture.status === 'cancelled' && (
          <p className="mt-2">
            <Badge tone="danger">Cancelled</Badge> <span className="text-ink-muted">{fixture.cancelReason}</span>
          </p>
        )}
        {fixture.ownerTeamId && (
          <p className="mt-1 text-sm text-ink-muted">
            Organised by <TeamName teamId={fixture.ownerTeamId} />
          </p>
        )}
      </PageHeader>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <DetailsFields value={details} onChange={setDetails} errors={errors} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" loading={saving}>
            Save changes
          </Button>
          {fixture.status === 'scheduled' && (
            <Button variant="danger" size="lg" icon={<Ban size={18} aria-hidden />} onClick={() => setCancelling(true)}>
              Cancel fixture
            </Button>
          )}
          {fixture.status === 'cancelled' && (
            <Button
              variant="secondary"
              size="lg"
              icon={<RotateCcw size={18} aria-hidden />}
              onClick={() =>
                reinstateFixture(fixture, actorOf(profile))
                  .then(() => toast.show('Fixture reinstated'))
                  .catch((err) => toast.show(friendlyError(err), 'error'))
              }
            >
              Reinstate
            </Button>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={cancelling}
        danger
        onClose={() => setCancelling(false)}
        title="Cancel this fixture?"
        body="Players will be notified and will see your reason on the fixture."
        reasonLabel="Reason"
        confirmLabel="Cancel fixture"
        onConfirm={async (reason) => {
          await cancelFixture(fixture, reason, actorOf(profile));
          toast.show('Fixture cancelled');
          navigate(`/fixtures/${fixture.id}`);
        }}
      />
    </div>
  );
}
