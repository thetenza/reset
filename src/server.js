import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { db, now, newId, seedProducts } from './db.js';
import * as auth from './auth.js';
import * as catalog from './catalog.js';
import * as ds from './digiseller.js';
import * as views from './views.js';
import { createTicket } from './support.js';
import { linkByUniqueCode, handleNotification, userOrders } from './orders.js';
import { admin } from './admin.js';
import { startScheduler } from './sync.js';
import { formatPrice } from './html.js';

seedProducts();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

// ---------- Базовая защита ----------
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; form-action 'self' https://www.oplata.info https://oplata.info; frame-ancestors 'none'",
  });
  next();
});

const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

app.use((req, res, next) => {
  req.cookies = cookies(req);
  req.user = auth.getSessionUser(req.cookies[auth.SESSION_COOKIE]);
  req.cats = catalog.listCategories();
  next();
});

// CSRF: POST-запросы принимаются только со своего origin (кроме серверного уведомления Digiseller)
const ownOrigin = new URL(config.baseUrl).origin;
app.use((req, res, next) => {
  if (req.method !== 'POST' || req.path.startsWith('/api/digiseller/')) return next();
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  if (origin && origin !== ownOrigin && !(origin.startsWith('http://localhost') && !config.isProd)) {
    return res.status(403).json({ error: 'bad_origin' });
  }
  next();
});

app.use('/static', express.static(path.join(config.root, 'public'), { maxAge: config.isProd ? '1d' : 0 }));

const setSessionCookie = (res, token) => res.cookie(auth.SESSION_COOKIE, token, {
  httpOnly: true, sameSite: 'lax', secure: config.baseUrl.startsWith('https://'), path: '/', maxAge: config.auth.sessionIdleDays * 86_400_000,
});

const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(config.root, 'config', file), 'utf8')); } catch { return fallback; } };

// ---------- Витрина ----------
app.get('/', async (req, res) => {
  const cat = typeof req.query.cat === 'string' ? catalog.getCategoryBySlug(req.query.cat) : null;
  const sort = ['popular', 'price_asc', 'price_desc'].includes(req.query.sort) ? req.query.sort : 'popular';
  let featured = cat ? (await catalog.categoryProducts(cat, { sort })).list.slice(0, 18) : await catalog.featured(18);
  if (!cat && sort !== 'popular') featured = [...featured].sort((a, b) => ((a.live?.price ?? 1e9) - (b.live?.price ?? 1e9)) * (sort === 'price_asc' ? 1 : -1));
  const spot = await catalog.spotlight(readJson('spotlight.json', []));
  res.send(String(views.homePage({ user: req.user, categories: req.cats, featured, spot, demo: catalog.isDemoStorefront(), catFilter: cat?.slug || '', sort,
    reviews: catalog.allReviews(6), faq: readJson('faq.json', []), banners: readJson('banners.json', []).slice(0, 6),
    tiles: readJson('tiles.json', []), topup: readJson('topup.json', []) })));
});

app.get('/demo/tile/:key.svg', (req, res) => {
  const svg = config.demo ? views.demoTile(req.params.key) : null;
  if (!svg) return res.status(404).end();
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=3600').send(svg);
});

app.get('/favorites', async (req, res) => {
  const slugs = typeof req.query.s === 'string' ? req.query.s.split(',').filter((x) => /^[a-z0-9-]{1,64}$/.test(x)).slice(0, 60) : null;
  const all = slugs ? (await catalog.categoryProducts(null)).list.filter((p) => slugs.includes(p.row.slug)) : [];
  res.send(String(views.favoritesPage({ user: req.user, categories: req.cats, list: all, loaded: Boolean(slugs) })));
});

const notFound = (req, res, title = 'Страница не найдена', text = 'Такой страницы нет. Посмотрите товары на главной.') =>
  res.status(404).send(String(views.messagePage({ user: req.user, categories: req.cats, title, text })));

app.get('/c/:slug', async (req, res) => {
  const cat = catalog.getCategoryBySlug(req.params.slug);
  if (!cat || cat.visibility !== 'visible') return notFound(req, res, 'Раздел не найден');
  const filters = {};
  for (const [k, v] of Object.entries(req.query)) if (k.startsWith('f_') && typeof v === 'string' && v.length < 100) filters[k.slice(2)] = v;
  const sort = catalog.SORTS[req.query.sort] ? req.query.sort : 'popular';
  const { list, facets } = await catalog.categoryProducts(cat, { attrs: filters, sort });
  // Быстрый выбор: если у товаров раздела есть характеристики, подбираем лучшее предложение на клиенте
  const all = Object.keys(filters).length ? (await catalog.categoryProducts(cat)).list : list;
  const attrKeys = Object.keys(facets).slice(0, 3);
  const quick = attrKeys.length >= 2 ? {
    attrs: attrKeys,
    items: all.filter((p) => p.live).map((p) => ({ slug: p.row.slug, price: p.live.price, currency: p.live.currency, available: p.state === 'available', attrs: p.row.attrs })),
  } : null;
  res.send(String(views.categoryPage({ user: req.user, categories: req.cats, cat, list, facets, filters, sort, quick, demo: catalog.isDemoStorefront() })));
});

app.get('/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';
  res.send(String(views.searchPage({ user: req.user, categories: req.cats, q, list: await catalog.search(q) })));
});

app.get('/demo/cover/:n.svg', (req, res) => {
  const n = Number(req.params.n);
  if (!config.demo || !(n >= 1 && n <= 8)) return res.status(404).end();
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=3600').send(views.demoCover(n));
});

app.get('/p/:slug', async (req, res) => {
  const found = catalog.getRowBySlug(req.params.slug);
  if (found.redirectTo) return res.redirect(301, `/p/${found.redirectTo}`);
  if (!found.row) return notFound(req, res, 'Товар не найден');
  const p = await catalog.resolveProduct(found.row);
  if (p.state === 'hidden') return notFound(req, res, 'Товар недоступен', 'Этот товар сейчас скрыт владельцем магазина.');
  const cat = found.row.category_id ? catalog.getCategoryById(found.row.category_id) : null;
  res.send(String(views.productPage({ p, cat, categories: req.cats, reviews: found.demo ? [] : catalog.productReviews(found.row.id), user: req.user })));
});

// ---------- Переход к оплате (S.4.2) ----------
app.post('/api/checkout', express.json({ limit: '20kb' }), async (req, res) => {
  const { slug, options = {}, shownPrice, idempotencyKey } = req.body || {};
  if (typeof slug !== 'string' || typeof idempotencyKey !== 'string' || idempotencyKey.length < 16 || idempotencyKey.length > 100 || typeof options !== 'object') {
    return res.status(400).json({ status: 'error', code: 'bad_request' });
  }
  if (config.demo || slug.startsWith('demo-')) return res.json({ status: 'error', code: 'demo', message: 'Покупка откроется после подключения Digiseller.' });

  // Повторный запрос с тем же ключом не создаёт новую подготовку оплаты
  const prev = db.prepare('SELECT * FROM checkout_attempts WHERE idempotency_key = ?').get(idempotencyKey);
  if (prev?.status === 'ready') return res.json({ status: 'redirect', payUrl: prev.pay_url });

  const found = catalog.getRowBySlug(slug);
  if (!found.row) return res.status(404).json({ status: 'error', code: 'not_found' });
  // Старая вкладка не обходит проверку: всегда свежие данные из источника
  const p = await catalog.resolveProduct(found.row, { fresh: true });
  if (p.state === 'hidden') return res.json({ status: 'hidden', message: 'Товар скрыт владельцем.' });
  if (p.state === 'error') return res.json({ status: 'error', code: 'price_unavailable', message: 'Не удалось проверить актуальную цену и наличие. Попробуйте позже.' });
  if (p.state === 'unavailable') return res.json({ status: 'unavailable', message: 'Товар закончился или временно недоступен.' });

  const chosen = Object.fromEntries(Object.entries(options).map(([k, v]) => [String(k), Array.isArray(v) ? v.map(String) : String(v)]));
  const errors = ds.validateOptions(p.live, chosen);
  if (Object.keys(errors).length) return res.json({ status: 'invalid', errors });

  const price = ds.computePrice(p.live, chosen);
  if (typeof shownPrice !== 'number' || Math.abs(price - shownPrice) > 0.009) {
    return res.json({ status: 'price_changed', price, currency: p.live.currency, formatted: formatPrice(price, p.live.currency),
      message: `Цена изменилась: теперь ${formatPrice(price, p.live.currency)}. Подтвердите, чтобы продолжить.` });
  }

  const attemptId = prev?.id || newId('chk');
  const save = (status, extra = {}) => db.prepare(`INSERT INTO checkout_attempts (id, idempotency_key, product_id, user_id, options, price, currency, id_po, pay_url, status, error, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO UPDATE SET status=excluded.status, id_po=excluded.id_po, pay_url=excluded.pay_url, error=excluded.error, price=excluded.price`)
    .run(attemptId, idempotencyKey, found.row.id, req.user?.id ?? null, JSON.stringify(chosen), price, p.live.currency,
      extra.idPo ?? null, extra.payUrl ?? null, status, extra.error ?? null, now());
  try {
    const { idPo, payUrl } = await ds.preparePayment(p.live, chosen, req.ip);
    save('ready', { idPo, payUrl });
    res.json({ status: 'redirect', payUrl });
  } catch (e) {
    save('prepare_failed', { error: e.message });
    res.json({ status: 'error', code: 'payment_prepare_failed', message: 'Не удалось подготовить оплату. Выбранные параметры сохранены — попробуйте ещё раз.' });
  }
});

app.get('/order/return', (req, res) => res.send(String(views.returnPage({ user: req.user, categories: req.cats }))));

// Уведомление Digiseller о продаже (настроить URL в кабинете продавца). Данные перепроверяются через API.
const notify = async (req, res) => {
  try {
    const r = await handleNotification({ ...req.query, ...(req.body || {}) });
    res.status(r.ok ? 200 : 400).send(r.ok ? 'OK' : r.error);
  } catch (e) {
    console.error('[notify]', e.message);
    res.status(503).send('retry'); // Digiseller повторит; дубля не будет (уникальная пара source+external_id)
  }
};
app.get('/api/digiseller/notify', notify);
app.post('/api/digiseller/notify', express.urlencoded({ extended: false }), express.json(), notify);

// ---------- Вход (S.3) ----------
app.get('/login', (req, res) => {
  const next = typeof req.query.next === 'string' && req.query.next.startsWith('/') && !req.query.next.startsWith('//') ? req.query.next : '/account';
  if (req.user) return res.redirect(next);
  res.send(String(views.loginPage({ user: null, next, categories: req.cats })));
});

app.post('/api/auth/request', express.json({ limit: '2kb' }), async (req, res) => {
  res.json(await auth.requestCode(req.body?.email));
});

app.post('/api/auth/verify', express.json({ limit: '2kb' }), (req, res) => {
  const r = auth.verifyCode(req.body?.email, req.body?.code);
  if (!r.ok) return res.json(r);
  setSessionCookie(res, auth.createSession(r.user.id, req.headers['user-agent']));
  res.json({ ok: true });
});

app.post('/logout', (req, res) => {
  auth.revokeSession(req.cookies[auth.SESSION_COOKIE]);
  res.clearCookie(auth.SESSION_COOKIE, { path: '/' });
  res.redirect('/');
});

// ---------- Аккаунт ----------
const linkMessages = {
  bad_format: 'Код выглядит неверно. Проверьте и введите ещё раз.',
  not_found: 'Покупка с таким кодом не найдена.',
  foreign_product: `Этот код относится к товару не из магазина ${config.brand}.`,
  linked_elsewhere: 'Эта покупка уже привязана к другому аккаунту. Если это ошибка — напишите в поддержку.',
  unavailable: 'Не удалось проверить код: Digiseller временно недоступен. Попробуйте позже.',
};

app.get('/account', (req, res) => {
  if (!req.user) return res.redirect('/login?next=/account');
  const f = req.query.linked ? { ok: true, text: 'Покупка привязана к аккаунту.' }
    : req.query.error ? { ok: false, text: linkMessages[req.query.error] || 'Ошибка.' } : null;
  res.send(String(views.accountPage({ user: req.user, orders: userOrders(req.user.id), flash: f, categories: req.cats })));
});

app.post('/account/link', express.urlencoded({ extended: false }), async (req, res) => {
  if (!req.user) return res.redirect('/login?next=/account');
  if (config.demo) return res.redirect('/account?error=unavailable');
  const r = await linkByUniqueCode(req.user, req.body.code);
  res.redirect(r.ok ? '/account?linked=1' : `/account?error=${r.error}`);
});

// ---------- Поддержка (S.6) ----------
app.get('/support', async (req, res) => {
  const products = (await catalog.categoryProducts(null)).list.filter((p) => !p.demo);
  const order = req.user && typeof req.query.order === 'string'
    ? db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?').get(req.query.order, req.user.id)?.id : null;
  res.send(String(views.supportPage({ user: req.user, categories: req.cats, products, selected: req.query.product, orderId: order })));
});

app.post('/support', express.urlencoded({ extended: false, limit: '20kb' }), async (req, res) => {
  const products = (await catalog.categoryProducts(null)).list.filter((p) => !p.demo);
  const form = { email: auth.normalizeEmail(req.body.email), message: String(req.body.message || '').trim().slice(0, 5000) };
  const selected = String(req.body.product || '');
  if (!auth.isEmail(form.email) || form.message.length < 5) {
    return res.status(400).send(String(views.supportPage({ user: req.user, categories: req.cats, products, selected, result: { ok: false, error: 'validation' }, form })));
  }
  const productId = catalog.getRowBySlug(selected).row?.id ?? null;
  const orderId = req.user && req.body.order
    ? db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?').get(String(req.body.order), req.user.id)?.id : null;
  const result = await createTicket({ userId: req.user?.id, email: form.email, productId, orderId, message: form.message });
  res.status(result.ok ? 200 : 502).send(String(views.supportPage({ user: req.user, categories: req.cats, products, selected, result, form })));
});

// ---------- Публичные документы ----------
const docs = { rules: 'Правила', offer: 'Публичная оферта', privacy: 'Политика конфиденциальности' };
app.get('/docs/:name', (req, res) => {
  const title = docs[req.params.name];
  if (!title) return res.status(404).send('Не найдено');
  const file = path.join(config.root, 'config', 'pages', `${req.params.name}.html`);
  res.send(String(views.docPage({ user: req.user, categories: req.cats, title, content: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null })));
});

app.use('/admin', admin);

app.get('/robots.txt', (req, res) => res.type('text/plain').send(config.demo ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /api/\nSitemap: ${config.baseUrl}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => {
  const urls = ['/', ...catalog.listCategories().map((c) => `/c/${c.slug}`), ...catalog.listProductRows().filter((r) => r.visibility === 'visible').map((r) => `/p/${r.slug}`)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${config.baseUrl}${u}</loc></url>`).join('')}</urlset>`);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Внутренняя ошибка');
});

app.listen(config.port, () => {
  console.log(`${config.brand} shop: ${config.baseUrl} (port ${config.port})${config.demo ? ' — ДЕМО-РЕЖИМ (Digiseller не подключён)' : ''}`);
  startScheduler();
});
