/** Month calendar of fixtures. Tap a day to list its fixtures underneath. */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Fixture, WithId } from '../lib/types';
import { FixtureCard } from './FixtureCard';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function CalendarView({ fixtures }: { fixtures: WithId<Fixture>[] }) {
  const today = new Date();
  const [month, setMonth] = useState(() => {
    // Open on the month of the next upcoming fixture, or this month
    const next = fixtures.find((f) => f.startsAt.toMillis() >= Date.now() - 864e5);
    const d = next ? next.startsAt.toDate() : today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, WithId<Fixture>[]>();
    for (const f of fixtures) {
      const k = dayKey(f.startsAt.toDate());
      map.set(k, [...(map.get(k) ?? []), f]);
    }
    return map;
  }, [fixtures]);

  // Monday-first grid
  const first = new Date(month);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (delta: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    setSelected(null);
  };
  const selectedFixtures = selected ? byDay.get(selected) ?? [] : [];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col gap-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <button type="button" onClick={() => shift(-1)} className="press rounded-lg p-2 hover:bg-surface-2" aria-label="Previous month">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <h3 className="text-2xl" aria-live="polite">
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" onClick={() => shift(1)} className="press rounded-lg p-2 hover:bg-surface-2" aria-label="Next month">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
        <div role="grid" aria-label="Fixtures calendar" className="grid grid-cols-7 text-center">
          {weekdays.map((w) => (
            <div key={w} role="columnheader" className="py-2 text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`x${i}`} className="aspect-square border-t border-line/60" />;
            const k = dayKey(d);
            const list = byDay.get(k) ?? [];
            const isToday = dayKey(today) === k;
            const isSel = selected === k;
            return (
              <button
                key={k}
                type="button"
                role="gridcell"
                aria-selected={isSel}
                aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}${list.length ? `, ${list.length} fixture${list.length > 1 ? 's' : ''}` : ''}`}
                onClick={() => setSelected(isSel ? null : k)}
                className={`relative flex aspect-square flex-col items-center justify-start gap-1 border-t border-line/60 pt-1.5 transition-colors sm:aspect-[4/3] ${
                  isSel ? 'bg-accent text-accent-ink' : list.length ? 'hover:bg-accent-soft' : 'hover:bg-surface-2'
                }`}
              >
                <span className={`score text-lg leading-none ${isToday && !isSel ? 'rounded-full bg-leather px-1.5 text-white' : ''}`}>{d.getDate()}</span>
                {list.length > 0 && (
                  <>
                    <span className="flex gap-0.5 sm:hidden" aria-hidden>
                      {list.slice(0, 3).map((f) => (
                        <span key={f.id} className={`size-1.5 rounded-full ${isSel ? 'bg-accent-ink' : f.status === 'cancelled' ? 'bg-danger' : 'bg-accent'}`} />
                      ))}
                    </span>
                    <span className="hidden w-full flex-col gap-0.5 px-1 sm:flex" aria-hidden>
                      {list.slice(0, 2).map((f) => (
                        <span
                          key={f.id}
                          className={`truncate rounded px-1 text-[0.65rem] font-bold uppercase ${isSel ? 'bg-black/15' : f.status === 'cancelled' ? 'bg-leather/15 text-danger line-through' : 'bg-accent-soft text-accent'}`}
                        >
                          {(f.home.shortName || 'TBD') + ' v ' + (f.away.shortName || 'TBD')}
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {selected && (
        <div className="flex flex-col gap-3" aria-live="polite">
          {selectedFixtures.length ? (
            selectedFixtures.map((f) => <FixtureCard key={f.id} fixture={f} />)
          ) : (
            <p className="text-center text-ink-muted">No fixtures on this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
