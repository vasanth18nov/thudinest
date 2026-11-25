/* Fraction Workshop · thudinest.com/fractions
   Plain JS, no libraries. Every picture is built from the same few helpers
   (bars, pies, number line, area model) so the lessons, the calculator and
   the practice questions all look and explain things the same way. */
(() => {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[R(0, arr.length - 1)];

  /* ================= maths ================= */
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const reduce = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const commonFactors = (a, b) => { const out = []; for (let f = 2; f <= Math.min(a, b); f++) if (a % f === 0 && b % f === 0) out.push(f); return out; };

  /* ================= words ================= */
  const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
  const TENS = ',,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety'.split(',');
  const ORD = { 1: 'whole', 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth', 15: 'fifteenth', 16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth', 19: 'nineteenth' };
  const ORD_ONES = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
  function numWord(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numWord(n % 100) : '');
    return String(n);
  }
  function ordWord(d) {
    if (ORD[d]) return ORD[d];
    if (d < 100) { const t = Math.floor(d / 10), o = d % 10; return o ? TENS[t] + '-' + ORD_ONES[o] : TENS[t].replace(/y$/, 'ieth'); }
    if (d === 100) return 'hundredth';
    return null;
  }
  const plural = (w) => (w === 'half' ? 'halves' : w + 's');
  const pieceName = (d) => { const o = ordWord(d); return o ? plural(o) : `pieces of 1/${d}`; };
  function fracWords(n, d) {
    const o = ordWord(d);
    if (!o) return `${n} over ${d}`;
    if (d === 1) return n === 1 ? 'one whole' : `${numWord(n)} wholes`;
    return `${numWord(n)} ${n === 1 ? o : plural(o)}`;
  }

  /* ================= how numbers look ================= */
  const fr = (n, d, cls) => `<span class="fr${cls ? ' ' + cls : ''}"><span class="fr-n">${n}</span><span class="fr-d">${d}</span></span>`;
  const mx = (w, n, d, cls) => `<span class="mx${cls ? ' ' + cls : ''}"><span class="wn">${w}</span>${fr(n, d)}</span>`;
  const wn = (n, cls) => `<span class="wn${cls ? ' ' + cls : ''}">${n}</span>`;
  /* best way to show n/d as written (mixed if improper, whole if d = 1) */
  function nice(n, d, cls) {
    const neg = n < 0; n = Math.abs(n);
    const sign = neg ? '<span class="op">−</span>' : '';
    if (d === 1) return sign + wn(n, cls);
    if (n > d) { const q = Math.floor(n / d), r = n % d; return sign + (r ? mx(q, r, d, cls) : wn(q, cls)); }
    if (n === d) return sign + wn(1, cls);
    return sign + fr(n, d, cls);
  }
  /* an operand as the user typed it: {w, n, d} */
  function opnd(X, cls) {
    if (X.w && X.n === 0) return wn(X.w, cls);
    if (X.w) return mx(X.w, X.n, X.d, cls);
    return fr(X.n, X.d, cls);
  }
  const frA = (n, d) => fr(n, d, 'tone-a');
  const frB = (n, d) => fr(n, d, 'tone-b');
  const OPS = { '+': '+', '−': '−', '×': '×', '÷': '÷' };
  function decimalText(n, d) {
    let x = d;
    while (x % 2 === 0) x /= 2;
    while (x % 5 === 0) x /= 5;
    const v = n / d;
    const exact = x === 1;
    const s = exact ? String(+v.toFixed(6)) : v.toFixed(3);
    const pctExact = (n * 1000) % d === 0;
    return { s: (exact ? '' : '≈ ') + s, pct: (pctExact ? '' : '≈ ') + (+((n * 100) / d).toFixed(1)) + '%' };
  }

  /* ================= pictures ================= */
  const A_C = 'var(--a)', B_C = 'var(--b)', ANS_C = 'var(--ans)';
  /* one row of bars: n shaded pieces of d per whole, drawn over W whole bars */
  function bars(n, d, o = {}) {
    const need = Math.max(1, Math.ceil(n / d));
    const W = Math.max(o.W || 1, need);
    let h = `<div class="bars${o.size ? ' ' + o.size : ''}${o.anim === false || RM ? '' : ' anim'}" style="--W:${W}">`;
    for (let w = 0; w < W; w++) {
      if (w >= need && !o.fillEmpty) { h += '<span></span>'; continue; }
      h += '<div class="strip">';
      for (let i = 0; i < d; i++) {
        const g = w * d + i;
        const on = g < n;
        const c = o.colorAt ? o.colorAt(g) : (o.c || A_C);
        const cls = ['pc'];
        if (on) cls.push('on');
        if (on && o.crossFrom != null && g >= o.crossFrom) cls.push('x');
        if (o.minor && i % o.minor !== 0) cls.push('mn');
        h += `<span class="${cls.join(' ')}" style="--c:${c};--i:${g}"${o.clickable ? ` data-i="${g}"` : ''}></span>`;
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function wedgePath(i, d, r = 46, cx = 50, cy = 50) {
    const a0 = (i / d) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / d) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return `M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
  }
  /* one pie: `on` of d slices shaded; offset numbers the slices for clicking */
  function pie(on, d, o = {}) {
    const c = o.c || A_C;
    let s = `<svg class="pie" viewBox="-2 -2 104 104" ${o.label ? `role="img" aria-label="${o.label}"` : 'aria-hidden="true"'}>`;
    if (d === 1) s += `<circle cx="50" cy="50" r="46" class="wd${on >= 1 ? ' on' : ''}" style="--c:${c}"${o.clickable ? ` data-i="${o.offset || 0}"` : ''}/>`;
    else for (let i = 0; i < d; i++) s += `<path d="${wedgePath(i, d)}" class="wd${i < on ? ' on' : ''}" style="--c:${c}"${o.clickable ? ` data-i="${(o.offset || 0) + i}"` : ''}/>`;
    return s + '<circle cx="50" cy="50" r="46" class="pie-rim"/></svg>';
  }
  function pies(n, d, o = {}) {
    const count = Math.max(1, Math.ceil(n / d));
    let h = `<div class="pies${o.size ? ' ' + o.size : ''}">`;
    for (let k = 0; k < count; k++) h += pie(clamp(n - k * d, 0, d), d, { ...o, offset: k * d });
    return h + '</div>';
  }
  const drawable = (per, wholes) => per <= 36 && wholes <= 4;
  const vrow = (label, inner) => `<div class="vrow"><div class="vlab">${label}</div><div class="vbody">${inner}</div></div>`;

  /* area model for a/b × c/d: rows show a/b, columns show c/d */
  function areaModel(an, ad, bn, bd) {
    const S = 240, cw = S / bd, rh = S / ad;
    let s = `<svg class="area${RM ? '' : ' area-anim'}" viewBox="-3 -3 ${S + 6} ${S + 6}" role="img" aria-label="A square cut into ${ad} rows and ${bd} columns. ${an * bn} of the ${ad * bd} boxes are shaded both ways.">`;
    for (let r = 0; r < ad; r++) for (let c = 0; c < bd; c++) {
      const inA = r < an, inB = c < bn;
      const cls = inA && inB ? 'ov' : inA ? 'ra' : inB ? 'cb' : 'e';
      s += `<rect class="${cls}" x="${(c * cw).toFixed(2)}" y="${(r * rh).toFixed(2)}" width="${cw.toFixed(2)}" height="${rh.toFixed(2)}"/>`;
    }
    return s + `<rect class="frame" x="0" y="0" width="${S}" height="${S}" rx="3"/></svg>`;
  }

  /* how many b's fit into a: one long strip with brackets underneath */
  function fitVis(an, ad, bn, bd) {
    if (!an || !bn) return '';
    const D = lcm(ad, bd), p = (an * D) / ad, q = (bn * D) / bd;
    const W = Math.max(1, Math.ceil(p / D)), T = W * D;
    const full = Math.floor(p / q), rem = p % q;
    if (D > 36 || T > 60 || full > 30) return '';
    let strip = `<div class="strip${RM ? '' : ' anim'}" style="--h:46px">`;
    for (let i = 0; i < T; i++) {
      const cls = ['pc'];
      if (i < p) cls.push('on');
      if (i && i % D === 0) cls.push('we');
      strip += `<span class="${cls.join(' ')}" style="--c:${A_C};--i:${i}"></span>`;
    }
    strip += '</div>';
    const showEvery = full > 12 ? Math.ceil(full / 8) : 1;
    let row = '<div class="fit-row">';
    for (let g = 0; g < full; g++) {
      const lab = (g + 1) % showEvery === 0 || g === full - 1 ? String(g + 1) : '';
      row += `<span class="fit-g" style="flex:${q} 1 0"><span>${lab}</span></span>`;
    }
    if (rem) row += `<span class="fit-g part" style="flex:${rem} 1 0"><span>${fr(rem, q)}</span></span>`;
    if (T - p) row += `<span class="fit-sp" style="flex:${T - p} 1 0"></span>`;
    row += '</div>';
    const [rn, rd] = reduce(p, q);
    let cap;
    if (full === 0) cap = `Not even one whole ${frB(bn, bd)} fits. Only ${fr(rem, q)} of one fits, so the answer is ${nice(rn, rd)}.`;
    else cap = `${full} whole ${full === 1 ? 'one fits' : 'ones fit'}${rem ? `, plus ${fr(rem, q)} of another` : ''}. So the answer is <b>${nice(rn, rd)}</b>.`;
    const note = D !== ad || D !== bd ? `<p class="vis-cap">Both cut into ${pieceName(D)} so you can see them side by side: ${frA(an, ad)} is ${p} ${p === 1 ? ordWord(D) || 'piece' : pieceName(D)}, and each ${frB(bn, bd)} is ${q}.</p>` : '';
    return `<div class="fit">${strip}${row}</div>${note}<p class="vis-cap" style="color:var(--ink)">${cap}</p>`;
  }

  /* Keep, change, flip card */
  function kcf(an, ad, bn, bd) {
    return `<div class="kcf">
      <div class="kcf-col"><span class="kcf-k">Keep</span><div class="kcf-v">${frA(an, ad)}</div></div>
      <div class="kcf-col"><span class="kcf-k">Change</span><div class="kcf-v kcf-op"><span class="o1">÷</span><span class="o2">×</span></div></div>
      <div class="kcf-col"><span class="kcf-k">Flip</span><div class="kcf-v kcf-flip"><div class="flip-in"><div class="face f1">${fr(bn, bd)}</div><div class="face f2">${fr(bd, bn)}</div></div></div></div>
    </div>`;
  }
  /* start the flip when a card comes into view */
  const flipIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { flipIO.unobserve(e.target); setTimeout(() => e.target.classList.add('go'), RM ? 0 : 250); } });
  }, { threshold: 0.6 }) : null;
  function arm(root) {
    $$('.kcf:not(.go)', root).forEach((el) => { if (flipIO) flipIO.observe(el); else el.classList.add('go'); });
  }

  function multiples(ad, bd, L) {
    const row = (d) => {
      const n = L / d;
      let items = [];
      if (n <= 10) for (let k = 1; k <= n; k++) items.push(d * k);
      else items = [d, d * 2, d * 3, '…', L];
      return `<div class="mult"><span class="mult-k">Counting in ${d}s</span>${items.map((m) => `<span class="m${m === L ? ' hit' : ''}">${m}</span>`).join('')}</div>`;
    };
    return `<div class="mults">${row(ad)}${row(bd)}</div>`;
  }

  /* the green “answer” block used at the end of every worked solution */
  function answerBlock(n, d) {
    const [sn, sd] = reduce(n, d);
    const imp = Math.abs(sn) > sd && sd !== 1;
    let h = `<div class="ans-line"><span class="ans-k">Answer</span>${nice(sn, sd, 'tone-ans')}${imp ? `<span class="muted">or ${fr(sn, sd)}</span>` : ''}</div>`;
    if (sn > 0 && drawable(sd, Math.ceil(sn / sd))) h += sd <= 12 && Math.ceil(sn / sd) <= 3 ? pies(sn, sd, { c: ANS_C, size: 'sm' }) : bars(sn, sd, { c: ANS_C, size: 'sm' });
    return h;
  }

  /* ================= the solver: a worked solution, step by step ================= */
  function tidyStep(n, d) {
    const neg = n < 0, an = Math.abs(n);
    const parts = [];
    if (an === 0) {
      parts.push('<p>Nothing is left over, so the answer is <b>0</b>.</p>');
    } else {
      const g = gcd(an, d), sn = an / g, sd = d / g;
      if (g > 1) parts.push(`<p><b>Simplify.</b> ${an} and ${d} can both be divided by <b>${g}</b>.</p><p class="eqn">${fr(an, d)} = ${fr(`${an} ÷ ${g}`, `${d} ÷ ${g}`)} = ${fr(sn, sd)}</p>`);
      if (sd === 1) parts.push(`<p>${fr(sn, 1)} means ${sn} whole${sn === 1 ? '' : 's'}, so the answer is the whole number <b>${sn}</b>.</p>`);
      else if (sn > sd) {
        const q = Math.floor(sn / sd), r = sn % sd;
        parts.push(`<p><b>More than one whole.</b> ${sn} ÷ ${sd} = ${q} remainder ${r}, so ${fr(sn, sd)} = ${mx(q, r, sd)}.</p>`);
      } else if (g === 1) parts.push(`<p>${fr(an, d)} is already as simple as it gets: ${an} and ${d} have no common factor except 1.</p>`);
      if (neg) parts.push('<p>The answer is below zero, so it gets a minus sign.</p>');
    }
    return { t: 'Tidy up the answer', h: parts.join(''), v: answerBlock(n, d), final: true };
  }

  const toImproper = (X) => (X.w && X.n === 0 ? [X.w, 1] : [X.w * X.d + X.n, X.d]);
  function convLine(X, n, d, tone) {
    if (X.n === 0) return `<p class="eqn">${wn(X.w, tone)} = ${fr(X.w, 1, tone)} <span class="muted">a whole number is itself over 1</span></p>`;
    return `<p class="eqn">${mx(X.w, X.n, X.d, tone)} = ${fr(`${X.w} × ${X.d} + ${X.n}`, X.d)} = ${fr(n, d, tone)}</p>`;
  }
  function twoBars(an, ad, bn, bd, o = {}) {
    const W = Math.max(1, Math.ceil(an / ad), Math.ceil(bn / bd));
    if (!drawable(Math.max(ad, bd), W)) return '';
    return vrow(frA(an, ad), bars(an, ad, { W, c: A_C, minor: o.minorA })) + vrow(frB(bn, bd), bars(bn, bd, { W, c: B_C, minor: o.minorB }));
  }

  function solve(A, op, B) {
    const steps = [];
    let [an, ad] = toImproper(A);
    let [bn, bd] = toImproper(B);
    if (ad === 0 || bd === 0) return { err: 'A bottom number can’t be 0. One whole can’t be cut into 0 pieces.' };
    if (A.w || B.w) {
      steps.push({
        t: 'Turn mixed numbers into improper fractions',
        h: `<p>It’s easier to work with improper fractions: whole × bottom + top, over the same bottom.</p>${A.w ? convLine(A, an, ad, 'tone-a') : ''}${B.w ? convLine(B, bn, bd, 'tone-b') : ''}`,
      });
    }
    let rn, rd;
    if (op === '+' || op === '−') {
      const add = op === '+';
      const verb = add ? 'add' : 'subtract';
      if (ad === bd) {
        steps.push({
          t: 'Check the bottoms',
          h: `<p>Both fractions are cut into <b>${ad}</b> equal pieces (${pieceName(ad)}). The pieces are the same size, so you can ${verb} them straight away.</p>`,
          v: twoBars(an, ad, bn, bd),
        });
      } else {
        const L = lcm(ad, bd), ka = L / ad, kb = L / bd;
        steps.push({
          t: 'Check the bottoms',
          h: `<p>${frA(an, ad)} is cut into ${pieceName(ad)} and ${frB(bn, bd)} into ${pieceName(bd)}. Those pieces are different sizes, so you can’t ${verb} them yet. First cut both into pieces of one size.</p>`,
          v: twoBars(an, ad, bn, bd),
        });
        steps.push({
          t: 'Find a common bottom',
          h: `<p>Count up in ${ad}s and in ${bd}s. The first number in both lists is the smallest common bottom: <b>${L}</b>.</p>${L !== ad * bd ? `<p class="muted">Multiplying the bottoms (${ad} × ${bd} = ${ad * bd}) also works. It just gives bigger numbers to simplify later.</p>` : ''}`,
          v: multiples(ad, bd, L),
        });
        const line = (n, d, k, tone) => (k === 1
          ? `<p class="eqn">${fr(n, d, tone)} <span class="muted">already has ${L} at the bottom</span></p>`
          : `<p class="eqn">${fr(n, d, tone)} = ${fr(`${n} × ${k}`, `${d} × ${k}`)} = ${fr(n * k, L, tone)}</p>`);
        steps.push({
          t: `Rename both as ${pieceName(L)}`,
          h: `<p>Multiply the top and the bottom by the same number. The amount stays the same: the pieces just get smaller, and there are more of them.</p>${line(an, ad, ka, 'tone-a')}${line(bn, bd, kb, 'tone-b')}`,
          v: twoBars(an * ka, L, bn * kb, L, { minorA: ka, minorB: kb }),
        });
        an *= ka; bn *= kb; ad = bd = L;
      }
      const L = ad;
      if (add) {
        rn = an + bn;
        const W = Math.max(1, Math.ceil(rn / L));
        steps.push({
          t: 'Add the tops, keep the bottom',
          h: `<p class="eqn">${frA(an, L)} + ${frB(bn, L)} = ${fr(`${an} + ${bn}`, L)} = ${fr(rn, L)}</p><p>The bottom stays ${L}. Putting pieces together doesn’t change their size: they are still ${pieceName(L)}.</p>`,
          v: drawable(L, W) ? vrow(fr(rn, L), bars(rn, L, { W, colorAt: (i) => (i < an ? A_C : B_C) })) : '',
        });
      } else {
        rn = an - bn;
        const W = Math.max(1, Math.ceil(an / L));
        steps.push({
          t: 'Subtract the tops, keep the bottom',
          h: `<p class="eqn">${frA(an, L)} − ${frB(bn, L)} = ${fr(`${an} − ${bn}`, L)} = ${rn < 0 ? '−' + fr(-rn, L) : fr(rn, L)}</p>${rn < 0
            ? '<p>You are taking away more than you have, so the answer goes below zero.</p>'
            : `<p>Start with ${an} ${an === 1 ? ordWord(L) || 'piece' : pieceName(L)} and cross out ${bn}. ${rn} ${rn === 1 ? 'is' : 'are'} left.</p>`}`,
          v: rn >= 0 && drawable(L, W) ? vrow(fr(an, L), bars(an, L, { W, c: A_C, crossFrom: rn })) + (rn ? vrow(fr(rn, L), bars(rn, L, { W, c: ANS_C })) : '') : '',
        });
      }
      rd = L;
    } else if (op === '×') {
      rn = an * bn; rd = ad * bd;
      const pic = an <= ad && bn <= bd && ad <= 12 && bd <= 12;
      steps.push({
        t: 'Multiply the tops, multiply the bottoms',
        h: `<p class="eqn">${frA(an, ad)} × ${frB(bn, bd)} = ${fr(`${an} × ${bn}`, `${ad} × ${bd}`)} = ${fr(rn, rd)}</p><p>No common bottom is needed when you multiply.</p>`,
        v: pic ? `<div class="area-wrap">${areaModel(an, ad, bn, bd)}<p class="vis-cap" style="max-width:18em">${ad} rows × ${bd} columns = ${rd} boxes. ${rn} of them are shaded both ways, so the answer is ${fr(rn, rd)}.</p></div>` : '',
      });
    } else if (op === '÷') {
      if (bn === 0) return { err: 'You can’t divide by zero. Change the second number so it isn’t 0.' };
      steps.push({
        t: 'Keep, change, flip',
        h: '<p><b>Keep</b> the first fraction. <b>Change</b> ÷ into ×. <b>Flip</b> the second fraction: swap its top and bottom.</p>',
        v: kcf(an, ad, bn, bd),
      });
      rn = an * bd; rd = ad * bn;
      steps.push({
        t: 'Multiply',
        h: `<p class="eqn">${frA(an, ad)} × ${fr(bd, bn, 'tone-b')} = ${fr(`${an} × ${bd}`, `${ad} × ${bn}`)} = ${fr(rn, rd)}</p>`,
      });
    }
    steps.push(tidyStep(rn, rd));
    if (op === '÷' && an > 0) {
      const v = fitVis(an, ad, bn, bd);
      if (v) steps.push({ t: 'Check it with a picture', h: `<p>Dividing asks: how many ${frB(bn, bd)} fit into ${frA(an, ad)}?</p>`, v });
    }
    const [sn, sd] = reduce(rn, rd);
    return { steps, n: sn, d: sd };
  }

  /* ================= the stepper input: [− 3 +] over [− 8 +] ================= */
  let uid = 0;
  function fracInput(host, o) {
    const id = 'fi' + (++uid);
    const st = { n: o.n, d: o.d, w: o.whole ? (o.w || 0) : 0 };
    const row = (t, word) => `<div class="fi-row"><button type="button" class="fi-b" data-t="${t}" data-s="-1" aria-label="${o.label}: ${word} number down">−</button><input class="fi-v" id="${id}${t}" data-t="${t}" inputmode="numeric" autocomplete="off" aria-label="${o.label}: ${word} number"><button type="button" class="fi-b" data-t="${t}" data-s="1" aria-label="${o.label}: ${word} number up">+</button></div>`;
    host.innerHTML = `<div class="fi" role="group" aria-label="${o.label}" data-tone="${o.tone || ''}">${o.whole ? `<input class="fi-w" id="${id}w" inputmode="numeric" autocomplete="off" placeholder="" aria-label="${o.label}: whole number, optional">` : ''}<div class="fi-fr">${row('n', 'top')}<span class="fi-line" aria-hidden="true"></span>${row('d', 'bottom')}</div></div>`;
    const inN = $(`#${id}n`), inD = $(`#${id}d`), inW = o.whole ? $(`#${id}w`) : null;
    const lim = (s) => {
      s.d = clamp(s.d, o.minD ?? 1, o.maxD ?? 99);
      s.n = clamp(s.n, o.minN ?? 0, o.maxN ?? 99);
      s.w = clamp(s.w || 0, 0, o.maxW ?? 99);
      return o.constrain ? o.constrain(s) : s;
    };
    const paint = () => {
      inN.value = st.n; inD.value = st.d;
      if (inW) inW.value = st.w ? st.w : '';
      $$('.fi-b', host).forEach((b) => {
        const t = b.dataset.t, s = +b.dataset.s;
        const c = lim({ ...st, [t]: st[t] + s });
        b.disabled = c[t] === st[t];
      });
    };
    const fire = () => o.onChange && o.onChange({ ...st });
    host.addEventListener('click', (e) => {
      const b = e.target.closest('.fi-b');
      if (!b || b.disabled) return;
      st[b.dataset.t] += +b.dataset.s;
      lim(st); paint(); fire();
    });
    [inN, inD].forEach((inp) => {
      inp.addEventListener('input', () => {
        const v = parseInt(inp.value, 10);
        if (isNaN(v)) return;
        st[inp.dataset.t] = v; lim(st); fire();
      });
      inp.addEventListener('change', paint);
      inp.addEventListener('focus', () => inp.select());
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        st[inp.dataset.t] += e.key === 'ArrowUp' ? 1 : -1;
        lim(st); paint(); fire();
      });
    });
    if (inW) {
      inW.addEventListener('input', () => { const v = parseInt(inW.value, 10); st.w = isNaN(v) ? 0 : v; lim(st); fire(); });
      inW.addEventListener('change', paint);
      inW.addEventListener('focus', () => inW.select());
    }
    lim(st); paint();
    return {
      get: () => ({ ...st }),
      set(n, d, w) { st.n = n; st.d = d; if (w !== undefined) st.w = w; lim(st); paint(); },
    };
  }

  function presetChips(host, list, onPick) {
    host.innerHTML = '<span class="chip-k">Try</span>' + list.map((p, i) => `<button type="button" class="chip" data-p="${i}">${p.label}</button>`).join('');
    host.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) onPick(list[+b.dataset.p]); });
  }

  /* ================= header: lesson chips + progress ================= */
  function header() {
    const bar = $('.progress');
    const links = $$('.toc a');
    const secs = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const h = document.documentElement;
        bar.style.setProperty('--p', clamp(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight), 0, 1));
        let cur = -1;
        secs.forEach((s, i) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) cur = i; });
        links.forEach((a, i) => {
          const on = i === cur;
          if (on !== a.classList.contains('on')) {
            a.classList.toggle('on', on);
            if (on) { const t = $('.toc'); t.scrollTo({ left: a.offsetLeft - t.clientWidth / 2 + a.clientWidth / 2, behavior: RM ? 'auto' : 'smooth' }); }
          }
        });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    $$('[data-lesson]').forEach((p) => {
      const k = +p.dataset.lesson;
      p.insertAdjacentHTML('afterbegin', `<span class="course" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>`);
    });
  }

  /* ================= hero: the fraction wall ================= */
  function wall() {
    const ROWS = [1, 2, 3, 4, 5, 6, 8, 10, 12];
    const DARK_FG = { 2: 1, 3: 1 };
    const el = $('#wall');
    let h = '';
    for (const d of ROWS) {
      h += `<div class="wrow" data-d="${d}" style="--c:var(--t${d})${DARK_FG[d] ? ';--tile-fg:var(--on-tile-dark)' : ''}">`;
      for (let i = 0; i < d; i++) h += `<button type="button" class="tile" data-d="${d}" data-k="${i + 1}" aria-label="${fracWords(i + 1, d)}">${d === 1 ? '1 whole' : fr(1, d)}</button>`;
      h += '</div>';
    }
    el.innerHTML = h + '<span class="wall-guide" aria-hidden="true"></span>';
    const guide = $('.wall-guide', el);
    let sel = { k: 1, d: 2 };
    function show(k, d) {
      guide.style.setProperty('--v', k / d);
      const eq = [];
      $$('.wrow', el).forEach((row) => {
        const e = +row.dataset.d;
        const exact = (k * e) % d === 0;
        row.classList.toggle('eq', exact);
        if (exact) eq.push([(k * e) / d, e]);
        $$('.tile', row).forEach((t, j) => {
          const end = (j + 1) / e, start = j / e, v = k / d;
          t.classList.toggle('in', end <= v + 1e-9);
          const part = start < v - 1e-9 && end > v + 1e-9;
          t.classList.toggle('part', part);
          if (part) t.style.setProperty('--p', ((v - start) * e * 100).toFixed(1) + '%');
        });
      });
      $('#wallRead').innerHTML = eq.map(([n, e]) => fr(n, e)).join('<span class="eqs">=</span>');
      const others = ROWS.length - eq.length;
      $('#wallSay').innerHTML = `${eq.length === 1 ? 'Only this row' : `These ${eq.length} rows`} can make <b>${fracWords(k, d)}</b> exactly: a tile edge lands right on the dashed line.${others ? ` In the other ${others}, the line cuts through a tile.` : ''}`;
    }
    el.addEventListener('click', (e) => { const t = e.target.closest('.tile'); if (!t) return; sel = { k: +t.dataset.k, d: +t.dataset.d }; show(sel.k, sel.d); });
    if (window.matchMedia('(hover: hover)').matches) {
      el.addEventListener('mouseover', (e) => { const t = e.target.closest('.tile'); if (t) show(+t.dataset.k, +t.dataset.d); });
      el.addEventListener('mouseleave', () => show(sel.k, sel.d));
    }
    el.addEventListener('focusin', (e) => { const t = e.target.closest('.tile'); if (t) show(+t.dataset.k, +t.dataset.d); });
    show(1, 2);
  }

  /* ================= lesson 1: what a fraction means ================= */
  function lessonMeaning() {
    const st = { n: 3, d: 8, shape: 'pie' };
    const vis = $('#mk-vis');
    let built = '';
    const fi = fracInput($('#mk-in'), {
      n: 3, d: 8, maxD: 16, maxN: 16, tone: 'a', label: 'Your fraction',
      constrain: (s) => { s.n = Math.min(s.n, s.d); return s; },
      onChange: (s) => { st.n = s.n; st.d = s.d; draw(); },
    });
    function numberLine(d) {
      const x0 = 30, x1 = 570, L = x1 - x0;
      let s = `<svg class="nl" viewBox="0 0 600 110" aria-hidden="true"><rect class="nl-seg" x="${x0}" y="36" width="${L}" height="14" rx="3" style="transform-origin:${x0}px 43px"/>`;
      s += `<line class="nl-axis" x1="${x0}" y1="43" x2="${x1}" y2="43"/>`;
      for (let i = 0; i <= d; i++) {
        const x = x0 + (L * i) / d, big = i === 0 || i === d;
        s += `<line class="nl-tick" x1="${x}" y1="${big ? 26 : 32}" x2="${x}" y2="${big ? 60 : 54}"/>`;
        if (big) s += `<text class="nl-t" x="${x}" y="84">${i / d}</text>`;
        else if (d <= 12) s += `<text class="nl-t s" x="${x}" y="76">${i}</text><line class="nl-bar" x1="${x - 7}" y1="80" x2="${x + 7}" y2="80"/><text class="nl-t s" x="${x}" y="94">${d}</text>`;
      }
      for (let i = 0; i < d; i++) s += `<rect class="nl-hit" data-i="${i}" x="${x0 + (L * i) / d}" y="10" width="${L / d}" height="60"/>`;
      return s + `<circle class="nl-dot" cx="${x0}" cy="43" r="10"/></svg>`;
    }
    function draw() {
      const key = st.shape + ':' + st.d;
      if (key !== built) {
        built = key;
        if (st.shape === 'pie') vis.innerHTML = `<div class="pies" style="justify-content:center"><div style="--pie:min(260px, 70vw)">${pie(0, st.d, { clickable: true })}</div></div>`;
        else if (st.shape === 'bar') vis.innerHTML = bars(0, st.d, { clickable: true, size: 'lg', anim: false });
        else vis.innerHTML = numberLine(st.d);
      }
      if (st.shape === 'line') {
        const L = 540;
        $('.nl-seg', vis).style.transform = `scaleX(${st.n / st.d})`;
        $('.nl-dot', vis).style.transform = `translateX(${(L * st.n) / st.d}px)`;
      } else $$('[data-i]', vis).forEach((p) => p.classList.toggle('on', +p.dataset.i < st.n));
      const dec = decimalText(st.n, st.d);
      $('#mk-read').innerHTML = `<div class="anat">
          <div class="anat-fr">${fr(st.n, st.d)}</div>
          <p class="anat-lab"><b>${st.n}</b> on top: the pieces you have</p>
          <p class="anat-lab"><b>${st.d}</b> at the bottom: equal pieces in one whole</p>
        </div>
        <p class="say" style="margin-top:14px">Say it: <q>${fracWords(st.n, st.d)}</q>. As a decimal ${dec.s}, as a percentage ${dec.pct}.${st.n === st.d ? ' All the pieces are shaded, so this is one whole.' : st.n === 0 ? ' Nothing is shaded, so this is zero.' : ''}</p>`;
    }
    vis.addEventListener('click', (e) => {
      const p = e.target.closest('[data-i]');
      if (!p) return;
      const i = +p.dataset.i;
      st.n = i === st.n - 1 ? i : i + 1;
      fi.set(st.n, st.d); draw();
    });
    $$('#bench-meaning .seg button').forEach((b) => b.addEventListener('click', () => {
      $$('#bench-meaning .seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      st.shape = b.dataset.shape; draw();
    }));
    draw();
    $('#mk-sizes').innerHTML = [2, 3, 4, 6, 8, 12].map((d, i) => `<div class="size" style="--sz:${84 - i * 6}px">${pie(1, d, { c: `var(--t${d})` })}${fr(1, d)}</div>`).join('');
  }

  /* ================= lesson 2: equivalent fractions + simplifying ================= */
  function lessonSame() {
    const st = { n: 2, d: 3, k: 2 };
    const range = $('#eq-k');
    const arrow = '<svg class="arrow" viewBox="0 0 64 12" aria-hidden="true"><path d="M2 6h58M54 1l6 5-6 5"/></svg>';
    fracInput($('#eq-in'), {
      n: 2, d: 3, maxD: 8, minN: 1, tone: 'a', label: 'Starting fraction',
      constrain: (s) => { s.n = Math.min(s.n, s.d); return s; },
      onChange: (s) => { st.n = s.n; st.d = s.d; draw(); },
    });
    function draw() {
      const { n, d, k } = st;
      $('#eq-ko').textContent = k === 1 ? '1 (no extra cuts)' : `${k} smaller pieces`;
      $('#eq-x').innerHTML = `${frA(n, d)}<div class="xform-mid"><span>× ${k}</span>${arrow}<span>× ${k}</span></div>${fr(n * k, d * k, 'tone-ans')}`;
      $('#eq-vis').innerHTML = vrow(frA(n, d), bars(n, d, { c: A_C, anim: false })) + vrow(fr(n * k, d * k, 'tone-ans'), bars(n * k, d * k, { c: ANS_C, minor: k }))
        + `<p class="vis-cap">Same shaded length in both bars. The bottom bar just has ${k === 1 ? 'the same cuts' : `every piece cut into ${k}`}.</p>`;
      $('#eq-chips').innerHTML = '<span class="chip-k">Same as</span>' + [1, 2, 3, 4, 5, 6].map((m) => `<button type="button" class="chip" data-k="${m}" aria-pressed="${m === k}">${fr(n * m, d * m)}</button>`).join('');
    }
    range.addEventListener('input', () => { st.k = +range.value; draw(); });
    $('#eq-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; st.k = +b.dataset.k; range.value = st.k; draw(); });
    draw();

    /* simplify */
    let trail = [[12, 16, null]];
    fracInput($('#sp-in'), {
      n: 12, d: 16, minN: 1, maxN: 99, maxD: 99, label: 'Fraction to simplify',
      onChange: (s) => { trail = [[s.n, s.d, null]]; drawS(); },
    });
    function drawS() {
      const [n, d] = trail[trail.length - 1];
      $('#sp-trail').innerHTML = trail.map(([a, b, f], i) => (i ? `<span class="step-op">÷ ${f}<span aria-hidden="true">→</span></span>` : '') + fr(a, b, i === trail.length - 1 && trail.length > 1 ? 'now' : '')).join('');
      const cf = commonFactors(n, d);
      const g = gcd(n, d);
      const chips = $('#sp-chips');
      if (cf.length) {
        chips.innerHTML = '<span class="chip-k">Divide both by</span>' + cf.slice(0, 10).map((f) => `<button type="button" class="chip" data-f="${f}">÷ ${f}</button>`).join('');
        $('#sp-hint').innerHTML = cf.length > 1 ? `Fastest way: divide by the biggest one, <b>${g}</b>, in one go.` : `${n} and ${d} can both be divided by ${g}.`;
      } else {
        chips.innerHTML = `<span class="badge"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Simplest form</span>${trail.length > 1 ? '<button type="button" class="chip" data-reset="1">Start again</button>' : ''}`;
        $('#sp-hint').innerHTML = n === 1 || d === 1 ? 'Nothing goes into 1 except 1, so this can’t be simplified.' : `No number except 1 goes into both ${n} and ${d}, so ${fr(n, d)} can’t be simplified any further.`;
      }
    }
    $('#sp-chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-f],[data-reset]');
      if (!b) return;
      if (b.dataset.reset) { trail = [trail[0]]; drawS(); return; }
      const f = +b.dataset.f, [n, d] = trail[trail.length - 1];
      trail.push([n / f, d / f, f]); drawS();
    });
    drawS();
  }

  /* ================= lesson 3: compare ================= */
  function lessonCompare() {
    const st = { a: [3, 5], b: [4, 7] };
    const cons = (s) => { s.n = Math.min(s.n, s.d); return s; };
    fracInput($('#cmp-a'), { n: 3, d: 5, maxD: 12, tone: 'a', label: 'First fraction', constrain: cons, onChange: (s) => { st.a = [s.n, s.d]; draw(); } });
    fracInput($('#cmp-b'), { n: 4, d: 7, maxD: 12, tone: 'b', label: 'Second fraction', constrain: cons, onChange: (s) => { st.b = [s.n, s.d]; draw(); } });
    function draw() {
      const [an, ad] = st.a, [bn, bd] = st.b;
      const L = lcm(ad, bd), x = an * (L / ad), y = bn * (L / bd);
      const sign = x > y ? '>' : x < y ? '<' : '=';
      $('#cmp-vis').innerHTML = vrow(frA(an, ad), bars(an, ad, { c: A_C, anim: false })) + vrow(frB(bn, bd), bars(bn, bd, { c: B_C, anim: false }));
      let how;
      if (ad === bd) how = `<p>Same bottom, so compare the tops: ${an} ${sign} ${bn}.</p>`;
      else if (an === bn && an > 0) how = `<p>Same top. ${pieceName(ad)[0].toUpperCase() + pieceName(ad).slice(1)} are ${ad < bd ? 'bigger' : 'smaller'} than ${pieceName(bd)}, so ${ad < bd ? frA(an, ad) : frB(bn, bd)} is bigger.</p>`;
      else how = `<p>Rename both with the bottom ${L}: ${frA(an, ad)} = ${frA(x, L)} and ${frB(bn, bd)} = ${frB(y, L)}. Now compare the tops: ${x} ${sign} ${y}.</p>`;
      const say = sign === '=' ? 'They are the same amount.' : `${sign === '>' ? frA(an, ad) : frB(bn, bd)} is bigger.`;
      $('#cmp-read').innerHTML = `<div class="verdict">${frA(an, ad)}<span class="sign" aria-label="${sign === '>' ? 'is bigger than' : sign === '<' ? 'is smaller than' : 'equals'}">${sign}</span>${frB(bn, bd)}</div><p class="verdict-say">${say}</p>${how}${ad !== bd ? `<p class="muted" style="margin:0">Cross-multiply check: ${an} × ${bd} = ${an * bd} and ${bn} × ${ad} = ${bn * ad}.</p>` : ''}`;
    }
    draw();
  }

  /* ================= lessons 4 & 5: step-by-step walkthrough ================= */
  function walkthrough(root, op, presets) {
    root.innerHTML = `<div class="walk">
        <div class="qline"><div data-slot="a"></div><span class="op">${op}</span><div data-slot="b"></div><span class="op">=</span><span class="q-ans" data-ans>?</span></div>
        <div class="chips" data-presets></div>
        <div class="walk-prog" role="group" aria-label="Steps"></div>
        <div class="walk-card" aria-live="polite"></div>
        <div class="walk-nav"><button type="button" class="btn ghost" data-go="-1">Back</button><button type="button" class="btn" data-go="1">Next step</button></div>
      </div>`;
    const p0 = presets[0];
    let A = { w: 0, n: p0.a[0], d: p0.a[1] }, B = { w: 0, n: p0.b[0], d: p0.b[1] };
    let steps = [], i = 0, res = null;
    const fa = fracInput($('[data-slot="a"]', root), { n: A.n, d: A.d, maxD: 12, maxN: 24, tone: 'a', label: 'First fraction', onChange: (s) => { A = { w: 0, n: s.n, d: s.d }; rebuild(); } });
    const fb = fracInput($('[data-slot="b"]', root), { n: B.n, d: B.d, maxD: 12, maxN: 24, tone: 'b', label: 'Second fraction', onChange: (s) => { B = { w: 0, n: s.n, d: s.d }; rebuild(); } });
    presetChips($('[data-presets]', root), presets, (p) => {
      fa.set(p.a[0], p.a[1]); fb.set(p.b[0], p.b[1]);
      A = { w: 0, n: p.a[0], d: p.a[1] }; B = { w: 0, n: p.b[0], d: p.b[1] };
      i = 0; rebuild();
    });
    const card = $('.walk-card', root), prog = $('.walk-prog', root);
    function rebuild() {
      res = solve(A, op, B);
      steps = res.err ? [{ t: 'Can’t do that one', h: `<p>${res.err}</p>` }] : res.steps;
      i = Math.min(i, steps.length - 1);
      render();
    }
    function render() {
      const s = steps[i];
      prog.innerHTML = steps.map((_, k) => `<button type="button" class="${k < i ? 'done' : k === i ? 'cur' : ''}" data-step="${k}" aria-label="Step ${k + 1}"${k === i ? ' aria-current="step"' : ''}></button>`).join('');
      card.innerHTML = `<p class="step-k">Step ${i + 1} of ${steps.length}</p><h3>${s.t}</h3>${s.h}${s.v ? `<div class="step-v">${s.v}</div>` : ''}`;
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
      arm(card);
      const last = i === steps.length - 1;
      $('[data-go="-1"]', root).disabled = i === 0;
      $('[data-go="1"]', root).textContent = last ? 'Start again' : 'Next step';
      $('[data-ans]', root).innerHTML = last && !res.err ? nice(res.n, res.d, 'tone-ans') : '?';
    }
    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) { const dir = +g.dataset.go; i = dir > 0 && i === steps.length - 1 ? 0 : clamp(i + dir, 0, steps.length - 1); render(); return; }
      const s = e.target.closest('[data-step]');
      if (s) { i = +s.dataset.step; render(); }
    });
    rebuild();
  }

  /* ================= lesson 6: multiply ================= */
  function lessonMultiply() {
    const st = { a: [1, 2], b: [3, 4] };
    const cons = (s) => { s.n = Math.min(s.n, s.d); return s; };
    const fa = fracInput($('#mul-a'), { n: 1, d: 2, maxD: 10, tone: 'a', label: 'First fraction', constrain: cons, onChange: (s) => { st.a = [s.n, s.d]; draw(); } });
    const fb = fracInput($('#mul-b'), { n: 3, d: 4, maxD: 10, tone: 'b', label: 'Second fraction', constrain: cons, onChange: (s) => { st.b = [s.n, s.d]; draw(); } });
    presetChips($('#mul-chips'), [
      { label: `${fr(1, 2)} × ${fr(3, 4)}`, a: [1, 2], b: [3, 4] },
      { label: `${fr(2, 3)} × ${fr(3, 5)}`, a: [2, 3], b: [3, 5] },
      { label: `${fr(3, 4)} × ${fr(2, 3)}`, a: [3, 4], b: [2, 3] },
      { label: `${fr(1, 3)} × ${fr(1, 4)}`, a: [1, 3], b: [1, 4] },
    ], (p) => { fa.set(...p.a); fb.set(...p.b); st.a = p.a; st.b = p.b; draw(); });
    function draw() {
      const [an, ad] = st.a, [bn, bd] = st.b;
      const rn = an * bn, rd = ad * bd;
      $('#mul-vis').innerHTML = areaModel(an, ad, bn, bd) + `<ul class="legend">
          <li><i class="cb"></i><span>${frB(bn, bd)} of the square (columns)</span></li>
          <li><i class="ra"></i><span>${frA(an, ad)} of the square (rows)</span></li>
          <li><i class="ov"></i><span>Both: ${fr(an, ad)} of ${fr(bn, bd)} = <b>${rn}</b> of ${rd} boxes</span></li>
        </ul>`;
      const g = gcd(rn, rd);
      $('#mul-read').innerHTML = `<p class="eqn" style="font-size:1.6rem">${frA(an, ad)} × ${frB(bn, bd)} = ${fr(`${an} × ${bn}`, `${ad} × ${bd}`)} = ${fr(rn, rd)}${g > 1 && rn ? ` = ${nice(rn / g, rd / g, 'tone-ans')}` : ''}</p>
        <p class="muted" style="margin:0">${rn === 0 ? 'Anything times zero is zero.' : g > 1 ? `Simplified by dividing the top and bottom by ${g}.` : `${fr(rn, rd)} is already in its simplest form.`} Read it as “${fracWords(an, ad)} of ${fracWords(bn, bd)}”.</p>`;
    }
    draw();
  }

  /* ================= lesson 7: divide ================= */
  function lessonDivide() {
    const st = { a: [3, 4], b: [1, 8] };
    const fa = fracInput($('#div-a'), { n: 3, d: 4, maxD: 12, maxN: 24, tone: 'a', label: 'First fraction', constrain: (s) => { s.n = Math.min(s.n, s.d * 2); return s; }, onChange: (s) => { st.a = [s.n, s.d]; draw(); } });
    const fb = fracInput($('#div-b'), { n: 1, d: 8, minN: 1, maxD: 12, tone: 'b', label: 'Second fraction', constrain: (s) => { s.n = Math.min(s.n, s.d); return s; }, onChange: (s) => { st.b = [s.n, s.d]; draw(); } });
    presetChips($('#div-chips'), [
      { label: `${fr(3, 4)} ÷ ${fr(1, 8)}`, a: [3, 4], b: [1, 8] },
      { label: `${fr(3, 4)} ÷ ${fr(1, 2)}`, a: [3, 4], b: [1, 2] },
      { label: `${fr(2, 3)} ÷ ${fr(1, 6)}`, a: [2, 3], b: [1, 6] },
      { label: `${fr(1, 2)} ÷ ${fr(3, 4)}`, a: [1, 2], b: [3, 4] },
    ], (p) => { fa.set(...p.a); fb.set(...p.b); st.a = p.a; st.b = p.b; draw(); });
    function draw() {
      const [an, ad] = st.a, [bn, bd] = st.b;
      $('#div-q').innerHTML = `How many ${fr(bn, bd)} fit into ${fr(an, ad)}?`;
      $('#div-fit').innerHTML = fitVis(an, ad, bn, bd) || '<p class="vis-cap">That’s too many pieces to draw neatly. Keep, change, flip still works.</p>';
      $('#div-kcf').innerHTML = kcf(an, ad, bn, bd);
      arm($('#div-kcf'));
      const rn = an * bd, rd = ad * bn, [sn, sd] = reduce(rn, rd);
      $('#div-read').innerHTML = `<p class="eqn" style="font-size:1.6rem">${frA(an, ad)} × ${fr(bd, bn, 'tone-b')} = ${fr(`${an} × ${bd}`, `${ad} × ${bn}`)} = ${fr(rn, rd)}${sn !== rn || sd !== rd || sd === 1 || sn > sd ? ` = ${nice(sn, sd, 'tone-ans')}` : ''}</p><p class="muted" style="margin:0">Same answer as the picture.</p>`;
    }
    $('#div-play').addEventListener('click', () => {
      const k = $('#div-kcf .kcf');
      if (!k) return;
      k.classList.add('reset'); k.classList.remove('go'); void k.offsetWidth; k.classList.remove('reset');
      setTimeout(() => k.classList.add('go'), 60);
    });
    draw();
  }

  /* ================= lesson 8: mixed numbers ================= */
  function lessonMixed() {
    const st = { n: 7, d: 3 };
    fracInput($('#mix-in'), {
      n: 7, d: 3, minN: 1, minD: 2, maxD: 10, maxN: 50, tone: 'a', label: 'Improper fraction',
      constrain: (s) => { s.n = Math.min(s.n, s.d * 5); return s; },
      onChange: (s) => { st.n = s.n; st.d = s.d; draw(); },
    });
    function draw() {
      const { n, d } = st;
      const q = Math.floor(n / d), r = n % d;
      $('#mix-vis').innerHTML = pies(n, d, { c: A_C, size: 'mixed' });
      let h;
      if (n < d) h = `<div class="convert-row"><span class="convert-k">Less than one whole</span><p style="margin:.4em 0 0">${fr(n, d)} is less than one whole, so it stays as it is. Make the top bigger than the bottom to see a mixed number.</p></div>`;
      else if (r === 0) h = `<div class="convert-row"><span class="convert-k">Exactly ${q} whole${q > 1 ? 's' : ''}</span><p class="eqn">${n} ÷ ${d} = ${q} <span class="muted">no remainder</span></p><p class="eqn">${fr(n, d)} = ${wn(q, 'tone-ans')}</p></div>`;
      else h = `<div class="convert-row"><span class="convert-k">Improper to mixed</span><p class="eqn">${n} ÷ ${d} = ${q} remainder ${r}</p><p class="eqn">${fr(n, d)} = ${mx(q, r, d, 'tone-ans')} <span class="muted">${q} whole${q > 1 ? 's' : ''} and ${fracWords(r, d)}</span></p></div>
        <div class="convert-row"><span class="convert-k">Mixed back to improper</span><p class="eqn">${mx(q, r, d)} = ${fr(`${q} × ${d} + ${r}`, d)} = ${fr(n, d, 'tone-a')}</p></div>`;
      $('#mix-read').innerHTML = h;
    }
    draw();
  }

  /* ================= calculator ================= */
  function calculator() {
    const st = { op: '+', A: { w: 1, n: 1, d: 2 }, B: { w: 0, n: 2, d: 3 } };
    const conf = (tone, label, X) => ({ n: X.n, d: X.d, w: X.w, whole: true, maxN: 999, maxD: 999, maxW: 999, tone, label });
    fracInput($('#calc-a'), { ...conf('a', 'First number', st.A), onChange: (s) => { st.A = s; run(); } });
    fracInput($('#calc-b'), { ...conf('b', 'Second number', st.B), onChange: (s) => { st.B = s; run(); } });
    $('#calc-ops').addEventListener('click', (e) => {
      const b = e.target.closest('[data-op]');
      if (!b) return;
      $$('#calc-ops button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      st.op = b.dataset.op; $('#calc-sym').textContent = OPS[st.op]; run();
    });
    function run() {
      const out = $('#calc-out'), list = $('#calc-steps');
      const A = { ...st.A }, B = { ...st.B };
      if (A.n === 0 && !A.w) A.d = A.d || 1;
      const r = solve(A, st.op, B);
      if (r.err) { out.innerHTML = `<div class="calc-res err">${r.err}</div>`; list.innerHTML = ''; return; }
      out.innerHTML = `<div class="calc-res">${opnd(A, 'tone-a')}<span class="op">${OPS[st.op]}</span>${opnd(B, 'tone-b')}<span class="op">=</span>${nice(r.n, r.d, 'tone-ans')}${Math.abs(r.n) > r.d && r.d !== 1 ? `<span class="muted" style="font-size:1rem">or ${fr(r.n, r.d)}</span>` : ''}</div>`;
      list.innerHTML = r.steps.map((s) => `<li><h3>${s.t}</h3>${s.h}${s.v && !s.final ? `<div class="step-v">${s.v}</div>` : ''}</li>`).join('');
      arm(list);
    }
    run();
  }

  /* ================= practice ================= */
  function practice() {
    const root = $('#quiz');
    root.innerHTML = `<div class="quiz-top">
        <div class="seg" role="group" aria-label="Level" id="q-level">
          <button type="button" data-l="easy" aria-pressed="true">Easy</button>
          <button type="button" data-l="medium" aria-pressed="false">Medium</button>
          <button type="button" data-l="hard" aria-pressed="false">Hard</button>
          <button type="button" data-l="mix" aria-pressed="false">Mix</button>
        </div>
        <div class="score"><span class="score-item">Right first time <span id="q-score">–</span></span><span class="score-item">Streak <b id="q-streak">0</b></span><span class="score-item">Best <b id="q-best">0</b></span></div>
      </div>
      <div class="quiz-card">
        <p class="step-k" id="q-no">Question 1</p>
        <p class="quiz-q" id="q-text"></p>
        <div id="q-vis"></div>
        <form class="quiz-ans" id="q-form" autocomplete="off" novalidate>
          <div class="ans-box" id="q-box">
            <input class="w" id="q-w" inputmode="numeric" aria-label="Whole number (leave empty if you don’t need one)">
            <div class="fi-fr"><input id="q-n" inputmode="numeric" aria-label="Top number"><span class="fi-line" aria-hidden="true"></span><input id="q-d" inputmode="numeric" aria-label="Bottom number"></div>
          </div>
          <div class="choice" id="q-choice" hidden>
            <button type="button" data-c="<" aria-label="smaller than">&lt;</button>
            <button type="button" data-c="=" aria-label="equal to">=</button>
            <button type="button" data-c=">" aria-label="bigger than">&gt;</button>
          </div>
          <button class="btn" id="q-check" type="submit">Check</button>
          <p class="ans-help" id="q-help">Whole numbers: type them in the dashed box, or as a top number over 1.</p>
        </form>
        <p class="fb" id="q-fb" aria-live="polite"></p>
        <div class="quiz-nav">
          <button type="button" class="btn ghost" id="q-how">Show me how</button>
          <button type="button" class="btn" id="q-next" hidden>Next question</button>
        </div>
        <div class="quiz-sol" id="q-sol" hidden></div>
      </div>`;

    const S = { level: 'easy', q: null, count: 0, right: 0, tried: 0, streak: 0, best: 0, done: false, attempts: 0, last: '' };
    try { S.best = +localStorage.getItem('fractions-best') || 0; } catch (e) { /* storage blocked */ }
    const LEVELS = {
      easy: ['name', 'addSame', 'subSame', 'simplify'],
      medium: ['addDiff', 'subDiff', 'compare', 'mul', 'toMixed', 'toImproper', 'simplify'],
      hard: ['div', 'addMixed', 'mul', 'subDiff', 'div', 'addDiff'],
    };
    LEVELS.mix = [...new Set([...LEVELS.easy, ...LEVELS.medium, ...LEVELS.hard])];

    const properPair = (maxD, minD = 2) => { const d = R(minD, maxD); return [R(1, d - 1), d]; };
    const arith = (A, op, B, extra = {}) => {
      const r = solve(A, op, B);
      return { kind: 'frac', text: 'Work it out.', big: `${opnd(A, 'tone-a')}<span class="op">${op}</span>${opnd(B, 'tone-b')}<span class="op">=</span><span class="op">?</span>`, ans: [r.n, r.d], form: 'any', how: () => r.steps, ...extra };
    };
    const F = (n, d) => ({ w: 0, n, d });
    const GEN = {
      name() {
        const d = R(2, 10), n = R(1, d - 1);
        const usePie = Math.random() < 0.5;
        return {
          kind: 'frac', text: 'What fraction is shaded?', vis: usePie ? `<div style="--pie:170px">${pies(n, d, { c: A_C })}</div>` : bars(n, d, { c: A_C, size: 'lg' }), ans: [n, d], form: 'any',
          how: () => [{ t: 'Count the pieces', h: `<p>The whole is cut into <b>${d}</b> equal pieces, so the bottom number is ${d}. <b>${n}</b> ${n === 1 ? 'piece is' : 'pieces are'} shaded, so the top number is ${n}.</p><p class="eqn">${fr(n, d, 'tone-ans')}</p>` }],
        };
      },
      addSame() { const d = R(3, 12), a = R(1, d - 1), b = R(1, d - 1); return arith(F(a, d), '+', F(b, d)); },
      subSame() { const d = R(3, 12), a = R(2, d), b = R(1, a - 1); return arith(F(a, d), '−', F(b, d)); },
      simplify() {
        let d0, n0;
        do { d0 = R(2, 9); n0 = R(1, d0 - 1); } while (gcd(n0, d0) !== 1);
        const k = R(2, 6), n = n0 * k, d = d0 * k;
        return {
          kind: 'frac', text: 'Write this fraction in its simplest form.', big: `${fr(n, d, 'tone-a')}<span class="op">=</span><span class="op">?</span>`, ans: [n0, d0], form: 'simplest',
          how: () => [{ t: 'Find the biggest number that goes into both', h: `<p>${n} and ${d} can both be divided by ${commonFactors(n, d).join(', ')}. The biggest is <b>${k}</b>.</p>` }, { t: 'Divide the top and the bottom by it', h: `<p class="eqn">${fr(n, d)} = ${fr(`${n} ÷ ${k}`, `${d} ÷ ${k}`)} = ${fr(n0, d0, 'tone-ans')}</p><p>${n0} and ${d0} have no common factor except 1, so you’re done.</p>` }],
        };
      },
      addDiff() { let a, b; do { a = properPair(8); b = properPair(8); } while (a[1] === b[1]); return arith(F(...a), '+', F(...b)); },
      subDiff() {
        let a, b;
        do { a = properPair(9); b = properPair(9); } while (a[1] === b[1] || a[0] * b[1] <= b[0] * a[1]);
        return arith(F(...a), '−', F(...b));
      },
      compare() {
        const a = properPair(9);
        let b;
        if (Math.random() < 0.2) { const k = R(2, 3); b = [a[0] * k, a[1] * k]; if (Math.random() < 0.5) return mkCmp(b, a); }
        else do { b = properPair(9); } while (b[0] * a[1] === a[0] * b[1]);
        return mkCmp(a, b);
      },
      mul() {
        if (Math.random() < 0.25) { const w = R(2, 6), f = properPair(9); return arith({ w, n: 0, d: 1 }, '×', F(...f)); }
        return arith(F(...properPair(9)), '×', F(...properPair(9)));
      },
      div() {
        if (Math.random() < 0.25) { const w = R(1, 4), f = [1, R(2, 6)]; return arith({ w, n: 0, d: 1 }, '÷', F(...f)); }
        return arith(F(...properPair(9)), '÷', F(...properPair(8)));
      },
      toMixed() {
        const d = R(2, 9);
        let n; do { n = R(d + 1, d * 4); } while (n % d === 0);
        const q = Math.floor(n / d), r = n % d;
        return {
          kind: 'frac', text: 'Write this as a mixed number.', big: `${fr(n, d, 'tone-a')}<span class="op">=</span><span class="op">?</span>`, ans: [n, d], form: 'mixed',
          how: () => [{ t: 'Divide the top by the bottom', h: `<p class="eqn">${n} ÷ ${d} = ${q} remainder ${r}</p><p>${q} is the number of wholes. The remainder, ${r}, is the new top. The bottom stays ${d}.</p><p class="eqn">${fr(n, d)} = ${mx(q, r, d, 'tone-ans')}</p>` }],
        };
      },
      toImproper() {
        const d = R(2, 9), w = R(1, 5), n = R(1, d - 1), N = w * d + n;
        return {
          kind: 'frac', text: 'Write this as an improper fraction.', big: `${mx(w, n, d, 'tone-a')}<span class="op">=</span><span class="op">?</span>`, ans: [N, d], form: 'improper',
          how: () => [{ t: 'Whole × bottom + top', h: `<p>Each whole is ${d} ${pieceName(d)}, so ${w} wholes are ${w} × ${d} = ${w * d}. Add the ${n} extra.</p><p class="eqn">${mx(w, n, d)} = ${fr(`${w} × ${d} + ${n}`, d)} = ${fr(N, d, 'tone-ans')}</p>` }],
        };
      },
      addMixed() {
        const A = { w: R(1, 3), n: 0, d: R(2, 6) }; A.n = R(1, A.d - 1);
        const B = { w: R(1, 2), n: 0, d: R(2, 6) }; B.n = R(1, B.d - 1);
        const op = Math.random() < 0.5 ? '+' : '−';
        const va = A.w + A.n / A.d, vb = B.w + B.n / B.d;
        return op === '−' && va < vb ? arith(B, op, A) : arith(A, op, B);
      },
    };
    function mkCmp(a, b) {
      const [an, ad] = a, [bn, bd] = b;
      const L = lcm(ad, bd), x = an * (L / ad), y = bn * (L / bd);
      const sign = x > y ? '>' : x < y ? '<' : '=';
      return {
        kind: 'cmp', text: 'Which sign goes in the box?', big: `${frA(an, ad)}<span class="op" style="border:2px dashed var(--line);border-radius:10px;padding:0 .3em">?</span>${frB(bn, bd)}`, ans: sign,
        how: () => [
          { t: 'Give them the same bottom', h: ad === bd ? `<p>They already share the bottom ${ad}.</p>` : `<p class="eqn">${frA(an, ad)} = ${frA(x, L)} <span class="op"> </span> ${frB(bn, bd)} = ${frB(y, L)}</p>`, v: twoBars(an, ad, bn, bd) },
          { t: 'Compare the tops', h: `<p>${x} ${sign} ${y}, so:</p><p class="eqn">${frA(an, ad)} <span class="op">${sign}</span> ${frB(bn, bd)}</p>` },
        ],
      };
    }

    const el = (id) => $('#' + id);
    function next() {
      const types = LEVELS[S.level];
      let t; do { t = pick(types); } while (t === S.last && types.length > 1);
      S.last = t;
      S.q = GEN[t]();
      S.count++; S.done = false; S.attempts = 0;
      const q = S.q;
      el('q-no').textContent = `Question ${S.count}`;
      el('q-text').textContent = q.text;
      el('q-vis').innerHTML = (q.big ? `<div class="quiz-big">${q.big}</div>` : '') + (q.vis || '');
      const isCmp = q.kind === 'cmp';
      el('q-box').hidden = isCmp; el('q-check').hidden = isCmp; el('q-help').hidden = isCmp;
      el('q-choice').hidden = !isCmp;
      $$('#q-choice button').forEach((b) => { b.disabled = false; b.className = ''; });
      ['q-w', 'q-n', 'q-d'].forEach((id) => { el(id).value = ''; el(id).disabled = false; });
      el('q-check').disabled = false;
      el('q-fb').className = 'fb'; el('q-fb').innerHTML = '';
      el('q-sol').hidden = true; el('q-sol').innerHTML = '';
      el('q-how').hidden = false; el('q-next').hidden = true;
    }
    function paintScore() {
      el('q-score').innerHTML = S.tried ? fr(S.right, S.tried) : '–';
      el('q-streak').textContent = S.streak;
      el('q-best').textContent = S.best;
    }
    function finish(correct) {
      if (S.attempts === 1) {
        S.tried++;
        if (correct) { S.right++; S.streak++; if (S.streak > S.best) { S.best = S.streak; try { localStorage.setItem('fractions-best', String(S.best)); } catch (e) { /* ignore */ } } }
        else S.streak = 0;
      }
      paintScore();
    }
    function lock() {
      S.done = true;
      ['q-w', 'q-n', 'q-d'].forEach((id) => { el(id).disabled = true; });
      el('q-check').disabled = true;
      $$('#q-choice button').forEach((b) => { b.disabled = true; });
      el('q-next').hidden = false;
      el('q-next').focus({ preventScroll: true });
    }
    function feedback(ok, html, note) {
      const fb = el('q-fb');
      fb.className = 'fb ' + (ok ? 'ok' : 'no');
      fb.innerHTML = html + (note ? `<span class="note">${note}</span>` : '');
      if (!ok && !RM) { const box = el('q-box').hidden ? el('q-choice') : el('q-box'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
    }
    const PRAISE = ['Correct!', 'Spot on!', 'Yes, that’s it!', 'Nicely done!', 'Exactly right!'];
    function judgeFrac() {
      const q = S.q;
      const raw = { w: el('q-w').value.trim(), n: el('q-n').value.trim(), d: el('q-d').value.trim() };
      if (!raw.w && !raw.n && !raw.d) { feedback(false, 'Type your answer in the boxes first.'); return; }
      const w = raw.w ? parseInt(raw.w, 10) : 0;
      let n = raw.n ? parseInt(raw.n, 10) : 0;
      let d = raw.d ? parseInt(raw.d, 10) : 1;
      if ([w, n, d].some((v) => isNaN(v) || v < 0)) { feedback(false, 'Use whole numbers only, like 3 or 12.'); return; }
      if (raw.n && !raw.d && raw.w) { feedback(false, 'Add a bottom number to your fraction.'); return; }
      if (d === 0) { feedback(false, 'The bottom number can’t be 0.'); return; }
      S.attempts++;
      const N = w * d + n, [tn, td] = q.ans;
      const same = N * td === tn * d;
      if (!same) {
        finish(false);
        if (S.attempts >= 2) { feedback(false, `Not quite. The answer is ${nice(tn, td)}${Math.abs(tn) > td && td > 1 ? ` (or ${fr(tn, td)})` : ''}.`, 'Look at the steps below to see where it goes.'); showHow(); lock(); }
        else feedback(false, 'Not quite. Have another go, or press Show me how.');
        return;
      }
      const simplest = gcd(n, d) === 1 || n === 0;
      if (q.form === 'simplest' && (!simplest || w)) { S.attempts--; feedback(false, 'That’s the same amount, but it can be simplified more.', 'Find a number that goes into both the top and the bottom.'); return; }
      if (q.form === 'mixed' && !(w > 0 && n < d)) { S.attempts--; feedback(false, 'Right amount! Now write it as a whole number plus a fraction smaller than 1.'); return; }
      if (q.form === 'improper' && w) { S.attempts--; feedback(false, 'Right amount! Now write it as one fraction, with no whole number.'); return; }
      finish(true);
      let note = '';
      if (q.form === 'any' && n && !simplest) { const [a, b] = reduce(n, d); note = `Tip: you can simplify ${fr(n, d)} to ${fr(a, b)}.`; }
      else if (q.form === 'any' && !w && n > d && d > 1) note = `You can also write it as ${nice(n, d)}.`;
      feedback(true, S.attempts === 1 ? pick(PRAISE) : 'Got it on the second go.', note);
      confetti(el('q-check'));
      lock();
    }
    function judgeCmp(btn) {
      const q = S.q;
      S.attempts++;
      if (btn.dataset.c === q.ans) {
        btn.classList.add('right');
        finish(true);
        feedback(true, S.attempts === 1 ? pick(PRAISE) : 'Got it on the second go.');
        confetti(btn); lock();
      } else {
        btn.classList.add('wrong'); btn.disabled = true;
        finish(false);
        if (S.attempts >= 2) { $(`#q-choice [data-c="${q.ans}"]`).classList.add('right'); feedback(false, 'Not quite. Look at the steps below.'); showHow(); lock(); }
        else feedback(false, 'Not quite. Have another go, or press Show me how.');
      }
    }
    function showHow() {
      const sol = el('q-sol');
      if (!sol.hidden) return;
      const steps = S.q.how();
      sol.innerHTML = `<p class="step-k">How to solve it</p><ol class="steps">${steps.map((s) => `<li><h3>${s.t}</h3>${s.h}${s.v ? `<div class="step-v">${s.v}</div>` : ''}</li>`).join('')}</ol>`;
      sol.hidden = false;
      el('q-how').hidden = true;
      arm(sol);
      if (!S.done) { if (S.attempts === 0) { S.attempts = 1; finish(false); } lock(); }
    }
    el('q-form').addEventListener('submit', (e) => { e.preventDefault(); if (!S.done) judgeFrac(); });
    el('q-choice').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b && !S.done) judgeCmp(b); });
    el('q-how').addEventListener('click', showHow);
    el('q-next').addEventListener('click', () => { next(); el('q-n').focus({ preventScroll: true }); });
    el('q-level').addEventListener('click', (e) => {
      const b = e.target.closest('[data-l]');
      if (!b) return;
      $$('#q-level button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      S.level = b.dataset.l; S.last = ''; next();
    });
    /* typing “/” in the top box jumps to the bottom box */
    el('q-n').addEventListener('keydown', (e) => { if (e.key === '/') { e.preventDefault(); el('q-d').focus(); } });
    el('q-w').addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); el('q-n').focus(); } });
    paintScore();
    next();
    window.__fractionsQuiz = { state: () => S, next, setLevel: (l) => $(`#q-level [data-l="${l}"]`).click() };
  }

  /* ================= confetti (tile-coloured, short) ================= */
  const cv = $('#confetti');
  let parts = [], raf = 0;
  function confetti(from) {
    if (RM || !cv || !cv.getContext) return;
    const r = from.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--t1', '--t2', '--t3', '--t4', '--t6', '--t8'].map((v) => cs.getPropertyValue(v).trim());
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    for (let i = 0; i < 70; i++) {
      parts.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3, w: 6 + Math.random() * 8, h: 4 + Math.random() * 5, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: pick(cols), life: 0 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
    function tick() {
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life < 90);
      for (const p of parts) {
        p.life++; p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / 90); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      raf = parts.length ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, innerWidth, innerHeight), 0);
    }
  }

  /* ================= summary sheet ================= */
  function sheet() {
    const C = [
      ['--t1', 'Read it', `${fr(3, 4)}`, '3 pieces of something cut into 4 equal pieces.'],
      ['--t2', 'Same amount', `${fr(1, 2)} = ${fr(2, 4)} = ${fr(3, 6)}`, 'Multiply or divide the top and bottom by the same number.'],
      ['--t3', 'Simplify', `${fr(6, 8)} = ${fr(3, 4)}`, 'Divide the top and bottom by a common factor until none is left.'],
      ['--t4', 'Compare', `${fr(2, 3)} = ${fr(8, 12)} &gt; ${fr(7, 12)}`, 'Make the bottoms the same, then compare the tops.'],
      ['--t5', 'Add and subtract', `${fr(1, 2)} + ${fr(1, 3)} = ${fr(3, 6)} + ${fr(2, 6)} = ${fr(5, 6)}`, 'Same bottom first. Then add or subtract the tops. Keep the bottom.'],
      ['--t6', 'Multiply', `${fr(2, 3)} × ${fr(3, 4)} = ${fr(6, 12)} = ${fr(1, 2)}`, 'Top × top, bottom × bottom.'],
      ['--t8', 'Divide', `${fr(3, 4)} ÷ ${fr(1, 2)} = ${fr(3, 4)} × ${fr(2, 1)} = ${mx(1, 1, 2)}`, 'Keep, change, flip, then multiply.'],
      ['--t10', 'Mixed numbers', `${mx(2, 1, 3)} = ${fr(7, 3)}`, 'Whole × bottom + top, over the same bottom. Divide to go back.'],
    ];
    $('#sheet-grid').innerHTML = C.map(([c, t, ex, p], i) => `<article class="card" style="--c:var(${c})"><div class="card-k" aria-hidden="true">${Array.from({ length: 8 }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div><h3>${t}</h3><p class="eqn">${ex}</p><p>${p}</p></article>`).join('');
  }

  /* ================= start ================= */
  function boot() {
    header();
    wall();
    lessonMeaning();
    lessonSame();
    lessonCompare();
    walkthrough($('#walk-add'), '+', [
      { label: `${fr(1, 2)} + ${fr(1, 3)}`, a: [1, 2], b: [1, 3] },
      { label: `${fr(1, 5)} + ${fr(2, 5)}`, a: [1, 5], b: [2, 5] },
      { label: `${fr(3, 4)} + ${fr(1, 6)}`, a: [3, 4], b: [1, 6] },
      { label: `${fr(2, 3)} + ${fr(5, 6)}`, a: [2, 3], b: [5, 6] },
    ]);
    walkthrough($('#walk-sub'), '−', [
      { label: `${fr(3, 4)} − ${fr(1, 3)}`, a: [3, 4], b: [1, 3] },
      { label: `${fr(4, 5)} − ${fr(1, 5)}`, a: [4, 5], b: [1, 5] },
      { label: `${fr(5, 6)} − ${fr(1, 2)}`, a: [5, 6], b: [1, 2] },
      { label: `${fr(7, 8)} − ${fr(3, 4)}`, a: [7, 8], b: [3, 4] },
    ]);
    lessonMultiply();
    lessonDivide();
    lessonMixed();
    calculator();
    practice();
    sheet();
  }
  /* exposed for the test scripts only */
  window.__fractions = { solve, reduce, gcd, lcm, fracWords, decimalText };
  boot();
})();
