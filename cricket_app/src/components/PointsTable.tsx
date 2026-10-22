/** Points table with NRR. Qualification places get a chalk line underneath. */
import { formatNrr, type PointsRow } from '../lib/pointsTable';

const FORM_TONE = { W: 'bg-accent text-accent-ink', L: 'bg-leather text-white', T: 'bg-willow text-pitch-950', N: 'bg-surface-2 text-ink-muted' };

export function PointsTable({ rows, title, qualifiers = 0 }: { rows: PointsRow[]; title: string; qualifiers?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="turf px-4 py-3 text-left font-display text-2xl font-bold uppercase">{title}</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
              <th scope="col" className="w-8 px-3 py-2 text-left font-semibold">
                <abbr title="Position">#</abbr>
              </th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">Team</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold"><abbr title="Played">P</abbr></th>
              <th scope="col" className="px-2 py-2 text-right font-semibold"><abbr title="Won">W</abbr></th>
              <th scope="col" className="px-2 py-2 text-right font-semibold"><abbr title="Lost">L</abbr></th>
              <th scope="col" className="hidden px-2 py-2 text-right font-semibold sm:table-cell"><abbr title="Tied">T</abbr></th>
              <th scope="col" className="hidden px-2 py-2 text-right font-semibold sm:table-cell"><abbr title="No result">NR</abbr></th>
              <th scope="col" className="px-2 py-2 text-right font-semibold"><abbr title="Points">Pts</abbr></th>
              <th scope="col" className="px-3 py-2 text-right font-semibold"><abbr title="Net run rate">NRR</abbr></th>
              <th scope="col" className="hidden px-3 py-2 text-left font-semibold md:table-cell">Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.teamId}
                className={`border-b last:border-0 ${qualifiers && i === qualifiers - 1 ? 'border-b-2 border-dashed border-accent' : 'border-line/60'} ${
                  qualifiers && i < qualifiers ? 'bg-accent-soft/50' : ''
                }`}
              >
                <td className="score px-3 py-2.5 text-lg text-ink-muted">{i + 1}</td>
                <th scope="row" className="px-2 py-2.5 text-left font-semibold">
                  <span className="block max-w-[8.5rem] truncate sm:max-w-none" title={r.name}>
                    {r.name}
                  </span>
                </th>
                <td className="px-2 py-2.5 text-right tabular-nums">{r.played}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{r.won}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{r.lost}</td>
                <td className="hidden px-2 py-2.5 text-right tabular-nums sm:table-cell">{r.tied}</td>
                <td className="hidden px-2 py-2.5 text-right tabular-nums sm:table-cell">{r.noResult}</td>
                <td className="score px-2 py-2.5 text-right text-xl">{r.points}</td>
                <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${r.nrr > 0 ? 'text-accent' : r.nrr < 0 ? 'text-danger' : ''}`}>{formatNrr(r.nrr)}</td>
                <td className="hidden px-3 py-2.5 md:table-cell">
                  <span className="flex gap-1" aria-label={r.form.length ? `Last results: ${r.form.join(' ')}` : 'No results'}>
                    {r.form.map((x, j) => (
                      <span key={j} aria-hidden className={`inline-flex size-5 items-center justify-center rounded text-[0.65rem] font-bold ${FORM_TONE[x]}`}>
                        {x}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
