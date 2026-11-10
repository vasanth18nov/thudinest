/* Set Point: the stadium, the players and the broadcast. The tennis itself (flight, bounce, shots, rules, scoring,
   the computer's choices) is in sim.js; this file draws it, animates the players from it, films it and takes the
   controls. The players, their clips and the crowd's sounds are Rally Point's (../bm), the spectators Final Whistle's.
   Axes as in sim.js: x across the court, y up, z along it, the net at z = 0; you play the half z > 0. */
import * as THREE from '../../bm/vendor/three.js';
import { Match, COURT, DIFFS, SHOTS, sideSign, netHeight, isServe } from './sim.js?v=1'; // bump ?v= here and in index.html with each release
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
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('sp.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sp.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const loadBar = (p, step) => { $('loadBar').style.transform = `scaleX(${clamp(p, 0.04, 1).toFixed(3)})`; if (step) $('loadStep').textContent = step; };
loadBar(0.12, 'Building the stadium…');

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
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1024);
scene.fog = new THREE.Fog(0x141a36, 70, 190);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
{
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  pm.dispose();
}
let composer = null, bloom = null;
if (!LITE) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  composer = new THREE.EffectComposer(renderer, rt);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.55, 1.05); // the floodlights, the LEDs, the moon
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
const std = (color, roughness = 0.7, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra));
const _m4 = new THREE.Matrix4();

/* ------------------------------------------------------------------ the sky */
/* Twilight over the stadium: the last of the sunset low in the west, deep blue overhead, stars, a rising moon */
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(0x050a1d) }, uMid: { value: new THREE.Color(0x1b2456) }, uLow: { value: new THREE.Color(0xd9774a) }, uGlow: { value: new THREE.Color(0xffb46b) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uGlow; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){
        float y = vP.y;
        // the sunset sits low behind the far stand and to the west (-x)
        float west = pow(max(0.0, dot(normalize(vec3(vP.x, 0.0, vP.z)), normalize(vec3(-0.55, 0.0, -1.0)))), 3.0);
        vec3 c = mix(uMid, uTop, smoothstep(0.08, 0.6, y));
        c = mix(mix(uLow, uMid, 0.55), c, smoothstep(-0.02, 0.22, y));
        c += uGlow * west * exp(-max(y, 0.0) * 9.0) * 0.85;
        // stars, more of them higher up
        vec3 g = floor(vP * 420.0);
        float s = step(0.9965, h(g)) * smoothstep(0.18, 0.6, y);
        c += vec3(s) * (0.6 + 0.4 * h(g + 1.0));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; scene.add(sky);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,248,226,1)'); gr.addColorStop(0.32, 'rgba(255,244,214,1)'); gr.addColorStop(0.38, 'rgba(255,236,200,0.25)'); gr.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, { aniso: 1 }), fog: false, depthWrite: false, toneMapped: false }));
  moon.position.set(150, 120, -170); moon.scale.setScalar(26); scene.add(moon);
}

/* ------------------------------------------------------------------ the court */
const arena = new THREE.Group(); scene.add(arena);
const SURF = { x: COURT.halfW + 3.9, z: COURT.halfL + 6.6 }; // the hard court, to the walls round it
{
  // acrylic hard court: blue inside the doubles lines, green round them, a fine sanded grain
  const PX = 96; // texels a metre on the canvas
  const tex = canvasTex(Math.round(2 * SURF.x * 48), Math.round(2 * SURF.z * 48), (g, w, h) => {
    const sx = w / (2 * SURF.x), sz = h / (2 * SURF.z);
    g.fillStyle = '#2f6e57'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b5fa8'; g.fillRect((SURF.x - COURT.halfW) * sx, (SURF.z - COURT.halfL) * sz, 2 * COURT.halfW * sx, 2 * COURT.halfL * sz);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
    // worn patches behind the baselines, where the players stand
    for (const s of [-1, 1]) {
      const cx = w / 2, cz = (SURF.z + s * (COURT.halfL + 0.9)) * sz;
      const gr = g.createRadialGradient(cx, cz, 0, cx, cz, 3.2 * sx); gr.addColorStop(0, 'rgba(210,225,240,0.10)'); gr.addColorStop(1, 'rgba(210,225,240,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cz, 4.2 * sx, 2.2 * sz, 0, 0, TAU); g.fill();
    }
    // the event's name painted behind each baseline
    g.save(); g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = `900 italic ${Math.round(1.05 * sz)}px "Barlow Condensed", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(w / 2, (SURF.z - COURT.halfL - 3.4) * sz); g.fillText('THUDINEST OPEN', 0, 0); g.restore();
    g.save(); g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = `900 italic ${Math.round(1.05 * sz)}px "Barlow Condensed", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('THUDINEST OPEN', w / 2, (SURF.z + COURT.halfL + 3.4) * sz); g.restore();
  });
  void PX;
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(2 * SURF.x, 2 * SURF.z), std(0xffffff, 0.86, { map: tex, envMapIntensity: 0.4 }));
  surf.rotation.x = -Math.PI / 2; surf.receiveShadow = true; arena.add(surf);
  // the lines: 5 cm (10 cm baselines), each inside the measurement it marks
  const L = COURT.line, parts = [];
  const strip = (x0, z0, x1, z1) => { const g = new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2); parts.push(g); };
  const { halfW: W, halfWS: WS, halfL: HL, svc } = COURT;
  for (const s of [-1, 1]) {
    strip(s * W - s * L, -HL, s * W, HL); // doubles sidelines
    strip(s * WS - s * L, -HL, s * WS, HL); // singles sidelines
    strip(-W, s * HL - s * 0.1, W, s * HL); // baselines
    strip(-WS, s * svc - s * L, WS, s * svc); // service lines
    strip(-L / 2, 0, L / 2, s * svc); // centre service line
    strip(-L / 2, s * HL - s * 0.1, L / 2, s * (HL - 0.2)); // centre marks
  }
  const lines = new THREE.Mesh(THREE.mergeGeometries(parts), std(0xf4f6f8, 0.75, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  lines.position.y = 0.003; lines.receiveShadow = true; arena.add(lines);
  // the concourse beyond the walls
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), std(0x161b29, 0.95));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; floor.receiveShadow = true; arena.add(floor);
}

/* ------------------------------------------------------------------ the net */
const net = {};
{
  const W = COURT.postX, segs = 80, drop = 1.0;
  const meshTex = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(16,18,22,0.92)'; g.lineWidth = 3;
    for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, { repeat: [2 * W / 0.045, drop / 0.045] });
  const geo = new THREE.PlaneGeometry(2 * W, drop, segs, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), v = (pos.getY(i) + drop / 2) / drop;
    pos.setY(i, Math.max(0.01, netHeight(x) - (drop - 0.02) * (1 - v)) - 0.01);
  }
  geo.computeVertexNormals();
  net.base = Float32Array.from(pos.array); net.geo = geo;
  net.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: meshTex, transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false, alphaTest: 0.02 }));
  arena.add(net.mesh);
  // the white band over the top, the centre strap, the cable, the posts and the singles sticks
  const tape = new THREE.BoxGeometry(2 * W, 0.06, 0.018, segs, 1, 1), tp = tape.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, tp.getY(i) + netHeight(tp.getX(i)) - 0.03);
  tape.computeVertexNormals();
  const tapeMat = std(0xffffff, 0.55, { emissive: 0x2a2a2a });
  arena.add(new THREE.Mesh(tape, tapeMat));
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, COURT.netH, 0.02), tapeMat); strap.position.set(0, COURT.netH / 2, 0); arena.add(strap);
  const postMat = std(0x1d3a2e, 0.4, { metalness: 0.5 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, COURT.netHPost + 0.03, 16), postMat);
    post.position.set(s * (W + 0.03), (COURT.netHPost + 0.03) / 2, 0); post.castShadow = true; arena.add(post);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), postMat); knob.position.set(s * (W + 0.03), COURT.netHPost + 0.04, 0); arena.add(knob);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, netHeight(COURT.halfWS + 0.914), 8), std(0xf2f2f2, 0.5));
    stick.position.set(s * (COURT.halfWS + 0.914), netHeight(COURT.halfWS + 0.914) / 2, 0); arena.add(stick);
  }
  net.hit = { x: 0, y: 0, t: -9, dir: 1 };
  net.update = (t) => {
    const age = t - net.hit.t;
    if (age > 1.4) { if (net.dirty) { pos.array.set(net.base); pos.needsUpdate = true; net.dirty = false; } return; }
    const a = pos.array, amp = 0.12 * Math.exp(-age * 3.6) * Math.cos(age * 16);
    for (let i = 0; i < pos.count; i++) {
      const x = net.base[i * 3], y = net.base[i * 3 + 1];
      const r2 = ((x - net.hit.x) ** 2) / 0.3 + ((y - net.hit.y) ** 2) / 0.12;
      a[i * 3 + 2] = net.hit.dir * amp * Math.exp(-r2);
    }
    pos.needsUpdate = true; net.dirty = true;
  };
}

/* ------------------------------------------------------------------ the stadium */
const led = {};
const crowd = {};
{
  // the boards round the court: one long LED ribbon scrolled along every board
  const ADS = [['THUDINEST OPEN', '#d4ff3a'], ['SET POINT', '#ffffff'], ['THUDI NEST No.2 · COIMBATORE', '#7fd3ff'], ['BOOK YOUR STAY ON AIRBNB', '#ff9a6b'], ['3D TENNIS', '#ffffff']];
  const drawAds = (g, w, h, flash) => {
    g.fillStyle = flash ? flash.bg : '#0a1a3a'; g.fillRect(0, 0, w, h);
    g.textBaseline = 'middle'; g.font = '800 italic 74px "Barlow Condensed", Impact, sans-serif';
    if (flash) { g.fillStyle = flash.fg; const step = g.measureText(flash.text).width + 90; for (let x = 30; x < w; x += step) g.fillText(flash.text, x, h / 2 + 4); return; }
    let x = 30;
    while (x < w) for (const [t, c] of ADS) { if (x >= w) break; g.fillStyle = c; g.fillText(t, x, h / 2 + 4); x += g.measureText(t).width + 40; g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 24, h * 0.3, 6, h * 0.4); x += 22; }
  };
  led.canvas = document.createElement('canvas'); led.canvas.width = 2048; led.canvas.height = 128;
  led.tex = new THREE.CanvasTexture(led.canvas); led.tex.colorSpace = THREE.SRGBColorSpace; led.tex.wrapS = THREE.RepeatWrapping; led.tex.anisotropy = maxAniso;
  led.draw = (flash) => { drawAds(led.canvas.getContext('2d'), 2048, 128, flash); led.tex.needsUpdate = true; };
  led.draw(null); led.flashUntil = 0;
  led.flash = (text, bg = '#d4ff3a', fg = '#10170a', secs = 3) => { led.draw({ text, bg, fg }); led.flashUntil = performance.now() + secs * 1000; };
  const ledMat = new THREE.MeshBasicMaterial({ map: led.tex, toneMapped: false });
  ledMat.color.setScalar(LITE ? 0.85 : 1.2);
  const wallMat = std(0x0d2a52, 0.8);
  led.boards = [];
  const WX = SURF.x + 0.15, WZ = SURF.z + 0.15;
  const wall = (len, x, z, ry) => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(len, 1.15, 0.2), wallMat); box.position.y = 0.575; box.receiveShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.82), ledMat.clone());
    face.material.map = led.tex.clone(); face.material.map.repeat.set(len / 11, 1); face.material.map.needsUpdate = true;
    face.position.set(0, 0.58, 0.101);
    g.add(box, face); g.position.set(x, 0, z); g.rotation.y = ry; arena.add(g);
    led.boards.push(face.material.map);
  };
  for (const s of [-1, 1]) { wall(2 * WX, 0, s * WZ, s > 0 ? Math.PI : 0); wall(2 * WZ, s * WX, 0, -s * Math.PI / 2); }
  led.update = (t) => {
    for (const [i, m] of led.boards.entries()) { m.offset.x = (t * 0.03 + i * 0.27) % 1; m.image = led.canvas; }
    if (led.flashUntil && performance.now() > led.flashUntil) { led.flashUntil = 0; led.draw(null); }
  };

  /* The bowl: stepped stands on all four sides behind the walls, plastic seats, and people in them. The front rows are
     real people (fans.js: they sit, clap, hold their heads, jump up); the rows above are the old instanced crowd, too
     far to tell. Each stand is a group, so a camera standing in it or behind it can hide it. */
  const realRows = LITE ? 3 : 5, rows = LITE ? 9 : 13, rowD = 0.86, rowH = 0.46, base = 1.25;
  const concrete = std(0x1a2236, 0.92), riserMat = std(0x121a2c, 0.9);
  const seatGeo = new THREE.BoxGeometry(0.46, 0.4, 0.42); seatGeo.translate(0, 0.2, 0);
  const torsoGeo = new THREE.BoxGeometry(0.42, 0.58, 0.26); torsoGeo.translate(0, 0.62, 0.02);
  const headGeo = new THREE.SphereGeometry(0.115, 7, 5); headGeo.translate(0, 1.04, 0.02);
  const shirts = [0x2a6fdb, 0xd4ff3a, 0xf2f4fb, 0xff5b4f, 0x1b2a4a, 0x39a3ff, 0xffb347, 0x3fe0a2, 0x6b4fd8, 0x2b2f3a, 0xe0e4ee, 0xff8fb1];
  const skins = [0x8d5a3b, 0x6b4128, 0xc68e6a, 0xa86f4c, 0xe0b08f, 0x5a3622, 0xf1c7a5];
  crowd.uTime = { value: 0 }; crowd.uExcite = { value: 0 };
  const boxMat = (extra) => {
    const m = new THREE.MeshLambertMaterial(extra);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = crowd.uTime; sh.uniforms.uExcite = crowd.uExcite;
      sh.vertexShader = 'uniform float uTime; uniform float uExcite;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = float(gl_InstanceID) * 1.618 + instanceMatrix[3].x * 0.37;
        float up = uExcite * smoothstep(0.25, 0.75, fract(ph * 7.31));
        transformed.y += 0.012 * sin(uTime * 1.7 + ph * 5.0) + up * (0.32 + 0.1 * max(0.0, sin(uTime * 11.0 + ph * 3.0)));`);
    };
    return m;
  };
  const seatMat = std(0xffffff, 0.6), torsoMat = boxMat({ color: 0xffffff }), headMat = boxMat({ color: 0xffffff });
  const p = new V3(), q0 = new Q(), sc = new V3(1, 1, 1), col = new THREE.Color();
  crowd.stands = []; crowd.fans = [];
  const tier = (cx, cz, len, ry, behind, fill) => {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; arena.add(g);
    const spots = [], real = [];
    for (let r = 0; r < rows; r++) {
      const top = base + rowH * r, step = new THREE.Mesh(new THREE.BoxGeometry(len, top + 0.4, rowD), r % 2 ? concrete : riserMat);
      step.position.set(0, (top + 0.4) / 2 - 0.4, r * rowD + rowD / 2); step.receiveShadow = r < 3; g.add(step);
      for (let x = -len / 2 + 0.4; x < len / 2 - 0.3; x += 0.6) {
        const s = { x: x + rand(-0.03, 0.03), y: top, z: r * rowD + 0.5, r };
        spots.push(s);
        if (r < realRows) { if (Math.random() < fill) real.push(s); } else if (Math.random() < 0.72) s.box = true;
      }
    }
    const wallB = new THREE.Mesh(new THREE.PlaneGeometry(len, 14), std(0x0a0f1e, 0.95)); wallB.rotation.y = Math.PI; wallB.position.set(0, 7, rows * rowD + 0.2); g.add(wallB);
    const seats = new THREE.InstancedMesh(seatGeo, seatMat, spots.length);
    const people = spots.filter((s) => s.box);
    const torsos = new THREE.InstancedMesh(torsoGeo, torsoMat, people.length), heads = new THREE.InstancedMesh(headGeo, headMat, people.length);
    const seatCols = [0x1d4fa6, 0x1d4fa6, 0x1d4fa6, 0x2d8a62];
    spots.forEach((s, i) => { _m4.compose(p.set(s.x, s.y - 0.4, s.z), q0, sc.setScalar(1)); seats.setMatrixAt(i, _m4); seats.setColorAt(i, col.setHex(seatCols[(s.r + (i % 7 === 0 ? 3 : 0)) % 4]).multiplyScalar(0.75 + Math.random() * 0.25)); });
    people.forEach((s, i) => {
      _m4.compose(p.set(s.x, s.y - 0.4, s.z), q0, sc.setScalar(rand(0.92, 1.08))); torsos.setMatrixAt(i, _m4); heads.setMatrixAt(i, _m4);
      // high up and in the shade of the roofline: muted, so they read as a crowd, not as blocks
      torsos.setColorAt(i, col.setHex(shirts[(Math.random() * shirts.length) | 0]).lerp(new THREE.Color(0x283048), 0.55).multiplyScalar(0.42));
      heads.setColorAt(i, col.setHex(skins[(Math.random() * skins.length) | 0]).multiplyScalar(0.4));
    });
    for (const m of [seats, torsos, heads]) { m.frustumCulled = false; g.add(m); }
    // the real people, in the stand's frame (fans.js faces them along +z: here toward the court is -z)
    const fans = buildFans(g, real.map((s) => ({ x: s.x, y: s.y, z: s.z - 0.08, ry: Math.PI })), {});
    crowd.fans.push(fans.uniforms);
    crowd.stands.push({ g, behind });
  };
  const fill = LITE ? 0.5 : 0.75;
  tier(0, -(SURF.z + 0.6), 2 * SURF.x + 6, Math.PI, (c) => c.z < -(SURF.z + 0.3), fill);
  tier(0, SURF.z + 0.6, 2 * SURF.x + 6, 0, (c) => c.z > SURF.z + 0.3, fill);
  tier(-(SURF.x + 0.6), 0, 2 * SURF.z - 2, -Math.PI / 2, (c) => c.x < -(SURF.x + 0.3), fill);
  tier(SURF.x + 0.6, 0, 2 * SURF.z - 2, Math.PI / 2, (c) => c.x > SURF.x + 0.3, fill);
  // the corners of the bowl, closed with stepped blocks so no sky shows between the stands
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const span = rows * rowD + 1.2, top = base + rows * rowH + 7.5;
    for (let r = 0; r < 3; r++) {
      const h = lerp(base + 2.5, top, r / 2), w = span * (1 + 0.35 * r), blk = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), r % 2 ? concrete : riserMat);
      blk.position.set(sx * (SURF.x + 0.6 + w / 2 + r * 0.6), h / 2, sz * (SURF.z + 0.6 + w / 2 + r * 0.6)); arena.add(blk);
    }
  }
  crowd.cull = (cam) => { for (const s of crowd.stands) s.g.visible = !s.behind(cam); };
  crowd.excite = 0; crowd.groan = 0; crowd.clap = 0;
  crowd.update = (t, dt) => {
    crowd.uTime.value = t; crowd.excite = Math.max(0, crowd.excite - dt * 0.45); crowd.uExcite.value = smooth(crowd.excite);
    crowd.groan = Math.max(0, crowd.groan - dt * 0.6); crowd.clap = Math.max(0, crowd.clap - dt * 0.32);
    for (const U of crowd.fans) { U.uTime.value = t; U.uHype.value = clamp(crowd.excite * 1.1 - 0.15, 0, 1); U.uGroan.value = clamp(crowd.groan, 0, 1); U.uClap.value = clamp(crowd.clap, 0, 1); }
  };
  crowd.cheer = (k = 1) => { crowd.excite = Math.max(crowd.excite, k); crowd.clap = Math.max(crowd.clap, k * 1.3); };
  crowd.applaud = (k = 1) => { crowd.clap = Math.max(crowd.clap, k); };
  crowd.ooh = (k = 1) => { crowd.groan = Math.max(crowd.groan, k); };

  // a big screen above the far stand, showing the score
  const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 448;
  crowd.screen = { canvas: scr, tex: new THREE.CanvasTexture(scr) };
  crowd.screen.tex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: crowd.screen.tex, toneMapped: false }); screenMat.color.setScalar(LITE ? 0.9 : 1.15);
  const sz = -(SURF.z + 0.6 + rows * rowD + 0.6), sy = base + rows * rowH + 4.4;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.8), screenMat); screen.position.set(0, sy, sz);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(11.6, 5.3, 0.4), std(0x0a0f1c, 0.6)); frame.position.set(0, sy, sz - 0.25);
  arena.add(screen, frame);
  crowd.drawScreen = (m, names) => {
    const g = scr.getContext('2d'), W = scr.width, H = scr.height;
    g.fillStyle = '#071226'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d4ff3a'; g.fillRect(0, 0, W, 64);
    g.fillStyle = '#10170a'; g.font = '800 italic 44px "Barlow Condensed", Impact, sans-serif'; g.textBaseline = 'middle'; g.fillText('THUDINEST OPEN · SET POINT', 28, 34);
    if (!m) return;
    const b = m.board();
    for (const i of [0, 1]) {
      const y = 140 + i * 150;
      g.fillStyle = i === 0 ? '#39a3ff' : '#ff5b4f'; g.fillRect(28, y - 52, 14, 104);
      g.fillStyle = '#ffffff'; g.font = '800 72px "Barlow Condensed", Impact, sans-serif'; g.textAlign = 'left';
      g.fillText((names[i] || '').toUpperCase(), 64, y + 4, 470);
      g.textAlign = 'center'; g.fillStyle = '#9fb0d6';
      m.setScores.forEach((s, k) => g.fillText(String(s.g[i]), 600 + k * 80, y + 4));
      g.fillStyle = '#ffffff'; g.fillText(String(m.games[i]), 600 + m.setScores.length * 80, y + 4);
      g.fillStyle = '#d4ff3a'; g.fillText(b[i], 900, y + 4);
      if (m.server === i && m.phase !== 'over') { g.beginPath(); g.arc(560 - 8, y + 4, 12, 0, TAU); g.fill(); }
    }
    crowd.screen.tex.needsUpdate = true;
  };
  crowd.drawScreen(null, []);
}

/* ------------------------------------------------------------------ the umpire's chair */
const chair = new THREE.Group();
{
  const metal = std(0x23324a, 0.4, { metalness: 0.5 }), wood = std(0x1c2a44, 0.6), cush = std(0x0e1830, 0.8);
  const leg = (x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.95, 0.06), metal); m.position.set(x, 0.975, z); m.castShadow = true; chair.add(m); };
  leg(-0.32, -0.36); leg(-0.32, 0.36); leg(0.32, -0.36); leg(0.32, 0.36);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.86), wood); deck.position.y = 1.95; deck.castShadow = true; chair.add(deck);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.5), cush); seat.position.set(-0.1, 2.36, 0); seat.castShadow = true; chair.add(seat);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.38, 0.09), metal); post.position.set(-0.1, 2.15, 0); chair.add(post);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.5), cush); back.position.set(-0.36, 2.66, 0); back.castShadow = true; chair.add(back);
  const rest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.6), wood); rest.position.set(0.28, 2.0, 0); chair.add(rest);
  const front = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#0c1d3e'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4ff3a'; g.font = '900 italic 46px "Barlow Condensed", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UMPIRE', w / 2, h / 2 + 3); });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.36), std(0xffffff, 0.6, { map: front })); panel.position.set(0.41, 1.65, 0); panel.rotation.y = Math.PI / 2; chair.add(panel);
  for (const y of [0.4, 0.8, 1.2, 1.6]) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.7), metal); rung.position.set(0.34, y, 0); chair.add(rung); }
  chair.position.set(-(COURT.postX + 0.95), 0, 0);
  arena.add(chair);
  // the players' benches by the chair, under a small canopy
  for (const s of [-1, 1]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 1.8), std(0x1d4fa6, 0.6)); bench.position.set(-(SURF.x - 0.6), 0.225, s * 2.6); bench.castShadow = true; arena.add(bench);
    const towel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.5), std(0xf2f4fb, 0.9)); towel.position.set(-(SURF.x - 0.6), 0.47, s * 2.9); arena.add(towel);
  }
}

/* ------------------------------------------------------------------ lights */
/* Four banks of floodlights on masts at the corners of the bowl, and the key light over the court that throws the
   players' shadows */
const lights = {};
{
  lights.hemi = new THREE.HemisphereLight(0xb8c8ff, 0x1a2a2a, 0.55); scene.add(lights.hemi);
  const key = lights.key = new THREE.SpotLight(0xfff6e8, 2600, 0, 0.42, 0.6, 2);
  key.position.set(6, 34, 10); key.target.position.set(0, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048);
  key.shadow.camera.near = 20; key.shadow.camera.far = 52; key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
  scene.add(key, key.target);
  for (const [x, z, i, c] of [[-24, -30, 1700, 0xdfe8ff], [24, 30, 1600, 0xfff1df], [24, -30, 1300, 0xffffff], [-24, 30, 1300, 0xeef2ff]]) {
    const s = new THREE.SpotLight(c, i, 0, 0.5, 0.8, 2); s.position.set(x, 30, z); s.target.position.set(0, 0.5, 0); scene.add(s, s.target);
  }
  // the masts: lamp heads that glow (and bloom)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }); lampMat.color.setScalar(4);
  const mastMat = std(0x2a3346, 0.5, { metalness: 0.6 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = x * (SURF.x + 15), pz = z * (SURF.z + 13);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 30, 10), mastMat); mast.position.set(px, 15, pz); arena.add(mast);
    const head = new THREE.Group(); head.position.set(px, 30.5, pz); head.lookAt(0, 0, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 0.4), mastMat); head.add(frame);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), lampMat); l.position.set(-2.1 + i * 1.4, -1.0 + j * 1.0, 0.22); head.add(l); }
    arena.add(head);
  }
}

/* ------------------------------------------------------------------ the ball */
/* A felt ball 6.7 cm across with its white seam; it is drawn bigger the further the camera is (it would be a pixel
   or two in the broadcast view), with a trail behind it and a shadow under it. */
const ballObj = new THREE.Group();
const fx = {};
{
  const felt = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#d6ee3c'; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.5; }
    g.putImageData(img, 0, 0);
    // the seam: a curve weaving round the ball
    g.strokeStyle = 'rgba(250,252,240,0.95)'; g.lineWidth = 5; g.beginPath();
    for (let x = 0; x <= w; x += 2) { const y = h / 2 + Math.sin((x / w) * TAU * 2) * h * 0.28; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }, { aniso: 2 });
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.0335, 20, 14), std(0xffffff, 0.95, { map: felt, emissive: 0x3a4410, emissiveIntensity: 0.6 }));
  ballMesh.castShadow = true;
  ballObj.add(ballMesh); ballObj.userData.mesh = ballMesh;
  scene.add(ballObj);
  // the trail
  const N = 22, tg = new THREE.BufferGeometry();
  const tpos = new Float32Array(N * 2 * 3), ta = new Float32Array(N * 2), idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tg.setIndex(idx); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('alpha', new THREE.BufferAttribute(ta, 1));
  const tmat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0.9, 1, 0.5) }, uOpacity: { value: 0 } },
    vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA * uOpacity); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const trail = new THREE.Mesh(tg, tmat); trail.frustumCulled = false; scene.add(trail);
  fx.trail = { N, pts: [], geo: tg, pos: tpos, a: ta, mat: tmat, mesh: trail };
  const blob = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, { aniso: 1 });
  fx.blobTex = blob;
  fx.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -4 }));
  fx.shadow.rotation.x = -Math.PI / 2; scene.add(fx.shadow);
  const ringTex = canvasTex(128, 128, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(212,255,58,1)'; g.lineWidth = 9; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 8, 0, TAU); g.stroke(); g.fillStyle = 'rgba(212,255,58,0.35)'; g.beginPath(); g.arc(w / 2, w / 2, 9, 0, TAU); g.fill(); }, { aniso: 1 });
  fx.marker = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -5 }));
  fx.marker.rotation.x = -Math.PI / 2; fx.marker.position.y = 0.006; scene.add(fx.marker);
  // the line review: the ball's mark on the court, an ellipse the size of the patch it squashed
  const printTex = canvasTex(128, 128, (g, w) => { g.clearRect(0, 0, w, w); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, w / 2, w / 2 - 4, w / 2 - 4, 0, 0, TAU); g.fill(); }, { aniso: 1 });
  fx.print = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.1), new THREE.MeshBasicMaterial({ map: printTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -6 }));
  fx.print.rotation.x = -Math.PI / 2; fx.print.position.y = 0.007; scene.add(fx.print);
  // your ring: under your feet, it lights up lime while a press would be perfectly timed
  const t = canvasTex(128, 128, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 6, 0, TAU); g.stroke(); }, { aniso: 1 });
  fx.you = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, color: 0x39a3ff, polygonOffset: true, polygonOffsetFactor: -5 }));
  fx.you.rotation.x = -Math.PI / 2; fx.you.position.y = 0.006; scene.add(fx.you);
}
const bl = { spin: 0, axis: new V3(1, 0, 0), scale: 1, q: new Q() };

/* ------------------------------------------------------------------ rackets */
/* Local frame: origin at the middle of the grip, +y up the shaft to the head, the string bed in the xy plane (its
   normal +z). The string bed's centre is RACKET_L from the grip. A 68.5 cm racket with an oval 100 sq in head. */
const RACKET_L = 0.47;
function makeRacket(frame, grip) {
  const g = new THREE.Group();
  const frameMat = std(frame, 0.35, { metalness: 0.3 }), gripMat = std(grip, 0.85), dark = std(0x111318, 0.4, { metalness: 0.3 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.0155, 0.2, 8), gripMat); handle.position.y = 0.0;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8), dark); cap.position.y = -0.105;
  const hc = RACKET_L, rx = 0.125, ry = 0.158;
  // the open throat: two beams from the handle out to the bottom of the head
  for (const s of [-1, 1]) {
    const len = Math.hypot(rx * 0.55, hc - ry - 0.1), beam = new THREE.Mesh(new THREE.BoxGeometry(0.014, len, 0.02), frameMat);
    beam.position.set(s * rx * 0.27, 0.1 + (hc - ry - 0.1) / 2, 0); beam.rotation.z = -s * Math.atan2(rx * 0.55, hc - ry - 0.1); g.add(beam);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(rx * 1.1, 0.014, 0.018), frameMat); bridge.position.y = hc - ry * 0.93; g.add(bridge);
  const head = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 8, 48), frameMat); head.scale.set(rx, ry, rx); head.position.y = hc;
  const strings = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(245,245,236,0.8)'; c.lineWidth = 1.3; for (let i = 3; i < w; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText('T', w / 2, h / 2 + 14); }, { aniso: 4 });
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ map: strings, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 }));
  bed.scale.set(rx * 0.95, ry * 0.95, 1); bed.position.y = hc;
  g.add(handle, cap, head, bed);
  for (const m of [handle, head]) m.castShadow = true;
  return g;
}

/* ------------------------------------------------------------------ the players' bodies */
/* The realistic Mixamo characters from the cricket game, the sporty ones: each wears what it was downloaded in. */
export const CHARS = {
  footballer: { name: 'Leo Hart', short: 'Hart', h: 1.83, racket: [0x1f6bff, 0xf2f4fb], look: 'all white' },
  ch42: { name: 'Vasanth', short: 'Vasanth', h: 1.79, racket: [0xff3b30, 0x15161a], look: 'red tee' },
  remy: { name: 'Remy Laurent', short: 'Laurent', h: 1.84, racket: [0xffcf1a, 0x15161a], look: 'grey tee' },
  adam: { name: 'Adam Novak', short: 'Novak', h: 1.81, racket: [0x00c389, 0xf2f4fb], look: 'tracksuit' },
  ch01: { name: 'Kai Brandt', short: 'Brandt', h: 1.8, racket: [0xff7a1a, 0x15161a], look: 'white polo' },
};
const STRIP = /^mixamorig\d*:?/;
const bonesOf = (root) => { const m = {}; root.traverse((o) => { if (o.isBone) { const n = o.name.replace(STRIP, ''); if (!m[n]) m[n] = o; } }); return m; };
const ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const swapSide = (n) => (n.startsWith('Left') ? `Right${n.slice(4)}` : n.startsWith('Right') ? `Left${n.slice(5)}` : n);
const _q1 = new Q(), _q2 = new Q(), _q3 = new Q(), _qs = new Q(), _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _v5 = new V3(), _m1 = new THREE.Matrix4();
const Y_UP = new V3(0, 1, 0);
const _qw = new Q(); // setWorldQuat's own: callers pass the shared temporaries
function setWorldQuat(obj, qW) { obj.parent.getWorldQuaternion(_qw); obj.quaternion.copy(_qw.invert()).multiply(qW); }

/* Calibration, once per character: its T-pose, scale, legs, and where a racket sits in its right fist */
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

/* Strokes, as keys in the body frame: r to the right, u up, f forward, metres for a 1.8 m player. g: the middle of
   the grip, d: the racket's direction (grip to head), pole: where the elbow points, lh: the left hand, yaw: the body
   turned (+ to the left), tw: the chest turned further. The contact key (t = 0) comes from the ball itself. A
   right-hander: the topspin forehand loops low to high and wraps over the left shoulder; the backhand is two-handed
   (the left hand rides above the right on the handle); slices cut high to low; volleys are short punches; the serve
   tosses, sits in the trophy position, drops the racket behind the back and reaches up. */
const READY = { g: [0.12, 1.0, 0.4], d: [-0.3, 0.45, 0.84], pole: [0.8, -0.6, -0.1], lh: [-0.04, 1.06, 0.52], yaw: 0, tw: 0 };
const STROKES = {
  fore: { bias: [0.12, 0.3, 0.12], pole: [0.5, -0.85, -0.1], keys: [
    { t: -0.8, ...READY },
    { t: -0.46, g: [0.55, 1.25, -0.25], d: [0.25, 0.6, -0.75], pole: [0.6, -0.7, -0.4], lh: [-0.12, 1.25, 0.48], yaw: -0.85, tw: -0.35 },
    { t: -0.16, g: [0.62, 0.92, -0.22], d: [0.45, -0.45, -0.75], pole: [0.5, -0.85, -0.3], lh: [-0.25, 1.15, 0.38], yaw: -0.72, tw: -0.3 },
    { t: 0.16, g: [0.22, 1.3, 0.58], d: [-0.35, 0.55, 0.75], pole: [0.6, -0.5, 0.3], lh: [-0.36, 1.05, 0.12], yaw: 0.25, tw: 0.2 },
    { t: 0.38, g: [-0.3, 1.55, 0.18], d: [-0.35, 0.18, -0.92], pole: [0.7, 0.2, 0.5], lh: [-0.3, 1.42, 0.24], yaw: 0.45, tw: 0.35 },
    { t: 0.85, ...READY },
  ] },
  back: { two: true, bias: [-0.1, 0.3, 0.12], pole: [0.3, -0.9, 0.2], keys: [
    { t: -0.8, ...READY },
    { t: -0.46, g: [-0.45, 1.2, -0.25], d: [-0.3, 0.55, -0.78], pole: [0.3, -0.9, 0.2], lh: null, yaw: 0.95, tw: 0.35 },
    { t: -0.16, g: [-0.55, 0.92, -0.15], d: [-0.45, -0.45, -0.77], pole: [0.2, -0.95, 0.1], lh: null, yaw: 0.8, tw: 0.3 },
    { t: 0.16, g: [-0.18, 1.3, 0.6], d: [0.35, 0.55, 0.75], pole: [0.3, -0.7, 0.4], lh: null, yaw: -0.2, tw: -0.15 },
    { t: 0.38, g: [0.3, 1.55, 0.2], d: [0.4, 0.15, -0.9], pole: [0.3, -0.6, 0.7], lh: null, yaw: -0.45, tw: -0.3 },
    { t: 0.85, ...READY },
  ] },
  sliceF: { bias: [0.12, 0.38, 0.12], pole: [0.5, -0.85, -0.1], keys: [
    { t: -0.8, ...READY },
    { t: -0.45, g: [0.55, 1.45, -0.12], d: [0.3, 0.8, -0.5], pole: [0.6, -0.6, -0.4], lh: [-0.15, 1.3, 0.45], yaw: -0.6, tw: -0.25 },
    { t: -0.15, g: [0.6, 1.3, -0.05], d: [0.55, 0.4, -0.73], pole: [0.6, -0.7, -0.3], lh: [-0.25, 1.2, 0.35], yaw: -0.5, tw: -0.2 },
    { t: 0.2, g: [0.15, 1.0, 0.65], d: [-0.2, 0.25, 0.95], pole: [0.6, -0.6, 0.3], lh: [-0.4, 1.05, 0.05], yaw: 0.15, tw: 0.1 },
    { t: 0.45, g: [-0.05, 1.05, 0.55], d: [-0.45, 0.35, 0.82], pole: [0.6, -0.6, 0.3], lh: [-0.35, 1.0, 0.1], yaw: 0.2, tw: 0.1 },
    { t: 0.85, ...READY },
  ] },
  sliceB: { bias: [-0.1, 0.38, 0.12], pole: [-0.1, -0.5, 0.85], keys: [
    { t: -0.8, ...READY },
    { t: -0.45, g: [-0.4, 1.45, -0.05], d: [-0.35, 0.8, -0.48], pole: [-0.1, -0.4, 0.9], lh: [-0.28, 1.36, 0.12], yaw: 0.8, tw: 0.3 },
    { t: -0.15, g: [-0.5, 1.3, 0.0], d: [-0.55, 0.45, -0.7], pole: [-0.1, -0.5, 0.85], lh: [-0.36, 1.22, 0.08], yaw: 0.7, tw: 0.25 },
    { t: 0.2, g: [0.0, 1.1, 0.6], d: [0.3, 0.25, 0.92], pole: [0.1, -0.6, 0.8], lh: [-0.62, 1.05, -0.35], yaw: 0.25, tw: 0.05 },
    { t: 0.45, g: [0.25, 1.2, 0.45], d: [0.55, 0.45, 0.7], pole: [0.2, -0.6, 0.7], lh: [-0.55, 1.0, -0.35], yaw: 0.1, tw: 0 },
    { t: 0.85, ...READY },
  ] },
  volF: { bias: [0.1, 0.55, 0.25], pole: [0.6, -0.75, -0.1], keys: [
    { t: -0.55, ...READY },
    { t: -0.2, g: [0.5, 1.3, 0.12], d: [0.25, 0.85, 0.1], pole: [0.7, -0.6, -0.2], lh: [-0.2, 1.2, 0.45], yaw: -0.42, tw: -0.1 },
    { t: 0.15, g: [0.35, 1.2, 0.62], d: [0.05, 0.65, 0.76], pole: [0.7, -0.6, 0.1], lh: [-0.3, 1.1, 0.3], yaw: -0.1, tw: 0 },
    { t: 0.55, ...READY },
  ] },
  volB: { bias: [-0.1, 0.55, 0.25], pole: [-0.1, -0.5, 0.85], keys: [
    { t: -0.55, ...READY },
    { t: -0.2, g: [-0.35, 1.3, 0.15], d: [-0.3, 0.85, 0.2], pole: [-0.1, -0.5, 0.85], lh: [-0.3, 1.32, 0.2], yaw: 0.5, tw: 0.15 },
    { t: 0.15, g: [-0.1, 1.2, 0.62], d: [0.0, 0.6, 0.8], pole: [0.0, -0.6, 0.8], lh: [-0.55, 1.05, -0.2], yaw: 0.15, tw: 0 },
    { t: 0.55, ...READY },
  ] },
  serve: { bias: [0.05, 0.6, 0.08], pole: [0.8, 0.2, -0.2], keys: [
    { t: -0.95, g: [0.32, 0.92, 0.28], d: [0.1, -0.2, 0.97], pole: [0.7, -0.7, -0.1], lh: [-0.02, 1.02, 0.42], yaw: -0.75, tw: 0 },
    { t: -0.62, g: [0.5, 1.15, -0.35], d: [0.35, 0.5, -0.8], pole: [0.6, -0.7, -0.4], lh: [-0.1, 1.9, 0.34], yaw: -0.88, tw: -0.3 },
    { t: -0.34, g: [0.42, 1.6, -0.25], d: [0.2, 0.85, -0.45], pole: [0.85, -0.2, -0.5], lh: [-0.12, 2.15, 0.3], yaw: -0.88, tw: -0.35 },
    { t: -0.12, g: [0.3, 1.7, -0.25], d: [0.05, -0.85, -0.5], pole: [0.6, 0.8, -0.2], lh: [-0.2, 1.62, 0.35], yaw: -0.6, tw: -0.25 },
    { t: 0.18, g: [-0.05, 1.3, 0.6], d: [-0.4, -0.5, 0.75], pole: [0.8, -0.2, 0.2], lh: [-0.25, 1.0, 0.1], yaw: 0.25, tw: 0.3 },
    { t: 0.45, g: [-0.35, 0.95, 0.25], d: [-0.45, -0.85, 0.25], pole: [0.7, -0.5, 0.3], lh: [-0.3, 1.0, 0.0], yaw: 0.35, tw: 0.35 },
    { t: 0.95, ...READY },
  ], whip: { t: -0.04, g: [0.28, 1.85, -0.05], d: [0.1, 0.05, -1], pole: [0.8, 0.5, -0.1], lh: [-0.22, 1.5, 0.35], yaw: -0.4, tw: -0.15 } },
  smash: { bias: [0.05, 0.6, 0.08], pole: [0.8, 0.2, -0.2], keys: [
    { t: -0.7, ...READY },
    { t: -0.42, g: [0.42, 1.6, -0.25], d: [0.2, 0.85, -0.45], pole: [0.85, -0.2, -0.5], lh: [-0.15, 2.05, 0.4], yaw: -0.75, tw: -0.3 },
    { t: -0.12, g: [0.3, 1.7, -0.25], d: [0.05, -0.85, -0.5], pole: [0.6, 0.8, -0.2], lh: [-0.2, 1.62, 0.35], yaw: -0.55, tw: -0.25 },
    { t: 0.18, g: [-0.05, 1.3, 0.6], d: [-0.4, -0.5, 0.75], pole: [0.8, -0.2, 0.2], lh: [-0.25, 1.0, 0.1], yaw: 0.2, tw: 0.3 },
    { t: 0.45, g: [-0.35, 0.95, 0.25], d: [-0.45, -0.85, 0.25], pole: [0.7, -0.5, 0.3], lh: [-0.3, 1.0, 0.0], yaw: 0.3, tw: 0.3 },
    { t: 0.85, ...READY },
  ] },
};
STROKES.smash.whip = STROKES.serve.whip;
const RELAXED = { g: [0.3, 0.92, 0.18], d: [0.1, -0.15, 0.98], pole: [0.6, -0.8, -0.3], lh: [-0.25, 0.92, 0.05] };
const HIPS = { g: [0.25, 0.98, -0.03], d: [0.1, -0.85, -0.5], pole: [1, 0.1, -0.6], lh: [-0.25, 0.98, -0.03] }; // hands on hips, racket hanging
const ARMS_UP = { g: [0.32, 1.98, 0.12], d: [0.15, 0.95, 0.15], pole: [1, -0.4, 0], lh: [-0.3, 1.98, 0.12] }; // a match won
const FIST_UP = [-0.2, 1.45, 0.24], FIST_DOWN = [-0.17, 1.08, 0.2]; // the free hand's fist pump

/* One player on the court: the model, its racket, and the pose it is in. The pose is built fresh every frame from
   the clips (legs and body), then the strokes (arms, turn, lunge, jump) and the head following the ball. */
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
    this.curl(opts.umpire ? 0.3 : 1.25, 0.3);
    this.T = {}; this.T2 = {}; for (const n of ORDER) { this.T[n] = new Q(); this.T2[n] = new Q(); }
    this.racket = opts.umpire ? null : makeRacket(cfg.racket[0], cfg.racket[1]);
    if (this.racket) scene.add(this.racket);
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
  dispose() { scene.remove(this.root); if (this.racket) scene.remove(this.racket); }
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
    this.root.position.set(st.x, st.lift || 0, st.z);
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
    // arms (and where the racket shoulder is, for the next frame's stroke keys)
    if (!this.shB) this.shB = new V3();
    this.toBody(B.RightArm.getWorldPosition(_v1), this.shB);
    this.racketArm(st.arm);
    this.leftArm(st.arm);
    // head toward the ball
    this.lookAt(st.look || this.look, st.lookW === undefined ? 1 : st.lookW);
  }

  /* the racket arm: grip at g, racket along d (unit), face toward `face` (unit, optional), elbow toward pole */
  racketArm(a) {
    const B = this.B, K = this.K, H = K.hand.Right;
    const g = a.g, d = a.d;
    // the racket's face: square to the swing, or as given
    const face = _v3.copy(a.face || a.swingDir || _v2.set(0, 0, 0));
    if (face.lengthSq() < 1e-6) this.dirWorld(0, 0, 1, face);
    face.addScaledVector(d, -face.dot(d));
    if (face.lengthSq() < 1e-6) face.set(0, 1, 0).addScaledVector(d, -d.y);
    face.normalize();
    const xA = _v4.crossVectors(d, face);
    _m1.makeBasis(xA, d, face);
    const rq = this.rq || (this.rq = new Q()); rq.setFromRotationMatrix(_m1);
    const hq = this.hq || (this.hq = new Q()); hq.copy(rq).multiply(_q1.copy(H.racket).invert());
    // the wrist, from the grip
    const wrist = _v1.copy(H.gripOff).applyQuaternion(hq).negate().add(g); // gripOff is in metres already
    twoBone(B.RightArm, B.RightForeArm, B.RightHand, wrist, a.pole, this.rest.RightForeArm, this.rest.RightHand, 1.12);
    if (this.dbgOn) { this.dbg = { wrist: wrist.clone(), afterIK: B.RightHand.getWorldPosition(new V3()), shoulder: B.RightArm.getWorldPosition(new V3()), upper: B.RightArm.getWorldPosition(new V3()).distanceTo(B.RightForeArm.getWorldPosition(new V3())), fore: B.RightForeArm.getWorldPosition(new V3()).distanceTo(B.RightHand.getWorldPosition(new V3())) }; }
    // most of the wrist's turn about the forearm happens in the forearm (no candy-wrapper wrist)
    const fq = B.RightForeArm.getWorldQuaternion(_q2), rel = _q3.copy(fq).invert().multiply(hq);
    const tw = twistOf(rel, H.fore, this.tw || (this.tw = new Q()));
    setWorldQuat(B.RightForeArm, _q1.copy(fq).multiply(_q2.identity().slerp(tw, 0.55))); B.RightForeArm.updateMatrixWorld(true);
    setWorldQuat(B.RightHand, hq); B.RightHand.updateMatrixWorld(true);
    if (this.dbgOn) this.dbg.afterTwist = B.RightHand.getWorldPosition(new V3());
    if (this.racket) {
      // the racket where the fist actually is
      const gp = _v2.copy(H.gripOff).applyQuaternion(hq).add(B.RightHand.getWorldPosition(_v4));
      this.racket.position.copy(gp); this.racket.quaternion.copy(rq);
    }
  }
  leftArm(a) {
    const B = this.B, K = this.K;
    const w = a.lw === undefined ? 1 : a.lw;
    if (w <= 0.001) return;
    const cur = B.LeftHand.getWorldPosition(_v2);
    const tgt = _v1.copy(a.lh).lerp(cur, 1 - w);
    const pole = B.LeftForeArm.getWorldPosition(_v3).addScaledVector(this.dirWorld(-1, -1, -0.3, _v4), 0.5);
    twoBone(B.LeftArm, B.LeftForeArm, B.LeftHand, tgt, pole, this.rest.LeftForeArm, this.rest.LeftHand, 1.06);
    // palm in, fingers forward (up when holding the ball out to serve)
    B.LeftForeArm.getWorldQuaternion(_q1);
    setWorldQuat(B.LeftHand, _q1.multiply(_q2.setFromAxisAngle(K.hand.Left.fore, a.lhTurn || 0)));
    B.LeftHand.updateMatrixWorld(true);
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
/* Reads a sim player (position, speed, the plan for the ball on its way, the stroke just played) and poses its
   Body: footwork from the clips, the stroke around its contact, a lunge to a low ball near the net, a jump for
   the jump smash, the head on the ball. */
const STYLE_AXIS = { serve: [1, 0, 0, 1], smash: [1, 0, 0, 1], fore: [0, 1, 0, -1], back: [0, 1, 0, -1], sliceF: [0, 1, 0, -1], sliceB: [0, 1, 0, -1], volF: [0, 1, 0, -1], volB: [0, 1, 0, -1] };
const _sv = { a: new V3(), b: new V3(), c: new V3(), d: new V3(), e: new V3() };
class PlayerView {
  constructor(side, body) {
    this.side = side; this.body = body;
    this.netYaw = side === 0 ? Math.PI : 0;
    this.yaw = this.netYaw; this.y0 = 0;
    this.arm = { g: new V3(), d: new V3(0, 1, 0), pole: new V3(), lh: new V3(), lw: 1, face: new V3(), lhTurn: 0 };
    this.st = { x: 0, z: 0, yaw: 0, crouch: 0, twist: 0, lean: 0, lift: 0, feet: null, arm: this.arm, look: new V3(), lookW: 1 };
    this.feetT = { Left: new V3(), Right: new V3() };
    this.lungeAmt = 0; this.splitT = -9; this.reactKey = null;
    this.prevStroke = null;
    this.rel = 0; // the body's turn from facing the net
    this.chasse = null; // which way a chassé steps: 'R' (left shoulder to the net) or 'L'
    this.jmp = null; // a jump in the air: { t0, v0, tc, end }
    this.reach = { x: 0, z: 0 }; // a step toward a contact out of reach
    this.flair = null; // the stylish way chosen for the ball coming, if any (flairFor)
  }
  setBody(b) { this.body = b; }
  react(key, o = {}) { if (!this.body || !CLIPS) return; this.body.react = { key, t: 0, from: o.from || 0, loop: !!o.loop, rate: o.rate || 1, mirror: o.mirror || 1, until: o.until || 9 }; }
  stopReact() { if (this.body) this.body.react = null; this.deject = null; this.cheer = null; }
  // the winner of a big point: a fist pump with the free hand; of the match, both arms up first
  celebrate(T, secs, big) { this.cheer = { t0: T, until: T + secs, big }; }
  // the loser of a point on an error, or of the match: hands to the hips, a shake of the head, a slight slump
  dejected(T, secs) { this.deject = { t0: T, until: T + secs }; }

  /* which stroke is under way: the one just played (or the serve being made), else the one coming */
  stroke(pl, m) {
    const T = m.T, sw = pl.swing;
    if (sw && T - sw.t < 0.9 && T - sw.t > -1.0) {
      let style = sw.style;
      if ((style === 'fore' || style === 'back') && (sw.kind === 'slice' || sw.kind === 'drop')) style = style === 'fore' ? 'sliceF' : 'sliceB';
      return { style, tc: sw.t, P: sw.P, hit: true, dir: sw.dir, kind: sw.kind, lowLunge: sw.P.y < 0.45 };
    }
    const plan = pl.plan;
    if (plan && m.phase === 'rally' && m.ball.by !== pl.side && !pl.leave && plan.t - T < 0.8 && plan.t - T > -0.12) {
      const P = plan.P, z = pl.zone(P, plan.B.x, plan.B.z);
      let style = P.y >= 2.05 ? 'smash' : !plan.after ? (z.dr >= -0.1 ? 'volF' : 'volB') : z.dr >= -0.1 ? 'fore' : 'back';
      if (!pl.ai && pl.press && pl.press.btn === 'B' && (style === 'fore' || style === 'back')) style = style === 'fore' ? 'sliceF' : 'sliceB';
      return { style, tc: plan.t, P, hit: false, committed: !!pl.press, from: pl.press ? pl.press.t : -9, dir: null, kind: null, lowLunge: P.y < 0.45 };
    }
    return null;
  }
  flairFor(pl, m, style) { return style; }

  update(dt, pl, m, look, live) {
    const b = this.body; if (!b) return;
    const st = this.st, arm = this.arm, T = m.T;
    const vx = pl.vx, vz = pl.vz, v = Math.hypot(vx, vz);
    const L = b.loco;
    // ---- footwork, all of it from facing the net: a run forward faces the way it goes, sideways is a chassé square
    // to the net, going back for a shot in the rear court turns side-on and chassés, left shoulder to the net (or the
    // right one, on the way to the backhand corner), and any other step back (the server back from the service line,
    // the way back to the middle after a net shot, the walk to the next serve) is a backpedal still facing the net.
    // Never the back to the net.
    let wantRel = 0, mode = 'idle', mirror = L.mirror;
    const rel = v > 0.5 ? angDiff(this.netYaw, Math.atan2(vx, vz)) : 0, ar = Math.abs(rel); // the way it moves, from facing the net (+ to its left)
    const plan = pl.plan, deep = !!plan && m.phase === 'rally' && m.ball.by !== pl.side && Math.abs(plan.P.z) - Math.abs(pl.z) > 0.7;
    if (v > 0.5 && ar < 1.05) {
      // forward: a run facing the way it goes, or small steps still facing the net
      mode = v > 1.0 ? 'run' : 'idle'; wantRel = rel * lerp(0.3, 1, smooth((v - 0.6) / 0.6)); this.chasse = null;
    } else if (v > 0.5 && (ar < 2.0 || (deep && (v > 1.0 || this.chasse)))) {
      // a chassé: a step to its right faces 90° left of the way it moves, a step to its left 90° right. Whichever is
      // squarer to the net, keeping the one in use (the forehand side to start with) unless the other is clearly squarer
      mode = 'shuf';
      const r = angDiff(0, rel + Math.PI / 2), l = angDiff(0, rel - Math.PI / 2), keepL = this.chasse === 'L';
      const useR = Math.abs(r) - (keepL ? 0 : 0.45) <= Math.abs(l) - (keepL ? 0.45 : 0);
      this.chasse = useR ? 'R' : 'L'; wantRel = clamp(useR ? r : l, -1.35, 1.35); mirror = useR ? -1 : 1;
    } else if (v > 0.6) {
      // a step back with no shot behind: backpedal, the run played backwards, the chest still to the net
      mode = 'back'; this.chasse = null;
      wantRel = angDiff(0, rel - Math.PI) * 0.4;
    } else {
      // standing, or a small step back: square to the other player
      if (v < 0.6) this.chasse = null;
      const o = m.pl[1 - pl.side];
      wantRel = clamp(angDiff(this.netYaw, Math.atan2(o.x - pl.x, o.z - pl.z)), -0.45, 0.45) * 0.7;
    }
    // in the air the feet can't turn the body: the turn it took off with, plus only the stroke's own
    if (this.jmp) { if (this.jmp.rel0 === undefined) this.jmp.rel0 = this.rel - (this.kYaw || 0); wantRel = this.jmp.rel0; }
    const runRate = v / Math.max(0.5, 7.06 * b.K.legLen), shufRate = v / Math.max(0.5, 2.74 * b.K.legLen);
    L.tRun += dt * clamp(runRate, 0.35, 1.3) * (mode === 'back' ? -1.35 : 1); // shorter, quicker steps backwards
    L.tShuf += dt * clamp(shufRate, 0.5, 1.9);
    L.tIdle += dt;
    L.mirror = mirror;
    const k = 1 - Math.exp(-dt * 9);
    // a backpedal is the run backwards at part weight over the ready stance: smaller steps, the body upright
    L.run = lerp(L.run, mode === 'run' ? 1 : mode === 'back' ? 0.6 : 0, k); L.shuf = lerp(L.shuf, mode === 'shuf' ? 1 : 0, k); L.idle = lerp(L.idle, mode === 'idle' ? 1 : mode === 'back' ? 0.4 : 0, k);
    // ---- the stroke
    const s = live ? this.stroke(pl, m) : null;
    let yawOff = 0, twist = 0, lean = 0.06, crouch = live ? 0.07 : 0.0, lift = 0, tall = 0, side = 0, flairX = 0, flairYaw = null;
    const rally = m.phase === 'rally' || (m.phase === 'serve' && live);
    let keyed = false;
    st.feet = null; st.feetW = 0; st.air = 0;
    if (this.jmp && T < this.jmp.t0 - 0.01) this.jmp = null; // a new match: the clock went back
    if (s && STROKES[s.style]) {
      const S = STROKES[s.style];
      let tau = T - s.tc;
      // not played (yet): hold the racket back until the press, and drop the stroke once the ball has gone by
      if (!s.hit) { if (!s.committed) tau = Math.min(tau, -0.07); }
      keyed = this.keys(S, s, tau); this.kArgs = [S, s, tau];
      yawOff = this.kYaw; twist = this.kTw;
      // reach: rise for a high one, lunge for a low one in front
      const env = tau < 0 ? smooth((tau + 0.32) / 0.3) : 1 - smooth((tau - 0.08) / 0.4);
      if (s.style === 'serve' || s.style === 'smash') {
        // the knees bend under the trophy position, then drive up through the contact: a server leaves the ground
        const k1 = smooth((tau + 0.6) / 0.3) * (1 - smooth((tau + 0.16) / 0.12));
        crouch += 0.14 * k1;
        const up = tau > -0.14 && tau < 0.36 ? Math.sin(((tau + 0.14) / 0.5) * Math.PI) : 0;
        lift = (s.style === 'serve' ? 0.17 : 0.1) * Math.max(0, up); tall = env;
      } else if (s.style === 'jump' && !this.jmp && !s.hit) {
        // the jump smash: knees bend, then take off so the top of the jump meets the ball (sooner if asked late)
        const hj = clamp(s.P.y - (1.5 * b.hs + 1.04) + 0.03, 0.2, 0.55), v0 = Math.sqrt(2 * 9.81 * hj);
        const t0 = Math.max(s.tc - v0 / 9.81, (s.from || -9) + 0.06);
        if (T >= t0) this.jmp = { t0: T, v0, tc: s.tc, end: T + (2 * v0) / 9.81 };
        else { crouch += 0.15 * smooth((T - (t0 - 0.22)) / 0.22); tall = 0; }
      }
      if (s.style === 'rth') {
        // round the head: the body a step to the right of a ball above its left shoulder, bending to the left
        flairX = clamp((s.P.x + 0.3 * pl.sg - pl.x) * pl.sg, -0.6, 0.7) * pl.sg * env; // (or to the left, if it stands too far right)
        side = S.side * env;
      } else if (s.style === 'btb') {
        // behind the back: turned away from it, so that it is behind the left hip at the contact; the turn is held
        // from the contact on and quickly given back as the racket comes through, never further round
        if (tau <= 0 || this.btbRel === undefined) {
          const bx = pl.x + (st.lungeX || 0) + this.reach.x, bz = pl.z + (st.lungeZ || 0) + this.reach.z;
          this.btbRel = clamp(angDiff(this.netYaw, Math.atan2(s.P.x - bx, s.P.z - bz)) - 2.0, -1.1, 0.3);
        }
        flairYaw = { rel: this.btbRel, w: tau < 0 ? env : 1 - smooth(tau / 0.3) };
      }
      if (s.lowLunge || s.style === 'volF' || s.style === 'volB') {
        const was = this.lungeAmt;
        this.lungeAmt = Math.max(this.lungeAmt * Math.exp(-dt * 2), env);
        if (was < 0.6 && this.lungeAmt >= 0.6 && dt > 0) Sound.squeak(clamp(pl.x / 4, -0.8, 0.8), farOf(pl.x, 0.1, pl.z)); // the lunging foot plants
        const P = s.P, dx = P.x - pl.x, dz = P.z - pl.z, dl = Math.hypot(dx, dz) || 1;
        const reach = clamp(dl - 0.85, 0, 0.6) * this.lungeAmt; // the shoulder stops an arm and a racket from the ball
        // eased in: a contact that moves (struck early, or a new plan) slides the lunge over a few frames, no jump
        const kl = 1 - Math.exp(-dt * 22);
        st.lungeX = (st.lungeX || 0) + ((dx / dl) * reach - (st.lungeX || 0)) * kl; st.lungeZ = (st.lungeZ || 0) + ((dz / dl) * reach - (st.lungeZ || 0)) * kl;
        crouch += (0.12 + 0.2 * clamp((1.0 - P.y) / 0.8, 0, 1)) * this.lungeAmt;
        lean += 0.25 * this.lungeAmt;
        // the racket foot steps out toward the ball, the other stays behind
        const fr = this.feetT.Right.set(pl.x + st.lungeX * 1.55 + (dz / dl) * 0.12 * (this.side ? -1 : 1), 0, pl.z + st.lungeZ * 1.55);
        const bk = this.feetT.Left.set(pl.x - (dx / dl) * 0.32, 0, pl.z - (dz / dl) * 0.32);
        if (this.lungeAmt > 0.02) { st.feet = this.feetT; st.feetW = smooth(this.lungeAmt / 0.35); }
      } else { this.lungeAmt *= Math.exp(-dt * 4); st.lungeX = (st.lungeX || 0) * Math.exp(-dt * 6); st.lungeZ = (st.lungeZ || 0) * Math.exp(-dt * 6); }
    } else { this.lungeAmt *= Math.exp(-dt * 4); st.lungeX = (st.lungeX || 0) * Math.exp(-dt * 6); st.lungeZ = (st.lungeZ || 0) * Math.exp(-dt * 6); }
    // reaching: if the racket shoulder was out of reach of the contact last frame, the body steps toward it
    if (!this.reach) this.reach = { x: 0, z: 0 };
    if (s && b.shB && T - s.tc > -0.35 && T - s.tc < 0.1) {
      // (behind the back: from the hand behind the back, which has the racket's length and a little more)
      const bh = STROKES[s.style] && STROKES[s.style].behind;
      const shW = bh ? b.toWorld(bh[0], bh[1], bh[2], _sv.e) : b.toWorld(b.shB.x, b.shB.y, b.shB.z, _sv.e), P = s.P;
      const dx = P.x - shW.x, dy = P.y - shW.y, dz = P.z - shW.z, dist = Math.hypot(dx, dy, dz), hz = Math.hypot(dx, dz) || 1;
      const over = dist - (bh ? RACKET_L + 0.1 * b.hs : (0.56 + RACKET_L) * b.hs * 0.95);
      if (over > 0) { const k2 = Math.min(1, dt * 14) * Math.min(over, 0.3); this.reach.x += (dx / hz) * k2; this.reach.z += (dz / hz) * k2; }
      const rl = Math.hypot(this.reach.x, this.reach.z); if (rl > 0.6) { this.reach.x *= 0.6 / rl; this.reach.z *= 0.6 / rl; }
    } else { const k2 = Math.exp(-dt * 3); this.reach.x *= k2; this.reach.z *= k2; }
    // the split step as the other player hits
    const opp = m.pl[1 - pl.side];
    if (rally && opp.swing && opp.swing.t !== this.oppSwing && T >= opp.swing.t) { this.oppSwing = opp.swing.t; this.splitT = T; }
    const sp = T - this.splitT;
    if (sp >= 0 && sp < 0.3 && !this.jmp) lift += 0.07 * Math.sin((sp / 0.3) * Math.PI);
    // ---- in the air: the jump's arc, the back arched on the way up and whipped forward through the hit, the legs
    // tucked and scissoring; then the landing, taken in the knees
    const J = this.jmp;
    if (J) {
      if (T < J.end) {
        const t = T - J.t0, up = T < J.tc, a = up ? clamp(t / Math.max(0.05, J.tc - J.t0), 0, 1) : clamp((T - J.tc) / Math.max(0.05, J.end - J.tc), 0, 1);
        lift = Math.max(0, J.v0 * t - 4.905 * t * t); tall = 1; crouch = 0;
        lean = up ? lerp(0.04, -0.2, smooth(a)) : lerp(-0.2, 0.34, smooth(a * 1.7));
        st.air = 1; this.airFeet(a, up);
      } else {
        const u = (T - J.end) / 0.3;
        if (!J.down) { J.down = true; this.feetT.Left.y = 0; this.feetT.Right.y = 0; const pn = clamp(pl.x / 4, -0.8, 0.8); Sound.step(pn); Sound.squeak(pn, farOf(pl.x, 0.1, pl.z)); } // shoes back on the mat
        crouch += 0.19 * Math.sin(Math.PI * clamp(u, 0, 1)); lean += 0.22 * (1 - smooth(u));
        st.feet = this.feetT; st.feetW = 1 - smooth((u - 0.35) / 0.65);
        if (u >= 1) this.jmp = null;
      }
    }
    // ---- arms when no stroke is keyed: ready in a rally, relaxed between points
    if (!keyed) {
      const P = rally ? READY : RELAXED;
      this.setArm(P.g, P.d, P.pole, P.lh, 0, 0);
      arm.lw = rally ? 1 : 0.6;
    }
    const D = this.deject;
    if (D && T >= D.until) this.deject = null;
    else if (D && !keyed && T >= D.t0) {
      const u = smooth((T - D.t0) / 0.35) * (1 - smooth((T - D.until + 0.45) / 0.45)), mix = (a, b) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
      this.kg = mix(this.kg, HIPS.g); this.kd = mix(this.kd, HIPS.d); this.kp = mix(this.kp, HIPS.pole); this.klh = mix(this.klh, HIPS.lh);
      arm.lw = lerp(arm.lw, 1, u); lean += 0.1 * u;
    }
    const C = this.cheer;
    let fist = 0;
    if (C && T >= C.until) this.cheer = null;
    else if (C && !keyed && T >= C.t0) {
      const t = T - C.t0, u = smooth(t / 0.25) * (1 - smooth((T - C.until + 0.4) / 0.4)), mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
      const up = C.big ? 1 - smooth((t - 1.5) / 0.4) : 0, k = (Math.max(0, t - (C.big ? 1.7 : 0)) % 0.62) / 0.62;
      const lh = up > 0.001 ? mix(FIST_DOWN, ARMS_UP.lh, up) : k < 0.6 ? mix(FIST_DOWN, FIST_UP, smooth(k / 0.6)) : mix(FIST_UP, FIST_DOWN, smooth((k - 0.6) / 0.22));
      this.kg = mix(this.kg, ARMS_UP.g, u * up); this.kd = mix(this.kd, ARMS_UP.d, u * up); this.kp = mix(this.kp, ARMS_UP.pole, u * up);
      this.klh = mix(this.klh, lh, u); arm.lw = lerp(arm.lw, 1, u); lean -= 0.05 * u; fist = u;
    }
    if (Math.abs(fist - (this.fist || 0)) > 0.02) { this.fist = fist; b.curl(1.25, lerp(0.3, 1.25, fist)); } // the free hand closes into a fist
    // the serve: the ball in the left hand until it is let go
    if (pl.swing && pl.swing.style === 'serve' && T < pl.swing.t - 0.6) arm.lhTurn = 1.2; else arm.lhTurn = 0;
    // a reaction clip moves the whole body; arms follow it
    if (b.react) {
      arm.lw = 0; crouch = 0; twist = 0; yawOff = 0;
      if (!st.air) lift = 0;
      if (b.react.t > b.react.until) b.react = null;
    }
    // ---- body yaw, from facing the net: at most side-on (a stroke's turn on top of a side-on chassé doesn't add up
    // past it), so never round through the back
    let want = clamp(wantRel + yawOff, -1.6, 1.6);
    if (flairYaw) want = lerp(want, flairYaw.rel, flairYaw.w);
    this.flairX = (this.flairX || 0) + (flairX - (this.flairX || 0)) * (1 - Math.exp(-dt * 12));
    // and no faster than a quick pivot (10 rad/s), so a change of side or a long frame never snaps it round
    this.rel += clamp((want - this.rel) * (1 - Math.exp(-dt * (keyed ? 14 : 9))), -10 * dt, 10 * dt);
    this.yaw = this.netYaw + this.rel;
    if (b.react) tall = 0;
    st.x = pl.x + (st.lungeX || 0) + this.reach.x + this.flairX; st.z = pl.z + (st.lungeZ || 0) + this.reach.z; st.yaw = this.yaw;
    st.crouch = Math.max(0, crouch + (mode === 'shuf' ? 0.03 * (1 - tall) : 0)); st.twist = twist; st.lean = lean; st.side = side; st.lift = lift; st.tall = tall;
    // the head: on the ball in play; once the point is over, a moment on where it landed, then up at the other player
    const o = m.pl[1 - pl.side], between = (m.phase === 'dead' && m.phaseT > 0.7) || m.phase === 'intro' || m.phase === 'over';
    const lt = this.lookT || (this.lookT = new V3()), dj = this.deject && T >= this.deject.t0 && T < this.deject.t0 + 1.2;
    if (dj) { const t = T - this.deject.t0; b.toWorld(0.8 * Math.sin(t * 9) * (1 - smooth((t - 0.5) / 0.6)), 0, 2.4, lt); } // down, shaking the head
    else if (this.cheer && T >= this.cheer.t0) b.toWorld(0, 2.6, 4.5, lt); // up, to the crowd
    else if (between) lt.set(o.x, 1.55, o.z);
    else lt.copy(look);
    if (!this.lookP) this.lookP = new V3().copy(lt);
    this.lookP.lerp(lt, 1 - Math.exp(-dt * (between && !dj ? 4 : 16)));
    st.look.copy(this.lookP); st.lookW = b.react ? 0.3 : 1;
    // the stroke's keys again, now in the body frame this frame is posed in (where it stands, how it is turned): the
    // racket's head meets the ball even while the body is still turning or lunging into the contact
    if (keyed) { b.root.position.set(st.x, st.lift, st.z); b.yaw = st.yaw; this.keys(...this.kArgs); }
    // arm targets to the world (in the body frame of this frame's yaw)
    this.keyed = keyed; this.sNow = s;
    this.armToWorld();
    b.pose(st, dt);
  }
  setArm(g, d, pole, lh, yaw, tw) { this.kg = g; this.kd = d; this.kp = pole; this.klh = lh; this.kYaw = yaw; this.kTw = tw; }
  /* the feet in the air, in the body frame (r, u, f): on the way up the right leg kicks back and up; through the hit
     the legs scissor, the left going back to land first and the right coming through in front */
  airFeet(a, up) {
    const b = this.body, ah = b.K.ankleH / b.hs, k = this.airK || (this.airK = { Left: [0, 0, 0], Right: [0, 0, 0] });
    if (up) {
      const t = smooth((a - 0.2) / 0.8); // long legs off the floor, folding toward the top
      k.Left[0] = -0.13; k.Left[1] = ah + 0.02 + 0.16 * t; k.Left[2] = 0.03 + 0.1 * t;
      k.Right[0] = 0.15; k.Right[1] = ah + 0.03 + 0.37 * t; k.Right[2] = -0.06 - 0.22 * t;
    } else {
      const u = smooth(a);
      k.Left[0] = -0.13; k.Left[1] = ah + lerp(0.18, 0.0, u); k.Left[2] = lerp(0.13, -0.24, u);
      k.Right[0] = 0.15; k.Right[1] = ah + lerp(0.4, 0.05, u); k.Right[2] = lerp(-0.28, 0.2, u);
    }
  }
  /* key interpolation; the contact key from the ball */
  keys(S, s, tau) {
    const b = this.body, keys = S.keys;
    if (tau < keys[0].t || tau > keys[keys.length - 1].t) return false;
    // the contact key: the racket's head on the ball, the racket roughly in line with the arm
    const Pb = b.toBody(_sv.a.set(s.P.x, s.P.y, s.P.z), _sv.b);
    const sh = b.shB ? [b.shB.x, b.shB.y, b.shB.z] : [0.19, 1.43, 0.0], bs = S.bias;
    const RL = RACKET_L / b.hs;
    const d = _sv.c;
    if (S.behind) {
      // behind the back: the racket from the hand behind the back out to the ball, the hand sliding along that
      // line until the racket's head is on it
      const H0 = S.behind;
      d.set(Pb.x - H0[0], Pb.y - H0[1], Pb.z - H0[2]).normalize();
    } else {
      d.set(Pb.x - sh[0], Pb.y - sh[1], Pb.z - sh[2]);
      const room = clamp((0.56 + RL - d.length()) / 0.35, 0, 1);
      d.normalize().add(_v3.set(bs[0], bs[1], bs[2]).multiplyScalar(room)).normalize();
    }
    const contact = { t: 0, g: [Pb.x - d.x * RL, Pb.y - d.y * RL, Pb.z - d.z * RL], d: [d.x, d.y, d.z], pole: S.pole, lh: null, yaw: 0.0, tw: S.behind ? -0.15 : 0.08 };
    let k0 = null, k1 = null;
    const all = this.allKeys || (this.allKeys = []);
    all.length = 0;
    for (const k of keys) { if (k.t < 0) all.push(k); }
    // an overhead whips through a racket-back position on its way up
    if (S.whip) all.push(S.whip);
    all.push(contact);
    for (const k of keys) if (k.t > 0) all.push(k);
    for (let i = 0; i < all.length - 1; i++) if (tau >= all[i].t && tau <= all[i + 1].t) { k0 = all[i]; k1 = all[i + 1]; break; }
    if (!k0) return false;
    let u = (tau - k0.t) / (k1.t - k0.t);
    u = k1.t <= 0 && k0.t >= -0.08 ? u * u : smooth(u); // the forward swing accelerates into the contact
    const g = _sv.d.set(lerp(k0.g[0], k1.g[0], u), lerp(k0.g[1], k1.g[1], u), lerp(k0.g[2], k1.g[2], u));
    const d0 = _v1.fromArray(k0.d).normalize(), d1 = _v2.fromArray(k1.d).normalize();
    _q1.setFromUnitVectors(d0, d1); _q2.identity().slerp(_q1, u);
    const dd = d0.clone().applyQuaternion(_q2);
    const p0 = k0.pole, p1 = k1.pole;
    const lh0 = k0.lh || k1.lh || READY.lh, lh1 = k1.lh || k0.lh || READY.lh;
    this.kg = [g.x, g.y, g.z]; this.kd = [dd.x, dd.y, dd.z];
    this.kp = [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u), lerp(p0[2], p1[2], u)];
    this.klh = [lerp(lh0[0], lh1[0], u), lerp(lh0[1], lh1[1], u), lerp(lh0[2], lh1[2], u)];
    if (S.two) this.klh = [g.x + dd.x * 0.1, g.y + dd.y * 0.1, g.z + dd.z * 0.1]; // two hands on the handle
    this.kYaw = lerp(k0.yaw, k1.yaw, u); this.kTw = lerp(k0.tw, k1.tw, u);
    this.kStyle = s.style;
    return true;
  }
  armToWorld() {
    const b = this.body, a = this.arm, st = this.st;
    // the body frame this frame: the new yaw, the root where it will be posed
    b.root.position.set(st.x, st.lift, st.z); b.yaw = st.yaw;
    b.toWorld(this.kg[0], this.kg[1], this.kg[2], a.g);
    b.dirWorld(this.kd[0], this.kd[1], this.kd[2], a.d);
    const sh = b.toWorld(0.19, 1.43, 0, _sv.e);
    a.pole.copy(b.dirWorld(this.kp[0], this.kp[1], this.kp[2], _v3)).multiplyScalar(0.6).add(sh);
    b.toWorld(this.klh[0], this.klh[1], this.klh[2], a.lh);
    if (st.air) { for (const s of ['Left', 'Right']) b.toWorld(...this.airK[s], this.feetT[s]); st.feet = this.feetT; st.feetW = 1; }
    // the racket face: square to its swing
    const ax = STYLE_AXIS[this.kStyle || 'fore'] || STYLE_AXIS.fore;
    const axis = b.dirWorld(ax[0], ax[1], ax[2], _v4);
    const f = _v1.crossVectors(ax[3] > 0 ? a.d : axis, ax[3] > 0 ? axis : a.d);
    if (f.lengthSq() > 1e-4) a.face.copy(f.normalize());
    this.kStyle = null;
  }
}
/* ------------------------------------------------------------------ the umpire */
/* Josh in his blazer, seated high beside the net post, head following the ball */
function poseUmpire(b, look) {
  const K = b.K, B = b.B, T = b.T;
  b.root.position.set(chair.position.x - 0.1, 0, 0); b.yaw = Math.PI / 2; b.root.rotation.set(0, b.yaw, 0);
  for (const n of ORDER) T[n].copy(K.bind[n]);
  const thigh = _q1.setFromAxisAngle(_v1.set(1, 0, 0), -Math.PI / 2 + 0.08);
  for (const s of ['Left', 'Right']) T[`${s}UpLeg`].premultiply(thigh);
  for (const [s, sg] of [['Left', 1], ['Right', -1]]) {
    const down = _q2.setFromAxisAngle(_v1.set(0, 0, 1), -sg * (Math.PI / 2 - 0.12));
    for (const n of ['Arm', 'ForeArm', 'Hand']) T[`${s}${n}`].premultiply(down);
  }
  b.applyT(0, 2.5, -0.02);
  b.root.updateMatrixWorld(true);
  for (const s of ['Left', 'Right']) {
    const knee = B[`${s}Leg`].getWorldPosition(_v2);
    const foot = _v3.copy(knee); foot.y = 2.06; foot.x += 0.04;
    twoBone(B[`${s}UpLeg`], B[`${s}Leg`], B[`${s}Foot`], foot, _v4.copy(knee).add(_v1.set(0.5, 0, 0)), b.rest[`${s}Leg`], b.rest[`${s}Foot`], 1.0);
    setWorldQuat(B[`${s}Foot`], _q3.copy(b.root.quaternion).multiply(K.bind[`${s}Foot`])); B[`${s}Foot`].updateMatrixWorld(true);
    // hands on the thighs
    const hand = B[`${s}Leg`].getWorldPosition(_v2).add(_v1.set(-0.16, 0.1, s === 'Left' ? 0.03 : -0.03));
    twoBone(B[`${s}Arm`], B[`${s}ForeArm`], B[`${s}Hand`], hand, _v4.copy(hand).add(_v1.set(-0.3, 0.1, s === 'Left' ? 0.6 : -0.6)), b.rest[`${s}ForeArm`], b.rest[`${s}Hand`], 1.04);
  }
  b.lookAt(look, 1);
}

/* ------------------------------------------------------------------ cameras */
/* broadcast: high behind your baseline, the whole court in frame, as on television; side: courtside at the net,
   the court across the screen. Both fit the court to the screen's shape and follow the play a little. */
const Cam = { mode: store.get('view', 'broadcast'), pos: new V3(0, 12, 30), look: new V3(0, 0.4, -1), fov: 30, shake: 0, cut: true, script: null };
const _cf = new V3(), _cr = new V3(), _cu = new V3(), _cp = new V3();
function fitDistance(dir, look, fovDeg, aspect, pts, margin = 0.06) {
  const t = Math.tan((fovDeg * Math.PI) / 360) * (1 - margin), f = _cf.copy(dir).negate();
  _cr.crossVectors(f, Y_UP).normalize(); _cu.crossVectors(_cr, f);
  let lo = 3, hi = 160;
  for (let i = 0; i < 24; i++) {
    const d = (lo + hi) / 2; let ok = true;
    for (const p of pts) {
      _cp.copy(p).sub(look).addScaledVector(dir, -d);
      const z = _cp.dot(f); if (z <= 0.1) { ok = false; break; }
      if (Math.abs(_cp.dot(_cr)) / z > t * aspect || Math.abs(_cp.dot(_cu)) / z > t) { ok = false; break; }
    }
    if (ok) hi = d; else lo = d;
  }
  return hi;
}
const COURT_PTS = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { COURT_PTS.push(new V3(sx * (COURT.halfW + 0.3), 0, sz * (COURT.halfL + (sz > 0 ? 2.2 : 1.4)))); COURT_PTS.push(new V3(sx * COURT.halfWS, 1.9, sz * (COURT.halfL + 1.2))); }
function camTarget(dt, aspect, focus) {
  const portrait = aspect < 0.9;
  if (Cam.mode === 'side') {
    const fov = portrait ? 50 : 30;
    const dir = _v1.set(Math.cos(0.3), Math.sin(0.3), 0).normalize();
    const look = _v2.set(0, portrait ? 0.8 : 3.4, 0); // the court low in the picture, the stand filling the top
    let pts = COURT_PTS;
    if (portrait) { look.z = clamp(focus.z * 0.6, -6, 6); pts = COURT_PTS.filter((p) => Math.abs(p.z) < 13).map((p) => p.clone().setZ(look.z + Math.sign(p.z) * 6.5)); }
    const d = Math.min(portrait ? 40 : 80, fitDistance(dir, look, fov, aspect, pts, 0.04));
    return { pos: look.clone().addScaledVector(dir, d), look: look.clone(), fov };
  }
  const fov = portrait ? clamp(32 + (1 / aspect - 1) * 11, 32, 46) : 26;
  const dir = _v1.set(0, Math.sin(0.4), Math.cos(0.4)).normalize();
  const look = _v2.set(clamp(focus.x * 0.1, -0.6, 0.6), 0.2, -1.3);
  const d = fitDistance(dir, look, fov, aspect, COURT_PTS, portrait ? 0.03 : 0.05);
  return { pos: look.clone().addScaledVector(dir, d), look: look.clone(), fov };
}
function updateCamera(dt, focus) {
  const aspect = camera.aspect;
  let goal;
  if (Cam.script) goal = Cam.script(dt, aspect);
  if (!goal) goal = camTarget(dt, aspect, focus);
  const k = Cam.cut ? 1 : 1 - Math.exp(-dt * (goal.k || 3.2));
  Cam.pos.lerp(goal.pos, k); Cam.look.lerp(goal.look, k); Cam.fov = lerp(Cam.fov, goal.fov, k);
  Cam.cut = false;
  camera.position.copy(Cam.pos);
  if (Cam.shake > 0) { camera.position.x += (Math.random() - 0.5) * Cam.shake; camera.position.y += (Math.random() - 0.5) * Cam.shake; Cam.shake = Math.max(0, Cam.shake - dt * 0.25); }
  camera.lookAt(Cam.look);
  const lift = !Cam.script && Cam.mode === 'broadcast' && aspect < 0.9 ? 0.1 : 0;
  if (lift !== Cam.lift) { Cam.lift = lift; if (lift) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * lift, innerWidth, innerHeight); else camera.clearViewOffset(); }
  if (Math.abs(camera.fov - Cam.fov) > 0.01) { camera.fov = Cam.fov; camera.updateProjectionMatrix(); }
  crowd.cull(camera.position);
}
/* the menu: a slow drift round the stadium between television angles */
function attractCam() {
  let t = 0, shot = 0;
  const shots = [
    (u) => ({ pos: new V3(lerp(-9, 9, u), 11, 31), look: new V3(0, 0.3, -2), fov: 34 }),
    (u) => ({ pos: new V3(17, lerp(2.4, 3.6, u), lerp(-9, 9, u)), look: new V3(0, 0.9, 0), fov: 38 }),
    (u) => ({ pos: new V3(lerp(5, -5, u), 1.1, 17.5), look: new V3(0, 1.2, 0), fov: 40 }),
    (u) => ({ pos: new V3(Math.sin(u * 0.9 + 0.4) * 30, 24, Math.cos(u * 0.9 + 0.4) * 30), look: new V3(0, 0, 0), fov: 42 }),
  ];
  return (dt) => {
    t += dt; const u = t / 9;
    if (u >= 1) { t = 0; shot = (shot + 1) % shots.length; Cam.cut = true; }
    const g = shots[shot](Math.min(1, t / 9)); g.k = 20; return g;
  };
}

/* ------------------------------------------------------------------ replays */
/* Every frame is recorded (the bones, rackets and ballObj as drawn), so a point can be shown again, slowly, from
   another angle. */
const REC = { N: 720, frames: [], i: 0, count: 0, on: true };
function recordFrame(T, bodies) {
  if (!REC.on) return;
  let f = REC.frames[REC.i];
  const size = 1 + bodies.length * 130 + 10;
  if (!f || f.length < size) f = REC.frames[REC.i] = new Float32Array(size);
  let o = 0; f[o++] = T;
  for (const b of bodies) {
    const r = b.root; f[o++] = r.position.x; f[o++] = r.position.y; f[o++] = r.position.z; f[o++] = r.quaternion.x; f[o++] = r.quaternion.y; f[o++] = r.quaternion.z; f[o++] = r.quaternion.w;
    for (const n of ORDER) { const q = b.B[n].quaternion; f[o++] = q.x; f[o++] = q.y; f[o++] = q.z; f[o++] = q.w; }
    const hp = b.B.Hips.position; f[o++] = hp.x; f[o++] = hp.y; f[o++] = hp.z;
    for (const k in b.rest) { const p = b.B[k].position; f[o++] = p.x; f[o++] = p.y; f[o++] = p.z; }
    const rk = b.racket; if (rk) { f[o++] = rk.position.x; f[o++] = rk.position.y; f[o++] = rk.position.z; f[o++] = rk.quaternion.x; f[o++] = rk.quaternion.y; f[o++] = rk.quaternion.z; f[o++] = rk.quaternion.w; } else o += 7;
  }
  f[o++] = ballObj.position.x; f[o++] = ballObj.position.y; f[o++] = ballObj.position.z;
  f[o++] = ballObj.quaternion.x; f[o++] = ballObj.quaternion.y; f[o++] = ballObj.quaternion.z; f[o++] = ballObj.quaternion.w;
  f[o++] = ballObj.scale.x; f[o++] = ballObj.visible ? 1 : 0;
  REC.i = (REC.i + 1) % REC.N; REC.count = Math.min(REC.N, REC.count + 1);
}
function recFrames() { const out = []; for (let k = 0; k < REC.count; k++) out.push(REC.frames[(REC.i - REC.count + k + REC.N) % REC.N]); return out; }
const _rq0 = new Q(), _rq1 = new Q();
function playFrame(fa, fb, u, bodies) {
  let o = 1;
  const qv = (dst) => { _rq0.set(fa[o], fa[o + 1], fa[o + 2], fa[o + 3]); _rq1.set(fb[o], fb[o + 1], fb[o + 2], fb[o + 3]); dst.copy(_rq0).slerp(_rq1, u); o += 4; };
  const pv = (dst) => { dst.set(lerp(fa[o], fb[o], u), lerp(fa[o + 1], fb[o + 1], u), lerp(fa[o + 2], fb[o + 2], u)); o += 3; };
  for (const b of bodies) {
    pv(b.root.position); qv(b.root.quaternion);
    for (const n of ORDER) qv(b.B[n].quaternion);
    pv(b.B.Hips.position);
    for (const k in b.rest) pv(b.B[k].position);
    if (b.racket) { pv(b.racket.position); qv(b.racket.quaternion); } else o += 7;
  }
  pv(ballObj.position); qv(ballObj.quaternion);
  ballObj.scale.setScalar(lerp(fa[o], fb[o], u)); o++;
  ballObj.visible = fa[o] > 0.5;
}
/* ------------------------------------------------------------------ sound */
/* Rally Point's recordings, retuned for a tennis ball: the pock of the strings, the ball on the court, shoes, the net,
   the stadium and its crowd. The umpire's calls use the device's speech voices. */
const Sound = (() => {
  let ctx = null, out = null, master = null, verbSend = null, crowdGain = null, noise = null, hall = null;
  const A = { on: store.get('sound', true), voice: store.get('voice', true) };
  /* The recordings (all CC0, from freesound.org: see sfx/CREDITS.txt): racket hits, shoe squeaks and swishes in one
     sprite, crowd oohs, applause and cheers in another, and a seamless loop of a full hall. Fetched at once, decoded
     when the first tap opens the audio. Until then the old synthesized sounds stand in. */
  const S = { meta: null, fx: null, crowd: null, hall: null }, raw = {};
  const fetched = fetch('../bm/sfx/sfx.json').then((r) => r.json()).then((m) => { S.meta = m; return Promise.all(['fx', 'crowd', 'hall'].map((k) => fetch(`../bm/sfx/${k}.mp3`).then((r) => r.arrayBuffer()).then((b) => { raw[k] = b; }))); }).catch(() => {});
  function decodeAll() {
    fetched.then(() => { for (const k of ['fx', 'crowd', 'hall']) if (raw[k]) { const b = raw[k]; raw[k] = null; ctx.decodeAudioData(b, (buf) => { S[k] = buf; if (k === 'hall') startHall(); }, () => {}); } });
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    ctx = new AC();
    // glue (a gentle compressor), then a limiter so a smash under a cheer never distorts
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1; lim.connect(ctx.destination);
    out = lim;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.006; comp.release.value = 0.3; comp.connect(lim);
    master = ctx.createGain(); master.gain.value = A.on ? 0.8 : 0; master.connect(comp);
    // the arena: a dark, wide reverb (decaying noise, a little later and duller in each ear) that every sound is sent to
    const sr = ctx.sampleRate, n = Math.floor(sr * 2.2), ir = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; lp += (x - lp) * (0.18 + 0.5 * (1 - i / n)); d[i] = i < sr * (0.014 + ch * 0.006) ? 0 : lp * Math.pow(1 - i / n, 3.2); }
    }
    const verb = ctx.createConvolver(); verb.buffer = ir; verbSend = ctx.createGain(); verbSend.gain.value = 0.3; // open air: less of the hall verbSend.connect(verb).connect(master);
    noise = ctx.createBuffer(1, sr * 2, sr);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.05 * HALL; crowdGain.connect(master);
    decodeAll();
  }
  const HALL = 3.4; // crowd(level) levels were set for the old murmur; the recorded hall sits this much higher
  function startHall() {
    if (hall || !S.hall) return;
    hall = ctx.createBufferSource(); hall.buffer = S.hall; hall.loop = true;
    hall.loopStart = S.meta.hall.loopStart; hall.loopEnd = S.meta.hall.loopEnd;
    hall.connect(crowdGain); hall.start(0, S.meta.hall.loopStart);
  }
  const now = () => ctx.currentTime;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  /* one slice of a sprite: gain, playback rate, pan, a low-pass for distance or softness, a send to the hall */
  function play(buf, slice, o = {}) {
    if (!buf || !slice) return null;
    const t = now() + (o.delay || 0), src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = o.rate || 1;
    let node = src;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.5; node.connect(f); node = f; }
    if (o.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.bp; f.Q.value = o.q || 1; node.connect(f); node = f; }
    const g = ctx.createGain(); g.gain.value = o.gain === undefined ? 1 : o.gain; node.connect(g); node = g;
    if (o.fade) { g.gain.setValueAtTime(g.gain.value, t + o.fade[0]); g.gain.setTargetAtTime(0.0001, t + o.fade[0], o.fade[1]); }
    if (ctx.createStereoPanner && o.pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); node.connect(p); node = p; }
    node.connect(master);
    if (o.send) { const sg = ctx.createGain(); sg.gain.value = o.send; node.connect(sg).connect(verbSend); }
    const off = slice[0] + (o.from || 0), dur = Math.max(0.01, slice[1] - (o.from || 0));
    src.start(t, off, o.len ? Math.min(o.len, dur) : dur);
    return g;
  }
  const fx = (name) => S.fx && S.meta && pick(S.meta.fx[name]);
  // distance from the camera, 0 near to 1 far: quieter, duller and wetter
  const away = (far = 0) => ({ k: 1 - 0.45 * far, lp: 16000 - 10000 * far, send: 0.12 + 0.25 * far });
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
  const SOFT = new Set(['drop', 'dvolley']), BIG = new Set(['smash', 'serveFlat', 'flat']);
  return {
    A, init,
    set(on) { A.on = on; store.set('sound', on); if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, now(), 0.05); },
    setVoice(on) { A.voice = on; store.set('voice', on); if (!on && window.speechSynthesis) speechSynthesis.cancel(); },
    /* racket on ball: the badminton crack slowed to a tennis ball's pock, with the body of the ball under it; a serve
       or a smash heavier, a drop shot or a drop volley a soft touch */
    hit(kind, speed, pan, far) {
      if (!ok()) return;
      const sl = fx('hit');
      if (!sl) return this.synthHit(kind, speed, pan);
      const d = away(far), v = clamp(speed / 45, 0.25, 1.2), r = 0.6 + Math.random() * 0.06;
      if (SOFT.has(kind)) { play(S.fx, sl, { gain: 0.5 * d.k, rate: r * 1.05, lp: Math.min(d.lp, 2600), pan, send: d.send * 0.6 }); return; }
      play(S.fx, sl, { gain: (0.75 + 0.55 * v) * d.k, rate: r, lp: Math.min(d.lp, 6500), pan, send: d.send });
      play(S.fx, sl, { gain: (0.35 + 0.3 * v) * d.k, rate: 0.38, lp: 900, pan }); // the felt ball's thump
      if (BIG.has(kind)) play(S.fx, fx('hit'), { gain: 0.5 * d.k, rate: r * 1.15, lp: d.lp, pan, delay: 0.004 });
      this.synthHit(kind, speed, pan, 0.5 * d.k);
    },
    synthHit(kind, speed, pan, k = 1) {
      const t = now() + 0.003, v = clamp(speed / 50, 0.2, 1.2);
      burst(t, { f: 1500, q: 1.1, type: 'bandpass', peak: 0.3 * k * (0.6 + v * 0.5), dec: 0.035, pan });
      tone(t, { f: 260, f2: 110, type: 'sine', peak: 0.22 * k * v, dec: 0.06, pan });
    },
    toss() { if (!ok()) return; const sl = fx('whoosh'); if (sl) play(S.fx, sl, { gain: 0.08, rate: 1.5, bp: 1800, q: 0.7, len: 0.2 }); },
    // the racket through the air after a big hit (the slice is started at its loudest, so the swish trails the hit)
    whoosh(pan, far) { if (!ok()) return; const sl = fx('whoosh'); if (sl) play(S.fx, sl, { gain: 0.36 * away(far).k, rate: 0.9 + Math.random() * 0.15, from: sl[1] * 0.35, pan, send: 0.1 }); },
    squeak(pan, far) {
      if (!ok()) return; const sl = fx('squeak'), d = away(far);
      if (sl) play(S.fx, sl, { gain: (0.09 + Math.random() * 0.09) * d.k, rate: 0.9 + Math.random() * 0.22, lp: d.lp, pan, send: d.send * 0.8 });
      else { const t = now(), f0 = rand(2300, 3300); tone(t, { f: f0, f2: f0 * rand(1.15, 1.4), type: 'sawtooth', peak: 0.022, dec: rand(0.06, 0.12), a: 0.01, pan }); }
    },
    step(pan) { if (!ok()) return; const sl = fx('hit'); if (sl) play(S.fx, sl, { gain: 0.22, rate: 0.4, lp: 320, pan, send: 0.1 }); }, // a landing: weight on the floor
    // into the net: the ball's dull thump in the mesh; off the tape: a sharper tick
    net() { if (!ok()) return; const sl = fx('hit'); if (!sl) { burst(now(), { f: 380, q: 0.8, type: 'lowpass', peak: 0.5, dec: 0.12 }); return; } play(S.fx, sl, { gain: 0.5, rate: 0.55, lp: 650, send: 0.2 }); play(S.fx, fx('whoosh'), { gain: 0.08, rate: 1.6, bp: 2200, q: 0.8, len: 0.12 }); },
    cord() { if (!ok()) return; const sl = fx('hit'); if (!sl) { burst(now(), { f: 1200, q: 3, peak: 0.25, dec: 0.05 }); return; } play(S.fx, sl, { gain: 0.42, rate: 0.82, bp: 1700, q: 0.9, send: 0.2 }); },
    // the ball on the hard court: a hollow thump, quieter for a little bounce
    bounce(pan, far, k = 1) {
      if (!ok()) return; const sl = fx('hit'), d = away(far);
      if (sl) play(S.fx, sl, { gain: 0.32 * d.k * k, rate: 0.45 + Math.random() * 0.05, lp: Math.min(1500, d.lp), pan, send: d.send });
      tone(now(), { f: 170, f2: 80, type: 'sine', peak: 0.16 * d.k * k, dec: 0.07, pan });
    },
    /* the crowd: recorded applause, bigger with a cheer for a winner of a long rally, a game or the match, fading out
       over `secs` */
    applause(k = 1, secs = 2.4) {
      if (!ok() || !S.crowd) return; const C = S.meta.crowd, r = 0.97 + Math.random() * 0.06, fade = [Math.max(0.6, secs * 0.45), secs * 0.3];
      play(S.crowd, pick(k >= 0.85 ? C.clapBig : C.clap), { gain: (k >= 0.85 ? 1.15 : 1.35) * k, rate: r, fade, send: 0.15 });
      if (k >= 0.95) play(S.crowd, pick(k >= 1.25 ? C.cheerBig : C.cheer), { gain: 0.6 * k, rate: r, fade, send: 0.15, delay: 0.05 });
    },
    ooh(k = 1) { if (!ok() || !S.crowd) return; play(S.crowd, pick(S.meta.crowd.ooh), { gain: 0.32 * k, rate: 0.95 + Math.random() * 0.1, send: 0.2 }); },
    click() { if (!ok()) return; tone(now(), { f: 1400, f2: 900, peak: 0.05, dec: 0.04 }); },
    crowd(level) { if (crowdGain) crowdGain.gain.setTargetAtTime(A.on ? level * HALL : 0, now(), 0.4); },
    tap() { const d = ctx.createMediaStreamDestination(); out.connect(d); return d.stream; }, // the final mix, for tests
    loaded: () => !!(S.fx && S.crowd && S.hall),
    // the umpire: a calm British voice if the device has one
    say(text) {
      if (!A.on || !A.voice || !window.speechSynthesis || !text) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const vs = speechSynthesis.getVoices();
        const v = vs.find((x) => /en-GB/i.test(x.lang) && /male|daniel|arthur|oliver/i.test(x.name)) || vs.find((x) => /en-GB/i.test(x.lang)) || vs.find((x) => /^en/i.test(x.lang));
        if (v) u.voice = v;
        u.rate = 0.98; u.pitch = 0.92; u.volume = 0.9;
        speechSynthesis.speak(u);
      } catch (e) { /* no voices */ }
    },
  };
})();
/* ------------------------------------------------------------------ controls */
/* One stick (WASD / arrows, a floating thumb stick, a game controller's left stick) and three shots. With auto-run
   on the stick aims; off, it moves you and aims as you hit. Directions are the screen's, turned onto the court. */
const Input = (() => {
  const keys = new Set(), I = { sx: 0, sy: 0, touch: { id: null, x0: 0, y0: 0, x: 0, y: 0 }, padPrev: [], onShot: null, onCam: null, onPause: null, onSkip: null, onAny: null };
  const SHOT_KEYS = { KeyJ: 'A', KeyZ: 'A', Digit1: 'A', KeyK: 'B', KeyX: 'B', Digit2: 'B', KeyL: 'C', Space: 'C', Digit3: 'C', Enter: 'C' };
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    I.onAny && I.onAny();
    if (e.code === 'Space' && I.onSkip && I.onSkip()) { e.preventDefault(); return; }
    if (SHOT_KEYS[e.code] && !e.repeat) { e.preventDefault(); I.onShot && I.onShot(SHOT_KEYS[e.code]); return; }
    if ((e.code === 'KeyC' || e.code === 'KeyV') && !e.repeat) { I.onCam && I.onCam(); return; }
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) { I.onPause && I.onPause(); return; }
    if (e.code === 'KeyM' && !e.repeat) { Sound.set(!Sound.A.on); syncToggles(); return; }
    if (/^(Arrow|Key[WASD])/.test(e.code)) { e.preventDefault(); keys.add(e.code); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  // the floating stick: wherever the left thumb lands
  const zone = $('stickZone'), stick = $('stick'), knob = $('knob');
  const R = 52;
  // at rest, low on the left (the zone is the left half, bottom up; from the window, as the zone has no size while hidden)
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
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); I.onAny && I.onAny(); b.classList.add('down'); if (!(I.onSkip && I.onSkip())) I.onShot && I.onShot(b.dataset.btn); });
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
      const map = { 0: 'A', 1: 'B', 2: 'C', 7: 'C', 3: 'cam', 9: 'pause' };
      for (const [bi, act] of Object.entries(map)) {
        const down = p.buttons[bi] && p.buttons[bi].pressed, was = I.padPrev[bi];
        if (down && !was) { I.onAny && I.onAny(); if (act === 'cam') I.onCam && I.onCam(); else if (act === 'pause') I.onPause && I.onPause(); else if (!(I.onSkip && I.onSkip())) I.onShot && I.onShot(act); }
        I.padPrev[bi] = down;
      }
      break;
    }
    I.sx = x; I.sy = y;
  };
  // the stick on the court: screen right and screen up, laid on the floor through the camera
  I.world = (out) => {
    const f = _v1; camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    const r = _v2.set(-f.z, 0, f.x);
    return out.set(r.x * I.sx + f.x * I.sy, 0, r.z * I.sx + f.z * I.sy);
  };
  return I;
})();

/* ------------------------------------------------------------------ the broadcast graphics */
const Hud = (() => {
  const H = { names: ['You', 'CPU'], timers: {} };
  const later = (k, ms, fn) => { clearTimeout(H.timers[k]); H.timers[k] = setTimeout(fn, ms); };
  H.setNames = (a, b) => { H.names = [a, b]; $('nm0').textContent = a; $('nm1').textContent = b; };
  H.score = (m, bump) => {
    const b = m.board();
    for (const i of [0, 1]) {
      const pt = $(`pt${i}`); pt.textContent = b[i]; $(`gm${i}`).textContent = m.games[i];
      $(`ss${i}`).innerHTML = m.setScores.map((s) => `<i class="${s.g[i] > s.g[1 - i] ? 'w' : ''}">${s.g[i]}${s.tb ? `<sup>${s.tb[i]}</sup>` : ''}</i>`).join('');
      $(`row${i}`).classList.toggle('serving', m.server === i && m.phase !== 'over');
      if (bump === i) { pt.classList.remove('bump'); void pt.offsetWidth; pt.classList.add('bump'); }
    }
    $('bugGame').textContent = m.phase === 'over' ? 'Final' : m.tiebreak ? 'Tiebreak' : `Set ${m.setScores.length + 1}`;
    const pf = m.pointFor();
    $('bugTag').textContent = pf && pf.kind !== 'game' ? `${pf.kind} point` : '';
    crowd.drawScreen(m, H.names);
  };
  H.callout = (text, sub, tone = 'white', ms = 1400) => {
    const el = $('callout'); el.hidden = false; el.classList.remove('show', 'hide'); void el.offsetWidth; el.classList.add('show');
    $('callMain').textContent = text; $('callMain').className = `call-main t-${tone}`;
    $('callSub').hidden = !sub; $('callSub').textContent = sub || '';
    later('call', ms, () => { el.classList.remove('show'); el.classList.add('hide'); later('call2', 320, () => { el.hidden = true; }); });
  };
  H.pill = (text, ms = 2200, red) => { const el = $('pill'); el.hidden = false; el.textContent = text; el.classList.toggle('red', !!red); later('pill', ms, () => { el.hidden = true; }); };
  H.speed = (label, kmh) => {
    const el = $('speed'); el.hidden = false; $('speedK').textContent = label; $('speedV').textContent = Math.round(kmh);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    later('speed', 2600, () => { el.hidden = true; });
  };
  H.ump = (text) => {
    const el = $('ump'); el.hidden = false; $('umpText').textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    later('ump', 2800, () => { el.hidden = true; });
  };
  H.rally = (n) => { $('rallyN').textContent = n; $('bug').classList.toggle('long', n >= 6); };
  H.timing = (label) => { const el = $('timing'); el.dataset.q = label; el.textContent = label; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  H.serveHint = (show, second) => {
    const el = $('serveHint');
    if (!show) { el.hidden = true; return; }
    const lead = second ? 'Second serve' : 'Your serve';
    el.innerHTML = COARSE ? `${lead}: <b>Flat</b> fast · <b>Kick</b> safe · <b>Slice</b> wide` : `${lead}: <b>J</b> flat · <b>K</b> kick · <b>L</b> slice`;
    el.hidden = false;
  };
  const LABELS = {
    serve: [['Flat', 'fast'], ['Kick', 'safe'], ['Slice', 'wide']],
    ground: [['Topspin', 'drive'], ['Slice', 'aim back: drop'], ['Lob', 'high']],
    volley: [['Volley', 'punch'], ['Drop', 'volley'], ['Lob', 'high']],
    over: [['Smash', 'overhead'], ['Smash', 'overhead'], ['Lob', 'back up']],
  };
  H.labels = (mode) => {
    if (mode === H.mode) return; H.mode = mode;
    const L = LABELS[mode] || LABELS.ground;
    for (const [i, k] of ['A', 'B', 'C'].entries()) { $(`lbl${k}`).textContent = L[i][0]; $(`sub${k}`).textContent = L[i][1]; }
  };
  H.clear = () => { for (const id of ['callout', 'pill', 'speed', 'ump', 'serveHint', 'replayBug', 'skipHint']) $(id).hidden = true; $('bug').classList.remove('long'); };
  return H;
})();


/* ------------------------------------------------------------------ the game */
const G = {
  mode: 'loading', match: null, views: [null, null], bodies: [null, null], umpire: null, K: {},
  pace: 0.86, paused: false, replay: null, review: null, attract: true, lastReplayPt: -9, ptCount: 0,
  s: {
    char: store.get('char', 'ch42'), opp: store.get('opp', 'remy'), name: store.get('name', '') || 'Kavin',
    diff: store.get('diff', 'medium'), fmt: store.get('fmt', 'quick'), auto: store.get('auto', true), marker: store.get('marker', true), replays: store.get('replays', true),
  },
};
if (!CHARS[G.s.char]) G.s.char = 'ch42';
if (!CHARS[G.s.opp] || G.s.opp === G.s.char) G.s.opp = Object.keys(CHARS).find((k) => k !== G.s.char);
if (!DIFFS[G.s.diff]) G.s.diff = 'medium';

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
function bodyFor(side, key) {
  const old = G.bodies[side]; if (old) old.dispose();
  const b = new Body(G.K[key], CHARS[key]);
  G.bodies[side] = b;
  if (G.views[side]) G.views[side].setBody(b); else G.views[side] = new PlayerView(side, b);
  return b;
}
async function ensureChars() {
  await Promise.all([G.s.char, G.s.opp].map(loadChar));
  if (!G.bodies[0] || G.bodies[0].cfg !== CHARS[G.s.char]) bodyFor(0, G.s.char);
  if (!G.bodies[1] || G.bodies[1].cfg !== CHARS[G.s.opp]) bodyFor(1, G.s.opp);
}

/* ---- matches */
const displayName = (key, mine) => (mine && G.s.name.trim() ? G.s.name.trim() : CHARS[key].short);
function newMatch(attract) {
  G.attract = attract;
  const names = [displayName(G.s.char, !attract), displayName(G.s.opp, false)];
  G.match = new Match({ format: attract ? 'set' : G.s.fmt, sides: attract ? [{ name: names[0], ai: 'hard' }, { name: names[1], ai: 'hard' }] : [{ name: names[0] }, { name: names[1], ai: G.s.diff }] });
  G.match.pl[0].auto = G.s.auto;
  G.pace = attract ? 0.92 : DIFFS[G.s.diff].pace;
  G.replay = null; G.review = null; G.pendingReplay = null; G.pendingReview = null; REC.on = true; fx.print.material.opacity = 0;
  G.paused = false; G.ptCount = 0; G.lastReplayPt = -9; G.stats = { maxRally: 0 };
  for (const v of G.views) if (v) v.stopReact();
  Hud.setNames(names[0], names[1]); Hud.score(G.match); Hud.clear(); Hud.labels('ground');
  fx.trail.pts.length = 0; fx.you.visible = !attract;
  REC.count = 0;
  Cam.script = attract ? attractCam() : null; Cam.cut = true;
  if (!attract) {
    Sound.say('Quiet please. Players ready. Play.'); Hud.ump('Quiet please · play');
    setTimeout(() => { if (G.match && G.mode === 'play') Hud.callout(`${G.match.pl[G.match.server].name}`, 'to serve', 'lime', 1600); }, 700);
  }
}

/* ---- events from the sim */
const SAY = { Love: 'love', 15: 'fifteen', 30: 'thirty', 40: 'forty' };
const sayScore = (t) => t.replace(/(Love|15|30|40)–(Love|15|30|40)/, (_, a, b) => `${SAY[a]}, ${SAY[b]}`).replace(/^(Love|15|30|40) all/, (_, a) => `${SAY[a]} all`).replace(/(\d+)–(\d+)/, '$1, $2');
const _fv = new V3();
const farOf = (x, y, z) => clamp((camera.position.distanceTo(_fv.set(x, y, z)) - 10) / 26, 0, 1);
function handleEvents() {
  const m = G.match, live = !G.attract;
  for (const e of m.events) {
    const pan = e.P ? clamp(e.P.x / 6, -0.8, 0.8) * (Cam.mode === 'side' ? 0.4 : 1) : 0, far = e.P ? farOf(e.P.x, e.P.y, e.P.z) : 0;
    if (e.type === 'hit') {
      Sound.hit(e.kind, e.speed, pan, far);
      const kmh = e.speed * 3.6;
      if (e.serve) { if (kmh >= 120) Hud.speed(e.second ? '2nd serve' : 'Serve', kmh); }
      else if (e.kind === 'smash') { Sound.whoosh(pan, far); if (live) Hud.speed('Smash', kmh); }
      else if (live && (e.kind === 'flat' || e.kind === 'top') && kmh >= 150) Hud.speed(SHOTS[e.kind].label, kmh);
      if (live && e.side === 0 && e.label) Hud.timing(e.label);
      if (live) Hud.rally(e.shots || 1);
      if (e.side === 0) Hud.serveHint(false);
      fx.trail.boost = clamp((e.speed - 15) / 35, 0, 1);
    } else if (e.type === 'serveStart') {
      Sound.toss();
    } else if (e.type === 'net') {
      Sound.net(); net.hit = { x: e.x, y: e.y, t: m.T, dir: e.side === 0 ? -1 : 1 }; crowd.ooh(0.5);
    } else if (e.type === 'netcord') {
      Sound.cord(); net.hit = { x: m.ball.p.x, y: netHeight(m.ball.p.x), t: m.T, dir: e.side === 0 ? -0.3 : 0.3 }; if (live) Hud.pill('Net cord', 1400);
    } else if (e.type === 'bounce' || e.type === 'roll') {
      if (e.type === 'roll' && e.speed < 0.6) continue;
      Sound.bounce(clamp(e.x / 6, -0.8, 0.8), farOf(e.x, 0, e.z), e.type === 'roll' ? 0.4 : 1);
      if (e.first) {
        G.landT = m.T;
        if (live && e.near !== undefined && e.near < 0.03 && !G.review) G.pendingReview = e;
        else if (live && e.inside === false && !e.serve) { Hud.callout('Out', null, 'out', 1100); Sound.say('Out!'); }
      }
    } else if (e.type === 'fault') {
      if (e.double) { if (live) { Hud.callout('Double fault', null, 'out', 1500); } Sound.say('Double fault.'); crowd.ooh(0.6); }
      else { if (live) Hud.callout('Fault', e.why === 'net' ? 'Into the net' : 'Second serve', 'out', 1300); Sound.say('Fault.'); }
    } else if (e.type === 'let') {
      if (live) Hud.callout('Let', m.secondServe ? 'Second serve' : 'First serve', 'white', 1300); Sound.say(m.secondServe ? 'Let. Second serve.' : 'Let. First serve.');
    } else if (e.type === 'point') onPoint(e, m);
    else if (e.type === 'game' || e.type === 'set') Hud.score(m);
    else if (e.type === 'gameStart') {
      Hud.score(m);
      if (e.tiebreak && live) setTimeout(() => { if (G.match === m) { Hud.callout('Tiebreak', 'First to 7', 'lime', 2000); Sound.say('Tiebreak.'); } }, 600);
    } else if (e.type === 'serveReady') { if (live && e.side === 0) Hud.serveHint(true, e.second); if (live && e.second && e.side === 1) Hud.pill('Second serve', 1300); }
    else if (e.type === 'match') onMatchEnd(e, m);
  }
  m.events.length = 0;
}
function onPoint(e, m) {
  const live = !G.attract, P = m.pl, wname = P[e.winner].name, you = e.winner === 0, names = [P[0].name, P[1].name];
  G.ptCount++;
  Hud.score(m, e.winner);
  Hud.serveHint(false);
  G.stats.maxRally = Math.max(G.stats.maxRally, e.rally);
  // the crowd: a home crowd, louder for you, louder for a long rally and a big point
  const k = clamp(0.45 + e.rally / 16 + (you && live ? 0.25 : 0) + (e.game ? 0.3 : 0) + (e.set ? 0.3 : 0), 0.35, 1.3);
  setTimeout(() => { Sound.applause(k, 1.6 + e.rally / 9); if (k > 0.9 || e.reason === 'ace') crowd.cheer(clamp(k - 0.2, 0.3, 1)); else crowd.applaud(k); }, 160);
  if (e.reason === 'out' || e.reason === 'net') { crowd.ooh(e.rally >= 6 ? 1 : 0.6); if (e.rally >= 6) Sound.ooh(0.8); }
  if (!live) return;
  // the umpire's call: the score (the server's first), or the game, set and match
  let text, say;
  if (e.match) { text = `Game, set and match ${wname}`; say = `Game, set and match, ${wname}.`; }
  else if (e.set) { text = `Game and set ${wname}`; say = `Game and ${['first', 'second', 'third'][m.setScores.length - 1] || ''} set, ${wname}.`; }
  else if (e.game) { text = `Game ${wname}`; say = `Game, ${wname}.`; }
  else { text = m.callText(names); say = sayScore(text) + '.'; }
  setTimeout(() => { if (G.match !== m) return; Hud.ump(text); Sound.say(say); }, e.game ? 900 : 550);
  const still = (fn) => () => { if (G.match === m && G.mode === 'play') fn(); };
  if (e.reason === 'ace') Hud.callout('Ace', `${Math.round(P[e.served].stats.maxServe && m.ball.shots === 1 ? Math.hypot(...Object.values(P[e.served].swing ? P[e.served].swing.dir : {})) * P[e.served].swing.speed * 3.6 : 0)} km/h`, 'lime', 1500);
  else if (e.reason === 'winner' && e.rally >= 3) Hud.pill(you ? 'Winner' : `Winner · ${wname}`, 1500, !you);
  if (e.game && e.broke && !e.set) setTimeout(still(() => Hud.callout('Break', `${wname} ${Math.max(...e.games)}–${Math.min(...e.games)}`, you ? 'lime' : 'out', 2200)), 400);
  else if (e.set && !e.match) setTimeout(still(() => Hud.callout('Set', `${wname} ${m.setScores[m.setScores.length - 1].g.join('–')}`, 'lime', 2400)), 400);
  else { const pf = m.pointFor(); if (pf && pf.kind !== 'game') setTimeout(still(() => Hud.pill(`${pf.kind[0].toUpperCase()}${pf.kind.slice(1)} point`, 2200, pf.side !== 0)), 1100); }
  led.flash(e.game ? `GAME ${wname.toUpperCase()}` : e.reason === 'ace' ? `ACE ${wname.toUpperCase()}` : `POINT ${wname.toUpperCase()}`, you ? '#39a3ff' : '#ff5b4f', '#ffffff', 2.6);
  // reactions
  const W = G.views[e.winner], Lv = G.views[1 - e.winner];
  const sw = P[e.winner].swing;
  if (e.game || e.reason === 'ace' || e.rally >= 10 || (sw && sw.kind === 'smash' && e.reason === 'winner')) W.celebrate(m.T, 1.6, false);
  if ((e.reason === 'net' || e.reason === 'out' || e.reason === 'double') && Math.random() < 0.5) Lv.dejected(m.T, 1.8);
  // a replay of something worth seeing
  const last = m.ball.by >= 0 && P[m.ball.by] ? P[m.ball.by].swing : null;
  const worth = e.match || e.rally >= 12 || (e.reason === 'winner' && last && (last.kind === 'smash' || last.kind === 'drop' || last.kind === 'lob' || last.kind === 'dvolley' || (last.speed * 3.6 > 160 && e.rally >= 3)) || (m.ball.cord && e.reason === 'winner'));
  if (G.s.replays && worth && (G.ptCount - G.lastReplayPt >= 3 || e.match) && last) {
    G.lastReplayPt = G.ptCount;
    m.hold = true;
    G.pendingReplay = { at: performance.now() + 1100, t1: last.t, kind: last.kind, side: m.ball.by };
  } else if (G.pendingReview) m.hold = true;
}
function onMatchEnd(e, m) {
  if (G.attract) { setTimeout(() => { if (G.attract) newMatch(true); }, 2500); return; }
  G.views[e.winner].celebrate(m.T, 8, true);
  G.views[e.winner].react('dance', { loop: true, until: 10 }); // the winner dances
  G.views[1 - e.winner].dejected(m.T, 4.3);
  Sound.applause(1.3, 5); crowd.cheer(1.2);
  led.flash(`${m.pl[e.winner].name.toUpperCase()} WINS`, '#d4ff3a', '#10170a', 8);
  Hud.score(m);
  setTimeout(() => { if (G.match === m) showEnd(e, m); }, 3800);
}

/* ---- replays and line reviews */
function startReplay(p) {
  const m = G.match, frames = recFrames();
  if (frames.length < 20) { m.hold = false; return; }
  const tEnd = frames[frames.length - 1][0], t0 = Math.max(frames[0][0], p.t1 - 1.4), t1 = Math.min(tEnd, (G.landT || tEnd) + 0.9);
  if (t1 - t0 < 0.5) { m.hold = false; return; }
  REC.on = false;
  const side = p.side, hz = sideSign(side);
  const angle = Math.random();
  G.replay = { frames, t: t0, t0, t1, speed: 0.46, p, startedAt: performance.now() };
  Cam.cut = true;
  // a sideline camera running with the ball down the court, or a low reverse angle from behind the other baseline
  const hitter = G.bodies[side].root.position;
  Cam.script = () => {
    const s = ballObj.position;
    if (angle < 0.55) {
      const cz = lerp(hitter.z, s.z, 0.5);
      return { pos: new V3(12.5, 2.6, cz + hz * 4), look: new V3(s.x * 0.35, clamp(s.y * 0.5 + 0.6, 0.8, 2.6), lerp(hitter.z, s.z, 0.7)), fov: 36, k: 5 };
    }
    return { pos: new V3(hitter.x * 0.25 + 1.5, 3.4, -hz * (COURT.halfL + 8)), look: new V3(lerp(hitter.x, s.x, 0.5) * 0.7, clamp(lerp(1.1, s.y, 0.4), 0.8, 2.2), lerp(hitter.z, s.z, 0.5)), fov: 30, k: 5 };
  };
  $('replayBug').hidden = false; $('skipHint').hidden = false;
}
function endReplay() {
  G.replay = null; REC.on = true; Cam.script = null; Cam.cut = true;
  $('replayBug').hidden = true; $('skipHint').hidden = true;
  if (G.match) G.match.hold = false;
}
function updateReplay(dt) {
  const R = G.replay, fr = R.frames;
  const near = R.p.t1 !== undefined && Math.abs(R.t - R.p.t1) < 0.2;
  R.t += dt * (near ? R.speed * 0.55 : R.speed);
  if (R.t >= R.t1) { endReplay(); return; }
  let i = 0; while (i < fr.length - 2 && fr[i + 1][0] < R.t) i++;
  const a = fr[i], b = fr[i + 1], u = clamp((R.t - a[0]) / Math.max(1e-5, b[0] - a[0]), 0, 1);
  playFrame(a, b, u, [G.bodies[0], G.bodies[1]]);
  for (const B of [G.bodies[0], G.bodies[1]]) B.root.updateMatrixWorld(true);
}
function startReview(e) {
  const m = G.match;
  G.pendingReview = null;
  const out = !e.inside, mm = Math.max(1, Math.round(e.near * 1000));
  G.review = { until: performance.now() + 2800, e };
  fx.print.position.set(e.x, 0.008, e.z); fx.print.material.opacity = 0.92; fx.print.material.color.set(out ? 0xff5b4f : 0x3fe0a2);
  fx.print.rotation.z = 0;
  Cam.cut = false;
  Cam.script = () => ({ pos: new V3(e.x + (e.x > 0 ? 1.2 : -1.2), 2.2, e.z + (e.z > 0 ? 1.6 : -1.6)), look: new V3(e.x, 0, e.z), fov: 24, k: 4 });
  Hud.pill('Line review', 2400);
  setTimeout(() => { if (G.review) { Hud.callout(out ? 'Out' : 'In', `${mm} mm ${out ? 'out' : 'in'}`, out ? 'out' : 'in', 1800); if (out) Sound.say('Out!'); } }, 800);
  m.hold = true;
}
function endReview() { G.review = null; Cam.script = null; fx.print.material.opacity = 0; if (G.match && !G.pendingReplay) G.match.hold = false; }

/* ---- the ball as drawn */
const _s1 = new V3(), _s2 = new V3(), _s3 = new V3();
function updateBall(dt, simDt) {
  const m = G.match, S = m.ball;
  const p = _s1;
  const server = m.pl[m.server], sb = G.bodies[m.server];
  if ((S.mode === 'held' || (S.mode === 'toss' && server.swing && m.T < server.swing.t - 0.72)) && sb) {
    // in the server's left hand (and still in it as the toss begins)
    sb.leftHandPos(p); p.y += 0.02;
    ballObj.visible = m.phase === 'serve' || m.phase === 'intro' || S.mode === 'toss';
    if (S.mode === 'toss') { const u = smooth((m.T - (server.swing.t - 0.95)) / 0.23); p.lerp(_s2.set(S.p.x, S.p.y, S.p.z), u); }
  } else {
    p.set(S.p.x, S.p.y, S.p.z);
    ballObj.visible = S.mode !== 'held' || m.phase === 'dead';
    const w = Math.hypot(S.w.x, S.w.y, S.w.z);
    if (w > 1) { bl.axis.set(S.w.x / w, S.w.y / w, S.w.z / w); bl.spin += w * simDt * 0.12; }
    else if (S.mode === 'loose') { const v = Math.hypot(S.v.x, S.v.z); if (v > 0.05) { bl.axis.set(S.v.z / v, 0, -S.v.x / v); bl.spin += (v / 0.0335) * simDt; } }
  }
  ballObj.position.copy(p);
  ballObj.quaternion.setFromAxisAngle(bl.axis, bl.spin);
  // drawn bigger the further it is from the camera, so it is never lost
  const dist = camera.position.distanceTo(p), px = innerHeight;
  const want = clamp((7 * dist * 2 * Math.tan((camera.fov * Math.PI) / 360)) / (0.067 * px), 1, 3.4);
  bl.scale = damp(bl.scale, want, 6, dt); ballObj.scale.setScalar(bl.scale);
  // trail
  const tr = fx.trail, flying = S.mode === 'flight';
  if (flying) { tr.pts.unshift(p.clone()); if (tr.pts.length > tr.N) tr.pts.pop(); } else if (tr.pts.length) tr.pts.pop();
  const fast = flying ? clamp((Math.hypot(S.v.x, S.v.y, S.v.z) - 12) / 30, 0, 1) : 0;
  tr.mat.uniforms.uOpacity.value = damp(tr.mat.uniforms.uOpacity.value, 0.1 + 0.5 * fast, 10, dt);
  const camPos = camera.position, w0 = 0.03 * bl.scale;
  for (let i = 0; i < tr.N; i++) {
    const q = tr.pts[Math.min(i, tr.pts.length - 1)] || p, nx = tr.pts[Math.min(i + 1, tr.pts.length - 1)] || q;
    _s2.subVectors(q, nx); if (_s2.lengthSq() < 1e-8) _s2.set(0, 1, 0);
    _s3.subVectors(camPos, q); _s2.cross(_s3).normalize();
    const ww = w0 * (1 - i / tr.N), o = i * 6;
    tr.pos[o] = q.x + _s2.x * ww; tr.pos[o + 1] = q.y + _s2.y * ww; tr.pos[o + 2] = q.z + _s2.z * ww;
    tr.pos[o + 3] = q.x - _s2.x * ww; tr.pos[o + 4] = q.y - _s2.y * ww; tr.pos[o + 5] = q.z - _s2.z * ww;
    tr.a[i * 2] = tr.a[i * 2 + 1] = i < tr.pts.length ? (1 - i / tr.N) : 0;
  }
  tr.geo.attributes.position.needsUpdate = true; tr.geo.attributes.alpha.needsUpdate = true;
  // shadow on the court, softer and fainter the higher it is
  fx.shadow.visible = ballObj.visible;
  fx.shadow.position.set(p.x, 0.005, p.z);
  const hs = 0.08 * bl.scale + p.y * 0.05; fx.shadow.scale.set(hs, hs, 1);
  fx.shadow.material.opacity = clamp(0.6 - p.y * 0.08, 0.12, 0.6);
  // where it will bounce (when it is coming to you)
  const mk = fx.marker.material;
  const showMk = !G.attract && G.s.marker && m.phase === 'rally' && flying && S.by === 1 && S.bounces === 0 && m.path && m.path.land && m.path.land.z > 0;
  if (showMk) fx.marker.position.set(m.path.land.x, 0.006, m.path.land.z);
  mk.opacity = damp(mk.opacity, showMk ? 0.75 : 0, 10, dt);
  fx.marker.scale.setScalar(1 + 0.12 * Math.sin(performance.now() / 120));
}

/* ---- the human's controls into the sim */
const _iw = new V3();
function applyInput() {
  const m = G.match; if (!m || G.attract) return;
  const me = m.pl[0];
  Input.world(_iw);
  me.auto = G.s.auto;
  me.input.mx = _iw.x; me.input.mz = _iw.z;
  me.input.ax = _iw.x; me.input.ad = -_iw.z; // toward the far end is deeper
  const plan = me.plan, coming = m.phase === 'rally' && m.ball.by === 1;
  Hud.labels(m.phase === 'serve' && m.server === 0 ? 'serve' : coming && plan ? (plan.P.y >= 2.05 ? 'over' : !plan.after ? 'volley' : 'ground') : m.server === 0 && m.phase !== 'rally' ? 'serve' : 'ground');
  // the perfect window: a press now, with the ball this far away, is a Perfect
  const lead = plan && coming ? plan.t - m.T : -1;
  const ready = lead >= 0.1 && lead <= 0.42 && !me.press;
  if (ready !== G.ready) { G.ready = ready; $('touch').classList.toggle('ready', ready); }
  const ring = fx.you.material;
  fx.you.visible = G.mode === 'play' && !G.review && !G.replay;
  fx.you.position.x = me.x; fx.you.position.z = me.z;
  ring.color.setHex(ready ? 0xd4ff3a : 0x39a3ff);
  ring.opacity = damp(ring.opacity, ready ? 0.95 : 0.32, 14, 1 / 60);
  $('stickTag').textContent = G.s.auto ? 'Aim' : 'Move';
}
Input.onShot = (btn) => {
  Sound.init();
  if (G.mode !== 'play' || G.paused || G.replay || G.review || !G.match) return;
  G.match.press(0, btn);
};
Input.onCam = () => { if (G.mode === 'play' || G.mode === 'paused') setView(Cam.mode === 'broadcast' ? 'side' : 'broadcast'); };
Input.onPause = () => { if (G.mode === 'play') pause(true); else if (G.mode === 'paused') pause(false); };
Input.onSkip = () => { if (G.replay) { endReplay(); return true; } if (G.review) { endReview(); return true; } return false; };
Input.onAny = () => Sound.init();

/* ---- menus */
function setView(v) {
  Cam.mode = v; store.set('view', v); Cam.cut = false;
  $('viewName').textContent = v === 'side' ? 'Side' : 'Broadcast';
  for (const id of ['segView', 'segViewP']) for (const b of $(id).children) b.setAttribute('aria-pressed', b.dataset.v === v);
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
  set('togSound', Sound.A.on); set('togSoundP', Sound.A.on); set('togVoiceP', Sound.A.voice); set('togReplayP', G.s.replays);
}
function toggle(id, fn) { $(id).addEventListener('click', () => { Sound.init(); fn(); syncToggles(); Sound.click(); }); }
toggle('togAuto', () => { G.s.auto = !G.s.auto; store.set('auto', G.s.auto); }); toggle('togAutoP', () => { G.s.auto = !G.s.auto; store.set('auto', G.s.auto); });
toggle('togMark', () => { G.s.marker = !G.s.marker; store.set('marker', G.s.marker); }); toggle('togMarkP', () => { G.s.marker = !G.s.marker; store.set('marker', G.s.marker); });
toggle('togSound', () => Sound.set(!Sound.A.on)); toggle('togSoundP', () => Sound.set(!Sound.A.on));
toggle('togVoiceP', () => Sound.setVoice(!Sound.A.voice));
toggle('togReplayP', () => { G.s.replays = !G.s.replays; store.set('replays', G.s.replays); });

G.faces = Object.fromEntries(Object.keys(CHARS).map((k) => [k, `${PLAYERS}faces/${k}.jpg`]));
function paintPicks() {
  const el = $('pickChips'); el.innerHTML = '';
  for (const [k, c] of Object.entries(CHARS)) {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button';
    b.setAttribute('aria-pressed', String(k === G.s.char));
    b.innerHTML = `<span class="face" style="background-image:url(${G.faces[k]})"></span>${c.name.split(' ')[0]}`;
    b.title = `${c.name} · ${c.look}`;
    b.addEventListener('click', () => pickChar(k));
    el.appendChild(b);
  }
  $('oppName').textContent = `${CHARS[G.s.opp].name}`;
}
async function pickChar(k) {
  Sound.init(); Sound.click();
  if (k === G.s.char) return;
  G.s.char = k; store.set('char', k);
  if (G.s.opp === k) { G.s.opp = Object.keys(CHARS).filter((x) => x !== k)[Math.floor(Math.random() * 4)]; store.set('opp', G.s.opp); }
  paintPicks(); await refreshBodies();
}
$('oppShuffle').addEventListener('click', async () => {
  Sound.init(); Sound.click();
  const keys = Object.keys(CHARS).filter((x) => x !== G.s.char && x !== G.s.opp);
  G.s.opp = keys[Math.floor(Math.random() * keys.length)]; store.set('opp', G.s.opp);
  paintPicks(); await refreshBodies();
});
async function refreshBodies() {
  const btn = $('playBtn'); btn.disabled = true; btn.textContent = 'Loading player…';
  try { await ensureChars(); } catch (e) { console.warn(e); }
  btn.disabled = false; btn.textContent = 'Play';
  if (G.match) Hud.setNames(displayName(G.s.char, !G.attract), displayName(G.s.opp, false));
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
  $('keyHint').hidden = COARSE || store.get('hinted', 0) >= 2; store.set('hinted', store.get('hinted', 0) + 1);
  setTimeout(() => { $('keyHint').style.opacity = 0; }, 9000);
  $('keyHint').style.opacity = 1;
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
    const m = G.match, sets = m.setScores.map((s) => s.g.join('–')).concat(m.phase !== 'over' ? [`${m.games[0]}–${m.games[1]}`] : []).join(', ');
    $('pauseSub').textContent = `${m.pl[0].name} v ${m.pl[1].name} · ${sets} · ${m.callText([m.pl[0].name, m.pl[1].name])}`;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  syncToggles();
}
function showEnd(e, m) {
  G.mode = 'end';
  if (G.views[e.winner]) G.views[e.winner].react('dance', { loop: true, until: 1e9 });
  const you = e.winner === 0, P = m.pl;
  $('endTitle').textContent = you ? 'Match won' : 'Match lost'; $('endTitle').className = you ? 'win' : '';
  $('endSub').textContent = `${P[0].name} v ${P[1].name} · ${DIFFS[G.s.diff].name}`;
  $('endGames').innerHTML = e.setScores.map((s) => `<span class="${s.g[0] > s.g[1] ? 'w' : ''}">${s.g[0]}–${s.g[1]}${s.tb ? `<sup>(${Math.min(...s.tb)})</sup>` : ''}</span>`).join('');
  const s0 = P[0].stats, s1 = P[1].stats, pc = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');
  const rows = [['Points won', s0.points, s1.points], ['Aces', s0.aces, s1.aces], ['Double faults', s0.doubles, s1.doubles], ['First serves in', pc(s0.firstIn, s0.firstServes), pc(s1.firstIn, s1.firstServes)], ['Fastest serve', s0.maxServe ? `${Math.round(s0.maxServe)}` : '–', s1.maxServe ? `${Math.round(s1.maxServe)}` : '–'], ['Winners', s0.winners, s1.winners], ['Errors', s0.errors, s1.errors], ['Break points won', `${s0.breaksWon}/${s0.breakPts}`, `${s1.breaksWon}/${s1.breakPts}`], ['Net points won', `${s0.netWon}/${s0.netPts}`, `${s1.netWon}/${s1.netPts}`], ['Perfect timing', pc(s0.perfect, s0.shots), '–'], ['Longest rally', G.stats.maxRally, '']];
  $('endStats').innerHTML = `<tr><th></th><th class="c0">${P[0].name}</th><th class="c1">${P[1].name}</th></tr>` + rows.map(([k, a, b]) => `<tr><td>${k}</td><td>${a}</td><td>${b}</td></tr>`).join('');
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
canvas.addEventListener('pointerdown', () => { Sound.init(); Input.onSkip(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') pause(true); else if (!document.hidden) checkRelease(); });

/* a newer release on the site (a higher ?v= on game.js in index.html): reload into it, at once outside a match, else
   on the way back to the menu. Once per release, so a stale copy somewhere can't loop. */
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
  try { if (sessionStorage.getItem('sp.reloadedFor') === String(v)) return; sessionStorage.setItem('sp.reloadedFor', String(v)); } catch (e) { return; }
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
  if (perf.n >= 90) {
    const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
    if (avg > 0.024 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); }
  }
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
function tick(dt) {
  wall += dt;
  Input.poll();
  const m = G.match;
  if (m) {
    if (G.pendingReplay && performance.now() >= G.pendingReplay.at && !G.replay) { const p = G.pendingReplay; G.pendingReplay = null; startReplay(p); }
    if (G.pendingReview && !G.review && !G.replay) { if (m.phase === 'dead') startReview(G.pendingReview); else if (!G.pendingReplay) G.pendingReview = null; }
    if (G.review && performance.now() > G.review.until) endReview();
    applyInput();
    let simDt = 0;
    if (G.replay) { if (!G.paused) updateReplay(dt); }
    if (!G.replay) {
      if (!G.paused) { simDt = dt * G.pace; m.step(simDt); handleEvents(); }
      if (G.match === m) {
        updateBall(dt, simDt);
        const live = m.phase === 'rally' || m.phase === 'serve';
        for (const i of [0, 1]) if (G.views[i] && G.bodies[i]) G.views[i].update(simDt, m.pl[i], m, ballObj.position, live);
        if (G.umpire) poseUmpire(G.umpire, ballObj.position);
        if (!G.paused) recordFrame(m.T, [G.bodies[0], G.bodies[1]]);
      }
    }
    for (const pl of m.pl) {
      const a = Math.hypot(pl.vx - (pl.pvx || 0), pl.vz - (pl.pvz || 0)) / Math.max(1e-3, simDt);
      if (simDt > 0 && a > 14 && Math.hypot(pl.vx, pl.vz) > 2.6 && wall - (pl.squeakT || 0) > 0.7 && Math.random() < 0.5) { pl.squeakT = wall; Sound.squeak(clamp(pl.x / 6, -0.8, 0.8), farOf(pl.x, 0.1, pl.z)); }
      pl.pvx = pl.vx; pl.pvz = pl.vz;
    }
    net.update(m.T);
  }
  led.update(wall); crowd.update(wall, dt);
  const focus = m ? _v4.set(m.pl[0].x, 0, m.ball.p.z) : _v4.set(0, 0, 0);
  updateCamera(dt, focus);
}

/* ------------------------------------------------------------------ start */
async function boot() {
  resize();
  seg('segDiff', 'diff'); seg('segFmt', 'fmt'); seg('segView', 'view'); seg('segViewP', 'view');
  setView(Cam.mode); syncToggles(); paintPicks();
  loadBar(0.2, 'Loading the players…');
  const progTimer = setInterval(() => {
    const keys = Object.keys(progress), p = keys.length ? keys.reduce((a, k) => a + progress[k], 0) / 3 : 0;
    loadBar(0.2 + 0.7 * clamp(p, 0, 1));
  }, 120);
  try {
    const clipsP = fetch(`${PLAYERS}moves.json`).then((r) => { if (!r.ok) throw new Error(`moves.json ${r.status}`); return r.json(); });
    const [clips] = await Promise.all([clipsP, loadChar(G.s.char), loadChar(G.s.opp), loadChar('josh')]);
    CLIPS = clips; CLIP_BI = Object.fromEntries(clips.bones.map((n, i) => [n, i]));
  } catch (e) { clearInterval(progTimer); window.__fatal('The players could not be loaded. Check the connection and reload.', e && e.message); return; }
  clearInterval(progTimer);
  loadBar(0.94, 'Warming up…');
  await ensureChars();
  G.umpire = new Body(G.K.josh, { racket: null }, { umpire: true });
  if (!LITE) setTimeout(() => { for (const k of Object.keys(CHARS)) loadChar(k).catch(() => {}); }, 2500);
  showMenu();
  renderer.compile(scene, camera);
  loadBar(1, 'Ready');
  $('loadPanel').hidden = true;
  $('playBtn').disabled = false; $('playBtn').textContent = 'Play';
  requestAnimationFrame(frame);
  if (DEBUG) window.__sp = {
    G, Cam, Sound, Input, setView, play, showMenu, newMatch, THREE, scene, camera, renderer, SHOTS, bl, fx, CHARS, crowd,
    step(n = 1, dt = 1 / 60, draw = true) { stepping = true; for (let i = 0; i < n; i++) tick(dt); if (draw) render(); },
    release() { stepping = false; last = performance.now(); },
    draw: render,
    review: (e) => { G.pendingReview = e; },
    camAt(p, l, fov = 35) { Cam.script = p ? () => ({ pos: new V3(...p), look: new V3(...l), fov, k: 50 }) : null; Cam.cut = true; },
  };
}
boot().catch((e) => { console.error(e); window.__fatal('Something went wrong while building the stadium.', e && (e.message || e)); });
