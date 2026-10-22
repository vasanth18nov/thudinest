/** Search across players, teams and tournaments. */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search as SearchIcon } from 'lucide-react';
import { Avatar, Button, EmptyState, ErrorState, PageHeader, SectionTitle, SkeletonList, TeamBadge, TextField } from '../components/ui';
import { friendlyError } from '../data/common';
import { searchTeams, searchTournaments } from '../data/search';
import { searchUsers } from '../data/users';
import { useTitle } from '../hooks/useUi';
import { PLAYER_ROLE_LABELS } from '../lib/text';
import type { Team, Tournament, UserProfile, WithId } from '../lib/types';
import { TournamentCard } from './Tournaments';

interface Results {
  players: WithId<UserProfile>[];
  teams: WithId<Team>[];
  tournaments: WithId<Tournament>[];
}

export default function Search() {
  useTitle('Search');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [text, setText] = useState(q);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([searchUsers(q, 10), searchTeams(q, 10), searchTournaments(q, 10)])
      .then(([players, teams, tournaments]) => !cancelled && setResults({ players, teams, tournaments }))
      .catch((err) => !cancelled && setError(friendlyError(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(text.trim() ? { q: text.trim() } : {}, { replace: true });
  };
  const total = results ? results.players.length + results.teams.length + results.tournaments.length : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Find" title="Search" />
      <form onSubmit={submit} role="search" className="flex items-end gap-2">
        <div className="flex-1">
          <TextField label="Players, teams or tournaments" value={text} autoFocus onChange={(e) => setText(e.target.value)} placeholder="Type at least 2 letters" />
        </div>
        <Button type="submit" icon={<SearchIcon size={16} aria-hidden />}>
          Search
        </Button>
      </form>

      {loading && <SkeletonList rows={3} height={56} />}
      {error && <ErrorState error={error} />}
      {results && !loading && total === 0 && <EmptyState title="No matches" body="Try the start of a name, e.g. “roy” for Royal Strikers. Players can also be found by exact email." />}

      {results && results.players.length > 0 && (
        <section aria-labelledby="sp-h">
          <SectionTitle id="sp-h" title="Players" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {results.players.map((p) => (
              <li key={p.uid}>
                <Link to={`/players/${p.uid}`} className="card press flex items-center gap-3 p-3 hover:border-ink-muted">
                  <Avatar name={p.displayName} photoURL={p.photoURL} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.displayName}</span>
                    <span className="text-sm text-ink-muted">{PLAYER_ROLE_LABELS[p.playerRole]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {results && results.teams.length > 0 && (
        <section aria-labelledby="st-h">
          <SectionTitle id="st-h" title="Teams" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {results.teams.map((t) => (
              <li key={t.id}>
                <Link to={`/teams/${t.id}`} className="card press flex items-center gap-3 p-3 hover:border-ink-muted">
                  <TeamBadge name={t.name} shortName={t.shortName} logo={t.logoDataUrl} colors={t.colors} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xl font-bold uppercase">{t.name}</span>
                    {t.homeGround && <span className="text-sm text-ink-muted">{t.homeGround}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {results && results.tournaments.length > 0 && (
        <section aria-labelledby="sx-h">
          <SectionTitle id="sx-h" title="Tournaments" />
          <ul className="grid gap-2 lg:grid-cols-2">
            {results.tournaments.map((t) => (
              <li key={t.id}>
                <TournamentCard t={t} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
