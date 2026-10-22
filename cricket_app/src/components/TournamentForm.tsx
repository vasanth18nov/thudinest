/** Tournament settings form, for creating and editing. */
import { useState, type FormEvent } from 'react';
import type { TournamentInput } from '../data/tournaments';
import { DEFAULT_POINTS } from '../lib/pointsTable';
import { FORMAT_LABELS } from '../lib/text';
import { MATCH_TYPES, TOURNAMENT_FORMATS, type MatchType, type TournamentFormat } from '../lib/types';
import { fieldErrors, tournamentSchema } from '../lib/validation';
import { Button, Checkbox, SelectField, TextAreaField, TextField } from './ui';

const FORMAT_HELP: Record<TournamentFormat, string> = {
  league: 'Everyone plays everyone. Top of the table wins.',
  knockout: 'Lose and you are out. Seeds get byes if the numbers are uneven.',
  groups: 'Round robin in groups, then the top teams go into a knockout.',
};

const today = () => new Date().toISOString().slice(0, 10);

export function TournamentForm({
  initial,
  locked,
  submitLabel,
  onSubmit,
}: {
  initial?: TournamentInput;
  /** Format can't change once fixtures exist */
  locked?: boolean;
  submitLabel: string;
  onSubmit: (input: TournamentInput) => Promise<void>;
}) {
  const [v, setV] = useState({
    name: initial?.name ?? '',
    startDate: initial?.startDate ?? today(),
    endDate: initial?.endDate ?? today(),
    format: initial?.format ?? ('league' as TournamentFormat),
    overs: String(initial?.overs ?? 20),
    matchType: initial?.matchType ?? ('T20' as MatchType),
    teamCount: String(initial?.teamCount ?? 8),
    entryRules: initial?.entryRules ?? '',
    venue: initial?.venue ?? '',
    groupCount: String(initial?.groupCount ?? 2),
    qualifiersPerGroup: String(initial?.qualifiersPerGroup ?? 2),
    doubleRoundRobin: initial?.doubleRoundRobin ?? false,
    win: String(initial?.points.win ?? DEFAULT_POINTS.win),
    tie: String(initial?.points.tie ?? DEFAULT_POINTS.tie),
    noResult: String(initial?.points.noResult ?? DEFAULT_POINTS.noResult),
    loss: String(initial?.points.loss ?? DEFAULT_POINTS.loss),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v, value: string | boolean) => setV((s) => ({ ...s, [k]: value }));
  const num = (k: keyof typeof v) => (e: { target: { value: string } }) => set(k, e.target.value.replace(/\D/g, '').slice(0, 3));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = tournamentSchema.safeParse({
      name: v.name,
      startDate: v.startDate,
      endDate: v.endDate,
      format: v.format,
      overs: Number(v.overs),
      matchType: v.matchType,
      teamCount: Number(v.teamCount),
      entryRules: v.entryRules,
      venue: v.venue,
      points: { win: Number(v.win), tie: Number(v.tie), noResult: Number(v.noResult), loss: Number(v.loss) },
      groupCount: Number(v.groupCount),
      qualifiersPerGroup: Number(v.qualifiersPerGroup),
      doubleRoundRobin: v.doubleRoundRobin,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <TextField label="Tournament name" value={v.name} maxLength={60} onChange={(e) => set('name', e.target.value)} error={errors.name} />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Starts" type="date" value={v.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors.startDate} />
        <TextField label="Ends" type="date" value={v.endDate} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} />
      </div>

      <fieldset disabled={locked}>
        <legend className="mb-2 text-sm font-semibold">Format{locked && <span className="ml-2 font-normal text-ink-muted">(fixed once fixtures are drawn)</span>}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TOURNAMENT_FORMATS.map((f) => (
            <label
              key={f}
              className={`press flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${
                v.format === f ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-ink-muted'
              } ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input type="radio" name="format" value={f} checked={v.format === f} onChange={() => set('format', f)} className="sr-only" />
              <span className="font-display text-xl font-bold uppercase">{FORMAT_LABELS[f]}</span>
              <span className="text-sm text-ink-muted">{FORMAT_HELP[f]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {v.format === 'groups' && (
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Number of groups" inputMode="numeric" value={v.groupCount} onChange={num('groupCount')} error={errors.groupCount} disabled={locked} />
          <TextField label="Qualifiers per group" inputMode="numeric" value={v.qualifiersPerGroup} onChange={num('qualifiersPerGroup')} error={errors.qualifiersPerGroup} />
        </div>
      )}
      {v.format !== 'knockout' && (
        <Checkbox label="Play each other twice (home and away)" checked={v.doubleRoundRobin} onChange={(e) => set('doubleRoundRobin', e.target.checked)} disabled={locked} />
      )}

      <div className="grid grid-cols-3 gap-4">
        <SelectField
          label="Match type"
          value={v.matchType}
          onChange={(e) => {
            const mt = e.target.value as MatchType;
            setV((s) => ({ ...s, matchType: mt, overs: mt === 'T20' ? '20' : mt === 'ODI' ? '50' : s.overs }));
          }}
          options={MATCH_TYPES.map((m) => ({ value: m, label: m }))}
        />
        <TextField label="Overs per side" inputMode="numeric" value={v.overs} onChange={num('overs')} error={errors.overs} />
        <TextField label="Max teams" inputMode="numeric" value={v.teamCount} onChange={num('teamCount')} error={errors.teamCount} />
      </div>
      <TextField label="Main venue" optional value={v.venue} maxLength={120} onChange={(e) => set('venue', e.target.value)} />
      <TextAreaField label="Entry rules" optional rows={4} value={v.entryRules} maxLength={2000} onChange={(e) => set('entryRules', e.target.value)} hint="Eligibility, fees, playing conditions…" error={errors.entryRules} />

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Points for the table</summary>
        <div className="mt-4 grid grid-cols-4 gap-3">
          <TextField label="Win" inputMode="numeric" value={v.win} onChange={num('win')} error={errors['points.win']} />
          <TextField label="Tie" inputMode="numeric" value={v.tie} onChange={num('tie')} />
          <TextField label="No result" inputMode="numeric" value={v.noResult} onChange={num('noResult')} />
          <TextField label="Loss" inputMode="numeric" value={v.loss} onChange={num('loss')} />
        </div>
        <p className="mt-3 text-sm text-ink-muted">Ties on points are split by net run rate, then wins.</p>
      </details>

      {formError && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" loading={saving} className="sm:self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
