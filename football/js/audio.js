/* Sound: the crowd recordings from Rally Point (bm/sfx: a stadium murmur loop, oohs, applause, cheers; CC0, see
   bm/sfx/CREDITS.txt) under a synthesised crowd: a swell of voices that rises as an attack nears goal, a drum and
   handclap chant that starts up in quiet spells and after goals, fans whistling at fouls; and a synthesised kick,
   referee's whistle, woodwork clang and net swish.
   On iPhones the page asks for the "playback" audio session, so the game is heard with the ring/silent switch on. */
import { clamp, rand } from './util.js';

export const Sound = {
  ctx: null, on: true, master: null, bufs: {}, map: null, crowdGain: null, hype: 0, ready: false,
  async init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    // iOS mutes Web Audio with the silent switch unless the page plays as media
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; else if (/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) this.unmuteIOS(); } catch (e) { /* not there */ }
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
      this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0.55;
      src.connect(lp).connect(this.crowdGain).connect(this.master); src.start();
      // a second pass of the same murmur, offset and panned, so it surrounds rather than sits in the middle
      if (ctx.createStereoPanner) {
        const s2 = ctx.createBufferSource(); s2.buffer = hall; s2.loop = true; s2.loopStart = map.hall.loopStart; s2.loopEnd = map.hall.loopEnd; s2.playbackRate.value = 0.97;
        const pan = ctx.createStereoPanner(), g2 = ctx.createGain(); pan.pan.value = 0.55; g2.gain.value = 0.5;
        s2.connect(pan).connect(g2).connect(this.crowdGain); s2.start(0, 9);
      }
      this.ready = true;
    } catch (e) { console.warn('crowd sounds', e); }
    this.voices();
  },
  // a looping silent media element switches older iOS to the playback session
  unmuteIOS() {
    if (this.tag) return;
    const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    const a = this.tag = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
    a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01; a.play().catch(() => {});
  },
  /* the synthesised crowd: pink noise through the formants of many voices, its level following the play */
  voices() {
    const ctx = this.ctx, len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.02) * 0.9; }
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
    f1.type = 'peaking'; f1.frequency.value = 520; f1.Q.value = 1.2; f1.gain.value = 9;
    f2.type = 'peaking'; f2.frequency.value = 1150; f2.Q.value = 1.6; f2.gain.value = 6;
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160;
    this.swell = ctx.createGain(); this.swell.gain.value = 0;
    src.connect(hp).connect(f1).connect(f2).connect(lp).connect(this.swell).connect(this.master); src.start();
    // a slow wobble so it breathes like people, not like a fan
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.23; lg.gain.value = 180; lfo.connect(lg).connect(f1.frequency); lfo.start();
    this.lp = lp; this.chantT = 14 + Math.random() * 10;
  },
  /* one crowd handclap: a dozen hands a few milliseconds apart */
  claps(t, vol) {
    const ctx = this.ctx;
    for (let k = 0; k < 10; k++) {
      const n = this.noise(0.09), f = ctx.createBiquadFilter(), g = ctx.createGain(), at = t + Math.random() * 0.035;
      f.type = 'bandpass'; f.frequency.value = rand(900, 2400); f.Q.value = rand(0.9, 1.8);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol * rand(0.5, 1), at + 0.002); g.gain.exponentialRampToValueAtTime(0.001, at + rand(0.05, 0.09));
      n.connect(f).connect(g).connect(this.master); n.start(at); n.stop(at + 0.1);
    }
  },
  drum(t, vol) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.45);
    const n = this.noise(0.04), f = ctx.createBiquadFilter(), ng = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 900;
    ng.gain.setValueAtTime(vol * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04); n.connect(f).connect(ng).connect(this.master); n.start(t);
  },
  /* the chant: drum, drum, then three claps; four bars, a little faster as it catches on */
  chant(bars = 4) {
    if (!this.ctx || this.chanting) return;
    const t0 = this.ctx.currentTime + 0.05; let t = t0;
    for (let b = 0; b < bars; b++) {
      const beat = 0.5 - b * 0.012, v = 0.16 + b * 0.04;
      this.drum(t, v * 2.2); this.drum(t + beat, v * 2.2);
      this.claps(t + beat * 2, v); this.claps(t + beat * 2.5, v); this.claps(t + beat * 3, v * 1.2);
      t += beat * 4;
    }
    this.chanting = true; setTimeout(() => { this.chanting = false; }, (t - t0) * 1000);
  },
  /* fans whistling with their fingers */
  fanWhistles(n = 4) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (let k = 0; k < n; k++) {
      const t = ctx.currentTime + Math.random() * 0.5, d = rand(0.35, 0.8), o = ctx.createOscillator(), g = ctx.createGain(), base = rand(2100, 3300);
      o.type = 'sine'; o.frequency.setValueAtTime(base * 0.85, t); o.frequency.linearRampToValueAtTime(base, t + 0.08); o.frequency.setValueAtTime(base, t + d - 0.1); o.frequency.linearRampToValueAtTime(base * 0.9, t + d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.04); g.gain.setValueAtTime(0.035, t + d - 0.08); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + d + 0.02);
    }
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
  roar() { this.sprite('crowd', 'cheerBig', 1); this.hype = 1; setTimeout(() => this.sprite('crowd', 'clapBig', 0.6), 4200); setTimeout(() => this.chant(6), 9000); },
  cheer() { this.sprite('crowd', 'cheer', 0.7); },
  ooh() { this.sprite('crowd', 'ooh', 0.75); this.hype = Math.max(this.hype, 0.5); },
  clap() { this.sprite('crowd', 'clap', 0.5); },
  groan() { this.sprite('crowd', 'ooh', 0.85, rand(0.82, 0.92)); this.hype = Math.max(this.hype, 0.45); },
  update(dt, excite) {
    if (!this.crowdGain) return;
    this.hype = Math.max(0, this.hype - dt * 0.12);
    const ex = clamp(excite, 0, 1), now = this.ctx.currentTime;
    this.crowdGain.gain.setTargetAtTime(0.5 + ex * 0.35 + this.hype * 0.3, now, 0.4);
    if (this.swell) {
      this.swell.gain.setTargetAtTime(0.05 + ex * 0.22 + this.hype * 0.35, now, ex > 0.5 ? 0.6 : 1.2);
      this.lp.frequency.setTargetAtTime(1300 + ex * 900 + this.hype * 1200, now, 0.5);
    }
    // in a quiet spell the drum starts up
    this.chantT -= dt;
    if (this.chantT <= 0) { this.chantT = rand(22, 40); if (ex < 0.5) this.chant(rand(3, 6) | 0); }
  },
};
