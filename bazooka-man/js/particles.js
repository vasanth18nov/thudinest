// Bazooka Man — lightweight particle system (smoke/sparks) and screen shake.
// Kept separate from Entities.Debris: debris are physical wreckage chunks,
// particles here are pure visual dressing with no collision.
'use strict';

const Particles = (() => {
  let list = [];
  let shakeMag = 0;
  let reducedMotion = false;

  function setReducedMotion(v) { reducedMotion = v; }

  function spawnSpark(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 380;
    list.push({
      type: 'spark', x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1, decay: 1.8 + Math.random() * 1.2,
      size: 2 + Math.random() * 2,
    });
  }

  function spawnSmoke(x, y, scale = 1) {
    list.push({
      type: 'smoke', x, y,
      vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40,
      life: 1, decay: 0.55 + Math.random() * 0.35,
      size: (18 + Math.random() * 14) * scale,
      grow: 40 * scale,
    });
  }

  function explosion(x, y, radius) {
    const count = reducedMotion ? 6 : 18;
    const smokeCount = reducedMotion ? 3 : 8;
    for (let i = 0; i < count; i++) spawnSpark(x, y);
    for (let i = 0; i < smokeCount; i++) spawnSmoke(x, y, radius / 90);
    addShake(Math.min(18, radius / 5));
  }

  function addShake(mag) {
    if (reducedMotion) return;
    shakeMag = Math.min(24, shakeMag + mag);
  }

  function getShakeOffset() {
    if (shakeMag <= 0.05) { shakeMag = 0; return { x: 0, y: 0 }; }
    const x = (Math.random() - 0.5) * shakeMag;
    const y = (Math.random() - 0.5) * shakeMag;
    shakeMag *= 0.88;
    return { x, y };
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'spark') p.vy += Physics.GRAVITY * 0.5 * dt;
      if (p.type === 'smoke') { p.size += p.grow * dt; p.vx *= 0.96; }
      p.life -= p.decay * dt;
      if (p.life <= 0) list.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const p of list) {
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.type === 'spark') {
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#8a8a92';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function clear() { list = []; shakeMag = 0; }
  function count() { return list.length; }

  return { explosion, addShake, getShakeOffset, update, draw, clear, count, setReducedMotion };
})();
