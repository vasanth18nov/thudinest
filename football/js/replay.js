/* The goal replay. Every drawn frame of a match is recorded (each player's place and the 20 bones of his pose, the
   ball) for the last few seconds; after a goal the build-up is played back from a low camera beside the goal,
   slowing as the ball goes in. Nothing in the match runs while it plays; a tap skips it. */
import { THREE, V3, P, clamp, lerp } from './util.js';
import { ORDER } from './rig.js';

const PER = 3 + 4 + 3 + ORDER.length * 4; // root place and turn, hips place, the bones
const KEEP = 8; // seconds kept

export class Replay {
  constructor() { this.frames = []; this.t = 0; this.play = null; }
  reset() { this.frames.length = 0; this.t = 0; this.play = null; }
  record(M, dt) {
    if (dt <= 0) return;
    this.t += dt;
    const n = M.all.length;
    // reuse the oldest frame's arrays when it falls out of the window
    let f = this.frames.length && this.t - this.frames[0].t > KEEP ? this.frames.shift() : null;
    if (!f || f.data.length !== n * PER) f = { data: new Float32Array(n * PER), ball: new Float32Array(7) };
    f.t = this.t;
    let o = 0;
    for (const p of M.all) {
      const b = p.body, d = f.data;
      d[o++] = b.root.position.x; d[o++] = b.root.position.y; d[o++] = b.root.position.z;
      const q = b.root.quaternion; d[o++] = q.x; d[o++] = q.y; d[o++] = q.z; d[o++] = q.w;
      const h = b.B.Hips.position; d[o++] = h.x; d[o++] = h.y; d[o++] = h.z;
      for (const name of ORDER) { const bq = b.B[name].quaternion; d[o++] = bq.x; d[o++] = bq.y; d[o++] = bq.z; d[o++] = bq.w; }
    }
    const m = M.ball.mesh; f.ball.set([m.position.x, m.position.y, m.position.z, m.quaternion.x, m.quaternion.y, m.quaternion.z, m.quaternion.w]);
    this.frames.push(f);
  }
  /* begin a replay of [goalT - before, goalT + after]; `goal`: the goal's x; returns false if there is too little */
  start(goalT, goalX, before = 4.2, after = 0.9) {
    const fr = this.frames.filter((f) => f.t >= goalT - before && f.t <= goalT + after);
    if (fr.length < 20) return false;
    const firstBall = fr[0].ball;
    // the camera: low, beside the goal, on the side the move came from
    const side = Math.sign(firstBall[2]) || 1;
    this.play = { fr, i: 0, t: fr[0].t, goalT, goalX, side, look: new V3(firstBall[0], 0.6, firstBall[2]), pos: null };
    return true;
  }
  /* advance the replay; poses the players and ball and points the camera. false when it is over */
  step(M, dt, camera) {
    const R = this.play; if (!R) return false;
    // slow motion through the last second before the ball goes in
    const near = Math.abs(R.t - R.goalT);
    const speed = near < 1.1 ? 0.42 : 0.8;
    R.t += dt * speed;
    while (R.i < R.fr.length - 1 && R.fr[R.i + 1].t <= R.t) R.i++;
    if (R.i >= R.fr.length - 1) { this.play = null; return false; }
    const a = R.fr[R.i], b = R.fr[R.i + 1], k = clamp((R.t - a.t) / Math.max(1e-4, b.t - a.t), 0, 1);
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    let o = 0;
    for (const p of M.all) {
      const bd = p.body, A = a.data, B = b.data;
      if (o + PER > A.length || o + PER > B.length) break;
      bd.root.position.set(lerp(A[o], B[o], k), lerp(A[o + 1], B[o + 1], k), lerp(A[o + 2], B[o + 2], k));
      qa.set(A[o + 3], A[o + 4], A[o + 5], A[o + 6]); qb.set(B[o + 3], B[o + 4], B[o + 5], B[o + 6]); bd.root.quaternion.slerpQuaternions(qa, qb, k);
      bd.B.Hips.position.set(lerp(A[o + 7], B[o + 7], k), lerp(A[o + 8], B[o + 8], k), lerp(A[o + 9], B[o + 9], k));
      let j = o + 10;
      for (const name of ORDER) { qa.set(A[j], A[j + 1], A[j + 2], A[j + 3]); qb.set(B[j], B[j + 1], B[j + 2], B[j + 3]); bd.B[name].quaternion.slerpQuaternions(qa, qb, k); j += 4; }
      if (bd.blob) bd.blob.position.set(bd.root.position.x, 0.012, bd.root.position.z);
      o += PER;
    }
    const m = M.ball.mesh, A = a.ball, B = b.ball;
    m.position.set(lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k));
    qa.set(A[3], A[4], A[5], A[6]); qb.set(B[3], B[4], B[5], B[6]); m.quaternion.slerpQuaternions(qa, qb, k);
    // the camera: beside the post at head height, turning to follow the ball in
    const gx = R.goalX, s = Math.sign(gx) || 1, kk = Math.max(P.k, 0.42);
    const want = new V3(gx - s * 5.5 * kk, 1.7 + 1.2 * kk, R.side * (P.goalW / 2 + 7 * kk));
    if (!R.pos) R.pos = want.clone(); else R.pos.lerp(want, 1 - Math.exp(-dt * 2));
    R.look.lerp(new V3(m.position.x, Math.max(0.4, m.position.y * 0.7), m.position.z), 1 - Math.exp(-dt * (near < 1.1 ? 3 : 5)));
    camera.position.copy(R.pos); camera.lookAt(R.look);
    if (camera.fov !== 38) { camera.fov = 38; camera.updateProjectionMatrix(); }
    return true;
  }
}
