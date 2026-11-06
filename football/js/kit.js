/* Team kits on the footballer model. His own kit is white and grey with dark trim; each texel of it is recoloured by
   which garment it belongs to, found from the mesh itself: every triangle is painted into a UV mask by the bone that
   carries it (spine and arms: shirt; hips and thighs: shorts; shins: socks). Skin, face, hair and boots are left as
   they are, because only the low-saturation cloth texels change. */
import { THREE } from './util.js';

const REGION = { shirt: [255, 0, 0], shorts: [0, 255, 0], socks: [0, 0, 255] };
function regionOfBone(name) {
  const n = name.replace(/^mixamorig\d*:?/, '');
  if (/^(Spine|Neck|LeftShoulder|RightShoulder|LeftArm|RightArm|LeftForeArm|RightForeArm)/.test(n)) return 'shirt';
  if (/^(Hips|LeftUpLeg|RightUpLeg)/.test(n)) return 'shorts';
  if (/^(LeftLeg|RightLeg)$/.test(n)) return 'socks';
  return null;
}

let MASK = null; // { data, size } built once from the model
function buildMask(gltf) {
  const size = 512, c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  gltf.scene.traverse((o) => {
    if (!o.isSkinnedMesh || o.material.name !== 'Ch38_body') return;
    const geo = o.geometry, uv = geo.attributes.uv, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index;
    const bones = o.skeleton.bones;
    const regionOfVertex = (v) => {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > bw) { bw = w; best = si.getComponent(v, k); } }
      return regionOfBone(bones[best].name);
    };
    const tri = idx ? idx.count / 3 : uv.count / 3;
    for (let t = 0; t < tri; t++) {
      const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, cc = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      const r = regionOfVertex(a) || regionOfVertex(b) || regionOfVertex(cc);
      if (!r) continue;
      const col = REGION[r];
      g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.strokeStyle = g.fillStyle; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(uv.getX(a) * size, uv.getY(a) * size); g.lineTo(uv.getX(b) * size, uv.getY(b) * size); g.lineTo(uv.getX(cc) * size, uv.getY(cc) * size);
      g.closePath(); g.fill(); g.stroke();
    }
  });
  MASK = { data: g.getImageData(0, 0, size, size).data, size };
}

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
/* kit: { shirt, shorts, socks, trim } as 0xRRGGBB */
export function kitMaterials(gltf, kit) {
  if (!MASK) buildMask(gltf);
  let body = null, hair = null;
  gltf.scene.traverse((o) => { if (o.isMesh) { if (o.material.name === 'Ch38_body') body = o.material; if (o.material.name === 'Ch38_hair') hair = o.material; } });
  const img = body.map.image, W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, W, H), d = id.data, M = MASK.data, ms = MASK.size;
  // the printed 7 on his back goes: each row of it is filled with the plain cloth just beside it
  {
    const sx = (v) => Math.round((v / 1024) * W), sy = (v) => Math.round((v / 1024) * H);
    for (let y = sy(NUM.y0 * 1024 - 4); y < sy((NUM.y0 + NUM.h) * 1024 + 4); y++) {
      const src = (y * W + sx(522)) * 4;
      for (let x = sx(536); x < sx(598); x++) { const i = (y * W + x) * 4; d[i] = d[src]; d[i + 1] = d[src + 1]; d[i + 2] = d[src + 2]; }
    }
  }
  const cols = { shirt: rgb(kit.shirt), shorts: rgb(kit.shorts), socks: rgb(kit.socks) }, trim = rgb(kit.trim);
  for (let y = 0; y < H; y++) {
    const my = ((y * ms) / H) | 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, mi = (my * ms + (((x * ms) / W) | 0)) * 4;
      const reg = M[mi] > 128 ? 'shirt' : M[mi + 1] > 128 ? 'shorts' : M[mi + 2] > 128 ? 'socks' : null;
      if (!reg) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      const lum = (r * 0.3 + gg * 0.59 + b * 0.11) / 255, sat = mx ? (mx - mn) / mx : 0;
      if (sat > 0.2) continue; // skin and printed colour stay
      const base = cols[reg];
      const tw = Math.max(0, Math.min(1, (lum - 0.22) / 0.3)); // dark trim to the trim colour, light cloth to the kit
      const shade = Math.min(1.15, 0.35 + lum * 0.85);
      for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, (trim[k] * (1 - tw) + base[k] * tw) * shade);
    }
  }
  g.putImageData(id, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.flipY = false; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map, normalMap: body.normalMap, roughness: 0.78, metalness: 0, color: 0xdedede });
  mat.name = 'Ch38_body';
  return { Ch38_body: mat, Ch38_hair: hair };
}

/* the shirt number: where it sits on the back in the texture (UV), printed upside down as the 7 was */
export const NUM = { x0: 515 / 1024, y0: 190 / 1024, w: 100 / 1024, h: 110 / 1024 };
function numberTexture(n) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(0, 128); g.scale(1, -1); // upside down, like the texture
  const txt = String(n);
  g.font = '800 104px "Arial Narrow", "Roboto Condensed", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(txt).width, sx = Math.min(1, 118 / w) * (txt.length > 1 ? 1 : 0.95);
  g.save(); g.translate(64, 66); g.scale(sx * 0.86, 1); g.fillStyle = '#fff'; g.fillText(txt, 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.anisotropy = 4;
  return t;
}
/* one player's shirt: the team's kit with his own number painted on the back (the kit texture is shared) */
export function numberedMaterial(base, num, color) {
  const m = base.clone();
  const tex = numberTexture(num), col = new THREE.Color(color);
  m.userData.numTex = tex;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.numMap = { value: tex }; sh.uniforms.numCol = { value: col };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D numMap; uniform vec3 numCol;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec2 q = (vMapUv - vec2(${NUM.x0.toFixed(5)}, ${NUM.y0.toFixed(5)})) / vec2(${NUM.w.toFixed(5)}, ${NUM.h.toFixed(5)});
          if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) diffuseColor.rgb = mix(diffuseColor.rgb, numCol * 0.92, texture2D(numMap, q).a);
        }`);
  };
  m.customProgramCacheKey = () => 'fw-shirt-number';
  return m;
}
