/** The signed-in player's profile: edit details, see career stats and teams. */
import { useState } from 'react';
import { Link } from 'react-router';
import { Pencil } from 'lucide-react';
import { CareerStats } from '../components/CareerStats';
import { ProfileForm } from '../components/ProfileForm';
import { TeamName } from '../components/TeamChip';
import { Avatar, Badge, Button, SectionTitle } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTitle, useToast } from '../hooks/useUi';
import { BATTING_LABELS, BOWLING_LABELS, PLAYER_ROLE_LABELS, ROLE_LABELS } from '../lib/text';

export default function Profile() {
  useTitle('My profile');
  const { profile, memberships } = useAuth();
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-8">
      <header className="turf flex flex-wrap items-center gap-5 rounded-3xl p-6">
        <Avatar name={profile.displayName} photoURL={profile.photoURL} size={84} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-willow">{PLAYER_ROLE_LABELS[profile.playerRole]}</p>
          <h1 className="text-5xl text-chalk">{profile.displayName}</h1>
          <p className="mt-1 text-chalk/80">
            {BATTING_LABELS[profile.battingStyle]} · {BOWLING_LABELS[profile.bowlingStyle]}
          </p>
        </div>
        {profile.jerseyNumber !== null && <span className="score text-7xl text-chalk/90">#{profile.jerseyNumber}</span>}
      </header>

      <section aria-labelledby="details-h">
        <SectionTitle
          id="details-h"
          title="Details"
          action={
            !editing && (
              <Button variant="secondary" size="sm" icon={<Pencil size={16} aria-hidden />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          }
        />
        {editing ? (
          <div className="card p-5">
            <ProfileForm
              profile={profile}
              submitLabel="Save profile"
              onSaved={() => {
                setEditing(false);
                toast.show('Profile saved');
              }}
            />
          </div>
        ) : (
          <p className="text-ink-muted">Your name, role and shirt number appear on team sheets and scorecards.</p>
        )}
      </section>

      <section aria-labelledby="teams-h">
        <SectionTitle id="teams-h" title="My teams" />
        {memberships.length ? (
          <ul className="flex flex-wrap gap-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link to={`/teams/${m.teamId}`} className="press inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 font-semibold hover:border-ink-muted">
                  <TeamName teamId={m.teamId} /> <Badge>{ROLE_LABELS[m.role]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">
            Not in a team yet. <Link to="/teams" className="link">Create or join one</Link>.
          </p>
        )}
      </section>

      <section aria-labelledby="career-h">
        <SectionTitle id="career-h" title="Career" />
        <CareerStats uid={profile.uid} />
      </section>
    </div>
  );
}

