/* Mapa da crônica + papéis de mestre e jogador.
   O que mais importa aqui: nada privado chega à conta de um jogador. */
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
const cfg = Object.assign(config({}), { origens: ['https://fichas.exemplo'], siteUrl: 'https://fichas.exemplo' });
async function req(metodo, url, { token, body } = {}) {
  const headers = token ? { authorization: 'Bearer ' + token } : {};
  const r = await app.inject({ method: metodo, url, payload: body, headers });
  let json = null; try { json = r.json(); } catch (_) {}
  return { status: r.statusCode, body: json, texto: r.body };
}
test.before(async () => {
  pool = criarPool(URL_TESTE);
  await pool.query('drop schema public cascade; create schema public;');
  await migrar(pool, () => {});
  app = criarApp({ pool, config: cfg });
  await app.ready();
});
test.after(async () => { await app.close(); await pool.end(); });

let mestre, jogador, fora, mestreId, jogadorId, cr, base;
const SEGREDO = 'O Príncipe esconde o corpo do Senescal no porão da catedral';

test('preparação: mestre cria a crônica, jogador entra', async () => {
  const cad = async (email, nome) => (await req('POST', '/auth/cadastro', { body: { email, senha: 'senha-forte-1', nome } })).body;
  let x = await cad('mestre@x.com', 'Mestre'); mestre = x.token; mestreId = x.usuario.id;
  x = await cad('jogador@x.com', 'Jogadora'); jogador = x.token; jogadorId = x.usuario.id;
  fora = (await cad('fora@x.com', 'De Fora')).token;
  const c = (await req('POST', '/cronicas', { token: mestre, body: { nome: 'Belmont' } })).body.cronica;
  cr = c.id; base = '/mapa/' + cr;
  assert.equal((await req('POST', '/cronicas/entrar', { token: jogador, body: { codigo: c.codigo_convite } })).status, 200);
});

test('abrir o mapa: só o mestre; antes disso o jogador espera', async () => {
  let r = await req('GET', base + '/estado', { token: jogador });
  assert.deepEqual([r.body.ativo, r.body.papel], [false, 'jogador']);
  assert.equal((await req('GET', base + '/publico', { token: jogador })).status, 409);
  assert.equal((await req('POST', base + '/ativar', { token: jogador })).status, 403);
  assert.equal((await req('GET', base + '/estado', { token: fora })).status, 404, 'quem não é da crônica não sabe que ela existe');
  r = await req('POST', base + '/ativar', { token: mestre });
  assert.equal(r.status, 200);
  r = await req('GET', base + '/districts', { token: mestre });
  assert.equal(r.body.length, 25, 'a Ilha do Zwart saiu da base');
  r = await req('GET', base + '/pois', { token: mestre });
  assert.ok(r.body.length >= 50, 'pontos da base: ' + r.body.length);
  assert.ok(r.body.every(p => p.revealed === false), 'tudo começa oculto');
  /* ativar de novo não duplica nada */
  await req('POST', base + '/ativar', { token: mestre });
  assert.equal((await req('GET', base + '/districts', { token: mestre })).body.length, 25);
});

test('jogador: começa vendo nada, nem a geometria do que está oculto', async () => {
  let r = await req('GET', base + '/publico', { token: jogador });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.districts.length, r.body.pois.length, r.body.npcs.length], [0, 0, 0]);
  r = await req('GET', base + '/cidade', { token: jogador });
  assert.equal(r.body.pois, undefined, 'coordenadas dos pontos não vão');
  assert.deepEqual(Object.keys(r.body.districts), []);
  assert.equal(r.body.footprints.length, 0);
  assert.ok(r.body.sea && r.body.land, 'o desenho geral da cidade vai');
  r = await req('GET', base + '/cidade', { token: mestre });
  assert.ok(Object.keys(r.body.pois).length > 50 && Object.keys(r.body.districts).length === 25);
  for (const rota of ['/pois', '/districts', '/npcs', '/events', '/scenes']) {
    assert.equal((await req('GET', base + rota, { token: jogador })).status, 403, 'jogador não lê ' + rota);
  }
  assert.equal((await req('POST', base + '/reveal', { token: jogador, body: { revealed: true, items: [{ type: 'poi', id: 'x' }] } })).status, 403);
});

let poiVisivel, poiOculto, npcVisivel;
test('mestre revela e escreve; jogador vê na hora, sem nada privado', async () => {
  const pois = (await req('GET', base + '/pois', { token: mestre })).body;
  const bairro = pois[0].district;
  poiVisivel = pois.find(p => p.district === bairro).id;
  poiOculto = pois.find(p => p.id !== poiVisivel).id;
  let r = await req('PUT', base + '/pois/' + poiVisivel, { token: mestre, body: { privateNote: SEGREDO, blurb: 'Uma igreja antiga.' } });
  assert.equal(r.body.privateNote, SEGREDO);
  await req('PUT', base + '/districts/' + bairro, { token: mestre, body: { privateNote: 'bairro: ' + SEGREDO } });
  const antes = (await req('GET', base + '/estado', { token: jogador })).body.atualizadoEm;
  r = await req('POST', base + '/reveal', { token: mestre, body: { revealed: true, items: [{ type: 'poi', id: poiVisivel }, { type: 'district', id: bairro }] } });
  assert.equal(r.body.changed, 2);
  const depois = (await req('GET', base + '/estado', { token: jogador })).body.atualizadoEm;
  assert.ok(depois > antes, 'o jogador percebe que mudou');

  await req('POST', base + '/events', { token: mestre, body: { targetType: 'poi', targetId: poiVisivel, body: 'Um corpo apareceu na escadaria.' } });
  await req('POST', base + '/events', { token: mestre, body: { targetType: 'poi', targetId: poiVisivel, body: 'Só eu sei: foi o Xerife quem matou.', visibility: 'private' } });
  await req('POST', base + '/events', { token: mestre, body: { targetType: 'poi', targetId: poiOculto, body: 'Evento num lugar ainda oculto.' } });
  r = await req('POST', base + '/districts/' + bairro + '/masquerade', { token: mestre, body: { delta: 3, reason: 'fotos no jornal' } });
  assert.equal(r.body.district.masquerade, 3);

  r = await req('POST', base + '/npcs', { token: mestre, body: { name: 'Irmã Agnes', clan: 'Malkavian', revealed: true,
    privateNote: 'agnes: ' + SEGREDO, locations: [{ poiId: poiVisivel, relation: 'refugio' }, { poiId: poiOculto, relation: 'dominio' }] } });
  assert.equal(r.status, 201); npcVisivel = r.body.id;
  assert.equal(r.body.locations.length, 2);
  await req('POST', base + '/npcs', { token: mestre, body: { name: 'Espião Oculto', revealed: true, hidden: true } });
  await req('POST', base + '/npcs', { token: mestre, body: { name: 'Ainda não revelado' } });
  await req('POST', base + '/scenes', { token: mestre, body: { name: 'Cena 1', x: 1, y: 2, w: 3, h: 4 } });

  r = await req('GET', base + '/publico', { token: jogador });
  assert.equal(r.status, 200);
  const pub = r.body, texto = r.texto;
  assert.deepEqual(pub.pois.map(p => p.id), [poiVisivel]);
  assert.deepEqual(pub.districts.map(d => [d.id, d.masquerade]), [[bairro, 3]]);
  assert.deepEqual(pub.npcs.map(n => n.name), ['Irmã Agnes'], 'oculto e não revelado ficam de fora');
  assert.deepEqual(pub.npcs[0].locations, [{ poiId: poiVisivel, relation: 'refugio' }], 'o vínculo com o ponto oculto não vaza');
  const corpos = pub.events.map(e => e.body);
  assert.ok(corpos.includes('Um corpo apareceu na escadaria.'));
  assert.ok(corpos.some(c => c.startsWith('Quebra da Máscara +3')));
  assert.ok(!corpos.some(c => c.includes('Xerife')), 'entrada privada não vai');
  assert.ok(!corpos.some(c => c.includes('ainda oculto')), 'diário de lugar oculto não vai');
  for (const proibido of ['privateNote', 'private_note', 'hidden', 'visibility', 'createdBy', 'fichaId', SEGREDO.slice(0, 30), poiOculto]) {
    assert.ok(!texto.includes(proibido), 'vazou: ' + proibido);
  }
  r = await req('GET', base + '/cidade', { token: jogador });
  assert.deepEqual(Object.keys(r.body.districts), [bairro], 'só o desenho do bairro revelado');
});

test('trava: nota privada copiada num texto público bloqueia a visão do jogador', async () => {
  await req('PUT', base + '/pois/' + poiVisivel, { token: mestre, body: { blurb: 'Dizem que ' + SEGREDO } });
  let r = await req('GET', base + '/publico', { token: jogador });
  assert.equal(r.status, 409);
  assert.ok(!r.texto.includes(SEGREDO.slice(0, 20)), 'nem a mensagem de erro mostra o segredo ao jogador');
  r = await req('GET', base + '/publico', { token: mestre });
  assert.equal(r.status, 409);
  assert.match(r.body.erro, /nota privada/, 'o mestre vê o motivo');
  await req('PUT', base + '/pois/' + poiVisivel, { token: mestre, body: { blurb: 'Uma igreja antiga.' } });
  assert.equal((await req('GET', base + '/publico', { token: jogador })).status, 200);
});

test('personagem do mapa ligado a uma ficha; jogador nunca vê o vínculo', async () => {
  const fichaJogador = crypto.randomUUID(), fichaDeFora = crypto.randomUUID(), fichaMestre = crypto.randomUUID();
  await req('PUT', '/fichas/' + fichaJogador, { token: jogador, body: { dados: { meta: { nome: 'Lúcia' } }, versao_base: null, cronica_id: cr } });
  await req('PUT', '/fichas/' + fichaDeFora, { token: fora, body: { dados: { meta: { nome: 'Outra' } }, versao_base: null } });
  await req('PUT', '/fichas/' + fichaMestre, { token: mestre, body: { dados: { meta: { nome: 'Agnes (NPC)' } }, versao_base: null } });
  let r = await req('PUT', base + '/npcs/' + npcVisivel, { token: mestre, body: { fichaId: fichaDeFora } });
  assert.equal(r.status, 400, 'ficha de quem não é da crônica não');
  r = await req('PUT', base + '/npcs/' + npcVisivel, { token: mestre, body: { fichaId: fichaMestre } });
  assert.equal(r.body.fichaId, fichaMestre);
  r = await req('POST', base + '/npcs', { token: mestre, body: { name: 'Lúcia', fichaId: fichaJogador, revealed: true } });
  assert.equal(r.body.fichaId, fichaJogador);
  r = await req('GET', base + '/publico', { token: jogador });
  assert.ok(!r.texto.includes(fichaMestre) && !r.texto.includes(fichaJogador));
  assert.ok(r.body.npcs.some(n => n.name === 'Lúcia'));
});

test('mestre monta uma ficha e entrega a um jogador; jogador não vê as fichas do mestre', async () => {
  const id = crypto.randomUUID();
  await req('PUT', '/fichas/' + id, { token: mestre, body: { dados: { meta: { nome: 'Pré-gerada' } }, versao_base: null, cronica_id: cr } });
  let r = await req('GET', '/cronicas/' + cr, { token: jogador });
  assert.ok(!r.body.fichas.some(f => f.nome === 'Pré-gerada'), 'ainda é do mestre: não aparece para o jogador');
  r = await req('GET', '/cronicas/' + cr, { token: mestre });
  assert.ok(r.body.fichas.some(f => f.nome === 'Pré-gerada'));
  assert.equal((await req('POST', '/fichas/' + id + '/transferir', { token: jogador, body: { usuario_id: jogadorId, cronica_id: cr } })).status, 404);
  r = await req('POST', '/fichas/' + id + '/transferir', { token: mestre, body: { usuario_id: crypto.randomUUID(), cronica_id: cr } });
  assert.equal(r.status, 400, 'só para quem está na crônica');
  r = await req('POST', '/fichas/' + id + '/transferir', { token: mestre, body: { usuario_id: jogadorId, cronica_id: cr } });
  assert.equal(r.status, 200); assert.equal(r.body.para, 'Jogadora');
  r = await req('GET', '/fichas?dados=1', { token: jogador });
  assert.ok(r.body.fichas.some(f => f.id === id && f.dados.meta.nome === 'Pré-gerada'), 'agora é do jogador');
  r = await req('GET', '/fichas/' + id, { token: mestre });
  assert.equal(r.body.permissao, 'narrador', 'o mestre continua com acesso pela crônica');
  r = await req('PUT', '/fichas/' + id, { token: mestre, body: { dados: { meta: { nome: 'Pré-gerada' }, xpTotal: 10 }, versao_base: r.body.ficha.versao } });
  assert.equal(r.status, 200);
});

test('importar o Belmont antigo substitui o mapa da crônica', async () => {
  const exp = {
    formato: 'belmont-export-1',
    pois: [{ id: 'elysium', name: 'Elysium', icon: 'museum', faction: 'camarilla', type: 'cultura', district: 'centro-historico',
      x: 100, y: 200, private_note: 'nota do elysium', custom: 0, revealed: 1, updated_at: 1700000000000 },
      { id: 'sem-posicao', name: 'Sem x', x: null, y: 1 }],
    districts: [], /* banco antigo sem bairros: usa a base */
    npcs: [{ id: 'npc-1', name: 'Príncipe', clan: 'Ventrue', faction: 'camarilla', status: 'ativo', revealed: 1, hidden: 0 }],
    npc_locations: [{ npc_id: 'npc-1', poi_id: 'elysium', relation: 'dominio' }, { npc_id: 'npc-1', poi_id: 'nao-existe', relation: 'x' }],
    events: [{ id: 'ev-1', target_type: 'poi', target_id: 'elysium', kind: 'note', body: 'Reunião no Elysium.', visibility: 'public', created_at: 1700000000001 }],
    scenes: [{ id: 'scene-1', name: 'Abertura', x: 0, y: 0, w: 10, h: 10 }]
  };
  assert.equal((await req('POST', base + '/importar', { token: jogador, body: exp })).status, 403);
  let r = await req('POST', base + '/importar', { token: mestre, body: exp });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.importado, { bairros: 25, pontos: 1, personagens: 1, diario: 1, cenas: 1 });
  r = await req('GET', base + '/npcs', { token: mestre });
  assert.deepEqual(r.body[0].locations, [{ poiId: 'elysium', relation: 'dominio' }]);
  r = await req('GET', base + '/publico', { token: jogador });
  assert.deepEqual(r.body.pois.map(p => p.name), ['Elysium']);
  assert.ok(!r.texto.includes('nota do elysium'));
  assert.equal((await req('POST', base + '/importar', { token: mestre, body: { formato: 'outra-coisa' } })).status, 400);
});

test('editor de mapa: traços, bairros desenhados e elementos apagados', async () => {
  /* a ilha não existe mais em lugar nenhum */
  let r = await req('GET', base + '/cidade', { token: mestre });
  assert.ok(!r.body.districts['ilha-do-zwart'], 'sem geometria da ilha');
  assert.ok(!r.body.pois['ruinas-lazareto']);
  assert.deepEqual(r.body.editor, { removidos: [], tracos: [] });

  /* traços: validação */
  assert.equal((await req('POST', base + '/tracos', { token: jogador, body: { kind: 'rua', pts: [[1, 1], [2, 2]] } })).status, 403);
  assert.equal((await req('POST', base + '/tracos', { token: mestre, body: { kind: 'foguete', pts: [[1, 1], [2, 2]] } })).status, 400);
  assert.equal((await req('POST', base + '/tracos', { token: mestre, body: { kind: 'rua', pts: [[1, 1]] } })).status, 400, 'rua precisa de 2 pontos');
  assert.equal((await req('POST', base + '/tracos', { token: mestre, body: { kind: 'agua', pts: [[1, 1], [9, 9]] } })).status, 400, 'área precisa de 3');
  assert.equal((await req('POST', base + '/tracos', { token: mestre, body: { kind: 'rua', pts: [[1, 1], [99999, 2]] } })).status, 400, 'fora do mapa');
  assert.equal((await req('POST', base + '/tracos', { token: mestre, body: { kind: 'rotulo', pts: [[5, 5]] } })).status, 400, 'texto vazio');

  r = await req('POST', base + '/tracos', { token: mestre, body: { kind: 'rua', name: 'Rua Nova', pts: [[100.123, 200], [300, 260], [420, 300]], props: { largura: 9, lixo: 1 } } });
  assert.equal(r.status, 201);
  const rua = r.body;
  assert.match(rua.id, /^traco-/);
  assert.deepEqual(rua.pts[0], [100.1, 200]);
  assert.deepEqual(rua.props, { largura: 4 }, 'largura limitada e propriedades desconhecidas fora');
  assert.equal(rua.revealed, true, 'traço nasce visível');
  r = await req('POST', base + '/tracos', { token: mestre, body: { kind: 'agua', name: 'Lago secreto', revealed: false, pts: [[500, 500], [600, 500], [550, 600]] } });
  const lago = r.body;
  r = await req('POST', base + '/tracos', { token: mestre, body: { id: 'traco-desfeito-1', kind: 'rotulo', name: 'Cais Velho', pts: [[700, 700]], props: { tamanho: 20, rot: 15, estilo: 'agua' } } });
  assert.equal(r.body.id, 'traco-desfeito-1', 'aceita o id de volta (desfazer)');
  assert.deepEqual(r.body.props, { tamanho: 20, rot: 15, estilo: 'agua' });

  r = await req('PUT', base + '/tracos/' + rua.id, { token: mestre, body: { name: 'Rua do Porto', pts: [[100, 200], [420, 300]] } });
  assert.equal(r.body.name, 'Rua do Porto'); assert.equal(r.body.pts.length, 2); assert.equal(r.body.kind, 'rua');

  /* elementos da base apagados */
  assert.equal((await req('PUT', base + '/removidos', { token: jogador, body: { adicionar: ['blocks:abc'] } })).status, 403);
  r = await req('PUT', base + '/removidos', { token: mestre, body: { adicionar: ['blocks:abc1', 'trees:z9', 'nada', 'x:<script>'] } });
  assert.deepEqual(r.body.removidos.sort(), ['blocks:abc1', 'trees:z9'], 'só chaves válidas');
  r = await req('PUT', base + '/removidos', { token: mestre, body: { tirar: ['trees:z9'] } });
  assert.deepEqual(r.body.removidos, ['blocks:abc1']);

  /* bairro desenhado */
  assert.equal((await req('POST', base + '/districts', { token: mestre, body: { name: '', geom: [[1, 1], [2, 2], [3, 1]] } })).status, 400);
  r = await req('POST', base + '/districts', { token: mestre, body: { name: 'Vila Nova', sub: 'recém-desenhada', faction: 'anarch',
    geom: [[800, 800], [900, 800], [900, 900], [800, 900]], labelX: 850, labelY: 850, privateNote: SEGREDO + ' de novo' } });
  assert.equal(r.status, 201);
  const vila = r.body;
  assert.ok(vila.custom && vila.geom.length === 4 && vila.labelX === 850);
  assert.equal(vila.revealed, false, 'bairro novo nasce oculto');

  /* redesenhar o contorno de um bairro da base e voltar ao original */
  r = await req('PUT', base + '/districts/vismarkt', { token: mestre, body: { geom: [[1, 1], [50, 1], [50, 50]] } });
  assert.equal(r.body.geom.length, 3);
  r = await req('PUT', base + '/districts/vismarkt', { token: mestre, body: { name: 'Vismarkt' } });
  assert.equal(r.body.geom.length, 3, 'outra edição não perde o contorno');
  r = await req('PUT', base + '/districts/vismarkt', { token: mestre, body: { geom: null } });
  assert.equal(r.body.geom, null, 'volta ao contorno da base');

  /* o jogador: só traços visíveis, sem campos do mestre; bairro oculto não aparece */
  r = await req('GET', base + '/cidade', { token: jogador });
  const nomes = r.body.editor.tracos.map(t => t.name).sort();
  assert.deepEqual(nomes, ['Cais Velho', 'Rua do Porto']);
  assert.ok(!r.texto.includes('Lago secreto'));
  assert.ok(r.body.editor.tracos.every(t => !('revealed' in t) && !('ordem' in t)));
  assert.deepEqual(r.body.editor.removidos, ['blocks:abc1']);
  r = await req('GET', base + '/publico', { token: jogador });
  assert.ok(!r.body.districts.some(d => d.id === vila.id));
  await req('POST', base + '/reveal', { token: mestre, body: { revealed: true, items: [{ type: 'district', id: vila.id }] } });
  r = await req('GET', base + '/publico', { token: jogador });
  const vj = r.body.districts.find(d => d.id === vila.id);
  assert.ok(vj && vj.geom.length === 4, 'revelado: o jogador recebe o contorno');
  assert.ok(!r.texto.includes(SEGREDO), 'nota privada do bairro não vaza');

  /* apagar */
  r = await req('POST', base + '/pois', { token: mestre, body: { name: 'Bar da Vila', district: vila.id, x: 850, y: 850 } });
  const bar = r.body;
  r = await req('DELETE', base + '/districts/' + vila.id, { token: mestre });
  assert.equal(r.status, 200); assert.equal(r.body.pontosSemBairro, 1);
  assert.equal((await req('GET', base + '/pois', { token: mestre })).body.find(p => p.id === bar.id).district, '', 'o ponto fica, sem bairro');
  assert.equal((await req('DELETE', base + '/districts/' + vila.id, { token: mestre })).status, 404);
  assert.equal((await req('DELETE', base + '/tracos/' + lago.id, { token: jogador })).status, 403);
  r = await req('DELETE', base + '/tracos/' + lago.id, { token: mestre });
  assert.equal(r.body.traco.name, 'Lago secreto', 'devolve o que apagou (para desfazer)');
  assert.equal((await req('GET', base + '/tracos', { token: mestre })).body.length, 2);
});

test('importar um Belmont antigo não traz a ilha de volta', async () => {
  const r = await req('POST', base + '/importar', { token: mestre, body: { formato: 'belmont-export-1',
    districts: [{ id: 'ilha-do-zwart', name: 'Ilha do Zwart', faction: 'neutral' }, { id: 'vismarkt', name: 'Vismarkt', faction: 'neutral' }],
    pois: [{ id: 'ruinas-lazareto', name: 'Ruínas', x: 1, y: 1, district: 'ilha-do-zwart' }, { id: 'p1', name: 'P1', x: 5, y: 5, district: 'ilha-do-zwart' }],
    events: [{ id: 'e1', target_type: 'district', target_id: 'ilha-do-zwart', body: 'algo' }] } });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.importado.bairros, r.body.importado.pontos, r.body.importado.diario], [1, 1, 0]);
  assert.equal((await req('GET', base + '/pois', { token: mestre })).body[0].district, '');
  assert.deepEqual((await req('GET', base + '/cidade', { token: mestre })).body.editor, { removidos: [], tracos: [] }, 'importar zera o editor');
});

test('apagar a crônica leva o mapa junto', async () => {
  await req('DELETE', '/cronicas/' + cr, { token: mestre });
  const { rows: [{ n }] } = await pool.query('select count(*)::int n from mapa_pontos where cronica_id = $1', [cr]);
  assert.equal(n, 0);
});
