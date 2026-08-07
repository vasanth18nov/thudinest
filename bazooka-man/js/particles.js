// Bazooka Man — lightweight particle system (smoke/sparks) and screen shake.
// Kept separate from Entities.Debris: debris are physical wreckage chunks,
// particles here are pure visual dressing with no collision.
'use strict';

const Particles = (() => {
  let list = [];
  let craters = [];
  let shakeMag = 0;
  let reducedMotion = false;
  const MAX_CRATERS = 10; // oldest scorch marks fall off so the ground doesn't accumulate forever

  function setReducedMotion(v) { reducedMotion = v; }

  // A persistent scorch/crater decal left on the ground by a near-ground
  // explosion — unlike sparks/smoke this doesn't decay over time, it just
  // caps how many are kept around. Crack angles are randomized once at
  // creation (not per-frame) so the mark doesn't visually jitter.
  function crater(x, radius) {
    const cracks = [];
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      cracks.push({ angle: Math.random() * Math.PI * 2, len: radius * (0.4 + Math.random() * 0.5) });
    }
    craters.push({ x, rx: radius * 0.85, ry: radius * 0.26, cracks });
    if (craters.length > MAX_CRATERS) craters.shift();
  }

  function drawCraters(ctx) {
    for (const cr of craters) {
      ctx.save();
      ctx.translate(cr.x, World.GROUND_Y);
      ctx.fillStyle = 'rgba(10,8,6,0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, cr.rx, cr.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,8,6,0.4)';
      ctx.lineWidth = 2;
      for (const cr2 of cr.cracks) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(cr2.angle) * cr2.len, Math.sin(cr2.angle) * cr2.len * 0.3);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

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

  function clear() { list = []; craters = []; shakeMag = 0; }
  function count() { return list.length; }

  return {
    explosion, addShake, getShakeOffset, update, draw, clear, count, setReducedMotion,
    crater, drawCraters,
  };
})();
