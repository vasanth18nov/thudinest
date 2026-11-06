/* Controls. Keyboard: WASD or arrows to move, Shift sprint, Space hold and release to shoot (the longer the harder),
   J pass, K through ball, L tackle (on the ball: cross), E switch player, Esc or P pause, C camera.
   Touch: a floating stick on the left half of the screen; Shoot (hold), Pass, Through, Sprint (hold) and
   Tackle / Cross on the right. Taps are latched until the game has read them. */
import { $ } from './util.js';

export const Input = {
  x: 0, y: 0, // stick: x right, y up (screen), length 0..1
  sprint: false, charging: false, charge: 0,
  passTap: false, throughTap: false, lobTap: false, tackleTap: false, switch: false, shotRelease: null,
  pauseTap: false, camTap: false, anyKey: false,
  keys: new Set(),
  touch: false,
};
const I = Input;
const CHARGE_TIME = 0.95;

export function initInput(onFirst) {
  const down = (e) => {
    const k = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k) && !(e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) e.preventDefault();
    if (e.repeat) return;
    I.keys.add(k); I.anyKey = true; if (onFirst) onFirst();
    if (k === 'Space') { I.charging = true; I.charge = 0; }
    if (k === 'KeyJ') I.passTap = true;
    if (k === 'KeyK') I.throughTap = true;
    if (k === 'KeyL') { I.tackleTap = true; I.lobTap = true; }
    if (k === 'KeyE' || k === 'KeyQ') I.switch = true;
    if (k === 'Escape' || k === 'KeyP') I.pauseTap = true;
    if (k === 'KeyC') I.camTap = true;
  };
  const up = (e) => {
    const k = e.code; I.keys.delete(k);
    if (k === 'Space' && I.charging) { I.charging = false; I.shotRelease = Math.max(0.12, I.charge); I.charge = 0; }
  };
  addEventListener('keydown', down);
  addEventListener('keyup', up);
  addEventListener('blur', () => { I.keys.clear(); I.charging = false; I.charge = 0; I.sprint = false; });

  /* ---- touch */
  const zone = $('stickZone'), base = $('stickBase'), knob = $('stickKnob');
  let sid = null, sx = 0, sy = 0;
  const R = 58;
  zone.addEventListener('pointerdown', (e) => {
    if (sid !== null) return;
    sid = e.pointerId; sx = e.clientX; sy = e.clientY; zone.setPointerCapture(sid);
    base.style.transform = `translate(${sx - 70}px, ${sy - 70}px)`; base.classList.add('on'); knob.style.transform = 'translate(0px, 0px)';
    I.touch = true; if (onFirst) onFirst();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== sid) return;
    let dx = e.clientX - sx, dy = e.clientY - sy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.min(1, l / R), on = m < 0.18 ? 0 : 1; // a small dead zone at the centre
    I.sx = (dx / R) * on; I.sy = (-dy / R) * on;
  });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; I.sx = 0; I.sy = 0; base.classList.remove('on'); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  const btn = (id, onDown, onUp) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('down'); I.touch = true; if (onFirst) onFirst(); onDown && onDown(); });
    const off = (e) => { el.classList.remove('down'); onUp && onUp(e); };
    el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off);
  };
  btn('bShoot', () => { I.charging = true; I.charge = 0; }, () => { if (I.charging) { I.charging = false; I.shotRelease = Math.max(0.12, I.charge); I.charge = 0; } });
  btn('bPass', () => { I.passTap = true; I.switchByPass = true; });
  btn('bThrough', () => { I.throughTap = true; });
  btn('bSprint', () => { I.touchSprint = true; }, () => { I.touchSprint = false; });
  btn('bTackle', () => { I.tackleTap = true; I.lobTap = true; });
}

/* each frame: the stick and the shot charge */
export function pollInput(dt) {
  let x = 0, y = 0;
  const K = I.keys;
  if (K.has('KeyA') || K.has('ArrowLeft')) x -= 1;
  if (K.has('KeyD') || K.has('ArrowRight')) x += 1;
  if (K.has('KeyW') || K.has('ArrowUp')) y += 1;
  if (K.has('KeyS') || K.has('ArrowDown')) y -= 1;
  if (I.sx || I.sy) { x = I.sx; y = I.sy; }
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  I.x = x; I.y = y;
  I.sprint = K.has('ShiftLeft') || K.has('ShiftRight') || !!I.touchSprint;
  if (I.charging) { I.charge = Math.min(1, I.charge + dt / CHARGE_TIME); if (I.charge >= 1 && (I.chargeHeld = (I.chargeHeld || 0) + dt) > 0.35) { I.charging = false; I.shotRelease = 1; I.charge = 0; I.chargeHeld = 0; } }
  else I.chargeHeld = 0;
}
export function consumeTaps() {
  I.passTap = I.throughTap = I.lobTap = I.tackleTap = I.switch = false; I.shotRelease = null; I.switchByPass = false;
}
