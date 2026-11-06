/* The futsal ground: a 40 x 20 m artificial-turf court in a floodlit cage at night. Rebound boards with printed
   panels, steel posts and netting (left off the camera's side so it never sits in front of the play), six
   floodlight towers, the clubhouse with its sign, a few dozen supporters on benches, coconut palms and the lights
   of the city beyond. Everything in one group so the ground can be swapped. */
import { THREE, V3, P, canvasTex, LITE, clamp, rand } from './util.js';
import { addGoals } from './stadium.js';

export function buildFutsal(world, renderer) {
  const scene = new THREE.Group(); world.add(scene);
  const S = { root: scene, nets: [], boards: [], crowdMat: null, time: 0, hype: 0, glows: [] };
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const WX = P.wallX, WZ = P.wallZ;

  /* ---- the night sky: deep blue, the warm glow of the city low down, stars */
  {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x03061a) }, mid: { value: new THREE.Color(0x0e1c4a) }, low: { value: new THREE.Color(0x6b3f52) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){ float y = vP.y; vec3 c = mix(low, mid, smoothstep(-0.03, 0.16, y)); c = mix(c, top, smoothstep(0.16, 0.7, y));
          vec3 q = floor(vP * 420.0); float s = step(0.9982, h(q)) * smoothstep(0.12, 0.45, y) * (0.5 + 0.5 * h(q + 3.0));
          gl_FragColor = vec4(c + s, 1.0); }`,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), mat));
    // the moon, with a soft halo
    const glow = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,250,235,0.95)'); gr.addColorStop(0.24, 'rgba(255,240,210,0.25)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff4dc, fog: false, depthWrite: false, toneMapped: false }));
    moon.position.set(-140, 150, -260); moon.scale.setScalar(70); scene.add(moon);
  }

  /* ---- lights: the floodlights as a key that casts crisp shadows on this small court, a second bank, the sky */
  scene.add(new THREE.HemisphereLight(0x7f97d8, 0x1d2a1c, 0.6));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.9);
  key.position.set(-8, 34, 16); key.target.position.set(0, 0, 0); key.castShadow = true;
  const sm = LITE ? 1024 : 2048; key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -25, right: 25, top: 15, bottom: -15, near: 10, far: 80 });
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.025; key.shadow.radius = 3;
  scene.add(key, key.target);
  const bank = new THREE.DirectionalLight(0xe8efff, 1.1); bank.position.set(14, 26, -18); scene.add(bank);
  const rim = new THREE.DirectionalLight(0x8fb0ff, 0.6); rim.position.set(0, 10, -40); scene.add(rim);

  /* ---- the ground outside the cage: worn asphalt */
  {
    const tex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#2b2e35'; g.fillRect(0, 0, w, h);
      const im = g.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
    }, { repeat: [60, 60], aniso });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.02; g.receiveShadow = true; scene.add(g);
  }

  /* ---- the turf: stripes across the length, grain, a shade darker against the boards */
  {
    const L = WX * 2, W = WZ * 2, tw = LITE ? 1024 : 2048, th = Math.round(tw * W / L);
    const map = canvasTex(tw, th, (g, w, h) => {
      const stripes = 10, pxm = w / L, x0 = (WX - P.HL) * pxm, sw = (w - 2 * x0) / stripes;
      g.fillStyle = '#2f8a3c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? '#2c8238' : '#36964a'; g.fillRect(x0 + i * sw, 0, sw + 1, h); }
      // the turf's grain: fine speckle, a few darker tufts
      const im = g.getImageData(0, 0, w, h), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 30; d[i] += n * 0.5; d[i + 1] += n; d[i + 2] += n * 0.45; }
      g.putImageData(im, 0, 0);
      // darker by the boards, where the lights don't reach and the rubber crumb collects
      const edge = 1.2 * pxm;
      for (const [x, y, ww, hh, gx0, gy0, gx1, gy1] of [[0, 0, w, edge, 0, 0, 0, edge], [0, h - edge, w, edge, 0, h, 0, h - edge], [0, 0, edge, h, 0, 0, edge, 0], [w - edge, 0, edge, h, w, 0, w - edge, 0]]) {
        const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, 'rgba(10,30,14,0.55)'); gr.addColorStop(1, 'rgba(10,30,14,0)'); g.fillStyle = gr; g.fillRect(x, y, ww, hh);
      }
      // wear in front of each goal
      for (const s of [-1, 1]) { const cx = w / 2 + s * P.HL * pxm * 0.93, gr = g.createRadialGradient(cx, h / 2, 0, cx, h / 2, 3 * pxm); gr.addColorStop(0, 'rgba(120,120,70,0.32)'); gr.addColorStop(1, 'rgba(120,120,70,0)'); g.fillStyle = gr; g.fillRect(cx - 3 * pxm, h / 2 - 3 * pxm, 6 * pxm, 6 * pxm); }
    }, { aniso });
    const bump = canvasTex(256, 256, (g, w, h) => {
      const im = g.createImageData(w, h), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const v = 90 + Math.random() * 165; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      g.putImageData(im, 0, 0);
    }, { linear: true, repeat: [L / 0.6, W / 0.6], aniso });
    const turf = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.9, roughness: 0.96, metalness: 0, color: 0xf2fff2 }));
    turf.rotation.x = -Math.PI / 2; turf.position.y = 0.001; turf.receiveShadow = true; scene.add(turf);
  }

  /* ---- the futsal markings (8 cm lines): the D-shaped penalty areas, the 6 m and 10 m marks, a 3 m circle */
  {
    const mat = new THREE.MeshStandardMaterial({ color: 0xf6f8f2, roughness: 0.8, emissive: 0x303030, polygonOffset: true, polygonOffsetFactor: -2 });
    const lw = 0.08, y = 0.006, g = new THREE.Group();
    const rect = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0) + lw, m = new THREE.Mesh(new THREE.PlaneGeometry(x0 === x1 ? lw : l, x0 === x1 ? l : lw), mat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; g.add(m); };
    const ring = (x, z, r, a0 = 0, al = Math.PI * 2, seg = 72) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - lw / 2, r + lw / 2, seg, 1, a0, al), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; g.add(m); };
    const disc = (x, z, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); };
    const { HL, HW } = P;
    rect(-HL, -HW, HL, -HW); rect(-HL, HW, HL, HW); rect(-HL, -HW, -HL, HW); rect(HL, -HW, HL, HW); rect(0, -HW, 0, HW);
    ring(0, 0, P.circle); disc(0, 0, 0.1);
    for (const s of [-1, 1]) {
      const gx = s * HL, r = P.boxL;
      // a quarter circle from each post and the line joining them
      // (a ring's angle runs from +x toward -z once laid flat, so the quarter toward the pitch is mirrored by end)
      ring(gx, -P.goalW, r, s > 0 ? Math.PI / 2 : 0, Math.PI / 2, 32);
      ring(gx, P.goalW, r, s > 0 ? Math.PI : -Math.PI / 2, Math.PI / 2, 32);
      rect(gx - s * r, -P.goalW, gx - s * r, P.goalW);
      disc(gx - s * P.spot, 0, 0.1); disc(gx - s * 10, 0, 0.1);
      for (const t of [-1, 1]) ring(gx, t * HW, P.arc, s > 0 ? (t > 0 ? Math.PI : Math.PI / 2) : (t > 0 ? -Math.PI / 2 : 0), Math.PI / 2, 10);
    }
    scene.add(g);
  }

  /* ---- the goals and their nets */
  const updateNets = addGoals(scene, S);

  /* ---- the rebound boards: 1 m high, printed panels facing in */
  {
    const panels = [['THUDINEST', '#2350b8', '#ffd23f'], ['FINAL WHISTLE', '#0d1430', '#3fe0a2'], ['COIMBATORE', '#17784a', '#ffffff'], ['HOMESTAY & GAMES', '#d6162f', '#ffffff'], ['THUDINEST.COM', '#ffd23f', '#0d1430'], ['FUTSAL NIGHTS', '#1f1f27', '#ff8a1f']];
    const tex = canvasTex(2048, 128, (g, w, h) => {
      const pw = w / panels.length;
      panels.forEach(([t, bg, fg], i) => {
        g.fillStyle = bg; g.fillRect(i * pw, 0, pw, h);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(i * pw, 0, pw, h * 0.18);
        g.fillStyle = fg; g.font = '900 66px "Arial Narrow", Impact, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(t, i * pw + pw / 2, h / 2 + 4, pw * 0.86);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(i * pw + pw - 3, 0, 3, h);
      });
    }, { aniso });
    tex.wrapS = THREE.RepeatWrapping;
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.18 });
    const back = new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.8 });
    const side = (len, x, z, ry) => {
      const geo = new THREE.BoxGeometry(len, 1.0, 0.1);
      // the box's +z face carries the print; map u along the length so the panels repeat at a sensible size
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 24);
      const m = new THREE.Mesh(geo, [back, back, back, back, face, back]);
      m.position.set(x, 0.5, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    };
    side(WX * 2, 0, -WZ - 0.05, 0); side(WX * 2, 0, WZ + 0.05, Math.PI);
    side(WZ * 2 + 0.2, -WX - 0.05, 0, Math.PI / 2); side(WZ * 2 + 0.2, WX + 0.05, 0, -Math.PI / 2);
  }

  /* ---- the cage: steel posts, rails, and netting to 7.5 m (not on the camera's side) */
  {
    const H = 7.5, steel = new THREE.MeshStandardMaterial({ color: 0x8d96a6, roughness: 0.45, metalness: 0.7 });
    const geos = [];
    const post = (x, z) => { const g = new THREE.CylinderGeometry(0.055, 0.065, H, 8); g.translate(x, H / 2, z); geos.push(g); };
    for (let x = -WX; x <= WX + 0.01; x += WX / 5) post(x, -WZ - 0.15); // none on the camera's side
    for (let z = -WZ + WZ / 3; z < WZ - 0.01; z += WZ / 3) { post(-WX - 0.15, z); post(WX + 0.15, z); }
    const rail = (len, x, z, y, rz) => { const g = new THREE.BoxGeometry(len, 0.07, 0.07); if (rz) g.rotateY(Math.PI / 2); g.translate(x, y, z); geos.push(g); };
    rail(WX * 2, 0, -WZ - 0.15, H, false); rail(WZ * 2, -WX - 0.15, 0, H, true); rail(WZ * 2, WX + 0.15, 0, H, true);
    rail(WX * 2, 0, -WZ - 0.15, 1.05, false); rail(WZ * 2, -WX - 0.15, 0, 1.05, true); rail(WZ * 2, WX + 0.15, 0, 1.05, true);
    const merged = THREE.mergeGeometries(geos);
    const cage = new THREE.Mesh(merged, steel); cage.castShadow = true; scene.add(cage);
    // netting: a 0.45 m mesh from the boards up, a line grid
    const net = (ax, bx, az, bz, y0, y1, step) => {
      const pts = [], len = Math.hypot(bx - ax, bz - az), n = Math.round(len / step), m = Math.round((y1 - y0) / step);
      for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; pts.push(x, y0, z, x, y1, z); }
      for (let j = 0; j <= m; j++) { const y = y0 + (y1 - y0) * (j / m); pts.push(ax, y, az, bx, y, bz); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
    };
    const step = 0.45;
    const nets = [net(-WX, WX, -WZ - 0.12, -WZ - 0.12, 1.05, H, step), net(-WX - 0.12, -WX - 0.12, -WZ, WZ, 1.05, H, step), net(WX + 0.12, WX + 0.12, -WZ, WZ, 1.05, H, step)];
    const nm = new THREE.LineBasicMaterial({ color: 0x1d2b22, transparent: true, opacity: 0.55 });
    scene.add(new THREE.LineSegments(THREE.mergeGeometries(nets), nm));
  }

  /* ---- floodlight towers: four corners and two on the far side, lamps glowing */
  {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x5a6272, roughness: 0.5, metalness: 0.6 });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff5e0, toneMapped: false });
    const halo = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,248,225,0.9)'); gr.addColorStop(0.25, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const spots = [[-WX - 1.6, -WZ - 1.6], [WX + 1.6, -WZ - 1.6], [-WX - 1.6, WZ + 1.6], [WX + 1.6, WZ + 1.6], [-WX * 0.33, -WZ - 1.6], [WX * 0.33, -WZ - 1.6]];
    for (const [x, z] of spots) {
      const h = 12.5;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 10), towerMat); t.position.set(x, h / 2, z); t.castShadow = true; scene.add(t);
      const head = new THREE.Group(); head.position.set(x, h + 0.4, z); head.lookAt(x * 0.2, 0, z * 0.2);
      for (const dx of [-0.75, 0.75]) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.35), towerMat); box.position.set(dx, 0, 0); head.add(box);
        const l = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), lamp); l.position.set(dx, 0, 0.18); head.add(l);
      }
      scene.add(head);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xfff1d6, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true, toneMapped: false }));
      sp.position.copy(head.position); sp.scale.setScalar(6); scene.add(sp); S.glows.push(sp);
    }
  }

  /* ---- the clubhouse behind the far side, its sign lit */
  {
    const z = -WZ - 17;
    const wall = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#d8cdb8'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) {
        const on = Math.random() < 0.7; g.fillStyle = on ? (Math.random() < 0.5 ? '#ffd98a' : '#ffe9b8') : '#2b3240';
        g.fillRect(16 + c * 62, 40 + r * 110, 40, 60);
      }
    });
    const house = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 6), [new THREE.MeshStandardMaterial({ color: 0xcfc3ad }), new THREE.MeshStandardMaterial({ color: 0xcfc3ad }), new THREE.MeshStandardMaterial({ color: 0x7a3b2a }), new THREE.MeshStandardMaterial({ color: 0xcfc3ad }), new THREE.MeshStandardMaterial({ map: wall, emissive: 0xffffff, emissiveMap: wall, emissiveIntensity: 0.18, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: 0xcfc3ad })]);
    house.position.set(-14, 3.5, z); house.castShadow = true; scene.add(house);
    const sign = canvasTex(1024, 192, (g, w, h) => {
      g.fillStyle = '#0d1430'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
      g.font = '900 104px "Arial Narrow", Impact, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.fillText('THUDINEST', w * 0.36, h / 2 + 4); g.fillStyle = '#3fe0a2'; g.fillText('FUTSAL', w * 0.79, h / 2 + 4);
    });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.4), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }));
    s.position.set(-14, 8.4, z + 3.05); scene.add(s);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(13.4, 2.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x111522 })); s2.position.set(-14, 8.4, z + 2.9); scene.add(s2);
  }

  /* ---- supporters on benches along the far side, and at the ends */
  {
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x3a6fd0, roughness: 0.7 });
    const people = [];
    const bench = (x0, x1, z, rows, ry) => {
      for (let r = 0; r < rows; r++) {
        const zz = z - r * 0.9 * Math.sign(z || 1), hh = 0.45 + r * 0.45;
        const b = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), hh, 0.5), benchMat); b.position.set((x0 + x1) / 2, hh / 2, zz); b.receiveShadow = true; scene.add(b);
        for (let x = x0 + 0.4; x < x1 - 0.3; x += rand(0.55, 1.4)) if (Math.random() < 0.75) people.push({ x, y: hh, z: zz, ry });
      }
    };
    bench(4, WX - 1, -WZ - 2.4, 3, 0);
    bench(-WX + 1, -16, -WZ - 2.4, 2, 0);
    // a crowd block: body and head in one instanced geometry, bobbing; jumping for a goal
    const geo = new THREE.BufferGeometry();
    {
      const parts = [[new THREE.BoxGeometry(0.44, 0.6, 0.28), 0.3, 0], [new THREE.BoxGeometry(0.2, 0.23, 0.21), 0.74, 1]];
      const pos = [], nor = [], head = [], idx = []; let off = 0;
      for (const [g, yy, h] of parts) {
        g.translate(0, yy, 0); const pa = g.attributes.position, na = g.attributes.normal;
        for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); head.push(h); }
        for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); off += pa.count;
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('aHead', new THREE.Float32BufferAttribute(head, 1)); geo.setIndex(idx);
    }
    const phase = new Float32Array(people.length).map(() => Math.random());
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 }; sh.uniforms.uHype = { value: 0 }; S.crowdMat = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPhase; attribute float aHead; uniform float uTime; uniform float uHype; varying float vHead;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vHead = aHead;
          transformed.y += sin(uTime * 1.7 + aPhase * 6.0) * 0.03 + max(0.0, sin(uTime * (7.0 + fract(aPhase * 7.0) * 3.0) + aPhase * 30.0)) * 0.4 * uHype;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHead;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.3, 0.21), vHead);');
    };
    const mesh = new THREE.InstancedMesh(geo, mat, people.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const shirts = [0x2350b8, 0xffc53d, 0xf2f2f2, 0x17784a, 0xd6162f, 0xff8a1f, 0x222833, 0x5b8cff, 0x8a2be2];
    people.forEach((p, i) => { q.setFromAxisAngle(new V3(0, 1, 0), p.ry); m4.compose(new V3(p.x, p.y, p.z), q, new V3(1, 1, 1).multiplyScalar(rand(0.9, 1.05))); mesh.setMatrixAt(i, m4); col.setHex(shirts[(Math.random() * shirts.length) | 0]).multiplyScalar(rand(0.65, 1)); mesh.setColorAt(i, col); });
    mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh);
  }

  /* ---- coconut palms round the ground */
  {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x24502a, roughness: 0.85, side: THREE.DoubleSide });
    const palm = (x, z, h) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const lean = rand(-0.18, 0.18);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, h, 8), trunkMat); trunk.position.y = h / 2; trunk.rotation.z = lean; g.add(trunk);
      const top = new V3(-Math.sin(lean) * h, h, 0);
      for (let i = 0; i < 9; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.45, 4.2, 4, 1, true), leafMat);
        leaf.geometry.translate(0, 2.1, 0); leaf.scale.set(1, 1, 0.18);
        leaf.position.copy(top); leaf.rotation.set(0, (i / 9) * Math.PI * 2, 1.9 + rand(-0.2, 0.2), 'YXZ');
        g.add(leaf);
      }
      scene.add(g);
    };
    for (const [x, z] of [[-34, -26], [-24, -30], [10, -31], [24, -27], [36, -18], [-38, 6], [38, 10], [-30, 26], [30, 30], [0, 34]]) palm(x + rand(-2, 2), z + rand(-2, 2), rand(9, 13));
  }

  /* ---- the city: blocks of flats beyond, their windows lit */
  {
    const win = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#121a2e'; g.fillRect(0, 0, w, h);
      for (let y = 8; y < h; y += 24) for (let x = 8; x < w; x += 22) { const r = Math.random(); g.fillStyle = r < 0.45 ? '#ffd27a' : r < 0.6 ? '#bfe0ff' : '#1a2338'; g.fillRect(x, y, 12, 14); }
    }, { repeat: [1, 1] });
    const mat = new THREE.MeshStandardMaterial({ map: win, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0.55, roughness: 0.9, fog: true });
    const n = LITE ? 26 : 44, mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05), r = rand(95, 150), w = rand(10, 22), h = rand(14, 48);
      q.setFromAxisAngle(new V3(0, 1, 0), -a);
      m4.compose(new V3(Math.cos(a) * r, h / 2, Math.sin(a) * r), q, new V3(w, h, rand(8, 14))); mesh.setMatrixAt(i, m4);
    }
    scene.add(mesh);
  }

  S.bulge = S.bulge || (() => {});
  S.update = (dt) => {
    S.time += dt; S.hype = Math.max(0, S.hype - dt * 0.18);
    if (S.crowdMat) { S.crowdMat.uniforms.uTime.value = S.time; S.crowdMat.uniforms.uHype.value = clamp(S.hype, 0, 1); }
    for (const g of S.glows) g.material.opacity = 0.85 + Math.sin(S.time * 3 + g.position.x) * 0.04;
    updateNets(dt);
  };
  return S;
}
