/* Rally Point: the badminton itself, with no graphics, so the same file runs the game in the browser and the test
   matches in Node. Court, shuttle flight, the shot solver, footwork, the computer's choices and the rules.
   Axes: x across the court, y up, z along it; the net is the plane z = 0. Side 0 plays the half z > 0 (the near end
   in the broadcast view), side 1 the half z < 0. Metres and seconds of game time. */

export const COURT = {
  halfL: 6.70, // net to the outside edge of the back boundary line
  halfW: 3.05, // doubles sideline; the posts stand on it
  halfWS: 2.59, // singles sideline (outside edge): the rally court and the service courts are this wide
  ssl: 1.98, // net to the near edge of the short service line
  netH: 1.524, netHPost: 1.55, postX: 3.05, netDrop: 0.76,
  line: 0.04,
};
/* The shuttle: gravity and quadratic drag that settles at its terminal speed of 6.8 m/s, which is what makes a clear
   hang and a smash die. Integrated at 240 steps a second; the solver flies the same steps, so shots land where aimed. */
export const G = 9.81, VT = 6.8, KD = G / (VT * VT), DT = 1 / 240, FLOOR = 0.0125;
const D2R = Math.PI / 180;
export const H_PREF = 2.62; // overhead contact: take the shuttle as it falls through this height
export const sideSign = (side) => (side === 0 ? 1 : -1); // which half (sign of z) a side plays
export const netHeight = (x) => COURT.netH + (COURT.netHPost - COURT.netH) * Math.min(1, (x / COURT.postX) ** 2);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* Shots. mode 'angle': launch at th degrees, as fast as it takes to land at the target; 'speed': launch at v (m/s),
   aimed down or up to land there; 'clear': the flattest flight that lands there and still clears the tape by
   `margin`. depth: metres past the net it aims for, dd how far the aim may move it; err scales the mishit spread. */
export const SHOTS = {
  clear: { mode: 'angle', th: 33, fr: 0.03, depth: 6.15, dd: 0.4, err: 1.0, n: [1, 1, 1.25], label: 'Clear' },
  aclear: { mode: 'angle', th: 21, fr: 0.035, depth: 6.0, dd: 0.4, err: 1.05, n: [1, 1, 1.25], label: 'Attacking clear' },
  lift: { mode: 'angle', th: 52, fr: 0.028, depth: 6.05, dd: 0.4, err: 1.0, n: [1, 0.9, 1.2], label: 'Lift' },
  drop: { mode: 'clear', margin: 0.24, fr: 0.035, depth: 2.45, dd: 0.55, err: 1.1, n: [0.55, 0.7, 1], label: 'Drop' },
  smash: { mode: 'speed', v: 1, fr: 0.045, depth: 4.6, dd: 1.3, err: 1.05, n: [0.5, 1.2, 1.3], label: 'Smash' },
  jump: { mode: 'speed', v: 1.1, fr: 0.055, depth: 4.2, dd: 1.3, err: 1.1, n: [0.5, 1.3, 1.35], label: 'Jump smash' },
  kill: { mode: 'speed', v: 0.62, fr: 0.04, depth: 3.2, dd: 1.0, err: 1.0, n: [0.5, 1.2, 1.2], label: 'Net kill' },
  drive: { mode: 'speed', v: 40, fr: 0.04, depth: 5.2, dd: 0.9, err: 1.0, n: [0.8, 1, 1.15], label: 'Drive' },
  push: { mode: 'speed', v: 18, fr: 0.03, depth: 3.7, dd: 0.7, err: 1.0, n: [0.7, 0.9, 1], label: 'Push' },
  block: { mode: 'clear', margin: 0.13, fr: 0.03, depth: 1.45, dd: 0.4, err: 1.05, n: [0.45, 0.6, 0.9], label: 'Block' },
  net: { mode: 'clear', margin: 0.09, fr: 0.045, depth: 0.55, dd: 0.25, err: 1.0, n: [0.3, 0.45, 0.7], label: 'Net shot' },
  serveHigh: { mode: 'angle', th: 50, fr: 0.012, depth: 6.3, dd: 0.22, err: 0.6, n: [0.8, 0.8, 1], label: 'High serve' },
  serveShort: { mode: 'clear', margin: 0.1, fr: 0.015, depth: 2.3, dd: 0.12, err: 0.55, n: [0.35, 0.5, 0.6], label: 'Short serve' },
  serveFlick: { mode: 'angle', th: 33, fr: 0.02, depth: 6.15, dd: 0.25, err: 0.7, n: [0.8, 0.8, 1], label: 'Flick serve' },
};
const OVERHEAD = new Set(['clear', 'aclear', 'drop', 'smash', 'jump']);

/* The computer at three levels; `you` is the human player's legs and hands at each level */
export const DIFFS = {
  easy: { name: 'Club', vmax: 3.95, accel: 11, react: 0.31, skill: 0.42, lead: 0.24, leadSd: 0.16, aggr: 0.35, margin: 0.62, read: 0.55, judge: 0.13, smashV: 54, jump: 0, pace: 0.8 },
  medium: { name: 'National', vmax: 4.5, accel: 12.5, react: 0.22, skill: 0.66, lead: 0.22, leadSd: 0.1, aggr: 0.6, margin: 0.4, read: 0.34, judge: 0.07, smashV: 61, jump: 0.2, pace: 0.86 },
  hard: { name: 'World Tour', vmax: 5.05, accel: 14.5, react: 0.16, skill: 0.88, lead: 0.21, leadSd: 0.05, aggr: 0.85, margin: 0.24, read: 0.2, judge: 0.035, smashV: 68, jump: 0.45, pace: 0.92 },
};
export const HUMAN = { vmax: 4.45, accel: 12.5, react: 0.2, skill: 0.78, smashV: 64 }; // auto-run is an assist, not perfect legs

/* Timing: how long before the contact the shot was asked for */
export function timing(lead) {
  if (lead < 0.035) return { q: 0.5, label: 'Late' };
  if (lead < 0.09) return { q: 0.82, label: 'Good' };
  if (lead <= 0.42) return { q: 1, label: 'Perfect' };
  if (lead <= 0.72) return { q: 0.8, label: 'Good' };
  return { q: 0.55, label: 'Early' };
}
export let MISHIT = 1; export const setMishit = (k) => { MISHIT = k; };
const PRESS_LIFE = 1.3; // a shot asked for this long ago and not yet played is dropped

/* ------------------------------------------------------------------ flight */
function flyStep(p, v, dt) {
  const kd = KD * Math.hypot(v.x, v.y, v.z);
  v.x -= kd * v.x * dt; v.y -= (G + kd * v.y) * dt; v.z -= kd * v.z * dt;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
}
/* The same flight in the shot's vertical plane: from height y0 at speed v and angle th, where it lands (s, metres
   along the ground), when, its height where it passes the net (at sNet) and its highest point */
export function flight2D(y0, v, th, sNet) {
  let h = v * Math.cos(th), vy = v * Math.sin(th), s = 0, y = y0, t = 0, yNet = NaN, apex = y0;
  for (let i = 0; i < 2400; i++) {
    const kd = KD * Math.hypot(h, vy);
    h -= kd * h * DT; vy -= (G + kd * vy) * DT;
    const s1 = s + h * DT, y1 = y + vy * DT;
    if (s < sNet && s1 >= sNet) yNet = y + ((y1 - y) * (sNet - s)) / (s1 - s);
    if (y1 <= FLOOR) { const u = (y - FLOOR) / (y - y1); return { s: s + (s1 - s) * u, t: t + DT * u, yNet, apex }; }
    s = s1; y = y1; t += DT; if (y > apex) apex = y;
  }
  return { s, t, yNet, apex };
}
// how fast to launch at angle th to land D away (null: it can't get there)
function speedFor(y0, D, th, sNet) {
  let lo = 0.3, hi = 140;
  if (flight2D(y0, hi, th, sNet).s < D) return null;
  for (let i = 0; i < 30; i++) { const m = 0.5 * (lo + hi); if (flight2D(y0, m, th, sNet).s < D) lo = m; else hi = m; }
  return hi;
}
// the lowest launch angle at speed v that lands D away; if nothing gets there, the angle that goes furthest
function angleFor(y0, D, v, sNet) {
  let prev = -1.35, best = -1.35, bestS = -1;
  for (let th = -1.35; th <= 0.95; th += 0.1) {
    const s = flight2D(y0, v, th, sNet).s;
    if (s >= D) {
      let lo = prev, hi = th;
      if (th === -1.35) return th;
      for (let i = 0; i < 18; i++) { const m = 0.5 * (lo + hi); if (flight2D(y0, v, m, sNet).s < D) lo = m; else hi = m; }
      return hi;
    }
    if (s > bestS) { bestS = s; best = th; }
    prev = th;
  }
  return best;
}
// the flattest flight that lands D away and passes the net at least at height `need`
function clearanceFor(y0, D, sNet, need) {
  let ok = null;
  for (let th = 1.4; th >= -0.6; th -= 0.06) {
    const v = speedFor(y0, D, th, sNet); if (v === null) continue;
    const yN = sNet > 0 && sNet < D ? flight2D(y0, v, th, sNet).yNet : Infinity;
    if (yN >= need) { ok = { th, v }; continue; }
    if (!ok) return { th, v }; // even the steepest flight fails: it goes into the net
    let lo = th, hi = ok.th, best = ok;
    for (let i = 0; i < 12; i++) {
      const m = 0.5 * (lo + hi), vm = speedFor(y0, D, m, sNet);
      if (vm === null) { lo = m; continue; }
      if (flight2D(y0, vm, m, sNet).yNet >= need) { hi = m; best = { th: m, v: vm }; } else lo = m;
    }
    return best;
  }
  return ok || { th: 0.8, v: 10 };
}

/* ------------------------------------------------------------------ random */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ------------------------------------------------------------------ players */
const reachOf = (h) => (h < 0.5 ? 1.3 : h < 1.7 ? 1.35 : h < 2.2 ? 1.15 : h < 2.55 ? 0.9 : h < 2.85 ? 0.6 : 0);
const reachTime = (d, vmax, accel) => { const dA = (vmax * vmax) / accel; return d < dA ? 2 * Math.sqrt(d / accel) : (2 * vmax) / accel + (d - dA) / vmax; };
const BASE_DEPTH = 3.7; // where a player waits between shots, this far from the net

export class Player {
  constructor(side, o) {
    this.side = side; this.sg = sideSign(side);
    this.name = o.name || (side === 0 ? 'You' : 'CPU');
    this.ai = o.ai ? DIFFS[o.ai] : null;
    this.vmax = this.ai ? this.ai.vmax : HUMAN.vmax; this.accel = this.ai ? this.ai.accel : HUMAN.accel;
    this.skill = this.ai ? this.ai.skill : HUMAN.skill;
    this.smashV = this.ai ? this.ai.smashV : HUMAN.smashV;
    this.x = 0; this.z = BASE_DEPTH * this.sg; this.vx = 0; this.vz = 0;
    this.tx = this.x; this.tz = this.z; this.walk = false;
    this.plan = null; // where and when it means to take the shuttle that is on its way
    this.press = null; // a shot asked for: { btn, t }
    this.swing = null; // the stroke under way or just played, for the animation: { kind, style, t, P, dir, q, label }
    this.auto = true; // human: run to the shuttle by itself (the stick then aims)
    this.input = { mx: 0, mz: 0, ax: 0, ad: 0 }; // human: move direction and aim, in world terms (x, and z / depth)
    this.leave = false; this.moveAt = 0; this.noise = { x: 0, z: 0, t0: 0, t1: 1 };
    this.stats = { points: 0, winners: 0, errors: 0, smashes: 0, smashWinners: 0, maxSmash: 0, serves: 0, faults: 0, nets: 0, outs: 0, perfect: 0, shots: 0 };
  }
  /* the shuttle at P relative to the body: dr to the right, df forward (toward the net), rho across the floor */
  zone(P, x = this.x, z = this.z) {
    const dx = P.x - x, dz = P.z - z, dr = dx * this.sg, df = -dz * this.sg, rho = Math.hypot(dr, df), R = reachOf(P.y);
    return { dr, df, rho, R, in: rho <= R && df >= -0.45 && P.y >= 0.04 && P.y <= 2.85 && P.z * this.sg > -0.02 };
  }
  /* where the body should be to take the shuttle at P: overhead just right of the head, otherwise forehand or
     backhand side, lunging for low ones near the net */
  bodyFor(P) {
    const lat = (P.x - this.x) * this.sg, d = Math.abs(P.z), h = P.y, fore = lat >= -0.1;
    let r, f;
    if (h >= 2.0) { r = 0.22; f = 0.12; } else if (h >= 1.0) { r = fore ? 0.72 : -0.62; f = 0.25; } else if (d < 2.2) { r = fore ? 0.45 : -0.4; f = 0.95; } else { r = fore ? 0.7 : -0.6; f = 0.55; }
    // right is +x for side 0 and -x for side 1; forward is -z for side 0 and +z for side 1
    let x = P.x - r * this.sg, z = P.z + f * this.sg;
    if (z * this.sg < 0.5) z = 0.5 * this.sg;
    x = clamp(x, -3.9, 3.9); z = clamp(z, -8.2, 8.2);
    return { x, z };
  }
}

/* ------------------------------------------------------------------ match */
/* o: { points (11 or 21), games (1 or 3), diff, sides: [{ name, ai? }, { name, ai? }], seed, first (who serves) } */
export class Match {
  constructor(o = {}) {
    this.o = Object.assign({ points: 21, games: 3, diff: 'medium' }, o);
    this.rand = mulberry(o.seed !== undefined ? o.seed : (Math.random() * 2 ** 32) >>> 0);
    const sides = this.o.sides || [{ name: 'You' }, { name: 'CPU', ai: this.o.diff }];
    this.pl = sides.map((s, i) => new Player(i, Object.assign({ diff: this.o.diff }, s)));
    this.sh = { p: { x: 0, y: 1, z: 3 }, v: { x: 0, y: 0, z: 0 }, mode: 'held', by: -1, shots: 0, t: 0, land: null, cord: false };
    this.T = 0; this.acc = 0; this.events = [];
    this.score = [0, 0]; this.games = [0, 0]; this.gameNo = 1; this.history = [];
    this.cap = this.o.points === 21 ? 30 : 15;
    this.needGames = this.o.games === 3 ? 2 : 1;
    this.server = this.o.first !== undefined ? this.o.first : this.rand() < 0.5 ? 0 : 1;
    this.phase = 'intro'; this.phaseT = 0; this.hold = false; this.over = false;
    this.path = null; this.serveAt = 0; this.servePlan = null; this.intervalDone = false;
    this.rally = 0; this.longest = 0; this.lastPoint = null;
    this.emit({ type: 'gameStart', game: 1, server: this.server });
    this.setupServe(true);
  }
  emit(e) { e.T = this.T; this.events.push(e); }
  randn() { return (this.rand() + this.rand() + this.rand() + this.rand() - 2) * 1.732; }
  pick(w) { let s = 0; for (const k in w) s += Math.max(0, w[k]); let r = this.rand() * s; for (const k in w) { r -= Math.max(0, w[k]); if (r <= 0) return k; } return Object.keys(w)[0]; }
  get receiverSide() { return 1 - this.server; }
  // the server's court: right on an even score, left on an odd one. Returns the sign of x for that court.
  courtSign(side, sc) { const right = sc % 2 === 0; return (right ? 1 : -1) * sideSign(side); }

  /* ---- time */
  step(dt) {
    this.acc += Math.min(dt, 0.25);
    while (this.acc >= DT) { this.acc -= DT; this.tick(); }
  }
  tick() {
    this.T += DT; this.phaseT += DT;
    const sh = this.sh;
    if (this.phase === 'intro' && !this.hold && this.phaseT > 2.2) this.enterServe();
    if (this.phase === 'serve') this.serveTick();
    if (this.phase === 'dead' && !this.hold && this.phaseT > this.deadFor) this.afterPoint();
    for (const pl of this.pl) { this.think(pl); this.move(pl); }
    if (sh.mode === 'flight') this.fly();
    else if (sh.mode === 'net') {
      sh.v.y = Math.max(sh.v.y - G * DT * 0.6, -2.2); sh.p.y += sh.v.y * DT;
      if (sh.p.y <= FLOOR + 0.02) { sh.p.y = FLOOR + 0.02; sh.mode = 'down'; this.emit({ type: 'land', x: sh.p.x, z: sh.p.z, net: true }); }
    }
    if (this.phase === 'rally' && sh.mode === 'flight') this.tryHit();
    if (this.phase === 'rally') for (const pl of this.pl) if (pl.press && this.T - pl.press.t > PRESS_LIFE) { pl.press = null; if (!pl.ai) this.emit({ type: 'expire', side: pl.side }); }
  }

  /* ---- serving */
  setupServe(first) {
    const s = this.server, r = 1 - s, cs = this.courtSign(s, this.score[s]);
    const S = this.pl[s], R = this.pl[r];
    // singles: the server close to the centre line about a metre behind the short service line; the receiver in the
    // middle of the diagonal court
    S.tx = cs * 0.42; S.tz = 3.05 * S.sg;
    R.tx = -cs * 0.85; R.tz = 3.35 * R.sg;
    for (const p of this.pl) {
      p.walk = true; p.plan = null; p.press = null; p.leave = false; p.swing = null;
      if (first) { p.x = p.tx; p.z = p.tz; p.vx = p.vz = 0; }
    }
    this.sh.mode = 'held'; this.sh.by = -1; this.sh.shots = 0; this.sh.land = null; this.path = null;
    this.servePlan = null; this.serveAt = 0;
  }
  enterServe() { this.phase = 'serve'; this.phaseT = 0; this.serveDelay = 0.8 + this.rand() * 0.9; this.emit({ type: 'serveReady', side: this.server }); }
  serveReady() { return this.pl.every((p) => Math.hypot(p.x - p.tx, p.z - p.tz) < 0.25); }
  serveTick() {
    const S = this.pl[this.server];
    if (this.servePlan) { if (this.T >= this.serveAt) this.launchServe(); return; }
    if (this.hold || !this.serveReady() || this.phaseT < 0.6) return;
    if (S.ai) { if (this.phaseT > this.serveDelay) this.beginServe(this.pick(this.serveMix(S))); }
    else if (S.press) { const b = S.press.btn; S.press = null; this.beginServe(b === 'A' ? 'serveHigh' : b === 'B' ? 'serveShort' : 'serveFlick'); }
  }
  serveMix(S) { const a = S.ai; return { serveHigh: 0.62 - 0.32 * a.aggr, serveShort: 0.28 + 0.3 * a.aggr, serveFlick: 0.06 + 0.08 * a.aggr }; }
  // the server's contact: forehand underarm for the high serve, backhand in front of the body for the short and flick
  serveContact(S, kind) {
    const fore = kind === 'serveHigh', r = fore ? 0.3 : -0.02, f = fore ? 0.45 : 0.42;
    return { x: S.x + r * S.sg, y: fore ? 0.82 : 1.02, z: S.z - f * S.sg };
  }
  beginServe(kind) {
    const S = this.pl[this.server], R = this.pl[1 - this.server];
    S.vx = S.vz = 0; S.tx = S.x; S.tz = S.z; S.walk = false;
    const P = this.serveContact(S, kind), cs = -this.courtSign(this.server, this.score[this.server]); // receiver's court x sign
    let x, depth;
    if (S.ai) {
      const w = S.ai.margin * 0.5;
      x = kind === 'serveShort' ? cs * (0.25 + this.rand() * 0.5) : cs * (0.6 + this.rand() * (1.5 - w));
      depth = SHOTS[kind].depth + (this.rand() - 0.5) * SHOTS[kind].dd;
    } else {
      const ax = clamp(S.input.ax, -1, 1), ad = clamp(S.input.ad, -1, 1);
      x = kind === 'serveShort' ? cs * 0.32 + ax * 0.55 : cs * 1.25 + ax * 1.0;
      x = cs > 0 ? clamp(x, 0.1, 2.4) : clamp(x, -2.4, -0.1);
      depth = SHOTS[kind].depth + ad * SHOTS[kind].dd;
    }
    const target = { x, z: depth * R.sg };
    this.servePlan = { kind, P, target };
    this.serveAt = this.T + 0.45;
    S.swing = { kind, style: kind === 'serveHigh' ? 'serveFore' : 'serveBack', t: this.serveAt, P, dir: null, q: 1, label: '' };
    this.emit({ type: 'serveStart', side: S.side, kind });
  }
  launchServe() {
    const S = this.pl[this.server], R = this.pl[1 - this.server], { kind, P, target } = this.servePlan;
    const sh = this.sh;
    sh.p = { x: P.x, y: P.y, z: P.z };
    const v = this.solve(kind, P, target, 1, S.skill, S);
    sh.v = v; sh.mode = 'flight'; sh.by = S.side; sh.shots = 1; sh.t = 0; sh.cord = false;
    this.servePlan = null; this.phase = 'rally'; this.phaseT = 0; this.rally = 1;
    S.stats.serves++; S.stats.shots++; R.walk = false; // the receiver goes at full speed once it is served
    const sp = Math.hypot(v.x, v.y, v.z);
    S.swing.dir = { x: v.x / sp, y: v.y / sp, z: v.z / sp }; S.swing.speed = sp;
    this.emit({ type: 'hit', side: S.side, kind, style: S.swing.style, q: 1, label: '', speed: sp, P, serve: true });
    this.afterHit(S);
  }

  /* ---- flight */
  fly() {
    const sh = this.sh, p = sh.p, ox = p.x, oy = p.y, oz = p.z;
    flyStep(p, sh.v, DT); sh.t += DT;
    if ((oz > 0) !== (p.z > 0) && oz !== 0) {
      const u = oz / (oz - p.z), x = ox + (p.x - ox) * u, y = oy + (p.y - oy) * u;
      if (Math.abs(x) <= COURT.postX + 0.03) {
        const top = netHeight(x);
        if (y < top - 0.02) { this.intoNet(x, y); return; }
        if (y < top + 0.022 && !sh.cord) this.netCord();
      }
    }
    if (p.y <= FLOOR) {
      const u = (oy - FLOOR) / (oy - p.y), x = ox + (p.x - ox) * u, z = oz + (p.z - oz) * u;
      p.x = x; p.y = FLOOR; p.z = z;
      this.landed(x, z);
    } else if (sh.t > 9) this.landed(p.x, p.z);
  }
  intoNet(x, y) {
    const sh = this.sh, by = sh.by;
    sh.mode = 'net'; sh.p.x = x; sh.p.y = y; sh.p.z = 0.05 * sideSign(by); sh.v = { x: 0, y: -0.4, z: 0 };
    this.emit({ type: 'net', side: by, x, y });
    this.pl[by].stats.errors++; this.pl[by].stats.nets++;
    this.point(1 - by, 'net');
  }
  // the shuttle clips the tape: it slows, pops up a little and dribbles over (or falls back)
  netCord() {
    const sh = this.sh, v = sh.v, sgn = Math.sign(v.z) || 1, over = this.rand() < 0.62;
    sh.cord = true;
    v.x *= 0.4; v.y = 0.3 + this.rand() * 1.1; v.z = sgn * (over ? 0.35 + this.rand() * 0.7 : -(0.15 + this.rand() * 0.3));
    this.emit({ type: 'netcord', side: sh.by });
    this.path = this.predict();
    const rcv = this.pl[1 - sh.by]; if (this.phase === 'rally') this.planFor(rcv, true);
  }
  landed(x, z) {
    const sh = this.sh, by = sh.by, on = z > 0 ? 0 : 1;
    sh.mode = 'down'; sh.land = { x, z };
    if (this.phase !== 'rally') { this.emit({ type: 'land', x, z }); return; }
    let inside, winner, reason;
    if (on === by) { inside = false; winner = 1 - by; reason = 'short'; }
    else if (sh.shots === 1) {
      const cs = -this.courtSign(this.server, this.score[this.server]); // the receiver's court x sign
      const ax = x * cs; // across, measured from the centre line into the court
      inside = ax >= -COURT.line / 2 && ax <= COURT.halfWS && Math.abs(z) >= COURT.ssl && Math.abs(z) <= COURT.halfL;
      winner = inside ? by : 1 - by; reason = inside ? 'ace' : 'fault';
    } else {
      inside = Math.abs(x) <= COURT.halfWS && Math.abs(z) <= COURT.halfL;
      winner = inside ? by : 1 - by; reason = inside ? 'in' : 'out';
    }
    // how close it was to a line (for the review)
    const near = Math.min(Math.abs(Math.abs(x) - COURT.halfWS), Math.abs(Math.abs(z) - COURT.halfL), sh.shots === 1 ? Math.abs(Math.abs(z) - COURT.ssl) : 9);
    this.emit({ type: 'land', x, z, inside, on, near, serve: sh.shots === 1 });
    const H = this.pl[by];
    if (inside) { H.stats.winners++; if (H.swing && (H.swing.kind === 'smash' || H.swing.kind === 'jump')) H.stats.smashWinners++; }
    else { H.stats.errors++; if (sh.shots === 1) H.stats.faults++; else H.stats.outs++; }
    this.point(winner, reason);
  }

  /* ---- the next hitter */
  tryHit() {
    const sh = this.sh, pl = this.pl[1 - sh.by];
    if (!pl.press || sh.by < 0) return;
    const z = pl.zone(sh.p); if (!z.in) return;
    const comfy = z.rho <= 0.82 * z.R && sh.p.y <= H_PREF, low = sh.p.y < 0.28;
    const n = { x: sh.p.x + sh.v.x * DT, y: sh.p.y + sh.v.y * DT, z: sh.p.z + sh.v.z * DT };
    if (comfy || low || !pl.zone(n).in) this.hit(pl, z);
  }
  hit(pl, z) {
    const sh = this.sh, P = { x: sh.p.x, y: sh.p.y, z: sh.p.z }, opp = this.pl[1 - pl.side];
    let { q, label } = timing(this.T - pl.press.t);
    q *= 1 - 0.5 * Math.max(0, z.rho / z.R - 0.6); // reaching
    q *= clamp(0.15 + 1.35 * sh.t, 0.52, 1); // little time: a smash or a drive at the body
    if (Math.hypot(pl.vx, pl.vz) > 2.2) q *= 0.88; // still on the run
    if (z.dr < -0.25 && P.y > 1.9) q *= 0.85; // high on the backhand side
    const prev = this.pl[1 - pl.side].swing;
    if (prev && prev.kind === 'net' && P.y < 1.2) q *= 0.84; // a tight net shot, still tumbling
    if (sh.shots > 12) q *= Math.max(0.35, 1 - 0.025 * (sh.shots - 12)); // legs going in a long rally
    const btn = pl.press.btn; pl.press = null;
    let kind, target;
    if (pl.ai) ({ kind, target } = this.aiShot(pl, opp, P, q));
    else ({ kind, target } = this.humanShot(pl, btn, P, q));
    const v = this.solve(kind, P, target, q, pl.skill, pl);
    sh.v = v; sh.by = pl.side; sh.shots++; sh.t = 0; sh.cord = false; this.rally = sh.shots;
    const sp = Math.hypot(v.x, v.y, v.z);
    const style = OVERHEAD.has(kind) && P.y >= 1.85 ? (kind === 'jump' ? 'jump' : 'over') : z.dr >= -0.05 ? 'fore' : 'back';
    pl.swing = { kind, style, t: this.T, P, dir: { x: v.x / sp, y: v.y / sp, z: v.z / sp }, q, label, speed: sp, dr: z.dr, df: z.df };
    const st = pl.stats; st.shots++; if (q >= 1) st.perfect++;
    if (kind === 'smash' || kind === 'jump') { st.smashes++; st.maxSmash = Math.max(st.maxSmash, sp * 3.6); }
    this.emit({ type: 'hit', side: pl.side, kind, style, q, label, speed: sp, P, shots: sh.shots });
    this.afterHit(pl);
  }
  afterHit(pl) {
    const opp = this.pl[1 - pl.side];
    pl.plan = null; pl.leave = false;
    this.path = this.predict();
    // back toward the middle, leaning to the side the shuttle went
    const L = this.path.land;
    pl.tx = clamp((L ? L.x : 0) * 0.22, -0.8, 0.8); pl.tz = BASE_DEPTH * pl.sg; pl.walk = false;
    pl.moveAt = this.T + (pl.ai ? 0.08 : 0);
    this.planFor(opp, false);
  }

  /* where the shuttle goes from here if nobody touches it: sampled every 2 steps until it lands or meets the net */
  predict() {
    const p = { ...this.sh.p }, v = { ...this.sh.v }, out = { t: [], x: [], y: [], z: [], end: 'land', land: null };
    let t = this.T;
    for (let i = 0; i < 2400; i++) {
      const oz = p.z, ox = p.x, oy = p.y;
      flyStep(p, v, DT); t += DT;
      if ((oz > 0) !== (p.z > 0) && oz !== 0) {
        const u = oz / (oz - p.z), x = ox + (p.x - ox) * u, y = oy + (p.y - oy) * u;
        if (Math.abs(x) <= COURT.postX + 0.03 && y < netHeight(x) - 0.02) { out.end = 'net'; break; }
      }
      if (p.y <= FLOOR) { const u = (oy - FLOOR) / (oy - p.y); out.land = { x: ox + (p.x - ox) * u, z: oz + (p.z - oz) * u, t: t - DT + DT * u }; break; }
      if (i & 1) { out.t.push(t); out.x.push(p.x); out.y.push(p.y); out.z.push(p.z); }
    }
    return out;
  }
  /* The receiver's plan: the first point of the flight it can get to with a moment to spare, preferring an overhead
     as the shuttle falls past H_PREF; failing that, the one it gets closest to. */
  planFor(pl, again) {
    const path = this.path; pl.plan = null;
    if (!path || path.end === 'net') return;
    const react = pl.ai ? pl.ai.react * (again ? 0.5 : 1) : again ? 0.02 : HUMAN.react;
    const ex = pl.x + pl.vx * 0.12, ez = pl.z + pl.vz * 0.12;
    let pick = -1, firstOk = -1, best = -1, bestShort = Infinity;
    for (let i = 0; i < path.t.length; i++) {
      const P = { x: path.x[i], y: path.y[i], z: path.z[i] };
      if (P.z * pl.sg < 0.08 || P.y > 2.85 || P.y < 0.06) continue;
      const B = pl.bodyFor(P), d = Math.hypot(B.x - ex, B.z - ez), avail = path.t[i] - this.T;
      const need = react + reachTime(d, pl.vmax, pl.accel), slack = avail - need;
      if (slack >= 0.1) {
        if (firstOk < 0) firstOk = i;
        if (P.y <= H_PREF) { pick = i; break; }
      }
      if (-slack < bestShort) { bestShort = -slack; best = i; }
    }
    const i = pick >= 0 ? pick : firstOk >= 0 ? firstOk : best;
    if (i < 0) return;
    const P = { x: path.x[i], y: path.y[i], z: path.z[i] }, B = pl.bodyFor(P);
    pl.plan = { t: path.t[i], P, B, ok: pick >= 0 || firstOk >= 0, made: this.T };
    if (pl.ai) this.aiPlan(pl, again);
  }

  /* ---- legs */
  think(pl) {
    const sh = this.sh, a = pl.ai;
    if (this.phase === 'rally' && sh.by >= 0 && sh.by !== pl.side) {
      // the shuttle is coming this way
      if (pl.plan && !pl.leave && this.T >= pl.moveAt) {
        if (pl.ai || pl.auto) {
          let { x, z } = pl.plan.B;
          if (a) { const k = clamp((pl.plan.t - this.T) / Math.max(0.2, pl.noise.t1 - pl.noise.t0), 0, 1); x += pl.noise.x * k; z += pl.noise.z * k; }
          pl.tx = x; pl.tz = z;
        }
        if (a && !pl.press && this.T >= pl.pressAt) pl.press = { btn: 'ai', t: pl.pressAt };
      }
      if (!pl.ai && !pl.auto && sh.mode === 'flight' && (this.T - (pl.plan ? pl.plan.made : 0) > 0.06)) this.planFor(pl, true);
    }
  }
  move(pl) {
    if (this.phase === 'serve' && this.servePlan) { pl.vx *= 0.8; pl.vz *= 0.8; return; } // the server's windup: both still
    let wx, wz;
    const manual = !pl.ai && !pl.auto && (this.phase === 'rally' || this.phase === 'dead');
    const vmax = pl.walk ? Math.min(3.2, pl.vmax) : pl.vmax, accel = pl.walk ? 9 : pl.accel;
    if (manual) {
      const m = Math.hypot(pl.input.mx, pl.input.mz), k = m > 1 ? 1 / m : 1;
      wx = pl.input.mx * k * vmax; wz = pl.input.mz * k * vmax;
    } else if (this.phase === 'dead') { wx = 0; wz = 0; } else {
      const dx = pl.tx - pl.x, dz = pl.tz - pl.z, d = Math.hypot(dx, dz);
      const want = d < 0.01 ? 0 : Math.min(vmax, Math.sqrt(2 * accel * 0.85 * d));
      wx = d < 0.01 ? 0 : (dx / d) * want; wz = d < 0.01 ? 0 : (dz / d) * want;
    }
    let ax = (wx - pl.vx) / DT, az = (wz - pl.vz) / DT; const am = Math.hypot(ax, az);
    if (am > accel) { ax *= accel / am; az *= accel / am; }
    pl.vx += ax * DT; pl.vz += az * DT;
    pl.x += pl.vx * DT; pl.z += pl.vz * DT;
    // own half only, never right up against the net
    if (pl.z * pl.sg < 0.45) { pl.z = 0.45 * pl.sg; pl.vz = 0; }
    if (Math.abs(pl.x) > 4.2) { pl.x = Math.sign(pl.x) * 4.2; pl.vx = 0; }
    if (Math.abs(pl.z) > 8.6) { pl.z = Math.sign(pl.z) * 8.6; pl.vz = 0; }
  }

  /* ---- the human's shots: A lob (clear, lift), B soft (drop, block, net), C attack (smash, drive, push) */
  press(side, btn) {
    const pl = this.pl[side]; if (!pl || pl.ai || this.over) return;
    pl.press = { btn, t: this.T };
  }
  humanShot(pl, btn, P, q) {
    const h = P.y, d = Math.abs(P.z);
    let kind;
    if (btn === 'A') kind = h >= 1.9 ? 'clear' : 'lift';
    else if (btn === 'B') kind = h >= 1.9 ? 'drop' : h >= 1.0 || d >= 2.6 ? 'block' : 'net';
    else kind = h >= 2.15 ? (q >= 1 && h >= 2.3 && d <= 5.4 ? 'jump' : 'smash') : h >= 1.7 && d < 2.6 ? 'kill' : h >= 0.95 ? 'drive' : 'push';
    const ax = clamp(pl.input.ax, -1, 1), ad = clamp(pl.input.ad, -1, 1), aimed = Math.abs(ax) > 0.25;
    let x;
    // full aim is about 0.6 m inside the sideline, and deep shots stay short of the back line: a well-timed shot is in
    if (kind === 'net') x = P.x * 0.85 + ax * 1.1;
    else x = aimed ? ax * 1.95 : P.x * 0.45 + this.randn() * 0.3;
    x = clamp(x, -2.2, 2.2);
    const deep = kind === 'clear' || kind === 'lift' || kind === 'aclear' ? 0.6 : 1;
    let target = { x, z: -pl.sg * (SHOTS[kind].depth + ad * SHOTS[kind].dd * (ad > 0 ? deep : 1)) };
    // a smash that cannot get over the net from here becomes a drive
    if ((kind === 'smash' || kind === 'jump' || kind === 'kill') && !this.smashOk(pl, P, target, kind)) {
      kind = 'drive'; target = { x, z: -pl.sg * (SHOTS.drive.depth + ad * SHOTS.drive.dd) };
    }
    return { kind, target };
  }
  smashOk(pl, P, target, kind = 'smash') {
    const dx = target.x - P.x, dz = target.z - P.z, D = Math.hypot(dx, dz), sNet = -P.z / (dz / D), v = pl.smashV * SHOTS[kind].v * 0.9;
    const th = angleFor(P.y, D, v, sNet), r = flight2D(P.y, v, th, sNet);
    return r.yNet >= netHeight(P.x + (dx / D) * sNet) + 0.05 && Math.abs(r.s - D) < 0.6;
  }

  /* ---- the computer */
  aiPlan(pl, again) {
    const a = pl.ai, path = this.path, plan = pl.plan;
    pl.moveAt = this.T + (again ? a.react * 0.5 : a.react);
    // the press it would have made: around its timing, early or late by its spread
    pl.pressAt = plan.t - Math.max(0.0, a.lead + this.randn() * a.leadSd);
    // misreads the flight at first, less and less as it comes
    const e = a.read * (plan.ok ? 0.5 : 0.25);
    pl.noise = { x: this.randn() * e, z: this.randn() * e * 0.8, t0: this.T, t1: plan.t };
    // leaves one it judges to be going out
    pl.leave = false;
    if (path.land && this.sh.shots > 0) {
      const L = path.land, serve = this.sh.shots === 1;
      let out;
      if (serve) {
        const cs = -this.courtSign(this.server, this.score[this.server]);
        const ax = L.x * cs + this.randn() * a.judge, az = Math.abs(L.z) + this.randn() * a.judge;
        out = ax < -0.02 || ax > COURT.halfWS || az < COURT.ssl || az > COURT.halfL;
      } else {
        const ax = Math.abs(L.x) + this.randn() * a.judge, az = Math.abs(L.z) + this.randn() * a.judge;
        out = ax > COURT.halfWS + 0.01 || az > COURT.halfL + 0.01;
      }
      if (out && (L.z > 0 ? 0 : 1) === pl.side) { pl.leave = true; pl.pressAt = Infinity; pl.tx = pl.x; pl.tz = pl.z; }
    }
  }
  aiShot(pl, opp, P, q) {
    const a = pl.ai, h = P.y, d = Math.abs(P.z), od = Math.abs(opp.z), w = {};
    const late = q < 0.7;
    if (h >= 1.95) {
      const can = h >= 2.15 && d < 5.9;
      w.smash = can ? (0.2 + 0.4 * a.aggr) * (d < 4.6 ? 1.4 : 0.75) : 0;
      w.drop = 0.33 * (od > 4.6 ? 1.6 : 1);
      w.clear = 0.3 * (d > 5 ? 1.3 : 0.7) * (od < 2.9 ? 1.8 : 1);
      w.aclear = 0.12 * a.aggr * (od < 3.6 ? 2 : 0.6);
      if (late) { w.clear *= 2.2; w.smash *= 0.35; w.aclear *= 0.3; }
      if (od < 2.9) w.drop *= 0.45;
    } else if (h >= 1.7 && d < 2.6) {
      w.kill = 0.7 * (0.5 + a.aggr); w.net = 0.15; w.lift = 0.12;
    } else if (h >= 1.0) {
      w.drive = d > 2 ? 0.42 : 0.18; w.block = 0.3 * (od > 4.8 ? 1.6 : 1); w.lift = 0.3 * (od < 2.8 ? 1.8 : 1) * (late ? 1.8 : 1);
    } else if (d < 2.4) {
      w.net = 0.45 * (od > 3.4 ? 1.8 : od < 2.5 ? 0.35 : 1) * (late ? 0.5 : 1); w.lift = 0.55 * (od < 2.6 ? 1.8 : 1);
    } else { w.lift = 0.65; w.block = 0.35 * (od > 4.6 ? 1.5 : 1); }
    let kind = this.pick(w);
    const target = this.aiTarget(pl, opp, kind, P);
    if (kind === 'kill' && !this.smashOk(pl, P, target, 'kill')) kind = 'net';
    if (kind === 'smash') {
      if (!this.smashOk(pl, P, target)) kind = h >= 2.3 ? 'drop' : 'clear';
      else if (a.jump && q >= 0.95 && h >= 2.3 && d <= 5.4 && this.rand() < a.jump) kind = 'jump';
    }
    return { kind, target: kind === 'smash' || kind === 'jump' || kind === 'kill' ? target : this.aiTarget(pl, opp, kind, P) };
  }
  aiTarget(pl, opp, kind, P) {
    const a = pl.ai, S = SHOTS[kind];
    // to the side away from the opponent, now and then behind him; the better the player, the nearer the lines
    let side = opp.x > 0.25 ? -1 : opp.x < -0.25 ? 1 : this.rand() < 0.5 ? -1 : 1;
    if (this.rand() < 0.22) side = -side;
    const edge = COURT.halfWS - a.margin;
    let x = side * edge * (0.72 + 0.28 * this.rand());
    if (kind === 'net') x = clamp(P.x * 0.7 + side * 0.6, -edge, edge);
    if ((kind === 'smash' || kind === 'jump' || kind === 'kill') && this.rand() < 0.35) x = clamp(opp.x + 0.35 * opp.sg, -edge, edge); // at the body
    let depth = S.depth + (this.rand() - 0.5) * S.dd;
    if (kind === 'clear' || kind === 'lift') depth = Math.min(depth, COURT.halfL - a.margin * 0.55);
    return { x, z: -pl.sg * depth };
  }

  /* ---- the solver: launch velocity for a shot from P to the target, then the mishit */
  solve(kind, P, target, q, skill, pl) {
    const S = SHOTS[kind];
    let dx = target.x - P.x, dz = target.z - P.z;
    const D = Math.max(0.3, Math.hypot(dx, dz)); dx /= D; dz /= D;
    const sNet = Math.abs(dz) > 1e-3 ? -P.z / dz : 1e9;
    const top = netHeight(P.x + dx * sNet);
    let th, v;
    if (S.mode === 'angle') {
      th = S.th * D2R; v = speedFor(P.y, D, th, sNet) || 60;
      for (let k = 0; k < 8 && flight2D(P.y, v, th, sNet).yNet < top + 0.3; k++) { th += 0.06; v = speedFor(P.y, D, th, sNet) || v; }
    } else if (S.mode === 'speed') {
      v = S.v <= 2 ? pl.smashV * S.v * (0.82 + 0.18 * q) : S.v * (0.9 + 0.1 * q);
      th = angleFor(P.y, D, v, sNet);
      // too low to go over flat at this pace: the flattest flight that lands there and clears the tape, slower
      const r = flight2D(P.y, v, th, sNet);
      if (!(r.yNet >= top + 0.06) || Math.abs(r.s - D) > 0.25) ({ th, v } = clearanceFor(P.y, D, sNet, top + 0.08));
    } else ({ th, v } = clearanceFor(P.y, D, sNet, top + S.margin));
    // the mishit: worse with poor timing and a weaker player; touch shots are the most sensitive
    const e = S.err * (0.45 + 1.6 * (1 - q)) * (1.35 - skill) * MISHIT;
    v *= 1 + this.randn() * 0.1 * e * S.n[0];
    th += this.randn() * 0.038 * e * S.n[1];
    let psi = this.randn() * 0.068 * e * S.n[2];
    // now and then a real mishit: off the frame, into the tape, or long and wide
    if (this.rand() < S.fr * (1.3 - skill) * (2 - q) * MISHIT) {
      const r = this.rand(), sg = this.rand() < 0.5 ? -1 : 1;
      if (S.mode === 'clear' || kind === 'serveShort') { if (r < 0.65) v *= 0.8; else { v *= 1.25; th += 0.06; } }
      else if (S.mode === 'speed') { if (r < 0.5) th -= 0.07; else psi += sg * 0.09; }
      else if (r < 0.5) v *= 1.12; else psi += sg * 0.1;
    }
    const c = Math.cos(psi), s = Math.sin(psi);
    const ux = dx * c - dz * s, uz = dx * s + dz * c, ch = Math.cos(th);
    return { x: v * ch * ux, y: v * Math.sin(th), z: v * ch * uz };
  }

  /* ---- scoring */
  point(winner, reason) {
    if (this.phase !== 'rally') return;
    this.phase = 'dead'; this.phaseT = 0;
    const loser = 1 - winner, served = this.server;
    this.score[winner]++;
    this.pl[winner].stats.points++;
    this.longest = Math.max(this.longest, this.sh.shots);
    const serviceOver = winner !== this.server;
    this.server = winner;
    const [a, b] = [this.score[winner], this.score[loser]];
    const target = this.o.points, won = (a >= target && a - b >= 2) || a >= this.cap;
    let interval = false;
    if (!won && this.o.points === 21 && !this.intervalDone && a === 11) { interval = true; this.intervalDone = true; }
    this.gameWon = won ? winner : -1;
    if (won) { this.games[winner]++; this.history.push(this.score.slice()); }
    this.matchWon = won && this.games[winner] >= this.needGames ? winner : -1;
    // game point / match point for whoever now leads by the margin needed
    const gp = !won && this.pointFor();
    this.deadFor = (won ? 2.6 : 1.5) + (interval ? 2.4 : 0);
    this.lastPoint = { winner, reason, rally: this.sh.shots, serviceOver, served, score: this.score.slice(), interval, game: won, match: this.matchWon >= 0, gp };
    for (const p of this.pl) { p.press = null; p.plan = null; }
    this.emit(Object.assign({ type: 'point' }, this.lastPoint));
  }
  // 'game' or 'match' if the server is one point from winning the game (or the match), else null
  pointFor() {
    const s = this.server, a = this.score[s], b = this.score[1 - s], t = this.o.points;
    const next = (a + 1 >= t && a + 1 - b >= 2) || a + 1 >= this.cap;
    if (!next) return null;
    return this.games[s] + 1 >= this.needGames ? 'match' : 'game';
  }
  afterPoint() {
    if (this.matchWon >= 0) {
      if (!this.over) { this.over = true; this.phase = 'over'; this.phaseT = 0; this.emit({ type: 'match', winner: this.matchWon, games: this.games.slice(), history: this.history.slice() }); }
      return;
    }
    if (this.gameWon >= 0) {
      this.emit({ type: 'game', winner: this.gameWon, games: this.games.slice(), score: this.history[this.history.length - 1] });
      this.score = [0, 0]; this.gameNo++; this.intervalDone = false; this.server = this.gameWon; this.gameWon = -1;
      this.emit({ type: 'gameStart', game: this.gameNo, server: this.server });
      this.setupServe(false); this.phase = 'intro'; this.phaseT = 0;
      return;
    }
    this.setupServe(false); this.enterServe();
  }
}
