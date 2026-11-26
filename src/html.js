// Мини-шаблонизатор: все подстановки экранируются, кроме явно помеченных raw().
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ''));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return new Raw(out);
}

// Текст с абзацами → безопасный HTML
export const paragraphs = (text) => raw(String(text || '').split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''));

export const formatPrice = (price, currency) => {
  const sym = { RUB: '₽', USD: '$', EUR: '€', UAH: '₴' }[currency];
  const n = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(price);
  return sym ? `${n} ${sym}` : `${n} ${currency}`;
};

export const formatDate = (d) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? String(d || '') : new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};
