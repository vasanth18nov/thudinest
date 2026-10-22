/** A fixture: public scoreboard header and scorecard; squads, RSVP and actions for members. */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CalendarDays, ClipboardList, Clock, MapPin, Pencil, Trophy, Undo2 } from 'lucide-react';
import { Scorecard } from '../components/Scorecard';
import { ShareButton } from '../components/Share';
import { TeamMatchPanel } from '../components/TeamMatchPanel';
import { Badge, Button, ButtonLink, ConfirmDialog, EmptyState, ErrorState, OfflineNote, PageLoader, SectionTitle, TeamBadge } from '../components/ui';
import { actorOf, friendlyError } from '../data/common';
import { fixtureTitle } from '../data/fixtures';
import { undoLastResult } from '../data/results';
import { publicUrl } from '../firebase';
import { canManageMatches, useAuth } from '../hooks/useAuth';
import { useDocData } from '../hooks/useFirestore';
import { useTitle, useToast } from '../hooks/useUi';
import { formatScore } from '../lib/cricket';
import { downloadText, slug } from '../lib/download';
import { fixtureIcs } from '../lib/ics';
import type { Fixture, FixtureSide, MatchResult, Tournament, WithId } from '../lib/types';

function SideBlock({ side, score, won, align }: { side: FixtureSide; score: string | null; won: boolean; align: 'left' | 'right' }) {
  const label = side.name || side.placeholder || 'TBD';
  const content = (
    <>
      <TeamBadge name={label} shortName={side.shortName} colors={side.color ? { primary: side.color, secondary: '#f7f4ea' } : null} size={64} />
      <span className={`font-display text-2xl font-black uppercase leading-none sm:text-4xl ${side.name ? '' : 'italic opacity-70'}`}>{label}</span>
      {score && <span className={`score text-3xl sm:text-5xl ${won ? 'text-willow' : 'text-chalk/75'}`}>{score}</span>}
    </>
  );
  const cls = `flex min-w-0 flex-1 flex-col gap-2 ${align === 'right' ? 'items-end text-right' : 'items-start'}`;
  return side.teamId ? (
    <Link to={`/teams/${side.teamId}`} className={`${cls} hover:underline`}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export default function FixturePage() {
  const { fixtureId = '' } = useParams();
  const { profile, status, roleIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fixture = useDocData<Fixture>(`fixtures/${fixtureId}`);
  const result = useDocData<MatchResult>(`matchResults/${fixtureId}`);
  const tournament = useDocData<Tournament>(fixture.data?.tournamentId ? `tournaments/${fixture.data.tournamentId}` : null);
  const [undoing, setUndoing] = useState(false);
  useTitle(fixture.data ? fixtureTitle(fixture.data) : 'Fixture');

  if (fixture.loading) return <PageLoader />;
  if (fixture.error) return <ErrorState error={fixture.error} />;
  if (!fixture.data) return <EmptyState title="Fixture not found" body="It may have been deleted or regenerated." action={<ButtonLink to="/">Home</ButtonLink>} />;

  const f = fixture.data;
  const t = tournament.data;
  const isOrganiser =
    (!!f.ownerTeamId && canManageMatches(roleIn(f.ownerTeamId))) ||
    (!!t && !!profile && (t.ownerUid === profile.uid || t.adminUids.includes(profile.uid)));
  const start = f.startsAt.toDate();
  const r = f.result;
  const won = r ? (r.winner === 'home' || r.winner === 'away' ? r.winner : r.advancing) : null;
  const sidesKnown = !!(f.home.name && f.away.name);

  return (
    <div className="flex flex-col gap-6">
      {/* Scoreboard */}
      <header className="turf relative -mx-4 overflow-hidden px-4 pb-6 pt-5 sm:mx-0 sm:rounded-3xl sm:px-7">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-chalk/90">
          {f.tournamentId && (
            <Link to={`/tournaments/${f.tournamentId}`} className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 font-semibold hover:bg-black/40">
              <Trophy size={14} aria-hidden /> {f.tournamentName}
            </Link>
          )}
          {f.stage && <span className="rounded-full bg-black/25 px-3 py-1 font-semibold">{f.stage.kind === 'knockout' ? f.stage.roundLabel : f.stage.group ? `Group ${f.stage.group}` : `Round ${f.stage.round}`} · M{f.stage.matchNo}</span>}
          <span className="rounded-full bg-black/25 px-3 py-1 font-semibold">
            {f.matchType} · {f.overs} overs
          </span>
          {f.status === 'cancelled' && <Badge tone="live">Cancelled</Badge>}
          <OfflineNote show={fixture.fromCache} />
        </div>
        <div className="flex items-start gap-3">
          <SideBlock side={f.home} score={r ? formatScore(r.home) : null} won={won === 'home'} align="left" />
          <span className="score mt-5 shrink-0 text-2xl text-willow sm:text-4xl" aria-hidden>
            v
          </span>
          <SideBlock side={f.away} score={r ? formatScore(r.away) : null} won={won === 'away'} align="right" />
        </div>
        {r && <p className="mt-5 rounded-xl bg-black/25 px-4 py-2 text-center font-display text-xl font-bold uppercase tracking-wide text-willow">{r.summary}</p>}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-chalk/90">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={16} aria-hidden />
            {start.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={16} aria-hidden />
            {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
          {f.venue && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.venue)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <MapPin size={16} aria-hidden />
              {f.venue}
            </a>
          )}
        </div>
      </header>

      {f.status === 'cancelled' && (
        <div role="status" className="rounded-2xl border border-leather/40 bg-leather/10 p-4">
          <p className="font-display text-2xl font-bold uppercase text-danger">Match cancelled</p>
          {f.cancelReason && <p className="mt-1">{f.cancelReason}</p>}
        </div>
      )}
      {f.notes && (
        <p className="crease whitespace-pre-line text-ink">
          <span className="eyebrow mb-1 block">Notes</span>
          {f.notes}
        </p>
      )}

      {/* Actions */}
      <div className="no-print flex flex-wrap gap-2">
        <ShareButton path={`/fixtures/${f.id}`} title={fixtureTitle(f)} />
        {f.status === 'scheduled' && (
          <Button
            variant="secondary"
            size="sm"
            icon={<CalendarDays size={16} aria-hidden />}
            onClick={() =>
              downloadText(
                `${slug(fixtureTitle(f))}.ics`,
                fixtureIcs({ id: f.id, title: fixtureTitle(f), start, overs: f.overs, venue: f.venue, url: publicUrl(`/fixtures/${f.id}`), notes: f.notes }),
                'text/calendar;charset=utf-8',
              )
            }
          >
            Add to calendar
          </Button>
        )}
        {isOrganiser && (
          <>
            <ButtonLink to={`/fixtures/${f.id}/edit`} variant="secondary" size="sm" icon={<Pencil size={16} aria-hidden />}>
              Edit / cancel
            </ButtonLink>
            {f.status !== 'cancelled' && sidesKnown && (
              <ButtonLink to={`/fixtures/${f.id}/result`} size="sm" icon={<ClipboardList size={16} aria-hidden />}>
                {result.data ? 'Edit result' : 'Enter result'}
              </ButtonLink>
            )}
            {result.data && (
              <Button variant="ghost" size="sm" icon={<Undo2 size={16} aria-hidden />} onClick={() => setUndoing(true)}>
                Undo last result entry
              </Button>
            )}
          </>
        )}
      </div>

      {/* Scorecard */}
      {result.data && (
        <section aria-labelledby="sc-h">
          <SectionTitle id="sc-h" title="Scorecard" />
          {result.data.batting.length || result.data.bowling.length || result.data.innings ? (
            <Scorecard result={result.data} fixture={f} />
          ) : (
            <p className="text-ink-muted">Result recorded without a scorecard.</p>
          )}
        </section>
      )}

      {/* Squads */}
      {f.teamIds.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {f.teamIds.map((teamId) => {
            const role = roleIn(teamId);
            return <TeamMatchPanel key={teamId} fixture={f as WithId<Fixture>} teamId={teamId} isMember={role !== null} canManage={canManageMatches(role) || isOrganiser} />;
          })}
        </div>
      )}
      {status === 'signedOut' && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Playing in this match? <Link to={`/signin?next=/fixtures/${f.id}`} className="link">Sign in</Link> to mark your availability.
        </p>
      )}

      <ConfirmDialog
        open={undoing}
        danger
        onClose={() => setUndoing(false)}
        title="Undo the last result entry?"
        body={
          (result.data?.revision ?? 1) > 1
            ? 'The previous version of the result and scorecard will be restored. Stats and tables update straight away.'
            : 'The result and scorecard will be removed and the fixture goes back to scheduled. Stats and tables update straight away.'
        }
        confirmLabel="Undo"
        onConfirm={async () => {
          if (!profile) return;
          try {
            const outcome = await undoLastResult(f as WithId<Fixture>, actorOf(profile));
            toast.show(outcome === 'restored' ? 'Previous result restored' : 'Result removed');
            if (outcome === 'cleared') navigate(`/fixtures/${f.id}`, { replace: true });
          } catch (err) {
            throw new Error(friendlyError(err));
          }
        }}
      />
    </div>
  );
}
