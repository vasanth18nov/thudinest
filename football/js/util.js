/* Final Whistle: shared helpers and the pitch's dimensions.
   Axes: x along the pitch (goals at x = ±HL), z across it (touchlines at z = ±HW), y up. Metres and seconds. */
import * as THREE from '../../bm/vendor/three.js';
export { THREE };

export const V3 = THREE.Vector3, Q = THREE.Quaternion;
export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
export const hyp = Math.hypot;
// a heading (yaw) from a direction on the ground: yaw 0 faces +z, as the Mixamo models do
export const yawOf = (dx, dz) => Math.atan2(dx, dz);

export const $ = (id) => document.getElementById(id);
export const params = new URLSearchParams(location.search);
export const DEBUG = params.has('debug');
export const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
export const LITE = COARSE || (navigator.deviceMemory && navigator.deviceMemory <= 4) || params.has('lite');

export const store = {
  get(k, d) { try { const v = localStorage.getItem('fw.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fw.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

/* the grounds. stadium: 105 x 68, FIFA's preferred size. futsal: a 40 x 20 floodlit five-a-side court in a cage,
   3 x 2 m goals, the ball playing off the boards and netting (no throw-ins, corners or goal kicks).
   P holds the current ground; setGround() swaps it. k scales distances to the pitch (1 on the big pitch), kp is the
   same for things that scale less (a player's reach and his runs). */
export const GROUNDS = {
  stadium: { kind: 'stadium', HL: 52.5, HW: 34, goalW: 3.66, goalH: 2.44, goalD: 2.2, boxL: 16.5, boxW: 20.16, sixL: 5.5, sixW: 9.16, spot: 11, circle: 9.15, arc: 1, walls: false, wallX: 0, wallZ: 0 },
  futsal: { kind: 'futsal', HL: 20, HW: 10, goalW: 1.5, goalH: 2.0, goalD: 1.0, boxL: 6, boxW: 7.5, sixL: 2.5, sixW: 4, spot: 6, circle: 3, arc: 0.25, walls: true, wallX: 21.4, wallZ: 11.1 },
};
export const P = { post: 0.06, ballR: 0.11 };
export function setGround(kind) {
  Object.assign(P, GROUNDS[kind] || GROUNDS.futsal);
  P.k = P.HL / 52.5; P.kp = Math.max(P.k, 0.5);
}
setGround('futsal');

export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.anisotropy = o.aniso || 4;
  return t;
}

export const fmtClock = (s) => { s = Math.max(0, Math.floor(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
