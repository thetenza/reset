// Виджет «Пополнение сервисов»: вкладки, быстрые суммы, ориентировочная цена, переход к товару.
(() => {
  const box = document.querySelector('[data-topup]');
  if (!box) return;
  const tabsCfg = JSON.parse(document.getElementById('topup-data').textContent);
  const form = box.querySelector('[data-topup-form]');
  const amount = form.amount, login = form.login, cur = form.currency;
  const chips = box.querySelector('[data-chips]');
  const btn = box.querySelector('[data-buy]');
  const note = box.querySelector('[data-note]');
  const sym = { RUB: '₽', KZT: '₸', USD: '$', TRY: '₺', INR: '₹', EUR: '€' };
  let t = tabsCfg[0];

  const num = () => Number(String(amount.value).replace(/[^\d]/g, '')) || 0;
  const fmt = (n) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
  const render = () => {
    const a = num();
    const out = a && (a < t.min || a > t.max);
    if (!t.slug) {
      btn.textContent = a ? `Купить за ${fmt(Math.round(a * t.rate))} ₽` : 'Купить';
      note.textContent = '';
    } else {
      btn.textContent = a ? `Купить за ≈ ${fmt(Math.round(a * t.rate))} ₽` : 'Купить';
      note.textContent = out ? `Сумма от ${fmt(t.min)} до ${fmt(t.max)} ${sym[cur.value] || cur.value}` : 'Точная цена — на следующем шаге, до оплаты';
    }
    chips.querySelectorAll('button').forEach((c) => c.classList.toggle('is-on', Number(c.dataset.v) === a));
  };
  const select = (i) => {
    t = tabsCfg[i];
    if (t.brand) box.dataset.brand = t.brand;
    box.querySelectorAll('.ttab').forEach((b, j) => { b.classList.toggle('is-on', i === j); b.setAttribute('aria-selected', i === j); });
    chips.innerHTML = '';
    for (const v of t.chips) { const c = document.createElement('button'); c.type = 'button'; c.dataset.v = v; c.textContent = `${fmt(v)} ${sym[t.currencies[0]] || ''}`; chips.append(c); }
    cur.innerHTML = t.currencies.map((c) => `<option value="${c}">${c}${sym[c] ? `, ${sym[c]}` : ''}</option>`).join('');
    box.querySelector('[data-login-label]').textContent = t.loginLabel;
    const tn = box.querySelector('[data-tab-name]'); if (tn) tn.textContent = t.name;
    login.placeholder = t.loginLabel;
    box.querySelector('[data-login-help]').title = t.loginHelp;
    amount.value = t.chips[1] ?? t.chips[0];
    render();
  };
  box.querySelectorAll('.ttab').forEach((b) => b.addEventListener('click', () => select(Number(b.dataset.tab))));
  chips.addEventListener('click', (e) => { const c = e.target.closest('button'); if (c) { amount.value = c.dataset.v; render(); } });
  amount.addEventListener('input', render);
  cur.addEventListener('change', render);
  box.querySelector('[data-login-help]').addEventListener('click', (e) => { e.preventDefault(); note.textContent = t.loginHelp; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!t.slug) { note.textContent = `Пополнение ${t.name} скоро появится в ${document.title.split('—')[0].trim()}`; return; }
    const a = num();
    if (!a || a < t.min || a > t.max) { amount.focus(); render(); return; }
    location.href = `/p/${t.slug}?amount=${a}&currency=${encodeURIComponent(cur.value)}&login=${encodeURIComponent(login.value.trim())}`;
  });
  select(0);
})();
