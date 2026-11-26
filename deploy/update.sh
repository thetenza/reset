#!/usr/bin/env bash
# Обновление сайта RESET до последней версии из GitHub.
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ "$(id -u)" -eq 0 ] || { echo "Запустите: sudo bash deploy/update.sh"; exit 1; }
cd "$APP_DIR"
git config --global --add safe.directory "$APP_DIR"
git pull --ff-only
npm ci --omit=dev --no-audit --no-fund --loglevel=error
chown -R reset:reset "$APP_DIR"
systemctl restart reset-shop
sleep 2 && systemctl is-active --quiet reset-shop && echo "✓ Сайт обновлён" || journalctl -u reset-shop -n 30 --no-pager
