// Анонсы на главной: смена баннеров с полосками прогресса (как вкладки), пауза при наведении, свайп; прокрутка плиток.
(() => {
  const root = document.querySelector('[data-hero]');
  if (root) {
    const slides = [...root.querySelectorAll('.hslide')];
    const tabs = [...root.querySelectorAll('.htab')];
    const MS = 7000;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.style.setProperty('--hero-ms', `${MS}ms`);
    let cur = 0, timer = null, paused = false;
    const go = (n) => {
      cur = (n + slides.length) % slides.length;
      slides.forEach((s, i) => {
        const on = i === cur;
        s.classList.toggle('is-active', on);
        on ? (s.removeAttribute('aria-hidden'), s.removeAttribute('tabindex')) : (s.setAttribute('aria-hidden', 'true'), s.setAttribute('tabindex', '-1'));
      });
      tabs.forEach((t, i) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', i === cur); if (i === cur) { void t.offsetWidth; t.classList.add('is-active'); } });
      schedule();
    };
    const schedule = () => { clearTimeout(timer); if (!paused && !reduce && slides.length > 1) timer = setTimeout(() => go(cur + 1), MS); };
    tabs.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.go))));
    root.addEventListener('mouseenter', () => { paused = true; root.classList.add('is-paused'); clearTimeout(timer); });
    root.addEventListener('mouseleave', () => { paused = false; root.classList.remove('is-paused'); go(cur); });
    document.addEventListener('visibilitychange', () => (document.hidden ? clearTimeout(timer) : schedule()));
    let x0 = null;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); });
    if (reduce) root.classList.add('no-motion');
    schedule();
  }

  const row = document.querySelector('[data-tiles]');
  if (row) {
    const step = () => Math.max(200, row.clientWidth * 0.8);
    const prev = document.querySelector('[data-tiles-prev]');
    const next = document.querySelector('[data-tiles-next]');
    const sync = () => {
      prev.hidden = row.scrollLeft < 8;
      next.hidden = row.scrollLeft + row.clientWidth > row.scrollWidth - 8;
    };
    prev.addEventListener('click', () => row.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => row.scrollBy({ left: step(), behavior: 'smooth' }));
    row.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  }
})();
