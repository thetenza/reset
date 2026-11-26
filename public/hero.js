// Карусель баннеров: крутится всегда (без паузы при наведении), листается перетаскиванием мышью и пальцем,
// стрелками и точками. Точки статичные — просто подсвечивается текущий баннер.
(() => {
  const root = document.querySelector('[data-hero]');
  if (!root) return;
  const stage = root.querySelector('.hero-stage');
  const slides = [...root.querySelectorAll('.hslide')];
  const dots = [...root.querySelectorAll('.hdot')];
  if (slides.length < 2) return;
  const MS = 6000;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, timer = null;

  const go = (n) => {
    cur = (n + slides.length) % slides.length;
    slides.forEach((s, i) => {
      const on = i === cur;
      s.classList.toggle('is-active', on);
      on ? (s.removeAttribute('aria-hidden'), s.removeAttribute('tabindex')) : (s.setAttribute('aria-hidden', 'true'), s.setAttribute('tabindex', '-1'));
    });
    dots.forEach((d, i) => { d.classList.toggle('is-active', i === cur); d.setAttribute('aria-selected', i === cur); });
    schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!reduce) timer = setTimeout(() => go(cur + 1), MS); };

  root.querySelector('[data-prev]').addEventListener('click', () => go(cur - 1));
  root.querySelector('[data-next]').addEventListener('click', () => go(cur + 1));
  dots.forEach((d) => d.addEventListener('click', () => go(Number(d.dataset.go))));
  document.addEventListener('visibilitychange', () => (document.hidden ? clearTimeout(timer) : schedule()));

  // Перетаскивание: мышь, палец, перо
  let x0 = null, dragged = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    x0 = e.clientX; dragged = false; stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 8) { dragged = true; stage.classList.add('is-dragging'); stage.style.setProperty('--drag', `${Math.max(-60, Math.min(60, dx / 4))}px`); }
  });
  const end = (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    stage.classList.remove('is-dragging'); stage.style.setProperty('--drag', '0px');
    if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  // после перетаскивания клик не открывает ссылку баннера
  stage.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); dragged = false; } }, true);
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  schedule();
})();
