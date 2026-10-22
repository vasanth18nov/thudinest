/**
 * Create / edit a team. Logos are resized in the browser to a small WebP and stored inline
 * on the team document, so the app runs on Firebase's free plan without Cloud Storage.
 */
import { useRef, useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { initials } from '../lib/text';
import { fieldErrors, teamSchema } from '../lib/validation';
import type { TeamColors } from '../lib/types';
import type { TeamInput } from '../data/teams';
import { Button, TeamBadge, TextField } from './ui';

const PALETTES: TeamColors[] = [
  { primary: '#146c3c', secondary: '#f7f4ea' },
  { primary: '#b3202a', secondary: '#f2d16b' },
  { primary: '#1d4e89', secondary: '#f7f4ea' },
  { primary: '#0e2318', secondary: '#dcc48e' },
  { primary: '#6b2fa3', secondary: '#f2d16b' },
  { primary: '#c47e00', secondary: '#0e2318' },
  { primary: '#0f766e', secondary: '#fde68a' },
  { primary: '#9d174d', secondary: '#f7f4ea' },
];

/** Downscale an image file to a square WebP data URL (~10–30 KB). */
async function resizeLogo(file: File, size = 192): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Cover-crop to a square
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  const webp = canvas.toDataURL('image/webp', 0.85);
  // Safari < 16 can't encode WebP and silently returns PNG; fall back to JPEG to stay small.
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}

export function TeamForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: TeamInput;
  submitLabel: string;
  onSubmit: (input: TeamInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [shortName, setShortName] = useState(initial?.shortName ?? '');
  const [homeGround, setHomeGround] = useState(initial?.homeGround ?? '');
  const [colors, setColors] = useState<TeamColors>(initial?.colors ?? PALETTES[0]);
  const [logo, setLogo] = useState<string | null>(initial?.logoDataUrl ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((e) => ({ ...e, logoDataUrl: 'Choose an image file' }));
      return;
    }
    try {
      setLogo(await resizeLogo(file));
      setErrors(({ logoDataUrl: _drop, ...rest }) => rest);
    } catch {
      setErrors((e) => ({ ...e, logoDataUrl: "That image couldn't be read" }));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = teamSchema.safeParse({ name, shortName, homeGround, colors, logoDataUrl: logo });
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
      setFormError(err instanceof Error ? err.message : 'Could not save the team.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 md:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-5">
        <TextField label="Team name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Short name"
            optional
            hint={`Defaults to ${initials(name || 'Team name')}`}
            value={shortName}
            maxLength={4}
            onChange={(e) => setShortName(e.target.value.toUpperCase())}
            error={errors.shortName}
          />
          <TextField label="Home ground" optional value={homeGround} maxLength={80} onChange={(e) => setHomeGround(e.target.value)} error={errors.homeGround} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Team colours</legend>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => {
              const active = p.primary === colors.primary && p.secondary === colors.secondary;
              return (
                <button
                  key={p.primary + p.secondary}
                  type="button"
                  aria-label={`Colours ${p.primary} and ${p.secondary}`}
                  aria-pressed={active}
                  onClick={() => setColors(p)}
                  className={`press size-11 rounded-full ring-offset-2 ring-offset-bg ${active ? 'ring-3 ring-accent' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${p.primary} 55%, ${p.secondary} 55%)` }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="color" value={colors.primary} onChange={(e) => setColors((c) => ({ ...c, primary: e.target.value }))} className="size-9 cursor-pointer rounded" />
              Primary
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="color" value={colors.secondary} onChange={(e) => setColors((c) => ({ ...c, secondary: e.target.value }))} className="size-9 cursor-pointer rounded" />
              Secondary
            </label>
          </div>
        </fieldset>

        {formError && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" loading={saving} className="md:self-start">
          {submitLabel}
        </Button>
      </div>

      {/* Live preview + logo */}
      <aside className="order-first flex flex-col items-center gap-3 md:order-none">
        <div className="turf flex w-full flex-col items-center gap-3 rounded-2xl p-6">
          <TeamBadge name={name || 'Team'} shortName={shortName || initials(name || 'Team')} logo={logo} colors={colors} size={96} />
          <span className="font-display text-2xl font-bold uppercase text-chalk">{name || 'Your team'}</span>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="logo-file" onChange={(e) => pickLogo(e.target.files?.[0])} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Upload size={16} aria-hidden />} onClick={() => fileRef.current?.click()}>
            {logo ? 'Change logo' : 'Upload logo'}
          </Button>
          {logo && (
            <Button variant="ghost" size="sm" onClick={() => setLogo(null)}>
              Use initials
            </Button>
          )}
        </div>
        {errors.logoDataUrl && <p className="text-xs font-semibold text-danger">{errors.logoDataUrl}</p>}
      </aside>
    </form>
  );
}
