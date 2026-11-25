/*!
 * Josiyam · porutham.js
 * Thirumana Porutham: the ten South Indian marriage-matching checks, read from the bride's and
 * groom's Moon stars (and the Moon signs that follow from star and pada), plus a Chevvai dosham
 * comparison when both full charts are known. Pure functions; text in English and Tamil.
 *
 * Counting convention: from the bride's star to the groom's star, the bride's star counted as 1.
 * Tables follow common Tamil panchangam usage; Vasiyam, Rasi and Stree Deergham vary a little
 * between families and astrologers, which the page says.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JosiyamPorutham = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // gana of the 27 stars (D deva, M manushya, R rakshasa); same as JosiyamData.nakGana
  const GANA = 'DMRMDMDDRRMMDRDRDRRMMDRRMMD';
  // yoni animal and sex of the 27 stars
  const YONI = [
    ['horse', 'm'], ['elephant', 'm'], ['sheep', 'f'], ['serpent', 'm'], ['serpent', 'f'], ['dog', 'f'], ['cat', 'f'],
    ['sheep', 'm'], ['cat', 'm'], ['rat', 'm'], ['rat', 'f'], ['cow', 'm'], ['buffalo', 'f'], ['tiger', 'f'],
    ['buffalo', 'm'], ['tiger', 'm'], ['deer', 'f'], ['deer', 'm'], ['dog', 'm'], ['monkey', 'm'], ['mongoose', 'm'],
    ['monkey', 'f'], ['lion', 'f'], ['horse', 'f'], ['lion', 'm'], ['cow', 'f'], ['elephant', 'f']
  ];
  const YONI_ENEMY = [['horse', 'buffalo'], ['elephant', 'lion'], ['sheep', 'monkey'], ['serpent', 'mongoose'], ['dog', 'deer'], ['cat', 'rat'], ['cow', 'tiger']];
  // rajju: the stars zig-zag feet, waist, navel, neck, head, neck, navel, waist, feet …
  const RAJJU_OF = (i) => ['pada', 'kati', 'udara', 'kantha', 'siro', 'kantha', 'udara', 'kati', 'pada'][i % 9];
  // vedhai: stars that obstruct each other (0 = Ashwini); Mrigashirsha, Chitra and Dhanishta all three together
  const VEDHA = [[0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23], [4, 13], [4, 22], [13, 22]];
  // vasiyam: for each rasi (0 = Mesham), the rasis drawn to it
  const VASYA = { 0: [4, 7], 1: [3, 6], 2: [5], 3: [7, 8], 4: [6], 5: [1, 11], 6: [9, 5], 7: [3, 5], 8: [11], 9: [0, 10], 10: [0], 11: [9] };
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const FRIENDS = {
    Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus']
  };
  const ENEMIES = {
    Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars']
  };
  const rel = (a, b) => (FRIENDS[a].includes(b) ? 'friend' : ENEMIES[a].includes(b) ? 'enemy' : 'neutral');

  const rasiOf = (nak, pada) => Math.floor((nak * 4 + (pada - 1)) / 9);
  const count27 = (from, to) => ((to - from + 27) % 27) + 1;
  const count12 = (from, to) => ((to - from + 12) % 12) + 1;
  const isVedha = (a, b) => VEDHA.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const isYoniEnemy = (a, b) => YONI_ENEMY.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const PTS = { u: 1, m: 0.5, n: 0 };

  const ORDER = ['dina', 'gana', 'mahendra', 'stree', 'yoni', 'rasi', 'rasiLord', 'vasya', 'rajju', 'vedha'];

  /**
   * match({ bride: { nak, pada }, groom: { nak, pada } }) → { items, total, verdict, ... }
   * nak 0–26, pada 1–4. Each item: { id, grade 'u'|'m'|'n', key (reason template), vars, essential }.
   */
  function match(pair) {
    const b = pair.bride, g = pair.groom;
    const bR = rasiOf(b.nak, b.pada), gR = rasiOf(g.nak, g.pada);
    const n = count27(b.nak, g.nak);
    const r = count12(bR, gR);
    const items = [];
    const add = (id, grade, key, vars, essential) => items.push({ id, grade, key, vars: vars || {}, essential: !!essential });

    // 1 Dinam
    if (b.nak === g.nak) {
      if (b.pada === g.pada) add('dina', 'n', 'samePada', { star: b.nak });
      else add('dina', 'm', 'sameStar', { star: b.nak });
    } else {
      const rem = n % 9;
      add('dina', [2, 4, 6, 8, 0].includes(rem) ? 'u' : 'n', [2, 4, 6, 8, 0].includes(rem) ? 'u' : 'n', { n, r: rem });
    }
    // 2 Ganam
    const ga = GANA[b.nak], gg = GANA[g.nak];
    if (ga === gg) add('gana', 'u', 'u', { a: ga, b: gg });
    else if (ga !== 'R' && gg !== 'R') add('gana', 'm', 'm', { a: ga, b: gg });
    else add('gana', 'n', 'n', { a: ga, b: gg });
    // 3 Mahendram
    const mah = [4, 7, 10, 13, 16, 19, 22, 25].includes(n);
    add('mahendra', mah ? 'u' : 'n', mah ? 'u' : 'n', { n });
    // 4 Stree Deergham
    add('stree', n > 13 ? 'u' : n > 9 ? 'm' : 'n', n > 13 ? 'u' : n > 9 ? 'm' : 'n', { n });
    // 5 Yoni
    const ya = YONI[b.nak], yg = YONI[g.nak];
    if (ya[0] === yg[0]) add('yoni', 'u', 'u', { a: ya, b: yg });
    else if (isYoniEnemy(ya[0], yg[0])) add('yoni', 'n', 'n', { a: ya, b: yg });
    else add('yoni', 'm', 'm', { a: ya, b: yg });
    // 6 Rasi: the groom's rasi should be beyond the 6th from the bride's; 6/8 and 2/12 are avoided
    const la = SIGN_LORD[bR], lg = SIGN_LORD[gR];
    const lordsKind = la === lg ? 'same' : (rel(la, lg) === 'friend' && rel(lg, la) === 'friend') ? 'friends' : null;
    if (r === 1) add('rasi', 'u', 'same', { a: bR, b: gR, r });
    else if ([7, 9, 10, 11].includes(r)) add('rasi', 'u', 'u', { a: bR, b: gR, r });
    else {
      const key = r === 6 || r === 8 ? 'n68' : r === 2 || r === 12 ? 'n212' : 'n';
      add('rasi', lordsKind ? 'm' : 'n', key, { a: bR, b: gR, r, soft: lordsKind });
    }
    // 7 Rasi athipathi
    if (la === lg) add('rasiLord', 'u', 'same', { a: la, b: lg });
    else {
      const r1 = rel(la, lg), r2 = rel(lg, la);
      if (r1 === 'enemy' || r2 === 'enemy') add('rasiLord', 'n', 'n', { a: la, b: lg });
      else if (r1 === 'friend' && r2 === 'friend') add('rasiLord', 'u', 'u', { a: la, b: lg });
      else add('rasiLord', 'm', 'm', { a: la, b: lg });
    }
    // 8 Vasiyam
    const gToB = VASYA[bR].includes(gR), bToG = VASYA[gR].includes(bR);
    if (gToB || bToG) add('vasya', 'u', 'u', { a: bR, b: gR });
    else add('vasya', 'n', 'n', { a: bR, b: gR });
    // 9 Rajju (essential)
    const ra = RAJJU_OF(b.nak), rg = RAJJU_OF(g.nak);
    add('rajju', ra === rg ? 'n' : 'u', ra === rg ? 'n' : 'u', { a: ra, b: rg }, true);
    // 10 Vedhai (essential)
    const vd = b.nak !== g.nak && isVedha(b.nak, g.nak);
    add('vedha', vd ? 'n' : 'u', vd ? 'n' : 'u', { a: b.nak, b: g.nak }, true);

    const total = items.reduce((s, it) => s + PTS[it.grade], 0);
    const blocked = items.some((it) => it.essential && it.grade === 'n');
    const verdict = blocked ? 'blocked' : total >= 7 ? 'excellent' : total >= 5 ? 'good' : total >= 4 ? 'fair' : 'weak';
    return { items, total, verdict, blocked, bride: { ...b, rasi: bR }, groom: { ...g, rasi: gR }, count: n, rasiCount: r };
  }

  /** Chevvai dosham balance from two detectYogas() chevvai results (or null when only the star is known). */
  function chevvaiBalance(cb, cg) {
    if (!cb || !cg) return { kind: 'unknown' };
    const hb = cb.status === 'present' || cb.status === 'mild', hg = cg.status === 'present' || cg.status === 'mild';
    return { kind: hb && hg ? 'both' : !hb && !hg ? 'neither' : 'one', who: hb && !hg ? 'bride' : !hb && hg ? 'groom' : null, b: cb.status, g: cg.status };
  }

  /* ------------------------------------------------------------------ text */
  const TX = {
    name: {
      dina: { en: 'Dinam', ta: 'தினப் பொருத்தம்' }, gana: { en: 'Ganam', ta: 'கணப் பொருத்தம்' },
      mahendra: { en: 'Mahendram', ta: 'மகேந்திரப் பொருத்தம்' }, stree: { en: 'Stree Deergham', ta: 'ஸ்திரீ தீர்க்கம்' },
      yoni: { en: 'Yoni', ta: 'யோனிப் பொருத்தம்' }, rasi: { en: 'Rasi', ta: 'ராசிப் பொருத்தம்' },
      rasiLord: { en: 'Rasi Athipathi', ta: 'ராசி அதிபதி' }, vasya: { en: 'Vasiyam', ta: 'வசியப் பொருத்தம்' },
      rajju: { en: 'Rajju', ta: 'ரஜ்ஜுப் பொருத்தம்' }, vedha: { en: 'Vedhai', ta: 'வேதைப் பொருத்தம்' }
    },
    nameTa: {
      dina: 'தினம்', gana: 'கணம்', mahendra: 'மகேந்திரம்', stree: 'ஸ்திரீ தீர்க்கம்', yoni: 'யோனி',
      rasi: 'ராசி', rasiLord: 'ராசி அதிபதி', vasya: 'வசியம்', rajju: 'ரஜ்ஜு', vedha: 'வேதை'
    },
    about: {
      dina: { en: 'Health and day-to-day harmony', ta: 'ஆரோக்கியம், அன்றாட இணக்கம்' },
      gana: { en: 'Temperament', ta: 'குணம், மனப்போக்கு' },
      mahendra: { en: 'Children and growing prosperity', ta: 'சந்ததி, செல்வ வளர்ச்சி' },
      stree: { en: 'The bride’s wellbeing and lasting prosperity', ta: 'மணமகளின் நலம், நீடித்த மங்கலம்' },
      yoni: { en: 'Physical and intimate compatibility', ta: 'உடல், தாம்பத்திய இணக்கம்' },
      rasi: { en: 'Family harmony and the growth of the line', ta: 'குடும்ப ஒற்றுமை, வம்ச விருத்தி' },
      rasiLord: { en: 'Understanding, through friendly rasi lords', ta: 'ராசி அதிபதிகளின் நட்பு, புரிதல்' },
      vasya: { en: 'Mutual attraction and affection', ta: 'பரஸ்பர ஈர்ப்பு, அன்பு' },
      rajju: { en: 'Strength of the marriage bond (mangalyam)', ta: 'மாங்கல்ய பலம்' },
      vedha: { en: 'Freedom from obstacles and afflictions', ta: 'தடைகள், துன்பங்களிலிருந்து விடுதலை' }
    },
    grade: {
      u: { en: 'Uthamam', ta: 'உத்தமம்' }, m: { en: 'Madhyamam', ta: 'மத்திமம்' }, n: { en: 'Not matching', ta: 'பொருத்தம் இல்லை' }
    },
    gana: { D: { en: 'Deva gana', ta: 'தேவ கணம்' }, M: { en: 'Manushya gana', ta: 'மனுஷ கணம்' }, R: { en: 'Rakshasa gana', ta: 'ராட்சச கணம்' } },
    rajju: {
      siro: { en: 'Siro (head)', ta: 'சிரசு' }, kantha: { en: 'Kantha (neck)', ta: 'கண்டம்' }, udara: { en: 'Udara (navel)', ta: 'உதரம்' },
      kati: { en: 'Kati (waist)', ta: 'கடி' }, pada: { en: 'Pada (feet)', ta: 'பாதம்' }
    },
    why: {
      dina: {
        u: { en: 'The groom’s star is {n}th from the bride’s. {n} leaves {r} when divided by 9, which is favourable.', ta: 'மணமகளின் நட்சத்திரத்திலிருந்து மணமகனின் நட்சத்திரம் {n}-வது. 9-ஆல் வகுத்தால் மீதி {r} — இது சுபம்.' },
        n: { en: 'The groom’s star is {n}th from the bride’s. {n} leaves {r} when divided by 9; only 2, 4, 6, 8 or 0 are favourable.', ta: 'மணமகனின் நட்சத்திரம் {n}-வது. 9-ஆல் வகுத்தால் மீதி {r}; 2, 4, 6, 8, 0 மட்டுமே சுபம்.' },
        sameStar: { en: 'Both were born in {star}, in different padas. Many astrologers accept this.', ta: 'இருவரும் {star} நட்சத்திரம், பாதம் வேறு. பல ஜோதிடர்கள் இதை ஏற்கின்றனர்.' },
        samePada: { en: 'Both were born in {star}, in the same pada, which is avoided.', ta: 'இருவரும் {star} நட்சத்திரம், அதே பாதம் — இது தவிர்க்கப்படுகிறது.' }
      },
      gana: {
        u: { en: 'Both are {a}.', ta: 'இருவரும் {a}.' },
        m: { en: 'Bride {a}, groom {b}. Deva and Manushya together are acceptable.', ta: 'மணமகள் {a}, மணமகன் {b}. தேவ–மனுஷ கணச் சேர்க்கை ஏற்கத்தக்கது.' },
        n: { en: 'Bride {a}, groom {b}. Rakshasa gana with a different gana is traditionally avoided.', ta: 'மணமகள் {a}, மணமகன் {b}. ராட்சச கணம் வேறு கணத்துடன் சேர்வது வழக்கமாகத் தவிர்க்கப்படுகிறது.' }
      },
      mahendra: {
        u: { en: 'The groom’s star is {n}th from the bride’s, one of 4, 7, 10, 13, 16, 19, 22 and 25.', ta: 'மணமகனின் நட்சத்திரம் {n}-வது — 4, 7, 10, 13, 16, 19, 22, 25-இல் ஒன்று.' },
        n: { en: 'The groom’s star is {n}th from the bride’s. Mahendram needs 4, 7, 10, 13, 16, 19, 22 or 25.', ta: 'மணமகனின் நட்சத்திரம் {n}-வது. மகேந்திரத்திற்கு 4, 7, 10, 13, 16, 19, 22 அல்லது 25 வேண்டும்.' }
      },
      stree: {
        u: { en: 'The groom’s star is {n}th from the bride’s, more than 13 ahead.', ta: 'மணமகனின் நட்சத்திரம் {n}-வது — 13-க்கு மேல்.' },
        m: { en: 'The groom’s star is {n}th from the bride’s: more than 9 but not more than 13.', ta: 'மணமகனின் நட்சத்திரம் {n}-வது — 9-க்கு மேல், 13-க்குள்.' },
        n: { en: 'The groom’s star is only {n}th from the bride’s; more than 13 is wanted.', ta: 'மணமகனின் நட்சத்திரம் {n}-வது மட்டுமே; 13-க்கு மேல் இருக்க வேண்டும்.' }
      },
      yoni: {
        u: { en: 'Both belong to the {a} yoni.', ta: 'இருவரும் {a} யோனி.' },
        m: { en: 'Bride {a}, groom {b}: not enemies.', ta: 'மணமகள் {a}, மணமகன் {b}: பகை இல்லை.' },
        n: { en: 'Bride {a}, groom {b}: these yonis are natural enemies.', ta: 'மணமகள் {a}, மணமகன் {b}: இவை இயற்கைப் பகை யோனிகள்.' }
      },
      rasi: {
        same: { en: 'Both have the Moon in {a}.', ta: 'இருவருக்கும் சந்திரன் {a} ராசியில்.' },
        u: { en: 'The groom’s rasi, {b}, is {r}th from the bride’s rasi, {a}. That is favourable.', ta: 'மணமகனின் ராசி {b}, மணமகளின் ராசி {a}-இலிருந்து {r}-வது — சுபம்.' },
        n68: { en: '{b} is {r}th from {a}: the rasis are 6 and 8 from each other (shashtashtakam), which is avoided.', ta: '{b}, {a}-இலிருந்து {r}-வது: சஷ்டாஷ்டகம் (6/8) — தவிர்க்கப்படுகிறது.' },
        n212: { en: '{b} is {r}th from {a}: the rasis are 2 and 12 from each other (dwirdwadasam).', ta: '{b}, {a}-இலிருந்து {r}-வது: த்விர்த்வாதசம் (2/12).' },
        n: { en: '{b} is {r}th from {a}. The groom’s rasi should be beyond the 6th from the bride’s.', ta: '{b}, {a}-இலிருந்து {r}-வது. மணமகனின் ராசி மணமகளின் ராசியிலிருந்து 6-க்கு மேல் இருக்க வேண்டும்.' },
        softSame: { en: 'Both rasis have the same lord, which softens it.', ta: 'இரு ராசிகளுக்கும் அதிபதி ஒருவரே என்பதால் குறை தணிகிறது.' },
        softFriends: { en: 'The two rasi lords are friends, which softens it.', ta: 'இரு ராசி அதிபதிகளும் நண்பர்கள் என்பதால் குறை தணிகிறது.' }
      },
      rasiLord: {
        same: { en: 'Both rasis are ruled by {a}.', ta: 'இரு ராசிகளுக்கும் அதிபதி {a}.' },
        u: { en: '{a} and {b}, the two rasi lords, are natural friends.', ta: 'ராசி அதிபதிகள் {a}, {b} இயற்கை நண்பர்கள்.' },
        m: { en: '{a} and {b}, the two rasi lords, are neutral to each other.', ta: 'ராசி அதிபதிகள் {a}, {b} — சமம் (நட்பும் இல்லை, பகையும் இல்லை).' },
        n: { en: '{a} and {b}, the two rasi lords, are not friendly.', ta: 'ராசி அதிபதிகள் {a}, {b} இடையே பகை.' }
      },
      vasya: {
        u: { en: '{a} and {b} are vasya rasis: one draws the other.', ta: '{a}, {b} — வசிய ராசிகள்.' },
        n: { en: 'Neither {a} nor {b} is vasya to the other.', ta: '{a}, {b} — ஒன்றுக்கொன்று வசியம் இல்லை.' }
      },
      rajju: {
        u: { en: 'Bride in {a} rajju, groom in {b} rajju: different, so Rajju agrees.', ta: 'மணமகள் {a} ரஜ்ஜு, மணமகன் {b} ரஜ்ஜு — வேறு வேறு; பொருத்தம் உண்டு.' },
        n: { en: 'Both stars are in {a} rajju. This is Rajju dosham; traditionally the match is not made without an astrologer’s full review.', ta: 'இரு நட்சத்திரங்களும் {a} ரஜ்ஜு — ரஜ்ஜு தோஷம். முழு ஜாதக ஆய்வின்றி வழக்கமாகத் திருமணம் செய்வதில்லை.' }
      },
      vedha: {
        u: { en: '{a} and {b} do not obstruct each other.', ta: '{a}, {b} — வேதை இல்லை.' },
        n: { en: '{a} and {b} are a vedhai pair: they obstruct each other, which is avoided.', ta: '{a}, {b} — வேதை நட்சத்திரங்கள்; தவிர்க்கப்படுகிறது.' }
      }
    },
    verdict: {
      excellent: { t: { en: 'A very good match', ta: 'மிக நல்ல பொருத்தம்' }, d: { en: '{x} out of 10. Rajju and Vedhai both agree, and so do most of the other poruthams.', ta: '10-க்கு {x}. ரஜ்ஜு, வேதை இரண்டும் பொருந்துகின்றன; மற்ற பொருத்தங்களும் பெரும்பாலும் உண்டு.' } },
      good: { t: { en: 'A good match', ta: 'நல்ல பொருத்தம்' }, d: { en: '{x} out of 10. Rajju and Vedhai agree, and at least half of the ten poruthams match.', ta: '10-க்கு {x}. ரஜ்ஜு, வேதை பொருந்துகின்றன; பாதிக்கு மேற்பட்ட பொருத்தங்கள் உண்டு.' } },
      fair: { t: { en: 'An average match', ta: 'சராசரி பொருத்தம்' }, d: { en: '{x} out of 10. Rajju and Vedhai agree, but several others do not, so look at both full charts too.', ta: '10-க்கு {x}. ரஜ்ஜு, வேதை பொருந்துகின்றன; சில பொருத்தங்கள் இல்லை — இருவரின் முழு ஜாதகத்தையும் பார்க்கவும்.' } },
      weak: { t: { en: 'A weak match', ta: 'குறைந்த பொருத்தம்' }, d: { en: '{x} out of 10. Rajju and Vedhai agree, but most of the other poruthams do not.', ta: '10-க்கு {x}. ரஜ்ஜு, வேதை பொருந்தினாலும் பெரும்பாலான பொருத்தங்கள் இல்லை.' } },
      blocked: { t: { en: 'Not advised as it stands', ta: 'இப்போதைக்குப் பொருத்தம் இல்லை' }, d: { en: '{x} out of 10, but {what} does not agree. Families traditionally do not go ahead with such a match without an astrologer’s full review of both charts.', ta: '10-க்கு {x}; ஆனால் {what} பொருந்தவில்லை. இருவரின் முழு ஜாதகத்தையும் ஜோதிடர் ஆய்வு செய்யாமல் வழக்கமாக இத்தகைய திருமணத்தைத் தொடர்வதில்லை.' } }
    },
    chevvai: {
      title: { en: 'Chevvai dosham (dosha saamyam)', ta: 'செவ்வாய் தோஷம் (தோஷ சாம்யம்)' },
      status: {
        present: { en: 'Present', ta: 'உண்டு' }, mild: { en: 'Mild', ta: 'லேசானது' }, cancelled: { en: 'Cancelled', ta: 'நிவர்த்தி' }, absent: { en: 'None', ta: 'இல்லை' }
      },
      both: { en: 'Both charts have Chevvai dosham, so they balance each other (dosha saamyam).', ta: 'இருவருக்கும் செவ்வாய் தோஷம் உள்ளதால் தோஷ சாம்யம் — சமநிலை உண்டு.' },
      neither: { en: 'Neither chart has an active Chevvai dosham.', ta: 'இருவருக்கும் செயலில் உள்ள செவ்வாய் தோஷம் இல்லை.' },
      one: { en: 'Only the {who}’s chart has Chevvai dosham. Traditionally such a match is checked further for balancing factors (papa saamyam) before going ahead.', ta: '{who} ஜாதகத்தில் மட்டும் செவ்வாய் தோஷம் உள்ளது. வழக்கமாக, பாப சாம்யம் போன்ற சமன்செய்யும் அம்சங்களைப் பார்த்த பின்பே முடிவு செய்வர்.' },
      unknown: { en: 'Chevvai dosham needs both full birth charts. Enter birth details instead of only the star to see it.', ta: 'செவ்வாய் தோஷம் பார்க்க இருவரின் முழு ஜாதகமும் தேவை. நட்சத்திரம் மட்டும் அல்லாமல் பிறப்பு விவரங்களை உள்ளிடவும்.' }
    }
  };

  return { match, chevvaiBalance, rasiOf, count27, count12, RAJJU_OF, YONI, GANA, VASYA, VEDHA, SIGN_LORD, ORDER, PTS, TX };
});
