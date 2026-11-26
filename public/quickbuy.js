// Быстрый выбор в разделе: по выбранным характеристикам находит самое дешёвое доступное предложение.
(() => {
  const data = document.getElementById('qb-data');
  if (!data) return;
  const items = JSON.parse(data.textContent);
  const selects = [...document.querySelectorAll('[data-qb-attr]')];
  const buy = document.querySelector('[data-qb-buy]');
  const hint = document.querySelector('[data-qb-hint]');
  const fmt = (n, c) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);
  const update = () => {
    const sel = Object.fromEntries(selects.map((s) => [s.dataset.qbAttr, s.value]));
    const match = items.filter((i) => i.available && Object.entries(sel).every(([k, v]) => !i.attrs[k] || i.attrs[k] === v))
      .sort((a, b) => a.price - b.price)[0];
    if (match) {
      buy.textContent = `Купить за ${fmt(match.price, match.currency)}`;
      buy.href = `/p/${match.slug}`; buy.removeAttribute('aria-disabled'); buy.classList.remove('is-off');
      hint.textContent = 'Самое выгодное доступное предложение с такими параметрами.';
    } else {
      buy.textContent = 'Нет в наличии'; buy.href = '#'; buy.setAttribute('aria-disabled', 'true'); buy.classList.add('is-off');
      hint.textContent = 'С такими параметрами сейчас нет доступных предложений — попробуйте другие.';
    }
  };
  // Предвыбор: параметры самого популярного доступного товара
  const first = items.find((i) => i.available);
  if (first) selects.forEach((s) => { const v = first.attrs[s.dataset.qbAttr]; if (v) s.value = v; });
  selects.forEach((s) => s.addEventListener('change', update));
  buy.addEventListener('click', (e) => { if (buy.classList.contains('is-off')) e.preventDefault(); });
  update();
})();
