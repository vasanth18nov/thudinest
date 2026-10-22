/**
 * Public tournament page: anyone with the link can follow fixtures, the live points table
 * and the bracket without signing in. Organisers get a Manage button.
 */
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CalendarDays, Download, MapPin, Printer, Settings } from 'lucide-react';
import { ActivityFeed } from '../components/ActivityFeed';
import { Bracket } from '../components/Bracket';
import { FixtureList } from '../components/FixtureList';
import { PointsTable } from '../components/PointsTable';
import { ShareButton } from '../components/Share';
import { Badge, Button, ButtonLink, EmptyState, ErrorState, OfflineNote, PageLoader, TabPanel, Tabs, TeamBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTournament } from '../hooks/useTournament';
import { useTitle } from '../hooks/useUi';
import { downloadText, pointsCsv, slug } from '../lib/download';
import { FORMAT_LABELS } from '../lib/text';

type Tab = 'table' | 'bracket' | 'fixtures' | 'teams' | 'rules' | 'activity';

export default function TournamentPage() {
  const { tournamentId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { profile } = useAuth();
  const { tournament, teams, fixtures, tables } = useTournament(tournamentId);
  useTitle(tournament.data?.name);

  const t = tournament.data;
  const isAdmin = !!t && !!profile && (t.ownerUid === profile.uid || t.adminUids.includes(profile.uid));
  const hasKnockout = fixtures.data.some((f) => f.stage?.kind === 'knockout');

  const tabs = useMemo(() => {
    if (!t) return [];
    const list: { value: Tab; label: string; count?: number }[] = [];
    if (t.format !== 'knockout') list.push({ value: 'table', label: 'Table' });
    if (t.format !== 'league') list.push({ value: 'bracket', label: 'Bracket' });
    list.push({ value: 'fixtures', label: 'Fixtures', count: fixtures.data.length }, { value: 'teams', label: 'Teams', count: teams.data.length });
    if (t.entryRules) list.push({ value: 'rules', label: 'Rules' });
    list.push({ value: 'activity', label: 'Activity' });
    return list;
  }, [t, fixtures.data.length, teams.data.length]);

  if (tournament.loading) return <PageLoader />;
  if (tournament.error) return <ErrorState error={tournament.error} />;
  if (!t) return <EmptyState title="Tournament not found" body="It may have been deleted." action={<ButtonLink to="/">Home</ButtonLink>} />;

  const requested = params.get('tab') as Tab | null;
  const tab: Tab = tabs.some((x) => x.value === requested) ? requested! : tabs[0].value;
  const fmt = (d: string) => new Date(`${d}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6">
      <header className="turf relative -mx-4 overflow-hidden px-4 py-7 sm:mx-0 sm:rounded-3xl sm:px-7">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={t.status === 'live' ? 'live' : 'neutral'}>{t.status === 'setup' ? 'Coming soon' : t.status}</Badge>
              <span className="text-sm font-semibold text-willow">{FORMAT_LABELS[t.format]}</span>
              <OfflineNote show={fixtures.fromCache} />
            </div>
            <h1 className="text-5xl text-chalk sm:text-7xl">{t.name}</h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-chalk/85">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={16} aria-hidden /> {fmt(t.startDate)} – {fmt(t.endDate)}
              </span>
              {t.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={16} aria-hidden /> {t.venue}
                </span>
              )}
              <span>
                {t.matchType} · {t.overs} overs
              </span>
            </p>
            <p className="mt-1 text-sm text-chalk/70">Organised by {t.ownerName}</p>
          </div>
          <div className="no-print flex w-full flex-wrap gap-2 sm:w-auto">
            <ShareButton path={`/tournaments/${tournamentId}`} title={t.name} />
            {isAdmin && (
              <ButtonLink to={`/tournaments/${tournamentId}/manage`} size="sm" icon={<Settings size={16} aria-hidden />} className="!bg-chalk !text-pitch-900">
                Manage
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      {isAdmin && !t.fixturesGenerated && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-willow/25 p-4">
          <p className="font-semibold">Next: add the teams and draw the fixtures.</p>
          <ButtonLink to={`/tournaments/${tournamentId}/manage`} size="sm">
            Set up
          </ButtonLink>
        </div>
      )}

      <div>
        <Tabs label="Tournament sections" tabs={tabs} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} />
        <TabPanel value={tab}>
          {tab === 'table' && (
            <div className="flex flex-col gap-4">
              <div className="no-print flex flex-wrap justify-end gap-1">
                <Button variant="ghost" size="sm" icon={<Download size={16} aria-hidden />} onClick={() => downloadText(`${slug(t.name)}-points-table.csv`, pointsCsv(tables))}>
                  CSV
                </Button>
                <Link to={`/print/tournament/${tournamentId}`} className="press inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-surface-2">
                  <Printer size={16} aria-hidden /> Print
                </Link>
              </div>
              {teams.loading ? (
                <PageLoader />
              ) : !teams.data.length ? (
                <EmptyState title="No teams yet" />
              ) : (
                <div className={`grid gap-4 ${tables.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                  {tables.map((g) => (
                    <PointsTable
                      key={g.group ?? 'all'}
                      title={g.group ? `Group ${g.group}` : 'Points table'}
                      rows={g.rows}
                      qualifiers={t.format === 'groups' ? t.qualifiersPerGroup : 0}
                    />
                  ))}
                </div>
              )}
              <p className="text-xs text-ink-muted">
                Win {t.points.win} · Tie {t.points.tie} · No result {t.points.noResult} · Loss {t.points.loss}. Level on points: net run rate, then wins. A side bowled out counts as having faced its full {t.overs} overs.
              </p>
            </div>
          )}
          {tab === 'bracket' && (hasKnockout ? <Bracket fixtures={fixtures.data} /> : <EmptyState title="Bracket not drawn yet" body={t.format === 'groups' ? 'The knockout is drawn when the group stage finishes.' : 'Fixtures have not been generated yet.'} />)}
          {tab === 'fixtures' && (
            <FixtureList
              fixtures={fixtures.data}
              loading={fixtures.loading}
              error={fixtures.error}
              fromCache={fixtures.fromCache}
              exportName={t.name}
              printPath={`/print/tournament/${tournamentId}`}
              defaultFilter="all"
              empty={<EmptyState title="No fixtures yet" body="The organiser hasn't drawn the fixtures yet." />}
            />
          )}
          {tab === 'teams' &&
            (teams.data.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teams.data.map((tt) => {
                  const inner = (
                    <>
                      <TeamBadge name={tt.name} shortName={tt.shortName} colors={{ primary: tt.color, secondary: '#f7f4ea' }} size={40} />
                      <span className="min-w-0 flex-1 truncate font-display text-xl font-bold uppercase">{tt.name}</span>
                      {tt.group && <Badge>Group {tt.group}</Badge>}
                    </>
                  );
                  return (
                    <li key={tt.id}>
                      {tt.teamId ? (
                        <Link to={`/teams/${tt.teamId}`} className="card press flex items-center gap-3 p-3 hover:border-ink-muted">
                          {inner}
                        </Link>
                      ) : (
                        <div className="card flex items-center gap-3 p-3">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No teams entered yet" />
            ))}
          {tab === 'rules' && <div className="card whitespace-pre-line p-5 leading-relaxed">{t.entryRules}</div>}
          {tab === 'activity' && <ActivityFeed scope="tournaments" id={tournamentId} />}
        </TabPanel>
      </div>
    </div>
  );
}
