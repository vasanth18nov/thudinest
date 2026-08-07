// Bazooka Man — tiny procedural sound engine (Web Audio API only).
// No audio files are shipped: every effect is synthesized on the fly, which
// keeps the page weight near zero and sidesteps any licensing concerns.
'use strict';

const Audio2 = (() => {
  let ctx = null;
  let muted = false;
  let noiseBuffer = null;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuffer = buildNoiseBuffer(ctx);
    return ctx;
  }

  function buildNoiseBuffer(c) {
    const buf = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function setMuted(v) { muted = v; }
  function isMuted() { return muted; }

  function tone(freq, duration, opts = {}) {
    const c = ensureCtx();
    if (!c || muted) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), c.currentTime + duration);
    }
    const vol = opts.vol ?? 0.2;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  function noiseBurst(duration, opts = {}) {
    const c = ensureCtx();
    if (!c || muted) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = opts.filterType || 'lowpass';
    filter.frequency.setValueAtTime(opts.freq ?? 1200, c.currentTime);
    if (opts.freqTo != null) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqTo), c.currentTime + duration);
    }
    const gain = c.createGain();
    const vol = opts.vol ?? 0.35;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    src.stop(c.currentTime + duration);
  }

  function fire(kind) {
    noiseBurst(0.25, { freq: 2200, freqTo: 300, vol: 0.3 });
    tone(kind === 'bounce' ? 260 : 180, 0.18, { type: 'sawtooth', slideTo: 60, vol: 0.15 });
  }

  function explosion(scale = 1) {
    noiseBurst(0.5 * scale, { freq: 1800, freqTo: 80, vol: 0.5 });
    tone(90, 0.4 * scale, { type: 'triangle', slideTo: 30, vol: 0.25 });
  }

  function bounce() { tone(500, 0.08, { type: 'square', slideTo: 700, vol: 0.12 }); }

  function shatter() { noiseBurst(0.18, { freq: 5000, freqTo: 1200, vol: 0.25, filterType: 'highpass' }); }

  function targetDown() { tone(700, 0.2, { type: 'square', slideTo: 120, vol: 0.18 }); }

  function uiClick() { tone(440, 0.05, { type: 'square', vol: 0.1 }); }

  function star() { tone(880, 0.12, { type: 'sine', slideTo: 1320, vol: 0.15 }); }

  function win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => tone(f, 0.22, { type: 'sine', vol: 0.18 }), i * 90);
    });
  }

  function fail() { tone(220, 0.35, { type: 'sawtooth', slideTo: 60, vol: 0.2 }); }

  return { setMuted, isMuted, fire, explosion, bounce, shatter, targetDown, uiClick, star, win, fail, ensureCtx };
})();
