/*!
 * Josiyam · astro-engine.js
 * Thirukanitham (drik) sidereal calculations with the Lahiri (Chitrapaksha) ayanamsa.
 *
 * Planet positions come from Astronomy Engine (VSOP87 / lunar theory, ±1 arc-minute or better).
 * Everything else (ayanamsa, ascendant, nodes, nakshatra, navamsa, Vimshottari dasha,
 * panchangam, Tamil calendar, time-zone conversion) is computed here.
 *
 * Works in the browser (global `JosiyamEngine`, needs `Astronomy`) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('astronomy-engine'));
  else root.JosiyamEngine = factory(root.Astronomy);
})(typeof self !== 'undefined' ? self : this, function (A) {
  'use strict';

  /* ------------------------------------------------------------------ constants */
  const DEG = Math.PI / 180;
  const DAY_MS = 86400000;
  const YEAR_DAYS = 365.25;                 // Vimshottari year (Julian year, as in most Indian software)
  const YEAR_MS = YEAR_DAYS * DAY_MS;
  const NAK_SPAN = 360 / 27;                // 13°20'
  const PADA_SPAN = NAK_SPAN / 4;           // 3°20'
  const NAV_SPAN = 30 / 9;                  // 3°20'
  const J2000 = 2451545.0;

  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  // [sign, fromDeg, toDeg] — used where the exaltation sign does not already apply
  const MOOLA = { Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 15, 20], Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20] };
  // Naisargika (natural) relationships, BPHS
  const FRIENDS = {
    Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'], Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus']
  };
  const ENEMIES = {
    Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars']
  };
  // Combustion orbs (degrees from the Sun); [direct, retrograde]
  const COMBUST = { Moon: [12, 12], Mars: [17, 17], Mercury: [14, 12], Jupiter: [11, 11], Venus: [10, 8], Saturn: [15, 15] };
  // Special (graha) drishti in whole-sign houses counted from the planet; every graha aspects the 7th
  const ASPECTS = { Sun: [7], Moon: [7], Mars: [4, 7, 8], Mercury: [7], Jupiter: [5, 7, 9], Venus: [7], Saturn: [3, 7, 10], Rahu: [7], Ketu: [7] };

  const BODY = {
    Sun: A.Body.Sun, Moon: A.Body.Moon, Mars: A.Body.Mars, Mercury: A.Body.Mercury,
    Jupiter: A.Body.Jupiter, Venus: A.Body.Venus, Saturn: A.Body.Saturn
  };

  /* ------------------------------------------------------------------ helpers */
  const norm = (x) => ((x % 360) + 360) % 360;
  const signOf = (lon) => Math.floor(norm(lon) / 30);
  const angDiff = (a, b) => { const d = norm(a - b); return d > 180 ? d - 360 : d; }; // signed a-b in (-180,180]
  const houseFrom = (fromSign, sign) => ((sign - fromSign + 12) % 12) + 1;

  function dms(deg) {
    let d = Math.floor(deg), mFloat = (deg - d) * 60, m = Math.floor(mFloat), s = Math.round((mFloat - m) * 60);
    if (s === 60) { s = 0; m += 1; }
    if (m === 60) { m = 0; d += 1; }
    return { d, m, s };
  }
  function fmtDms(deg) {
    const x = dms(deg);
    return `${String(x.d).padStart(2, '0')}° ${String(x.m).padStart(2, '0')}' ${String(x.s).padStart(2, '0')}"`;
  }

  const jdFromMs = (ms) => ms / DAY_MS + 2440587.5;

  /* ------------------------------------------------------------------ ayanamsa */
  // IAU 2006 general precession in longitude (arc-seconds), T in Julian centuries TT from J2000
  function precessionArcsec(T) {
    return 5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T ** 3 - 0.000023857 * T ** 4 - 0.0000000383 * T ** 5;
  }
  // Lahiri (Indian Calendar Reform Committee 1955), defined as in the Swiss Ephemeris:
  // 23°15'00.658" on 1956 Sep 22 (JD 2435553.5), carried by precession. Mean value (no nutation).
  const LAHIRI_T0 = (2435553.5 - J2000) / 36525;
  const LAHIRI_A0 = 23.250182778 - 0.004658035;
  const AYAN_J2000 = LAHIRI_A0 - precessionArcsec(LAHIRI_T0) / 3600; // ≈ 23.857°
  function ayanamsa(T) { return AYAN_J2000 + precessionArcsec(T) / 3600; }

  /* ------------------------------------------------------------------ positions */
  const ROT_EQJ_ECL = A.Rotation_EQJ_ECL();

  // Geocentric apparent ecliptic longitude on the J2000 ecliptic.
  function lonJ2000(name, time) {
    const vec = A.GeoVector(BODY[name], time, true);
    const ecl = A.RotateVector(ROT_EQJ_ECL, vec);
    return A.SphereFromVector(ecl).lon;
  }
  function latJ2000(name, time) {
    const vec = A.GeoVector(BODY[name], time, true);
    return A.SphereFromVector(A.RotateVector(ROT_EQJ_ECL, vec)).lat;
  }
  // Sidereal longitude. λ(date) − ayanamsa(date) = λ(J2000) + p(T) − (AYAN_J2000 + p(T)) = λ(J2000) − AYAN_J2000
  function siderealBody(name, time) { return norm(lonJ2000(name, time) - AYAN_J2000); }

  // Lunar node, mean equinox of date (Meeus, Astronomical Algorithms ch. 47)
  function meanNode(T) {
    return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000);
  }
  // True (osculating) node: from the Moon's geocentric position × velocity on the ecliptic of date,
  // returned on the mean equinox of date (nutation removed) so it pairs with the mean ayanamsa.
  function trueNode(time) {
    const T = time.tt / 36525;
    const st = A.GeoMoonState(time);
    const R = A.Rotation_EQJ_ECT(time);
    const r = A.RotateVector(R, new A.Vector(st.x, st.y, st.z, time));
    const v = A.RotateVector(R, new A.Vector(st.vx, st.vy, st.vz, time));
    const hx = r.y * v.z - r.z * v.y, hy = r.z * v.x - r.x * v.z;
    const nodeTrueEquinox = Math.atan2(hx, -hy) / DEG;
    // nutation in longitude: the J2000 equinox seen on the true ecliptic of date, less precession
    const x = A.RotateVector(R, new A.Vector(1, 0, 0, time));
    const dpsi = angDiff(Math.atan2(x.y, x.x) / DEG, precessionArcsec(T) / 3600);
    return norm(nodeTrueEquinox - dpsi);
  }

  // Tropical ascendant on the mean equinox of date
  function ascendantTropical(jdUT, T, lat, lon) {
    const du = jdUT - J2000, Tu = du / 36525;
    const gmst = 280.46061837 + 360.98564736629 * du + 0.000387933 * Tu * Tu - Tu ** 3 / 38710000;
    const ramc = norm(gmst + lon) * DEG;
    const eps = ((84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.00200340 * T ** 3) / 3600) * DEG;
    const phi = Math.max(-89.9, Math.min(89.9, lat)) * DEG;
    return norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / DEG);
  }

  function siderealAll(utcMs, lat, lon, nodeType) {
    const time = A.MakeTime(new Date(utcMs));
    const T = time.tt / 36525;
    const ayan = ayanamsa(T);
    const out = {};
    for (const p of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) out[p] = siderealBody(p, time);
    const node = nodeType === 'true' ? trueNode(time) : meanNode(T);
    out.Rahu = norm(node - ayan);
    out.Ketu = norm(out.Rahu + 180);
    out.Lagna = norm(ascendantTropical(time.ut + J2000, T, lat, lon) - ayan);
    return { lons: out, ayanamsa: ayan, time };
  }

  // Sidereal longitude of one body (planets or nodes) at a UTC instant — used for transit scans
  function bodyLon(name, ms, nodeType) {
    const time = A.MakeTime(new Date(ms));
    if (name === 'Rahu' || name === 'Ketu') {
      const T = time.tt / 36525;
      const r = norm((nodeType === 'true' ? trueNode(time) : meanNode(T)) - ayanamsa(T));
      return name === 'Ketu' ? norm(r + 180) : r;
    }
    return siderealBody(name, time);
  }

  /* ------------------------------------------------------------------ derived facts */
  function nakshatraOf(lon) {
    const L = norm(lon);
    const idx = Math.floor(L / NAK_SPAN);
    const pada = Math.floor((L - idx * NAK_SPAN) / PADA_SPAN) + 1;
    return { index: idx, pada, lord: DASHA_ORDER[idx % 9], fraction: (L - idx * NAK_SPAN) / NAK_SPAN };
  }
  const navamsaSign = (lon) => Math.floor(norm(lon) / NAV_SPAN) % 12;

  function dignity(planet, sign) {
    if (!(planet in EXALT)) return null;
    if (sign === EXALT[planet]) return 'exalted';
    if (sign === (EXALT[planet] + 6) % 12) return 'debilitated';
    return relationTo(planet, sign);
  }
  // Same as dignity() but with the moolatrikona degree ranges (used in the planet table)
  function dignityDetailed(planet, sign, degInSign) {
    const d = dignity(planet, sign);
    if (!d || d === 'exalted' || d === 'debilitated') return d;
    const m = MOOLA[planet];
    if (m[0] === sign && degInSign >= m[1] && degInSign < m[2]) return 'moolatrikona';
    return d;
  }
  function relationTo(planet, sign) {
    if (OWN[planet].includes(sign)) return 'own';
    const lord = SIGN_LORD[sign];
    if (lord === planet) return 'own';
    if (FRIENDS[planet].includes(lord)) return 'friend';
    if (ENEMIES[planet].includes(lord)) return 'enemy';
    return 'neutral';
  }
  function naturalRelation(a, b) {
    if (!FRIENDS[a]) return 'neutral';
    if (FRIENDS[a].includes(b)) return 'friend';
    if (ENEMIES[a].includes(b)) return 'enemy';
    return 'neutral';
  }

  /* ------------------------------------------------------------------ chart */
  /**
   * @param {object} o  { utcMs, lat, lon, nodeType: 'mean'|'true', offsetMs (display only) }
   */
  function computeChart(o) {
    const { utcMs, lat, lon } = o;
    const nodeType = o.nodeType === 'true' ? 'true' : 'mean';
    const now = siderealAll(utcMs, lat, lon, nodeType);
    const before = siderealAll(utcMs - 6 * 3600000, lat, lon, nodeType);
    const after = siderealAll(utcMs + 6 * 3600000, lat, lon, nodeType);
    const L = now.lons;
    const lagnaSign = signOf(L.Lagna);
    const moonSign = signOf(L.Moon);
    const sunLon = L.Sun;

    const bodies = {};
    for (const name of ['Lagna'].concat(PLANETS)) {
      const lonV = L[name];
      const sign = signOf(lonV);
      const deg = lonV - sign * 30;
      const nk = nakshatraOf(lonV);
      const speed = angDiff(after.lons[name], before.lons[name]) / 0.5; // degrees per day
      const isNode = name === 'Rahu' || name === 'Ketu';
      const retro = name === 'Lagna' ? false : (isNode ? true : (name !== 'Sun' && name !== 'Moon' && speed < 0));
      let combust = false;
      if (COMBUST[name]) {
        const orb = COMBUST[name][retro ? 1 : 0];
        combust = Math.abs(angDiff(lonV, sunLon)) <= orb;
      }
      const d9 = navamsaSign(lonV);
      bodies[name] = {
        name, lon: lonV, sign, deg, degText: fmtDms(deg), lonText: fmtDms(lonV),
        nakshatra: nk.index, pada: nk.pada, nakLord: nk.lord, nakFraction: nk.fraction,
        navamsa: d9, vargottama: d9 === sign,
        house: houseFrom(lagnaSign, sign),
        houseFromMoon: houseFrom(moonSign, sign),
        speed, retro, combust,
        dignity: name === 'Lagna' ? null : dignityDetailed(name, sign, deg),
        dignitySimple: name === 'Lagna' ? null : dignity(name, sign),
        navamsaDignity: name === 'Lagna' ? null : dignity(name, d9),
        signLord: SIGN_LORD[sign]
      };
    }
    const moonPhase = norm(L.Moon - L.Sun);
    const waxing = moonPhase < 180;
    for (const p of PLANETS) {
      const natural = ['Jupiter', 'Venus', 'Mercury'].includes(p) || (p === 'Moon' && waxing) ? 'benefic' : 'malefic';
      bodies[p].natural = natural;
    }

    // whole-sign houses: occupants per sign (D1 and D9)
    const occupants = Array.from({ length: 12 }, () => []);
    const occupantsD9 = Array.from({ length: 12 }, () => []);
    for (const name of ['Lagna'].concat(PLANETS)) {
      occupants[bodies[name].sign].push(name);
      occupantsD9[bodies[name].navamsa].push(name);
    }
    // aspects: which signs each graha casts drishti on
    const aspects = {};
    for (const p of PLANETS) aspects[p] = ASPECTS[p].map((h) => (bodies[p].sign + h - 1) % 12);

    const chart = {
      input: o, nodeType,
      utcMs, lat, lon,
      ayanamsa: now.ayanamsa, ayanamsaText: fmtDms(now.ayanamsa),
      bodies, lagnaSign, moonSign, navamsaLagna: bodies.Lagna.navamsa,
      occupants, occupantsD9, aspects, waxing, moonPhase,
      janmaNakshatra: bodies.Moon.nakshatra, janmaPada: bodies.Moon.pada
    };
    chart.dasha = vimshottari(L.Moon, utcMs);
    chart.panchang = panchang(chart, o.offsetMs || 0);
    return chart;
  }

  /* ------------------------------------------------------------------ Vimshottari */
  function subPeriods(lord, start, durMs) {
    const i0 = DASHA_ORDER.indexOf(lord);
    const out = [];
    let t = start;
    for (let j = 0; j < 9; j++) {
      const L = DASHA_ORDER[(i0 + j) % 9];
      const d = durMs * DASHA_YEARS[L] / 120;
      out.push({ lord: L, start: t, end: t + d });
      t += d;
    }
    return out;
  }
  function vimshottari(moonLon, birthMs) {
    const nk = nakshatraOf(moonLon);
    const i0 = nk.index % 9;
    const first = DASHA_ORDER[i0];
    const elapsedYears = nk.fraction * DASHA_YEARS[first];
    const balanceYears = DASHA_YEARS[first] - elapsedYears;
    let t = birthMs - elapsedYears * YEAR_MS;
    const mahas = [];
    for (let i = 0; i < 10; i++) {           // 10 periods cover the full 120 years from birth
      const L = DASHA_ORDER[(i0 + i) % 9];
      const dur = DASHA_YEARS[L] * YEAR_MS;
      mahas.push({ lord: L, start: t, end: t + dur, bhuktis: subPeriods(L, t, dur) });
      t += dur;
    }
    return { firstLord: first, balanceYears, balance: ymd(balanceYears), mahas, birthMs, endMs: birthMs + 120 * YEAR_MS };
  }
  function ymd(years) {
    const y = Math.floor(years);
    const mF = (years - y) * 12, m = Math.floor(mF);
    const d = Math.floor((mF - m) * (YEAR_DAYS / 12) + 1e-9);
    return { y, m, d };
  }
  function currentPeriod(dasha, atMs) {
    const md = dasha.mahas.find((x) => atMs >= x.start && atMs < x.end);
    if (!md) return null;
    const bd = md.bhuktis.find((x) => atMs >= x.start && atMs < x.end);
    const pd = subPeriods(bd.lord, bd.start, bd.end - bd.start).find((x) => atMs >= x.start && atMs < x.end);
    const bi = md.bhuktis.indexOf(bd);
    const next = bi < 8 ? md.bhuktis[bi + 1] : (dasha.mahas[dasha.mahas.indexOf(md) + 1] || {}).bhuktis?.[0];
    return { maha: md, bhukti: bd, antara: pd, nextBhukti: next || null };
  }

  /* ------------------------------------------------------------------ panchangam */
  function sunEvent(direction, startMs, lat, lon) {
    try {
      const obs = new A.Observer(lat, lon, 0);
      const t = A.SearchRiseSet(A.Body.Sun, obs, direction, new Date(startMs), 1.2);
      return t ? t.date.getTime() : null;
    } catch (e) { return null; }
  }
  // local civil date parts for a UTC instant at a fixed offset
  function civil(ms, offsetMs) {
    const d = new Date(ms + offsetMs);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), dayStartUtc: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - offsetMs };
  }
  const sunSidAt = (ms) => siderealBody('Sun', A.MakeTime(new Date(ms)));

  // moment the Sun's sidereal longitude reaches `target` (degrees), searched in [lo, hi]
  function solveSunCrossing(target, lo, hi) {
    const f = (ms) => angDiff(sunSidAt(ms), target);
    let a = lo, b = hi, fa = f(a);
    if (fa > 0) return null;
    for (let i = 0; i < 44; i++) {
      const m = (a + b) / 2, fm = f(m);
      if (fm > 0) b = m; else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }
  // Tamil month start (day 1) for solar month `sign` near `aroundMs` → civil day start (UTC ms) of day 1
  function tamilMonthDay1(sign, aroundMs, lat, lon, offsetMs) {
    const target = sign * 30;
    const s = sunSidAt(aroundMs);
    const ahead = angDiff(target, s);              // degrees until target (negative: already past)
    const guess = aroundMs + ahead / 0.9856 * DAY_MS;
    const t = solveSunCrossing(target, guess - 3 * DAY_MS, guess + 3 * DAY_MS);
    if (t == null) return null;
    const c = civil(t, offsetMs);
    const sunset = sunEvent(-1, c.dayStartUtc, lat, lon);
    // Tamil rule: sankranti before sunset → that day is day 1, otherwise the next day
    const day1 = (sunset != null && t < sunset) ? c.dayStartUtc : c.dayStartUtc + DAY_MS;
    return { day1, sankranti: t };
  }

  function panchang(chart, offsetMs) {
    const { utcMs, lat, lon } = chart;
    const B = chart.bodies;
    const elong = norm(B.Moon.lon - B.Sun.lon);
    const tithi = Math.floor(elong / 12);                       // 0..29
    const yoga = Math.floor(norm(B.Sun.lon + B.Moon.lon) / NAK_SPAN);
    const k = Math.floor(elong / 6);                            // 0..59
    let karana;
    if (k === 0) karana = 10;                                   // Kimstughna
    else if (k >= 57) karana = 7 + (k - 57);                    // Shakuni, Chatushpada, Naga
    else karana = (k - 1) % 7;                                  // Bava … Vishti

    // Vedic day runs sunrise to sunrise
    const c = civil(utcMs, offsetMs);
    let sunrise = sunEvent(+1, c.dayStartUtc, lat, lon);
    let hinduDayStart = c.dayStartUtc;
    let weekday = c.wd;
    if (sunrise != null && utcMs < sunrise) {
      hinduDayStart -= DAY_MS;
      weekday = (weekday + 6) % 7;
      sunrise = sunEvent(+1, hinduDayStart, lat, lon);
    }
    const sunset = sunEvent(-1, hinduDayStart, lat, lon);
    let nazhigai = null;
    if (sunrise != null) {
      const mins = (utcMs - sunrise) / 60000;
      const n = Math.floor(mins / 24);
      const v = Math.floor((mins - n * 24) * 2.5);
      nazhigai = { n, v };
    }

    // Tamil solar month & date (by Hindu day)
    let tamil = null;
    try {
      const sunSign = B.Sun.sign;
      let best = null;
      for (const s of [(sunSign + 11) % 12, sunSign, (sunSign + 1) % 12]) {
        const r = tamilMonthDay1(s, utcMs, lat, lon, offsetMs);
        if (r && r.day1 <= hinduDayStart + 1000 && (!best || r.day1 > best.day1)) best = { sign: s, ...r };
      }
      if (best) {
        const day = Math.round((hinduDayStart - best.day1) / DAY_MS) + 1;
        const month = best.sign;                                // 0 = Chithirai (Sun in Mesham)
        const hc = civil(hinduDayStart + 12 * 3600000, offsetMs);
        const yearStart = (hc.m <= 3 && month >= 8) ? hc.y - 1 : hc.y;
        const yearIndex = ((yearStart - 1987) % 60 + 60) % 60;  // 1987-88 = Prabhava
        tamil = { month, day, yearIndex };
      }
    } catch (e) { tamil = null; }

    return {
      tithi, paksha: tithi < 15 ? 'shukla' : 'krishna', tithiFraction: (elong % 12) / 12,
      yoga, karana, weekday, sunrise, sunset, nazhigai, tamil,
      nakshatra: B.Moon.nakshatra, pada: B.Moon.pada
    };
  }

  /* ------------------------------------------------------------------ transits (gochara) */
  function transitNow(atMs, nodeType) {
    const r = siderealAll(atMs, 0, 0, nodeType || 'mean');
    return r.lons;
  }
  // next time a planet leaves its present sign (accounting for retrograde loops), up to maxDays ahead
  function nextIngress(name, fromMs, maxDays) {
    const lonAt = (ms) => {
      if (name === 'Rahu' || name === 'Ketu') return transitNow(ms).Rahu + (name === 'Ketu' ? 180 : 0);
      return siderealBody(name, A.MakeTime(new Date(ms)));
    };
    const s0 = signOf(lonAt(fromMs));
    const step = 4 * DAY_MS;
    let prev = fromMs;
    for (let t = fromMs + step; t <= fromMs + maxDays * DAY_MS; t += step) {
      const s = signOf(lonAt(t));
      if (s !== s0) {
        let a = prev, b = t;
        for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (signOf(lonAt(m)) === s0) a = m; else b = m; }
        return { atMs: b, toSign: signOf(lonAt(b + 3600000)) };
      }
      prev = t;
    }
    return null;
  }
  function prevIngress(name, fromMs, maxDays) {
    const lonAt = (ms) => siderealBody(name, A.MakeTime(new Date(ms)));
    const s0 = signOf(lonAt(fromMs));
    const step = 4 * DAY_MS;
    let prev = fromMs;
    for (let t = fromMs - step; t >= fromMs - maxDays * DAY_MS; t -= step) {
      if (signOf(lonAt(t)) !== s0) {
        let a = t, b = prev;
        for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (signOf(lonAt(m)) === s0) b = m; else a = m; }
        return { atMs: b };
      }
      prev = t;
    }
    return null;
  }

  /* ------------------------------------------------------------------ time zones */
  const _dtfCache = {};
  function tzOffsetMs(utcMs, tz) {
    let dtf = _dtfCache[tz];
    if (!dtf) {
      dtf = _dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', era: 'short', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric'
      });
    }
    const whole = Math.floor(utcMs / 1000) * 1000;
    const p = {};
    for (const x of dtf.formatToParts(new Date(whole))) p[x.type] = x.value;
    let y = parseInt(p.year, 10);
    if (p.era && /^B/i.test(p.era)) y = 1 - y;
    const d = new Date(0);
    d.setUTCFullYear(y, parseInt(p.month, 10) - 1, parseInt(p.day, 10));
    d.setUTCHours(parseInt(p.hour, 10) % 24, parseInt(p.minute, 10), parseInt(p.second, 10), 0);
    return d.getTime() - whole;
  }
  function isValidTz(tz) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; }
  }
  /**
   * Convert a local civil birth time to UTC.
   * @param {object} p { y, m (1-12), d, hh, mm, tz?: IANA name, offsetMinutes?: number }
   */
  function localToUtc(p) {
    const local = new Date(0);
    local.setUTCFullYear(p.y, p.m - 1, p.d);
    local.setUTCHours(p.hh, p.mm, 0, 0);
    const L = local.getTime();
    if (p.tz && isValidTz(p.tz)) {
      let off = tzOffsetMs(L, p.tz);
      let utc = L - off;
      const off2 = tzOffsetMs(utc, p.tz);
      if (off2 !== off) { utc = L - off2; off = off2; }
      return { utcMs: utc, offsetMs: L - utc, tz: p.tz };
    }
    const offMs = Math.round((p.offsetMinutes || 0) * 60000);
    return { utcMs: L - offMs, offsetMs: offMs, tz: null };
  }

  /* ------------------------------------------------------------------ exports */
  return {
    PLANETS, SIGN_LORD, DASHA_ORDER, DASHA_YEARS, EXALT, OWN, FRIENDS, ENEMIES, ASPECTS, YEAR_MS, DAY_MS,
    norm, signOf, angDiff, houseFrom, dms, fmtDms, jdFromMs,
    ayanamsa, AYAN_J2000, meanNode, trueNode,
    nakshatraOf, navamsaSign, dignity, dignityDetailed, relationTo, naturalRelation,
    computeChart, siderealAll, vimshottari, currentPeriod, subPeriods, ymd,
    transitNow, nextIngress, prevIngress, bodyLon,
    tzOffsetMs, localToUtc, isValidTz, latJ2000
  };
});
