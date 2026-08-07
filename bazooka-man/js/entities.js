// Bazooka Man — entity factories and their per-frame behavior.
//
// Every level object is a plain data object tagged with `kind`. Static
// obstacles (platform/crate/barrel/glass) never move on their own; the only
// motion they get is a short "shake" nudge when a nearby explosion doesn't
// kill them, and a spray of Debris fragments when it does. Only `target`
// (the enemies) and `rocket` (the player's shots) get real per-frame
// physics integration, which keeps the simulation cheap.
'use strict';

const Entities = (() => {
  let uidCounter = 1;
  const uid = () => uidCounter++;

  function createPlatform(x, y, w, h) {
    return { kind: 'platform', id: uid(), x, y, w, h, solid: true };
  }

  function createCrate(x, y, w, h, opts = {}) {
    const hp = opts.hp ?? 30;
    return {
      kind: 'crate', id: uid(), x, y, w, h, hp, maxHp: hp,
      isObjective: !!opts.isObjective, solid: true, alive: true,
      shakeX: 0, shakeY: 0, shakeT: 0,
    };
  }

  function createBarrel(x, y, w, h, opts = {}) {
    const hp = opts.hp ?? 20;
    return {
      kind: 'barrel', id: uid(), x, y, w, h, hp, maxHp: hp,
      isObjective: !!opts.isObjective, solid: true, alive: true,
      shakeX: 0, shakeY: 0, shakeT: 0, exploded: false,
    };
  }

  function createGlass(x, y, w, h, opts = {}) {
    const hp = opts.hp ?? 8;
    return {
      kind: 'glass', id: uid(), x, y, w, h, hp, maxHp: hp,
      isObjective: !!opts.isObjective, solid: true, alive: true,
      shakeX: 0, shakeY: 0, shakeT: 0,
    };
  }

  // A "target" is the enemy bot the player is trying to destroy. Circular
  // hitbox; optionally patrols back and forth between moveRange.min/max.
  function createTarget(x, y, r, opts = {}) {
    return {
      kind: 'target', id: uid(), x, y, r, hp: opts.hp ?? 1, maxHp: opts.hp ?? 1,
      isObjective: true, alive: true,
      moveRange: opts.moveRange || null, // {min, max, speed}
      dir: 1,
      knockVX: 0, knockVY: 0, angle: 0, vAngle: 0,
    };
  }

  function createRocket(x, y, vx, vy, kind = 'standard') {
    return {
      kind: 'rocket', id: uid(), x, y, vx, vy, r: 7,
      shotKind: kind, // 'standard' | 'bounce'
      bouncesLeft: kind === 'bounce' ? 3 : 0,
      alive: true, age: 0, trail: [],
    };
  }

  function createDebris(x, y, color, opts = {}) {
    const angle = opts.angle ?? Math.random() * Math.PI * 2;
    const speed = opts.speed ?? (120 + Math.random() * 220);
    return {
      kind: 'debris', x, y, color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 120,
      size: opts.size ?? (3 + Math.random() * 5),
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 10,
      life: 1, decay: opts.decay ?? (0.5 + Math.random() * 0.4),
    };
  }

  function updateTarget(t, dt) {
    if (!t.alive) return;
    // Knockback from a nearby (non-lethal) explosion settles out quickly.
    if (Math.abs(t.knockVX) > 1 || Math.abs(t.knockVY) > 1) {
      t.x += t.knockVX * dt;
      t.y += t.knockVY * dt;
      t.knockVX *= 0.9;
      t.knockVY *= 0.9;
      t.angle += t.vAngle * dt;
      t.vAngle *= 0.92;
      if (t.y > World.GROUND_Y - t.r) { t.y = World.GROUND_Y - t.r; t.knockVY = 0; }
      return;
    }
    if (t.moveRange) {
      t.x += t.dir * t.moveRange.speed * dt;
      if (t.x > t.moveRange.max) { t.x = t.moveRange.max; t.dir = -1; }
      if (t.x < t.moveRange.min) { t.x = t.moveRange.min; t.dir = 1; }
    }
  }

  function updateDebris(d, dt) {
    d.vy += Physics.GRAVITY * 0.6 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.rot += d.vRot * dt;
    if (d.y > World.GROUND_Y) { d.y = World.GROUND_Y; d.vy *= -0.35; d.vx *= 0.7; }
    d.life -= d.decay * dt;
  }

  function updateShake(entity, dt) {
    if (entity.shakeT > 0) {
      entity.shakeT -= dt;
      const s = Math.max(0, entity.shakeT) * 40;
      entity.shakeX = (Math.random() - 0.5) * s;
      entity.shakeY = (Math.random() - 0.5) * s;
    } else {
      entity.shakeX = 0; entity.shakeY = 0;
    }
  }

  // Applies blast damage/knockback from an explosion centered at (ex, ey).
  // Returns true if this call destroyed the entity.
  function applyExplosion(entity, ex, ey, radius, maxDamage) {
    if (!entity.alive) return false;
    const cx = entity.x + (entity.w ? entity.w / 2 : 0);
    const cy = entity.y + (entity.h ? entity.h / 2 : 0);
    const dist = Math.hypot(cx - ex, cy - ey);
    const f = Physics.falloff(dist, radius);
    if (f <= 0) return false;

    if (entity.kind === 'target') {
      const dmg = Math.ceil(maxDamage * f);
      entity.hp -= dmg;
      const dir = Physics.normalize({ x: entity.x - ex, y: entity.y - ey });
      entity.knockVX += dir.x * 500 * f;
      entity.knockVY += dir.y * 500 * f - 150 * f;
      entity.vAngle += (Math.random() - 0.5) * 14 * f;
      if (entity.hp <= 0) { entity.alive = false; return true; }
      return false;
    }

    // Static destructibles: apply damage + a brief visual shake.
    const dmg = Math.ceil(maxDamage * f);
    entity.hp -= dmg;
    entity.shakeT = Math.max(entity.shakeT, 0.25 * f);
    if (entity.hp <= 0) { entity.alive = false; return true; }
    return false;
  }

  return {
    createPlatform, createCrate, createBarrel, createGlass, createTarget,
    createRocket, createDebris,
    updateTarget, updateDebris, updateShake, applyExplosion,
  };
})();
