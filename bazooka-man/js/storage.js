// Bazooka Man — localStorage progress persistence.
// Schema is intentionally flat/simple: { stars: {levelId: 0-3}, muted: bool }.
'use strict';

const Storage = (() => {
  const KEY = 'bazookaman.progress.v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { stars: {}, muted: false };
      const data = JSON.parse(raw);
      return { stars: data.stars || {}, muted: !!data.muted };
    } catch (e) {
      return { stars: {}, muted: false };
    }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { /* private-browsing / quota — progress just won't persist */ }
  }

  function getStars(levelId) {
    return load().stars[levelId] || 0;
  }

  // Only ever raises a level's best star count, never lowers it.
  function setStars(levelId, stars) {
    const data = load();
    data.stars[levelId] = Math.max(data.stars[levelId] || 0, stars);
    save(data);
  }

  function isUnlocked(levelId, levelIndex, levels) {
    if (levelIndex === 0) return true;
    const prevId = levels[levelIndex - 1].id;
    return getStars(prevId) > 0;
  }

  function getMuted() { return load().muted; }
  function setMuted(v) { const data = load(); data.muted = v; save(data); }

  function totalStars(levels) {
    const data = load();
    return levels.reduce((sum, l) => sum + (data.stars[l.id] || 0), 0);
  }

  return { getStars, setStars, isUnlocked, getMuted, setMuted, totalStars };
})();
