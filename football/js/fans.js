/* The supporters: five real people (Mixamo characters from cricket/players), baked into football/models: each cut
   to about 1,000 triangles, their textures packed into one atlas, and six poses stored per vertex (seated, two clapping frames, hands on head, and two
   frames of standing up and jumping with arms raised). The vertex shader blends the poses, so a few hundred people
   cost a handful of draw calls; each person has his own timing, and some their own colour of shirt.
   Seats: [{ x, y, z, ry }] with y the height of the seat and ry the way they face. */
import { THREE } from './util.js';

let DATA = null;
function load() {
  if (DATA) return DATA;
  const base = new URL('../models/', import.meta.url);
  DATA = Promise.all([
    fetch(new URL('fans.json', base)).then((r) => r.json()),
    fetch(new URL('fans.bin', base)).then((r) => r.arrayBuffer()),
    new THREE.TextureLoader().loadAsync(new URL('fans.webp', base).href),
  ]).then(([meta, buf, atlas]) => {
    atlas.flipY = false; atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4; atlas.needsUpdate = true;
    const chars = meta.chars.map((c) => {
      const nv = c.nv, inv = 1 / meta.scale;
      const p16 = new Int16Array(buf, c.pos, nv * 3 * 6), n8 = new Int8Array(buf, c.nrm, nv * 3 * 2);
      const pos = []; for (let k = 0; k < 6; k++) { const a = new Float32Array(nv * 3); for (let i = 0; i < nv * 3; i++) a[i] = p16[k * nv * 3 + i] * inv; pos.push(a); }
      const nrm = []; for (let k = 0; k < 2; k++) { const a = new Float32Array(nv * 3); for (let i = 0; i < nv * 3; i++) a[i] = n8[k * nv * 3 + i] / 127; nrm.push(a); }
      const u16 = new Uint16Array(buf, c.uv, nv * 2), uv = new Float32Array(nv * 2); for (let i = 0; i < nv * 2; i++) uv[i] = u16[i] / 65535;
      const idx = new Uint16Array(buf, c.idx, c.ni).slice();
      return { name: c.name, pos, nrm, uv, idx };
    });
    return { chars, atlas };
  });
  return DATA;
}

function geometryOf(c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(c.pos[0], 3));
  g.setAttribute('normal', new THREE.BufferAttribute(c.nrm[0], 3));
  g.setAttribute('uv', new THREE.BufferAttribute(c.uv, 2));
  for (let k = 1; k < 6; k++) g.setAttribute(`aP${k}`, new THREE.BufferAttribute(c.pos[k], 3));
  g.setAttribute('aN2', new THREE.BufferAttribute(c.nrm[1], 3));
  g.setIndex(new THREE.BufferAttribute(c.idx, 1));
  return g;
}

// clothes in colours people wear to a game (the team colours most), and many as they came
const SHIRTS = [0x1f4fd0, 0x1f4fd0, 0x1f4fd0, 0xffc53d, 0xffc53d, 0x23345e, 0x3d5a80, 0x7a2335, 0x5b6236, 0x2d2f36, 0xc0262d, 0x1d6f6a, 0x8a8f99, 0xe8e4da];

/* returns { group, uniforms } at once; the people appear when their data has loaded */
export function buildFans(parent, seats, o = {}) {
  const group = new THREE.Group(); parent.add(group);
  const U = { uTime: { value: 0 }, uHype: { value: 0 }, uGroan: { value: 0 }, uClap: { value: 0 } };
  load().then(({ chars, atlas }) => {
    const mat = new THREE.MeshLambertMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4; attribute vec3 aP5; attribute vec3 aN2;
          uniform float uTime; uniform float uHype; uniform float uGroan; uniform float uClap; varying float vTint;`)
        .replace('#include <beginnormal_vertex>', `
          // each person's own timing, from where he sits
          float ph = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
          float r2 = fract(ph * 7.31 + 0.17), r3 = fract(ph * 13.7 + 0.5);
          float wc = smoothstep(ph * 0.35, ph * 0.35 + 0.22, uHype * (0.75 + 0.5 * r3));
          float wg = smoothstep(r2 * 0.45, r2 * 0.45 + 0.25, uGroan * (0.6 + 0.6 * r3)) * (1.0 - wc);
          float wl = smoothstep(r3 * 0.5, r3 * 0.5 + 0.25, uClap) * (1.0 - wc) * (1.0 - wg);
          vec3 objectNormal = normalize(mix(normal, aN2, wc));
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif`)
        .replace('#include <begin_vertex>', `
          float clap = pow(0.5 + 0.5 * sin(uTime * (8.5 + r2 * 3.0) + ph * 40.0), 3.0);
          float jump = 0.5 + 0.5 * sin(uTime * (5.2 + ph * 2.4) + ph * 30.0);
          vec3 transformed = position;
          transformed = mix(transformed, mix(aP1, aP2, clap), wl);
          transformed = mix(transformed, aP3, wg);
          transformed = mix(transformed, mix(aP5, aP4, jump), wc);
          // alive while seated: breathing, a lean to follow the play
          float life = 1.0 - wc;
          transformed.x += sin(uTime * 0.6 + ph * 20.0) * 0.025 * max(transformed.y + 0.3, 0.0) * life;
          transformed.z += sin(uTime * 0.43 + ph * 11.0) * 0.018 * max(transformed.y, 0.0) * life;
          transformed.y += sin(uTime * 1.6 + ph * 9.0) * 0.004;
          vTint = 1.0;`)
        .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vTint = 1.0 - step(2.97, instanceColor.r + instanceColor.g + instanceColor.b);\n#endif');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vTint;')
        .replace('#include <color_fragment>', `
          // the atlas alpha marks the clothes (about 0.65) from skin and hair (1): only the clothes take the colour
          #if defined( USE_COLOR_ALPHA ) || defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
            float cloth = step(0.5, diffuseColor.a) * (1.0 - step(0.85, diffuseColor.a)) * vTint;
            float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
            // the new colour carries the cloth's own folds and shading
            diffuseColor.rgb = mix(diffuseColor.rgb, vColor.rgb * (lum * 1.55 + 0.06), cloth * 0.8);
          #endif
          if (diffuseColor.a > 0.5) diffuseColor.a = 1.0;`);
    };
    // deal the seats out among the people
    const per = chars.map(() => []);
    seats.forEach((s, i) => per[(i * 5 + ((i * 2654435761) >>> 28)) % chars.length].push(s));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    chars.forEach((c, ci) => {
      const list = per[ci]; if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometryOf(c), mat, list.length);
      list.forEach((s, i) => {
        q.setFromAxisAngle(up, s.ry + (Math.random() - 0.5) * 0.35);
        const k = 0.94 + Math.random() * 0.1; sc.set(k, k, k);
        m4.compose(v.set(s.x, s.y, s.z), q, sc); mesh.setMatrixAt(i, m4);
        if (Math.random() < 0.5) col.setRGB(1, 1, 1); else col.setHex(SHIRTS[(Math.random() * SHIRTS.length) | 0]).multiplyScalar(0.75 + Math.random() * 0.3);
        mesh.setColorAt(i, col);
      });
      mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = !!o.shadows;
      group.add(mesh);
    });
  }).catch((e) => console.warn('supporters', e));
  return { group, uniforms: U };
}
