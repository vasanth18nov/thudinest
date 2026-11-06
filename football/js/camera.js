/* The cameras: the broadcast view from the gantry on the near touchline (following the play along the pitch,
   closing in on play near the goals), a view from behind the play in the direction your side attacks, one behind the
   penalty taker, and a slow orbit round the scorer after a goal. All smoothed; never below the stands' line of
   sight, never under the grass. */
import { THREE, V3, P, clamp, damp, lerp } from './util.js';

export class Cam {
  constructor(camera) {
    this.c = camera; this.mode = 'broadcast';
    this.pos = new V3(0, 22, 55); this.look = new V3(0, 0, 0); this.focus = new V3();
    this.fov = 34; this.cut = true; this.orbit = 0;
  }
  setMode(m) { if (m !== this.mode) { this.mode = m; } }
  snap() { this.cut = true; }
  /* f: the point to follow (V3), ball: V3, dir: the human side's attacking direction, aspect */
  update(dt, o) {
    const { focus, ball, aspect } = o;
    const k = this.cut ? 1e3 : 1;
    this.focus.set(damp(this.focus.x, focus.x, 3.2 * k, dt), 0, damp(this.focus.z, focus.z, 2.4 * k, dt));
    const F = this.focus;
    const portrait = aspect < 1;
    const want = new V3(), look = new V3();
    let fov = 34;
    if (this.mode === 'broadcast') {
      // the gantry slides along the near side; closer in on play near the goals and on the near touchline
      const nearGoal = clamp((Math.abs(F.x) - 30) / 22, 0, 1);
      // a phone's screen is small: the camera comes in closer so the players read
      const ph = o.phone && !portrait ? 0.8 : 1;
      const dist = ((portrait ? 64 : 47) - nearGoal * 6 + clamp(-F.z, -20, 20) * 0.2) * ph;
      const h = ((portrait ? 34 : 22) - nearGoal * 2) * ph;
      want.set(F.x * 0.92, h, F.z * 0.3 + dist);
      look.set(F.x, 0, F.z * 0.62 - 1.5);
      fov = portrait ? 46 : clamp(36 - (aspect - 1.6) * 4, 28, 40);
    } else if (this.mode === 'behind') {
      const d = o.dir || 1;
      want.set(F.x - d * (portrait ? 26 : 19), portrait ? 16 : 11, F.z * 0.85);
      look.set(F.x + d * 14, 0, F.z);
      fov = portrait ? 58 : 46;
    } else if (this.mode === 'penalty') {
      const spot = o.spot || F, d = o.dir || 1;
      want.set(spot.x - d * 7.5, 2.6, spot.z + 0.6);
      look.set(spot.x + d * 10, 1.1, 0);
      fov = portrait ? 62 : 44;
    } else if (this.mode === 'goal') {
      // round the scorer
      this.orbit += dt * 0.28;
      const r = 9, s = o.subject || F;
      want.set(s.x + Math.sin(this.orbit) * r, 3.2, s.z + Math.cos(this.orbit) * r);
      look.set(s.x, 1.2, s.z);
      fov = portrait ? 56 : 40;
    } else if (this.mode === 'end') {
      this.orbit += dt * 0.12;
      want.set(Math.sin(this.orbit) * 40, 18, Math.cos(this.orbit) * 40);
      look.set(0, 0, 0); fov = 40;
    }
    const kp = this.cut ? 1e3 : this.mode === 'goal' ? 2 : 2.6;
    this.pos.set(damp(this.pos.x, want.x, kp, dt), damp(this.pos.y, want.y, kp, dt), damp(this.pos.z, want.z, kp, dt));
    this.look.set(damp(this.look.x, look.x, kp * 1.3, dt), damp(this.look.y, look.y, kp * 1.3, dt), damp(this.look.z, look.z, kp * 1.3, dt));
    this.fov = this.cut ? fov : damp(this.fov, fov, 3, dt);
    this.pos.y = Math.max(this.pos.y, 1.2);
    this.c.position.copy(this.pos); this.c.lookAt(this.look);
    if (Math.abs(this.c.fov - this.fov) > 0.01) { this.c.fov = this.fov; this.c.updateProjectionMatrix(); }
    this.cut = false;
    void ball; void lerp; void P; void THREE;
  }
  // a screen direction (x right, y up) on the ground, as the camera sees it
  groundDir(x, y, out) {
    const f = new V3(); this.c.getWorldDirection(f); f.y = 0; f.normalize();
    const r = new V3(-f.z, 0, f.x);
    return out.set(r.x * x + f.x * y, 0, r.z * x + f.z * y);
  }
}
