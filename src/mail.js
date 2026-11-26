import nodemailer from 'nodemailer';
import { config } from './config.js';

let transport = null;
if (config.smtp.host) {
  transport = nodemailer.createTransport({
    host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

export const mailConfigured = () => Boolean(transport);

// Возвращает true только при реальной передаче письма SMTP-серверу.
export async function sendMail({ to, subject, text, replyTo }) {
  if (!transport) {
    if (config.isProd) throw new Error('SMTP не настроен');
    console.log(`\n[mail:dev] → ${to}\n  ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`);
    return true;
  }
  await transport.sendMail({ from: config.smtp.from || config.smtp.user, to, subject, text, replyTo });
  return true;
}
