/** Player profile form, used on the welcome screen and the profile page. */
import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Segmented, SelectField, TextField } from './ui';
import { friendlyError } from '../data/common';
import { saveProfile } from '../data/users';
import { emailEnabled } from '../firebase';
import { BATTING_LABELS, BOWLING_LABELS, PLAYER_ROLE_LABELS } from '../lib/text';
import { BATTING_STYLES, BOWLING_STYLES, PLAYER_ROLES, type PlayerRole, type UserProfile } from '../lib/types';
import { fieldErrors, numberOrNull, profileSchema } from '../lib/validation';

const ROLE_ICONS: Record<PlayerRole, string> = { batter: '🏏', bowler: '🎯', allRounder: '⚡', wicketkeeper: '🧤' };

export function ProfileForm({ profile, submitLabel, onSaved }: { profile: UserProfile; submitLabel: string; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [playerRole, setPlayerRole] = useState(profile.playerRole);
  const [battingStyle, setBattingStyle] = useState(profile.battingStyle);
  const [bowlingStyle, setBowlingStyle] = useState(profile.bowlingStyle);
  const [jersey, setJersey] = useState(profile.jerseyNumber?.toString() ?? '');
  const [emailNotifications, setEmailNotifications] = useState(profile.emailNotifications);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({
      displayName,
      playerRole,
      battingStyle,
      bowlingStyle,
      jerseyNumber: numberOrNull(jersey),
      emailNotifications,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    setFormError(null);
    try {
      await saveProfile(profile.uid, parsed.data, profile.photoURL);
      onSaved();
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField label="Name on the team sheet" value={displayName} maxLength={60} autoComplete="name" onChange={(e) => setDisplayName(e.target.value)} error={errors.displayName} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Primary role</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLAYER_ROLES.map((r) => (
            <label
              key={r}
              className={`press flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-3 text-center font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${
                playerRole === r ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:border-ink-muted'
              }`}
            >
              <input type="radio" name="playerRole" value={r} checked={playerRole === r} onChange={() => setPlayerRole(r)} className="sr-only" />
              <span className="text-2xl" aria-hidden>
                {ROLE_ICONS[r]}
              </span>
              {PLAYER_ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="mb-2 text-sm font-semibold" id="bat-label">
          Batting
        </p>
        <Segmented
          label="Batting style"
          value={battingStyle}
          onChange={setBattingStyle}
          options={BATTING_STYLES.map((b) => ({ value: b, label: BATTING_LABELS[b] }))}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Bowling"
          value={bowlingStyle}
          onChange={(e) => setBowlingStyle(e.target.value as typeof bowlingStyle)}
          options={BOWLING_STYLES.map((b) => ({ value: b, label: BOWLING_LABELS[b] }))}
        />
        <TextField
          label="Preferred shirt number"
          optional
          inputMode="numeric"
          value={jersey}
          onChange={(e) => setJersey(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
          error={errors.jerseyNumber}
        />
      </div>

      {emailEnabled && (
        <Checkbox
          label="Email me copies of notifications"
          hint="New fixtures, reminders and results. In-app notifications always arrive."
          checked={emailNotifications}
          onChange={(e) => setEmailNotifications(e.target.checked)}
        />
      )}

      {formError && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" loading={saving}>
        {submitLabel}
      </Button>
    </form>
  );
}
