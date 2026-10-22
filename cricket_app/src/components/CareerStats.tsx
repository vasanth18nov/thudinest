/** A player's career, summed from their per-match playerStats lines. */
import { collection, orderBy, query, where } from 'firebase/firestore';
import { Link } from 'react-router';
import { db } from '../firebase';
import { useQueryData } from '../hooks/useFirestore';
import { ballsToOvers, formatDecimal } from '../lib/cricket';
import { aggregateCareer } from '../lib/stats';
import type { PlayerMatchStats } from '../lib/types';
import { EmptyState, ErrorState, SkeletonList, Stat } from './ui';

export function CareerStats({ uid }: { uid: string }) {
  const { data, loading, error } = useQueryData<PlayerMatchStats>(`career-${uid}`, () =>
    query(collection(db, 'playerStats'), where('uid', '==', uid), orderBy('playedAt', 'desc')),
  );

  if (loading) return <SkeletonList rows={2} height={120} />;
  if (error) return <ErrorState error={error} />;
  if (!data.length) return <EmptyState title="No matches yet" body="Stats appear here once a scorecard including this player is entered." />;

  const c = aggregateCareer(data);
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="bat-h" className="card p-5">
        <h3 id="bat-h" className="mb-4 text-2xl">
          Batting
        </h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-6">
          <Stat value={c.matches} label="Matches" />
          <Stat value={c.runs} label="Runs" tone="accent" />
          <Stat value={formatDecimal(c.average)} label="Average" />
          <Stat value={formatDecimal(c.strikeRate, 1)} label="Strike rate" />
          <Stat value={`${c.highest}${c.highestNotOut ? '*' : ''}`} label="Highest" />
          <Stat value={`${c.fifties}/${c.hundreds}`} label="50s/100s" />
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          {c.innings} innings · {c.notOuts} not out · {c.fours} fours · {c.sixes} sixes
        </p>
      </section>
      <section aria-labelledby="bowl-h" className="card p-5">
        <h3 id="bowl-h" className="mb-4 text-2xl">
          Bowling
        </h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-6">
          <Stat value={c.wickets} label="Wickets" tone="accent" />
          <Stat value={formatDecimal(c.economy)} label="Economy" />
          <Stat value={formatDecimal(c.bowlingAverage)} label="Average" />
          <Stat value={c.best ? `${c.best.wickets}/${c.best.runs}` : '–'} label="Best" />
          <Stat value={ballsToOvers(c.ballsBowled)} label="Overs" />
          <Stat value={c.playerOfMatch} label="Player of match" />
        </div>
      </section>
      <section aria-labelledby="recent-h">
        <h3 id="recent-h" className="mb-2 text-2xl">
          Recent matches
        </h3>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {data.slice(0, 10).map((m) => (
            <li key={m.id}>
              <Link to={`/fixtures/${m.fixtureId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">v {m.opponent}</span>
                  <span className="text-xs text-ink-muted">{m.playedAt.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
                {m.batted && (
                  <span className="score text-xl">
                    {m.runs}
                    {!m.out && '*'}
                    <span className="ml-1 font-sans text-xs font-normal text-ink-muted">({m.balls})</span>
                  </span>
                )}
                {m.bowled && (
                  <span className="score text-xl text-accent">
                    {m.wickets}/{m.runsConceded}
                  </span>
                )}
                {m.manOfTheMatch && <span title="Player of the match" aria-label="Player of the match">⭐</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
