// Страница товара: расчёт цены, сохранение параметров, переход к оплате с подтверждением изменений.
(() => {
  const form = document.getElementById('buy-form');
  if (!form) return;
  const slug = form.dataset.slug;
  const base = Number(form.dataset.basePrice);
  const currency = form.dataset.currency;
  const msg = document.getElementById('buy-message');
  const btn = document.getElementById('buy-btn');
  const storeKey = `reset:opts:${slug}`;
  const fmt = (n) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

  let confirmedPrice = null; // цена, которую пользователь подтвердил после изменения
  // Кнопка вида «Купить за 1 490 ₽»: префикс + цена
  const basePrefix = (btn.firstChild?.textContent || 'Купить за').trim();
  const setBtn = (prefix, text) => {
    btn.textContent = `${prefix} `;
    const s = document.createElement('span'); s.id = 'total-price'; s.textContent = text ?? fmt(confirmedPrice ?? price()); btn.append(s);
  };
  let idemKey = null;
  let idemFor = null;

  const read = () => {
    const out = {};
    form.querySelectorAll('[data-opt]').forEach((el) => {
      const id = el.dataset.opt;
      if (el.type === 'radio') { if (el.checked) out[id] = el.value; }
      else if (el.type === 'checkbox') { if (el.checked) (out[id] ||= []).push(el.value); }
      else if (el.value !== '') out[id] = el.value;
    });
    return out;
  };

  const price = () => {
    let p = base;
    form.querySelectorAll('[data-opt]').forEach((el) => {
      const src = el.tagName === 'SELECT' ? el.selectedOptions[0] : el;
      if (!src || (el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      const m = Number(src.dataset.modify || 0);
      p += src.dataset.modifyType === '%' ? (base * m) / 100 : m;
    });
    return Math.round(p * 100) / 100;
  };

  const show = (text, kind = '') => { msg.hidden = !text; msg.className = `buy-message notice ${kind}`; msg.textContent = text || ''; };

  const update = () => {
    setBtn(confirmedPrice !== null ? 'Продолжить за' : basePrefix);
    try { sessionStorage.setItem(storeKey, JSON.stringify(read())); } catch {}
  };

  // Восстановление ранее выбранных параметров
  try {
    const saved = JSON.parse(sessionStorage.getItem(storeKey) || 'null');
    if (saved) form.querySelectorAll('[data-opt]').forEach((el) => {
      const v = saved[el.dataset.opt];
      if (v === undefined) return;
      if (el.type === 'radio') el.checked = el.value === v;
      else if (el.type === 'checkbox') el.checked = Array.isArray(v) && v.includes(el.value);
      else el.value = v;
    });
  } catch {}

  form.addEventListener('input', () => { confirmedPrice = null; show(''); update(); });
  update();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    form.querySelectorAll('[data-error-for]').forEach((el) => { el.hidden = true; });
    const options = read();
    const shownPrice = confirmedPrice ?? price();
    const sig = JSON.stringify([options, shownPrice]);
    if (idemFor !== sig) { idemKey = crypto.randomUUID(); idemFor = sig; }

    btn.disabled = true;
    btn.textContent = 'Проверяем цену и наличие…';
    show('');
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, options, shownPrice, idempotencyKey: idemKey }),
      });
      const j = await r.json();
      if (j.status === 'redirect') { btn.textContent = 'Переходим к оплате…'; location.href = j.payUrl; return; }
      if (j.status === 'price_changed') {
        confirmedPrice = j.price;
        show(j.message, 'notice-warn');
        setBtn('Продолжить за', j.formatted);
      } else if (j.status === 'invalid') {
        for (const [id, text] of Object.entries(j.errors)) {
          const el = form.querySelector(`[data-error-for="${CSS.escape(id)}"]`);
          if (el) { el.textContent = text; el.hidden = false; }
        }
        show('Заполните обязательные параметры.', 'notice-warn');
        update();
      } else {
        show(j.message || 'Не удалось продолжить. Попробуйте позже.', 'notice-warn');
        update();
        if (j.status === 'unavailable' || j.status === 'hidden') { btn.textContent = 'Недоступно'; return; }
      }
    } catch {
      show('Нет связи с сервером. Параметры сохранены — попробуйте ещё раз.', 'notice-warn');
      update();
    }
    btn.disabled = false;
  });
})();
