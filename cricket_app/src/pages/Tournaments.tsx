/** Tournaments I organise, and tournaments my teams are entered in. */
import { useEffect, useState } from 'react';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { Link } from 'react-router';
import { Plus, Trophy } from 'lucide-react';
import { Badge, ButtonLink, EmptyState, PageHeader, SectionTitle, SkeletonList } from '../components/ui';
import { chunk } from '../data/common';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useQueryData } from '../hooks/useFirestore';
import { useTitle } from '../hooks/useUi';
import { FORMAT_LABELS } from '../lib/text';
import type { Tournament, TournamentTeam, WithId } from '../lib/types';

export function TournamentCard({ t }: { t: WithId<Tournament> }) {
  const fmt = (d: string) => new Date(`${d}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <Link to={`/tournaments/${t.id}`} className="card press flex items-center gap-4 p-4 hover:border-ink-muted">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-willow/40 text-pitch-900 dark:text-willow">
        <Trophy size={24} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-2xl font-bold uppercase">{t.name}</span>
        <span className="text-sm text-ink-muted">
          {fmt(t.startDate)} – {fmt(t.endDate)} · {FORMAT_LABELS[t.format]} · {t.overs} ov
        </span>
      </span>
      <Badge tone={t.status === 'live' ? 'live' : t.status === 'completed' ? 'neutral' : 'warn'}>{t.status === 'setup' ? 'Setting up' : t.status}</Badge>
    </Link>
  );
}

export default function Tournaments() {
  useTitle('Tournaments');
  const { profile, memberships } = useAuth();
  const uid = profile?.uid ?? null;
  const owned = useQueryData<Tournament>(uid ? `t-owned-${uid}` : null, () => query(collection(db, 'tournaments'), where('ownerUid', '==', uid)));
  const coAdmin = useQueryData<Tournament>(uid ? `t-admin-${uid}` : null, () => query(collection(db, 'tournaments'), where('adminUids', 'array-contains', uid)));

  // Tournaments my teams are entered in: tournamentTeams → tournament ids → tournaments
  const teamIds = memberships.map((m) => m.teamId).sort().slice(0, 30);
  const entries = useQueryData<TournamentTeam>(teamIds.length ? `t-entries-${teamIds.join(',')}` : null, () =>
    query(collection(db, 'tournamentTeams'), where('teamId', 'in', teamIds)),
  );
  const [playing, setPlaying] = useState<WithId<Tournament>[] | null>(null);
  const entryKey = [...new Set(entries.data.map((e) => e.tournamentId))].sort().join(',');
  useEffect(() => {
    if (!entryKey) {
      setPlaying([]);
      return;
    }
    let cancelled = false;
    Promise.all(chunk(entryKey.split(','), 30).map((ids) => getDocs(query(collection(db, 'tournaments'), where(documentId(), 'in', ids)))))
      .then((snaps) => !cancelled && setPlaying(snaps.flatMap((s) => s.docs.map((d) => ({ ...(d.data() as Tournament), id: d.id })))))
      .catch(() => !cancelled && setPlaying([]));
    return () => {
      cancelled = true;
    };
  }, [entryKey]);

  const organising = [...owned.data, ...coAdmin.data.filter((t) => !owned.data.some((o) => o.id === t.id))].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const loading = owned.loading || coAdmin.loading;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Cups & leagues"
        title="Tournaments"
        actions={
          <ButtonLink to="/tournaments/new" icon={<Plus size={18} aria-hidden />}>
            New tournament
          </ButtonLink>
        }
      />
      <section aria-labelledby="org-h">
        <SectionTitle id="org-h" title="Organising" />
        {loading ? (
          <SkeletonList rows={2} />
        ) : organising.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {organising.map((t) => (
              <li key={t.id}>
                <TournamentCard t={t} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Run your own"
            body="League, knockout or groups then knockout. CricketHub draws the fixtures and keeps the table with NRR."
            action={<ButtonLink to="/tournaments/new">Create a tournament</ButtonLink>}
          />
        )}
      </section>
      <section aria-labelledby="play-h">
        <SectionTitle id="play-h" title="My teams are playing" />
        {playing === null || entries.loading ? (
          <SkeletonList rows={2} />
        ) : playing.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {playing.map((t) => (
              <li key={t.id}>
                <TournamentCard t={t} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">None of your teams are entered in a tournament yet.</p>
        )}
      </section>
    </div>
  );
}
