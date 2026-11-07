/* The World Cup run: your nation through its real 2026 group (three matchdays, the other results played out from the
   sides' strength), then the 48-team format's knockout rounds: the twelve winners, twelve runners-up and eight best
   third-placed sides into a round of 32, then the last 16, quarter-finals, semi-finals and the final. A knockout
   draw goes to penalties (yours you take; the rest are decided by strength and luck). Saved as you go. */
import { store } from './util.js';
import { NATIONS, GROUPS } from './nations.js';

const KEY = 'wc2026';
const MD = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
export const ROUNDS = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

const rate = (id) => NATIONS[id].rate;
function poisson(l) { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= Math.random(); } while (p > L); return k - 1; }
/* a result between two sides, from their ratings */
export function simScore(a, b) {
  const d = (rate(a) - rate(b)) / 15;
  const la = Math.min(3.6, Math.max(0.2, 1.3 * Math.exp(d * 0.75))), lb = Math.min(3.6, Math.max(0.2, 1.3 * Math.exp(-d * 0.75)));
  return [poisson(la), poisson(lb)];
}
const penWinner = (a, b) => (Math.random() < 0.5 + (rate(a) - rate(b)) / 120 ? a : b);

export const WC = {
  s: null,
  load() { const s = store.get(KEY, null); this.s = s && s.v === 1 && NATIONS[s.team] ? s : null; return this.s; },
  save() { store.set(KEY, this.s); },
  clear() { this.s = null; store.set(KEY, null); },
  start(team, opts) {
    this.s = { v: 1, team, diff: opts.diff, half: opts.half, ground: opts.ground, size: opts.size, stage: 'group', md: 0, res: {}, ko: null, log: [], out: null, champion: null };
    for (const g of Object.keys(GROUPS)) this.s.res[g] = [];
    this.save(); return this.s;
  },
  get group() { return NATIONS[this.s.team].group; },

  /* the table of a group: rows sorted by points, goal difference, goals for */
  table(g) {
    const rows = Object.fromEntries(GROUPS[g].map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
    for (const [a, b, ga, gb] of this.s.res[g]) {
      const A = rows[a], B = rows[b]; A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
      if (ga > gb) { A.w++; B.l++; A.pts += 3; } else if (gb > ga) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
    }
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || rate(y.id) - rate(x.id));
  },

  /* the next match for you: { label, opp, knockout } or null when the run is over */
  next() {
    const s = this.s; if (!s || s.out || s.champion) return null;
    if (s.stage === 'group') {
      const ids = GROUPS[this.group], me = ids.indexOf(s.team);
      const pair = MD[s.md].find((p) => p.includes(me));
      return { label: `Group ${this.group} · Matchday ${s.md + 1}`, opp: ids[pair[0] === me ? pair[1] : pair[0]], knockout: false };
    }
    const tie = s.ko.rounds[s.ko.round].find((t) => t.a === s.team || t.b === s.team);
    return { label: ROUNDS[s.ko.round], opp: tie.a === s.team ? tie.b : tie.a, knockout: true };
  },

  /* your result goes in, the rest of the matchday or round is played out */
  record(gf, ga, pens = null) {
    const s = this.s, nx = this.next(); if (!nx) return;
    s.log.push({ label: nx.label, opp: nx.opp, gf, ga, pens });
    if (s.stage === 'group') {
      for (const g of Object.keys(GROUPS)) {
        const ids = GROUPS[g];
        for (const [i, j] of MD[s.md]) {
          const a = ids[i], b = ids[j];
          if (a === s.team) s.res[g].push([a, b, gf, ga]);
          else if (b === s.team) s.res[g].push([a, b, ga, gf]);
          else s.res[g].push([a, b, ...simScore(a, b)]);
        }
      }
      s.md++;
      if (s.md === 3) {
        this.draw32();
        if (!s.ko.rounds[0].some((t) => t.a === s.team || t.b === s.team)) s.out = { stage: 'Group stage' };
      }
    } else {
      const ties = s.ko.rounds[s.ko.round];
      for (const t of ties) {
        if (t.a === s.team || t.b === s.team) {
          const mine = t.a === s.team; t.ga = mine ? gf : ga; t.gb = mine ? ga : gf;
          if (pens) { t.pa = mine ? pens[0] : pens[1]; t.pb = mine ? pens[1] : pens[0]; }
          t.w = t.ga > t.gb ? t.a : t.gb > t.ga ? t.b : (t.pa > t.pb ? t.a : t.b);
        } else this.playTie(t);
      }
      this.advance();
    }
    // out: the rest of the cup is played out so you see who won it
    if (s.out) while (!s.champion) { for (const t of s.ko.rounds[s.ko.round]) if (!t.w) this.playTie(t); this.advance(); }
    this.save();
  },
  playTie(t) {
    [t.ga, t.gb] = simScore(t.a, t.b);
    if (t.ga === t.gb) { const w = penWinner(t.a, t.b); const [x, y] = [4 + (Math.random() < 0.3 ? 1 : 0), 2 + ((Math.random() * 2) | 0)]; t.pa = w === t.a ? x : y; t.pb = w === t.a ? y : x; t.w = w; }
    else t.w = t.ga > t.gb ? t.a : t.b;
  },
  advance() {
    const s = this.s, ko = s.ko, ties = ko.rounds[ko.round];
    const me = ties.find((t) => t.a === s.team || t.b === s.team);
    if (me && me.w !== s.team && !s.out) s.out = { stage: ROUNDS[ko.round], by: me.w };
    if (ko.round === ROUNDS.length - 1) { s.champion = ties[0].w; return; }
    const next = [];
    for (let i = 0; i < ties.length; i += 2) next.push({ a: ties[i].w, b: ties[i + 1].w });
    ko.rounds.push(next); ko.round++;
  },

  /* the round of 32: the sides seeded by how they did, 1 v 32 and so on in a bracket that keeps the best apart, and no
     two sides from the same group meeting straight away */
  draw32() {
    const s = this.s, first = [], second = [], third = [];
    for (const g of Object.keys(GROUPS)) { const t = this.table(g); first.push({ ...t[0], g }); second.push({ ...t[1], g }); third.push({ ...t[2], g }); }
    const by = (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || rate(y.id) - rate(x.id);
    first.sort(by); second.sort(by); third.sort(by);
    s.thirds = third.slice(0, 8).map((r) => r.id);
    const seeds = [...first, ...second, ...third.slice(0, 8)];
    // the bracket positions of seeds 1..32
    let order = [1];
    while (order.length < 32) { const n = order.length * 2 + 1; order = order.flatMap((x) => [x, n - x]); }
    const ties = [];
    for (let i = 0; i < 32; i += 2) ties.push({ a: seeds[order[i] - 1], b: seeds[order[i + 1] - 1] });
    // same group: swap the lower seed with the next tie's
    for (let i = 0; i < ties.length; i++) {
      if (ties[i].a.g !== ties[i].b.g) continue;
      for (let k = 1; k < ties.length; k++) {
        const j = (i + k) % ties.length;
        if (ties[j].b.g !== ties[i].a.g && ties[i].b.g !== ties[j].a.g) { const t = ties[i].b; ties[i].b = ties[j].b; ties[j].b = t; break; }
      }
    }
    s.stage = 'ko'; s.ko = { round: 0, rounds: [ties.map((t) => ({ a: t.a.id, b: t.b.id }))] };
  },
};
