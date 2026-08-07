// Bazooka Man — gameplay: state machine, collisions, explosions, rendering.
// UI screens (menu/level-select/overlays) live in ui.js; this file owns
// everything that happens inside the canvas once a level is running.
'use strict';

const Game = (() => {
  // Tunable shot/ammo constants. Kept in one place so level difficulty can
  // be retuned without touching collision code.
  const MAX_PULL = 150;        // px, max drag distance
  const MIN_FIRE_PULL = 14;    // px, drags shorter than this cancel instead of firing
  const MIN_SPEED = 300, MAX_SPEED = 950; // px/s launch speed range
  const SHOT = {
    standard: { radius: 76, damage: 55 },
    bounce: { radius: 66, damage: 48 },
  };
  const BARREL_BLAST = { radius: 100, damage: 75 };
  const SHOULDER = { x: World.PLAYER_X, y: World.PLAYER_Y - 20 }; // pivot the bazooka tube rotates around
  const TUBE_LEN = 40; // matches the tube+nozzle drawn in drawPlayer()
  const KB_CHARGE_TIME = 1.1; // seconds to reach full power holding Space

  // Rocket spawn point: the tip of the bazooka tube, which swings with aim
  // direction so the visible gun and the physics launch point always agree.
  function muzzlePoint(dir) {
    return { x: SHOULDER.x + dir.x * TUBE_LEN, y: SHOULDER.y + dir.y * TUBE_LEN };
  }

  let ctx = null;
  let level = null, levelIdx = 0;
  let entities = [], rockets = [], debris = [], explosionQueue = [];
  let ammo = {}, selectedAmmo = 'standard', shotsUsed = 0;
  let status = 'aiming'; // aiming | flying | won | lost | paused
  let paused = false;
  let dragging = false, dragStart = null, dragCurrent = null;
  let kbAngle = 50, kbCharging = false, kbPower = 0;
  let earnedStars = 0;
  let reducedMotion = false;

  function init(canvasEl) {
    ctx = Engine.init(canvasEl, {
      onDown: handleDown, onMove: handleMove, onUp: handleUp,
      onKeyDown: handleKeyDown, onKeyUp: handleKeyUp,
    });
    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Particles.setReducedMotion(reducedMotion);
    Engine.start(update, render);
  }

  function loadLevel(id) {
    levelIdx = getLevelIndex(id);
    level = LEVELS[levelIdx];
    entities = level.build();
    rockets = []; debris = []; explosionQueue = [];
    ammo = Object.assign({}, level.rockets);
    selectedAmmo = ammo.standard > 0 ? 'standard' : 'bounce';
    shotsUsed = 0;
    status = 'aiming';
    paused = false;
    dragging = false; dragStart = null; dragCurrent = null;
    kbCharging = false; kbPower = 0;
    earnedStars = 0;
    UI.onLevelLoaded(level, ammo, selectedAmmo);
  }

  function retryLevel() { loadLevel(level.id); }

  function setPaused(v) { paused = v; }

  function selectAmmo(type) {
    if (ammo[type] > 0) { selectedAmmo = type; UI.onAmmoChanged(selectedAmmo); }
  }

  // ---- input -------------------------------------------------------------

  function handleDown(pos) {
    if (status !== 'aiming' || paused) return;
    dragging = true; dragStart = pos; dragCurrent = pos;
  }
  function handleMove(pos) {
    if (!dragging) return;
    dragCurrent = pos;
  }
  function handleUp() {
    if (!dragging) return;
    dragging = false;
    const pull = Physics.clampMag(Physics.sub(dragStart, dragCurrent), MAX_PULL);
    if (status === 'aiming' && !paused && Physics.length(pull) >= MIN_FIRE_PULL) fire(pull);
    dragStart = null; dragCurrent = null;
  }

  function handleKeyDown(code) {
    if (status !== 'aiming' || paused) return;
    if (code === 'ArrowUp') kbAngle = Math.min(85, kbAngle + 3);
    else if (code === 'ArrowDown') kbAngle = Math.max(5, kbAngle - 3);
    else if (code === 'ArrowLeft') selectAmmo(selectedAmmo === 'standard' ? 'bounce' : 'standard');
    else if (code === 'ArrowRight') selectAmmo(selectedAmmo === 'standard' ? 'bounce' : 'standard');
    else if (code === 'Space' && !kbCharging) { kbCharging = true; kbPower = 0; }
  }
  function handleKeyUp(code) {
    if (code === 'Space' && kbCharging) {
      kbCharging = false;
      if (status === 'aiming' && !paused) {
        const rad = kbAngle * Math.PI / 180;
        const dir = { x: Math.cos(rad), y: -Math.sin(rad) };
        const pull = Physics.scale(dir, MIN_FIRE_PULL + kbPower * (MAX_PULL - MIN_FIRE_PULL));
        fire(pull);
      }
      kbPower = 0;
    }
  }

  function fire(pull) {
    if (ammo[selectedAmmo] <= 0) return;
    const dir = Physics.normalize(pull);
    const power = Physics.length(pull) / MAX_PULL;
    const speed = MIN_SPEED + power * (MAX_SPEED - MIN_SPEED);
    const vel = Physics.scale(dir, speed);
    const muzzle = muzzlePoint(dir);
    rockets.push(Entities.createRocket(muzzle.x, muzzle.y, vel.x, vel.y, selectedAmmo));
    ammo[selectedAmmo]--;
    shotsUsed++;
    status = 'flying';
    Audio2.fire(selectedAmmo);
    if (ammo[selectedAmmo] <= 0) {
      const other = selectedAmmo === 'standard' ? 'bounce' : 'standard';
      if (ammo[other] > 0) selectedAmmo = other;
    }
    UI.onShotFired(ammo, selectedAmmo, shotsUsed);
  }

  // ---- explosions ----------------------------------------------------------

  function explodeAt(x, y, radius, damage) {
    Particles.explosion(x, y, radius);
    Audio2.explosion(Math.min(1.6, radius / 76));
    for (const e of entities) {
      if (!e.alive || e.kind === 'platform') continue;
      const wasAlive = e.alive;
      const destroyed = Entities.applyExplosion(e, x, y, radius, damage);
      if (destroyed && wasAlive) onEntityDestroyed(e);
    }
  }

  function onEntityDestroyed(e) {
    const colors = { crate: '#b8834a', barrel: '#e0433f', glass: '#8ecbe6', target: '#84cc16' };
    const cx = e.x + (e.w ? e.w / 2 : 0);
    const cy = e.y + (e.h ? e.h / 2 : 0);
    const pieces = reducedMotion ? 3 : 6;
    for (let i = 0; i < pieces; i++) debris.push(Entities.createDebris(cx, cy, colors[e.kind] || '#ccc'));
    if (e.kind === 'glass') Audio2.shatter();
    else if (e.kind === 'target') Audio2.targetDown();
    if (e.kind === 'barrel' && !e.exploded) {
      e.exploded = true;
      explosionQueue.push({ x: cx, y: cy, radius: BARREL_BLAST.radius, damage: BARREL_BLAST.damage, delay: 0.12 });
    }
  }

  function explodeRocket(r) {
    r.alive = false;
    const spec = SHOT[r.shotKind];
    explodeAt(r.x, r.y, spec.radius, spec.damage);
  }

  // ---- update ----------------------------------------------------------

  function update(dt) {
    if (kbCharging) kbPower = Math.min(1, kbPower + dt / KB_CHARGE_TIME);
    if (paused || status === 'won' || status === 'lost') { Particles.update(dt); return; }

    for (const e of entities) {
      if (e.kind === 'target') Entities.updateTarget(e, dt);
      if (e.shakeT !== undefined) Entities.updateShake(e, dt);
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.vy += Physics.GRAVITY * dt;
      r.x += r.vx * dt; r.y += r.vy * dt; r.age += dt;
      r.trail.push({ x: r.x, y: r.y }); if (r.trail.length > 10) r.trail.shift();

      let exploded = false;

      if (r.y + r.r >= World.GROUND_Y) {
        r.y = World.GROUND_Y - r.r;
        if (r.shotKind === 'bounce' && r.bouncesLeft > 0) {
          r.vy = -r.vy * 0.55; r.vx *= 0.85; r.bouncesLeft--; Audio2.bounce();
        } else { explodeRocket(r); exploded = true; }
      }

      if (!exploded) {
        for (const e of entities) {
          if (!e.alive || exploded) continue;
          if (e.kind === 'target') {
            if (Physics.circleCircleHit(r.x, r.y, r.r, e.x, e.y, e.r)) { explodeRocket(r); exploded = true; }
          } else if (e.solid) {
            if (Physics.circleRectHit(r.x, r.y, r.r, e.x, e.y, e.w, e.h)) {
              if (e.kind === 'platform' && r.shotKind === 'bounce' && r.bouncesLeft > 0) {
                // Reflect off whichever axis the rocket was closer to penetrating.
                const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
                if (Math.abs((r.x - cx) / e.w) > Math.abs((r.y - cy) / e.h)) r.vx = -r.vx * 0.6;
                else r.vy = -r.vy * 0.6;
                r.bouncesLeft--; Audio2.bounce();
              } else { explodeRocket(r); exploded = true; }
            }
          }
        }
      }

      if (!exploded && (r.x < -60 || r.x > World.W + 60 || r.age > 6)) { r.alive = false; }
      if (!r.alive) rockets.splice(i, 1);
    }

    for (let i = explosionQueue.length - 1; i >= 0; i--) {
      const q = explosionQueue[i];
      q.delay -= dt;
      if (q.delay <= 0) { explodeAt(q.x, q.y, q.radius, q.damage); explosionQueue.splice(i, 1); }
    }

    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      Entities.updateDebris(d, dt);
      if (d.life <= 0) debris.splice(i, 1);
    }
    Particles.update(dt);

    if (status === 'flying' && rockets.length === 0 && explosionQueue.length === 0) {
      resolveTurnEnd();
    }
  }

  function resolveTurnEnd() {
    const objectivesLeft = entities.some(e => e.isObjective && e.alive);
    if (!objectivesLeft) {
      status = 'won';
      earnedStars = shotsUsed <= level.stars.s3 ? 3 : (shotsUsed <= level.stars.s2 ? 2 : 1);
      Storage.setStars(level.id, earnedStars);
      Audio2.win();
      UI.onLevelWon(level, earnedStars, shotsUsed);
      return;
    }
    const ammoLeft = (ammo.standard || 0) + (ammo.bounce || 0);
    if (ammoLeft <= 0) {
      status = 'lost';
      Audio2.fail();
      UI.onLevelLost(level);
      return;
    }
    status = 'aiming';
  }

  // ---- render ------------------------------------------------------------

  function render(c) {
    c.clearRect(0, 0, World.W, World.H);
    const grad = c.createLinearGradient(0, 0, 0, World.H);
    grad.addColorStop(0, '#1a1a3e'); grad.addColorStop(1, '#0a0a1a');
    c.fillStyle = grad; c.fillRect(0, 0, World.W, World.H);
    drawStars(c);

    const shake = Particles.getShakeOffset();
    c.save();
    c.translate(shake.x, shake.y);

    c.fillStyle = '#2b3a24';
    c.fillRect(0, World.GROUND_Y, World.W, World.H - World.GROUND_Y);
    c.fillStyle = '#3d5230';
    c.fillRect(0, World.GROUND_Y, World.W, 6);

    for (const e of entities) drawEntity(c, e);
    for (const d of debris) drawDebris(c, d);
    for (const r of rockets) drawRocket(c, r);
    Particles.draw(c);
    drawPlayer(c);
    if (status === 'aiming' && !paused) drawAim(c);

    c.restore();
  }

  function drawStars(c) {
    c.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 137) % World.W, y = (i * 59) % (World.GROUND_Y - 20);
      c.globalAlpha = 0.15 + ((i * 31) % 10) / 20;
      c.fillRect(x, y, 2, 2);
    }
    c.globalAlpha = 1;
  }

  function drawEntity(c, e) {
    const sx = (e.shakeX || 0), sy = (e.shakeY || 0);
    if (e.kind === 'platform') {
      c.fillStyle = '#5b6470';
      c.fillRect(e.x, e.y, e.w, e.h);
      c.fillStyle = '#767f8c';
      c.fillRect(e.x, e.y, e.w, 4);
    } else if (e.kind === 'crate') {
      c.save(); c.translate(sx, sy);
      c.fillStyle = '#b8834a';
      c.fillRect(e.x, e.y, e.w, e.h);
      c.strokeStyle = '#7a4f26'; c.lineWidth = 3;
      c.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
      c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.w, e.y + e.h);
      c.moveTo(e.x + e.w, e.y); c.lineTo(e.x, e.y + e.h); c.stroke();
      if (e.hp < e.maxHp * 0.5) drawCracks(c, e);
      c.restore();
    } else if (e.kind === 'barrel') {
      c.save(); c.translate(sx, sy);
      c.fillStyle = '#e0433f';
      c.fillRect(e.x, e.y, e.w, e.h);
      c.fillStyle = '#fff2b8';
      c.fillRect(e.x, e.y + e.h * 0.4, e.w, e.h * 0.18);
      c.strokeStyle = '#8a1f1c'; c.lineWidth = 2;
      c.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
      c.fillStyle = '#8a1f1c'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
      c.fillText('⚠', e.x + e.w / 2, e.y + e.h * 0.55);
      c.restore();
    } else if (e.kind === 'glass') {
      c.save(); c.translate(sx, sy);
      c.fillStyle = 'rgba(142,203,230,0.35)';
      c.fillRect(e.x, e.y, e.w, e.h);
      c.strokeStyle = 'rgba(220,245,255,0.7)'; c.lineWidth = 2;
      c.strokeRect(e.x, e.y, e.w, e.h);
      c.beginPath(); c.moveTo(e.x + e.w * 0.25, e.y); c.lineTo(e.x + e.w * 0.55, e.y + e.h);
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.stroke();
      c.restore();
    } else if (e.kind === 'target') {
      c.save(); c.translate(e.x, e.y + Math.sin(performance.now() / 260) * 2);
      c.rotate(e.angle || 0);
      c.fillStyle = '#84cc16';
      c.beginPath(); c.arc(0, 0, e.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#4d7a0d'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#0a0a1a';
      c.beginPath(); c.arc(e.r * 0.3, -e.r * 0.15, e.r * 0.22, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#4d7a0d'; c.beginPath();
      c.moveTo(0, -e.r); c.lineTo(0, -e.r - 8); c.stroke();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, -e.r - 8, 3, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  function drawCracks(c, e) {
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(e.x + e.w * 0.3, e.y); c.lineTo(e.x + e.w * 0.5, e.y + e.h * 0.5);
    c.lineTo(e.x + e.w * 0.2, e.y + e.h);
    c.stroke();
  }

  function drawDebris(c, d) {
    c.save();
    c.globalAlpha = Math.max(0, d.life);
    c.translate(d.x, d.y); c.rotate(d.rot);
    c.fillStyle = d.color;
    c.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
    c.restore();
  }

  function drawRocket(c, r) {
    for (let i = 0; i < r.trail.length; i++) {
      const t = r.trail[i];
      c.globalAlpha = (i / r.trail.length) * 0.5;
      c.fillStyle = r.shotKind === 'bounce' ? '#38bdf8' : '#ffb300';
      c.beginPath(); c.arc(t.x, t.y, 3, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    const angle = Math.atan2(r.vy, r.vx);
    c.save(); c.translate(r.x, r.y); c.rotate(angle);
    c.fillStyle = r.shotKind === 'bounce' ? '#38bdf8' : '#e2e2e2';
    c.fillRect(-9, -4, 18, 8);
    c.fillStyle = '#ff5722';
    c.beginPath(); c.moveTo(9, -4); c.lineTo(15, 0); c.lineTo(9, 4); c.fill();
    c.restore();
  }

  function drawPlayer(c) {
    const px = World.PLAYER_X, py = World.PLAYER_Y;
    c.save(); c.translate(px, py);
    c.fillStyle = '#2f3b4c';
    c.fillRect(-10, -34, 20, 34); // torso
    c.fillStyle = '#e8b58a';
    c.beginPath(); c.arc(0, -42, 9, 0, Math.PI * 2); c.fill(); // head
    c.fillStyle = '#f5c842';
    c.fillRect(-11, -46, 22, 5); // helmet brim

    let aimAngle = -0.6;
    if (dragging && dragCurrent) {
      const pull = Physics.sub(dragStart, dragCurrent);
      aimAngle = Math.atan2(pull.y, pull.x);
    } else if (kbCharging) {
      aimAngle = -kbAngle * Math.PI / 180;
    }
    c.save(); c.translate(0, -20); c.rotate(aimAngle);
    c.fillStyle = '#4a5a3a';
    c.fillRect(0, -5, 34, 10);
    c.fillStyle = '#333';
    c.fillRect(28, -7, 8, 14);
    c.restore();

    c.restore();
  }

  function drawAim(c) {
    let dir, power;
    if (dragging && dragCurrent) {
      const pull = Physics.clampMag(Physics.sub(dragStart, dragCurrent), MAX_PULL);
      const len = Physics.length(pull);
      if (len < MIN_FIRE_PULL) return;
      dir = Physics.normalize(pull); power = len / MAX_PULL;
    } else if (kbCharging) {
      const rad = kbAngle * Math.PI / 180;
      dir = { x: Math.cos(rad), y: -Math.sin(rad) }; power = kbPower;
    } else return;

    const speed = MIN_SPEED + power * (MAX_SPEED - MIN_SPEED);
    const muzzle = muzzlePoint(dir);
    let sx = muzzle.x, sy = muzzle.y, svx = dir.x * speed, svy = dir.y * speed;
    c.fillStyle = selectedAmmo === 'bounce' ? 'rgba(56,189,248,0.8)' : 'rgba(255,178,0,0.85)';
    for (let i = 0; i < 26; i++) {
      svy += Physics.GRAVITY * 0.028;
      sx += svx * 0.028; sy += svy * 0.028;
      if (sy > World.GROUND_Y || sx > World.W) break;
      if (i % 2 === 0) { c.beginPath(); c.arc(sx, sy, 2.5, 0, Math.PI * 2); c.fill(); }
    }

    // Power meter above the player.
    const barW = 60, barX = World.PLAYER_X - barW / 2, barY = World.PLAYER_Y - 90;
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(barX, barY, barW, 8);
    c.fillStyle = power > 0.75 ? '#ff6b6b' : '#f5c842';
    c.fillRect(barX, barY, barW * power, 8);
  }

  function currentAmmo() { return ammo; }
  function isPaused() { return paused; }
  function getStatus() { return status; }

  return { init, loadLevel, retryLevel, setPaused, selectAmmo, currentAmmo, isPaused, getStatus };
})();
