/* The futsal ground: a 40 x 20 m artificial-turf court in a floodlit cage at night. Rebound boards with printed
   panels, steel posts and netting (left off the camera's side so it never sits in front of the play), six
   floodlight towers, the clubhouse with its sign, a covered stand and terraces full of supporters, coconut palms and the lights
   of the city beyond. Everything in one group so the ground can be swapped. */
import { THREE, V3, P, canvasTex, LITE, clamp, rand } from './util.js';
import { addGoals } from './stadium.js';
import { buildFans } from './fans.js';

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
    const spots = [[-WX - 1.6, -WZ - 1.6], [WX + 1.6, -WZ - 1.6], [-WX - 1.6, WZ + 1.6], [WX + 1.6, WZ + 1.6], [-WX * 0.33, -WZ - 7.4], [WX * 0.33, -WZ - 7.4]]; // the middle two behind the stand
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

  /* ---- the stand along the far side (covered, five rows of plastic seats) and a terrace behind each goal, with the
     supporters in them: real people sitting, clapping, holding their heads, jumping up for a goal (fans.js) */
  {
    const seats = [], fill = LITE ? 0.45 : 0.78, STEP = 0.4, DEPTH = 0.85, PITCH = 0.62;
    const concrete = new THREE.MeshStandardMaterial({ color: 0x8b8f98, roughness: 0.92 });
    const seatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
    const tiers = [], planks = [];
    /* a block of rows: origin (x0..x1 along it) at front z, rows going back; `along` the axis the rows run on */
    const block = (len, rows, place, ry) => {
      for (let r = 0; r < rows; r++) {
        const top = STEP + r * STEP;
        const t = new THREE.BoxGeometry(len, top, DEPTH); t.translate(0, top / 2, -(r + 0.5) * DEPTH); tiers.push(place(t));
        for (let x = -len / 2 + PITCH / 2; x < len / 2 - 0.2; x += PITCH) {
          const pk = new THREE.BoxGeometry(PITCH * 0.86, 0.06, 0.42); pk.translate(x, top + 0.03, -(r + 0.5) * DEPTH - 0.12);
          const c = new THREE.Color(((x / PITCH) | 0) % 9 === 4 || r === rows - 1 && ((x / PITCH) | 0) % 3 === 0 ? 0xffc53d : 0x1f4fd0).multiplyScalar(0.85 + Math.random() * 0.15);
          const n = pk.attributes.position.count, cols = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(cols, i * 3);
          pk.setAttribute('color', new THREE.BufferAttribute(cols, 3)); planks.push(place(pk));
          if (Math.random() < fill) {
            const v = new V3(x + (Math.random() - 0.5) * 0.06, top + 0.06, -(r + 0.5) * DEPTH - 0.1);
            const w = place(null, v); seats.push({ x: w.x, y: w.y, z: w.z, ry });
          }
        }
      }
    };
    // the main stand: rows run along x, facing +z (the court)
    const MZ = -WZ - 1.7, ML = 37;
    block(ML, 5, (g, v) => { if (g) return g.translate(0, 0, MZ); return v.set(v.x, v.y, v.z + MZ); }, 0);
    // terraces behind each goal: rows run along z, facing the court
    for (const sx of [-1, 1]) {
      const EX = sx * (WX + 1.3), EL = 13;
      block(EL, 3, (g, v) => {
        // local (x along, z back) → world: along z, back away from the court in x
        if (g) { g.rotateY(sx < 0 ? Math.PI / 2 : -Math.PI / 2); return g.translate(EX, 0, 0); }
        return sx < 0 ? v.set(EX + v.z, v.y, -v.x) : v.set(EX - v.z, v.y, v.x);
      }, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    const tm = new THREE.Mesh(THREE.mergeGeometries(tiers), concrete); tm.receiveShadow = true; scene.add(tm);
    scene.add(new THREE.Mesh(THREE.mergeGeometries(planks), seatMat));
    // the stand's back wall, roof on steel columns, a lit fascia
    const backZ = MZ - 5 * DEPTH, steel = new THREE.MeshStandardMaterial({ color: 0x39404d, roughness: 0.5, metalness: 0.7 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ML + 0.4, 3.4, 0.25), concrete); wall.position.set(0, 1.7, backZ - 0.12); scene.add(wall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(ML + 1.2, 0.22, 6.2), new THREE.MeshStandardMaterial({ color: 0x2b313c, roughness: 0.6, metalness: 0.4 }));
    roof.position.set(0, 6.3, backZ + 2.7); roof.rotation.x = -0.06; roof.castShadow = true; scene.add(roof);
    for (let x = -ML / 2; x <= ML / 2 + 0.1; x += ML / 4) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 6.3, 8), steel); c.position.set(x, 3.15, backZ + 0.2); scene.add(c); }
    const fascia = canvasTex(1024, 64, (g, w, h) => {
      g.fillStyle = '#0d1424'; g.fillRect(0, 0, w, h);
      g.font = '900 42px "Arial Narrow", Impact, system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#3fe0a2' : '#ffd23f'; g.fillText(i % 2 ? 'FINAL WHISTLE' : 'THUDINEST FUTSAL', (i + 0.5) * w / 4, h / 2 + 2); }
    });
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(ML + 1.2, 0.6), new THREE.MeshBasicMaterial({ map: fascia, toneMapped: false }));
    fm.position.set(0, 6.05, backZ + 5.82); scene.add(fm);
    // lamps under the roof so the faces are lit
    const under = new THREE.MeshBasicMaterial({ color: 0xfff3dc, toneMapped: false });
    for (let x = -ML / 2 + 2; x < ML / 2; x += 4.4) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), under); l.rotation.x = Math.PI / 2; l.position.set(x, 6.17, backZ + 3.6); scene.add(l); }
    const standLight = new THREE.PointLight(0xfff0d8, LITE ? 30 : 45, 26, 1.6); standLight.position.set(0, 5.4, MZ - 0.5); scene.add(standLight);
    if (!LITE) { const l2 = standLight.clone(); l2.position.x = -11; scene.add(l2); const l3 = standLight.clone(); l3.position.x = 11; scene.add(l3); }

    const fans = buildFans(scene, seats);
    S.fans = fans.uniforms; S.crowdCount = seats.length;
  }
  /* the crowd's mood: stand = on their feet for a goal, groan = hands on heads, clap = applause */
  S.stand = 0; S.groan = 0; S.clap = 0;
  S.react = (kind, v = 1) => {
    if (kind === 'goal') { S.stand = 1.6; S.clap = 0; S.groan = 0; }
    else if (kind === 'groan') { S.groan = Math.max(S.groan, v * 1.3); S.clap = 0; }
    else if (kind === 'clap') S.clap = Math.max(S.clap, v * 1.4);
  };

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
    S.stand = Math.max(0, S.stand - dt * 0.2); S.groan = Math.max(0, S.groan - dt * 0.55); S.clap = Math.max(0, S.clap - dt * 0.3);
    if (S.fans) { const F = S.fans; F.uTime.value = S.time; F.uHype.value = clamp(S.stand, 0, 1); F.uGroan.value = clamp(S.groan, 0, 1); F.uClap.value = clamp(Math.max(S.clap, S.groan > 0.05 ? 0 : (S.hype - 0.3) * 1.2), 0, 1); }
    for (const g of S.glows) g.material.opacity = 0.85 + Math.sin(S.time * 3 + g.position.x) * 0.04;
    updateNets(dt);
  };
  return S;
}
