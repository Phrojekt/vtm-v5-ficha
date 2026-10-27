# Publicar a Ficha de Sangue — roteiro

Site na Vercel (`https://vtmfichas.vercel.app`), API e banco na VPS do Precifa.
O jogador só conhece o endereço da Vercel: `vtmfichas.vercel.app/api/...` é repassado pela Vercel
para `https://<domínio do Precifa>/fichas-api/...`, que o Nginx entrega ao container `fichas-api`.

```
jogador ──https──▶ vtmfichas.vercel.app ──/api/*──▶ https://<precifa>/fichas-api/* ──▶ Nginx ──▶ fichas-api:3010 ──▶ Postgres (banco "fichas")
```

Se a API cair, a ficha continua funcionando no navegador de cada jogador e sincroniza quando ela voltar.

---

## 1. Apontar o site para a API (no seu PC, 2 min)

1. Em `publicar.json`, troque `DOMINIO-DO-PRECIFA` pelo domínio que o Nginx do Precifa já atende em HTTPS:
   `"apiOrigem": "https://precifa.exemplo.com.br/fichas-api"`
2. Na pasta do projeto: `node build.js`
   O aviso "apiOrigem ainda não está preenchido" tem de sumir, e aparece `deploy/vercel.json — /api → https://…`.

## 2. Mandar a API para a VPS (no seu PC, 2 min)

No PowerShell, na pasta do projeto:

```powershell
tar -czf api-vps.tar.gz --exclude=node_modules --exclude=.env api
scp api-vps.tar.gz USUARIO@IP-DA-VPS:~
```

## 3. Instalar na VPS (10 min)

```bash
ssh USUARIO@IP-DA-VPS
tar xzf api-vps.tar.gz && cd api
sudo bash instalar-vps.sh
```

O script mostra cada passo em verde. No fim ele imprime um bloco `location /fichas-api/ { … }`.
Se ele disser que achou mais de um Postgres: `sudo PG_CONTAINER=nome-do-container bash instalar-vps.sh`.

## 4. Nginx (5 min)

1. Abra o arquivo do site do Precifa (algo como `/etc/nginx/sites-enabled/precifa`).
2. Cole o bloco **dentro** do `server { … }` que tem `listen 443 ssl` (não no da porta 80).
3. `sudo nginx -t && sudo systemctl reload nginx`
4. Teste: `curl https://SEU-DOMINIO/fichas-api/saude` → `{"ok":true}`

## 5. Vercel (5 min)

Na pasta `deploy` (já está ligada ao projeto `vtmfichas`):

```powershell
cd deploy
npx vercel login      # só na primeira vez
npx vercel --prod
```

Confira no navegador: `https://vtmfichas.vercel.app/api/saude` → `{"ok":true}`.
Se aparecer uma tela de login da Vercel para abrir o site: Vercel → projeto → Settings →
Deployment Protection → deixe a produção pública.

## 6. Ensaio antes de chamar os jogadores (15 min)

Marque cada um:

- [ ] PC: abrir o site → **Fichas** → **Criar conta** (um email seu de teste). O selo mostra "sincronizado".
- [ ] PC: mudar o nome da ficha; o selo passa por "1 para enviar" e volta a "sincronizado".
- [ ] Celular (4G, fora do Wi-Fi): entrar na mesma conta → a ficha aparece. Mudar algo e voltar ao PC: aparece depois de **Sincronizar** (ou sozinho em até 1 minuto).
- [ ] Celular: modo avião, editar, tirar do modo avião → sobe sozinho.
- [ ] **Exportar → PDF editável** no PC e no celular; abrir o PDF; depois **Fichas → Importar** de volta.
- [ ] Aba anônima, segunda conta de teste: **Crônicas** → entrar com o código que a primeira conta criou; na crônica, **Pôr nesta crônica**; na primeira conta, **Ver ficha** do jogador.
- [ ] **Ficha ⋯ → Crônica e compartilhar → Criar link** → abrir o link em aba anônima: mostra a ficha só para leitura. **Desligar** → o link para de abrir.
- [ ] Na VPS: `docker exec -it fichas-api node src/usuarios.js` mostra as contas de teste.
- [ ] Narrador: **Crônicas → abrir a crônica** mostra o painel (abas *Fichas do grupo*, *Jogadores*, *Atividade*, *Configurar*).
- [ ] Narrador: **Editar** a ficha de um jogador, mudar algo, **Histórico** na barra vermelha: a versão mostra o que mudou e o seu nome. **Voltar para esta** desfaz.
- [ ] Celular (Android/Chrome): aparece **Instalar app** no topo. iPhone (Safari): o botão mostra a dica de **Compartilhar → Adicionar à Tela de Início**.
- [ ] App instalado, em modo avião: abre e a ficha guardada aparece.

Apagar as contas de teste (as fichas vão junto):

```bash
docker exec -i <container-do-postgres> psql -U postgres -d fichas -c "delete from usuarios where email in ('teste1@x.com','teste2@x.com')"
```

## 7. Lançar

Crie a sua conta de verdade, crie a crônica (**Crônicas → Narrar uma crônica nova → Criar**) e mande o
código junto com a mensagem de `MENSAGEM-JOGADORES.md`.

---

## Se algo der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `/api/saude` dá 404 na Vercel | `vercel.json` não subiu | conferir que `deploy/vercel.json` existe e rodar `npx vercel --prod` de dentro de `deploy` |
| `/api/saude` dá 502/504 | Vercel não chega no Nginx, ou Nginx não chega na API | `curl https://SEU-DOMINIO/fichas-api/saude` na VPS; `docker ps` (fichas-api "healthy"); `docker logs fichas-api` |
| `curl …/fichas-api/saude` dá 404 | bloco colado no `server` errado | colar no `server` da porta 443 do domínio certo; `nginx -t` |
| selo "não sincronizou: …" | a mensagem diz o motivo | `docker logs fichas-api` |
| jogador esqueceu a senha | ainda não há email | `docker exec -it fichas-api node src/redefinir-senha.js email@dele` e passe a senha provisória |
| precisa voltar o site | versão nova com problema | Vercel → Deployments → versão anterior → **Instant Rollback** |
| precisa tirar a API do ar | qualquer problema grave | `docker stop fichas-api` — o site continua funcionando só no navegador |

## Atualizar depois

- Site: `node build.js` e `npx vercel --prod` dentro de `deploy`.
- API: gerar `api-vps.tar.gz` de novo, mandar, `tar xzf …` por cima e `sudo bash instalar-vps.sh` (mantém o `.env` e os dados).
- Backups: `/var/backups/fichas`, um por dia, 14 dias. Restaurar está em `api/README.md`.
