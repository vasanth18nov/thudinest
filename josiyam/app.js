/*!
 * Josiyam · app.js
 * Interface: birth form, place search (bundled GeoNames list + optional OpenStreetMap search),
 * South Indian chart renderer with hover/tap inspection, report tabs, dasha timeline,
 * English/Tamil switching without losing the chart, share link and print sheet.
 */
(function () {
  'use strict';
  const E = window.JosiyamEngine, K = window.JosiyamData, S = window.JosiyamSastra;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;

  const SAMPLE = {
    name: null, gender: 'male', y: 1991, m: 6, d: 3, hh: 9, mm: 15, node: 'mean',
    place: { label: 'Coimbatore, Tamil Nadu, India', short: 'Coimbatore', ta: 'கோயம்புத்தூர்', lat: 11.006, lon: 76.966, tz: 'Asia/Kolkata' }
  };
  // South Indian grid: sign index → [row, col]; Meenam top-left, Mesham second in the top row, clockwise
  const POS = { 11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3], 3: [1, 3], 4: [2, 3], 5: [3, 3], 6: [3, 2], 7: [3, 1], 8: [3, 0], 9: [2, 0], 10: [1, 0] };
  const ORDER = ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  const state = {
    lang: 'en', chart: null, input: null, offsetMs: 0, sel: null, pinned: false, d9Tab: false, rtab: 'star', openMd: null,
    cities: null, citiesP: null, place: null, gender: 'male', ampm: 'am', node: 'mean', tzMode: 'auto', h24: false,
    list: [], active: -1, lastWorld: 0
  };

  /* ================================================================ i18n helpers */
  const L = (o, vars) => S.T(o, state.lang, vars);
  const t = (key, vars) => (K.ui[key] ? L(K.ui[key], vars) : key);
  const PN = (p) => L(K.planet[p]);
  const PD = (p) => L(K.planet[p].dasha);
  const PA = (p) => K.planet[p].ab[state.lang];
  const SN = (i) => (state.lang === 'ta' ? K.rasi[i].ta : K.rasi[i].en);
  const NK = (i) => L(K.nakshatra[i]);
  const ordn = (n) => S.ord(n, state.lang);

  function applyStatic() {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.title = t('pageTitle');
  }
  function updateToggle() {
    const tg = $('.lang-toggle');
    tg.dataset.active = state.lang;
    $$('button', tg).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  }
  function setLang(l, animate) {
    if (l !== 'en' && l !== 'ta') return;
    const apply = () => {
      state.lang = l;
      document.documentElement.lang = l;
      try { localStorage.setItem('josiyam-lang', l); } catch (e) { /* private mode */ }
      applyStatic();
      updateToggle();
      fillMinutes(true);
      if (state.place && !$('#fManual').checked) $('#fPlace').value = placeText(state.place);
      updateResolved();
      if (state.chart) renderAll(false);
    };
    if (animate && !reduced()) {
      document.body.classList.add('lang-fade');
      setTimeout(() => { apply(); requestAnimationFrame(() => document.body.classList.remove('lang-fade')); }, 180);
    } else apply();
  }

  /* ================================================================ formatting */
  function partsAt(ms) {
    const d = new Date(ms + (state.offsetMs || 0));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes() };
  }
  const monthName = (m) => (state.lang === 'ta' ? K.monthTa[m] : K.monthEn[m]);
  const fmtYMD = (y, m, d) => `${d} ${monthName(m)} ${y}`;
  function fmtDate(ms) { const p = partsAt(ms); return fmtYMD(p.y, p.m, p.d); }
  function fmtHM(h, m) {
    const ap = h < 12 ? 'am' : 'pm', h12 = h % 12 || 12;
    return state.lang === 'ta' ? `${t(ap)} ${h12}:${pad(m)}` : `${h12}:${pad(m)} ${t(ap)}`;
  }
  function fmtTime(ms) { const p = partsAt(ms); return fmtHM(p.hh, p.mm); }
  function fmtOffset(ms) {
    const sgn = ms < 0 ? '−' : '+';
    const a = Math.abs(Math.round(ms / 1000));
    const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), s = a % 60;
    return `${sgn}${pad(h)}:${pad(m)}${s ? ':' + pad(s) : ''}`;
  }
  function fmtCoord(lat, lon) {
    const ta = state.lang === 'ta';
    const ns = lat >= 0 ? (ta ? 'வ' : 'N') : (ta ? 'தெ' : 'S');
    const ew = lon >= 0 ? (ta ? 'கி' : 'E') : (ta ? 'மே' : 'W');
    return `${Math.abs(lat).toFixed(3)}° ${ns}, ${Math.abs(lon).toFixed(3)}° ${ew}`;
  }
  function placeText(p) {
    if (!p) return '';
    if (state.lang === 'ta' && p.ta) return p.label.replace(p.short, `${p.ta} (${p.short})`);
    return p.label;
  }
  const placeShort = (p) => (state.lang === 'ta' && p.ta ? p.ta : (p.short || p.label));

  /* ================================================================ background: stars + wheel */
  function initStars() {
    const cv = $('#stars');
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, stars = [], shoot = null, raf = 0, last = 0, nextShoot = 4000;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(320, Math.round((w * h) / 4800));
      stars = Array.from({ length: n }, () => {
        const r = Math.random();
        return {
          x: Math.random() * w, y: Math.random() * h, s: r < 0.86 ? 0.5 + Math.random() * 0.7 : 1.1 + Math.random() * 0.9,
          a: 0.25 + Math.random() * 0.65, sp: 0.4 + Math.random() * 1.6, ph: Math.random() * 6.28,
          c: r < 0.12 ? '255,214,140' : r < 0.2 ? '180,200,255' : '255,250,235', v: 0.004 + Math.random() * 0.012
        };
      });
      if (reduced()) draw(0, true);
    }
    function draw(tm, still) {
      ctx.clearRect(0, 0, w, h);
      const sec = tm / 1000;
      for (const st of stars) {
        if (!still) { st.y -= st.v * st.s; if (st.y < -2) { st.y = h + 2; st.x = Math.random() * w; } }
        const al = still ? st.a : st.a * (0.55 + 0.45 * Math.sin(sec * st.sp + st.ph));
        ctx.fillStyle = `rgba(${st.c},${al.toFixed(3)})`;
        if (st.s > 1.2) {
          ctx.beginPath(); ctx.arc(st.x, st.y, st.s, 0, 6.283); ctx.fill();
          if (al > 0.75) { ctx.fillStyle = `rgba(${st.c},${(al * 0.18).toFixed(3)})`; ctx.beginPath(); ctx.arc(st.x, st.y, st.s * 3.2, 0, 6.283); ctx.fill(); }
        } else ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      if (shoot) {
        const k = (tm - shoot.t0) / shoot.dur;
        if (k >= 1) shoot = null;
        else {
          const x = shoot.x + shoot.dx * k, y = shoot.y + shoot.dy * k;
          const g = ctx.createLinearGradient(x, y, x - shoot.dx * 0.18, y - shoot.dy * 0.18);
          g.addColorStop(0, `rgba(255,236,190,${(0.9 * (1 - k)).toFixed(3)})`); g.addColorStop(1, 'rgba(255,236,190,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - shoot.dx * 0.18, y - shoot.dy * 0.18); ctx.stroke();
        }
      }
    }
    function loop(tm) {
      raf = requestAnimationFrame(loop);
      if (tm - last < 30) return;          // ~30 fps is plenty for a starfield
      last = tm;
      if (!shoot && tm > nextShoot) {
        shoot = { t0: tm, dur: 900, x: Math.random() * w * 0.7 + w * 0.2, y: Math.random() * h * 0.35, dx: -(220 + Math.random() * 200), dy: 120 + Math.random() * 90 };
        nextShoot = tm + 7000 + Math.random() * 9000;
      }
      draw(tm, false);
    }
    resize();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); if (!reduced()) raf = requestAnimationFrame(loop); });
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced()) raf = requestAnimationFrame(loop);
    });
    if (!reduced()) raf = requestAnimationFrame(loop);
  }

  function buildWheel() {
    const svg = $('#wheel');
    const G = '♈♉♊♋♌♍♎♏♐♑♒♓';
    const pt = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; };
    const f = (n) => n.toFixed(1);
    let s = '<g fill="none" stroke="currentColor">';
    for (const [r, w, o] of [[292, 1.4, 0.8], [286, 0.8, 0.45], [232, 1.2, 0.7], [226, 0.7, 0.4], [176, 1, 0.55]]) s += `<circle r="${r}" stroke-width="${w}" opacity="${o}"/>`;
    for (let k = 0; k < 12; k++) { const [x1, y1] = pt(232, k * 30), [x2, y2] = pt(286, k * 30); s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="1" opacity=".65"/>`; }
    for (let j = 0; j < 108; j++) { const big = j % 4 === 0; const [x1, y1] = pt(big ? 226 : 229, j * 360 / 108), [x2, y2] = pt(232, j * 360 / 108); s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${big ? 1 : 0.6}" opacity="${big ? 0.8 : 0.45}"/>`; }
    s += '</g><g fill="currentColor" font-size="25" text-anchor="middle" dominant-baseline="central" font-family="serif">';
    for (let k = 0; k < 12; k++) { const [x, y] = pt(259, k * 30 + 15); s += `<text x="${f(x)}" y="${f(y)}" opacity=".85">${G[k]}&#xFE0E;</text>`; }
    s += '</g><g class="inner" fill="none" stroke="currentColor" stroke-width="1">';
    for (let i = 0; i < 16; i++) s += `<path transform="rotate(${i * 22.5})" d="M0,-174 C 20,-156 20,-134 0,-120 C -20,-134 -20,-156 0,-174 Z" opacity=".55"/>`;
    for (let i = 0; i < 8; i++) s += `<path transform="rotate(${i * 45 + 22.5})" d="M0,-120 C 30,-100 30,-76 0,-62 C -30,-76 -30,-100 0,-120 Z" opacity=".5"/>`;
    s += '<circle r="118" opacity=".5"/>';
    const tri = (r, dy, up) => { const y0 = up ? -r : r, y1 = up ? r / 2 : -r / 2; return `<path d="M0,${f(y0 + dy)} L${f(r * 0.866)},${f(y1 + dy)} L${f(-r * 0.866)},${f(y1 + dy)} Z" opacity=".7"/>`; };
    for (const [r, dy] of [[104, -6], [78, 9], [55, -10], [33, 6]]) s += tri(r, dy, true);
    for (const [r, dy] of [[100, 7], [74, -8], [50, 10], [30, -6], [14, 0]]) s += tri(r, dy, false);
    s += '<circle r="3.5" fill="currentColor"/></g>';
    svg.innerHTML = s;
  }

  /* ================================================================ form */
  function setSeg(id, v) { $$(`#${id} [role="radio"]`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === v))); }
  function onSeg(id, v) {
    if (id === 'fGender') state.gender = v;
    else if (id === 'fAmPm') state.ampm = v;
    else if (id === 'fNode') state.node = v;
    else if (id === 'fTzMode') { state.tzMode = v; $('#fOffset').disabled = v !== 'fixed'; }
    updateResolved();
  }
  function fillHours() {
    const sel = $('#fHour');
    const hrs = state.h24 ? Array.from({ length: 24 }, (_, i) => i) : Array.from({ length: 12 }, (_, i) => i + 1);
    sel.innerHTML = '<option value="">--</option>' + hrs.map((h) => `<option value="${h}">${pad(h)}</option>`).join('');
    $('#fAmPm').hidden = state.h24;
  }
  function fillMinutes(keep) {
    const sel = $('#fMin'), cur = sel.value;
    sel.innerHTML = '<option value="">--</option>' + Array.from({ length: 60 }, (_, i) => `<option value="${i}">${pad(i)}</option>`).join('');
    if (keep) sel.value = cur;
  }
  function getHour24() {
    const v = $('#fHour').value;
    if (v === '') return null;
    const h = +v;
    return state.h24 ? h : (h % 12) + (state.ampm === 'pm' ? 12 : 0);
  }
  function setHour24(h) {
    if (state.h24) { $('#fHour').value = String(h); return; }
    $('#fHour').value = String((h % 12) || 12);
    state.ampm = h >= 12 ? 'pm' : 'am';
    setSeg('fAmPm', state.ampm);
  }
  function readDate() {
    const v = $('#fDate').value;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1800 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(2000, mo - 1, d)); dt.setUTCFullYear(y);
    if (dt.getUTCDate() !== d) return null;
    return { y, m: mo, d };
  }
  function readDateTime() {
    const d = readDate(), h = getHour24(), mi = $('#fMin').value;
    if (!d || h == null || mi === '') return null;
    return { ...d, hh: h, mm: +mi };
  }
  function parseOffset(s) {
    const v = String(s || '').trim().replace('−', '-');
    let m = /^([+-])?(\d{1,2})(?::?(\d{2}))?$/.exec(v);
    if (m) {
      const sg = m[1] === '-' ? -1 : 1, h = +m[2], mi = m[3] ? +m[3] : 0;
      if (h > 14 || mi > 59) return null;
      return sg * (h * 60 + mi);
    }
    m = /^([+-]?\d{1,2}(?:\.\d+)?)$/.exec(v);
    if (m) { const x = parseFloat(m[1]); if (Math.abs(x) <= 14) return Math.round(x * 60); }
    return null;
  }
  const tzFromCoords = (lat, lon) => { try { return window.tzlookup ? window.tzlookup(lat, lon) : null; } catch (e) { return null; } };

  function currentPlace() {
    if ($('#fManual').checked) {
      const lat = parseFloat($('#fLat').value.replace('−', '-')), lon = parseFloat($('#fLon').value.replace('−', '-'));
      if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
      const label = fmtCoord(lat, lon);
      if (state.tzMode === 'fixed') {
        const off = parseOffset($('#fOffset').value);
        if (off == null) return null;
        return { label, short: label, lat, lon, tz: null, offsetMinutes: off, manual: true };
      }
      return { label, short: label, lat, lon, tz: tzFromCoords(lat, lon), offsetMinutes: null, manual: true };
    }
    return state.place;
  }
  function updateResolved() {
    const el = $('#resolved');
    const p = currentPlace();
    if (!p) { el.textContent = ''; return; }
    let tzTxt = p.tz ? p.tz : 'UTC' + fmtOffset((p.offsetMinutes || 0) * 60000);
    const dt = readDateTime();
    if (dt && p.tz) {
      try { tzTxt += ' · ' + t('offsetAtBirth', { x: fmtOffset(E.localToUtc({ ...dt, tz: p.tz }).offsetMs) }); } catch (e) { /* ignore */ }
    }
    el.innerHTML = `${p.manual ? '' : esc(placeText(p)) + ' · '}${esc(fmtCoord(p.lat, p.lon))} <span class="tzline">· ${esc(tzTxt)}</span>`;
  }

  /* ---- place search ---- */
  function norm(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9஀-௿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function loadCities() {
    if (state.cities) return Promise.resolve(state.cities);
    if (!state.citiesP) {
      state.citiesP = fetch('data/cities.json').then((r) => { if (!r.ok) throw new Error('cities'); return r.json(); }).then((d) => {
        state.cities = d.c.map((r) => {
          const alias = r[7] ? r[7].split('|') : [];
          const ta = r[8] ? r[8].split('|') : [];
          return { name: r[0], lat: r[1], lon: r[2], tz: d.tz[r[3]], adm: d.adm[r[4]], cc: r[5], country: d.cc[r[5]] || r[5], pop: r[6], ta, k: [norm(r[0])].concat(alias.map(norm)) };
        });
        return state.cities;
      }).catch((e) => { state.citiesP = null; throw e; });
    }
    return state.citiesP;
  }
  function searchCities(q) {
    if (!state.cities) return [];
    const nq = norm(q), raw = q.trim();
    if (!nq) return [];
    const tamil = /[஀-௿]/.test(raw);
    const res = [];
    for (const c of state.cities) {
      let s = 0;
      if (tamil) {
        for (const x of c.ta) { if (x.startsWith(raw)) s = Math.max(s, 3); else if (x.includes(raw)) s = Math.max(s, 1); }
      } else {
        for (let i = 0; i < c.k.length; i++) {
          const k = c.k[i];
          if (k === nq) s = Math.max(s, i === 0 ? 5 : 4.5);
          else if (k.startsWith(nq)) s = Math.max(s, i === 0 ? 3 : 2.6);
          else if (k.includes(' ' + nq)) s = Math.max(s, 1.6);
          else if (nq.length >= 3 && k.includes(nq)) s = Math.max(s, 1);
        }
      }
      if (s > 0) res.push({ c, s: s + Math.log10(c.pop + 10) / 8 + (c.cc === 'IN' ? 0.15 : 0) });
    }
    res.sort((a, b) => b.s - a.s);
    return res.slice(0, 8).map((x) => x.c);
  }
  function cityToPlace(c) {
    const region = [c.adm && c.adm !== c.name ? c.adm : null, c.country].filter(Boolean).join(', ');
    return { label: region ? `${c.name}, ${region}` : c.name, short: c.name, ta: c.ta[0] || null, lat: c.lat, lon: c.lon, tz: c.tz };
  }
  function openList(items, q, info) {
    const ul = $('#placeList');
    state.list = items;
    state.active = -1;
    let html = items.map((it, i) => {
      const nm = state.lang === 'ta' && it.ta ? `${it.ta} <span class="pr">(${esc(it.short)})</span>` : esc(it.short);
      const region = it.region != null ? it.region : it.label.slice(it.short.length + 2);
      return `<li role="option" id="opt${i}" data-i="${i}" aria-selected="false"><span class="pn">${nm}</span><span class="pr">${esc(region)}</span></li>`;
    }).join('');
    if (info) html += `<li class="info" role="presentation">${esc(info)}</li>`;
    if (q && q.trim().length >= 3) html += `<li class="world" role="option" id="optW" data-world="1" aria-selected="false">⌕ ${esc(t('searchWorld', { x: q.trim() }))}</li>`;
    ul.innerHTML = html;
    ul.hidden = !html;
    $('#fPlace').setAttribute('aria-expanded', String(!ul.hidden));
  }
  function closeList() { $('#placeList').hidden = true; $('#fPlace').setAttribute('aria-expanded', 'false'); $('#fPlace').removeAttribute('aria-activedescendant'); }
  function moveActive(d) {
    const opts = $$('#placeList [role="option"]');
    if (!opts.length) return;
    state.active = (state.active + d + opts.length) % opts.length;
    opts.forEach((o, i) => o.setAttribute('aria-selected', String(i === state.active)));
    const a = opts[state.active];
    $('#fPlace').setAttribute('aria-activedescendant', a.id);
    a.scrollIntoView({ block: 'nearest' });
  }
  function choose(item) {
    state.place = item;
    $('#fPlace').value = placeText(item);
    $('#fPlace').classList.remove('invalid');
    closeList();
    updateResolved();
  }
  async function worldSearch(q) {
    const now = Date.now();
    if (now - state.lastWorld < 1100) return;          // Nominatim policy: at most one request per second
    state.lastWorld = now;
    openList([], '', t('searching'));
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&q=${encodeURIComponent(q)}&accept-language=${state.lang === 'ta' ? 'ta,en' : 'en'}`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('http ' + r.status);
      const js = await r.json();
      const items = js.map((x) => {
        const lat = +x.lat, lon = +x.lon, nm = x.name || String(x.display_name).split(',')[0];
        return { label: x.display_name, short: nm, region: String(x.display_name).split(',').slice(1).join(',').trim(), ta: null, lat, lon, tz: tzFromCoords(lat, lon) };
      }).filter((x, i, all) => isFinite(x.lat) && isFinite(x.lon) && all.findIndex((y) => y.label === x.label) === i);
      if (!items.length) openList([], '', t('noPlace'));
      else openList(items, '');
    } catch (e) { openList([], '', t('netError')); }
  }
  function initPlace() {
    const inp = $('#fPlace'), ul = $('#placeList');
    let timer = 0;
    const run = () => {
      const q = inp.value;
      if (!q.trim()) { closeList(); return; }
      loadCities().then(() => {
        const hits = searchCities(q).map(cityToPlace);
        openList(hits, q, hits.length ? null : t('noPlace'));
      }).catch(() => openList([], q, t('netError')));
    };
    inp.addEventListener('focus', () => { loadCities().catch(() => {}); });
    inp.addEventListener('input', () => {
      if (state.place && inp.value !== placeText(state.place)) { state.place = null; updateResolved(); }
      clearTimeout(timer); timer = setTimeout(run, 90);
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (ul.hidden) run(); else moveActive(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') {
        if (!ul.hidden) {
          e.preventDefault();
          const opts = $$('#placeList [role="option"]');
          const o = opts[state.active >= 0 ? state.active : 0];
          if (o) pick(o);
        }
      } else if (e.key === 'Escape') closeList();
    });
    const pick = (li) => {
      if (li.dataset.world) worldSearch(inp.value);
      else if (li.dataset.i != null) choose(state.list[+li.dataset.i]);
    };
    ul.addEventListener('mousedown', (e) => e.preventDefault());
    ul.addEventListener('click', (e) => { const li = e.target.closest('li[role="option"]'); if (li) pick(li); });
    inp.addEventListener('blur', () => setTimeout(closeList, 150));
  }

  function showError(key, field) {
    $('#formError').textContent = key ? t(key) : '';
    $$('.invalid').forEach((x) => x.classList.remove('invalid'));
    if (field) { const f = $(field); f.classList.add('invalid'); f.focus({ preventScroll: false }); }
  }

  async function onSubmit(e) {
    e.preventDefault();
    showError(null);
    const d = readDate();
    if (!d) return showError('errDate', '#fDate');
    const hh = getHour24(), mi = $('#fMin').value;
    if (hh == null) return showError('errTime', '#fHour');
    if (mi === '') return showError('errTime', '#fMin');
    let place;
    if ($('#fManual').checked) {
      const lat = parseFloat($('#fLat').value.replace('−', '-')), lon = parseFloat($('#fLon').value.replace('−', '-'));
      if (!isFinite(lat) || Math.abs(lat) > 90) return showError('errLatLon', '#fLat');
      if (!isFinite(lon) || Math.abs(lon) > 180) return showError('errLatLon', '#fLon');
      if (state.tzMode === 'fixed' && parseOffset($('#fOffset').value) == null) return showError('errTz', '#fOffset');
      place = currentPlace();
    } else {
      place = state.place;
      if (!place && $('#fPlace').value.trim()) {
        try { await loadCities(); const hit = searchCities($('#fPlace').value)[0]; if (hit) { choose(cityToPlace(hit)); place = state.place; } } catch (err) { /* offline */ }
      }
      if (!place) return showError('errPlace', '#fPlace');
    }
    const name = $('#fName').value.trim().slice(0, 60);
    generate({ name: name || null, gender: state.gender, ...d, hh, mm: +mi, node: state.node, place }, true);
  }

  function fillForm(input) {
    $('#fName').value = input.name || '';
    state.gender = input.gender || 'male'; setSeg('fGender', state.gender);
    $('#fDate').value = `${String(input.y).padStart(4, '0')}-${pad(input.m)}-${pad(input.d)}`;
    setHour24(input.hh);
    $('#fMin').value = String(input.mm);
    state.node = input.node || 'mean'; setSeg('fNode', state.node);
    if (input.place.manual) {
      $('#fManual').checked = true; $('#manualBox').hidden = false; $('#placeField').hidden = true;
      $('#fLat').value = input.place.lat; $('#fLon').value = input.place.lon;
      state.tzMode = input.place.tz ? 'auto' : 'fixed'; setSeg('fTzMode', state.tzMode);
      $('#fOffset').disabled = state.tzMode !== 'fixed';
      if (!input.place.tz) $('#fOffset').value = fmtOffset((input.place.offsetMinutes || 0) * 60000).replace('−', '-');
      state.place = null;
    } else {
      $('#fManual').checked = false; $('#manualBox').hidden = true; $('#placeField').hidden = false;
      state.place = input.place;
      $('#fPlace').value = placeText(input.place);
    }
    updateResolved();
  }

  function initForm() {
    fillHours(); fillMinutes();
    $$('.seg[role="radiogroup"]').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('button[role="radio"]');
      if (!b) return;
      setSeg(g.id, b.dataset.v);
      onSeg(g.id, b.dataset.v);
    }));
    $('#f24').addEventListener('change', (e) => {
      const cur = getHour24();
      state.h24 = e.target.checked;
      fillHours();
      if (cur != null) setHour24(cur);
      updateResolved();
    });
    ['#fDate', '#fHour', '#fMin', '#fLat', '#fLon', '#fOffset'].forEach((s) => {
      $(s).addEventListener('change', () => { $(s).classList.remove('invalid'); updateResolved(); });
      $(s).addEventListener('input', updateResolved);
    });
    $('#fManual').addEventListener('change', (e) => {
      $('#manualBox').hidden = !e.target.checked;
      $('#placeField').hidden = e.target.checked;
      if (e.target.checked && state.place && !$('#fLat').value) { $('#fLat').value = state.place.lat; $('#fLon').value = state.place.lon; }
      updateResolved();
    });
    $('#birth').addEventListener('submit', onSubmit);
    $('#sampleBtn').addEventListener('click', () => {
      const s = { ...SAMPLE, name: t('sampleName'), place: { ...SAMPLE.place } };
      fillForm(s);
      generate(s, true);
    });
    initPlace();
  }

  /* ================================================================ generate */
  function generate(input, animate) {
    try {
      if (!E || !window.Astronomy) throw new Error('engine not loaded');
      const conv = E.localToUtc({ y: input.y, m: input.m, d: input.d, hh: input.hh, mm: input.mm, tz: input.place.tz, offsetMinutes: input.place.offsetMinutes });
      const chart = E.computeChart({ utcMs: conv.utcMs, lat: input.place.lat, lon: input.place.lon, nodeType: input.node, offsetMs: conv.offsetMs });
      const civilWd = new Date(Date.UTC(2000, input.m - 1, input.d)); civilWd.setUTCFullYear(input.y);
      Object.assign(state, { chart, input, offsetMs: conv.offsetMs, sel: null, pinned: false, openMd: null, rtab: 'star', beforeSunrise: civilWd.getUTCDay() !== chart.panchang.weekday });
      $('#results').hidden = false;
      document.body.classList.add('has-chart');
      renderAll(animate && !reduced());
      showError(null);
      requestAnimationFrame(() => $('#results').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }));
    } catch (err) {
      console.error(err);
      showError('errCalc');
    }
  }

  function renderAll(animate) {
    renderWho();
    renderChart($('#d1'), 'd1', animate);
    renderChart($('#d9'), 'd9', animate);
    applyHighlights();
    renderInspector();
    renderTable();
    renderReport();
    renderDasha();
    renderPrint();
    setChartTab(state.d9Tab);
  }

  /* ================================================================ header */
  function birthLine() {
    const ip = state.input;
    return `${fmtYMD(ip.y, ip.m - 1, ip.d)} · ${fmtHM(ip.hh, ip.mm)} · ${placeShort(ip.place)}`;
  }
  function renderWho() {
    const ip = state.input;
    $('#who').innerHTML = `<div class="wn">${esc(ip.name || t('jathagamSheet'))}</div><div class="wd">${esc(birthLine())} · UTC${esc(fmtOffset(state.offsetMs))}</div>`;
  }

  /* ================================================================ South Indian chart */
  function renderChart(host, kind, animate) {
    const c = state.chart;
    const occ = kind === 'd1' ? c.occupants : c.occupantsD9;
    const lagna = kind === 'd1' ? c.lagnaSign : c.navamsaLagna;
    let idx = 0;
    const cells = [];
    for (let s = 0; s < 12; s++) {
      const [r, col] = POS[s];
      const names = ORDER.filter((p) => occ[s].includes(p));
      const chips = names.map((p) => {
        const b = c.bodies[p];
        const cls = p === 'Lagna' ? 'lg' : (b.natural === 'benefic' ? 'b' : 'm');
        const deg = kind === 'd1' ? `<span class="dg">${Math.floor(b.deg)}°</span>` : '';
        const rt = b.retro && p !== 'Rahu' && p !== 'Ketu' ? `<span class="rt">${t('retroMark')}</span>` : '';
        return `<span class="chip ${cls}" data-p="${p}" style="--i:${idx++}" title="${esc(PN(p))}">${esc(PA(p))}${deg}${rt}</span>`;
      }).join('');
      const h = E.houseFrom(lagna, s);
      const label = `${SN(s)}. ${t('houseN', { h })}. ${names.length ? names.map(PN).join(', ') : t('none')}`;
      cells.push(`<div class="cell${s === lagna ? ' lagna' : ''}" role="button" tabindex="0" data-s="${s}" data-k="${kind}" style="grid-row:${r + 1};grid-column:${col + 1}" aria-label="${esc(label)}">${chips}<span class="hn">${h}</span><span class="sl">${esc(K.signAbbr[state.lang][s])}</span></div>`);
    }
    let center;
    if (kind === 'd1') {
      const ip = state.input;
      center = [
        `<div class="ct">${esc(t('rasiCenter'))}</div>`,
        ip.name ? `<div class="cl"><b>${esc(ip.name)}</b></div>` : '',
        `<div class="cl">${esc(fmtYMD(ip.y, ip.m - 1, ip.d))} · ${esc(fmtHM(ip.hh, ip.mm))}</div>`,
        `<div class="cl">${esc(placeShort(ip.place))}</div>`,
        '<div class="orn"></div>',
        `<div class="cl">${esc(t('janmaNak'))}: <b>${esc(NK(c.janmaNakshatra))} ${c.janmaPada}</b></div>`,
        `<div class="cl">${esc(t('janmaRasi'))}: <b>${esc(SN(c.moonSign))}</b> · ${esc(t('lagna'))}: <b>${esc(SN(c.lagnaSign))}</b></div>`
      ].join('');
    } else {
      const cur = E.currentPeriod(c.dasha, Date.now());
      center = [
        `<div class="ct">${esc(t('navamsaCenter'))}</div>`,
        cur ? `<div class="cl">${esc(t('dashaNow'))}</div><div class="cl"><b>${esc(t('dashaPeriod', { p: PD(cur.maha.lord), q: PD(cur.bhukti.lord) }))}</b></div><div class="cl">→ ${esc(fmtDate(cur.bhukti.end))}</div>` : '',
        '<div class="orn"></div>',
        `<div class="cl">${esc(t('ayanamsa'))}: <b>${esc(t('ayanamsaName'))}</b></div>`,
        `<div class="cl">${esc(c.ayanamsaText)}</div>`
      ].join('');
    }
    // grid lines (viewBox 400) — drawn in sequence when animating
    const ln = (d, cls, delay) => `<path class="ln ${cls || ''}" pathLength="1" d="${d}" style="--d:${delay}s"/>`;
    const [lr, lc] = POS[lagna];
    const x = lc * 100, y = lr * 100;
    const lines = [
      ln('M0 0H400V400H0Z', 'outer', 0),
      ln('M0 100H400', '', 0.12), ln('M0 300H400', '', 0.2), ln('M100 0V400', '', 0.28), ln('M300 0V400', '', 0.36),
      ln('M0 200H100', '', 0.46), ln('M300 200H400', '', 0.5), ln('M200 0V100', '', 0.54), ln('M200 300V400', '', 0.58),
      ln(`M${x} ${y + 22}L${x + 22} ${y}`, 'lg', 0.9), ln(`M${x} ${y + 31}L${x + 31} ${y}`, 'lg', 0.98)
    ].join('');
    host.classList.remove('anim');
    host.innerHTML = `<div class="grid">${cells.join('')}<div class="center">${center}</div></div><svg class="lines" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>`;
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', kind === 'd1' ? t('rasiChart') : t('navamsaChart'));
    if (animate) { void host.offsetWidth; host.classList.add('anim'); }
  }

  /* ---- selection & highlights ---- */
  function setSel(sel, pinned) {
    state.sel = sel; state.pinned = !!pinned && !!sel;
    applyHighlights();
    renderInspector();
  }
  function applyHighlights() {
    $$('.si-chart .is-sel, .si-chart .is-lord, .si-chart .is-aspect, .si-chart .is-aspector, .ptable .is-sel').forEach((el) => el.classList.remove('is-sel', 'is-lord', 'is-aspect', 'is-aspector'));
    const sel = state.sel, c = state.chart;
    if (!sel || !c) return;
    if (sel.type === 'planet') {
      const b = c.bodies[sel.p];
      $$(`.chip[data-p="${sel.p}"]`).forEach((x) => x.classList.add('is-sel'));
      $(`.ptable tr[data-p="${sel.p}"]`)?.classList.add('is-sel');
      const lordD1 = E.SIGN_LORD[b.sign], lordD9 = E.SIGN_LORD[b.navamsa];
      $(`#d1 .chip[data-p="${lordD1}"]`)?.classList.add('is-lord');
      $(`#d9 .chip[data-p="${lordD9}"]`)?.classList.add('is-lord');
      if (sel.p !== 'Lagna') c.aspects[sel.p].forEach((s) => $(`#d1 .cell[data-s="${s}"]`)?.classList.add('is-aspect'));
    } else {
      const host = sel.k === 'd9' ? '#d9' : '#d1';
      $(`${host} .cell[data-s="${sel.s}"]`)?.classList.add('is-sel');
      $(`${host} .chip[data-p="${E.SIGN_LORD[sel.s]}"]`)?.classList.add('is-lord');
      if (sel.k === 'd1') E.PLANETS.filter((p) => c.aspects[p].includes(sel.s)).forEach((p) => $(`#d1 .chip[data-p="${p}"]`)?.classList.add('is-aspector'));
    }
  }
  function factsHtml(rows) { return `<dl class="facts">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`; }
  function renderInspector() {
    const el = $('#inspector'), c = state.chart, sel = state.sel;
    if (!c) return;
    if (!sel) { el.innerHTML = `<p class="hint">${esc(t('chartHint'))}</p>`; return; }
    const tagsFor = (b) => [b.retro && b.name !== 'Rahu' && b.name !== 'Ketu' ? `<span class="tag rt">${esc(t('retro'))}</span>` : '', b.combust ? `<span class="tag down">${esc(t('combust'))}</span>` : '', b.vargottama ? `<span class="tag up">${esc(t('vargottama'))}</span>` : ''].join('');
    if (sel.type === 'planet') {
      const p = sel.p, b = c.bodies[p];
      const lord = E.SIGN_LORD[b.sign], lb = c.bodies[lord];
      const rows = [
        [t('inspDegree'), `${esc(b.degText)} <span class="tzline">(${esc(b.lonText)})</span>`],
        [t('inspStar'), `${esc(NK(b.nakshatra))} · ${esc(t('pada'))} ${b.pada}`],
        [t('inspStarLord'), esc(PN(b.nakLord))],
        [t('thNav'), esc(SN(b.navamsa))],
        [t('inspHouseFromLagna'), esc(String(b.house))],
        [t('inspLord'), esc(t('inspLordAt', { p: PN(lord), h: lb.house, s: SN(lb.sign) }))]
      ];
      if (b.dignity) rows.splice(5, 0, [t('thDignity'), esc(L(K.dignity[b.dignity]))]);
      if (p !== 'Lagna') rows.push([t('inspAspects'), esc(c.aspects[p].map((s) => `${E.houseFrom(c.lagnaSign, s)} (${SN(s)})`).join(', '))]);
      const tags = tagsFor(b);
      if (tags) rows.push([t('thNotes'), tags]);
      const note = (p === 'Rahu' || p === 'Ketu') ? `<p class="hint">${esc(t('inspNodeNote'))}</p>` : '';
      el.innerHTML = `<div class="ih"><span class="it">${esc(t('inspPlanet', { p: PN(p), ...S.signVars(b.sign, state.lang) }))}</span></div>${factsHtml(rows)}${note}`;
    } else {
      const s = sel.s, d9 = sel.k === 'd9';
      const lagna = d9 ? c.navamsaLagna : c.lagnaSign;
      const h = E.houseFrom(lagna, s);
      const occ = (d9 ? c.occupantsD9 : c.occupants)[s].filter((p) => p !== 'Lagna');
      const lord = E.SIGN_LORD[s], lb = c.bodies[lord];
      const lordH = d9 ? E.houseFrom(lagna, lb.navamsa) : lb.house, lordS = d9 ? lb.navamsa : lb.sign;
      const rows = [
        [t('inspLord'), esc(t('inspLordAt', { p: PN(lord), h: lordH, s: SN(lordS) }))],
        [t('inspOccupants'), esc(occ.length ? occ.map(PN).join(', ') : t('none'))]
      ];
      if (!d9) {
        const asp = E.PLANETS.filter((p) => c.aspects[p].includes(s));
        rows.push([t('inspAspectedBy'), esc(asp.length ? asp.map(PN).join(', ') : t('none'))]);
        rows.push([L(K.house[h - 1].name), esc(L(K.house[h - 1]))]);
      }
      const title = (d9 ? t('navamsaCenter') + ' · ' : '') + t('inspHouse', { h, s: SN(s) });
      el.innerHTML = `<div class="ih"><span class="it">${esc(title)}</span></div>${factsHtml(rows)}`;
    }
  }
  function initChartEvents() {
    const charts = $('.charts');
    charts.addEventListener('pointerover', (e) => {
      if (state.pinned || e.pointerType === 'touch') return;
      const chip = e.target.closest('.chip');
      if (chip) { setSel({ type: 'planet', p: chip.dataset.p }, false); return; }
      const cell = e.target.closest('.cell');
      if (cell) setSel({ type: 'house', s: +cell.dataset.s, k: cell.dataset.k }, false);
    });
    charts.addEventListener('pointerleave', () => { if (!state.pinned) setSel(null); });
    charts.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      const cell = e.target.closest('.cell');
      if (chip) {
        const same = state.pinned && state.sel && state.sel.type === 'planet' && state.sel.p === chip.dataset.p;
        setSel(same ? null : { type: 'planet', p: chip.dataset.p }, !same);
      } else if (cell) {
        const s = +cell.dataset.s, k = cell.dataset.k;
        const same = state.pinned && state.sel && state.sel.type === 'house' && state.sel.s === s && state.sel.k === k;
        setSel(same ? null : { type: 'house', s, k }, !same);
      }
    });
    charts.addEventListener('keydown', (e) => {
      const cell = e.target.closest('.cell');
      if (cell && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSel({ type: 'house', s: +cell.dataset.s, k: cell.dataset.k }, true); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.sel) setSel(null); });
    $$('.chart-tabs [role="tab"]').forEach((b) => b.addEventListener('click', () => setChartTab(b.id === 'tabD9')));
  }
  function setChartTab(d9) {
    state.d9Tab = d9;
    $('#tabD1').setAttribute('aria-selected', String(!d9));
    $('#tabD9').setAttribute('aria-selected', String(d9));
    $('#d1Wrap').dataset.hidden = d9 ? '1' : '0';
    $('#d9Wrap').dataset.hidden = d9 ? '0' : '1';
  }

  /* ================================================================ planet table */
  function renderTable() {
    const c = state.chart;
    const head = ['thGraha', 'thRasi', 'thDegree', 'thNak', 'thPada', 'thStarLord', 'thNav', 'thHouse', 'thDignity', 'thNotes'].map((k) => `<th scope="col">${esc(t(k))}</th>`).join('');
    const rows = ORDER.map((p) => {
      const b = c.bodies[p];
      const cls = p === 'Lagna' ? 'lg' : (b.natural === 'benefic' ? 'b' : 'm');
      const dig = b.dignity ? `<span class="tag ${['exalted', 'moolatrikona', 'own'].includes(b.dignity) ? 'up' : b.dignity === 'debilitated' ? 'down' : ''}">${esc(L(K.dignity[b.dignity].short))}</span>` : '—';
      const notes = [b.retro && p !== 'Rahu' && p !== 'Ketu' ? `<span class="tag rt">${esc(t('retro'))}</span>` : '', b.combust ? `<span class="tag down">${esc(t('combust'))}</span>` : '', b.vargottama ? `<span class="tag up">${esc(t('vargottama'))}</span>` : ''].join('');
      return `<tr data-p="${p}" tabindex="0"><td class="pn ${cls}">${esc(p === 'Lagna' ? L(K.planet.Lagna.short) : PN(p))}</td><td>${esc(SN(b.sign))}</td><td class="mono">${esc(b.degText)}</td><td>${esc(NK(b.nakshatra))}</td><td class="mono">${b.pada}</td><td>${esc(PN(b.nakLord))}</td><td>${esc(SN(b.navamsa))}</td><td class="mono">${b.house}</td><td>${dig}</td><td>${notes || '—'}</td></tr>`;
    }).join('');
    $('#ptable').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody>`;
    applyHighlights();
  }
  function initTableEvents() {
    const tb = $('#ptable');
    const act = (tr) => {
      const p = tr.dataset.p;
      const same = state.pinned && state.sel && state.sel.type === 'planet' && state.sel.p === p;
      setSel(same ? null : { type: 'planet', p }, !same);
    };
    tb.addEventListener('click', (e) => { const tr = e.target.closest('tbody tr'); if (tr) act(tr); });
    tb.addEventListener('keydown', (e) => { const tr = e.target.closest('tbody tr'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); act(tr); } });
  }

  /* ================================================================ report */
  function cardHtml(cd) {
    const facts = cd.facts && cd.facts.length ? `<dl class="facts">${cd.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
    const rule = cd.rule ? `<p class="rule">${esc(L(K.yogaUi.rule))}: ${esc(cd.rule)}</p>` : '';
    const paras = (cd.paras || []).map((p) => `<p>${esc(p)}</p>`).join('');
    const sub = cd.sub && cd.sub.length ? `<p class="subT">${esc(cd.subTitle || '')}</p><ul>${cd.sub.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const badge = cd.badge ? `<span class="badge">${esc(cd.badge)}</span>` : '';
    return `<article class="rcard glass ${cd.tone || ''}"><div class="rc-head"><h4 class="rc-title">${esc(cd.title)}</h4>${badge}</div>${rule}${facts}${paras}${sub}</article>`;
  }
  function renderReport() {
    const rep = S.buildReport(state.chart, state.lang, {
      nowMs: Date.now(), gender: state.input.gender, fmtDate, fmtTime, beforeSunrise: state.beforeSunrise
    });
    state.report = rep;
    if (!rep.sections.some((s) => s.id === state.rtab)) state.rtab = rep.sections[0].id;
    $('#rtabs').innerHTML = rep.sections.map((s) => `<button type="button" role="tab" id="rt-${s.id}" aria-controls="rp-${s.id}" aria-selected="${s.id === state.rtab}" tabindex="${s.id === state.rtab ? 0 : -1}">${esc(s.title)}</button>`).join('');
    $('#rpanels').innerHTML = rep.sections.map((s) => {
      let body;
      if (s.id === 'yoga') {
        body = `<h4 class="group-title">${esc(L(K.yogaUi.found))}</h4><div class="cards">${s.found.map(cardHtml).join('')}</div>` +
          (s.absent.length ? `<h4 class="group-title">${esc(L(K.yogaUi.checked))}</h4><div class="absent-list">${s.absent.map((a) => `<span title="${esc(a.rule)}">${esc(a.name)}</span>`).join('')}</div>` : '');
      } else if (s.id === 'dasha') {
        const main = s.cards.filter((c) => c.group !== 'transit'), tr = s.cards.filter((c) => c.group === 'transit');
        body = `<div class="cards">${main.map(cardHtml).join('')}</div>` + (tr.length ? `<h4 class="group-title">${esc(L(K.transit.title))}</h4><div class="cards">${tr.map(cardHtml).join('')}</div>` : '');
      } else body = `<div class="cards">${s.cards.map(cardHtml).join('')}</div>`;
      return `<section class="rpanel${s.id === state.rtab ? ' on' : ''}" role="tabpanel" id="rp-${s.id}" aria-labelledby="rt-${s.id}" tabindex="0"><h3 class="pt">${esc(s.title)}</h3>${body}</section>`;
    }).join('');
  }
  function setReportTab(id, focus) {
    state.rtab = id;
    $$('#rtabs [role="tab"]').forEach((b) => { const on = b.id === 'rt-' + id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    $$('#rpanels .rpanel').forEach((p) => p.classList.toggle('on', p.id === 'rp-' + id));
  }
  function initReportEvents() {
    $('#rtabs').addEventListener('click', (e) => { const b = e.target.closest('[role="tab"]'); if (b) setReportTab(b.id.slice(3)); });
    $('#rtabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = $$('#rtabs [role="tab"]'), i = tabs.findIndex((b) => b.id === 'rt-' + state.rtab);
      const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setReportTab(tabs[n].id.slice(3), true);
      e.preventDefault();
    });
  }

  /* ================================================================ dasha */
  function renderDasha() {
    const c = state.chart, D = c.dasha, now = Date.now();
    const bal = D.balance;
    $('#balance').innerHTML = `${esc(t('balance'))}: <b>${esc(t('balanceVal', { p: PD(D.firstLord), y: bal.y, m: bal.m, d: bal.d }))}</b>`;
    const span = D.endMs - D.birthMs;
    const ageAt = (ms) => Math.max(0, Math.floor((ms - D.birthMs) / E.YEAR_MS));
    const cur = E.currentPeriod(D, now);
    let tl = '';
    let ages = '';
    for (const md of D.mahas) {
      const a = Math.max(md.start, D.birthMs), b = Math.min(md.end, D.endMs);
      if (b <= a) continue;
      const w = ((b - a) / span) * 100;
      const left = ((a - D.birthMs) / span) * 100;
      const isCur = cur && cur.maha === md;
      tl += `<div class="seg-t c-${md.lord}${isCur ? ' cur' : ''}" style="width:${w.toFixed(3)}%" data-md="${D.mahas.indexOf(md)}" title="${esc(t('dashaOf', { p: PD(md.lord) }))} · ${esc(fmtDate(a))} → ${esc(fmtDate(b))}">${esc(PA(md.lord))}</div>`;
      if (w > 4) ages += `<span class="age" style="left:${left.toFixed(2)}%">${ageAt(a)}</span>`;
    }
    let nowMark = '';
    if (now > D.birthMs && now < D.endMs) nowMark = `<div class="now" style="left:${(((now - D.birthMs) / span) * 100).toFixed(2)}%"><span>${esc(t('nowLabel'))}</span></div>`;
    $('#timeline').innerHTML = tl + ages + nowMark;

    if (state.openMd == null) state.openMd = cur ? D.mahas.indexOf(cur.maha) : 0;
    $('#dashaList').innerHTML = D.mahas.map((md, i) => {
      const a = Math.max(md.start, D.birthMs);
      if (md.end <= D.birthMs || a >= D.endMs) return '';
      const isCur = cur && cur.maha === md;
      const open = state.openMd === i;
      const rows = md.bhuktis.filter((bk) => bk.end > D.birthMs).map((bk) => {
        const curB = cur && cur.bhukti === bk;
        const past = bk.end < now;
        return `<tr class="${curB ? 'cur' : past ? 'past' : ''}"><td>${esc(t('bhuktiOf', { p: PD(bk.lord) }))}</td><td>${esc(fmtDate(Math.max(bk.start, D.birthMs)))}</td><td>${esc(fmtDate(bk.end))}</td></tr>`;
      }).join('');
      const range = `${fmtDate(a)} → ${fmtDate(md.end)} · ${t('ageRange', { x: ageAt(a), y: ageAt(md.end) })}`;
      return `<div class="md${isCur ? ' cur' : ''}${open ? ' open' : ''}" id="md-${i}">
        <button type="button" class="md-btn" aria-expanded="${open}" aria-controls="mdp-${i}" data-i="${i}">
          <span class="sw c-${md.lord}"></span>
          <span class="mt">${esc(t('dashaOf', { p: PD(md.lord) }))}${isCur ? `<small>${esc(t('current'))}</small>` : ''}</span>
          <span class="md-d">${esc(range)}</span><span class="chev" aria-hidden="true"></span>
        </button>
        <div class="md-panel" id="mdp-${i}" role="region"><div><table class="btable"><thead><tr><th>${esc(t('bhukti'))}</th><th>${esc(t('from'))}</th><th>${esc(t('to'))}</th></tr></thead><tbody>${rows}</tbody></table></div></div>
      </div>`;
    }).join('');
  }
  function toggleMd(i, scroll) {
    state.openMd = state.openMd === i && !scroll ? -1 : i;
    $$('#dashaList .md').forEach((m) => {
      const on = m.id === 'md-' + state.openMd;
      m.classList.toggle('open', on);
      $('.md-btn', m).setAttribute('aria-expanded', String(on));
    });
    if (scroll) $('#md-' + i)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
  }
  function initDashaEvents() {
    $('#dashaList').addEventListener('click', (e) => { const b = e.target.closest('.md-btn'); if (b) toggleMd(+b.dataset.i, false); });
    $('#timeline').addEventListener('click', (e) => { const s = e.target.closest('.seg-t'); if (s) toggleMd(+s.dataset.md, true); });
  }

  /* ================================================================ print sheet */
  function renderPrint() {
    const c = state.chart, ip = state.input, pc = c.panchang;
    const tithi = pc.tithi === 29 ? L(K.amavasya) : L(K.tithi[pc.tithi % 15]);
    const cur = E.currentPeriod(c.dasha, Date.now());
    const pairs = [
      [t('dob'), fmtYMD(ip.y, ip.m - 1, ip.d)], [t('tob'), fmtHM(ip.hh, ip.mm)],
      [t('place'), placeText(ip.place)], [t('pCoords'), fmtCoord(ip.place.lat, ip.place.lon)],
      [t('pUtc'), 'UTC' + fmtOffset(state.offsetMs)], [t('pVaara'), L(K.weekday[pc.weekday])],
      [t('janmaNak'), `${NK(c.janmaNakshatra)} · ${t('pada')} ${c.janmaPada}`], [t('janmaRasi'), SN(c.moonSign)],
      [t('lagna'), `${SN(c.lagnaSign)} ${c.bodies.Lagna.degText}`], [t('pTithi'), `${L(K.paksha[pc.paksha])} ${tithi}`],
      [t('pYoga'), L(K.yoga[pc.yoga])], [t('pKarana'), L(K.karana[pc.karana])]
    ];
    if (pc.tamil) pairs.push([t('pTamilDate'), `${L(K.tamilMonth[pc.tamil.month])} ${pc.tamil.day}`], [t('pTamilYear'), t('yearSuffix', { x: L(K.tamilYear[pc.tamil.yearIndex]) })]);
    pairs.push([t('balance'), t('balanceVal', { p: PD(c.dasha.firstLord), y: c.dasha.balance.y, m: c.dasha.balance.m, d: c.dasha.balance.d })]);
    if (cur) pairs.push([t('dashaNow'), t('dashaPeriod', { p: PD(cur.maha.lord), q: PD(cur.bhukti.lord) })]);
    pairs.push([t('pAyanamsa'), c.ayanamsaText]);
    let rows = '';
    for (let i = 0; i < pairs.length; i += 2) {
      const [a, b] = [pairs[i], pairs[i + 1]];
      rows += `<tr><td class="k">${esc(a[0])}</td><td>${esc(a[1])}</td>${b ? `<td class="k">${esc(b[0])}</td><td>${esc(b[1])}</td>` : '<td></td><td></td>'}</tr>`;
    }
    $('#printHead').innerHTML = `<div class="om">உ</div><h1>${esc(t('jathagamSheet'))}</h1>${ip.name ? `<div class="pname">${esc(ip.name)}</div>` : ''}<table>${rows}</table>`;
    const today = new Date();
    $('#printFoot').textContent = t('printedOn', { x: `${today.getDate()} ${monthName(today.getMonth())} ${today.getFullYear()}` });
  }

  /* ================================================================ share / hash */
  function shareUrl() {
    const ip = state.input, p = ip.place;
    const q = new URLSearchParams();
    q.set('d', `${ip.y}-${pad(ip.m)}-${pad(ip.d)}`);
    q.set('t', `${pad(ip.hh)}:${pad(ip.mm)}`);
    q.set('lat', String(p.lat)); q.set('lon', String(p.lon));
    if (p.tz) q.set('tz', p.tz); else q.set('off', String(p.offsetMinutes || 0));
    if (!p.manual) q.set('p', p.label);
    if (p.ta) q.set('pt', p.ta);
    if (ip.name) q.set('n', ip.name);
    q.set('g', ip.gender); q.set('node', ip.node);
    return `${location.origin}${location.pathname}#${q.toString()}`;
  }
  function fromHash() {
    if (!location.hash || location.hash.length < 5) return false;
    const h = new URLSearchParams(location.hash.slice(1));
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(h.get('d') || ''), tm = /^(\d{2}):(\d{2})$/.exec(h.get('t') || '');
    const lat = parseFloat(h.get('lat')), lon = parseFloat(h.get('lon'));
    if (!dm || !tm || !isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
    const tz = h.get('tz');
    const label = h.get('p');
    const place = {
      lat, lon, tz: tz && E.isValidTz(tz) ? tz : null, offsetMinutes: tz ? null : (parseInt(h.get('off'), 10) || 0),
      label: label || fmtCoord(lat, lon), short: label ? label.split(',')[0] : fmtCoord(lat, lon), ta: h.get('pt') || null, manual: !label
    };
    const input = {
      name: (h.get('n') || '').slice(0, 60) || null, gender: ['male', 'female', 'other'].includes(h.get('g')) ? h.get('g') : 'male',
      y: +dm[1], m: +dm[2], d: +dm[3], hh: Math.min(23, +tm[1]), mm: Math.min(59, +tm[2]), node: h.get('node') === 'true' ? 'true' : 'mean', place
    };
    fillForm(input);
    generate(input, true);
    return true;
  }
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200);
  }

  /* ================================================================ boot */
  function init() {
    if (!E || !K || !S) { console.error('Josiyam: scripts failed to load'); return; }
    let lang = 'en';
    try {
      const q = new URLSearchParams(location.search).get('lang');
      lang = q === 'ta' || q === 'en' ? q : (localStorage.getItem('josiyam-lang') || 'en');
    } catch (e) { /* ignore */ }
    state.lang = lang === 'ta' ? 'ta' : 'en';
    document.documentElement.lang = state.lang;
    buildWheel();
    initStars();
    initForm();
    applyStatic();
    updateToggle();
    initChartEvents();
    initTableEvents();
    initReportEvents();
    initDashaEvents();
    $$('.lang-toggle button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang, true)));
    $('#editBtn').addEventListener('click', () => { $('#birth').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => $('#fName').focus({ preventScroll: true }), 400); });
    $('#printBtn').addEventListener('click', () => window.print());
    $('#shareBtn').addEventListener('click', async () => {
      const url = shareUrl();
      try { await navigator.clipboard.writeText(url); toast(t('copied')); }
      catch (e) { window.prompt(t('share'), url); }
    });
    window.addEventListener('hashchange', () => { fromHash(); });
    fromHash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
