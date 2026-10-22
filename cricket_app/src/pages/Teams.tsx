/** My teams. */
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { TeamChip } from '../components/TeamChip';
import { Badge, ButtonLink, EmptyState, PageHeader } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTitle } from '../hooks/useUi';
import { ROLE_LABELS } from '../lib/text';

export default function Teams() {
  useTitle('Teams');
  const { memberships } = useAuth();

  return (
    <div>
      <PageHeader
        eyebrow="Your clubs"
        title="Teams"
        actions={
          <ButtonLink to="/teams/new" icon={<Plus size={18} aria-hidden />}>
            New team
          </ButtonLink>
        }
      />
      {memberships.length === 0 ? (
        <EmptyState
          title="No teams yet"
          body="Start a team and invite your squad, or ask your captain for an invite link. Invitations appear in your inbox."
          action={<ButtonLink to="/teams/new">Start a team</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m, i) => (
            <li key={m.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <Link to={`/teams/${m.teamId}`} className="card press flex items-center justify-between gap-3 p-4 font-display text-2xl font-bold uppercase hover:border-ink-muted">
                <TeamChip teamId={m.teamId} size={44} />
                <Badge tone={m.role === 'owner' || m.role === 'admin' ? 'accent' : 'neutral'}>{ROLE_LABELS[m.role]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
