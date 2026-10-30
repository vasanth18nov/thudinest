/* Rally Point: the arena, the players and the broadcast. The badminton itself (flight, shots, rules, the computer's
   choices) is in sim.js; this file draws it, animates the players from it, films it and takes the controls.
   Axes as in sim.js: x across the court, y up, z along it, the net at z = 0; you play the half z > 0. */
import * as THREE from '../vendor/three.js';
import { Match, COURT, DIFFS, SHOTS, sideSign, netHeight, H_PREF, DT } from './sim.js?v=5'; // bump ?v= here and in index.html with each release: browsers keep JS for 4 hours

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
  get(k, d) { try { const v = localStorage.getItem('rp.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rp.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const loadBar = (p, step) => { $('loadBar').style.transform = `scaleX(${clamp(p, 0.04, 1).toFixed(3)})`; if (step) $('loadStep').textContent = step; };
loadBar(0.12, 'Building the arena…');

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
renderer.toneMapping = THREE.NeutralToneMapping; // keeps the court's green green under bright lights
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let pixelRatio = Math.min(window.devicePixelRatio || 1, LITE ? 2 : 2);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080f);
scene.fog = new THREE.Fog(0x05080f, 34, 78);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 220);
{
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  pm.dispose();
}
let composer = null, bloom = null;
if (!LITE) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  composer = new THREE.EffectComposer(renderer, rt);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 1.15); // only the LEDs and lamps are bright enough
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

/* ------------------------------------------------------------------ the court */
const arena = new THREE.Group(); scene.add(arena);
const MAT = { w: 9.4, l: 17.6 }; // the green mat: the court plus 1.7 m at the sides and 2.1 m at the ends
{
  // the mat: a deeper green outside the lines, a fine vinyl grain
  const mat = canvasTex(1024, 2048, (g, w, h) => {
    g.fillStyle = '#0c5531'; g.fillRect(0, 0, w, h);
    const sx = w / MAT.w, sz = h / MAT.l;
    g.fillStyle = '#0f6a3e'; g.fillRect((MAT.w / 2 - COURT.halfW) * sx, (MAT.l / 2 - COURT.halfL) * sz, 2 * COURT.halfW * sx, 2 * COURT.halfL * sz);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
  const matMesh = new THREE.Mesh(new THREE.PlaneGeometry(MAT.w, MAT.l), std(0xffffff, 0.72, { map: mat, envMapIntensity: 0.6 }));
  matMesh.rotation.x = -Math.PI / 2; matMesh.position.y = 0.002; matMesh.receiveShadow = true;
  arena.add(matMesh);
  // the lines: 40 mm wide, each part of the court it bounds (outer edges on the measurements)
  const L = COURT.line, hl = L / 2, parts = [];
  const strip = (x0, z0, x1, z1) => { const g = new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2); parts.push(g); };
  const { halfW: W, halfWS: WS, halfL: HL, ssl } = COURT, lsl = HL - 0.76;
  for (const s of [-1, 1]) {
    strip(s * W - s * L, -HL, s * W, HL); // doubles sidelines
    strip(s * WS - s * L, -HL, s * WS, HL); // singles sidelines
    strip(-W, s * HL - s * L, W, s * HL); // back boundary
    strip(-W, s * lsl - s * L, W, s * lsl); // doubles long service line
    strip(-W, s * ssl, W, s * (ssl + L)); // short service line
    strip(-hl, s * (ssl + L), hl, s * HL); // centre line
  }
  const lines = new THREE.Mesh(THREE.mergeGeometries(parts), std(0xcfd4cc, 0.62, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  lines.position.y = 0.004; lines.receiveShadow = true;
  arena.add(lines);

  // the hall floor round the mat, with the event's name painted at both ends
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#0d1528'; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 6; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  }, { repeat: [6, 6] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), std(0xffffff, 0.48, { map: floorTex, envMapIntensity: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; arena.add(floor);
  const logo = canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 italic 150px "Barlow Condensed", Impact, sans-serif'; g.fillStyle = 'rgba(212,255,58,0.9)';
    g.fillText('THUDINEST OPEN', w / 2, h / 2 + 8, w - 40);
  });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), new THREE.MeshStandardMaterial({ map: logo, transparent: true, opacity: 0.5, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.003, s * 9.35); arena.add(m); // both read the right way up from the main camera
  }
}

/* ------------------------------------------------------------------ the net */
const net = {};
{
  const W = COURT.postX, segs = 60;
  // the mesh: a fine dark grid, translucent at a distance as on television
  const meshTex = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,16,0.28)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(14,16,20,0.95)'; g.lineWidth = 3;
    for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, { repeat: [2 * W / 0.075, COURT.netDrop / 0.075] });
  const geo = new THREE.PlaneGeometry(2 * W, COURT.netDrop, segs, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), v = (pos.getY(i) + COURT.netDrop / 2) / COURT.netDrop; // 0 bottom .. 1 top
    pos.setY(i, netHeight(x) - COURT.netDrop * (1 - v));
  }
  geo.computeVertexNormals();
  net.base = Float32Array.from(pos.array);
  net.geo = geo;
  net.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: meshTex, transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false, alphaTest: 0.02 }));
  arena.add(net.mesh);
  // the white tape over the top, sagging with it, and the side bands
  const tape = new THREE.BoxGeometry(2 * W, 0.075, 0.014, segs, 1, 1), tp = tape.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, tp.getY(i) + netHeight(tp.getX(i)) - 0.0375);
  tape.computeVertexNormals();
  const tapeMat = std(0xffffff, 0.5, { emissive: 0x3a3a3a });
  arena.add(new THREE.Mesh(tape, tapeMat));
  for (const s of [-1, 1]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.03, COURT.netDrop, 0.012), tapeMat);
    band.position.set(s * (W - 0.015), COURT.netHPost - COURT.netDrop / 2, 0); arena.add(band);
  }
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 2 * W, 6), std(0x15171c, 0.8));
  cord.rotation.z = Math.PI / 2; cord.position.y = netHeight(0) - COURT.netDrop; arena.add(cord);
  // posts on the doubles sidelines, on weighted bases
  const postMat = std(0x232b3d, 0.35, { metalness: 0.6 }), baseMat = std(0x161c2a, 0.6);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, COURT.netHPost + 0.02, 14), postMat);
    post.position.set(s * (W + 0.022), (COURT.netHPost + 0.02) / 2, 0); post.castShadow = true; arena.add(post);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.62), baseMat);
    base.position.set(s * (W + 0.2), 0.035, 0); base.castShadow = true; base.receiveShadow = true; arena.add(base);
  }
  net.hit = { x: 0, y: 0, t: -9, dir: 1 };
  // the net bellies where the shuttle hits it, and settles
  net.update = (t) => {
    const age = t - net.hit.t;
    if (age > 1.6) { if (net.dirty) { pos.array.set(net.base); pos.needsUpdate = true; net.dirty = false; } return; }
    const a = pos.array, amp = 0.09 * Math.exp(-age * 3.2) * Math.cos(age * 18);
    for (let i = 0; i < pos.count; i++) {
      const x = net.base[i * 3], y = net.base[i * 3 + 1];
      const r2 = ((x - net.hit.x) ** 2) / 0.18 + ((y - net.hit.y) ** 2) / 0.08;
      a[i * 3 + 2] = net.hit.dir * amp * Math.exp(-r2);
    }
    pos.needsUpdate = true; net.dirty = true;
  };
}

/* ------------------------------------------------------------------ the hall */
const led = {};
const crowd = {};
{
  // LED boards round the field of play: one long ribbon texture scrolled along every board
  const ADS = [['THUDINEST OPEN', '#d4ff3a'], ['RALLY POINT', '#ffffff'], ['THUDI NEST No.2 · COIMBATORE', '#7fd3ff'], ['BOOK YOUR STAY ON AIRBNB', '#ff7a6b'], ['3D BADMINTON', '#ffffff']];
  const drawAds = (g, w, h, flash) => {
    g.fillStyle = flash ? flash.bg : '#071026'; g.fillRect(0, 0, w, h);
    g.textBaseline = 'middle'; g.font = '800 italic 74px "Barlow Condensed", Impact, sans-serif';
    if (flash) {
      g.fillStyle = flash.fg; const step = g.measureText(flash.text).width + 90;
      for (let x = 30; x < w; x += step) g.fillText(flash.text, x, h / 2 + 4);
      return;
    }
    let x = 30;
    while (x < w) for (const [t, c] of ADS) { if (x >= w) break; g.fillStyle = c; g.fillText(t, x, h / 2 + 4); x += g.measureText(t).width + 40; g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 24, h * 0.3, 6, h * 0.4); x += 22; }
  };
  led.canvas = document.createElement('canvas'); led.canvas.width = 2048; led.canvas.height = 128;
  led.tex = new THREE.CanvasTexture(led.canvas); led.tex.colorSpace = THREE.SRGBColorSpace; led.tex.wrapS = THREE.RepeatWrapping; led.tex.anisotropy = maxAniso;
  led.draw = (flash) => { drawAds(led.canvas.getContext('2d'), 2048, 128, flash); led.tex.needsUpdate = true; };
  led.draw(null);
  led.flashUntil = 0;
  led.flash = (text, bg = '#d4ff3a', fg = '#10170a', secs = 3) => { led.draw({ text, bg, fg }); led.flashUntil = performance.now() + secs * 1000; };
  const ledMat = new THREE.MeshBasicMaterial({ map: led.tex, toneMapped: false });
  ledMat.color.setScalar(LITE ? 0.9 : 1.35);
  const bodyMat = std(0x0a0f1c, 0.6);
  led.boards = [];
  const board = (len, x, z, ry) => {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.8), ledMat.clone());
    face.material.map = led.tex.clone(); face.material.map.repeat.set(len / 11, 1); face.material.map.needsUpdate = true;
    face.position.set(0, 0.48, 0.061); face.rotation.x = -0.1;
    const box = new THREE.Mesh(new THREE.BoxGeometry(len, 0.86, 0.12), bodyMat); box.position.y = 0.46; box.rotation.x = -0.1;
    g.add(box, face); g.position.set(x, 0, z); g.rotation.y = ry; arena.add(g);
    led.boards.push(face.material.map);
  };
  for (const s of [-1, 1]) {
    board(11, 0, s * 10.3, s > 0 ? Math.PI : 0);
    board(9.2, s * 6.6, -5.0, -s * Math.PI / 2); board(9.2, s * 6.6, 5.0, -s * Math.PI / 2);
  }
  led.update = (t) => {
    for (const [i, m] of led.boards.entries()) { m.offset.x = (t * 0.035 + i * 0.27) % 1; m.image = led.canvas; }
    if (led.flashUntil && performance.now() > led.flashUntil) { led.flashUntil = 0; led.draw(null); }
  };

  // the stands: stepped concrete, seats, and a seated crowd (instanced, bobbing, on their feet after a big point)
  const concrete = std(0x121a2c, 0.9), riserMat = std(0x0c1222, 0.85);
  const seatColor = new THREE.Color(0x1f4fa8);
  const rows = LITE ? 8 : 11, rowD = 0.86, rowH = 0.44;
  const seatGeo = new THREE.BoxGeometry(0.46, 0.42, 0.42); seatGeo.translate(0, 0.21, 0);
  const torsoGeo = new THREE.BoxGeometry(0.42, 0.58, 0.26); torsoGeo.translate(0, 0.62, 0.02);
  const headGeo = new THREE.SphereGeometry(0.115, 7, 5); headGeo.translate(0, 1.04, 0.02);
  const shirts = [0x2a6fdb, 0xd4ff3a, 0xf2f4fb, 0xff5b4f, 0x1b2a4a, 0x39a3ff, 0xffb347, 0x3fe0a2, 0x6b4fd8, 0x2b2f3a, 0xe0e4ee, 0xff8fb1];
  const skins = [0x8d5a3b, 0x6b4128, 0xc68e6a, 0xa86f4c, 0xe0b08f, 0x5a3622, 0xf1c7a5];
  crowd.uTime = { value: 0 }; crowd.uExcite = { value: 0 };
  const crowdMat = (extra) => {
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
  const seatMat = std(0xffffff, 0.7), torsoMat = crowdMat({ color: 0xffffff }), headMat = crowdMat({ color: 0xffffff });
  const m4 = new THREE.Matrix4(), p = new V3(), q0 = new Q(), sc = new V3(1, 1, 1), col = new THREE.Color();
  /* A stand rising away from the court (its rows run along its local +z), with its own seats and people, so a
     camera standing in it or behind it (a portrait screen backs the broadcast camera a long way up) can hide it */
  crowd.stands = [];
  const tier = (cx, cz, len, ry, behind) => {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; arena.add(g);
    const spots = [];
    for (let r = 0; r < rows; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(len, rowH * (r + 1) + 0.6, rowD), r % 2 ? concrete : riserMat);
      step.position.set(0, (rowH * (r + 1) + 0.6) / 2 - 0.6, r * rowD + rowD / 2); g.add(step);
      for (let x = -len / 2 + 0.35; x < len / 2 - 0.3; x += 0.56) spots.push({ x: x + rand(-0.03, 0.03), y: rowH * (r + 1), z: r * rowD + 0.42 });
    }
    // the wall behind the top row, one-sided (facing the court)
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, 12), std(0x080c18, 0.95)); wall.rotation.y = Math.PI; wall.position.set(0, 6, rows * rowD + 0.25); g.add(wall);
    const people = spots.filter(() => Math.random() < 0.74);
    const seats = new THREE.InstancedMesh(seatGeo, seatMat, spots.length);
    const torsos = new THREE.InstancedMesh(torsoGeo, torsoMat, people.length), heads = new THREE.InstancedMesh(headGeo, headMat, people.length);
    spots.forEach((s, i) => { m4.compose(p.set(s.x, s.y, s.z), q0, sc.setScalar(1)); seats.setMatrixAt(i, m4); seats.setColorAt(i, col.copy(seatColor).multiplyScalar(0.7 + Math.random() * 0.3)); });
    people.forEach((s, i) => {
      m4.compose(p.set(s.x, s.y, s.z), q0, sc.setScalar(rand(0.92, 1.08))); torsos.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
      torsos.setColorAt(i, col.setHex(shirts[(Math.random() * shirts.length) | 0]).multiplyScalar(0.55));
      heads.setColorAt(i, col.setHex(skins[(Math.random() * skins.length) | 0]).multiplyScalar(0.6));
    });
    for (const m of [seats, torsos, heads]) { m.frustumCulled = false; g.add(m); }
    crowd.stands.push({ g, behind });
  };
  tier(0, -12.6, 24, Math.PI, (c) => c.z < -12.3); tier(0, 12.6, 24, 0, (c) => c.z > 12.3);
  tier(-9.2, 0, 22, -Math.PI / 2, (c) => c.x < -8.9); tier(9.2, 0, 22, Math.PI / 2, (c) => c.x > 8.9);
  crowd.cull = (cam) => { for (const s of crowd.stands) s.g.visible = !s.behind(cam); };
  crowd.excite = 0;
  crowd.update = (t, dt) => { crowd.uTime.value = t; crowd.excite = Math.max(0, crowd.excite - dt * 0.55); crowd.uExcite.value = smooth(crowd.excite); };
  crowd.cheer = (k = 1) => { crowd.excite = Math.max(crowd.excite, k); };

  // the roof: dark, with banks of lights over the court
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), std(0x04070d, 1)); roof.rotation.x = Math.PI / 2; roof.position.y = 16; arena.add(roof);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  lampMat.color.setScalar(3);
  const lampGeo = new THREE.BoxGeometry(1.6, 0.12, 0.7);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 12);
  let li = 0;
  for (const x of [-4.5, 4.5]) for (const z of [-9, -4.5, 0, 4.5, 9, 13.5]) { m4.makeTranslation(x, 14.5, z - 2.25); lamps.setMatrixAt(li++, m4); }
  arena.add(lamps);
  // a big screen over the far stand, showing the score
  const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 448;
  crowd.screen = { canvas: scr, tex: new THREE.CanvasTexture(scr) };
  crowd.screen.tex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: crowd.screen.tex, toneMapped: false }); screenMat.color.setScalar(LITE ? 0.9 : 1.2);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.2), screenMat); screen.position.set(0, 9.4, -21.5);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(10, 4.6, 0.3), std(0x0a0f1c, 0.6)); frame.position.set(0, 9.4, -21.72);
  arena.add(screen, frame);
}

/* ------------------------------------------------------------------ the umpire's chair */
const chair = new THREE.Group();
{
  const metal = std(0x2b3346, 0.4, { metalness: 0.5 }), wood = std(0x1c2438, 0.6), cush = std(0x0f1426, 0.8);
  const leg = (x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.32, 0.05), metal); m.position.set(x, 0.66, z); m.castShadow = true; chair.add(m); };
  leg(-0.28, -0.3); leg(-0.28, 0.3); leg(0.28, -0.3); leg(0.28, 0.3);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.74), wood); deck.position.y = 1.32; deck.castShadow = true; chair.add(deck);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), cush); seat.position.set(-0.08, 1.73, 0); seat.castShadow = true; chair.add(seat);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.08), metal); post.position.set(-0.08, 1.52, 0); chair.add(post);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.46), cush); back.position.set(-0.31, 2.02, 0); back.castShadow = true; chair.add(back);
  const rest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.5), wood); rest.position.set(0.26, 1.36, 0); chair.add(rest);
  const front = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#0c1430'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4ff3a'; g.font = '900 italic 46px "Barlow Condensed", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UMPIRE', w / 2, h / 2 + 3); });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), std(0xffffff, 0.6, { map: front })); panel.position.set(0.36, 1.12, 0); panel.rotation.y = Math.PI / 2; chair.add(panel);
  for (const y of [0.35, 0.7, 1.02]) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.62), metal); rung.position.set(0.3, y, 0); chair.add(rung); }
  chair.position.set(-COURT.halfW - 1.35, 0, 0);
  arena.add(chair);
}

/* ------------------------------------------------------------------ lights */
const lights = {};
{
  lights.hemi = new THREE.HemisphereLight(0xbcd0ff, 0x1a2234, 0.42); scene.add(lights.hemi);
  const key = lights.key = new THREE.SpotLight(0xffffff, 1500, 0, 0.5, 0.6, 2);
  key.position.set(3, 22, 4); key.target.position.set(0, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048);
  key.shadow.camera.near = 12; key.shadow.camera.far = 34; key.shadow.bias = -0.00015; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
  scene.add(key, key.target);
  for (const [x, z, i, c] of [[-10, -7, 750, 0xdfe8ff], [10, 8, 700, 0xfff1df], [0, 14, 520, 0xffffff]]) {
    const s = new THREE.SpotLight(c, i, 0, 0.6, 0.8, 2); s.position.set(x, 16, z); s.target.position.set(0, 0.5, 0); scene.add(s, s.target);
  }
}

/* ------------------------------------------------------------------ the shuttle */
/* Cork and a skirt of sixteen feathers; local +y points out of the cork, the way it flies. It is drawn bigger the
   further the camera is (it would be a pixel or two in the broadcast view), with a trail and a shadow under it. */
const shuttle = new THREE.Group();
const fx = {};
{
  const cork = new THREE.Mesh(new THREE.SphereGeometry(0.0128, 18, 10, 0, TAU, 0, Math.PI / 2), std(0xfbfbf6, 0.55, { emissive: 0x2a2a28 }));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0128, 0.012, 18), std(0xf2f2ea, 0.6, { emissive: 0x1e1e1c }));
  band.position.y = -0.006;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0131, 0.0131, 0.003, 18, 1, true), std(0x1a6b3f, 0.6));
  ring.position.y = -0.009;
  const feathers = canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(250,250,246,0.96)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { const x = (i + 0.5) * w / 16; g.fillStyle = 'rgba(205,205,198,0.9)'; g.fillRect(x - 1.5, 0, 3, h); }
    for (let i = 0; i < 16; i++) { const x0 = i * w / 16; g.clearRect(x0 + w / 32 - 1, 0, 2, h * 0.22); } // the gaps at the open end
    g.fillStyle = 'rgba(30,40,36,0.95)'; g.fillRect(0, h * 0.62, w, 5); g.fillRect(0, h * 0.78, w, 5); // the two threads
  });
  const skirtGeo = new THREE.CylinderGeometry(0.011, 0.033, 0.066, 24, 1, true);
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshStandardMaterial({ map: feathers, side: THREE.DoubleSide, roughness: 0.75, transparent: true, alphaTest: 0.05, emissive: 0x303030 }));
  skirt.position.y = -0.012 - 0.033;
  const inner = new THREE.Group(); inner.add(cork, band, ring, skirt);
  for (const m of [cork, band, skirt]) m.castShadow = true;
  shuttle.add(inner); shuttle.userData.inner = inner;
  scene.add(shuttle);

  // the trail: a ribbon through the last positions, brighter for a fast shot
  const N = 26, tg = new THREE.BufferGeometry();
  const tpos = new Float32Array(N * 2 * 3), ta = new Float32Array(N * 2), idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tg.setIndex(idx); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('alpha', new THREE.BufferAttribute(ta, 1));
  const tmat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 0 } },
    vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA * uOpacity); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const trail = new THREE.Mesh(tg, tmat); trail.frustumCulled = false; scene.add(trail);
  fx.trail = { N, pts: [], geo: tg, pos: tpos, a: ta, mat: tmat, mesh: trail };

  // soft shadow under the shuttle, and the landing marker
  const blob = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, { aniso: 1 });
  fx.blobTex = blob;
  fx.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -4 }));
  fx.shadow.rotation.x = -Math.PI / 2; scene.add(fx.shadow);
  const ringTex = canvasTex(128, 128, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(212,255,58,1)'; g.lineWidth = 9; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 8, 0, TAU); g.stroke(); g.fillStyle = 'rgba(212,255,58,0.35)'; g.beginPath(); g.arc(w / 2, w / 2, 9, 0, TAU); g.fill(); }, { aniso: 1 });
  fx.marker = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -5 }));
  fx.marker.rotation.x = -Math.PI / 2; fx.marker.position.y = 0.006; scene.add(fx.marker);
  // the review footprint (a close line call)
  const printTex = canvasTex(128, 128, (g, w) => { g.clearRect(0, 0, w, w); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, w / 2, w / 2 - 4, w / 2 - 4, 0, 0, TAU); g.fill(); }, { aniso: 1 });
  fx.print = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ map: printTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -6 }));
  fx.print.rotation.x = -Math.PI / 2; fx.print.position.y = 0.007; scene.add(fx.print);
}
const sh = { pos: new V3(0, 1, 3), dir: new V3(0, 1, 0), q: new Q(), spin: 0, scale: 1, tip: 0, held: null, visible: true, mode: 'held' };
{
  // your ring: under your feet, it lights up lime while a press would be perfectly timed
  const t = canvasTex(128, 128, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 6, 0, TAU); g.stroke(); }, { aniso: 1 });
  fx.you = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, color: 0x39a3ff, polygonOffset: true, polygonOffsetFactor: -5 }));
  fx.you.rotation.x = -Math.PI / 2; fx.you.position.y = 0.006; scene.add(fx.you);
}

/* ------------------------------------------------------------------ rackets */
/* Local frame: origin at the middle of the grip, +y up the shaft to the head, the string bed in the xy plane (its
   normal +z). The string bed's centre is RACKET_L from the grip. */
const RACKET_L = 0.5;
function makeRacket(frame, grip) {
  const g = new THREE.Group();
  const frameMat = std(frame, 0.3, { metalness: 0.35 }), gripMat = std(grip, 0.85), dark = std(0x111318, 0.4, { metalness: 0.3 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0125, 0.2, 10), gripMat); handle.position.y = 0.01;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 10), dark); cap.position.y = -0.1;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0046, 0.28, 8), frameMat); shaft.position.y = 0.25;
  const throat = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 8), frameMat); throat.position.y = 0.385; throat.rotation.x = Math.PI;
  const hc = RACKET_L, rx = 0.098, ry = 0.118;
  // a unit torus scaled to the oval head; its tube (4.5% of the radius) comes out about 5 mm thick
  const head = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 48), frameMat); head.scale.set(rx, ry, rx); head.position.y = hc;
  const strings = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(245,245,240,0.85)'; c.lineWidth = 1.2; for (let i = 4; i < w; i += 7) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, { aniso: 4 });
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ map: strings, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 }));
  bed.scale.set(rx * 0.97, ry * 0.97, 1); bed.position.y = hc;
  g.add(handle, cap, shaft, throat, head, bed);
  for (const m of [handle, shaft, head]) m.castShadow = true;
  return g;
}

/* ------------------------------------------------------------------ the players' bodies */
/* The realistic Mixamo characters from the cricket game, the sporty ones: each wears what it was downloaded in. */
export const CHARS = {
  footballer: { name: 'Leo Hart', short: 'Hart', h: 1.83, racket: [0x1f6bff, 0xf2f4fb], look: 'all white' },
  ch42: { name: 'Rio Santos', short: 'Santos', h: 1.79, racket: [0xff3b30, 0x15161a], look: 'red tee' },
  remy: { name: 'Remy Laurent', short: 'Laurent', h: 1.84, racket: [0xffcf1a, 0x15161a], look: 'grey tee' },
  adam: { name: 'Adam Novak', short: 'Novak', h: 1.81, racket: [0x00c389, 0xf2f4fb], look: 'tracksuit' },
  ch01: { name: 'Kai Brandt', short: 'Brandt', h: 1.8, racket: [0xff7a1a, 0x15161a], look: 'white polo' },
};
const STRIP = /^mixamorig\d*:?/;
const bonesOf = (root) => { const m = {}; root.traverse((o) => { if (o.isBone) { const n = o.name.replace(STRIP, ''); if (!m[n]) m[n] = o; } }); return m; };
const ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const swapSide = (n) => (n.startsWith('Left') ? `Right${n.slice(4)}` : n.startsWith('Right') ? `Left${n.slice(5)}` : n);
const _q1 = new Q(), _q2 = new Q(), _q3 = new Q(), _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _m1 = new THREE.Matrix4();
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
   turned (+ to the left), tw: the chest turned further. The contact key (t = 0) comes from the shuttle itself. */
const STROKES = {
  over: { bias: [0.05, 0.42, 0.05], pole: [0.9, 0.3, -0.2], keys: [
    { t: -0.5, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
    { t: -0.3, g: [0.3, 1.62, -0.04], d: [0.08, 0.9, -0.42], pole: [0.9, 0.1, -0.4], lh: [-0.3, 1.95, 0.45], yaw: -0.75, tw: -0.25 },
    { t: -0.07, g: [0.26, 1.72, -0.14], d: [0.12, -0.8, -0.55], pole: [0.7, 0.8, -0.2], lh: [-0.25, 1.75, 0.42], yaw: -0.6, tw: -0.3 },
    { t: 0.12, g: [-0.02, 1.32, 0.5], d: [-0.4, -0.55, 0.72], pole: [0.8, -0.2, 0.2], lh: [-0.2, 1.05, 0.15], yaw: 0.15, tw: 0.25 },
    { t: 0.34, g: [-0.28, 0.98, 0.26], d: [-0.5, -0.8, 0.3], pole: [0.7, -0.5, 0.3], lh: [-0.3, 1.0, 0.0], yaw: 0.2, tw: 0.3 },
    { t: 0.72, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
  ] },
  fore: { bias: [0.25, 0.1, 0.15], pole: [0.6, -0.8, -0.1], keys: [
    { t: -0.45, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
    { t: -0.28, g: [0.48, 1.22, -0.12], d: [0.35, 0.65, -0.68], pole: [0.6, -0.8, -0.3], lh: [-0.3, 1.2, 0.35], yaw: -0.45, tw: -0.2 },
    { t: -0.07, g: [0.56, 1.06, -0.02], d: [0.6, 0.1, -0.8], pole: [0.5, -0.85, -0.2], lh: [-0.32, 1.15, 0.3], yaw: -0.3, tw: -0.2 },
    { t: 0.14, g: [0.1, 1.36, 0.52], d: [-0.5, 0.6, 0.62], pole: [0.6, -0.7, 0.2], lh: [-0.3, 1.1, 0.2], yaw: 0.15, tw: 0.2 },
    { t: 0.34, g: [-0.14, 1.44, 0.3], d: [-0.6, 0.75, 0.25], pole: [0.6, -0.6, 0.2], lh: [-0.3, 1.05, 0.1], yaw: 0.1, tw: 0.15 },
    { t: 0.7, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
  ] },
  back: { bias: [-0.25, 0.12, 0.15], pole: [-0.2, 0.3, 1], keys: [
    { t: -0.45, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
    { t: -0.28, g: [-0.18, 1.32, 0.1], d: [-0.75, 0.35, -0.55], pole: [-0.1, 0.4, 1], lh: [-0.2, 1.2, 0.15], yaw: 0.55, tw: 0.25 },
    { t: -0.07, g: [-0.3, 1.24, 0.16], d: [-0.6, -0.15, -0.78], pole: [-0.2, 0.3, 1], lh: [-0.25, 1.1, 0.0], yaw: 0.45, tw: 0.2 },
    { t: 0.14, g: [-0.52, 1.36, 0.5], d: [-0.25, 0.6, 0.76], pole: [-0.3, -0.2, 1], lh: [-0.2, 1.05, -0.1], yaw: -0.1, tw: -0.15 },
    { t: 0.34, g: [-0.42, 1.52, 0.38], d: [0.05, 0.88, 0.47], pole: [-0.2, -0.4, 1], lh: [-0.25, 1.05, 0.0], yaw: -0.1, tw: -0.1 },
    { t: 0.7, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
  ] },
  // touch at the net: a short push, racket up in front
  netF: { bias: [0.1, 0.3, 0.2], pole: [0.7, -0.7, 0], keys: [
    { t: -0.4, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
    { t: -0.15, g: [0.36, 1.0, 0.5], d: [0.2, 0.45, 0.87], pole: [0.7, -0.7, 0], lh: [-0.35, 1.1, -0.2], yaw: -0.1, tw: 0 },
    { t: 0.16, g: [0.3, 1.1, 0.62], d: [0.1, 0.65, 0.75], pole: [0.7, -0.7, 0], lh: [-0.4, 1.05, -0.3], yaw: 0, tw: 0 },
    { t: 0.6, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
  ] },
  netB: { bias: [-0.1, 0.3, 0.2], pole: [-0.2, 0.2, 1], keys: [
    { t: -0.4, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
    { t: -0.15, g: [-0.2, 1.05, 0.45], d: [-0.4, 0.45, 0.8], pole: [-0.2, 0.2, 1], lh: [-0.25, 1.1, -0.2], yaw: 0.3, tw: 0.1 },
    { t: 0.16, g: [-0.25, 1.12, 0.6], d: [-0.2, 0.65, 0.73], pole: [-0.2, 0.0, 1], lh: [-0.3, 1.05, -0.3], yaw: 0.2, tw: 0 },
    { t: 0.6, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
  ] },
  serveFore: { bias: [0.15, -0.25, 0.25], pole: [0.5, -0.8, -0.3], keys: [
    { t: -0.9, g: [0.42, 1.12, -0.3], d: [0.3, 0.5, -0.8], pole: [0.6, -0.7, -0.2], lh: [-0.08, 1.18, 0.42], yaw: -0.35, tw: -0.1 },
    { t: -0.22, g: [0.46, 0.9, -0.32], d: [0.25, -0.5, -0.82], pole: [0.6, -0.7, -0.2], lh: [-0.1, 1.12, 0.42], yaw: -0.35, tw: -0.15 },
    { t: 0.2, g: [-0.05, 1.5, 0.45], d: [-0.3, 0.9, 0.3], pole: [0.6, -0.6, 0.2], lh: [-0.3, 1.1, 0.1], yaw: 0.1, tw: 0.15 },
    { t: 0.42, g: [-0.25, 1.6, 0.25], d: [-0.4, 0.9, -0.1], pole: [0.6, -0.5, 0.2], lh: [-0.3, 1.05, 0.05], yaw: 0.1, tw: 0.1 },
    { t: 0.8, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
  ] },
  serveBack: { bias: [-0.25, -0.05, 0.3], pole: [-0.1, 0.1, 1], keys: [
    { t: -0.9, g: [0.0, 1.02, 0.3], d: [-0.72, -0.45, 0.52], pole: [-0.1, 0.0, 1], lh: [-0.22, 1.06, 0.48], yaw: 0.2, tw: 0.05 },
    { t: -0.14, g: [0.03, 1.0, 0.22], d: [-0.72, -0.45, 0.52], pole: [-0.1, 0.0, 1], lh: [-0.3, 1.06, 0.4], yaw: 0.2, tw: 0.05 },
    { t: 0.15, g: [-0.06, 1.07, 0.45], d: [-0.6, -0.3, 0.74], pole: [-0.1, 0.1, 1], lh: [-0.35, 1.05, 0.2], yaw: 0.15, tw: 0 },
    { t: 0.4, g: [-0.04, 1.08, 0.42], d: [-0.55, -0.25, 0.8], pole: [-0.1, 0.1, 1], lh: [-0.35, 1.05, 0.2], yaw: 0.1, tw: 0 },
    { t: 0.8, g: [0.3, 1.18, 0.32], d: [0.15, 0.8, 0.58], pole: [0.8, -0.6, -0.2], lh: [-0.28, 1.12, 0.3], yaw: 0, tw: 0 },
  ] },
};
STROKES.jump = STROKES.over;
const READY = STROKES.over.keys[0];
const RELAXED = { g: [0.3, 0.92, 0.18], d: [0.1, -0.15, 0.98], pole: [0.6, -0.8, -0.3], lh: [-0.25, 0.92, 0.05] };
const HIPS = { g: [0.25, 0.98, -0.03], d: [0.1, -0.85, -0.5], pole: [1, 0.1, -0.6], lh: [-0.25, 0.98, -0.03] }; // hands on hips, racket hanging
const ARMS_UP = { g: [0.32, 1.98, 0.12], d: [0.15, 0.95, 0.15], pole: [1, -0.4, 0], lh: [-0.3, 1.98, 0.12] }; // a match won
const FIST_UP = [-0.2, 1.45, 0.24], FIST_DOWN = [-0.17, 1.08, 0.2]; // the free hand's fist pump

/* One player on the court: the model, its racket, and the pose it is in. The pose is built fresh every frame from
   the clips (legs and body), then the strokes (arms, turn, lunge, jump) and the head following the shuttle. */
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
    this.leftHold = false; // the left hand holds a shuttle (serving)
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
    this.yaw = st.yaw; this.root.rotation.y = st.yaw;
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
    // the chest: twist about the vertical and lean forward
    if (st.twist || st.lean) {
      const right = this.dirWorld(1, 0, 0, _v4);
      for (const n of ['Spine', 'Spine1', 'Spine2']) {
        _q2.setFromAxisAngle(Y_UP, (st.twist || 0) / 3).multiply(_q3.setFromAxisAngle(right, (st.lean || 0) / 3));
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
    // head toward the shuttle
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
    // palm in, fingers forward (up when holding the shuttle out to serve)
    B.LeftForeArm.getWorldQuaternion(_q1);
    setWorldQuat(B.LeftHand, _q1.multiply(_q2.setFromAxisAngle(K.hand.Left.fore, a.lhTurn || 0)));
    B.LeftHand.updateMatrixWorld(true);
  }
  lookAt(target, w) {
    if (w <= 0) return;
    const B = this.B;
    // never more than about 23° down or 34° up: a low shuttle is watched with the eyes, not by dropping the head
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
/* Reads a sim player (position, speed, the plan for the shuttle on its way, the stroke just played) and poses its
   Body: footwork from the clips, the stroke around its contact, a lunge to a low shuttle near the net, a jump for
   the jump smash, the head on the shuttle. */
const STYLE_AXIS = { over: [1, 0, 0, 1], jump: [1, 0, 0, 1], fore: [0, 1, 0, -1], back: [0, 1, 0, -1], netF: [1, 0, 0, 1], netB: [0, 1, 0, -1], serveFore: [1, 0, 0, 1], serveBack: [0, 1, 0, -1] };
const SOFT = new Set(['net', 'block']);
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
    if (sw && T - sw.t < 0.72 && T - sw.t > -1.0) {
      const P = sw.P, z = pl.zone ? pl.zone(P) : null;
      let style = sw.style;
      if ((style === 'fore' || style === 'back') && (SOFT.has(sw.kind) || (P.y < 1.1 && Math.abs(P.z) < 2.6))) style = style === 'fore' ? 'netF' : 'netB';
      return { style, tc: sw.t, P, hit: true, dir: sw.dir, kind: sw.kind, lowLunge: P.y < 0.9 || (P.y < 1.0 && z && z.df > 0.55) };
    }
    const plan = pl.plan;
    if (plan && m.phase === 'rally' && m.sh.by !== pl.side && !pl.leave && plan.t - T < 0.6 && plan.t - T > -0.12) {
      const P = plan.P, z = pl.zone(P, plan.B.x, plan.B.z), jump = plan.jump && (pl.ai || (pl.press && pl.press.jump));
      let style = jump ? 'jump' : P.y >= 1.85 ? 'over' : z.dr >= -0.05 ? 'fore' : 'back';
      if (style === 'fore' || style === 'back') if (P.y < 1.1 && Math.abs(P.z) < 2.6) style = style === 'fore' ? 'netF' : 'netB';
      return { style, tc: plan.t, P, hit: false, committed: !!pl.press, from: pl.press ? pl.press.t : -9, dir: null, kind: null, lowLunge: P.y < 0.9 || (P.y < 1.0 && z.df > 0.55) };
    }
    return null;
  }

  update(dt, pl, m, look, live) {
    const b = this.body; if (!b) return;
    const st = this.st, arm = this.arm, T = m.T;
    const vx = pl.vx, vz = pl.vz, v = Math.hypot(vx, vz);
    const L = b.loco;
    // ---- footwork, all of it from facing the net: a run forward faces the way it goes, sideways is a chassé square
    // to the net, and going back turns side-on and chassés, left shoulder to the net (or the right one, on the way to
    // the backhand corner). Never the back to the net.
    let wantRel = 0, mode = 'idle', mirror = L.mirror;
    const rel = v > 0.5 ? angDiff(this.netYaw, Math.atan2(vx, vz)) : 0, ar = Math.abs(rel); // the way it moves, from facing the net (+ to its left)
    if (v > 0.5 && ar < 1.05) {
      // forward: a run facing the way it goes, or small steps still facing the net
      mode = v > 1.0 ? 'run' : 'idle'; wantRel = rel * lerp(0.3, 1, smooth((v - 0.6) / 0.6)); this.chasse = null;
    } else if (v > 0.5 && (ar < 2.1 || v > 1.0 || (this.chasse && v > 0.6))) {
      // a chassé: a step to its right faces 90° left of the way it moves, a step to its left 90° right. Whichever is
      // squarer to the net, keeping the one in use (the forehand side to start with) unless the other is clearly squarer
      mode = 'shuf';
      const r = angDiff(0, rel + Math.PI / 2), l = angDiff(0, rel - Math.PI / 2), keepL = this.chasse === 'L';
      const useR = Math.abs(r) - (keepL ? 0 : 0.45) <= Math.abs(l) - (keepL ? 0.45 : 0);
      this.chasse = useR ? 'R' : 'L'; wantRel = useR ? r : l; mirror = useR ? -1 : 1;
    } else {
      // standing, or a small step back: square to the other player
      if (v < 0.6) this.chasse = null;
      const o = m.pl[1 - pl.side];
      wantRel = clamp(angDiff(this.netYaw, Math.atan2(o.x - pl.x, o.z - pl.z)), -0.45, 0.45) * 0.7;
    }
    const runRate = v / Math.max(0.5, 7.06 * b.K.legLen), shufRate = v / Math.max(0.5, 2.74 * b.K.legLen);
    L.tRun += dt * clamp(runRate, 0.35, 1.3);
    L.tShuf += dt * clamp(shufRate, 0.5, 1.9);
    L.tIdle += dt;
    L.mirror = mirror;
    const k = 1 - Math.exp(-dt * 9);
    L.run = lerp(L.run, mode === 'run' ? 1 : 0, k); L.shuf = lerp(L.shuf, mode === 'shuf' ? 1 : 0, k); L.idle = lerp(L.idle, mode === 'idle' ? 1 : 0, k);
    // ---- the stroke
    const s = live ? this.stroke(pl, m) : null;
    let yawOff = 0, twist = 0, lean = 0.06, crouch = live ? 0.07 : 0.0, lift = 0, tall = 0;
    const rally = m.phase === 'rally' || (m.phase === 'serve' && live);
    let keyed = false;
    st.feet = null; st.feetW = 0; st.air = 0;
    if (this.jmp && T < this.jmp.t0 - 0.01) this.jmp = null; // a new match: the clock went back
    if (s && STROKES[s.style]) {
      const S = STROKES[s.style];
      let tau = T - s.tc;
      // not played (yet): hold the racket back until the press, and drop the stroke once the shuttle has gone by
      if (!s.hit) { if (!s.committed) tau = Math.min(tau, -0.07); }
      keyed = this.keys(S, s, tau);
      yawOff = this.kYaw; twist = this.kTw;
      // reach: rise for a high one, lunge for a low one in front
      const env = tau < 0 ? smooth((tau + 0.32) / 0.3) : 1 - smooth((tau - 0.08) / 0.4);
      if (s.style === 'over') {
        // up on the toes as far as the contact needs: arm and racket reach about 1.07 m above the shoulder
        const P = s.P, need = P.y - (1.5 * b.hs + 1.04);
        lift = clamp(need, 0, 0.4) * env;
        crouch = lerp(crouch, 0, env); tall = env;
      } else if (s.style === 'jump' && !this.jmp && !s.hit) {
        // the jump smash: knees bend, then take off so the top of the jump meets the shuttle (sooner if asked late)
        const hj = clamp(s.P.y - (1.5 * b.hs + 1.04) + 0.03, 0.2, 0.55), v0 = Math.sqrt(2 * 9.81 * hj);
        const t0 = Math.max(s.tc - v0 / 9.81, (s.from || -9) + 0.06);
        if (T >= t0) this.jmp = { t0: T, v0, tc: s.tc, end: T + (2 * v0) / 9.81 };
        else { crouch += 0.15 * smooth((T - (t0 - 0.22)) / 0.22); tall = 0; }
      }
      if (s.lowLunge || s.style === 'netF' || s.style === 'netB') {
        const was = this.lungeAmt;
        this.lungeAmt = Math.max(this.lungeAmt * Math.exp(-dt * 2), env);
        if (was < 0.6 && this.lungeAmt >= 0.6 && dt > 0) Sound.squeak(clamp(pl.x / 4, -0.8, 0.8), farOf(pl.x, 0.1, pl.z)); // the lunging foot plants
        const P = s.P, dx = P.x - pl.x, dz = P.z - pl.z, dl = Math.hypot(dx, dz) || 1;
        const reach = clamp(dl - 0.85, 0, 0.6) * this.lungeAmt; // the shoulder stops an arm and a racket from the shuttle
        st.lungeX = (dx / dl) * reach; st.lungeZ = (dz / dl) * reach;
        crouch += (0.12 + 0.2 * clamp((1.0 - P.y) / 0.8, 0, 1)) * this.lungeAmt;
        lean += 0.25 * this.lungeAmt;
        // the racket foot steps out toward the shuttle, the other stays behind
        const fr = this.feetT.Right.set(pl.x + st.lungeX * 1.55 + (dz / dl) * 0.12 * (this.side ? -1 : 1), 0, pl.z + st.lungeZ * 1.55);
        const bk = this.feetT.Left.set(pl.x - (dx / dl) * 0.32, 0, pl.z - (dz / dl) * 0.32);
        if (this.lungeAmt > 0.02) { st.feet = this.feetT; st.feetW = smooth(this.lungeAmt / 0.35); }
      } else { this.lungeAmt *= Math.exp(-dt * 4); st.lungeX = (st.lungeX || 0) * Math.exp(-dt * 6); st.lungeZ = (st.lungeZ || 0) * Math.exp(-dt * 6); }
    } else { this.lungeAmt *= Math.exp(-dt * 4); st.lungeX = (st.lungeX || 0) * Math.exp(-dt * 6); st.lungeZ = (st.lungeZ || 0) * Math.exp(-dt * 6); }
    // reaching: if the racket shoulder was out of reach of the contact last frame, the body steps toward it
    if (!this.reach) this.reach = { x: 0, z: 0 };
    if (s && b.shB && T - s.tc > -0.35 && T - s.tc < 0.1) {
      const shW = b.toWorld(b.shB.x, b.shB.y, b.shB.z, _sv.e), P = s.P;
      const dx = P.x - shW.x, dy = P.y - shW.y, dz = P.z - shW.z, dist = Math.hypot(dx, dy, dz), hz = Math.hypot(dx, dz) || 1;
      const over = dist - (0.56 + RACKET_L) * b.hs * 0.95;
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
    // the serve: the shuttle in the left hand until it is let go
    if (pl.swing && (pl.swing.style === 'serveFore' || pl.swing.style === 'serveBack') && T < pl.swing.t + 0.05) arm.lhTurn = 1.2; else arm.lhTurn = 0;
    // a reaction clip moves the whole body; arms follow it
    if (b.react) {
      arm.lw = 0; crouch = 0; twist = 0; yawOff = 0;
      if (!st.air) lift = 0;
      if (b.react.t > b.react.until) b.react = null;
    }
    // ---- body yaw, from facing the net: never more than 2.1 rad round either way, so never round through the back
    const want = clamp(wantRel + yawOff, -2.1, 2.1);
    this.rel += (want - this.rel) * (1 - Math.exp(-dt * (keyed ? 14 : 9)));
    this.yaw = this.netYaw + this.rel;
    if (b.react) tall = 0;
    st.x = pl.x + (st.lungeX || 0) + this.reach.x; st.z = pl.z + (st.lungeZ || 0) + this.reach.z; st.yaw = this.yaw;
    st.crouch = Math.max(0, crouch + (mode === 'shuf' ? 0.03 * (1 - tall) : 0)); st.twist = twist; st.lean = lean; st.lift = lift; st.tall = tall;
    // the head: on the shuttle in play; once the point is over, a moment on where it landed, then up at the other player
    const o = m.pl[1 - pl.side], between = (m.phase === 'dead' && m.phaseT > 0.7) || m.phase === 'intro' || m.phase === 'over';
    const lt = this.lookT || (this.lookT = new V3()), dj = this.deject && T >= this.deject.t0 && T < this.deject.t0 + 1.2;
    if (dj) { const t = T - this.deject.t0; b.toWorld(0.8 * Math.sin(t * 9) * (1 - smooth((t - 0.5) / 0.6)), 0, 2.4, lt); } // down, shaking the head
    else if (this.cheer && T >= this.cheer.t0) b.toWorld(0, 2.6, 4.5, lt); // up, to the crowd
    else if (between) lt.set(o.x, 1.55, o.z);
    else lt.copy(look);
    if (!this.lookP) this.lookP = new V3().copy(lt);
    this.lookP.lerp(lt, 1 - Math.exp(-dt * (between && !dj ? 4 : 16)));
    st.look.copy(this.lookP); st.lookW = b.react ? 0.3 : 1;
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
  /* key interpolation; the contact key from the shuttle */
  keys(S, s, tau) {
    const b = this.body, keys = S.keys;
    if (tau < keys[0].t || tau > keys[keys.length - 1].t) return false;
    // the contact key: the racket's head on the shuttle, the racket roughly in line with the arm
    const Pb = b.toBody(_sv.a.set(s.P.x, s.P.y, s.P.z), _sv.b);
    const sh = b.shB ? [b.shB.x, b.shB.y, b.shB.z] : [0.19, 1.43, 0.0], bs = S.bias;
    const RL = RACKET_L / b.hs;
    const d = _sv.c.set(Pb.x - sh[0], Pb.y - sh[1], Pb.z - sh[2]);
    const room = clamp((0.56 + RL - d.length()) / 0.35, 0, 1);
    d.normalize().add(_v3.set(bs[0], bs[1], bs[2]).multiplyScalar(room)).normalize();
    const contact = { t: 0, g: [Pb.x - d.x * RL, Pb.y - d.y * RL, Pb.z - d.z * RL], d: [d.x, d.y, d.z], pole: S.pole, lh: null, yaw: 0.0, tw: 0.08 };
    let k0 = null, k1 = null;
    const all = this.allKeys || (this.allKeys = []);
    all.length = 0;
    for (const k of keys) { if (k.t < 0) all.push(k); }
    // the overhead whips through a racket-back position on its way up
    if (S === STROKES.over) all.push({ t: -0.035, g: [0.27, 1.8, -0.02], d: [0.1, 0.05, -1], pole: [0.8, 0.5, -0.1], lh: [-0.22, 1.5, 0.35], yaw: -0.3, tw: -0.15 });
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
    const lh0 = k0.lh || k1.lh, lh1 = k1.lh || k0.lh;
    this.kg = [g.x, g.y, g.z]; this.kd = [dd.x, dd.y, dd.z];
    this.kp = [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u), lerp(p0[2], p1[2], u)];
    this.klh = [lerp(lh0[0], lh1[0], u), lerp(lh0[1], lh1[1], u), lerp(lh0[2], lh1[2], u)];
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
    const ax = STYLE_AXIS[this.kStyle || 'over'] || STYLE_AXIS.over;
    const axis = b.dirWorld(ax[0], ax[1], ax[2], _v4);
    const f = _v1.crossVectors(ax[3] > 0 ? a.d : axis, ax[3] > 0 ? axis : a.d);
    if (f.lengthSq() > 1e-4) a.face.copy(f.normalize());
    this.kStyle = null;
  }
}

/* ------------------------------------------------------------------ the umpire */
/* Josh in his blazer, seated high at the net, head following the shuttle */
function poseUmpire(b, look) {
  const K = b.K, B = b.B, T = b.T;
  b.root.position.set(chair.position.x - 0.1, 0, 0); b.yaw = Math.PI / 2; b.root.rotation.y = b.yaw;
  for (const n of ORDER) T[n].copy(K.bind[n]);
  const thigh = _q1.setFromAxisAngle(_v1.set(1, 0, 0), -Math.PI / 2 + 0.08);
  for (const s of ['Left', 'Right']) T[`${s}UpLeg`].premultiply(thigh);
  for (const [s, sg] of [['Left', 1], ['Right', -1]]) {
    const down = _q2.setFromAxisAngle(_v1.set(0, 0, 1), -sg * (Math.PI / 2 - 0.12));
    for (const n of ['Arm', 'ForeArm', 'Hand']) T[`${s}${n}`].premultiply(down);
  }
  b.applyT(0, 1.86, -0.02);
  b.root.updateMatrixWorld(true);
  for (const s of ['Left', 'Right']) {
    const knee = B[`${s}Leg`].getWorldPosition(_v2);
    const foot = _v3.copy(knee); foot.y = 1.42; foot.x += 0.04;
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
const Cam = { mode: store.get('view', 'broadcast'), pos: new V3(0, 9, 18), look: new V3(0, 0.4, -0.5), fov: 30, shake: 0, cut: true, script: null };
const _cf = new V3(), _cr = new V3(), _cu = new V3(), _cp = new V3();
function fitDistance(dir, look, fovDeg, aspect, pts, margin = 0.06) {
  const t = Math.tan((fovDeg * Math.PI) / 360) * (1 - margin), f = _cf.copy(dir).negate();
  _cr.crossVectors(f, Y_UP).normalize(); _cu.crossVectors(_cr, f);
  let lo = 3, hi = 120;
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
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { COURT_PTS.push(new V3(sx * (COURT.halfW + 0.15), 0, sz * (COURT.halfL + 0.35))); COURT_PTS.push(new V3(sx * COURT.halfWS, 2.3, sz * (COURT.halfL + 0.2))); }
function camTarget(dt, aspect, focus) {
  const portrait = aspect < 0.9;
  if (Cam.mode === 'side') {
    const fov = portrait ? 46 : 30;
    const dir = _v1.set(Math.cos(0.33), Math.sin(0.33), 0).normalize();
    const look = _v2.set(0, 0.95, 0);
    let pts = COURT_PTS;
    if (portrait) { look.z = clamp(focus.z * 0.55, -3.2, 3.2); pts = COURT_PTS.filter((p) => Math.abs(p.z) < 7.5).map((p) => p.clone().setZ(look.z + Math.sign(p.z) * 3.6)); }
    const d = Math.min(portrait ? 30 : 60, fitDistance(dir, look, fov, aspect, pts, 0.05));
    return { pos: look.clone().addScaledVector(dir, d), look: look.clone(), fov };
  }
  const fov = portrait ? clamp(30 + (1 / aspect - 1) * 11, 30, 44) : 28;
  const dir = _v1.set(0, Math.sin(0.46), Math.cos(0.46)).normalize();
  const look = _v2.set(clamp(focus.x * 0.12, -0.4, 0.4), 0.35, -0.55);
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
  // on a portrait screen the broadcast picture rides up a tenth, so the court clears the thumb buttons
  const lift = !Cam.script && Cam.mode === 'broadcast' && aspect < 0.9 ? 0.1 : 0;
  if (lift !== Cam.lift) { Cam.lift = lift; if (lift) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * lift, innerWidth, innerHeight); else camera.clearViewOffset(); }
  if (Math.abs(camera.fov - Cam.fov) > 0.01) { camera.fov = Cam.fov; camera.updateProjectionMatrix(); }
  crowd.cull(camera.position);
}
/* the menu: a slow drift round the court between television angles */
function attractCam() {
  let t = 0, shot = 0;
  const shots = [
    (u) => ({ pos: new V3(lerp(-6, 6, u), 7.5, 15), look: new V3(0, 0.5, -1), fov: 34 }),
    (u) => ({ pos: new V3(13, lerp(3.2, 4.2, u), lerp(-5, 5, u)), look: new V3(0, 1.0, 0), fov: 36 }),
    (u) => ({ pos: new V3(lerp(4, -4, u), 1.25, 9.6), look: new V3(0, 1.35, 0), fov: 40 }),
    (u) => ({ pos: new V3(Math.sin(u * 0.8) * 11, 13, Math.cos(u * 0.8) * 11), look: new V3(0, 0, 0), fov: 40 }),
  ];
  return (dt) => {
    t += dt; const u = t / 9;
    if (u >= 1) { t = 0; shot = (shot + 1) % shots.length; Cam.cut = true; }
    const g = shots[shot](Math.min(1, t / 9)); g.k = 20; return g;
  };
}

/* ------------------------------------------------------------------ replays */
/* Every frame is recorded (the bones, rackets and shuttle as drawn), so a point can be shown again, slowly, from
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
  f[o++] = shuttle.position.x; f[o++] = shuttle.position.y; f[o++] = shuttle.position.z;
  f[o++] = shuttle.quaternion.x; f[o++] = shuttle.quaternion.y; f[o++] = shuttle.quaternion.z; f[o++] = shuttle.quaternion.w;
  f[o++] = shuttle.scale.x; f[o++] = shuttle.visible ? 1 : 0;
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
  pv(shuttle.position); qv(shuttle.quaternion);
  shuttle.scale.setScalar(lerp(fa[o], fb[o], u)); o++;
  shuttle.visible = fa[o] > 0.5;
}

/* ------------------------------------------------------------------ sound */
/* All synthesised: the crack of the strings on the cork, shoes on the mat, the net, the hall and its crowd. The
   umpire's calls use the device's speech voices. */
const Sound = (() => {
  let ctx = null, out = null, master = null, verbSend = null, crowdGain = null, noise = null, hall = null;
  const A = { on: store.get('sound', true), voice: store.get('voice', true) };
  /* The recordings (all CC0, from freesound.org: see sfx/CREDITS.txt): racket hits, shoe squeaks and swishes in one
     sprite, crowd oohs, applause and cheers in another, and a seamless loop of a full hall. Fetched at once, decoded
     when the first tap opens the audio. Until then the old synthesized sounds stand in. */
  const S = { meta: null, fx: null, crowd: null, hall: null }, raw = {};
  const fetched = fetch('sfx/sfx.json').then((r) => r.json()).then((m) => { S.meta = m; return Promise.all(['fx', 'crowd', 'hall'].map((k) => fetch(`sfx/${k}.mp3`).then((r) => r.arrayBuffer()).then((b) => { raw[k] = b; }))); }).catch(() => {});
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
    const verb = ctx.createConvolver(); verb.buffer = ir; verbSend = ctx.createGain(); verbSend.gain.value = 0.55; verbSend.connect(verb).connect(master);
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
  const SOFT = new Set(['net', 'block', 'serveShort']), BIG = new Set(['smash', 'jump', 'kill']);
  return {
    A, init,
    set(on) { A.on = on; store.set('sound', on); if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, now(), 0.05); },
    setVoice(on) { A.voice = on; store.set('voice', on); if (!on && window.speechSynthesis) speechSynthesis.cancel(); },
    /* racket on shuttle, from real hits: a delicate tick for a net shot, a firm pock for a clear, and for a smash the
       crack doubled with a heavier body under it */
    hit(kind, speed, pan, far) {
      if (!ok()) return;
      const sl = fx('hit');
      if (!sl) return this.synthHit(kind, speed, pan);
      const d = away(far), v = clamp(speed / 65, 0.2, 1.15), r = 0.94 + Math.random() * 0.12;
      if (SOFT.has(kind)) { play(S.fx, sl, { gain: 0.42 * d.k, rate: r * 1.08, lp: Math.min(d.lp, 3800), pan, send: d.send * 0.6 }); return; }
      if (BIG.has(kind)) {
        play(S.fx, sl, { gain: 1.3 * d.k, rate: r, lp: d.lp, pan, send: d.send + 0.08 });
        play(S.fx, fx('hit'), { gain: 0.45 * d.k, rate: r * 1.12, lp: d.lp, pan, delay: 0.003 });
        play(S.fx, sl, { gain: 0.65 * d.k, rate: 0.6, lp: 1100, pan }); // the body of the hit
        return;
      }
      play(S.fx, sl, { gain: (0.7 + 0.6 * v) * d.k, rate: r, lp: d.lp, pan, send: d.send });
    },
    synthHit(kind, speed, pan) {
      const t = now() + 0.005, big = BIG.has(kind), soft = SOFT.has(kind), v = clamp(speed / 70, 0.15, 1.2);
      burst(t, { f: soft ? 3800 : 2600, q: 0.9, type: 'bandpass', peak: (soft ? 0.25 : 0.55) * (0.6 + v * 0.5), dec: soft ? 0.025 : 0.05, pan });
      if (big) tone(t, { f: 210, f2: 70, type: 'triangle', peak: 0.35, dec: 0.09, pan });
    },
    // the racket through the air after a big hit (the slice is started at its loudest, so the swish trails the hit)
    whoosh(pan, far) { if (!ok()) return; const sl = fx('whoosh'); if (sl) play(S.fx, sl, { gain: 0.36 * away(far).k, rate: 0.9 + Math.random() * 0.15, from: sl[1] * 0.35, pan, send: 0.1 }); },
    squeak(pan, far) {
      if (!ok()) return; const sl = fx('squeak'), d = away(far);
      if (sl) play(S.fx, sl, { gain: (0.09 + Math.random() * 0.09) * d.k, rate: 0.9 + Math.random() * 0.22, lp: d.lp, pan, send: d.send * 0.8 });
      else { const t = now(), f0 = rand(2300, 3300); tone(t, { f: f0, f2: f0 * rand(1.15, 1.4), type: 'sawtooth', peak: 0.022, dec: rand(0.06, 0.12), a: 0.01, pan }); }
    },
    step(pan) { if (!ok()) return; const sl = fx('hit'); if (sl) play(S.fx, sl, { gain: 0.22, rate: 0.4, lp: 320, pan, send: 0.1 }); }, // a landing: weight on the floor
    // into the net: the cork's dull thump in the mesh; off the tape: a sharper tick
    net() { if (!ok()) return; const sl = fx('hit'); if (!sl) { burst(now(), { f: 380, q: 0.8, type: 'lowpass', peak: 0.5, dec: 0.12 }); return; } play(S.fx, sl, { gain: 0.5, rate: 0.55, lp: 650, send: 0.2 }); play(S.fx, fx('whoosh'), { gain: 0.08, rate: 1.6, bp: 2200, q: 0.8, len: 0.12 }); },
    cord() { if (!ok()) return; const sl = fx('hit'); if (!sl) { burst(now(), { f: 1200, q: 3, peak: 0.25, dec: 0.05 }); return; } play(S.fx, sl, { gain: 0.42, rate: 0.82, bp: 1700, q: 0.9, send: 0.2 }); },
    // the shuttle on the mat: a light tap of its cork
    land(pan, far) { if (!ok()) return; const sl = fx('hit'), d = away(far); if (!sl) { burst(now(), { f: 3000, q: 1.5, peak: 0.12, dec: 0.012, pan }); return; } play(S.fx, sl, { gain: 0.12 * d.k, rate: 1.35, lp: Math.min(2400, d.lp), pan, send: d.send }); },
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
  const restStick = () => { const r = zone.getBoundingClientRect(); stick.style.left = `${r.left + Math.min(110, r.width * 0.35)}px`; stick.style.top = `${r.bottom - 110}px`; knob.style.transform = ''; stick.classList.add('idle'); };
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
    for (const i of [0, 1]) {
      const pt = $(`pt${i}`); pt.textContent = m.score[i]; $(`gm${i}`).textContent = m.games[i];
      $(`row${i}`).classList.toggle('serving', m.server === i);
      if (bump === i) { pt.classList.remove('bump'); void pt.offsetWidth; pt.classList.add('bump'); }
    }
    for (const i of [0, 1]) $(`gm${i}`).style.visibility = m.o.games > 1 ? '' : 'hidden';
    $('bugGame').textContent = m.o.games > 1 ? `Game ${m.gameNo}` : m.o.points === 11 ? 'To 11' : 'To 21';
    const gp = m.phase !== 'over' ? m.pointFor() : null;
    $('bugTag').textContent = gp ? `${gp} point` : '';
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
  H.rally = (n) => { $('rallyN').textContent = n; $('rally').style.opacity = n >= 6 ? 1 : 0; };
  H.timing = (label) => { const el = $('timing'); el.dataset.q = label; el.textContent = label; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  H.serveHint = (show) => {
    const el = $('serveHint');
    if (!show) { el.hidden = true; return; }
    el.innerHTML = COARSE ? 'Your serve: <b>Clear</b> high · <b>Drop</b> short · <b>Smash</b> flick' : 'Your serve: <b>J</b> high · <b>K</b> short · <b>L</b> flick';
    el.hidden = false;
  };
  H.labels = (h, d) => {
    let a = 'Clear', b = 'Drop', c = 'Smash', cs = 'attack';
    if (h !== null) {
      if (h < 1.9) { a = 'Lift'; b = h >= 1.0 || d >= 2.6 ? 'Block' : 'Net'; c = h >= 1.7 && d < 2.6 ? 'Kill' : h >= 0.95 ? 'Drive' : 'Push'; }
      else if (h >= 2.0 && d <= 6.2) cs = 'jump'; // pressed in time, a jump smash
    }
    if ($('lblA').textContent !== a) $('lblA').textContent = a;
    if ($('lblB').textContent !== b) $('lblB').textContent = b;
    if ($('lblC').textContent !== c) $('lblC').textContent = c;
    if ($('subC').textContent !== cs) $('subC').textContent = cs;
  };
  H.clear = () => { for (const id of ['callout', 'pill', 'speed', 'ump', 'serveHint', 'replayBug', 'skipHint']) $(id).hidden = true; $('rally').style.opacity = 0; };
  return H;
})();

/* ------------------------------------------------------------------ the game */
const G = {
  mode: 'loading', match: null, views: [null, null], bodies: [null, null], umpire: null, K: {},
  pace: 0.86, paused: false, replay: null, review: null, attract: true, lastReplayPt: -9, ptCount: 0,
  s: {
    char: store.get('char', 'footballer'), opp: store.get('opp', 'ch42'), name: store.get('name', '') || 'Kavin',
    diff: store.get('diff', 'medium'), len: store.get('len', 'quick'), auto: store.get('auto', true), marker: store.get('marker', true), replays: store.get('replays', true),
  },
};
if (!CHARS[G.s.char]) G.s.char = 'footballer';
if (!CHARS[G.s.opp] || G.s.opp === G.s.char) G.s.opp = Object.keys(CHARS).find((k) => k !== G.s.char);

/* ---- models */
const gltfLoader = new THREE.GLTFLoader();
const modelP = {}, progress = {};
function loadChar(key) {
  if (!modelP[key]) {
    modelP[key] = new Promise((resolve, reject) => gltfLoader.load(`players/${key}.glb`, resolve, (e) => { if (e.total) progress[key] = e.loaded / e.total; }, reject))
      .then((g) => { G.K[key] = calibrate(g, key === 'josh' ? 1.8 : CHARS[key].h); if (FACES && CHARS[key]) setTimeout(() => { try { renderFace(key); } catch (e) { console.warn('portrait', e); } }, 0); return G.K[key]; });
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
  const keys = [G.s.char, G.s.opp];
  await Promise.all(keys.map(loadChar));
  if (!G.bodies[0] || G.bodies[0].cfg !== CHARS[G.s.char]) bodyFor(0, G.s.char);
  if (!G.bodies[1] || G.bodies[1].cfg !== CHARS[G.s.opp]) bodyFor(1, G.s.opp);
}

/* ---- matches */
const displayName = (key, mine) => (mine && G.s.name.trim() ? G.s.name.trim() : CHARS[key].short);
function newMatch(attract) {
  G.attract = attract;
  const lens = { quick: [11, 1], single: [21, 1], full: [21, 3] }, [points, games] = attract ? [21, 1] : lens[G.s.len];
  const names = [displayName(G.s.char, !attract), displayName(G.s.opp, false)];
  G.match = new Match({ points, games, diff: G.s.diff, sides: attract ? [{ name: names[0], ai: 'medium' }, { name: names[1], ai: 'medium' }] : [{ name: names[0] }, { name: names[1], ai: G.s.diff }] });
  G.match.pl[0].auto = G.s.auto;
  G.pace = attract ? 0.92 : DIFFS[G.s.diff].pace;
  G.replay = null; G.review = null; G.pendingReplay = null; G.pendingReview = null; REC.on = true; fx.print.material.opacity = 0;
  G.paused = false; G.ptCount = 0; G.lastReplayPt = -9; G.stats = { maxRally: 0 };
  for (const v of G.views) if (v) v.stopReact();
  Hud.setNames(names[0], names[1]); Hud.score(G.match); Hud.clear();
  fx.trail.pts.length = 0; fx.you.visible = !attract;
  REC.count = 0;
  Cam.script = attract ? attractCam() : null; Cam.cut = true;
  if (!attract) {
    Sound.say('Love all. Play.'); Hud.ump('Love all, play');
    setTimeout(() => { if (G.match && G.mode === 'play') Hud.callout(`${G.match.pl[G.match.server].name}`, 'to serve', 'lime', 1600); }, 700);
  }
}

/* ---- events from the sim */
const spoken = (n) => (n === 0 ? 'love' : String(n));
function umpireCall(e, m) {
  const s = m.server, a = m.score[s], b = m.score[1 - s];
  if (e.game) {
    const w = m.pl[e.winner].name, sc = `${Math.max(...e.score)}–${Math.min(...e.score)}`;
    return { text: e.match ? `Match won by ${w}, ${sc}` : `Game won by ${w}, ${sc}`, say: e.match ? `Game, and match, won by ${w}, ${spoken(Math.max(...e.score))}, ${spoken(Math.min(...e.score))}.` : `Game won by ${w}, ${spoken(Math.max(...e.score))}, ${spoken(Math.min(...e.score))}.` };
  }
  let text = a === b ? `${a} all` : `${a}–${b}`, say = a === b ? `${spoken(a)} all` : `${spoken(a)}, ${spoken(b)}`;
  if (e.gp) { text = a === b ? `${a} all, ${e.gp} point` : `${a} ${e.gp} point ${b}`; say = a === b ? `${spoken(a)} all, ${e.gp} point` : `${spoken(a)}, ${e.gp} point, ${spoken(b)}`; }
  if (e.serviceOver) { text = `Service over, ${text}`; say = `Service over. ${say}`; }
  if (e.interval) { text += ' · Interval'; say += '. Interval.'; }
  return { text, say };
}
// how far a sound is from the camera, 0 (close) to 1 (the far end of the hall)
const _fv = new V3();
const farOf = (x, y, z) => clamp((camera.position.distanceTo(_fv.set(x, y, z)) - 7) / 15, 0, 1);
function handleEvents() {
  const m = G.match, live = !G.attract;
  for (const e of m.events) {
    const pan = e.P ? clamp(e.P.x / 4, -0.8, 0.8) * (Cam.mode === 'side' ? 0.4 : 1) : 0, far = e.P ? farOf(e.P.x, e.P.y, e.P.z) : 0;
    if (e.type === 'hit') {
      Sound.hit(e.kind, e.speed, pan, far);
      if (e.kind === 'smash' || e.kind === 'jump' || e.kind === 'kill') { Sound.whoosh(pan, far); if (e.kind === 'jump') { Cam.shake = 0.06; Sound.ooh(0.6); } }
      if (live && (e.kind === 'smash' || e.kind === 'jump') && e.speed * 3.6 >= 150) Hud.speed(SHOTS[e.kind].label, e.speed * 3.6);
      if (live && e.side === 0 && e.label) Hud.timing(e.label);
      if (live) Hud.rally(e.shots || 1);
      if (e.side === 0) Hud.serveHint(false);
      fx.trail.boost = clamp((e.speed - 15) / 50, 0, 1);
    } else if (e.type === 'net') {
      Sound.net(); net.hit = { x: e.x, y: e.y, t: m.T, dir: e.side === 0 ? -1 : 1 }; if (live) Sound.ooh(0.4);
    } else if (e.type === 'netcord') {
      Sound.cord(); if (live) Hud.pill('Net cord', 1400);
    } else if (e.type === 'land') {
      Sound.land(clamp(e.x / 4, -0.8, 0.8), farOf(e.x, 0, e.z));
      G.landT = m.T;
      if (live && e.inside !== undefined && e.near < 0.045 && !G.review) G.pendingReview = e;
      else if (live && e.inside === false) Hud.callout(e.serve ? 'Fault' : 'Out', null, 'out', 1200);
    } else if (e.type === 'point') onPoint(e, m);
    else if (e.type === 'game' || e.type === 'gameStart') Hud.score(m);
    else if (e.type === 'serveReady') { if (live && e.side === 0) Hud.serveHint(true); }
    else if (e.type === 'gameStart' && e.game > 1 && live) {
      setTimeout(() => { const n = ['', 'First', 'Second', 'Third'][e.game] || ''; Sound.say(`${n} game. Love all. Play.`); Hud.ump(`${n} game · Love all, play`); }, 900);
    } else if (e.type === 'match') onMatchEnd(e, m);
  }
  m.events.length = 0;
}
function onPoint(e, m) {
  const live = !G.attract, wname = m.pl[e.winner].name, you = e.winner === 0;
  G.ptCount++;
  Hud.score(m, e.winner);
  Hud.serveHint(false);
  G.stats.maxRally = Math.max(G.stats.maxRally, e.rally);
  // the crowd: a home crowd, louder for you, louder for a long rally
  const k = clamp(0.45 + e.rally / 22 + (you && live ? 0.25 : 0) + (e.game ? 0.4 : 0), 0.35, 1.2);
  setTimeout(() => { Sound.applause(k, 1.8 + e.rally / 10); crowd.cheer(clamp(k - 0.2, 0.2, 1)); }, 180);
  if (!live) return;
  const call = umpireCall(e, m);
  setTimeout(() => { if (G.match !== m) return; Hud.ump(call.text); Sound.say(call.say); }, e.game ? 900 : 650);
  if (e.interval) setTimeout(() => Hud.pill('Interval', 2400), 1200);
  else if (e.gp && !e.game) setTimeout(() => Hud.pill(`${e.gp === 'match' ? 'Match' : 'Game'} point`, 2200), 1100);
  if (e.game && !e.match) setTimeout(() => Hud.callout('Game', `${wname} ${Math.max(...e.score)}–${Math.min(...e.score)}`, 'lime', 2200), 500);
  led.flash(e.game ? `GAME ${wname.toUpperCase()}` : `POINT ${wname.toUpperCase()}`, you ? '#39a3ff' : '#ff5b4f', '#ffffff', 2.6);
  // reactions
  const W = G.views[e.winner], Lv = G.views[1 - e.winner];
  const sw = m.pl[e.winner].swing, smashWin = sw && (sw.kind === 'smash' || sw.kind === 'jump') && (e.reason === 'in');
  if (e.game || smashWin || e.rally >= 12) W.celebrate(m.T, 1.6, false);
  if ((e.reason === 'net' || e.reason === 'out') && Math.random() < 0.45) Lv.dejected(m.T, 1.8);
  // a replay of something worth seeing
  const lastHitter = m.pl[m.sh.by] ? m.pl[m.sh.by].swing : null;
  const worth = (smashWin && sw.speed * 3.6 > 235) || (sw && sw.kind === 'jump' && e.reason === 'in') || e.rally >= 18 || (m.sh.cord && e.reason === 'in') || e.match;
  if (G.s.replays && worth && (G.ptCount - G.lastReplayPt >= 3 || e.match) && lastHitter) {
    G.lastReplayPt = G.ptCount;
    m.hold = true;
    G.pendingReplay = { at: performance.now() + 900, t1: lastHitter.t, kind: lastHitter.kind, side: m.sh.by };
  } else if (G.pendingReview) {
    m.hold = true;
  }
}
function onMatchEnd(e, m) {
  if (G.attract) { setTimeout(() => { if (G.attract) newMatch(true); }, 2500); return; }
  const you = e.winner === 0;
  G.views[e.winner].celebrate(m.T, 8, true);
  G.views[1 - e.winner].dejected(m.T, 4.3);
  Sound.applause(1.3, 5); crowd.cheer(1.2);
  led.flash(`${m.pl[e.winner].name.toUpperCase()} WINS`, '#d4ff3a', '#10170a', 8);
  setTimeout(() => { if (G.match === m) showEnd(e, m); }, 3600);
}

/* ---- replays and line reviews */
function startReplay(p) {
  const m = G.match, frames = recFrames();
  if (frames.length < 20) { m.hold = false; return; }
  const tEnd = frames[frames.length - 1][0], t0 = Math.max(frames[0][0], p.t1 - 1.1), t1 = Math.min(tEnd, (G.landT || tEnd) + 0.45);
  if (t1 - t0 < 0.4) { m.hold = false; return; }
  REC.on = false;
  const side = p.side, hz = sideSign(side);
  const angle = Math.random();
  G.replay = { frames, t: t0, t0, t1, speed: 0.38, p, startedAt: performance.now() };
  Cam.cut = true;
  // either a sideline camera running with the shuttle down the court, or a raised reverse angle from behind the
  // receiver looking back at the hitter; both keep the hitter, the shuttle and where it lands in the picture
  const hitter = G.bodies[side].root.position;
  Cam.script = () => {
    const s = shuttle.position;
    if (angle < 0.55) {
      const cz = lerp(hitter.z, s.z, 0.55);
      return { pos: new V3(7.4, 2.1, cz + hz * 2.2), look: new V3(s.x * 0.35, clamp(s.y * 0.6 + 0.5, 0.8, 2.6), lerp(hitter.z, s.z, 0.7)), fov: 38, k: 5 };
    }
    return { pos: new V3(hitter.x * 0.25 + 1.0, 4.6, -hz * 13.2), look: new V3(lerp(hitter.x, s.x, 0.5) * 0.7, clamp(lerp(1.1, s.y, 0.4), 0.8, 2.2), lerp(hitter.z, s.z, 0.5)), fov: 33, k: 5 };
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
  const near = R.p.t1 !== undefined && Math.abs(R.t - R.p.t1) < 0.18;
  R.t += dt * (near ? R.speed * 0.6 : R.speed);
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
  G.review = { until: performance.now() + 2600, e };
  fx.print.position.set(e.x, 0.008, e.z); fx.print.material.opacity = 0.9; fx.print.material.color.set(out ? 0xff5b4f : 0x3fe0a2);
  fx.print.scale.setScalar(1);
  Cam.cut = false;
  Cam.script = () => ({ pos: new V3(e.x + (e.x > 0 ? 1.0 : -1.0), 2.4, e.z + (e.z > 0 ? 1.4 : -1.4)), look: new V3(e.x, 0, e.z), fov: 26, k: 4 });
  Hud.pill('Shuttle review', 2400);
  setTimeout(() => { if (G.review) Hud.callout(out ? 'Out' : 'In', `${mm} mm ${out ? 'out' : 'in'}`, out ? 'out' : 'in', 1800); }, 700);
  m.hold = true;
}
function endReview() { G.review = null; Cam.script = null; fx.print.material.opacity = 0; if (G.match && !G.pendingReplay) G.match.hold = false; }

/* ---- the shuttle as drawn */
const _s1 = new V3(), _s2 = new V3(), _s3 = new V3();
function updateShuttle(dt, simDt) {
  const m = G.match, S = m.sh;
  let p = _s1;
  const server = m.pl[m.server], sb = G.bodies[m.server];
  if (S.mode === 'held' && sb) {
    // in the server's left hand; let go and falling to the racket during the serve
    sb.leftHandPos(p); p.y -= 0.03;
    const sw = server.swing;
    if (m.servePlan && sw) {
      const rel = sw.style === 'serveFore' ? -0.22 : -0.1, tau = m.T - sw.t;
      if (tau > rel) { const u = clamp((tau - rel) / -rel, 0, 1); p.lerp(_s2.set(sw.P.x, sw.P.y, sw.P.z), u * u); }
    }
    sh.dir.lerp(_s2.set(0, -1, 0), 1 - Math.exp(-dt * 10)).normalize();
    shuttle.visible = m.phase === 'serve' || m.phase === 'intro';
  } else {
    p.set(S.p.x, S.p.y, S.p.z);
    shuttle.visible = true;
    if (S.mode === 'flight') {
      const sp = Math.hypot(S.v.x, S.v.y, S.v.z);
      if (sp > 0.05) sh.dir.lerp(_s2.set(S.v.x / sp, S.v.y / sp, S.v.z / sp), 1 - Math.exp(-simDt * 16)).normalize();
      sh.spin += sp * simDt * 1.6;
      sh.tip = 0;
    } else if (S.mode === 'net') { sh.dir.lerp(_s2.set(0, -1, 0), 1 - Math.exp(-simDt * 8)).normalize(); }
    else if (S.mode === 'down') {
      // tipped over on the floor: cork down on the mat, skirt raised a little
      sh.tip = Math.min(1, sh.tip + simDt * 5);
      _s2.copy(sh.dir); _s2.y = 0; if (_s2.lengthSq() < 1e-4) _s2.set(0, 0, 1); _s2.normalize();
      _s3.copy(_s2).multiplyScalar(Math.cos(0.32)).setY(-Math.sin(0.32));
      sh.dir.lerp(_s3, sh.tip * 0.4).normalize();
      p.y = 0.014 + 0.012 * (1 - sh.tip);
    }
  }
  shuttle.position.copy(p);
  sh.q.setFromUnitVectors(Y_UP, sh.dir);
  shuttle.quaternion.copy(sh.q).multiply(_q1.setFromAxisAngle(Y_UP, sh.spin));
  // drawn bigger the further it is from the camera, so it is never lost
  const dist = camera.position.distanceTo(p), px = innerHeight;
  const want = clamp((8.5 * dist * 2 * Math.tan((camera.fov * Math.PI) / 360)) / (0.08 * px), 1, 3.6);
  sh.scale = damp(sh.scale, want, 6, dt); shuttle.scale.setScalar(sh.scale);
  // trail
  const tr = fx.trail;
  if (S.mode === 'flight') { tr.pts.unshift(p.clone()); if (tr.pts.length > tr.N) tr.pts.pop(); } else if (tr.pts.length) tr.pts.pop();
  const fast = S.mode === 'flight' ? clamp((Math.hypot(S.v.x, S.v.y, S.v.z) - 7) / 30, 0, 1) : 0;
  tr.mat.uniforms.uOpacity.value = damp(tr.mat.uniforms.uOpacity.value, 0.12 + 0.55 * fast, 10, dt);
  const camPos = camera.position, w0 = 0.022 * sh.scale;
  for (let i = 0; i < tr.N; i++) {
    const q = tr.pts[Math.min(i, tr.pts.length - 1)] || p, nx = tr.pts[Math.min(i + 1, tr.pts.length - 1)] || q;
    _s2.subVectors(q, nx); if (_s2.lengthSq() < 1e-8) _s2.copy(sh.dir);
    _s3.subVectors(camPos, q); _s2.cross(_s3).normalize();
    const w = w0 * (1 - i / tr.N), o = i * 6;
    tr.pos[o] = q.x + _s2.x * w; tr.pos[o + 1] = q.y + _s2.y * w; tr.pos[o + 2] = q.z + _s2.z * w;
    tr.pos[o + 3] = q.x - _s2.x * w; tr.pos[o + 4] = q.y - _s2.y * w; tr.pos[o + 5] = q.z - _s2.z * w;
    tr.a[i * 2] = tr.a[i * 2 + 1] = i < tr.pts.length ? (1 - i / tr.N) : 0;
  }
  tr.geo.attributes.position.needsUpdate = true; tr.geo.attributes.alpha.needsUpdate = true;
  // shadow on the floor, softer and fainter the higher it is
  fx.shadow.visible = shuttle.visible;
  fx.shadow.position.set(p.x, 0.006, p.z);
  const hs = 0.07 * sh.scale + p.y * 0.05; fx.shadow.scale.set(hs, hs, 1);
  fx.shadow.material.opacity = clamp(0.62 - p.y * 0.07, 0.15, 0.62);
  // where it will land (when it is coming to you)
  const mk = fx.marker.material;
  const showMk = !G.attract && G.s.marker && m.phase === 'rally' && S.mode === 'flight' && S.by === 1 && m.path && m.path.land && m.path.land.z > 0;
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
  const plan = me.plan;
  Hud.labels(plan && m.sh.by === 1 ? plan.P.y : null, plan ? Math.abs(plan.P.z) : 9);
  // the perfect window: a press now, with the shuttle this far away, is a Perfect
  const lead = plan && m.phase === 'rally' && m.sh.by === 1 ? plan.t - m.T : -1;
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

/* a head-and-shoulders portrait of each character for the menu: players/faces/<key>.jpg, rendered from the models
   by ?faces (tests/faces.mjs saves them) */
const FACES = params.has('faces');
G.faces = FACES ? {} : Object.fromEntries(Object.keys(CHARS).map((k) => [k, `players/faces/${k}.jpg`]));
const faceScene = new THREE.Scene();
{
  faceScene.background = new THREE.Color(0x1b2440);
  faceScene.add(new THREE.HemisphereLight(0xdfe8ff, 0x22283a, 1.2));
  const k = new THREE.DirectionalLight(0xffffff, 2.2); k.position.set(0.6, 1.2, 1.5); faceScene.add(k);
}
function renderFace(key) {
  const K = G.K[key]; if (!K || G.faces[key]) return;
  const model = THREE.SkeletonUtils.clone(K.gltf.scene); model.scale.setScalar(K.S); model.position.y = K.offY;
  faceScene.add(model); model.updateMatrixWorld(true);
  const head = bonesOf(model).Head.getWorldPosition(new V3());
  const cam = new THREE.PerspectiveCamera(24, 1, 0.05, 10);
  cam.position.set(head.x, head.y + 0.02, head.z + 0.85); cam.lookAt(head.x, head.y - 0.04, head.z);
  const rt = new THREE.WebGLRenderTarget(96, 96, { colorSpace: THREE.SRGBColorSpace });
  const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt); renderer.render(faceScene, cam); renderer.setRenderTarget(null); renderer.toneMapping = tm;
  const px = new Uint8Array(96 * 96 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 96, 96, px);
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'), img = g.createImageData(96, 96);
  for (let y = 0; y < 96; y++) img.data.set(px.subarray((95 - y) * 96 * 4, (96 - y) * 96 * 4), y * 96 * 4); // rows come bottom up
  g.putImageData(img, 0, 0);
  G.faces[key] = c.toDataURL('image/jpeg', 0.85);
  faceScene.remove(model); rt.dispose();
  paintPicks();
}
function paintPicks() {
  const el = $('pickChips'); el.innerHTML = '';
  for (const [k, c] of Object.entries(CHARS)) {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button';
    b.setAttribute('aria-pressed', String(k === G.s.char));
    b.innerHTML = `<span class="face" style="background-image:url(${G.faces && G.faces[k] ? G.faces[k] : ''})"></span>${c.name.split(' ')[0]}`;
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
  if (on) { const m = G.match; $('pauseSub').textContent = `${m.pl[0].name} ${m.score[0]} – ${m.score[1]} ${m.pl[1].name}${m.o.games > 1 ? ` · games ${m.games[0]}–${m.games[1]}` : ''}`; if (window.speechSynthesis) speechSynthesis.cancel(); }
  syncToggles();
}
function showEnd(e, m) {
  G.mode = 'end';
  const you = e.winner === 0, P = m.pl;
  $('endTitle').textContent = you ? 'Match won' : 'Match lost'; $('endTitle').className = you ? 'win' : '';
  $('endSub').textContent = `${P[0].name} v ${P[1].name} · ${DIFFS[G.s.diff].name}`;
  $('endGames').innerHTML = e.history.map((g) => `<span class="${g[0] > g[1] ? 'w' : ''}">${g[0]}–${g[1]}</span>`).join('');
  const s0 = P[0].stats, s1 = P[1].stats, pc = (s) => (s.shots ? `${Math.round((100 * s.perfect) / s.shots)}%` : '–');
  const rows = [['Points won', s0.points, s1.points], ['Winners', s0.winners, s1.winners], ['Errors', s0.errors, s1.errors], ['Smashes', s0.smashes, s1.smashes], ['Fastest smash', s0.maxSmash ? `${Math.round(s0.maxSmash)}` : '–', s1.maxSmash ? `${Math.round(s1.maxSmash)}` : '–'], ['Perfect timing', pc(s0), '–'], ['Longest rally', G.stats.maxRally, '']];
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
  try { if (sessionStorage.getItem('rp.reloadedFor') === String(v)) return; sessionStorage.setItem('rp.reloadedFor', String(v)); } catch (e) { return; }
  const u = new URL(location.href); u.searchParams.set('v', v); location.replace(u.toString());
}
setInterval(() => { if (!document.hidden) checkRelease(); }, 5 * 60 * 1000);
window.addEventListener('pageshow', (e) => { if (e.persisted) checkRelease(); }); // a tab restored from memory
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
// frame time watch: a device that cannot keep up gets fewer pixels
const perf = { acc: 0, n: 0, last: 0 };
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
  if (stepping) return; // a test is driving the clock
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
    else {
      if (!G.paused) { simDt = dt * G.pace; m.step(simDt); handleEvents(); }
      if (G.match === m) {
        updateShuttle(dt, simDt);
        const live = m.phase === 'rally' || m.phase === 'serve';
        for (const i of [0, 1]) if (G.views[i] && G.bodies[i]) G.views[i].update(simDt, m.pl[i], m, shuttle.position, live);
        if (G.umpire) poseUmpire(G.umpire, shuttle.position);
        if (!G.paused) recordFrame(m.T, [G.bodies[0], G.bodies[1]]);
      }
    }
    // shoes on the mat: a squeak on a hard change of direction
    for (const pl of m.pl) {
      const a = Math.hypot(pl.vx - (pl.pvx || 0), pl.vz - (pl.pvz || 0)) / Math.max(1e-3, simDt);
      if (simDt > 0 && a > 15 && Math.hypot(pl.vx, pl.vz) > 2.2 && wall - (pl.squeakT || 0) > 0.8 && Math.random() < 0.45) { pl.squeakT = wall; Sound.squeak(clamp(pl.x / 4, -0.8, 0.8), farOf(pl.x, 0.1, pl.z)); }
      pl.pvx = pl.vx; pl.pvz = pl.vz;
    }
    net.update(m.T);
  }
  led.update(wall); crowd.update(wall, dt);
  const focus = m ? _v4.set(m.pl[0].x, 0, m.sh.p.z) : _v4.set(0, 0, 0);
  updateCamera(dt, focus);
}

/* ------------------------------------------------------------------ start */
async function boot() {
  resize();
  seg('segDiff', 'diff'); seg('segLen', 'len'); seg('segView', 'view'); seg('segViewP', 'view');
  setView(Cam.mode); syncToggles(); paintPicks();
  loadBar(0.2, 'Loading the players…');
  const progTimer = setInterval(() => {
    const keys = Object.keys(progress), p = keys.length ? keys.reduce((a, k) => a + progress[k], 0) / 3 : 0;
    loadBar(0.2 + 0.7 * clamp(p, 0, 1));
  }, 120);
  try {
    const clipsP = fetch('players/moves.json').then((r) => { if (!r.ok) throw new Error(`moves.json ${r.status}`); return r.json(); });
    const [clips] = await Promise.all([clipsP, loadChar(G.s.char), loadChar(G.s.opp), loadChar('josh')]);
    CLIPS = clips; CLIP_BI = Object.fromEntries(clips.bones.map((n, i) => [n, i]));
  } catch (e) { clearInterval(progTimer); window.__fatal('The players could not be loaded. Check the connection and reload.', e && e.message); return; }
  clearInterval(progTimer);
  loadBar(0.94, 'Warming up…');
  await ensureChars();
  G.umpire = new Body(G.K.josh, { racket: null }, { umpire: true });
  // on a computer the other characters download in the background, so a change of player is quick (a phone loads
  // one when it is picked)
  if (!LITE || FACES) setTimeout(() => { for (const k of Object.keys(CHARS)) loadChar(k).catch(() => {}); }, 2500);
  showMenu();
  renderer.compile(scene, camera);
  loadBar(1, 'Ready');
  $('loadPanel').hidden = true;
  $('playBtn').disabled = false; $('playBtn').textContent = 'Play';
  requestAnimationFrame(frame);
  if (DEBUG) window.__bm = {
    G, Cam, Sound, Input, setView, play, showMenu, newMatch, THREE, scene, camera, renderer, SHOTS, sh, fx, CHARS,
    // tests: drive the clock by hand (n frames of dt, drawn once at the end) and put the camera anywhere
    step(n = 1, dt = 1 / 60, draw = true) { stepping = true; for (let i = 0; i < n; i++) tick(dt); if (draw) render(); },
    release() { stepping = false; last = performance.now(); },
    draw: render, // just draw the scene as it is posed
    review: (e) => { G.pendingReview = e; },
    camAt(p, l, fov = 35) { Cam.script = p ? () => ({ pos: new V3(...p), look: new V3(...l), fov, k: 50 }) : null; Cam.cut = true; },
  };
}
boot().catch((e) => { console.error(e); window.__fatal('Something went wrong while building the arena.', e && (e.message || e)); });
