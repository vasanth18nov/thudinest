/* The ground: a 105 x 68 m pitch with mown stripes and FIFA markings, goals with nets that bulge, corner flags,
   LED boards, four stands with a crowd that jumps for a goal, floodlight towers and a dusk sky. */
import { THREE, V3, P, canvasTex, LITE, clamp, rand } from './util.js';

export function buildStadium(world, renderer) {
  const scene = new THREE.Group(); world.add(scene); // everything of this ground in one group, so it can be swapped
  const S = { root: scene, nets: [], flags: [], boards: [], crowdMat: null, time: 0, hype: 0 };
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  /* ---- sky: a dusk gradient with a few stars */
  {
    const geo = new THREE.SphereGeometry(400, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x060b22) }, mid: { value: new THREE.Color(0x24336b) }, low: { value: new THREE.Color(0xe0824f) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){ float y = vP.y; vec3 c = mix(low, mid, smoothstep(-0.02, 0.22, y)); c = mix(c, top, smoothstep(0.2, 0.75, y));
          vec3 q = floor(vP * 380.0); float s = step(0.9985, h(q)) * smoothstep(0.25, 0.6, y);
          gl_FragColor = vec4(c + s * 0.8, 1.0); }`,
    });
    scene.add(new THREE.Mesh(geo, mat));
  }

  /* ---- lights: sky fill, and the floodlights as one shadow-casting key */
  scene.add(new THREE.HemisphereLight(0xa9c2ff, 0x29401f, 0.85));
  const key = new THREE.DirectionalLight(0xfff3df, 2.6);
  key.position.set(-40, 70, 45); key.target.position.set(0, 0, 0);
  key.castShadow = true;
  const sm = LITE ? 1024 : 2048;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -62, right: 62, top: 44, bottom: -44, near: 20, far: 170 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xbcd0ff, 0.9); rim.position.set(50, 45, -40); scene.add(rim);

  /* ---- the ground beyond the pitch */
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(320, 240), new THREE.MeshStandardMaterial({ color: 0x1d3a1f, roughness: 1 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.02; g.receiveShadow = true; scene.add(g);
  }

  /* ---- the grass: mown stripes across the length, speckle, and a fine bump for the blades */
  const GL = P.HL * 2 + 12, GW = P.HW * 2 + 10; // the grass runs 6 m past the goal lines and 5 m past the touchlines
  {
    const tw = LITE ? 1024 : 2048, th = Math.round(tw * GW / GL);
    const map = canvasTex(tw, th, (g, w, h) => {
      const stripes = 20, mx = (6 / GL) * w; // stripes start at the goal lines
      g.fillStyle = '#2f7d32'; g.fillRect(0, 0, w, h);
      const sw = (w - 2 * mx) / stripes;
      for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? '#2b7530' : '#348a38'; g.fillRect(mx + i * sw, 0, sw + 1, h); }
      g.fillStyle = '#2a702d'; g.fillRect(0, 0, mx, h); g.fillRect(w - mx, 0, mx, h);
      // speckle and wear: worn patches in the goalmouths and down the middle
      const im = g.getImageData(0, 0, w, h), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 22; d[i] += n * 0.6; d[i + 1] += n; d[i + 2] += n * 0.4; }
      g.putImageData(im, 0, 0);
      const wear = (x, y, rx, ry, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(120,110,60,${a})`); gr.addColorStop(1, 'rgba(120,110,60,0)'); g.save(); g.scale(1, ry / rx); g.fillStyle = gr; g.beginPath(); g.arc(x, y * rx / ry, rx, 0, 7); g.fill(); g.restore(); };
      wear(mx + 6, h / 2, w * 0.05, h * 0.09, 0.35); wear(w - mx - 6, h / 2, w * 0.05, h * 0.09, 0.35); wear(w / 2, h / 2, w * 0.06, h * 0.05, 0.15);
    }, { aniso: maxAniso });
    const bump = canvasTex(256, 256, (g, w, h) => {
      const im = g.createImageData(w, h), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const v = 110 + Math.random() * 145; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      g.putImageData(im, 0, 0);
    }, { linear: true, repeat: [GL / 1.5, GW / 1.5], aniso: maxAniso });
    const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.6, roughness: 0.92, metalness: 0 });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(GL, GW), mat);
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
  }

  /* ---- the markings (12 cm lines) */
  {
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f0, roughness: 0.85, emissive: 0x2a2a2a, polygonOffset: true, polygonOffsetFactor: -2 });
    const lw = 0.12, y = 0.006, group = new THREE.Group();
    const rect = (x0, z0, x1, z1) => { // a line from (x0,z0) to (x1,z1), axis aligned
      const l = Math.hypot(x1 - x0, z1 - z0) + lw, m = new THREE.Mesh(new THREE.PlaneGeometry(x0 === x1 ? lw : l, x0 === x1 ? l : lw), lineMat);
      m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; group.add(m);
    };
    const ring = (x, z, r, a0 = 0, al = Math.PI * 2, seg = 96) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r - lw / 2, r + lw / 2, seg, 1, a0, al), lineMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; group.add(m);
    };
    const disc = (x, z, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); group.add(m); };
    const { HL, HW } = P;
    rect(-HL, -HW, HL, -HW); rect(-HL, HW, HL, HW); rect(-HL, -HW, -HL, HW); rect(HL, -HW, HL, HW); rect(0, -HW, 0, HW);
    ring(0, 0, P.circle); disc(0, 0, 0.16);
    for (const s of [-1, 1]) {
      const gx = s * HL, bx = s * (HL - P.boxL), sx = s * (HL - P.sixL);
      rect(bx, -P.boxW, bx, P.boxW); rect(gx, -P.boxW, bx, -P.boxW); rect(gx, P.boxW, bx, P.boxW);
      rect(sx, -P.sixW, sx, P.sixW); rect(gx, -P.sixW, sx, -P.sixW); rect(gx, P.sixW, sx, P.sixW);
      const px = s * (HL - P.spot); disc(px, 0, 0.16);
      const a = Math.acos((P.boxL - P.spot) / P.circle); // the D: the part of the circle round the spot outside the box
      ring(px, 0, P.circle, s > 0 ? Math.PI - a : -a, 2 * a, 48);
    }
    // corner arcs: a quarter circle into the pitch at each corner
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const start = sx > 0 ? (sz > 0 ? Math.PI : Math.PI / 2) : (sz > 0 ? -Math.PI / 2 : 0);
      ring(sx * HL, sz * HW, P.arc, start, Math.PI / 2, 16);
    }
    scene.add(group);
  }

  const updateNets = addGoals(scene, S);

  /* ---- corner flags */
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xffb21e, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x3a2200 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.55, 8), poleMat);
      pole.position.set(sx * P.HL, 0.775, sz * P.HW); pole.castShadow = true; scene.add(pole);
      const pivot = new THREE.Group(); pivot.position.set(sx * P.HL, 1.38, sz * P.HW);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3, 6, 1), flagMat); flag.position.x = 0.21; flag.castShadow = true;
      pivot.add(flag); scene.add(pivot); S.flags.push({ pivot, flag, ph: Math.random() * 6 });
    }
  }

  /* ---- LED boards round the pitch */
  {
    const text = '  THUDINEST  ·  FINAL WHISTLE  ·  COIMBATORE  ·  HOMESTAY & GAMES  ·  THUDINEST.COM  ·';
    const tex = canvasTex(2048, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0a1a4a'); gr.addColorStop(0.5, '#1c0f3d'); gr.addColorStop(1, '#0a1a4a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.font = '800 40px "Barlow Condensed", "Arial Narrow", sans-serif'; g.textBaseline = 'middle';
      let x = 10; const cols = ['#ffd23f', '#ffffff', '#3fe0a2', '#ff8a1f'];
      text.split('·').forEach((part, i) => { g.fillStyle = cols[i % cols.length]; g.fillText(part.trim() + '  ·  ', x, h / 2 + 2); x += g.measureText(part.trim() + '  ·  ').width; });
    }, { repeat: [1, 1], aniso: maxAniso });
    tex.wrapS = THREE.RepeatWrapping;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const frame = new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 0.6 });
    const board = (len, x, z, ry) => {
      const geo = new THREE.PlaneGeometry(len, 0.9);
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 22);
      const m = new THREE.Mesh(geo, mat); m.position.set(x, 0.55, z); m.rotation.y = ry; scene.add(m);
      const back = new THREE.Mesh(new THREE.BoxGeometry(len, 1.0, 0.12), frame); back.position.set(x, 0.5, z); back.rotation.y = ry;
      back.translateZ(-0.08); back.castShadow = true; scene.add(back);
    };
    board(104, 0, -(P.HW + 4.2), 0);
    board(104, 0, P.HW + 4.2, Math.PI);
    for (const s of [-1, 1]) { board(24, s * (P.HL + 5), -16, -s * Math.PI / 2); board(24, s * (P.HL + 5), 16, -s * Math.PI / 2); }
    S.boards.push(tex);
  }

  /* ---- stands with a crowd */
  {
    const conc = new THREE.MeshStandardMaterial({ color: 0x3b4253, roughness: 0.9 });
    const seatA = new THREE.MeshStandardMaterial({ color: 0x1c3f8f, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1e29, roughness: 0.7, metalness: 0.3 });
    const people = [];
    // a stand: rows climbing away from the pitch along the outward normal (nx, nz) of an edge of length len at d0
    const stand = (cx, cz, nx, nz, len, rows, d0, roof) => {
      const tx = -nz, tz = nx, rowD = 0.9, rowH = 0.55, base = 1.6;
      const g = new THREE.Group();
      for (let r = 0; r < rows; r++) {
        const d = d0 + r * rowD, h = base + r * rowH;
        const step = new THREE.Mesh(new THREE.BoxGeometry(len, h, rowD + 0.02), r % 6 === 5 ? conc : seatA);
        step.position.set(cx + nx * d, h / 2, cz + nz * d); step.rotation.y = Math.atan2(tx, tz) + Math.PI / 2; step.receiveShadow = !LITE; g.add(step);
        const per = Math.floor(len / (LITE ? 0.95 : 0.62));
        for (let i = 0; i < per; i++) {
          if (Math.random() < 0.12) continue; // empty seats
          const t = (i / per - 0.5) * len + rand(-0.12, 0.12);
          people.push({ x: cx + nx * d + tx * t, y: h, z: cz + nz * d + tz * t, ry: Math.atan2(-nx, -nz) });
        }
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(len, 4, 1), conc);
      const dl = d0 + rows * rowD + 0.5, hl = base + rows * rowH;
      back.position.set(cx + nx * dl, hl + 1, cz + nz * dl); back.rotation.y = Math.atan2(tx, tz) + Math.PI / 2; g.add(back);
      if (roof) {
        const rf = new THREE.Mesh(new THREE.BoxGeometry(len + 6, 0.5, rows * rowD + 6), roofMat);
        rf.position.set(cx + nx * (d0 + rows * rowD / 2), hl + 6, cz + nz * (d0 + rows * rowD / 2)); rf.rotation.y = Math.atan2(tx, tz) + Math.PI / 2; g.add(rf);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false }));
        strip.position.set(cx + nx * (d0 - 1.5), hl + 5.7, cz + nz * (d0 - 1.5)); strip.rotation.y = rf.rotation.y; g.add(strip);
      }
      scene.add(g);
    };
    const rowsLong = LITE ? 18 : 24, rowsEnd = LITE ? 14 : 18;
    stand(0, -(P.HW + 8), 0, -1, 118, rowsLong, 0, true);
    stand(0, P.HW + 8, 0, 1, 118, rowsLong, 0, false); // the camera side: no roof in the broadcast camera's way
    stand(-(P.HL + 9), 0, -1, 0, 76, rowsEnd, 0, false);
    stand(P.HL + 9, 0, 1, 0, 76, rowsEnd, 0, false);
    // the crowd: one instanced block each (body and head painted by the shader), bobbing; jumping for a goal
    // a body block and a head block in one geometry; aHead marks the head's vertices for the shader
    const geo = new THREE.BufferGeometry();
    {
      const parts = [[new THREE.BoxGeometry(0.46, 0.62, 0.3), 0.31, 0], [new THREE.BoxGeometry(0.22, 0.24, 0.22), 0.76, 1]];
      const pos = [], nor = [], head = [], idx = []; let off = 0;
      for (const [g, y, h] of parts) {
        g.translate(0, y, 0);
        const pa = g.attributes.position, na = g.attributes.normal;
        for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); head.push(h); }
        for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
        off += pa.count;
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('aHead', new THREE.Float32BufferAttribute(head, 1));
      geo.setIndex(idx);
    }
    const phase = new Float32Array(people.length);
    const mesh = new THREE.InstancedMesh(geo, null, people.length);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 }; sh.uniforms.uHype = { value: 0 };
      S.crowdMat = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPhase; attribute float aHead; uniform float uTime; uniform float uHype; varying float vHead;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vHead = aHead;
          float idle = sin(uTime * 1.7 + aPhase * 6.0) * 0.03;
          float jump = max(0.0, sin(uTime * (7.0 + fract(aPhase * 7.0) * 3.0) + aPhase * 30.0)) * 0.45 * uHype;
          transformed.y += idle + jump;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHead;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.34, 0.24), vHead);');
    };
    mesh.material = mat;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(1, 1, 1), col = new THREE.Color();
    const shirts = [0x2350b8, 0xffc53d, 0xf2f2f2, 0x17784a, 0xd6162f, 0xff8a1f, 0x222833, 0x5b8cff, 0x8a2be2, 0x22b5c9];
    people.forEach((p, i) => {
      q.setFromAxisAngle(new V3(0, 1, 0), p.ry); sc.setScalar(rand(0.9, 1.08));
      m4.compose(new V3(p.x, p.y, p.z), q, sc); mesh.setMatrixAt(i, m4);
      col.setHex(shirts[(Math.random() * shirts.length) | 0]).multiplyScalar(rand(0.6, 1.0)); mesh.setColorAt(i, col);
      phase[i] = Math.random();
    });
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false;
    scene.add(mesh);
    S.crowdCount = people.length;
  }

  /* ---- floodlight towers */
  {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x5d6575, roughness: 0.6, metalness: 0.5 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6dc, toneMapped: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (P.HL + 16), z = sz * (P.HW + 24), h = 42;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.9, h, 10), towerMat); t.position.set(x, h / 2, z); scene.add(t);
      const head = new THREE.Group(); head.position.set(x, h + 1.5, z); head.lookAt(0, 0, 0);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(7, 4.4, 0.6), towerMat); head.add(frame);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const l = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.1), lampMat); l.position.set(-2.6 + i * 1.73, -1.4 + j * 1.4, 0.32); head.add(l);
      }
      scene.add(head);
    }
  }

  S.update = (dt) => {
    S.time += dt;
    S.hype = Math.max(0, S.hype - dt * 0.18);
    if (S.crowdMat) { S.crowdMat.uniforms.uTime.value = S.time; S.crowdMat.uniforms.uHype.value = clamp(S.hype, 0, 1); }
    for (const tex of S.boards) tex.offset.x = (S.time * 0.035) % 1;
    for (const f of S.flags) f.pivot.rotation.y = Math.sin(S.time * 1.3 + f.ph) * 0.5 + 0.6;
    updateNets(dt);
  };
  return S;
}

/* the goals (posts, bar, stanchions) and their nets, line grids that bulge when the ball goes in; sized from P */
export function addGoals(scene, S) {
  const lerp = (a, b, t) => a + (b - a) * t;
  /* ---- goals: posts and bar, the stanchions behind, and the nets (line grids that bulge when the ball goes in) */
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1, emissive: 0x222222 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.6 });
  const netMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  for (const s of [-1, 1]) {
    const g = new THREE.Group(), gx = s * (P.HL + P.post);
    const cyl = (r, h, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), mat); m.castShadow = true; return m; };
    for (const t of [-1, 1]) { const p = cyl(P.post, P.goalH + P.post, postMat); p.position.set(gx, (P.goalH + P.post) / 2, t * (P.goalW + P.post)); g.add(p); }
    const bar = cyl(P.post, 2 * (P.goalW + 2 * P.post), postMat); bar.rotation.x = Math.PI / 2; bar.position.set(gx, P.goalH + P.post / 2, 0); g.add(bar);
    const bx = s * (P.HL + P.goalD), backTop = P.goalH * 0.78;
    for (const t of [-1, 1]) {
      const st = cyl(0.03, backTop, backMat); st.position.set(bx, backTop / 2, t * P.goalW); g.add(st);
      const top = cyl(0.03, P.goalD, backMat); top.rotation.z = Math.PI / 2; top.position.set(s * (P.HL + P.goalD / 2), backTop + (P.goalH - backTop) / 2, t * P.goalW);
      top.rotation.z = Math.PI / 2 - s * Math.atan2(P.goalH - backTop, P.goalD); g.add(top);
      const foot = cyl(0.03, P.goalD, backMat); foot.rotation.z = Math.PI / 2; foot.position.set(s * (P.HL + P.goalD / 2), 0.03, t * P.goalW); g.add(foot);
    }
    const tb = cyl(0.03, 2 * P.goalW, backMat); tb.rotation.x = Math.PI / 2; tb.position.set(bx, backTop, 0); g.add(tb);
    // the nets: back, roof and sides, each a grid of points (u, v) joined to their neighbours
    const panels = [
      { name: 'back', nu: 30, nv: 10, at: (u, v, o) => o.set(bx, v * backTop, (u - 0.5) * 2 * P.goalW), n: new V3(s, 0, 0) },
      { name: 'roof', nu: 30, nv: 8, at: (u, v, o) => o.set(s * (P.HL + v * P.goalD), lerp(P.goalH, backTop, v), (u - 0.5) * 2 * P.goalW), n: new V3(0, 1, 0) },
      { name: 'left', nu: 8, nv: 10, at: (u, v, o) => o.set(s * (P.HL + u * P.goalD), v * lerp(P.goalH, backTop, u), -P.goalW), n: new V3(0, 0, -1) },
      { name: 'right', nu: 8, nv: 10, at: (u, v, o) => o.set(s * (P.HL + u * P.goalD), v * lerp(P.goalH, backTop, u), P.goalW), n: new V3(0, 0, 1) },
    ];
    const net = { side: s, panels: [] };
    for (const pn of panels) {
      const pts = [], base = [], tmp = new V3();
      for (let j = 0; j <= pn.nv; j++) for (let i = 0; i <= pn.nu; i++) { pn.at(i / pn.nu, j / pn.nv, tmp); base.push(tmp.x, tmp.y, tmp.z); }
      const idx = [];
      const id = (i, j) => j * (pn.nu + 1) + i;
      for (let j = 0; j <= pn.nv; j++) for (let i = 0; i <= pn.nu; i++) { if (i < pn.nu) idx.push(id(i, j), id(i + 1, j)); if (j < pn.nv) idx.push(id(i, j), id(i, j + 1)); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3)); geo.setIndex(idx);
      const ls = new THREE.LineSegments(geo, netMat); g.add(ls);
      net.panels.push({ ...pn, geo, base: Float32Array.from(base), off: new Float32Array(base.length / 3), vel: new Float32Array(base.length / 3), active: false });
    }
    S.nets.push(net);
    scene.add(g);
  }
  // push a net out where the ball hit it (p: world point, amt: metres)
  S.bulge = (side, p, amt) => {
    const net = S.nets.find((n) => n.side === side); if (!net) return;
    for (const pn of net.panels) {
      const b = pn.base;
      for (let k = 0; k < pn.off.length; k++) {
        const dx = b[k * 3] - p.x, dy = b[k * 3 + 1] - p.y, dz = b[k * 3 + 2] - p.z, d2 = dx * dx + dy * dy + dz * dz;
        const f = Math.exp(-d2 / 0.7);
        if (f > 0.01) { pn.vel[k] += amt * f * 9; pn.active = true; }
      }
    }
  };
  function updateNets(dt) {
    for (const net of S.nets) for (const pn of net.panels) {
      if (!pn.active) continue;
      const pos = pn.geo.attributes.position.array, b = pn.base; let e = 0;
      for (let k = 0; k < pn.off.length; k++) {
        // a damped spring; the edges are tied to the frame
        pn.vel[k] += (-60 * pn.off[k] - 7 * pn.vel[k]) * dt; pn.off[k] += pn.vel[k] * dt; e += Math.abs(pn.off[k]) + Math.abs(pn.vel[k]) * 0.1;
        const o = clamp(pn.off[k], -0.25, 0.7);
        pos[k * 3] = b[k * 3] + pn.n.x * o; pos[k * 3 + 1] = b[k * 3 + 1] + pn.n.y * o * 0.4; pos[k * 3 + 2] = b[k * 3 + 2] + pn.n.z * o;
      }
      pn.geo.attributes.position.needsUpdate = true;
      if (e < 0.002) { pn.active = false; pn.off.fill(0); pn.vel.fill(0); for (let k = 0; k < pos.length; k++) pos[k] = b[k]; }
    }
  }

  return updateNets;
}
