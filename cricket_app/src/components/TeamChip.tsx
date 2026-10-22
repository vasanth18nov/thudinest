/** Team name / badge looked up by id (Firestore de-duplicates and caches the listeners). */
import { useDocData } from '../hooks/useFirestore';
import type { Team } from '../lib/types';
import { TeamBadge } from './ui';

export function TeamName({ teamId }: { teamId: string }) {
  const { data } = useDocData<Team>(`teams/${teamId}`);
  return <span>{data?.name ?? '…'}</span>;
}

export function TeamChip({ teamId, size = 28 }: { teamId: string; size?: number }) {
  const { data } = useDocData<Team>(`teams/${teamId}`);
  if (!data) return <span className="skeleton inline-block h-7 w-28" aria-hidden />;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <TeamBadge name={data.name} shortName={data.shortName} logo={data.logoDataUrl} colors={data.colors} size={size} />
      <span className="truncate">{data.name}</span>
    </span>
  );
}
