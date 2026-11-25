/*!
 * Josiyam · match.js
 * "My family": charts saved on this device (localStorage only), opened with one tap and used
 * for matching. "Thirumana Porutham": the ten poruthams between the chart on screen and a
 * partner given by birth details, by star alone, or picked from My family.
 * Plugs into app.js through window.JosiyamHooks.
 */
(function () {
  'use strict';
  const K = window.JosiyamData, PO = window.JosiyamPorutham;
  if (!K || !PO) return;

  /* ---------------------------------------------------------------- interface text */
  Object.assign(K.ui, {
    navMatch: { en: 'Porutham', ta: 'பொருத்தம்' },
    heroPoint4: { en: 'Marriage porutham', ta: 'திருமணப் பொருத்தம்' },
    matchTitle: { en: 'Thirumana Porutham', ta: 'திருமணப் பொருத்தம்' },
    matchSub: { en: 'The ten traditional poruthams for marriage, read from both birth stars.', ta: 'இருவரின் ஜன்ம நட்சத்திரங்களிலிருந்து பத்துப் பொருத்தங்கள்.' },
    mtThisIs: { en: 'This chart is the', ta: 'இந்த ஜாதகம்' },
    mtBride: { en: 'Bride', ta: 'மணமகள்' },
    mtGroom: { en: 'Groom', ta: 'மணமகன்' },
    mtPartner: { en: 'Match with', ta: 'யாருடன் பொருத்தம்' },
    mtModeBirth: { en: 'Birth details', ta: 'பிறப்பு விவரம்' },
    mtModeStar: { en: 'Star only', ta: 'நட்சத்திரம் மட்டும்' },
    mtModeFam: { en: 'My family', ta: 'என் குடும்பம்' },
    mtStarLbl: { en: 'Birth star', ta: 'ஜன்ம நட்சத்திரம்' },
    mtPadaOpt: { en: 'Pada {p} · {r}', ta: '{p}-ஆம் பாதம் · {r}' },
    mtChoose: { en: 'Choose…', ta: 'தேர்ந்தெடுக்கவும்…' },
    mtGo: { en: 'Check porutham', ta: 'பொருத்தம் பார்' },
    mtNoFam: { en: 'No other saved charts yet. Open someone’s chart, tap “Save to family”, and they appear here.', ta: 'சேமித்த வேறு ஜாதகம் இல்லை. ஒருவரின் ஜாதகத்தைத் திறந்து “குடும்பத்தில் சேமி” அழுத்தினால் இங்கே தெரியும்.' },
    mtErrStar: { en: 'Choose the birth star.', ta: 'ஜன்ம நட்சத்திரத்தைத் தேர்ந்தெடுக்கவும்.' },
    mtErrFam: { en: 'Pick a person from My family.', ta: 'என் குடும்பத்திலிருந்து ஒருவரைத் தேர்ந்தெடுக்கவும்.' },
    mtEssential: { en: 'Essential', ta: 'அவசியம்' },
    mtOutOf: { en: 'out of 10', ta: '10-க்கு' },
    mtPartnerName: { en: 'Partner', ta: 'வரன்' },
    mtThisChart: { en: 'This chart', ta: 'இந்த ஜாதகம்' },
    mtNote: { en: 'Porutham tables differ a little between families and astrologers, especially for Rasi, Vasiyam and Stree Deergham. Take this as a first look and the final word from your family astrologer, who will also compare both full charts.', ta: 'பொருத்த அட்டவணைகள் குடும்பம், ஜோதிடருக்கு ஏற்ப சிறிது மாறுபடும் — குறிப்பாக ராசி, வசியம், ஸ்திரீ தீர்க்கம். இதை முதல் பார்வையாகக் கொண்டு, இருவரின் முழு ஜாதகத்தையும் ஒப்பிடும் உங்கள் குடும்ப ஜோதிடரிடம் இறுதி முடிவைக் கேளுங்கள்.' },
    mtAgain: { en: 'Match with someone else', ta: 'வேறு ஒருவருடன் பார்' },
    mtSave: { en: 'Save partner to family', ta: 'வரனைக் குடும்பத்தில் சேமி' },
    mtStarPada: { en: '{s} · pada {p}', ta: '{s} · {p}-ஆம் பாதம்' },
    mtLagna: { en: 'Lagna {x}', ta: 'லக்னம் {x}' },
    famTitle: { en: 'My family', ta: 'என் குடும்பம்' },
    famNote: { en: 'Saved on this device only.', ta: 'இந்தச் சாதனத்தில் மட்டும் சேமிக்கப்படும்.' },
    famSave: { en: 'Save to family', ta: 'குடும்பத்தில் சேமி' },
    famSaved: { en: 'Saved to My family', ta: 'என் குடும்பத்தில் சேமிக்கப்பட்டது' },
    famAlready: { en: 'Already in My family', ta: 'ஏற்கனவே என் குடும்பத்தில் உள்ளது' },
    famFull: { en: 'My family is full (40 charts). Remove one first.', ta: 'என் குடும்பம் நிரம்பியது (40). ஒன்றை நீக்கிவிட்டுச் சேமிக்கவும்.' },
    famNoStore: { en: 'This browser is not letting the page save anything.', ta: 'இந்த உலாவி சேமிக்க அனுமதிக்கவில்லை.' },
    famNamePrompt: { en: 'A name for this chart', ta: 'இந்த ஜாதகத்திற்கு ஒரு பெயர்' },
    famNamePh: { en: 'e.g. Amma, Appa, Priya', ta: 'எ.கா. அம்மா, அப்பா, ப்ரியா' },
    famCancel: { en: 'Cancel', ta: 'ரத்து' },
    famOk: { en: 'Save', ta: 'சேமி' },
    famOpen: { en: 'Open {x}’s chart', ta: '{x} ஜாதகத்தைத் திற' },
    famRemove: { en: 'Remove {x}', ta: '{x} நீக்கு' },
    famConfirm: { en: 'Remove?', ta: 'நீக்கவா?' },
    famRemoved: { en: 'Removed {x}', ta: '{x} நீக்கப்பட்டது' }
  });

  const KEY = 'josiyam-family', MAX = 40;
  let A = null;                     // app API, set on init
  const M = { role: null, mode: 'birth', place: null, list: [], active: -1, pick: null, result: null, forKey: null, lastWorld: 0 };

  /* ---------------------------------------------------------------- storage */
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((r) => r && r.id && r.place) : []; } catch (e) { return []; }
  }
  function store(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  const birthKey = (ip) => [ip.y, ip.m, ip.d, ip.hh, ip.mm, (+ip.place.lat).toFixed(3), (+ip.place.lon).toFixed(3)].join('|');
  function moonOf(ip) {
    const E = A.E;
    const conv = E.localToUtc({ y: ip.y, m: ip.m, d: ip.d, hh: ip.hh, mm: ip.mm, tz: ip.place.tz, offsetMinutes: ip.place.offsetMinutes });
    const chart = E.computeChart({ utcMs: conv.utcMs, lat: ip.place.lat, lon: ip.place.lon, nodeType: ip.node || 'mean', sunrise: ip.sunrise, offsetMs: conv.offsetMs });
    return chart;
  }

  /* ---------------------------------------------------------------- My family: list in the form, save from results */
  function renderFamily() {
    const box = A.$('#fam'), list = load();
    if (!box) return;
    box.hidden = !list.length;
    A.$('#famList').innerHTML = list.map((r) => {
      const star = r.nak != null ? A.NK(r.nak) : '';
      return `<span class="fam-chip" data-id="${A.esc(r.id)}"><button type="button" class="fam-open" aria-label="${A.esc(A.t('famOpen', { x: r.label }))}">` +
        `<span class="fam-ic" aria-hidden="true">${r.gender === 'female' ? '♀' : r.gender === 'male' ? '♂' : '✦'}</span><span class="fam-n">${A.esc(r.label)}</span>${star ? `<small>${A.esc(star)}</small>` : ''}</button>` +
        `<button type="button" class="fam-x" aria-label="${A.esc(A.t('famRemove', { x: r.label }))}"><span aria-hidden="true">×</span></button></span>`;
    }).join('');
  }
  function inputOf(r) {
    return { name: r.name || null, gender: r.gender || 'male', y: r.y, m: r.m, d: r.d, hh: r.hh, mm: r.mm, node: r.node || 'mean', sunrise: r.sunrise || 'upper', place: r.place };
  }
  function saveRecord(ip, label, chart) {
    const list = load();
    const k = birthKey(ip);
    if (list.some((r) => birthKey(r) === k)) { A.toast(A.t('famAlready')); return false; }
    if (list.length >= MAX) { A.toast(A.t('famFull')); return false; }
    const ch = chart || moonOf(ip);
    const mo = ch.bodies.Moon;
    list.push({
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: label.slice(0, 40), name: ip.name || null, gender: ip.gender,
      y: ip.y, m: ip.m, d: ip.d, hh: ip.hh, mm: ip.mm, node: ip.node, sunrise: ip.sunrise, place: ip.place,
      nak: mo.nakshatra, pada: mo.pada, rasi: mo.sign, saved: Date.now()
    });
    if (!store(list)) { A.toast(A.t('famNoStore')); return false; }
    A.toast(A.t('famSaved'));
    renderFamily(); renderFamPick(); updateSaveBtn();
    return true;
  }
  function updateSaveBtn() {
    const b = A.$('#famSaveBtn');
    if (!b || !A.state.input) return;
    const k = birthKey(A.state.input);
    const has = load().some((r) => birthKey(r) === k);
    b.classList.toggle('saved', has);
    b.setAttribute('aria-pressed', String(has));
  }

  // name dialog
  let dlgDone = null;
  function askName(def) {
    const d = A.$('#fdlg'), inp = A.$('#fdlgName');
    inp.value = def || '';
    d.hidden = false;
    requestAnimationFrame(() => { d.classList.add('on'); inp.focus(); inp.select(); });
    return new Promise((res) => { dlgDone = res; });
  }
  function closeDlg(val) {
    const d = A.$('#fdlg');
    d.classList.remove('on');
    setTimeout(() => { d.hidden = true; }, 220);
    if (dlgDone) { const f = dlgDone; dlgDone = null; f(val); }
  }

  function initFamily() {
    A.$('#famList').addEventListener('click', (e) => {
      const chip = e.target.closest('.fam-chip');
      if (!chip) return;
      const list = load(), r = list.find((x) => x.id === chip.dataset.id);
      if (!r) return;
      if (e.target.closest('.fam-x')) {
        if (!chip.classList.contains('confirm')) {
          chip.classList.add('confirm');
          const x = chip.querySelector('.fam-x');
          x.innerHTML = `<span>${A.esc(A.t('famConfirm'))}</span>`;
          clearTimeout(chip._t); chip._t = setTimeout(() => renderFamily(), 3200);
          return;
        }
        store(list.filter((x) => x.id !== r.id));
        A.toast(A.t('famRemoved', { x: r.label }));
        renderFamily(); renderFamPick(); updateSaveBtn();
        return;
      }
      const ip = inputOf(r);
      A.fillForm(ip);
      A.generate(ip, true);
    });
    A.$('#famSaveBtn').addEventListener('click', async () => {
      const ip = A.state.input;
      if (!ip) return;
      const k = birthKey(ip);
      if (load().some((r) => birthKey(r) === k)) { A.toast(A.t('famAlready')); return; }
      const label = await askName(ip.name || '');
      if (label == null) return;
      saveRecord(ip, label.trim() || ip.name || A.fmtYMD(ip.y, ip.m - 1, ip.d), A.state.chart);
    });
    const d = A.$('#fdlg');
    d.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) closeDlg(null); });
    A.$('#fdlgForm').addEventListener('submit', (e) => { e.preventDefault(); closeDlg(A.$('#fdlgName').value); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !d.hidden) closeDlg(null); });
    renderFamily();
  }

  /* ---------------------------------------------------------------- porutham form */
  function setSeg(id, v) { A.$$(`#${id} [role="radio"]`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === v))); }
  function setMode(v) {
    M.mode = v; setSeg('mtMode', v);
    A.$('#mtBirth').hidden = v !== 'birth';
    A.$('#mtStar').hidden = v !== 'star';
    A.$('#mtFam').hidden = v !== 'fam';
    A.$('#mtNameRow').hidden = v === 'fam';
    showErr(null);
  }
  function fillStarSelects() {
    const nk = A.$('#mtNak'), keep = nk.value;
    nk.innerHTML = `<option value="">${A.esc(A.t('mtChoose'))}</option>` + K.nakshatra.map((x, i) => `<option value="${i}">${A.esc(A.NK(i))}</option>`).join('');
    nk.value = keep;
    fillPada();
  }
  function fillPada() {
    const pd = A.$('#mtPada'), keep = pd.value || '1', n = A.$('#mtNak').value;
    pd.innerHTML = [1, 2, 3, 4].map((p) => {
      const r = n === '' ? '' : A.SN(PO.rasiOf(+n, p));
      return `<option value="${p}">${A.esc(r ? A.t('mtPadaOpt', { p, r }) : String(p))}</option>`;
    }).join('');
    pd.value = keep;
  }
  function renderFamPick() {
    const host = A.$('#mtFamList');
    if (!host || !A.state.input) return;
    const me = birthKey(A.state.input);
    const list = load().filter((r) => birthKey(r) !== me);
    if (M.pick && !list.some((r) => r.id === M.pick)) M.pick = null;
    host.innerHTML = list.length ? list.map((r) => `<button type="button" class="mt-fp" data-id="${A.esc(r.id)}" aria-pressed="${r.id === M.pick}">` +
      `<span class="fam-ic" aria-hidden="true">${r.gender === 'female' ? '♀' : r.gender === 'male' ? '♂' : '✦'}</span><span class="fam-n">${A.esc(r.label)}</span>` +
      `<small>${A.esc(A.t('mtStarPada', { s: A.NK(r.nak), p: r.pada }))}</small></button>`).join('')
      : `<p class="mt-empty">${A.esc(A.t('mtNoFam'))}</p>`;
  }
  function showErr(key, field) {
    A.$('#mtError').textContent = key ? A.t(key) : '';
    A.$$('#mtForm .invalid').forEach((x) => x.classList.remove('invalid'));
    if (field) { const f = A.$(field); f.classList.add('invalid'); f.focus(); }
  }

  // partner place search (same bundled city list as the main form; worldwide search only on request)
  function placeLabel(p) { return p ? A.placeText(p) : ''; }
  function openList(items, q, info) {
    const ul = A.$('#mtList');
    M.list = items; M.active = -1;
    let html = items.map((it, i) => {
      const nm = A.state.lang === 'ta' && it.ta ? `${A.esc(it.ta)} <span class="pr">(${A.esc(it.short)})</span>` : A.esc(it.short);
      const region = it.region != null ? it.region : it.label.slice(it.short.length + 2);
      return `<li role="option" id="mtopt${i}" data-i="${i}" aria-selected="false"><span class="pn">${nm}</span><span class="pr">${A.esc(region)}</span></li>`;
    }).join('');
    if (info) html += `<li class="info" role="presentation">${A.esc(info)}</li>`;
    if (q && q.trim().length >= 3) html += `<li class="world" role="option" id="mtoptW" data-world="1" aria-selected="false">⌕ ${A.esc(A.t('searchWorld', { x: q.trim() }))}</li>`;
    ul.innerHTML = html;
    ul.hidden = !html;
    A.$('#mtPlace').setAttribute('aria-expanded', String(!ul.hidden));
  }
  function closeList() { A.$('#mtList').hidden = true; A.$('#mtPlace').setAttribute('aria-expanded', 'false'); }
  async function worldSearch(q) {
    const now = Date.now();
    if (now - M.lastWorld < 1100) return;
    M.lastWorld = now;
    openList([], '', A.t('searching'));
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&q=${encodeURIComponent(q)}&accept-language=${A.state.lang === 'ta' ? 'ta,en' : 'en'}`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('http ' + r.status);
      const items = (await r.json()).map((x) => {
        const lat = +x.lat, lon = +x.lon, nm = x.name || String(x.display_name).split(',')[0];
        return { label: x.display_name, short: nm, region: String(x.display_name).split(',').slice(1).join(',').trim(), ta: null, lat, lon, tz: A.tzFromCoords(lat, lon) };
      }).filter((x, i, all) => isFinite(x.lat) && isFinite(x.lon) && x.tz && all.findIndex((y) => y.label === x.label) === i);
      if (!items.length) openList([], '', A.t('noPlace')); else openList(items, '');
    } catch (e) { openList([], '', A.t('netError')); }
  }
  function initPlace() {
    const inp = A.$('#mtPlace'), ul = A.$('#mtList');
    let timer = 0;
    const run = () => {
      const q = inp.value;
      if (!q.trim()) { closeList(); return; }
      A.loadCities().then(() => {
        const hits = A.searchCities(q).map(A.cityToPlace);
        openList(hits, q, hits.length ? null : A.t('noPlace'));
      }).catch(() => openList([], q, A.t('netError')));
    };
    const choose = (it) => { M.place = it; inp.value = placeLabel(it); inp.classList.remove('invalid'); closeList(); };
    const pick = (li) => { if (li.dataset.world) worldSearch(inp.value); else if (li.dataset.i != null) choose(M.list[+li.dataset.i]); };
    inp.addEventListener('focus', () => { A.loadCities().catch(() => {}); });
    inp.addEventListener('input', () => { if (M.place && inp.value !== placeLabel(M.place)) M.place = null; clearTimeout(timer); timer = setTimeout(run, 90); });
    inp.addEventListener('keydown', (e) => {
      const opts = A.$$('#mtList [role="option"]');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (ul.hidden) { run(); return; }
        if (!opts.length) return;
        M.active = (M.active + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        opts.forEach((o, i) => o.setAttribute('aria-selected', String(i === M.active)));
        inp.setAttribute('aria-activedescendant', opts[M.active].id);
      } else if (e.key === 'Enter' && !ul.hidden) {
        e.preventDefault();
        const o = opts[M.active >= 0 ? M.active : 0];
        if (o) pick(o);
      } else if (e.key === 'Escape') closeList();
    });
    ul.addEventListener('mousedown', (e) => e.preventDefault());
    ul.addEventListener('click', (e) => { const li = e.target.closest('li[role="option"]'); if (li) pick(li); });
    inp.addEventListener('blur', () => setTimeout(closeList, 150));
  }

  /* ---------------------------------------------------------------- run the match */
  function meNow() {
    const ip = A.state.input, mo = A.state.chart.bodies.Moon;
    const cv = A.S.detectYogas(A.state.chart).find((y) => y.id === 'chevvai');
    return { name: ip.name, nak: mo.nakshatra, pada: mo.pada, lagna: A.state.chart.lagnaSign, chev: cv, input: ip };
  }
  async function onSubmit(e) {
    e.preventDefault();
    showErr(null);
    let partner = null;
    const nm = A.$('#mtName').value.trim().slice(0, 60) || null;
    if (M.mode === 'star') {
      const n = A.$('#mtNak').value;
      if (n === '') return showErr('mtErrStar', '#mtNak');
      partner = { name: nm, nak: +n, pada: +A.$('#mtPada').value || 1, lagna: null, chev: null, input: null };
    } else if (M.mode === 'fam') {
      const r = load().find((x) => x.id === M.pick);
      if (!r) return showErr('mtErrFam');
      partner = fromInput(inputOf(r), r.label);
    } else {
      const dv = A.$('#mtDate').value, tv = A.$('#mtTime').value;
      const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dv), tm = /^(\d{1,2}):(\d{2})/.exec(tv);
      if (!dm) return showErr('errDate', '#mtDate');
      if (!tm) return showErr('errTime', '#mtTime');
      let place = M.place;
      if (!place && A.$('#mtPlace').value.trim()) {
        try { await A.loadCities(); const hit = A.searchCities(A.$('#mtPlace').value)[0]; if (hit) { place = A.cityToPlace(hit); M.place = place; A.$('#mtPlace').value = placeLabel(place); } } catch (err) { /* offline */ }
      }
      if (!place) return showErr('errPlace', '#mtPlace');
      const gender = M.role === 'bride' ? 'male' : 'female';
      try { partner = fromInput({ name: nm, gender, y: +dm[1], m: +dm[2], d: +dm[3], hh: +tm[1], mm: +tm[2], node: A.state.input.node, sunrise: A.state.input.sunrise, place }, nm); }
      catch (err) { console.error(err); return showErr('errCalc'); }
    }
    const me = meNow();
    const bride = M.role === 'bride' ? me : partner, groom = M.role === 'bride' ? partner : me;
    M.result = { me, partner, role: M.role, m: PO.match({ bride: { nak: bride.nak, pada: bride.pada }, groom: { nak: groom.nak, pada: groom.pada } }), chev: PO.chevvaiBalance(bride.chev, groom.chev) };
    M.forKey = birthKey(A.state.input);
    renderResult(true);
    const host = A.$('#mtResult');
    requestAnimationFrame(() => {
      const y = host.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: Math.max(0, y), behavior: A.reduced() ? 'auto' : 'smooth' });
    });
  }
  function fromInput(ip, label) {
    const ch = moonOf(ip), mo = ch.bodies.Moon;
    const cv = A.S.detectYogas(ch).find((y) => y.id === 'chevvai');
    return { name: label || ip.name, nak: mo.nakshatra, pada: mo.pada, lagna: ch.lagnaSign, chev: cv, input: ip };
  }

  /* ---------------------------------------------------------------- result */
  const L = (o, v) => A.L(o, v);
  const fmtScore = (x) => (x % 1 ? `${Math.floor(x)}½` : String(x));
  const GLYPH = '♈♉♊♋♌♍♎♏♐♑♒♓';
  function medal(p, role, side) {
    const r = PO.rasiOf(p.nak, p.pada);
    let petals = '';
    for (let i = 0; i < 12; i++) petals += `<path transform="rotate(${i * 30})" d="M0-34C7-38 9-45 0-50C-9-45-7-38 0-34Z"/>`;
    const name = p.name || (p === M.result.me ? A.t('mtThisChart') : A.t('mtPartnerName'));
    return `<div class="mt-p mt-${side}">` +
      `<div class="mt-medal" aria-hidden="true"><svg viewBox="-56 -56 112 112"><g class="mt-pet">${petals}</g><circle r="33" class="mt-disc"/><circle r="29" class="mt-disc2"/>` +
      `<text class="mt-gl" y="1" text-anchor="middle" dominant-baseline="central">${GLYPH[r]}&#xFE0E;</text></svg></div>` +
      `<div class="mt-role">${A.esc(A.t(role === 'bride' ? 'mtBride' : 'mtGroom'))}</div>` +
      `<div class="mt-nm">${A.esc(name)}</div>` +
      `<div class="mt-st">${A.esc(A.t('mtStarPada', { s: A.NK(p.nak), p: p.pada }))}</div>` +
      `<div class="mt-rs">${A.esc(A.SN(r))}${p.lagna != null ? ' · ' + A.esc(A.t('mtLagna', { x: A.SN(p.lagna) })) : ''}</div></div>`;
  }
  function whyText(it) {
    const tpl = PO.TX.why[it.id][it.key], v = it.vars, lang = A.state.lang;
    const vars = {};
    if (it.id === 'dina') { Object.assign(vars, v); if (v.star != null) vars.star = A.NK(v.star); }
    else if (it.id === 'gana') { vars.a = L(PO.TX.gana[v.a]); vars.b = L(PO.TX.gana[v.b]); }
    else if (it.id === 'yoni') {
      const y = (x) => `${L(K.yoni[x[0]])} (${L(K.gender[x[1]])})`;
      vars.a = it.key === 'u' ? L(K.yoni[v.a[0]]) : y(v.a); vars.b = y(v.b);
    } else if (it.id === 'rasi' || it.id === 'vasya') { vars.a = A.SN(v.a); vars.b = A.SN(v.b); vars.r = v.r; }
    else if (it.id === 'rasiLord') { vars.a = A.PN(v.a); vars.b = A.PN(v.b); }
    else if (it.id === 'rajju') { vars.a = L(PO.TX.rajju[v.a]); vars.b = L(PO.TX.rajju[v.b]); }
    else if (it.id === 'vedha') { vars.a = A.NK(v.a); vars.b = A.NK(v.b); }
    else Object.assign(vars, v);
    let s = A.S.T(tpl, lang, vars);
    if (it.id === 'rasi' && v.soft) s += ' ' + L(PO.TX.why.rasi[v.soft === 'same' ? 'softSame' : 'softFriends']);
    return s;
  }
  function renderResult(animate) {
    const host = A.$('#mtResult');
    const R = M.result;
    if (!R) { host.innerHTML = ''; return; }
    const m = R.m, me = R.me, pa = R.partner;
    const bride = R.role === 'bride' ? me : pa, groom = R.role === 'bride' ? pa : me;
    const V = PO.TX.verdict[m.verdict];
    const failed = m.items.filter((it) => it.essential && it.grade === 'n').map((it) => L(PO.TX.name[it.id])).join(A.state.lang === 'ta' ? ', ' : ' and ');
    const C = 2 * Math.PI * 52, frac = m.total / 10;
    const tiles = m.items.map((it, i) => {
      const nm = A.state.lang === 'ta' ? PO.TX.nameTa[it.id] : L(PO.TX.name[it.id]);
      const sub = A.state.lang === 'ta' ? '' : `<small lang="ta">${PO.TX.nameTa[it.id]}</small>`;
      const icon = it.grade === 'u' ? '✓' : it.grade === 'm' ? '½' : '✕';
      return `<article class="mt-tile ${it.grade}${it.essential ? ' ess' : ''}" style="--k:${i}">` +
        `<div class="mt-th"><span class="mt-lamp" aria-hidden="true"><i></i></span><h4>${A.esc(nm)}${sub}</h4>` +
        `<span class="mt-grade"><b aria-hidden="true">${icon}</b>${A.esc(L(PO.TX.grade[it.grade]))}</span></div>` +
        `<p class="mt-about">${A.esc(L(PO.TX.about[it.id]))}${it.essential ? ` <span class="mt-ess">${A.esc(A.t('mtEssential'))}</span>` : ''}</p>` +
        `<p class="mt-why">${A.esc(whyText(it))}</p></article>`;
    }).join('');
    const ch = R.chev, CT = PO.TX.chevvai;
    let chev = `<h3 class="sub-title">${A.esc(L(CT.title))}</h3>`;
    if (ch.kind === 'unknown') chev += `<p>${A.esc(L(CT.unknown))}</p>`;
    else {
      chev += `<dl class="facts"><dt>${A.esc(A.t('mtBride'))}</dt><dd>${A.esc(L(CT.status[ch.b]))}</dd><dt>${A.esc(A.t('mtGroom'))}</dt><dd>${A.esc(L(CT.status[ch.g]))}</dd></dl>`;
      chev += `<p>${A.esc(L(CT[ch.kind], { who: A.t(ch.who === 'bride' ? 'mtBride' : 'mtGroom') }))}</p>`;
    }
    const canSave = pa.input && !load().some((r) => birthKey(r) === birthKey(pa.input));
    host.innerHTML = `<div class="mt-res v-${m.verdict}${animate && !A.reduced() ? ' anim' : ''}">` +
      `<div class="mt-hero glass">` +
      medal(bride, 'bride', 'b') +
      `<div class="mt-mid"><div class="mt-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="mt-trk"/><circle cx="60" cy="60" r="52" class="mt-arc" style="--c:${C.toFixed(1)};--f:${(C * (1 - frac)).toFixed(1)}"/></svg>` +
      `<div class="mt-num"><b id="mtNum">${fmtScore(m.total)}</b><span>${A.esc(A.t('mtOutOf'))}</span></div></div>` +
      `<div class="mt-vt">${A.esc(L(V.t))}</div></div>` +
      medal(groom, 'groom', 'g') +
      `</div>` +
      `<p class="mt-vd">${A.esc(L(V.d, { x: fmtScore(m.total), what: failed }))}</p>` +
      `<div class="mt-grid">${tiles}</div>` +
      `<div class="mt-chev glass">${chev}</div>` +
      `<p class="disclaimer">${A.esc(A.t('mtNote'))}</p>` +
      `<div class="mt-acts"><button type="button" class="btn ghost sm" id="mtAgain">${A.esc(A.t('mtAgain'))}</button>` +
      (canSave ? `<button type="button" class="btn ghost sm" id="mtSavePartner">${A.esc(A.t('mtSave'))}</button>` : '') + `</div></div>`;
    const res = host.firstElementChild;
    drawGarland();
    if (animate && !A.reduced()) {
      requestAnimationFrame(() => requestAnimationFrame(() => res.classList.add('go')));
      countUp(A.$('#mtNum'), m.total);
      if ((m.verdict === 'excellent' || m.verdict === 'good') && window.JosiyamDivine) setTimeout(() => window.JosiyamDivine.petals({ count: m.verdict === 'excellent' ? 90 : 60 }), 1300);
    } else res.classList.add('go');
  }
  // a flower garland (maalai) from the bride's medallion to the groom's: marigold, jasmine and rose
  function drawGarland() {
    const hero = A.$('#mtResult .mt-hero');
    if (!hero) return;
    const old = hero.querySelector('.mt-garland');
    if (old) old.remove();
    const hb = { width: hero.offsetWidth, height: hero.offsetHeight };
    if (!hb.width) return;
    // layout offsets, so the entrance slide (a transform) does not move the garland
    const cen = (el) => {
      let x = 0, y = 0, e = el;
      while (e && e !== hero) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      return [x + el.offsetWidth / 2, y + el.offsetHeight / 2, el.offsetWidth / 2];
    };
    const [ax, ay, ar] = cen(A.$('.mt-b .mt-medal', hero)), [bx, by] = cen(A.$('.mt-g .mt-medal', hero));
    const [rx, ry, rr] = cen(A.$('.mt-ring', hero));
    const cx = (ax + bx) / 2, cy = Math.max(ay, by) + Math.min(70, Math.abs(bx - ax) * 0.16);
    const P = (t) => [(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by];
    let len = 0, prev = P(0);
    for (let i = 1; i <= 60; i++) { const q = P(i / 60); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
    const n = Math.max(8, Math.round(len / 15));
    let beads = '', k = 0;
    for (let i = 0; i <= n; i++) {
      const [x, y] = P(i / n);
      if (Math.hypot(x - ax, y - ay) < ar + 4 || Math.hypot(x - bx, y - by) < ar + 4 || Math.hypot(x - rx, y - ry) < rr + 2) continue;
      const kind = i % 7 === 3 ? 'r' : i % 2 ? 'j' : 'm';
      beads += `<circle class="g-${kind}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${kind === 'm' ? 4.6 : kind === 'r' ? 4 : 3.3}" style="--i:${k++}"/>`;
    }
    const svg = `<svg class="mt-garland" viewBox="0 0 ${hb.width.toFixed(0)} ${hb.height.toFixed(0)}" aria-hidden="true">` +
      `<path class="g-th" d="M${ax.toFixed(1)} ${ay.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}" pathLength="1"/>${beads}</svg>`;
    hero.insertAdjacentHTML('afterbegin', svg);
  }
  let gT = 0;
  window.addEventListener('resize', () => { clearTimeout(gT); gT = setTimeout(() => { if (M.result) drawGarland(); }, 150); });
  function countUp(el, to) {
    const t0 = performance.now(), d = 1400;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtScore(Math.round(to * e * 2) / 2);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    setTimeout(() => requestAnimationFrame(step), 500);
  }

  function initMatch() {
    A.$('#mtForm').addEventListener('submit', onSubmit);
    A.$('#mtRole').addEventListener('click', (e) => { const b = e.target.closest('[role="radio"]'); if (b) { M.role = b.dataset.v; setSeg('mtRole', M.role); } });
    A.$('#mtMode').addEventListener('click', (e) => { const b = e.target.closest('[role="radio"]'); if (b) setMode(b.dataset.v); });
    A.$('#mtNak').addEventListener('change', fillPada);
    A.$('#mtFamList').addEventListener('click', (e) => {
      const b = e.target.closest('.mt-fp');
      if (!b) return;
      M.pick = b.dataset.id;
      A.$$('#mtFamList .mt-fp').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      showErr(null);
    });
    A.$('#mtResult').addEventListener('click', (e) => {
      if (e.target.closest('#mtAgain')) {
        M.result = null; renderResult(false);
        A.$('#mtForm').scrollIntoView({ behavior: A.reduced() ? 'auto' : 'smooth', block: 'center' });
      } else if (e.target.closest('#mtSavePartner')) {
        const pa = M.result && M.result.partner;
        if (pa && pa.input && saveRecord(pa.input, pa.name || A.t('mtPartnerName'))) renderResult(false);
      }
    });
    initPlace();
    fillStarSelects();
    setMode('birth');
  }

  /* ---------------------------------------------------------------- hooks */
  window.JosiyamHooks = window.JosiyamHooks || [];
  window.JosiyamHooks.push({
    init(api) { A = api; initFamily(); initMatch(); },
    applyStatic() {
      if (!A) return;
      renderFamily();
      fillStarSelects();
      if (M.place) A.$('#mtPlace').value = placeLabel(M.place);
    },
    render() {
      if (!A || !A.state.input) return;
      const k = birthKey(A.state.input);
      if (M.forKey !== k) {             // a different chart: start the match afresh
        M.result = null; M.forKey = null; M.pick = null;
        M.role = A.state.input.gender === 'female' ? 'bride' : 'groom';
        setSeg('mtRole', M.role);
      }
      renderFamPick();
      updateSaveBtn();
      renderResult(false);
    }
  });
})();
