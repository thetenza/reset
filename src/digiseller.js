// Клиент Digiseller. Работает только на сервере: ключ API никогда не уходит в браузер (S.4.3).
//
// Источники (S.10), проверить на аккаунте владельца при подключении:
//   товары/цены/отзывы — https://my.digiseller.com/inside/api_catgoods.asp
//   переход к оплате    — https://my.digiseller.com/inside/api_payment.asp
//   статистика          — https://my.digiseller.com/inside/api_statistics.asp
//
// Все ответы разбираются защитно: неизвестная форма ответа = ошибка, а не «0» или «успех».
import crypto from 'node:crypto';
import { config } from './config.js';

const D = config.digiseller;

export class DigisellerError extends Error {
  constructor(message, details) { super(message); this.details = details; }
}

async function call(pathname, { method = 'GET', query = {}, body, timeoutMs = 10000 } = {}) {
  const url = new URL(pathname, D.apiBase);
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new DigisellerError(`Digiseller: не JSON (HTTP ${res.status})`); }
    if (!res.ok) throw new DigisellerError(`Digiseller: HTTP ${res.status}`, json);
    if (json.retval !== undefined && Number(json.retval) !== 0) {
      throw new DigisellerError(`Digiseller retval=${json.retval}: ${json.retdesc || json.desc || ''}`.trim(), json);
    }
    return json;
  } catch (e) {
    if (e instanceof DigisellerError) throw e;
    throw new DigisellerError(`Digiseller недоступен: ${e.name === 'AbortError' ? 'таймаут' : e.message}`);
  } finally { clearTimeout(t); }
}

// ---------- Токен продавца (для статистики и проверки заказов) ----------
let tokenCache = { token: null, until: 0 };
export async function sellerToken() {
  if (!D.apiKey) throw new DigisellerError('DIGISELLER_API_KEY не задан');
  if (tokenCache.token && Date.now() < tokenCache.until - 60_000) return tokenCache.token;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = crypto.createHash('sha256').update(D.apiKey + timestamp).digest('hex');
  const r = await call('/api/apilogin', { method: 'POST', body: { seller_id: Number(D.sellerId), timestamp, sign } });
  if (!r.token) throw new DigisellerError('apilogin: нет токена', r);
  tokenCache = { token: r.token, until: r.valid_thru ? Date.parse(r.valid_thru) : Date.now() + 30 * 60_000 };
  return r.token;
}

// ---------- Товар ----------
const stripHtml = (s) => String(s ?? '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n').trim();

const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

function normalizeOption(o) {
  const typeMap = { radio: 'radio', select: 'select', checkbox: 'checkbox', text: 'text', textarea: 'text' };
  return {
    id: String(o.id ?? o.name),
    label: o.label || o.name || 'Параметр',
    type: typeMap[o.type] || 'select',
    required: Boolean(Number(o.required ?? 0)),
    comment: o.comment ? stripHtml(o.comment) : null,
    variants: (o.variants || []).map((v) => ({
      id: String(v.value ?? v.id),
      text: v.text || String(v.value),
      modify: num(v.modify_value) ?? 0,
      modifyType: v.modify_type || null, // напр. '%' или валюта — проверить на аккаунте
      isDefault: Boolean(Number(v.default ?? 0)),
    })),
  };
}

export function normalizeProduct(raw) {
  const p = raw?.product;
  if (!p || p.id === undefined) throw new DigisellerError('Неожиданный формат товара', raw);
  const price = num(p.prices?.initial?.price ?? p.price);
  const currency = p.prices?.initial?.currency || p.currency || null;
  if (price === null || !currency) throw new DigisellerError('Нет цены или валюты в ответе', raw);
  // is_available: 1/0; num_in_stock может отсутствовать
  const available = p.is_available === undefined ? null : Boolean(Number(p.is_available));
  return {
    externalId: String(p.id),
    name: p.name || null,
    price,
    currency,
    available,
    info: stripHtml(p.info),
    addInfo: stripHtml(p.add_info),
    images: (p.preview_imgs || []).map((i) => i.url).filter(Boolean),
    options: (p.options || []).map(normalizeOption),
    sellerId: p.seller?.id ? String(p.seller.id) : null,
    stats: {
      sales: num(p.statistics?.sales ?? p.cnt_sell),
      reviewsGood: num(p.statistics?.good_reviews),
      reviewsBad: num(p.statistics?.bad_reviews),
    },
  };
}

export async function fetchProduct(digisellerId) {
  const raw = await call(`/api/products/${encodeURIComponent(digisellerId)}/data`, {
    query: { seller_id: D.sellerId, currency: D.currency, lang: D.lang },
  });
  const p = normalizeProduct(raw);
  // S.4.3: товар должен принадлежать владельцу магазина
  if (p.sellerId && D.sellerId && p.sellerId !== String(D.sellerId)) {
    throw new DigisellerError('Товар Digiseller принадлежит другому продавцу');
  }
  return p;
}

// Цена с учётом выбранных вариантов. Правила модификаторов проверить на аккаунте владельца.
export function computePrice(product, chosen) {
  let price = product.price;
  for (const opt of product.options) {
    const val = chosen[opt.id];
    if (val === undefined || val === '' || opt.type === 'text') continue;
    const ids = Array.isArray(val) ? val : [val];
    for (const id of ids) {
      const v = opt.variants.find((x) => x.id === String(id));
      if (!v) continue;
      price += v.modifyType === '%' ? (product.price * v.modify) / 100 : v.modify;
    }
  }
  return Math.round(price * 100) / 100;
}

// Проверка обязательных параметров до перехода к оплате (S.2.2).
export function validateOptions(product, chosen) {
  const errors = {};
  for (const opt of product.options) {
    const val = chosen[opt.id];
    const empty = val === undefined || val === '' || (Array.isArray(val) && !val.length);
    if (opt.required && empty) { errors[opt.id] = 'Обязательный параметр'; continue; }
    if (empty || opt.type === 'text') continue;
    const ids = Array.isArray(val) ? val : [val];
    if (ids.some((id) => !opt.variants.find((x) => x.id === String(id)))) errors[opt.id] = 'Недопустимое значение';
  }
  return errors;
}

// ---------- Переход к оплате ----------
export async function preparePayment(product, chosen, ip) {
  const options = [];
  for (const opt of product.options) {
    const val = chosen[opt.id];
    if (val === undefined || val === '') continue;
    if (opt.type === 'text') options.push({ id: Number(opt.id), value: { text: String(val) } });
    else for (const id of Array.isArray(val) ? val : [val]) options.push({ id: Number(opt.id), value: { id: Number(id) } });
  }
  let idPo = null;
  if (options.length) {
    const r = await call('/api/purchases/options', {
      method: 'POST',
      body: { product_id: Number(product.externalId), options, unit_cnt: 1, lang: D.lang, ip },
    });
    if (!r.id_po) throw new DigisellerError('Не получен id_po', r);
    idPo = String(r.id_po);
  }
  const url = new URL(D.payUrl);
  url.searchParams.set('id_d', product.externalId);
  if (idPo) url.searchParams.set('id_po', idPo);
  url.searchParams.set('lang', D.lang);
  url.searchParams.set('curr', D.currency);
  return { idPo, payUrl: url.toString() };
}

// ---------- Отзывы ----------
export async function fetchReviews(digisellerId) {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const r = await call('/api/reviews', {
      query: { seller_id: D.sellerId, product_id: digisellerId, type: 'all', page, rows: 100, lang: D.lang },
    });
    if (!Array.isArray(r.review)) throw new DigisellerError('Неожиданный формат отзывов', r);
    for (const x of r.review) {
      if (x.id === undefined || !['good', 'bad'].includes(x.type)) continue;
      all.push({
        externalId: String(x.id),
        type: x.type,
        text: x.info ? stripHtml(x.info) : null,
        date: x.date || null,
        sellerReply: x.comment ? stripHtml(x.comment) : null,
        // Публичного имени Digiseller не отдаёт; email и номер заказа не публикуем (S.5.1).
        author: null,
      });
    }
    const pages = Number(r.totalPages ?? r.pages ?? 1);
    if (page >= pages) break;
  }
  return all;
}

// ---------- Проверка заказа ----------
// Уникальный код покупатель получает на странице оплаты Digiseller — это допустимый способ
// подтвердить связь внешнего заказа с аккаунтом RESET (S.3).
export async function checkUniqueCode(code) {
  const token = await sellerToken();
  const r = await call(`/api/purchases/unique-code/${encodeURIComponent(code)}`, { query: { token } });
  if (!r.inv) throw new DigisellerError('Код не найден', r);
  return {
    invoiceId: String(r.inv),
    productExternalId: String(r.id_goods),
    amount: num(r.amount),
    currency: r.type_curr || null,
    paidAt: r.date_pay || null,
    state: r.unique_code_state?.state ?? null,
    options: r.options || null,
    raw: r,
  };
}

export async function fetchInvoice(invoiceId) {
  const token = await sellerToken();
  const r = await call(`/api/purchase/info/${encodeURIComponent(invoiceId)}`, { query: { token } });
  const c = r.content;
  if (!c || c.item_id === undefined) throw new DigisellerError('Неожиданный формат заказа', r);
  return {
    invoiceId: String(invoiceId),
    productExternalId: String(c.item_id),
    amount: num(c.amount),
    currency: c.currency_type || null,
    paidAt: c.purchase_date || null,
    state: c.invoice_state ?? null,
    refunded: Boolean(c.date_return || c.returned),
    options: c.options || null,
    raw: r,
  };
}
