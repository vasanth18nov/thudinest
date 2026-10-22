/** Browser-only helpers for exports. */
import { toCsv } from './text';
import { ballsToOvers, formatScore } from './cricket';
import { formatNrr, type PointsRow } from './pointsTable';
import type { Fixture, WithId } from './types';

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  // BOM so Excel opens UTF-8 names (e.g. accented players) correctly
  const blob = new Blob([mime.startsWith('text/csv') ? '\ufeff' : '', text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export';
}

const sideName = (s: Fixture['home']) => s.name || s.placeholder || 'TBD';

export function fixturesCsv(fixtures: readonly WithId<Fixture>[]): string {
  const rows = [...fixtures]
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
    .map((f) => {
      const d = f.startsAt.toDate();
      return [
        f.stage?.matchNo ?? '',
        d.toLocaleDateString('en-CA'), // YYYY-MM-DD sorts correctly in spreadsheets
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        f.stage?.roundLabel ?? '',
        sideName(f.home),
        sideName(f.away),
        f.venue,
        f.overs,
        f.matchType,
        f.status,
        f.result ? formatScore(f.result.home) : '',
        f.result ? formatScore(f.result.away) : '',
        f.result?.summary ?? (f.status === 'cancelled' ? `Cancelled: ${f.cancelReason ?? ''}` : ''),
      ];
    });
  return toCsv([
    ['Match', 'Date', 'Time', 'Stage', 'Home', 'Away', 'Venue', 'Overs', 'Type', 'Status', 'Home score', 'Away score', 'Result'],
    ...rows,
  ]);
}

export function pointsCsv(tables: readonly { group: string | null; rows: readonly PointsRow[] }[]): string {
  return toCsv([
    ['Group', 'Pos', 'Team', 'P', 'W', 'L', 'T', 'NR', 'Pts', 'NRR', 'Runs for', 'Overs faced', 'Runs against', 'Overs bowled'],
    ...tables.flatMap((t) =>
      t.rows.map((r, i) => [
        t.group ?? '',
        i + 1,
        r.name,
        r.played,
        r.won,
        r.lost,
        r.tied,
        r.noResult,
        r.points,
        formatNrr(r.nrr),
        r.runsFor,
        ballsToOvers(r.ballsFaced),
        r.runsAgainst,
        ballsToOvers(r.ballsBowled),
      ]),
    ),
  ]);
}
