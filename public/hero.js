// Карусель баннеров: автосмена, стрелки, индикатор с прогрессом, пауза при наведении, свайп.
(() => {
  const root = document.querySelector('[data-hero]');
  if (!root) return;
  const slides = [...root.querySelectorAll('.hslide')];
  const dots = [...root.querySelectorAll('.hdot')];
  if (slides.length < 2) return;
  const MS = 6500;
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
    dots.forEach((d, i) => { d.classList.remove('is-active'); d.setAttribute('aria-selected', i === cur); if (i === cur) { void d.offsetWidth; d.classList.add('is-active'); } });
    schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!paused && !reduce) timer = setTimeout(() => go(cur + 1), MS); };
  root.querySelector('[data-prev]').addEventListener('click', () => go(cur - 1));
  root.querySelector('[data-next]').addEventListener('click', () => go(cur + 1));
  dots.forEach((d) => d.addEventListener('click', () => go(Number(d.dataset.go))));
  root.addEventListener('mouseenter', () => { paused = true; root.classList.add('is-paused'); clearTimeout(timer); });
  root.addEventListener('mouseleave', () => { paused = false; root.classList.remove('is-paused'); go(cur); });
  document.addEventListener('visibilitychange', () => (document.hidden ? clearTimeout(timer) : schedule()));
  let x0 = null;
  root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); });
  if (reduce) root.classList.add('no-motion');
  schedule();
})();
