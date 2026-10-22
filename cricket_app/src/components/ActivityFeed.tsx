/** Activity log for a team or tournament, newest first. */
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router';
import { db } from '../firebase';
import { useQueryData } from '../hooks/useFirestore';
import type { ActivityEntry } from '../lib/types';
import { Avatar, EmptyState, ErrorState, SkeletonList } from './ui';

export function timeAgo(date: Date): string {
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined });
}

export function ActivityFeed({ scope, id }: { scope: 'teams' | 'tournaments'; id: string }) {
  const { data, loading, error } = useQueryData<ActivityEntry>(`activity-${scope}-${id}`, () =>
    query(collection(db, scope, id, 'activity'), orderBy('createdAt', 'desc'), limit(60)),
  );
  if (loading) return <SkeletonList rows={4} height={56} />;
  if (error) return <ErrorState error={error} />;
  if (!data.length) return <EmptyState title="Quiet so far" body="Changes to fixtures, results and the squad will be logged here." />;

  return (
    <ol className="relative ml-4 border-l-2 border-dashed border-line">
      {data.map((a) => (
        <li key={a.id} className="relative -ml-4 flex items-start gap-3 py-2.5 pl-0">
          <Avatar name={a.actorName} size={30} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              {a.link ? (
                <Link to={a.link} className="hover:underline">
                  {a.message}
                </Link>
              ) : (
                a.message
              )}
            </p>
            {/* createdAt is briefly null while a local write is pending */}
            <p className="text-xs text-ink-muted">{a.createdAt ? timeAgo(a.createdAt.toDate()) : 'just now'}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
