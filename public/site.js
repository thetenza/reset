// Общие мелочи: появление при прокрутке, автоприменение фильтров, вкладки, галерея, закрытие меню каталога.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -5% 0px' });
    items.forEach((el, i) => { el.style.transitionDelay = `${(i % 6) * 50}ms`; io.observe(el); });
  }

  document.querySelectorAll('[data-autosubmit]').forEach((el) => el.addEventListener('change', () => el.form.submit()));

  document.querySelectorAll('[data-tabs]').forEach((box) => {
    const tabs = [...box.querySelectorAll('[data-tab]')];
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => { const on = x === t; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); document.getElementById(`panel-${x.dataset.tab}`).hidden = !on; });
    }));
  });

  const main = document.querySelector('[data-gallery-main]');
  document.querySelectorAll('[data-thumb]').forEach((b) => b.addEventListener('click', () => {
    if (main) main.src = b.dataset.thumb;
    document.querySelectorAll('[data-thumb]').forEach((x) => x.classList.toggle('is-on', x === b));
  }));

  const menu = document.querySelector('.catalog-menu');
  if (menu) document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.removeAttribute('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu) menu.removeAttribute('open'); });
})();
document.querySelectorAll('[data-confirm]').forEach((b) => b.addEventListener('click', (e) => { if (!confirm('Точно удалить? Это нельзя отменить.')) e.preventDefault(); }));

// Переключатель темы: светлая ↔ тёмная (по умолчанию — как в системе)
(() => {
  const root = document.documentElement;
  const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    b.classList.remove('is-flip'); void b.offsetWidth; b.classList.add('is-flip');
    root.dataset.theme = next;
    try { localStorage.setItem('reset:theme', next); } catch {}
  }));
})();

// Избранное: хранится в браузере
(() => {
  const KEY = 'reset:fav';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const sync = () => { const f = read(); document.querySelectorAll('[data-fav]').forEach((b) => { const on = f.includes(b.dataset.fav); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); }); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]'); if (!b) return;
    const f = read(); const i = f.indexOf(b.dataset.fav);
    i >= 0 ? f.splice(i, 1) : f.push(b.dataset.fav); write(f.slice(-60)); sync();
  });
  sync();
})();

// Незаметный переключатель цвета: оранжевый ↔ зелёный (для сравнения)
document.querySelectorAll('[data-accent-toggle]').forEach((b) => b.addEventListener('click', () => {
  const root = document.documentElement;
  const green = root.dataset.accent !== 'green';
  if (green) root.dataset.accent = 'green'; else delete root.dataset.accent;
  try { localStorage.setItem('reset:accent', green ? 'green' : 'orange'); } catch {}
}));
