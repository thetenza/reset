// S.5 / S.7: загрузка отзывов и статистики. Повторная загрузка обновляет те же записи.
import { db, now, newId, tx } from './db.js';
import { config } from './config.js';
import * as ds from './digiseller.js';
import { listProductRows } from './catalog.js';

function log(kind, ok, details) {
  db.prepare('INSERT INTO sync_log (kind, ok, details, created_at) VALUES (?,?,?,?)').run(kind, ok ? 1 : 0, JSON.stringify(details), now());
}

export async function syncReviews() {
  if (config.demo) return { skipped: 'demo' };
  const result = {};
  for (const row of listProductRows().filter((r) => r.digiseller_id)) {
    try {
      const reviews = await ds.fetchReviews(row.digiseller_id);
      const seen = new Set(reviews.map((r) => r.externalId));
      tx(() => {
        for (const r of reviews) {
          db.prepare(`INSERT INTO reviews (id, source, external_id, product_id, rating_type, text, review_date, author_public, seller_reply, deleted_at, updated_at)
            VALUES (?, 'digiseller', ?, ?, ?, ?, ?, ?, ?, NULL, ?)
            ON CONFLICT(source, external_id) DO UPDATE SET rating_type=excluded.rating_type, text=excluded.text,
              review_date=excluded.review_date, seller_reply=excluded.seller_reply, deleted_at=NULL, updated_at=excluded.updated_at`)
            .run(newId('rev'), r.externalId, row.id, r.type, r.text, r.date, r.author, r.sellerReply, now());
        }
        // Удалённые в источнике — помечаем (только после успешной полной загрузки)
        for (const old of db.prepare("SELECT id, external_id FROM reviews WHERE source='digiseller' AND product_id = ? AND deleted_at IS NULL").all(row.id)) {
          if (!seen.has(old.external_id)) db.prepare('UPDATE reviews SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now(), now(), old.id);
        }
      });
      result[row.slug] = { ok: true, count: reviews.length };
    } catch (e) {
      result[row.slug] = { ok: false, error: e.message }; // ошибка ≠ 0 отзывов: старые данные не трогаем
    }
  }
  log('reviews', Object.values(result).every((r) => r.ok), result);
  return result;
}

// Итог продаж по всему товару на Digiseller — хранится как снапшот с охватом и датой отсечения.
export async function syncStats() {
  if (config.demo) return { skipped: 'demo' };
  const result = {};
  for (const row of listProductRows().filter((r) => r.digiseller_id)) {
    try {
      const p = await ds.fetchProduct(row.digiseller_id);
      const ins = db.prepare('INSERT INTO stats_snapshots (product_id, source, metric, value, coverage, cutoff_at) VALUES (?,?,?,?,?,?)');
      const t = now();
      for (const [metric, value] of [['sales_count', p.stats.sales], ['reviews_good', p.stats.reviewsGood], ['reviews_bad', p.stats.reviewsBad]]) {
        if (value !== null) ins.run(row.id, 'digiseller', metric, value, 'digiseller:product:all_time', t);
      }
      result[row.slug] = { ok: true, stats: p.stats };
    } catch (e) { result[row.slug] = { ok: false, error: e.message }; }
  }
  log('stats', Object.values(result).every((r) => r.ok), result);
  return result;
}

export function startScheduler() {
  if (config.demo) return;
  const run = () => syncReviews().then(syncStats).catch((e) => console.error('[sync]', e.message));
  setTimeout(run, 5_000);
  setInterval(run, 6 * 3_600_000);
}
