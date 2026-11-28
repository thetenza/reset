// Карусель баннеров: лента. Баннер тянется за мышью/пальцем — слева виден предыдущий, справа следующий.
// Отпустили дальше порога — перелистнулось, иначе вернулось. Автосмена каждые 6 с, без паузы при наведении.
(() => {
  const root = document.querySelector('[data-hero]');
  if (!root) return;
  const stage = root.querySelector('.hero-stage');
  const slides = [...root.querySelectorAll('.hslide')];
  const dots = [...root.querySelectorAll('.hdot')];
  const n = slides.length;
  if (n < 2) return;
  const MS = 6000, ANIM = 450, GAP = 8;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, timer = null, busy = false;
  const W = () => stage.clientWidth + GAP;
  const idx = (i) => (i + n) % n;

  // Раскладка: текущий в центре, соседи по бокам (со сдвигом dx при перетаскивании)
  const layout = (dx = 0, animate = false) => {
    slides.forEach((s, i) => {
      let pos = null;
      if (i === cur) pos = 0; else if (i === idx(cur - 1)) pos = -1; else if (i === idx(cur + 1)) pos = 1;
      s.style.transition = animate ? `transform ${ANIM}ms cubic-bezier(.22,.7,.2,1)` : 'none';
      if (pos === null) { s.style.visibility = 'hidden'; s.style.transform = 'translateX(200%)'; return; }
      s.style.visibility = 'visible';
      s.style.transform = `translateX(${pos * W() + dx}px)`;
    });
  };
  const mark = () => {
    slides.forEach((s, i) => { const on = i === cur; s.classList.toggle('is-active', on); on ? (s.removeAttribute('aria-hidden'), s.removeAttribute('tabindex')) : (s.setAttribute('aria-hidden', 'true'), s.setAttribute('tabindex', '-1')); });
    dots.forEach((d, i) => { d.classList.toggle('is-active', i === cur); d.setAttribute('aria-selected', i === cur); });
  };
  const go = (dir) => { // dir: +1 вперёд, -1 назад
    if (busy) return; busy = true;
    layout(0, false);
    requestAnimationFrame(() => {
      layout(-dir * W(), true);
      setTimeout(() => { cur = idx(cur + dir); mark(); layout(0, false); busy = false; schedule(); }, reduce ? 0 : ANIM);
    });
  };
  const jump = (to) => { if (to === cur || busy) return; const dir = to > cur ? 1 : -1; if (Math.abs(to - cur) === 1 || n === 2) return go(dir); cur = to; mark(); layout(0, false); schedule(); };
  const schedule = () => { clearTimeout(timer); if (!reduce) timer = setTimeout(() => go(1), MS); };

  root.querySelector('[data-prev]').addEventListener('click', () => go(-1));
  root.querySelector('[data-next]').addEventListener('click', () => go(1));
  dots.forEach((d) => d.addEventListener('click', () => jump(Number(d.dataset.go))));
  document.addEventListener('visibilitychange', () => (document.hidden ? clearTimeout(timer) : schedule()));
  addEventListener('resize', () => layout(0, false));

  let x0 = null, dx = 0, dragged = false;
  stage.addEventListener('pointerdown', (e) => {
    if (busy || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('button')) return;
    x0 = e.clientX; dx = 0; dragged = false; clearTimeout(timer); stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    if (Math.abs(dx) > 6) { dragged = true; stage.classList.add('is-dragging'); layout(dx, false); }
  });
  const end = () => {
    if (x0 === null) return;
    x0 = null; stage.classList.remove('is-dragging');
    if (!dragged) { schedule(); return; }
    const w = W();
    if (Math.abs(dx) > Math.min(140, w * 0.18)) {
      const dir = dx < 0 ? 1 : -1; busy = true;
      layout(-dir * w, true);
      setTimeout(() => { cur = idx(cur + dir); mark(); layout(0, false); busy = false; schedule(); }, ANIM);
    } else { layout(0, true); schedule(); }
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  root.classList.add('is-track');
  mark(); layout(0, false); schedule();
})();
