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

// Язык и валюта — один блок (пока только визуально, выбор запоминается)
(() => {
  const box = document.querySelector('[data-region]');
  if (!box) return;
  const flag = box.querySelector('[data-region-flag]'), label = box.querySelector('[data-region-label]');
  const st = { lang: 'ru', cur: 'RUB', sym: '₽' };
  try { Object.assign(st, JSON.parse(localStorage.getItem('reset:region') || '{}')); } catch {}
  const render = () => {
    box.querySelectorAll('[data-lang]').forEach((b) => { const on = b.dataset.lang === st.lang; b.classList.toggle('is-on', on); if (on) flag.innerHTML = b.querySelector('.flag').innerHTML; });
    box.querySelectorAll('[data-cur]').forEach((b) => b.classList.toggle('is-on', b.dataset.cur === st.cur));
    label.textContent = `${st.lang.toUpperCase()} · ${st.sym}`;
    try { localStorage.setItem('reset:region', JSON.stringify(st)); } catch {}
  };
  box.addEventListener('click', (e) => {
    const l = e.target.closest('[data-lang]'), c = e.target.closest('[data-cur]');
    if (l) st.lang = l.dataset.lang;
    if (c) { st.cur = c.dataset.cur; st.sym = c.dataset.sym; }
    if (l || c) render();
  });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) box.removeAttribute('open'); });
  render();
})();
document.addEventListener('click', (e) => document.querySelectorAll('details.dd[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); }));

// Вся карточка товара кликабельна (кроме сердечка)
document.addEventListener('click', (e) => {
  const card = e.target.closest('.pcard, .spot');
  if (!card || e.target.closest('.fav, a, button')) return;
  const link = card.querySelector('.pcard-title, .spot-title');
  if (!link) return;
  if (e.ctrlKey || e.metaKey || e.button === 1) window.open(link.href, '_blank'); else location.href = link.href;
});

// Шапка: класс при прокрутке
(() => {
  const h = document.querySelector('.site-header');
  if (!h) return;
  const on = () => h.classList.toggle('is-scrolled', scrollY > 4);
  addEventListener('scroll', on, { passive: true }); on();
})();
