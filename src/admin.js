// Управление магазином: разделы, товары (без ограничения количества), связь с Digiseller, обращения.
import express from 'express';
import { db, now, newId } from './db.js';
import { html } from './html.js';
import { layout } from './views.js';
import { listProductRows, getRowById, resolveProduct, listCategories, getCategoryById } from './catalog.js';
import { syncReviews, syncStats } from './sync.js';
import { replyToTicket } from './support.js';
import * as ds from './digiseller.js';
import { config } from './config.js';

export const admin = express.Router();
const form = express.urlencoded({ extended: false, limit: '100kb' });

admin.use((req, res, next) => {
  if (!req.user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  if (!req.user.isAdmin) return res.status(403).send('Нет доступа');
  next();
});

const page = (req, title, body) => layout({ title: `Админка: ${title}`, user: req.user, categories: req.cats, noindex: true,
  body: html`<div class="wrap page admin">
    <nav class="toolbar"><a class="tool" href="/admin">Обзор</a><a class="tool" href="/admin/products/new">+ Товар</a><a class="tool" href="/admin/categories/new">+ Раздел</a></nav>
    ${body}</div>` });

const clean = (v) => (String(v ?? '').trim() || null);
const slugOk = (s) => /^[a-z0-9][a-z0-9-]{1,60}$/.test(s);
const err = (res, text) => res.status(400).send(`<p style="font-family:sans-serif">Ошибка: ${String(text).replace(/</g, '&lt;')}. <a href="javascript:history.back()">Назад</a></p>`);
const parseAttrs = (text) => Object.fromEntries(String(text || '').split(/\r?\n/).map((l) => l.split(':')).filter((p) => p.length >= 2 && p[0].trim() && p.slice(1).join(':').trim())
  .map((p) => [p[0].trim().slice(0, 40), p.slice(1).join(':').trim().slice(0, 60)]));

const field = (label, name, value, { textarea = false, hint, rows = 4 } = {}) => html`<label class="field"><span class="label">${label}</span>
  ${textarea ? html`<textarea name="${name}" rows="${rows}">${value ?? ''}</textarea>` : html`<input type="text" name="${name}" value="${value ?? ''}">`}
  ${hint ? html`<span class="hint">${hint}</span>` : ''}</label>`;
const select = (label, name, value, options) => html`<label class="field"><span class="label">${label}</span><select name="${name}">
  ${options.map(([v, t]) => html`<option value="${v}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${t}</option>`)}</select></label>`;

// ---------- Обзор ----------
admin.get('/', async (req, res) => {
  const cats = listCategories({ includeHidden: true });
  const rows = listProductRows();
  const resolved = await Promise.all(rows.map((r) => resolveProduct(r, { includeHidden: true })));
  const tickets = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 30').all();
  const syncs = db.prepare('SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 4').all();
  const catName = (id) => cats.find((c) => c.id === id)?.name || '—';
  res.send(String(page(req, 'обзор', html`
    <h1>Управление магазином</h1>
    ${config.demo ? html`<div class="notice notice-warn">Digiseller не подключён (нет ID продавца) — на витрине показываются демо-товары, цены ваших товаров не загружаются.</div>` : ''}

    <div class="section-head"><h2>Товары · ${rows.length}</h2><a class="btn btn-small" href="/admin/products/new">Добавить товар</a></div>
    ${rows.length ? html`<table class="table"><thead><tr><th>Товар</th><th>Раздел</th><th>Digiseller</th><th>Цена</th><th>Статус</th><th></th></tr></thead><tbody>
    ${resolved.map((p) => html`<tr>
      <td><b>${p.title}</b><div class="small muted">/p/${p.row.slug}${p.row.featured ? ' · на главной' : ''}</div></td>
      <td>${catName(p.row.category_id)}</td>
      <td>${p.row.digiseller_id ?? '—'}</td>
      <td>${p.live ? `${p.live.price} ${p.live.currency}` : '—'}</td>
      <td>${p.row.visibility === 'visible' ? 'Показан' : 'Скрыт'} · ${{ available: 'в наличии', unavailable: 'нет в наличии', error: 'ошибка', hidden: 'скрыт' }[p.state]}
        ${p.error ? html`<div class="small muted">${p.error}</div>` : ''}</td>
      <td><a href="/admin/products/${p.row.id}">Изменить</a></td></tr>`)}
    </tbody></table>` : html`<p class="muted">Товаров пока нет. Нажмите «Добавить товар» и укажите ID товара из Digiseller.</p>`}

    <div class="section-head section"><h2>Разделы</h2><a class="btn btn-small btn-ghost" href="/admin/categories/new">Добавить раздел</a></div>
    <table class="table"><thead><tr><th>#</th><th>Раздел</th><th>Адрес</th><th>Оформление</th><th>Товаров</th><th>Видимость</th><th></th></tr></thead><tbody>
    ${cats.map((c) => html`<tr><td>${c.sort}</td><td><b>${c.name}</b></td><td><a href="/c/${c.slug}">/c/${c.slug}</a></td><td>${c.theme === 'vice' ? 'GTA (закат)' : 'Обычное'}</td>
      <td>${rows.filter((r) => r.category_id === c.id).length}</td><td>${c.visibility === 'visible' ? 'Показан' : 'Скрыт'}</td><td><a href="/admin/categories/${c.id}">Изменить</a></td></tr>`)}
    </tbody></table>

    <div class="section"><h2>Синхронизация с Digiseller</h2>
    <form method="post" action="/admin/sync"><button class="btn" type="submit">Обновить отзывы и статистику</button></form>
    <ul class="small">${syncs.map((s) => html`<li>${new Date(s.created_at).toLocaleString('ru-RU')} — ${s.kind}: ${s.ok ? 'ок' : 'ошибки'} <code>${s.details}</code></li>`)}</ul></div>

    <div class="section"><h2>Обращения</h2>
    ${tickets.length ? html`<table class="table"><thead><tr><th>Дата</th><th>Email</th><th>Статус</th><th>Доставка</th><th></th></tr></thead><tbody>
    ${tickets.map((t) => html`<tr><td>${new Date(t.created_at).toLocaleString('ru-RU')}</td><td>${t.email}</td><td>${t.status}</td>
      <td>${t.delivered_at ? 'доставлено' : html`<span class="pcard-price-err">не доставлено</span>`}</td><td><a href="/admin/tickets/${t.id}">Открыть</a></td></tr>`)}
    </tbody></table>` : html`<p class="muted">Обращений пока нет.</p>`}</div>`)));
});

// ---------- Товар: создание и редактирование ----------
function productForm(req, r, { isNew, prefill = {}, note } = {}) {
  const cats = listCategories({ includeHidden: true });
  const v = (k) => prefill[k] ?? r?.[k];
  return page(req, isNew ? 'новый товар' : r.slug, html`
    <h1>${isNew ? 'Новый товар' : `Товар ${r.id}`}</h1>
    ${note ? html`<div class="notice ${note.ok ? 'notice-ok' : 'notice-warn'}">${note.text}</div>` : ''}
    <p class="small muted">Название, цена, варианты и картинки по умолчанию берутся из Digiseller. Поля ниже — тексты и оформление витрины. Не публикуйте ключи, выдаваемые данные и приватные инструкции.</p>
    ${isNew ? html`<form method="post" action="/admin/products/prefill" class="inline-form card-plain">
      <input type="text" name="digiseller_id" placeholder="ID товара Digiseller" value="${v('digiseller_id') ?? ''}" aria-label="ID товара Digiseller">
      <button class="btn btn-ghost" type="submit">Подтянуть из Digiseller</button>
    </form>` : ''}
    <form method="post" action="${isNew ? '/admin/products/new' : `/admin/products/${r.id}`}" class="stack">
      <div class="admin-grid">
        ${field('ID товара Digiseller', 'digiseller_id', v('digiseller_id'))}
        ${field('Адрес страницы (латиница)', 'slug', v('slug'), { hint: 'Например gta6-ps5-turkey → сайт/p/gta6-ps5-turkey. При смене старая ссылка перенаправит на новую.' })}
        ${select('Раздел', 'category_id', v('category_id'), [['', '— без раздела —'], ...cats.map((c) => [c.id, c.name])])}
        ${select('Видимость', 'visibility', v('visibility') || 'hidden', [['visible', 'Показан'], ['hidden', 'Скрыт']])}
        ${select('Показывать на главной', 'featured', v('featured') ? '1' : '0', [['0', 'Нет'], ['1', 'Да']])}
        ${field('Порядок', 'sort', v('sort') ?? 0)}
        ${field('Тип (под ценой)', 'kind', v('kind'), { hint: 'Ключ, Активация, Пополнение, Аккаунт…' })}
        ${field('Плашка на картинке', 'badge', v('badge'), { hint: 'Хит, Новинка, Предзаказ… или пусто' })}
      </div>
      ${field('Название (пусто — из Digiseller)', 'title', v('title'))}
      ${field('Краткое описание', 'short', v('short'))}
      ${field('Характеристики для фильтров — по одной в строке «Название: значение»', 'attrs',
        Object.entries(typeof v('attrs') === 'string' ? JSON.parse(v('attrs') || '{}') : v('attrs') || {}).map(([k, x]) => `${k}: ${x}`).join('\n'),
        { textarea: true, rows: 3, hint: 'Например: Платформа: PlayStation / Регион: Турция / Издание: Standard. По ним работают фильтры и быстрый выбор в разделе.' })}
      ${field('Что получает покупатель (пусто — описание из Digiseller)', 'description', v('description'), { textarea: true })}
      ${field('Ограничения и условия', 'limitations', v('limitations'), { textarea: true })}
      ${field('Способ и порядок получения', 'delivery', v('delivery'), { textarea: true, hint: 'Только то, что реально настроено в Digiseller для этого товара' })}
      ${field('Публичная инструкция до покупки', 'instruction', v('instruction'), { textarea: true })}
      ${field('Изображения — ссылки https://, по одной в строке (пусто — из Digiseller)', 'images', (v('images') || []).join?.('\n') ?? '', { textarea: true, rows: 3 })}
      <div class="inline-form"><button class="btn btn-big" type="submit">${isNew ? 'Создать товар' : 'Сохранить'}</button>
      ${!isNew ? html`<a class="btn btn-ghost btn-big" href="/p/${r.slug}">Открыть на сайте</a>` : ''}</div>
    </form>
    ${!isNew ? html`<form method="post" action="/admin/products/${r.id}/delete" class="section"><button class="btn btn-ghost" type="submit" data-confirm>Удалить товар</button>
      <span class="small muted"> Отзывы и заказы останутся в базе. Безопаснее просто скрыть.</span></form>` : ''}`);
}

admin.get('/products/new', (req, res) => res.send(String(productForm(req, null, { isNew: true }))));

admin.post('/products/prefill', form, async (req, res) => {
  const id = clean(req.body.digiseller_id);
  if (!id || !/^\d+$/.test(id)) return res.send(String(productForm(req, null, { isNew: true, note: { ok: false, text: 'Укажите числовой ID товара Digiseller.' } })));
  try {
    const p = await ds.fetchProduct(id);
    const slug = (p.name || `item-${id}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || `item-${id}`;
    res.send(String(productForm(req, null, { isNew: true, prefill: { digiseller_id: id, slug: slugOk(slug) ? slug : `item-${id}` },
      note: { ok: true, text: `Найден товар «${p.name}» — ${p.price} ${p.currency}${p.available === false ? ', нет в наличии' : ''}. Заполните остальное и создайте товар.` } })));
  } catch (e) {
    res.send(String(productForm(req, null, { isNew: true, prefill: { digiseller_id: id }, note: { ok: false, text: `Digiseller: ${e.message}` } })));
  }
});

function readProductBody(b) {
  const slug = String(b.slug || '').trim().toLowerCase();
  if (!slugOk(slug)) throw new Error('Адрес: латиница, цифры и дефис, 2–60 символов');
  const dsId = clean(b.digiseller_id);
  if (dsId && !/^\d+$/.test(dsId)) throw new Error('ID Digiseller — число');
  const cat = clean(b.category_id);
  if (cat && !getCategoryById(cat)) throw new Error('Раздел не найден');
  return {
    slug, digiseller_id: dsId ? Number(dsId) : null, category_id: cat, visibility: b.visibility === 'visible' ? 'visible' : 'hidden',
    featured: b.featured === '1' ? 1 : 0, sort: Number(b.sort) || 0, kind: clean(b.kind), badge: clean(b.badge)?.slice(0, 20) ?? null,
    title: clean(b.title), short: clean(b.short), description: clean(b.description), limitations: clean(b.limitations),
    delivery: clean(b.delivery), instruction: clean(b.instruction), attrs: JSON.stringify(parseAttrs(b.attrs)),
    images: JSON.stringify(String(b.images || '').split(/\s+/).filter((u) => /^(https:\/\/|\/static\/)/.test(u)).slice(0, 10)),
  };
}

admin.post('/products/new', form, (req, res) => {
  let d; try { d = readProductBody(req.body); } catch (e) { return err(res, e.message); }
  if (db.prepare('SELECT 1 FROM products WHERE slug = ?').get(d.slug)) return err(res, 'Такой адрес уже занят');
  const id = newId('rst');
  db.prepare(`INSERT INTO products (id, slug, digiseller_id, category_id, visibility, featured, sort, kind, badge, title, short, description,
    limitations, delivery, instruction, attrs, images, variant_map, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'{}',?,?)`)
    .run(id, d.slug, d.digiseller_id, d.category_id, d.visibility, d.featured, d.sort, d.kind, d.badge, d.title, d.short, d.description,
      d.limitations, d.delivery, d.instruction, d.attrs, d.images, now(), now());
  res.redirect(`/admin/products/${id}?saved=1`);
});

admin.get('/products/:id', (req, res) => {
  const r = getRowById(req.params.id);
  if (!r) return res.status(404).send('Не найдено');
  res.send(String(productForm(req, r, { note: req.query.saved ? { ok: true, text: 'Сохранено.' } : null })));
});

admin.post('/products/:id', form, (req, res) => {
  const r = getRowById(req.params.id);
  if (!r) return res.status(404).send('Не найдено');
  let d; try { d = readProductBody(req.body); } catch (e) { return err(res, e.message); }
  db.exec('BEGIN');
  try {
    if (d.slug !== r.slug) {
      if (db.prepare('SELECT 1 FROM products WHERE slug = ? AND id != ?').get(d.slug, r.id)) throw new Error('Такой адрес уже занят');
      db.prepare('INSERT OR REPLACE INTO slug_redirects (old_slug, product_id) VALUES (?, ?)').run(r.slug, r.id);
      db.prepare('DELETE FROM slug_redirects WHERE old_slug = ?').run(d.slug);
    }
    db.prepare(`UPDATE products SET slug=?, digiseller_id=?, category_id=?, visibility=?, featured=?, sort=?, kind=?, badge=?, title=?, short=?,
      description=?, limitations=?, delivery=?, instruction=?, attrs=?, images=?, updated_at=? WHERE id=?`).run(
      d.slug, d.digiseller_id, d.category_id, d.visibility, d.featured, d.sort, d.kind, d.badge, d.title, d.short,
      d.description, d.limitations, d.delivery, d.instruction, d.attrs, d.images, now(), r.id);
    if (String(r.digiseller_id ?? '') !== String(d.digiseller_id ?? '')) db.prepare('DELETE FROM product_cache WHERE product_id = ?').run(r.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return err(res, e.message); }
  res.redirect(`/admin/products/${r.id}?saved=1`);
});

admin.post('/products/:id/delete', (req, res) => {
  const r = getRowById(req.params.id);
  if (!r) return res.status(404).send('Не найдено');
  db.exec('BEGIN');
  try {
    // Связанные записи (отзывы, заказы) сохраняются для истории, но отвязываются от товара
    db.prepare('UPDATE reviews SET product_id = NULL WHERE product_id = ?').run(r.id);
    db.prepare('UPDATE orders SET product_id = NULL WHERE product_id = ?').run(r.id);
    db.prepare('UPDATE tickets SET product_id = NULL WHERE product_id = ?').run(r.id);
    for (const t of ['product_cache', 'slug_redirects', 'stats_snapshots', 'checkout_attempts']) db.prepare(`DELETE FROM ${t} WHERE product_id = ?`).run(r.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(r.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return err(res, e.message); }
  res.redirect('/admin');
});

// ---------- Разделы ----------
function categoryForm(req, c, isNew) {
  return page(req, isNew ? 'новый раздел' : c.name, html`
    <h1>${isNew ? 'Новый раздел' : `Раздел «${c.name}»`}</h1>
    <form method="post" action="${isNew ? '/admin/categories/new' : `/admin/categories/${c.id}`}" class="stack">
      <div class="admin-grid">
        ${field('Название', 'name', c?.name)}
        ${field('Адрес (латиница)', 'slug', c?.slug, { hint: 'сайт/c/адрес' })}
        ${select('Оформление', 'theme', c?.theme || 'default', [['default', 'Обычное (оранжевое RESET)'], ['vice', 'GTA — закатная палитра']])}
        ${select('Видимость', 'visibility', c?.visibility || 'visible', [['visible', 'Показан'], ['hidden', 'Скрыт']])}
        ${field('Порядок', 'sort', c?.sort ?? 0)}
        ${field('Быстрые фильтры по характеристике', 'chip_attr', c?.chip_attr, { hint: 'Например «Платформа» — появятся кнопки PlayStation / Xbox / PC' })}
      </div>
      ${field('Короткое описание', 'short', c?.short)}
      ${field('Картинка баннера (ссылка https://, пусто — рисованный закат)', 'banner_image', c?.banner_image, { hint: 'Используйте только изображения, на которые у вас есть права' })}
      <button class="btn btn-big" type="submit">${isNew ? 'Создать раздел' : 'Сохранить'}</button>
    </form>`);
}
const readCat = (b) => {
  const slug = String(b.slug || '').trim().toLowerCase();
  if (!slugOk(slug)) throw new Error('Адрес: латиница, цифры и дефис');
  const name = clean(b.name); if (!name) throw new Error('Укажите название');
  const banner = clean(b.banner_image);
  if (banner && !/^https:\/\//.test(banner)) throw new Error('Картинка — ссылка https://');
  return { slug, name: name.slice(0, 60), short: clean(b.short), theme: b.theme === 'vice' ? 'vice' : 'default', banner_image: banner,
    chip_attr: clean(b.chip_attr), sort: Number(b.sort) || 0, visibility: b.visibility === 'hidden' ? 'hidden' : 'visible' };
};
admin.get('/categories/new', (req, res) => res.send(String(categoryForm(req, null, true))));
admin.post('/categories/new', form, (req, res) => {
  let c; try { c = readCat(req.body); } catch (e) { return err(res, e.message); }
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(c.slug)) return err(res, 'Такой адрес уже занят');
  db.prepare('INSERT INTO categories (id, slug, name, short, theme, banner_image, chip_attr, sort, visibility, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(newId('cat'), c.slug, c.name, c.short, c.theme, c.banner_image, c.chip_attr, c.sort, c.visibility, now());
  res.redirect('/admin');
});
admin.get('/categories/:id', (req, res) => {
  const c = getCategoryById(req.params.id);
  if (!c) return res.status(404).send('Не найдено');
  res.send(String(categoryForm(req, c, false)));
});
admin.post('/categories/:id', form, (req, res) => {
  const old = getCategoryById(req.params.id);
  if (!old) return res.status(404).send('Не найдено');
  let c; try { c = readCat(req.body); } catch (e) { return err(res, e.message); }
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ? AND id != ?').get(c.slug, old.id)) return err(res, 'Такой адрес уже занят');
  db.prepare('UPDATE categories SET slug=?, name=?, short=?, theme=?, banner_image=?, chip_attr=?, sort=?, visibility=? WHERE id=?')
    .run(c.slug, c.name, c.short, c.theme, c.banner_image, c.chip_attr, c.sort, c.visibility, old.id);
  res.redirect('/admin');
});

admin.post('/sync', async (req, res) => {
  await syncReviews();
  await syncStats();
  res.redirect('/admin');
});

// ---------- Обращения ----------
admin.get('/tickets/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).send('Не найдено');
  const replies = db.prepare('SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at').all(t.id);
  res.send(String(page(req, t.id, html`
    <h1>Обращение ${t.id}</h1>
    <p>От <b>${t.email}</b> · ${new Date(t.created_at).toLocaleString('ru-RU')}${t.product_id ? ` · товар ${t.product_id}` : ''}${t.order_id ? ` · покупка ${t.order_id}` : ''}</p>
    <blockquote class="card-plain">${t.message}</blockquote>
    ${replies.map((r) => html`<div class="card-plain"><div class="small muted">${new Date(r.created_at).toLocaleString('ru-RU')} — ${r.sent_at ? 'отправлено' : html`<span class="pcard-price-err">не отправлено: ${r.error}</span>`}</div>${r.body}</div>`)}
    <form method="post" class="stack">
      <label class="field"><span class="label">Ответ (уйдёт на email клиента)</span><textarea name="body" rows="6" required></textarea></label>
      <button class="btn" type="submit">Отправить ответ</button>
    </form>`)));
});

admin.post('/tickets/:id', form, async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (body) await replyToTicket(req.params.id, body);
  res.redirect(`/admin/tickets/${req.params.id}`);
});
