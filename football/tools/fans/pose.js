import { THREE, V3 } from '../../js/util.js';
import { calibrate, setClips, Body, ORDER } from '../../js/rig.js';
export { THREE, V3, ORDER };
export const LEG = { Left: ['LeftUpLeg', 'LeftLeg', 'LeftFoot'], Right: ['RightUpLeg', 'RightLeg', 'RightFoot'] };
export const SHIN = { Left: ['LeftLeg', 'LeftFoot'], Right: ['RightLeg', 'RightFoot'] };
const loader = new THREE.GLTFLoader();
export async function loadAll(names) {
  setClips(await (await fetch('../../../cricket/players/moves.json')).json());
  const out = {};
  for (const n of names) out[n] = await loader.loadAsync(`../../../cricket/players/${n}.glb`);
  return out;
}
/* pose: { clip, t, seat: bool, arms: [l,r] extra } */
export function makeBody(scene, gltf, h = 1.75) {
  const K = calibrate(gltf, h);
  const b = new Body(scene, K, null);
  const kneeH = (() => { const v = new V3(); b.B.LeftLeg.getWorldPosition(v); return v.y; })();
  return { b, K, kneeH };
}
export function setPose(o, ps) {
  const { b, K } = o; const R = new V3(-1, 0, 0), F = new V3(0, 0, 1);
  b.root.position.set(0, 0, 0); b.root.rotation.set(0, 0, 0);
  b.play(ps.clip, { from: ps.t }); b.clipPose({ speed: 0 }, 0); b.react = null;
  let hipY = b.hipsY;
  if (ps.seat) {
    for (const s of ['Left', 'Right']) { b.rot(LEG[s], R, Math.PI / 2 * 0.97); b.rot(SHIN[s], R, -Math.PI / 2 * 0.95); }
    hipY = o.kneeH + 0.02;
  }
  if (ps.lap) { // hands rest on the thighs
    b.rot(['LeftArm', 'LeftForeArm', 'LeftHand'], R, 0.35); b.rot(['RightArm', 'RightForeArm', 'RightHand'], R, 0.35);
    b.rot(['LeftForeArm', 'LeftHand'], R, 0.9); b.rot(['RightForeArm', 'RightHand'], R, 0.9);
    b.rot(['LeftArm', 'LeftForeArm', 'LeftHand'], F, 0.12); b.rot(['RightArm', 'RightForeArm', 'RightHand'], F, -0.12);
  }
  if (ps.lean) b.rot(['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'], R, ps.lean);
  const AX = { R, F, U: new V3(0, 1, 0) };
  for (const [bones, ax, ang] of ps.ops || []) b.rot(bones.split(' '), AX[ax], ang);
  if (ps.hip) hipY += ps.hip;
  b.applyT(hipY); b.root.updateMatrixWorld(true);
}
