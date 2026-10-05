(() => {
  const WHATSAPP = '60163831541';

  // Header shadow once the page scrolls
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.getElementById('nav');
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !e.target.closest('.nav, .menu-btn')) setMenu(false);
  });

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // Hide the floating WhatsApp button while the contact section is on screen
  const fab = document.querySelector('.wa-fab');
  const contact = document.getElementById('contact');
  if (fab && contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => fab.classList.toggle('hide', entry.isIntersecting), { threshold: 0.15 })
      .observe(contact);
  }

  // Gallery lightbox
  const shots = [...document.querySelectorAll('.shot')];
  const lb = document.getElementById('lightbox');
  if (lb && shots.length && typeof lb.showModal === 'function') {
    const lbImg = lb.querySelector('img');
    const lbCap = lb.querySelector('figcaption');
    let index = 0;
    const show = (i) => {
      index = (i + shots.length) % shots.length;
      const shot = shots[index];
      const img = shot.querySelector('img');
      lbImg.src = shot.dataset.full;
      lbImg.alt = img.alt;
      lbCap.textContent = `${shot.querySelector('span').textContent}  ·  ${index + 1} / ${shots.length}`;
    };
    shots.forEach((shot, i) => shot.addEventListener('click', () => { show(i); lb.showModal(); }));
    lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
    lb.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    lb.addEventListener('close', () => {
      const shot = shots[index];
      if (shot) shot.focus({ preventScroll: true });
    });
    // Swipe on touch screens
    let startX = null;
    lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  // Enquiry form → WhatsApp
  const form = document.getElementById('enquiry');
  if (form) {
    const error = form.querySelector('.form-error');
    const nameInput = form.elements.name;
    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim()) { error.hidden = true; nameInput.removeAttribute('aria-invalid'); }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (field) => form.elements[field].value.trim();
      if (!v('name')) {
        error.hidden = false;
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        return;
      }
      const fields = [
        `Name: ${v('name')}`,
        v('company') && `Company: ${v('company')}`,
        v('phone') && `Phone: ${v('phone')}`,
        `Service: ${v('service')}`,
        v('location') && `Site location: ${v('location')}`,
        v('details') && `Details: ${v('details')}`,
      ].filter(Boolean);
      const text = ['Hello Alisons Construction,', '', ...fields].join('\n');
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
    });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
