/* The players' bodies: the footballer model (players/footballer.glb, a rigged Mixamo character) wearing the Mixamo
   clips in moves.json (each bone's change from the T-pose, so the clips fit this rig), blended by speed, with the
   football actions (kicks, slides, tackles) laid over them procedurally on the same skeleton.
   The calibration and clip sampling follow Rally Point (bm/js/game.js). */
import { THREE, V3, Q, clamp, lerp, smooth } from './util.js';

const STRIP = /^mixamorig\d*:?/;
export const ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const LEG = { Left: ['LeftUpLeg', 'LeftLeg', 'LeftFoot'], Right: ['RightUpLeg', 'RightLeg', 'RightFoot'] };
const SHIN = { Left: ['LeftLeg', 'LeftFoot'], Right: ['RightLeg', 'RightFoot'] };
const TORSO = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'];
const ARM = { Left: ['LeftArm', 'LeftForeArm', 'LeftHand'], Right: ['RightArm', 'RightForeArm', 'RightHand'] };
const swapSide = (n) => (n.startsWith('Left') ? `Right${n.slice(4)}` : n.startsWith('Right') ? `Left${n.slice(5)}` : n);
const bonesOf = (root) => { const m = {}; root.traverse((o) => { if (o.isBone) { const n = o.name.replace(STRIP, ''); if (!m[n]) m[n] = o; } }); return m; };
const _q1 = new Q(), _q2 = new Q(), _q3 = new Q(), _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3();
const Y_UP = new V3(0, 1, 0);
function setWorldQuat(obj, qW) { obj.parent.getWorldQuaternion(_q3); obj.quaternion.copy(_q3.invert()).multiply(qW); }

/* once per character: its T-pose, scale and leg length */
export function calibrate(gltf, height) {
  const root = new THREE.Group(), model = THREE.SkeletonUtils.clone(gltf.scene);
  root.add(model); root.updateMatrixWorld(true);
  const B = bonesOf(model);
  for (const n of ORDER) if (!B[n]) throw new Error(`no ${n} bone`);
  const box = new THREE.Box3().setFromObject(model, true);
  const S = height / (box.max.y - box.min.y);
  model.scale.setScalar(S); model.position.y = -box.min.y * S; root.updateMatrixWorld(true);
  const at = (b) => b.getWorldPosition(new V3());
  const bind = {}; for (const n of ORDER) bind[n] = B[n].getWorldQuaternion(new Q());
  const parent = {}; for (const n of ORDER) parent[n] = B[n].parent.name.replace(STRIP, '');
  const legLen = at(B.LeftUpLeg).distanceTo(at(B.LeftLeg)) + at(B.LeftLeg).distanceTo(at(B.LeftFoot));
  return {
    gltf, S, offY: -box.min.y * S, bind, parent, legLen, height,
    hipsParentQ: B.Hips.parent.getWorldQuaternion(new Q()), hipsParentInv: B.Hips.parent.matrixWorld.clone().invert(),
    hipH: at(B.Hips).y, ankleH: (at(B.LeftFoot).y + at(B.RightFoot).y) / 2,
  };
}

/* the clips */
export let CLIPS = null;
let CLIP_BI = {};
export function setClips(data) { CLIPS = data; CLIP_BI = {}; data.bones.forEach((n, i) => (CLIP_BI[n] = i)); }
function clipQ(c, n, f, out) {
  const nb = CLIPS.bones.length, b = CLIP_BI[n], i = Math.min(c.n - 2, Math.floor(f)), u = f - i;
  _q3.fromArray(c.q, ((i + 1) * nb + b) * 4);
  return out.fromArray(c.q, (i * nb + b) * 4).slerp(_q3, u);
}
const clipHipsY = (c, f) => { const i = Math.min(c.n - 2, Math.floor(f)), u = f - i; return lerp(c.hips[i * 3 + 1], c.hips[i * 3 + 4], u); };
export const clipDur = (key) => (CLIPS.clips[key].n - 1) / CLIPS.clips[key].fps;
function clipFrame(c, t, loop) { const dur = (c.n - 1) / c.fps; if (loop) t = ((t % dur) + dur) % dur; return clamp(t * c.fps, 0, c.n - 1); }

// piecewise-linear keys [[t, v], ...] sampled at u, eased between keys
function keys(k, u) {
  if (u <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) { const a = k[i - 1], b = k[i]; return lerp(a[1], b[1], smooth((u - a[0]) / (b[0] - a[0]))); }
  return k[k.length - 1][1];
}
/* the kick: thigh swing (+ forward), knee bend; contact at u = 0.5 */
const KICK_THIGH = [[0, 0], [0.38, -0.95], [0.5, 0.55], [0.66, 1.25], [0.85, 0.5], [1, 0]];
const KICK_KNEE = [[0, 0], [0.38, 1.55], [0.48, 0.55], [0.56, 0.08], [0.8, 0.35], [1, 0]];
const PASS_THIGH = [[0, 0], [0.38, -0.6], [0.5, 0.35], [0.68, 0.7], [1, 0]];
const PASS_KNEE = [[0, 0], [0.38, 1.0], [0.5, 0.35], [0.7, 0.2], [1, 0]];

export class Body {
  constructor(scene, K, mats) {
    this.K = K; this.scene = scene;
    this.root = new THREE.Group(); scene.add(this.root);
    this.model = THREE.SkeletonUtils.clone(K.gltf.scene);
    this.model.scale.setScalar(K.S); this.model.position.y = K.offY;
    this.root.add(this.model);
    this.B = bonesOf(this.model);
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      if (mats && mats[o.material.name]) o.material = mats[o.material.name];
    });
    this.T = {}; this.T2 = {}; for (const n of ORDER) { this.T[n] = new Q(); this.T2[n] = new Q(); }
    this.tRun = Math.random() * 3; this.tIdle = Math.random() * 9; this.tShuf = 0;
    this.w = { idle: 1, run: 0, shuf: 0 }; this.shufMirror = 1;
    this.react = null;
    this.yaw = 0; this.hs = K.height / 1.8;
    this.look = new V3(0, 1.6, 5);
  }
  setMaterials(mats) { this.model.traverse((o) => { if (o.isMesh && mats[o.userData.matName || o.material.name]) { o.userData.matName = o.userData.matName || o.material.name; o.material = mats[o.userData.matName]; } }); }
  dispose() { this.scene.remove(this.root); }
  dirWorld(r, u, f, out) {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw), x = -r;
    return out.set(x * c + f * s, u, -x * s + f * c).normalize();
  }
  /* play a clip whole: { key, rate, mirror, from, loop, until } */
  play(key, o = {}) { this.react = Object.assign({ key, t: 0, rate: 1, mirror: 1, from: 0, loop: false }, o); }
  stop() { this.react = null; }
  get reacting() { return !!this.react; }

  /* the clips: idle, run and sidestep blended by speed (or a whole clip) into this.T, the hips height into hipsY */
  clipPose(st, dt) {
    const K = this.K, C = CLIPS.clips, T = this.T, T2 = this.T2, W = this.w;
    const sp = st.speed || 0, lat = st.lateral || 0;
    // weights: still → idle; moving forward → run (its rate matched to the speed so the feet don't slide); moving
    // sideways or backward while facing the ball → the sidestep
    const runW = clamp((sp - 0.25) / 1.6, 0, 1) * (1 - clamp(Math.abs(lat), 0, 1));
    const shufW = clamp((sp - 0.25) / 1.2, 0, 1) * clamp(Math.abs(lat), 0, 1);
    const k = 1 - Math.exp(-10 * dt);
    W.run = lerp(W.run, runW, k); W.shuf = lerp(W.shuf, shufW, k); W.idle = Math.max(0, 1 - W.run - W.shuf);
    if (lat) this.shufMirror = lat > 0 ? 1 : -1;
    // the Mixamo run covers about 4.47 leg lengths a cycle at 30 fps
    const cycleLen = 4.47 * K.legLen, cycleT = (C.run.n - 1) / C.run.fps;
    this.tRun += dt * clamp(sp / (cycleLen / cycleT), 0.45, 1.7);
    this.tShuf += dt * clamp(sp / 2.3, 0.5, 1.6);
    this.tIdle += dt;
    const parts = [];
    if (this.react) {
      const R = this.react, c = C[R.key]; R.t += dt * R.rate;
      parts.push([c, clipFrame(c, R.t + R.from, R.loop), R.mirror, 1]);
      if (!R.loop && R.t + R.from >= (R.until !== undefined ? R.until : (c.n - 1) / c.fps)) this.react = null;
    } else {
      if (W.idle > 0.001) parts.push([C.idle, clipFrame(C.idle, this.tIdle, true), 1, W.idle]);
      if (W.run > 0.001) parts.push([C.run, clipFrame(C.run, this.tRun, true), 1, W.run]);
      if (W.shuf > 0.001) parts.push([C.shuffle, clipFrame(C.shuffle, this.tShuf, true), this.shufMirror, W.shuf]);
    }
    let wsum = 0, hy = 0;
    for (const [c, f, mirror, w] of parts) {
      for (const n of ORDER) {
        clipQ(c, mirror < 0 ? swapSide(n) : n, f, _q2);
        if (mirror < 0) _q2.set(_q2.x, -_q2.y, -_q2.z, _q2.w);
        T2[n].copy(_q2).multiply(K.bind[n]);
        if (wsum === 0) T[n].copy(T2[n]); else T[n].slerp(T2[n], w / (wsum + w));
      }
      const h = clipHipsY(c, f) - c.rest;
      hy = wsum === 0 ? h : lerp(hy, h, w / (wsum + w));
      wsum += w;
    }
    this.hipsY = K.hipH + hy * K.legLen;
  }
  rot(names, axis, ang) { if (!ang) return; _q1.setFromAxisAngle(axis, ang); for (const n of names) this.T[n].premultiply(_q1); }
  applyT(hipY) {
    const K = this.K, B = this.B, T = this.T;
    for (const n of ORDER) {
      const pq = n === 'Hips' ? K.hipsParentQ : T[K.parent[n]];
      B[n].quaternion.copy(_q1.copy(pq).invert()).multiply(T[n]);
    }
    B.Hips.position.set(0, hipY, 0).applyMatrix4(K.hipsParentInv);
  }

  /* st: { x, z, y, yaw, speed, lateral (-1..1, + to the left), lean (into a turn), act: { type, u, foot, power },
     look: V3 } */
  pose(st, dt) {
    this.root.position.set(st.x, st.y || 0, st.z);
    this.yaw = st.yaw; this.root.rotation.set(0, st.yaw, 0);
    this.clipPose(st, dt);
    const R = this.dirWorld(1, 0, 0, _v1), F = this.dirWorld(0, 0, 1, _v2);
    let hipY = this.hipsY;
    const a = st.act;
    if (a && !this.react) {
      const u = clamp(a.u, 0, 1), foot = a.foot || 'Right', other = foot === 'Right' ? 'Left' : 'Right';
      if (a.type === 'shot' || a.type === 'pass' || a.type === 'lob' || a.type === 'clear') {
        const big = a.type !== 'pass', sc = big ? 0.75 + 0.35 * (a.power || 0.7) : 0.7 + 0.4 * (a.power || 0.5);
        const thigh = keys(big ? KICK_THIGH : PASS_THIGH, u) * sc, knee = keys(big ? KICK_KNEE : PASS_KNEE, u) * sc;
        this.rot(LEG[foot], R, thigh); this.rot(SHIN[foot], R, -knee);
        // the standing leg bends a little, the body leans back over a lofted ball, the arms open for balance
        const env = Math.sin(Math.PI * u);
        this.rot(SHIN[other], R, -0.35 * env);
        this.rot(TORSO, R, (a.type === 'lob' || a.type === 'clear' ? 0.22 : 0.08) * env);
        this.rot(ARM[other], F, (other === 'Left' ? -1 : 1) * 0.9 * env);
        this.rot(ARM[foot], F, (foot === 'Left' ? -1 : 1) * 0.4 * env);
        hipY -= 0.06 * env;
      } else if (a.type === 'slide') {
        const env = keys([[0, 0], [0.16, 1], [0.72, 1], [1, 0]], u);
        for (const n of ORDER) this.T[n].premultiply(_q1.setFromAxisAngle(R, 1.05 * env));
        this.rot(LEG[foot], R, 0.35 * env); this.rot(SHIN[other], R, -1.5 * env); this.rot(LEG[other], R, -0.4 * env);
        this.rot(ARM.Left, F, -0.8 * env); this.rot(ARM.Right, F, 0.8 * env);
        hipY = lerp(hipY, 0.26, env);
      } else if (a.type === 'tackle') {
        const env = keys([[0, 0], [0.3, 1], [0.6, 1], [1, 0]], u);
        this.rot(TORSO, R, -0.28 * env);
        this.rot(LEG[foot], R, 1.05 * env); this.rot(SHIN[foot], R, -0.25 * env);
        this.rot(SHIN[other], R, -0.6 * env);
        this.rot(ARM[other], F, (other === 'Left' ? -1 : 1) * 0.7 * env);
        hipY -= 0.2 * env;
      } else if (a.type === 'jump') { // a keeper's jump or a header
        const env = Math.sin(Math.PI * u);
        this.rot(ARM.Left, F, -2.4 * env); this.rot(ARM.Right, F, 2.4 * env);
        this.rot(SHIN.Left, R, -0.6 * env); this.rot(SHIN.Right, R, -0.6 * env);
      }
    }
    // lean into turns and with acceleration
    if (st.lean && !this.react) { _q1.setFromAxisAngle(F, st.lean); for (const n of ORDER) this.T[n].premultiply(_q1); }
    if (st.tilt && !this.react) this.rot(TORSO, R, st.tilt);
    // keeper's ready crouch: arms out and low
    if (st.ready && !this.react && !a) {
      const r = st.ready;
      this.rot(ARM.Left, F, -0.55 * r); this.rot(ARM.Right, F, 0.55 * r);
      this.rot(['LeftForeArm', 'LeftHand'], R, -0.6 * r); this.rot(['RightForeArm', 'RightHand'], R, -0.6 * r);
      this.rot(TORSO, R, -0.25 * r);
      this.rot(SHIN.Left, R, -0.5 * r); this.rot(SHIN.Right, R, -0.5 * r); this.rot(LEG.Left, R, 0.25 * r); this.rot(LEG.Right, R, 0.25 * r);
      hipY -= 0.12 * r;
    }
    this.applyT(hipY);
    this.root.updateMatrixWorld(true);
    if (st.look) this.lookAt(st.look, st.lookW === undefined ? 1 : st.lookW);
  }
  lookAt(target, w) {
    if (w <= 0 || (this.react && this.react.key !== 'idle')) return;
    const B = this.B;
    const p0 = B.Neck.getWorldPosition(_v1);
    let dx = target.x - p0.x, dz = target.z - p0.z;
    const dy = target.y - p0.y, hl = Math.hypot(dx, dz), dist = Math.hypot(hl, dy) || 1;
    if (hl < 0.05) { this.dirWorld(0, 0, 1, _v2); dx = _v2.x; dz = _v2.z; } else { dx /= hl; dz /= hl; }
    const el = clamp(Math.atan2(dy, hl), -0.5, 0.6), far = Math.max(dist, 4);
    const lk = _v3.set(p0.x + dx * Math.cos(el) * far, p0.y + Math.sin(el) * far, p0.z + dz * Math.cos(el) * far);
    for (const [n, k] of [['Neck', 0.4], ['Head', 0.6]]) {
      const b = B[n]; b.updateMatrixWorld(true);
      const p = b.getWorldPosition(_v1), want = _v2.copy(lk).sub(p).normalize();
      b.getWorldQuaternion(_q1);
      const fwdNow = _v4.set(0, 0, 1).applyQuaternion(_q2.copy(_q1).multiply(_q3.copy(this.K.bind[n]).invert()));
      _q2.setFromUnitVectors(fwdNow, want);
      const ang = 2 * Math.acos(clamp(Math.abs(_q2.w), 0, 1)), lim = 1.1 * k;
      if (ang > lim) _q2.slerp(_q3.identity(), 1 - lim / ang);
      _q2.slerp(_q3.identity(), 1 - w * k * 1.6);
      setWorldQuat(b, _q1.premultiply(_q2)); b.updateMatrixWorld(true);
    }
  }
  footPos(foot, out) { return this.B[`${foot}Foot`].getWorldPosition(out); }
  headPos(out) { return this.B.Head.getWorldPosition(out); }
}
