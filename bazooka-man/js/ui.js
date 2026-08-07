// Bazooka Man — DOM screens, HUD, overlays, level-select grid.
// Canvas gameplay lives in main.js; this file is everything outside the
// canvas, plus the small callback surface main.js calls into (UI.on*).
'use strict';

const UI = (() => {
  const $ = (id) => document.getElementById(id);
  let toastTimer = null;
  let activeLevelId = null;

  function init() {
    Audio2.setMuted(Storage.getMuted());
    updateMuteButtons();

    $('btn-play').addEventListener('click', () => { Audio2.uiClick(); showScreen('screen-levels'); buildLevelGrid(); });
    $('btn-howto').addEventListener('click', () => { Audio2.uiClick(); showHowTo(); });
    $('btn-howto-close').addEventListener('click', () => { Audio2.uiClick(); hideHowTo(); });
    $('btn-levels-back').addEventListener('click', () => { Audio2.uiClick(); showScreen('screen-menu'); refreshMenuStars(); });

    $('btn-mute-menu').addEventListener('click', toggleMute);
    $('btn-mute-game').addEventListener('click', toggleMute);

    $('btn-pause').addEventListener('click', () => { Audio2.uiClick(); Game.setPaused(true); $('overlay-pause').hidden = false; });
    $('btn-resume').addEventListener('click', () => { Audio2.uiClick(); Game.setPaused(false); $('overlay-pause').hidden = true; });
    $('btn-restart-paused').addEventListener('click', () => { Audio2.uiClick(); $('overlay-pause').hidden = true; Game.setPaused(false); Game.retryLevel(); });
    $('btn-quit-paused').addEventListener('click', () => { Audio2.uiClick(); $('overlay-pause').hidden = true; Game.setPaused(false); showScreen('screen-levels'); buildLevelGrid(); });

    $('btn-retry-lose').addEventListener('click', () => { Audio2.uiClick(); $('overlay-lose').hidden = true; Game.retryLevel(); });
    $('btn-quit-lose').addEventListener('click', () => { Audio2.uiClick(); $('overlay-lose').hidden = true; showScreen('screen-levels'); buildLevelGrid(); });

    $('btn-next-level').addEventListener('click', () => { Audio2.uiClick(); $('overlay-win').hidden = true; goToNextLevel(); });
    $('btn-replay-win').addEventListener('click', () => { Audio2.uiClick(); $('overlay-win').hidden = true; Game.retryLevel(); });
    $('btn-quit-win').addEventListener('click', () => { Audio2.uiClick(); $('overlay-win').hidden = true; showScreen('screen-levels'); buildLevelGrid(); });

    $('ammo-standard').addEventListener('click', () => Game.selectAmmo('standard'));
    $('ammo-bounce').addEventListener('click', () => Game.selectAmmo('bounce'));

    Game.init($('game-canvas'));
    refreshMenuStars();
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
    if (id === 'screen-game') requestAnimationFrame(() => Engine.fitCanvas());
  }

  function toggleMute() {
    const next = !Audio2.isMuted();
    Audio2.setMuted(next);
    Storage.setMuted(next);
    Audio2.ensureCtx();
    if (!next) Audio2.uiClick();
    updateMuteButtons();
  }
  function updateMuteButtons() {
    const muted = Audio2.isMuted();
    [$('btn-mute-menu'), $('btn-mute-game')].forEach(btn => {
      btn.textContent = muted ? '\u{1F507}' : '\u{1F50A}';
      btn.setAttribute('aria-pressed', String(muted));
    });
  }

  function showHowTo() { $('overlay-howto').hidden = false; }
  function hideHowTo() { $('overlay-howto').hidden = true; }

  function buildLevelGrid() {
    const grid = $('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const unlocked = Storage.isUnlocked(lvl.id, i, LEVELS);
      const stars = Storage.getStars(lvl.id);
      const card = document.createElement('button');
      card.className = 'level-card' + (unlocked ? '' : ' locked');
      card.disabled = !unlocked;
      card.innerHTML = `
        <span class="level-num">${i + 1}</span>
        <span class="level-name">${unlocked ? lvl.name : 'Locked'}</span>
        <span class="level-stars">${unlocked ? starGlyphs(stars) : '&#128274;'}</span>
      `;
      if (unlocked) card.addEventListener('click', () => { Audio2.uiClick(); startLevel(lvl.id); });
      grid.appendChild(card);
    });
  }

  function starGlyphs(n) {
    let out = '';
    for (let i = 0; i < 3; i++) out += i < n ? '&#9733;' : '&#9734;';
    return out;
  }

  function startLevel(id) {
    activeLevelId = id;
    Game.loadLevel(id);
    showScreen('screen-game');
  }

  function goToNextLevel() {
    const idx = getLevelIndex(activeLevelId);
    if (idx + 1 < LEVELS.length && Storage.isUnlocked(LEVELS[idx + 1].id, idx + 1, LEVELS)) {
      startLevel(LEVELS[idx + 1].id);
    } else {
      showScreen('screen-levels');
      buildLevelGrid();
    }
  }

  function refreshMenuStars() {
    $('menu-total-stars').innerHTML = `&#11088; ${Storage.totalStars(LEVELS)} / ${LEVELS.length * 3}`;
  }

  // ---- callbacks from Game (main.js) --------------------------------

  function onLevelLoaded(level, ammo, selected) {
    $('hud-level-name').textContent = level.name;
    $('hud-shots').textContent = 'Shots: 0';
    updateAmmoUI(ammo, selected);
    $('overlay-pause').hidden = true;
    $('overlay-win').hidden = true;
    $('overlay-lose').hidden = true;
  }

  function onAmmoChanged(selected) {
    document.querySelectorAll('.ammo-btn').forEach(b => b.classList.toggle('active', b.dataset.type === selected));
  }

  function onShotFired(ammo, selected, shotsUsed) {
    $('hud-shots').textContent = 'Shots: ' + shotsUsed;
    updateAmmoUI(ammo, selected);
  }

  function updateAmmoUI(ammo, selected) {
    $('count-standard').textContent = ammo.standard || 0;
    $('count-bounce').textContent = ammo.bounce || 0;
    $('ammo-bounce').style.display = (ammo.bounce != null) ? '' : 'none';
    onAmmoChanged(selected);
  }

  function onLevelWon(level, stars, shotsUsed) {
    $('win-stars').innerHTML = starGlyphs(stars);
    $('win-shots-used').textContent = 'Shots used: ' + shotsUsed;
    const idx = getLevelIndex(level.id);
    $('btn-next-level').style.display = (idx + 1 < LEVELS.length) ? '' : 'none';
    setTimeout(() => { $('overlay-win').hidden = false; }, 400);
  }

  function onLevelLost() {
    setTimeout(() => { $('overlay-lose').hidden = false; }, 400);
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  return {
    init, showScreen, buildLevelGrid, startLevel, showHowTo, hideHowTo, toast,
    onLevelLoaded, onAmmoChanged, onShotFired, onLevelWon, onLevelLost,
  };
})();

document.addEventListener('DOMContentLoaded', UI.init);
