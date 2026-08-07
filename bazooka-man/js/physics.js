// Bazooka Man — physics helpers.
// Everything here is plain 2D vector math + AABB/circle tests: no external
// physics library. Objects that aren't mid-explosion are treated as static
// (they don't need continuous rigid-body simulation), which keeps this fast
// and predictable on low-end mobile devices.
'use strict';

const Physics = (() => {
  const GRAVITY = 1500; // px/s^2, tuned for the WORLD_W x WORLD_H arena

  function vec(x, y) { return { x, y }; }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
  function scale(a, s) { return { x: a.x * s, y: a.y * s }; }
  function length(a) { return Math.hypot(a.x, a.y); }
  function normalize(a) {
    const len = length(a);
    return len > 1e-6 ? { x: a.x / len, y: a.y / len } : { x: 0, y: 0 };
  }
  function clampMag(a, max) {
    const len = length(a);
    return len > max ? scale(a, max / len) : a;
  }

  // Circle vs axis-aligned rect (rect described by x,y = top-left, w,h).
  function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= cr * cr;
  }

  function circleCircleHit(ax, ay, ar, bx, by, br) {
    const dx = ax - bx, dy = ay - by;
    const rr = ar + br;
    return (dx * dx + dy * dy) <= rr * rr;
  }

  // Explosion falloff: 1 at the center, 0 at/after radius.
  function falloff(dist, radius) {
    if (dist >= radius) return 0;
    return 1 - (dist / radius);
  }

  return {
    GRAVITY, vec, add, sub, scale, length, normalize, clampMag,
    circleRectHit, circleCircleHit, falloff,
  };
})();
