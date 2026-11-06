/* The match: players and the ball on the pitch, at 60 steps a second. Possession and dribbling, passes and shots,
   tackles and fouls, the keepers' saves, and the laws that matter here: kick-offs, goals, throw-ins, corners, goal
   kicks, free kicks and penalties, two halves with the ends changed. The decisions (AI) are in ai.js; drawing is in
   main.js. A team attacks the goal at x = team.dir * HL. */
import { V3, P, clamp, lerp, rand, pick, angDiff, yawOf, hyp } from './util.js';
import { Ball } from './ball.js';
import { kickVelocity, groundSpeed, rollTime } from './kicks.js';
import { think, thinkKeeper, restartChoice } from './ai.js';

export const DT = 1 / 60;
export const SPEED = { walk: 1.6, jog: 3.4, run: 5.7, sprint: 7.7, ballRun: 5.2, ballSprint: 7.0 };
export const DIFF = {
  easy: { react: 0.34, tackle: 0.36, pass: 0.07, shot: 0.11, keep: 0.55, pace: 0.9, think: 0.42 },
  medium: { react: 0.24, tackle: 0.5, pass: 0.045, shot: 0.075, keep: 0.72, pace: 0.97, think: 0.3 },
  hard: { react: 0.16, tackle: 0.62, pass: 0.03, shot: 0.05, keep: 0.86, pace: 1.03, think: 0.2 },
};
// formations: u from own goal line (0) to the opponents' (1), v across the pitch (-1 to 1)
export const FORMATIONS = {
  11: [['GK', 0.02, 0], ['DEF', 0.2, -0.74], ['DEF', 0.17, -0.26], ['DEF', 0.17, 0.26], ['DEF', 0.2, 0.74], ['MID', 0.42, -0.58], ['MID', 0.36, 0], ['MID', 0.42, 0.58], ['FWD', 0.66, -0.6], ['FWD', 0.72, 0], ['FWD', 0.66, 0.6]],
  7: [['GK', 0.02, 0], ['DEF', 0.2, -0.45], ['DEF', 0.2, 0.45], ['MID', 0.42, -0.65], ['MID', 0.38, 0], ['MID', 0.42, 0.65], ['FWD', 0.68, 0]],
};

let UID = 0;
export class Player {
  constructor(team, i, info, role, home) {
    this.id = UID++; this.team = team; this.i = i; this.role = role; this.home = { u: home[0], v: home[1] };
    this.name = info.name; this.short = info.short || info.name.split(' ').pop(); this.num = info.num;
    this.pos = new V3(); this.vel = new V3(); this.want = new V3(); this.yaw = 0; this.yawRate = 0;
    this.state = 'move'; this.t = 0; this.act = null; this.kick = null;
    this.cool = 0; this.sprint = false; this.face = null; // face: a point to face instead of the way he moves
    this.pace = rand(0.95, 1.05) * (role === 'FWD' ? 1.03 : role === 'GK' ? 0.92 : 1);
    this.skill = rand(0.85, 1.1);
    this.thinkT = Math.random() * 0.3; this.plan = null; this.runTo = null; this.runT = 0;
    this.body = null; this.lateral = 0; this.lean = 0;
  }
  get keeper() { return this.role === 'GK'; }
  get busy() { return this.state !== 'move'; }
  dir(out) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  dist(p) { return hyp(p.x - this.pos.x, p.z - this.pos.z); }
}

export class Team {
  constructor(def, side, size, human) {
    this.def = def; this.name = def.name; this.short = def.short; this.kit = def.kit; this.gkKit = def.gkKit;
    this.side = side; this.dir = side === 0 ? 1 : -1; this.human = human;
    this.score = 0; this.stats = { shots: 0, onTarget: 0, poss: 0, passes: 0, passOk: 0, tackles: 0, fouls: 0, corners: 0 };
    const form = FORMATIONS[size] || FORMATIONS[11];
    // the squad is listed as an XI (keeper, four defenders, three midfielders, three forwards); a seven picks its
    // centre-backs, the midfield and the centre-forward from it
    const squad = def.squad, slots = size === 7 ? [0, 2, 3, 5, 6, 7, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.players = form.map(([role, u, v], i) => new Player(this, i, squad[slots[i]] || squad[i % squad.length], role, [u, v]));
    this.controlled = null; this.pens = [];
  }
  get keeper() { return this.players[0]; }
  // pitch x from u (0 at own goal line, 1 at the opponents')
  xOf(u) { return this.dir * (-P.HL + u * 2 * P.HL); }
  uOf(x) { return (x * this.dir + P.HL) / (2 * P.HL); }
  get goalX() { return this.dir * P.HL; } // the goal it attacks
  get ownGoalX() { return -this.dir * P.HL; }
}

const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3();

export class Match {
  /* o: { mode: 'match' | 'practice', teams: [def, def], human: 0 | 1 | null, size, half (seconds), diff } */
  constructor(scene, o) {
    this.o = o; this.mode = o.mode || 'match';
    this.ball = new Ball(scene);
    this.D = DIFF[o.diff] || DIFF.medium;
    const size = this.mode === 'practice' ? 11 : o.size;
    this.teams = [new Team(o.teams[0], 0, size, o.human === 0), new Team(o.teams[1], 1, size, o.human === 1)];
    this.teams[0].opp = this.teams[1]; this.teams[1].opp = this.teams[0];
    if (this.mode === 'practice') {
      // you and a striker partner against two defenders and a keeper, at one end
      const keep = (t, idx) => { t.players = t.players.filter((p) => idx.includes(p.i)); };
      keep(this.teams[0], [9, 10]); keep(this.teams[1], [0, 2, 3]);
    }
    this.all = [...this.teams[0].players, ...this.teams[1].players];
    this.events = []; this.clock = 0; this.halfLen = o.half || 180; this.half = 1; this.t = 0;
    this.phase = 'pre'; this.phaseT = 0; this.restart = null; this.lastTouch = null; this.lastTeam = null;
    this.pass = null; // { from, to, team, t } a pass on its way
    this.possT = [0, 0];
    this.human = o.human === null || o.human === undefined ? null : this.teams[o.human];
    if (this.human) this.human.controlled = this.human.players.find((p) => p.role === 'FWD') || this.human.players[1];
  }
  emit(type, data = {}) { this.events.push(Object.assign({ type }, data)); }

  /* ------------------------------------------------------------ setup */
  start() {
    if (this.mode === 'practice') { this.practiceReset(true); return; }
    if (this.mode === 'shootout') { this.kicks = [[], []]; this.kickN = 0; this.humanDive = null; this.nextPen(); return; }
    this.kickoffTeam = this.teams[Math.random() < 0.5 ? 0 : 1];
    this.firstKickoff = this.kickoffTeam;
    this.setRestart('kickoff', this.kickoffTeam);
  }
  practiceReset(first) {
    const you = this.teams[0];
    const s = you.dir, x = s * rand(18, 30), z = rand(-18, 18);
    this.ball.place(x, z);
    this.ball.owner = null;
    for (const p of this.all) { p.state = 'move'; p.act = null; p.kick = null; p.vel.set(0, 0, 0); }
    const [a, b] = you.players;
    a.pos.set(x - s * 1.2, 0, z); b.pos.set(x - s * 6, 0, -z * 0.4 + 6); a.yaw = b.yaw = yawOf(s, 0);
    const [gk, d1, d2] = this.teams[1].players;
    gk.pos.set(s * (P.HL - 1), 0, 0); d1.pos.set(s * (P.HL - 14), 0, -7); d2.pos.set(s * (P.HL - 14), 0, 7);
    for (const p of this.teams[1].players) p.yaw = yawOf(-s, 0);
    you.controlled = a; this.giveBall(a);
    this.phase = 'play'; this.restart = null;
    if (!first) this.emit('reset');
  }

  /* a restart: the ball placed, the players in their places, the taker waiting */
  /* the shootout: both sides shoot at the same goal (x = +HL), turn about */
  nextPen() {
    const team = this.teams[this.kickN % 2];
    team.dir = 1; team.opp.dir = -1;
    this.humanDive = null;
    this.setRestart('penalty', team);
  }
  penResult(scored) {
    const r = this.lastPen; if (!r || r.done) return; r.done = true;
    const side = r.team.side;
    this.kicks[side].push(scored);
    this.kickN++;
    this.emit('pen', { team: r.team, scored, kicks: this.kicks });
    const g = this.kicks.map((k) => k.filter(Boolean).length), n = this.kicks.map((k) => k.length);
    let over = false;
    if (n[0] <= 5 && n[1] <= 5) { if (g[0] > g[1] + (5 - n[1]) || g[1] > g[0] + (5 - n[0])) over = true; }
    if (n[0] === n[1] && n[0] >= 5 && g[0] !== g[1]) over = true;
    this.phase = 'dead'; this.phaseT = 0; this.after = { shootout: true, over, wait: 2.4 };
  }
  setRestart(type, team, spot = null, extra = {}) {
    this.phase = 'restart'; this.phaseT = 0; this.pass = null; this.penaltyKick = false;
    for (const p of this.all) { p.seen = null; p.guessed = false; p.penTarget = null; p.holding = false; }
    if (type === 'penalty' && this.mode === 'shootout') this.lastPen = { team, done: false };
    const b = this.ball; b.owner = null; b.vel.set(0, 0, 0); b.spin.set(0, 0, 0);
    const opp = team.opp;
    for (const p of this.all) { p.state = 'move'; p.act = null; p.kick = null; p.vel.set(0, 0, 0); p.runTo = null; p.plan = null; p.cool = 0; if (p.body) p.body.stop(); }
    let at = spot ? spot.clone() : new V3(0, 0, 0);
    if (type === 'kickoff') at.set(0, 0, 0);
    if (type === 'goalkick') at.set(team.ownGoalX + team.dir * (P.sixL - 0.5), 0, spot && spot.z > 0 ? 4 : -4);
    if (type === 'corner') at.set(team.goalX - team.dir * 0.4, 0, (spot && spot.z > 0 ? 1 : -1) * (P.HW - 0.4));
    if (type === 'penalty') at.set(team.goalX - team.dir * P.spot, 0, 0);
    if (type === 'throwin') at.set(clamp(at.x, -P.HL + 1, P.HL - 1), 0, Math.sign(at.z || 1) * (P.HW - 0.25)); // on the line, so it is in play
    at.y = 0;
    b.place(at.x, at.z);
    // everyone to a sensible spot for this restart
    for (const t of this.teams) for (const p of t.players) {
      const pos = this.restartSpot(type, t, p, at, team);
      p.pos.set(pos.x, 0, pos.z);
      p.yaw = yawOf(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    }
    // the taker: by role for each restart
    let taker;
    if (type === 'goalkick') taker = team.keeper;
    else if (type === 'penalty') taker = team.players.filter((p) => p.role === 'FWD').sort((a, c) => c.skill - a.skill)[0] || team.players[team.players.length - 1];
    else if (type === 'kickoff') taker = team.players.filter((p) => p.role === 'FWD').sort((a, c) => Math.abs(a.home.v) - Math.abs(c.home.v))[0] || team.players[1];
    else taker = team.players.filter((p) => !p.keeper).sort((a, c) => a.dist(at) - c.dist(at))[0];
    const behind = type === 'throwin' ? _v1.set(0, 0, Math.sign(at.z) * 0.5) : _v1.set(-team.dir * 0.6, 0, 0);
    if (type === 'corner') behind.set(team.dir * 0.5, 0, Math.sign(at.z) * 0.5);
    taker.pos.set(at.x + behind.x, 0, at.z + behind.z);
    if (type === 'throwin') taker.pos.z = Math.sign(at.z) * (P.HW + 0.3);
    taker.yaw = type === 'throwin' ? yawOf(0, -Math.sign(at.z)) : yawOf(team.goalX - taker.pos.x, -taker.pos.z * 0.3);
    if (type === 'corner') taker.yaw = yawOf(team.goalX * 0.85 - taker.pos.x, -taker.pos.z);
    if (type === 'kickoff') {
      const mate = team.players.filter((p) => p !== taker && !p.keeper).sort((a, c) => a.dist(at) - c.dist(at))[0];
      if (mate) { mate.pos.set(-team.dir * 2.5, 0, 3); }
    }
    if (type === 'penalty') {
      const gk = opp.keeper; gk.pos.set(opp.ownGoalX + opp.dir * 0.2, 0, 0); gk.yaw = yawOf(opp.dir, 0);
    }
    this.restart = { type, team, taker, at: at.clone(), t: 0, ready: false, ...extra };
    if (team.human) { team.controlled = taker; }
    if (opp.human && type !== 'penalty') opp.controlled = this.nearestTo(opp, at, true);
    this.emit('restart', { kind: type, team });
  }
  restartSpot(type, t, p, at, team) {
    const attacking = t === team, d = t.dir;
    if (this.mode === 'shootout') { // the rest wait in the centre circle, arm in arm
      const a = (p.i / 11) * Math.PI + (t.side ? Math.PI : 0);
      return _v2.set(Math.cos(a) * 6, 0, Math.sin(a) * 6 - 2);
    }
    if (p.keeper && type !== 'goalkick') return _v2.set(t.ownGoalX + d * 0.8, 0, 0);
    let u = p.home.u, v = p.home.v;
    if (type === 'kickoff') { u = Math.min(u * 0.82, 0.45); if (!attacking && u > 0.4) u = 0.4; }
    else if (type === 'corner') {
      if (attacking) {
        if (p.role === 'FWD' || (p.role === 'MID' && p.home.v === 0) || (p.role === 'DEF' && Math.abs(p.home.v) < 0.4 && Math.random() < 0.5)) return _v2.set(t.goalX - d * rand(6, 13), 0, rand(-9, 9));
        return _v2.set(t.goalX - d * rand(22, 32), 0, v * 22);
      }
      if (p.role === 'FWD' && p.home.v !== 0) return _v2.set(t.ownGoalX + d * 30, 0, v * 15);
      return _v2.set(t.ownGoalX + d * rand(4, 12), 0, rand(-10, 10));
    } else if (type === 'goalkick') {
      if (p.keeper) return _v2.set(at.x - d * 0.6, 0, at.z);
      u = attacking ? Math.max(0.24, u * 0.8 + 0.08) : Math.min(0.68, u + 0.1);
      if (!attacking && t.uOf(team.ownGoalX + team.dir * P.boxL) < u + 0.01) u = Math.min(u, t.uOf(team.ownGoalX + team.dir * (P.boxL + 1)));
    } else if (type === 'penalty') {
      // everyone outside the box and behind the ball
      const bx = team.goalX - team.dir * (P.boxL + 2);
      return _v2.set(bx - team.dir * rand(0, 8), 0, rand(-18, 18));
    } else {
      // throw-ins and free kicks: shape around the ball
      const bu = t.uOf(at.x), bv = at.z / P.HW;
      u = clamp(u * 0.6 + bu * 0.42 + (attacking ? 0.08 : -0.08), 0.06, 0.92); v = clamp(v * 0.85 + bv * 0.3, -0.95, 0.95);
    }
    const x = t.xOf(u), z = v * P.HW * 0.86;
    // nobody within 9.15 m of a free kick or kick-off but the taker's side
    if (!attacking && (type === 'freekick' || type === 'corner' || type === 'kickoff')) {
      const dx = x - at.x, dz = z - at.z, dd = Math.hypot(dx, dz);
      if (dd < 9.6) return _v2.set(at.x + (dx / (dd || 1)) * 9.6, 0, at.z + (dz / (dd || 1)) * 9.6);
    }
    return _v2.set(x, 0, z);
  }
  // the restart is taken: the ball is in play
  takeRestart() {
    const r = this.restart; if (!r) return;
    this.phase = 'play'; this.restart = null; this.phaseT = 0;
    if (r.type === 'kickoff' || r.type === 'penalty' || r.type === 'freekick') this.emit('whistle', { short: true });
    // after a goal kick the human plays on with an outfield player
    const t = r.team;
    if (t.human && t.controlled && t.controlled.keeper) this.setControlled(t, (this.pass && this.pass.to && !this.pass.to.keeper) ? this.pass.to : this.nearestTo(t, this.ball.pos, true));
  }

  /* ------------------------------------------------------------ helpers */
  nearestTo(team, at, outfield = false, exclude = null) {
    let best = null, bd = 1e9;
    for (const p of team.players) { if ((outfield && p.keeper) || p === exclude) continue; const d = p.dist(at); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  ownerTeam() { return this.ball.owner ? this.ball.owner.team : null; }
  inBox(team, pos, margin = 0) { // inside the box that team defends
    return team.dir * pos.x < -(P.HL - P.boxL) + margin && Math.abs(pos.z) < P.boxW + margin && Math.abs(pos.x) <= P.HL + 0.5;
  }
  giveBall(p) {
    const b = this.ball;
    if (b.owner !== p) {
      b.owner = p; this.lastTouch = p; this.lastTeam = p.team;
      if (this.pass && this.pass.team === p.team && p !== this.pass.from) { p.team.stats.passOk++; this.emit('received', { p }); }
      this.pass = null;
      if (p.team.human && !p.keeper) this.setControlled(p.team, p);
      this.emit('touch', { p });
    }
  }
  setControlled(team, p) { if (team.controlled !== p) { team.controlled = p; team.switchT = this.t; this.emit('switch', { p }); } }

  /* ------------------------------------------------------------ actions */
  /* start a kick: kind 'pass' | 'through' | 'shot' | 'lob' | 'cross' | 'clear' | 'throw'; to: target (V3); power 0..1 */
  startKick(p, kind, to, power = 0.6, o = {}) {
    if (p.state === 'kick' || p.state === 'down' || p.state === 'dive') return false;
    const shot = kind === 'shot', big = shot || kind === 'clear' || kind === 'lob' || kind === 'cross';
    const dur = kind === 'throw' ? 0.9 : big ? 0.44 : 0.3;
    p.state = 'kick'; p.t = 0;
    p.kick = { kind, to: to.clone(), power, dur, contact: kind === 'throw' ? 0.55 : big ? 0.21 : 0.14, done: false, o, receiver: o.receiver || null };
    p.act = { type: kind === 'pass' || kind === 'through' ? 'pass' : kind === 'shot' ? 'shot' : kind === 'throw' ? null : 'lob', u: 0, foot: 'Right', power };
    if (kind === 'throw' && p.body) p.body.play('throw', { from: 0.55, rate: 1.25, until: 1.45 });
    p.yaw = yawOf(to.x - p.pos.x, to.z - p.pos.z);
    return true;
  }
  /* the moment of contact */
  strike(p) {
    const k = p.kick, b = this.ball;
    if (b.owner && b.owner !== p) return;
    const reach = k.kind === 'throw' ? 1.6 : 1.25;
    if (!b.owner && p.dist(b.pos) > reach) return; // missed it
    if (b.owner === p && p.keeper) k.o.hands = true;
    if (k.kind === 'throw') {
      // released from above his head, just inside the touchline (a keeper's throw from his own spot)
      const dx = k.to.x - p.pos.x, dz = k.to.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
      b.pos.set(p.pos.x + (dx / l) * 0.45, 2.0, p.pos.z + (dz / l) * 0.45);
      if (!p.keeper) b.pos.z = clamp(b.pos.z, -P.HW + 0.15, P.HW - 0.15);
    } else if (b.owner === p && p.keeper && k.o.hands) b.pos.set(p.pos.x, 1.2, p.pos.z);
    else b.pos.y = P.ballR;
    const from = b.pos, D = this.D, hum = p.team.human;
    const err = (sd) => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15 * sd;
    let v;
    const to = k.to.clone();
    if (k.kind === 'shot') {
      const s = 16 + 16 * k.power;
      // accuracy: wider with power past 85% and with a defender close; the human's is a little better than the AI's
      const press = this.pressure(p), sd = (hum ? 0.05 : D.shot) * (0.55 + k.power * k.power) * (1 + press) / p.skill;
      const dist = p.dist(to);
      to.z += err(sd) * dist; to.y = clamp(to.y + err(sd * 0.8) * dist + (k.power > 0.88 ? (k.power - 0.88) * 9 : 0), 0.15, 4);
      v = kickVelocity(from, to, { kind: 'shot', speed: s });
      // finesse: a placed shot gets sidespin that bends it back in
      if (k.o.curl) { b.spin.set(0, k.o.curl, 0); }
      else b.spin.set(rand(-3, 3), rand(-4, 4), rand(-3, 3));
      p.team.stats.shots++;
      const onT = Math.abs(to.z) < P.goalW && to.y < P.goalH;
      this.shot = { p, team: p.team, t: this.t, onTarget: onT, speed: s };
      this.emit('shot', { p, speed: s });
    } else if (k.kind === 'pass' || k.kind === 'through') {
      const sd = (hum ? 0.022 : D.pass) / p.skill, dist = p.dist(to);
      to.x += err(sd) * dist * 0.5; to.z += err(sd) * dist;
      v = kickVelocity(from, to, { kind: 'ground', vEnd: k.kind === 'through' ? 3 : 5 });
      b.spin.set(0, 0, 0);
      p.team.stats.passes++;
      this.pass = { from: p, to: k.receiver, team: p.team, t: this.t, target: to };
      if (k.receiver && p.team.human && !k.o.noSwitch) this.setControlled(p.team, k.receiver);
    } else {
      // lofted: crosses, long balls, clearances, throw-ins
      const dist = p.dist(to), sd = (hum ? 0.03 : D.pass * 1.3) / p.skill;
      to.x += err(sd) * dist; to.z += err(sd) * dist;
      const T = k.kind === 'throw' ? clamp(0.35 + dist / 18, 0.55, 1.2) : k.kind === 'clear' ? clamp(1 + dist / 30, 1.4, 2.6) : clamp(0.6 + dist / 24, 0.9, 2.2);
      v = kickVelocity(from, to, { kind: 'loft', T });
      if (k.kind === 'throw') v.multiplyScalar(0.98);
      b.spin.set(rand(-2, 2), (k.kind === 'cross' ? 1 : 0) * rand(-6, 6), rand(-2, 2));
      p.team.stats.passes++;
      this.pass = { from: p, to: k.receiver, team: p.team, t: this.t, target: to, air: true };
      if (k.receiver && p.team.human && !k.o.noSwitch) this.setControlled(p.team, k.receiver);
    }
    b.owner = null; b.vel.copy(v); p.holding = false;
    this.lastTouch = p; this.lastTeam = p.team; p.cool = k.kind === 'throw' ? 0.6 : 0.32;
    if (k.receiver) { k.receiver.runTo = this.receivePoint(k.receiver, v); k.receiver.runT = 2.5; }
    k.done = true;
    this.emit('kick', { p, kind: k.kind, speed: v.length() });
  }
  // where a receiver should meet the ball: along its path, where he gets there first
  receivePoint(r, v) {
    const b = this.ball, sp = Math.hypot(v.x, v.z) || 1;
    let best = null;
    for (let t = 0.25; t < 3.5; t += 0.1) {
      const d = sp * t - 0.5 * 1.6 * t * t; if (d < 0) break;
      const x = b.pos.x + (v.x / sp) * d, z = b.pos.z + (v.z / sp) * d;
      if (r.dist(_v3.set(x, 0, z)) / (SPEED.run * r.pace) < t) { best = new V3(x, 0, z); break; }
    }
    return best || (this.pass && this.pass.target ? this.pass.target.clone() : b.pos.clone());
  }
  // how closely an opponent is pressing p (0 none, 1 on top of him)
  pressure(p) {
    let m = 0;
    for (const o of p.team.opp.players) { const d = p.dist(o.pos); if (d < 4) m = Math.max(m, 1 - d / 4); }
    return m;
  }
  tackle(p, slide) {
    if (p.busy || p.cool > 0) return false;
    p.state = slide ? 'slide' : 'tackle'; p.t = 0; p.tackled = false;
    p.act = { type: slide ? 'slide' : 'tackle', u: 0, foot: 'Right' };
    const b = this.ball;
    const tx = b.pos.x + b.vel.x * 0.15, tz = b.pos.z + b.vel.z * 0.15;
    p.yaw = yawOf(tx - p.pos.x, tz - p.pos.z);
    const sp = slide ? Math.max(7.4, Math.hypot(p.vel.x, p.vel.z) + 1.5) : 4.2;
    p.dir(_v1); p.vel.set(_v1.x * sp, 0, _v1.z * sp);
    if (slide) this.emit('slide', { p });
    return true;
  }

  /* ------------------------------------------------------------ the step */
  step(dt, input) {
    this.t += dt; this.phaseT += dt;
    const b = this.ball;
    if (this.phase === 'play' || this.phase === 'restart') {
      if (this.mode === 'match' && this.phase === 'play') this.clock += dt;
    }
    // possession clock
    const ot = this.ownerTeam() || this.lastTeam;
    if (ot && this.phase === 'play') ot.stats.poss += dt;

    // decisions
    if (this.human) this.applyHuman(this.human, input, dt);
    for (const p of this.all) {
      if (p.cool > 0) p.cool -= dt;
      if (p.team.human && p === p.team.controlled && this.phase !== 'restart') continue;
      if (p.keeper) thinkKeeper(this, p, dt); else think(this, p, dt);
    }
    if (this.phase === 'restart') this.updateRestart(dt, input);
    // movement and actions
    for (const p of this.all) this.movePlayer(p, dt);
    this.separate();
    // the ball
    if (b.owner) this.dribble(b.owner, dt);
    else if (!(this.phase === 'restart')) b.step(dt);
    if (this.phase === 'play' || this.phase === 'goal' || this.phase === 'dead') this.contacts(dt);
    for (const e of b.events) { this.emit(e.type, e); if (e.type === 'net' && this.phase === 'goal') this.emit('netbulge', e); }
    b.events.length = 0;
    if (this.phase === 'play') this.rules();
    this.updatePhase(dt);
  }

  applyHuman(team, input, dt) {
    const p = team.controlled; if (!p) return;
    const b = this.ball;
    // switching to the teammate best placed to win the ball
    if (input.switch && this.phase === 'play' && b.owner !== p) {
      const cand = team.players.filter((q) => !q.keeper && q !== p).sort((a, c) => a.dist(b.pos) - c.dist(b.pos))[0];
      if (cand) this.setControlled(team, cand);
      input.switch = false;
    }
    // automatic switching when the ball goes to the other side, or runs loose nearer someone else
    if (this.phase === 'play' && b.owner !== p && this.t - (team.switchT || 0) > 0.9 && !input.moving) {
      const near = this.nearestTo(team, b.pos, true);
      if (near && near !== p && near.dist(b.pos) + 6 < p.dist(b.pos)) this.setControlled(team, near);
    }
    if (this.phase === 'restart') return;
    const mv = input.move; // world direction, length 0..1
    const has = b.owner === p;
    p.sprint = !!input.sprint;
    const top = (has ? (p.sprint ? SPEED.ballSprint : SPEED.ballRun) : (p.sprint ? SPEED.sprint : SPEED.run)) * p.pace;
    if (!p.busy) p.want.set(mv.x * top, 0, mv.z * top);
    p.face = null;
    // actions
    if (has && !p.busy) {
      if (input.passTap) this.humanPass(p, mv, false);
      else if (input.throughTap) this.humanPass(p, mv, true);
      else if (input.shotRelease !== null && input.shotRelease !== undefined) this.humanShot(p, mv, input.shotRelease);
      else if (input.lobTap) this.humanCross(p, mv);
    } else if (!has && !p.busy) {
      if (input.tackleTap) {
        const own = b.owner, d = p.dist(b.pos);
        const slide = input.sprint || (d > 2.4 && d < 7);
        if (own && own.team !== team && d < 2.6 && !slide) this.tackle(p, false);
        else if (d < 7.5) this.tackle(p, slide || d > 2.6);
        else this.tackle(p, false);
      }
      // a loose ball in reach: the pass and shoot buttons strike it first time
      if (!b.owner && p.dist(b.pos) < 1.3 && b.pos.y < 1.0) {
        if (input.shotRelease !== null && input.shotRelease !== undefined) this.humanShot(p, mv, input.shotRelease);
        else if (input.passTap) this.humanPass(p, mv, false);
      }
    }
  }
  // the teammate in the direction pushed (or the way he faces), the best placed one
  passTarget(p, dirv, through) {
    const team = p.team, me = p.pos;
    const d = _v1.copy(dirv); if (d.lengthSq() < 0.05) p.dir(d); d.y = 0; d.normalize();
    let best = null, bs = -1e9;
    for (const q of team.players) {
      if (q === p || (q.keeper && !through && Math.random() < 0.99 && d.x * team.dir > -0.6)) continue;
      const dx = q.pos.x - me.x, dz = q.pos.z - me.z, dist = Math.hypot(dx, dz); if (dist < 2) continue;
      const cos = (dx * d.x + dz * d.z) / dist;
      if (cos < 0.25) continue;
      const lane = this.laneOpen(me, q.pos, team.opp);
      const s = cos * 3 - dist / 35 + lane * 0.8 + (through && q.role === 'FWD' ? 0.6 : 0);
      if (s > bs) { bs = s; best = q; }
    }
    return best;
  }
  // how open a passing lane is: 0 blocked, 1 clear
  laneOpen(a, c, opp) {
    let m = 6;
    const dx = c.x - a.x, dz = c.z - a.z, l2 = dx * dx + dz * dz || 1;
    for (const o of opp.players) {
      const t = clamp(((o.pos.x - a.x) * dx + (o.pos.z - a.z) * dz) / l2, 0, 1);
      const d = Math.hypot(a.x + dx * t - o.pos.x, a.z + dz * t - o.pos.z) - t * 1.5;
      m = Math.min(m, d);
    }
    return clamp(m / 4, 0, 1);
  }
  humanPass(p, mv, through) {
    const q = this.passTarget(p, mv, through);
    if (!q) {
      // nobody that way: play it into space
      const d = _v1.copy(mv); if (d.lengthSq() < 0.05) p.dir(d); d.normalize();
      return this.startKick(p, 'pass', _v2.set(p.pos.x + d.x * 14, 0, p.pos.z + d.z * 14), 0.5);
    }
    if (through) {
      // into the space ahead of him, toward goal
      const ahead = _v2.set(q.team.dir, 0, 0).multiplyScalar(0.75).addScaledVector(q.vel.lengthSq() > 1 ? _v3.copy(q.vel).normalize() : _v3.set(0, 0, 0), 0.25).normalize();
      const lead = clamp(p.dist(q.pos) * 0.32, 5, 12);
      const to = _v4.set(q.pos.x + ahead.x * lead, 0, clamp(q.pos.z + ahead.z * lead, -P.HW + 2, P.HW - 2));
      to.x = clamp(to.x, -P.HL + 2, P.HL - 2);
      const long = p.dist(to) > 32 || this.laneOpen(p.pos, to, p.team.opp) < 0.3;
      return this.startKick(p, long ? 'lob' : 'through', to, 0.6, { receiver: q });
    }
    // to his feet, leading him if he's running
    const dist = p.dist(q.pos), t = rollTime(groundSpeed(dist, 5), dist);
    const to = _v2.set(q.pos.x + q.vel.x * t * 0.7, 0, q.pos.z + q.vel.z * t * 0.7);
    const air = dist > 38 || this.laneOpen(p.pos, q.pos, p.team.opp) < 0.15;
    return this.startKick(p, air ? 'lob' : 'pass', to, 0.5, { receiver: q });
  }
  humanCross(p, mv) {
    const team = p.team, gx = team.goalX;
    const to = _v2.set(gx - team.dir * rand(7, 11), 0, rand(-4, 4));
    const q = team.players.filter((x) => x !== p && !x.keeper).sort((a, c) => a.dist(to) - c.dist(to))[0];
    if (q) to.set(q.pos.x * 0.4 + to.x * 0.6, 0, q.pos.z * 0.4 + to.z * 0.6);
    return this.startKick(p, 'cross', to, 0.7, { receiver: q });
  }
  humanShot(p, mv, power) {
    const team = p.team, gx = team.goalX, gk = team.opp.keeper;
    // aim: the side pushed, else away from the keeper
    let side;
    const lateral = mv.z * -team.dir; // push "left" (as he looks at goal) or right
    if (Math.abs(mv.z) > 0.35) side = Math.sign(mv.z);
    else side = gk && gk.pos.z > p.pos.z * 0.15 ? -1 : 1;
    void lateral;
    const z = side * (P.goalW - 0.55) * (Math.abs(mv.z) > 0.35 ? 1 : 0.8);
    const y = 0.25 + power * 1.45;
    const curl = power < 0.55 ? -side * team.dir * 9 : 0;
    const ok = this.startKick(p, 'shot', _v2.set(gx, y, z), power, { curl });
    return ok;
  }

  /* the restart in progress: the AI taker takes it after a beat; the human presses a button */
  updateRestart(dt, input) {
    const r = this.restart; if (!r) return;
    r.t += dt;
    const tk = r.taker;
    tk.want.set(0, 0, 0);
    // everyone else holds the spot they were put in (a little shuffling)
    for (const p of this.all) if (p !== tk) { p.want.set(0, 0, 0); p.face = this.ball.pos; }
    // the human's button press is kept until the restart can be taken (half a second after the cut)
    if (r.team.human && !r.taken) {
      const rel = input.shotRelease !== null && input.shotRelease !== undefined;
      const tap = input.passTap ? 'pass' : input.throughTap ? 'through' : input.lobTap ? 'lob' : rel ? 'shot' : null;
      if (tap && !r.intent) r.intent = { tap, mv: input.move.clone(), power: rel ? input.shotRelease : 0.6 };
    }
    if (r.t < (r.team.human ? 0.5 : 0.9)) return;
    if (r.type === 'penalty' && !r.team.human) {
      if (r.t > 1.6 && !tk.busy && !r.taken) { r.taken = true; restartChoice(this, r); }
    } else if (r.team.human) {
      const it = r.intent;
      if (it && !r.taken) {
        r.intent = null;
        const mv = it.mv.lengthSq() > 0.05 ? it.mv : input.move;
        if (r.type === 'throwin') {
          const q = this.passTarget(tk, mv.lengthSq() > 0.05 ? mv : _v1.set(r.team.dir * 0.6, 0, -Math.sign(r.at.z)), false) || this.nearestTo(r.team, tk.pos, true, tk);
          r.taken = true; this.startKick(tk, 'throw', q ? q.pos : _v1.set(tk.pos.x + r.team.dir * 8, 0, tk.pos.z - Math.sign(r.at.z) * 8), 0.5, { receiver: q });
        } else if (r.type === 'penalty') {
          if (it.tap === 'shot') { r.taken = true; this.penaltyKick = true; this.humanShot(tk, mv, it.power); }
        } else if (it.tap === 'pass') { r.taken = true; this.humanPass(tk, mv.lengthSq() > 0.05 ? mv : _v1.set(r.team.dir, 0, 0), false) || this.startKick(tk, 'pass', _v2.set(tk.pos.x + r.team.dir * 12, 0, tk.pos.z), 0.5); }
        else if (it.tap === 'through') { r.taken = true; this.humanPass(tk, mv.lengthSq() > 0.05 ? mv : _v1.set(r.team.dir, 0, 0), true); }
        else if (it.tap === 'lob' || (r.type === 'corner' && it.tap === 'shot')) { r.taken = true; this.humanCross(tk, mv); }
        else if (it.tap === 'shot') { r.taken = true; this.humanShot(tk, mv, it.power); }
      }
    } else if (r.t > 1.4 && !r.taken) { r.taken = true; restartChoice(this, r); }
    if (r.taken && tk.kick && tk.kick.done) this.takeRestart();
    // a kick that never reached the ball: set him at it again and retake
    else if (r.taken && !tk.kick && tk.state === 'move') { r.taken = false; r.t = 0.6; tk.pos.set(this.ball.pos.x - r.team.dir * 0.6, 0, this.ball.pos.z); }
  }

  /* ------------------------------------------------------------ movement */
  movePlayer(p, dt) {
    p.t += dt;
    const b = this.ball;
    if (p.state === 'kick') {
      const k = p.kick; const u = p.t / k.dur;
      p.act.u = u;
      if (!k.done && p.t >= k.contact) this.strike(p);
      p.vel.multiplyScalar(Math.exp(-6 * dt));
      if (p.t >= k.dur) { p.state = 'move'; p.act = null; p.kick = null; }
    } else if (p.state === 'tackle' || p.state === 'slide') {
      const slide = p.state === 'slide', dur = slide ? 0.95 : 0.5;
      p.act.u = p.t / dur;
      p.vel.multiplyScalar(Math.exp(-(slide ? 2.6 : 5) * dt));
      if (!p.tackled && p.t > (slide ? 0.08 : 0.12) && p.t < (slide ? 0.62 : 0.34)) this.tackleContact(p, slide);
      if (p.t >= dur) { p.state = slide ? 'down' : 'move'; p.t = 0; p.act = null; p.downT = slide ? 0.35 : 0; if (!slide) p.cool = p.tackled ? 0.2 : 0.55; }
    } else if (p.state === 'down') {
      p.vel.multiplyScalar(Math.exp(-6 * dt));
      if (p.t >= (p.downT || 1)) { p.state = 'move'; p.cool = 0.3; }
    } else if (p.state === 'dive') {
      // keeper dive: along the planned line
      const d = p.diveV; p.vel.set(d.x, 0, d.z); p.diveV.multiplyScalar(Math.exp(-1.8 * dt));
      if (p.t >= p.diveDur) { p.state = 'down'; p.t = 0; p.downT = 0.55; p.vel.set(0, 0, 0); }
    } else if (p.state === 'hold') {
      p.vel.multiplyScalar(Math.exp(-6 * dt));
    } else if (p.state === 'celebrate') {
      p.vel.lerp(p.want, 1 - Math.exp(-3 * dt));
    } else {
      // steering: accelerate toward the wanted velocity
      const acc = (b.owner === p ? 9 : 11) * dt, dv = _v1.subVectors(p.want, p.vel); dv.y = 0;
      const l = dv.length(); if (l > acc) dv.multiplyScalar(acc / l);
      p.vel.add(dv);
    }
    p.pos.addScaledVector(p.vel, dt); p.pos.y = 0;
    // stay on the playing area (the keepers may stand on the line)
    p.pos.x = clamp(p.pos.x, -P.HL - 2.5, P.HL + 2.5); p.pos.z = clamp(p.pos.z, -P.HW - 2.5, P.HW + 2.5);
    // facing: the way he moves, or a point he watches (keepers, defenders jockeying, waiting at a restart)
    const sp = Math.hypot(p.vel.x, p.vel.z);
    let yawT = p.yaw;
    if (p.state === 'move' || p.state === 'celebrate') {
      if (p.face && (sp < 4.5 || p.keeper)) yawT = yawOf(p.face.x - p.pos.x, p.face.z - p.pos.z);
      else if (sp > 0.4) yawT = yawOf(p.vel.x, p.vel.z);
      const rate = b.owner === p ? 7 : 10;
      const dy = clamp(angDiff(p.yaw, yawT), -rate * dt, rate * dt);
      p.yawRate = dy / dt; p.yaw += dy;
    } else p.yawRate = 0;
    // for the animation: how much of the motion is sideways or backward to the way he faces
    if (sp > 0.3) {
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), fwd = (p.vel.x * fx + p.vel.z * fz) / sp, side = (p.vel.x * fz - p.vel.z * fx) / sp;
      p.lateral = fwd < -0.3 ? (side >= 0 ? 1 : -1) : clamp(side * 1.6, -1, 1) * (fwd < 0.7 ? 1 : 0.4);
    } else p.lateral = 0;
    p.lean = clamp(-p.yawRate * sp * 0.012, -0.22, 0.22);
  }
  separate() {
    const A = this.all;
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
      const a = A[i], c = A[j], dx = c.pos.x - a.pos.x, dz = c.pos.z - a.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 0.5 && d2 > 1e-6) {
        const d = Math.sqrt(d2), push = (0.71 - d) * 0.5, nx = dx / d, nz = dz / d;
        if (a.state === 'slide' || c.state === 'slide') continue;
        a.pos.x -= nx * push; a.pos.z -= nz * push; c.pos.x += nx * push; c.pos.z += nz * push;
      }
    }
  }
  /* the dribble: the ball kept a stride ahead with touches in time with his running */
  dribble(p, dt) {
    const b = this.ball;
    if (p.state === 'hold' || (p.keeper && p.holding)) { // in the keeper's hands
      p.dir(_v1); b.pos.set(p.pos.x + _v1.x * 0.32, 1.1, p.pos.z + _v1.z * 0.32); b.vel.set(0, 0, 0); b.spin.set(0, 0, 0); b.prev.copy(b.pos); return;
    }
    const sp = Math.hypot(p.vel.x, p.vel.z);
    p.stride = (p.stride || 0) + sp * dt;
    const touch = Math.max(0, Math.sin((p.stride / 2.3) * Math.PI * 2)) * Math.min(1, sp / 5) * 0.32;
    const ahead = 0.46 + sp * 0.07 + touch;
    p.dir(_v1);
    const tx = p.pos.x + _v1.x * ahead, tz = p.pos.z + _v1.z * ahead;
    const k = p.state === 'kick' ? 14 : 9;
    b.prev.copy(b.pos);
    b.vel.set(p.vel.x + (tx - b.pos.x) * k, 0, p.vel.z + (tz - b.pos.z) * k);
    b.pos.x += b.vel.x * dt; b.pos.z += b.vel.z * dt; b.pos.y = P.ballR;
    b.spin.set(b.vel.z / b.r, 0, -b.vel.x / b.r);
    // a ball dribbled over the line goes out
    if (Math.abs(b.pos.z) > P.HW + 0.2 || Math.abs(b.pos.x) > P.HL + 0.2) { b.owner = null; }
  }

  /* ------------------------------------------------------------ contacts: winning the ball, tackles, saves */
  contacts(dt) {
    const b = this.ball;
    if (b.owner) return;
    const bs = b.speed();
    let best = null, bd = 1e9;
    for (const p of this.all) {
      const diving = p.keeper && p.state === 'dive';
      if (p.cool > 0 || p.state === 'down' || p.state === 'kick' || (p.state === 'dive' && !diving) || p.state === 'celebrate' || p.state === 'hold') continue;
      if (this.phase !== 'play') continue;
      p.dir(_v1);
      const fx = p.pos.x + _v1.x * 0.3, fz = p.pos.z + _v1.z * 0.3;
      const d = Math.hypot(b.pos.x - fx, b.pos.z - fz);
      const hands = p.keeper && this.inBox(p.team, p.pos, 1);
      const reachH = hands ? (diving ? 2.3 : 2.45) : 2.05; // feet, thigh, chest or head
      const reach = hands ? (diving ? 1.35 : 1.0) : 0.72;
      if (d < reach && b.pos.y < reachH && d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    const p = best, intended = this.pass && this.pass.to === p;
    const rel = Math.hypot(b.vel.x - p.vel.x, b.vel.z - p.vel.z) + Math.abs(b.vel.y) * 0.6;
    if (p.keeper && this.inBox(p.team, p.pos, 1)) {
      // a keeper gathers what he gets to; a shot may beat him (pace, and how far he had to go), be parried, or held
      const shot = this.shot && this.shot.team !== p.team && this.t - this.shot.t < 2.5;
      if (shot && rel > 11) {
        const skill = p.team.human ? 0.8 : this.D.keep;
        const chance = clamp(skill * (1.5 - rel / 44) * (p.state === 'dive' ? 0.95 : 1.08), 0.15, 0.97);
        p.cool = 0.5;
        if (Math.random() > chance) { this.emit('beaten', { p }); return; }
        if (rel < 21 && Math.random() < 0.5) this.keeperGather(p); else this.parry(p);
        return;
      }
      this.keeperGather(p); return;
    }
    // in the air: a header at goal from a cross in the box, a header on, or chest and thigh control
    const t = p.team, attackBox = this.inBox(t.opp, p.pos, 1);
    if (b.pos.y > 1.25) {
      if (attackBox && this.pass && this.pass.team === t && this.pass.air && b.pos.y < 2.3 && p.state === 'move') return this.header(p, true);
      if (rel > 15 || b.pos.y > 1.75) return this.header(p, false);
    }
    // a hard-hit ball can bounce off a player rather than be controlled
    const limit = intended ? 22 : 14 + p.skill * 2;
    if (rel > limit && Math.random() < 0.8) { this.deflect(p); return; }
    this.giveBall(p);
  }
  // a header: at goal (a corner of it, the keeper's far side) or on toward a teammate / away from danger
  header(p, atGoal) {
    const b = this.ball, t = p.team;
    p.act = { type: 'jump', u: 0 }; p.state = 'kick'; p.t = 0; p.kick = { kind: 'header', to: b.pos.clone(), power: 0.5, dur: 0.45, contact: 99, done: true, o: {} };
    let v;
    if (atGoal) {
      const gk = t.opp.keeper, side = gk.pos.z > 0 ? -1 : 1;
      const aim = new V3(t.goalX, rand(0.2, 1.4), side * rand(1.2, P.goalW - 0.35));
      const d = Math.hypot(aim.x - b.pos.x, aim.z - b.pos.z), s = rand(12, 17);
      const sd = (t.human ? 0.06 : this.D.shot * 1.1) / p.skill;
      aim.z += (Math.random() - 0.5) * 2 * sd * d;
      v = new V3((aim.x - b.pos.x) / d * s, (aim.y - b.pos.y) / (d / s) - 0.5 * 9.81 * (d / s) * 0.1, (aim.z - b.pos.z) / d * s);
      t.stats.shots++;
      this.shot = { p, team: t, t: this.t, onTarget: Math.abs(aim.z) < P.goalW && aim.y < P.goalH, speed: s };
      this.emit('shot', { p, speed: s, header: true });
    } else {
      // defenders head it away upfield; attackers knock it on toward goal
      const up = t.dir, a = rand(-0.6, 0.6);
      const s = clamp(b.speed() * 0.45 + 4, 6, 12);
      v = new V3(Math.cos(a) * up * s, rand(2, 4.5), Math.sin(a) * s);
      this.emit('headed', { p });
    }
    b.vel.copy(v); b.spin.set(0, 0, 0);
    this.lastTouch = p; this.lastTeam = t; p.cool = 0.35; this.pass = null;
    this.emit('kick', { p, kind: 'header', speed: v.length() });
  }
  deflect(p, high) {
    const b = this.ball;
    p.dir(_v1);
    const n = _v2.set(b.pos.x - p.pos.x, 0, b.pos.z - p.pos.z).normalize();
    const vn = b.vel.dot(n);
    if (vn < 0) b.vel.addScaledVector(n, -vn * 1.4);
    b.vel.multiplyScalar(high ? 0.45 : 0.35); b.vel.x += rand(-1, 1); b.vel.z += rand(-1, 1);
    if (high) b.vel.y = Math.abs(b.vel.y) * 0.3 + 1;
    b.pos.addScaledVector(n, 0.2);
    this.lastTouch = p; this.lastTeam = p.team; p.cool = 0.25; this.pass = null;
    this.emit('deflect', { p });
  }
  keeperGather(p) {
    const b = this.ball;
    this.giveBall(p); p.holding = true; p.state = 'hold'; p.t = 0; p.holdT = rand(1.1, 2.0);
    if (p.body) p.body.play(b.pos.y > 1.5 ? 'high' : 'take', { from: 0.25, rate: 1.4, until: 1.1 });
    if (this.shot && this.shot.team !== p.team && this.t - this.shot.t < 2.5) { this.emit('save', { p, caught: true }); this.shot = null; }
  }
  parry(p) {
    const b = this.ball;
    const out = _v1.set(p.team.dir, 0, Math.sign(b.pos.z || rand(-1, 1)) * rand(0.6, 1.2)).normalize();
    const sp = b.speed() * rand(0.25, 0.45);
    b.vel.set(out.x * sp, rand(1, 4), out.z * sp);
    this.lastTouch = p; this.lastTeam = p.team; p.cool = 0.6; this.pass = null;
    if (this.shot && this.shot.team !== p.team) { this.emit('save', { p, caught: false }); this.shot = null; }
  }
  tackleContact(p, slide) {
    const b = this.ball, own = b.owner;
    p.dir(_v1);
    const fx = p.pos.x + _v1.x * (slide ? 0.95 : 0.8), fz = p.pos.z + _v1.z * (slide ? 0.95 : 0.8);
    const dBall = Math.hypot(b.pos.x - fx, b.pos.z - fz);
    if (own && own.team === p.team) return;
    if (dBall < (slide ? 0.85 : 0.75) && b.pos.y < 0.8) {
      p.tackled = true;
      const D = this.D;
      // a standing tackle can be shrugged off by a skilful dribbler; a slide that reaches the ball wins it
      const pWin = slide ? 0.9 : (p.team.human ? 0.7 : D.tackle) * (own ? 1.1 / own.skill : 1);
      if (Math.random() < pWin) {
        if (own) { own.state = Math.random() < 0.35 ? 'down' : own.state; if (own.state === 'down') { own.t = 0; own.downT = 0.7; if (own.body) own.body.play('dive', { from: 0.75, rate: 1.6, until: 1.6, mirror: Math.random() < 0.5 ? 1 : -1 }); } }
        p.team.stats.tackles++;
        if (!slide && Math.random() < 0.55) { b.owner = null; this.giveBall(p); }
        else {
          b.owner = null; this.lastTouch = p; this.lastTeam = p.team; this.pass = null;
          b.vel.set(_v1.x * rand(4, 8) + rand(-1.5, 1.5), 0.3, _v1.z * rand(4, 8) + rand(-1.5, 1.5)); p.cool = 0.15;
        }
        this.emit('tackle', { p, won: true });
      } else this.emit('tackle', { p, won: false });
      return;
    }
    // missed the ball and took the man: a foul
    if (own && p.dist(own.pos) < (slide ? 1.0 : 0.75)) {
      p.tackled = true;
      own.state = 'down'; own.t = 0; own.downT = 1.2; own.vel.multiplyScalar(0.3);
      if (own.body) own.body.play('dive', { from: 0.7, rate: 1.5, until: 2.2, mirror: Math.random() < 0.5 ? 1 : -1 });
      p.team.stats.fouls++;
      this.emit('foul', { p, on: own });
      const pen = this.inBox(p.team, own.pos);
      this.dead(pen ? 'penalty' : 'freekick', own.team, own.pos.clone(), 1.3);
    }
  }

  /* ------------------------------------------------------------ the laws */
  rules() {
    const b = this.ball, r = b.r;
    if (this.mode === 'shootout') {
      const crossed = Math.abs(b.pos.x) > P.HL + r && Math.abs(b.prev.x) <= P.HL + r + 0.5;
      if (crossed && Math.abs(b.pos.z) < P.goalW && b.pos.y < P.goalH) { const t = this.lastPen.team; t.score++; this.goalFor(t); this.penResult(true); return; }
      const held = b.owner && b.owner.keeper, slow = this.phaseT > 1.2 && b.speed() < 0.8, out = Math.abs(b.pos.x) > P.HL + r || Math.abs(b.pos.z) > P.HW;
      if (held || slow || out || this.phaseT > 4.5 || (b.vel.x < -1 && this.phaseT > 0.6)) { this.emit(held ? 'pensave' : 'penmiss'); this.penResult(false); }
      return;
    }
    if (this.mode === 'practice') {
      if (Math.abs(b.pos.x) > P.HL + r || Math.abs(b.pos.z) > P.HW + r) {
        const s = Math.sign(b.pos.x), goal = Math.abs(b.prev.x) <= P.HL + r + 0.4 && Math.abs(b.pos.z) < P.goalW && b.pos.y < P.goalH && Math.abs(b.pos.x) > P.HL + r;
        if (goal && s === this.teams[0].dir) { this.teams[0].score++; this.goalFor(this.teams[0]); }
        else { this.phase = 'dead'; this.phaseT = 0; this.after = { practice: true, wait: 1.2 }; this.emit('out'); }
      }
      return;
    }
    // a goal: the whole ball over the line between the posts, under the bar
    if (Math.abs(b.pos.x) > P.HL + r && Math.abs(b.prev.x) <= P.HL + r + 0.5) {
      const s = Math.sign(b.pos.x);
      if (Math.abs(b.pos.z) < P.goalW && b.pos.y < P.goalH) {
        const scorer = this.teams.find((t) => t.dir === s);
        scorer.score++;
        this.goalFor(scorer);
        return;
      }
      // over the goal line: a goal kick or a corner
      const def = this.teams.find((t) => t.dir === -s); // the team defending that end
      if (this.lastTeam === def) { def.opp.stats.corners++; this.dead('corner', def.opp, b.pos.clone()); }
      else this.dead('goalkick', def, b.pos.clone());
      this.emit('out', { kind: this.lastTeam === def ? 'corner' : 'goalkick' });
      return;
    }
    if (Math.abs(b.pos.z) > P.HW + r) {
      const to = this.lastTeam ? this.lastTeam.opp : this.teams[0];
      this.dead('throwin', to, b.pos.clone());
      this.emit('out', { kind: 'throwin' });
    }
  }
  goalFor(team) {
    if (this.mode === 'shootout') { this.emit('goal', { team, scorer: this.lastTouch, shootout: true }); return; }
    const scorer = this.lastTouch && this.lastTouch.team === team ? this.lastTouch : null;
    const own = this.lastTouch && this.lastTouch.team !== team;
    if (this.shot && this.shot.team === team) team.stats.onTarget++;
    this.phase = 'goal'; this.phaseT = 0; this.shot = null; this.pass = null;
    this.goalInfo = { team, scorer: scorer || (own ? this.lastTouch : null), own, clock: this.clock };
    this.emit('goal', this.goalInfo);
    // the scorer wheels away; his teammates go to him
    const s = scorer || this.nearestTo(team, this.ball.pos, true);
    if (s) {
      s.state = 'celebrate'; s.t = 0;
      const corner = _v1.set(team.goalX * 0.75, 0, Math.sign(s.pos.z || 1) * P.HW * 0.8);
      s.want.set(corner.x - s.pos.x, 0, corner.z - s.pos.z).normalize().multiplyScalar(6.5);
      this.celebrant = s;
    }
    if (this.shot === null) { /* counted */ }
  }
  // the ball is dead: a short pause, then the restart
  dead(kind, team, at, wait = 1.1) {
    if (this.phase !== 'play') return;
    this.phase = 'dead'; this.phaseT = 0; this.after = { kind, team, at, wait };
    this.pass = null;
    if (kind === 'freekick' || kind === 'penalty') this.emit('whistle', { foul: true });
  }
  updatePhase(dt) {
    if (this.phase === 'dead' && this.after && this.after.shootout) {
      if (this.phaseT > this.after.wait) {
        if (this.after.over) { this.phase = 'fulltime'; this.phaseT = 0; this.emit('fulltime'); for (const p of this.all) { p.state = 'move'; p.act = null; p.want.set(0, 0, 0); } }
        else { this.emit('fade'); this.nextPen(); }
      }
      return;
    }
    if (this.phase === 'dead' && this.phaseT > this.after.wait) {
      if (this.after.practice) { this.emit('fade'); this.practiceReset(); return; }
      this.emit('fade');
      if (this.after.kind === 'penalty') this.setRestart('penalty', this.after.team);
      else this.setRestart(this.after.kind, this.after.team, this.after.at);
    }
    if (this.phase === 'goal') {
      // the celebration
      const c = this.celebrant;
      if (c) {
        if (this.phaseT > 1.6 && c.state === 'celebrate') { c.want.set(0, 0, 0); if (c.body && !c.body.reacting) c.body.play('cheer', { rate: 1.1 }); }
        for (const p of c.team.players) if (p !== c && !p.keeper && p.state === 'move') {
          const d = p.dist(c.pos); if (d > 2) { p.want.set(c.pos.x - p.pos.x, 0, c.pos.z - p.pos.z).normalize().multiplyScalar(Math.min(6, d)); p.face = c.pos; }
          else p.want.set(0, 0, 0);
        }
      }
      if (this.phaseT > 4.2) {
        this.emit('fade');
        if (this.mode === 'practice') { this.practiceReset(); return; }
        if (this.checkTime(true)) return;
        this.setRestart('kickoff', this.goalInfo.team.opp);
      }
    }
    if (this.phase === 'play' && this.mode === 'match') this.checkTime(false);
    if (this.phase === 'halftime' && this.phaseT > 0.1 && this.resumeOK) {
      this.resumeOK = false;
      this.half = 2;
      for (const t of this.teams) t.dir = -t.dir;
      this.setRestart('kickoff', this.firstKickoff.opp);
      this.emit('secondhalf');
    }
  }
  checkTime(afterGoal) {
    const end = this.half === 1 ? this.halfLen : this.halfLen * 2;
    if (this.clock < end) return false;
    // wait for the ball to be in a neutral spot? no: the whistle goes as the time is up
    if (this.half === 1) { this.phase = 'halftime'; this.phaseT = 0; this.clock = this.halfLen; this.emit('halftime'); }
    else { this.phase = 'fulltime'; this.phaseT = 0; this.clock = this.halfLen * 2; this.emit('fulltime'); }
    this.ball.owner = null; this.ball.vel.multiplyScalar(0.2);
    for (const p of this.all) { p.state = 'move'; p.act = null; p.want.set(0, 0, 0); }
    void afterGoal;
    return true;
  }
  // the clock as the broadcast shows it (two 45-minute halves)
  get matchMinute() { return (this.clock / (this.halfLen * 2)) * 90; }
}
