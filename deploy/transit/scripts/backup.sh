#!/usr/bin/env bash
# 备份 Postgres 到 ./backups，保留最近 14 天。
# crontab 示例（每天 04:30）：
#   30 4 * * * /opt/transit/scripts/backup.sh >> /opt/transit/logs/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups

ts="$(date +%F_%H%M)"
out="backups/newapi_${ts}.sql.gz"

docker compose exec -T postgres pg_dump -U newapi -d newapi | gzip > "$out"
find backups -name 'newapi_*.sql.gz' -mtime +14 -delete

echo "$(date -Is) backup ok: $out ($(du -h "$out" | cut -f1))"
