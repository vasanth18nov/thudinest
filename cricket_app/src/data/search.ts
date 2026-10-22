/**
 * Prefix search over teams and tournaments using the `searchTokens` arrays
 * (players are in users.ts because their lookup also supports exact email).
 */
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { matchesQuery, queryToken } from '../lib/text';
import type { Team, Tournament, WithId } from '../lib/types';

async function searchCollection<T extends { name: string }>(name: 'teams' | 'tournaments', text: string, max: number): Promise<WithId<T>[]> {
  const token = queryToken(text);
  if (!token) return [];
  const snap = await getDocs(query(collection(db, name), where('searchTokens', 'array-contains', token), limit(max)));
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })).filter((x) => matchesQuery(x.name, text));
}

export const searchTeams = (text: string, max = 20) => searchCollection<Team>('teams', text, max);
export const searchTournaments = (text: string, max = 20) => searchCollection<Tournament>('tournaments', text, max);
