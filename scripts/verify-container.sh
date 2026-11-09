#!/usr/bin/env bash
# Repeatable Docker/Compose acceptance test. Uses an isolated CI project/volume.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker is required. Run on a Docker-capable host or GitHub Actions.' >&2; exit 1; }
project=opencast-container-check
compose=(docker compose -p "$project")
cleanup() { "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true; rm -f /tmp/opencast-container-cookies.txt; }
trap cleanup EXIT
[ -f .env ] || cp .env.example .env
"${compose[@]}" up --build -d
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3000/health >/dev/null; then break; fi
  [ "$i" -lt 60 ] || { "${compose[@]}" logs; exit 1; }
  sleep 2
done
cid=$("${compose[@]}" ps -q opencast)
[ "$(docker exec "$cid" id -u)" = 1000 ]
docker exec "$cid" node -e "require.resolve('tsx')" >/dev/null 2>&1 && { echo 'tsx must be absent at runtime' >&2; exit 1; } || true
username="container_$(date +%s)"
curl -fsS -c /tmp/opencast-container-cookies.txt -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d "{\"username\":\"$username\",\"email\":\"$username@example.com\",\"password\":\"container-test-password\"}" \
  http://localhost:3000/api/auth/register >/dev/null
docker exec "$cid" node dist-server/backup-db.js /app/data/verified-backup.sqlite
"${compose[@]}" restart opencast
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:3000/health >/dev/null && break; sleep 2; [ "$i" -lt 30 ] || exit 1; done
curl -fsS -b /tmp/opencast-container-cookies.txt http://localhost:3000/api/auth/me | grep -q "$username"
curl -fsS -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d "{\"username_or_email\":\"$username\",\"password\":\"container-test-password\"}" \
  http://localhost:3000/api/auth/login >/dev/null
"${compose[@]}" stop -t 15
[ "$(docker inspect -f '{{.State.ExitCode}}' "$cid")" = 0 ]
echo 'Container acceptance passed: build, health, non-root uid 1000, runtime without tsx, backup, persistent volume/session/login, graceful exit 0.'
