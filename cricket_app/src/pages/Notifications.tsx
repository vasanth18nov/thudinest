/** Inbox: team invitations to accept or decline, then notifications. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ban, Bell, CalendarDays, Check, ClipboardList, Shield, Trash2, Users, X } from 'lucide-react';
import { timeAgo } from '../components/ActivityFeed';
import { Button, EmptyState, ErrorState, PageHeader, SectionTitle, SkeletonList, TeamBadge } from '../components/ui';
import { friendlyError } from '../data/common';
import { acceptInvitation, declineInvitation } from '../data/invitations';
import { deleteNotification, markAllRead, markRead } from '../data/notifications';
import { useAuth } from '../hooks/useAuth';
import { useDocData } from '../hooks/useFirestore';
import { useInbox } from '../hooks/useInbox';
import { useTitle, useToast } from '../hooks/useUi';
import type { AppNotification, Invitation, NotificationType, Team, WithId } from '../lib/types';

const ICONS: Record<NotificationType, typeof Bell> = {
  fixture_new: CalendarDays,
  fixture_updated: CalendarDays,
  fixture_cancelled: Ban,
  rsvp_reminder: Bell,
  result_posted: ClipboardList,
  lineup_set: Users,
  role_changed: Shield,
};

function InvitationCard({ inv }: { inv: WithId<Invitation> }) {
  const { profile, user } = useAuth();
  const team = useDocData<Team>(`teams/${inv.teamId}`);
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const act = async (kind: 'accept' | 'decline') => {
    if (!profile || !user) return;
    setBusy(kind);
    try {
      if (kind === 'accept') {
        await acceptInvitation(inv, profile);
        toast.show(`You've joined ${inv.teamName}`);
        navigate(`/teams/${inv.teamId}`);
      } else {
        await declineInvitation(inv, user.uid);
        toast.show('Invitation declined', 'info');
      }
    } catch (err) {
      toast.show(friendlyError(err), 'error');
      setBusy(null);
    }
  };

  return (
    <li className="card animate-rise flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TeamBadge name={inv.teamName} shortName={team.data?.shortName} logo={team.data?.logoDataUrl} colors={team.data?.colors} size={48} />
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold uppercase">{inv.teamName}</p>
          <p className="text-sm text-ink-muted">{inv.inviterName} invited you to join as a player</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" icon={<X size={16} aria-hidden />} loading={busy === 'decline'} disabled={!!busy} onClick={() => act('decline')}>
          Decline
        </Button>
        <Button icon={<Check size={16} aria-hidden />} loading={busy === 'accept'} disabled={!!busy} onClick={() => act('accept')}>
          Accept
        </Button>
      </div>
    </li>
  );
}

function NotificationRow({ n }: { n: WithId<AppNotification> }) {
  const Icon = ICONS[n.type] ?? Bell;
  const toast = useToast();
  return (
    <li className={`flex items-start gap-3 px-4 py-3 ${n.read ? '' : 'bg-accent-soft/60'}`}>
      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${n.read ? 'bg-surface-2 text-ink-muted' : 'bg-accent text-accent-ink'}`}>
        <Icon size={18} aria-hidden />
      </span>
      <Link to={n.link} onClick={() => !n.read && markRead(n.id).catch(() => {})} className="min-w-0 flex-1">
        <p className={`${n.read ? '' : 'font-bold'}`}>
          {!n.read && <span className="sr-only">Unread: </span>}
          {n.title}
        </p>
        {n.body && <p className="text-sm text-ink-muted">{n.body}</p>}
        <p className="mt-0.5 text-xs text-ink-muted">
          {n.actorName} · {n.createdAt ? timeAgo(n.createdAt.toDate()) : 'just now'}
        </p>
      </Link>
      <button
        type="button"
        aria-label="Delete notification"
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
        onClick={() => deleteNotification(n.id).catch((err) => toast.show(friendlyError(err), 'error'))}
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </li>
  );
}

export default function Notifications() {
  useTitle('Inbox');
  const { invitations, notifications, loading, error } = useInbox();
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        actions={
          unread.length > 0 && (
            <Button variant="secondary" size="sm" icon={<Check size={16} aria-hidden />} onClick={() => markAllRead(unread.map((n) => n.id))}>
              Mark all read
            </Button>
          )
        }
      />
      {error && <ErrorState error={error} />}

      {invitations.length > 0 && (
        <section aria-labelledby="inv-h">
          <SectionTitle id="inv-h" title={`Invitations (${invitations.length})`} />
          <ul className="flex flex-col gap-3">
            {invitations.map((inv) => (
              <InvitationCard key={inv.id} inv={inv} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="notif-h">
        <h2 id="notif-h" className="sr-only">
          Notifications
        </h2>
        {loading ? (
          <SkeletonList rows={4} height={64} />
        ) : notifications.length === 0 ? (
          invitations.length === 0 && (
            <EmptyState title="All quiet" body="New fixtures, availability reminders, team selections and results will show up here." />
          )
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {notifications.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
