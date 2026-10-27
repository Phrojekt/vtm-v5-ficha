#!/usr/bin/env bash
# ============================================================
#  Ficha de Sangue — endereço HTTPS da API na VPS, sem domínio próprio
#
#  Rode depois do instalar-vps.sh:   sudo bash publicar-nginx.sh
#
#  Cria um site novo no Nginx (não mexe nos sites que já existem) para
#  fichas.<ip-com-traços>.sslip.io — um nome gratuito que sempre aponta para
#  o IP da VPS — e tira o certificado HTTPS com o certbot. Só a Vercel usa
#  esse endereço; os jogadores continuam em vtmfichas.vercel.app.
# ============================================================
set -euo pipefail

if [ -z "${PORTA_LOCAL:-}" ] && [ -f .env ]; then PORTA_LOCAL="$(sed -n 's/^PORTA_LOCAL=//p' .env | head -1)"; fi
PORTA_LOCAL="${PORTA_LOCAL:-3010}"
verde() { printf '\033[32m%s\033[0m\n' "$*"; }
amarelo() { printf '\033[33m%s\033[0m\n' "$*"; }
falha() { printf '\033[31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || falha "rode com sudo"
command -v nginx >/dev/null || falha "nginx não encontrado"
curl -fsS "http://127.0.0.1:$PORTA_LOCAL/saude" >/dev/null || falha "a API não responde em 127.0.0.1:$PORTA_LOCAL — rode antes o instalar-vps.sh"

IP="${IP:-$(curl -4 -fsS --max-time 8 https://api.ipify.org || hostname -I | awk '{print $1}')}"
[[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || falha "não descobri o IP público (passe IP=1.2.3.4)"
TRACOS="${IP//./-}"

if [ -d /etc/nginx/sites-enabled ]; then
  CONF=/etc/nginx/sites-available/fichas-api; LINK=/etc/nginx/sites-enabled/fichas-api
else
  CONF=/etc/nginx/conf.d/fichas-api.conf; LINK=""
fi
mkdir -p /var/www/fichas-acme

escrever_site() {
  cat > "$CONF" <<EOF
# Ficha de Sangue — API (gerado por publicar-nginx.sh). A Vercel repassa /api para cá.
server {
    listen 80;
    listen [::]:80;
    server_name $1;
    location /.well-known/acme-challenge/ { root /var/www/fichas-acme; }
    location / {
        proxy_pass http://127.0.0.1:$PORTA_LOCAL;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 2m;
        proxy_read_timeout 30s;
    }
}
EOF
  [ -n "$LINK" ] && ln -sf "$CONF" "$LINK"
  nginx -t && systemctl reload nginx
}

if ! command -v certbot >/dev/null; then
  amarelo "Instalando o certbot…"
  if command -v apt-get >/dev/null; then apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
  elif command -v dnf >/dev/null; then dnf install -y -q certbot python3-certbot-nginx
  else falha "instale o certbot e rode de novo"; fi
fi

# o sslip.io e o nip.io fazem a mesma coisa; se o primeiro falhar no certificado, tenta o segundo
HOST=""
for base in sslip.io nip.io; do
  candidato="fichas.$TRACOS.$base"
  verde "Tentando $candidato…"
  escrever_site "$candidato"
  if certbot --nginx -d "$candidato" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring; then
    HOST="$candidato"; break
  fi
  amarelo "Não saiu o certificado para $candidato."
done
[ -n "$HOST" ] || falha "não consegui o certificado. Confira se as portas 80 e 443 estão abertas no firewall (ufw allow 80,443/tcp)."

nginx -t && systemctl reload nginx
sleep 1
if curl -fsS --max-time 10 "https://$HOST/saude" >/dev/null; then
  verde "Pronto: https://$HOST/saude responde."
else
  amarelo "O certificado saiu, mas https://$HOST/saude ainda não respondeu daqui. Teste de novo em um minuto."
fi
echo
echo "Endereço para o publicar.json (apiOrigem):  https://$HOST"
echo "O certbot já agendou a renovação automática do certificado."
