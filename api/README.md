# API da Ficha de Sangue

Contas, fichas sincronizadas, histórico de versões, crônicas e links de leitura.
Node 22 + Fastify + Postgres. Sem dependência compilada (senhas com `scrypt` do próprio Node).

## Rodar local

```bash
cd api
npm install
DATABASE_URL=postgres://usuario:senha@localhost:5432/fichas ORIGENS=http://localhost:4777 npm start
```

As migrações (`migracoes/*.sql`) rodam sozinhas na subida. Na ficha, abra **Conta → Servidor** (aparece quando o site não tem servidor) e
aponte para `http://localhost:3000`.

## Testes

```bash
TEST_DATABASE_URL=postgres://postgres@localhost:5432/fichas_teste npm test   # apaga o esquema desse banco!
```

O teste de ponta a ponta do navegador está em `../testes-e2e/nuvem_e2e.py` (Playwright): sobe a API
num banco vazio na porta 3010 e o site na 8765 antes de rodar.

## Deploy na VPS (Docker, isolado dos outros projetos)

Tudo está em um script, que também serve para atualizar:

```bash
tar xzf api-vps.tar.gz && cd api      # o pacote é gerado em PUBLICAR.md, passo 2
sudo bash instalar-vps.sh
```

Ele sobe dois containers só da ficha, numa rede própria (`fichas-net`): `fichas-postgres`
(volume `fichas-pgdata`, sem porta exposta) e `fichas-api` (em `127.0.0.1:3010`). Gera o `.env`
com senha forte na primeira vez e agenda o backup diário (03:30, 14 dias, em `/var/backups/fichas`).
Depois, `sudo bash publicar-nginx.sh` cria o site `fichas.<ip-com-traços>.sslip.io` no Nginx, com
HTTPS do certbot, sem tocar nos sites que já existem.

Na Vercel, `deploy/vercel.json` (gerado pelo `node build.js` a partir de `publicar.json`) repassa
`/api/*` para esse endereço. A Vercel manda o IP do jogador no `X-Forwarded-For`; o limite de
tentativas de login funciona por jogador.

`env.exemplo`, `docker-compose.exemplo.yml` e `criar-banco.sql` são o mesmo processo feito à mão.

### No dia a dia

```bash
docker logs -f fichas-api                                    # logs
docker exec -it fichas-api node src/usuarios.js              # contas e fichas
docker exec -it fichas-api node src/redefinir-senha.js EMAIL # senha esquecida: gera uma provisória
sudo /usr/local/bin/fichas-backup                            # backup agora
# restaurar um backup:
docker exec -i fichas-postgres pg_restore -U fichas -d fichas --clean < /var/backups/fichas/fichas-AAAA-MM-DD.dump
```

## Rotas

| Método | Caminho | O quê |
|---|---|---|
| POST | /auth/cadastro, /auth/entrar | devolvem `{ token, usuario }` |
| POST | /auth/sair | encerra a sessão |
| GET/PATCH | /eu | perfil e crônicas |
| PUT | /eu/senha | troca a senha e derruba as outras sessões |
| GET | /fichas?desde=&dados=1 | minhas fichas (com `desde`, inclui as excluídas: é a sincronização) |
| GET/PUT/DELETE | /fichas/:id | ler, salvar (`versao_base`; 409 se mudou em outro lugar), excluir |
| POST | /fichas/:id/restaurar | desfaz a exclusão |
| GET/POST | /fichas/:id/versoes | histórico / marcar a versão atual com um rótulo |
| GET | /fichas/:id/versoes/:v | uma versão |
| POST | /fichas/:id/versoes/:v/restaurar | volta para ela (cria versão nova) |
| GET/POST | /fichas/:id/links | links de leitura |
| DELETE | /fichas/:id/links/:token | desliga um link |
| GET | /publico/:token | a ficha, sem conta |
| GET/POST | /cronicas | minhas crônicas / criar (quem cria narra) |
| GET/PATCH/DELETE | /cronicas/:id | detalhes (membros e fichas), editar, excluir |
| POST | /cronicas/entrar | entrar com o código |
| POST | /cronicas/:id/convite | novo código (o antigo para de valer) |
| DELETE | /cronicas/:id/membros/:usuario | tirar alguém / sair |
| POST | /fichas/:id/transferir | o mestre entrega uma ficha a um jogador da crônica |
| GET | /mapa/:cr/estado, /cidade, /publico | qualquer membro: estado do mapa, geometria e visão filtrada |
| POST | /mapa/:cr/ativar, /importar | mestre: abrir com a base de Belmont / importar o export do Belmont antigo |
| GET/POST/PUT/DELETE | /mapa/:cr/pois, /districts, /npcs, /events, /scenes, /reveal | mestre: edição completa (formatos iguais aos do Belmont) |

Regras: só o dono edita a ficha; o narrador da crônica dela lê. Login e cadastro têm limite de
10 tentativas por minuto por IP. O banco guarda só o hash do token de sessão.
