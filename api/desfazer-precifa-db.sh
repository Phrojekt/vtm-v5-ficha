#!/usr/bin/env bash
# ============================================================
#  Desfaz a primeira instalação, que usou o Postgres do Precifa (precifa-db).
#  Apaga SÓ o que a ficha criou: o banco "fichas" e o usuário "fichas" dentro do
#  precifa-db, o container fichas-api, o .env e o backup agendado.
#  Não toca em nenhum banco, tabela ou usuário do Precifa.
#
#      bash desfazer-precifa-db.sh
#  Pode rodar mesmo que a instalação anterior não tenha terminado.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"
verde() { printf '\033[32m%s\033[0m\n' "$*"; }
amarelo() { printf '\033[33m%s\033[0m\n' "$*"; }

# 1. container da API
if docker ps -a --format '{{.Names}}' | grep -qx fichas-api; then
  docker rm -f fichas-api >/dev/null && verde "container fichas-api removido"
fi

# 2. banco e usuário "fichas" dentro do precifa-db — só se foram criados pela ficha
if docker ps --format '{{.Names}}' | grep -qx precifa-db; then
  SUPER="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' precifa-db | sed -n 's/^POSTGRES_USER=//p' | head -1)"
  SUPER="${SUPER:-postgres}"
  q() { docker exec -i precifa-db psql -v ON_ERROR_STOP=1 -qtA -U "$SUPER" -d postgres -c "$1"; }
  DONO="$(q "select pg_get_userbyid(datdba) from pg_database where datname = 'fichas'")"
  if [ "$DONO" = "fichas" ]; then
    q "select pg_terminate_backend(pid) from pg_stat_activity where datname = 'fichas'" >/dev/null
    q "drop database fichas" && verde "banco fichas removido do precifa-db"
  elif [ -n "$DONO" ]; then
    amarelo "o precifa-db tem um banco 'fichas' que NÃO é da ficha (dono: $DONO). Não mexi nele."
  fi
  if [ "$(q "select 1 from pg_roles where rolname = 'fichas'")" = "1" ]; then
    if [ -z "$(q "select 1 from pg_database where pg_get_userbyid(datdba) = 'fichas'")" ]; then
      q "drop role fichas" && verde "usuário fichas removido do precifa-db"
    else
      amarelo "o usuário fichas ainda é dono de algum banco no precifa-db; não removi."
    fi
  fi
fi

# 3. arquivos gerados e backup agendado
if [ -f .env ] && ! grep -q '^SENHA_BANCO=' .env; then rm -f .env && verde ".env antigo removido"; fi
rm -f docker-compose.yml
if [ -f /usr/local/bin/fichas-backup ] && grep -q precifa-db /usr/local/bin/fichas-backup; then
  rm -f /usr/local/bin/fichas-backup /etc/cron.d/fichas-backup
  rm -f /var/backups/fichas/fichas-*.dump
  verde "backup antigo (do precifa-db) removido"
fi
verde "Pronto. Agora: bash instalar-vps.sh && bash publicar-nginx.sh"
