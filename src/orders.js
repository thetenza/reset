// Покупки и привязка к аккаунту. Запись появляется только после серверной проверки в Digiseller (S.4.3).
import { db, now, newId, tx } from './db.js';
import * as ds from './digiseller.js';

const productIdByExternal = (extId) =>
  db.prepare('SELECT id FROM products WHERE digiseller_id = ?').get(Number(extId))?.id ?? null;

// Идемпотентно: (source, external_id) — одна запись; повтор обновляет её.
export function upsertOrder(inv, { userId = null, linkedVia = null } = {}) {
  return tx(() => {
    const existing = db.prepare("SELECT * FROM orders WHERE source = 'digiseller' AND external_id = ?").get(inv.invoiceId);
    const status = inv.refunded ? 'refunded' : 'paid';
    if (existing) {
      db.prepare(`UPDATE orders SET amount=?, currency=?, status=?, refunded=?, paid_at=?, raw=?, updated_at=?,
        user_id = COALESCE(user_id, ?), linked_via = COALESCE(linked_via, ?) WHERE id = ?`)
        .run(inv.amount, inv.currency, status, inv.refunded ? 1 : 0, inv.paidAt, JSON.stringify(inv.raw), now(), userId, linkedVia, existing.id);
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id);
    }
    const id = newId('ord');
    db.prepare(`INSERT INTO orders (id, source, external_id, product_id, external_product_id, variant, amount, currency, status,
      refunded, paid_at, user_id, linked_via, raw, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, 'digiseller', inv.invoiceId, productIdByExternal(inv.productExternalId), inv.productExternalId,
        inv.options ? JSON.stringify(inv.options) : null, inv.amount, inv.currency, status, inv.refunded ? 1 : 0,
        inv.paidAt, userId, linkedVia, JSON.stringify(inv.raw), now(), now());
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  });
}

// Привязка по уникальному коду Digiseller. Совпадение email само по себе не используется (S.3).
export async function linkByUniqueCode(user, code) {
  const clean = String(code || '').trim();
  if (!/^[A-Za-z0-9]{8,32}$/.test(clean)) return { ok: false, error: 'bad_format' };
  let inv;
  try { inv = await ds.checkUniqueCode(clean); }
  catch (e) { return { ok: false, error: e.message.includes('не найден') || e.message.includes('retval') ? 'not_found' : 'unavailable' }; }
  if (!productIdByExternal(inv.productExternalId)) return { ok: false, error: 'foreign_product' };
  const existing = db.prepare("SELECT user_id FROM orders WHERE source='digiseller' AND external_id = ?").get(inv.invoiceId);
  if (existing?.user_id && existing.user_id !== user.id) return { ok: false, error: 'linked_elsewhere' };
  const order = upsertOrder({ ...inv, refunded: false }, { userId: user.id, linkedVia: 'unique_code' });
  return { ok: true, order };
}

// Уведомление Digiseller о продаже: параметрам не доверяем, перепроверяем заказ через API.
export async function handleNotification(params) {
  const invoiceId = params.id_i || params.ID_I || params.inv || params.invoice_id;
  if (!invoiceId || !/^\d+$/.test(String(invoiceId))) return { ok: false, error: 'no_invoice' };
  const inv = await ds.fetchInvoice(String(invoiceId));
  if (!productIdByExternal(inv.productExternalId)) return { ok: false, error: 'foreign_product' };
  upsertOrder(inv);
  return { ok: true };
}

export const userOrders = (userId) => db.prepare(`SELECT o.*, p.slug, p.title FROM orders o LEFT JOIN products p ON p.id = o.product_id
  WHERE o.user_id = ? ORDER BY o.created_at DESC`).all(userId);
