/* Testes da API contra um Postgres de verdade.
   TEST_DATABASE_URL aponta para um banco descartável: o esquema é apagado no início.
   Ex.: TEST_DATABASE_URL=postgres://postgres@localhost:5432/fichas_teste npm test */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { criarPool } = require('../src/db');
const { migrar } = require('../src/migrar');
const { criarApp } = require('../src/app');
const config = require('../src/config');

const URL_TESTE = process.env.TEST_DATABASE_URL;
if (!URL_TESTE) { console.log('TEST_DATABASE_URL não definido: pulando'); process.exit(0); }

let pool, app;
const cfg = Object.assign(config({}), { origens: ['https://fichas.exemplo'], siteUrl: 'https://fichas.exemplo', minutosPorVersao: 10, maxVersoes: 5 });

async function req(metodo, url, { token, body, origem } = {}) {
  const headers = {};
  if (token) headers.authorization = 'Bearer ' + token;
  if (origem) headers.origin = origem;
  const r = await app.inject({ method: metodo, url, payload: body, headers });
  let json = null;
  try { json = r.json(); } catch (_) {}
  return { status: r.statusCode, body: json, headers: r.headers };
}
const ficha = (nome, extra) => Object.assign({ sistema: 'vampiro', meta: { nome, cla: 'Toreador', conceito: 'pintora' }, atr: { forca: 2 }, xpTotal: 0 }, extra);

test.before(async () => {
  pool = criarPool(URL_TESTE);
  await pool.query('drop schema public cascade; create schema public;');
  await migrar(pool, () => {});
  app = criarApp({ pool, config: cfg });
  await app.ready();
});
test.after(async () => { await app.close(); await pool.end(); });

let ana, bia, caio; /* tokens */
let anaId, biaId;

test('cadastro, entrar, eu, sair', async () => {
  let r = await req('POST', '/auth/cadastro', { body: { email: 'Ana@Exemplo.com', senha: 'segredo123', nome: 'Ana' } });
  assert.equal(r.status, 201); ana = r.body.token; anaId = r.body.usuario.id;
  r = await req('POST', '/auth/cadastro', { body: { email: 'ana@exemplo.com', senha: 'outrasenha' } });
  assert.equal(r.status, 409, 'email repetido, sem diferenciar maiúscula');
  r = await req('POST', '/auth/cadastro', { body: { email: 'curta@x.com', senha: '123' } });
  assert.equal(r.status, 400, 'senha curta');
  assert.equal(r.body.erro, 'a senha precisa de pelo menos 8 caracteres');
  r = await req('POST', '/auth/cadastro', { body: { email: 'sem-arroba', senha: '12345678' } });
  assert.equal(r.body.erro, 'esse email não parece válido');
  r = await req('POST', '/auth/cadastro', { body: { email: 'bia@exemplo.com', senha: 'segredo456', nome: 'Bia' } });
  bia = r.body.token; biaId = r.body.usuario.id;
  r = await req('POST', '/auth/cadastro', { body: { email: 'caio@exemplo.com', senha: 'segredo789', nome: 'Caio' } });
  caio = r.body.token;

  r = await req('POST', '/auth/entrar', { body: { email: 'ana@exemplo.com', senha: 'errada' } });
  assert.equal(r.status, 401);
  r = await req('POST', '/auth/entrar', { body: { email: 'ninguem@exemplo.com', senha: 'qualquer1' } });
  assert.equal(r.status, 401);
  r = await req('POST', '/auth/entrar', { body: { email: 'ANA@exemplo.com', senha: 'segredo123' } });
  assert.equal(r.status, 200);
  const outro = r.body.token;
  r = await req('POST', '/auth/entrar', { body: { email: 'ana', senha: 'segredo123' } });
  assert.equal(r.status, 200, 'entra também pelo apelido, se for único');
  r = await req('POST', '/auth/entrar', { body: { email: 'ana', senha: 'errada123' } });
  assert.equal(r.status, 401, 'apelido com senha errada');
  r = await req('GET', '/eu', { token: outro });
  assert.equal(r.body.usuario.nome, 'Ana');
  r = await req('POST', '/auth/sair', { token: outro });
  assert.equal(r.status, 200);
  r = await req('GET', '/eu', { token: outro });
  assert.equal(r.status, 401, 'token de quem saiu não vale mais');
  r = await req('GET', '/eu');
  assert.equal(r.status, 401);
  /* o banco guarda hash, nunca o token */
  const { rows } = await pool.query('select token_hash from sessoes');
  assert.ok(rows.every(x => Buffer.isBuffer(x.token_hash) && x.token_hash.length === 32));
});

test('troca de senha derruba as outras sessões', async () => {
  let r = await req('POST', '/auth/entrar', { body: { email: 'caio@exemplo.com', senha: 'segredo789' } });
  const segunda = r.body.token;
  r = await req('PUT', '/eu/senha', { token: caio, body: { atual: 'errada', nova: 'novasenha1' } });
  assert.equal(r.status, 403);
  r = await req('PUT', '/eu/senha', { token: caio, body: { atual: 'segredo789', nova: 'novasenha1' } });
  assert.equal(r.status, 200);
  assert.equal((await req('GET', '/eu', { token: segunda })).status, 401);
  assert.equal((await req('GET', '/eu', { token: caio })).status, 200);
  assert.equal((await req('POST', '/auth/entrar', { body: { email: 'caio@exemplo.com', senha: 'novasenha1' } })).status, 200);
});

const idA = crypto.randomUUID();
test('salvar ficha nova com id do navegador e controle de versão', async () => {
  let r = await req('PUT', '/fichas/' + idA, { token: ana, body: { dados: ficha('Lúcia'), versao_base: null } });
  assert.equal(r.status, 201);
  assert.equal(r.body.ficha.versao, 1);
  assert.equal(r.body.ficha.nome, 'Lúcia');
  assert.equal(r.body.ficha.resumo.cla, 'Toreador');

  r = await req('PUT', '/fichas/' + idA, { token: ana, body: { dados: ficha('Lúcia', { xpTotal: 5 }), versao_base: 1 } });
  assert.equal(r.status, 200); assert.equal(r.body.ficha.versao, 2);

  /* outro aparelho, ainda na versão 1: conflito com a atual no corpo */
  r = await req('PUT', '/fichas/' + idA, { token: ana, body: { dados: ficha('Lúcia velha'), versao_base: 1 } });
  assert.equal(r.status, 409);
  assert.equal(r.body.conflito, 'versao');
  assert.equal(r.body.atual.versao, 2);
  assert.equal(r.body.atual.dados.xpTotal, 5);

  /* outra pessoa não lê nem sobrescreve */
  assert.equal((await req('GET', '/fichas/' + idA, { token: bia })).status, 404);
  r = await req('PUT', '/fichas/' + idA, { token: bia, body: { dados: ficha('roubo'), versao_base: 2 } });
  assert.equal(r.status, 404);

  r = await req('GET', '/fichas/' + idA, { token: ana });
  assert.equal(r.body.ficha.dados.xpTotal, 5); assert.equal(r.body.permissao, 'dono');
  assert.equal((await req('GET', '/fichas/nao-e-uuid', { token: ana })).status, 400);
});

test('lista e sincronização incremental com exclusões', async () => {
  let r = await req('GET', '/fichas', { token: ana });
  assert.equal(r.body.fichas.length, 1);
  assert.equal(r.body.fichas[0].dados, undefined, 'lista não traz o conteúdo');
  const marco = r.body.agora;

  const idB = crypto.randomUUID();
  await req('PUT', '/fichas/' + idB, { token: ana, body: { dados: ficha('Bento'), versao_base: null } });
  r = await req('GET', '/fichas?dados=1&desde=' + encodeURIComponent(new Date(marco).toISOString()), { token: ana });
  assert.deepEqual(r.body.fichas.map(f => f.nome), ['Bento']);
  assert.equal(r.body.fichas[0].dados.meta.nome, 'Bento');

  const marco2 = r.body.agora;
  r = await req('DELETE', '/fichas/' + idB, { token: ana });
  assert.ok(r.body.ficha.excluida_em);
  r = await req('GET', '/fichas?desde=' + encodeURIComponent(new Date(marco2).toISOString()), { token: ana });
  assert.equal(r.body.fichas.length, 1);
  assert.ok(r.body.fichas[0].excluida_em, 'a exclusão aparece na sincronização');
  r = await req('GET', '/fichas', { token: ana });
  assert.deepEqual(r.body.fichas.map(f => f.nome), ['Lúcia'], 'excluída some da lista normal');

  /* editar uma ficha excluída em outro aparelho: conflito "excluida" */
  r = await req('PUT', '/fichas/' + idB, { token: ana, body: { dados: ficha('Bento 2'), versao_base: 1 } });
  assert.equal(r.status, 409); assert.equal(r.body.conflito, 'excluida');
  r = await req('POST', '/fichas/' + idB + '/restaurar', { token: ana });
  assert.equal(r.status, 200); assert.equal(r.body.ficha.excluida_em, null);
});

test('histórico: salvamentos seguidos viram uma versão; rótulo e restaurar', async () => {
  const id = crypto.randomUUID();
  let v = null;
  for (let i = 0; i < 4; i++) {
    const r = await req('PUT', '/fichas/' + id, { token: ana, body: { dados: ficha('Hist', { xpTotal: i }), versao_base: v } });
    v = r.body.ficha.versao;
  }
  let r = await req('GET', '/fichas/' + id + '/versoes', { token: ana });
  assert.equal(r.body.versoes.length, 1, '4 salvamentos em sequência = 1 versão');
  assert.equal(r.body.versoes[0].versao, 4);
  assert.equal(r.body.versoes[0].autor, 'Ana');

  r = await req('POST', '/fichas/' + id + '/versoes', { token: ana, body: { rotulo: 'antes de gastar XP' } });
  assert.equal(r.status, 200);
  await req('PUT', '/fichas/' + id, { token: ana, body: { dados: ficha('Hist', { xpTotal: 99 }), versao_base: 4 } });
  r = await req('GET', '/fichas/' + id + '/versoes', { token: ana });
  assert.deepEqual(r.body.versoes.map(x => [x.versao, x.rotulo]), [[5, null], [4, 'antes de gastar XP']],
    'depois de um rótulo, o próximo salvamento abre versão nova');

  r = await req('GET', '/fichas/' + id + '/versoes/4', { token: ana });
  assert.equal(r.body.versao.dados.xpTotal, 3);
  r = await req('POST', '/fichas/' + id + '/versoes/4/restaurar', { token: ana });
  assert.equal(r.body.ficha.versao, 6);
  assert.equal(r.body.ficha.dados.xpTotal, 3);

  /* poda: com maxVersoes=5, as sem rótulo mais antigas somem; a rotulada fica */
  await pool.query("update ficha_versoes set criado_em = now() - interval '1 hour' where ficha_id = $1", [id]);
  v = 6;
  for (let i = 0; i < 8; i++) {
    await pool.query("update ficha_versoes set criado_em = now() - interval '1 hour' where ficha_id = $1", [id]);
    r = await req('PUT', '/fichas/' + id, { token: ana, body: { dados: ficha('Hist', { xpTotal: 100 + i }), versao_base: v } });
    v = r.body.ficha.versao;
  }
  r = await req('GET', '/fichas/' + id + '/versoes', { token: ana });
  const semRotulo = r.body.versoes.filter(x => !x.rotulo).length;
  assert.equal(semRotulo, 5);
  assert.ok(r.body.versoes.some(x => x.rotulo === 'antes de gastar XP'));
  assert.equal((await req('GET', '/fichas/' + id + '/versoes', { token: bia })).status, 404);
});

let cronica, codigo;
test('crônica: narrador cria, jogador entra pelo código, narrador lê a ficha', async () => {
  let r = await req('POST', '/cronicas', { token: bia, body: { nome: 'Noites de Recife' } });
  assert.equal(r.status, 201);
  cronica = r.body.cronica.id; codigo = r.body.cronica.codigo_convite;
  assert.match(codigo, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  /* Ana tenta pôr a ficha numa crônica de que não participa */
  r = await req('PUT', '/fichas/' + idA, { token: ana, body: { dados: ficha('Lúcia', { xpTotal: 5 }), versao_base: 2, cronica_id: cronica } });
  assert.equal(r.status, 403);

  r = await req('POST', '/cronicas/entrar', { token: ana, body: { codigo: codigo.toLowerCase().replace('-', ' ') } });
  assert.equal(r.status, 200, 'código aceita minúscula e espaço');
  r = await req('PUT', '/fichas/' + idA, { token: ana, body: { dados: ficha('Lúcia', { xpTotal: 5 }), versao_base: 2, cronica_id: cronica } });
  assert.equal(r.status, 200); assert.equal(r.body.ficha.cronica_id, cronica);

  r = await req('GET', '/cronicas/' + cronica, { token: bia });
  assert.equal(r.body.papel, 'narrador');
  assert.equal(r.body.cronica.codigo_convite, codigo);
  assert.deepEqual(r.body.fichas.map(f => [f.nome, f.dono]), [['Lúcia', 'Ana']]);
  assert.equal(r.body.membros.length, 2);

  r = await req('GET', '/cronicas/' + cronica, { token: ana });
  assert.equal(r.body.papel, 'jogador');
  assert.equal(r.body.cronica.codigo_convite, undefined, 'jogador não vê o código');

  /* o mestre lê e edita a ficha do jogador; a versão guarda que foi ele */
  r = await req('GET', '/fichas/' + idA, { token: bia });
  assert.equal(r.status, 200); assert.equal(r.body.permissao, 'narrador');
  r = await req('PUT', '/fichas/' + idA, { token: bia, body: { dados: ficha('Lúcia', { xpTotal: 50 }), versao_base: 3, cronica_id: null } });
  assert.equal(r.status, 403, 'o mestre não tira a ficha da crônica');
  r = await req('PUT', '/fichas/' + idA, { token: bia, body: { dados: ficha('Lúcia', { xpTotal: 50 }), versao_base: 3 } });
  assert.equal(r.status, 200); assert.equal(r.body.ficha.versao, 4);
  r = await req('GET', '/fichas/' + idA + '/versoes', { token: bia });
  assert.equal(r.status, 200); assert.equal(r.body.versoes[0].autor, 'Bia');
  r = await req('GET', '/fichas/' + idA, { token: ana });
  assert.equal(r.body.ficha.dados.xpTotal, 50, 'o jogador vê o ajuste do mestre');
  assert.equal(r.body.ficha.dono_id, anaId);
  assert.equal((await req('DELETE', '/fichas/' + idA, { token: bia })).status, 404, 'o mestre não exclui ficha do jogador');
  assert.equal((await req('POST', '/fichas/' + idA + '/links', { token: bia })).status, 403, 'nem compartilha');

  /* quem está fora não vê nada */
  assert.equal((await req('GET', '/cronicas/' + cronica, { token: caio })).status, 404);
  assert.equal((await req('GET', '/fichas/' + idA, { token: caio })).status, 404);

  r = await req('GET', '/eu', { token: ana });
  assert.deepEqual(r.body.cronicas.map(c => [c.nome, c.papel]), [['Noites de Recife', 'jogador']]);
  r = await req('GET', '/cronicas', { token: bia });
  assert.equal(r.body.cronicas[0].membros, 2); assert.equal(r.body.cronicas[0].fichas, 1);
});

test('crônica: novo código invalida o antigo; jogador sai e a ficha sai junto', async () => {
  assert.equal((await req('POST', '/cronicas/' + cronica + '/convite', { token: ana })).status, 403);
  let r = await req('POST', '/cronicas/' + cronica + '/convite', { token: bia });
  assert.notEqual(r.body.codigo_convite, codigo);
  assert.equal((await req('POST', '/cronicas/entrar', { token: caio, body: { codigo } })).status, 404);
  r = await req('POST', '/cronicas/entrar', { token: caio, body: { codigo: r.body.codigo_convite } });
  assert.equal(r.status, 200);

  assert.equal((await req('DELETE', `/cronicas/${cronica}/membros/${biaId}`, { token: ana })).status, 403);
  assert.equal((await req('DELETE', `/cronicas/${cronica}/membros/${biaId}`, { token: bia })).status, 400);
  r = await req('DELETE', `/cronicas/${cronica}/membros/${anaId}`, { token: ana });
  assert.equal(r.status, 200);
  r = await req('GET', '/fichas/' + idA, { token: ana });
  assert.equal(r.body.ficha.cronica_id, null);
  assert.equal((await req('GET', '/fichas/' + idA, { token: bia })).status, 404, 'narrador perde o acesso');
});

test('link de leitura: cria, lê sem conta, revoga', async () => {
  let r = await req('POST', '/fichas/' + idA + '/links', { token: bia });
  assert.equal(r.status, 404);
  r = await req('POST', '/fichas/' + idA + '/links', { token: ana });
  assert.equal(r.status, 201);
  const { token, url } = r.body;
  assert.equal(url, 'https://fichas.exemplo/?ver=' + token);

  r = await req('GET', '/publico/' + token);
  assert.equal(r.status, 200);
  assert.equal(r.body.ficha.nome, 'Lúcia'); assert.equal(r.body.ficha.dono, 'Ana');
  assert.equal(r.headers['cache-control'], 'no-store');

  r = await req('GET', '/fichas/' + idA + '/links', { token: ana });
  assert.equal(r.body.links.length, 1);
  assert.equal((await req('DELETE', `/fichas/${idA}/links/${token}`, { token: ana })).status, 200);
  assert.equal((await req('GET', '/publico/' + token)).status, 404);
  assert.equal((await req('GET', '/publico/inexistente')).status, 404);
});

test('histórico legível e painel do narrador', async () => {
  let r = await req('POST', '/cronicas', { token: bia, body: { nome: 'Painel' } });
  const cr = r.body.cronica;
  r = await req('POST', '/cronicas/entrar', { token: ana, body: { codigo: cr.codigo_convite } });
  assert.equal(r.status, 200);

  const id = crypto.randomUUID();
  r = await req('PUT', '/fichas/' + id, { token: ana, body: { dados: ficha('Odete', { fome: 1 }), versao_base: null, cronica_id: cr.id } });
  assert.equal(r.status, 201);
  /* o narrador mexe (outro autor: vira outra versão) */
  r = await req('PUT', '/fichas/' + id, { token: bia, body: { dados: ficha('Odete', { fome: 3, atr: { forca: 3 }, disc: [{ nome: 'Dominação', nivel: 1, poderes: [] }] }), versao_base: 1 } });
  assert.equal(r.status, 200);

  r = await req('GET', `/fichas/${id}/versoes`, { token: ana });
  const [v2, v1] = r.body.versoes;
  assert.ok(v1.mudancas.criada, 'primeira versão é a criação');
  assert.equal(v2.autor, 'Bia');
  const textos = v2.mudancas.itens.map(i => i.t);
  assert.ok(textos.includes('Força 2 → 3'), JSON.stringify(textos));
  assert.ok(textos.includes('Fome 1 → 3'));
  assert.ok(textos.includes('+ Dominação 1'));

  /* restaurar marca de onde veio */
  r = await req('POST', `/fichas/${id}/versoes/1/restaurar`, { token: ana });
  assert.equal(r.status, 200);
  r = await req('GET', `/fichas/${id}/versoes`, { token: ana });
  assert.equal(r.body.versoes[0].mudancas.restaurada, 1);
  assert.equal(r.body.versoes.length, 3, 'restaurar nunca se junta à versão anterior');
  /* e a edição seguinte também não se junta à restauração */
  r = await req('PUT', '/fichas/' + id, { token: ana, body: { dados: ficha('Odete', { fome: 2 }), versao_base: r.body.versoes[0].versao } });
  r = await req('GET', `/fichas/${id}/versoes`, { token: ana });
  assert.equal(r.body.versoes.length, 4);
  assert.ok(r.body.versoes[0].mudancas.itens.some(i => i.t === 'Fome 1 → 2'));
  assert.ok(r.body.versoes[1].mudancas.itens.some(i => i.t === 'Força 3 → 2'), 'a restauração mostra o que desfez');

  /* versões antigas (sem o resumo) são preenchidas ao abrir o histórico */
  await pool.query('update ficha_versoes set mudancas = null where ficha_id = $1', [id]);
  r = await req('GET', `/fichas/${id}/versoes`, { token: bia });
  assert.ok(r.body.versoes.every(v => v.mudancas), 'todas preenchidas');
  assert.ok(r.body.versoes[r.body.versoes.length - 1].mudancas.criada);
  assert.ok(r.body.versoes.some(v => v.mudancas.itens.some(i => i.t === 'Fome 1 → 3')));

  /* painel: só o narrador */
  assert.equal((await req('GET', `/cronicas/${cr.id}/painel`, { token: ana })).status, 403);
  r = await req('GET', `/cronicas/${cr.id}/painel`, { token: bia });
  assert.equal(r.status, 200);
  const anaM = r.body.membros.find(m => m.nome === 'Ana');
  assert.ok(anaM && anaM.ultimo_acesso && anaM.ativo === true, 'Ana acabou de usar a API');
  assert.equal(r.body.fichas.length, 1);
  assert.equal(r.body.fichas[0].dono, 'Ana');
  assert.ok(r.body.fichas[0].dados && r.body.fichas[0].dados.meta, 'vem com o conteúdo');
  assert.equal(r.body.fichas[0].ultimo_autor, 'Ana');
  assert.ok(r.body.atividade.length >= 2);
  assert.equal(r.body.atividade[0].ficha, 'Odete');
  assert.equal((await req('GET', `/cronicas/${crypto.randomUUID()}/painel`, { token: bia })).status, 404);
});

test('CORS só para os sites configurados; ficha grande demais', async () => {
  let r = await req('GET', '/saude', { origem: 'https://fichas.exemplo' });
  assert.equal(r.headers['access-control-allow-origin'], 'https://fichas.exemplo');
  r = await req('GET', '/saude', { origem: 'https://malicioso.exemplo' });
  assert.equal(r.headers['access-control-allow-origin'], undefined);

  const enorme = ficha('Grande', { notas: 'x'.repeat(cfg.maxFichaBytes) });
  r = await req('PUT', '/fichas/' + crypto.randomUUID(), { token: ana, body: { dados: enorme, versao_base: null } });
  assert.ok(r.status === 413, 'status ' + r.status);
});

test('limite de tentativas no login', async () => {
  let ultimo;
  for (let i = 0; i < 12; i++) ultimo = await req('POST', '/auth/entrar', { body: { email: 'ana@exemplo.com', senha: 'errada' + i } });
  assert.equal(ultimo.status, 429);
});
