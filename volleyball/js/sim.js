/* Sunset Spike: the beach volleyball itself, with no drawing. The ball's flight (gravity, drag, topspin, a float
   serve's wobble), the net, its tape and the antennae, the block and the sand; the rules (three touches a side, no
   player twice in a row, a block counts as a touch, rally scoring, sets to 21 and a third to 15, two clear, the
   serve passing between partners each time a team wins it back); and the four players: where they stand, who plays
   the ball, and what they do with it. game.js draws it and feeds in the human's stick and presses; the headless
   tests run it in Node.
   Axes: x across the court (sidelines at ±4), y up, z along it (end lines at ±8), the net at z = 0. Team 0 (you,
   player 0, and your partner, player 1) plays the half z > 0; team 1 (players 2 and 3) the half z < 0. */

export const COURT = { halfW: 4, halfL: 8, net: 2.43, netDrop: 1.0, antenna: 4.0, antennaH: 0.8, post: 4.6, R: 0.106 };
const R = COURT.R, NET = COURT.net;
const G = 9.81, KD = 0.021, KM = 0.0045, H = 1 / 240;
export const sideOf = (team) => (team === 0 ? 1 : -1);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += Math.random(); return (s - 2) / 0.577; };
const hyp = Math.hypot;

/* How good the computer is, by level: reaction (s), sand speed (m/s), touch quality (pass, set, attack, dig, block,
   serve; 0 to 1), smart (how well it reads the court when it aims), power (spike and jump serve speed), err (an
   outright attack error per attack), serveErr (a missed serve), shot (the share of attacks played soft). */
export const DIFFS = {
  easy: { name: 'Weekend', react: 0.3, speed: 4.5, pass: 0.66, set: 0.76, attack: 0.55, dig: 0.45, block: 0.42, serve: 0.6, smart: 0.25, power: 0.8, err: 0.14, serveErr: 0.12, shot: 0.4, jumpServe: 0.15 },
  medium: { name: 'Pro Tour', react: 0.26, speed: 4.7, pass: 0.72, set: 0.82, attack: 0.68, dig: 0.55, block: 0.55, serve: 0.72, smart: 0.55, power: 0.9, err: 0.11, serveErr: 0.1, shot: 0.32, jumpServe: 0.35 },
  hard: { name: 'World Champs', react: 0.18, speed: 5.1, pass: 0.84, set: 0.9, attack: 0.84, dig: 0.7, block: 0.68, serve: 0.86, smart: 0.88, power: 1.0, err: 0.07, serveErr: 0.08, shot: 0.28, jumpServe: 0.55 },
};
// your partner: a steady pro whatever the level; you: the same body, your own timing
const PARTNER = { react: 0.22, speed: 4.9, pass: 0.8, set: 0.88, attack: 0.74, dig: 0.6, block: 0.58, serve: 0.78, smart: 0.6, power: 0.92, err: 0.09, serveErr: 0.08, shot: 0.3, jumpServe: 0.4 };
const YOU = { react: 0, speed: 5.0, pass: 0.8, set: 0.86, attack: 0.82, dig: 0.62, block: 0.62, serve: 0.8, smart: 0.5, power: 1.0, err: 0, serveErr: 0, shot: 0.3, jumpServe: 0.5 };
export const FORMATS = { quick: { sets: [15], need: 1, name: 'Quick' }, set: { sets: [21], need: 1, name: 'One set' }, match: { sets: [21, 21, 15], need: 2, name: 'Best of 3' } };

/* ------------------------------------------------------------------ the ball in the air */
function integ(p, v, w, h, fl, tAbs) {
  const s = hyp(v[0], v[1], v[2]);
  let ax = -KD * s * v[0] + KM * (w[1] * v[2] - w[2] * v[1]);
  const ay = -G - KD * s * v[1] + KM * (w[2] * v[0] - w[0] * v[2]);
  const az = -KD * s * v[2] + KM * (w[0] * v[1] - w[1] * v[0]);
  if (fl) ax += fl.a * Math.sin(fl.f * (tAbs - fl.t0) + fl.ph); // a float serve wanders sideways
  v[0] += ax * h; v[1] += ay * h; v[2] += az * h;
  p[0] += v[0] * h; p[1] += v[1] * h; p[2] += v[2] * h;
}
// simulate until the ball comes down through height yT (null if it never does)
function flyDown(p0, v0, yT, w0) {
  const p = p0.slice(), v = v0.slice(), w = w0 ? w0.slice() : [0, 0, 0]; let t = 0, top = p[1];
  while (t < 7) { integ(p, v, w, 1 / 120); t += 1 / 120; if (p[1] > top) top = p[1]; if (v[1] < 0 && p[1] <= yT) return { x: p[0], z: p[2], t, top }; }
  return null;
}
// launch velocity from p0 so the ball rises to `apex` and comes down through `to`
export function solveArc(p0, to, apex) {
  apex = Math.max(apex, p0[1] + 0.15, to[1] + 0.25);
  let vy = Math.sqrt(2 * G * (apex - p0[1]));
  const T0 = vy / G + Math.sqrt((2 * (apex - to[1])) / G);
  let vx = (to[0] - p0[0]) / T0, vz = (to[2] - p0[2]) / T0;
  for (let it = 0; it < 7; it++) {
    const r = flyDown(p0, [vx, vy, vz], to[1]);
    if (!r) { vy += 0.5; continue; }
    const ex = to[0] - r.x, ez = to[2] - r.z, ea = apex - r.top;
    vx += (ex / r.t) * 1.05; vz += (ez / r.t) * 1.05; vy += (ea * G) / Math.max(2.5, vy);
    if (Math.abs(ex) + Math.abs(ez) < 0.02 && Math.abs(ea) < 0.02) break;
  }
  return [vx, vy, vz];
}
// an arc over the net: the apex raised until the ball clears the tape by a margin
export function solveOver(p0, to, apex) {
  let v = solveArc(p0, to, apex);
  for (let k = 0; k < 6; k++) {
    const r = landing(p0, v, [0, 0, 0]);
    if (r.netY === null || r.netY >= NET + R + 0.14) break;
    apex += 0.6; v = solveArc(p0, to, apex);
  }
  return v;
}
// the distance along the ground to where a ball launched at v lands, and its height where it crosses the net
function landing(p0, v0, w0) {
  const p = p0.slice(), v = v0.slice(), w = w0.slice(); let t = 0, netY = null;
  while (t < 5) {
    const z0 = p[2];
    integ(p, v, w, 1 / 240); t += 1 / 240;
    if (netY === null && z0 !== 0 && Math.sign(z0) !== Math.sign(p[2])) netY = p[1];
    if (p[1] <= R) break;
  }
  return { x: p[0], z: p[2], d: hyp(p[0] - p0[0], p[2] - p0[2]), t, netY };
}
// a driven ball (a spike, a jump serve): fixed speed and topspin, the elevation searched so it lands on `to`
export function solveDrive(p0, to, speed, spin) {
  const dx = to[0] - p0[0], dz = to[2] - p0[2], D = Math.max(0.5, hyp(dx, dz)), ux = dx / D, uz = dz / D;
  const w = [uz * spin, 0, -ux * spin]; // topspin: about up × direction
  let lo = -1.35, hi = 0.62, best = null;
  for (let it = 0; it < 26; it++) {
    const th = (lo + hi) / 2, c = Math.cos(th), s = Math.sin(th);
    const v = [ux * speed * c, speed * s, uz * speed * c], r = landing(p0, v, w);
    best = { v, w, netY: r.netY, t: r.t };
    if (r.d < D) lo = th; else hi = th;
  }
  return best;
}

/* the ball's path from now, sampled every 1/120 s, until it lands or meets the net (past which it is guesswork) */
function predict(b, T, maxT = 4.5) {
  const p = b.p.slice(), v = b.v.slice(), w = b.w.slice();
  const P = { t: [], x: [], y: [], z: [], land: null, cross: null, net: false };
  let t = 0, i = 0;
  while (t < maxT) {
    const z0 = p[2], x0 = p[0], y0 = p[1];
    integ(p, v, w, H, b.fl, T + t); t += H; i++;
    if (!P.cross && z0 !== 0 && Math.sign(z0) !== Math.sign(p[2])) {
      const u = z0 / (z0 - p[2]), xc = lerp(x0, p[0], u), yc = lerp(y0, p[1], u);
      P.cross = { t, x: xc, y: yc, to: p[2] > 0 ? 0 : 1, clean: yc >= NET + R * 0.6 && Math.abs(xc) <= COURT.antenna };
      if (!P.cross.clean) { P.net = true; break; }
    }
    if (i % 2 === 0) { P.t.push(t); P.x.push(p[0]); P.y.push(p[1]); P.z.push(p[2]); }
    if (p[1] <= R) { P.land = { t, x: p[0], z: p[2] }; P.t.push(t); P.x.push(p[0]); P.y.push(p[1]); P.z.push(p[2]); break; }
  }
  return P;
}
const inCourt = (x, z, m = 0) => Math.abs(x) <= COURT.halfW + R + m && Math.abs(z) <= COURT.halfL + R + m;

/* ------------------------------------------------------------------ the players */
function makePlayer(id, team, slot, sk, human) {
  return {
    id, team, slot, sk, human, h: 1.86, reach: 2.45, jumpH: 0.74,
    x: 0, z: 0, vx: 0, vz: 0, yaw: team === 0 ? Math.PI : 0, y: 0, vy: 0,
    tx: 0, tz: 0, faceYaw: null, plan: null, act: null, air: null, dive: null, busyTill: 0, thinkAt: 0, role: slot === 0 ? 'block' : 'defend',
    stats: { points: 0, kills: 0, aces: 0, blocks: 0, digs: 0, errors: 0, serves: 0, serveErr: 0, attacks: 0, perfect: 0, timed: 0, topSpike: 0, topServe: 0 },
  };
}
const tUp = (pl) => Math.sqrt((2 * pl.jumpH) / G);

/* ------------------------------------------------------------------ the match */
export class Match {
  constructor(o = {}) {
    this.o = Object.assign({ diff: 'medium', fmt: 'match', humanAI: false, names: ['You', 'Partner', 'CPU 1', 'CPU 2'], teamNames: ['Thudinest', 'CPU'] }, o);
    this.D = DIFFS[this.o.diff] || DIFFS.medium;
    this.F = FORMATS[this.o.fmt] || FORMATS.match;
    const human = !this.o.humanAI;
    this.pl = [makePlayer(0, 0, 0, human ? YOU : PARTNER, human), makePlayer(1, 0, 1, PARTNER, false), makePlayer(2, 1, 0, this.D, false), makePlayer(3, 1, 1, this.D, false)];
    this.pl.forEach((p, i) => { p.name = this.o.names[i]; });
    this.T = 0; this.acc = 0; this.events = [];
    this.ball = { p: [0, 1, 6], v: [0, 0, 0], w: [0, 0, 0], held: null, live: false, fl: null, spin: 0 };
    this.score = [0, 0]; this.sets = []; this.setsWon = [0, 0]; this.setNo = 0;
    this.firstServe = Math.random() < 0.5 ? 0 : 1; this.servingTeam = this.firstServe; this.srvSlot = [0, 0]; this.served = [false, false];
    this.input = { mx: 0, mz: 0, ax: 0, az: 0, auto: true };
    this.press = null; this.serveType = null;
    this.rally = 0; this.longest = 0; this.hold = false;
    this.teamStats = [{ points: 0, aces: 0, kills: 0, blocks: 0, errors: 0, serveErr: 0, sideOuts: 0, sideOutTries: 0 }, { points: 0, aces: 0, kills: 0, blocks: 0, errors: 0, serveErr: 0, sideOuts: 0, sideOutTries: 0 }];
    this.phase = 'pre';
    this.startPoint(true);
  }
  emit(e) { e.T = this.T; this.events.push(e); }
  target() { return this.F.sets[Math.min(this.setNo, this.F.sets.length - 1)]; }
  /* "set point" or "match point" for a team, if the next rally could win it */
  pointFor() {
    if (this.phase === 'over') return null;
    const tgt = this.target();
    for (const t of [0, 1]) if (this.score[t] + 1 >= tgt && this.score[t] + 1 - this.score[1 - t] >= 2) return { team: t, kind: this.setsWon[t] + 1 >= this.F.need ? 'match' : 'set' };
    return null;
  }
  get human() { return this.o.humanAI ? null : this.pl[0]; }

  /* ---------------------------------------------------------------- a point: set up the serve */
  startPoint(first) {
    const t = this.servingTeam;
    this.server = this.pl[t * 2 + this.srvSlot[t]]; this.served[t] = true;
    this.phase = 'pre'; this.phaseT = this.T; this.rally = 0;
    const b = this.ball; b.held = this.server.id; b.live = false; b.fl = null; b.v = [0, 0, 0]; b.w = [0, 0, 0];
    this.possTeam = t; this.touches = 0; this.lastPl = -1; this.lastTeam = t; this.lastKind = null; this.path = null;
    this.press = null; this.serveType = null; this.cue = null; this.attackInfo = null;
    for (const p of this.pl) { p.plan = null; p.act = null; p.dive = null; p.faceYaw = null; if (p.air) { p.air = null; p.y = 0; } }
    // the server behind the end line; the partner at the net; the receivers splitting their half
    const s = sideOf(t), sx = rnd(-2.2, 2.2);
    this.serveSpot = [this.server.human ? 0.8 : sx, s * 9.0];
    const mate = this.pl[t * 2 + (1 - this.server.slot)];
    this.goTo(this.server, this.serveSpot[0], this.serveSpot[1]);
    this.goTo(mate, -Math.sign(this.serveSpot[0] || 1) * 1.1, s * 1.3);
    const rt = 1 - t, rs = sideOf(rt);
    for (const p of this.pl.filter((q) => q.team === rt)) this.goTo(p, (p.slot === 0 ? -1 : 1) * 1.9 * -rs, rs * 5.9);
    if (first) for (const p of this.pl) { p.x = p.tx; p.z = p.tz; p.vx = p.vz = 0; }
  }
  goTo(p, x, z, face) { p.tx = x; p.tz = z; p.faceYaw = face === undefined ? null : face; }

  /* ---------------------------------------------------------------- the human's controls */
  pressBtn(btn) {
    const me = this.human; if (!me || this.hold) return;
    this.press = { btn, T: this.T, used: false };
    if ((this.phase === 'serve' || this.phase === 'pre') && this.server === me && this.ball.held === me.id) {
      // not until you're back behind the line (a press on the walk there would jump you to it)
      if (this.phase === 'pre' && hyp(me.x - me.tx, me.z - me.tz) > 0.6) return;
      this.toss(me, btn === 'B' ? 'float' : 'jump'); this.press.used = true; return;
    }
    if (this.phase === 'toss' && this.server === me && me.act && me.act.kind === 'serve' && !me.act.swung) { me.act.swing = this.T; this.press.used = true; return; }
    if (this.phase !== 'rally') return;
    const pl = me.plan;
    // a spike or a shot: the press is the take-off
    if (pl && pl.kind === 'attack' && !me.air && !me.dive) { me.attackBtn = btn; this.jump(me, me.jumpH * (btn === 'B' ? 0.85 : 1)); this.press.used = true; return; }
    if (pl && pl.kind === 'block' && !me.air && !me.dive) { this.jump(me, me.jumpH * 0.88, 'block'); this.press.used = true; return; }
  }

  /* ---------------------------------------------------------------- the clock */
  step(dt) {
    if (this.hold) return;
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= H) { this.acc -= H; this.tick(H); }
  }
  tick(h) {
    this.T += h;
    const b = this.ball, ph = this.phase, age = this.T - this.phaseT;
    if (ph === 'pre' && age > (this.server.human ? 1.0 : 2.0)) {
      const sv = this.server;
      if (hyp(sv.x - sv.tx, sv.z - sv.tz) < 0.4 || age > 3.5) { this.phase = 'serve'; this.phaseT = this.T; this.emit({ type: 'whistle' }); this.serveAt = this.T + rnd(0.7, 1.6); }
    }
    if (this.phase === 'serve' && !this.server.human && this.T >= this.serveAt) this.toss(this.server, Math.random() < this.server.sk.jumpServe ? 'jump' : 'float');
    if (this.phase === 'toss') this.serveTick();
    if (this.phase === 'dead' && age > 2.6) this.afterPoint();
    if (this.phase === 'break' && age > 3.4) { this.phase = 'pre'; this.startPoint(false); }

    for (const p of this.pl) this.movePlayer(p, h);
    if (b.held !== null) {
      const p = this.pl[b.held], hy = p.act && p.act.kind === 'serve' ? 1.15 : 1.0, s = sideOf(p.team);
      b.p[0] = p.x - 0.18 * s; b.p[1] = hy + p.y; b.p[2] = p.z - 0.35 * s;
    } else if (b.live) this.flyBall(h);
    else if (b.rest) { // rolling to a stop in the sand
      b.v[1] -= G * h; b.p[0] += b.v[0] * h; b.p[1] += b.v[1] * h; b.p[2] += b.v[2] * h;
      if (b.p[1] < R) { b.p[1] = R; b.v[1] = Math.abs(b.v[1]) * 0.15; if (b.v[1] < 0.3) b.v[1] = 0; b.v[0] *= 0.82; b.v[2] *= 0.82; }
    }
    if (this.phase === 'rally') this.contacts();
    this.updateCue();
  }

  /* ---------------------------------------------------------------- the serve */
  toss(p, kind) {
    if (this.ball.held !== p.id || (this.phase !== 'serve' && this.phase !== 'pre')) return;
    if (this.phase === 'pre') { this.phase = 'serve'; this.emit({ type: 'whistle' }); }
    const s = sideOf(p.team), b = this.ball;
    p.x = this.serveSpot[0]; p.z = this.serveSpot[1]; p.vx = p.vz = 0;
    b.held = null; b.live = true; b.rest = false;
    this.phase = 'toss'; this.phaseT = this.T; this.serveType = kind;
    if (kind === 'jump') { // high and in front: two steps, a jump, a spike
      b.p = [p.x - 0.1 * s, 1.7, p.z - 0.5 * s]; b.v = [0, 7.3, -1.45 * s]; b.w = [rnd(-3, 3), 0, 0];
      p.act = { kind: 'serve', type: 'jump', t0: this.T };
    } else { // a float: a low toss in front of the hitting shoulder
      b.p = [p.x - 0.2 * s, 1.55, p.z - 0.32 * s]; b.v = [0, 4.9, -0.1 * s]; b.w = [0, 0, 0];
      p.act = { kind: 'serve', type: 'float', t0: this.T };
    }
    this.emit({ type: 'toss', pl: p.id, kind });
    // when the hand meets it: the float at the reach, the jump serve at the top of a jump
    const hitY = kind === 'jump' ? p.reach + p.jumpH * 0.95 : p.reach + 0.05;
    const r = flyDown(b.p, b.v, hitY, b.w);
    p.act.tc = this.T + (r ? r.t : 0.8); p.act.hitY = hitY;
    if (kind === 'jump') { p.act.jumpIdeal = p.act.tc - tUp(p); p.act.jumpAt = p.act.jumpIdeal - 0.02 + gauss() * 0.02; }
    if (!p.human) p.act.swing = p.act.tc + rnd(-0.03, 0.03) * (1.2 - p.sk.serve);
  }
  serveTick() {
    const p = this.server, a = p.act, b = this.ball;
    if (!a) return;
    if (a.type === 'jump') {
      // the approach: two steps after the toss, then the jump: the computer's moment, the human's press (never so
      // early it can't reach), or late on its own
      if (!p.air && !a.jumped) {
        let at;
        if (!p.human) at = a.jumpAt;
        else if (a.swing !== undefined) at = Math.max(a.swing, a.jumpIdeal - 0.1);
        else at = a.jumpIdeal + 0.1;
        const s = sideOf(p.team);
        if (this.T >= at) {
          a.jumped = true;
          if (p.human) { a.auto = a.swing === undefined; a.pressOff = a.auto ? 0.3 : a.swing - a.jumpIdeal; }
          p.vx = (b.p[0] - p.x) * 1.2; p.vz = -2.0 * s; this.jump(p, p.jumpH);
        } else if (this.T > a.t0 + 0.4) { p.vz = lerp(p.vz, -2.4 * s, 0.06); p.z += p.vz * H; }
      }
      if (p.air && !a.swung) {
        const hand = this.handPos(p, 'spike'), d = hyp(b.p[0] - hand[0], b.p[1] - hand[1], b.p[2] - hand[2]);
        if (d < 0.4 || (b.v[1] < 0 && b.p[1] < hand[1] - 0.15 && d < 1.0)) this.serveHit(p, d);
      }
    } else {
      // the float: contact when the ball is back down at the hand; the human's press decides how sweetly
      if (p.human) {
        if (a.swing === undefined && this.T > a.tc + 0.12) { a.swing = this.T; a.auto = true; }
        if (a.swing !== undefined && !a.swung && this.T >= Math.max(a.swing, a.tc - 0.05)) { a.pressOff = a.auto ? 0.3 : a.swing - a.tc; this.serveHit(p, 0); }
      } else if (!a.swung && this.T >= a.swing) this.serveHit(p, 0);
    }
  }
  serveHit(p, miss) {
    const b = this.ball, a = p.act, jump = a.type === 'jump';
    a.swung = true; a.hit = this.T;
    // quality: the computer's skill, or the human's timing (how close the ball was to the sweet spot)
    let q;
    if (p.human) {
      const off = a.pressOff || 0;
      q = a.auto ? 0.42 : clamp(1 - Math.abs(off) / 0.34, 0.25, 1) * (jump ? clamp(1.15 - miss / 0.8, 0.5, 1) : 1);
      const label = a.auto ? 'Late' : Math.abs(off) < 0.06 ? 'Perfect' : Math.abs(off) < 0.14 ? 'Good' : off < 0 ? 'Early' : 'Late';
      this.emit({ type: 'timing', label, q }); p.stats.timed++; if (label === 'Perfect') p.stats.perfect++;
    } else q = clamp(p.sk.serve + gauss() * 0.12, 0.1, 1);
    // where: the computer picks a seam or a corner, sometimes at the weaker receiver; the human's stick aims
    const rt = 1 - p.team, rs = sideOf(rt), recv = this.pl.filter((x) => x.team === rt);
    let tx, tz;
    if (p.human) {
      tx = clamp(0.4 + this.input.ax * 3.6, -4.8, 4.8); tz = rs * clamp(5.6 + this.input.az * -2.6, 2.5, 9.2);
    } else {
      const aim = recv[Math.random() < (rt === 0 && !this.o.humanAI ? 0.6 : 0.5) ? 0 : 1];
      const seam = Math.random() < 0.4;
      tx = seam ? (recv[0].x + recv[1].x) / 2 + rnd(-0.6, 0.6) : clamp(aim.x + rnd(-1.6, 1.6), -3.4, 3.4);
      tz = rs * rnd(4.2, 7.6);
    }
    const err = (1 - q) * (jump ? 1.5 : 1.1);
    tx += gauss() * err; tz += gauss() * err * 1.2;
    let miss2 = !p.human && Math.random() < p.sk.serveErr;
    const from = b.p.slice();
    let sol;
    if (jump) {
      const spd = (18 + 6 * p.sk.power) * lerp(0.8, 1.04, q);
      if (miss2) { if (Math.random() < 0.5) tz = rs * rnd(8.4, 9.6); else tx = Math.sign(tx || 1) * rnd(4.2, 5.2); }
      let sp = spd;
      sol = solveDrive(from, [tx, R, tz], sp, rnd(28, 40));
      for (let k = 0; k < 5 && !miss2 && (sol.netY === null || sol.netY < NET + R + 0.18); k++) { sp *= 0.93; tz = rs * Math.min(Math.abs(tz) + 0.4, 7.8); sol = solveDrive(from, [tx, R, tz], sp, rnd(26, 36)); }
      if (miss2 && Math.random() < 0.35) sol.v[1] -= 1.6; // into the net
      b.v = sol.v; b.w = sol.w; b.fl = null;
    } else {
      // a float: flat over the tape, then it wanders
      if (miss2) { if (Math.random() < 0.5) tz = rs * rnd(8.4, 9.4); else tx = Math.sign(tx || 1) * rnd(4.25, 5.0); }
      const apex = Math.max(from[1] + 0.35, 3.3 + rnd(-0.3, 0.6) + (1 - q) * 0.8);
      b.v = miss2 ? solveArc(from, [tx, R, tz], apex) : solveOver(from, [tx, R, tz], apex); b.w = [0, 0, 0];
      if (miss2 && Math.random() < 0.35) b.v[1] -= 1.2;
      b.fl = { a: rnd(0.6, 1.5) * (Math.random() < 0.5 ? -1 : 1) * lerp(1.2, 0.7, q), f: rnd(3.5, 6), ph: rnd(0, 6.28), t0: this.T };
    }
    const speed = hyp(...b.v) * 3.6;
    p.stats.serves++; p.stats.topServe = Math.max(p.stats.topServe, speed);
    this.phase = 'rally'; this.phaseT = this.T;
    this.possTeam = p.team; this.touches = 0; this.lastPl = p.id; this.lastTeam = p.team; this.lastKind = 'serve'; this.rally = 0;
    this.emit({ type: 'touch', kind: 'serve', serveType: a.type, pl: p.id, team: p.team, q, speed, x: from[0], y: from[1], z: from[2] });
    p.act = { kind: 'serve', type: a.type, t0: a.t0, tc: this.T, hit: this.T, done: true };
    this.goTo(p, clamp(p.x * 0.6, -2, 2), sideOf(p.team) * 6.2);
    this.replan();
  }

  /* ---------------------------------------------------------------- jumps and dives */
  jump(p, hgt, kind) {
    if (p.air) return;
    const vy = Math.sqrt(2 * G * hgt);
    p.air = { t0: this.T, vy, kind: kind || 'spike', top: hgt }; p.vy = vy;
    this.emit({ type: 'jump', pl: p.id, kind: kind || 'spike' });
  }
  startDive(p, tx, tz) {
    if (p.dive || p.air) return;
    const dx = tx - p.x, dz = tz - p.z, d = Math.max(0.01, hyp(dx, dz));
    p.dive = { t0: this.T, ux: dx / d, uz: dz / d, len: Math.min(1.7, d) };
    p.busyTill = this.T + 1.25;
    this.emit({ type: 'dive', pl: p.id });
  }
  movePlayer(p, h) {
    // in the air: carried by the take-off, then down into the sand
    if (p.air) {
      const t = this.T - p.air.t0;
      p.y = p.air.vy * t - 0.5 * G * t * t;
      p.x += p.vx * h * 0.6; p.z += p.vz * h * 0.6;
      if (p.y <= 0 && t > 0.05) { p.y = 0; p.air = null; p.vx *= 0.2; p.vz *= 0.2; p.busyTill = Math.max(p.busyTill, this.T + 0.18); this.emit({ type: 'land', pl: p.id }); }
      this.keepSide(p);
      return;
    }
    if (p.dive) {
      const t = this.T - p.dive.t0;
      if (t < 0.38) { const sp = (p.dive.len / 0.38) * 1.35 * (1 - t / 0.5); p.x += p.dive.ux * sp * h; p.z += p.dive.uz * sp * h; }
      if (t > 1.25) p.dive = null;
      p.vx = p.vz = 0; this.keepSide(p);
      return;
    }
    // where to: the human's stick (unless auto-move has it), else the plan or the spot to stand
    let vx = 0, vz = 0;
    const humanStick = p.human && !this.input.auto && this.phase !== 'pre' && !(this.phase === 'toss' && this.server === p);
    const busy = this.T < p.busyTill;
    if (humanStick) {
      const sp = p.sk.speed * Math.min(1, hyp(this.input.mx, this.input.mz));
      const l = hyp(this.input.mx, this.input.mz) || 1;
      vx = (this.input.mx / l) * sp; vz = (this.input.mz / l) * sp;
      // the spike approach and the serve stay automatic
      if (p.plan && p.plan.kind === 'attack' && p.attackBtn === undefined && this.input.mx === 0 && this.input.mz === 0) { /* stand */ }
    } else if (!(this.phase === 'toss' && this.server === p)) {
      const dx = p.tx - p.x, dz = p.tz - p.z, d = hyp(dx, dz);
      const late = this.T < p.thinkAt;
      if (d > 0.03 && !late) {
        let sp = p.sk.speed * (p.plan && p.plan.urgent === false ? 0.7 : 1);
        if (this.phase === 'pre' || this.phase === 'dead' || this.phase === 'break') sp = Math.min(sp, 2.6);
        sp = Math.min(sp, Math.sqrt(2 * 9 * d) + 0.2); // brake to stop on the spot
        vx = (dx / d) * sp; vz = (dz / d) * sp;
      }
    }
    if (busy) { vx *= 0.15; vz *= 0.15; }
    const acc = 12 * h, ddx = vx - p.vx, ddz = vz - p.vz, dl = hyp(ddx, ddz);
    if (dl > acc) { p.vx += (ddx / dl) * acc; p.vz += (ddz / dl) * acc; } else { p.vx = vx; p.vz = vz; }
    p.x += p.vx * h; p.z += p.vz * h;
    // teammates never stand in each other: a soft push apart inside 0.7 m
    const mate = this.pl[p.team * 2 + (1 - p.slot)];
    if (!mate.air && !mate.dive) {
      const dx = p.x - mate.x, dz = p.z - mate.z, d = hyp(dx, dz);
      if (d < 0.7 && d > 1e-4) { const k = Math.min(0.7 - d, 1.5 * h); p.x += (dx / d) * k; p.z += (dz / d) * k; }
    }
    this.keepSide(p);
    // facing: toward the ball in play, the net otherwise, or as the plan asks
    const s = sideOf(p.team), b = this.ball;
    let want = p.team === 0 ? Math.PI : 0;
    if (p.faceYaw !== null) want = p.faceYaw;
    else if (b.live && this.phase !== 'dead') { const dx = b.p[0] - p.x, dz = b.p[2] - p.z; if (hyp(dx, dz) > 0.6 && dz * s < 1.5) want = Math.atan2(dx, dz); }
    let d = want - p.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); p.yaw += d * Math.min(1, h * 9);
  }
  keepSide(p) {
    const s = sideOf(p.team);
    if (p.z * s < 0.3) p.z = 0.3 * s;
    p.x = clamp(p.x, -9, 9); p.z = clamp(p.z, -12.5, 12.5);
  }
  // where the hands are for a touch, in the world
  handPos(p, kind) {
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    if (kind === 'spike') { const rx = -fz, rz = fx; return [p.x + fx * 0.32 + rx * 0.22, p.y + p.reach + 0.12, p.z + fz * 0.32 + rz * 0.22]; }
    if (kind === 'set') return [p.x + fx * 0.22, 2.05, p.z + fz * 0.22];
    return [p.x + fx * 0.45, 0.85, p.z + fz * 0.45];
  }

  /* ---------------------------------------------------------------- the ball in play: net, block, sand */
  flyBall(h) {
    const b = this.ball, p = b.p, v = b.v;
    const x0 = p[0], y0 = p[1], z0 = p[2];
    integ(p, v, b.w, h, b.fl, this.T);
    b.w[0] *= 1 - 0.15 * h; b.w[1] *= 1 - 0.15 * h; b.w[2] *= 1 - 0.15 * h;
    if (this.phase !== 'rally' && this.phase !== 'toss') { if (p[1] <= R) this.settle(); return; }
    // through the plane of the net
    if (z0 !== 0 && Math.sign(z0) !== Math.sign(p[2])) {
      const u = z0 / (z0 - p[2]), xc = lerp(x0, p[0], u), yc = lerp(y0, p[1], u);
      const from = z0 > 0 ? 0 : 1, to = 1 - from;
      if (Math.abs(xc) > COURT.antenna + R * 0.5 && yc > NET - COURT.netDrop - 0.2) { this.fault(this.lastTeam, 'antenna', 'Outside the antenna'); return; }
      if (Math.abs(Math.abs(xc) - COURT.antenna) < 0.06 + R && yc > NET - 0.05 && yc < NET + COURT.antennaH) { this.emit({ type: 'antenna', x: xc }); this.fault(this.lastTeam, 'antenna', 'Off the antenna'); return; }
      if (yc < NET + R * 0.6 && yc > NET - COURT.netDrop) {
        if (yc >= NET - R) { // the tape: up, and over or back
          const over = yc >= NET - R * 0.2 && Math.abs(v[2]) > 3;
          v[1] = Math.abs(v[1]) * 0.25 + rnd(0.8, 1.8); v[0] *= 0.6; v[2] *= over ? 0.35 : -0.25;
          p[2] = over ? (to === 0 ? 1 : -1) * 0.12 : (from === 0 ? 1 : -1) * 0.12; p[1] = NET + R;
          this.emit({ type: 'net', kind: 'tape', x: xc, y: yc });
          if (over) this.crossed(to);
        } else { // into the mesh: caught and dropped on its own side
          v[2] *= -0.12; v[0] *= 0.45; v[1] = Math.min(v[1] * 0.4, 0.5);
          p[2] = (from === 0 ? 1 : -1) * 0.12;
          this.emit({ type: 'net', kind: 'mesh', x: xc, y: yc, team: this.lastTeam });
          if (this.lastKind === 'serve') { this.fault(this.lastTeam, 'net', 'Serve in the net'); return; }
        }
        this.replan(); return;
      }
      if (yc <= NET - COURT.netDrop) { this.fault(this.lastTeam, 'under', 'Under the net'); return; }
      this.crossed(to);
      this.replan();
    }
    // a block: the blockers' hands, just over the net on their side
    if (this.lastKind === 'spike' || this.lastKind === 'shot' || this.lastKind === 'over') this.checkBlock();
    if (p[1] <= R) this.land();
  }
  crossed(to) {
    this.possTeam = to; this.touches = 0;
    if (this.lastKind === 'serve') this.teamStats[to].sideOutTries++;
  }
  checkBlock() {
    const b = this.ball, bt = 1 - this.lastTeam, sb = sideOf(bt);
    if (b.p[2] * sb < 0.02 || b.p[2] * sb > 0.42 || b.v[2] * sb <= 0 || this.blockDone) return;
    for (const p of this.pl) {
      if (p.team !== bt || !p.air || p.air.kind !== 'block') continue;
      const top = p.reach + p.y + 0.14, w = 0.42 + R;
      if (Math.abs(b.p[0] - p.x) > w || b.p[1] > top || b.p[1] < NET - 0.1) continue;
      this.blockTouch(p, top);
      return;
    }
  }
  blockTouch(p, top) {
    const b = this.ball, v = b.v, sb = sideOf(p.team), spd = hyp(...v);
    this.blockDone = true;
    // how well the hands were placed: high above the ball and square to it
    const over = clamp((top - b.p[1]) / 0.45, 0, 1), cen = 1 - clamp(Math.abs(b.p[0] - p.x) / 0.55, 0, 1);
    const skill = p.human ? 0.75 : p.sk.block, hitter = this.pl[this.lastPl];
    const stuffP = clamp(0.2 + 0.55 * over * cen * skill - (hitter ? hitter.sk.smart * 0.12 : 0), 0.05, 0.75);
    const toolP = clamp(0.08 + 0.18 * (1 - cen) + (hitter ? hitter.sk.smart * 0.1 : 0), 0.04, 0.4);
    const r = Math.random();
    let kind;
    if (r < stuffP) { // roofed: straight back down on the hitter's side
      kind = 'stuff'; v[2] = -v[2] * rnd(0.25, 0.45); v[1] = -Math.abs(v[1]) * 0.4 - rnd(1.5, 3.5); v[0] = v[0] * 0.4 + rnd(-1.5, 1.5);
      b.p[2] = -sb * 0.05;
    } else if (r < stuffP + toolP) { // off the hands and away
      kind = 'tool'; v[0] = (Math.sign(v[0] || rnd(-1, 1)) * rnd(4, 8)) + v[0] * 0.3; v[1] = Math.abs(v[1]) * 0.3 + rnd(1, 4); v[2] = v[2] * rnd(0.3, 0.6);
    } else { // a soft block: up on the blockers' side, theirs to play
      kind = 'soft'; v[0] = v[0] * 0.25 + rnd(-1, 1); v[1] = rnd(3.5, 6.5); v[2] = sb * rnd(0.8, 2.2);
    }
    b.w = [0, 0, 0];
    if (this.possTeam !== p.team) { this.possTeam = p.team; this.touches = 0; }
    this.touches++;
    this.lastPl = p.id; this.lastTeam = p.team; this.lastKind = 'block'; this.rally++;
    this.emit({ type: 'touch', kind: 'block', block: kind, pl: p.id, team: p.team, q: over, speed: spd * 3.6, x: b.p[0], y: b.p[1], z: b.p[2] });
    if (kind === 'stuff') { this.crossed(1 - p.team); }
    this.replan();
  }
  land() {
    const b = this.ball, x = b.p[0], z = b.p[2];
    if (this.phase === 'toss') { this.fault(this.server.team, 'serve', 'Serve dropped'); return; }
    const inside = inCourt(x, z), sideTeam = z > 0 ? 0 : 1;
    this.emit({ type: 'ballLand', x, z, in: inside });
    let winner, reason, text;
    if (inside) {
      winner = 1 - sideTeam;
      if (this.lastKind === 'serve' && this.lastTeam === winner) { reason = 'ace'; text = 'Ace'; }
      else if (this.lastKind === 'block' && this.lastTeam === winner) { reason = 'stuff'; text = 'Stuff block'; }
      else if (this.lastTeam === winner && (this.lastKind === 'spike' || this.lastKind === 'shot')) { reason = 'kill'; text = this.lastKind === 'shot' ? 'Shot' : 'Kill'; }
      else if (this.lastTeam === winner) { reason = 'drop'; text = 'In'; }
      else { reason = 'error'; text = 'Dropped'; }
    } else {
      winner = 1 - this.lastTeam;
      reason = this.lastKind === 'serve' ? 'serveOut' : this.lastKind === 'block' ? 'blockOut' : 'out';
      text = this.lastKind === 'block' ? 'Off the block' : this.lastKind === 'serve' ? 'Serve out' : 'Out';
    }
    this.pointTo(winner, reason, text, { x, z, inside });
  }
  settle() { const b = this.ball; b.live = false; b.rest = true; b.p[1] = R; b.v[1] = Math.abs(b.v[1]) * 0.12; b.v[0] *= 0.25; b.v[2] *= 0.25; b.fl = null; }
  fault(team, reason, text) { this.pointTo(1 - team, reason, text, {}); }

  /* ---------------------------------------------------------------- a point is won */
  pointTo(winner, reason, text, info) {
    if (this.phase !== 'rally' && this.phase !== 'toss') return;
    const loser = 1 - winner, by = this.lastPl >= 0 ? this.pl[this.lastPl] : null;
    this.score[winner]++;
    const TS = this.teamStats;
    TS[winner].points++;
    if (reason === 'ace') { TS[winner].aces++; if (by) { by.stats.aces++; by.stats.points++; } }
    else if (reason === 'kill') { TS[winner].kills++; if (by) { by.stats.kills++; by.stats.points++; } }
    else if (reason === 'stuff') { TS[winner].blocks++; if (by) { by.stats.blocks++; by.stats.points++; } }
    else { TS[loser].errors++; if (by && by.team === loser) by.stats.errors++; if (reason === 'serveOut' || reason === 'serve' || (reason === 'net' && this.lastKind === 'serve')) { TS[loser].serveErr++; if (by) by.stats.serveErr++; } }
    if (winner !== this.servingTeam) { TS[winner].sideOuts++; }
    this.longest = Math.max(this.longest, this.rally);
    const regain = winner !== this.servingTeam;
    if (regain) { this.servingTeam = winner; if (this.served[winner]) this.srvSlot[winner] = 1 - this.srvSlot[winner]; }
    this.phase = 'dead'; this.phaseT = this.T;
    this.ball.fl = null;
    if (this.ball.live && this.ball.p[1] <= R + 0.01) this.settle();
    for (const p of this.pl) { p.plan = null; p.faceYaw = null; }
    const e = { type: 'point', winner, reason, text, by: by ? by.id : -1, rally: this.rally, score: this.score.slice(), sideOut: regain, ...info };
    // the set?
    const tgt = this.target();
    if (this.score[winner] >= tgt && this.score[winner] - this.score[loser] >= 2) {
      this.sets.push({ s: this.score.slice() }); this.setsWon[winner]++;
      e.setWon = true;
      if (this.setsWon[winner] >= this.F.need) { e.matchWon = true; this.winner = winner; }
    }
    this.emit(e);
  }
  afterPoint() {
    const last = this.sets.length > this.setNo;
    if (last) {
      if (this.winner !== undefined) { this.phase = 'over'; this.phaseT = this.T; this.emit({ type: 'matchEnd', winner: this.winner }); return; }
      this.setNo++; this.score = [0, 0];
      this.servingTeam = this.setNo % 2 === 1 ? 1 - this.firstServe : Math.random() < 0.5 ? 0 : 1; this.srvSlot = [0, 0]; this.served = [false, false];
      this.phase = 'break'; this.phaseT = this.T; this.emit({ type: 'setStart', set: this.setNo + 1 });
      for (const p of this.pl) this.goTo(p, (p.slot ? 1.5 : -1.5), sideOf(p.team) * 4);
      return;
    }
    this.startPoint(false);
  }

  /* ---------------------------------------------------------------- who plays the ball next, and how */
  replan() {
    const b = this.ball;
    this.blockDone = this.lastKind === 'block';
    const P = predict(b, this.T); this.path = P;
    for (const p of this.pl) if (!(p.act && p.act.kind === 'serve' && !p.act.done)) p.plan = null;
    // the team that plays it: past the net if it crosses clean, else the one it's on
    let team;
    if (P.cross && P.cross.clean) team = P.cross.to;
    else team = b.p[2] > 0 ? 0 : 1;
    const poss = team === this.possTeam ? this.touches : 0;
    const left = 3 - poss;
    this.playTeam = team;
    if (left <= 0) { this.defendPlans(1 - team); return; } // nothing left to play: it must fall
    // which kind of touch
    const incoming = team !== this.lastTeam || this.lastKind === 'block';
    let kind;
    if (left === 3 || (left === 2 && this.lastKind === 'block' && this.lastTeam === team)) kind = this.lastKind === 'spike' || this.lastKind === 'block' ? 'dig' : 'pass';
    else if (left === 2) kind = 'set';
    else kind = 'attack';
    // the ball heading out (by a margin): let it go, unless a teammate's touch sent it there
    const outBound = P.land && !inCourt(P.land.x, P.land.z, 0.25) && (!P.cross || P.cross.clean);
    if (outBound && incoming && P.land && (P.land.z > 0 ? 0 : 1) === team) {
      const pl = this.pl.filter((q) => q.team === team), misread = pl.some((q) => !q.human && Math.random() > 0.55 + q.sk.smart * 0.4);
      if (!misread) { this.letGo(team, P); this.defendPlans(1 - team); return; }
    }
    // who: the one who gets there with the most time in hand (never the last to touch it)
    const cands = this.pl.filter((q) => q.team === team && !(q.id === this.lastPl && this.lastTeam === team && this.lastKind !== 'block'));
    let best = null;
    for (const q of cands) {
      let o = this.contactOption(q, kind, P, team);
      if (o && o.slack < 0.12 && (kind === 'set' || kind === 'attack')) {
        const low = this.contactOption(q, kind === 'set' ? 'bumpset' : 'over', P, team);
        if (low && low.slack > o.slack + 0.1) o = low;
      }
      if (o && (!best || o.slack > best.slack + (q.human ? -0.12 : 0))) best = o;
    }
    // on the second touch the setter is the one who didn't pass; on the third the attacker is the other one
    if (best) this.assign(best);
    const mate = cands.length > 1 ? cands.find((q) => !best || q !== best.pl) : this.pl.find((q) => q.team === team && (!best || q !== best.pl));
    if (mate) this.supportPlan(mate, kind, best, team);
    this.defendPlans(1 - team);
  }
  letGo(team, P) {
    for (const q of this.pl.filter((x) => x.team === team)) { q.plan = { kind: 'watch' }; this.goTo(q, clamp(q.x, -3.5, 3.5), q.z); }
    this.emit({ type: 'call', team, text: 'Out!' });
  }
  /* when a player can play this ball as `kind`: the contact point on the path, where to stand, and the time in hand */
  contactOption(q, kind, P, team) {
    const s = sideOf(team), n = P.t.length;
    if (!n) return null;
    let band;
    if (kind === 'attack') band = [q.reach + q.jumpH * 0.92 - 0.05, q.reach + q.jumpH * 0.92 + 0.05];
    else if (kind === 'set') band = [1.95, 2.15];
    else band = [0.75, 1.05]; // pass, dig, bumpset, over
    const react = q.human ? 0.12 : q.sk.react;
    let pick = null, lowPick = null;
    for (let i = 0; i < n; i++) {
      const x = P.x[i], y = P.y[i], z = P.z[i], t = P.t[i];
      if (z * s < 0.25 || Math.abs(x) > 8 || Math.abs(z) > 11.5) continue;
      const desc = i > 0 && P.y[i] <= P.y[i - 1];
      if (!desc) continue;
      if (y <= band[1] && y >= band[0] - 0.4) { pick = { i, x, y, z, t }; break; }
      if (y < band[0] && !lowPick) lowPick = { i, x, y, z, t };
    }
    let k = kind;
    if (!pick && (kind === 'attack' || kind === 'set')) {
      // too low to set overhead or spike: a bump set, or a free ball over
      for (let i = 0; i < n; i++) { const y = P.y[i], z = P.z[i]; if (z * s < 0.25 || i === 0 || P.y[i] > P.y[i - 1]) continue; if (y <= 1.05 && y >= 0.4) { pick = { i, x: P.x[i], y, z, t: P.t[i] }; break; } }
      k = kind === 'set' ? 'bumpset' : 'over';
    }
    if (kind === 'attack' && pick && Math.abs(pick.z) > 3.6) k = 'over'; // far from the net: send it over
    if (!pick) pick = lowPick;
    if (!pick) return null;
    // stand behind the ball, facing where it's going
    const fx = -Math.sign(s) * 0, fz = -s; // toward the net
    const off = k === 'attack' ? 0.32 : k === 'set' ? 0.2 : 0.45;
    let faceX = 0, faceZ = -s;
    if (k === 'pass' || k === 'dig' || k === 'bumpset') { const tx = clamp(pick.x * 0.25, -1.2, 1.2) - pick.x, tz = s * 1.6 - pick.z, l = hyp(tx, tz) || 1; faceX = tx / l; faceZ = tz / l; }
    const sx = pick.x - faceX * off, sz = pick.z - faceZ * off;
    const d = hyp(sx - q.x, sz - q.z);
    const need = react + d / q.sk.speed + Math.min(0.22, d * 0.12) + (q.dive ? 1 : 0) + (q.air ? 0.4 : 0);
    const avail = pick.t - (this.T < q.busyTill ? q.busyTill - this.T : 0);
    return { pl: q, kind: k, base: kind, cp: [pick.x, pick.y, pick.z], tc: this.T + pick.t, stand: [sx, sz], face: Math.atan2(faceX, faceZ), slack: avail - need, dist: d, fx, fz };
  }
  assign(o) {
    const q = o.pl, s = sideOf(q.team);
    q.plan = { kind: o.kind, tc: o.tc, cp: o.cp, stand: o.stand, face: o.face, slack: o.slack, urgent: true };
    q.thinkAt = this.T + (q.human ? 0 : q.sk.react * (this.lastKind === 'spike' ? 0.45 : 1));
    if (o.kind === 'attack') {
      // the approach: from a step behind the contact, take off a beat before the ball gets there
      q.plan.takeoff = o.tc - tUp(q) - 0.02; q.plan.stand = [o.cp[0] - Math.sin(q.yaw) * 0.0, o.cp[2] + s * 0.38];
      if (!q.human) q.plan.takeoff += gauss() * 0.04 * (1.15 - q.sk.attack);
    }
    this.goTo(q, q.plan.stand[0], q.plan.stand[1], o.face);
    if ((o.kind === 'pass' || o.kind === 'dig') && o.slack < -0.06 && o.slack > (o.kind === 'dig' ? -0.9 : -0.42)) q.plan.dive = true;
    if (q.human) q.attackBtn = undefined;
    this.emit({ type: 'plan', pl: q.id, kind: o.kind, tc: o.tc, cp: o.cp });
  }
  supportPlan(q, kind, best, team) {
    const s = sideOf(team);
    q.plan = { kind: 'support' };
    if (kind === 'pass' || kind === 'dig') { // the setter: to the spot near the net the pass is aimed at
      const cx = best ? clamp(best.cp[0] * 0.25, -1.2, 1.2) : 0;
      this.goTo(q, cx + 0.3 * (q.slot ? 1 : -1), s * 1.55);
    } else if (kind === 'set') { // the hitter: back off the net to approach
      const ax = best ? clamp(best.cp[0] + (best.cp[0] >= 0 ? -1.2 : 1.2), -2.4, 2.4) : 0;
      q.plan.approachX = ax;
      this.goTo(q, ax, s * 3.4);
    } else { // covering the hitter
      this.goTo(q, best ? best.cp[0] * 0.6 : 0, s * 3.8);
    }
  }
  /* the other team, while this one plays it: a blocker at the net and a defender behind, or both back for a free ball */
  defendPlans(team) {
    const s = sideOf(team), pls = this.pl.filter((q) => q.team === team);
    const left = this.playTeam === team ? 0 : 3 - (this.possTeam === this.playTeam ? this.touches : 0);
    const att = this.pl.find((q) => q.team !== team && q.plan && (q.plan.kind === 'attack'));
    // the blocker: whoever is nearer the net (you, if you're up there)
    pls.sort((a, b) => Math.abs(a.z) - Math.abs(b.z));
    let blk = pls[0], def = pls[1];
    const me = pls.find((q) => q.human);
    if (me && Math.abs(me.z) < 3.2) { blk = me; def = pls.find((q) => q !== me); }
    if (att && left === 1) {
      const ax = att.plan.cp[0];
      // block the line or the angle: the defender takes what the block doesn't
      const takeLine = Math.random() < 0.5;
      const shade = takeLine ? Math.sign(ax || 1) * 0.25 : -Math.sign(ax || 1) * 0.15;
      blk.plan = { kind: 'block', tc: att.plan.tc, x: clamp(ax + shade, -3.8, 3.8), jumpAt: att.plan.tc - tUp(blk) + 0.07 + (blk.human ? 0 : gauss() * 0.06 * (1.1 - blk.sk.block)) };
      this.goTo(blk, blk.plan.x, s * 0.42, team === 0 ? Math.PI : 0);
      blk.thinkAt = this.T + (blk.human ? 0 : blk.sk.react * 0.6);
      const dx = takeLine ? clamp(-ax * 0.9, -3.3, 3.3) : clamp(ax * 0.9, -3.3, 3.3);
      def.plan = { kind: 'defend' };
      this.goTo(def, dx, s * 5.6, team === 0 ? Math.PI : 0);
      def.thinkAt = this.T + def.sk.react * 0.5;
    } else {
      // the other side is still building: blocker drifts to the net, defender to the middle of the back
      if (blk.plan == null || blk.plan.kind !== 'block') { blk.plan = { kind: 'ready' }; this.goTo(blk, clamp((this.ball.p[0]) * 0.4, -2, 2), s * (left >= 2 ? 1.4 : 2.2)); }
      if (def.plan == null || def.plan.kind !== 'defend') { def.plan = { kind: 'ready' }; this.goTo(def, clamp(-blk.tx * 0.3, -1.5, 1.5), s * 5.4); }
    }
  }

  /* ---------------------------------------------------------------- touches as they happen */
  contacts() {
    const b = this.ball;
    if (!b.live) return;
    for (const q of this.pl) {
      const pl = q.plan;
      if (!pl) continue;
      // block jumps on time (the computer; the human presses)
      if (pl.kind === 'block' && !q.human && !q.air && this.T >= pl.jumpAt && this.T < pl.jumpAt + 0.3) this.jump(q, q.jumpH * 0.88, 'block');
      if (!['pass', 'dig', 'set', 'bumpset', 'attack', 'over'].includes(pl.kind)) continue;
      // the spike's approach and take-off
      if (pl.kind === 'attack') {
        if (!q.human && !q.air && this.T >= pl.takeoff && this.T < pl.takeoff + 0.25) {
          const s = sideOf(q.team);
          if (hyp(q.x - pl.stand[0], q.z - pl.stand[1]) > 0.6) { pl.kind = 'over'; continue; }
          q.vx = (pl.cp[0] - q.x) * 1.2; q.vz = -s * 1.4; this.jump(q, q.jumpH);
          this.onTakeoff(q);
        }
        if (q.air && q.air.kind === 'spike') {
          const hand = this.handPos(q, 'spike'), d = hyp(b.p[0] - hand[0], b.p[1] - hand[1], b.p[2] - hand[2]);
          if (d < 0.42 || (d < 0.7 && b.p[1] < hand[1] - 0.2)) { this.attack(q, d, hand); return; }
        } else if (q.human && !q.air && b.v[1] < 0 && b.p[1] < 1.9) {
          // never jumped: push it over with whatever you have
          const d = hyp(b.p[0] - q.x, b.p[2] - q.z);
          if (d < 1.0 && b.p[1] > 0.45) { this.overhead(q, 'over', 0.3, 'Late'); return; }
        }
        continue;
      }
      // a dive when the ball is just out of reach
      if (pl.dive && !q.dive && !q.air && this.T >= pl.tc - 0.42) this.startDive(q, pl.cp[0], pl.cp[2]);
      const kind = pl.kind;
      let hand, reachH, yLo, yHi;
      if (kind === 'set') { hand = this.handPos(q, 'set'); reachH = 0.55; yLo = 1.7; yHi = 2.45; }
      else { hand = this.handPos(q, 'bump'); reachH = q.dive ? 2.8 : kind === 'dig' ? 1.35 : 0.7; yLo = q.dive ? 0.08 : 0.25; yHi = 1.5; if (q.dive) hand[1] = 0.4; }
      const dh = hyp(b.p[0] - hand[0], b.p[2] - hand[2]);
      const ready = b.v[1] < 0 && b.p[1] <= (kind === 'set' ? 2.15 : q.dive ? 0.7 : 1.05) && b.p[1] >= yLo;
      if (dh <= reachH && b.p[1] <= yHi && ready) { this.playTouch(q, kind, dh / reachH); return; }
    }
  }
  /* the computer's attacker leaves the sand: where the spike will go is decided now, and a defender who reads the
     approach (the hitter's shoulders, the run) starts toward it before the hand meets the ball */
  onTakeoff(q) {
    const pl = q.plan; if (!pl || !pl.cp) return;
    const opp = this.pl.filter((x) => x.team !== q.team);
    pl.aim = this.pickTarget(q, false, opp, pl.cp, q.sk.smart);
    for (const d of opp) {
      if (!d.plan || d.plan.kind !== 'defend') continue;
      const pRead = d.human ? (this.input.auto ? 0.55 : 0) : 0.22 + 0.45 * d.sk.dig;
      if (Math.random() >= pRead) continue;
      this.goTo(d, lerp(d.tx, pl.aim[0], 0.75), lerp(d.tz, pl.aim[1], 0.6), d.faceYaw === null ? undefined : d.faceYaw);
      d.thinkAt = this.T;
    }
  }
  /* the human's timing for a touch: the latest press before the ball arrives */
  humanTiming(q, kindWindow = [0.05, 0.42]) {
    const pr = this.press;
    if (!pr || pr.used || this.T - pr.T > 0.95) return { q: 0.45, label: 'Late', auto: true };
    pr.used = true;
    const age = this.T - pr.T;
    let qq, label;
    if (age >= kindWindow[0] && age <= kindWindow[1]) { qq = 1; label = 'Perfect'; }
    else if (age < kindWindow[0]) { qq = 0.72; label = 'Late'; }
    else if (age <= kindWindow[1] + 0.25) { qq = 0.8; label = 'Good'; }
    else { qq = 0.6; label = 'Early'; }
    return { q: qq, label, btn: pr.btn };
  }
  playTouch(q, kind, offc) {
    let quality, timing = null;
    const b = this.ball, inSpd = hyp(...b.v);
    if (q.human) {
      timing = this.humanTiming(q);
      quality = timing.q * lerp(1, 0.75, clamp(offc, 0, 1));
      this.emit({ type: 'timing', label: timing.label, q: timing.q }); q.stats.timed++; if (timing.label === 'Perfect') q.stats.perfect++;
    } else {
      const sk = kind === 'set' || kind === 'bumpset' ? q.sk.set : kind === 'dig' ? q.sk.dig : q.sk.pass;
      quality = clamp(sk + gauss() * 0.1 - offc * 0.12, 0.05, 1);
    }
    // a hard ball is harder to control
    const hard = clamp((inSpd - 11) / 16, 0, 1);
    if (kind === 'dig' || kind === 'pass') quality *= lerp(1, kind === 'dig' ? 0.78 : 0.84, hard);
    if (q.dive) quality *= 0.85;
    if (kind === 'set' || kind === 'bumpset') { this.setBall(q, quality, kind, timing); return; }
    if (kind === 'over') { this.overhead(q, 'over', quality, timing && timing.label); return; }
    this.passBall(q, kind, quality);
  }
  // the first touch (a pass of a serve, a dig of an attack): high to the setter's spot near the net
  passBall(q, kind, quality) {
    const b = this.ball, s = sideOf(q.team);
    // a shank: off the arms anywhere
    const shankP = kind === 'dig' ? clamp(0.36 - quality * 0.5, 0.03, 0.3) : clamp(0.26 - quality * 0.36, 0.01, 0.2);
    if (Math.random() < shankP) {
      const a = rnd(0, Math.PI * 2);
      this.doTouch(q, kind, quality * 0.4, [Math.cos(a) * rnd(2, 6), rnd(2, 7), Math.sin(a) * rnd(2, 6)], [0, 0, 0], { shank: true });
      return;
    }
    const err = lerp(2.4, 0.25, quality);
    const tx = clamp(b.p[0] * 0.25, -1.2, 1.2) + gauss() * err * 0.7, tz = s * (1.7 + gauss() * err * 0.6);
    const apex = lerp(3.4, 5.2, quality) + rnd(-0.4, 0.6) + (kind === 'dig' ? rnd(-0.5, 0.5) : 0);
    const v = solveArc(b.p, [tx, 2.0, tz], apex);
    if (q.stats) q.stats.digs += kind === 'dig' ? 1 : 0;
    this.doTouch(q, kind, quality, v, [0, 0, 0]);
  }
  // the second touch: up to where the hitter will meet it at the top of a jump
  setBall(q, quality, kind, timing) {
    const b = this.ball, s = sideOf(q.team), mate = this.pl.find((x) => x.team === q.team && x !== q);
    // the human on the second touch with B: attack on two, over the block
    if (q.human && timing && timing.btn === 'B' && Math.abs(b.p[2]) < 2.6) { this.overhead(q, 'shot', quality, timing.label); return; }
    const ax = clamp(mate && mate.plan && mate.plan.approachX !== undefined ? mate.plan.approachX : mate ? mate.x * 0.5 : 0, -2.6, 2.6);
    let tx = ax, tz = s * 0.75;
    const err = lerp(1.3, 0.15, quality);
    tx += gauss() * err; tz += s * Math.abs(gauss()) * err * 0.8;
    const hy = (mate ? mate.reach + mate.jumpH * 0.92 : 3.0) - (1 - quality) * 0.3 * Math.random();
    const apex = hy + lerp(1.2, 2.0, Math.random());
    const v = solveArc(b.p, [tx, hy, tz], apex);
    this.doTouch(q, kind, quality, v, [0, 0, 0]);
  }
  /* the third touch in the air: a spike (hard, topspin, at the open court) or a shot (soft, over the block) */
  attack(q, d, hand) {
    const b = this.ball, s = sideOf(q.team), os = -s;
    // quality: how high and clean the contact was
    const heightQ = clamp((b.p[1] - (NET + 0.15)) / (q.reach + q.jumpH - NET - 0.15), 0, 1);
    const clean = 1 - clamp(d / 0.6, 0, 1);
    const offNet = clamp(1 - (Math.abs(b.p[2]) - 0.5) / 2.5, 0, 1);
    let quality = clamp(0.25 + 0.45 * heightQ + 0.3 * clean, 0, 1) * lerp(0.7, 1, offNet);
    let soft = false;
    if (q.human) {
      soft = q.attackBtn === 'B';
      const t = this.T - q.air.t0, ideal = tUp(q);
      const off = Math.abs(t - ideal);
      const label = off < 0.07 ? 'Perfect' : off < 0.15 ? 'Good' : t < ideal ? 'Late' : 'Early';
      this.emit({ type: 'timing', label, q: quality }); q.stats.timed++; if (label === 'Perfect') q.stats.perfect++;
    } else {
      quality = clamp(quality * lerp(0.8, 1.05, q.sk.attack) + gauss() * 0.06, 0.05, 1);
      soft = Math.random() < q.sk.shot + (heightQ < 0.45 ? 0.35 : 0) + (offNet < 0.5 ? 0.3 : 0);
    }
    const opp = this.pl.filter((x) => x.team !== q.team);
    let tx, tz;
    if (q.human) {
      const ax = this.input.ax, az = this.input.az;
      const dflt = soft ? [-Math.sign(b.p[0] || 1) * 2.6, 2.6] : [-Math.sign(b.p[0] || 1) * 1.8, 5.8];
      tx = clamp(dflt[0] + ax * 3.4, -5, 5); tz = os * clamp(dflt[1] - az * 2.6, 1.2, 9.5);
      if (Math.abs(ax) < 0.15 && Math.abs(az) < 0.15) { const pick = this.pickTarget(q, soft, opp, b.p, 0.45); tx = pick[0]; tz = pick[1]; }
    } else {
      const pick = !soft && q.plan && q.plan.aim ? q.plan.aim : this.pickTarget(q, soft, opp, b.p, q.sk.smart); tx = pick[0]; tz = pick[1];
    }
    const err = lerp(1.7, 0.2, quality) * (soft ? 0.7 : 1);
    tx += gauss() * err * 0.8; tz += gauss() * err;
    const errP = q.human ? clamp(0.18 - quality * 0.2, 0, 0.12) : q.sk.err * lerp(1.6, 0.7, quality);
    const blunder = Math.random() < errP;
    if (blunder) { const r = Math.random(); if (r < 0.4) tz = os * rnd(8.3, 9.5); else if (r < 0.75) tx = Math.sign(tx || 1) * rnd(4.15, 5.2); }
    let v, w;
    if (soft) {
      const apex = Math.max(b.p[1] + 0.25, NET + rnd(0.9, 1.9));
      v = solveOver(b.p, [tx, R, tz], apex); w = [0, 0, 0];
    } else {
      const spd = (17 + 9 * q.sk.power) * lerp(0.72, 1.05, quality);
      const sol = solveDrive(b.p, [tx, R, tz], spd, rnd(30, 45));
      v = sol.v; w = sol.w;
      // a low contact can't get a short spike down over the net: the computer hits deeper, or rolls it instead
      if (!q.human && sol.netY !== null && sol.netY < NET + R + 0.04 && !blunder) {
        const deep = solveDrive(b.p, [tx, R, os * clamp(Math.abs(tz) + 1.6, 4, 7.7)], spd, rnd(30, 45));
        if (deep.netY !== null && deep.netY >= NET + R + 0.04) { v = deep.v; w = deep.w; }
        else { v = solveOver(b.p, [tx, R, tz], Math.max(b.p[1] + 0.3, NET + 1.0)); w = [0, 0, 0]; soft = true; }
      }
      if (blunder && Math.random() < 0.25) v[1] -= 2.5; // into the net
    }
    const speed = hyp(...v) * 3.6;
    q.stats.attacks++; if (!soft) q.stats.topSpike = Math.max(q.stats.topSpike, speed);
    this.doTouch(q, soft ? 'shot' : 'spike', quality, v, w, { speed });
  }
  // the computer's aim: the open court away from the defender and around the block
  pickTarget(q, soft, opp, from, smart) {
    const os = -sideOf(q.team), blk = opp.find((x) => x.plan && x.plan.kind === 'block') || opp.reduce((a, c) => (Math.abs(c.z) < Math.abs(a.z) ? c : a));
    const def = opp.find((x) => x !== blk) || opp[0];
    let best = null;
    const xs = [-3.4, -2.4, -1.2, 0, 1.2, 2.4, 3.4], ds = soft ? [1.6, 2.5, 6.8, 7.4] : [4.0, 5.2, 6.3, 7.3];
    for (const x of xs) for (const d of ds) {
      const z = os * d;
      let sc = hyp(x - def.x, z - def.z) * (soft ? 1.0 : 1.2);
      if (!soft && Math.abs(blk.z) < 1.2) { // the block's shadow on a straight line through the net
        const u = from[2] / (from[2] - z), xn = from[0] + (x - from[0]) * u;
        if (Math.abs(xn - blk.x) < 0.6) sc -= 3.4 * smart * rnd(0.3, 1);
      }
      if (soft && Math.abs(blk.z) < 1.2 && d < 2) sc += 0.6; // a cut shot past an in-close block
      sc -= (Math.abs(x) > 3 || d > 7) ? (1 - smart) * 1.5 : 0; // close to the lines is risky
      sc += gauss() * (1.6 - smart * 1.2);
      if (!best || sc > best.sc) best = { sc, x, z };
    }
    return [best.x, best.z];
  }
  // a ball pushed over with two hands or a forearm: the free ball, or the human's "attack on two"
  overhead(q, kind, quality, label) {
    const b = this.ball, os = -sideOf(q.team);
    const tx = clamp(gauss() * 1.6, -3, 3), tz = os * (kind === 'shot' ? rnd(1.6, 3.5) : rnd(4.5, 7));
    const apex = Math.max(b.p[1] + 0.5, NET + (kind === 'shot' ? 0.9 : rnd(2, 3.5)));
    const v = solveOver(b.p, [tx + gauss() * (1 - quality), R, tz + gauss() * (1 - quality)], apex);
    if (q.human && label) this.emit({ type: 'timing', label, q: quality });
    this.doTouch(q, kind, quality, v, [0, 0, 0]);
  }
  doTouch(q, kind, quality, v, w, extra = {}) {
    const b = this.ball;
    if (this.possTeam !== q.team) { this.possTeam = q.team; this.touches = 0; }
    this.touches++;
    if (this.touches > 3) { this.fault(q.team, 'four', 'Four touches'); return; }
    if (this.lastPl === q.id && this.lastKind !== 'block' && this.lastTeam === q.team) { this.fault(q.team, 'double', 'Double touch'); return; }
    b.v = v.slice(); b.w = w.slice(); b.fl = null;
    this.lastPl = q.id; this.lastTeam = q.team; this.lastKind = kind; this.rally++;
    q.act = { kind, t0: this.T, tc: this.T, q: quality };
    q.plan = null;
    const speed = extra.speed || hyp(...v) * 3.6;
    this.emit({ type: 'touch', kind, pl: q.id, team: q.team, q: quality, speed, x: b.p[0], y: b.p[1], z: b.p[2], shank: !!extra.shank });
    this.replan();
  }

  /* ---------------------------------------------------------------- the press cue: when a press now would be perfect */
  updateCue() {
    const me = this.human; this.cue = null;
    if (!me) return;
    if (this.phase === 'serve' && this.server === me && this.ball.held === me.id) { this.cue = { kind: 'serve', now: true }; return; }
    if (this.phase === 'toss' && this.server === me && me.act && !me.act.swung) {
      const a = me.act, ideal = a.type === 'jump' ? a.jumpIdeal : a.tc;
      this.cue = { kind: 'hit', dt: ideal - this.T, now: Math.abs(ideal - this.T) < 0.08 };
      return;
    }
    const pl = me.plan;
    if (this.phase !== 'rally' || !pl) return;
    if (pl.kind === 'attack' && !me.air) { const dt = pl.takeoff - this.T; this.cue = { kind: 'attack', dt, now: Math.abs(dt) < 0.07 }; return; }
    if (pl.kind === 'block' && !me.air) { const dt = pl.jumpAt - this.T; this.cue = { kind: 'block', dt, now: Math.abs(dt) < 0.08 }; return; }
    if (['pass', 'dig', 'set', 'bumpset', 'over'].includes(pl.kind)) { const dt = pl.tc - this.T; this.cue = { kind: pl.kind, dt, now: dt <= 0.4 && dt >= 0.05 }; }
  }
  /* what the human's buttons would do now, for the touch labels */
  buttonLabels() {
    const me = this.human; if (!me) return null;
    if ((this.phase === 'serve' || this.phase === 'pre') && this.server === me) return ['Jump serve', 'Float serve'];
    if (this.phase === 'toss' && this.server === me) return ['Hit', 'Hit'];
    const pl = me.plan;
    if (this.phase === 'rally' && pl) {
      if (pl.kind === 'attack') return ['Spike', 'Shot'];
      if (pl.kind === 'set') return ['Set', 'On two'];
      if (pl.kind === 'bumpset') return ['Bump set', 'Bump set'];
      if (pl.kind === 'block') return ['Block', 'Block'];
      if (pl.kind === 'pass' || pl.kind === 'dig') return ['Pass', 'Pass'];
      if (pl.kind === 'over') return ['Over', 'Over'];
    }
    return ['Spike', 'Shot'];
  }
}
