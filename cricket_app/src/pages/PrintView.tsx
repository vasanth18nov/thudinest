/**
 * Printable sheets: a team's fixtures (/print/team/:id) or a tournament's points table and
 * fixtures (/print/tournament/:id). Black on white, no chrome, one tap to print.
 */
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button, EmptyState, PageLoader } from '../components/ui';
import { db } from '../firebase';
import { useDocData, useQueryData } from '../hooks/useFirestore';
import { useTournament } from '../hooks/useTournament';
import { useTitle } from '../hooks/useUi';
import { formatScore } from '../lib/cricket';
import { formatNrr } from '../lib/pointsTable';
import type { Fixture, Team, WithId } from '../lib/types';

function Toolbar() {
  const navigate = useNavigate();
  return (
    <div className="no-print mb-6 flex gap-2">
      <Button variant="ghost" icon={<ArrowLeft size={16} aria-hidden />} onClick={() => navigate(-1)}>
        Back
      </Button>
      <Button icon={<Printer size={16} aria-hidden />} onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}

function FixtureTable({ fixtures }: { fixtures: WithId<Fixture>[] }) {
  if (!fixtures.length) return <p>No fixtures.</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-ink text-left">
          <th className="py-1.5 pr-2">#</th>
          <th className="py-1.5 pr-2">Date</th>
          <th className="py-1.5 pr-2">Time</th>
          <th className="py-1.5 pr-2">Match</th>
          <th className="py-1.5 pr-2">Venue</th>
          <th className="py-1.5">Result</th>
        </tr>
      </thead>
      <tbody>
        {fixtures.map((f, i) => {
          const d = f.startsAt.toDate();
          return (
            <tr key={f.id} className="break-inside-avoid border-b border-line align-top">
              <td className="py-1.5 pr-2 tabular-nums">{f.stage?.matchNo ?? i + 1}</td>
              <td className="whitespace-nowrap py-1.5 pr-2">{d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
              <td className="whitespace-nowrap py-1.5 pr-2">{d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
              <td className="py-1.5 pr-2 font-semibold">
                {f.home.name || f.home.placeholder} v {f.away.name || f.away.placeholder}
                {f.stage && <span className="block text-xs font-normal">{f.stage.roundLabel}</span>}
              </td>
              <td className="py-1.5 pr-2">{f.venue}</td>
              <td className="py-1.5">
                {f.status === 'cancelled'
                  ? `Cancelled${f.cancelReason ? `: ${f.cancelReason}` : ''}`
                  : f.result
                    ? `${formatScore(f.result.home)} / ${formatScore(f.result.away)} — ${f.result.summary}`
                    : ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TeamSheet({ teamId }: { teamId: string }) {
  const team = useDocData<Team>(`teams/${teamId}`);
  const fixtures = useQueryData<Fixture>(`team-fixtures-${teamId}`, () =>
    query(collection(db, 'fixtures'), where('teamIds', 'array-contains', teamId), orderBy('startsAt', 'asc')),
  );
  useTitle(team.data ? `${team.data.name} fixtures` : 'Print');
  if (team.loading || fixtures.loading) return <PageLoader />;
  if (!team.data) return <EmptyState title="Team not found" />;
  return (
    <article>
      <Toolbar />
      <h1 className="text-5xl">{team.data.name}</h1>
      <p className="mb-6 text-ink-muted">Fixtures and results · printed {new Date().toLocaleDateString()}</p>
      <FixtureTable fixtures={fixtures.data} />
    </article>
  );
}

function TournamentSheet({ tournamentId }: { tournamentId: string }) {
  const { tournament, fixtures, tables, teams } = useTournament(tournamentId);
  useTitle(tournament.data ? `${tournament.data.name} — print` : 'Print');
  if (tournament.loading || fixtures.loading || teams.loading) return <PageLoader />;
  const t = tournament.data;
  if (!t) return <EmptyState title="Tournament not found" />;
  return (
    <article className="flex flex-col gap-8">
      <div>
        <Toolbar />
        <h1 className="text-5xl">{t.name}</h1>
        <p className="text-ink-muted">
          {t.startDate} – {t.endDate} · {t.matchType} · {t.overs} overs · printed {new Date().toLocaleDateString()}
        </p>
      </div>
      {tables.map((g) => (
        <section key={g.group ?? 'all'} className="break-inside-avoid">
          <h2 className="mb-2 text-3xl">{g.group ? `Group ${g.group}` : 'Points table'}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-right">
                <th className="py-1.5 pr-2 text-left">#</th>
                <th className="py-1.5 pr-2 text-left">Team</th>
                <th className="py-1.5 pr-2">P</th>
                <th className="py-1.5 pr-2">W</th>
                <th className="py-1.5 pr-2">L</th>
                <th className="py-1.5 pr-2">T</th>
                <th className="py-1.5 pr-2">NR</th>
                <th className="py-1.5 pr-2">Pts</th>
                <th className="py-1.5">NRR</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={r.teamId} className="border-b border-line text-right tabular-nums">
                  <td className="py-1.5 pr-2 text-left">{i + 1}</td>
                  <td className="py-1.5 pr-2 text-left font-semibold">{r.name}</td>
                  <td className="py-1.5 pr-2">{r.played}</td>
                  <td className="py-1.5 pr-2">{r.won}</td>
                  <td className="py-1.5 pr-2">{r.lost}</td>
                  <td className="py-1.5 pr-2">{r.tied}</td>
                  <td className="py-1.5 pr-2">{r.noResult}</td>
                  <td className="py-1.5 pr-2 font-bold">{r.points}</td>
                  <td className="py-1.5">{formatNrr(r.nrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section>
        <h2 className="mb-2 text-3xl">Fixtures</h2>
        <FixtureTable fixtures={fixtures.data} />
      </section>
    </article>
  );
}

export default function PrintView() {
  const { teamId, tournamentId } = useParams();
  if (teamId) return <TeamSheet teamId={teamId} />;
  if (tournamentId) return <TournamentSheet tournamentId={tournamentId} />;
  return <EmptyState title="Nothing to print" />;
}
