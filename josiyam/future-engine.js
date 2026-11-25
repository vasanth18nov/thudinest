/*!
 * Josiyam · future-engine.js
 * Year-by-year and period-by-period forecast. Each month of the window is scored from
 *   (a) the running Maha Dasha, Bhukti and Antaram lords — their functional nature for the Lagna,
 *       strength, and the houses they rule and occupy — and
 *   (b) gochara: Jupiter, Saturn and Rahu (plus the fast planets) counted from the Moon and the Lagna,
 * then summarised per year and per life area, with the reasons spelled out.
 * compute() is language-free and cached; composeYear()/composeBhukti() write text in either language.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./astro-engine.js'), require('./predictions-data.js'), require('./sastra-engine.js'));
  else root.JosiyamFuture = factory(root.JosiyamEngine, root.JosiyamData, root.JosiyamSastra);
})(typeof self !== 'undefined' ? self : this, function (E, K, S) {
  'use strict';

  const DAY = 86400000;
  // gochara: favourable houses counted from the natal Moon (classical tables, vedha ignored)
  const GOOD = { Sun: [3, 6, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12] };
  const JUP = { 1: -0.3, 2: 1, 3: -0.3, 4: -0.4, 5: 1, 6: -0.5, 7: 1, 8: -0.7, 9: 1, 10: -0.3, 11: 1, 12: -0.6 };
  const SAT = { 1: -1.1, 2: -0.8, 3: 1, 4: -0.7, 5: -0.3, 6: 1, 7: -0.5, 8: -1.1, 9: -0.3, 10: -0.2, 11: 1, 12: -0.8 };
  const RAH = { 3: 0.5, 6: 0.5, 11: 0.5, 1: -0.4, 8: -0.4 };
  const ROLEV = { yogakaraka: 1.3, benefic: 1, neutral: 0.2, malefic: -0.8 };
  const AREAS = {
    career: { H: [10, 6, 11], k: ['Saturn', 'Sun'] },
    wealth: { H: [2, 11], k: ['Jupiter'] },
    love: { H: [7, 5], k: ['Venus'] },
    health: { H: [1], k: ['Sun'] },
    home: { H: [4, 2], k: ['Moon'] },
    learning: { H: [5, 4, 9], k: ['Jupiter', 'Mercury'] },
    travel: { H: [9, 12, 3], k: ['Ketu'] }
  };
  const AREA_KEYS = Object.keys(AREAS);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const aspected = (h, a) => ((h - 1 + a - 1) % 12) + 1;

  /* ------------------------------------------------------------------ chart context */
  function context(chart, gender) {
    const fn = S.functionalNature(chart.lagnaSign);
    const nb = S.neechaBhangaMap(S.detectYogas(chart));
    const role = {}, q = {}, owns = {}, place = {}, strength = {};
    for (const p of E.PLANETS) {
      role[p] = S.roleOf(chart, p, fn).role;
      strength[p] = S.strength(chart, p, nb);
      q[p] = ROLEV[role[p]] + (strength[p] === 'strong' ? 0.3 : strength[p] === 'weak' ? -0.3 : 0);
      owns[p] = (p === 'Rahu' || p === 'Ketu') ? [] : S.housesOwned(p, chart.lagnaSign);
      place[p] = chart.bodies[p].house;
    }
    const areas = {};
    for (const k of AREA_KEYS) areas[k] = { H: AREAS[k].H.slice(), k: AREAS[k].k.slice() };
    if (gender === 'female') areas.love.k.push('Jupiter');
    return { fn, role, q, owns, place, strength, areas, lagnaLord: E.SIGN_LORD[chart.lagnaSign] };
  }
  function involv(cx, p, H) {
    return Math.min(2, cx.owns[p].filter((h) => H.includes(h)).length + (H.includes(cx.place[p]) ? 1 : 0));
  }
  function relKind(chart, md, bd) {
    if (md === bd) return 'same';
    const d = E.houseFrom(chart.bodies[md].sign, chart.bodies[bd].sign);
    if ([1, 5, 9].includes(d)) return 'trine';
    if ([3, 11].includes(d)) return 'growth';
    if ([4, 7, 10].includes(d)) return 'kendra';
    if ([2, 12].includes(d)) return 'mixed';
    return 'friction';
  }
  const REL = { same: 0.1, trine: 0.3, growth: 0.25, kendra: 0.12, mixed: -0.15, friction: -0.4 };

  /* ------------------------------------------------------------------ one month */
  function sample(chart, cx, ms) {
    const L = E.siderealAll(ms, 0, 0, chart.nodeType).lons;
    const sg = {};
    for (const p of ['Sun', 'Mars', 'Mercury', 'Venus', 'Jupiter', 'Saturn', 'Rahu']) sg[p] = E.signOf(L[p]);
    const hM = (s) => E.houseFrom(chart.moonSign, s), hL = (s) => E.houseFrom(chart.lagnaSign, s);
    const cur = E.currentPeriod(chart.dasha, ms);
    const md = cur ? cur.maha.lord : null, bd = cur ? cur.bhukti.lord : null, ad = cur ? cur.antara.lord : null;
    const ds = cur ? 0.55 * cx.q[md] + 0.45 * cx.q[bd] + 0.15 * cx.q[ad] + REL[relKind(chart, md, bd)] : 0;
    const jm = hM(sg.Jupiter), sm = hM(sg.Saturn), rm = hM(sg.Rahu);
    let tr = 0.9 * JUP[jm] + SAT[sm] + 0.4 * (RAH[rm] != null ? RAH[rm] : -0.1);
    const fast = {};
    for (const p of ['Sun', 'Mars', 'Mercury', 'Venus']) {
      const h = hM(sg[p]), g = GOOD[p].includes(h);
      fast[p] = { h, g };
      tr += g ? 0.12 : -0.08;
    }
    const overall = clamp(Math.round(50 + 13 * (ds + 0.7 * tr)), 4, 96);
    const jl = hL(sg.Jupiter), sl = hL(sg.Saturn), rl = hL(sg.Rahu);
    const areas = {};
    for (const k of AREA_KEYS) {
      const A = cx.areas[k];
      let raw = 0.3 * ds + 0.3 * tr;
      if (k === 'health') {
        for (const [p, w] of [[md, 0.6], [bd, 0.4]]) {
          if (!p) continue;
          raw += w * (-0.45 * involv(cx, p, [6, 8, 12]) + (p === cx.lagnaLord ? 0.6 : 0) + (p === 'Sun' ? 0.2 * cx.q[p] : 0));
        }
        raw += (sm === 1 || sm === 8) ? -0.6 : [12, 2, 4, 7].includes(sm) ? -0.3 : 0;
        raw += jl === 1 ? 0.4 : [5, 7, 9].includes(jl) ? 0.25 : 0;
        raw += (rl === 1 || rl === 8) ? -0.3 : 0;
      } else {
        for (const [p, w] of [[md, 0.6], [bd, 0.4]]) {
          if (!p) continue;
          raw += w * (0.8 * involv(cx, p, A.H) * cx.q[p] + (A.k.includes(p) ? 0.4 * cx.q[p] : 0));
        }
        if (A.H.includes(jl)) raw += 0.7;
        else if ([5, 7, 9].some((a) => A.H.includes(aspected(jl, a)))) raw += 0.35;
        if (A.H.includes(sl)) raw += [3, 6, 11].includes(sl) ? 0.4 : -0.5;
        if (A.H.includes(rl)) raw += [3, 6, 11].includes(rl) ? 0.3 : -0.3;
      }
      areas[k] = clamp(Math.round(50 + 15 * raw), 4, 96);
    }
    return {
      ms, overall, areas, md, bd, ad, ds, tr, fast,
      jup: { s: sg.Jupiter, hM: jm, hL: jl }, sat: { s: sg.Saturn, hM: sm, hL: sl }, rah: { s: sg.Rahu, hM: rm, hL: rl }
    };
  }

  /* ------------------------------------------------------------------ slow-planet sign segments */
  function segments(chart, p, start, end) {
    const lon = (ms) => E.bodyLon(p, ms, chart.nodeType);
    const step = 4 * DAY;
    const out = [];
    let s = E.signOf(lon(start)), segStart = start, prev = start;
    for (let t = start + step; ; t += step) {
      const tt = Math.min(t, end);
      const s2 = E.signOf(lon(tt));
      if (s2 !== s) {
        let a = prev, b = tt;
        for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (E.signOf(lon(m)) === s) a = m; else b = m; }
        out.push({ sign: s, start: segStart, end: b });
        segStart = b; s = s2;
      }
      prev = tt;
      if (tt >= end) break;
    }
    out.push({ sign: s, start: segStart, end });
    return out.map((x) => ({ ...x, hM: E.houseFrom(chart.moonSign, x.sign), hL: E.houseFrom(chart.lagnaSign, x.sign) }));
  }

  /* ------------------------------------------------------------------ compute */
  function compute(chart, opt) {
    opt = opt || {};
    const cx = context(chart, opt.gender);
    const y0 = opt.startYear, Y = opt.years || 12;
    const start = Date.UTC(y0, 0, 1), end = Date.UTC(y0 + Y, 0, 1);
    const months = [];
    for (let i = 0; i < Y * 12; i++) months.push(sample(chart, cx, Date.UTC(y0 + Math.floor(i / 12), i % 12, 15, 6)));
    const years = [];
    for (let y = 0; y < Y; y++) {
      const ms = months.slice(y * 12, y * 12 + 12);
      const avg = (f) => Math.round(ms.reduce((a, m) => a + f(m), 0) / ms.length);
      const areas = {};
      for (const k of AREA_KEYS) areas[k] = avg((m) => m.areas[k]);
      years.push({ year: y0 + y, overall: avg((m) => m.overall), areas });
    }
    const segs = { Jupiter: segments(chart, 'Jupiter', start, end), Saturn: segments(chart, 'Saturn', start, end), Rahu: segments(chart, 'Rahu', start, end) };
    const bhuktis = [];
    for (const md of chart.dasha.mahas) {
      for (const b of md.bhuktis) {
        if (b.end <= start || b.start >= end || b.end <= chart.dasha.birthMs) continue;
        let s = 0, n = 0;
        for (const m of months) if (m.ms >= b.start && m.ms < b.end) { s += m.overall; n++; }
        for (let t = b.start + 15 * DAY; t < b.end; t += 61 * DAY) if (t < start || t >= end) { s += sample(chart, cx, t).overall; n++; }
        bhuktis.push({ md: md.lord, bd: b.lord, start: b.start, end: b.end, score: n ? Math.round(s / n) : 50, rel: relKind(chart, md.lord, b.lord) });
      }
    }
    const events = [];
    for (const md of chart.dasha.mahas) {
      if (md.start >= start && md.start < end) events.push({ ms: md.start, type: 'maha', p: md.lord });
      for (const b of md.bhuktis) if (b.start >= start && b.start < end && b.start !== md.start) events.push({ ms: b.start, type: 'bhukti', p: b.lord, md: md.lord });
    }
    for (const p of ['Jupiter', 'Saturn', 'Rahu']) {
      for (let i = 1; i < segs[p].length; i++) { const g = segs[p][i]; events.push({ ms: g.start, type: 'ingress', p, s: g.sign, hM: g.hM, hL: g.hL }); }
    }
    events.sort((a, b) => a.ms - b.ms);
    return { cx, start, end, y0, Y, months, years, segs, bhuktis, events };
  }

  /* ------------------------------------------------------------------ composition helpers */
  const levelOf = (s) => (s >= 60 ? 'good' : s <= 44 ? 'tough' : 'mixed');
  const yearLevelOf = (s) => (s >= 66 ? 0 : s >= 56 ? 1 : s >= 45 ? 2 : s >= 35 ? 3 : 4);
  function tools(lang, ctx) {
    const T = (o, v) => S.T(o, lang, v);
    return {
      T, P: (p) => T(K.planet[p]), PD: (p) => S.PD(p, lang), ord: (n) => S.ord(n, lang), sv: (s) => S.signVars(s, lang),
      SN: (s) => (lang === 'ta' ? K.rasi[s].ta : K.rasi[s].en), fmt: ctx.fmtDate,
      houses: (hs) => {
        if (lang === 'ta') return hs.length > 1 ? `${hs.join(', ')}-ஆம் வீடுகளின்` : `${hs[0]}-ஆம் வீட்டின்`;
        const o = hs.map((h) => S.ord(h, 'en'));
        return hs.length > 1 ? `the ${o.slice(0, -1).join(', ')} and ${o[o.length - 1]} houses` : `the ${o[0]} house`;
      }
    };
  }
  function overlaps(a0, a1, b0, b1) { return a0 < b1 && b0 < a1; }

  function areaWhy(F, chart, months, ys, ye, k, lang, ctx) {
    const { T, P, ord, fmt, houses } = tools(lang, ctx);
    const cx = F.cx, A = cx.areas[k], W = K.future.why;
    const lines = [];
    const lords = [];
    for (const m of months) {
      if (m.md && !lords.some((l) => l.p === m.md && l.x === 'dasha')) lords.push({ p: m.md, x: 'dasha' });
      if (m.bd && !lords.some((l) => l.p === m.bd && l.x === 'bhukti')) lords.push({ p: m.bd, x: 'bhukti' });
    }
    for (const l of lords) {
      const p = l.p, v = { p: P(p), r: T(K.role[cx.role[p]]), x: T(W[l.x]) };
      if (k === 'health') {
        if (involv(cx, p, [6, 8, 12]) > 0) lines.push(T(W.healthLord, v));
        if (p === cx.lagnaLord) lines.push(T(W.healthLagna, v));
        continue;
      }
      const ruled = cx.owns[p].filter((h) => A.H.includes(h)), placed = A.H.includes(cx.place[p]);
      if (ruled.length && placed) lines.push(T(W.lord, { ...v, y: houses(ruled), h: ord(cx.place[p]) }));
      else if (ruled.length) lines.push(T(W.lordRules, { ...v, y: houses(ruled) }));
      else if (placed) lines.push(T(W.lordPlaced, { ...v, h: ord(cx.place[p]) }));
      if (A.k.includes(p)) lines.push(T(W.karaka, v));
    }
    const from = (g) => (g.start <= ys ? T(K.future.ui.startOfYear) : fmt(g.start));
    const seen = new Set();   // a retrograde re-entry repeats the same influence: narrate it once
    const once = (key, line) => { if (!seen.has(key)) { seen.add(key); lines.push(line); } };
    for (const g of F.segs.Jupiter) {
      if (!overlaps(g.start, g.end, ys, ye)) continue;
      if (A.H.includes(g.hL)) once('J' + g.hL, T(W.jupIn, { h: ord(g.hL), x: from(g) }));
      else { const a = [5, 7, 9].map((x) => aspected(g.hL, x)).find((h) => A.H.includes(h)); if (a) once('JA' + a, T(W.jupAsp, { h: ord(a), x: from(g) })); }
    }
    for (const g of F.segs.Saturn) {
      if (!overlaps(g.start, g.end, ys, ye)) continue;
      if (k === 'health') {
        if ([12, 1, 2, 8, 4, 7].includes(g.hM)) {
          const st = K.transit.saturn[g.hM - 1];
          once('SM' + g.hM, T(W.sade, { h: ord(g.hM), y: st.title ? T(st.title) : ord(g.hM), x: from(g) }));
        }
      } else if (A.H.includes(g.hL)) once('S' + g.hL, T([3, 6, 11].includes(g.hL) ? W.satGood : W.satIn, { h: ord(g.hL), x: from(g) }));
    }
    for (const g of F.segs.Rahu) {
      if (!overlaps(g.start, g.end, ys, ye)) continue;
      if (A.H.includes(g.hL) || (k === 'health' && (g.hL === 1 || g.hL === 8))) once('R' + g.hL, T(W.rahuIn, { h: ord(g.hL), x: from(g) }));
    }
    return Array.from(new Set(lines)).slice(0, 5);
  }

  /* ------------------------------------------------------------------ year */
  function composeYear(F, chart, yi, lang, ctx) {
    const { T, P, PD, ord, sv, SN, fmt } = tools(lang, ctx);
    const yr = F.years[yi];
    const ys = Date.UTC(yr.year, 0, 1), ye = Date.UTC(yr.year + 1, 0, 1);
    const months = F.months.slice(yi * 12, yi * 12 + 12);
    const lvl = yearLevelOf(yr.overall);
    const intro = [T(K.future.yearLevel[lvl])];
    const inYear = F.bhuktis.filter((b) => overlaps(b.start, b.end, ys, ye));
    const mahas = [];
    for (const b of inYear) if (!mahas.length || mahas[mahas.length - 1].md !== b.md) mahas.push({ md: b.md, start: b.start });
    if (mahas.length === 1) intro.push(T(K.future.dashaYear, { x: String(yr.year), p: PD(mahas[0].md) }));
    for (let i = 1; i < mahas.length; i++) intro.push(T(K.future.dashaTurn, { x: fmt(mahas[i].start), p: PD(mahas[i - 1].md), q: PD(mahas[i].md) }));
    if (!inYear.length) intro.push(T(K.future.ui.noPeriod));

    const periods = inYear.map((b) => ({
      title: T(K.ui.dashaPeriod, { p: PD(b.md), q: PD(b.bd) }), from: fmt(b.start), to: fmt(b.end), lord: b.bd,
      role: T(K.role[F.cx.role[b.bd]]), score: b.score, level: levelOf(b.score), current: ctx.nowMs >= b.start && ctx.nowMs < b.end
    }));

    const transits = [];
    for (const p of ['Saturn', 'Jupiter', 'Rahu']) {
      const segs = F.segs[p].filter((g) => overlaps(g.start, g.end, ys, ye));
      // long stays first; brief retrograde re-entries are listed but not narrated twice
      segs.forEach((g, i) => {
        const days = (Math.min(g.end, ye) - Math.max(g.start, ys)) / DAY;
        let title = null, text = null;
        if (p === 'Saturn') { const st = K.transit.saturn[g.hM - 1]; title = st.title ? T(st.title) : null; text = T(st); }
        else if (p === 'Jupiter') text = T(K.transit.jupiter[g.hM - 1]);
        else text = [3, 6, 11].includes(g.hM) ? T(K.transit.rahuGood, { h: ord(g.hM) }) : T(K.transit.rahuOther, { h: ord(g.hM), x: T(K.house[g.hM - 1]) });
        transits.push({
          p, planet: P(p), sign: SN(g.sign), hM: g.hM, hL: g.hL,
          where: `${T(K.future.ui.fromMoon, { x: ord(g.hM) })} · ${T(K.future.ui.fromLagna, { x: ord(g.hL) })}`,
          from: g.start <= ys ? null : fmt(g.start), to: g.end >= ye ? null : fmt(g.end),
          // narrate each sign once per year; brief retrograde dips are listed with dates only,
          // but a sign entered late in the year is narrated because it carries into the next
          title, text: (!segs.slice(0, i).some((x) => x.sign === g.sign) && (days >= 45 || g.end >= ye || segs.length === 1)) ? text : null, tone: p === 'Rahu' ? ([3, 6, 11].includes(g.hM) ? 'good' : '') : (p === 'Saturn' ? ([3, 6, 11].includes(g.hM) ? 'good' : [12, 1, 2, 4, 7, 8].includes(g.hM) ? 'warn' : '') : ([2, 5, 7, 9, 11].includes(g.hM) ? 'good' : ''))
        });
      });
    }

    const areas = AREA_KEYS.map((k) => {
      const s = yr.areas[k], lv = levelOf(s), A = K.future.area[k];
      return { key: k, name: T(A.name), score: s, level: lv, levelText: T(K.future.ui.levels[lv]), text: T(A[lv]), why: areaWhy(F, chart, months, ys, ye, k, lang, ctx) };
    });

    const mo = months.map((m, i) => {
      const m0 = Date.UTC(yr.year, i, 1), m1 = Date.UTC(yr.year, i + 1, 1);
      const notes = [];
      for (const e of F.events) {
        if (e.ms < m0 || e.ms >= m1) continue;
        if (e.type === 'maha') notes.push(T(K.future.ev.maha, { p: PD(e.p) }));
        else if (e.type === 'bhukti') notes.push(T(K.future.ev.bhukti, { p: PD(e.p) }));
        else notes.push(T(K.future.ev.ingressShort, { p: P(e.p), ...sv(e.s) }));
      }
      const up = m.overall >= yr.overall;
      const fp = ['Venus', 'Mercury', 'Sun', 'Mars'].filter((p) => m.fast[p].g === up).slice(0, 2);
      for (const p of fp) notes.push(T(K.future.month[p][up ? 'good' : 'bad']));
      return { i, label: lang === 'ta' ? K.monthTa[i] : K.monthEn[i], score: m.overall, level: levelOf(m.overall), notes: notes.slice(0, 3), md: m.md, bd: m.bd };
    });
    const sorted = mo.slice().sort((a, b) => b.score - a.score);
    const best = sorted.filter((m) => m.score >= 50).slice(0, 3).sort((a, b) => a.i - b.i);
    const caution = sorted.slice().reverse().filter((m) => m.score < Math.min(50, yr.overall)).slice(0, 2).sort((a, b) => a.i - b.i);

    const keyDates = F.events.filter((e) => e.ms >= ys && e.ms < ye).map((e) => ({
      date: fmt(e.ms), type: e.type, p: e.p,
      text: e.type === 'maha' ? T(K.future.ev.maha, { p: PD(e.p) }) : e.type === 'bhukti' ? T(K.future.ev.bhukti, { p: PD(e.p) })
        : T(K.future.ev.ingress, { p: P(e.p), ...sv(e.s), x: ord(e.hM) })
    }));

    const rem = [];
    const lords = Array.from(new Set(months.flatMap((m) => [m.md, m.bd]).filter(Boolean)));
    for (const p of lords) if (F.cx.q[p] < 0.5) rem.push(p);
    if (months.some((m) => [12, 1, 2, 8, 4, 7].includes(m.sat.hM))) rem.push('Saturn');
    if (months.filter((m) => JUP[m.jup.hM] < 0).length >= 6) rem.push('Jupiter');
    if (months.some((m) => m.rah.hM === 1 || m.rah.hM === 8)) rem.push('Rahu');
    const remedies = Array.from(new Set(rem)).slice(0, 3).map((p) => ({ p, planet: P(p), text: T(K.remedy[p]) }));

    return {
      year: yr.year, score: yr.overall, levelIndex: lvl, levelTitle: T(K.future.yearLevel[lvl].title), intro,
      periods, transits, areas, months: mo, best, caution, keyDates, remedies
    };
  }

  /* ------------------------------------------------------------------ bhukti */
  function segAt(F, p, t) {
    const segs = F.segs[p];
    return segs.find((g) => t >= g.start && t < g.end) || (t < F.start ? segs[0] : segs[segs.length - 1]);
  }
  function composeBhukti(F, chart, bi, lang, ctx) {
    const { T, P, PD, ord, sv, SN, fmt } = tools(lang, ctx);
    const b = F.bhuktis[bi], cx = F.cx;
    const role = cx.role[b.bd];
    const paras = [T(K.dasha.bd[b.bd])];
    if (b.bd === 'Rahu' || b.bd === 'Ketu') paras.push(T(K.dasha.role.node, { p: P(b.bd), x: P(chart.bodies[b.bd].signLord), h: ord(cx.place[b.bd]) }));
    else paras.push(T(K.dasha.role[role], { p: P(b.bd), x: cx.owns[b.bd].join(', '), ...sv(chart.lagnaSign) }));
    paras.push(T(K.dasha.role.placed, { h: ord(cx.place[b.bd]), x: T(K.house[cx.place[b.bd] - 1]) }));
    paras.push(T(K.dasha.relation[b.rel]));
    const hs = Array.from(new Set(cx.owns[b.bd].concat([cx.place[b.bd]]))).sort((x, y) => x - y);
    const goodRole = role === 'benefic' || role === 'yogakaraka';
    const activates = hs.map((h) => {
      let g;
      if (role === 'malefic') g = [3, 6, 11].includes(h);
      else if (role === 'neutral') g = ![6, 8, 12].includes(h);
      else g = h !== 8;
      return { h, good: g, text: `${ord(h)} · ${T((g ? K.future.events : K.future.eventsHard)[h - 1])}` };
    });
    const t0 = Math.max(b.start, F.start);
    const back = ['Saturn', 'Jupiter', 'Rahu'].map((p) => { const g = segAt(F, p, t0); return `${P(p)}: ${SN(g.sign)} (${T(K.future.ui.fromMoon, { x: ord(g.hM) })})`; });
    const moves = F.events.filter((e) => e.type === 'ingress' && e.ms >= b.start && e.ms < b.end).slice(0, 5)
      .map((e) => `${fmt(e.ms)} — ${T(K.future.ev.ingress, { p: P(e.p), ...sv(e.s), x: ord(e.hM) })}`);
    const antarams = E.subPeriods(b.bd, b.start, b.end - b.start).map((a) => ({ lord: a.lord, name: PD(a.lord), from: fmt(a.start), to: fmt(a.end), current: ctx.nowMs >= a.start && ctx.nowMs < a.end, past: a.end < ctx.nowMs }));
    const remedy = (!goodRole || cx.strength[b.bd] === 'weak') ? T(K.remedy[b.bd]) : null;
    return {
      title: T(K.ui.dashaPeriod, { p: PD(b.md), q: PD(b.bd) }), md: b.md, bd: b.bd, from: fmt(b.start), to: fmt(b.end),
      start: b.start, end: b.end, score: b.score, level: levelOf(b.score), levelText: T(K.future.ui.levels[levelOf(b.score)]),
      current: ctx.nowMs >= b.start && ctx.nowMs < b.end, past: b.end < ctx.nowMs,
      role: T(K.role[role]), paras, activates, backdrop: back, moves, antarams, remedy
    };
  }

  return { compute, composeYear, composeBhukti, levelOf, yearLevelOf, AREA_KEYS };
});
