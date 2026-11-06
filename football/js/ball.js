/* The ball: a 22 cm, 430 g ball with air drag, the Magnus force from its spin (so struck shots can curl and dip),
   bounces that lose height and pace on the grass, rolling resistance, and the woodwork and nets of both goals. */
import { THREE, V3, P, clamp } from './util.js';

const G = 9.81, DRAG = 0.0125, MAGNUS = 0.0045, ROLL = 0.85, ROLL_K = 0.1;
const _v = new V3(), _w = new V3(), _a = new V3(), _b = new V3(), _c = new V3();

// a classic 32-panel ball, painted per texel of an equirectangular map: 12 black pentagons and 20 white hexagons
function ballTexture() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
  const t = (1 + Math.sqrt(5)) / 2;
  const ico = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => new V3(...p).normalize());
  const faces = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    const a = ico[i], b = ico[j], cc = ico[k], e = 1.12;
    if (a.distanceTo(b) < e && b.distanceTo(cc) < e && a.distanceTo(cc) < e) faces.push(new V3().add(a).add(b).add(cc).normalize());
  }
  const centres = ico.map((p) => [p, 1]).concat(faces.map((p) => [p, 0]));
  const p = new V3();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lon = (x / W) * Math.PI * 2, lat = (y / H) * Math.PI;
    p.set(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon));
    let b1 = -2, b2 = -2, kind = 0;
    for (const [q, k] of centres) { const dd = p.dot(q) * (k ? 1.035 : 1); if (dd > b1) { b2 = b1; b1 = dd; kind = k; } else if (dd > b2) b2 = dd; }
    const seam = b1 - b2 < 0.012;
    const i = (y * W + x) * 4;
    const v = seam ? 70 : kind ? 22 : 246;
    d[i] = v; d[i + 1] = v; d[i + 2] = kind && !seam ? 30 : v; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// closest point on segment ab to p
function closestOnSeg(p, a, b, out) {
  _a.subVectors(b, a); const l2 = _a.lengthSq();
  const t = l2 ? clamp(_b.subVectors(p, a).dot(_a) / l2, 0, 1) : 0;
  return out.copy(a).addScaledVector(_a, t);
}

export class Ball {
  constructor(scene) {
    this.r = P.ballR;
    this.pos = new V3(0, this.r, 0); this.prev = this.pos.clone(); this.vel = new V3(); this.spin = new V3();
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.r, 32, 20), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.45, metalness: 0 }));
    this.mesh.castShadow = true; scene.add(this.mesh);
    this.owner = null; this.lastTouch = null; this.events = [];
    // the woodwork, as segments: two posts and the bar at each end
    this.wood = [];
    for (const s of [-1, 1]) {
      const x = s * (P.HL + P.post);
      for (const t of [-1, 1]) this.wood.push([new V3(x, 0, t * (P.goalW + P.post)), new V3(x, P.goalH + P.post, t * (P.goalW + P.post))]);
      this.wood.push([new V3(x, P.goalH + P.post / 2, -(P.goalW + P.post)), new V3(x, P.goalH + P.post / 2, P.goalW + P.post)]);
    }
  }
  get airborne() { return this.pos.y > this.r + 0.03; }
  place(x, z, y = this.r) { this.pos.set(x, y, z); this.prev.copy(this.pos); this.vel.set(0, 0, 0); this.spin.set(0, 0, 0); }
  speed() { return this.vel.length(); }
  groundSpeed() { return Math.hypot(this.vel.x, this.vel.z); }

  /* free flight (the dribbler moves the ball himself) */
  step(dt) {
    const v = this.vel, p = this.pos, r = this.r;
    this.prev.copy(p);
    const sp = v.length();
    const inAir = p.y > r + 0.005 || v.y > 0.01;
    if (inAir) {
      v.y -= G * dt;
      v.addScaledVector(v, -DRAG * sp * dt);
      // Magnus: spin × velocity
      _w.crossVectors(this.spin, v).multiplyScalar(MAGNUS * dt); v.add(_w);
      this.spin.multiplyScalar(Math.exp(-0.25 * dt));
    } else {
      // rolling: a constant resistance plus a little that grows with pace; the spin becomes the roll
      const gs = Math.hypot(v.x, v.z);
      if (gs > 0) { const dec = (ROLL + ROLL_K * gs) * dt, f = Math.max(0, gs - dec) / gs; v.x *= f; v.z *= f; }
      v.y = 0; p.y = r;
      // sidespin still bends a rolling ball a little
      _w.crossVectors(this.spin, v).multiplyScalar(MAGNUS * 0.3 * dt); _w.y = 0; v.add(_w);
      this.spin.set(v.z / r, this.spin.y * Math.exp(-2 * dt), -v.x / r);
    }
    p.addScaledVector(v, dt);
    // the grass
    if (p.y < r) {
      p.y = r;
      if (v.y < -1.1) {
        const imp = -v.y;
        v.y = imp * 0.56; v.x *= 0.84; v.z *= 0.84;
        this.spin.multiplyScalar(0.6);
        if (imp > 2.5) this.events.push({ type: 'bounce', speed: imp });
      } else v.y = 0;
    }
    this.woodwork();
    this.netsAndBoards();
  }
  woodwork() {
    const p = this.pos, v = this.vel, rr = this.r + P.post;
    for (const [a, b] of this.wood) {
      const q = closestOnSeg(p, a, b, _c), d = _v.subVectors(p, q), dist = d.length();
      if (dist < rr && dist > 1e-6) {
        d.multiplyScalar(1 / dist);
        p.copy(q).addScaledVector(d, rr + 0.002);
        const vn = v.dot(d);
        if (vn < 0) {
          v.addScaledVector(d, -vn * 1.6); // restitution 0.6
          v.multiplyScalar(0.92);
          this.spin.multiplyScalar(0.4);
          if (-vn > 2) this.events.push({ type: 'post', speed: -vn, at: q.clone() });
        }
      }
    }
  }
  netsAndBoards() {
    const p = this.pos, v = this.vel, q = this.prev, r = this.r;
    for (const s of [-1, 1]) {
      const depth = s * p.x - P.HL, pdepth = s * q.x - P.HL;
      if (depth < -0.3 || depth > P.goalD + 0.6) continue;
      const backTop = P.goalH * 0.78, roofAt = (dd) => P.goalH + (backTop - P.goalH) * clamp(dd / P.goalD, 0, 1);
      const inside = (dd, z, y) => dd > 0 && dd < P.goalD && Math.abs(z) < P.goalW && y < roofAt(dd);
      const wasIn = inside(pdepth, q.z, q.y);
      if (wasIn) {
        // caught by the net: back, sides or roof
        let hit = null;
        if (depth > P.goalD - r) { p.x = s * (P.HL + P.goalD - r); hit = 'back'; }
        if (Math.abs(p.z) > P.goalW - r) { p.z = Math.sign(p.z) * (P.goalW - r); hit = hit || 'side'; }
        if (p.y > roofAt(depth) - r && depth > 0) { p.y = roofAt(depth) - r; hit = hit || 'roof'; }
        if (hit) {
          const sp = v.length();
          if (hit === 'back') { v.x *= -0.08; v.y *= 0.45; v.z *= 0.45; }
          else if (hit === 'side') { v.z *= -0.1; v.x *= 0.5; v.y *= 0.5; }
          else { v.y = Math.min(v.y, 0) * 0.2; v.x *= 0.5; v.z *= 0.5; }
          if (sp > 3) this.events.push({ type: 'net', side: s, speed: sp, at: p.clone() });
        }
      } else if (depth > 0 && !inside(depth, p.z, p.y) && inside(depth, q.z, q.y) === false) {
        // outside the frame: the ball can't pass through the net from behind or the side
        if (depth > 0.05 && depth < P.goalD && Math.abs(p.z) < P.goalW + r && Math.abs(q.z) >= P.goalW + r && p.y < roofAt(depth)) { p.z = Math.sign(q.z) * (P.goalW + r); v.z *= -0.2; v.x *= 0.6; }
        if (pdepth >= P.goalD + r && depth < P.goalD + r && Math.abs(p.z) < P.goalW && p.y < backTop) { p.x = s * (P.HL + P.goalD + r); v.x *= -0.2; }
        if (q.y >= roofAt(depth) + r && p.y < roofAt(depth) + r && depth > 0 && depth < P.goalD && Math.abs(p.z) < P.goalW) { p.y = roofAt(depth) + r; v.y = Math.abs(v.y) * 0.25; v.x *= 0.7; v.z *= 0.7; }
      }
    }
    if (P.walls) {
      // the cage: rebound boards to 1 m (lively), netting above them to 7 m (dead), and the netting roof
      const wx = P.wallX - r, wz = P.wallZ - r;
      const hit = (axis, lim) => {
        if (Math.abs(p[axis]) <= lim) return;
        p[axis] = Math.sign(p[axis]) * lim;
        const board = p.y < 1.0, vn = Math.abs(v[axis]);
        v[axis] = -Math.sign(p[axis]) * vn * (board ? 0.62 : 0.12);
        const o = axis === 'x' ? 'z' : 'x'; v[o] *= board ? 0.86 : 0.45; v.y *= board ? 0.9 : 0.4;
        this.spin.multiplyScalar(0.5);
        if (vn > 3) this.events.push({ type: board ? 'board' : 'fence', speed: vn, at: p.clone() });
      };
      hit('x', wx); hit('z', wz);
      if (p.y > 7.5) { p.y = 7.5; v.y = -Math.abs(v.y) * 0.2; }
      return;
    }
    // the advertising boards stop a ball that runs on out of play
    const bz = P.HW + 4.1, bx = P.HL + 4.9;
    if (Math.abs(p.z) > bz && p.y < 1.0) { p.z = Math.sign(p.z) * bz; v.z *= -0.3; v.x *= 0.7; }
    if (Math.abs(p.x) > bx && p.y < 1.0) { p.x = Math.sign(p.x) * bx; v.x *= -0.3; v.z *= 0.7; }
  }
  // spin the mesh to match its motion (rolling, or the spin it was struck with)
  render(dt) {
    this.mesh.position.copy(this.pos);
    const w = this.spin, ang = w.length() * dt;
    if (ang > 1e-6) { _v.copy(w).normalize(); this.mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(_v, ang)); }
  }
}
