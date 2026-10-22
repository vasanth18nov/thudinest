/** Another player's profile and career. */
import { collection, query, where } from 'firebase/firestore';
import { Link, useParams } from 'react-router';
import { CareerStats } from '../components/CareerStats';
import { TeamName } from '../components/TeamChip';
import { Avatar, Badge, EmptyState, ErrorState, PageLoader, SectionTitle } from '../components/ui';
import { db } from '../firebase';
import { useDocData, useQueryData } from '../hooks/useFirestore';
import { useTitle } from '../hooks/useUi';
import { BATTING_LABELS, BOWLING_LABELS, PLAYER_ROLE_LABELS, ROLE_LABELS } from '../lib/text';
import type { TeamMember, UserProfile } from '../lib/types';

export default function PlayerPage() {
  const { uid = '' } = useParams();
  const player = useDocData<UserProfile>(`users/${uid}`);
  const teams = useQueryData<TeamMember>(`player-teams-${uid}`, () => query(collection(db, 'teamMembers'), where('uid', '==', uid)));
  useTitle(player.data?.displayName);

  if (player.loading) return <PageLoader />;
  if (player.error) return <ErrorState error={player.error} />;
  if (!player.data) return <EmptyState title="Player not found" body="This profile doesn't exist or was removed." />;
  const p = player.data;

  return (
    <div className="flex flex-col gap-8">
      <header className="turf flex flex-wrap items-center gap-5 rounded-3xl p-6">
        <Avatar name={p.displayName} photoURL={p.photoURL} size={84} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-willow">{PLAYER_ROLE_LABELS[p.playerRole]}</p>
          <h1 className="text-5xl text-chalk">{p.displayName}</h1>
          <p className="mt-1 text-chalk/80">
            {BATTING_LABELS[p.battingStyle]} · {BOWLING_LABELS[p.bowlingStyle]}
          </p>
        </div>
        {p.jerseyNumber !== null && <span className="score text-7xl text-chalk/90">#{p.jerseyNumber}</span>}
      </header>
      {teams.data.length > 0 && (
        <section aria-labelledby="pt-h">
          <SectionTitle id="pt-h" title="Teams" />
          <ul className="flex flex-wrap gap-2">
            {teams.data.map((m) => (
              <li key={m.id}>
                <Link to={`/teams/${m.teamId}`} className="press inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 font-semibold hover:border-ink-muted">
                  <TeamName teamId={m.teamId} /> <Badge>{ROLE_LABELS[m.role]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="pc-h">
        <SectionTitle id="pc-h" title="Career" />
        <CareerStats uid={p.uid} />
      </section>
    </div>
  );
}
