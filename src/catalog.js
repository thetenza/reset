// Витрина: собственные данные RESET (категории, тексты, порядок, видимость) + живые данные Digiseller.
import { db, now } from './db.js';
import { config } from './config.js';
import * as ds from './digiseller.js';

const parseRow = (r) => r && {
  ...r,
  images: JSON.parse(r.images || '[]'),
  variant_map: JSON.parse(r.variant_map || '{}'),
  attrs: JSON.parse(r.attrs || '{}'),
  featured: Boolean(r.featured),
};

// ---------- Категории ----------
export const listCategories = ({ includeHidden = false } = {}) =>
  db.prepare(`SELECT * FROM categories ${includeHidden ? '' : "WHERE visibility = 'visible'"} ORDER BY sort, created_at`).all();
export const getCategoryBySlug = (slug) => db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
export const getCategoryById = (id) => db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

// ---------- Товары ----------
export const listProductRows = () => db.prepare('SELECT * FROM products ORDER BY sort, created_at').all().map(parseRow);
export const getRowById = (id) => parseRow(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
export function getRowBySlug(slug) {
  const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
  if (row) return { row: parseRow(row) };
  const redir = db.prepare('SELECT product_id FROM slug_redirects WHERE old_slug = ?').get(slug);
  if (redir) return { redirectTo: getRowById(redir.product_id)?.slug };
  if (config.demo) { const d = DEMO.find((x) => x.row.slug === slug); if (d) return { row: d.row, demo: true }; }
  return {};
}

// ---------- Демо-витрина ----------
// Показывается ТОЛЬКО пока Digiseller не подключён и нет ни одного опубликованного товара. Всё помечено «Демо».
const demoItem = (n, title, price, available, attrs, kind, badge, sales, options = [], extra = {}) => ({
  row: {
    id: `demo_${n}`, slug: `demo-${n}`, title, short: null, description: 'Описание товара появится здесь: что получает покупатель, способ получения и условия.',
    limitations: null, delivery: null, instruction: null, images: [`/demo/cover/${n}.svg`], attrs, kind, badge,
    category_id: 'cat_gta', featured: n >= 9, visibility: 'visible', digiseller_id: null, ...extra,
  },
  live: available === 'error' ? null : { externalId: `demo-${n}`, name: title, price, currency: 'RUB', available, info: '', addInfo: '', images: [], options, stats: { sales } },
  error: available === 'error' ? 'Демо: ошибка получения цены' : null,
});
const ED = [{ id: '1', label: 'Издание', type: 'radio', required: true, comment: null, variants: [
  { id: '11', text: 'Standard', modify: 0, modifyType: null, isDefault: true },
  { id: '12', text: 'Deluxe', modify: 1500, modifyType: null, isDefault: false }] }];
const DEMO = [
  demoItem(1, 'Grand Theft Auto VI ключ PlayStation', 7990, true, { Платформа: 'PlayStation', Регион: 'Турция', Издание: 'Standard' }, 'Ключ', 'Хит', 1240, ED, { images: ['/static/img/tiles/gta.webp'] }),
  demoItem(2, 'GTA VI · активация на ваш аккаунт PS5', 7925, true, { Платформа: 'PlayStation', Регион: 'Индия', Издание: 'Standard' }, 'Активация', null, 860),
  demoItem(3, 'GTA VI · Xbox Series X|S, выбор издания', 7299, true, { Платформа: 'Xbox', Регион: 'Глобальный', Издание: 'Standard' }, 'Активация', 'Новинка', 3175, ED),
  demoItem(4, 'GTA VI · Xbox, быстрая доставка', 7290, true, { Платформа: 'Xbox', Регион: 'Турция', Издание: 'Standard' }, 'Активация', null, 1215),
  demoItem(5, 'GTA VI · Deluxe Edition PS5', 9890, true, { Платформа: 'PlayStation', Регион: 'Турция', Издание: 'Deluxe' }, 'Ключ', null, 410),
  demoItem(6, 'GTA VI · предзаказ PC', 6990, false, { Платформа: 'PC', Регион: 'Глобальный', Издание: 'Standard' }, 'Ключ', 'Предзаказ', null),
  demoItem(7, 'пополнение PSN для GTA', 1990, true, { Платформа: 'PlayStation', Регион: 'Турция' }, 'Пополнение', null, 2210),
  demoItem(8, 'GTA Online · Shark Card', 990, 'error', { Платформа: 'PC' }, 'Код', null, null),
  // Витрина главной: разные разделы (картинки — ваши мини-баннеры или нейтральные заглушки)
  demoItem(9, 'ChatGPT Plus подписка на месяц', 2390, true, { Срок: '1 месяц' }, 'Подписка', null, 64, [], { short: 'Подписка на 1 месяц', category_id: 'cat_subs', images: ['/static/img/tiles/gpt.webp'], featured: true }),
  demoItem(10, 'Spotify Premium подписка на месяц', 490, true, { Срок: '1 месяц' }, 'Подписка', null, 380, [], { short: 'Подписка на 1 месяц', category_id: 'cat_subs', images: ['/static/img/tiles/spotify.webp'], featured: true }),
  demoItem(11, 'Пополнение Steam на любую сумму', 100, true, { Платформа: 'Steam' }, 'Пополнение', null, 1240, [], { short: 'Ключ пополнения баланса', category_id: 'cat_topup', images: ['/static/img/tiles/steam.webp'], featured: true }),
  demoItem(12, 'Robux для Roblox подарочная карта', 390, true, {}, 'Валюта', null, 2100, [], { short: 'Подарочная карта', category_id: 'cat_games', images: ['/static/img/tiles/roblox.webp'], featured: true }),
  demoItem(13, 'Apple Gift Card подарочная карта', 990, true, {}, 'Карта', null, 40, [], { short: 'Подарочная карта', category_id: 'cat_topup', images: ['/demo/tile/apple.svg'], featured: true }),
  demoItem(14, 'Xbox Game Pass Ultimate 1 месяц', 890, true, { Срок: '1 месяц' }, 'Подписка', null, 240, [], { short: 'Подписка на 1 месяц', category_id: 'cat_subs', images: ['/static/img/tiles/xbox.webp'], featured: true }),
  demoItem(15, 'Claude Pro подписка на месяц', 2490, true, { Срок: '1 месяц' }, 'Подписка', null, 55, [], { short: 'Подписка на 1 месяц', category_id: 'cat_subs', images: ['/static/img/tiles/claude.webp'], featured: true }),
  demoItem(16, 'Telegram Stars на ваш аккаунт', 190, true, {}, 'Пополнение', null, 860, [], { short: 'Звёзды в Telegram', category_id: 'cat_topup', images: ['/demo/tile/telegram.svg'], featured: true }),
  demoItem(17, 'Minecraft Java & Bedrock для ПК', 1590, true, { Платформа: 'PC' }, 'Ключ', null, 680, [], { short: 'Java & Bedrock Edition', category_id: 'cat_games', images: ['/demo/tile/minecraft.svg'], featured: true }),
  demoItem(18, 'Алмазы Brawl Stars на аккаунт', 290, true, {}, 'Валюта', null, 420, [], { short: 'Пополнение аккаунта', category_id: 'cat_games', images: ['/demo/tile/brawl.svg'], featured: true }),
  demoItem(19, 'Гемы Clash Royale на аккаунт', 390, true, {}, 'Валюта', null, 310, [], { short: 'Пополнение аккаунта', category_id: 'cat_games', images: ['/demo/tile/clash.svg'], featured: true }),
  demoItem(20, 'Карта пополнения PlayStation', 990, true, { Платформа: 'PlayStation' }, 'Пополнение', null, 90, [], { short: 'Подарочная карта PSN', category_id: 'cat_topup', images: ['/static/img/tiles/ps.webp'], featured: true }),
];
// Три главных товара для блока на главной (в демо). Реальные задаются в config/spotlight.json по адресам товаров.
export const DEMO_SPOTLIGHT = ['demo-1', 'demo-9', 'demo-10'];
const demoActive = () => config.demo && !db.prepare("SELECT 1 FROM products WHERE visibility = 'visible' LIMIT 1").get();

// ---------- Живые данные с кешем ----------
async function loadLive(row, { fresh = false } = {}) {
  if (!row.digiseller_id) throw new ds.DigisellerError('Товар не связан с Digiseller');
  if (config.demo) throw new ds.DigisellerError('Digiseller не подключён (демо-режим)');
  const cached = db.prepare('SELECT * FROM product_cache WHERE product_id = ?').get(row.id);
  if (!fresh && cached && cached.data && now() - cached.fetched_at < config.digiseller.cacheTtlSec * 1000) {
    return JSON.parse(cached.data);
  }
  try {
    const live = await ds.fetchProduct(row.digiseller_id);
    db.prepare(`INSERT INTO product_cache (product_id, data, error, fetched_at) VALUES (?,?,NULL,?)
      ON CONFLICT(product_id) DO UPDATE SET data=excluded.data, error=NULL, fetched_at=excluded.fetched_at`)
      .run(row.id, JSON.stringify(live), now());
    return live;
  } catch (e) {
    db.prepare(`INSERT INTO product_cache (product_id, data, error, fetched_at) VALUES (?,NULL,?,?)
      ON CONFLICT(product_id) DO UPDATE SET error=excluded.error, fetched_at=excluded.fetched_at`)
      .run(row.id, e.message, cached?.fetched_at ?? 0);
    throw e;
  }
}

function sales(rowId, live) {
  if (live?.stats?.sales != null) return live.stats.sales;
  return latestStat(rowId, 'sales_count')?.value ?? null;
}

// S.2.3: состояния товара — available | unavailable | hidden | error
export async function resolveProduct(row, opts = {}) {
  const base = { row, title: row.title || null, images: row.images.length ? row.images : [] };
  if (row.id.startsWith('demo_')) {
    const d = DEMO.find((x) => x.row.id === row.id);
    if (!d.live) return { ...base, state: 'error', error: d.error, title: row.title, description: row.description, sales: null, demo: true };
    return { ...base, live: d.live, state: d.live.available ? 'available' : 'unavailable', title: row.title, description: row.description, sales: d.live.stats.sales, demo: true };
  }
  if (row.visibility === 'hidden' && !opts.includeHidden) return { ...base, state: 'hidden' };
  try {
    const live = await loadLive(row, opts);
    return {
      ...base, live,
      state: live.available === false ? 'unavailable' : 'available',
      title: row.title || live.name || 'Без названия',
      images: base.images.length ? base.images : live.images,
      description: row.description || live.info || '',
      sales: sales(row.id, live),
    };
  } catch (e) {
    return { ...base, state: 'error', error: e.message, title: row.title || 'Товар', description: row.description || '', sales: sales(row.id) };
  }
}

async function visibleResolved() {
  if (demoActive()) return Promise.all(DEMO.map((d) => resolveProduct(d.row)));
  const rows = listProductRows().filter((r) => r.visibility === 'visible');
  return Promise.all(rows.map((r) => resolveProduct(r)));
}

export const isDemoStorefront = () => demoActive();

export async function featured(limit = 12) {
  const all = await visibleResolved();
  const f = all.filter((p) => p.row.featured);
  return (f.length ? f : all).slice(0, limit);
}

export async function categoryCounts() {
  const all = await visibleResolved();
  const m = {};
  for (const p of all) if (p.row.category_id) m[p.row.category_id] = (m[p.row.category_id] || 0) + 1;
  return m;
}

const minPrice = (p) => (p.live ? p.live.price : Infinity);
const sorters = {
  popular: (a, b) => (b.sales ?? -1) - (a.sales ?? -1),
  price_asc: (a, b) => minPrice(a) - minPrice(b),
  price_desc: (a, b) => (b.live?.price ?? -1) - (a.live?.price ?? -1),
  new: (a, b) => (b.row.created_at ?? 0) - (a.row.created_at ?? 0),
};
export const SORTS = { popular: 'Популярные', price_asc: 'Сначала дешевле', price_desc: 'Сначала дороже', new: 'Новые' };

// Товары категории с фильтрами по характеристикам, цене и сортировкой.
export async function categoryProducts(category, { attrs = {}, sort = 'popular', priceMax = null, q = '' } = {}) {
  let list = (await visibleResolved()).filter((p) => !category || p.row.category_id === category.id);
  const facets = {};
  for (const p of list) for (const [k, v] of Object.entries(p.row.attrs || {})) (facets[k] ||= new Set()).add(v);
  for (const [k, v] of Object.entries(attrs)) if (v) list = list.filter((p) => p.row.attrs?.[k] === v);
  if (priceMax) list = list.filter((p) => p.live && p.live.price <= priceMax);
  if (q) { const s = q.toLowerCase(); list = list.filter((p) => `${p.title} ${p.row.kind || ''} ${Object.values(p.row.attrs || {}).join(' ')}`.toLowerCase().includes(s)); }
  // недоступные и ошибочные — в конец, чтобы не мешали выбору
  const rank = (p) => (p.state === 'available' ? 0 : p.state === 'unavailable' ? 1 : 2);
  list.sort((a, b) => rank(a) - rank(b) || (sorters[sort] || sorters.popular)(a, b));
  return { list, facets: Object.fromEntries(Object.entries(facets).map(([k, s]) => [k, [...s].sort()])) };
}

export async function search(q) {
  if (!q || q.trim().length < 2) return [];
  return (await categoryProducts(null, { q: q.trim() })).list;
}

export function productReviews(productId, limit = 20) {
  return db.prepare(`SELECT * FROM reviews WHERE product_id = ? AND deleted_at IS NULL
    ORDER BY review_date DESC LIMIT ?`).all(productId, limit);
}

export function allReviews(limit = 6) {
  return db.prepare(`SELECT r.*, p.slug, p.title AS product_title FROM reviews r JOIN products p ON p.id = r.product_id
    WHERE r.deleted_at IS NULL AND p.visibility = 'visible' AND r.text IS NOT NULL AND r.text != ''
    ORDER BY r.review_date DESC LIMIT ?`).all(limit);
}

export function latestStat(productId, metric) {
  return db.prepare(`SELECT * FROM stats_snapshots WHERE product_id = ? AND metric = ?
    ORDER BY cutoff_at DESC LIMIT 1`).get(productId, metric);
}

// Блок «главные товары» на главной: config/spotlight.json — массив адресов товаров (slug)
export async function spotlight(slugs = []) {
  const all = await visibleResolved();
  const want = demoActive() ? DEMO_SPOTLIGHT : slugs;
  return want.map((sl) => all.find((p) => p.row.slug === sl)).filter(Boolean).slice(0, 3);
}
