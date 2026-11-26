#!/usr/bin/env bash
# Мастер установки магазина RESET на чистый сервер Ubuntu 22.04/24.04.
# Запуск (из папки с кодом):  sudo bash deploy/install.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$APP_DIR/.env"
SERVICE=reset-shop

say()  { printf '\n\033[1;38;5;208m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }
ask()  { local q="$1" def="${2:-}" a; if [ -n "$def" ]; then read -r -p "$q [$def]: " a </dev/tty; echo "${a:-$def}"; else read -r -p "$q: " a </dev/tty; echo "$a"; fi; }
ask_secret() { local a; read -r -s -p "$1: " a </dev/tty; echo >&2; echo "$a"; }

[ "$(id -u)" -eq 0 ] || fail "Запустите с правами администратора: sudo bash deploy/install.sh"
command -v apt-get >/dev/null || fail "Нужен сервер с Ubuntu."

cat <<'TXT'

  ██████  RESET — установка магазина
  Мастер задаст несколько вопросов. Если не знаете ответ на необязательный вопрос — просто нажмите Enter.

TXT

WRITE_ENV=1
if [ -f "$ENV_FILE" ]; then
  keep=$(ask "Настройки уже есть. Оставить их как есть? (да/нет)" "да")
  [[ "$keep" =~ ^(да|д|y|yes)$ ]] && WRITE_ENV=0
fi

if [ "$WRITE_ENV" -eq 1 ]; then
  say "1/4. Адрес сайта"
  DOMAIN=$(ask "Домен сайта без https:// (например reset-shop.ru)")
  DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"; DOMAIN="${DOMAIN#www.}"
  [[ "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || fail "Похоже, домен введён неверно: $DOMAIN"
  ADMIN_EMAIL=$(ask "Ваш email — с ним вы будете входить в админку")

  say "2/4. Digiseller"
  echo "ID продавца и API-ключ — из кабинета my.digiseller.com. Можно оставить пустым и добавить позже (сайт будет в демо-режиме)."
  DS_SELLER=$(ask "ID продавца Digiseller" "")
  DS_KEY=""; [ -n "$DS_SELLER" ] && DS_KEY=$(ask_secret "API-ключ Digiseller (ввод не отображается)")

  say "3/4. Почта для кодов входа (Яндекс)"
  SMTP_USER=$(ask "Адрес ящика, например reset.shop@yandex.ru")
  SMTP_PASS=$(ask_secret "Пароль приложения Яндекса (ввод не отображается)")

  say "4/4. Поддержка (необязательно)"
  TG=$(ask "Telegram для покупателей, например @reset_support" "")
  HOURS=$(ask "Когда отвечаете, например «ежедневно 10:00–22:00 МСК»" "")
  OWNER=$(ask "Имя или название продавца для подвала сайта" "")

  umask 077
  cat > "$ENV_FILE" <<ENV
NODE_ENV=production
BRAND_NAME=RESET
PORT=3000
BASE_URL=https://$DOMAIN
DIGISELLER_SELLER_ID=$DS_SELLER
DIGISELLER_API_KEY=$DS_KEY
DIGISELLER_CURRENCY=RUB
DIGISELLER_LANG=ru-RU
AUTH_CODE_TTL_SEC=600
AUTH_RESEND_COOLDOWN_SEC=60
AUTH_MAX_CODE_ATTEMPTS=5
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
MAIL_FROM=RESET <$SMTP_USER>
SUPPORT_EMAIL=$SMTP_USER
SUPPORT_PUBLIC_TELEGRAM=$TG
SUPPORT_HOURS=$HOURS
ADMIN_EMAILS=$ADMIN_EMAIL
LEGAL_OWNER_NAME=$OWNER
ENV
  ok "Настройки сохранены"
else
  DOMAIN=$(grep -E '^BASE_URL=' "$ENV_FILE" | sed -E 's#^BASE_URL=https?://##')
fi

say "Устанавливаю программы (2–5 минут)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https >/dev/null

need_node=1
if command -v node >/dev/null; then
  v=$(node -p 'process.versions.node.split(".").map(Number)' | tr -d '[] ' ); IFS=, read -r ma mi _ <<<"$v"
  if [ "$ma" -gt 22 ] || { [ "$ma" -eq 22 ] && [ "$mi" -ge 13 ]; }; then need_node=0; fi
fi
if [ "$need_node" -eq 1 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
ok "Node.js $(node -v)"

if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi
ok "Caddy (HTTPS-сертификат будет получен автоматически)"

say "Готовлю сайт…"
id reset >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin reset
mkdir -p "$APP_DIR/data"
cd "$APP_DIR" && npm ci --omit=dev --no-audit --no-fund --loglevel=error
chown -R reset:reset "$APP_DIR"
chmod 600 "$ENV_FILE"

cat > /etc/systemd/system/$SERVICE.service <<UNIT
[Unit]
Description=RESET shop
After=network-online.target

[Service]
User=reset
WorkingDirectory=$APP_DIR
ExecStart=$(command -v node) --disable-warning=ExperimentalWarning src/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN, www.$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY

if command -v ufw >/dev/null && ufw status | grep -q active; then ufw allow 80,443/tcp >/dev/null; fi

systemctl daemon-reload
systemctl enable --now $SERVICE >/dev/null 2>&1
systemctl restart $SERVICE
systemctl reload caddy 2>/dev/null || systemctl restart caddy
sleep 3
systemctl is-active --quiet $SERVICE || { journalctl -u $SERVICE -n 30 --no-pager; fail "Сайт не запустился — пришлите этот текст в чат."; }
curl -fsS -o /dev/null http://127.0.0.1:3000/ || fail "Сайт запустился, но не отвечает — пришлите вывод: journalctl -u $SERVICE -n 50"

cat <<TXT

$(ok "Готово!")

  Сайт:     https://$DOMAIN   (если не открывается — подождите, пока обновится DNS, до суток)
  Админка:  https://$DOMAIN/admin   — войдите с email администратора, код придёт на почту

  Полезные команды:
    обновить сайт:      sudo bash $APP_DIR/deploy/update.sh
    изменить настройки: sudo bash $APP_DIR/deploy/install.sh
    посмотреть ошибки:  journalctl -u $SERVICE -n 50
TXT
