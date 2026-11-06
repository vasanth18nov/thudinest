/* The players' decisions. Off the ball: hold a shape that shifts with the ball, chase a loose ball (the one who gets
   there first), press and cover the man on the ball, make runs and offer angles in attack. On the ball: shoot, pass,
   play a through ball, cross or dribble, weighed each moment. The keeper: his angle, reading shots, diving, coming
   off his line, and giving the ball back out. Set pieces: restartChoice. */
import { V3, P, clamp, rand, pick, yawOf, hyp } from './util.js';
import { SPEED } from './sim.js';

const _a = new V3(), _b = new V3(), _c = new V3();
const G = 9.81;

/* ---- the team picture, worked out once a step */
function ctx(M) {
  if (M._ctxT === M.t) return M._ctx;
  M._ctxT = M.t;
  const b = M.ball, own = b.owner, C = M._ctx || (M._ctx = { team: [{}, {}] });
  for (const t of M.teams) {
    const c = C.team[t.side];
    c.attacking = own ? own.team === t : (M.pass ? M.pass.team === t : M.lastTeam === t && b.groundSpeed() > 2);
    c.chaser = null; c.second = null; c.presser = null; c.cover = null; c.supports = [];
    if (!own) {
      // who reaches the loose ball first (ball path sampled ahead)
      let best = null, bt = 1e9, sec = null, st = 1e9;
      for (const p of t.players) {
        if (p.keeper && !M.inBox(t, b.pos, 2)) continue;
        if (p.state === 'down' || p.state === 'dive') continue;
        const ti = interceptTime(M, p);
        if (ti < bt) { sec = best; st = bt; best = p; bt = ti; } else if (ti < st) { sec = p; st = ti; }
      }
      c.chaser = best; c.chaseT = bt; c.second = sec;
    } else if (own.team !== t) {
      const by = t.players.filter((p) => !p.keeper && p.state !== 'down').sort((x, y) => x.dist(own.pos) - y.dist(own.pos));
      c.presser = by[0] || null; c.cover = by[1] || null;
    } else {
      // two teammates nearest the ball carrier offer him a pass
      c.supports = t.players.filter((p) => p !== own && !p.keeper).sort((x, y) => x.dist(own.pos) - y.dist(own.pos)).slice(0, 2);
    }
  }
  return C;
}
// how soon p can get to the ball, following its roll
function interceptTime(M, p) {
  const b = M.ball, sp = SPEED.sprint * p.pace * M.D.pace;
  let x = b.pos.x, z = b.pos.z, vx = b.vel.x, vz = b.vel.z, y = b.pos.y, vy = b.vel.y;
  for (let t = 0; t <= 3.2; t += 0.1) {
    if (t > 0) {
      const g = Math.hypot(vx, vz);
      if (y > 0.2 || vy > 0.5) { vy -= G * 0.1; y += vy * 0.1; if (y < 0.11) { y = 0.11; vy = Math.abs(vy) * 0.5; if (vy < 1) vy = 0; } }
      else if (g > 0) { const f = Math.max(0, g - (0.85 + 0.1 * g) * 0.1) / g; vx *= f; vz *= f; }
      x += vx * 0.1; z += vz * 0.1;
    }
    const d = hyp(x - p.pos.x, z - p.pos.z) - 0.6;
    if (d / sp + 0.12 <= t && y < 1.8) { p.icept = p.icept || new V3(); p.icept.set(x, 0, z); return t; }
  }
  p.icept = p.icept || new V3(); p.icept.set(x, 0, z);
  return 3.2 + hyp(x - p.pos.x, z - p.pos.z) / sp;
}

// the formation spot, shifted with the ball and the phase of play
function shapeSpot(M, p, attacking, out) {
  const t = p.team, b = M.ball;
  const bu = clamp(t.uOf(b.pos.x), 0, 1), bv = clamp(b.pos.z / P.HW, -1, 1);
  let u = p.home.u * 0.62 + bu * 0.48 - 0.08 + (attacking ? 0.07 : -0.05);
  let v = p.home.v * 0.86 + bv * 0.26;
  if (p.role === 'DEF') { u = clamp(u, 0.07, attacking ? 0.62 : Math.max(0.08, bu - 0.04)); }
  if (p.role === 'MID') u = clamp(u, 0.15, 0.82);
  if (p.role === 'FWD') u = clamp(u, attacking ? 0.5 : 0.36, 0.9);
  // a little drift, so the shape breathes
  u += Math.sin(M.t * 0.35 + p.id * 1.7) * 0.012; v += Math.cos(M.t * 0.3 + p.id) * 0.03;
  return out.set(t.xOf(clamp(u, 0.03, 0.97)), 0, clamp(v, -0.95, 0.95) * P.HW * 0.88);
}
// go to a point: run when far, ease in when close
function goTo(p, tgt, top, out = p.want) {
  const dx = tgt.x - p.pos.x, dz = tgt.z - p.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.25) return out.set(0, 0, 0);
  const s = Math.min(top, d * 1.6);
  return out.set((dx / d) * s, 0, (dz / d) * s);
}

/* ---- an outfield player */
export function think(M, p, dt) {
  const b = M.ball, D = M.D, t = p.team, pace = p.pace * D.pace;
  p.face = null; p.sprint = false;
  if (M.phase === 'restart') return; // updateRestart holds everyone
  if (M.mode === 'shootout') { p.want.set(0, 0, 0); p.face = b.pos; return; }
  if (M.phase !== 'play') {
    if (M.phase === 'goal' && M.celebrant && M.celebrant.team === t) return; // sim.js runs the celebration
    shapeSpot(M, p, false, _a); goTo(p, _a, SPEED.jog * 0.6); p.face = b.pos;
    if (M.phase === 'fulltime' || M.phase === 'halftime') p.want.multiplyScalar(0.4);
    return;
  }
  if (p.busy) return;
  const C = ctx(M), c = C.team[t.side], own = b.owner;
  if (own === p) return carrier(M, p, dt);
  // a pass on its way to him
  if (M.pass && M.pass.to === p && p.runTo) {
    p.runT -= dt;
    const d = p.dist(p.runTo);
    if (c.chaser === p || d < 1.5 || p.runT < 0) { /* meet it as the chaser */ } else { goTo(p, p.runTo, SPEED.sprint * pace); p.sprint = true; p.face = b.pos; return; }
  }
  if (!own) {
    if (c.chaser === p) {
      // get to the ball: sprint if the other side is close to it too
      const oc = C.team[t.opp.side];
      const race = oc.chaser && oc.chaseT < c.chaseT + 0.8;
      goTo(p, p.icept || b.pos, (race || c.chaseT > 1 ? SPEED.sprint : SPEED.run) * pace); p.sprint = race;
      // a loose ball near his own goal under pressure: hoof it clear first time
      if (p.dist(b.pos) < 1.2 && b.pos.y < 0.9 && race && t.uOf(b.pos.x) < 0.22 && Math.random() < 0.5) {
        M.startKick(p, 'clear', _a.set(t.xOf(0.62), 0, clamp(b.pos.z * 1.5, -P.HW + 4, P.HW - 4)), 0.9);
      }
      return;
    }
    if (c.second === p && p.dist(b.pos) < 18 * P.kp) { goTo(p, _a.lerpVectors(p.icept || b.pos, shapeSpot(M, p, c.attacking, _b), 0.45), SPEED.run * pace); return; }
    shapeSpot(M, p, c.attacking, _a); goTo(p, _a, p.dist(_a) > 7 * P.kp ? SPEED.run * pace : SPEED.jog * pace); p.face = b.pos;
    return;
  }
  if (own.team !== t) return defend(M, p, c, own, dt, pace);
  return support(M, p, c, own, dt, pace);
}

function defend(M, p, c, own, dt, pace) {
  const t = p.team, D = M.D, goal = _c.set(t.ownGoalX, 0, 0);
  if (c.presser === p) {
    // goal side of him, closing; jockey when near; tackle when the ball is there to be won
    const gd = _a.subVectors(goal, own.pos).setY(0).normalize();
    const d = p.dist(own.pos);
    const stand = d > 4 ? 1.4 : 0.9;
    _b.set(own.pos.x + gd.x * stand + own.vel.x * 0.25, 0, own.pos.z + gd.z * stand + own.vel.z * 0.25);
    goTo(p, _b, (d > 6 ? SPEED.sprint : d > 2.5 ? SPEED.run : SPEED.jog + 1) * pace); p.sprint = d > 6; p.face = own.pos;
    if (d < 1.8 && p.cool <= 0 && Math.random() < dt * (0.45 + D.tackle * 1.3)) M.tackle(p, false);
    else if (d > 1.8 && d < 3.4 && Math.hypot(own.vel.x, own.vel.z) > 5 && Math.random() < dt * D.tackle * 0.35) M.tackle(p, true);
    return;
  }
  if (c.cover === p) {
    const gd = _a.subVectors(goal, own.pos).setY(0).normalize();
    _b.set(own.pos.x + gd.x * 7 * P.kp, 0, own.pos.z + gd.z * 7 * P.kp);
    goTo(p, _b, SPEED.run * pace); p.face = own.pos; return;
  }
  // the rest: the shape, a little tighter, and in the way of a pass on its way
  if (M.pass && M.pass.team !== t && !M.ball.owner) { /* handled as loose ball */ }
  shapeSpot(M, p, false, _a);
  // narrow to the middle when the ball is in the box area
  if (M.inBox(t, M.ball.pos, 8 * P.k)) _a.z *= 0.6;
  goTo(p, _a, p.dist(_a) > 6 ? SPEED.run * pace : SPEED.jog * pace); p.face = M.ball.pos;
}

function support(M, p, c, own, dt, pace) {
  const t = p.team, d = t.dir;
  const k = c.supports.indexOf(p);
  if (k >= 0 && p.role !== 'FWD') {
    // an angle for a pass: ahead and to one side of the ball carrier, clear of opponents
    const side = k === 0 ? (p.pos.z > own.pos.z ? 1 : -1) : (p.pos.z > own.pos.z ? 1 : -1);
    _a.set(own.pos.x + d * 9 * P.kp, 0, own.pos.z + side * 11 * P.kp);
    _a.z = clamp(_a.z, -P.HW + 3 * P.kp, P.HW - 3 * P.kp); _a.x = clamp(_a.x, -P.HL + 3 * P.kp, P.HL - 3 * P.kp);
    goTo(p, _a, SPEED.run * pace); p.face = own.pos; return;
  }
  if (p.role === 'FWD') {
    // runs in behind: toward the gap, onto the shoulder of the last defender
    const deep = Math.min(...t.opp.players.filter((q) => !q.keeper).map((q) => t.uOf(q.pos.x)));
    const ownU = t.uOf(own.pos.x);
    let u = clamp(Math.max(deep + 0.015, ownU + 0.12), 0.5, 0.93);
    if ((M.t + p.id * 3) % 9 < 3) u = clamp(u + 0.06, 0.5, 0.95); // the run
    const v = clamp(p.home.v * 0.7 + own.pos.z / P.HW * 0.2, -0.8, 0.8);
    _a.set(t.xOf(u), 0, v * P.HW * 0.7);
    goTo(p, _a, (p.dist(_a) > 6 ? SPEED.sprint : SPEED.run) * pace); p.sprint = p.dist(_a) > 6; p.face = own.pos; return;
  }
  shapeSpot(M, p, true, _a);
  goTo(p, _a, p.dist(_a) > 6 ? SPEED.run * pace : SPEED.jog * pace); p.face = own.pos;
}

/* ---- on the ball */
function carrier(M, p, dt) {
  const t = p.team, opp = t.opp, D = M.D, b = M.ball, pace = p.pace * D.pace;
  const goal = _c.set(t.goalX, 0, 0), distG = p.dist(goal);
  p.thinkT -= dt;
  // dribble: toward goal, away from opponents in front, inside the touchlines
  const dir = _a.set(goal.x - p.pos.x, 0, (goal.z - p.pos.z) * (distG > 30 * P.k ? 0.35 : 1)).normalize();
  const R = 7 * Math.max(P.k, 0.6); // the radius he watches for opponents
  let space = 12 * P.kp;
  for (const o of opp.players) {
    const dx = o.pos.x - p.pos.x, dz = o.pos.z - p.pos.z, dd = Math.hypot(dx, dz);
    if (dd < R && dd > 0.01) {
      const front = (dx * dir.x + dz * dir.z) / dd;
      if (front > -0.2) { const w = (R - dd) / R * (0.6 + front); dir.x -= (dx / dd) * w * 0.9; dir.z -= (dz / dd) * w * 0.9; }
      if (front > 0.3) space = Math.min(space, dd);
    }
  }
  if (Math.abs(p.pos.z) > P.HW - 5 * P.kp) dir.z -= Math.sign(p.pos.z) * 0.6;
  if (t.dir * p.pos.x > P.HL - 3 * P.kp) dir.x -= t.dir * 0.8;
  dir.normalize();
  const sprint = space > 6 * P.kp && distG > 18 * P.k;
  const top = (sprint ? SPEED.ballSprint : SPEED.ballRun) * pace;
  p.want.set(dir.x * top, 0, dir.z * top); p.sprint = sprint;
  if (p.thinkT > 0 || p.busy) return;
  p.thinkT = D.think + rand(0, 0.18);
  const press = M.pressure(p);
  // the shot
  const ang = goalAngle(p.pos, t.goalX);
  const lane = M.laneOpen(p.pos, goal, opp);
  let shot = 0;
  const KS = Math.max(P.k, 0.42); // futsal shooting range, relative to the pitch, is a little longer
  if (distG < 32 * KS) shot = (1 - distG / (34 * KS)) * 1.7 * clamp(ang / 0.3, 0.25, 1) * (0.55 + 0.45 * lane) + (M.inBox(opp, p.pos) ? 0.35 : 0) + (distG < 13 * KS ? 0.5 : 0);
  // on the small court a shot is always on, so a futsal player waits for a clear sight of goal
  if (P.walls) shot *= (0.4 + 0.6 * lane) * (Math.random() < 0.42 ? 0 : 1); // and he doesn't shoot at every chance
  if (shot > (P.walls ? 0.4 + Math.random() * 0.3 : 0.22 + Math.random() * 0.2)) {
    const gk = opp.keeper, side = (gk.pos.z > 0 ? -1 : 1) * (Math.random() < 0.22 ? -1 : 1);
    const aim = _b.set(t.goalX, rand(0.25, 1.7), side * (P.goalW - rand(0.45, 1.0)));
    M.startKick(p, 'shot', aim, clamp(0.55 + distG / (45 * KS) + rand(-0.05, 0.12), 0.55, 0.96), { curl: Math.random() < 0.3 ? -side * t.dir * rand(5, 10) : 0 });
    return;
  }
  // the pass
  let best = null, bs = -1e9, through = false, bt = null;
  for (const q of t.players) {
    if (q === p) continue;
    if (q.keeper && press < 0.6) continue;
    const dist = p.dist(q.pos); if (dist < 5 * P.kp || dist > 45 * P.kp) continue;
    const prog = t.uOf(q.pos.x) - t.uOf(p.pos.x);
    let open = 8 * P.kp; for (const o of opp.players) open = Math.min(open, o.dist(q.pos));
    const ln = M.laneOpen(p.pos, q.pos, opp);
    let s = prog * 4.6 + (prog < 0 ? prog * 2.5 : 0) + (open / (8 * P.kp)) * 0.55 + ln * 0.9 - (dist > 28 * P.kp ? (dist - 28 * P.kp) / 14 : 0) - (q.keeper ? 0.8 : 0);
    if (ln < 0.3) s -= 1.6; // a lane with a man in it
    if (dist > 36 * P.kp && open < 6 * P.kp) s -= 1.2; // a long ball needs a free man
    if (s > bs) { bs = s; best = q; through = false; }
    // a through ball for a forward with space behind
    if ((q.role === 'FWD' || (q.role === 'MID' && q.vel.x * t.dir > 2)) && t.uOf(q.pos.x) > 0.55) {
      const ahead = _b.set(q.pos.x + t.dir * 9 * P.kp, 0, q.pos.z * 0.85);
      if (Math.abs(ahead.x) < P.HL - 3 * P.kp) {
        let sp = 10 * P.kp; for (const o of opp.players) if (!o.keeper) sp = Math.min(sp, o.dist(ahead));
        if (sp < 7 * P.kp || sp - q.dist(ahead) < 1.5) continue; // only when he gets there first
        const st = (t.uOf(ahead.x) - t.uOf(p.pos.x)) * 4.6 + (sp / (10 * P.kp)) * 0.8 + M.laneOpen(p.pos, ahead, opp) * 0.7 - (sp < 6 * P.kp ? 1.2 : 0.35);
        if (st > bs) { bs = st; best = q; through = true; bt = ahead.clone(); }
      }
    }
  }
  const dribble = clamp(space / (10 * P.kp), 0, 1) * 1.15 + 0.35 - press * 1.2;
  // a cross from wide in the last fifth
  if (!P.walls && t.uOf(p.pos.x) > 0.83 && Math.abs(p.pos.z) > P.boxW - 2 && (bs < 1.1 || Math.random() < 0.4)) {
    const runners = t.players.filter((q) => q !== p && !q.keeper && M.inBox(opp, q.pos, 4));
    const r = runners.length ? pick(runners) : null;
    const to = _b.set(t.goalX - t.dir * rand(6, 12), 0, r ? r.pos.z * 0.6 : rand(-4, 4));
    M.startKick(p, Math.random() < 0.35 ? 'pass' : 'cross', to, 0.7, { receiver: r }); return;
  }
  if (best && ((press > 0.55 && bs > 0.0) || bs > dribble + 0.3 || (bs > 1.3 && Math.random() < 0.3))) {
    if (through) M.startKick(p, p.dist(bt) > 36 * P.kp || M.laneOpen(p.pos, bt, opp) < 0.1 ? 'lob' : 'through', bt, 0.6, { receiver: best });
    else {
      const dist = p.dist(best.pos);
      const lead = _b.set(best.pos.x + best.vel.x * dist / 18, 0, best.pos.z + best.vel.z * dist / 18);
      M.startKick(p, dist > 36 * P.kp || M.laneOpen(p.pos, lead, opp) < 0.08 ? 'lob' : 'pass', lead, 0.5, { receiver: best });
    }
    return;
  }
  // under heavy pressure deep in his own half with nothing on: clear it
  if (press > 0.75 && t.uOf(p.pos.x) < 0.25 && Math.random() < 0.5) M.startKick(p, 'clear', _b.set(t.xOf(0.65), 0, clamp(p.pos.z * 1.4, -P.HW + 5, P.HW - 5)), 0.9);
}
// the angle the goal mouth fills from a point
function goalAngle(pos, gx) {
  const a1 = Math.atan2(P.goalW - pos.z, Math.abs(gx - pos.x)), a2 = Math.atan2(-P.goalW - pos.z, Math.abs(gx - pos.x));
  return Math.abs(a1 - a2);
}

/* ---- the keeper */
export function thinkKeeper(M, p, dt) {
  const t = p.team, b = M.ball, D = M.D, line = t.ownGoalX, fwd = t.dir;
  p.face = b.pos; p.sprint = false;
  const skill = t.human ? 0.8 : D.keep;
  if (p.state === 'hold') {
    p.holdT -= dt; p.want.set(0, 0, 0);
    if (M.phase !== 'play') return;
    if (p.holdT <= 0) {
      // give it out: a throw to a free defender, or a long kick upfield
      const opts = t.players.filter((q) => q !== p && q.dist(p.pos) < 32 * P.kp && q.dist(p.pos) > 8 * P.k && M.laneOpen(p.pos, q.pos, t.opp) > 0.45);
      p.holding = false;
      if (opts.length && Math.random() < 0.65) { const q = pick(opts); M.startKick(p, 'throw', q.pos, 0.5, { receiver: q, hands: true }); }
      else {
        const fw = t.players.filter((q) => q.role === 'FWD' || q.role === 'MID');
        const q = fw.length ? pick(fw) : null;
        M.startKick(p, 'clear', q ? q.pos : _a.set(t.xOf(0.6), 0, rand(-15, 15)), 0.9, { receiver: q, hands: true });
      }
    }
    return;
  }
  if (p.busy) return;
  if (M.phase === 'restart') return;
  if (M.phase !== 'play') { goTo(p, _a.set(line + fwd * 1, 0, 0), SPEED.jog); return; }
  // a shot (or any ball) heading for his goal: where it will cross the line, and when
  const vx = b.vel.x * -fwd; // speed toward his goal
  let threat = null;
  if (!b.owner && vx > 4) {
    const tc = (Math.abs(line - b.pos.x) - 0.2) / vx;
    if (tc > 0 && tc < 2.6) {
      const zc = b.pos.z + b.vel.z * tc;
      let yc = b.pos.y + b.vel.y * tc - 0.5 * G * tc * tc; if (yc < 0.11) yc = 0.4;
      if (Math.abs(zc) < P.goalW + 0.6 && yc < P.goalH + 0.5) threat = { tc, zc, yc };
    }
  }
  if (threat) {
    if (!p.seen) p.seen = M.t + (M.penaltyKick ? 0.02 : D.react * (t.human ? 0.85 : 1) * (1.4 - skill * 0.5));
    if (M.t >= p.seen) {
      const tAvail = Math.max(0.12, threat.tc - (M.t - p.seen));
      // penalties: a guess at the kick, not a read of the flight
      let tz = threat.zc;
      if (M.penaltyKick && !p.guessed) {
        p.guessed = true;
        const right = Math.random() < 0.4 + 0.25 * skill;
        if (M.mode === 'shootout' && t.human) tz = M.humanDive === null ? p.pos.z : M.humanDive * P.goalW * 0.78;
        else if (!right) tz = -Math.sign(threat.zc || 1) * rand(0.4, 0.76) * P.goalW;
        p.penTarget = tz;
      }
      if (M.penaltyKick) tz = p.penTarget ?? tz;
      const need = tz - p.pos.z;
      if (Math.abs(need) > Math.min(1.1, P.goalW * 0.5) && Math.abs(need) < P.goalW + 1.2) {
        // dive: the Mixamo save goes to his left (world (cos yaw, 0, -sin yaw)); mirrored for his right
        const mirror = Math.sign(need) === Math.sign(-Math.sin(p.yaw) || 1) ? 1 : -1;
        const sp = clamp(Math.abs(need) / Math.min(0.62, tAvail) * (0.8 + skill * 0.35), 3, 7.8);
        p.state = 'dive'; p.t = 0; p.diveDur = 0.85; p.diveV = new V3(fwd * 0.6, 0, Math.sign(need) * sp);
        if (p.body) p.body.play('dive', { from: 0.35, rate: 1.9, mirror, until: 2.6 });
        p.seen = null;
        return;
      }
      // a step across, set for the catch
      goTo(p, _a.set(line + fwd * 0.8, 0, clamp(tz, -P.goalW, P.goalW)), 6.5);
      return;
    }
    return;
  }
  p.seen = null; p.guessed = false;
  // a loose ball in his box that he can get to first: go and claim it
  const C = ctx(M), c = C.team[t.side];
  if (!b.owner && c.chaser === p && M.inBox(t, b.pos, 0)) { goTo(p, p.icept || b.pos, SPEED.run); return; }
  // one on one: off his line to narrow the angle, and at the feet when it's there
  const own = b.owner;
  if (own && own.team !== t && M.inBox(t, own.pos, 2)) {
    const d = p.dist(own.pos);
    const nearestDef = Math.min(...t.players.filter((q) => !q.keeper).map((q) => q.dist(own.pos)));
    if (d < 11 * P.kp && nearestDef > 2.5) {
      goTo(p, own.pos, SPEED.run);
      if (d < 1.6 && Math.random() < dt * 3 * skill) { b.owner = null; M.keeperGather(p); M.emit('save', { p, caught: true, smother: true }); }
      return;
    }
  }
  // his angle: on the line from the middle of the goal to the ball, a few metres out
  const bd = hyp(b.pos.x - line, b.pos.z);
  const out = clamp(bd * 0.11, 0.5, 4.8 * P.kp);
  const dx = b.pos.x - line, dz = b.pos.z, l = Math.hypot(dx, dz) || 1;
  _a.set(line + (dx / l) * out, 0, clamp((dz / l) * out, -P.goalW + 0.4, P.goalW - 0.4));
  if (fwd * (_a.x - line) < 0.4) _a.x = line + fwd * 0.4;
  goTo(p, _a, p.dist(_a) > 3 ? SPEED.run : 3.2);
}

/* ---- the AI takes a set piece */
export function restartChoice(M, r) {
  const t = r.team, tk = r.taker, opp = t.opp;
  const mates = t.players.filter((q) => q !== tk);
  const open = (q) => { let m = 9 * P.kp; for (const o of opp.players) m = Math.min(m, o.dist(q.pos)); return m; };
  if (r.type === 'kickoff') {
    const q = mates.filter((x) => !x.keeper).sort((a, b) => a.dist(tk.pos) - b.dist(tk.pos))[0];
    M.startKick(tk, 'pass', q.pos, 0.4, { receiver: q, noSwitch: true }); return;
  }
  if (r.type === 'penalty') {
    M.penaltyKick = true;
    const side = Math.random() < 0.5 ? -1 : 1;
    const aim = _a.set(t.goalX, Math.random() < 0.3 ? rand(1.3, 2.0) : rand(0.25, 0.8), side * (P.goalW - rand(0.5, 1.2)));
    if (Math.random() < 0.12) aim.z = rand(-0.4, 0.4); // down the middle
    M.startKick(tk, 'shot', aim, rand(0.7, 0.88)); return;
  }
  if (r.type === 'throwin') {
    const q = mates.filter((x) => !x.keeper && x.dist(tk.pos) < 22 * P.kp).sort((a, b) => open(b) - open(a))[0] || mates[1];
    M.startKick(tk, 'throw', q.pos, 0.5, { receiver: q }); return;
  }
  if (r.type === 'corner') {
    const tgts = mates.filter((q) => M.inBox(opp, q.pos, 2));
    const q = tgts.length ? pick(tgts) : null;
    const to = q ? _a.set(q.pos.x, 0, q.pos.z) : _a.set(t.goalX - t.dir * 9, 0, rand(-4, 4));
    M.startKick(tk, 'cross', to, 0.75, { receiver: q }); return;
  }
  if (r.type === 'freekick') {
    const goal = _b.set(t.goalX, 0, 0), d = tk.dist(goal);
    if (d < 30 * Math.max(P.k, 0.42) && Math.abs(tk.pos.z) < 20 * P.k) {
      const side = Math.random() < 0.5 ? -1 : 1;
      M.startKick(tk, 'shot', _a.set(t.goalX, rand(1.2, 2.1), side * (P.goalW - 0.6)), 0.78, { curl: -side * t.dir * 10 }); return;
    }
  }
  // goal kicks and free kicks elsewhere: short to a free man, or long upfield
  const shortOpts = mates.filter((q) => !q.keeper && q.dist(tk.pos) < 28 * P.kp && open(q) > 6 * P.kp);
  if (shortOpts.length && Math.random() < 0.5) { const q = pick(shortOpts); M.startKick(tk, 'pass', q.pos, 0.5, { receiver: q }); return; }
  const fw = mates.filter((q) => q.role !== 'DEF' && !q.keeper).sort((a, b) => open(b) - open(a))[0];
  M.startKick(tk, 'clear', fw ? fw.pos : _a.set(t.xOf(0.6), 0, 0), 0.9, { receiver: fw });
}
