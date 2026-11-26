import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_codes_email ON auth_codes(email, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- S.4.3 / S.7.2: собственный идентификатор RESET + связь с Digiseller.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  digiseller_id INTEGER,
  digiseller_seller_id TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'hidden' CHECK (visibility IN ('visible','hidden')),
  title TEXT,
  short TEXT,
  description TEXT,
  limitations TEXT,
  delivery TEXT,
  instruction TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  variant_map TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- S.7.1: таблица постоянных переходов при смене адреса
CREATE TABLE IF NOT EXISTS slug_redirects (
  old_slug TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS product_cache (
  product_id TEXT PRIMARY KEY REFERENCES products(id),
  data TEXT,
  error TEXT,
  fetched_at INTEGER NOT NULL
);

-- Попытки перехода к оплате. Это НЕ покупки (S.4.3).
CREATE TABLE IF NOT EXISTS checkout_attempts (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id),
  user_id TEXT,
  options TEXT NOT NULL,
  price REAL,
  currency TEXT,
  id_po TEXT,
  pay_url TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL
);

-- Подтверждённые сервером заказы. Пара (source, external_id) уникальна (S.7.3).
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  external_product_id TEXT,
  variant TEXT,
  amount REAL,
  currency TEXT,
  status TEXT NOT NULL,
  refunded INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  user_id TEXT REFERENCES users(id),
  linked_via TEXT,
  raw TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (source, external_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  rating_type TEXT NOT NULL,       -- исходная шкала источника: good / bad
  text TEXT,
  review_date TEXT,
  author_public TEXT,
  seller_reply TEXT,
  deleted_at INTEGER,
  updated_at INTEGER NOT NULL,
  UNIQUE (source, external_id)
);

-- S.5.2: агрегаты хранятся с охватом и датой отсечения, без создания покупок.
CREATE TABLE IF NOT EXISTS stats_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id),
  source TEXT NOT NULL,
  metric TEXT NOT NULL,            -- sales_count | reviews_good | reviews_bad ...
  value INTEGER NOT NULL,
  coverage TEXT NOT NULL,          -- например 'digiseller:all_time:product'
  cutoff_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  ok INTEGER NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  order_id TEXT REFERENCES orders(id),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  delivered_at INTEGER,
  delivery_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  body TEXT NOT NULL,
  sent_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL
);
`);

export const now = () => Date.now();
export const newId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- Каталог: категории + доп. поля товаров ----------
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short TEXT,
  theme TEXT NOT NULL DEFAULT 'default',   -- default | vice (палитра GTA)
  banner_image TEXT,
  chip_attr TEXT,                           -- характеристика для быстрых фильтров (напр. «Платформа»)
  sort INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible','hidden')),
  created_at INTEGER NOT NULL
);
`);
function addColumn(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
addColumn('products', 'category_id', 'TEXT REFERENCES categories(id)');
addColumn('products', 'kind', 'TEXT');                 // «Ключ», «Активация», «Пополнение»…
addColumn('products', 'badge', 'TEXT');                // короткая плашка на карточке
addColumn('products', 'attrs', "TEXT NOT NULL DEFAULT '{}'"); // {"Платформа":"PlayStation","Регион":"Турция"}
addColumn('products', 'featured', 'INTEGER NOT NULL DEFAULT 0'); // показывать на главной

// Первичное наполнение категорий и товаров из config/*.json (только если таблицы пусты).
export function seedProducts() {
  const readCfg = (name) => { try { return JSON.parse(fs.readFileSync(path.join(config.root, 'config', name), 'utf8')); } catch { return []; } };
  if (db.prepare('SELECT COUNT(*) AS n FROM categories').get().n === 0) {
    const ins = db.prepare('INSERT INTO categories (id, slug, name, short, theme, banner_image, chip_attr, sort, visibility, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    tx(() => readCfg('categories.json').forEach((c, i) => ins.run(c.id || newId('cat'), c.slug, c.name, c.short ?? null, c.theme ?? 'default',
      c.banner_image ?? null, c.chip_attr ?? null, c.sort ?? i, c.visibility ?? 'visible', now())));
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n > 0) return;
  const list = readCfg('products.json');
  const ins = db.prepare(`INSERT INTO products
    (id, slug, digiseller_id, digiseller_seller_id, sort, visibility, title, short, description, limitations, delivery, instruction, images, variant_map,
     category_id, kind, badge, attrs, featured, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  tx(() => list.forEach((p, i) => ins.run(
    p.id || newId('rst'), p.slug, p.digiseller_id ?? null, p.digiseller_seller_id ?? null,
    p.sort ?? i, p.visibility ?? 'hidden', p.title ?? null, p.short ?? null, p.description ?? null,
    p.limitations ?? null, p.delivery ?? null, p.instruction ?? null,
    JSON.stringify(p.images ?? []), JSON.stringify(p.variant_map ?? {}),
    p.category_id ?? null, p.kind ?? null, p.badge ?? null, JSON.stringify(p.attrs ?? {}), p.featured ? 1 : 0, now(), now(),
  )));
}
