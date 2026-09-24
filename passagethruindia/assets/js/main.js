/* Passage Thru' India — site interactions (no dependencies) */
(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     Config
     --------------------------------------------------------------------- */
  const TZ = 'Asia/Kuala_Lumpur';
  const UTC_OFFSET_HOURS = 8; // Malaysia does not observe DST
  // Sessions as [open, close] in restaurant local time.
  const HOURS = {
    weekday: [['11:30', '15:00'], ['18:00', '22:00']],
    weekend: [['12:00', '15:00'], ['18:00', '22:00']],
  };
  const SESSION_NAMES = ['Lunch', 'Dinner'];
  const SLOT_STEP = 30;          // minutes between bookable slots
  const LAST_SEATING = 60;       // last slot is this many minutes before close
  const LEAD_TIME = 60;          // earliest same-day slot is now + this many minutes
  const BOOKING_WINDOW_DAYS = 90;
  const MAX_GUESTS = 12;
  const ADDRESS = '4 Jalan Delima, off Jalan Bukit Bintang, 50400 Kuala Lumpur';
  const PHONE = '+60 17-998 9427';

  /* ---------------------------------------------------------------------
     Helpers
     --------------------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const root = document.documentElement;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const pad = (n) => String(n).padStart(2, '0');

  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${pad(m)} ${suffix}`;
  };

  /** Current date/time in Kuala Lumpur, independent of the visitor's timezone. */
  const klNow = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    const y = get('year');
    const mo = get('month');
    const d = get('day');
    return {
      iso: `${y}-${pad(mo)}-${pad(d)}`,
      weekday: new Date(Date.UTC(y, mo - 1, d)).getUTCDay(),
      minutes: get('hour') * 60 + get('minute'),
    };
  };

  const parseISODate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };

  const addDaysISO = (iso, days) => {
    const date = parseISODate(iso);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const sessionsFor = (weekday) =>
    (weekday === 0 || weekday === 6 ? HOURS.weekend : HOURS.weekday).map(([o, c]) => [toMinutes(o), toMinutes(c)]);

  /* ---------------------------------------------------------------------
     Split headlines into words for staggered entrances
     --------------------------------------------------------------------- */
  const splitHeadlines = () => {
    $$('[data-split]').forEach((el) => {
      const label = el.textContent.replace(/\s+/g, ' ').trim();
      let index = 0;

      const splitNode = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((token) => {
              if (!token) return;
              if (/^\s+$/.test(token)) {
                frag.appendChild(document.createTextNode(' '));
                return;
              }
              const outer = document.createElement('span');
              const inner = document.createElement('span');
              outer.className = 'w';
              inner.className = 'w__i';
              inner.style.setProperty('--i', index++);
              inner.textContent = token;
              outer.appendChild(inner);
              frag.appendChild(outer);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            splitNode(child);
          }
        });
      };

      splitNode(el);
      // Screen readers get the sentence once, not word-by-word fragments.
      el.setAttribute('aria-label', label);
      Array.from(el.children).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    });
  };

  /* ---------------------------------------------------------------------
     Intro: loader out, hero sequence in
     --------------------------------------------------------------------- */
  const initIntro = () => {
    const heroImg = $('.hero__img');
    const heroTitle = $('.hero__title');
    const firstVisit = (() => {
      try {
        const seen = sessionStorage.getItem('pti-intro');
        sessionStorage.setItem('pti-intro', '1');
        return !seen;
      } catch (_) {
        return true;
      }
    })();

    const imageReady = heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();
    const fontsReady = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    const minimum = wait(firstVisit && !reducedMotion() ? 700 : 0);
    const ceiling = wait(2200);

    Promise.race([Promise.all([imageReady, fontsReady, minimum]), ceiling]).then(() => {
      root.classList.add('is-loaded');
      requestAnimationFrame(() => {
        root.classList.add('is-ready');
        if (heroTitle) heroTitle.classList.add('is-in');
      });
    });
  };

  /* ---------------------------------------------------------------------
     Header: scrolled state, hide on scroll down, progress, FAB, active link
     --------------------------------------------------------------------- */
  const initHeader = () => {
    const header = $('[data-header]');
    const progress = $('[data-progress]');
    const fab = $('[data-fab]');
    const reserve = $('#reserve');
    const footer = $('.site-footer');
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const menuOpen = header.classList.contains('menu-open');

      header.classList.toggle('is-scrolled', y > 24);
      if (!menuOpen) {
        if (y > lastY + 4 && y > vh * 0.6) header.classList.add('is-hidden');
        else if (y < lastY - 4 || y < vh * 0.6) header.classList.remove('is-hidden');
      }

      const max = document.documentElement.scrollHeight - vh;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

      if (fab) {
        const inView = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.top < vh * 0.85 && r.bottom > 0;
        };
        fab.classList.toggle('is-visible', y > vh * 0.7 && !inView(reserve) && !inView(footer) && !menuOpen);
      }

      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    // Reveal the header whenever keyboard focus lands in it.
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

    // Active section highlighting
    const links = $$('[data-nav]');
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window && sections.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => {
            const active = a.getAttribute('href') === `#${entry.target.id}`;
            a.classList.toggle('is-active', active);
            if (active) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => io.observe(s));
    }
  };

  /* ---------------------------------------------------------------------
     Mobile menu
     --------------------------------------------------------------------- */
  const initMobileMenu = () => {
    const toggle = $('[data-menu-toggle]');
    const menu = $('[data-mobile-menu]');
    const header = $('[data-header]');
    if (!toggle || !menu) return;
    const label = $('.menu-toggle__label', toggle);
    const background = [$('main'), $('.site-footer'), $('[data-fab]'), $('.skip-link')].filter(Boolean);
    let open = false;

    const setOpen = (next, { returnFocus = false } = {}) => {
      if (next === open) return;
      open = next;
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
      header.classList.toggle('menu-open', open);
      header.classList.remove('is-hidden');
      root.classList.toggle('is-locked', open);
      background.forEach((el) => { el.inert = open; });

      if (open) {
        menu.hidden = false;
        requestAnimationFrame(() => {
          menu.classList.add('is-open');
          const first = $('a', menu);
          if (first) first.focus({ preventScroll: true });
        });
      } else {
        menu.classList.remove('is-open');
        const hide = () => { if (!open) menu.hidden = true; };
        if (reducedMotion()) hide();
        else setTimeout(hide, 650);
        if (returnFocus) toggle.focus();
      }
    };

    toggle.addEventListener('click', () => setOpen(!open, { returnFocus: open }));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) setOpen(false, { returnFocus: true });
    });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  };

  /* ---------------------------------------------------------------------
     Scroll reveals & count-ups
     --------------------------------------------------------------------- */
  const initReveals = () => {
    const targets = $$('[data-reveal], [data-split]:not(.hero__title)');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  };

  const initCounters = () => {
    const counters = $$('[data-count]');
    if (!counters.length || reducedMotion() || !('IntersectionObserver' in window)) return;

    const run = (el) => {
      const to = Number(el.dataset.count);
      const from = Number(el.dataset.countFrom || 0);
      const duration = 1600;
      const start = performance.now();
      const step = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach((el) => {
      el.textContent = el.dataset.countFrom || '0';
      io.observe(el);
    });
  };

  /* ---------------------------------------------------------------------
     Parallax (desktop, motion allowed)
     --------------------------------------------------------------------- */
  const initParallax = () => {
    const items = $$('[data-parallax]');
    const heroMedia = $('[data-hero-media]');
    const wide = window.matchMedia('(min-width: 900px)');
    let ticking = false;

    const reset = () => {
      items.forEach((el) => { el.style.translate = ''; el._py = 0; });
      if (heroMedia) heroMedia.style.translate = '';
    };

    const update = () => {
      ticking = false;
      if (reducedMotion() || !wide.matches) return reset();
      const vh = window.innerHeight;

      items.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0;
        const rect = el.getBoundingClientRect();
        const baseTop = rect.top - (el._py || 0);
        if (baseTop > vh * 1.5 || baseTop + rect.height < -vh * 0.5) return;
        const offset = baseTop + rect.height / 2 - vh / 2;
        el._py = -offset * speed;
        el.style.translate = `0 ${el._py.toFixed(1)}px`;
      });

      if (heroMedia && window.scrollY < vh * 1.2) {
        heroMedia.style.translate = `0 ${(window.scrollY * 0.22).toFixed(1)}px`;
      }
    };

    const request = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    motionQuery.addEventListener('change', request);
    update();
  };

  /* ---------------------------------------------------------------------
     Accessible tabs (menu categories & journey regions)
     --------------------------------------------------------------------- */
  const createTabs = (tablist, { onChange } = {}) => {
    const tabs = $$('[role="tab"]', tablist);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    let current = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));

    const select = (index, { focus = false } = {}) => {
      index = (index + tabs.length) % tabs.length;
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].classList.toggle('is-active', active);
      });
      if (focus) tabs[index].focus();
      const changed = index !== current;
      current = index;
      if (onChange) onChange(index, tabs[index], panels[index], changed);
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (e.key in keys) {
          e.preventDefault();
          select(current + keys[e.key], { focus: true });
        } else if (e.key === 'Home') {
          e.preventDefault();
          select(0, { focus: true });
        } else if (e.key === 'End') {
          e.preventDefault();
          select(tabs.length - 1, { focus: true });
        }
      });
    });

    select(current);
    return { select, get current() { return current; }, tabs, panels };
  };

  const initMenuTabs = () => {
    const tablist = $('.tabs__list');
    if (!tablist) return;
    const wrap = tablist.parentElement;
    const indicator = $('.tabs__indicator', tablist);

    const moveIndicator = (tab) => {
      if (!indicator || !tab) return;
      indicator.style.setProperty('--w', `${tab.offsetWidth}px`);
      indicator.style.setProperty('--x', `${tab.offsetLeft}px`);
    };

    const tabs = createTabs(tablist, {
      onChange: (i, tab, panel, changed) => {
        moveIndicator(tab);
        if (changed && wrap.scrollWidth > wrap.clientWidth) {
          wrap.scrollTo({
            left: tab.offsetLeft - (wrap.clientWidth - tab.offsetWidth) / 2,
            behavior: reducedMotion() ? 'auto' : 'smooth',
          });
        }
      },
    });

    const refresh = () => moveIndicator(tabs.tabs[tabs.current]);
    window.addEventListener('resize', refresh);
    if (document.fonts) document.fonts.ready.then(refresh);
  };

  /* ---------------------------------------------------------------------
     Journey map
     --------------------------------------------------------------------- */
  const initJourney = () => {
    const container = $('[data-journey]');
    if (!container) return;
    const tablist = $('[role="tablist"]', container);
    const live = $('[data-route-live]', container);
    let stops = null;
    let total = 0;

    // Map each pin to its distance along the route so the saffron line can "travel".
    const measure = () => {
      if (!live) return false;
      try {
        total = live.getTotalLength();
      } catch (_) {
        total = 0;
      }
      if (!total) return false;
      const samples = 400;
      const points = [];
      for (let s = 0; s <= samples; s++) {
        const len = (total * s) / samples;
        points.push({ len, p: live.getPointAtLength(len) });
      }
      stops = $$('[role="tab"]', tablist).map((pin) => {
        const x = Number(pin.dataset.x);
        const y = Number(pin.dataset.y);
        return points.reduce((best, pt) => {
          const d = (pt.p.x - x) ** 2 + (pt.p.y - y) ** 2;
          return d < best.d ? { d, len: pt.len } : best;
        }, { d: Infinity, len: 0 }).len;
      });
      live.style.strokeDasharray = `${total} ${total}`;
      return true;
    };

    let drawn = false;
    const drawTo = (index) => {
      if (!stops && !measure()) return;
      if (!drawn) live.style.transition = 'none'; // first paint: no animation from zero
      live.style.strokeDashoffset = String(total - stops[index]);
      if (!drawn) {
        live.getBoundingClientRect();
        live.style.transition = '';
        drawn = true;
      }
    };

    const tabs = createTabs(tablist, {
      onChange: (index, tab, panel, changed) => {
        drawTo(index);
        if (changed && tab.scrollIntoView && tablist.scrollWidth > tablist.clientWidth) {
          tablist.scrollTo({
            left: tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2,
            behavior: reducedMotion() ? 'auto' : 'smooth',
          });
        }
      },
    });

    $$('[data-region-next]', container).forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.select(tabs.current + 1);
        const panel = tabs.panels[tabs.current];
        const heading = $('.region__name', panel);
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
        const rect = panel.getBoundingClientRect();
        if (rect.top < 80 || rect.top > window.innerHeight * 0.6) {
          panel.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
        }
      });
    });

    window.addEventListener('resize', () => { stops = null; drawTo(tabs.current); });
  };

  /* ---------------------------------------------------------------------
     Horizontal interiors scroller: buttons + mouse drag
     --------------------------------------------------------------------- */
  const initScroller = () => {
    const track = $('[data-scroller]');
    if (!track) return;
    const prev = $('[data-scroll-prev]');
    const next = $('[data-scroll-next]');
    const behavior = () => (reducedMotion() ? 'auto' : 'smooth');

    const updateButtons = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };

    const page = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.75, behavior: behavior() });
    if (prev) prev.addEventListener('click', () => page(-1));
    if (next) next.addEventListener('click', () => page(1));
    track.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    updateButtons();

    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let moved = false;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
    });
    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        track.classList.add('is-dragging');
        track.setPointerCapture(e.pointerId);
      }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        track.classList.remove('is-dragging');
        if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
        // Let scroll-snap settle on the nearest card.
        const card = track.firstElementChild;
        if (card) {
          const w = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
          track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: behavior() });
        }
      }
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
  };

  /* ---------------------------------------------------------------------
     Gallery lightbox
     --------------------------------------------------------------------- */
  const initLightbox = () => {
    const dialog = $('[data-lightbox]');
    const triggers = $$('[data-gallery] .g__btn');
    if (!dialog || !triggers.length) return;

    const img = $('[data-lb-img]', dialog);
    const cap = $('[data-lb-cap]', dialog);
    const count = $('[data-lb-count]', dialog);
    const supportsDialog = typeof dialog.showModal === 'function';
    let index = 0;
    let opener = null;

    const items = triggers.map((btn) => {
      const thumb = $('img', btn);
      return { srcset: thumb.getAttribute('srcset'), src: thumb.getAttribute('src'), alt: thumb.alt, caption: btn.dataset.caption || thumb.alt };
    });

    const largest = (srcset) => srcset.split(',').map((s) => s.trim().split(' ')[0]).pop();

    const preload = (i) => {
      const item = items[(i + items.length) % items.length];
      const pre = new Image();
      pre.sizes = '(min-width: 900px) 80vw, 100vw';
      pre.srcset = item.srcset;
    };

    const render = async (i, animate) => {
      index = (i + items.length) % items.length;
      const item = items[index];
      if (animate && !reducedMotion()) {
        dialog.classList.add('is-switching');
        await wait(220);
      }
      img.sizes = '(min-width: 900px) 80vw, 100vw';
      img.srcset = item.srcset;
      img.src = item.src;
      img.alt = item.alt;
      cap.textContent = item.caption;
      count.textContent = `${pad(index + 1)} / ${pad(items.length)}`;
      try { await img.decode(); } catch (_) { /* show anyway */ }
      dialog.classList.remove('is-switching');
      preload(index + 1);
      preload(index - 1);
    };

    const open = (i) => {
      if (!supportsDialog) {
        window.open(largest(items[i].srcset), '_blank', 'noopener');
        return;
      }
      opener = triggers[i];
      render(i, false);
      dialog.showModal();
      root.classList.add('is-locked');
    };

    triggers.forEach((btn, i) => btn.addEventListener('click', () => open(i)));
    $('[data-lb-prev]', dialog).addEventListener('click', () => render(index - 1, true));
    $('[data-lb-next]', dialog).addEventListener('click', () => render(index + 1, true));
    $('[data-lb-close]', dialog).addEventListener('click', () => dialog.close());

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); render(index + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(index - 1, true); }
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.classList.contains('lightbox__inner')) dialog.close();
    });
    dialog.addEventListener('close', () => {
      root.classList.remove('is-locked');
      if (opener) opener.focus({ preventScroll: true });
    });

    let touchX = null;
    dialog.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) render(index + (dx < 0 ? 1 : -1), true);
      touchX = null;
    });
  };

  /* ---------------------------------------------------------------------
     Testimonials carousel
     --------------------------------------------------------------------- */
  const initCarousel = () => {
    const root_ = $('[data-carousel]');
    if (!root_) return;
    const slidesWrap = $('[data-slides]', root_);
    const slides = $$('.voice', slidesWrap);
    const dotsWrap = $('[data-dots]', root_);
    const toggle = $('[data-autoplay]', root_);
    const INTERVAL = 7000;
    let index = 0;
    let timer = null;
    let userPaused = reducedMotion();
    let hoverPaused = false;
    let visible = false;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'voices__dot';
      b.setAttribute('aria-label', `Show review ${i + 1} of ${slides.length}`);
      b.addEventListener('click', () => { go(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => {
        const active = n === index;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach((d, n) => d.setAttribute('aria-current', String(n === index)));
    }

    const playing = () => !userPaused && !hoverPaused && visible;

    function restart() {
      clearInterval(timer);
      timer = null;
      slidesWrap.setAttribute('aria-live', !userPaused ? 'off' : 'polite');
      if (playing()) timer = setInterval(() => go(index + 1), INTERVAL);
    }

    $('[data-prev]', root_).addEventListener('click', () => { go(index - 1); restart(); });
    $('[data-next]', root_).addEventListener('click', () => { go(index + 1); restart(); });

    if (toggle) {
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.addEventListener('click', () => {
        userPaused = !userPaused;
        toggle.setAttribute('aria-pressed', String(userPaused));
        restart();
      });
    }

    const stage = $('.voices__stage', root_);
    stage.addEventListener('mouseenter', () => { hoverPaused = true; restart(); });
    stage.addEventListener('mouseleave', () => { hoverPaused = false; restart(); });
    stage.addEventListener('focusin', () => { hoverPaused = true; restart(); });
    stage.addEventListener('focusout', (e) => {
      if (!stage.contains(e.relatedTarget)) { hoverPaused = false; restart(); }
    });

    let touchX = null;
    stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) { go(index + (dx < 0 ? 1 : -1)); restart(); }
      touchX = null;
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); }, { threshold: 0.3 }).observe(root_);
    } else {
      visible = true;
    }

    go(0);
    restart();
  };

  /* ---------------------------------------------------------------------
     Opening status (hero + visit section)
     --------------------------------------------------------------------- */
  const initOpenStatus = () => {
    const heroKey = $('[data-open-status]');
    const heroDetail = $('[data-open-detail]');
    const badge = $('[data-open-badge]');

    const compute = () => {
      const now = klNow();
      const today = sessionsFor(now.weekday);
      const openSession = today.find(([o, c]) => now.minutes >= o && now.minutes < c);
      if (openSession) return { open: true, text: `Until ${formatTime(openSession[1])}` };
      const laterToday = today.find(([o]) => o > now.minutes);
      if (laterToday) return { open: false, text: `Opens ${formatTime(laterToday[0])}` };
      const tomorrow = sessionsFor((now.weekday + 1) % 7)[0];
      return { open: false, text: `Opens tomorrow ${formatTime(tomorrow[0])}` };
    };

    const render = () => {
      const now = klNow();
      const status = compute();
      if (heroKey) {
        heroKey.textContent = status.open ? 'Open now' : 'Closed now';
        heroKey.classList.toggle('is-open', status.open);
      }
      if (heroDetail) heroDetail.textContent = status.text;
      if (badge) {
        badge.hidden = false;
        badge.textContent = status.open ? 'Open now' : 'Closed';
        badge.className = `status ${status.open ? 'status--open' : 'status--closed'}`;
      }
      $$('.hours tr[data-days]').forEach((row) => {
        row.classList.toggle('is-today', row.dataset.days.split(',').map(Number).includes(now.weekday));
      });
    };

    render();
    setInterval(render, 60 * 1000);
  };

  /* ---------------------------------------------------------------------
     Reservation form
     --------------------------------------------------------------------- */
  const initBooking = () => {
    const form = $('[data-booking]');
    if (!form) return;
    const success = $('[data-success]');
    const status = $('[data-form-status]');
    const submit = $('.booking__submit', form);
    const submitLabel = $('.booking__submit-label', submit);
    const f = {
      date: $('#b-date'),
      time: $('#b-time'),
      guests: $('#b-guests'),
      name: $('#b-name'),
      phone: $('#b-phone'),
      email: $('#b-email'),
      notes: $('#b-notes'),
      company: $('#b-company'),
    };
    const stepper = f.guests.closest('.stepper');
    const stepButtons = $$('[data-step]', stepper);
    const noteCount = $('[data-count-out]', form);
    const touched = new Set();
    let lastBooking = null;

    /* Date limits & time slots */
    const setDateLimits = () => {
      const now = klNow();
      f.date.min = now.iso;
      f.date.max = addDaysISO(now.iso, BOOKING_WINDOW_DAYS);
    };

    const slotsFor = (iso) => {
      const now = klNow();
      const weekday = parseISODate(iso).getUTCDay();
      return sessionsFor(weekday).map(([open, close], i) => {
        const times = [];
        for (let t = open; t <= close - LAST_SEATING; t += SLOT_STEP) {
          if (iso === now.iso && t < now.minutes + LEAD_TIME) continue;
          times.push(t);
        }
        return { name: SESSION_NAMES[i], times };
      }).filter((s) => s.times.length);
    };

    const firstBookableDate = () => {
      let iso = klNow().iso;
      for (let i = 0; i < 7 && !slotsFor(iso).length; i++) iso = addDaysISO(iso, 1);
      return iso;
    };

    const buildTimes = () => {
      const previous = f.time.value;
      f.time.innerHTML = '';
      if (!f.date.value) {
        f.time.add(new Option('Pick a date', ''));
        f.time.disabled = true;
        return;
      }
      const sessions = slotsFor(f.date.value);
      if (!sessions.length) {
        f.time.add(new Option('None left', ''));
        f.time.disabled = true;
        return;
      }
      f.time.disabled = false;
      f.time.add(new Option('Select…', ''));
      sessions.forEach((session) => {
        const group = document.createElement('optgroup');
        group.label = session.name;
        session.times.forEach((t) => {
          const value = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
          group.appendChild(new Option(formatTime(t), value));
        });
        f.time.appendChild(group);
      });
      if (previous && $(`option[value="${previous}"]`, f.time)) f.time.value = previous;
    };

    /* Guests stepper */
    const syncStepper = () => {
      const n = parseInt(f.guests.value, 10);
      stepButtons[0].disabled = !(n > 1);
      stepButtons[1].disabled = n >= MAX_GUESTS;
    };
    stepButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const n = parseInt(f.guests.value, 10) || 0;
        f.guests.value = clamp(n + Number(btn.dataset.step), 1, MAX_GUESTS);
        syncStepper();
        if (touched.has('guests')) validateField('guests');
      });
    });
    f.guests.addEventListener('input', syncStepper);

    /* Validation */
    const rules = {
      date: (v) => {
        if (!v) return 'Please choose a date.';
        if (v < f.date.min) return 'That date has passed — please choose another.';
        if (v > f.date.max) return `We take online requests up to ${BOOKING_WINDOW_DAYS} days ahead. Please call us for later dates.`;
        if (!slotsFor(v).length) return 'There are no more tables that day — please choose another date.';
        return '';
      },
      time: (v) => (v ? '' : 'Please choose a time.'),
      guests: (v) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) return 'Please enter the number of guests.';
        if (n > MAX_GUESTS) return `Online requests are for up to ${MAX_GUESTS} guests. For larger parties, please enquire about private dining.`;
        return '';
      },
      name: (v) => (v.trim().length >= 2 ? '' : 'Please tell us your name.'),
      phone: (v) => {
        const digits = v.replace(/\D/g, '');
        if (!v.trim()) return 'Please add a phone number so we can reach you on the day.';
        if (!/^\+?[\d\s\-().]+$/.test(v.trim()) || digits.length < 8 || digits.length > 15) {
          return 'Please enter a valid phone number, e.g. +60 12-345 6789.';
        }
        return '';
      },
      email: (v) => {
        if (!v.trim()) return 'Please add your email for the confirmation.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.';
      },
    };

    const errorEl = (name) => document.getElementById(`b-${name}-err`);

    function validateField(name) {
      const input = f[name];
      const message = rules[name](input.value);
      const invalid = Boolean(message);
      input.setAttribute('aria-invalid', String(invalid));
      if (name === 'guests') stepper.classList.toggle('is-invalid', invalid);
      errorEl(name).textContent = message;
      return !invalid;
    }

    Object.keys(rules).forEach((name) => {
      const input = f[name];
      const evt = input.tagName === 'SELECT' || input.type === 'date' ? 'change' : 'blur';
      input.addEventListener(evt, () => { touched.add(name); validateField(name); });
      input.addEventListener('input', () => { if (touched.has(name)) validateField(name); });
    });

    f.date.addEventListener('change', () => {
      buildTimes();
      if (touched.has('time')) validateField('time');
    });

    f.notes.addEventListener('input', () => { noteCount.textContent = f.notes.value.length; });

    /* Submission */
    const setLoading = (loading) => {
      submit.classList.toggle('is-loading', loading);
      submit.disabled = loading;
      submitLabel.textContent = loading ? 'Sending request…' : 'Request Table';
    };

    const formatDateLong = (iso) =>
      new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parseISODate(iso));

    const reference = () => `PTI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const showSuccess = (data) => {
      const guests = Number(data.guests);
      $('[data-s-name]', success).textContent = data.name.trim().split(/\s+/)[0];
      $('[data-s-date]', success).textContent = formatDateLong(data.date);
      $('[data-s-time]', success).textContent = formatTime(toMinutes(data.time));
      $('[data-s-guests]', success).textContent = `${guests} ${guests === 1 ? 'guest' : 'guests'}`;
      $('[data-s-ref]', success).textContent = data.ref;
      form.hidden = true;
      success.hidden = false;
      $('[data-success-title]', success).focus();
      const card = form.closest('.booking-card');
      const top = card.getBoundingClientRect().top;
      if (top < 0) card.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      Object.keys(rules).forEach((n) => touched.add(n));
      const invalid = Object.keys(rules).filter((n) => !validateField(n));
      if (invalid.length) {
        status.textContent = invalid.length === 1
          ? 'Please check the highlighted field.'
          : `Please check the ${invalid.length} highlighted fields.`;
        f[invalid[0]].focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      data.ref = reference();
      delete data.company;

      // Quietly drop bot submissions caught by the honeypot.
      if (f.company.value) {
        showSuccess(data);
        return;
      }

      setLoading(true);
      try {
        const endpoint = form.dataset.endpoint;
        if (endpoint) {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        } else {
          // No backend configured yet: simulate a short network round-trip.
          await wait(1100);
        }
        lastBooking = data;
        showSuccess(data);
      } catch (err) {
        status.textContent = `Sorry — we couldn’t send your request just now. Please try again, or WhatsApp us on ${PHONE}.`;
      } finally {
        setLoading(false);
      }
    });

    /* Calendar file */
    const icsDate = (iso, minutes) => {
      const [y, m, d] = iso.split('-').map(Number);
      const utc = new Date(Date.UTC(y, m - 1, d, 0, minutes) - UTC_OFFSET_HOURS * 3600 * 1000);
      return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    const escapeICS = (s) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

    $('[data-ics]', success).addEventListener('click', () => {
      if (!lastBooking) return;
      const start = toMinutes(lastBooking.time);
      const meal = start < 16 * 60 ? 'Lunch' : 'Dinner';
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Passage Thru India//Reservations//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${lastBooking.ref}@passagethruindia`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
        `DTSTART:${icsDate(lastBooking.date, start)}`,
        `DTEND:${icsDate(lastBooking.date, start + 120)}`,
        `SUMMARY:${escapeICS(`${meal} at Passage Thru’ India (${lastBooking.guests} guests)`)}`,
        `LOCATION:${escapeICS(`Passage Thru’ India, ${ADDRESS}`)}`,
        `DESCRIPTION:${escapeICS(`Table request ${lastBooking.ref}. Questions? Call or WhatsApp ${PHONE}.`)}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ];
      const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passage-thru-india-${lastBooking.date}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    /* Reset / start again */
    const resetForm = () => {
      form.reset();
      touched.clear();
      Object.keys(rules).forEach((n) => {
        f[n].removeAttribute('aria-invalid');
        errorEl(n).textContent = '';
      });
      stepper.classList.remove('is-invalid');
      status.textContent = '';
      noteCount.textContent = '0';
      setDateLimits();
      f.date.value = firstBookableDate();
      buildTimes();
      syncStepper();
    };

    $('[data-rebook]', success).addEventListener('click', () => {
      resetForm();
      success.hidden = true;
      form.hidden = false;
      f.date.focus();
    });

    /* Enquiry shortcuts from the events section */
    $$('[data-enquire]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (form.hidden) {
          resetForm();
          success.hidden = true;
          form.hidden = false;
        }
        const radio = $(`input[name="occasion"][value="${btn.dataset.enquire}"]`, form);
        if (radio) radio.checked = true;
        const section = $('#reserve');
        section.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        setTimeout(() => f.date.focus({ preventScroll: true }), reducedMotion() ? 0 : 700);
      });
    });

    resetForm();
  };

  /* ---------------------------------------------------------------------
     Map facade: load the embed only when asked
     --------------------------------------------------------------------- */
  const initMap = () => {
    const wrap = $('[data-map]');
    const btn = $('[data-map-load]');
    if (!wrap || !btn) return;
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.title = 'Map showing Passage Thru’ India on Jalan Delima, Kuala Lumpur';
      iframe.src = 'https://www.google.com/maps?q=Passage+Thru+India,+4+Jalan+Delima,+Bukit+Bintang,+Kuala+Lumpur&output=embed';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      wrap.classList.add('has-map');
      iframe.focus();
    });
  };

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  const boot = () => {
    const year = $('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());

    splitHeadlines();
    initIntro();
    initHeader();
    initMobileMenu();
    initReveals();
    initCounters();
    initParallax();
    initMenuTabs();
    initJourney();
    initScroller();
    initLightbox();
    initCarousel();
    initOpenStatus();
    initBooking();
    initMap();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
