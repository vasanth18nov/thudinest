/* Sound: the crowd recordings from Rally Point (bm/sfx: a stadium murmur loop, oohs, applause, cheers; CC0, see
   bm/sfx/CREDITS.txt), and a synthesised kick, referee's whistle, woodwork clang and net swish. */
import { clamp, rand } from './util.js';

export const Sound = {
  ctx: null, on: true, master: null, bufs: {}, map: null, crowdGain: null, hype: 0, ready: false,
  async init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.on ? 0.9 : 0; this.master.connect(ctx.destination);
    try {
      const [map, crowd, hall] = await Promise.all([
        fetch('../bm/sfx/sfx.json').then((r) => r.json()),
        fetch('../bm/sfx/crowd.mp3').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)),
        fetch('../bm/sfx/hall.mp3').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)),
      ]);
      this.map = map; this.bufs.crowd = crowd; this.bufs.hall = hall;
      // the murmur of the ground, always there, swelling with the play
      const src = ctx.createBufferSource(); src.buffer = hall; src.loop = true; src.loopStart = map.hall.loopStart; src.loopEnd = map.hall.loopEnd;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0.42;
      src.connect(lp).connect(this.crowdGain).connect(this.master); src.start();
      this.ready = true;
    } catch (e) { console.warn('crowd sounds', e); }
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.05); },
  sprite(group, name, vol = 1, rate = 1) {
    if (!this.ready) return;
    const list = this.map[group][name]; if (!list) return;
    const [at, dur] = list[(Math.random() * list.length) | 0];
    const s = this.ctx.createBufferSource(); s.buffer = this.bufs.crowd; s.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g).connect(this.master); s.start(0, at, dur);
    g.gain.setValueAtTime(vol, this.ctx.currentTime + Math.max(0, dur / rate - 0.8)); g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + dur / rate);
  },
  noise(dur) {
    const ctx = this.ctx, n = Math.ceil(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  },
  kick(power = 0.5) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, v = 0.25 + power * 0.55;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150 + power * 40, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.16);
    const n = this.noise(0.05), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8; ng.gain.setValueAtTime(v * 0.6, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(f).connect(ng).connect(this.master); n.start(t);
  },
  whistle(kind = 'short') {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const blasts = kind === 'end' ? [[0, 0.32], [0.42, 0.32], [0.84, 0.9]] : kind === 'long' ? [[0, 0.75]] : kind === 'foul' ? [[0, 0.5]] : [[0, 0.28]];
    for (const [at, dur] of blasts) {
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = 2950; lfo.frequency.value = 32; lg.gain.value = 140;
      lfo.connect(lg).connect(o.frequency);
      f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 2;
      const t = t0 + at;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.02); g.gain.setValueAtTime(0.22, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(f).connect(g).connect(this.master); o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
    }
  },
  post() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [fr, v] of [[880, 0.25], [1320, 0.16], [2140, 0.1]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = fr * rand(0.98, 1.02);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.75);
    }
  },
  net() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, n = this.noise(0.4), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 2500; g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    n.connect(f).connect(g).connect(this.master); n.start(t);
  },
  // the crowd's reactions
  roar() { this.sprite('crowd', 'cheerBig', 1); this.hype = 1; },
  cheer() { this.sprite('crowd', 'cheer', 0.7); },
  ooh() { this.sprite('crowd', 'ooh', 0.75); this.hype = Math.max(this.hype, 0.5); },
  clap() { this.sprite('crowd', 'clap', 0.5); },
  update(dt, excite) {
    if (!this.crowdGain) return;
    this.hype = Math.max(0, this.hype - dt * 0.12);
    const target = 0.36 + clamp(excite, 0, 1) * 0.3 + this.hype * 0.25;
    this.crowdGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  },
};
