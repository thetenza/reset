// S.3: вход по email и одноразовому коду. Без пароля и анкеты.
import crypto from 'node:crypto';
import { db, now, newId, sha256, tx } from './db.js';
import { config } from './config.js';
import { sendMail } from './mail.js';

const A = config.auth;
const DAY = 86_400_000;
export const SESSION_COOKIE = 'reset_sid';

export const normalizeEmail = (e) => String(e || '').trim().toLowerCase();
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

export async function requestCode(rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!isEmail(email)) return { ok: false, error: 'invalid_email' };
  const last = db.prepare('SELECT created_at FROM auth_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(email);
  const wait = last ? Math.ceil((last.created_at + A.resendCooldownSec * 1000 - now()) / 1000) : 0;
  if (wait > 0) return { ok: false, error: 'cooldown', retryAfter: wait };

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const id = tx(() => {
    db.prepare('UPDATE auth_codes SET consumed_at = ? WHERE email = ? AND consumed_at IS NULL').run(now(), email);
    return db.prepare('INSERT INTO auth_codes (email, code_hash, expires_at, created_at) VALUES (?,?,?,?)')
      .run(email, sha256(`${email}:${code}`), now() + A.codeTtlSec * 1000, now()).lastInsertRowid;
  });
  try {
    await sendMail({
      to: email,
      subject: `Код входа ${config.brand}: ${code}`,
      text: `Ваш код для входа в ${config.brand}: ${code}\n\nКод действует ${Math.round(A.codeTtlSec / 60)} мин. Если вы не запрашивали вход — просто проигнорируйте письмо.`,
    });
  } catch (e) {
    console.error('[auth] send failed', e.message);
    db.prepare('DELETE FROM auth_codes WHERE id = ?').run(id); // не блокируем повторную отправку
    return { ok: false, error: 'send_failed' };
  }
  return { ok: true, resendAfter: A.resendCooldownSec };
}

export function verifyCode(rawEmail, rawCode) {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode || '').replace(/\D/g, '');
  const row = db.prepare('SELECT * FROM auth_codes WHERE email = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1').get(email);
  if (!row) return { ok: false, error: 'no_code' };
  if (row.expires_at < now()) return { ok: false, error: 'expired' };
  if (row.attempts >= A.maxAttempts) return { ok: false, error: 'too_many_attempts' };
  const good = crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(sha256(`${email}:${code}`)));
  if (!good) {
    db.prepare('UPDATE auth_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    const left = A.maxAttempts - row.attempts - 1;
    return { ok: false, error: left > 0 ? 'wrong_code' : 'too_many_attempts', attemptsLeft: Math.max(0, left) };
  }
  return tx(() => {
    db.prepare('UPDATE auth_codes SET consumed_at = ? WHERE id = ?').run(now(), row.id);
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) { // первый вход — создаём запись
      const id = newId('usr');
      db.prepare('INSERT INTO users (id, email, email_verified_at, created_at) VALUES (?,?,?,?)').run(id, email, now(), now());
      user = { id, email };
    }
    return { ok: true, user };
  });
}

export function createSession(userId, userAgent) {
  const token = crypto.randomBytes(32).toString('base64url');
  tx(() => {
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at, user_agent) VALUES (?,?,?,?,?,?)')
      .run(sha256(token), userId, now(), now(), now() + A.sessionIdleDays * DAY, String(userAgent || '').slice(0, 200));
    // Максимум три активные сессии: при четвёртой отзывается самая старая.
    const active = db.prepare(`SELECT token_hash FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
      ORDER BY last_seen_at DESC`).all(userId, now());
    for (const s of active.slice(A.maxSessions)) db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ?').run(now(), s.token_hash);
  });
  return token;
}

export function getSessionUser(token) {
  if (!token) return null;
  const h = sha256(token);
  const s = db.prepare(`SELECT s.*, u.email FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`).get(h, now());
  if (!s) return null;
  // Продление по активности (не чаще раза в час, чтобы не писать на каждый запрос)
  if (now() - s.last_seen_at > 3_600_000) {
    db.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?').run(now(), now() + A.sessionIdleDays * DAY, h);
  }
  return { id: s.user_id, email: s.email, isAdmin: config.adminEmails.includes(s.email) };
}

export function revokeSession(token) {
  if (token) db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ?').run(now(), sha256(token));
}
