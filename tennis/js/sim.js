/* Set Point: the tennis itself, with no graphics, so the same file runs the game in the browser and the test matches
   in Node. Court, the ball's flight (drag and spin) and bounce, the shot solver, footwork, the computer's choices,
   the rules and the scoring.
   Axes: x across the court, y up, z along it; the net is the plane z = 0. Side 0 plays the half z > 0 (the near end
   in the broadcast view), side 1 the half z < 0. Metres, seconds, radians per second. */

export const COURT = {
  halfL: 11.885, // net to the outside edge of the baseline
  halfW: 5.485, // doubles sideline (drawn, not played)
  halfWS: 4.115, // singles sideline: the rally court
  svc: 6.4, // net to the service line
  netH: 0.914, netHPost: 1.07, postX: 6.4, // net height at the centre strap and at the posts
  line: 0.05,
};
/* The ball: 57.7 g, 6.7 cm across. Gravity, quadratic drag (Cd 0.55) and the Magnus lift of its spin, which is what
   makes topspin dip and kick and slice float and skid. Integrated at 240 steps a second; the solver flies the same
   steps, so shots land where they are aimed. */
export const G = 9.81, R = 0.0335, KD = 0.0202, KM = 0.00098, DT = 1 / 240;
const ALPHA = 0.55; // moment of inertia over m r², a hollow ball
export const sideSign = (side) => (side === 0 ? 1 : -1);
export const netHeight = (x) => COURT.netH + (COURT.netHPost - COURT.netH) * Math.min(1, (x / COURT.postX) ** 2);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* Shots: spin (+ topspin, - backspin, rad/s), how high over the tape (clear, metres) or how fast (v, m/s), and how
   deep (metres past the net, dd how far the aim moves it); err scales the mishit, fr the chance of a real one */
export const SHOTS = {
  top: { spin: 260, clear: 1.2, depth: 9.6, dd: 1.6, err: 1.0, fr: 0.025, label: 'Topspin' },
  flat: { spin: 70, clear: 0.42, depth: 9.9, dd: 1.4, err: 1.15, fr: 0.04, label: 'Flat' },
  slice: { spin: -170, clear: 0.6, depth: 9.2, dd: 1.6, err: 0.95, fr: 0.025, label: 'Slice' },
  lob: { spin: 170, clear: 4.2, depth: 9.7, dd: 1.2, err: 1.0, fr: 0.03, label: 'Lob' },
  drop: { spin: -260, clear: 0.42, depth: 2.6, dd: 1.0, err: 1.25, fr: 0.05, label: 'Drop shot' },
  volley: { spin: -60, v: 24, depth: 7.8, dd: 2.2, err: 0.9, fr: 0.025, label: 'Volley' },
  dvolley: { spin: -150, clear: 0.28, depth: 2.4, dd: 0.9, err: 1.2, fr: 0.05, label: 'Drop volley' },
  smash: { spin: 40, v: 40, depth: 8.2, dd: 2.0, err: 1.0, fr: 0.035, label: 'Smash' },
  serveFlat: { spin: 40, v: 52, depth: 5.7, dd: 0.45, err: 1.0, fr: 0.03, label: 'Flat serve' },
  serveSlice: { spin: 120, v: 44, depth: 5.5, dd: 0.5, err: 0.8, fr: 0.02, label: 'Slice serve' },
  serveKick: { spin: 420, v: 37, depth: 5.3, dd: 0.55, err: 0.6, fr: 0.012, label: 'Kick serve' },
};
const SERVES = new Set(['serveFlat', 'serveSlice', 'serveKick']);
export const isServe = (k) => SERVES.has(k);

/* The computer at three levels; HUMAN: the human player's legs and hands */
export const DIFFS = {
  easy: { name: 'Club', vmax: 5.3, accel: 11, react: 0.3, skill: 0.45, lead: 0.24, leadSd: 0.15, aggr: 0.3, margin: 1.15, read: 0.5, judge: 0.16, net: 0.15, serve: 0.86, pace: 0.8 },
  medium: { name: 'Challenger', vmax: 5.9, accel: 13, react: 0.22, skill: 0.67, lead: 0.22, leadSd: 0.1, aggr: 0.55, margin: 0.8, read: 0.32, judge: 0.08, net: 0.3, serve: 0.93, pace: 0.86 },
  hard: { name: 'Grand Slam', vmax: 6.3, accel: 14.5, react: 0.16, skill: 0.88, lead: 0.21, leadSd: 0.05, aggr: 0.8, margin: 0.55, read: 0.18, judge: 0.035, net: 0.45, serve: 1.0, pace: 0.92 },
};
export const HUMAN = { vmax: 6.1, accel: 14, react: 0.18, skill: 0.8 };

/* timing: how long before the contact the shot was asked for */
export function timing(lead) {
  if (lead < 0.035) return { q: 0.5, label: 'Late' };
  if (lead < 0.09) return { q: 0.82, label: 'Good' };
  if (lead <= 0.42) return { q: 1, label: 'Perfect' };
  if (lead <= 0.75) return { q: 0.8, label: 'Good' };
  return { q: 0.55, label: 'Early' };
}
export let MISHIT = 1; export const setMishit = (k) => { MISHIT = k; };
const PRESS_LIFE = 1.3;

/* ------------------------------------------------------------------ flight */
// one step: gravity, drag, Magnus (w: the spin vector; topspin turns about the horizontal axis left of the motion)
function flyStep(p, v, w, dt) {
  const sp = Math.hypot(v.x, v.y, v.z), kd = KD * sp;
  const mx = w.y * v.z - w.z * v.y, my = w.z * v.x - w.x * v.z, mz = w.x * v.y - w.y * v.x;
  v.x += (-kd * v.x + KM * mx) * dt; v.y += (-G - kd * v.y + KM * my) * dt; v.z += (-kd * v.z + KM * mz) * dt;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
}
// the spin vector for s rad/s of topspin on a ball moving along v
function spinVec(s, v) { const h = Math.hypot(v.x, v.z) || 1; return { x: (v.z / h) * s, y: 0, z: (-v.x / h) * s }; }
/* The bounce on a hard court: the ball comes up with about three quarters of its downward speed (less when it comes
   in hard); along the court the surface grips it through friction, which slows it and spins it forward, until it
   rolls. Topspin arrives already turning forward, so it keeps more of its pace and jumps on; slice skids. */
export function bounce(v, w) {
  const vn = -v.y, h = Math.hypot(v.x, v.z) || 1e-6, ux = v.x / h, uz = v.z / h;
  const e = clamp(0.8 - 0.0045 * vn, 0.66, 0.8);
  // the spin in the direction of travel (topspin positive), r ω
  const s = w.x * uz - w.z * ux, rw = R * s, slip = h - rw;
  const J = 0.62 * (1 + e) * vn; // friction impulse per unit mass, while it slides
  let h2, rw2;
  if (Math.abs(slip) > J * (1 + 1 / ALPHA)) { const sg = Math.sign(slip); h2 = h - sg * J; rw2 = rw + (sg * J) / ALPHA; } else { h2 = (h + ALPHA * rw) / (1 + ALPHA); rw2 = h2; }
  v.x = ux * h2; v.z = uz * h2; v.y = e * vn;
  const s2 = rw2 / R; w.x = uz * s2 * 0.8; w.y = 0; w.z = -ux * s2 * 0.8; // and some of it lost in the scuff
}
/* the same flight in the shot's vertical plane: where it first lands (s along the ground), when, its height where it
   passes the net (at sNet) and its highest point */
export function flight2D(y0, v, th, sNet, spin) {
  let h = v * Math.cos(th), vy = v * Math.sin(th), s = 0, y = y0, t = 0, yNet = NaN, apex = y0;
  for (let i = 0; i < 3000; i++) {
    const sp = Math.hypot(h, vy), kd = KD * sp;
    h += (-kd * h + KM * spin * vy) * DT; vy += (-G - kd * vy - KM * spin * h) * DT;
    const s1 = s + h * DT, y1 = y + vy * DT;
    if (s < sNet && s1 >= sNet) yNet = y + ((y1 - y) * (sNet - s)) / (s1 - s);
    if (y1 <= R) { const u = (y - R) / (y - y1); return { s: s + (s1 - s) * u, t: t + DT * u, yNet, apex }; }
    s = s1; y = y1; t += DT; if (y > apex) apex = y;
  }
  return { s, t, yNet, apex };
}
// how fast to launch at angle th to land D away (null: it can't)
function speedFor(y0, D, th, sNet, spin) {
  let lo = 2, hi = 90;
  if (flight2D(y0, hi, th, sNet, spin).s < D) return null;
  for (let i = 0; i < 28; i++) { const m = 0.5 * (lo + hi); if (flight2D(y0, m, th, sNet, spin).s < D) lo = m; else hi = m; }
  return hi;
}
// the lowest angle at speed v that lands D away; failing that, the one that goes furthest
function angleFor(y0, D, v, sNet, spin) {
  let prev = -1.2, best = -1.2, bestS = -1;
  for (let th = -1.2; th <= 0.9; th += 0.08) {
    const s = flight2D(y0, v, th, sNet, spin).s;
    if (s >= D) {
      if (th === -1.2) return th;
      let lo = prev, hi = th;
      for (let i = 0; i < 18; i++) { const m = 0.5 * (lo + hi); if (flight2D(y0, v, m, sNet, spin).s < D) lo = m; else hi = m; }
      return hi;
    }
    if (s > bestS) { bestS = s; best = th; }
    prev = th;
  }
  return best;
}
// the launch that lands D away and passes over the net at height `want` (or as near as it can)
function overNet(y0, D, sNet, want, spin) {
  let lo = -0.5, hi = 1.3, best = null;
  for (let i = 0; i < 22; i++) {
    const th = 0.5 * (lo + hi), v = speedFor(y0, D, th, sNet, spin);
    if (v === null) { lo = th; continue; }
    const r = flight2D(y0, v, th, sNet, spin);
    best = { th, v };
    if (!(r.yNet >= want)) lo = th; else hi = th;
  }
  return best || { th: 0.4, v: 20 };
}

/* ------------------------------------------------------------------ random */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ------------------------------------------------------------------ players */
// how far from the body the racket reaches a ball at height h (an overhead above 2.1 m)
const reachOf = (h) => (h < 0.18 ? 0 : h < 0.4 ? 1.05 : h < 1.55 ? 1.42 : h < 2.1 ? 1.2 : h < 2.95 ? 0.75 : 0);
const STRETCH = 0.42; // a last long step: the body can be this far short of the ideal spot
const reachTime = (d, vmax, accel) => { const dA = (vmax * vmax) / accel; return d < dA ? 2 * Math.sqrt(d / accel) : (2 * vmax) / accel + (d - dA) / vmax; };
export const BASE_BACK = COURT.halfL + 0.9; // where a baseliner waits, this far from the net
export const BASE_NET = 3.4; // and a net player

export class Player {
  constructor(side, o) {
    this.side = side; this.sg = sideSign(side);
    this.name = o.name || (side === 0 ? 'You' : 'CPU');
    this.ai = o.ai ? DIFFS[o.ai] : null;
    this.vmax = this.ai ? this.ai.vmax : HUMAN.vmax; this.accel = this.ai ? this.ai.accel : HUMAN.accel;
    this.skill = this.ai ? this.ai.skill : HUMAN.skill;
    this.x = 0; this.z = BASE_BACK * this.sg; this.vx = 0; this.vz = 0;
    this.tx = this.x; this.tz = this.z; this.walk = false;
    this.atNet = false; // playing from the net (after an approach)
    this.plan = null; this.press = null; this.swing = null;
    this.auto = true; this.input = { mx: 0, mz: 0, ax: 0, ad: 0 };
    this.leave = false; this.moveAt = 0; this.noise = { x: 0, z: 0, t0: 0, t1: 1 };
    this.stats = { points: 0, winners: 0, errors: 0, aces: 0, doubles: 0, firstIn: 0, firstServes: 0, maxServe: 0, serves: 0, shots: 0, perfect: 0, netWon: 0, netPts: 0, breakPts: 0, breaksWon: 0 };
  }
  /* the ball at P against the body: dr to the right, df forward (toward the net), rho across the court */
  zone(P, x = this.x, z = this.z) {
    const dx = P.x - x, dz = P.z - z, dr = dx * this.sg, df = -dz * this.sg, rho = Math.hypot(dr, df), R = reachOf(P.y);
    return { dr, df, rho, R, in: rho <= R && df >= -0.55 && P.y >= 0.18 && P.y <= 2.95 && P.z * this.sg > 0.2 };
  }
  /* where to stand to take the ball at P: overhead just right of the head; a groundstroke or volley at arm and
     racket's length to the forehand side (+r) or backhand side, a little in front */
  bodyFor(P) {
    const lat = (P.x - this.x) * this.sg, fore = lat >= -0.15, h = P.y;
    let r, f;
    if (h >= 2.1) { r = 0.32; f = 0.3; } else if (h < 0.5) { r = fore ? 0.78 : -0.72; f = 0.55; } else { r = fore ? 0.92 : -0.86; f = 0.45; }
    let x = P.x - r * this.sg, z = P.z + f * this.sg;
    if (z * this.sg < 0.6) z = 0.6 * this.sg;
    x = clamp(x, -7.6, 7.6); z = clamp(z, -17.5, 17.5);
    return { x, z, fore: h < 2.1 ? fore : true };
  }
}

/* ------------------------------------------------------------------ the match */
/* o: { format ('quick' first to 4 games, tiebreak at 3-3 | 'set' one set | 'match' best of three), diff,
        sides: [{ name, ai? }, { name, ai? }], seed, first (who serves) } */
const FORMATS = { quick: { games: 4, tb: 3, sets: 1 }, set: { games: 6, tb: 6, sets: 1 }, match: { games: 6, tb: 6, sets: 3 } };
export class Match {
  constructor(o = {}) {
    this.o = Object.assign({ format: 'quick', diff: 'medium' }, o);
    this.F = FORMATS[this.o.format] || FORMATS.quick;
    this.rand = mulberry(o.seed !== undefined ? o.seed : (Math.random() * 2 ** 32) >>> 0);
    const sides = this.o.sides || [{ name: 'You' }, { name: 'CPU', ai: this.o.diff }];
    this.pl = sides.map((s, i) => new Player(i, s));
    this.ball = { p: { x: 0, y: 1, z: 3 }, v: { x: 0, y: 0, z: 0 }, w: { x: 0, y: 0, z: 0 }, mode: 'held', by: -1, bounces: 0, shots: 0, t: 0, cord: false, served: false };
    this.T = 0; this.acc = 0; this.events = [];
    this.pts = [0, 0]; this.games = [0, 0]; this.sets = [0, 0]; this.setScores = []; this.tiebreak = false; this.tbStart = 0;
    this.server = this.o.first !== undefined ? this.o.first : this.rand() < 0.5 ? 0 : 1;
    this.secondServe = false;
    this.phase = 'intro'; this.phaseT = 0; this.hold = false; this.over = false;
    this.path = null; this.servePlan = null; this.serveAt = 0;
    this.rally = 0; this.longest = 0; this.lastPoint = null;
    this.emit({ type: 'gameStart', server: this.server });
    this.setupServe(true);
  }
  emit(e) { e.T = this.T; this.events.push(e); }
  randn() { return (this.rand() + this.rand() + this.rand() + this.rand() - 2) * 1.732; }
  pick(w) { let s = 0; for (const k in w) s += Math.max(0, w[k]); let r = this.rand() * s; for (const k in w) { r -= Math.max(0, w[k]); if (r <= 0) return k; } return Object.keys(w)[0]; }
  // points played in this game (or tiebreak): even from the deuce court (the server's right), odd from the ad court
  get ptNo() { return this.pts[0] + this.pts[1]; }
  courtSign(side) { return (this.ptNo % 2 === 0 ? 1 : -1) * sideSign(side); } // sign of x of the server's half

  /* ---- time */
  step(dt) { this.acc += Math.min(dt, 0.25); while (this.acc >= DT) { this.acc -= DT; this.tick(); } }
  tick() {
    this.T += DT; this.phaseT += DT;
    const b = this.ball;
    if (this.phase === 'intro' && !this.hold && this.phaseT > 2.0) this.enterServe();
    if (this.phase === 'serve') this.serveTick();
    if (this.phase === 'dead' && !this.hold && this.phaseT > this.deadFor) this.afterPoint();
    for (const pl of this.pl) { this.think(pl); this.move(pl); }
    if (b.mode === 'toss') this.tossTick();
    if (b.mode === 'flight' || b.mode === 'loose') this.fly();
    if (this.phase === 'rally' && b.mode === 'flight') this.tryHit();
    if (this.phase === 'rally') for (const pl of this.pl) if (pl.press && this.T - pl.press.t > PRESS_LIFE) { pl.press = null; if (!pl.ai) this.emit({ type: 'expire', side: pl.side }); }
  }

  /* ---- serving */
  setupServe(first) {
    const s = this.server, r = 1 - s, cs = this.courtSign(s);
    const S = this.pl[s], Rc = this.pl[r];
    S.tx = cs * 0.45; S.tz = (COURT.halfL + 0.12) * S.sg; // just behind the baseline, beside the centre mark
    Rc.tx = -cs * (this.secondServe ? 2.4 : 2.7); Rc.tz = (COURT.halfL + (this.secondServe ? 0.4 : 0.9)) * Rc.sg;
    for (const p of this.pl) {
      p.walk = true; p.plan = null; p.press = null; p.leave = false; p.swing = null; p.atNet = false;
      if (first) { p.x = p.tx; p.z = p.tz; p.vx = p.vz = 0; }
    }
    const b = this.ball; b.mode = 'held'; b.by = -1; b.shots = 0; b.bounces = 0; b.served = false; this.path = null;
    this.servePlan = null; this.serveAt = 0;
  }
  enterServe() { this.phase = 'serve'; this.phaseT = 0; this.serveDelay = 0.7 + this.rand() * 0.9; this.emit({ type: 'serveReady', side: this.server, second: this.secondServe }); }
  serveReady() { return this.pl.every((p) => Math.hypot(p.x - p.tx, p.z - p.tz) < 0.25); }
  serveTick() {
    const S = this.pl[this.server];
    if (this.servePlan) return; // the toss is up
    if (this.hold || !this.serveReady() || this.phaseT < 0.5) return;
    if (S.ai) { if (this.phaseT > this.serveDelay) this.beginServe(this.pick(this.serveMix(S))); }
    else if (S.press) { const btn = S.press.btn; S.press = null; this.beginServe(btn === 'A' ? 'serveFlat' : btn === 'B' ? 'serveKick' : 'serveSlice'); }
  }
  serveMix(S) {
    const a = S.ai;
    return this.secondServe ? { serveKick: 0.8, serveSlice: 0.2 * a.aggr } : { serveFlat: 0.35 + 0.4 * a.aggr, serveSlice: 0.35, serveKick: 0.3 - 0.2 * a.aggr };
  }
  // where the racket meets the toss: up and a little in front of the head
  serveContact(S) { return { x: S.x + 0.18 * S.sg, y: 2.72, z: S.z - 0.38 * S.sg }; }
  beginServe(kind) {
    const S = this.pl[this.server], Rc = this.pl[1 - this.server];
    S.vx = S.vz = 0; S.tx = S.x; S.tz = S.z; S.walk = false;
    const P = this.serveContact(S), cs = -this.courtSign(this.server); // the receiver's box: x of this sign
    let x, depth;
    const W = COURT.halfWS, Sh = SHOTS[kind];
    if (S.ai) {
      // out wide, down the T, or at the body
      const r = this.rand(), m = S.ai.margin * (this.secondServe ? 1.4 : 1) * 0.35;
      x = cs * (r < 0.42 ? W - 0.55 - m : r < 0.84 ? 0.45 + m : 1.8 + this.randn() * 0.3);
      depth = Sh.depth + (this.rand() - 0.5) * Sh.dd - m * 0.4;
    } else {
      const ax = clamp(S.input.ax, -1, 1), ad = clamp(S.input.ad, -1, 1);
      x = cs * 2.0 + ax * 1.55; x = cs > 0 ? clamp(x, 0.35, W - 0.45) : clamp(x, -W + 0.45, -0.35);
      depth = Sh.depth + ad * Sh.dd * 0.6;
    }
    this.servePlan = { kind, P, target: { x, z: depth * Rc.sg } };
    this.serveAt = this.T + 0.95; // the toss rises and falls to the racket
    const b = this.ball; b.mode = 'toss'; b.p = { x: S.x - 0.05 * S.sg, y: 1.55, z: S.z - 0.25 * S.sg };
    b.v = { x: (P.x - b.p.x) / 0.95, y: 0, z: (P.z - b.p.z) / 0.95 };
    b.v.y = (P.y - b.p.y + 0.5 * G * 0.95 * 0.95) / 0.95; b.w = { x: 0, y: 0, z: 0 };
    S.swing = { kind, style: 'serve', t: this.serveAt, P, dir: null, q: 1, label: '' };
    this.emit({ type: 'serveStart', side: S.side, kind });
  }
  tossTick() {
    const b = this.ball; b.p.x += b.v.x * DT; b.p.z += b.v.z * DT; b.v.y -= G * DT; b.p.y += b.v.y * DT;
    if (this.T >= this.serveAt) this.launchServe();
  }
  launchServe() {
    const S = this.pl[this.server], Rc = this.pl[1 - this.server], { kind, P, target } = this.servePlan, b = this.ball;
    const q = 1;
    const skill = S.ai ? S.skill * S.ai.serve : S.skill;
    const v = this.solve(kind, P, target, q, skill, this.secondServe ? 0.7 : 1);
    b.p = { x: P.x, y: P.y, z: P.z }; b.v = v; b.w = spinVec(SHOTS[kind].spin, v);
    b.mode = 'flight'; b.by = S.side; b.shots = 1; b.bounces = 0; b.t = 0; b.cord = false; b.served = true;
    this.servePlan = null; this.phase = 'rally'; this.phaseT = 0; this.rally = 1;
    const sp = Math.hypot(v.x, v.y, v.z);
    S.stats.serves++; S.stats.shots++; if (!this.secondServe) S.stats.firstServes++;
    S.stats.maxServe = Math.max(S.stats.maxServe, sp * 3.6);
    Rc.walk = false;
    S.swing.dir = { x: v.x / sp, y: v.y / sp, z: v.z / sp }; S.swing.speed = sp;
    this.emit({ type: 'hit', side: S.side, kind, style: 'serve', q: 1, label: '', speed: sp, P, serve: true, second: this.secondServe });
    this.afterHit(S);
  }

  /* ---- the ball in the air and on the court */
  fly() {
    const b = this.ball, p = b.p, ox = p.x, oy = p.y, oz = p.z;
    // a dead ball that has stopped bouncing rolls on the court, slowing, until a wall stops it
    if (b.mode === 'loose' && p.y <= R + 1e-4 && Math.abs(b.v.y) < 0.4) {
      p.y = R; b.v.y = 0; b.v.x *= 1 - 0.9 * DT; b.v.z *= 1 - 0.9 * DT; p.x += b.v.x * DT; p.z += b.v.z * DT;
      if (Math.abs(p.z) > COURT.halfL + 6.2) { p.z = Math.sign(p.z) * (COURT.halfL + 6.2); b.v.z *= -0.25; }
      if (Math.abs(p.x) > COURT.halfW + 3.6) { p.x = Math.sign(p.x) * (COURT.halfW + 3.6); b.v.x *= -0.25; }
      return;
    }
    flyStep(p, b.v, b.w, DT); b.t += DT;
    if (b.mode === 'flight' && (oz > 0) !== (p.z > 0) && oz !== 0) {
      const u = oz / (oz - p.z), x = ox + (p.x - ox) * u, y = oy + (p.y - oy) * u;
      if (Math.abs(x) <= COURT.postX) {
        const top = netHeight(x);
        if (y < top - R * 0.6) { this.intoNet(x, y); return; }
        if (y < top + R && !b.cord) this.netCord(x, y);
      }
    }
    if (p.y <= R && b.v.y < 0) {
      const u = (oy - R) / Math.max(1e-6, oy - p.y), x = ox + (p.x - ox) * u, z = oz + (p.z - oz) * u;
      p.x = x; p.y = R; p.z = z;
      bounce(b.v, b.w);
      if (b.mode === 'flight') this.landed(x, z); else if (Math.abs(b.v.y) < 0.4) { b.v.y = 0; }
      if (b.mode === 'loose' && b.v.y > 0.6) this.emit({ type: 'roll', x, z, speed: b.v.y });
      if (b.mode === 'loose' && b.v.y < 0.4) b.v.y = 0;
    }
    if (b.mode === 'loose') {
      // the walls round the court stop it
      if (Math.abs(p.z) > COURT.halfL + 6.2) { p.z = Math.sign(p.z) * (COURT.halfL + 6.2); b.v.z *= -0.25; }
      if (Math.abs(p.x) > COURT.halfW + 3.6) { p.x = Math.sign(p.x) * (COURT.halfW + 3.6); b.v.x *= -0.25; }
    }
  }
  intoNet(x, y) {
    const b = this.ball, by = b.by;
    b.mode = 'loose'; b.p.x = x; b.p.y = y; b.p.z = 0.06 * sideSign(by); b.v = { x: b.v.x * 0.05, y: -0.5, z: 0.6 * sideSign(by) }; b.w = { x: 0, y: 0, z: 0 };
    this.emit({ type: 'net', side: by, x, y });
    if (b.served && b.shots === 1) { this.fault('net'); return; }
    this.pl[by].stats.errors++;
    this.point(1 - by, 'net');
  }
  // the tape: it slows, pops up, and dribbles over (or falls back)
  netCord(x, y) {
    const b = this.ball, v = b.v, sgn = Math.sign(v.z) || 1, over = this.rand() < 0.66;
    b.cord = true;
    v.x *= 0.35; v.y = 0.8 + this.rand() * 1.8; v.z = sgn * (over ? 0.9 + this.rand() * 2.2 : -(0.4 + this.rand() * 0.6)); b.w = { x: 0, y: 0, z: 0 };
    b.p.y = Math.max(b.p.y, netHeight(x) + R);
    this.emit({ type: 'netcord', side: b.by, served: b.served && b.shots === 1 });
    this.path = this.predict();
    const rcv = this.pl[1 - b.by]; if (this.phase === 'rally') this.planFor(rcv, true);
  }
  landed(x, z) {
    const b = this.ball, by = b.by, on = z > 0 ? 0 : 1;
    b.bounces++;
    if (this.phase !== 'rally') { this.emit({ type: 'bounce', x, z, dead: true }); return; }
    const W = COURT.halfWS, L = COURT.halfL, tol = COURT.line * 0.4;
    if (b.bounces === 1) {
      let inside, near;
      if (on === by) { inside = false; near = 9; } // didn't get over
      else if (b.served && b.shots === 1) {
        const cs = -this.courtSign(this.server), ax = x * cs;
        inside = ax >= -tol && ax <= W + tol && Math.abs(z) <= COURT.svc + tol;
        near = Math.min(Math.abs(ax), Math.abs(ax - W), Math.abs(Math.abs(z) - COURT.svc));
      } else {
        inside = Math.abs(x) <= W + tol && Math.abs(z) <= L + tol;
        near = Math.min(Math.abs(Math.abs(x) - W), Math.abs(Math.abs(z) - L));
      }
      this.emit({ type: 'bounce', x, z, inside, on, near, serve: b.served && b.shots === 1, side: by, first: true });
      if (!inside) {
        b.mode = 'loose';
        if (b.served && b.shots === 1) { this.fault('out'); return; }
        this.pl[by].stats.errors++;
        this.point(1 - by, on === by ? 'net' : 'out');
        return;
      }
      if (b.served && b.shots === 1 && b.cord) { b.mode = 'loose'; this.let(); return; }
      this.path = this.predict(); // after the bounce: the rest of its way
      const rcv = this.pl[1 - by];
      if (rcv.plan && rcv.plan.after === false) this.planFor(rcv, true); // was going to volley, too late
      return;
    }
    // the second bounce: nobody got to it
    this.emit({ type: 'bounce', x, z, second: true, side: by });
    b.mode = 'loose';
    const H = this.pl[by];
    H.stats.winners++;
    if (b.served && b.shots === 1) H.stats.aces++;
    this.point(by, b.served && b.shots === 1 ? 'ace' : 'winner');
  }
  let() {
    this.phase = 'dead'; this.phaseT = 0; this.deadFor = 1.6; this.isLet = true;
    for (const p of this.pl) { p.press = null; p.plan = null; }
    this.emit({ type: 'let' });
  }
  fault(why) {
    const S = this.pl[this.server];
    this.phase = 'dead'; this.phaseT = 0;
    for (const p of this.pl) { p.press = null; p.plan = null; }
    if (!this.secondServe) { this.secondServe = true; this.deadFor = 1.5; this.isLet = false; this.isFault = true; this.emit({ type: 'fault', why, side: S.side }); return; }
    S.stats.doubles++; S.stats.errors++;
    this.emit({ type: 'fault', why, double: true, side: S.side });
    this.point(1 - this.server, 'double', true);
  }

  /* ---- the next hitter */
  tryHit() {
    const b = this.ball, pl = this.pl[1 - b.by];
    if (!pl.press || b.by < 0) return;
    if (b.bounces === 0 && b.served) return; // the serve must bounce
    const plan = pl.plan;
    if (plan && plan.after && b.bounces === 0) return; // waiting for it to bounce
    const z = pl.zone(b.p); if (!z.in) return;
    // take it at the plan's point (or when it is about to leave the zone)
    const want = plan ? this.T >= plan.t - DT * 0.5 : true;
    const n = { x: b.p.x + b.v.x * DT, y: b.p.y + b.v.y * DT, z: b.p.z + b.v.z * DT };
    if (want || !pl.zone(n).in) this.hit(pl, z);
  }
  hit(pl, z) {
    const b = this.ball, P = { x: b.p.x, y: b.p.y, z: b.p.z }, opp = this.pl[1 - pl.side];
    let { q, label } = timing(this.T - pl.press.t);
    q *= 1 - 0.5 * Math.max(0, z.rho / z.R - 0.7); // stretched
    if (Math.hypot(pl.vx, pl.vz) > 3.2) q *= 0.86; // on the run
    if (P.y < 0.35) q *= 0.78; // a half volley, off the bounce
    if (b.bounces === 0 && P.y < 0.7) q *= 0.85; // a low volley
    if (z.dr < -0.2 && P.y > 1.7 && P.y < 2.1) q *= 0.8; // a high backhand
    if (b.shots > 10) q *= Math.max(0.55, 1 - 0.02 * (b.shots - 10)); // legs going in a long rally
    const btn = pl.press.btn; pl.press = null;
    const volley = b.bounces === 0, over = P.y >= 2.05;
    let kind, target;
    if (pl.ai) ({ kind, target } = this.aiShot(pl, opp, P, q, volley, over));
    else ({ kind, target } = this.humanShot(pl, btn, P, q, volley, over));
    const v = this.solve(kind, P, target, q, pl.skill, 1);
    b.v = v; b.w = spinVec(SHOTS[kind].spin, v); b.by = pl.side; b.shots++; b.bounces = 0; b.t = 0; b.cord = false; b.served = false;
    this.rally = b.shots;
    const sp = Math.hypot(v.x, v.y, v.z);
    const style = over ? 'smash' : volley ? (z.dr >= -0.1 ? 'volF' : 'volB') : z.dr >= -0.1 ? 'fore' : 'back';
    pl.swing = { kind, style, t: this.T, P, dir: { x: v.x / sp, y: v.y / sp, z: v.z / sp }, q, label, speed: sp, dr: z.dr, df: z.df };
    const st = pl.stats; st.shots++; if (q >= 1) st.perfect++;
    // after a volley, or a short ball attacked, play from the net
    if (volley || over) pl.atNet = true;
    else if (kind === 'lob' || kind === 'drop') pl.atNet = false;
    else if (Math.abs(P.z) < COURT.halfL - 3.2) pl.atNet = pl.ai ? this.rand() < pl.ai.net + 0.35 * pl.ai.aggr : true;
    else pl.atNet = false;
    this.emit({ type: 'hit', side: pl.side, kind, style, q, label, speed: sp, P, shots: b.shots, volley });
    this.afterHit(pl);
  }
  afterHit(pl) {
    const opp = this.pl[1 - pl.side];
    pl.plan = null; pl.leave = false;
    this.path = this.predict();
    // recover: to the middle of the angles the reply can take, a little to the side the ball went
    const L = this.path.land;
    pl.tx = clamp((L ? L.x : 0) * 0.3, -1.6, 1.6);
    pl.tz = (pl.atNet ? BASE_NET + 0.4 : BASE_BACK) * pl.sg; pl.walk = false;
    if (pl.atNet) pl.tx = clamp((L ? L.x : 0) * 0.45, -2, 2);
    pl.moveAt = this.T + (pl.ai ? 0.06 : 0);
    this.planFor(opp, false);
  }

  /* where the ball goes from here if nobody touches it: through its first bounce to the second, sampled every two
     steps; each sample knows whether it has bounced */
  predict() {
    const b = this.ball, p = { ...b.p }, v = { ...b.v }, w = { ...b.w }, out = { t: [], x: [], y: [], z: [], vy: [], n: [], end: 'land', land: null, land2: null };
    let t = this.T, n = b.bounces, cord = b.cord;
    for (let i = 0; i < 2400; i++) {
      const oz = p.z, ox = p.x, oy = p.y;
      flyStep(p, v, w, DT); t += DT;
      if ((oz > 0) !== (p.z > 0) && oz !== 0) {
        const u = oz / (oz - p.z), x = ox + (p.x - ox) * u, y = oy + (p.y - oy) * u;
        if (Math.abs(x) <= COURT.postX && y < netHeight(x) - R * 0.6) { out.end = 'net'; break; }
      }
      if (p.y <= R && v.y < 0) {
        const u = (oy - R) / (oy - p.y), x = ox + (p.x - ox) * u, z = oz + (p.z - oz) * u;
        p.x = x; p.z = z; p.y = R; bounce(v, w); n++;
        if (n === 1) out.land = { x, z, t };
        else { out.land2 = { x, z, t }; break; }
      }
      if (i & 1) { out.t.push(t); out.x.push(p.x); out.y.push(p.y); out.z.push(p.z); out.vy.push(v.y); out.n.push(n); }
    }
    void cord;
    return out;
  }
  /* The receiver's plan. Before the bounce: a volley (from the net, or anywhere a ball comes in that it can take) or an
     overhead on a lob. After it: the groundstroke, taken as the ball falls through about a metre (earlier, on the
     rise, by an attacking player or when it would otherwise be pushed far back). The first such point it can reach
     with a moment to spare; failing that, the one it gets nearest. */
  planFor(pl, again) {
    const path = this.path; pl.plan = null;
    if (!path || path.end === 'net' || this.phase !== 'rally') return;
    const b = this.ball, serve = b.served && b.shots === 1;
    // a ball going out: the computer may judge it out and let it go (see aiPlan); a serve must bounce
    const react = pl.ai ? pl.ai.react * (again ? 0.5 : 1) : again ? 0.02 : HUMAN.react;
    const ex = pl.x + pl.vx * 0.12, ez = pl.z + pl.vz * 0.12;
    const cand = { vol: -1, over: -1, ground: -1, early: -1, any: -1 };
    let best = -1, bestShort = Infinity;
    const netGame = pl.atNet || Math.abs(pl.z) < 7.5;
    const L = path.land, deepBack = L && Math.abs(L.z) > COURT.halfL - 2.2;
    for (let i = 0; i < path.t.length; i++) {
      const P = { x: path.x[i], y: path.y[i], z: path.z[i] }, n = path.n[i];
      if (P.z * pl.sg < 0.6 || P.y < 0.22 || P.y > 2.9) continue;
      if (n === 0 && serve) continue;
      if (n >= 2) break;
      const B = pl.bodyFor(P), d = Math.max(0, Math.hypot(B.x - ex, B.z - ez) - STRETCH), avail = path.t[i] - this.T;
      const slack = avail - react - reachTime(d, pl.vmax, pl.accel);
      if (-slack < bestShort) { bestShort = -slack; best = i; }
      if (slack < 0.08) continue;
      if (n === 0) {
        if (P.y >= 2.05 && cand.over < 0 && Math.abs(P.z) < 9.5) cand.over = i;
        else if (P.y < 2.0 && P.y > 0.3 && cand.vol < 0 && netGame && Math.abs(P.z) < 8.5) cand.vol = i;
      } else {
        if (cand.any < 0) cand.any = i;
        if (cand.early < 0 && P.y >= 0.75 && P.y <= 1.35) cand.early = i;
        if (cand.ground < 0 && path.vy[i] < 0 && P.y <= 1.15) cand.ground = i;
      }
    }
    let i = -1, after = true;
    const aggr = pl.ai ? pl.ai.aggr : 0.5;
    if (cand.over >= 0 && (pl.ai ? this.rand() < 0.85 : true)) { i = cand.over; after = false; }
    else if (cand.vol >= 0 && (pl.atNet || (pl.ai && this.rand() < 0.25 * aggr) || (!pl.ai && Math.abs(pl.z) < 6))) { i = cand.vol; after = false; }
    else {
      // a deep ball with a high bounce: take it on the rise rather than retreat far behind the baseline
      const gi = cand.ground;
      const tooFar = gi >= 0 && Math.abs(path.z[gi]) > COURT.halfL + 2.6;
      if (cand.early >= 0 && (tooFar || (deepBack && this.rand() < 0.3 * aggr))) i = cand.early;
      else if (gi >= 0) i = gi; else if (cand.early >= 0) i = cand.early; else if (cand.any >= 0) i = cand.any;
      else if (cand.vol >= 0) { i = cand.vol; after = false; } else if (cand.over >= 0) { i = cand.over; after = false; }
    }
    const ok = i >= 0;
    if (!ok) { i = best; if (i < 0) return; after = path.n[i] >= 1; }
    const P = { x: path.x[i], y: path.y[i], z: path.z[i] }, B = pl.bodyFor(P);
    pl.plan = { t: path.t[i], P, B, ok, made: this.T, after };
    if (pl.ai) this.aiPlan(pl, again);
  }

  /* ---- legs */
  think(pl) {
    const b = this.ball, a = pl.ai;
    if (this.phase === 'rally' && b.by >= 0 && b.by !== pl.side) {
      if (pl.plan && !pl.leave && this.T >= pl.moveAt) {
        if (pl.ai || pl.auto) {
          let { x, z } = pl.plan.B;
          if (a) { const k = clamp((pl.plan.t - this.T) / Math.max(0.2, pl.noise.t1 - pl.noise.t0), 0, 1); x += pl.noise.x * k; z += pl.noise.z * k; }
          pl.tx = x; pl.tz = z;
        }
        if (a && !pl.press && this.T >= pl.pressAt) pl.press = { btn: 'ai', t: pl.pressAt };
      }
      if (!pl.ai && !pl.auto && (b.mode === 'flight') && this.T - (pl.plan ? pl.plan.made : 0) > 0.06) this.planFor(pl, true);
    }
  }
  move(pl) {
    if (this.servePlan && pl.side === this.server) { pl.vx *= 0.8; pl.vz *= 0.8; return; } // the server, tossing
    let wx, wz;
    const manual = !pl.ai && !pl.auto && (this.phase === 'rally' || this.phase === 'dead');
    const vmax = pl.walk ? Math.min(2.8, pl.vmax) : pl.vmax, accel = pl.walk ? 7 : pl.accel;
    if (manual) {
      const m = Math.hypot(pl.input.mx, pl.input.mz), k = m > 1 ? 1 / m : 1;
      wx = pl.input.mx * k * vmax; wz = pl.input.mz * k * vmax;
    } else if (this.phase === 'dead' && !pl.walk) { wx = pl.vx * 0.9; wz = pl.vz * 0.9; } else {
      const dx = pl.tx - pl.x, dz = pl.tz - pl.z, d = Math.hypot(dx, dz);
      const want = d < 0.01 ? 0 : Math.min(vmax, Math.sqrt(2 * accel * 0.85 * d));
      wx = d < 0.01 ? 0 : (dx / d) * want; wz = d < 0.01 ? 0 : (dz / d) * want;
    }
    let ax = (wx - pl.vx) / DT, az = (wz - pl.vz) / DT; const am = Math.hypot(ax, az);
    if (am > accel) { ax *= accel / am; az *= accel / am; }
    pl.vx += ax * DT; pl.vz += az * DT;
    pl.x += pl.vx * DT; pl.z += pl.vz * DT;
    if (pl.z * pl.sg < 0.6) { pl.z = 0.6 * pl.sg; pl.vz = 0; }
    if (Math.abs(pl.x) > 7.8) { pl.x = Math.sign(pl.x) * 7.8; pl.vx = 0; }
    if (Math.abs(pl.z) > 17.6) { pl.z = Math.sign(pl.z) * 17.6; pl.vz = 0; }
  }

  /* ---- the human's shots: A topspin, B slice (with the aim pulled back, a drop shot), C lob. Over the head any of
     them is a smash; at the net, a volley (B: a drop volley) */
  press(side, btn) {
    const pl = this.pl[side]; if (!pl || pl.ai || this.over) return;
    pl.press = { btn, t: this.T };
  }
  humanShot(pl, btn, P, q, volley, over) {
    const ax = clamp(pl.input.ax, -1, 1), ad = clamp(pl.input.ad, -1, 1), aimed = Math.abs(ax) > 0.25, W = COURT.halfWS;
    let kind;
    if (over) kind = btn === 'C' ? 'lob' : 'smash';
    else if (volley) kind = btn === 'B' ? 'dvolley' : btn === 'C' ? 'lob' : 'volley';
    else if (btn === 'A') kind = q >= 1 && P.y > 0.8 && Math.abs(P.z) < COURT.halfL - 2.5 ? 'flat' : 'top';
    else if (btn === 'B') kind = ad < -0.5 ? 'drop' : 'slice';
    else kind = 'lob';
    const S = SHOTS[kind];
    let x = aimed ? ax * (W - 0.75) : clamp(-P.x * 0.35 + this.randn() * 0.5, -2.2, 2.2);
    if (kind === 'drop' || kind === 'dvolley') x = aimed ? ax * (W - 1.3) : P.x * 0.4;
    let depth = S.depth + ad * S.dd * (ad > 0 ? 0.55 : 1);
    if (kind === 'drop' || kind === 'dvolley') depth = S.depth + (ad + 0.75) * 0.8;
    return { kind, target: { x: clamp(x, -W + 0.35, W - 0.35), z: -pl.sg * clamp(depth, 1.6, COURT.halfL - 0.5) } };
  }

  /* ---- the computer */
  aiPlan(pl, again) {
    const a = pl.ai, path = this.path, plan = pl.plan;
    pl.moveAt = this.T + a.react * (again ? 0.5 : 1);
    pl.pressAt = plan.t - Math.max(0, a.lead + this.randn() * a.leadSd);
    const e = a.read * (plan.ok ? 0.5 : 0.25);
    pl.noise = { x: this.randn() * e, z: this.randn() * e * 0.8, t0: this.T, t1: plan.t };
    // lets one go that it judges out (and not a volley it has to take before it lands)
    pl.leave = false;
    const L = path.land, b = this.ball;
    if (L && b.bounces === 0 && plan.after) {
      let out;
      if (b.served && b.shots === 1) {
        const cs = -this.courtSign(this.server), ax = L.x * cs + this.randn() * a.judge, az = Math.abs(L.z) + this.randn() * a.judge;
        out = ax < -0.03 || ax > COURT.halfWS + 0.02 || az > COURT.svc + 0.02;
      } else {
        const ax = Math.abs(L.x) + this.randn() * a.judge, az = Math.abs(L.z) + this.randn() * a.judge;
        out = ax > COURT.halfWS + 0.02 || az > COURT.halfL + 0.02;
      }
      if (out && (L.z > 0 ? 0 : 1) === pl.side) { pl.leave = true; pl.pressAt = Infinity; pl.tx = pl.x + (L.x - pl.x) * 0.3; pl.tz = pl.z; }
    }
  }
  aiShot(pl, opp, P, q, volley, over) {
    const a = pl.ai, w = {}, d = Math.abs(P.z), oNet = Math.abs(opp.z) < 7, late = q < 0.7;
    const stretched = Math.abs(pl.vx) > 3 || late;
    if (over) { w.smash = 0.9; w.lob = 0.08; }
    else if (volley) { w.volley = 0.8; w.dvolley = (Math.abs(opp.z) > COURT.halfL - 1 ? 0.25 : 0.04) * a.aggr; w.lob = oNet ? 0.15 : 0.02; }
    else {
      const short = d < COURT.halfL - 3, high = P.y > 1.05;
      w.top = 0.62;
      w.flat = (short && high ? 0.55 : 0.08) * a.aggr;
      w.slice = 0.1 + (stretched ? 0.28 : 0) + (P.y < 0.5 ? 0.15 : 0);
      w.lob = oNet ? 0.32 : stretched && d > COURT.halfL ? 0.12 : 0.015;
      w.drop = !oNet && Math.abs(opp.z) > COURT.halfL && d < COURT.halfL - 1 ? 0.12 * a.aggr : 0.006;
      if (oNet) { w.top *= 1.2; w.flat *= 1.3; } // a passing shot
    }
    const kind = this.pick(w);
    return { kind, target: this.aiTarget(pl, opp, kind, P) };
  }
  aiTarget(pl, opp, kind, P) {
    const a = pl.ai, S = SHOTS[kind], W = COURT.halfWS;
    // away from the opponent, now and then behind him; the better the player, the nearer the lines
    let side = opp.x > 0.4 ? -1 : opp.x < -0.4 ? 1 : this.rand() < 0.5 ? -1 : 1;
    if (this.rand() < 0.25) side = -side;
    const edge = W - a.margin;
    let x = side * edge * (0.55 + 0.45 * this.rand());
    let depth = S.depth + (this.rand() - 0.5) * S.dd;
    if (kind === 'top' || kind === 'flat' || kind === 'slice' || kind === 'lob') depth = Math.min(depth, COURT.halfL - a.margin * 0.9);
    if (kind === 'drop' || kind === 'dvolley') { x = clamp(P.x * 0.4 + side * 1.2, -edge, edge); depth = S.depth + (this.rand() - 0.5) * S.dd; }
    if (kind === 'volley' || kind === 'smash') { if (this.rand() < 0.5) depth = 5.5 + this.rand() * 3; x = side * (W - a.margin * 0.8) * (0.7 + 0.3 * this.rand()); }
    // a passing shot against a net player: low and wide, or cross court short
    if (Math.abs(opp.z) < 7 && (kind === 'top' || kind === 'flat')) { x = side * (W - a.margin * 0.7); depth = this.rand() < 0.4 ? 6 + this.rand() * 2 : depth; }
    return { x, z: -pl.sg * depth };
  }

  /* ---- the solver: the launch for a shot from P to land at the target, then the mishit */
  solve(kind, P, target, q, skill, care) {
    const S = SHOTS[kind];
    let dx = target.x - P.x, dz = target.z - P.z;
    const D = Math.max(0.5, Math.hypot(dx, dz)); dx /= D; dz /= D;
    const sNet = Math.abs(dz) > 1e-3 ? -P.z / dz : 1e9;
    const top = netHeight(clamp(P.x + dx * sNet, -COURT.postX, COURT.postX));
    let th, v;
    if (S.v) {
      v = S.v * (0.86 + 0.14 * q) * (isServe(kind) ? (0.8 + 0.2 * skill) * (care < 1 ? 0.94 : 1) : 1);
      th = angleFor(P.y, D, v, sNet, S.spin);
      const r = flight2D(P.y, v, th, sNet, S.spin);
      // can't go over (or get there) at this pace: the flattest flight that does, slower
      if (!(r.yNet >= top + (isServe(kind) ? 0.03 : 0.08)) || Math.abs(r.s - D) > 0.3) {
        if (isServe(kind)) { /* a serve too low or too long simply is: the server meant it */ if (Math.abs(r.s - D) > 0.3) ({ th, v } = overNet(P.y, D, sNet, top + 0.1, S.spin)); }
        else ({ th, v } = overNet(P.y, D, sNet, top + 0.12, S.spin));
      }
    } else ({ th, v } = overNet(P.y, D, sNet, top + S.clear * (0.85 + 0.3 * (1 - skill)), S.spin));
    // the mishit: worse with poor timing and a weaker player
    const e = S.err * (isServe(kind) ? 1.0 : 0.85 + 1.6 * (1 - q)) * (1.35 - skill) * MISHIT * care;
    v *= 1 + this.randn() * 0.06 * e;
    th += this.randn() * (isServe(kind) ? 0.03 : 0.026) * e;
    let psi = this.randn() * 0.045 * e;
    if (this.rand() < S.fr * (1.3 - skill) * (2 - q) * MISHIT * care) {
      const r = this.rand(), sg = this.rand() < 0.5 ? -1 : 1;
      if (r < 0.3) v *= 1.12; else if (r < 0.75) th -= 0.075; else psi += sg * 0.07; // long, into the net, or wide
    }
    const c = Math.cos(psi), s = Math.sin(psi);
    const ux = dx * c - dz * s, uz = dx * s + dz * c, ch = Math.cos(th);
    return { x: v * ch * ux, y: v * Math.sin(th), z: v * ch * uz };
  }

  /* ---- scoring */
  point(winner, reason, double = false) {
    if (this.phase !== 'rally' && !double) return;
    this.phase = 'dead'; this.phaseT = 0; this.isLet = false;
    const loser = 1 - winner, served = this.server;
    const W = this.pl[winner];
    W.stats.points++;
    for (const p of this.pl) if (p.atNet) { p.stats.netPts++; if (p.side === winner) p.stats.netWon++; }
    if (!this.secondServe || double) { /* first serve in? */ }
    this.longest = Math.max(this.longest, this.ball.shots);
    const wasBreakPt = this.breakPoint();
    if (wasBreakPt) { this.pl[1 - this.server].stats.breakPts++; if (winner !== this.server) this.pl[1 - this.server].stats.breaksWon++; }
    if (this.ball.shots >= 1 && !this.secondServe && !double) this.pl[served].stats.firstIn++;
    this.pts[winner]++;
    let game = false, set = false, match = false;
    const a = this.pts[winner], b = this.pts[loser];
    if (this.tiebreak) game = a >= 7 && a - b >= 2;
    else game = a >= 4 && a - b >= 2;
    if (game) {
      this.games[winner]++;
      const ga = this.games[winner], gb = this.games[loser], N = this.F.games;
      set = this.tiebreak || (ga >= N && ga - gb >= 2);
      if (set) {
        this.sets[winner]++;
        this.setScores.push({ g: this.games.slice(), tb: this.tiebreak ? this.pts.slice() : null });
        match = this.sets[winner] > this.F.sets / 2;
      }
    }
    this.gameWon = game ? winner : -1; this.setWon = set ? winner : -1; this.matchWon = match ? winner : -1;
    this.deadFor = match ? 3 : set ? 3.4 : game ? 2.6 : 1.6;
    this.lastPoint = { winner, reason, rally: this.ball.shots, served, pts: this.pts.slice(), tiebreak: this.tiebreak, game, set, match, breakPt: wasBreakPt, broke: wasBreakPt && winner !== served, games: this.games.slice(), sets: this.sets.slice() };
    for (const p of this.pl) { p.press = null; p.plan = null; }
    this.emit(Object.assign({ type: 'point' }, this.lastPoint));
  }
  // the receiver is a point from the game
  breakPoint() {
    const r = 1 - this.server, a = this.pts[r], b = this.pts[this.server];
    if (this.tiebreak) return false;
    return a >= 3 && a - b >= 1;
  }
  // 'match', 'set', 'game' or 'break' point, for the side that could win it with the next point (null if none)
  pointFor() {
    if (this.phase === 'over') return null;
    for (const s of [this.server, 1 - this.server]) {
      const a = this.pts[s] + 1, b = this.pts[1 - s];
      const g = this.tiebreak ? a >= 7 && a - b >= 2 : a >= 4 && a - b >= 2;
      if (!g) continue;
      const ga = this.games[s] + 1, gb = this.games[1 - s];
      const st = this.tiebreak || (ga >= this.F.games && ga - gb >= 2);
      if (st && this.sets[s] + 1 > this.F.sets / 2) return { side: s, kind: 'match' };
      if (st) return { side: s, kind: 'set' };
      return { side: s, kind: s === this.server || this.tiebreak ? 'game' : 'break' };
    }
    return null;
  }
  /* the call: "15–0", "Deuce", "Advantage X", tiebreak points as numbers (the server's first) */
  callText(names) {
    const s = this.server, a = this.pts[s], b = this.pts[1 - s];
    if (this.tiebreak) { const hi = Math.max(a, b), lo = Math.min(a, b); return hi === lo ? `${hi} all` : `${hi}–${lo} ${names[a > b ? s : 1 - s]}`; }
    const P = ['Love', '15', '30', '40'];
    if (a >= 3 && b >= 3) return a === b ? 'Deuce' : `Advantage ${names[a > b ? s : 1 - s]}`;
    if (a === b) return `${P[a]} all`;
    return `${P[a]}–${P[b]}`;
  }
  // the point score as shown on the board, per side
  board() {
    if (this.tiebreak) return [String(this.pts[0]), String(this.pts[1])];
    const P = ['0', '15', '30', '40'], [a, b] = this.pts;
    if (a >= 3 && b >= 3) return a === b ? ['40', '40'] : a > b ? ['AD', ''] : ['', 'AD'];
    return [P[Math.min(a, 3)], P[Math.min(b, 3)]];
  }
  afterPoint() {
    if (this.isLet || this.isFault) { this.isLet = false; this.isFault = false; this.setupServe(false); this.enterServe(); return; }
    if (this.matchWon >= 0) {
      if (!this.over) { this.over = true; this.phase = 'over'; this.phaseT = 0; this.emit({ type: 'match', winner: this.matchWon, sets: this.sets.slice(), setScores: this.setScores.slice() }); }
      return;
    }
    if (this.gameWon >= 0) {
      const w = this.gameWon, wasTb = this.tiebreak;
      this.emit({ type: 'game', winner: w, games: this.games.slice(), set: this.setWon >= 0, tiebreak: wasTb });
      this.pts = [0, 0]; this.secondServe = false;
      // the server changes every game; after a tiebreak, the one who received first in it serves
      this.server = wasTb ? 1 - this.tbStart : 1 - this.server;
      if (this.setWon >= 0) { this.emit({ type: 'set', winner: this.setWon, sets: this.sets.slice(), score: this.setScores[this.setScores.length - 1] }); this.games = [0, 0]; }
      this.tiebreak = this.games[0] === this.F.tb && this.games[1] === this.F.tb;
      if (this.tiebreak) this.tbStart = this.server;
      this.gameWon = -1; this.setWon = -1;
      this.emit({ type: 'gameStart', server: this.server, tiebreak: this.tiebreak });
      this.setupServe(false); this.phase = 'intro'; this.phaseT = 0.6;
      return;
    }
    this.secondServe = false;
    // in a tiebreak the serve changes after the first point, then every two
    if (this.tiebreak && this.ptNo % 2 === 1) this.server = 1 - this.server;
    this.setupServe(false); this.enterServe();
  }
}
