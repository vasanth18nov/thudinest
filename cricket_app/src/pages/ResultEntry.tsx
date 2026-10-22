/**
 * Enter or correct a result: innings totals (winner and margin worked out automatically),
 * man of the match, and an optional full scorecard. Players are picked from the squads
 * so their career stats update; anyone else can be typed in as a guest.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageHeader, PageLoader, Segmented, SelectField, TextField } from '../components/ui';
import { actorOf, friendlyError } from '../data/common';
import { fixtureTitle } from '../data/fixtures';
import { saveResult, type ResultInput } from '../data/results';
import { db } from '../firebase';
import { canManageMatches, useAuth } from '../hooks/useAuth';
import { useDocData, useQueryData } from '../hooks/useFirestore';
import { useTitle, useToast } from '../hooks/useUi';
import { ballsToOvers, computeMargin, MAX_WICKETS, otherSide, oversToBalls, resultSummary } from '../lib/cricket';
import type { BattingLine, BowlingLine, Fixture, InningsScore, Lineup, MatchResult, ResultWinner, Side, TeamMember, Tournament, WithId } from '../lib/types';

type Mode = 'scores' | 'noResult' | 'awarded';
interface InningsForm {
  runs: string;
  wickets: string;
  overs: string;
}
interface BatRow {
  key: number;
  name: string;
  runs: string;
  balls: string;
  fours: string;
  sixes: string;
  notOut: boolean;
}
interface BowlRow {
  key: number;
  name: string;
  overs: string;
  maidens: string;
  runs: string;
  wickets: string;
}

let rowKey = 0;
const newBat = (): BatRow => ({ key: ++rowKey, name: '', runs: '', balls: '', fours: '', sixes: '', notOut: false });
const newBowl = (): BowlRow => ({ key: ++rowKey, name: '', overs: '', maidens: '', runs: '', wickets: '' });
const int = (s: string) => (s.trim() === '' ? 0 : Number(s));
const digits = (s: string, max = 4) => s.replace(/\D/g, '').slice(0, max);

export default function ResultEntry() {
  const { fixtureId = '' } = useParams();
  const fixture = useDocData<Fixture>(`fixtures/${fixtureId}`);
  const existing = useDocData<MatchResult>(`matchResults/${fixtureId}`);
  const tournament = useDocData<Tournament>(fixture.data?.tournamentId ? `tournaments/${fixture.data.tournamentId}` : null);
  const { profile, roleIn } = useAuth();

  if (fixture.loading || existing.loading || tournament.loading) return <PageLoader />;
  if (!fixture.data) return <EmptyState title="Fixture not found" />;
  const f = fixture.data;
  const t = tournament.data;
  const allowed =
    (!!f.ownerTeamId && canManageMatches(roleIn(f.ownerTeamId))) || (!!t && !!profile && (t.ownerUid === profile.uid || t.adminUids.includes(profile.uid)));
  if (!allowed) return <ErrorState error="permission-denied" />;
  if (!f.home.name || !f.away.name) return <EmptyState title="Teams not decided yet" body="Enter the earlier knockout results first." />;
  return <ResultForm fixture={f} existing={existing.data} />;
}

function ResultForm({ fixture: f, existing }: { fixture: WithId<Fixture>; existing: WithId<MatchResult> | null }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  useTitle(`Result: ${fixtureTitle(f)}`);
  const isKnockout = f.stage?.kind === 'knockout';
  const names = { home: f.home.name, away: f.away.name };

  // Squads (in-app teams) and their XIs, for picking players by name
  const homeRoster = useQueryData<TeamMember>(f.home.teamId ? `roster-${f.home.teamId}` : null, () => query(collection(db, 'teamMembers'), where('teamId', '==', f.home.teamId)));
  const awayRoster = useQueryData<TeamMember>(f.away.teamId ? `roster-${f.away.teamId}` : null, () => query(collection(db, 'teamMembers'), where('teamId', '==', f.away.teamId)));
  const homeXi = useDocData<Lineup>(f.home.teamId ? `fixtures/${f.id}/lineups/${f.home.teamId}` : null);
  const awayXi = useDocData<Lineup>(f.away.teamId ? `fixtures/${f.id}/lineups/${f.away.teamId}` : null);

  const squads = useMemo(() => {
    const build = (roster: WithId<TeamMember>[], xi: string[] = []) =>
      [...roster].sort((a, b) => Number(xi.includes(b.uid)) - Number(xi.includes(a.uid)) || a.displayName.localeCompare(b.displayName));
    return { home: build(homeRoster.data, homeXi.data?.uids), away: build(awayRoster.data, awayXi.data?.uids) };
  }, [homeRoster.data, awayRoster.data, homeXi.data, awayXi.data]);

  const initialInnings = (s: InningsScore | undefined): InningsForm =>
    s ? { runs: String(s.runs), wickets: String(s.wickets), overs: ballsToOvers(s.balls) } : { runs: '', wickets: '', overs: '' };

  const [mode, setMode] = useState<Mode>(existing ? (existing.winner === 'noResult' ? 'noResult' : existing.innings ? 'scores' : 'awarded') : 'scores');
  const [battedFirst, setBattedFirst] = useState<Side>(existing?.battedFirst ?? 'home');
  const [innings, setInnings] = useState<Record<Side, InningsForm>>({
    home: initialInnings(existing?.innings?.home),
    away: initialInnings(existing?.innings?.away),
  });
  const [awardedTo, setAwardedTo] = useState<Side>(existing?.winner === 'away' ? 'away' : 'home');
  const [advancing, setAdvancing] = useState<Side | ''>(existing?.advancing ?? '');
  const [marginOverride, setMarginOverride] = useState<string | null>(existing && existing.innings ? existing.margin : null);
  const [mom, setMom] = useState(existing?.manOfTheMatch?.name ?? '');
  const [showCard, setShowCard] = useState(!!existing && (existing.batting.length > 0 || existing.bowling.length > 0));
  const [batting, setBatting] = useState<Record<Side, BatRow[]>>(() => {
    const from = (side: Side) =>
      existing?.batting
        .filter((b) => b.side === side)
        .map((b) => ({ key: ++rowKey, name: b.name, runs: String(b.runs), balls: String(b.balls), fours: String(b.fours), sixes: String(b.sixes), notOut: b.notOut })) ?? [];
    return { home: from('home'), away: from('away') };
  });
  const [bowling, setBowling] = useState<Record<Side, BowlRow[]>>(() => {
    // keyed by the side that is BATTING (i.e. bowlers from the other side)
    const from = (battingSide: Side) =>
      existing?.bowling
        .filter((b) => b.side === otherSide(battingSide))
        .map((b) => ({ key: ++rowKey, name: b.name, overs: ballsToOvers(b.balls), maidens: String(b.maidens), runs: String(b.runs), wickets: String(b.wickets) })) ?? [];
    return { home: from('home'), away: from('away') };
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Parse innings
  const parsed = useMemo(() => {
    const parse = (s: InningsForm): InningsScore | null => {
      if (s.runs === '' || s.overs === '') return null;
      const balls = oversToBalls(s.overs);
      return { runs: int(s.runs), wickets: Math.min(int(s.wickets), MAX_WICKETS), balls };
    };
    return { home: parse(innings.home), away: parse(innings.away) };
  }, [innings]);

  const auto = parsed.home && parsed.away && mode === 'scores' ? computeMargin({ battedFirst, home: parsed.home, away: parsed.away, oversLimit: f.overs }) : null;
  const winner: ResultWinner = mode === 'noResult' ? 'noResult' : mode === 'awarded' ? awardedTo : auto?.winner ?? 'tie';
  const needsAdvancing = isKnockout && (winner === 'tie' || winner === 'noResult');
  const margin = mode === 'scores' ? marginOverride ?? auto?.margin ?? '' : mode === 'awarded' ? 'by forfeit' : '';

  const playerUid = (side: Side, name: string) => squads[side].find((m) => m.displayName.toLowerCase() === name.trim().toLowerCase())?.uid ?? null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problems: string[] = [];
    if (mode === 'scores') {
      for (const side of ['home', 'away'] as const) {
        const s = parsed[side];
        if (!s) problems.push(`Enter ${names[side]}'s runs and overs.`);
        else {
          if (Number.isNaN(s.balls)) problems.push(`${names[side]}: overs must look like 19.4 (balls 0–5).`);
          else if (s.balls > f.overs * 6) problems.push(`${names[side]}: more than the ${f.overs}-over limit.`);
          if (int(innings[side].wickets) > MAX_WICKETS) problems.push(`${names[side]}: at most ${MAX_WICKETS} wickets.`);
        }
      }
    }
    if (needsAdvancing && !advancing) problems.push(winner === 'tie' ? 'Choose who won the super over / tie-break.' : 'Choose which team goes through.');

    const bat: BattingLine[] = [];
    const bowl: BowlingLine[] = [];
    if (showCard) {
      for (const side of ['home', 'away'] as const) {
        for (const row of batting[side].filter((r) => r.name.trim())) {
          bat.push({ side, uid: playerUid(side, row.name), name: row.name.trim(), runs: int(row.runs), balls: int(row.balls), fours: int(row.fours), sixes: int(row.sixes), notOut: row.notOut });
        }
        const bowlingSide = otherSide(side);
        for (const row of bowling[side].filter((r) => r.name.trim())) {
          const balls = oversToBalls(row.overs || '0');
          if (Number.isNaN(balls)) problems.push(`${row.name}: overs must look like 3.2`);
          bowl.push({ side: bowlingSide, uid: playerUid(bowlingSide, row.name), name: row.name.trim(), balls: balls || 0, maidens: int(row.maidens), runs: int(row.runs), wickets: int(row.wickets) });
        }
      }
      if ([...bat, ...bowl].some((l) => Object.values(l).some((v) => typeof v === 'number' && (v < 0 || v > 999)))) problems.push('Figures must be between 0 and 999.');
    }
    if (problems.length) {
      setErrors(problems);
      return;
    }
    setErrors([]);

    const momName = mom.trim();
    const momUid = momName ? playerUid('home', momName) ?? playerUid('away', momName) : null;
    const input: ResultInput = {
      battedFirst,
      winner,
      advancing: needsAdvancing ? (advancing as Side) : null,
      margin,
      innings: mode === 'scores' ? { home: parsed.home!, away: parsed.away! } : null,
      manOfTheMatch: momName ? { uid: momUid, name: momName } : null,
      batting: bat,
      bowling: bowl,
    };
    if (!profile) return;
    setSaving(true);
    try {
      await saveResult(f, input, actorOf(profile));
      toast.show('Result saved. Tables and stats are updated.');
      navigate(`/fixtures/${f.id}`, { replace: true });
    } catch (err) {
      setErrors([friendlyError(err)]);
      setSaving(false);
    }
  };

  const setInn = (side: Side, k: keyof InningsForm, v: string) => {
    setInnings((s) => ({ ...s, [side]: { ...s[side], [k]: v } }));
    setMarginOverride(null); // scores changed, so recompute the margin
  };
  const order: Side[] = [battedFirst, otherSide(battedFirst)];
  const allNames = [...squads.home, ...squads.away].map((m) => m.displayName);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={existing ? 'Correct result' : 'Enter result'} title={fixtureTitle(f)}>
        <p className="mt-2 text-ink-muted">
          {f.overs} overs per side{isKnockout ? ` · ${f.stage?.roundLabel}` : ''}
        </p>
      </PageHeader>
      {/* datalists give type-ahead player names on phones without a custom widget */}
      <datalist id="players-home">{squads.home.map((m) => <option key={m.uid} value={m.displayName} />)}</datalist>
      <datalist id="players-away">{squads.away.map((m) => <option key={m.uid} value={m.displayName} />)}</datalist>
      <datalist id="players-all">{allNames.map((n) => <option key={n} value={n} />)}</datalist>

      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Segmented
          label="Outcome"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'scores', label: 'Played' },
            { value: 'noResult', label: 'No result' },
            { value: 'awarded', label: 'Walkover' },
          ]}
        />

        {mode === 'scores' && (
          <>
            <div>
              <p className="mb-2 text-sm font-semibold">Batted first</p>
              <Segmented label="Batted first" value={battedFirst} onChange={(v) => { setBattedFirst(v); setMarginOverride(null); }} options={[{ value: 'home', label: names.home }, { value: 'away', label: names.away }]} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {order.map((side, i) => (
                <fieldset key={side} className="card flex flex-col gap-3 p-4">
                  <legend className="sr-only">{names[side]} innings</legend>
                  <p className="eyebrow">{i === 0 ? '1st innings' : '2nd innings'}</p>
                  <p className="font-display text-2xl font-bold uppercase">{names[side]}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <TextField label="Runs" inputMode="numeric" value={innings[side].runs} onChange={(e) => setInn(side, 'runs', digits(e.target.value))} />
                    <TextField label="Wickets" inputMode="numeric" value={innings[side].wickets} onChange={(e) => setInn(side, 'wickets', digits(e.target.value, 2))} />
                    <TextField label="Overs" inputMode="decimal" placeholder={String(f.overs)} value={innings[side].overs} onChange={(e) => setInn(side, 'overs', e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} />
                  </div>
                </fieldset>
              ))}
            </div>
          </>
        )}

        {mode === 'awarded' && (
          <div>
            <p className="mb-2 text-sm font-semibold">Awarded to</p>
            <Segmented label="Awarded to" value={awardedTo} onChange={setAwardedTo} options={[{ value: 'home', label: names.home }, { value: 'away', label: names.away }]} />
          </div>
        )}

        {needsAdvancing && (
          <SelectField
            label={winner === 'tie' ? 'Super over / tie-break winner' : 'Team that goes through'}
            value={advancing}
            onChange={(e) => setAdvancing(e.target.value as Side | '')}
            options={[
              { value: '', label: 'Choose…' },
              { value: 'home', label: names.home },
              { value: 'away', label: names.away },
            ]}
          />
        )}

        {mode === 'scores' && auto && (
          <div className="rounded-2xl bg-accent-soft p-4">
            <p className="eyebrow mb-1">Result</p>
            <p className="font-display text-2xl font-bold uppercase text-accent">{resultSummary(winner, margin, names, needsAdvancing && advancing ? advancing : null)}</p>
            {winner !== 'tie' && (
              <div className="mt-3 max-w-xs">
                <TextField label="Margin wording" value={margin} maxLength={60} onChange={(e) => setMarginOverride(e.target.value)} hint="Change for DLS or other adjustments" />
              </div>
            )}
          </div>
        )}

        <TextField label="Player of the match" optional list="players-all" value={mom} maxLength={60} onChange={(e) => setMom(e.target.value)} hint="Pick from the squads to credit their career stats" />

        <div className="card p-4">
          <label className="flex cursor-pointer items-center gap-3 font-semibold">
            <input type="checkbox" checked={showCard} onChange={(e) => setShowCard(e.target.checked)} className="size-5 accent-[var(--ch-accent)]" />
            Add batting and bowling figures
          </label>
          <p className="ml-8 text-sm text-ink-muted">Figures for squad members count towards their career stats.</p>
        </div>

        {showCard &&
          order.map((side) => (
            <InningsCard
              key={side}
              battingName={names[side]}
              bowlingName={names[otherSide(side)]}
              battingList={`players-${side}`}
              bowlingList={`players-${otherSide(side)}`}
              bat={batting[side]}
              bowl={bowling[side]}
              setBat={(rows) => setBatting((b) => ({ ...b, [side]: rows }))}
              setBowl={(rows) => setBowling((b) => ({ ...b, [side]: rows }))}
            />
          ))}

        {errors.length > 0 && (
          <ul role="alert" className="list-disc rounded-xl bg-leather/10 p-4 pl-8 text-sm font-semibold text-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0">
          <Button type="submit" size="lg" loading={saving} className="w-full sm:w-auto">
            {existing ? 'Save corrected result' : 'Save result'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NumberCell({ label, hint, value, onChange, max = 3, wide }: { label: string; hint: string; value: string; onChange: (v: string) => void; max?: number; wide?: boolean }) {
  return (
    <input
      aria-label={label}
      placeholder={hint}
      inputMode={wide ? 'decimal' : 'numeric'}
      value={value}
      onChange={(e) => onChange(wide ? e.target.value.replace(/[^\d.]/g, '').slice(0, 5) : digits(e.target.value, max))}
      className="w-full min-w-0 rounded-lg border border-line bg-surface px-1 py-2 text-center tabular-nums placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
    />
  );
}

function InningsCard({
  battingName,
  bowlingName,
  battingList,
  bowlingList,
  bat,
  bowl,
  setBat,
  setBowl,
}: {
  battingName: string;
  bowlingName: string;
  battingList: string;
  bowlingList: string;
  bat: BatRow[];
  bowl: BowlRow[];
  setBat: (rows: BatRow[]) => void;
  setBowl: (rows: BowlRow[]) => void;
}) {
  const updBat = (key: number, patch: Partial<BatRow>) => setBat(bat.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const updBowl = (key: number, patch: Partial<BowlRow>) => setBowl(bowl.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const rows = bat;

  return (
    <section className="card flex flex-col gap-4 p-4" aria-label={`${battingName} batting`}>
      <h3 className="text-2xl">{battingName} batting</h3>
      <div className="flex flex-col gap-2">
        {rows.length > 0 && (
          <div className="hidden gap-1.5 pl-1 text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted sm:flex" aria-hidden>
            <span className="flex-1">Batter</span>
            <span className="grid w-56 grid-cols-4 gap-1.5 text-center">
              <span>R</span>
              <span>B</span>
              <span>4s</span>
              <span>6s</span>
            </span>
            <span className="w-9 text-center">N/O</span>
            <span className="w-9" />
          </div>
        )}
        {rows.map((r, i) => (
          <div key={r.key} className="flex flex-wrap items-center gap-1.5 border-b border-line/60 pb-2 sm:flex-nowrap sm:border-0 sm:pb-0">
            <input
              aria-label={`Batter ${i + 1} name`}
              list={battingList}
              value={r.name}
              placeholder="Name"
              onChange={(e) => updBat(r.key, { name: e.target.value.slice(0, 60) })}
              className="w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 py-2 focus:border-accent focus:outline-none sm:w-auto sm:flex-1"
            />
            <span className="grid flex-1 grid-cols-4 gap-1.5 sm:w-56 sm:flex-none">
              <NumberCell label={`Batter ${i + 1} runs`} hint="R" value={r.runs} onChange={(v) => updBat(r.key, { runs: v })} />
              <NumberCell label={`Batter ${i + 1} balls`} hint="B" value={r.balls} onChange={(v) => updBat(r.key, { balls: v })} />
              <NumberCell label={`Batter ${i + 1} fours`} hint="4s" value={r.fours} onChange={(v) => updBat(r.key, { fours: v })} max={2} />
              <NumberCell label={`Batter ${i + 1} sixes`} hint="6s" value={r.sixes} onChange={(v) => updBat(r.key, { sixes: v })} max={2} />
            </span>
            <span className="flex w-9 justify-center">
              <input type="checkbox" aria-label={`Batter ${i + 1} not out`} checked={r.notOut} onChange={(e) => updBat(r.key, { notOut: e.target.checked })} className="size-5 accent-[var(--ch-accent)]" />
            </span>
            <button type="button" aria-label={`Remove batter ${i + 1}`} onClick={() => setBat(bat.filter((x) => x.key !== r.key))} className="flex w-9 justify-center rounded-lg p-2 text-ink-muted hover:text-danger">
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="self-start" icon={<Plus size={16} aria-hidden />} onClick={() => setBat([...bat, newBat()])} disabled={bat.length >= 11}>
          Add batter
        </Button>
      </div>

      <h4 className="font-display text-xl font-bold uppercase text-ink-muted">{bowlingName} bowling</h4>
      <div className="flex flex-col gap-2">
        {bowl.length > 0 && (
          <div className="hidden gap-1.5 pl-1 text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted sm:flex" aria-hidden>
            <span className="flex-1">Bowler</span>
            <span className="grid w-56 grid-cols-4 gap-1.5 text-center">
              <span>O</span>
              <span>M</span>
              <span>R</span>
              <span>W</span>
            </span>
            <span className="w-9" />
          </div>
        )}
        {bowl.map((r, i) => (
          <div key={r.key} className="flex flex-wrap items-center gap-1.5 border-b border-line/60 pb-2 sm:flex-nowrap sm:border-0 sm:pb-0">
            <input
              aria-label={`Bowler ${i + 1} name`}
              list={bowlingList}
              value={r.name}
              placeholder="Name"
              onChange={(e) => updBowl(r.key, { name: e.target.value.slice(0, 60) })}
              className="w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 py-2 focus:border-accent focus:outline-none sm:w-auto sm:flex-1"
            />
            <span className="grid flex-1 grid-cols-4 gap-1.5 sm:w-56 sm:flex-none">
              <NumberCell label={`Bowler ${i + 1} overs`} hint="O" value={r.overs} onChange={(v) => updBowl(r.key, { overs: v })} wide />
              <NumberCell label={`Bowler ${i + 1} maidens`} hint="M" value={r.maidens} onChange={(v) => updBowl(r.key, { maidens: v })} max={2} />
              <NumberCell label={`Bowler ${i + 1} runs`} hint="R" value={r.runs} onChange={(v) => updBowl(r.key, { runs: v })} />
              <NumberCell label={`Bowler ${i + 1} wickets`} hint="W" value={r.wickets} onChange={(v) => updBowl(r.key, { wickets: v })} max={2} />
            </span>
            <button type="button" aria-label={`Remove bowler ${i + 1}`} onClick={() => setBowl(bowl.filter((x) => x.key !== r.key))} className="flex w-9 justify-center rounded-lg p-2 text-ink-muted hover:text-danger">
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="self-start" icon={<Plus size={16} aria-hidden />} onClick={() => setBowl([...bowl, newBowl()])} disabled={bowl.length >= 11}>
          Add bowler
        </Button>
      </div>
    </section>
  );
}
