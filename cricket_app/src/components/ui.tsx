/**
 * The CricketHub UI kit. Small, accessible building blocks styled with the
 * design tokens in index.css.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router';
import { CircleAlert, WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useUi';
import { initials } from '../lib/text';

/* ── Buttons ───────────────────────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]',
  secondary: 'bg-surface text-ink border border-line hover:border-ink-muted',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-leather text-white hover:brightness-110',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-[0.95rem] gap-2',
  lg: 'h-13 px-6 text-base gap-2.5',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `press inline-flex select-none items-center justify-center rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading ? <BallSpinner size={16} /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}

/* ── Form fields ───────────────────────────────────────────────────────── */

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-muted/70 transition-colors hover:border-ink-muted focus:border-accent focus:outline-none focus-visible:outline-3 focus-visible:outline-focus aria-[invalid=true]:border-danger';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string | null;
  id: string;
  children: ReactNode;
  optional?: boolean;
}

function FieldShell({ label, hint, error, id, children, optional }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1 text-xs font-semibold text-danger">
          <CircleAlert size={14} aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string | null) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type Common = { label: string; hint?: string; error?: string | null; optional?: boolean };

export function TextField({ label, hint, error, optional, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} optional={optional}>
      <input
        id={id}
        {...rest}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} ${rest.className ?? ''}`}
      />
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, optional, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} optional={optional}>
      <textarea
        id={id}
        rows={3}
        {...rest}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} resize-y`}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  options,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[] }) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} optional={optional}>
      <select
        id={id}
        {...rest}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} appearance-none bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23889a8e' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({ label, hint, ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" {...rest} className="mt-1 size-5 shrink-0 accent-[var(--ch-accent)]" />
      <label htmlFor={id} className="text-sm">
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-ink-muted">{hint}</span>}
      </label>
    </div>
  );
}

/* ── Segmented control (radio group) ───────────────────────────────────── */

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  disabled,
}: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string; tone?: 'good' | 'bad' | 'meh' }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].value);
  };
  const tone = (t?: string) =>
    t === 'good' ? 'bg-accent text-accent-ink' : t === 'bad' ? 'bg-leather text-white' : t === 'meh' ? 'bg-willow text-pitch-950' : 'bg-ink text-bg';

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (value === null && i === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`press flex-1 rounded-lg font-semibold ${size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${
              checked ? `${tone(o.tone)} shadow` : 'text-ink-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */

export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(tabs[next].value);
  };
  return (
    <div role="tablist" aria-label={label} className="no-print -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none]">
      {tabs.map((t, i) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${t.value}`}
            aria-selected={active}
            aria-controls={`panel-${t.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative shrink-0 px-3 pb-3 pt-2 font-display text-lg font-bold uppercase tracking-wide transition-colors ${
              active ? 'text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 font-sans text-xs font-bold">{t.count}</span>
            )}
            {active && <span className="absolute inset-x-2 -bottom-px h-1 rounded-t bg-accent" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${value}`} aria-labelledby={`tab-${value}`} className="animate-rise pt-5">
      {children}
    </div>
  );
}

/* ── Identity ──────────────────────────────────────────────────────────── */

export function Avatar({ name, photoURL, size = 40 }: { name: string; photoURL?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (photoURL && !broken) {
    return (
      <img
        src={photoURL}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover ring-2 ring-surface"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-pitch-700 font-display font-bold text-chalk ring-2 ring-surface"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials(name, 2)}
    </span>
  );
}

/** A team's crest: uploaded logo, or initials on a shield in the team colours. */
export function TeamBadge({
  name,
  shortName,
  logo,
  colors,
  size = 44,
}: {
  name: string;
  shortName?: string | null;
  logo?: string | null;
  colors?: { primary: string; secondary: string } | null;
  size?: number;
}) {
  if (logo) {
    return <img src={logo} alt="" width={size} height={size} className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  }
  const primary = colors?.primary ?? '#3d5a48';
  const secondary = colors?.secondary ?? '#f7f4ea';
  const text = (shortName || initials(name)).slice(0, 4);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path d="M24 2 44 9v15c0 12-8.6 19.6-20 22C12.6 43.6 4 36 4 24V9z" fill={primary} />
      <path d="M24 2 44 9v15c0 12-8.6 19.6-20 22C12.6 43.6 4 36 4 24V9z" fill="none" stroke={secondary} strokeWidth="2.5" strokeOpacity=".9" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontFamily="Big Shoulders Display, sans-serif"
        fontWeight="900"
        fontSize={text.length > 3 ? 13 : 16}
        fill={secondary}
      >
        {text}
      </text>
    </svg>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'warn' | 'live' }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-muted',
    accent: 'bg-accent-soft text-accent',
    danger: 'bg-leather/12 text-danger',
    warn: 'bg-willow/30 text-warn',
    live: 'bg-leather text-white',
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}

/* ── Loading, empty and error states ───────────────────────────────────── */

/** A cricket ball with its seam, spinning. */
export function BallSpinner({ size = 28, label }: { size?: number; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ animation: 'ball-spin 0.8s linear infinite' }}>
        <circle cx="16" cy="16" r="14" fill="#b3202a" />
        <circle cx="12" cy="11" r="5" fill="#fff" opacity=".18" />
        <path d="M9 4.5c4.5 6 4.5 17 0 23M23 4.5c-4.5 6-4.5 17 0 23" fill="none" stroke="#f7f4ea" strokeWidth="1.3" strokeDasharray="1.6 1.4" />
      </svg>
      {label && <span className="text-sm font-semibold text-ink-muted">{label}</span>}
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <BallSpinner size={36} label={label} />
    </div>
  );
}

export function SkeletonList({ rows = 3, height = 76 }: { rows?: number; height?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

/** Stumps and bails: the empty-state illustration. */
function Stumps() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden className="text-ink-muted">
      <rect x="18" y="20" width="5" height="44" rx="2" fill="currentColor" opacity=".55" />
      <rect x="33.5" y="20" width="5" height="44" rx="2" fill="currentColor" opacity=".55" />
      <rect x="49" y="20" width="5" height="44" rx="2" fill="currentColor" opacity=".55" />
      <rect x="17" y="15" width="18" height="3.5" rx="1.75" fill="#dcc48e" transform="rotate(-8 26 17)" />
      <rect x="37" y="15" width="18" height="3.5" rx="1.75" fill="#dcc48e" />
      <path d="M6 66h60" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity=".4" />
    </svg>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <Stumps />
      <h3 className="text-2xl">{title}</h3>
      {body && <p className="max-w-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', error, onRetry }: { title?: string; error?: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : null;
  const denied = message?.toLowerCase().includes('permission');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-leather/30 bg-leather/5 px-6 py-10 text-center">
      <CircleAlert className="text-danger" size={32} aria-hidden />
      <h3 className="text-2xl">{denied ? 'Members only' : title}</h3>
      <p className="max-w-sm text-ink-muted">
        {denied ? "You don't have access to this. Ask a team admin to add you." : message || 'Please check your connection and try again.'}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Shown when data came from the offline cache because the device is offline. (Firestore also
 * serves the cache first on every load, so `fromCache` alone isn't a reliable offline signal.) */
export function OfflineNote({ show }: { show: boolean }) {
  const online = useOnline();
  if (!show || online) return null;
  return (
    <p className="no-print inline-flex items-center gap-1.5 rounded-lg bg-willow/25 px-2.5 py-1 text-xs font-semibold text-warn">
      <WifiOff size={14} aria-hidden /> Showing saved data
    </p>
  );
}

/* ── Layout helpers ────────────────────────────────────────────────────── */

export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: string; title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-5xl sm:text-6xl">{title}</h1>
        {children}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-3xl">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: 'accent' | 'danger' }) {
  return (
    <div className="flex flex-col">
      <span className={`score text-4xl leading-none ${tone === 'accent' ? 'text-accent' : tone === 'danger' ? 'text-danger' : ''}`}>{value}</span>
      <span className="eyebrow mt-1">{label}</span>
    </div>
  );
}

/* ── Dialogs ───────────────────────────────────────────────────────────── */

/** Native <dialog>: focus trapping, Esc to close and the backdrop come from the browser. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-pitch-950/60 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-3xl">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-2xl leading-none text-ink-muted hover:text-ink">
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Confirmation dialog, optionally asking for a reason (e.g. cancelling a fixture). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  reasonLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (reasonLabel && !reason.trim()) {
      setError('Please give a reason.');
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="text-ink-muted">{body}</div>
        {reasonLabel && (
          <TextAreaField label={reasonLabel} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} error={error} />
        )}
        {!reasonLabel && error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={submit}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
