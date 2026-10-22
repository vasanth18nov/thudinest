/**
 * Live tournament data: the tournament, its teams and fixtures, and the points tables
 * derived from completed league/group fixtures.
 */
import { useMemo } from 'react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { buildPointsTable, DEFAULT_POINTS, type PointsRow, type TableMatch } from '../lib/pointsTable';
import type { Fixture, Tournament, TournamentTeam, WithId } from '../lib/types';
import { useDocData, useQueryData } from './useFirestore';

export interface GroupTable {
  group: string | null;
  rows: PointsRow[];
}

/** Completed round-robin fixtures as table matches, in the order they were played. */
export function tableMatches(fixtures: readonly WithId<Fixture>[]): TableMatch[] {
  return fixtures
    .filter((f) => f.stage?.kind !== 'knockout' && f.status === 'completed' && f.result && f.home.ttId && f.away.ttId)
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
    .map((f) => ({
      home: f.home.ttId!,
      away: f.away.ttId!,
      winner: f.result!.winner,
      homeScore: f.result!.home,
      awayScore: f.result!.away,
      oversLimit: f.overs,
    }));
}

export function buildTables(t: Tournament, teams: readonly WithId<TournamentTeam>[], fixtures: readonly WithId<Fixture>[]): GroupTable[] {
  const matches = tableMatches(fixtures);
  const points = t.points ?? DEFAULT_POINTS;
  const toTable = (list: readonly WithId<TournamentTeam>[]) =>
    buildPointsTable(
      list.map((tt) => ({ id: tt.id, name: tt.name, shortName: tt.shortName, group: tt.group })),
      matches,
      points,
    );
  if (t.format === 'groups') {
    const groups = [...new Set(teams.map((tt) => tt.group).filter((g): g is string => !!g))].sort();
    if (groups.length) return groups.map((g) => ({ group: g, rows: toTable(teams.filter((tt) => tt.group === g)) }));
  }
  return [{ group: null, rows: toTable(teams) }];
}

export function useTournament(tournamentId: string) {
  const tournament = useDocData<Tournament>(`tournaments/${tournamentId}`);
  const teams = useQueryData<TournamentTeam>(`tt-${tournamentId}`, () =>
    query(collection(db, 'tournamentTeams'), where('tournamentId', '==', tournamentId), orderBy('seed', 'asc')),
  );
  const fixtures = useQueryData<Fixture>(`tfix-${tournamentId}`, () =>
    query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId), orderBy('startsAt', 'asc')),
  );

  const tables = useMemo(
    () => (tournament.data && tournament.data.format !== 'knockout' ? buildTables(tournament.data, teams.data, fixtures.data) : []),
    [tournament.data, teams.data, fixtures.data],
  );

  return { tournament, teams, fixtures, tables };
}
