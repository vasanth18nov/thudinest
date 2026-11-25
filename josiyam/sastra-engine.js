/*!
 * Josiyam · sastra-engine.js
 * Deterministic Jathaga Sastra rule engine: functional nature of planets for each Lagna,
 * yoga & dosha detection, and composition of the bilingual prediction report.
 * Pure functions of (chart, language, context) so the report can be rebuilt instantly on a language switch.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./astro-engine.js'), require('./predictions-data.js'));
  else root.JosiyamSastra = factory(root.JosiyamEngine, root.JosiyamData);
})(typeof self !== 'undefined' ? self : this, function (E, K) {
  'use strict';

  const PL = E.PLANETS;
  const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const FIVE = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const KENDRA = [1, 4, 7, 10];
  const TRIKONA = [1, 5, 9];
  const NATURAL_BENEFIC = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  /* ------------------------------------------------------------------ text helpers */
  function T(obj, lang, vars) {
    if (obj == null) return '';
    let s = typeof obj === 'string' ? obj : (obj[lang] != null ? obj[lang] : obj.en);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  const P = (p, lang) => T(K.planet[p], lang);
  const PD = (p, lang) => T(K.planet[p].dasha, lang);   // compound form: சூரிய தசை, சுக்கிர புத்தி
  const signName = (i, lang) => (lang === 'ta' ? K.rasi[i].ta : K.rasi[i].en);
  const signVars = (i, lang) => lang === 'ta'
    ? { s: K.rasi[i].ta, sl: K.rasi[i].taLoc, sa: K.rasi[i].taAdj }
    : { s: K.rasi[i].en, sl: K.rasi[i].en, sa: K.rasi[i].en };
  function ord(n, lang) {
    if (lang === 'ta') return String(n);
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function list(items, lang) {
    if (!items.length) return T(K.ui.none, lang);
    if (items.length === 1) return items[0];
    return items.slice(0, -1).join(', ') + ' ' + T(K.ui.and, lang) + ' ' + items[items.length - 1];
  }
  const houseTopic = (h, lang) => T(K.house[h - 1], lang);
  const uniq = (a) => Array.from(new Set(a));

  /* ------------------------------------------------------------------ functional nature */
  function housesOwned(planet, lagnaSign) {
    const out = [];
    for (let s = 0; s < 12; s++) if (E.SIGN_LORD[s] === planet) out.push(E.houseFrom(lagnaSign, s));
    return out.sort((a, b) => a - b);
  }
  function functionalNature(lagnaSign) {
    const lagnaLord = E.SIGN_LORD[lagnaSign];
    const res = {};
    for (const p of SEVEN) {
      const hs = housesOwned(p, lagnaSign);
      let score = 0;
      for (const h of hs) {
        if (h === 1) score += 2;
        else if (h === 5 || h === 9) score += 2.5;
        else if (KENDRA.includes(h)) score += NATURAL_BENEFIC.includes(p) ? -0.25 : 0.5;
        else if (h === 2) score += 0;
        else if (h === 12) score += -0.25;
        else if (h === 3) score += -1;
        else if (h === 11) score += -1.5;
        else if (h === 6) score += -2;
        else if (h === 8) score += (p === 'Sun' || p === 'Moon') ? 0 : -2;
      }
      const yk = hs.some((h) => [4, 7, 10].includes(h)) && hs.some((h) => h === 5 || h === 9);
      let role = yk ? 'yogakaraka' : score > 0.25 ? 'benefic' : score < -0.25 ? 'malefic' : 'neutral';
      if (p === lagnaLord && role !== 'yogakaraka') role = 'benefic';
      res[p] = { houses: hs, score, role, maraka: hs.includes(2) || hs.includes(7) };
    }
    return res;
  }
  function nodeRole(chart, p, fn) {
    const b = chart.bodies[p];
    const lordRole = fn[b.signLord].role;
    let role;
    if ([3, 6, 11].includes(b.house)) role = 'benefic';
    else if ([8, 12].includes(b.house)) role = 'malefic';
    else if (KENDRA.includes(b.house) || TRIKONA.includes(b.house)) role = (lordRole === 'benefic' || lordRole === 'yogakaraka') ? 'benefic' : 'neutral';
    else role = 'neutral';
    return { houses: [], role, maraka: b.house === 2 || b.house === 7 };
  }
  function roleOf(chart, p, fn) { return (p === 'Rahu' || p === 'Ketu') ? nodeRole(chart, p, fn) : fn[p]; }

  /* ------------------------------------------------------------------ strength */
  function strength(chart, p, nb) {
    const b = chart.bodies[p];
    let sc = 0;
    if (b.dignitySimple) sc += { exalted: 2, moolatrikona: 1.5, own: 1.5, friend: 0.5, neutral: 0, enemy: -0.75, debilitated: -2 }[b.dignity] || 0;
    if (b.combust) sc -= 1;
    if ([6, 8, 12].includes(b.house)) sc -= 0.5;
    if (KENDRA.includes(b.house) || TRIKONA.includes(b.house)) sc += 0.25;
    if (b.vargottama) sc += 0.5;
    if (b.navamsaDignity === 'exalted' || b.navamsaDignity === 'own') sc += 0.5;
    if (p === 'Moon') sc += (chart.moonPhase > 72 && chart.moonPhase < 288) ? 0.5 : -0.75;
    if (nb && nb[p]) sc += 1.5;
    return sc >= 1 ? 'strong' : sc <= -0.75 ? 'weak' : 'mid';
  }

  /* ------------------------------------------------------------------ yogas & doshas */
  const aspectsSign = (chart, p, sign) => chart.aspects[p].includes(sign);
  const mutualAspect = (chart, a, b) => aspectsSign(chart, a, chart.bodies[b].sign) && aspectsSign(chart, b, chart.bodies[a].sign);
  const exchanged = (chart, a, b) => a !== b && E.SIGN_LORD[chart.bodies[a].sign] === b && E.SIGN_LORD[chart.bodies[b].sign] === a;

  function chevvai(chart) {
    const B = chart.bodies, mars = B.Mars;
    const DOSHA = [1, 2, 4, 7, 8, 12];
    const refs = [
      { ref: 'Lagna', house: mars.house },
      { ref: 'Moon', house: E.houseFrom(B.Moon.sign, mars.sign) },
      { ref: 'Venus', house: E.houseFrom(B.Venus.sign, mars.sign) }
    ].map((r) => ({ ...r, dosha: DOSHA.includes(r.house) }));
    const active = refs.filter((r) => r.dosha);
    const exceptions = [];
    if (active.length) {
      if (['own', 'moolatrikona', 'exalted'].includes(mars.dignity)) exceptions.push({ key: 'own' });
      if (chart.lagnaSign === 3 || chart.lagnaSign === 4) exceptions.push({ key: 'lagna' });
      if (B.Jupiter.sign === mars.sign || aspectsSign(chart, 'Jupiter', mars.sign)) exceptions.push({ key: 'jupiter' });
      const SIGN_EXC = { 1: [0], 2: [2, 5], 4: [0, 7], 7: [3, 9], 8: [8, 11, 3], 12: [1, 6, 8] };
      if (SIGN_EXC[mars.house] && SIGN_EXC[mars.house].includes(mars.sign)) exceptions.push({ key: 'sign', h: mars.house, sign: mars.sign });
    }
    let status;
    if (!active.length) status = 'absent';
    else if (exceptions.length) status = 'cancelled';
    else if (refs[0].dosha) status = 'present';
    else status = 'mild';
    return { id: 'chevvai', kind: 'dosha', status, present: status === 'present' || status === 'mild', refs, active, exceptions };
  }

  function kalaSarpa(chart) {
    const B = chart.bodies, R = B.Rahu.lon;
    const side = SEVEN.map((p) => ({ p, a: E.norm(B[p].lon - R) < 180 }));
    const nA = side.filter((x) => x.a).length;
    const type = B.Rahu.house - 1;
    if (nA === 7 || nA === 0) return { id: 'kalasarpa', kind: 'dosha', status: 'present', present: true, dir: nA === 7 ? 'savya' : 'apasavya', type };
    if (nA === 6 || nA === 1) {
      const out = side.find((x) => x.a === (nA === 1)).p;
      const s = B[out].sign;
      if (s === B.Rahu.sign || s === B.Ketu.sign) return { id: 'kalasarpa', kind: 'dosha', status: 'partial', present: true, outside: out, dir: nA === 6 ? 'savya' : 'apasavya', type };
    }
    return { id: 'kalasarpa', kind: 'dosha', status: 'absent', present: false };
  }

  function detectYogas(chart) {
    const B = chart.bodies;
    const out = [];
    out.push(chevvai(chart));
    out.push(kalaSarpa(chart));

    // Pancha Mahapurusha
    for (const p of FIVE) {
      const b = B[p];
      const strongSign = ['own', 'moolatrikona', 'exalted'].includes(b.dignity);
      const fromLagna = strongSign && KENDRA.includes(b.house);
      const fromMoon = strongSign && !fromLagna && KENDRA.includes(b.houseFromMoon);
      out.push({ id: 'mp_' + p, planet: p, kind: 'yoga', group: 'mahapurusha', present: fromLagna || fromMoon, fromMoon, combust: b.combust });
    }

    // Gajakesari
    const gk = E.houseFrom(B.Moon.sign, B.Jupiter.sign);
    const gkWeak = B.Jupiter.dignity === 'debilitated' || B.Jupiter.combust || !(chart.moonPhase > 72 && chart.moonPhase < 288);
    out.push({ id: 'gajakesari', kind: 'yoga', present: KENDRA.includes(gk), house: gk, weak: gkWeak });

    // Budhaditya
    out.push({ id: 'budhaditya', kind: 'yoga', present: B.Sun.sign === B.Mercury.sign, house: B.Sun.house, combust: B.Mercury.combust });

    // Chandra-Mangala
    const cm = E.houseFrom(B.Moon.sign, B.Mars.sign);
    out.push({ id: 'chandraMangala', kind: 'yoga', present: cm === 1 || cm === 7 });

    // Kemadruma
    const nbrs = FIVE.filter((p) => [2, 12].includes(B[p].houseFromMoon));
    if (!nbrs.length) {
      const reasons = [];
      if (FIVE.some((p) => B[p].sign === B.Moon.sign) || B.Sun.sign === B.Moon.sign) reasons.push('cancelConj');
      if (FIVE.some((p) => KENDRA.includes(B[p].houseFromMoon) || KENDRA.includes(B[p].house))) reasons.push('cancelKendra');
      out.push({ id: 'kemadruma', kind: 'dosha', present: true, status: reasons.length ? 'cancelled' : 'present', reasons });
    } else out.push({ id: 'kemadruma', kind: 'dosha', present: false });

    // Neecha bhanga / plain debilitation
    const neecha = [];
    for (const p of SEVEN) {
      const b = B[p];
      if (b.dignitySimple !== 'debilitated') continue;
      const reasons = [];
      const kendraAny = (q) => KENDRA.includes(B[q].house) || KENDRA.includes(B[q].houseFromMoon);
      const sl = E.SIGN_LORD[b.sign];
      if (kendraAny(sl)) reasons.push({ key: 'reasonSignLord', q: sl });
      const xl = E.SIGN_LORD[E.EXALT[p]];
      if (xl !== sl && kendraAny(xl)) reasons.push({ key: 'reasonExLord', q: xl });
      if (b.navamsaDignity === 'exalted' || b.navamsaDignity === 'own') reasons.push({ key: 'reasonNav' });
      neecha.push({ id: 'neecha_' + p, planet: p, kind: reasons.length ? 'yoga' : 'dosha', group: 'neecha', present: true, cancelled: reasons.length > 0, reasons });
    }
    if (neecha.length) out.push(...neecha);
    else out.push({ id: 'neecha_none', kind: 'yoga', group: 'neecha', present: false });

    // Dharma-Karmadhipati
    const L9 = E.SIGN_LORD[(chart.lagnaSign + 8) % 12], L10 = E.SIGN_LORD[(chart.lagnaSign + 9) % 12];
    let dk = null;
    if (L9 === L10) {
      if ((KENDRA.includes(B[L9].house) || TRIKONA.includes(B[L9].house)) && B[L9].dignitySimple !== 'debilitated') dk = { key: 'same', p: L9 };
    } else if (B[L9].sign === B[L10].sign) dk = { key: 'conj', p: L9, q: L10, sign: B[L9].sign };
    else if (exchanged(chart, L9, L10)) dk = { key: 'exchange', p: L9, q: L10 };
    else if (mutualAspect(chart, L9, L10)) dk = { key: 'aspect', p: L9, q: L10 };
    out.push({ id: 'dharmaKarma', kind: 'yoga', present: !!dk, link: dk });

    return out;
  }
  function neechaBhangaMap(yogas) {
    const m = {};
    for (const y of yogas) if (y.group === 'neecha' && y.cancelled) m[y.planet] = true;
    return m;
  }

  /* ------------------------------------------------------------------ card builders */
  function dignityParas(chart, p, lang) {
    const b = chart.bodies[p];
    const out = [];
    if (b.dignity) out.push(T(K.dignityText[b.dignity], lang, { p: P(p, lang) }));
    else out.push(T(K.dignityText.node, lang, { p: P(p, lang), x: P(b.signLord, lang) }));
    if (b.combust) out.push(T(K.dignityText.combust, lang, { p: P(p, lang) }));
    if (b.retro && p !== 'Rahu' && p !== 'Ketu') out.push(T(K.dignityText.retro, lang, { p: P(p, lang) }));
    if (b.vargottama) out.push(T(K.dignityText.vargottama, lang, { p: P(p, lang) }));
    return out;
  }
  function lordPlacement(chart, h, lang) {
    const sign = (chart.lagnaSign + h - 1) % 12;
    const lord = E.SIGN_LORD[sign];
    const at = chart.bodies[lord].house;
    const parts = [T(K.lordPlace.intro, lang, { h: ord(h, lang), p: P(lord, lang), x: ord(at, lang), y: houseTopic(at, lang) })];
    let cat;
    if (at === h) cat = 'own';
    else if (at === 1) cat = 'lagna';
    else if ([4, 7, 10].includes(at)) cat = 'kendra';
    else if (at === 5 || at === 9) cat = 'trikona';
    else if (at === 2 || at === 11) cat = 'dhana';
    else if (at === 3) cat = 'upachaya';
    else if (at === 6) cat = 'six';
    else if (at === 8) cat = 'eight';
    else cat = 'twelve';
    parts.push(T(K.lordPlace[cat], lang));
    return { lord, at, text: parts.join(' ') };
  }
  function dignityLabel(b, lang) {
    if (!b.dignity) return '—';
    return T(K.dignity[b.dignity], lang);
  }
  function placeLabel(chart, p, lang) {
    const b = chart.bodies[p];
    return T(K.ui.inHouse, lang, { h: b.house }) + ' · ' + signName(b.sign, lang);
  }
  function nakLabel(idx, pada, lang) { return `${T(K.nakshatra[idx], lang)} · ${T(K.ui.pada, lang)} ${pada}`; }

  /* ------------------------------------------------------------------ report */
  function buildReport(chart, lang, ctx) {
    ctx = ctx || {};
    const fmtDate = ctx.fmtDate || ((ms) => new Date(ms).toISOString().slice(0, 10));
    const nowMs = ctx.nowMs || Date.now();
    const B = chart.bodies;
    const yogas = detectYogas(chart);
    const nb = neechaBhangaMap(yogas);
    const fn = functionalNature(chart.lagnaSign);
    const sections = [];

    /* ---- 1. Star & Rasi ---- */
    {
      const n = chart.janmaNakshatra, prof = K.nakProfile[n];
      const yoni = K.nakYoni[n];
      const moonNav = B.Moon.navamsa;
      const nakLord = B.Moon.nakLord, rasiLord = B.Moon.signLord;
      const lords = uniq([nakLord, rasiLord]);
      const cards = [];
      cards.push({
        title: T(K.ui.cStar, lang), badge: T(K.nakshatra[n], lang),
        facts: [
          [T(K.ui.janmaNak, lang), nakLabel(n, chart.janmaPada, lang)],
          [T(K.ui.fNakLord, lang), P(nakLord, lang)],
          [T(K.ui.fDeity, lang), T(prof.deity, lang)],
          [T(K.ui.fSymbol, lang), T(prof.symbol, lang)],
          [T(K.ui.fGana, lang), T(K.gana[K.nakGana[n]], lang)],
          [T(K.ui.fYoni, lang), `${T(K.yoni[yoni[0]], lang)} (${T(K.gender[yoni[1]], lang)})`],
          [T(K.ui.fNadi, lang), T(K.nadi[K.nakNadi[n]], lang)],
          [T(K.ui.fTatva, lang), T(K.element[K.rasi[B.Moon.sign].el], lang)]
        ],
        paras: [
          T(prof, lang),
          T(K.ganaText[K.nakGana[n]], lang),
          T(K.padaText, lang, { x: chart.janmaPada, ...signVars(moonNav, lang), y: T(K.element[K.rasi[moonNav].el], lang).toLowerCase() }),
          T(K.nadiText, lang)
        ]
      });
      cards.push({
        title: T(K.ui.cRasi, lang), badge: signName(B.Moon.sign, lang),
        facts: [
          [T(K.ui.janmaRasi, lang), `${signName(B.Moon.sign, lang)}${lang === 'en' ? ' (' + K.rasi[B.Moon.sign].sa + ')' : ''}`],
          [T(K.ui.fRasiLord, lang), P(rasiLord, lang)],
          [T(K.ui.fDegree, lang), B.Moon.degText],
          [T(K.ui.fStrength, lang), dignityLabel(B.Moon, lang)]
        ],
        paras: [T(K.rasiPalan[B.Moon.sign], lang)]
      });
      cards.push({
        title: T(K.ui.cLucky, lang),
        facts: [
          [T(K.ui.fColors, lang), lords.map((p) => T(K.luck[p].color, lang)).join(' · ')],
          [T(K.ui.fNumbers, lang), uniq(lords.map((p) => K.luck[p].num)).join(', ')],
          [T(K.ui.fDays, lang), uniq(lords.map((p) => K.weekdayShort[lang][K.luck[p].day])).join(', ')],
          [T(K.ui.fGem, lang), lords.map((p) => T(K.luck[p].gem, lang)).join(', ')]
        ],
        paras: [T(K.gemNote, lang, { p: list(lords.map((p) => P(p, lang)), lang), x: list(lords.map((p) => T(K.luck[p].gem, lang)), lang) })]
      });
      const pc = chart.panchang;
      const tithiName = pc.tithi === 29 ? T(K.amavasya, lang) : T(K.tithi[pc.tithi % 15], lang);
      const facts = [
        [T(K.ui.pTithi, lang), `${T(K.paksha[pc.paksha], lang)} ${tithiName}`],
        [T(K.ui.pVaara, lang), T(K.weekday[pc.weekday], lang) + (ctx.beforeSunrise ? ' *' : '')],
        [T(K.ui.pNak, lang), nakLabel(pc.nakshatra, pc.pada, lang)],
        [T(K.ui.pYoga, lang), T(K.yoga[pc.yoga], lang)],
        [T(K.ui.pKarana, lang), T(K.karana[pc.karana], lang)]
      ];
      if (pc.tamil) {
        facts.push([T(K.ui.pTamilDate, lang), `${T(K.tamilMonth[pc.tamil.month], lang)} ${pc.tamil.day}`]);
        facts.push([T(K.ui.pTamilYear, lang), T(K.ui.yearSuffix, lang, { x: T(K.tamilYear[pc.tamil.yearIndex], lang) })]);
      }
      if (ctx.fmtTime && pc.sunrise) facts.push([T(K.ui.pSunrise, lang), ctx.fmtTime(pc.sunrise)]);
      if (ctx.fmtTime && pc.sunset) facts.push([T(K.ui.pSunset, lang), ctx.fmtTime(pc.sunset)]);
      if (pc.nazhigai) facts.push([T(K.ui.pNazhigai, lang), T(K.ui.pNazhigaiVal, lang, { x: pc.nazhigai.n, y: pc.nazhigai.v })]);
      facts.push([T(K.ui.pAyanamsa, lang), chart.ayanamsaText]);
      cards.push({ title: T(K.ui.panchangTitle, lang), facts, paras: ctx.beforeSunrise ? ['* ' + T(K.ui.pVedicDayNote, lang)] : [], id: 'panchang' });
      sections.push({ id: 'star', title: T(K.ui.tabStar, lang), cards });
    }

    /* ---- 2. Lagna ---- */
    {
      const L = B.Lagna, ls = chart.lagnaSign, lord = E.SIGN_LORD[ls];
      const lb = B[lord];
      const occ = chart.occupants[ls].filter((p) => p !== 'Lagna');
      const cards = [];
      cards.push({
        title: T(K.ui.cLagna, lang), badge: signName(ls, lang),
        facts: [
          [T(K.ui.fSign, lang), `${signName(ls, lang)}${lang === 'en' ? ' (' + K.rasi[ls].sa + ')' : ''}`],
          [T(K.ui.fDegree, lang), L.degText],
          [T(K.ui.janmaNak, lang), nakLabel(L.nakshatra, L.pada, lang)],
          [T(K.ui.fLord, lang), P(lord, lang)],
          [T(K.ui.inspOccupants, lang), occ.length ? occ.map((p) => P(p, lang)).join(', ') : T(K.ui.none, lang)]
        ],
        paras: [T(K.lagnaReading[ls], lang), T(K.health.constitution[K.rasi[ls].el], lang)]
      });
      const st = strength(chart, lord, nb);
      cards.push({
        title: T(K.ui.cLagnaLord, lang), badge: P(lord, lang), tone: st === 'strong' ? 'good' : st === 'weak' ? 'warn' : '',
        facts: [
          [T(K.ui.fPlacement, lang), placeLabel(chart, lord, lang)],
          [T(K.ui.thDignity, lang), dignityLabel(lb, lang)],
          [T(K.ui.fStrength, lang), T(K.ui[st], lang)]
        ],
        paras: [T(K.lagnaLordInHouse[lb.house - 1], lang)].concat(dignityParas(chart, lord, lang))
      });
      const groups = { yogakaraka: [], benefic: [], neutral: [], malefic: [] };
      const marakas = [];
      for (const p of SEVEN) {
        groups[fn[p].role].push(`${P(p, lang)} (${fn[p].houses.join(', ')})`);
        if (fn[p].maraka) marakas.push(P(p, lang));
      }
      const facts = [];
      if (groups.yogakaraka.length) facts.push([T(K.ui.gYogakaraka, lang), groups.yogakaraka.join(', ')]);
      facts.push([T(K.ui.gBenefics, lang), groups.benefic.join(', ') || T(K.ui.none, lang)]);
      facts.push([T(K.ui.gNeutral, lang), groups.neutral.join(', ') || T(K.ui.none, lang)]);
      facts.push([T(K.ui.gMalefics, lang), groups.malefic.join(', ') || T(K.ui.none, lang)]);
      facts.push([T(K.ui.gMarakas, lang), marakas.join(', ')]);
      cards.push({ title: T(K.ui.cFunctional, lang), facts, paras: [T(K.ui.functionalNote, lang)] });
      sections.push({ id: 'lagna', title: T(K.ui.tabLagna, lang), cards });
    }

    /* ---- 3. Life pillars ---- */
    {
      const cards = [];
      const ls = chart.lagnaSign;
      // Career
      {
        const s10 = (ls + 9) % 12, lp = lordPlacement(chart, 10, lang);
        const occ = chart.occupants[s10].filter((p) => p !== 'Lagna');
        const paras = [T(K.career.signStyle[s10], lang), lp.text, T(K.career.fieldsLine, lang, { p: P(lp.lord, lang), x: T(K.career.fields[lp.lord], lang) })];
        if (occ.length) paras.push(T(K.career.occupants, lang, { x: occ.map((p) => `${P(p, lang)}: ${T(K.career.fields[p], lang)}`).join('; ') }));
        else paras.push(T(K.career.empty, lang, { p: P(lp.lord, lang) }));
        paras.push(T(K.career.sun[strength(chart, 'Sun', nb)], lang));
        paras.push(T(K.career.saturn[strength(chart, 'Saturn', nb)], lang));
        cards.push({
          title: T(K.ui.cCareer, lang), icon: 'career',
          facts: [
            [T(K.ui.fTenth, lang), signName(s10, lang)],
            [T(K.ui.fTenthLord, lang), `${P(lp.lord, lang)} · ${placeLabel(chart, lp.lord, lang)}`],
            [T(K.ui.inspOccupants, lang), occ.length ? occ.map((p) => P(p, lang)).join(', ') : T(K.ui.none, lang)],
            [P('Saturn', lang), `${placeLabel(chart, 'Saturn', lang)} · ${dignityLabel(B.Saturn, lang)}`],
            [P('Sun', lang), `${placeLabel(chart, 'Sun', lang)} · ${dignityLabel(B.Sun, lang)}`]
          ],
          paras
        });
      }
      // Wealth
      {
        const l2 = lordPlacement(chart, 2, lang), l11 = lordPlacement(chart, 11, lang);
        const a = l2.lord, b = l11.lord;
        const links = [];
        if (a === b) {
          const h = B[a].house;
          if (KENDRA.includes(h) || TRIKONA.includes(h) || h === 2 || h === 11) links.push(T(K.wealth.linkSame, lang, { p: P(a, lang) }));
        } else {
          if (B[a].sign === B[b].sign) links.push(T(K.wealth.linkConj, lang, { p: P(a, lang), q: P(b, lang), ...signVars(B[a].sign, lang) }));
          if (exchanged(chart, a, b)) links.push(T(K.wealth.linkExchange, lang, { p: P(a, lang), q: P(b, lang) }));
          else if (B[a].sign !== B[b].sign && mutualAspect(chart, a, b)) links.push(T(K.wealth.linkAspect, lang, { p: P(a, lang), q: P(b, lang) }));
          if (B[a].house === 11) links.push(T(K.wealth.linkInHouse, lang, { x: ord(2, lang), p: P(a, lang), y: ord(11, lang) }));
          if (B[b].house === 2) links.push(T(K.wealth.linkInHouse, lang, { x: ord(11, lang), p: P(b, lang), y: ord(2, lang) }));
        }
        const paras = [T(K.wealth.style[a], lang), l2.text, l11.text];
        paras.push(links.length ? T(K.wealth.dhanaYes, lang, { x: links.join('; ') }) : T(K.wealth.dhanaNo, lang));
        paras.push(T(K.wealth.jupiter[strength(chart, 'Jupiter', nb)], lang));
        cards.push({
          title: T(K.ui.cWealth, lang), icon: 'wealth', tone: links.length ? 'good' : '',
          facts: [
            [T(K.ui.fSecond, lang), `${P(a, lang)} · ${placeLabel(chart, a, lang)}`],
            [T(K.ui.fEleventh, lang), `${P(b, lang)} · ${placeLabel(chart, b, lang)}`],
            [P('Jupiter', lang), `${placeLabel(chart, 'Jupiter', lang)} · ${dignityLabel(B.Jupiter, lang)}`]
          ],
          paras
        });
      }
      // Marriage
      {
        const s7 = (ls + 6) % 12, l7 = lordPlacement(chart, 7, lang);
        const occ = chart.occupants[s7].filter((p) => p !== 'Lagna');
        const mal = occ.filter((p) => ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p));
        const paras = [T(K.marriage.partner[s7], lang), l7.text, T(K.marriage.venus[strength(chart, 'Venus', nb)], lang)];
        if (ctx.gender === 'female') paras.push(T(K.marriage.jupiter[strength(chart, 'Jupiter', nb)], lang));
        if (B.Jupiter.sign === s7 || aspectsSign(chart, 'Jupiter', s7)) paras.push(T(K.marriage.jupiterAspect, lang));
        if (mal.length) paras.push(T(K.marriage.malefics, lang, { x: mal.map((p) => P(p, lang)).join(', ') }));
        const cv = yogas.find((y) => y.id === 'chevvai');
        paras.push(T(K.marriage.chevvaiRef, lang, { x: T(K.yogas.chevvai.status[cv.status], lang) }));
        cards.push({
          title: T(K.ui.cMarriage, lang), icon: 'marriage',
          facts: [
            [T(K.ui.fSeventh, lang), signName(s7, lang)],
            [T(K.ui.fSeventhLord, lang), `${P(l7.lord, lang)} · ${placeLabel(chart, l7.lord, lang)}`],
            [T(K.ui.inspOccupants, lang), occ.length ? occ.map((p) => P(p, lang)).join(', ') : T(K.ui.none, lang)],
            [P('Venus', lang), `${placeLabel(chart, 'Venus', lang)} · ${dignityLabel(B.Venus, lang)}`]
          ],
          paras
        });
      }
      // Health
      {
        const lord = E.SIGN_LORD[ls];
        const s6 = (ls + 5) % 12, s8 = (ls + 7) % 12;
        const paras = [T(K.health.constitution[K.rasi[ls].el], lang), T(K.health.lagnaLord[strength(chart, lord, nb)], lang, { p: P(lord, lang) })];
        paras.push(T(K.health.sixth, lang, { ...signVars(s6, lang), x: T(K.health.body[s6], lang) }));
        paras.push(T(K.health.eighth, lang, { ...signVars(s8, lang), x: T(K.health.body[s8], lang) }));
        for (const [h, s] of [[6, s6], [8, s8]]) {
          const occ = chart.occupants[s].filter((p) => p !== 'Lagna');
          if (occ.length) paras.push(T(K.health.planetsIn, lang, { h: ord(h, lang), x: occ.map((p) => `${P(p, lang)} — ${T(K.health.planet[p], lang)}`).join('; ') }));
        }
        paras.push(strength(chart, 'Moon', nb) === 'weak' ? T(K.health.moonWeak, lang) : T(K.health.moonStrong, lang));
        paras.push(T(K.health.advice, lang));
        cards.push({
          title: T(K.ui.cHealth, lang), icon: 'health',
          facts: [
            [T(K.ui.lagna, lang), `${signName(ls, lang)} · ${T(K.health.body[ls], lang)}`],
            [T(K.ui.fSixth, lang), `${signName(s6, lang)} · ${T(K.health.body[s6], lang)}`],
            [T(K.ui.fEighth, lang), `${signName(s8, lang)} · ${T(K.health.body[s8], lang)}`],
            [T(K.ui.cLagnaLord, lang), `${P(lord, lang)} · ${T(K.ui[strength(chart, lord, nb)], lang)}`]
          ],
          paras
        });
      }
      sections.push({ id: 'pillars', title: T(K.ui.tabPillars, lang), cards });
    }

    /* ---- 4. Yogas & Doshas ---- */
    {
      const Y = K.yogas;
      const found = [], absent = [];
      for (const y of yogas) {
        if (y.id === 'chevvai') {
          const refsText = y.active.map((r) => T(Y.chevvai.ref[r.ref], lang)).join(', ');
          const facts = y.refs.map((r) => [`${T(K.yogaUi.from, lang)}: ${T(Y.chevvai.ref[r.ref], lang)}`, `${T(K.ui.inHouse, lang, { h: r.house })}${r.dosha ? ' · ' + T(K.yogaUi.doshaHouse, lang) : ''}`]);
          const paras = [];
          if (y.status === 'absent') { absent.push({ name: T(Y.chevvai.name, lang), rule: T(Y.chevvai.rule, lang) }); continue; }
          if (y.status === 'present') paras.push(T(Y.chevvai.present, lang, { x: refsText }));
          else if (y.status === 'mild') paras.push(T(Y.chevvai.mild, lang, { x: refsText }));
          else {
            const why = y.exceptions.map((e) => e.key === 'sign'
              ? T(Y.chevvai.exc.sign, lang, { h: ord(e.h, lang), ...signVars(e.sign, lang) })
              : T(Y.chevvai.exc[e.key], lang)).join('; ');
            paras.push(T(Y.chevvai.cancelled, lang, { x: refsText, y: why }));
          }
          if (y.status !== 'cancelled') { paras.push(T(Y.chevvai.age, lang)); paras.push(T(Y.chevvai.remedy, lang)); }
          found.push({ title: T(Y.chevvai.name, lang), badge: T(Y.chevvai.status[y.status], lang), tone: y.status === 'cancelled' ? 'good' : 'warn', kind: 'dosha', rule: T(Y.chevvai.rule, lang), facts, paras });
        } else if (y.id === 'kalasarpa') {
          if (!y.present) { absent.push({ name: T(Y.kalasarpa.name, lang), rule: T(Y.kalasarpa.rule, lang) }); continue; }
          const typ = T(Y.kalasarpa.types[y.type], lang);
          const paras = [T(Y.kalasarpa.present, lang, { x: typ, y: T(Y.kalasarpa[y.dir], lang) })];
          if (y.status === 'partial') paras.push(T(Y.kalasarpa.partial, lang, { p: P(y.outside, lang) }));
          paras.push(T(Y.kalasarpa.remedy, lang));
          found.push({ title: T(Y.kalasarpa.name, lang), badge: T(Y.kalasarpa.status[y.status], lang), tone: 'warn', kind: 'dosha', rule: T(Y.kalasarpa.rule, lang),
            facts: [[P('Rahu', lang), placeLabel(chart, 'Rahu', lang)], [P('Ketu', lang), placeLabel(chart, 'Ketu', lang)]], paras });
        } else if (y.group === 'mahapurusha') {
          const d = Y.mahapurusha[y.planet];
          const rule = T(Y.mahapurusha.rule, lang, { p: P(y.planet, lang) });
          if (!y.present) { absent.push({ name: T(d.name, lang), rule }); continue; }
          const paras = [T(d, lang)];
          if (y.fromMoon) paras.push(T(Y.mahapurusha.fromMoon, lang));
          if (y.combust) paras.push(T(Y.mahapurusha.combust, lang, { p: P(y.planet, lang) }));
          found.push({ title: T(d.name, lang), badge: T(K.yogaUi.present, lang), tone: 'good', kind: 'yoga', rule,
            facts: [[P(y.planet, lang), `${placeLabel(chart, y.planet, lang)} · ${dignityLabel(B[y.planet], lang)}`]], paras });
        } else if (y.id === 'gajakesari') {
          if (!y.present) { absent.push({ name: T(Y.gajakesari.name, lang), rule: T(Y.gajakesari.rule, lang) }); continue; }
          const paras = [T(Y.gajakesari, lang, { x: ord(y.house, lang) })];
          if (y.weak) paras.push(T(Y.gajakesari.weak, lang));
          found.push({ title: T(Y.gajakesari.name, lang), badge: T(K.yogaUi.present, lang), tone: 'good', kind: 'yoga', rule: T(Y.gajakesari.rule, lang),
            facts: [[P('Jupiter', lang), placeLabel(chart, 'Jupiter', lang)], [P('Moon', lang), placeLabel(chart, 'Moon', lang)]], paras });
        } else if (y.id === 'budhaditya') {
          if (!y.present) { absent.push({ name: T(Y.budhaditya.name, lang), rule: T(Y.budhaditya.rule, lang) }); continue; }
          const paras = [T(Y.budhaditya, lang, { h: ord(y.house, lang), x: houseTopic(y.house, lang) })];
          if (y.combust) paras.push(T(Y.budhaditya.combust, lang));
          found.push({ title: T(Y.budhaditya.name, lang), badge: T(K.yogaUi.present, lang), tone: 'good', kind: 'yoga', rule: T(Y.budhaditya.rule, lang),
            facts: [[`${P('Sun', lang)} + ${P('Mercury', lang)}`, placeLabel(chart, 'Sun', lang)]], paras });
        } else if (y.id === 'chandraMangala') {
          if (!y.present) { absent.push({ name: T(Y.chandraMangala.name, lang), rule: T(Y.chandraMangala.rule, lang) }); continue; }
          found.push({ title: T(Y.chandraMangala.name, lang), badge: T(K.yogaUi.present, lang), tone: 'good', kind: 'yoga', rule: T(Y.chandraMangala.rule, lang),
            facts: [[P('Moon', lang), placeLabel(chart, 'Moon', lang)], [P('Mars', lang), placeLabel(chart, 'Mars', lang)]], paras: [T(Y.chandraMangala, lang)] });
        } else if (y.id === 'kemadruma') {
          if (!y.present) { absent.push({ name: T(Y.kemadruma.name, lang), rule: T(Y.kemadruma.rule, lang) }); continue; }
          const paras = y.status === 'cancelled'
            ? [T(Y.kemadruma.cancelled, lang, { x: list(y.reasons.map((r) => T(Y.kemadruma[r], lang)), lang) })]
            : [T(Y.kemadruma.present, lang), T(Y.kemadruma.remedy, lang)];
          found.push({ title: T(Y.kemadruma.name, lang), badge: T(Y.kemadruma.status[y.status], lang), tone: y.status === 'cancelled' ? 'good' : 'warn', kind: 'dosha', rule: T(Y.kemadruma.rule, lang),
            facts: [[P('Moon', lang), placeLabel(chart, 'Moon', lang)]], paras });
        } else if (y.group === 'neecha') {
          if (!y.present) { absent.push({ name: T(Y.neechaBhanga.name, lang), rule: T(Y.neechaBhanga.rule, lang) }); continue; }
          const pl = P(y.planet, lang);
          if (y.cancelled) {
            const why = list(y.reasons.map((r) => T(Y.neechaBhanga[r.key], lang, { q: r.q ? P(r.q, lang) : '' })), lang);
            found.push({ title: `${T(Y.neechaBhanga.name, lang)} · ${pl}`, badge: T(K.yogaUi.present, lang), tone: 'good', kind: 'yoga', rule: T(Y.neechaBhanga.rule, lang),
              facts: [[pl, `${placeLabel(chart, y.planet, lang)} · ${dignityLabel(B[y.planet], lang)}`]], paras: [T(Y.neechaBhanga, lang, { p: pl, x: why })] });
          } else {
            found.push({ title: `${T(Y.neechaBhanga.plainName, lang)} · ${pl}`, badge: T(K.dignity.debilitated.short, lang), tone: 'warn', kind: 'dosha', rule: T(Y.neechaBhanga.rule, lang),
              facts: [[pl, placeLabel(chart, y.planet, lang)]], paras: [T(Y.neechaBhanga.plain, lang, { p: pl, x: T(K.remedy[y.planet], lang) })] });
          }
        } else if (y.id === 'dharmaKarma') {
          if (!y.present) { absent.push({ name: T(Y.dharmaKarma.name, lang), rule: T(Y.dharmaKarma.rule, lang) }); continue; }
          const l = y.link;
          const link = T(Y.dharmaKarma[l.key], lang, { p: P(l.p, lang), q: l.q ? P(l.q, lang) : '', ...(l.sign != null ? signVars(l.sign, lang) : {}) });
          found.push({ title: T(Y.dharmaKarma.name, lang), badge: T(K.yogaUi.present, lang), tone: 'good', kind: 'yoga', rule: T(Y.dharmaKarma.rule, lang),
            facts: [[P(l.p, lang), placeLabel(chart, l.p, lang)]].concat(l.q ? [[P(l.q, lang), placeLabel(chart, l.q, lang)]] : []), paras: [T(Y.dharmaKarma, lang, { x: link })] });
        }
      }
      sections.push({ id: 'yoga', title: T(K.ui.tabYoga, lang), found, absent, cards: found });
    }

    /* ---- 5. Dasha-Bhukti & transits ---- */
    {
      const cards = [];
      const cur = E.currentPeriod(chart.dasha, nowMs);
      const roleLine = (p) => {
        const r = roleOf(chart, p, fn);
        const parts = [];
        if (p === 'Rahu' || p === 'Ketu') parts.push(T(K.dasha.role.node, lang, { p: P(p, lang), x: P(B[p].signLord, lang), h: ord(B[p].house, lang) }));
        else parts.push(T(K.dasha.role[r.role], lang, { p: P(p, lang), x: r.houses.join(', '), ...signVars(chart.lagnaSign, lang) }));
        parts.push(T(K.dasha.role.placed, lang, { h: ord(B[p].house, lang), x: houseTopic(B[p].house, lang) }));
        if (r.maraka && p !== 'Rahu' && p !== 'Ketu') parts.push(T(K.dasha.role.maraka, lang));
        return parts;
      };
      if (!cur) {
        cards.push({ title: T(K.ui.cMaha, lang), paras: [T(K.dasha.beforeBirth, lang)] });
      } else {
        const md = cur.maha.lord, bd = cur.bhukti.lord;
        const rMd = roleOf(chart, md, fn), rBd = roleOf(chart, bd, fn);
        cards.push({
          title: T(K.ui.cMaha, lang), badge: T(K.ui.dashaOf, lang, { p: PD(md, lang) }), id: 'md',
          facts: [
            [T(K.ui.fPeriod, lang), `${fmtDate(cur.maha.start)} → ${fmtDate(cur.maha.end)}`],
            [T(K.ui.fRole, lang), T(K.role[rMd.role], lang) + (rMd.maraka ? ' · ' + T(K.role.maraka, lang) : '')],
            [T(K.ui.fPlacement, lang), `${placeLabel(chart, md, lang)} · ${dignityLabel(B[md], lang)}`]
          ],
          paras: [T(K.dasha.md[md], lang)].concat(roleLine(md))
        });
        const dist = E.houseFrom(B[md].sign, B[bd].sign);
        let rel;
        if (md === bd) rel = 'same';
        else if ([1, 5, 9].includes(dist)) rel = 'trine';
        else if ([4, 7, 10].includes(dist)) rel = 'kendra';
        else if ([3, 11].includes(dist)) rel = 'growth';
        else if ([2, 12].includes(dist)) rel = 'mixed';
        else rel = 'friction';
        const bParas = [T(K.dasha.bd[bd], lang)].concat(roleLine(bd));
        bParas.push(T(K.dasha.relation[rel], lang));
        if (md !== bd) {
          const nr = E.naturalRelation(md, bd);
          if (nr === 'friend') bParas.push(T(K.dasha.relation.friends, lang, { p: P(md, lang), q: P(bd, lang) }));
          else if (nr === 'enemy') bParas.push(T(K.dasha.relation.enemies, lang, { p: P(md, lang), q: P(bd, lang) }));
        }
        cards.push({
          title: T(K.ui.cBhukti, lang), badge: T(K.ui.bhuktiOf, lang, { p: PD(bd, lang) }), id: 'bd',
          facts: [
            [T(K.ui.fPeriod, lang), `${fmtDate(cur.bhukti.start)} → ${fmtDate(cur.bhukti.end)}`],
            [T(K.ui.fRole, lang), T(K.role[rBd.role], lang) + (rBd.maraka ? ' · ' + T(K.role.maraka, lang) : '')],
            [T(K.ui.fPlacement, lang), `${placeLabel(chart, bd, lang)} · ${dignityLabel(B[bd], lang)}`]
          ],
          paras: bParas
        });
        const good = (r) => r.role === 'benefic' || r.role === 'yogakaraka';
        const bad = (r) => r.role === 'malefic';
        let score = (good(rMd) ? 1 : bad(rMd) ? -1 : 0) + (good(rBd) ? 1 : bad(rBd) ? -1 : 0);
        if (rel === 'friction') score -= 1; else if (rel === 'trine' || rel === 'growth') score += 0.5;
        const ov = score >= 1.5 ? 'good' : score <= -1 ? 'hard' : 'mixed';
        const gParas = [T(K.dasha.overall[ov], lang)];
        gParas.push(T(K.dasha.antaram, lang, { p: PD(cur.antara.lord, lang), x: fmtDate(cur.antara.end) }));
        if (cur.nextBhukti) {
          if (cur.nextBhukti.start >= cur.maha.end - 1000) gParas.push(T(K.dasha.nextMaha, lang, { p: PD(cur.nextBhukti.lord, lang), x: fmtDate(cur.nextBhukti.start) }));
          else gParas.push(T(K.dasha.next, lang, { p: PD(cur.nextBhukti.lord, lang), x: fmtDate(cur.nextBhukti.start) }));
        }
        const remLords = uniq([md, bd]).filter((p) => !good(roleOf(chart, p, fn)) || strength(chart, p, nb) === 'weak');
        const rems = (remLords.length ? remLords : [md]).map((p) => `${P(p, lang)}: ${T(K.remedy[p], lang)}`);
        cards.push({
          title: T(K.ui.cGuidance, lang), badge: T(K.dasha.overall[ov].title, lang), tone: ov === 'good' ? 'good' : ov === 'hard' ? 'warn' : '', id: 'guidance',
          paras: gParas, subTitle: T(K.dasha.remedyTitle, lang), sub: rems
        });
      }
      // transits
      try {
        const tl = E.transitNow(nowMs, chart.nodeType);
        const tSign = (p) => E.signOf(tl[p]);
        const satH = E.houseFrom(chart.moonSign, tSign('Saturn'));
        const jupH = E.houseFrom(chart.moonSign, tSign('Jupiter'));
        const rahH = E.houseFrom(chart.moonSign, tSign('Rahu'));
        const sat = K.transit.saturn[satH - 1], jup = K.transit.jupiter[jupH - 1];
        const untilTxt = (p, maxDays) => {
          const ing = E.nextIngress(p, nowMs, maxDays);
          return ing ? T(K.transit.until, lang, { ...signVars(tSign(p), lang), x: fmtDate(ing.atMs) }) : '';
        };
        const satParas = [T(sat, lang)];
        const su = untilTxt('Saturn', 1100); if (su) satParas.push(su);
        if ([12, 1, 2].includes(satH)) satParas.push(T(K.transit.sadeNote, lang));
        const tcards = [
          { title: T(K.transit.saturnTitle, lang), badge: sat.title ? T(sat.title, lang) : T(K.transit.fromMoon, lang, { x: ord(satH, lang) }),
            tone: [3, 6, 11].includes(satH) ? 'good' : [12, 1, 2, 4, 7, 8].includes(satH) ? 'warn' : '',
            facts: [[P('Saturn', lang), `${signName(tSign('Saturn'), lang)} · ${T(K.transit.fromMoon, lang, { x: ord(satH, lang) })}`]], paras: satParas },
          { title: T(K.transit.jupiterTitle, lang), badge: T(K.transit.fromMoon, lang, { x: ord(jupH, lang) }), tone: [2, 5, 7, 9, 11].includes(jupH) ? 'good' : '',
            facts: [[P('Jupiter', lang), `${signName(tSign('Jupiter'), lang)} · ${T(K.transit.fromMoon, lang, { x: ord(jupH, lang) })}`]], paras: [T(jup, lang), untilTxt('Jupiter', 420)].filter(Boolean) },
          { title: T(K.transit.rahuTitle, lang), badge: T(K.transit.fromMoon, lang, { x: ord(rahH, lang) }), tone: [3, 6, 11].includes(rahH) ? 'good' : '',
            facts: [[P('Rahu', lang), signName(tSign('Rahu'), lang)], [P('Ketu', lang), signName(tSign('Ketu'), lang)]],
            paras: [[3, 6, 11].includes(rahH) ? T(K.transit.rahuGood, lang, { h: ord(rahH, lang) }) : T(K.transit.rahuOther, lang, { h: ord(rahH, lang), x: houseTopic(rahH, lang) })] }
        ];
        cards.push(...tcards.map((c) => ({ ...c, group: 'transit' })));
      } catch (e) { /* transit is optional */ }
      sections.push({ id: 'dasha', title: T(K.ui.tabDasha, lang), cards });
    }

    /* ---- 6. Grahas in houses ---- */
    {
      const cards = PL.map((p) => {
        const b = B[p];
        return {
          title: P(p, lang), badge: T(K.ui.inHouse, lang, { h: b.house }), planet: p,
          tone: b.natural === 'benefic' ? 'benefic' : 'malefic',
          facts: [
            [T(K.ui.fSign, lang), `${signName(b.sign, lang)} · ${b.degText}`],
            [T(K.ui.inspStar, lang), nakLabel(b.nakshatra, b.pada, lang)],
            [T(K.ui.thDignity, lang), dignityLabel(b, lang)]
          ],
          paras: [T(K.grahaBhava[p][b.house - 1], lang)].concat(dignityParas(chart, p, lang))
        };
      });
      sections.push({ id: 'graha', title: T(K.ui.tabGraha, lang), cards });
    }

    return { sections, yogas, functional: fn };
  }

  return { functionalNature, detectYogas, buildReport, strength, T, signVars, ord, housesOwned, PD };
});
