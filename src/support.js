// S.6: обращение считается отправленным только после сохранения И доставки получателю.
import { db, now, newId } from './db.js';
import { config } from './config.js';
import { sendMail, mailConfigured } from './mail.js';

const S = config.support;

export const supportChannelConfigured = () =>
  Boolean((S.telegramBotToken && S.telegramChatId) || (S.email && (mailConfigured() || !config.isProd)));

async function deliver(ticket, productTitle) {
  const text = [
    `Обращение ${ticket.id}`,
    `От: ${ticket.email}`,
    productTitle ? `Товар: ${productTitle}` : null,
    ticket.order_id ? `Покупка: ${ticket.order_id}` : null,
    '',
    ticket.message,
    '',
    `Ответить: ${config.baseUrl}/admin/tickets/${ticket.id}`,
  ].filter((x) => x !== null).join('\n');

  const errors = [];
  if (S.telegramBotToken && S.telegramChatId) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${S.telegramBotToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: S.telegramChatId, text }),
      });
      const j = await r.json();
      if (j.ok) return true;
      errors.push(`telegram: ${j.description}`);
    } catch (e) { errors.push(`telegram: ${e.message}`); }
  }
  if (S.email) {
    try { await sendMail({ to: S.email, subject: `${config.brand}: обращение ${ticket.id}`, text, replyTo: ticket.email }); return true; }
    catch (e) { errors.push(`email: ${e.message}`); }
  }
  throw new Error(errors.join('; ') || 'канал поддержки не настроен');
}

export async function createTicket({ userId, email, productId, orderId, message }) {
  const t = { id: newId('tkt'), user_id: userId || null, email, product_id: productId || null, order_id: orderId || null, message };
  db.prepare('INSERT INTO tickets (id, user_id, email, product_id, order_id, message, status, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(t.id, t.user_id, t.email, t.product_id, t.order_id, t.message, 'new', now());
  const title = productId ? db.prepare('SELECT COALESCE(title, slug) AS t FROM products WHERE id = ?').get(productId)?.t : null;
  try {
    await deliver(t, title);
    db.prepare('UPDATE tickets SET delivered_at = ?, delivery_error = NULL WHERE id = ?').run(now(), t.id);
    return { ok: true, id: t.id };
  } catch (e) {
    db.prepare('UPDATE tickets SET delivery_error = ? WHERE id = ?').run(e.message, t.id);
    console.error('[support] delivery failed', t.id, e.message);
    return { ok: false, id: t.id };
  }
}

export async function replyToTicket(ticketId, body) {
  const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!t) throw new Error('not found');
  const id = db.prepare('INSERT INTO ticket_replies (ticket_id, body, created_at) VALUES (?,?,?)').run(ticketId, body, now()).lastInsertRowid;
  try {
    await sendMail({ to: t.email, subject: `${config.brand}: ответ на обращение ${t.id}`, text: `${body}\n\n— Поддержка ${config.brand}\n\nВаше сообщение:\n${t.message}` });
    db.prepare('UPDATE ticket_replies SET sent_at = ? WHERE id = ?').run(now(), id);
    db.prepare("UPDATE tickets SET status = 'answered' WHERE id = ?").run(ticketId);
    return true;
  } catch (e) {
    db.prepare('UPDATE ticket_replies SET error = ? WHERE id = ?').run(e.message, id);
    return false;
  }
}
