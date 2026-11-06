/* Striking the ball: the launch a pass, a cross or a shot needs, found against the ball's own physics (drag and
   rolling resistance), so a 20 m pass arrives at the feet it was meant for and a shot crosses the line where it was
   aimed. */
import { V3, P, clamp } from './util.js';

const G = 9.81, DRAG = 0.0125, ROLL = 0.85, ROLL_K = 0.1;

// distance a ball rolls while slowing from v0 to v1 (dv/dx = -(ROLL + K v) / v)
const rollDist = (v0, v1) => { const F = (v) => v / ROLL_K - (ROLL / (ROLL_K * ROLL_K)) * Math.log(ROLL + ROLL_K * v); return F(v0) - F(v1); };
/* a pass along the ground: the speed it needs to reach d metres still moving at vEnd */
export function groundSpeed(d, vEnd = 4) {
  let lo = vEnd, hi = 40;
  for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (rollDist(m, vEnd) < d) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// time for a rolled ball to cover d at launch speed v0
export function rollTime(v0, d) {
  let v = v0, x = 0, t = 0; const dt = 1 / 60;
  while (x < d && v > 0.3 && t < 6) { v -= (ROLL + ROLL_K * v) * dt; x += v * dt; t += dt; }
  return t;
}

/* flight with drag (no spin): from p0 with velocity v, when it is `dist` along `dir` (horizontal unit) the height
   and the time */
function flyTo(y0, vh, vy, dist) {
  let x = 0, y = y0, t = 0, sh = vh, sy = vy; const dt = 1 / 120;
  while (x < dist && t < 5) {
    const sp = Math.hypot(sh, sy);
    sh -= DRAG * sp * sh * dt; sy -= (G + DRAG * sp * sy) * dt;
    x += sh * dt; y += sy * dt; t += dt;
    if (y < P.ballR && sy < 0 && x < dist) return { y: P.ballR, t, short: dist - x };
  }
  return { y, t, short: 0 };
}
/* a lofted ball or a shot: horizontal speed vh, and the vertical speed that brings it to height yT at distance d */
export function solveVy(y0, vh, d, yT) {
  let lo = -8, hi = 30;
  for (let i = 0; i < 26; i++) {
    const m = (lo + hi) / 2, r = flyTo(y0, vh, m, d);
    if (r.short > 0 || r.y < yT) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
/* a ball dropped onto a spot d away, in the air for about T seconds: its horizontal and vertical speeds */
export function loftFor(d, T, y0 = P.ballR) {
  // the drag slows the ball through the flight: start a little quicker than d / T
  let vh = d / T * (1 + DRAG * (d / T) * T * 0.55);
  for (let k = 0; k < 3; k++) {
    const vy = solveVy(y0, vh, d, P.ballR + 0.02), r = flyTo(y0, vh, vy, d);
    vh *= clamp(r.t / T, 0.85, 1.2) ** 0.5;
  }
  return { vh, vy: solveVy(y0, vh, d, P.ballR + 0.02) };
}

const _d = new V3();
/* velocity for a kick from `from` toward `to`: { kind: 'ground' | 'loft' | 'shot', ... } */
export function kickVelocity(from, to, o) {
  _d.set(to.x - from.x, 0, to.z - from.z);
  const d = Math.max(0.5, _d.length()); _d.multiplyScalar(1 / d);
  if (o.kind === 'ground') {
    const v = clamp(groundSpeed(d, o.vEnd ?? 4.5), 4, o.max ?? 27);
    return new V3(_d.x * v, 0.4, _d.z * v);
  }
  if (o.kind === 'loft') {
    const T = o.T ?? clamp(0.55 + d / 22, 0.8, 2.3);
    const { vh, vy } = loftFor(d, T, from.y);
    return new V3(_d.x * vh, vy, _d.z * vh);
  }
  // a shot: speed s, aimed to pass through `to` (on the goal line, at height to.y)
  const s = o.speed, vh = s * 0.985;
  const vy = solveVy(from.y, vh, d, to.y);
  return new V3(_d.x * vh, vy, _d.z * vh);
}
