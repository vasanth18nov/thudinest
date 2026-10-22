/**
 * One in-app team's side of a fixture: my availability, the captain's RSVP summary
 * with reminders, and the playing XI (picked by the captain from the squad).
 */
import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Bell, Pencil } from 'lucide-react';
import { actorOf, friendlyError } from '../data/common';
import { sendRsvpReminder, setAvailability, setLineup } from '../data/fixtures';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useDocData, useQueryData } from '../hooks/useFirestore';
import { useToast } from '../hooks/useUi';
import { PLAYER_ROLE_LABELS, RSVP_LABELS } from '../lib/text';
import { RSVP_STATUSES, type Availability, type Fixture, type Lineup, type RsvpStatus, type TeamMember, type WithId } from '../lib/types';
import { TeamName } from './TeamChip';
import { Avatar, Badge, Button, Segmented } from './ui';

const TONE: Record<RsvpStatus, 'good' | 'meh' | 'bad'> = { available: 'good', maybe: 'meh', unavailable: 'bad' };
const XI_SIZE = 11;

export function TeamMatchPanel({
  fixture,
  teamId,
  isMember,
  canManage,
}: {
  fixture: WithId<Fixture>;
  teamId: string;
  isMember: boolean;
  canManage: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const roster = useQueryData<TeamMember>(`roster-${teamId}`, () => query(collection(db, 'teamMembers'), where('teamId', '==', teamId)));
  const rsvps = useQueryData<Availability>(isMember ? `rsvp-${fixture.id}-${teamId}` : null, () =>
    query(collection(db, 'availability'), where('fixtureId', '==', fixture.id), where('teamId', '==', teamId)),
  );
  const lineup = useDocData<Lineup>(`fixtures/${fixture.id}/lineups/${teamId}`);
  const [picking, setPicking] = useState(false);
  const [reminding, setReminding] = useState(false);

  const statusOf = useMemo(() => new Map(rsvps.data.map((r) => [r.uid, r.status])), [rsvps.data]);
  const mine = profile ? statusOf.get(profile.uid) ?? null : null;
  const open = fixture.status === 'scheduled';
  const groups = RSVP_STATUSES.map((s) => ({ status: s, players: roster.data.filter((m) => statusOf.get(m.uid) === s) }));
  const noReply = roster.data.filter((m) => !statusOf.has(m.uid));
  const xi = lineup.data?.uids ?? [];
  const byUid = new Map(roster.data.map((m) => [m.uid, m]));

  const rsvp = async (status: RsvpStatus) => {
    if (!profile) return;
    try {
      await setAvailability(fixture.id, teamId, profile, status);
      toast.show(`Marked ${RSVP_LABELS[status].toLowerCase()}`);
    } catch (err) {
      toast.show(friendlyError(err), 'error');
    }
  };

  return (
    <section aria-label="Squad for this match" className="card flex flex-col gap-5 p-5">
      <h2 className="text-3xl">
        <TeamName teamId={teamId} />
      </h2>

      {isMember && open && (
        <div>
          <p className="mb-2 text-sm font-semibold">Are you available?</p>
          <Segmented label="My availability" value={mine} onChange={rsvp} options={RSVP_STATUSES.map((s) => ({ value: s, label: RSVP_LABELS[s], tone: TONE[s] }))} />
        </div>
      )}

      {/* Availability summary: captains see everyone; members see counts and names */}
      {isMember && (
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-center min-[420px]:grid-cols-4">
            {groups.map((g) => (
              <div key={g.status} className="rounded-xl bg-surface-2 py-2">
                <p className={`score text-3xl ${g.status === 'available' ? 'text-accent' : g.status === 'unavailable' ? 'text-danger' : 'text-warn'}`}>{g.players.length}</p>
                <p className="eyebrow !text-[0.65rem]">{RSVP_LABELS[g.status]}</p>
              </div>
            ))}
            <div className="rounded-xl bg-surface-2 py-2">
              <p className="score text-3xl text-ink-muted">{noReply.length}</p>
              <p className="eyebrow !text-[0.65rem]">No reply</p>
            </div>
          </div>
          {canManage && (
            <details className="group">
              <summary className="cursor-pointer select-none text-sm font-semibold text-accent">Who's said what</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[...groups.map((g) => ({ label: RSVP_LABELS[g.status], players: g.players })), { label: 'No reply', players: noReply }].map((g) => (
                  <div key={g.label}>
                    <p className="eyebrow mb-1">{g.label}</p>
                    <p className="text-sm">{g.players.length ? g.players.map((p) => p.displayName).join(', ') : '—'}</p>
                  </div>
                ))}
              </div>
              {open && noReply.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  loading={reminding}
                  icon={<Bell size={16} aria-hidden />}
                  onClick={async () => {
                    if (!profile) return;
                    setReminding(true);
                    try {
                      await sendRsvpReminder(fixture, teamId, noReply.map((m) => m.uid), actorOf(profile));
                      toast.show(`Reminder sent to ${noReply.length} player${noReply.length > 1 ? 's' : ''}`);
                    } catch (err) {
                      toast.show(friendlyError(err), 'error');
                    } finally {
                      setReminding(false);
                    }
                  }}
                >
                  Remind {noReply.length} who haven't replied
                </Button>
              )}
            </details>
          )}
        </div>
      )}

      {/* Playing XI */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-2xl">Playing XI</h3>
          {canManage && fixture.status !== 'cancelled' && !picking && (
            <Button variant="secondary" size="sm" icon={<Pencil size={14} aria-hidden />} onClick={() => setPicking(true)}>
              {xi.length ? 'Change' : 'Pick XI'}
            </Button>
          )}
        </div>
        {picking ? (
          <LineupPicker
            roster={roster.data}
            statusOf={statusOf}
            initial={xi}
            onCancel={() => setPicking(false)}
            onSave={async (uids) => {
              if (!profile) return;
              try {
                await setLineup(fixture, teamId, uids, actorOf(profile));
                toast.show('Playing XI saved. Selected players have been notified.');
                setPicking(false);
              } catch (err) {
                toast.show(friendlyError(err), 'error');
              }
            }}
          />
        ) : xi.length ? (
          <ol className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {xi.map((uid, i) => {
              const m = byUid.get(uid);
              return (
                <li key={uid} className="flex items-center gap-2 py-1">
                  <span className="score w-6 text-right text-ink-muted">{i + 1}</span>
                  <Avatar name={m?.displayName ?? '?'} photoURL={m?.photoURL} size={28} />
                  <span className="truncate font-semibold">{m?.displayName ?? 'Former player'}</span>
                  {m && <span className="ml-auto text-xs text-ink-muted">{PLAYER_ROLE_LABELS[m.playerRole]}</span>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-ink-muted">{canManage ? 'Pick the XI once availability is in.' : 'The captain has not picked the XI yet.'}</p>
        )}
      </div>
    </section>
  );
}

function LineupPicker({
  roster,
  statusOf,
  initial,
  onCancel,
  onSave,
}: {
  roster: WithId<TeamMember>[];
  statusOf: Map<string, RsvpStatus>;
  initial: string[];
  onCancel: () => void;
  onSave: (uids: string[]) => Promise<void>;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const rank = (uid: string) => ({ available: 0, maybe: 1, unavailable: 3 })[statusOf.get(uid) ?? 'maybe'] + (statusOf.has(uid) ? 0 : 1);
  const sorted = [...roster].sort((a, b) => rank(a.uid) - rank(b.uid) || a.displayName.localeCompare(b.displayName));
  const toggle = (uid: string) => setPicked((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]));

  return (
    <div className="flex flex-col gap-3">
      <p className={`text-sm font-semibold ${picked.length === XI_SIZE ? 'text-accent' : 'text-ink-muted'}`} aria-live="polite">
        {picked.length} of {XI_SIZE} selected{picked.length > XI_SIZE ? ' (includes reserves)' : ''}
      </p>
      <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto pr-1">
        {sorted.map((m) => {
          const s = statusOf.get(m.uid);
          return (
            <li key={m.uid}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                <input type="checkbox" checked={picked.includes(m.uid)} onChange={() => toggle(m.uid)} className="size-5 accent-[var(--ch-accent)]" />
                <Avatar name={m.displayName} photoURL={m.photoURL} size={28} />
                <span className="flex-1 truncate font-semibold">{m.displayName}</span>
                <Badge tone={s === 'available' ? 'accent' : s === 'unavailable' ? 'danger' : s === 'maybe' ? 'warn' : 'neutral'}>
                  {s ? RSVP_LABELS[s] : 'No reply'}
                </Badge>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <Button
          loading={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(picked);
            setSaving(false);
          }}
        >
          Save XI
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
