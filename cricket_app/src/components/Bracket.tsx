/** Knockout bracket: one column per round, scrolls sideways on phones. */
import { Link } from 'react-router';
import { formatScore } from '../lib/cricket';
import type { Fixture, FixtureSide, Side, WithId } from '../lib/types';
import { EmptyState } from './ui';

function Slot({ side, score, state }: { side: FixtureSide; score: string | null; state: 'won' | 'lost' | 'open' }) {
  const label = side.name || side.placeholder || 'TBD';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${state === 'won' ? 'bg-accent-soft' : ''}`}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: side.color ?? 'var(--ch-line)' }} aria-hidden />
      <span className={`min-w-0 flex-1 truncate text-sm ${side.name ? 'font-semibold' : 'italic text-ink-muted'} ${state === 'lost' ? 'text-ink-muted line-through decoration-1' : ''}`}>{label}</span>
      {score && <span className={`score shrink-0 text-base ${state === 'won' ? 'text-accent' : 'text-ink-muted'}`}>{score}</span>}
    </div>
  );
}

export function Bracket({ fixtures }: { fixtures: WithId<Fixture>[] }) {
  const ko = fixtures.filter((f) => f.stage?.kind === 'knockout');
  if (!ko.length) return <EmptyState title="No knockout yet" body="The bracket appears once the knockout stage is drawn." />;

  const rounds = [...new Set(ko.map((f) => f.stage!.round))].sort((a, b) => a - b);
  const final = ko.find((f) => f.stage!.nextMatchId === null && f.status === 'completed');
  const champion = final?.result ? (final.result.winner === 'home' || final.result.winner === 'away' ? final.result.winner : final.result.advancing) : null;

  return (
    <div className="flex flex-col gap-4">
      {final && champion && (
        <div className="turf flex items-center gap-4 rounded-2xl p-5">
          <span className="text-4xl" aria-hidden>
            🏆
          </span>
          <div>
            <p className="eyebrow !text-willow">Champions</p>
            <p className="font-display text-4xl font-black uppercase text-chalk">{final[champion].name}</p>
          </div>
        </div>
      )}
      <div className="-mx-4 snap-x snap-proximity scroll-px-4 overflow-x-auto px-4 pb-2" role="region" aria-label="Knockout bracket" tabIndex={0}>
        <ol className="flex min-w-max gap-6">
          {rounds.map((round) => {
            const matches = ko.filter((f) => f.stage!.round === round).sort((a, b) => a.stage!.matchNo - b.stage!.matchNo);
            return (
              <li key={round} className="flex w-64 snap-start flex-col">
                <h3 className="mb-3 text-xl text-ink-muted">{matches[0].stage!.roundLabel}</h3>
                <ol className="flex flex-1 flex-col justify-around gap-4">
                  {matches.map((f) => {
                    const r = f.result;
                    const through: Side | null = r ? (r.winner === 'home' || r.winner === 'away' ? r.winner : r.advancing) : null;
                    const state = (s: Side) => (!through ? 'open' : through === s ? 'won' : 'lost') as 'won' | 'lost' | 'open';
                    return (
                      <li key={f.id} className="relative">
                        <Link to={`/fixtures/${f.id}`} className="card press block divide-y divide-line overflow-hidden hover:border-ink-muted">
                          <div className="flex justify-between bg-surface-2 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted">
                            <span>M{f.stage!.matchNo}</span>
                            <span>{f.startsAt.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <Slot side={f.home} score={r ? formatScore(r.home) : null} state={state('home')} />
                          <Slot side={f.away} score={r ? formatScore(r.away) : null} state={state('away')} />
                        </Link>
                        {f.stage!.nextMatchId && <span aria-hidden className="absolute -right-6 top-1/2 h-0.5 w-6 bg-line" />}
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
