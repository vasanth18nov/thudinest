/** Fixtures with list / calendar views, an upcoming / results filter, CSV export and a print link. */
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Download, Printer } from 'lucide-react';
import { downloadText, fixturesCsv, slug } from '../lib/download';
import type { Fixture, WithId } from '../lib/types';
import { CalendarView } from './CalendarView';
import { FixtureCard } from './FixtureCard';
import { Button, EmptyState, ErrorState, OfflineNote, Segmented, SkeletonList } from './ui';

type View = 'list' | 'calendar';
type Filter = 'upcoming' | 'results' | 'all';
const VIEW_KEY = 'ch-fixture-view';

function savedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'calendar' ? 'calendar' : 'list';
  } catch {
    return 'list';
  }
}

export function FixtureList({
  fixtures,
  loading,
  error,
  fromCache,
  exportName,
  printPath,
  empty,
  defaultFilter = 'upcoming',
}: {
  fixtures: WithId<Fixture>[];
  loading: boolean;
  error: Error | null;
  fromCache?: boolean;
  exportName: string;
  printPath?: string;
  empty: ReactNode;
  defaultFilter?: Filter;
}) {
  const [view, setViewState] = useState<View>(savedView);
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* not remembered in private mode */
    }
  };

  const sorted = useMemo(() => [...fixtures].sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis()), [fixtures]);
  const shown = useMemo(() => {
    // "Upcoming" keeps today's fixtures visible until a result is in
    const cutoff = Date.now() - 12 * 3600 * 1000;
    if (filter === 'upcoming') return sorted.filter((f) => f.status === 'scheduled' && f.startsAt.toMillis() >= cutoff);
    if (filter === 'results') return sorted.filter((f) => f.status !== 'scheduled' || f.startsAt.toMillis() < cutoff).reverse();
    return sorted;
  }, [sorted, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-auto sm:min-w-56">
          <Segmented
            label="View"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List' },
              { value: 'calendar', label: 'Calendar' },
            ]}
          />
        </div>
        {view === 'list' && (
          <div className="w-full sm:w-auto sm:min-w-72">
            <Segmented
              label="Show"
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'results', label: 'Past' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <OfflineNote show={!!fromCache && !loading} />
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={16} aria-hidden />}
            disabled={!fixtures.length}
            onClick={() => downloadText(`${slug(exportName)}-fixtures.csv`, fixturesCsv(fixtures))}
          >
            CSV
          </Button>
          {printPath && (
            <Link to={printPath} className="press inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-surface-2">
              <Printer size={16} aria-hidden /> Print
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={4} height={104} />
      ) : error ? (
        <ErrorState error={error} />
      ) : !fixtures.length ? (
        empty
      ) : view === 'calendar' ? (
        <CalendarView fixtures={sorted} />
      ) : shown.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((f) => (
            <li key={f.id}>
              <FixtureCard fixture={f} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={filter === 'upcoming' ? 'Nothing coming up' : 'No past fixtures'}
          body={filter === 'upcoming' ? 'All caught up. Check past fixtures for results.' : 'Results will appear here after matches are played.'}
        />
      )}
    </div>
  );
}

