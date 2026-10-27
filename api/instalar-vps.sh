#!/usr/bin/env bash
# ============================================================
#  Ficha de Sangue — instala ou atualiza a API na VPS
#
#  De dentro desta pasta (api/), na VPS:
#      sudo bash instalar-vps.sh
#
#  Tudo isolado dos outros projetos da VPS:
#    - Postgres próprio: container fichas-postgres, volume fichas-pgdata
#    - API: container fichas-api, ouvindo só em 127.0.0.1:3010
#    - rede Docker própria: fichas-net
#  O script pode rodar de novo quantas vezes quiser; é assim que se atualiza
#  (o .env e os dados são mantidos). Também agenda o backup diário (14 dias).
#
#  Variáveis opcionais:  SITE_URL=https://...  PORTA_LOCAL=3010
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

SITE_URL="${SITE_URL:-https://vtmfichas.vercel.app}"
# a porta escolhida na primeira instalação fica guardada no .env
if [ -z "${PORTA_LOCAL:-}" ] && [ -f .env ]; then PORTA_LOCAL="$(sed -n 's/^PORTA_LOCAL=//p' .env | head -1)"; fi
PORTA_LOCAL="${PORTA_LOCAL:-3010}"
PASTA_BACKUP="${PASTA_BACKUP:-/var/backups/fichas}"
PG="fichas-postgres"
VOLUME="fichas-pgdata"

verde() { printf '\033[32m%s\033[0m\n' "$*"; }
amarelo() { printf '\033[33m%s\033[0m\n' "$*"; }
falha() { printf '\033[31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- 0. pré-requisitos ----------
command -v docker >/dev/null || falha "docker não encontrado"
docker compose version >/dev/null 2>&1 || falha "o plugin 'docker compose' não está instalado"
[ -f package.json ] && [ -f Dockerfile ] || falha "rode este script de dentro da pasta api/"
if ss -ltn 2>/dev/null | grep -q "127.0.0.1:$PORTA_LOCAL " && ! docker ps --format '{{.Names}}' | grep -qx fichas-api; then
  falha "a porta $PORTA_LOCAL já está em uso por outro serviço. Escolha outra: PORTA_LOCAL=3020 sudo -E bash instalar-vps.sh"
fi

# ---------- 1. .env (senha do banco gerada só na primeira vez) ----------
if [ -f .env ]; then
  grep -q '^SENHA_BANCO=' .env || falha ".env antigo (de outra instalação). Rode antes: bash desfazer-precifa-db.sh"
  grep -q '^PORTA_LOCAL=' .env || echo "PORTA_LOCAL=$PORTA_LOCAL" >> .env
  verde ".env já existe: mantido (porta $PORTA_LOCAL)"
else
  if docker volume inspect "$VOLUME" >/dev/null 2>&1; then
    falha "o volume $VOLUME já tem um banco, mas o .env sumiu: sem ele não há a senha. Restaure o .env (ou apague o volume, perdendo os dados)."
  fi
  SENHA="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 40)"
  umask 077
  cat > .env <<EOF
# gerado por instalar-vps.sh em $(date '+%d/%m/%Y %H:%M') — guarde: sem ele não há a senha do banco
SENHA_BANCO=$SENHA
DATABASE_URL=postgres://fichas:$SENHA@$PG:5432/fichas
ORIGENS=$SITE_URL
SITE_URL=$SITE_URL
PORTA=3000
PORTA_LOCAL=$PORTA_LOCAL
PERMITIR_CADASTRO=sim
DIAS_SESSAO=60
MINUTOS_POR_VERSAO=10
MAX_VERSOES=100
EOF
  chmod 600 .env
  verde ".env criado (a senha do banco só existe nesse arquivo)"
fi

# ---------- 2. containers ----------
cat > docker-compose.yml <<EOF
# gerado por instalar-vps.sh — rode o script de novo em vez de editar
name: fichas
services:
  fichas-postgres:
    image: postgres:16-alpine
    container_name: $PG
    restart: unless-stopped
    environment:
      POSTGRES_USER: fichas
      POSTGRES_DB: fichas
      POSTGRES_PASSWORD: \${SENHA_BANCO}
    volumes: ["$VOLUME:/var/lib/postgresql/data"]
    networks: [rede]
    mem_limit: 256m
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fichas -d fichas"]
      interval: 5s
      timeout: 3s
      retries: 20
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }
  fichas-api:
    build: .
    image: fichas-api:latest
    container_name: fichas-api
    restart: unless-stopped
    env_file: .env
    depends_on:
      fichas-postgres: { condition: service_healthy }
    networks: [rede]
    ports: ["127.0.0.1:$PORTA_LOCAL:3000"]
    mem_limit: 256m
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }
volumes:
  $VOLUME:
    name: $VOLUME
networks:
  rede:
    name: fichas-net
EOF
verde "Subindo fichas-postgres e fichas-api (a primeira vez baixa as imagens e demora um pouco)…"
docker compose build --no-cache fichas-api
docker compose up -d --force-recreate --remove-orphans

printf 'Esperando a API responder'
OK=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORTA_LOCAL/saude" >/dev/null 2>&1; then echo; verde "API no ar: http://127.0.0.1:$PORTA_LOCAL/saude"; OK=1; break; fi
  printf '.'; sleep 2
done
if [ "$OK" != 1 ]; then
  echo; docker logs --tail 30 "$PG" || true; docker logs --tail 40 fichas-api || true
  falha "a API não respondeu. Os logs estão acima."
fi

# ---------- 3. backup diário ----------
if [ "$(id -u)" = 0 ]; then
  mkdir -p "$PASTA_BACKUP"; chmod 700 "$PASTA_BACKUP"
  cat > /usr/local/bin/fichas-backup <<EOF
#!/usr/bin/env bash
# backup diário do banco da Ficha de Sangue (instalar-vps.sh)
set -euo pipefail
destino="$PASTA_BACKUP/fichas-\$(date +%F).dump"
docker exec "$PG" pg_dump -U fichas -Fc fichas > "\$destino.tmp" && mv "\$destino.tmp" "\$destino"
find "$PASTA_BACKUP" -name 'fichas-*.dump' -mtime +14 -delete
EOF
  chmod 750 /usr/local/bin/fichas-backup
  echo "30 3 * * * root /usr/local/bin/fichas-backup >> /var/log/fichas-backup.log 2>&1" > /etc/cron.d/fichas-backup
  chmod 644 /etc/cron.d/fichas-backup
  /usr/local/bin/fichas-backup && verde "Backup diário às 03:30 em $PASTA_BACKUP (14 dias). Primeiro backup feito agora."
else
  amarelo "Sem sudo: o backup diário não foi agendado. Rode com sudo para agendar."
fi

# ---------- 4. próximo passo ----------
echo
verde "API instalada. Agora o endereço HTTPS para a Vercel:  sudo bash publicar-nginx.sh"
echo
echo "Comandos úteis:"
echo "  docker logs -f fichas-api                                    # logs"
echo "  docker exec -it fichas-api node src/usuarios.js              # contas e fichas"
echo "  docker exec -it fichas-api node src/redefinir-senha.js EMAIL # senha esquecida"
echo "  sudo /usr/local/bin/fichas-backup                            # backup agora"
