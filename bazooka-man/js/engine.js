// Bazooka Man — canvas sizing, input capture, and the render loop.
// This module knows nothing about game rules; it just turns raw
// mouse/touch/keyboard events into world-space callbacks and drives
// requestAnimationFrame. Game logic lives in main.js.
'use strict';

const Engine = (() => {
  let canvas, ctx;
  let scale = 1, offsetX = 0, offsetY = 0; // CSS-pixel -> world-pixel mapping
  let running = false;
  let lastTime = 0;
  let handlers = {};

  function init(canvasEl, cb) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    handlers = cb || {};
    canvas.width = World.W;
    canvas.height = World.H;

    window.addEventListener('resize', fitCanvas);
    fitCanvas();

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return ctx;
  }

  // The canvas keeps a fixed logical resolution (World.W x World.H) and is
  // scaled purely with CSS width/height, so game-object coordinates never
  // need to change with screen size — only the CSS->world pointer mapping does.
  //
  // Sized off #canvas-wrap (the flex layout container), not canvas.parentElement:
  // the immediate parent (.canvas-frame) shrink-wraps to the canvas's own
  // rendered size, so measuring *it* would be a circular dependency.
  function fitCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    const maxW = wrap.clientWidth;
    const maxH = Math.min(wrap.clientHeight || maxW * (World.H / World.W), window.innerHeight * 0.72);
    const ratio = World.W / World.H;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (World.W / rect.width);
    const y = (clientY - rect.top) * (World.H / rect.height);
    return { x, y };
  }

  function onPointerDown(e) {
    if (e.pointerType !== 'mouse' || e.button === 0) {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      handlers.onDown && handlers.onDown(toWorld(e.clientX, e.clientY));
    }
  }
  function onPointerMove(e) {
    handlers.onMove && handlers.onMove(toWorld(e.clientX, e.clientY));
  }
  function onPointerUp(e) {
    handlers.onUp && handlers.onUp(toWorld(e.clientX, e.clientY));
  }
  function onKeyDown(e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    handlers.onKeyDown && handlers.onKeyDown(e.code);
  }
  function onKeyUp(e) {
    handlers.onKeyUp && handlers.onKeyUp(e.code);
  }

  function start(update, render) {
    running = true;
    lastTime = performance.now();
    function frame(t) {
      if (!running) return;
      let dt = (t - lastTime) / 1000;
      lastTime = t;
      dt = Math.min(dt, 1 / 20); // clamp so a dropped/backgrounded frame can't jump physics
      update(dt);
      render(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  function getCtx() { return ctx; }

  return { init, start, stop, getCtx, fitCanvas };
})();
