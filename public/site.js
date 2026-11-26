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
