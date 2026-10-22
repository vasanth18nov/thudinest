/** Read-only scorecard: both innings, batting and bowling figures. */
import { ballsToOvers, economy, formatDecimal, formatScore, otherSide, strikeRate } from '../lib/cricket';
import type { Fixture, MatchResult, Side } from '../lib/types';

function Innings({ result, fixture, batting }: { result: MatchResult; fixture: Fixture; batting: Side }) {
  const bat = result.batting.filter((b) => b.side === batting);
  const bowl = result.bowling.filter((b) => b.side === otherSide(batting));
  const score = result.innings?.[batting];
  const name = fixture[batting].name || fixture[batting].placeholder || 'TBD';
  if (!bat.length && !bowl.length && !score) return null;

  return (
    <section className="card overflow-hidden" aria-label={`${name} innings`}>
      <header className="turf flex items-baseline justify-between px-4 py-3">
        <h3 className="text-2xl text-chalk">{name}</h3>
        <span className="score text-3xl text-chalk">{formatScore(score)}</span>
      </header>
      {bat.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{name} batting</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
                <th scope="col" className="px-4 py-2 font-semibold">Batter</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">R</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">B</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">4s</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">6s</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">SR</th>
              </tr>
            </thead>
            <tbody>
              {bat.map((b, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-semibold">
                    {b.name}
                    {b.notOut && <span className="ml-1 text-accent">*</span>}
                  </th>
                  <td className="score px-2 py-2 text-right text-base">{b.runs}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{b.balls}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{b.fours}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{b.sixes}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatDecimal(strikeRate(b.runs, b.balls), 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {bowl.length > 0 && (
        <div className="overflow-x-auto border-t-4 border-double border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Bowling against {name}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
                <th scope="col" className="px-4 py-2 font-semibold">Bowler</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">O</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">M</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">R</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">W</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Econ</th>
              </tr>
            </thead>
            <tbody>
              {bowl.map((b, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-semibold">{b.name}</th>
                  <td className="px-2 py-2 text-right tabular-nums">{ballsToOvers(b.balls)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{b.maidens}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{b.runs}</td>
                  <td className="score px-2 py-2 text-right text-base">{b.wickets}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatDecimal(economy(b.runs, b.balls))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function Scorecard({ result, fixture }: { result: MatchResult; fixture: Fixture }) {
  const order: Side[] = [result.battedFirst, otherSide(result.battedFirst)];
  return (
    <div className="flex flex-col gap-4">
      {result.manOfTheMatch && (
        <p className="inline-flex items-center gap-2 self-start rounded-xl bg-willow/30 px-3 py-2 font-semibold">
          <span aria-hidden>⭐</span> Player of the match: {result.manOfTheMatch.name}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {order.map((side) => (
          <Innings key={side} result={result} fixture={fixture} batting={side} />
        ))}
      </div>
    </div>
  );
}
