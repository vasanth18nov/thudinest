/*!
 * Josiyam · divine.js
 * Temple-light touches: a sunburst and halo behind the hero wheel, a gold lotus that blooms,
 * oil lamps (deepam) beside section titles, kolam-style dividers that draw themselves,
 * a temple skyline above the footer, gold dust that follows the pointer over the hero,
 * and a shower of marigold, jasmine and rose petals (pushpa vrishti) when a chart is revealed.
 * Everything is decorative (aria-hidden) and is skipped under prefers-reduced-motion.
 */
(function () {
  'use strict';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = window.matchMedia('(pointer: fine)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = {};
  const f = (n) => n.toFixed(1);
  const pt = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; };

  /* ---------------------------------------------------------------- hero: sunburst, halo, lotus */
  function lotus() {
    let o = '', i2 = '';
    for (let k = 0; k < 16; k++) o += `<path transform="rotate(${k * 22.5})" d="M0-40C15-52 19-74 0-96C-19-74-15-52 0-40Z"/>`;
    for (let k = 0; k < 8; k++) i2 += `<path transform="rotate(${k * 45 + 22.5})" d="M0-30C14-40 16-58 0-74C-16-58-14-40 0-30Z"/>`;
    return `<svg class="lotus" viewBox="-110 -110 220 220"><defs>` +
      '<linearGradient id="dvPet" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#F6D27A" stop-opacity=".05"/><stop offset="1" stop-color="#FFE9B0" stop-opacity=".5"/></linearGradient>' +
      '<radialGradient id="dvCore"><stop offset="0" stop-color="#FFF4D2"/><stop offset=".5" stop-color="#F1D982" stop-opacity=".7"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/></radialGradient></defs>' +
      `<g class="lt-o" fill="url(#dvPet)" stroke="#F1D982" stroke-width=".9">${o}</g><g class="lt-i" fill="url(#dvPet)" stroke="#FFE2A0" stroke-width=".9">${i2}</g>` +
      '<circle r="26" fill="url(#dvCore)" opacity=".55"/><circle r="27" fill="none" stroke="#F1D982" stroke-width=".8" stroke-dasharray="1 4"/></svg>';
  }
  D.aura = function () {
    const par = $('.wheel-par');
    if (!par || $('.aura', par)) return;
    const a = document.createElement('div');
    a.className = 'aura';
    a.setAttribute('aria-hidden', 'true');
    a.innerHTML = '<div class="aura-rays"></div><div class="aura-rays r2"></div><div class="aura-halo"></div>' + lotus();
    par.prepend(a);
  };

  /* ---------------------------------------------------------------- deepam beside section titles */
  const DIYA = '<svg viewBox="0 0 40 48" aria-hidden="true"><defs>' +
    '<radialGradient id="dvGlow"><stop offset="0" stop-color="#FFD27A" stop-opacity=".75"/><stop offset="1" stop-color="#FF9933" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="dvFl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF7A1A"/><stop offset=".55" stop-color="#FFC24A"/><stop offset="1" stop-color="#FFF6D0"/></linearGradient>' +
    '<linearGradient id="dvBr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DD8E"/><stop offset="1" stop-color="#A9801E"/></linearGradient></defs>' +
    '<circle class="dv-glow" cx="20" cy="16" r="15" fill="url(#dvGlow)"/>' +
    '<path class="dv-fl" d="M20 3C24 10 26 14 26 18A6 6 0 0 1 14 18C14 14 16 10 20 3Z" fill="url(#dvFl)"/>' +
    '<path d="M4 27H36C34 36 28 40 20 40S6 36 4 27Z" fill="url(#dvBr)"/><path d="M4 27H36" stroke="#FFF0C0" stroke-width="1.2" opacity=".7"/>' +
    '<path d="M15 41H25L27 45H13Z" fill="url(#dvBr)"/></svg>';
  D.diyas = function (root) {
    $$('.results .block > .block-head:not(.sub) h2', root || document).forEach((h) => {
      if (h.parentElement.classList.contains('ttl')) return;
      const wrap = document.createElement('span');
      wrap.className = 'ttl';
      h.before(wrap);
      const d = document.createElement('span');
      d.className = 'diya';
      d.innerHTML = DIYA;
      wrap.append(d, h);
    });
  };

  /* ---------------------------------------------------------------- kolam dividers */
  function ornSvg() {
    let pet = '';
    for (let k = 0; k < 8; k++) pet += `<path transform="rotate(${k * 45})" d="M0-4C3-6 4-10 0-14C-4-10-3-6 0-4Z"/>`;
    const dots = [-150, -120, 120, 150].map((x) => `<circle cx="${x}" cy="0" r="1.6"/>`).join('');
    return '<svg viewBox="-300 -20 600 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<path class="or-l" pathLength="1" d="M-24 0H-292"/><path class="or-l" pathLength="1" d="M24 0H292"/>' +
      '<path class="or-l thin" pathLength="1" d="M-30 5C-60 5-70 -6-100 -6S-140 4-170 4"/><path class="or-l thin" pathLength="1" d="M30 5C60 5 70 -6 100 -6S140 4 170 4"/>' +
      `<g class="or-dots">${dots}<path d="M-292 0l-5-3.5-5 3.5 5 3.5z M292 0l5-3.5 5 3.5-5 3.5z"/></g>` +
      `<g class="or-f"><g class="or-p">${pet}</g><circle r="3.4" class="or-c"/><circle r="17" class="or-ring"/></g>` +
      '<rect class="or-glint" x="-40" y="-2" width="40" height="4" rx="2"/></svg>';
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.4 }) : null;
  D.dividers = function () {
    $$('.results > .block').slice(1).forEach((b) => {
      if (b.querySelector(':scope > .kolam')) return;
      const o = document.createElement('div');
      o.className = 'kolam';
      o.innerHTML = ornSvg();
      b.prepend(o);
      if (RM.matches || !io) o.classList.add('in'); else io.observe(o);
    });
  };

  /* ---------------------------------------------------------------- temple skyline above the footer */
  D.temple = function () {
    const foot = $('.foot');
    if (!foot || $('.temple')) return;
    const W = 1200, H = 230, base = 222;
    let body = '', lamps = '', rim = '';
    // gopuram: tiers narrowing upward, a barrel-vault crown with kalasams
    const gop = (cx, w0, h0, tiers, s) => {
      let y = base, w = w0, out = '';
      out += `<path d="M${cx - w / 2} ${y}V${y - h0}H${cx + w / 2}V${y}Z"/>`;
      rim += `<path d="M${cx - w / 2} ${y - h0}H${cx + w / 2}"/>`;
      // gateway
      lamps += `<path class="tp-door" d="M${cx - w0 * 0.1} ${base}V${base - h0 * 0.62}Q${cx} ${base - h0 * 0.86} ${cx + w0 * 0.1} ${base - h0 * 0.62}V${base}Z"/>`;
      y -= h0;
      for (let k = 0; k < tiers; k++) {
        const th = s * (15 - k * 0.6), w2 = w - s * 11;
        out += `<path d="M${f(cx - w / 2)} ${f(y)}L${f(cx - w2 / 2)} ${f(y - th)}H${f(cx + w2 / 2)}L${f(cx + w / 2)} ${f(y)}Z"/>`;
        rim += `<path d="M${f(cx - w2 / 2)} ${f(y - th)}H${f(cx + w2 / 2)}"/>`;
        const n = Math.max(1, Math.floor(w2 / (s * 16)));
        for (let j = 0; j < n; j++) {
          const x = cx - w2 / 2 + (j + 0.5) * (w2 / n);
          lamps += `<rect class="tp-win" x="${f(x - s * 1.6)}" y="${f(y - th * 0.72)}" width="${f(s * 3.2)}" height="${f(th * 0.42)}" rx="${f(s * 1.6)}" style="--d:${((j * 7 + k * 3) % 11) * 0.37}s"/>`;
        }
        y -= th; w = w2;
      }
      const vw = w * 0.92, vh = s * 16;
      out += `<path d="M${f(cx - vw / 2)} ${f(y)}V${f(y - vh * 0.45)}Q${f(cx - vw / 2)} ${f(y - vh)} ${f(cx)} ${f(y - vh)}Q${f(cx + vw / 2)} ${f(y - vh)} ${f(cx + vw / 2)} ${f(y - vh * 0.45)}V${f(y)}Z"/>`;
      rim += `<path d="M${f(cx - vw / 2)} ${f(y - vh * 0.45)}Q${f(cx - vw / 2)} ${f(y - vh)} ${f(cx)} ${f(y - vh)}Q${f(cx + vw / 2)} ${f(y - vh)} ${f(cx + vw / 2)} ${f(y - vh * 0.45)}"/>`;
      const nk = 5;
      for (let j = 0; j < nk; j++) {
        const x = cx - vw * 0.36 + j * (vw * 0.72 / (nk - 1)), ky = y - vh;
        out += `<path d="M${f(x - s * 2.4)} ${f(ky + 1)}Q${f(x - s * 2.6)} ${f(ky - s * 4)} ${f(x)} ${f(ky - s * 5)}Q${f(x + s * 2.6)} ${f(ky - s * 4)} ${f(x + s * 2.4)} ${f(ky + 1)}Z"/><path d="M${f(x)} ${f(ky - s * 5)}V${f(ky - s * 9)}"/>`;
        lamps += `<circle class="tp-kal" cx="${f(x)}" cy="${f(ky - s * 9)}" r="${f(s * 1.1)}"/>`;
      }
    };
    // vimana: a small shrine with a dome
    const vim = (cx, w, h, s) => {
      let out = `<path d="M${cx - w / 2} ${base}V${base - h}H${cx + w / 2}V${base}Z"/>`;
      let y = base - h, ww = w;
      for (let k = 0; k < 2; k++) { const w2 = ww * 0.78, th = s * 9; out += `<path d="M${f(cx - ww / 2)} ${f(y)}L${f(cx - w2 / 2)} ${f(y - th)}H${f(cx + w2 / 2)}L${f(cx + ww / 2)} ${f(y)}Z"/>`; y -= th; ww = w2; }
      const r = ww * 0.42;
      out += `<path d="M${f(cx - r)} ${f(y)}A${f(r)} ${f(r * 0.9)} 0 0 1 ${f(cx + r)} ${f(y)}Z"/><path d="M${f(cx)} ${f(y - r * 0.9)}V${f(y - r * 0.9 - s * 7)}"/>`;
      lamps += `<circle class="tp-kal" cx="${f(cx)}" cy="${f(y - r * 0.9 - s * 7)}" r="${f(s * 1.1)}"/>`;
      rim += `<path d="M${f(cx - r)} ${f(y)}A${f(r)} ${f(r * 0.9)} 0 0 1 ${f(cx + r)} ${f(y)}"/>`;
      return out;
    };
    // coconut palm
    const palm = (x, h, lean) => {
      let o = `<path class="tp-trunk" d="M${x} ${base}Q${x + lean * 0.6} ${base - h * 0.55} ${x + lean} ${base - h}"/>`;
      const tx = x + lean, ty = base - h;
      for (const [a, l] of [[-160, 46], [-130, 52], [-95, 40], [-60, 50], [-25, 46], [10, 40], [-200, 38]]) {
        const [ex, ey] = [tx + Math.cos(a * Math.PI / 180) * l, ty + Math.sin(a * Math.PI / 180) * l * 0.7 + 16];
        o += `<path class="tp-frond" d="M${tx} ${ty}Q${f((tx + ex) / 2)} ${f(Math.min(ty, ey) - 14)} ${f(ex)} ${f(ey)}"/>`;
      }
      return o;
    };
    body += vim(330, 96, 52, 1.1) + vim(870, 96, 52, 1.1) + vim(170, 70, 36, 0.9) + vim(1030, 70, 36, 0.9);
    gop(600, 210, 46, 7, 1.25);
    // deepasthambam (lamp pillar) with flames
    const dp = (x) => `<path d="M${x - 6} ${base}V${base - 70}H${x + 6}V${base}Z"/><path d="M${x - 16} ${base - 70}H${x + 16}L${x + 10} ${base - 76}H${x - 10}Z"/>`;
    body += dp(450) + dp(750);
    for (const x of [450, 750]) for (const dx of [-12, 0, 12]) lamps += `<path class="tp-fl" style="--d:${((x + dx) % 7) * 0.21}s" d="M${x + dx} ${base - 92}C${x + dx + 3.4} ${base - 85} ${x + dx + 3.4} ${base - 80} ${x + dx} ${base - 78}C${x + dx - 3.4} ${base - 80} ${x + dx - 3.4} ${base - 85} ${x + dx} ${base - 92}Z"/>`;
    const palms = palm(60, 150, 18) + palm(118, 118, -12) + palm(1100, 160, -20) + palm(1150, 122, 10) + palm(250, 104, 8) + palm(960, 110, -6);
    const ground = `<path class="tp-ground" d="M0 ${base}H${W}V${H}H0Z"/>`;
    const moon = '<g class="tp-moon"><circle cx="1010" cy="46" r="17"/><circle cx="1018" cy="40" r="15" class="tp-moon-cut"/></g>';
    const el = document.createElement('div');
    el.className = 'temple';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>` +
      '<linearGradient id="tpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0D17" stop-opacity="0"/><stop offset="1" stop-color="#2a1d4a" stop-opacity=".55"/></linearGradient>' +
      '<linearGradient id="tpBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1838"/><stop offset="1" stop-color="#0c0b1d"/></linearGradient>' +
      '<radialGradient id="tpHalo" cx="600" cy="120" r="320" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB45A" stop-opacity=".28"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient></defs>' +
      `<rect width="${W}" height="${H}" fill="url(#tpSky)"/><rect width="${W}" height="${H}" fill="url(#tpHalo)" class="tp-halo"/>${moon}` +
      `<g class="tp-palms">${palms}</g><g class="tp-body" fill="url(#tpBody)" stroke="#0c0b1d">${body}</g>` +
      `<g class="tp-rim" fill="none" stroke="#E9C46A" stroke-width="1.1" opacity=".55">${rim}</g>${ground}<g class="tp-lamps">${lamps}</g></svg>`;
    foot.before(el);
  };

  /* ---------------------------------------------------------------- gold dust that follows the pointer over the hero */
  D.dust = function () {
    if (!FINE.matches || RM.matches) return;
    const hero = $('.hero');
    if (!hero) return;
    const cv = document.createElement('canvas');
    cv.className = 'dust';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, lx = -1, ly = -1;
    const ps = [];
    const size = () => { dpr = Math.min(2, window.devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const tick = (tm) => {
      const dt = Math.min(50, tm - (last || tm)); last = tm;
      ctx.clearRect(0, 0, w, h);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.age += dt;
        if (p.age > p.life) { ps.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 0.00002 * dt;
        const k = p.age / p.life, al = (1 - k) * (k < 0.15 ? k / 0.15 : 1);
        ctx.globalAlpha = al;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, 6.283); ctx.fill();
        if (p.r > 1.4) { ctx.globalAlpha = al * 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      raf = ps.length ? requestAnimationFrame(tick) : 0;
      if (!raf) last = 0;
    };
    hero.addEventListener('pointermove', (e) => {
      if (e.target.closest('input, select, .listbox')) return;
      const d = lx < 0 ? 0 : Math.hypot(e.clientX - lx, e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
      const n = Math.min(3, Math.round(d / 14));
      for (let i = 0; i < n && ps.length < 90; i++) {
        ps.push({ x: e.clientX + (Math.random() - 0.5) * 8, y: e.clientY + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.03, vy: -0.01 - Math.random() * 0.03,
          r: 0.7 + Math.random() * 1.6, life: 700 + Math.random() * 700, age: 0, c: Math.random() < 0.7 ? '#F1D982' : '#FFB45A' });
      }
      if (!raf && ps.length) raf = requestAnimationFrame(tick);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { lx = -1; });
  };

  /* ---------------------------------------------------------------- pushpa vrishti: a shower of petals */
  const SPRITES = {};
  function sprite(kind) {
    if (SPRITES[kind]) return SPRITES[kind];
    const c = document.createElement('canvas'), s = 48;
    c.width = c.height = s;
    const g = c.getContext('2d');
    g.translate(s / 2, s / 2);
    if (kind === 'marigold' || kind === 'marigold2') {
      const col = kind === 'marigold' ? ['#FFB020', '#FF7A00'] : ['#FFD54A', '#F2A100'];
      const gr = g.createLinearGradient(0, -18, 0, 18); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(14, 8, 12, -12, 0, -18); g.bezierCurveTo(-12, -12, -14, 8, 0, 18); g.fill();
      g.strokeStyle = 'rgba(160,60,0,.45)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 15); g.lineTo(0, -12); g.stroke();
      g.beginPath(); g.moveTo(-9, -12); g.quadraticCurveTo(-4, -20, 0, -15); g.quadraticCurveTo(4, -20, 9, -12); g.strokeStyle = 'rgba(255,235,170,.6)'; g.stroke();
    } else if (kind === 'rose') {
      const gr = g.createRadialGradient(-4, -4, 2, 0, 0, 18); gr.addColorStop(0, '#FF6F91'); gr.addColorStop(1, '#C2185B');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(18, 10, 16, -14, 2, -16); g.bezierCurveTo(-6, -17, -16, -10, -14, 2); g.bezierCurveTo(-12, 10, -6, 14, 0, 16); g.fill();
    } else if (kind === 'jasmine') {
      g.fillStyle = '#FFFDF3';
      for (let k = 0; k < 5; k++) { g.save(); g.rotate(k * Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -9, 4.6, 9, 0, 0, 6.283); g.fill(); g.restore(); }
      g.fillStyle = '#F6E3A1'; g.beginPath(); g.arc(0, 0, 3, 0, 6.283); g.fill();
    } else {   // gold spark
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 12); gr.addColorStop(0, 'rgba(255,248,220,1)'); gr.addColorStop(0.35, 'rgba(255,214,120,.8)'); gr.addColorStop(1, 'rgba(255,190,80,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 12, 0, 6.283); g.fill();
    }
    SPRITES[kind] = c;
    return c;
  }
  let shower = null;
  D.petals = function (opts) {
    if (RM.matches) return;
    const o = Object.assign({ count: 70, spawn: 2200 }, opts || {});
    const small = innerWidth < 700;
    const total = Math.round(o.count * (small ? 0.65 : 1));
    if (!shower) {
      const cv = document.createElement('canvas');
      cv.className = 'petals';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      shower = { cv, ctx: cv.getContext('2d'), ps: [], raf: 0, w: 0, h: 0, last: 0, queue: 0, spawnEnd: 0 };
    }
    const S = shower, dpr = Math.min(2, window.devicePixelRatio || 1);
    S.w = innerWidth; S.h = innerHeight;
    S.cv.width = S.w * dpr; S.cv.height = S.h * dpr;
    S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.cv.style.display = 'block';
    const now = performance.now();
    S.queue += total; S.spawnEnd = now + o.spawn; S.rate = total / o.spawn;
    const KINDS = ['marigold', 'marigold', 'marigold2', 'jasmine', 'jasmine', 'rose', 'spark', 'spark'];
    const make = () => {
      const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
      const sz = kind === 'spark' ? 10 + Math.random() * 10 : (small ? 13 : 16) + Math.random() * 10;
      return { kind, x: Math.random() * S.w, y: -30 - Math.random() * 60, vy: 0.06 + Math.random() * 0.08, sw: 20 + Math.random() * 40, sp: 0.0012 + Math.random() * 0.0016,
        ph: Math.random() * 6.28, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.004, flip: Math.random() * 6.28, vf: 0.002 + Math.random() * 0.004, sz, age: 0 };
    };
    const tick = (tm) => {
      const dt = Math.min(48, tm - (S.last || tm)); S.last = tm;
      if (S.queue > 0) {
        const n = tm >= S.spawnEnd ? S.queue : Math.min(S.queue, Math.max(0, Math.round(S.rate * dt + Math.random() * 0.6)));
        for (let i = 0; i < n; i++) S.ps.push(make());
        S.queue -= n;
      }
      const c = S.ctx;
      c.clearRect(0, 0, S.w, S.h);
      for (let i = S.ps.length - 1; i >= 0; i--) {
        const p = S.ps[i];
        p.age += dt; p.y += p.vy * dt; p.ph += p.sp * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
        const x = p.x + Math.sin(p.ph) * p.sw;
        if (p.y > S.h + 40) { S.ps.splice(i, 1); continue; }
        c.save();
        c.translate(x, p.y);
        c.rotate(p.rot);
        if (p.kind === 'spark') c.globalAlpha = 0.55 + 0.45 * Math.sin(p.age * 0.012);
        else c.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.flip)));
        c.drawImage(sprite(p.kind), -p.sz / 2, -p.sz / 2, p.sz, p.sz);
        c.restore();
      }
      if (S.ps.length || S.queue > 0) S.raf = requestAnimationFrame(tick);
      else { S.raf = 0; S.last = 0; S.cv.style.display = 'none'; }
    };
    if (!S.raf) S.raf = requestAnimationFrame(tick);
  };

  /* ---------------------------------------------------------------- wiring */
  window.JosiyamDivine = D;
  window.JosiyamHooks = window.JosiyamHooks || [];
  window.JosiyamHooks.push({
    init() {
      D.aura(); D.temple(); D.dust(); D.dividers();
      document.documentElement.classList.add('divine');
    },
    render(animate) {
      D.diyas(); D.dividers();
      if (animate) setTimeout(() => D.petals({ count: 70 }), 900);
    }
  });
})();
