/*!
 * Josiyam · motion.js
 * Page animation helpers: hero entrance, orbiting navagrahas, pointer parallax, scroll reveals,
 * card spotlight, the "casting" sequence, count-ups, sliding tab indicator, scroll progress,
 * planet fly-in offsets and the birth-Moon phase drawing.
 * Everything checks prefers-reduced-motion and degrades to a static, fully visible page.
 */
(function (root) {
  'use strict';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = window.matchMedia('(pointer: fine)');
  const M = { shift: { x: 0, y: 0 }, scrollY: 0 };
  M.reduced = () => RM.matches;

  /* ---------------------------------------------------------------- hero entrance */
  M.splitWords = function (el) {
    const text = el.textContent;
    el.textContent = '';
    let n = 0;
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); continue; }
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', n++);
      s.textContent = part;
      el.appendChild(s);
    }
    el.classList.add('split');
  };
  M.intro = function () {
    if (M.reduced()) return;
    document.documentElement.classList.add('intro');
    setTimeout(() => document.documentElement.classList.remove('intro'), 2600);
  };

  /* ---------------------------------------------------------------- orbiting grahas around the hero wheel */
  const ORBITS = [
    ['Moon', 306, 4, '#E9ECFF', 34, 20], ['Mercury', 314, 3, '#9FE3C4', 48, 140], ['Venus', 322, 3.6, '#FFD6EA', 62, 250],
    ['Sun', 331, 5.2, '#FFC670', 80, 75], ['Mars', 339, 3.4, '#FF9C86', 96, 300], ['Jupiter', 348, 4.8, '#FFE58E', 128, 190],
    ['Saturn', 357, 4.2, '#9FB1FF', 166, 35], ['Rahu', 365, 3, '#B8B3C9', -210, 110], ['Ketu', 365, 3, '#D7B394', -210, 290]
  ];
  M.addOrbits = function (svg) {
    let s = '<g class="orbits" aria-hidden="true">';
    for (const r of [306, 322, 339, 357]) s += `<circle r="${r}" fill="none" stroke="currentColor" stroke-width=".6" opacity=".16"/>`;
    for (const [, r, size, col, dur, a0] of ORBITS) {
      s += `<g transform="rotate(${a0})"><g class="orb" style="animation-duration:${Math.abs(dur)}s;animation-direction:${dur < 0 ? 'reverse' : 'normal'}">` +
        `<circle cy="${-r}" r="${size * 3.2}" fill="${col}" opacity=".16"/><circle cy="${-r}" r="${size}" fill="${col}"/></g></g>`;
    }
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.setAttribute('class', 'orbit-layer');
    layer.setAttribute('viewBox', svg.getAttribute('viewBox'));
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = s + '</g>';
    svg.after(layer);
  };

  /* ---------------------------------------------------------------- pointer + scroll parallax */
  M.parallax = function () {
    const wrap = document.querySelector('.wheel-par');   // inner layer: the clipping container itself never moves
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      M.shift.x = cx; M.shift.y = cy;
      const sc = Math.min(window.scrollY, 900);
      if (wrap) wrap.style.transform = `translate3d(${(-cx * 18).toFixed(2)}px, ${(-cy * 12 + sc * 0.18).toFixed(2)}px, 0) rotate(${(sc * 0.03).toFixed(2)}deg)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    if (M.reduced()) return;
    if (FINE.matches) window.addEventListener('pointermove', (e) => { tx = e.clientX / window.innerWidth * 2 - 1; ty = e.clientY / window.innerHeight * 2 - 1; kick(); }, { passive: true });
    window.addEventListener('scroll', kick, { passive: true });
  };

  /* ---------------------------------------------------------------- scroll reveal */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }) : null;
  const REVEAL = '.timeline, .block-head, .rcard, .table-wrap, .inspector, .balance, .md, .fchart, .ychips, .ycard .yc-head, .ycard .yc-sec, .ycard .area, .bk, .disclaimer, .chart-fig, .res-head';
  M.reveal = function (rootEl, instant) {
    const els = Array.from((rootEl || document).querySelectorAll(REVEAL));
    const groups = new Map();
    for (const el of els) {
      if (el.classList.contains('in')) continue;
      el.classList.add('rv');
      const p = el.parentElement;
      const i = groups.get(p) || 0; groups.set(p, i + 1);
      el.style.setProperty('--rv', Math.min(i, 8));
      if (instant || M.reduced() || !io) el.classList.add('in');
      else io.observe(el);
    }
  };
  M.whenVisible = function (el, cb, threshold) {
    if (M.reduced() || !('IntersectionObserver' in window)) { cb(); return; }
    const o = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); cb(); } }, { threshold: threshold || 0.25 });
    o.observe(el);
  };

  /* ---------------------------------------------------------------- card spotlight */
  M.spotlight = function () {
    if (!FINE.matches || M.reduced()) return;
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.glass');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
      card.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
    }, { passive: true });
  };

  /* ---------------------------------------------------------------- casting sequence */
  M.cast = function (steps, ms) {
    const el = document.getElementById('cast');
    if (!el || M.reduced()) return Promise.resolve();
    const stepEl = document.getElementById('castStep');
    const dur = ms || 2300;
    return new Promise((resolve) => {
      let done = false, i = 0;
      const finish = () => {
        if (done) return;
        done = true; clearInterval(iv); clearTimeout(to);
        el.classList.add('out');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => { el.hidden = true; el.classList.remove('on', 'out'); resolve(); }, 420);
      };
      const onKey = (e) => { if (e.key === 'Escape') finish(); };
      const show = () => { stepEl.classList.remove('sw'); void stepEl.offsetWidth; stepEl.textContent = steps[i]; stepEl.classList.add('sw'); };
      el.hidden = false;
      el.style.setProperty('--dur', dur + 'ms');
      requestAnimationFrame(() => el.classList.add('on'));
      show();
      const iv = setInterval(() => { i = Math.min(i + 1, steps.length - 1); show(); }, dur / steps.length);
      const to = setTimeout(finish, dur);
      el.querySelector('.cast-skip').onclick = finish;
      document.addEventListener('keydown', onKey);
    });
  };

  /* ---------------------------------------------------------------- numbers, tabs, progress */
  M.countUp = function (el, to, dur) {
    if (M.reduced()) { el.textContent = String(to); return; }
    const t0 = performance.now(), d = dur || 1100;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  M.indicator = function (container, sel) {
    if (!container || !sel) return;
    let ind = container.querySelector(':scope > .ind');
    if (!ind) { ind = document.createElement('span'); ind.className = 'ind'; ind.setAttribute('aria-hidden', 'true'); container.prepend(ind); }
    ind.style.width = sel.offsetWidth + 'px';
    ind.style.height = sel.offsetHeight + 'px';
    ind.style.transform = `translate(${sel.offsetLeft}px, ${sel.offsetTop}px)`;
  };
  M.progress = function () {
    const bar = document.getElementById('prog'), top = document.getElementById('toTop');
    const ring = top && top.querySelector('.tt-ring');
    let raf = 0;
    const upd = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const k = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      if (bar) bar.style.transform = `scaleX(${k.toFixed(4)})`;
      if (top) { top.classList.toggle('on', window.scrollY > 700); if (ring) ring.style.strokeDashoffset = String((1 - k) * 113.1); }
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    window.addEventListener('resize', upd);
    if (top) top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: M.reduced() ? 'auto' : 'smooth' }));
    upd();
  };

  /* ---------------------------------------------------------------- chart: planets fly in from the centre */
  M.flyOffsets = function (host) {
    const r = host.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    host.querySelectorAll('.chip').forEach((c) => {
      const b = c.getBoundingClientRect();
      c.style.setProperty('--fx', `${(cx - (b.left + b.width / 2)).toFixed(1)}px`);
      c.style.setProperty('--fy', `${(cy - (b.top + b.height / 2)).toFixed(1)}px`);
    });
  };

  /* ---------------------------------------------------------------- birth Moon phase */
  M.moonSvg = function (elong, size) {
    const r = 20, e = ((elong % 360) + 360) % 360;
    const waxing = e < 180;
    const k = Math.cos((e * Math.PI) / 180);       // +1 new, 0 half, −1 full (for the waxing half)
    const rx = Math.abs(k) * r;
    const crescent = waxing ? e < 90 : e > 270;
    const lit = `M0,${-r} A${r},${r} 0 0 1 0,${r} A${rx.toFixed(2)},${r} 0 0 ${crescent ? 0 : 1} 0,${-r} Z`;
    const s = size || 46;
    return `<svg class="moon" viewBox="-26 -26 52 52" width="${s}" height="${s}" aria-hidden="true">` +
      `<circle r="24" fill="rgba(241,217,130,.08)"/><circle r="${r}" fill="#1b1f3a" stroke="rgba(241,217,130,.35)" stroke-width=".8"/>` +
      `<path d="${lit}" fill="#F5EDD0" transform="${waxing ? '' : 'scale(-1,1)'}"/></svg>`;
  };

  root.JosiyamMotion = M;
})(typeof self !== 'undefined' ? self : this);
