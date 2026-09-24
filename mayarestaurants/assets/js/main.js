/* Maya @ Solaris — interactions. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const canPlayVideo = !reduceMotion && !saveData;
  const TZ = 'Asia/Kuala_Lumpur';
  const PHONE_WA = '60123952153';

  /* ---------- Kuala Lumpur clock helpers ---------- */
  function klNow() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: +parts.hour * 60 + +parts.minute };
  }
  const addDays = (iso, n) => {
    const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const fmtTime = (m) => {
    const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
    return `${((h + 11) % 12) + 1}:${mm}${h < 12 ? 'am' : 'pm'}`;
  };
  const fmtDate = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });

  /* ---------- Split headings into words ---------- */
  if (!reduceMotion) {
    $$('[data-split]').forEach((el) => {
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      el.setAttribute('aria-label', text);
      el.innerHTML = text.split(' ').map((w, i) =>
        `<span class="split-word" aria-hidden="true"><span style="--w:${i}">${w}</span></span>`).join(' ');
      el.classList.add('is-split');
    });
  }

  /* ---------- Reveal on scroll ---------- */
  $$('[data-reveal="stagger"]').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      revealIO.unobserve(e.target);
      if (e.target.matches('.stats')) countUp(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal], .is-split:not(.hero__title)').forEach((el) => revealIO.observe(el));

  function countUp(scope) {
    $$('[data-count]', scope).forEach((el) => {
      const end = +el.dataset.count;
      if (reduceMotion) return;
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Hero intro ---------- */
  const heroTitle = $('.hero__title');
  const firstPoster = $('.hero__poster');
  const ready = () => requestAnimationFrame(() => {
    root.classList.add('is-ready');
    heroTitle && heroTitle.classList.add('is-visible');
  });
  if (firstPoster && firstPoster.decode) {
    Promise.race([firstPoster.decode().catch(() => {}), new Promise((r) => setTimeout(r, 700))]).then(ready);
  } else ready();

  /* ---------- Hero video ---------- */
  const hero = $('[data-hero]');
  const heroVideos = $$('.hero__video');
  const motionBtn = $('[data-motion-toggle]');
  let userPaused = false, heroInView = true;

  if (!canPlayVideo) root.classList.add('no-video');

  function loadHeroVideos() {
    if (!canPlayVideo) return;
    heroVideos.forEach((v) => {
      if (v.dataset.loaded || getComputedStyle(v.parentElement).display === 'none') return;
      v.dataset.loaded = '1';
      v.src = v.dataset.src;
      v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
      if (!userPaused && heroInView) v.play().catch(() => {});
    });
  }
  function syncHeroPlayback() {
    heroVideos.forEach((v) => {
      if (!v.dataset.loaded) return;
      if (userPaused || !heroInView || document.hidden) v.pause();
      else v.play().catch(() => {});
    });
  }
  if (document.readyState === 'complete') loadHeroVideos();
  else addEventListener('load', loadHeroVideos, { once: true });
  addEventListener('resize', debounce(loadHeroVideos, 300));
  document.addEventListener('visibilitychange', syncHeroPlayback);
  if (hero) {
    new IntersectionObserver(([e]) => { heroInView = e.isIntersecting; syncHeroPlayback(); }, { threshold: 0.05 }).observe(hero);
  }
  motionBtn && motionBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    motionBtn.setAttribute('aria-pressed', String(userPaused));
    $('[data-motion-label]', motionBtn).textContent = userPaused ? 'Play video' : 'Pause video';
    syncHeroPlayback();
  });

  /* ---------- Events film: load and play only while on screen ---------- */
  const eventsVideo = $('.events__video');
  if (eventsVideo && canPlayVideo) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!eventsVideo.src) eventsVideo.src = eventsVideo.dataset.src;
        eventsVideo.play().catch(() => {});
      } else if (eventsVideo.src) eventsVideo.pause();
    }, { threshold: 0.25 }).observe(eventsVideo);
  }

  /* ---------- Header: condense on scroll, hide while scrolling down ---------- */
  const header = $('[data-header]');
  let lastY = scrollY, menuOpen = false;
  function onScroll() {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const delta = y - lastY;
    if (Math.abs(delta) > 6) {
      const hide = delta > 0 && y > innerHeight * 0.9 && !menuOpen && !header.contains(document.activeElement);
      header.classList.toggle('is-hidden', hide);
      lastY = y;
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Scrollspy ---------- */
  const spyLinks = $$('[data-spy]');
  const spyIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      spyLinks.forEach((a) => (a.hash === `#${e.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => spyIO.observe(s));

  /* ---------- Mobile navigation ---------- */
  const toggle = $('[data-menu-toggle]');
  const mobileNav = $('[data-mobile-nav]');
  const inertTargets = [$('main'), $('.site-footer'), $('[data-fab]')];
  function setMenu(open) {
    menuOpen = open;
    mobileNav.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    $('.visually-hidden', toggle).textContent = open ? 'Close menu' : 'Open menu';
    document.body.classList.toggle('is-locked', open);
    root.classList.toggle('menu-open', open);
    inertTargets.forEach((el) => el && (el.inert = open));
    header.classList.remove('is-hidden');
    if (open) $('a', mobileNav).focus();
  }
  toggle.addEventListener('click', () => setMenu(!menuOpen));
  mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (!menuOpen) return;
    if (e.key === 'Escape') { setMenu(false); toggle.focus(); }
    if (e.key === 'Tab') { // keep focus within the toggle + menu links
      const items = [toggle, ...$$('a', mobileNav)];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  matchMedia('(min-width: 941px)').addEventListener('change', (m) => { if (m.matches && menuOpen) setMenu(false); });

  /* ---------- Parallax ---------- */
  const parallaxEls = $$('[data-parallax]');
  if (!reduceMotion && parallaxEls.length) {
    const active = new Set();
    const pIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      e.isIntersecting ? active.add(e.target) : active.delete(e.target);
    }), { rootMargin: '20% 0px' });
    parallaxEls.forEach((el) => pIO.observe(el.parentElement));
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight;
      parallaxEls.forEach((el) => {
        const ref = el.parentElement;
        if (!active.has(ref)) return;
        const r = ref.getBoundingClientRect();
        const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
        el.style.transform = `translate3d(0, ${(p * +el.dataset.parallax * r.height).toFixed(1)}px, 0)`;
      });
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    update();
  }

  /* ---------- Menu tabs ---------- */
  const tabsRoot = $('[data-tabs]');
  if (tabsRoot) {
    const list = $('[role="tablist"]', tabsRoot);
    const tabs = $$('[role="tab"]', tabsRoot);
    const ink = $('.tabs__ink', tabsRoot);
    const panels = $$('[role="tabpanel"]', tabsRoot);

    const moveInk = (tab) => {
      ink.style.setProperty('--ink-x', `${tab.offsetLeft}px`);
      ink.style.setProperty('--ink-w', `${tab.offsetWidth}px`);
    };
    const activate = (tab, focus = false) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => {
        const on = p.id === tab.getAttribute('aria-controls');
        p.classList.toggle('is-active', on);
        if (on && !reduceMotion) {
          $$('.dish', p).forEach((d, i) => d.style.setProperty('--i', i));
          p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering');
        }
      });
      moveInk(tab);
      list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (focus) tab.focus();
    };
    tabs.forEach((t) => t.addEventListener('click', () => activate(t)));
    list.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      activate(tabs[(map[e.key] + tabs.length) % tabs.length], true);
    });
    $$('[data-open-tab]').forEach((a) => a.addEventListener('click', () => {
      const t = tabs.find((x) => x.dataset.tab === a.dataset.openTab);
      t && activate(t);
    }));
    const selected = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    moveInk(selected());
    document.fonts && document.fonts.ready.then(() => moveInk(selected()));
    addEventListener('resize', debounce(() => moveInk(selected()), 150));

    /* hovering a dish that has a photo shows it in the panel's feature frame */
    const wide = matchMedia('(min-width: 1000px) and (hover: hover)');
    panels.forEach((panel) => {
      const figure = $('.menu__feature', panel);
      const img = $('img', figure);
      const cap = $('figcaption', figure);
      const original = { src: img.currentSrc || img.src, srcset: img.srcset, alt: img.alt, cap: cap.innerHTML };
      let timer;
      const show = (s) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (img.getAttribute('src') === s.src && !img.srcset === !s.srcset) return;
          const pre = new Image(); pre.src = s.src;
          figure.classList.add('is-swapping');
          const swap = () => {
            img.srcset = s.srcset || ''; img.src = s.src; img.alt = s.alt; cap.innerHTML = s.cap;
            requestAnimationFrame(() => figure.classList.remove('is-swapping'));
          };
          (pre.decode ? pre.decode() : Promise.resolve()).then(swap, swap);
        }, 90);
      };
      $$('.dish[data-feature]', panel).forEach((dish) => {
        dish.addEventListener('mouseenter', () => {
          if (!wide.matches) return;
          const label = $('h3', dish).textContent.replace('✦', '').trim();
          const cat = $('span', cap) ? $('span', cap).outerHTML : '';
          show({ src: dish.dataset.feature, srcset: '', alt: `${label} at Maya`, cap: `${cat}${label}` });
        });
      });
      $('.dishes', panel).addEventListener('mouseleave', () => { if (wide.matches) show(original); });
    });
  }

  /* ---------- Gallery: filters + lightbox ---------- */
  const tiles = $$('.tile');
  const live = document.createElement('p');
  live.className = 'visually-hidden'; live.setAttribute('aria-live', 'polite');
  $('[data-gallery]') && $('[data-gallery]').after(live);

  $$('[data-filter]').forEach((btn, _, all) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    all.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    let n = 0;
    tiles.forEach((t) => {
      const show = f === 'all' || t.dataset.cat === f;
      t.classList.toggle('is-hidden', !show);
      if (show) { n++; t.classList.remove('is-filtering'); void t.offsetWidth; t.classList.add('is-filtering'); }
    });
    live.textContent = `Showing ${n} photos`;
  }));

  const lb = $('[data-lightbox]');
  if (lb && typeof lb.showModal === 'function') {
    const lbImg = $('[data-lb-img]', lb), lbCap = $('[data-lb-cap]', lb), lbCount = $('[data-lb-count]', lb);
    let items = [], index = 0, opener = null;

    const render = () => {
      const btn = items[index];
      const thumb = $('img', btn);
      lbImg.classList.add('is-loading');
      const src = btn.dataset.full;
      const pre = new Image(); pre.src = src;
      const done = () => {
        lbImg.src = src; lbImg.alt = thumb.alt;
        lbImg.width = thumb.width; lbImg.height = thumb.height;
        requestAnimationFrame(() => lbImg.classList.remove('is-loading'));
      };
      (pre.decode ? pre.decode() : Promise.resolve()).then(done, done);
      lbCap.textContent = $('.tile__cap', btn).textContent;
      lbCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      [index - 1, index + 1].forEach((j) => { const b = items[(j + items.length) % items.length]; if (b) new Image().src = b.dataset.full; });
    };
    const go = (d) => { index = (index + d + items.length) % items.length; render(); };
    const open = (btn) => {
      items = tiles.filter((t) => !t.classList.contains('is-hidden')).map((t) => $('.tile__btn', t));
      index = items.indexOf(btn); opener = btn;
      render();
      lb.showModal();
      document.body.classList.add('is-locked');
      $('[data-lb-close]', lb).focus();
    };
    const close = () => lb.open && lb.close();
    lb.addEventListener('close', () => { document.body.classList.remove('is-locked'); opener && opener.focus(); });

    $$('.tile__btn').forEach((b) => b.addEventListener('click', () => open(b)));
    $('[data-lb-prev]', lb).addEventListener('click', () => go(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => go(1));
    $('[data-lb-close]', lb).addEventListener('click', close);
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__stage')) close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    let x0 = null;
    lb.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50 && e.pointerType !== 'mouse') go(dx < 0 ? 1 : -1);
    });
  }

  /* ---------- Reservation form ---------- */
  const form = $('[data-booking]');
  if (form) {
    const f = (n) => form.elements[n];
    const summary = $('[data-error-summary]', form);
    const submitBtn = $('[data-submit]', form);
    const confirmEl = $('[data-confirm]');
    const guestHint = $('[data-guest-hint]', form);
    const SLOTS = { Breakfast: [420, 630], Lunch: [660, 930], Dinner: [960, 1350] }; // minutes since midnight, 30-min steps
    const today = klNow().date;
    f('date').min = today;
    f('date').max = addDays(today, 90);
    const defaultDate = () => { // today, unless the last seating has already passed
      f('date').value = klNow().date;
      buildTimes();
      if (f('time').dataset.available === '0') f('date').value = addDays(klNow().date, 1);
    };

    function buildTimes() {
      const sel = f('time'), prev = sel.value;
      const now = klNow();
      const cutoff = f('date').value === now.date ? now.minutes + 30 : -1;
      sel.length = 1;
      let available = 0;
      Object.entries(SLOTS).forEach(([label, [a, b]]) => {
        const og = document.createElement('optgroup'); og.label = label;
        for (let m = a; m <= b; m += 30) {
          const o = new Option(fmtTime(m), String(m));
          if (m < cutoff) o.disabled = true; else available++;
          og.append(o);
        }
        sel.append(og);
      });
      const keep = [...sel.options].find((o) => o.value === prev && !o.disabled);
      sel.value = keep ? prev : '';
      sel.dataset.available = String(available);
    }
    defaultDate();
    buildTimes();

    const setGuests = (n) => {
      const v = Math.max(1, Math.min(30, n || 1));
      f('guests').value = v;
      $$('[data-step]', form).forEach((b) => { b.disabled = (+b.dataset.step < 0 && v <= 1) || (+b.dataset.step > 0 && v >= 30); });
      const big = v >= 13;
      guestHint.textContent = big ? 'A big table. We’ll call to plan it with you.' : 'Up to 12 online, more by arrangement.';
      guestHint.classList.toggle('is-warn', big);
    };
    $$('[data-step]', form).forEach((b) => b.addEventListener('click', () => { setGuests(+f('guests').value + +b.dataset.step); validate('guests'); }));
    f('guests').addEventListener('change', () => setGuests(parseInt(f('guests').value, 10)));
    setGuests(2);

    const notes = f('notes'), countOut = $('[data-count-out]', form);
    notes.addEventListener('input', () => { countOut.textContent = notes.value.length; });

    const rules = {
      date: () => {
        const v = f('date').value;
        if (!v) return 'Choose the day you’d like to visit.';
        if (v < f('date').min) return 'That date has passed. Choose today or later.';
        if (v > f('date').max) return 'We take bookings up to 90 days ahead.';
        return '';
      },
      time: () => {
        if (f('time').dataset.available === '0') return 'We’re closing soon today. Please choose another date.';
        return f('time').value ? '' : 'Choose a time.';
      },
      guests: () => {
        const n = Number(f('guests').value);
        return Number.isInteger(n) && n >= 1 && n <= 30 ? '' : 'Enter between 1 and 30 guests.';
      },
      name: () => (f('name').value.trim().length >= 2 ? '' : 'Tell us the name for the booking.'),
      phone: () => {
        const v = f('phone').value.trim();
        if (!v && !f('email').value.trim()) return 'Add a phone number or email so we can confirm.';
        if (v && !/^\+?[\d\s\-()]{7,20}$/.test(v)) return 'Use digits only, like 012-345 6789.';
        const digits = v.replace(/\D/g, '').length;
        if (v && (digits < 9 || digits > 15)) return 'That number looks too short or too long.';
        return '';
      },
      email: () => {
        const v = f('email').value.trim();
        return v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Check the email address, e.g. name@example.com.' : '';
      },
    };
    const labels = { date: 'Date', time: 'Time', guests: 'Guests', name: 'Full name', phone: 'Phone', email: 'Email' };

    function validate(name) {
      const el = f(name);
      const msg = rules[name]();
      const out = $(`#${el.id}-err`);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (out) out.textContent = msg;
      return msg;
    }
    Object.keys(rules).forEach((n) => {
      f(n).addEventListener('blur', () => { if (f(n).value || f(n).getAttribute('aria-invalid') === 'true') validate(n); });
      f(n).addEventListener('input', () => { if (f(n).getAttribute('aria-invalid') === 'true') validate(n); });
    });
    // phone and email satisfy one requirement together
    ['phone', 'email'].forEach((n) => f(n).addEventListener('input', () => {
      if (f('phone').getAttribute('aria-invalid') === 'true') validate('phone');
    }));
    f('date').addEventListener('change', () => { buildTimes(); validate('date'); if (f('time').getAttribute('aria-invalid') === 'true') validate('time'); });

    const ref = () => {
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const rnd = crypto.getRandomValues(new Uint8Array(4));
      return `MAYA-${f('date').value.slice(8, 10)}${f('date').value.slice(5, 7)}-${[...rnd].map((b) => abc[b % abc.length]).join('')}`;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errors = Object.keys(rules).map((n) => [n, validate(n)]).filter(([, m]) => m);
      if (errors.length) {
        $('ul', summary).innerHTML = errors.map(([n, m]) => `<li><a href="#${f(n).id}">${labels[n]}: ${m}</a></li>`).join('');
        summary.hidden = false;
        summary.focus();
        return;
      }
      summary.hidden = true;
      const data = Object.fromEntries(new FormData(form));
      data.reference = ref();
      data.timeLabel = fmtTime(+data.time);

      submitBtn.classList.add('is-busy');
      submitBtn.setAttribute('aria-disabled', 'true');
      $('.btn__label', submitBtn).textContent = 'Sending…';
      let sent = false;
      const endpoint = form.dataset.endpoint;
      try {
        if (endpoint) {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data),
          });
          sent = res.ok;
        } else {
          await new Promise((r) => setTimeout(r, 900));
        }
      } catch (_) { sent = false; }
      submitBtn.classList.remove('is-busy');
      submitBtn.removeAttribute('aria-disabled');
      $('.btn__label', submitBtn).textContent = 'Request my table';
      showConfirmation(data, sent);
    });

    summary.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault(); $(a.hash).focus();
    });

    function showConfirmation(d, sent) {
      const first = d.name.trim().split(/\s+/)[0];
      const guests = `${d.guests} ${+d.guests === 1 ? 'guest' : 'guests'}`;
      $('[data-c-name]', confirmEl).textContent = first;
      $('[data-c-date]', confirmEl).textContent = fmtDate(d.date);
      $('[data-c-time]', confirmEl).textContent = d.timeLabel;
      $('[data-c-guests]', confirmEl).textContent = guests;
      $('[data-c-ref]', confirmEl).textContent = d.reference;
      $('[data-confirm-eyebrow]', confirmEl).textContent = sent ? 'Request received' : 'Request ready';
      $('[data-confirm-title]', confirmEl).firstChild.textContent = sent ? 'Thank you, ' : 'Almost there, ';
      $('[data-confirm-lede]', confirmEl).textContent = sent
        ? 'We have your request and will confirm your table by WhatsApp or phone shortly. Keep your reference handy.'
        : 'Tap “Send on WhatsApp” and your request goes straight to our floor team. We’ll confirm your table from there.';

      const lines = [
        'Hi Maya @ Solaris! I’d like to reserve a table.',
        `Name: ${d.name.trim()}`,
        `Date: ${fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`,
        `Time: ${d.timeLabel}`,
        `Guests: ${d.guests}`,
        d.occasion && `Occasion: ${d.occasion}`,
        d.phone && `Phone: ${d.phone.trim()}`,
        d.email && `Email: ${d.email.trim()}`,
        d.notes && `Requests: ${d.notes.trim()}`,
        `Ref: ${d.reference}`,
      ].filter(Boolean);
      $('[data-c-whatsapp]', confirmEl).href = `https://wa.me/${PHONE_WA}?text=${encodeURIComponent(lines.join('\n'))}`;
      $('[data-c-ics]', confirmEl).onclick = () => downloadICS(d);

      form.hidden = true;
      confirmEl.hidden = false;
      const title = $('[data-confirm-title]', confirmEl);
      title.focus({ preventScroll: true });
      confirmEl.closest('.booking-card').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    function downloadICS(d) {
      const start = new Date(`${d.date}T00:00:00Z`);
      start.setUTCMinutes(+d.time - 8 * 60); // Kuala Lumpur is UTC+8 all year
      const end = new Date(start.getTime() + 90 * 60000);
      const stamp = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const esc = (s) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maya Solaris//Booking//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        `UID:${d.reference}@maya-solaris`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
        `SUMMARY:${esc(`Table at Maya @ Solaris (${d.guests})`)}`,
        `LOCATION:${esc('Maya @ Solaris, 1 Jalan Solaris 2, Solaris Mont Kiara, 50480 Kuala Lumpur')}`,
        `DESCRIPTION:${esc(`Reference ${d.reference}. Call or WhatsApp 012-395 2153 to change your booking.`)}`,
        'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = `maya-booking-${d.reference}.ics`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    $('[data-c-again]', confirmEl).addEventListener('click', () => {
      form.reset();
      defaultDate(); buildTimes(); setGuests(2); countOut.textContent = '0';
      Object.keys(rules).forEach((n) => { f(n).removeAttribute('aria-invalid'); const o = $(`#${f(n).id}-err`); if (o) o.textContent = ''; });
      confirmEl.hidden = true; form.hidden = false;
      f('date').focus();
    });
  }

  /* ---------- Open-now status ---------- */
  const status = $('[data-open-status]');
  function updateStatus() {
    if (!status) return;
    const m = klNow().minutes, open = 420, close = 1380;
    const isOpen = m >= open && m < close;
    status.classList.toggle('is-open', isOpen);
    status.classList.toggle('is-closed', !isOpen);
    $('span', status).textContent = isOpen
      ? (close - m <= 45 ? 'Open now · closing at 11pm' : 'Open now · until 11pm')
      : 'Closed now · opens at 7am';
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Floating reserve button (mobile) ---------- */
  const fab = $('[data-fab]');
  if (fab) {
    const state = { pastHero: false, nearForm: false };
    const sync = () => fab.classList.toggle('is-visible', state.pastHero && !state.nearForm && !menuOpen);
    hero && new IntersectionObserver(([e]) => { state.pastHero = !e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(hero);
    const near = new Set();
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? near.add(e.target) : near.delete(e.target)));
      state.nearForm = near.size > 0; sync();
    }).observe($('#reserve'));
    toggle.addEventListener('click', sync);
  }

  /* ---------- Misc ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
})();
