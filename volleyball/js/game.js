/* Sunset Spike: the beach, the players and the broadcast. The volleyball itself (flight, net, block, rules, scoring,
   the computer's choices) is in sim.js; this file draws it, animates the players from it, films it and takes the
   controls. The players and their clips are Rally Point's (../bm), the spectators Final Whistle's, the body rig and the
   broadcast are Set Point's. Axes as in sim.js: x across the court, y up, z along it, the net at z = 0; you play the
   half z > 0, nearest the camera. */
import * as THREE from '../../bm/vendor/three.js';
import { Match, COURT, DIFFS, FORMATS, sideOf } from './sim.js?v=1'; // bump ?v= here and in index.html with each release
import { buildFans } from '../../football/js/fans.js';

window.__booted = true;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const V3 = THREE.Vector3, Q = THREE.Quaternion;
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const rand = (a, b) => a + Math.random() * (b - a);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ss.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ss.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const loadBar = (p, step) => { $('loadBar').style.transform = `scaleX(${clamp(p, 0.04, 1).toFixed(3)})`; if (step) $('loadStep').textContent = step; };
loadBar(0.12, 'Raking the sand…');

/* ------------------------------------------------------------------ renderer */
const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const LITE = COARSE || (navigator.deviceMemory && navigator.deviceMemory <= 4) || params.has('lite');
if (COARSE) document.body.classList.add('touch-ui');
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: LITE, powerPreference: 'high-performance', stencil: false });
} catch (e) {
  window.__fatal('This device could not start 3D graphics (WebGL 2).', e && e.message);
  throw e;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
const HAZE = new THREE.Color(0xf0a07a);
scene.background = new THREE.Color(0xe8946e);
scene.fog = new THREE.Fog(HAZE, 90, 420);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1600);
{
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  pm.dispose();
}
let composer = null, bloom = null;
if (!LITE) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  composer = new THREE.EffectComposer(renderer, rt);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.26, 0.3, 1.0); // the sun, its path on the sea, the bulbs
  composer.addPass(bloom);
  composer.addPass(new THREE.OutputPass());
}
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = o.aniso === undefined ? maxAniso : o.aniso;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}
const std = (color, roughness = 0.75, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra));
const _m4 = new THREE.Matrix4(); // the shared scratch vectors (_v1 … _v5) are declared with the rig

/* ------------------------------------------------------------------ the sky: a low sun over the sea, beyond the far end */
const SUN = new V3(-0.19, 0.1, -1).normalize(); // over the sea, a little left of the far end
const GLSL_NOISE = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;
const SKY_COLOR = `
  vec3 skyCol(vec3 d, vec3 sun) {
    float h = clamp(d.y, -0.2, 1.0), t = pow(clamp(h, 0.0, 1.0), 0.5);
    vec3 hor = vec3(0.95, 0.44, 0.13), gold = vec3(0.92, 0.5, 0.2), mid = vec3(0.8, 0.32, 0.3), hi = vec3(0.42, 0.22, 0.42), zen = vec3(0.1, 0.08, 0.24);
    vec3 c = mix(hor, gold, smoothstep(0.0, 0.1, t));
    c = mix(c, mid, smoothstep(0.08, 0.3, t));
    c = mix(c, hi, smoothstep(0.25, 0.6, t));
    c = mix(c, zen, smoothstep(0.55, 1.0, t));
    float sd = max(dot(d, sun), 0.0);
    c += vec3(1.0, 0.45, 0.12) * pow(sd, 6.0) * 0.4 * (1.0 - t);
    c += vec3(1.0, 0.7, 0.36) * pow(sd, 90.0) * 0.45;
    return c;
  }`;
const skyU = { uSun: { value: SUN }, uTime: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 uSun; uniform float uTime; varying vec3 vDir; ${GLSL_NOISE} ${SKY_COLOR}
    void main() {
      vec3 d = normalize(vDir);
      vec3 c = skyCol(d, uSun);
      float sd = max(dot(d, uSun), 0.0);
      // the sun: a disc bright enough to bloom, flattened a little by the haze
      c += vec3(1.0, 0.86, 0.62) * smoothstep(0.99955, 0.99975, sd) * 2.6;
      // long streaks of cloud low over the sea, lit pink and gold from below
      if (d.y > 0.0) {
        vec2 q = d.xz / (d.y + 0.08) * vec2(0.55, 1.6) + vec2(uTime * 0.004, 0.0);
        float n = fbm(q * 0.9);
        float band = smoothstep(0.02, 0.1, d.y) * (1.0 - smoothstep(0.22, 0.42, d.y));
        float cl = smoothstep(0.52, 0.78, n) * band;
        vec3 lit = mix(vec3(0.95, 0.42, 0.42), vec3(1.0, 0.78, 0.45), pow(sd, 3.0));
        c = mix(c, lit * (0.75 + 0.5 * pow(sd, 2.0)), cl * 0.75);
      }
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = -10; scene.add(sky);

/* ------------------------------------------------------------------ the sea: beyond the far end, the sun's path on it */
const SHORE = -27;
const seaU = { uTime: { value: 0 }, uSun: { value: SUN } };
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1400, 1, 1), new THREE.ShaderMaterial({
  uniforms: seaU, fog: false,
  vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime; uniform vec3 uSun; varying vec3 vW; ${GLSL_NOISE} ${SKY_COLOR}
    void main() {
      vec3 V = normalize(cameraPosition - vW);
      vec2 p = vW.xz;
      // a moving surface: long swells and small chop
      float e = 0.25;
      float h0 = fbm(p * 0.12 + vec2(uTime * 0.05, uTime * 0.08)) + 0.5 * fbm(p * 0.6 - vec2(uTime * 0.2, 0.0));
      float hx = fbm((p + vec2(e, 0.0)) * 0.12 + vec2(uTime * 0.05, uTime * 0.08)) + 0.5 * fbm((p + vec2(e, 0.0)) * 0.6 - vec2(uTime * 0.2, 0.0));
      float hz = fbm((p + vec2(0.0, e)) * 0.12 + vec2(uTime * 0.05, uTime * 0.08)) + 0.5 * fbm((p + vec2(0.0, e)) * 0.6 - vec2(uTime * 0.2, 0.0));
      vec3 N = normalize(vec3((h0 - hx) * 1.6, 1.0, (h0 - hz) * 1.6));
      vec3 R = reflect(-V, N); R.y = abs(R.y);
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 deep = vec3(0.05, 0.13, 0.2), shallow = vec3(0.1, 0.32, 0.36);
      float dist = length(vW.xz - cameraPosition.xz);
      vec3 water = mix(shallow, deep, smoothstep(10.0, 120.0, dist));
      vec3 c = mix(water, skyCol(R, uSun), clamp(fres * 1.15, 0.0, 1.0));
      // the glitter path toward the sun
      float sp = pow(max(dot(R, uSun), 0.0), 340.0);
      float glint = sp * 4.0 + pow(max(dot(R, uSun), 0.0), 40.0) * 0.18;
      c += vec3(1.0, 0.72, 0.42) * glint;
      // the far haze over the horizon
      vec3 haze = skyCol(normalize(vec3(-V.x, 0.01, -V.z)), uSun);
      c = mix(c, haze, smoothstep(140.0, 1100.0, dist));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.32, SHORE - 700); scene.add(sea);

/* ------------------------------------------------------------------ the sand */
function noiseCanvas(size, seed, draw) {
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d', { willReadFrequently: true });
  draw(g, size, r); return c;
}
const sandH = noiseCanvas(512, 7, (g, S, r) => {
  // the height of the sand: grains, footprint scuffs and the soft ridges a rake leaves
  const img = g.createImageData(S, S), d = img.data;
  const lowF = new Float32Array(64 * 64); for (let i = 0; i < lowF.length; i++) lowF[i] = r();
  const low = (x, y) => { const X = (x / S) * 64, Y = (y / S) * 64, i = Math.floor(X), j = Math.floor(Y), u = X - i, v = Y - j, at = (a, b) => lowF[((b & 63) * 64) + (a & 63)];
    return lerp(lerp(at(i, j), at(i + 1, j), u), lerp(at(i, j + 1), at(i + 1, j + 1), u), v); };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = 0.5 + 0.28 * (low(x, y) - 0.5) + 0.16 * Math.sin((x + low(y, x) * 40) * 0.09) * 0.5 + (r() - 0.5) * 0.35;
    const k = (y * S + x) * 4, c = clamp(v, 0, 1) * 255; d[k] = d[k + 1] = d[k + 2] = c; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
function normalFromHeight(src, strength) {
  const S = src.width, g = src.getContext('2d'), h = g.getImageData(0, 0, S, S).data;
  const c = document.createElement('canvas'); c.width = c.height = S; const o = c.getContext('2d'), img = o.createImageData(S, S), d = img.data;
  const at = (x, y) => h[((((y + S) % S) * S + ((x + S) % S)) * 4)] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (at(x - 1, y) - at(x + 1, y)) * strength, ny = (at(x, y - 1) - at(x, y + 1)) * strength, l = Math.hypot(nx, ny, 1);
    const k = (y * S + x) * 4; d[k] = (nx / l * 0.5 + 0.5) * 255; d[k + 1] = (ny / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
  }
  o.putImageData(img, 0, 0); return c;
}
const sandCol = noiseCanvas(512, 11, (g, S, r) => {
  const img = g.createImageData(S, S), d = img.data, H = sandH.getContext('2d').getImageData(0, 0, S, S).data;
  for (let i = 0; i < S * S; i++) {
    const h = H[i * 4] / 255, k = i * 4, n = r();
    const base = [222, 192, 148], dark = [176, 140, 98];
    const m = clamp(0.62 - h * 0.65 + (n - 0.5) * 0.3, 0, 1);
    d[k] = lerp(base[0], dark[0], m) + (n > 0.985 ? 30 : 0); d[k + 1] = lerp(base[1], dark[1], m) + (n > 0.985 ? 26 : 0); d[k + 2] = lerp(base[2], dark[2], m) + (n > 0.992 ? 30 : 0); d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
const sandMap = new THREE.CanvasTexture(sandCol); sandMap.colorSpace = THREE.SRGBColorSpace;
const sandNrm = new THREE.CanvasTexture(normalFromHeight(sandH, 4.2)); sandNrm.colorSpace = THREE.NoColorSpace;
for (const t of [sandMap, sandNrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.anisotropy = maxAniso; }
const sandMat = std(0xffffff, 1, { map: sandMap, normalMap: sandNrm, normalScale: new THREE.Vector2(0.9, 0.9) });
const beach = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), sandMat);
beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0, SHORE + 120); beach.receiveShadow = true; scene.add(beach);
// the wet strip at the water's edge and the foam that washes up it
const wet = new THREE.Mesh(new THREE.PlaneGeometry(240, 9), std(0x9a7c58, 0.35, { metalness: 0.05, transparent: true, opacity: 0.82 }));
wet.rotation.x = -Math.PI / 2; wet.position.set(0, 0.006, SHORE + 3.5); scene.add(wet);
const foamU = { uTime: { value: 0 } };
const foam = new THREE.Mesh(new THREE.PlaneGeometry(240, 7, 1, 1), new THREE.ShaderMaterial({
  uniforms: foamU, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW; ${GLSL_NOISE}
    void main() {
      float wave = 0.5 + 0.5 * sin(uTime * 0.55 + vW.x * 0.03);
      float edge = vUv.y - (0.25 + 0.45 * wave);
      float n = fbm(vec2(vW.x * 0.4, vW.z * 0.9 + uTime * 0.3));
      float a = smoothstep(0.12, 0.0, abs(edge + (n - 0.5) * 0.18)) * 0.85 + smoothstep(0.0, -0.4, edge) * 0.25 * n;
      gl_FragColor = vec4(vec3(0.98, 0.93, 0.86), a * smoothstep(0.0, 0.1, vUv.y));
    }`,
}));
foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.012, SHORE + 0.3); scene.add(foam);

/* ------------------------------------------------------------------ the court: blue tape lines, the net */
const LINE = 0x2f6fe0;
{
  const tape = std(LINE, 0.5, { emissive: 0x0a1a40, emissiveIntensity: 0.3 });
  const W = 0.06, y = 0.008;
  const add = (w, l, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, l), tape); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); };
  add(W, 16 + W, -4, 0); add(W, 16 + W, 4, 0); add(8 + W, W, 0, -8); add(8 + W, W, 0, 8);
  // the anchors at the corners
  const anc = std(0xe8e2d2, 0.6);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), anc); m.position.set(sx * 4, 0.01, sz * 8); scene.add(m); }
}
const net = (() => {
  const g = new THREE.Group(); scene.add(g);
  const postMat = std(0x1e5bd6, 0.45), padMat = std(0x16a3c4, 0.8);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 2.95, 14), postMat); post.position.set(sx * 4.85, 1.475, 0); post.castShadow = true; g.add(post);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.8, 16), padMat); pad.position.set(sx * 4.85, 0.9, 0); pad.castShadow = true; g.add(pad);
    // guy ropes to the sand
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.6, 5), std(0xdedede, 0.6));
    rope.position.set(sx * 6.1, 1.4, 0); rope.rotation.z = sx * 0.88; g.add(rope);
  }
  // the mesh: 10 cm squares, a white band along the top and the bottom, side bands at the antennae
  const tex = canvasTex(1024, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(20,22,26,0.85)'; c.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 85) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += h / 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h * 0.075); c.fillRect(0, h * 0.95, w, h * 0.05);
    c.fillStyle = '#1e5bd6'; c.fillRect(0, h * 0.008, w, h * 0.02);
  }, { aniso: maxAniso });
  const geo = new THREE.PlaneGeometry(8.5, 1.0, 34, 6);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 }));
  mesh.position.set(0, COURT.net - 0.5, 0); mesh.castShadow = true; g.add(mesh);
  const base = geo.attributes.position.array.slice();
  // the antennae: red and white, 1.8 m, at the sidelines
  const ant = canvasTex(8, 64, (c, w, h) => { for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? '#f6f2ea' : '#e2302f'; c.fillRect(0, (i * h) / 18, w, h / 18 + 1); } });
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.8, 6), std(0xffffff, 0.5, { map: ant }));
    a.position.set(sx * COURT.antenna, COURT.net - 1 + 0.9 + 0.5 - 0.1, 0); a.castShadow = true; g.add(a);
  }
  // a ball into the net: the mesh bellies out and settles
  let hit = null;
  return {
    hit(x, y, dir, k = 1) { hit = { x, y, dir, t: 0, k }; },
    update(dt) {
      if (!hit) return;
      hit.t += dt; const a = geo.attributes.position.array, e = Math.exp(-hit.t * 4) * hit.k;
      for (let i = 0; i < a.length; i += 3) {
        const dx = base[i] - hit.x, dy = base[i + 1] + (COURT.net - 0.5) - hit.y, r = Math.hypot(dx, dy * 1.6);
        a[i + 2] = hit.dir * 0.22 * e * Math.exp(-r * r * 1.2) * Math.cos(hit.t * 14 - r * 2);
      }
      geo.attributes.position.needsUpdate = true;
      if (hit.t > 1.6) { hit = null; for (let i = 2; i < a.length; i += 3) a[i] = 0; geo.attributes.position.needsUpdate = true; }
    },
  };
})();

/* ------------------------------------------------------------------ the venue: a grandstand, boards, flags, palms, lights */
const crowd = { fans: [], excite: 0, groan: 0, clap: 0 };
function drawBoards(c, w, h) {
  const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#0f3b5c'); g.addColorStop(0.5, '#135a7a'); g.addColorStop(1, '#0f3b5c');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.font = 'italic 800 64px "Kanit", "Arial Narrow", sans-serif'; c.textBaseline = 'middle';
  const items = ['SUNSET SPIKE', 'THUDINEST BEACH CUP', 'THUDINEST.COM', 'COIMBATORE · MTP ROAD'];
  let x = 40;
  for (let i = 0; i < 8; i++) { const t = items[i % items.length]; c.fillStyle = i % 2 ? '#ffd27a' : '#f4f1ea'; c.fillText(t, x, h / 2 + 4); x += c.measureText(t).width + 90; c.fillStyle = '#ff7b54'; c.beginPath(); c.arc(x - 45, h / 2, 9, 0, TAU); c.fill(); }
}
const boardTex = canvasTex(2048, 128, drawBoards);
boardTex.wrapS = THREE.RepeatWrapping;
// the page's display face, once it has arrived, on the boards too
if (document.fonts && document.fonts.load) document.fonts.load('italic 800 64px "Kanit"').then((f) => { if (!f.length) return; drawBoards(boardTex.image.getContext('2d'), 2048, 128); boardTex.needsUpdate = true; }).catch(() => {});
{
  // low padded boards around the playing area, with gaps at the corners
  const mat = std(0xffffff, 0.7, { map: boardTex });
  const side = (len, x, z, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.85, 0.12), mat); m.position.set(x, 0.425, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m); m.material.map.repeat.set(len / 16, 1); };
  side(16, 0, -13, 0); side(16, 0, 13, Math.PI); side(22, 8.2, 0, -Math.PI / 2);
}
crowd.stands = [];
{
  // the grandstand along the left sideline: aluminium benches rising from the sand, a canopy over the top rows
  const g = new THREE.Group(); g.position.set(-8.6, 0, 0); g.rotation.y = Math.PI / 2; scene.add(g);
  const rows = 7, len = 24, step = 0.85, rise = 0.48;
  const frame = std(0xa9b2bc, 0.4, { metalness: 0.5 }), bench = std(0xbcc4cd, 0.55, { metalness: 0.2 }), floor = std(0x7a838d, 0.75, { metalness: 0.15 });
  const seats = [];
  for (let r = 0; r < rows; r++) {
    const y = 0.45 + r * rise, z = -(1.2 + r * step);
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.34), bench); b.position.set(0, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b);
    const f = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, step), floor); f.position.set(0, y - 0.42, z - 0.1); f.receiveShadow = true; g.add(f);
    for (let i = 0; i < 28; i++) if (Math.random() < (LITE ? 0.45 : 0.72)) seats.push({ x: -len / 2 + 0.6 + i * ((len - 1.2) / 27) + rand(-0.1, 0.1), y: y + 0.03, z: z - 0.04, ry: 0 });
  }
  for (let i = 0; i <= 8; i++) { const x = -len / 2 + (i * len) / 8; const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, rows * rise + 0.5, 0.08), frame); leg.position.set(x, (rows * rise + 0.5) / 2, -(1.2 + (rows - 1) * step) - 0.25); leg.castShadow = true; g.add(leg); }
  // a sail canopy: pale cloth on poles
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(len + 1, 4.2, 12, 4), std(0xf3ece0, 0.9, { side: THREE.DoubleSide, transparent: true, opacity: 0.94 }));
  const sa = sail.geometry.attributes.position; for (let i = 0; i < sa.count; i++) sa.setZ(i, Math.sin((sa.getX(i) / (len + 1)) * Math.PI * 4) * 0.12 - Math.abs(sa.getY(i)) * 0.06);
  sail.geometry.computeVertexNormals();
  sail.position.set(0, rows * rise + 2.9, -(1.2 + rows * step * 0.55)); sail.rotation.x = -Math.PI / 2 + 0.28; sail.castShadow = true; g.add(sail);
  for (const x of [-len / 2, 0, len / 2]) for (const z of [-0.6, -(1.2 + rows * step)]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, rows * rise + 3.2, 8), frame); p.position.set(x, (rows * rise + 3.2) / 2, z); p.castShadow = true; g.add(p); }
  const fans = buildFans(g, seats, {});
  crowd.fans.push(fans.uniforms);
}
{
  // flags on tall poles, the far side, catching the sea breeze
  const flagTex = [['#ff7b54', '#ffd27a'], ['#1e5bd6', '#f4f1ea'], ['#16a3c4', '#ffd27a']].map(([a, b]) => canvasTex(128, 256, (c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); c.fillStyle = b; c.beginPath(); c.moveTo(0, h * 0.62); c.quadraticCurveTo(w * 0.5, h * 0.48, w, h * 0.66); c.lineTo(w, h * 0.78); c.quadraticCurveTo(w * 0.5, h * 0.6, 0, h * 0.74); c.fill(); }));
  crowd.flags = [];
  for (let i = 0; i < 7; i++) {
    const x = -9 + i * 3, z = -14.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 5.2, 6), std(0xcfd6dd, 0.4, { metalness: 0.6 })); pole.position.set(x, 2.6, z); scene.add(pole);
    const geo = new THREE.PlaneGeometry(0.75, 2.1, 8, 1); geo.translate(0.375, 0, 0);
    const f = new THREE.Mesh(geo, std(0xffffff, 0.8, { map: flagTex[i % 3], side: THREE.DoubleSide })); f.position.set(x + 0.03, 4.1, z); f.rotation.y = 0.3; scene.add(f);
    crowd.flags.push({ geo, base: geo.attributes.position.array.slice(), ph: i * 1.7 });
  }
}
// palms: a curving trunk of rings and a crown of drooping fronds
const frondTex = canvasTex(128, 512, (c, w, h) => {
  c.clearRect(0, 0, w, h);
  c.strokeStyle = '#3d6b2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 0); c.stroke();
  for (let y = 10; y < h; y += 9) {
    const len = (w / 2) * Math.sin((y / h) * Math.PI) * 0.95;
    for (const s of [-1, 1]) { c.strokeStyle = y % 18 ? '#4f8a33' : '#3f7a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, y); c.quadraticCurveTo(w / 2 + s * len * 0.6, y + 4, w / 2 + s * len, y + 20); c.stroke(); }
  }
});
const barkTex = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#7d6247'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 10) { c.fillStyle = y % 20 ? '#6a5139' : '#8e7253'; c.fillRect(0, y, w, 4); } }, { repeat: [1, 6] });
const frondMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85, color: 0xdde8c8 });
const barkMat = std(0xffffff, 0.95, { map: barkTex });
function palm(x, z, h, lean) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new V3(Math.sin(lean) * h * u * u * 0.35, h * u, Math.cos(lean) * h * u * u * 0.35)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.17, 8, false), barkMat); trunk.castShadow = true; g.add(trunk);
  const top = pts[8];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + rand(-0.2, 0.2), len = rand(2.6, 3.6);
    const geo = new THREE.PlaneGeometry(0.85, len, 1, 8); geo.translate(0, len / 2, 0);
    const pa = geo.attributes.position; for (let k = 0; k < pa.count; k++) { const y = pa.getY(k) / len; pa.setZ(k, -y * y * len * 0.55); }
    geo.computeVertexNormals();
    const f = new THREE.Mesh(geo, frondMat); f.position.copy(top); f.rotation.set(Math.PI / 2 - rand(0.15, 0.55), a, 0, 'YXZ'); f.castShadow = !LITE; g.add(f);
  }
  return g;
}
for (const [x, z, h, l] of [[-14, -16, 8.5, 0.6], [-17.5, -9, 7.6, 1.2], [-15, 6, 8.8, 2.4], [15, -17, 9.2, -0.5], [18.5, -6, 7.4, -1.4], [14.5, 9, 8.2, -2.2], [-24, -22, 9.6, 0.4], [25, -24, 8.9, -0.3], [-30, 8, 8, 1.8], [31, 14, 9, -2]].slice(0, LITE ? 6 : 10)) palm(x, z, h, l);
// beach umbrellas along the right, past the boards
{
  const cols = [0xff7b54, 0xffd27a, 0x16a3c4, 0xf4f1ea];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); g.position.set(15.5 + (i % 2) * 2.6, 0, -11 + i * 5.2); scene.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), std(0xe9e4d8, 0.5)); pole.position.y = 1.15; g.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.5, 12, 1, true), std(cols[i % 4], 0.85, { side: THREE.DoubleSide })); top.position.y = 2.35; top.castShadow = true; g.add(top);
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 1.8), std(0xf4f1ea, 0.6)); lounger.position.set(0.9, 0.3, 0); lounger.rotation.z = 0.1; lounger.castShadow = true; g.add(lounger);
  }
}
// festoon lights round the court on tall poles, glowing as the sun goes down
const bulbs = (() => {
  // three strings (the far end and both sides; none across the near end, between the camera and the play)
  const poles = [[-7.6, 12.6], [-7.6, -12.6], [7.6, -12.6], [7.6, 12.6]], H = 5.4;
  const pts = [], wire = [];
  for (const [x, z] of poles) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, H, 8), std(0x3a3f47, 0.5, { metalness: 0.4 })); p.position.set(x, H / 2, z); p.castShadow = true; scene.add(p); }
  for (let s = 0; s < 3; s++) {
    const [x0, z0] = poles[s], [x1, z1] = poles[s + 1], n = 16, seg = 48, sag = 0.35 + Math.hypot(x1 - x0, z1 - z0) * 0.035;
    const at = (u) => new V3(lerp(x0, x1, u), H - 0.12 - Math.sin(u * Math.PI) * sag, lerp(z0, z1, u));
    for (let i = 0; i < seg; i++) wire.push(at(i / seg), at((i + 1) / seg));
    for (let i = 0; i < n; i++) pts.push(at((i + 0.5) / n).add(new V3(0, -0.07, 0)));
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: 0x2a2026 })));
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.28) });
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), mat, pts.length);
  pts.forEach((p, i) => { _m4.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(i, _m4); }); scene.add(inst);
  return { mat, set(k) { mat.color.setRGB(1.0, 0.6, 0.28).multiplyScalar(lerp(0.9, 1.7, k)); } };
})();
// the first referee's stand at the post on the grandstand's side (out of the side camera's way)
const refStand = new THREE.Group(); refStand.position.set(-5.55, 0, 0); scene.add(refStand);
{
  const m = std(0xdfe5ec, 0.4, { metalness: 0.5 });
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), m); l.position.set(x, 0.75, z); refStand.add(l); }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), m); deck.position.y = 1.5; deck.castShadow = true; refStand.add(deck);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.8), m); rail.position.set(-0.38, 2.25, 0); refStand.add(rail); // behind him
  for (const z of [-0.38, 0.38]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.04), m); post.position.set(-0.38, 1.88, z); refStand.add(post); }
}

/* ------------------------------------------------------------------ lights: the low sun, the sky, a warm bounce off the sand */
const LIGHT = new V3(-0.19, 0.34, -1).normalize(); // the sun's disc sits lower: a light this low would leave the sand unlit
const sunLight = new THREE.DirectionalLight(0xffa766, 3.4);
sunLight.position.copy(LIGHT).multiplyScalar(60); sunLight.target.position.set(0, 0, 2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048);
Object.assign(sunLight.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 20, far: 110 });
sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.03;
scene.add(sunLight, sunLight.target);
const hemi = new THREE.HemisphereLight(0xa59ad8, 0xd9a070, 0.85); scene.add(hemi);
const fill = new THREE.DirectionalLight(0xffd9b8, 0.55); fill.position.set(6, 9, 26); scene.add(fill); // the near side's faces

/* ------------------------------------------------------------------ the ball, its shadow, the landing marker */
const ballTex = canvasTex(512, 256, (c, w, h) => {
  // three colours in curving panels, the way a beach ball's are cut
  c.fillStyle = '#f6f1e2'; c.fillRect(0, 0, w, h);
  const bands = ['#ffc81e', '#0d47d0', '#fbf6ea', '#ffc81e', '#0d47d0', '#fbf6ea'];
  for (let i = 0; i < 6; i++) {
    c.fillStyle = bands[i]; c.beginPath();
    for (let x = 0; x <= w; x += 4) { const y = (h * (i + 0.5)) / 6 + Math.sin((x / w) * TAU * 2 + i) * 10; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    for (let x = w; x >= 0; x -= 4) { const y = (h * (i + 1.5)) / 6 + Math.sin((x / w) * TAU * 2 + i + 1) * 10; c.lineTo(x, y); }
    c.fill();
  }
  c.strokeStyle = 'rgba(40,40,40,0.25)'; c.lineWidth = 2;
  for (let i = 1; i < 6; i++) { c.beginPath(); for (let x = 0; x <= w; x += 4) { const y = (h * (i + 0.5)) / 6 + Math.sin((x / w) * TAU * 2 + i) * 10; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
});
const ballGeo = new THREE.SphereGeometry(COURT.R, 24, 16);
const ballObj = new THREE.Mesh(ballGeo, std(0xffffff, 0.45, { map: ballTex, emissive: 0xffffff, emissiveMap: ballTex, emissiveIntensity: 0.45 }));
ballObj.scale.setScalar(1.3); ballObj.castShadow = true; scene.add(ballObj);
// what makes it readable from the broadcast camera: a dark rim (against the bright sky and sand) and a soft light
// around it (against the shade and the crowd); its size is kept to a minimum on screen in updateBall
const ballRim = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0x1b0d22, side: THREE.BackSide }));
ballRim.scale.setScalar(1.2); ballObj.add(ballRim);
const ballHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,250,225,0.95)'); g.addColorStop(0.45, 'rgba(255,236,170,0.35)'); g.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }),
  transparent: true, depthWrite: false, opacity: 0.7 }));
ballHalo.scale.setScalar(COURT.R * 5.5); ballHalo.renderOrder = 4; ballObj.add(ballHalo);
// a faint plumb line from a high ball to its spot on the sand: where it is, not only where it looks to be
const dropLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, -1, 0)]), new THREE.LineBasicMaterial({ color: 0xfff4e0, transparent: true, opacity: 0.4, depthWrite: false }));
dropLine.frustumCulled = false; scene.add(dropLine);
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: 0x2a1608, transparent: true, opacity: 0.5, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; scene.add(blob);
const marker = (() => {
  const tex = canvasTex(128, 128, (c, w, h) => { c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.arc(w / 2, h / 2, w * 0.36, 0, TAU); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.36, h * 0.36); c.lineTo(w * 0.64, h * 0.64); c.moveTo(w * 0.64, h * 0.36); c.lineTo(w * 0.36, h * 0.64); c.stroke(); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xffe08a }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 3; m.visible = false; scene.add(m);
  return m;
})();
// your ring: under your feet, bright when a press now would be perfect
const ring = (() => {
  const tex = canvasTex(128, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.62, 'rgba(255,255,255,0.95)'); g.addColorStop(0.8, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0x4fe3c1 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.025; m.renderOrder = 3; scene.add(m);
  return m;
})();
// sand thrown up by a landing, a dive or the ball
const puffs = (() => {
  const N = 160, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), al = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('alpha', new THREE.BufferAttribute(al, 1));
  const tex = canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(232,206,160,1)'); g.addColorStop(1, 'rgba(232,206,160,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, size: { value: 46 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float alpha; varying float vA; uniform float size; void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * (1.0 + (1.0 - alpha) * 1.5) / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying float vA; void main() { vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(c.rgb * 0.95, c.a * vA * 0.55); }` });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  const P = []; for (let i = 0; i < N; i++) P.push({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1 });
  let k = 0;
  return {
    burst(x, z, n = 10, power = 1) { for (let i = 0; i < n; i++) { const p = P[k++ % N]; p.x = x + rand(-0.15, 0.15); p.z = z + rand(-0.15, 0.15); p.y = 0.05; const a = rand(0, TAU), s = rand(0.4, 1.6) * power; p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = rand(0.8, 2.4) * power; p.max = p.life = rand(0.5, 1.0); } },
    update(dt) { for (let i = 0; i < N; i++) { const p = P[i]; if (p.life > 0) { p.life -= dt; p.vy -= 6 * dt; p.x += p.vx * dt; p.y = Math.max(0.02, p.y + p.vy * dt); p.z += p.vz * dt; } pos[i * 3] = p.x; pos[i * 3 + 1] = p.life > 0 ? p.y : -10; pos[i * 3 + 2] = p.z; al[i] = Math.max(0, p.life / p.max); } geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true; },
  };
})();
// a streak behind a hard-hit ball
const trail = (() => {
  const N = 14, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 2 * 3), idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);
  const hist = Array.from({ length: N }, () => new V3()); let k = 0, n = 0;
  return {
    set(on) { k = on ? 1 : 0; },
    update(p, dt) {
      // the last N positions, newest first (copied along, no new vectors each frame)
      if (!n) { for (const h of hist) h.copy(p); n = 1; }
      for (let i = N - 1; i > 0; i--) hist[i].copy(hist[i - 1]);
      hist[0].copy(p);
      mat.opacity = damp(mat.opacity, k * 0.42, 10, dt);
      camera.getWorldDirection(_v1);
      for (let i = 0; i < N; i++) {
        const a = hist[i], b = hist[Math.min(i + 1, N - 1)];
        _v2.subVectors(a, b); if (_v2.lengthSq() < 1e-8) _v2.set(0, 1, 0);
        _v3.crossVectors(_v2, _v1).normalize().multiplyScalar(COURT.R * 0.8 * (1 - i / N));
        pos[i * 6] = a.x + _v3.x; pos[i * 6 + 1] = a.y + _v3.y; pos[i * 6 + 2] = a.z + _v3.z;
        pos[i * 6 + 3] = a.x - _v3.x; pos[i * 6 + 4] = a.y - _v3.y; pos[i * 6 + 5] = a.z - _v3.z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
})();
const STRIP = /^mixamorig\d*:?/;
const bonesOf = (root) => { const m = {}; root.traverse((o) => { if (o.isBone) { const n = o.name.replace(STRIP, ''); if (!m[n]) m[n] = o; } }); return m; };
const ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const swapSide = (n) => (n.startsWith('Left') ? `Right${n.slice(4)}` : n.startsWith('Right') ? `Left${n.slice(5)}` : n);
const _q1 = new Q(), _q2 = new Q(), _q3 = new Q(), _qs = new Q(), _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _v5 = new V3(), _m1 = new THREE.Matrix4();
const Y_UP = new V3(0, 1, 0);
const _qw = new Q(); // setWorldQuat's own: callers pass the shared temporaries
function setWorldQuat(obj, qW) { obj.parent.getWorldQuaternion(_qw); obj.quaternion.copy(_qw.invert()).multiply(qW); }

/* Calibration, once per character: its T-pose, scale, legs, and the frame of each hand */
function calibrate(gltf, height) {
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
  const hipsParentQ = B.Hips.parent.getWorldQuaternion(new Q());
  const hipsParentInv = B.Hips.parent.matrixWorld.clone().invert();
  const legLen = at(B.LeftUpLeg).distanceTo(at(B.LeftLeg)) + at(B.LeftLeg).distanceTo(at(B.LeftFoot));
  const hipH = at(B.Hips).y;
  const ankleH = (at(B.LeftFoot).y + at(B.RightFoot).y) / 2;
  const footFwd = B.LeftToeBase ? at(B.LeftToeBase).sub(at(B.LeftFoot)).setY(0).length() : 0.12;
  // the fist: the middle knuckle (or index), a little out of the palm; palm normal from the knuckles
  const hand = {};
  for (const s of ['Left', 'Right']) {
    const H = B[`${s}Hand`], k = B[`${s}HandMiddle1`] || B[`${s}HandIndex1`] || H.children.find((c) => c.isBone);
    const i1 = B[`${s}HandIndex1`], p1 = B[`${s}HandPinky1`] || B[`${s}HandRing1`];
    const wrist = at(H), a = at(k).sub(wrist).normalize();
    const across = i1 && p1 ? at(i1).sub(at(p1)).normalize() : new V3(0, 0, 1);
    const palm = s === 'Right' ? new V3().crossVectors(across, a).normalize() : new V3().crossVectors(a, across).normalize();
    const grip = at(k).addScaledVector(palm, 0.02).addScaledVector(a, -0.012);
    const hq = H.getWorldQuaternion(new Q()), inv = hq.clone().invert();
    // racket frame in a handshake grip: shaft out of the fist toward the thumb side, face along the palm
    const thumb = across.clone().addScaledVector(a, -across.dot(a)).normalize();
    const shaft = a.clone().multiplyScalar(Math.cos(0.75)).addScaledVector(thumb, Math.sin(0.75)).normalize();
    const face = palm.clone().addScaledVector(shaft, -palm.dot(shaft)).normalize();
    const xAxis = new V3().crossVectors(shaft, face);
    const rq = new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, shaft, face));
    hand[s] = {
      aL: a.clone().applyQuaternion(inv), palmL: palm.clone().applyQuaternion(inv), // knuckles and palm in the hand's frame
      gripOff: grip.sub(wrist).applyQuaternion(inv), // wrist to grip, in the hand's frame
      racket: inv.clone().multiply(rq), // racket frame relative to the hand
      fore: B[`${s}Hand`].position.clone().normalize(), // the forearm's long axis (its own frame)
    };
  }
  // finger curls toward the palm, measured at the knuckles
  const curl = {};
  for (const s of ['Left', 'Right']) {
    const i1 = B[`${s}HandIndex1`], p1 = B[`${s}HandPinky1`] || B[`${s}HandRing1`], H = B[`${s}Hand`];
    const k = B[`${s}HandMiddle1`] || i1;
    if (!i1 || !p1 || !k) continue;
    const a = at(k).sub(at(H)).normalize(), across = at(i1).sub(at(p1)).normalize();
    const palm = s === 'Right' ? new V3().crossVectors(across, a).normalize() : new V3().crossVectors(a, across).normalize();
    for (const f of FINGERS) for (let j = 1; j <= 3; j++) {
      const n = `${s}Hand${f}${j}`, b = B[n], c = B[`${s}Hand${f}${j + 1}`] || (b && b.children.find((x) => x.isBone));
      if (!b || !c) continue;
      const dir = at(c).sub(at(b)).normalize();
      curl[n] = new V3().crossVectors(dir, palm).normalize().applyQuaternion(b.getWorldQuaternion(new Q()).invert());
    }
  }
  return { gltf, S, offY: -box.min.y * S, bind, parent, hipsParentQ, hipsParentInv, legLen, hipH, ankleH, footFwd, hand, curl, height };
}

/* the clips (players/moves.json): each bone's change from the T-pose, so any Mixamo character can wear them */
let CLIPS = null, CLIP_BI = {};
function clipQ(c, n, f, out) {
  const nb = CLIPS.bones.length, b = CLIP_BI[n], i = Math.min(c.n - 2, Math.floor(f)), u = f - i;
  _q3.fromArray(c.q, ((i + 1) * nb + b) * 4);
  return out.fromArray(c.q, (i * nb + b) * 4).slerp(_q3, u);
}
function clipHipsY(c, f) { const i = Math.min(c.n - 2, Math.floor(f)), u = f - i; return lerp(c.hips[i * 3 + 1], c.hips[i * 3 + 4], u); }
// frame index for a time in the clip (looping or held at the end)
function clipFrame(c, t, loop) { const dur = (c.n - 1) / c.fps; if (loop) t = ((t % dur) + dur) % dur; return clamp(t * c.fps, 0, c.n - 1); }

/* swing-twist: the part of q that turns about axis */
function twistOf(q, axis, out) {
  const d = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  out.set(axis.x * d, axis.y * d, axis.z * d, q.w);
  const l = Math.hypot(out.x, out.y, out.z, out.w); if (l < 1e-8) return out.identity();
  return out.set(out.x / l, out.y / l, out.z / l, out.w / l);
}

/* two-bone IK (shoulder-elbow-wrist, hip-knee-ankle): the end on the target, the middle joint toward the pole;
   a target out of reach stretches the limb a little (up to `stretch`) */
const _A = new V3(), _B = new V3(), _C = new V3(), _D = new V3(), _E = new V3(), _P = new V3(), _T = new V3(), _qa = new Q(), _qb = new Q();
function twoBone(a, b, c, target, pole, restB, restC, stretch = 1.08) {
  b.position.copy(restB); c.position.copy(restC); a.updateMatrixWorld(true);
  a.getWorldPosition(_A); b.getWorldPosition(_B); c.getWorldPosition(_C);
  let l1 = _A.distanceTo(_B), l2 = _B.distanceTo(_C);
  _D.subVectors(target, _A); let d = _D.length(); if (d < 1e-5) return;
  if (d > (l1 + l2) * 0.998) {
    const f = Math.min(stretch, d / ((l1 + l2) * 0.998));
    b.position.multiplyScalar(f); c.position.multiplyScalar(f); a.updateMatrixWorld(true);
    b.getWorldPosition(_B); c.getWorldPosition(_C); l1 *= f; l2 *= f;
  }
  _D.multiplyScalar(1 / d); d = clamp(d, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  _E.subVectors(pole, _A); _E.addScaledVector(_D, -_E.dot(_D));
  if (_E.lengthSq() < 1e-10) { _E.subVectors(_B, _A); _E.addScaledVector(_D, -_E.dot(_D)); }
  _E.normalize();
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  _P.copy(_A).addScaledVector(_D, l1 * cosA).addScaledVector(_E, l1 * sinA);
  _qa.setFromUnitVectors(_B.sub(_A).normalize(), _T.copy(_P).sub(_A).normalize());
  setWorldQuat(a, a.getWorldQuaternion(_qb).premultiply(_qa)); a.updateMatrixWorld(true);
  b.getWorldPosition(_B); c.getWorldPosition(_C);
  _qa.setFromUnitVectors(_C.sub(_B).normalize(), _T.copy(target).sub(_B).normalize());
  setWorldQuat(b, b.getWorldQuaternion(_qb).premultiply(_qa)); b.updateMatrixWorld(true);
}

/* One player on the sand: the model and the pose it is in. The pose is built fresh every frame from the clips (legs
   and body), then the volleyball (both hands, the jump, the crouch, the turn) and the head following the ball. */
class Body {
  constructor(K, cfg, opts = {}) {
    this.K = K; this.cfg = cfg;
    this.root = new THREE.Group(); scene.add(this.root);
    this.model = THREE.SkeletonUtils.clone(K.gltf.scene);
    this.model.scale.setScalar(K.S); this.model.position.y = K.offY;
    this.root.add(this.model);
    this.B = bonesOf(this.model);
    this.model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = !LITE; o.frustumCulled = false; } });
    this.rest = {}; for (const s of ['Left', 'Right']) for (const n of ['ForeArm', 'Hand', 'Leg', 'Foot']) this.rest[s + n] = this.B[s + n].position.clone();
    this.restLocal = {}; this.model.traverse((o) => { if (o.isBone) this.restLocal[o.uuid] = o.quaternion.clone(); });
    this.curl(0.25, 0.25);
    this.T = {}; this.T2 = {}; for (const n of ORDER) { this.T[n] = new Q(); this.T2[n] = new Q(); }
    this.yaw = 0; this.hs = K.height / 1.8;
    this.loco = { run: 0, shuf: 0, idle: 1, tRun: 0, tShuf: 0, tIdle: Math.random() * 9, mirror: 1, crouch: 0 };
    this.react = null; // a clip played whole: cheer, missed, dive
    this.look = new V3(0, 1.5, 0);
    this.leftHold = false; // the left hand holds a ball (serving)
  }
  curl(right, left) {
    const B = this.B, K = this.K;
    for (const [s, g] of [['Right', right], ['Left', left]]) for (const f of FINGERS) for (let j = 1; j <= 3; j++) {
      const n = `${s}Hand${f}${j}`, b = B[n]; if (!b || !K.curl[n]) continue;
      const amt = f === 'Thumb' ? g * 0.45 : g * (j === 1 ? 1.0 : j === 2 ? 1.15 : 0.8);
      b.quaternion.copy(this.restLocal[b.uuid]).multiply(_q1.setFromAxisAngle(K.curl[n], amt));
    }
  }
  dispose() { scene.remove(this.root); }
  // a point in the body frame (r, u, f) to the world
  toWorld(r, u, f, out, yawAdd = 0) {
    const y = this.yaw + yawAdd, c = Math.cos(y), s = Math.sin(y), x = -r * this.hs, z = f * this.hs;
    return out.set(this.root.position.x + x * c + z * s, this.root.position.y + u * this.hs, this.root.position.z - x * s + z * c);
  }
  dirWorld(r, u, f, out, yawAdd = 0) {
    const y = this.yaw + yawAdd, c = Math.cos(y), s = Math.sin(y), x = -r;
    return out.set(x * c + f * s, u, -x * s + f * c).normalize();
  }
  toBody(w, out) { // world point to (r, u, f)
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw), dx = w.x - this.root.position.x, dz = w.z - this.root.position.z;
    const x = dx * c - dz * s, z = dx * s + dz * c;
    return out.set(-x / this.hs, (w.y - this.root.position.y) / this.hs, z / this.hs);
  }

  /* the clips: blend of idle, run and sidestep (or a reaction played whole) into this.T, hips height into this.hipsY */
  clipPose(dt) {
    const K = this.K, L = this.loco, C = CLIPS.clips, T = this.T, T2 = this.T2;
    const parts = [];
    if (this.react) {
      const R = this.react, c = C[R.key]; R.t += dt * (R.rate || 1);
      parts.push([c, clipFrame(c, R.t + (R.from || 0), R.loop), R.mirror || 1, 1]);
    } else {
      if (L.idle > 0.001) parts.push([C.idle, clipFrame(C.idle, L.tIdle, true), 1, L.idle]);
      if (L.run > 0.001) parts.push([C.run, clipFrame(C.run, L.tRun, true), 1, L.run]);
      if (L.shuf > 0.001) parts.push([C.shuffle, clipFrame(C.shuffle, L.tShuf, true), L.mirror, L.shuf]);
    }
    let wsum = 0, hy = 0;
    for (const [c, f, mirror, w] of parts) {
      for (const n of ORDER) {
        clipQ(c, mirror < 0 ? swapSide(n) : n, f, _q2);
        if (mirror < 0) _q2.set(_q2.x, -_q2.y, -_q2.z, _q2.w);
        T2[n].copy(_q2).multiply(K.bind[n]);
        if (wsum === 0) T[n].copy(T2[n]); else T[n].slerp(T2[n], w / (wsum + w));
      }
      hy = wsum === 0 ? clipHipsY(c, f) - c.rest : lerp(hy, clipHipsY(c, f) - c.rest, w / (wsum + w));
      wsum += w;
    }
    this.hipsY = K.hipH + hy * K.legLen;
  }
  applyT(hipX, hipY, hipZ) {
    const K = this.K, B = this.B, T = this.T;
    for (const n of ORDER) {
      const pn = K.parent[n], pq = n === 'Hips' ? K.hipsParentQ : T[pn];
      B[n].quaternion.copy(_q1.copy(pq).invert()).multiply(T[n]);
    }
    for (const k in this.rest) B[k].position.copy(this.rest[k]);
    B.Hips.position.set(hipX, hipY, hipZ).applyMatrix4(K.hipsParentInv); // root space (feet on y = 0) to the hips' parent
  }

  /* pose: everything about this frame (see Players.animate) */
  pose(st, dt) {
    const K = this.K, B = this.B;
    this.root.position.set(st.x, (st.lift || 0) + (st.base || 0), st.z); // lift: off the sand in a jump; base: standing on something
    // the whole rotation, not just its y: a replay writes the root's quaternion, and three.js reads a turn past 90°
    // back as x = z = 180°, which would stay and mirror every yaw after it (the player facing away from the net)
    this.yaw = st.yaw; this.root.rotation.set(0, st.yaw, 0);
    this.clipPose(dt);
    // the clip's legs first, to find where its feet are
    this.applyT(0, this.hipsY, 0);
    this.root.updateMatrixWorld(true);
    const feet = this.feet || (this.feet = { Left: new V3(), Right: new V3(), qL: new Q(), qR: new Q() });
    B.LeftFoot.getWorldPosition(feet.Left); B.RightFoot.getWorldPosition(feet.Right);
    B.LeftFoot.getWorldQuaternion(feet.qL); B.RightFoot.getWorldQuaternion(feet.qR);
    // then the body lowered into its stance (a lunge also moves the root and plants the feet: see Players.animate)
    const hy = this.hipsY + (st.tall || 0) * (this.K.hipH * 0.985 - this.hipsY);
    this.applyT(0, hy - (st.crouch || 0) * this.hs, 0);
    this.root.updateMatrixWorld(true);
    // the chest: twist about the vertical, lean forward, bend to the side (+ to the left)
    if (st.twist || st.lean || st.side) {
      const right = this.dirWorld(1, 0, 0, _v4), fwd = this.dirWorld(0, 0, 1, _v5);
      for (const n of ['Spine', 'Spine1', 'Spine2']) {
        _q2.setFromAxisAngle(Y_UP, (st.twist || 0) / 3).multiply(_q3.setFromAxisAngle(right, (st.lean || 0) / 3)).multiply(_qs.setFromAxisAngle(fwd, -(st.side || 0) / 3));
        setWorldQuat(B[n], B[n].getWorldQuaternion(_q1).premultiply(_q2)); B[n].updateMatrixWorld(true);
      }
    }
    // feet: planted where the clip put them (or where the lunge or the landing puts them), knees forward; in the air
    // where the jump has them, toes pointing down
    const lift = st.lift || 0, fw = st.feet ? (st.feetW === undefined ? 1 : st.feetW) : 0, air = st.air || 0;
    if (air) _q2.setFromAxisAngle(_v4.crossVectors(Y_UP, this.dirWorld(0, 0, 1, _v4)).normalize(), 0.6 * air);
    for (const s of ['Left', 'Right']) {
      const tgt = _v1.copy(feet[s]);
      if (fw > 0 && st.feet[s]) tgt.lerp(st.feet[s], fw);
      if (!air) {
        tgt.y = Math.max(tgt.y, K.ankleH * 0.9 + lift * 0.35);
        if (lift > 0) tgt.y += lift * (s === 'Left' ? 0.45 : 0.3);
      }
      const knee = B[`${s}Leg`].getWorldPosition(_v2), fwd = this.dirWorld(0, 0, 1, _v3);
      knee.addScaledVector(fwd, 0.6);
      twoBone(B[`${s}UpLeg`], B[`${s}Leg`], B[`${s}Foot`], tgt, knee, this.rest[`${s}Leg`], this.rest[`${s}Foot`], 1.02);
      const fq = s === 'Left' ? feet.qL : feet.qR;
      setWorldQuat(B[`${s}Foot`], air ? _q3.copy(_q2).multiply(fq) : fq); B[`${s}Foot`].updateMatrixWorld(true);
    }
    // both arms, as the volleyball asks (or left as the clip has them)
    if (st.arm) this.arms(st.arm);
    // head toward the ball
    this.lookAt(st.look || this.look, st.lookW === undefined ? 1 : st.lookW);
  }

  /* both arms: each wrist to a target (world), its elbow toward a pole, the hand turned so its fingers point along f
     and its palm faces n (both world, optional), blended with the clip's arm by w */
  arms(a) {
    const B = this.B, K = this.K;
    for (const s of ['Right', 'Left']) {
      const h = s === 'Right' ? a.r : a.l; if (!h || !h.w) continue;
      const w = h.wt === undefined ? 1 : h.wt; if (w <= 0.001) continue;
      const cur = B[`${s}Hand`].getWorldPosition(_v2);
      const tgt = _v1.copy(h.w).lerp(cur, 1 - w);
      twoBone(B[`${s}Arm`], B[`${s}ForeArm`], B[`${s}Hand`], tgt, h.pole, this.rest[`${s}ForeArm`], this.rest[`${s}Hand`], 1.08);
      const fq = B[`${s}ForeArm`].getWorldQuaternion(_q1);
      if (h.f && h.n) {
        // the hand's frame from its knuckles and palm, onto the asked-for fingers and palm
        const H = K.hand[s], X = _v3.copy(h.f).normalize(), Z = _v4.copy(h.n).addScaledVector(X, -h.n.dot(X)).normalize(), Y = _v5.crossVectors(Z, X);
        _m1.makeBasis(X, Y, Z); const qw = _q2.setFromRotationMatrix(_m1);
        const xl = this._xl || (this._xl = new V3()), zl = this._zl || (this._zl = new V3()), yl = this._yl || (this._yl = new V3());
        xl.copy(H.aL).normalize(); zl.copy(H.palmL).addScaledVector(xl, -H.palmL.dot(xl)).normalize(); yl.crossVectors(zl, xl);
        const ml = this._ml || (this._ml = new THREE.Matrix4()); ml.makeBasis(xl, yl, zl);
        const ql = _q3.setFromRotationMatrix(ml).invert();
        const want = _qs.copy(qw).multiply(ql);
        // the forearm carries half the turn (no candy-wrapper wrist)
        const rel = this._rel || (this._rel = new Q()); rel.copy(fq).invert().multiply(want);
        const tw = twistOf(rel, H.fore, this.tw || (this.tw = new Q()));
        setWorldQuat(B[`${s}ForeArm`], _q1.copy(fq).multiply(_q3.identity().slerp(tw, 0.5))); B[`${s}ForeArm`].updateMatrixWorld(true);
        setWorldQuat(B[`${s}Hand`], fq.slerp(want, w).copy(want)); B[`${s}Hand`].updateMatrixWorld(true);
      } else {
        setWorldQuat(B[`${s}Hand`], fq); B[`${s}Hand`].updateMatrixWorld(true);
      }
    }
  }
  lookAt(target, w) {
    if (w <= 0) return;
    const B = this.B;
    // never more than about 23° down or 34° up: a low ball is watched with the eyes, not by dropping the head
    B.Neck.updateMatrixWorld(true);
    const p0 = B.Neck.getWorldPosition(_v1), lk = this.lk || (this.lk = new V3());
    let dx = target.x - p0.x, dz = target.z - p0.z;
    const dy = target.y - p0.y, hl = Math.hypot(dx, dz), dist = Math.hypot(hl, dy) || 1;
    if (hl < 0.05) { this.dirWorld(0, 0, 1, _v2); dx = _v2.x; dz = _v2.z; } else { dx /= hl; dz /= hl; }
    const el = clamp(Math.atan2(dy, hl), -0.4, 0.6), far = Math.max(dist, 4); // far along it, so a close target can't tilt the head more
    lk.set(p0.x + dx * Math.cos(el) * far, p0.y + Math.sin(el) * far, p0.z + dz * Math.cos(el) * far);
    for (const [n, k] of [['Neck', 0.4], ['Head', 0.6]]) {
      const b = B[n]; b.updateMatrixWorld(true);
      const p = b.getWorldPosition(_v1), want = _v2.copy(lk).sub(p).normalize();
      // the face looks along +z in the T-pose, so now along (world rotation · T-pose rotation⁻¹) · +z
      b.getWorldQuaternion(_q1);
      const fwdNow = _v3.set(0, 0, 1).applyQuaternion(_q2.copy(_q1).multiply(_q3.copy(this.K.bind[n]).invert()));
      _q2.setFromUnitVectors(fwdNow, want);
      // limit how far a neck turns
      const ang = 2 * Math.acos(clamp(Math.abs(_q2.w), 0, 1)), lim = 1.1 * k;
      if (ang > lim) _q2.slerp(_q3.identity(), 1 - lim / ang);
      _q2.slerp(_q3.identity(), 1 - w * k * 1.6);
      setWorldQuat(b, _q1.premultiply(_q2)); b.updateMatrixWorld(true);
    }
  }
  leftHandPos(out) { return this.B.LeftHandMiddle1 ? this.B.LeftHandMiddle1.getWorldPosition(out) : this.B.LeftHand.getWorldPosition(out); }
}

/* ------------------------------------------------------------------ the players in motion */
/* The characters (Rally Point's, as in Set Point): each in what it was downloaded in. */
export const CHARS = {
  ch42: { name: 'Vasanth', short: 'Vasanth', h: 1.8, look: 'red tee' },
  footballer: { name: 'Leo Hart', short: 'Hart', h: 1.86, look: 'all white' },
  remy: { name: 'Remy Laurent', short: 'Laurent', h: 1.88, look: 'grey tee' },
  adam: { name: 'Adam Novak', short: 'Novak', h: 1.85, look: 'tracksuit' },
  ch01: { name: 'Kai Brandt', short: 'Brandt', h: 1.84, look: 'white polo' },
};
/* Arm poses in the body frame (r to the right, u up, f forward; metres for a 1.8 m player): wrist, elbow pole, and
   for some the fingers' direction and the palm's facing. */
const P = (r, u, f) => [r, u, f];
const POSE = {
  ready: { r: P(0.25, 0.98, 0.34), rp: P(0.9, -0.4, -0.3), l: P(-0.25, 0.98, 0.34), lp: P(-0.9, -0.4, -0.3), crouch: 0.15, lean: 0.25 },
  knees: { r: P(0.15, 0.6, 0.24), rp: P(0.8, 0.2, -0.4), l: P(-0.15, 0.6, 0.24), lp: P(-0.8, 0.2, -0.4), crouch: 0.2, lean: 0.55 },
  signal: { r: P(0.09, 0.96, -0.2), rp: P(1, 0, 0.2), l: P(-0.09, 0.96, -0.2), lp: P(-1, 0, 0.2), crouch: 0.04, lean: 0.12 },
  platform: { r: P(0.035, 0.8, 0.52), rp: P(0.6, -0.8, 0.2), l: P(-0.035, 0.8, 0.52), lp: P(-0.6, -0.8, 0.2), rf: P(-0.25, -0.45, 0.86), rn: P(-0.7, 0.7, 0.1), lf: P(0.25, -0.45, 0.86), ln: P(0.7, 0.7, 0.1), crouch: 0.22, lean: 0.35 },
  set: { r: P(0.11, 1.9, 0.12), rp: P(1, 0.1, 0.6), l: P(-0.11, 1.9, 0.12), lp: P(-1, 0.1, 0.6), rf: P(0, 0.75, -0.65), rn: P(-0.25, 0.6, 0.75), lf: P(0, 0.75, -0.65), ln: P(0.25, 0.6, 0.75), crouch: 0.08, lean: -0.05 },
  blockReady: { r: P(0.22, 1.62, 0.2), rp: P(1, -0.5, 0), l: P(-0.22, 1.62, 0.2), lp: P(-1, -0.5, 0), rf: P(0, 1, 0.1), rn: P(0, 0.1, 1), lf: P(0, 1, 0.1), ln: P(0, 0.1, 1), crouch: 0.12, lean: 0.05 },
  block: { r: P(0.16, 2.3, 0.24), rp: P(1, -0.6, 0.1), l: P(-0.16, 2.3, 0.24), lp: P(-1, -0.6, 0.1), rf: P(0, 1, 0.2), rn: P(0, 0.1, 1), lf: P(0, 1, 0.2), ln: P(0, 0.1, 1), crouch: 0, lean: 0.05 },
  armsBack: { r: P(0.3, 0.86, -0.42), rp: P(1, 0, 0), l: P(-0.3, 0.86, -0.42), lp: P(-1, 0, 0), crouch: 0.22, lean: 0.35 },
  cock: { r: P(0.36, 1.95, -0.2), rp: P(1, 0.6, -0.5), l: P(-0.12, 2.15, 0.36), lp: P(-1, -0.3, 0.2), crouch: 0, lean: -0.22 },
  hit: { r: P(0.18, 2.32, 0.32), rp: P(1, -0.2, 0.2), l: P(-0.26, 1.4, 0.3), lp: P(-1, -0.5, 0), crouch: 0, lean: 0.3 },
  follow: { r: P(-0.16, 1.08, 0.36), rp: P(1, -0.4, 0.4), l: P(-0.3, 1.0, 0.02), lp: P(-1, -0.5, 0), crouch: 0.1, lean: 0.4 },
  hold: { r: P(0.3, 0.95, 0.12), rp: P(1, -0.6, -0.2), l: P(-0.18, 1.15, 0.35), lp: P(-1, -0.6, 0), crouch: 0.02, lean: 0.06 },
  toss: { r: P(0.32, 1.9, -0.14), rp: P(1, 0.4, -0.4), l: P(-0.1, 1.85, 0.36), lp: P(-1, -0.3, 0.3), crouch: 0.03, lean: -0.08 },
  punch: { r: P(0.14, 2.05, 0.55), rp: P(1, -0.3, 0.2), l: P(-0.26, 1.3, 0.25), lp: P(-1, -0.5, 0), crouch: 0.02, lean: 0.15 },
  dive: { r: P(0.06, 0.55, 0.78), rp: P(0.6, -0.8, 0.2), l: P(-0.06, 0.55, 0.78), lp: P(-0.6, -0.8, 0.2), crouch: 0, lean: 0 },
};
const KEYS = ['r', 'rp', 'l', 'lp', 'rf', 'rn', 'lf', 'ln'];
function mixPose(a, b, u) {
  const o = { crouch: lerp(a.crouch, b.crouch, u), lean: lerp(a.lean, b.lean, u) };
  for (const k of KEYS) { const x = a[k], y = b[k]; o[k] = x && y ? [lerp(x[0], y[0], u), lerp(x[1], y[1], u), lerp(x[2], y[2], u)] : u < 0.5 ? x : y; }
  return o;
}
const tUpOf = (p) => Math.sqrt((2 * p.jumpH) / 9.81);

class PlayerView {
  constructor(id, body) {
    this.id = id; this.body = body;
    this.cur = null; this.w = 0; // the arm pose as drawn (body frame) and how much it overrides the clip
    this.L = body.loco;
    this.wt = { r: new V3(), rp: new V3(), l: new V3(), lp: new V3(), rf: new V3(), rn: new V3(), lf: new V3(), ln: new V3() };
    this.armO = { r: { w: new V3(), pole: new V3(), f: null, n: null, wt: 0 }, l: { w: new V3(), pole: new V3(), f: null, n: null, wt: 0 } };
    this.st = { x: 0, z: 0, yaw: 0, lift: 0, crouch: 0, lean: 0, air: 0, arm: null, look: new V3(0, 1.5, 0), lookW: 1 };
  }
  setBody(b) { this.body = b; this.L = b.loco; }
  react(key, o = {}) { if (!this.body || !CLIPS) return; this.body.react = { key, t: 0, from: o.from || 0, loop: !!o.loop, rate: o.rate || 1, mirror: o.mirror || 1, until: o.until || 9 }; }
  // a body-frame point of player p to the world (as Body.toWorld, from the sim's own position and yaw)
  bw(p, v, out) { const hs = this.body.hs, c = Math.cos(p.yaw), s = Math.sin(p.yaw), x = -v[0] * hs, z = v[2] * hs; return out.set(p.x + x * c + z * s, p.y + v[1] * hs, p.z - x * s + z * c); }
  bd(p, v, out) { const c = Math.cos(p.yaw), s = Math.sin(p.yaw), x = -v[0]; return out.set(x * c + v[2] * s, v[1], -x * s + v[2] * c).normalize(); }
  toB(p, w) { const hs = this.body.hs, c = Math.cos(p.yaw), s = Math.sin(p.yaw), dx = w.x - p.x, dz = w.z - p.z; const x = dx * c - dz * s, z = dx * s + dz * c; return [-x / hs, (w.y - p.y) / hs, z / hs]; }

  /* which pose, and how far into it, from what the sim player is doing */
  choose(p, m, ball) {
    const T = m.T, pl = p.plan, a = p.act;
    if (p.dive) return { pose: POSE.dive, w: 0.65 };
    if (p.air && p.air.kind === 'block') return { pose: POSE.block, w: 1, air: 1 };
    const serving = m.server === p && (m.phase === 'pre' || m.phase === 'serve' || m.phase === 'toss') && a && a.kind === 'serve' ? a : m.server === p && (m.phase === 'pre' || m.phase === 'serve') ? 'hold' : null;
    if (p.air) { // a spike or a jump serve: the bow and arrow
      const t = T - p.air.t0, up = tUpOf(p);
      // when the hand meets the ball: the plan's time before the contact (so the swing arrives with the ball), the
      // contact's own after it
      let hitT = null;
      if (a && (a.kind === 'spike' || a.kind === 'shot' || (a.kind === 'serve' && a.hit)) && a.tc >= p.air.t0) hitT = a.tc - p.air.t0;
      else if (pl && pl.kind === 'attack' && pl.tc) hitT = Math.max(0.1, pl.tc - p.air.t0);
      else if (a && a.kind === 'serve' && a.type === 'jump' && !a.hit && a.tc) hitT = Math.max(0.1, a.tc - p.air.t0);
      if (hitT === null) { const u = smooth(t / Math.max(0.12, up - 0.12)); return { pose: mixPose(POSE.armsBack, POSE.cock, u), w: 1, air: 1, reachBall: t > up - 0.2 ? 0.6 : 0 }; }
      if (t < hitT) return { pose: t < hitT - 0.14 ? mixPose(POSE.armsBack, POSE.cock, smooth(t / Math.max(0.1, hitT - 0.18))) : mixPose(POSE.cock, POSE.hit, smooth((t - (hitT - 0.14)) / 0.14)), w: 1, air: 1, fast: true, reachBall: t > hitT - 0.08 ? 0.75 : 0 };
      const done = a && (a.kind === 'spike' || a.kind === 'shot' || (a.kind === 'serve' && a.hit)) && a.tc >= p.air.t0;
      if (!done) return { pose: POSE.hit, w: 1, air: 1, fast: true, reachBall: 0.5 }; // up there, waiting on the ball
      const soft = a.kind === 'shot';
      return { pose: mixPose(POSE.hit, soft ? POSE.punch : POSE.follow, smooth((t - hitT) / (soft ? 0.25 : 0.18))), w: 1, air: 1, fast: true };
    }
    if (serving === 'hold') return { pose: POSE.hold, w: 1 };
    if (serving) {
      const t = T - serving.t0;
      if (serving.type === 'jump') return { pose: mixPose(POSE.toss, POSE.armsBack, smooth((t - 0.35) / 0.4)), w: 1 };
      if (!serving.hit) return { pose: mixPose(POSE.hold, POSE.toss, smooth(t / 0.3)), w: 1, reachBall: serving.tc && T > serving.tc - 0.12 ? 0.8 : 0 };
    }
    if (a && a.kind === 'serve' && a.type === 'float' && a.hit && T - a.hit < 0.6) return { pose: mixPose(POSE.hit, POSE.punch, smooth((T - a.hit) / 0.15)), w: 1 - smooth((T - a.hit - 0.4) / 0.2) };
    // a touch coming: into its shape before the ball arrives
    if (pl && m.phase === 'rally') {
      const dt = pl.tc !== undefined ? pl.tc - T : 9;
      if (pl.kind === 'pass' || pl.kind === 'dig' || pl.kind === 'bumpset' || pl.kind === 'over') {
        const u = smooth(1 - (dt - 0.12) / 0.5);
        return { pose: mixPose(POSE.ready, POSE.platform, u), w: 1, reachBall: dt < 0.25 ? 0.7 : 0, kind: 'bump' };
      }
      if (pl.kind === 'set') { const u = smooth(1 - (dt - 0.1) / 0.55); return { pose: mixPose(POSE.ready, POSE.set, u), w: 1, reachBall: dt < 0.2 ? 0.7 : 0, kind: 'set' }; }
      if (pl.kind === 'attack') { const k = pl.takeoff - T; return { pose: k < 0.45 ? mixPose(POSE.ready, POSE.armsBack, smooth(1 - (k - 0.05) / 0.4)) : POSE.ready, w: k < 1.2 ? 1 : 0.6 }; }
      if (pl.kind === 'block') return { pose: POSE.blockReady, w: 1 };
    }
    // a touch just made: held a moment, then let go
    if (a && T - a.t0 < 0.45) {
      const k = 1 - smooth((T - a.t0 - 0.2) / 0.25);
      if (a.kind === 'set') return { pose: mixPose(POSE.set, { ...POSE.set, r: P(0.13, 2.08, 0.28), l: P(-0.13, 2.08, 0.28) }, smooth((T - a.t0) / 0.12)), w: k };
      if (a.kind === 'pass' || a.kind === 'dig' || a.kind === 'bumpset' || a.kind === 'over') return { pose: mixPose(POSE.platform, { ...POSE.platform, r: P(0.035, 1.05, 0.55), l: P(-0.035, 1.05, 0.55) }, smooth((T - a.t0) / 0.15)), w: k };
    }
    // waiting for a serve: receivers hands on knees, the server's partner signalling behind the back
    if (m.phase === 'pre' || m.phase === 'serve' || m.phase === 'toss') {
      if (p.team !== m.servingTeam) return { pose: m.phase === 'toss' ? POSE.ready : POSE.knees, w: 1 };
      if (m.phase !== 'toss' && Math.abs(p.z) < 2.5) return { pose: POSE.signal, w: 1 };
      return null;
    }
    if (m.phase === 'rally' && m.ball.live) {
      // in a rally: ready whenever the ball is on, or coming to, this side
      const mine = m.playTeam === p.team || Math.sign(ball.z) === sideOf(p.team);
      if (mine || (pl && (pl.kind === 'ready' || pl.kind === 'defend'))) return { pose: POSE.ready, w: 0.85 };
    }
    return null;
  }

  update(dt, p, m, ball) {
    const B = this.body, L = this.L, st = this.st;
    if (!B) return;
    // footwork: run, sidestep or stand, from the speed and its direction against the way the player faces
    const v = Math.hypot(p.vx, p.vz), fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    const fwd = v > 0.05 ? (p.vx * fx + p.vz * fz) / v : 1, lat = v > 0.05 ? (p.vx * fz - p.vz * fx) / v : 0;
    let mode = v < 0.35 || p.air || p.dive ? 'idle' : Math.abs(fwd) > 0.62 ? 'run' : 'shuf';
    const k = 1 - Math.exp(-dt * 10);
    L.run = lerp(L.run, mode === 'run' ? 1 : 0, k); L.shuf = lerp(L.shuf, mode === 'shuf' ? 1 : 0, k); L.idle = lerp(L.idle, mode === 'idle' ? 1 : 0, k);
    L.tRun += dt * clamp(v / 4.0, 0.7, 1.45) * (fwd < -0.3 ? -1 : 1); L.tShuf += dt * clamp(v / 2.3, 0.7, 1.5); L.tIdle += dt;
    if (mode === 'shuf') L.mirror = lat > 0 ? -1 : 1;
    // a clip played whole (cheering, a dive) runs out
    if (B.react) { const c = CLIPS.clips[B.react.key], dur = (c.n - 1) / c.fps; if (B.react.t > B.react.until || (!B.react.loop && B.react.t + (B.react.from || 0) > dur)) B.react = null; }
    // the arms
    const ch = B.react && B.react.key !== 'dive' ? null : this.choose(p, m, ball);
    const target = ch ? ch.pose : null;
    const wWant = ch ? ch.w : 0;
    this.w = damp(this.w, wWant, wWant > this.w ? 16 : 7, dt);
    const ka = 1 - Math.exp(-dt * (ch && ch.fast ? 34 : 18)); // the arm swing of a spike: quick
    if (target) {
      if (!this.cur) this.cur = { crouch: target.crouch, lean: target.lean, ...Object.fromEntries(KEYS.map((x) => [x, target[x] ? target[x].slice() : null])) };
      for (const key of KEYS) {
        const t = target[key]; if (!t) { this.cur[key] = null; continue; }
        if (!this.cur[key]) this.cur[key] = t.slice();
        for (let i = 0; i < 3; i++) this.cur[key][i] = lerp(this.cur[key][i], t[i], ka);
      }
      this.cur.crouch = lerp(this.cur.crouch, target.crouch, ka); this.cur.lean = lerp(this.cur.lean, target.lean, ka);
    }
    const c = this.cur;
    // a jump drawn a little higher than the sim's (whose reach is a fingertip's): the hand then meets the ball
    st.x = p.x; st.z = p.z; st.yaw = p.yaw; st.lift = p.y * (p.air ? 1.3 : 1);
    st.crouch = c ? c.crouch * this.w : 0; st.lean = c ? c.lean * this.w : 0; st.air = ch && ch.air ? 1 : 0;
    st.arm = null;
    if (c && this.w > 0.01) {
      const A = st.arm = this.armO;
      for (const s of ['r', 'l']) {
        const H = A[s];
        this.bw(p, c[s], H.w); this.bw(p, [c[s][0] + c[s + 'p'][0], c[s][1] + c[s + 'p'][1], c[s][2] + c[s + 'p'][2]], H.pole);
        H.f = c[s + 'f'] ? this.bd(p, c[s + 'f'], this.wt[s + 'f']) : null; H.n = c[s + 'n'] ? this.bd(p, c[s + 'n'], this.wt[s + 'n']) : null;
        H.wt = this.w;
      }
      // the hands find the ball as it arrives: the forearms for a pass, the fingers for a set, the right hand for a hit
      if (ch && ch.reachBall && m.ball.live) {
        const bb = this.toB(p, ball), u = ch.reachBall;
        if (ch.kind === 'bump') {
          const ru = clamp(bb[1] - 0.05, 0.35, 1.35), rf = clamp(bb[2] + 0.1, 0.3, 0.75), rr = clamp(bb[0], -0.45, 0.45);
          this.bw(p, [lerp(c.r[0], rr + 0.035, u), lerp(c.r[1], ru, u), lerp(c.r[2], rf, u)], A.r.w); this.bw(p, [lerp(c.l[0], rr - 0.035, u), lerp(c.l[1], ru, u), lerp(c.l[2], rf, u)], A.l.w);
          st.crouch = Math.max(st.crouch, clamp((0.8 - bb[1]) * 0.7, 0, 0.42));
        } else if (ch.kind === 'set') {
          const ru = clamp(bb[1] - 0.1, 1.6, 2.15), rf = clamp(bb[2] - 0.05, 0.0, 0.4), rr = clamp(bb[0], -0.3, 0.3);
          this.bw(p, [lerp(c.r[0], rr + 0.1, u), lerp(c.r[1], ru, u), lerp(c.r[2], rf, u)], A.r.w); this.bw(p, [lerp(c.l[0], rr - 0.1, u), lerp(c.l[1], ru, u), lerp(c.l[2], rf, u)], A.l.w);
        } else {
          A.r.w.lerp(_v1.copy(ball).addScaledVector(this.bd(p, [0, 0, 1], _v2), -0.06), u * 0.85);
        }
      }
    }
    // the head on the ball while it's in play, else on the net
    if (m.ball.live || m.ball.held !== null) st.look.copy(ball); else st.look.set(p.x * 0.5, 1.6, 0);
    st.lookW = 1;
    B.pose(st, dt);
  }
}

/* ------------------------------------------------------------------ cameras */
/* broadcast: high behind your end line, the whole court in frame, as on television; side: from the sand beside the
   net, the court across the screen. Both fit the court to the screen's shape and follow the play a little. */
const Cam = { mode: store.get('view', 'broadcast'), pos: new V3(0, 12, 30), look: new V3(0, 0.4, -1), fov: 30, shake: 0, cut: true, script: null, lift: 0,
  tune: { pitch: 0.48, fov: 30, up: 0.02 } }; // broadcast, landscape: high enough to see into the far court // broadcast, landscape: low enough for the sunset over the far end
const _cf = new V3(), _cr = new V3(), _cu = new V3(), _cp = new V3();
// the distance along dir from look that frames every point; up shifts the frame (a lens shift, as a fraction of its
// height) so the points fit in its lower part
function fitDistance(dir, look, fovDeg, aspect, pts, margin = 0.06, up = 0) {
  const t = Math.tan((fovDeg * Math.PI) / 360) * (1 - margin), f = _cf.copy(dir).negate();
  const yHi = t * (1 + 2 * up), yLo = t * (-1 + 2 * up);
  _cr.crossVectors(f, Y_UP).normalize(); _cu.crossVectors(_cr, f);
  let lo = 3, hi = 160;
  for (let i = 0; i < 24; i++) {
    const d = (lo + hi) / 2; let ok = true;
    for (const p of pts) {
      _cp.copy(p).sub(look).addScaledVector(dir, -d);
      const z = _cp.dot(f); if (z <= 0.1) { ok = false; break; }
      const y = _cp.dot(_cu) / z;
      if (Math.abs(_cp.dot(_cr)) / z > t * aspect || y > yHi || y < yLo) { ok = false; break; }
    }
    if (ok) hi = d; else lo = d;
  }
  return hi;
}
const COURT_PTS = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { COURT_PTS.push(new V3(sx * 4.4, 0, sz * (sz > 0 ? 10.0 : 8.6))); COURT_PTS.push(new V3(sx * 4.6, 2.5, sz * 0.2)); }
function camTarget(dt, aspect, focus) {
  const portrait = aspect < 0.9;
  if (Cam.mode === 'side') {
    const fov = portrait ? 52 : 30;
    const dir = _v1.set(Math.cos(0.3), Math.sin(0.3), 0).normalize();
    const look = _v2.set(0, 0.9, clamp(focus.z * 0.25, -2.5, 2.5));
    let pts = COURT_PTS;
    if (portrait) { look.z = clamp(focus.z * 0.6, -5, 5); pts = COURT_PTS.map((p) => p.clone().setZ(look.z + Math.sign(p.z || 1) * Math.min(Math.abs(p.z), 5))); }
    const d = Math.min(portrait ? 40 : 70, fitDistance(dir, look, fov, aspect, pts, 0.04));
    return { pos: look.clone().addScaledVector(dir, d), look: look.clone(), fov };
  }
  const T = Cam.tune;
  // a short landscape screen (a phone on its side) keeps the court large and gives up the sky
  const small = !portrait && innerHeight < 560;
  const fov = portrait ? clamp(34 + (1 / aspect - 1) * 11, 34, 50) : small ? 30 : T.fov, pitch = portrait ? 0.5 : small ? 0.48 : T.pitch, up = portrait ? -0.1 : small ? 0 : T.up;
  const dir = _v1.set(0, Math.sin(pitch), Math.cos(pitch)).normalize();
  const look = _v2.set(clamp(focus.x * 0.12, -0.6, 0.6), 0.5, -1.0);
  const d = fitDistance(dir, look, fov, aspect, COURT_PTS, portrait ? 0.03 : 0.05, up);
  return { pos: look.clone().addScaledVector(dir, d), look: look.clone(), fov, lift: -up };
}
function updateCamera(dt, focus) {
  const aspect = camera.aspect;
  let goal;
  if (Cam.script) goal = Cam.script(dt, aspect);
  if (!goal) goal = camTarget(dt, aspect, focus);
  const k = Cam.cut ? 1 : 1 - Math.exp(-dt * (goal.k || 3.0));
  Cam.pos.lerp(goal.pos, k); Cam.look.lerp(goal.look, k); Cam.fov = lerp(Cam.fov, goal.fov, k);
  Cam.cut = false;
  camera.position.copy(Cam.pos);
  if (Cam.shake > 0) { camera.position.x += (Math.random() - 0.5) * Cam.shake; camera.position.y += (Math.random() - 0.5) * Cam.shake; Cam.shake = Math.max(0, Cam.shake - dt * 0.3); }
  camera.lookAt(Cam.look);
  const lift = goal.lift || 0; // the lens shift: + moves the picture up the screen
  if (lift !== Cam.lift) { Cam.lift = lift; if (lift) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * lift, innerWidth, innerHeight); else camera.clearViewOffset(); }
  if (Math.abs(camera.fov - Cam.fov) > 0.01) { camera.fov = Cam.fov; camera.updateProjectionMatrix(); }
}
/* the menu: a slow drift round the beach between angles */
function attractCam() {
  let t = 0, shot = 0;
  const shots = [
    (u) => ({ pos: new V3(lerp(-10, 8, u), 9.5, 27), look: new V3(0, 0.8, -4), fov: 36 }),
    (u) => ({ pos: new V3(15, lerp(2.2, 3.4, u), lerp(-8, 8, u)), look: new V3(0, 1.2, 0), fov: 38 }),
    (u) => ({ pos: new V3(lerp(-3, 3, u), 1.4, 13.5), look: new V3(0, 2.0, -20), fov: 46 }),
    (u) => ({ pos: new V3(Math.sin(u * 0.9 + 0.3) * 26, 15, Math.cos(u * 0.9 + 0.3) * 26), look: new V3(0, 0, -2), fov: 40 }),
  ];
  return () => {
    t += 1 / 60; const u = t / 9;
    if (u >= 1) { t = 0; shot = (shot + 1) % shots.length; Cam.cut = true; }
    const g = shots[shot](Math.min(1, t / 9)); g.k = 20; return g;
  };
}

/* ------------------------------------------------------------------ sound */
/* The beach: waves on the shore and a breeze under everything; the crowd's recordings from Rally Point (applause,
   cheers, oohs); the ball synthesized for each touch, a forearm's thump to a spike's crack; the referee's whistle.
   The score is called in the device's speech voice. */
const Sound = (() => {
  let ctx = null, out = null, master = null, crowdGain = null, waveGain = null, noise = null, hall = null;
  const A = { on: store.get('sound', true), voice: store.get('voice', true) };
  const S = { meta: null, fx: null, crowd: null, hall: null }, raw = {};
  const fetched = fetch('../bm/sfx/sfx.json').then((r) => r.json()).then((m) => { S.meta = m; return Promise.all(['fx', 'crowd', 'hall'].map((k) => fetch(`../bm/sfx/${k}.mp3`).then((r) => r.arrayBuffer()).then((b) => { raw[k] = b; }))); }).catch(() => {});
  function decodeAll() { fetched.then(() => { for (const k of ['fx', 'crowd', 'hall']) if (raw[k]) { const b = raw[k]; raw[k] = null; ctx.decodeAudioData(b, (buf) => { S[k] = buf; if (k === 'hall') startHall(); }, () => {}); } }); }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    ctx = new AC();
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1; lim.connect(ctx.destination);
    out = lim;
    master = ctx.createGain(); master.gain.value = A.on ? 0.8 : 0; master.connect(lim);
    const sr = ctx.sampleRate;
    noise = ctx.createBuffer(1, sr * 2, sr); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.05; crowdGain.connect(master);
    // the sea: brown noise through a low-pass that opens and closes with each wave, and a hiss of foam on top
    waveGain = ctx.createGain(); waveGain.gain.value = 0.0; waveGain.connect(master);
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.3;
    const swell = ctx.createGain(); swell.gain.value = 0.25;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.085; const lfoG = ctx.createGain(); lfoG.gain.value = 0.2; lfo.connect(lfoG).connect(swell.gain);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.085; const lfo2G = ctx.createGain(); lfo2G.gain.value = 260; lfo2.connect(lfo2G).connect(lp.frequency);
    src.connect(lp).connect(swell).connect(waveGain);
    const hiss = ctx.createBiquadFilter(); hiss.type = 'highpass'; hiss.frequency.value = 2400; const hg = ctx.createGain(); hg.gain.value = 0.03;
    src.connect(hiss).connect(hg).connect(swell);
    src.start(); lfo.start(); lfo2.start();
    waveGain.gain.setTargetAtTime(0.32, ctx.currentTime, 1.5);
    decodeAll();
  }
  function startHall() { // the crowd's murmur, the hall recording dulled to an open-air hum
    if (hall || !S.hall) return;
    hall = ctx.createBufferSource(); hall.buffer = S.hall; hall.loop = true; hall.loopStart = S.meta.hall.loopStart; hall.loopEnd = S.meta.hall.loopEnd;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
    hall.connect(f).connect(crowdGain); hall.start(0, S.meta.hall.loopStart);
  }
  const now = () => ctx.currentTime;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function play(buf, slice, o = {}) {
    if (!buf || !slice) return null;
    const t = now() + (o.delay || 0), src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = o.rate || 1;
    let node = src;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.5; node.connect(f); node = f; }
    const g = ctx.createGain(); g.gain.value = o.gain === undefined ? 1 : o.gain; node.connect(g); node = g;
    if (o.fade) { g.gain.setValueAtTime(g.gain.value, t + o.fade[0]); g.gain.setTargetAtTime(0.0001, t + o.fade[0], o.fade[1]); }
    if (ctx.createStereoPanner && o.pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); node.connect(p); node = p; }
    node.connect(master);
    src.start(t, slice[0] + (o.from || 0), o.len ? Math.min(o.len, slice[1]) : slice[1]);
    return g;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function burst(t, { f = 2000, q = 1, type = 'bandpass', peak = 0.5, dec = 0.05, a = 0.002, rate = 1, pan = 0 }) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = rate;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); env(g, t, a, peak, dec);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(fl).connect(g); if (p) { p.pan.value = pan; g.connect(p).connect(master); } else g.connect(master);
    s.start(t, Math.random()); s.stop(t + a + dec + 0.05);
  }
  function tone(t, { f = 1000, f2 = f, type = 'sine', peak = 0.2, dec = 0.08, a = 0.002, pan = 0 }) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + dec);
    const g = ctx.createGain(); env(g, t, a, peak, dec);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.connect(g); if (p) { p.pan.value = pan; g.connect(p).connect(master); } else g.connect(master);
    o.start(t); o.stop(t + a + dec + 0.05);
  }
  const ok = () => ctx && A.on;
  return {
    A, init,
    set(on) { A.on = on; store.set('sound', on); if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, now(), 0.05); },
    setVoice(on) { A.voice = on; store.set('voice', on); if (!on && window.speechSynthesis) speechSynthesis.cancel(); },
    /* the ball: a forearm's thump, fingers' soft double tap, a palm's crack */
    touch(kind, speed, pan = 0, far = 0) {
      if (!ok()) return;
      const t = now() + 0.002, k = 1 - far * 0.45, v = clamp(speed / 90, 0.2, 1.3);
      if (kind === 'spike' || kind === 'serveJump') {
        burst(t, { f: 2600, q: 0.7, peak: 0.55 * k * v, dec: 0.07, pan }); burst(t, { f: 900, q: 1, peak: 0.4 * k * v, dec: 0.09, pan });
        tone(t, { f: 180, f2: 70, peak: 0.32 * k, dec: 0.12, pan });
        if (S.fx && S.meta) play(S.fx, pick(S.meta.fx.hit), { gain: 0.5 * k, rate: 0.45, lp: 3000, pan });
      } else if (kind === 'serve' || kind === 'shot' || kind === 'over') {
        burst(t, { f: 1700, q: 0.9, peak: 0.36 * k, dec: 0.06, pan }); tone(t, { f: 220, f2: 110, peak: 0.24 * k, dec: 0.08, pan });
      } else if (kind === 'set') {
        burst(t, { f: 1300, q: 1.2, peak: 0.16 * k, dec: 0.035, pan }); burst(t + 0.018, { f: 1100, q: 1.2, peak: 0.12 * k, dec: 0.03, pan });
      } else if (kind === 'block') {
        burst(t, { f: 2000, q: 0.8, peak: 0.5 * k, dec: 0.06, pan }); burst(t + 0.012, { f: 1500, q: 0.8, peak: 0.35 * k, dec: 0.05, pan }); tone(t, { f: 200, f2: 90, peak: 0.25 * k, dec: 0.08, pan });
      } else { // pass, dig: the forearms
        tone(t, { f: 150, f2: 72, peak: 0.42 * k * (0.6 + v * 0.4), dec: 0.1, pan }); burst(t, { f: 700, q: 0.8, type: 'lowpass', peak: 0.3 * k, dec: 0.06, pan });
      }
    },
    sand(pan = 0, far = 0, k = 1) { if (!ok()) return; burst(now(), { f: 520, q: 0.6, type: 'lowpass', peak: 0.28 * k * (1 - far * 0.5), dec: 0.14, a: 0.01, pan }); },
    net(tape) { if (!ok()) return; if (tape) { burst(now(), { f: 1400, q: 3, peak: 0.25, dec: 0.05 }); tone(now(), { f: 600, f2: 300, peak: 0.08, dec: 0.1 }); } else burst(now(), { f: 300, q: 0.7, type: 'lowpass', peak: 0.45, dec: 0.2 }); },
    whistle(long) {
      if (!ok()) return;
      const t = now(), d = long ? 0.55 : 0.28;
      for (const f of [2950, 3130]) {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
        const trem = ctx.createOscillator(); trem.frequency.value = 32; const tg = ctx.createGain(); tg.gain.value = 40; trem.connect(tg).connect(o.frequency);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); g.gain.setValueAtTime(0.09, t + d - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(bp).connect(g).connect(master); o.start(t); trem.start(t); o.stop(t + d + 0.02); trem.stop(t + d + 0.02);
      }
    },
    applause(k = 1, secs = 2.4) {
      if (!ok() || !S.crowd) return; const C = S.meta.crowd, r = 0.97 + Math.random() * 0.06, fade = [Math.max(0.6, secs * 0.45), secs * 0.3];
      play(S.crowd, pick(k >= 0.85 ? C.clapBig : C.clap), { gain: (k >= 0.85 ? 1.0 : 1.2) * k, rate: r, fade, lp: 7000 });
      if (k >= 0.95) play(S.crowd, pick(k >= 1.25 ? C.cheerBig : C.cheer), { gain: 0.55 * k, rate: r, fade, delay: 0.05, lp: 7000 });
    },
    ooh(k = 1) { if (!ok() || !S.crowd) return; play(S.crowd, pick(S.meta.crowd.ooh), { gain: 0.3 * k, rate: 0.95 + Math.random() * 0.1, lp: 6000 }); },
    click() { if (!ok()) return; tone(now(), { f: 1400, f2: 900, peak: 0.05, dec: 0.04 }); },
    crowd(level) { if (crowdGain) crowdGain.gain.setTargetAtTime(A.on ? level * 3.2 : 0, now(), 0.4); },
    tap() { const d = ctx.createMediaStreamDestination(); out.connect(d); return d.stream; },
    say(text) {
      if (!A.on || !A.voice || !window.speechSynthesis || !text) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices();
        const v = vs.find((x) => /en-(GB|AU|IN)/i.test(x.lang)) || vs.find((x) => /^en/i.test(x.lang));
        if (v) u.voice = v; u.rate = 1.0; u.pitch = 1.0; u.volume = 0.9;
        speechSynthesis.speak(u);
      } catch (e) { /* no voices */ }
    },
  };
})();

/* ------------------------------------------------------------------ controls */
/* One stick (WASD / arrows, a floating thumb stick, a game controller's left stick) and two buttons: A (the main
   touch: serve, pass, set, spike, block) and B (the soft one: a float serve, a shot, a set attacked on two).
   Directions are the screen's, turned onto the court. */
const Input = (() => {
  const keys = new Set(), I = { sx: 0, sy: 0, touch: { id: null, x0: 0, y0: 0, x: 0, y: 0 }, padPrev: [], onBtn: null, onCam: null, onPause: null, onSkip: null, onAny: null };
  const BTN_KEYS = { KeyJ: 'A', Space: 'A', KeyZ: 'A', Enter: 'A', Digit1: 'A', KeyK: 'B', KeyX: 'B', ShiftLeft: 'B', ShiftRight: 'B', Digit2: 'B', KeyL: 'B' };
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    I.onAny && I.onAny();
    if (e.code === 'Space' && I.onSkip && I.onSkip()) { e.preventDefault(); return; }
    if (BTN_KEYS[e.code] && !e.repeat) { e.preventDefault(); I.onBtn && I.onBtn(BTN_KEYS[e.code]); return; }
    if ((e.code === 'KeyC' || e.code === 'KeyV') && !e.repeat) { I.onCam && I.onCam(); return; }
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) { I.onPause && I.onPause(); return; }
    if (e.code === 'KeyM' && !e.repeat) { Sound.set(!Sound.A.on); syncToggles(); return; }
    if (/^(Arrow|Key[WASD])/.test(e.code)) { e.preventDefault(); keys.add(e.code); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  const zone = $('stickZone'), stick = $('stick'), knob = $('knob'), R = 52;
  const restStick = () => { stick.style.left = `${Math.min(110, innerWidth * 0.175) + 8}px`; stick.style.top = `${innerHeight - 118}px`; knob.style.transform = ''; stick.classList.add('idle'); };
  zone.addEventListener('pointerdown', (e) => {
    I.onAny && I.onAny(); if (I.touch.id !== null) return;
    I.touch.id = e.pointerId; I.touch.x0 = I.touch.x = e.clientX; I.touch.y0 = I.touch.y = e.clientY;
    stick.style.left = `${e.clientX}px`; stick.style.top = `${e.clientY}px`; stick.classList.remove('idle');
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== I.touch.id) return;
    I.touch.x = e.clientX; I.touch.y = e.clientY;
    let dx = I.touch.x - I.touch.x0, dy = I.touch.y - I.touch.y0; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const end = (e) => { if (e.pointerId !== I.touch.id) return; I.touch.id = null; restStick(); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  addEventListener('resize', restStick); restStick();
  for (const b of document.querySelectorAll('.shot')) {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); I.onAny && I.onAny(); b.classList.add('down'); if (!(I.onSkip && I.onSkip())) I.onBtn && I.onBtn(b.dataset.btn); });
    const up = () => b.classList.remove('down'); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  }
  I.poll = () => {
    let x = 0, y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    if (I.touch.id !== null) { const dx = I.touch.x - I.touch.x0, dy = I.touch.y - I.touch.y0, l = Math.hypot(dx, dy); if (l > 6) { const k = Math.min(1, l / R) / l; x = dx * k; y = -dy * k; } }
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.2) { x = ax; y = -ay; }
      const map = { 0: 'A', 1: 'B', 2: 'B', 7: 'A', 3: 'cam', 9: 'pause' };
      for (const [bi, act] of Object.entries(map)) {
        const down = p.buttons[bi] && p.buttons[bi].pressed, was = I.padPrev[bi];
        if (down && !was) { I.onAny && I.onAny(); if (act === 'cam') I.onCam && I.onCam(); else if (act === 'pause') I.onPause && I.onPause(); else if (!(I.onSkip && I.onSkip())) I.onBtn && I.onBtn(act); }
        I.padPrev[bi] = down;
      }
      break;
    }
    I.sx = x; I.sy = y;
  };
  // the stick on the court: screen right and screen up, laid on the sand through the camera
  I.world = (out) => {
    const f = _v1; camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    const r = _v2.set(-f.z, 0, f.x);
    return out.set(r.x * I.sx + f.x * I.sy, 0, r.z * I.sx + f.z * I.sy);
  };
  return I;
})();

/* ------------------------------------------------------------------ the broadcast graphics */
const Hud = (() => {
  const H = { timers: {} };
  const later = (k, ms, fn) => { clearTimeout(H.timers[k]); H.timers[k] = setTimeout(fn, ms); };
  H.setNames = (a, b) => { $('nm0').textContent = a; $('nm1').textContent = b; };
  H.score = (m, bump) => {
    for (const i of [0, 1]) {
      const pt = $(`pt${i}`); pt.textContent = m.score[i];
      $(`ss${i}`).innerHTML = m.sets.map((s) => `<i class="${s.s[i] > s.s[1 - i] ? 'w' : ''}">${s.s[i]}</i>`).join('');
      $(`row${i}`).classList.toggle('serving', m.servingTeam === i && m.phase !== 'over');
      if (bump === i) { pt.classList.remove('bump'); void pt.offsetWidth; pt.classList.add('bump'); }
    }
    $('bugSet').textContent = m.phase === 'over' ? 'Final' : `Set ${m.setNo + 1} · to ${m.target()}`;
    const pf = m.pointFor();
    $('bugTag').textContent = pf ? `${pf.kind} point` : '';
    $('bugTag').className = `tag${pf ? ` t${pf.team}` : ''}`;
  };
  H.callout = (text, sub, tone = 'white', ms = 1400) => {
    const el = $('callout'); el.hidden = false; el.classList.remove('show', 'hide'); void el.offsetWidth; el.classList.add('show');
    $('callMain').textContent = text; $('callMain').className = `call-main t-${tone}`;
    $('callSub').hidden = !sub; $('callSub').textContent = sub || '';
    later('call', ms, () => { el.classList.remove('show'); el.classList.add('hide'); later('call2', 320, () => { el.hidden = true; }); });
  };
  H.pill = (text, ms = 2200) => { const el = $('pill'); el.hidden = false; el.textContent = text; later('pill', ms, () => { el.hidden = true; }); };
  H.speed = (label, kmh) => {
    const el = $('speed'); el.hidden = false; $('speedK').textContent = label; $('speedV').textContent = Math.round(kmh);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    later('speed', 2600, () => { el.hidden = true; });
  };
  H.timing = (label) => { const el = $('timing'); el.dataset.q = label; el.textContent = label; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  H.touches = (n, mine) => { const el = $('pips'), k = String(mine ? n : 0); if (el.dataset.n !== k) el.dataset.n = k; if (H.mine !== !!mine) { H.mine = !!mine; $('bug').classList.toggle('mine', H.mine); } };
  H.labels = (L) => {
    if (!L) return; const key = L.join('|'); if (key === H.lk) return; H.lk = key;
    $('lblA').textContent = L[0]; $('lblB').textContent = L[1];
    $('keyA').textContent = L[0]; $('keyB').textContent = L[1];
  };
  H.cue = (on) => { document.body.classList.toggle('cue-now', !!on); };
  H.clear = () => { for (const id of ['callout', 'pill', 'speed']) $(id).hidden = true; };
  return H;
})();

/* ------------------------------------------------------------------ the game */
const G = {
  s: {
    char: store.get('char', 'ch42'), mate: store.get('mate', 'remy'), diff: store.get('diff', 'medium'), fmt: store.get('fmt', 'match'),
    auto: store.get('auto', true), marker: store.get('marker', true), name: store.get('name', ''),
  },
  K: {}, bodies: [], views: [], match: null, mode: 'boot', paused: false, attract: true, pace: 1, slowUntil: 0, stats: { maxRally: 0 }, ref: null, opp: [],
};
if (!CHARS[G.s.char]) G.s.char = 'ch42';
if (!CHARS[G.s.mate] || G.s.mate === G.s.char) G.s.mate = Object.keys(CHARS).find((k) => k !== G.s.char);
if (!DIFFS[G.s.diff]) G.s.diff = 'medium';
if (!FORMATS[G.s.fmt]) G.s.fmt = 'match';
function pickOpponents() { const rest = Object.keys(CHARS).filter((k) => k !== G.s.char && k !== G.s.mate); for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; } G.opp = rest.slice(0, 2); }
pickOpponents();

/* ---- models: Rally Point's players and clips */
const PLAYERS = '../bm/players/';
const gltfLoader = new THREE.GLTFLoader();
const modelP = {}, progress = {};
function loadChar(key) {
  if (!modelP[key]) {
    modelP[key] = new Promise((resolve, reject) => gltfLoader.load(`${PLAYERS}${key}.glb`, resolve, (e) => { if (e.total) progress[key] = e.loaded / e.total; }, reject))
      .then((g) => { G.K[key] = calibrate(g, key === 'josh' ? 1.8 : CHARS[key].h); return G.K[key]; });
  }
  return modelP[key];
}
const lineup = () => [G.s.char, G.s.mate, G.opp[0], G.opp[1]];
async function ensureChars() {
  const keys = lineup();
  await Promise.all(keys.map(loadChar));
  keys.forEach((k, i) => {
    if (G.bodies[i] && G.bodies[i].cfg === CHARS[k]) return;
    if (G.bodies[i]) G.bodies[i].dispose();
    const b = new Body(G.K[k], CHARS[k]); G.bodies[i] = b;
    if (G.views[i]) G.views[i].setBody(b); else G.views[i] = new PlayerView(i, b);
  });
}

/* ---- matches */
const displayName = (key, mine) => (mine && G.s.name.trim() ? G.s.name.trim() : CHARS[key].short);
function newMatch(attract) {
  G.attract = attract;
  const names = [displayName(G.s.char, !attract), CHARS[G.s.mate].short, CHARS[G.opp[0]].short, CHARS[G.opp[1]].short];
  const m = new Match({ diff: attract ? 'hard' : G.s.diff, fmt: attract ? 'match' : G.s.fmt, humanAI: attract, names, teamNames: ['Your team', 'Rivals'] });
  m.input.auto = G.s.auto;
  G.match = m; G.pace = 1; G.slowUntil = 0; G.stats = { maxRally: 0 };
  Hud.setNames(`${names[0]} · ${names[1]}`, `${names[2]} · ${names[3]}`);
  Hud.score(m); Hud.clear();
  for (const v of G.views) if (v && v.body) { v.body.react = null; v.cur = null; v.w = 0; }
  Cam.script = attract ? attractCam() : null; Cam.cut = true;
  ring.visible = !attract;
}

/* ---- events from the sim */
const farOf = (x, y, z) => clamp((camera.position.distanceTo(_v5.set(x, y, z)) - 10) / 26, 0, 1);
const panOf = (x) => clamp(x / 7, -0.8, 0.8);
function handleEvents() {
  const m = G.match;
  for (const e of m.events) {
    if (e.type === 'whistle') Sound.whistle(false);
    else if (e.type === 'touch') {
      const kind = e.kind === 'serve' && e.serveType === 'jump' ? 'serveJump' : e.kind;
      Sound.touch(kind, e.speed, panOf(e.x), farOf(e.x, e.y, e.z));
      if (e.kind === 'spike' || kind === 'serveJump') { trail.set(true); G.trailOff = wall + 0.7; Cam.shake = Math.max(Cam.shake, e.team === 0 ? 0.035 : 0.02); }
      if (e.kind === 'spike' || e.kind === 'serve') Hud.speed(e.kind === 'serve' ? (e.serveType === 'jump' ? 'Jump serve' : 'Float serve') : 'Spike', e.speed);
      if (e.kind === 'block') { crowd.excite = Math.max(crowd.excite, 0.8); if (e.block !== 'stuff') Sound.ooh(0.8); }
      if (e.kind === 'dig' && e.q > 0.3) { Sound.ooh(0.7); crowd.excite = Math.max(crowd.excite, 0.55); }
      crowd.clap = 0;
    } else if (e.type === 'timing') Hud.timing(e.label);
    else if (e.type === 'land') { const p = m.pl[e.pl]; puffs.burst(p.x, p.z, 7, 0.7); Sound.sand(panOf(p.x), farOf(p.x, 0, p.z), 0.6); }
    else if (e.type === 'jump') { const p = m.pl[e.pl]; puffs.burst(p.x, p.z, 5, 0.5); Sound.sand(panOf(p.x), farOf(p.x, 0, p.z), 0.35); }
    else if (e.type === 'dive') { const p = m.pl[e.pl]; G.views[e.pl].react('dive', { from: 0.25, rate: 1.15 }); G.views[e.pl].diveT = wall; G.views[e.pl].divePuff = false; Sound.sand(panOf(p.x), farOf(p.x, 0, p.z), 0.4); }
    else if (e.type === 'net') { net.hit(e.x, e.y, Math.sign(m.ball.v[2] || 1), e.kind === 'tape' ? 0.4 : 1); Sound.net(e.kind === 'tape'); if (e.kind === 'tape') Hud.pill('Off the tape!', 1400); }
    else if (e.type === 'antenna') Sound.net(true);
    else if (e.type === 'ballLand') { puffs.burst(e.x, e.z, 16, 1.1); Sound.sand(panOf(e.x), farOf(e.x, 0, e.z), 1); mark(e.x, e.z); }
    else if (e.type === 'call' && e.team === 0 && !G.attract) Hud.pill(`${m.pl[1].name}: “Out!”`, 1500);
    else if (e.type === 'point') onPoint(e, m);
    else if (e.type === 'setStart') { Hud.score(m); if (!G.attract) Hud.callout(`Set ${e.set}`, `to ${m.target()}`, 'white', 2000); }
    else if (e.type === 'matchEnd') { if (!G.attract) setTimeout(() => showEnd(e, m), 1800); else setTimeout(() => { if (G.attract && G.match === m) newMatch(true); }, 3000); }
  }
  m.events.length = 0;
}
function onPoint(e, m) {
  Hud.score(m, e.winner);
  G.stats.maxRally = Math.max(G.stats.maxRally, e.rally);
  setTimeout(() => Sound.whistle(false), 350);
  const ours = e.winner === 0, by = e.by >= 0 ? m.pl[e.by] : null;
  const winners = m.pl.filter((p) => p.team === e.winner), losers = m.pl.filter((p) => p.team !== e.winner);
  const big = e.reason === 'ace' || e.reason === 'kill' || e.reason === 'stuff';
  // the crowd: the home stand is with you
  const k = clamp(0.55 + e.rally * 0.06 + (big ? 0.2 : 0) + (e.setWon ? 0.5 : 0), 0.5, 1.5);
  Sound.applause(ours ? k : k * 0.65, 2 + e.rally * 0.1);
  crowd.excite = ours ? Math.min(1.4, 0.5 + k * 0.6) : 0.3; crowd.groan = ours ? 0 : 0.6;
  if (!G.attract) {
    // the call: what ended the rally (a winner by name), then the score, yours first
    const score = `${m.score[0]}–${m.score[1]}`;
    const main = e.setWon ? (e.matchWon ? (ours ? 'Match won' : 'Match lost') : (ours ? 'Set won' : 'Set lost')) : e.text;
    const sub = e.setWon ? `${m.sets[m.sets.length - 1].s.join('–')}` : big && by ? `${by.name} · ${score}` : `${ours ? 'Point to you' : 'Point to them'} · ${score}`;
    Hud.callout(main, sub, ours ? 'gold' : 'coral', e.setWon ? 2600 : 1500);
    if (big && e.winner === 0 && e.by === 0) { G.slowUntil = wall + 0.55; } // your winner, a beat of slow motion
    // the score called, serving team first (the server's team after the point is the winner)
    setTimeout(() => { if (G.match !== m) return; const a = m.score[m.servingTeam], b = m.score[1 - m.servingTeam]; const pf = m.pointFor(); Sound.say(e.setWon ? '' : `${a}, ${b}${pf ? `. ${pf.kind} point` : ''}`); }, 900);
  }
  for (const p of winners) if (Math.random() < (big ? 0.9 : 0.5)) G.views[p.id].react(Math.random() < 0.2 && e.setWon ? 'dance' : 'cheer', { from: 0.1, rate: 1.1, until: 2.4 });
  for (const p of losers) if (Math.random() < 0.35) G.views[p.id].react('missed', { from: 0.4, until: 2.2 });
  refPoint = { team: e.winner, t: wall };
}

/* ---- the ball as drawn: spin, its shadow, marks in the sand, the landing marker */
const marks = [];
function mark(x, z) {
  let mk = marks.find((q) => q.t < wall - 6) || null;
  if (!mk && marks.length < 6) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), new THREE.MeshBasicMaterial({ color: 0x6a4a2a, transparent: true, opacity: 0.4, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; scene.add(m); mk = { m, t: 0 }; marks.push(mk); }
  if (!mk) mk = marks.reduce((a, b) => (a.t < b.t ? a : b));
  mk.m.position.set(x, 0.011, z); mk.t = wall; mk.m.material.opacity = 0.42;
}
const _bq = new Q(), _ax = new V3();
function updateBall(dt) {
  const m = G.match, b = m.ball;
  ballObj.position.set(b.p[0], b.p[1], b.p[2]);
  // spin: the sim's own, or rolling in the sand, or the float's wobble
  const w = Math.hypot(b.w[0], b.w[1], b.w[2]);
  if (w > 0.5) { _ax.set(b.w[0], b.w[1], b.w[2]).normalize(); _bq.setFromAxisAngle(_ax, w * dt * 0.35); ballObj.quaternion.premultiply(_bq); }
  else if (b.live || b.rest) { const s = Math.hypot(b.v[0], b.v[2]); if (s > 0.2) { _ax.set(b.v[2], 0, -b.v[0]).normalize(); _bq.setFromAxisAngle(_ax, (s / COURT.R) * dt * (b.rest ? 1 : 0.15)); ballObj.quaternion.premultiply(_bq); } }
  const h = b.p[1];
  // never smaller on screen than about 7 px across its radius, however far the camera (the real ball is 21 cm)
  const dist = camera.position.distanceTo(ballObj.position), tanH = Math.tan((camera.fov * Math.PI) / 360);
  const k = clamp((8.5 * dist * tanH * 2) / (Math.max(320, innerHeight) * COURT.R), 1.3, 3.4);
  ballObj.scale.setScalar(k);
  blob.position.set(b.p[0], 0.012, b.p[2]); blob.scale.setScalar((1 + h * 0.12) * (0.6 + k * 0.4)); blob.material.opacity = clamp(0.6 - h * 0.035, 0.2, 0.6);
  blob.visible = b.live || b.rest || b.held !== null;
  const line = (b.live || b.held !== null) && h > 1.1 && !G.attract;
  dropLine.visible = line;
  if (line) { dropLine.position.set(b.p[0], h - COURT.R * k, b.p[2]); dropLine.scale.y = Math.max(0.01, h - COURT.R * k - 0.02); dropLine.material.opacity = clamp((h - 1.1) * 0.4, 0, 0.38); }
  if (G.trailOff && wall > G.trailOff) { trail.set(false); G.trailOff = 0; }
  trail.update(ballObj.position, dt);
  // where it will come down, on your side, for you to read
  const P = m.path, show = G.s.marker && !G.attract && m.phase === 'rally' && P && P.land && m.playTeam === 0 && P.land.z > 0.3 && b.p[2] > -9;
  marker.visible = !!show;
  if (show) { marker.position.x = P.land.x; marker.position.z = P.land.z; marker.rotation.z += dt * 1.6; }
  for (const mk of marks) mk.m.material.opacity = clamp(0.42 - (wall - mk.t) * 0.04, 0, 0.42);
}

/* ---- the human's stick into the sim */
const _st = new V3();
function applyInput() {
  const m = G.match; if (!m || G.attract) return;
  Input.world(_st);
  m.input.mx = _st.x; m.input.mz = _st.z; m.input.ax = _st.x; m.input.az = _st.z; m.input.auto = G.s.auto;
}
Input.onBtn = (btn) => { Sound.init(); if (G.mode === 'play' && !G.paused && G.match && !G.attract) G.match.pressBtn(btn); };
Input.onCam = () => setView(Cam.mode === 'side' ? 'broadcast' : 'side');
Input.onPause = () => { if (G.mode === 'play') pause(true); else if (G.mode === 'paused') pause(false); };
Input.onSkip = () => false;
Input.onAny = () => Sound.init();

/* ---- the referee on his stand */
let refPoint = null;
const refArm = { w: new V3(), pole: new V3(), wt: 1 };
function poseRef(dt) {
  const b = G.ref; if (!b) return;
  const st = G.refSt || (G.refSt = { x: -5.55, z: 0, yaw: Math.PI / 2, base: 1.53, arm: { r: null, l: null }, look: new V3(), lookW: 1, crouch: 0 });
  b.loco.tIdle += dt;
  st.look.copy(ballObj.position);
  st.arm.r = st.arm.l = null;
  if (refPoint && wall - refPoint.t < 1.8) {
    // he faces the court from the far post: your side (z > 0) is on his right. The arm out to the side that serves next
    const sgn = refPoint.team === 0 ? 1 : -1;
    const u = smooth((wall - refPoint.t - 0.35) / 0.25) * (1 - smooth((wall - refPoint.t - 1.45) / 0.3));
    refArm.wt = u;
    b.toWorld(sgn * 0.78, 1.5, 0.12, refArm.w); b.toWorld(sgn * 0.5, 1.0, -0.6, refArm.pole);
    if (sgn > 0) st.arm.r = refArm; else st.arm.l = refArm;
  }
  b.pose(st, dt);
}

/* ---- menus */
function setView(v) {
  Cam.mode = v; store.set('view', v); Cam.cut = false;
  $('viewName').textContent = v === 'side' ? 'Side' : 'Broadcast';
  for (const id of ['segView', 'segViewP']) for (const b of $(id).children) b.setAttribute('aria-pressed', String(b.dataset.v === v));
}
function seg(id, key, onChange) {
  const el = $(id);
  const paint = () => { for (const b of el.children) b.setAttribute('aria-pressed', String(b.dataset.v === (key === 'view' ? Cam.mode : G.s[key]))); };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; Sound.init(); Sound.click();
    if (key === 'view') setView(b.dataset.v); else { G.s[key] = b.dataset.v; store.set(key, b.dataset.v); }
    paint(); onChange && onChange();
  });
  paint();
}
function syncToggles() {
  const set = (id, on) => { const el = $(id); if (el) el.setAttribute('aria-pressed', String(!!on)); };
  set('togAuto', G.s.auto); set('togAutoP', G.s.auto); set('togMark', G.s.marker); set('togMarkP', G.s.marker);
  set('togSound', Sound.A.on); set('togSoundP', Sound.A.on); set('togVoiceP', Sound.A.voice);
}
function toggle(id, fn) { $(id).addEventListener('click', () => { Sound.init(); fn(); syncToggles(); Sound.click(); }); }
toggle('togAuto', () => { G.s.auto = !G.s.auto; store.set('auto', G.s.auto); }); toggle('togAutoP', () => { G.s.auto = !G.s.auto; store.set('auto', G.s.auto); });
toggle('togMark', () => { G.s.marker = !G.s.marker; store.set('marker', G.s.marker); }); toggle('togMarkP', () => { G.s.marker = !G.s.marker; store.set('marker', G.s.marker); });
toggle('togSound', () => Sound.set(!Sound.A.on)); toggle('togSoundP', () => Sound.set(!Sound.A.on));
toggle('togVoiceP', () => Sound.setVoice(!Sound.A.voice));

const FACES = Object.fromEntries(Object.keys(CHARS).map((k) => [k, `${PLAYERS}faces/${k}.jpg`]));
function paintPicks() {
  const el = $('pickChips'); el.innerHTML = '';
  for (const [k, c] of Object.entries(CHARS)) {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button';
    b.setAttribute('aria-pressed', String(k === G.s.char));
    b.innerHTML = `<span class="face" style="background-image:url(${FACES[k]})"></span>${c.name.split(' ')[0]}`;
    b.title = `${c.name} · ${c.look}`;
    b.addEventListener('click', () => pickChar(k));
    el.appendChild(b);
  }
  $('mateName').textContent = CHARS[G.s.mate].name;
  $('oppNames').textContent = `${CHARS[G.opp[0]].name} & ${CHARS[G.opp[1]].name}`;
}
async function pickChar(k) {
  Sound.init(); Sound.click();
  if (k === G.s.char) return;
  G.s.char = k; store.set('char', k);
  if (G.s.mate === k) { G.s.mate = Object.keys(CHARS).find((x) => x !== k); store.set('mate', G.s.mate); }
  if (G.opp.includes(k) || G.opp.includes(G.s.mate)) pickOpponents();
  paintPicks(); await refreshBodies();
}
$('mateShuffle').addEventListener('click', async () => {
  Sound.init(); Sound.click();
  const keys = Object.keys(CHARS).filter((x) => x !== G.s.char && x !== G.s.mate);
  G.s.mate = keys[Math.floor(Math.random() * keys.length)]; store.set('mate', G.s.mate);
  pickOpponents(); paintPicks(); await refreshBodies();
});
async function refreshBodies() {
  const btn = $('playBtn'); btn.disabled = true; btn.textContent = 'Loading players…';
  try { await ensureChars(); } catch (e) { console.warn(e); }
  btn.disabled = false; btn.textContent = 'Play';
  if (G.match) newMatch(G.attract);
}
$('nameIn').value = G.s.name;
$('nameIn').addEventListener('input', () => { G.s.name = $('nameIn').value.slice(0, 14); store.set('name', G.s.name); });
$('nameIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('nameIn').blur(); } e.stopPropagation(); });

function showMenu() {
  if (newerRelease) reloadForRelease();
  G.mode = 'menu'; G.paused = false;
  $('menu').hidden = false; $('hud').hidden = true; $('touch').hidden = true; $('pausePanel').hidden = true; $('endPanel').hidden = true;
  Sound.crowd(0.035);
  newMatch(true);
}
function play() {
  Sound.init(); Sound.click();
  $('menu').hidden = true; $('hud').hidden = false; $('touch').hidden = !COARSE;
  $('keyHint').hidden = COARSE || store.get('hinted', 0) >= 3; store.set('hinted', store.get('hinted', 0) + 1);
  $('keyHint').style.opacity = 1; setTimeout(() => { $('keyHint').style.opacity = 0; }, 12000);
  G.mode = 'play';
  Sound.crowd(0.05);
  newMatch(false);
  canvas.focus();
}
function pause(on) {
  if (on && G.mode !== 'play') return;
  G.paused = on; G.mode = on ? 'paused' : 'play';
  $('pausePanel').hidden = !on;
  if (on) {
    const m = G.match, sets = m.sets.map((s) => s.s.join('–')).concat(m.phase !== 'over' ? [m.score.join('–')] : []).join(', ');
    $('pauseSub').textContent = `${$('nm0').textContent} v ${$('nm1').textContent} · ${sets}`;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  syncToggles();
}
function showEnd(e, m) {
  G.mode = 'end';
  for (const p of m.pl) if (p.team === e.winner) G.views[p.id].react('dance', { loop: true, until: 1e9 });
  const you = e.winner === 0, T0 = m.teamStats[0], T1 = m.teamStats[1], me = m.pl[0].stats;
  $('endTitle').textContent = you ? 'Match won' : 'Match lost'; $('endTitle').className = you ? 'win' : '';
  $('endSub').textContent = `${$('nm0').textContent} v ${$('nm1').textContent} · ${DIFFS[G.s.diff].name}`;
  $('endGames').innerHTML = m.sets.map((s) => `<span class="${s.s[0] > s.s[1] ? 'w' : ''}">${s.s[0]}–${s.s[1]}</span>`).join('');
  const pc = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');
  const so = (t) => pc(t.sideOuts, t.sideOutTries);
  const rows = [['Points', T0.points, T1.points], ['Kills', T0.kills, T1.kills], ['Aces', T0.aces, T1.aces], ['Stuff blocks', T0.blocks, T1.blocks], ['Errors', T0.errors, T1.errors], ['Side out', so(T0), so(T1)],
    ['Your kills · aces · blocks', `${me.kills} · ${me.aces} · ${me.blocks}`, ''], ['Your digs', me.digs, ''], ['Your fastest spike', me.topSpike ? `${Math.round(me.topSpike)} km/h` : '–', ''], ['Your fastest serve', me.topServe ? `${Math.round(me.topServe)} km/h` : '–', ''], ['Perfect timing', pc(me.perfect, me.timed), ''], ['Longest rally', `${G.stats.maxRally} touches`, '']];
  $('endStats').innerHTML = `<tr><th></th><th class="c0">${m.o.teamNames[0]}</th><th class="c1">${m.o.teamNames[1]}</th></tr>` + rows.map(([k, a, b]) => `<tr><td>${k}</td><td>${a}</td><td>${b}</td></tr>`).join('');
  $('endPanel').hidden = false; $('touch').hidden = true;
}
$('playBtn').addEventListener('click', () => { if (!$('playBtn').disabled) play(); });
$('resumeBtn').addEventListener('click', () => { Sound.click(); pause(false); });
$('restartBtn').addEventListener('click', () => { Sound.click(); pause(false); newMatch(false); });
$('quitBtn').addEventListener('click', () => { Sound.click(); showMenu(); });
$('againBtn').addEventListener('click', () => { Sound.click(); $('endPanel').hidden = true; $('touch').hidden = !COARSE; G.mode = 'play'; newMatch(false); });
$('menuBtn').addEventListener('click', () => { Sound.click(); showMenu(); });
$('pauseBtn').addEventListener('click', () => { Sound.init(); pause(true); });
$('viewBtn').addEventListener('click', () => { Sound.init(); Sound.click(); Input.onCam(); });
canvas.addEventListener('pointerdown', () => Sound.init());
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') pause(true); else if (!document.hidden) checkRelease(); });

/* a newer release on the site (a higher ?v= on game.js in index.html): reload into it outside a match */
const RELEASE = +(new URL(import.meta.url).searchParams.get('v') || 0);
let newerRelease = 0;
async function checkRelease() {
  try {
    const html = await (await fetch(`./?release=${Date.now()}`, { cache: 'no-store' })).text();
    const v = +((html.match(/js\/game\.js\?v=(\d+)/) || [])[1] || 0);
    if (v > RELEASE) { newerRelease = v; if (G.mode !== 'play' && G.mode !== 'paused') reloadForRelease(); }
  } catch (e) { /* offline: carry on */ }
}
function reloadForRelease() {
  const v = newerRelease;
  try { if (sessionStorage.getItem('ss.reloadedFor') === String(v)) return; sessionStorage.setItem('ss.reloadedFor', String(v)); } catch (e) { return; }
  const u = new URL(location.href); u.searchParams.set('v', v); location.replace(u.toString());
}
setInterval(() => { if (!document.hidden) checkRelease(); }, 5 * 60 * 1000);
window.addEventListener('pageshow', (e) => { if (e.persisted) checkRelease(); });
checkRelease();

/* ------------------------------------------------------------------ resize & quality */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; Cam.lift = -1; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(w, h); }
  if (bloom) bloom.resolution.set(w / 2, h / 2);
  Cam.cut = true;
}
addEventListener('resize', resize);
const perf = { acc: 0, n: 0 };
function watchPerf(dt) {
  perf.acc += dt; perf.n++;
  if (perf.n >= 90) { const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0; if (avg > 0.024 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); } }
}

/* ------------------------------------------------------------------ the loop */
let last = performance.now(), wall = 0, stepping = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  if (stepping) return;
  watchPerf(dt);
  tick(dt);
  render();
}
function render() { if (composer) composer.render(); else renderer.render(scene, camera); }
const _foc = new V3();
function tick(dt) {
  wall += dt;
  Input.poll();
  const m = G.match;
  if (m) {
    applyInput();
    G.pace = damp(G.pace, wall < G.slowUntil ? 0.35 : 1, 8, dt);
    if (!G.paused) { m.step(dt * G.pace); handleEvents(); }
    if (G.match === m) {
      updateBall(dt);
      for (let i = 0; i < 4; i++) if (G.views[i]) {
        G.views[i].update(dt * (G.paused ? 0 : G.pace), m.pl[i], m, ballObj.position);
        const v = G.views[i], p = m.pl[i];
        if (p.dive && !v.divePuff && m.T - p.dive.t0 > 0.32) { v.divePuff = true; puffs.burst(p.x, p.z, 14, 1.2); Sound.sand(panOf(p.x), farOf(p.x, 0, p.z), 0.9); }
      }
      poseRef(dt * (G.paused ? 0 : 1));
      // your ring, and the buttons lit, when a press now would be perfect
      const me = m.pl[0];
      if (!G.attract) {
        ring.position.x = me.x; ring.position.z = me.z;
        const cue = m.cue, now = !!(cue && cue.now);
        ring.material.color.setHex(now ? 0xfff2a8 : 0x4fe3c1); ring.material.opacity = now ? 1 : 0.6; ring.scale.setScalar(now ? 1.25 : 1);
        Hud.cue(now); Hud.labels(m.buttonLabels()); Hud.touches(m.touches, m.possTeam === 0 && m.phase === 'rally' && m.lastTeam === 0);
      }
    }
    net.update(dt); puffs.update(dt);
  }
  // the beach lives on: the sea, the clouds, the flags, the crowd
  seaU.uTime.value = wall; skyU.uTime.value = wall; foamU.uTime.value = wall;
  for (const f of crowd.flags) { const a = f.geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const x = f.base[i]; a[i + 2] = Math.sin(wall * 3.2 + x * 4 + f.ph) * x * 0.16; } f.geo.attributes.position.needsUpdate = true; }
  crowd.excite = Math.max(0, crowd.excite - dt * 0.35); crowd.groan = Math.max(0, crowd.groan - dt * 0.5);
  if (m && m.phase === 'serve') crowd.clap = Math.min(1, crowd.clap + dt * 0.8); else crowd.clap = Math.max(0, crowd.clap - dt * 1.5);
  for (const U of crowd.fans) { U.uTime.value = wall; U.uHype.value = clamp(crowd.excite * 1.1 - 0.15, 0, 1); U.uGroan.value = clamp(crowd.groan, 0, 1); U.uClap.value = clamp(crowd.clap, 0, 1); }
  bulbs.set(0.75 + 0.25 * Math.sin(wall * 0.2));
  const focus = m ? _foc.set(m.ball.p[0] * 0.6 + m.pl[0].x * 0.4, 0, m.ball.p[2]) : _foc.set(0, 0, 0);
  updateCamera(dt, focus);
}

/* ------------------------------------------------------------------ start */
async function boot() {
  resize();
  seg('segDiff', 'diff'); seg('segFmt', 'fmt'); seg('segView', 'view'); seg('segViewP', 'view');
  setView(Cam.mode); syncToggles(); paintPicks();
  loadBar(0.2, 'Bringing the players down to the beach…');
  const progTimer = setInterval(() => { const keys = Object.keys(progress), p = keys.length ? keys.reduce((a, k) => a + progress[k], 0) / 5 : 0; loadBar(0.2 + 0.7 * clamp(p, 0, 1)); }, 120);
  try {
    const clipsP = fetch(`${PLAYERS}moves.json`).then((r) => { if (!r.ok) throw new Error(`moves.json ${r.status}`); return r.json(); });
    const [clips] = await Promise.all([clipsP, ...lineup().map(loadChar), LITE ? Promise.resolve() : loadChar('josh')]);
    CLIPS = clips; CLIP_BI = Object.fromEntries(clips.bones.map((n, i) => [n, i]));
  } catch (e) { clearInterval(progTimer); window.__fatal('The players could not be loaded. Check the connection and reload.', e && e.message); return; }
  clearInterval(progTimer);
  loadBar(0.94, 'Warming up…');
  await ensureChars();
  if (G.K.josh) G.ref = new Body(G.K.josh, { name: 'Referee' });
  if (!LITE) setTimeout(() => { for (const k of Object.keys(CHARS)) loadChar(k).catch(() => {}); }, 2500);
  showMenu();
  renderer.compile(scene, camera);
  loadBar(1, 'Ready');
  $('loadPanel').hidden = true;
  $('playBtn').disabled = false; $('playBtn').textContent = 'Play';
  requestAnimationFrame(frame);
  if (DEBUG) window.__ss = {
    G, Cam, Sound, Input, setView, play, showMenu, newMatch, THREE, scene, camera, renderer, CHARS, crowd, puffs,
    step(n = 1, dt = 1 / 60, draw = true) { stepping = true; for (let i = 0; i < n; i++) tick(dt); if (draw) render(); },
    release() { stepping = false; last = performance.now(); },
    draw: render,
    camAt(p, l, fov = 35) { Cam.script = p ? () => ({ pos: new V3(...p), look: new V3(...l), fov, k: 50 }) : null; Cam.cut = true; },
  };
}
boot().catch((e) => { console.error(e); window.__fatal('Something went wrong while setting up the beach.', e && (e.message || e)); });
