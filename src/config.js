// Вся конфигурация — из переменных окружения (.env). Секреты на клиент не отдаются.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

// Простой загрузчик .env (без зависимостей)
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const env = (k, d = '') => (process.env[k] ?? d).trim();
const isProd = env('NODE_ENV') === 'production';

// S.3: лимиты авторизации берутся из действующих требований RESET.
// В production их обязательно задать явно; dev-значения — только для локальной разработки.
const authLimit = (key, devValue) => {
  const v = env(key);
  if (v) return Number(v);
  if (isProd) throw new Error(`Не задан ${key}: укажите значение из действующих требований авторизации RESET`);
  console.warn(`[config] ${key} не задан — используется dev-значение ${devValue}. Перед запуском замените значением RESET.`);
  return devValue;
};

export const config = {
  root,
  isProd,
  brand: env('BRAND_NAME', 'RESET'),
  port: Number(env('PORT', '3000')),
  baseUrl: env('BASE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  dbPath: env('DB_PATH', path.join(root, 'data', 'reset.sqlite')),

  // Демо-режим включается, только если не задан продавец Digiseller.
  get demo() { return !this.digiseller.sellerId; },

  digiseller: {
    sellerId: env('DIGISELLER_SELLER_ID'),
    apiKey: env('DIGISELLER_API_KEY'), // только сервер
    apiBase: env('DIGISELLER_API_BASE', 'https://api.digiseller.com'),
    payUrl: env('DIGISELLER_PAY_URL', 'https://www.oplata.info/asp2/pay.asp'),
    currency: env('DIGISELLER_CURRENCY', 'RUB'),
    lang: env('DIGISELLER_LANG', 'ru-RU'),
    cacheTtlSec: Number(env('DIGISELLER_CACHE_TTL_SEC', '120')),
  },

  auth: {
    codeTtlSec: authLimit('AUTH_CODE_TTL_SEC', 600),
    resendCooldownSec: authLimit('AUTH_RESEND_COOLDOWN_SEC', 60),
    maxAttempts: authLimit('AUTH_MAX_CODE_ATTEMPTS', 5),
    // S.3: зафиксировано в ТЗ
    sessionIdleDays: 30,
    maxSessions: 3,
  },

  adminEmails: env('ADMIN_EMAILS').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),

  smtp: {
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT', '465')),
    secure: env('SMTP_SECURE', 'true') === 'true',
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
    from: env('MAIL_FROM'),
  },

  support: {
    email: env('SUPPORT_EMAIL'),          // куда доставлять обращения (и публичный контакт)
    telegramBotToken: env('SUPPORT_TELEGRAM_BOT_TOKEN'),
    telegramChatId: env('SUPPORT_TELEGRAM_CHAT_ID'),
    publicTelegram: env('SUPPORT_PUBLIC_TELEGRAM'), // например @reset_support
    hours: env('SUPPORT_HOURS'),          // реальные условия помощи, текстом
  },

  legal: {
    ownerName: env('LEGAL_OWNER_NAME'),
    ownerDetails: env('LEGAL_OWNER_DETAILS'),
  },
};
