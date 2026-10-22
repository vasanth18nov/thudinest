/** Add players: shareable link, search existing players, or invite by email. */
import { useEffect, useState, type FormEvent } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Link, useParams } from 'react-router';
import { Copy, Mail, RefreshCw, Search, Send, Share2 } from 'lucide-react';
import { copyText } from '../components/Share';
import { Avatar, Badge, Button, EmptyState, ErrorState, PageHeader, PageLoader, SectionTitle, TextField } from '../components/ui';
import { actorOf, friendlyError } from '../data/common';
import { inviteEmail, inviteUser, isValidEmail, revokeInvitation } from '../data/invitations';
import { getInviteCode, resetInviteCode } from '../data/teams';
import { searchUsers } from '../data/users';
import { db, emailEnabled, publicUrl } from '../firebase';
import { canAdminTeam, useAuth } from '../hooks/useAuth';
import { useDocData, useQueryData } from '../hooks/useFirestore';
import { useTitle, useToast } from '../hooks/useUi';
import { PLAYER_ROLE_LABELS } from '../lib/text';
import type { Invitation, Team, TeamMember, UserProfile, WithId } from '../lib/types';

export default function TeamInvite() {
  const { teamId = '' } = useParams();
  const { profile, roleIn } = useAuth();
  const toast = useToast();
  const team = useDocData<Team>(`teams/${teamId}`);
  const isAdmin = canAdminTeam(roleIn(teamId));
  useTitle(team.data ? `Invite to ${team.data.name}` : 'Invite');

  const roster = useQueryData<TeamMember>(isAdmin ? `roster-${teamId}` : null, () => query(collection(db, 'teamMembers'), where('teamId', '==', teamId)));
  const pending = useQueryData<Invitation>(isAdmin ? `pending-${teamId}` : null, () =>
    query(collection(db, 'invitations'), where('teamId', '==', teamId), where('status', '==', 'pending')),
  );

  const [code, setCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    getInviteCode(teamId)
      .then(setCode)
      .catch((err) => setCodeError(friendlyError(err)));
  }, [teamId, isAdmin]);

  if (team.loading) return <PageLoader />;
  if (!team.data) return <EmptyState title="Team not found" />;
  if (!isAdmin || !profile) return <ErrorState error="permission-denied: only owners and admins can invite players." />;

  const t = team.data;
  const actor = actorOf(profile);
  const memberUids = new Set(roster.data.map((m) => m.uid));
  const link = code ? publicUrl(`/join/${teamId}/${code}`) : '';
  const inviteText = `Join ${t.name} on CricketHub: ${link}`;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow={t.name} title="Invite players">
        <p className="mt-2 text-ink-muted">
          Players who accept appear on the <Link to={`/teams/${teamId}?tab=squad`} className="link">squad</Link>.
        </p>
      </PageHeader>

      {/* 1. Shareable link */}
      <section aria-labelledby="link-h" className="card flex flex-col gap-4 p-5">
        <SectionTitle id="link-h" title="1 · Share a link" />
        <p className="text-ink-muted">Anyone with this link can join as a player after signing in. Post it in your team chat.</p>
        {codeError ? (
          <p className="text-danger">{codeError}</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={link || 'Loading…'} aria-label="Invite link" className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-sm" onFocus={(e) => e.target.select()} />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                icon={<Copy size={16} aria-hidden />}
                disabled={!code}
                onClick={async () => toast.show((await copyText(link)) ? 'Invite link copied' : 'Copy failed — select the link instead', 'success')}
              >
                Copy
              </Button>
              {'share' in navigator && (
                <Button variant="secondary" icon={<Share2 size={16} aria-hidden />} disabled={!code} onClick={() => navigator.share({ title: `Join ${t.name}`, text: inviteText, url: link }).catch(() => {})}>
                  Share
                </Button>
              )}
              <Button
                variant="ghost"
                icon={<RefreshCw size={16} aria-hidden />}
                disabled={!code}
                onClick={async () => {
                  try {
                    setCode(await resetInviteCode(teamId, actor));
                    toast.show('New link created. The old one no longer works.');
                  } catch (err) {
                    toast.show(friendlyError(err), 'error');
                  }
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Search */}
      <SearchInvite team={{ ...t, id: teamId }} memberUids={memberUids} />

      {/* 3. Email */}
      <EmailInvite team={{ ...t, id: teamId }} link={link} />

      {/* Pending */}
      <section aria-labelledby="pending-h">
        <SectionTitle id="pending-h" title="Pending invitations" />
        {pending.loading ? (
          <PageLoader />
        ) : pending.data.length === 0 ? (
          <p className="text-ink-muted">No invitations waiting for a reply.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {pending.data.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={inv.inviteeName ?? inv.inviteeEmail ?? '?'} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{inv.inviteeName ?? inv.inviteeEmail}</p>
                  <p className="text-xs text-ink-muted">Invited by {inv.inviterName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    revokeInvitation(inv, actor)
                      .then(() => toast.show('Invitation withdrawn'))
                      .catch((err) => toast.show(friendlyError(err), 'error'))
                  }
                >
                  Withdraw
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SearchInvite({ team, memberUids }: { team: WithId<Team>; memberUids: Set<string> }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WithId<UserProfile>[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      setResults(await searchUsers(q));
    } catch (err) {
      toast.show(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="search-h" className="card flex flex-col gap-4 p-5">
      <SectionTitle id="search-h" title="2 · Find a player" />
      <form onSubmit={search} className="flex items-end gap-2" role="search">
        <div className="flex-1">
          <TextField label="Name or exact email" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Asha or asha@example.com" />
        </div>
        <Button type="submit" loading={busy} icon={<Search size={16} aria-hidden />}>
          Search
        </Button>
      </form>
      {results && (
        <ul className="flex flex-col gap-1" aria-live="polite">
          {results.length === 0 && <li className="text-ink-muted">No players found. They may not have signed in yet — invite them by email instead.</li>}
          {results.map((u) => {
            const member = memberUids.has(u.uid);
            const sent = invited.has(u.uid);
            return (
              <li key={u.uid} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                <Avatar name={u.displayName} photoURL={u.photoURL} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.displayName}</p>
                  <p className="text-xs text-ink-muted">{PLAYER_ROLE_LABELS[u.playerRole]}</p>
                </div>
                {member ? (
                  <Badge>In squad</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant={sent ? 'secondary' : 'primary'}
                    disabled={sent}
                    onClick={async () => {
                      if (!profile) return;
                      try {
                        const r = await inviteUser(team, u, actorOf(profile));
                        setInvited((s) => new Set(s).add(u.uid));
                        toast.show(r === 'sent' ? `Invitation sent to ${u.displayName}` : `${u.displayName} already has an invitation`);
                      } catch (err) {
                        toast.show(friendlyError(err), 'error');
                      }
                    }}
                  >
                    {sent ? 'Invited' : 'Invite'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmailInvite({ team, link }: { team: WithId<Team>; link: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address');
      return;
    }
    if (!profile) return;
    setError(null);
    setBusy(true);
    try {
      const r = await inviteEmail(team, email, actorOf(profile));
      setLastSent(email.trim().toLowerCase());
      toast.show(r === 'sent' ? 'Invitation created' : 'That address already has an invitation');
      setEmail('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const mailto = (to: string) =>
    `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Join ${team.name} on CricketHub`)}&body=${encodeURIComponent(
      `Hi,\n\nYou're invited to join ${team.name} on CricketHub, where we organise fixtures, availability and results.\n\nSign in with Google using this email address and accept the invitation in your inbox, or join directly with this link:\n${link}\n\nSee you at the ground!`,
    )}`;

  return (
    <section aria-labelledby="email-h" className="card flex flex-col gap-4 p-5">
      <SectionTitle id="email-h" title="3 · Invite by email" />
      <p className="text-ink-muted">
        The invitation waits in their CricketHub inbox until they sign in with this Google address.
        {emailEnabled ? ' An email is sent automatically.' : ' After inviting, you can email them the link from your own mail app.'}
      </p>
      <form onSubmit={send} noValidate className="flex items-end gap-2">
        <div className="flex-1">
          <TextField label="Email address" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        </div>
        <Button type="submit" loading={busy} icon={<Send size={16} aria-hidden />}>
          Invite
        </Button>
      </form>
      {lastSent && (
        <a href={mailto(lastSent)} className="press inline-flex items-center gap-2 self-start rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold">
          <Mail size={16} aria-hidden /> Email {lastSent} from my mail app
        </a>
      )}
    </section>
  );
}
