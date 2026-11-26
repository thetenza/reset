// Проверки ключевых требований ТЗ на моках Digiseller (без сети).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reset-test-'));
Object.assign(process.env, {
  DB_PATH: path.join(tmp, 'db.sqlite'), DIGISELLER_SELLER_ID: '777', DIGISELLER_API_KEY: 'k',
  AUTH_CODE_TTL_SEC: '600', AUTH_RESEND_COOLDOWN_SEC: '60', AUTH_MAX_CODE_ATTEMPTS: '3',
});

const productJson = (over = {}) => ({ retval: 0, product: {
  id: 1001, name: 'Товар', price: 100, currency: 'RUB', is_available: 1, seller: { id: 777 },
  options: [{ id: 5, label: 'Вариант', type: 'radio', required: 1, variants: [
    { value: 51, text: 'A', modify_value: 0 }, { value: 52, text: 'B', modify_value: 50 }] }], ...over } });

let routes = {};
globalThis.fetch = async (url, init) => {
  const u = new URL(url);
  for (const [prefix, fn] of Object.entries(routes)) if (u.pathname.startsWith(prefix)) {
    const body = await fn(u, init);
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  }
  throw new Error(`unmocked ${u}`);
};

const { db, seedProducts } = await import('../src/db.js');
seedProducts();
db.prepare("INSERT INTO products (id, slug, digiseller_id, visibility, category_id, images, variant_map, created_at, updated_at) VALUES ('rst_product_1','product-1',1001,'visible','cat_gta','[]','{}',0,0)").run();
const ds = await import('../src/digiseller.js');
const auth = await import('../src/auth.js');
const orders = await import('../src/orders.js');
const sync = await import('../src/sync.js');
const catalog = await import('../src/catalog.js');

test('цена и обязательные параметры', () => {
  const p = ds.normalizeProduct(productJson());
  assert.deepEqual(ds.validateOptions(p, {}), { 5: 'Обязательный параметр' });
  assert.deepEqual(ds.validateOptions(p, { 5: '99' }), { 5: 'Недопустимое значение' });
  assert.equal(ds.computePrice(p, { 5: '52' }), 150);
});

test('ошибка интеграции не превращается в нулевую цену', async () => {
  routes = { '/api/products/': () => ({ retval: 0, product: { id: 1001, name: 'x' } }) };
  const row = catalog.getRowById('rst_product_1');
  const r = await catalog.resolveProduct(row, { fresh: true });
  assert.equal(r.state, 'error');
  assert.equal(r.live, undefined);
});

test('товар чужого продавца отклоняется', async () => {
  routes = { '/api/products/': () => productJson({ seller: { id: 1 } }) };
  await assert.rejects(ds.fetchProduct(1001), /другому продавцу/);
});

test('нет в наличии', async () => {
  routes = { '/api/products/': () => productJson({ is_available: 0 }) };
  const r = await catalog.resolveProduct(catalog.getRowById('rst_product_1'), { fresh: true });
  assert.equal(r.state, 'unavailable');
});

test('вход по коду, неверный код, лимит попыток, максимум 3 сессии', async () => {
  const lines = [];
  const orig = console.log; console.log = (s) => lines.push(String(s));
  assert.equal((await auth.requestCode('User@Example.com')).ok, true);
  console.log = orig;
  const code = lines.join('\n').match(/код для входа в .+?: (\d{6})/)[1];
  assert.equal((await auth.requestCode('user@example.com')).error, 'cooldown');
  assert.equal(auth.verifyCode('user@example.com', '000000' === code ? '111111' : '000000').error, 'wrong_code');
  const ok = auth.verifyCode('user@example.com', code);
  assert.equal(ok.ok, true);
  assert.equal(auth.verifyCode('user@example.com', code).ok, false, 'код одноразовый');
  const tokens = [1, 2, 3, 4].map(() => auth.createSession(ok.user.id, 'ua'));
  // вручную состарим порядок: первая — самая старая
  assert.equal(auth.getSessionUser(tokens[3]).email, 'user@example.com');
  const active = tokens.filter((t) => auth.getSessionUser(t)).length;
  assert.equal(active, 3);
});

test('привязка по уникальному коду, без дублей и без чужих аккаунтов', async () => {
  routes = {
    '/api/apilogin': () => ({ retval: 0, token: 'T' }),
    '/api/purchases/unique-code/': () => ({ retval: 0, inv: 555, id_goods: 1001, amount: 150, type_curr: 'RUB', date_pay: '2026-11-20' }),
  };
  const u1 = { id: db.prepare('SELECT id FROM users').get().id };
  const r1 = await orders.linkByUniqueCode(u1, 'ABCDEF1234567890');
  assert.equal(r1.ok, true);
  const r2 = await orders.linkByUniqueCode(u1, 'ABCDEF1234567890');
  assert.equal(r2.ok, true);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM orders WHERE external_id='555'").get().n, 1);
  db.prepare("INSERT INTO users (id, email, created_at) VALUES ('usr_other','o@x.co',0)").run();
  assert.equal((await orders.linkByUniqueCode({ id: 'usr_other' }, 'ABCDEF1234567890')).error, 'linked_elsewhere');
});

test('уведомление перепроверяется и повтор не создаёт дубль', async () => {
  routes = {
    '/api/apilogin': () => ({ retval: 0, token: 'T' }),
    '/api/purchase/info/': () => ({ retval: 0, content: { item_id: 1001, amount: 100, currency_type: 'RUB', purchase_date: '2026-11-21' } }),
  };
  await orders.handleNotification({ id_i: '777001' });
  await orders.handleNotification({ id_i: '777001' });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM orders WHERE external_id='777001'").get().n, 1);
});

test('отзывы: повторная загрузка обновляет, удалённые помечаются, ошибка не обнуляет', async () => {
  let list = [{ id: 1, type: 'good', info: 'Отлично', date: '2026-11-01', invoice_id: 9 }, { id: 2, type: 'bad', info: 'Плохо', date: '2026-11-02' }];
  routes = { '/api/reviews': () => ({ retval: 0, totalPages: 1, review: list }) };
  await sync.syncReviews(); await sync.syncReviews();
  assert.equal(catalog.productReviews('rst_product_1').length, 2);
  list = [{ id: 1, type: 'good', info: 'Отлично, отредактировано', date: '2026-11-01' }];
  await sync.syncReviews();
  const rv = catalog.productReviews('rst_product_1');
  assert.equal(rv.length, 1);
  assert.equal(rv[0].text, 'Отлично, отредактировано');
  routes = { '/api/reviews': () => { throw new Error('down'); } };
  await sync.syncReviews();
  assert.equal(catalog.productReviews('rst_product_1').length, 1);
});
