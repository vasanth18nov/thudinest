/** A fixture in a list: date block, the two sides, time, venue and status/result. */
import { Link } from 'react-router';
import { Clock, MapPin } from 'lucide-react';
import { formatScore } from '../lib/cricket';
import type { Fixture, FixtureSide, WithId } from '../lib/types';
import { Badge, TeamBadge } from './ui';

function SideRow({ side, score, winner }: { side: FixtureSide; score?: string | null; winner?: boolean }) {
  const label = side.name || side.placeholder || 'TBD';
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <TeamBadge name={label} shortName={side.shortName} colors={side.color ? { primary: side.color, secondary: '#f7f4ea' } : null} size={28} />
      <span className={`min-w-0 flex-1 truncate font-display text-xl font-bold uppercase ${side.name ? '' : 'italic text-ink-muted'} ${winner ? 'text-accent' : ''}`}>
        {label}
      </span>
      {score && <span className={`score shrink-0 text-lg ${winner ? 'text-accent' : 'text-ink-muted'}`}>{score}</span>}
    </div>
  );
}

export function FixtureCard({ fixture: f, compact }: { fixture: WithId<Fixture>; compact?: boolean }) {
  const date = f.startsAt.toDate();
  const r = f.result;
  const winner = r?.winner === 'home' || r?.winner === 'away' ? r.winner : r?.advancing ?? null;
  return (
    <Link
      to={`/fixtures/${f.id}`}
      className={`card press group flex gap-4 overflow-hidden p-0 hover:border-ink-muted ${f.status === 'cancelled' ? 'opacity-70' : ''}`}
    >
      {/* Date block, like a scoreboard tile */}
      <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center bg-pitch-800 py-3 text-chalk dark:bg-pitch-900">
        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-willow">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        <span className="score text-3xl leading-none">{date.getDate()}</span>
        <span className="text-[0.7rem] font-bold uppercase tracking-widest">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          {f.stage && <Badge>{f.stage.kind === 'knockout' ? f.stage.roundLabel : f.stage.group ? `Group ${f.stage.group}` : `Round ${f.stage.round}`}</Badge>}
          {f.tournamentName && !compact && <span className="truncate text-xs font-semibold text-ink-muted">{f.tournamentName}</span>}
          {f.status === 'cancelled' && <Badge tone="danger">Cancelled</Badge>}
          {f.status === 'completed' && <Badge tone="accent">Result</Badge>}
          <span className="ml-auto text-xs font-semibold text-ink-muted">
            {f.matchType} · {f.overs} ov
          </span>
        </div>
        <SideRow side={f.home} score={r ? formatScore(r.home) : null} winner={winner === 'home'} />
        <SideRow side={f.away} score={r ? formatScore(r.away) : null} winner={winner === 'away'} />
        {r ? (
          <p className="text-sm font-semibold text-accent">{r.summary}</p>
        ) : f.status === 'cancelled' ? (
          <p className="text-sm text-danger">{f.cancelReason}</p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} aria-hidden />
              {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
            {f.venue && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin size={14} aria-hidden />
                <span className="truncate">{f.venue}</span>
              </span>
            )}
          </p>
        )}
      </div>
    </Link>
  );
}
