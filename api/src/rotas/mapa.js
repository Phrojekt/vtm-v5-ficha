/* ============================================================
   Mapa da crônica (o antigo Belmont Noturno)

   Tudo fica em /mapa/:cr/... e pertence a uma crônica.
   - narrador (mestre): lê tudo, inclusive notas privadas e itens ocultos, e edita
   - jogador: só /estado, /cidade e /publico — a visão filtrada, montada aqui no
     servidor a partir de uma lista fechada de campos. Nada privado sai daqui
     para a conta de um jogador.

   Os formatos de resposta são os mesmos que o front do Belmont já usava.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { transacao } = require('../db');
const base = require('../mapa/base-belmont');

const UUID = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const FACTIONS = ['camarilla', 'anarch', 'neutral'];
const STATUSES = ['ativo', 'desaparecido', 'torpor', 'morte-final'];
const RELATIONS = ['dominio', 'refugio', 'frequenta'];
const MQ_MAX = 10;
const CIDADE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'dados', 'belmont-cidade.json'), 'utf8'));

/* editor de mapa: tipos de traço e o que cada um aceita */
const TIPOS_LINHA = ['avenida', 'rua', 'viela', 'trilho', 'muro', 'passarela', 'ponte'];
const TIPOS_AREA = ['agua', 'parque', 'terreno', 'areia', 'praca', 'quadra', 'predio', 'baldio'];
const TIPOS_TEXTO = ['rotulo'];
const ESTILOS_TEXTO = ['agua', 'terra', 'menor', 'destaque'];
/* o que saiu da cidade base para sempre: não volta nem importando um Belmont antigo */
const FORA_DA_BASE = { districts: new Set(['ilha-do-zwart']), pois: new Set(['ruinas-lazareto']) };
const CHAVE_BASE = /^[a-z_]{2,20}:[a-z0-9]{1,14}$/;
const ID_TRACO = /^traco-[a-z0-9-]{3,40}$/, ID_BAIRRO = /^bairro-[a-z0-9-]{3,40}$/;

function limparPts(lista, min, max, erro) {
  if (!Array.isArray(lista) || lista.length < min || lista.length > max) throw erro(400, `O desenho precisa de ${min} a ${max} pontos.`);
  return lista.map(p => {
    const x = Number(Array.isArray(p) ? p[0] : p && p.x), y = Number(Array.isArray(p) ? p[1] : p && p.y);
    if (!isFinite(x) || !isFinite(y) || x < -200 || x > 2800 || y < -200 || y > 2020) throw erro(400, 'Ponto fora do mapa.');
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
}
function limparProps(kind, p) {
  p = p && typeof p === 'object' ? p : {};
  const n = (v, a, b, padrao) => { v = Number(v); return isFinite(v) ? Math.max(a, Math.min(b, v)) : padrao; };
  const o = {};
  if (TIPOS_LINHA.includes(kind)) o.largura = n(p.largura, 0.3, 4, 1);
  if (kind === 'rotulo') {
    o.tamanho = n(p.tamanho, 6, 80, 14); o.rot = n(p.rot, -180, 180, 0);
    o.estilo = ESTILOS_TEXTO.includes(p.estilo) ? p.estilo : 'terra';
  }
  return o;
}
function tracoApi(r) {
  return { id: r.id, kind: r.kind, name: r.name, pts: r.pts, props: r.props || {}, revealed: r.revealed,
    ordem: Number(r.ordem) || 0, updatedAt: Number(r.updated_at) || 0 };
}

const novoId = prefixo => prefixo + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const txt = (v, max = 20000) => String(v == null ? '' : v).slice(0, max);

/* ---------- formatos (iguais aos do Belmont) ---------- */
function poiApi(r, privado) {
  const o = { id: r.id, name: r.name, icon: r.icon, faction: r.faction, type: r.type, district: r.district,
    domain: r.domain, blurb: r.blurb, x: r.x, y: r.y, custom: r.custom, revealed: r.revealed };
  if (privado) o.privateNote = r.private_note || '';
  return o;
}
function bairroApi(r, privado) {
  const o = { id: r.id, name: r.name, sub: r.sub, faction: r.faction, blurb: r.blurb, domain: r.domain || '',
    masquerade: r.masquerade || 0, revealed: r.revealed, updatedAt: r.updated_at,
    geom: r.geom || null, labelX: r.label_x, labelY: r.label_y, custom: !!r.custom };
  if (privado) o.privateNote = r.private_note || '';
  return o;
}
function npcApi(r, locais, privado) {
  const o = { id: r.id, name: r.name, clan: r.clan, faction: r.faction, role: r.role, status: r.status,
    description: r.description, hidden: r.hidden, revealed: r.revealed, locations: locais || [], updatedAt: r.updated_at };
  if (privado) { o.privateNote = r.private_note || ''; o.fichaId = r.ficha_id || null; }
  return o;
}
function eventoApi(r) {
  return { id: r.id, targetType: r.target_type, targetId: r.target_id, kind: r.kind, session: r.session || '',
    body: r.body, visibility: r.visibility, delta: r.delta, createdBy: r.created_by, createdAt: r.created_at };
}
function cenaApi(r) {
  return { id: r.id, name: r.name, x: r.x, y: r.y, w: r.w, h: r.h, createdBy: r.created_by, createdAt: r.created_at };
}

/* ---------- visão do jogador: lista fechada de campos ---------- */
async function montarPublico(c, cr) {
  const bairros = (await c.query('select * from mapa_bairros where cronica_id = $1 and revealed order by id', [cr])).rows;
  const pontos = (await c.query('select * from mapa_pontos where cronica_id = $1 and revealed order by id', [cr])).rows;
  const npcs = (await c.query(
    'select * from mapa_personagens where cronica_id = $1 and revealed and not hidden order by lower(name)', [cr])).rows;
  const idsPontos = new Set(pontos.map(p => p.id)), idsBairros = new Set(bairros.map(b => b.id)), idsNpcs = new Set(npcs.map(n => n.id));
  const locais = {};
  (await c.query('select npc_id, poi_id, relation from mapa_personagem_locais where cronica_id = $1 order by relation, poi_id', [cr]))
    .rows.forEach(l => {
      /* vínculo só com ponto revelado, senão o id de um ponto oculto vazaria */
      if (!idsNpcs.has(l.npc_id) || !idsPontos.has(l.poi_id)) return;
      (locais[l.npc_id] = locais[l.npc_id] || []).push({ poiId: l.poi_id, relation: l.relation });
    });
  const eventos = (await c.query(
    "select * from mapa_eventos where cronica_id = $1 and visibility = 'public' order by created_at desc limit 1000", [cr])).rows
    .filter(e => (e.target_type === 'poi' && idsPontos.has(e.target_id)) || (e.target_type === 'district' && idsBairros.has(e.target_id)));
  const { rows: [cron] } = await c.query('select mapa_atualizado_em from cronicas where id = $1', [cr]);
  return {
    version: 1,
    publishedAt: cron ? cron.mapa_atualizado_em : 0,
    districts: bairros.map(d => ({ id: d.id, name: d.name, sub: d.sub, faction: d.faction, blurb: d.blurb,
      domain: d.domain || '', masquerade: d.masquerade || 0,
      geom: d.geom || null, labelX: d.label_x, labelY: d.label_y })),
    pois: pontos.map(p => ({ id: p.id, name: p.name, icon: p.icon, faction: p.faction, type: p.type,
      district: p.district, domain: p.domain || '', blurb: p.blurb, x: p.x, y: p.y })),
    npcs: npcs.map(n => ({ id: n.id, name: n.name, clan: n.clan || '', faction: n.faction, role: n.role || '',
      status: n.status || 'ativo', description: n.description || '', locations: locais[n.id] || [] })),
    events: eventos.map(e => ({ id: e.id, targetType: e.target_type, targetId: e.target_id, kind: e.kind,
      session: e.session || '', body: e.body, delta: e.delta, createdAt: e.created_at }))
  };
}

/* Trava de segurança (a mesma do "Publicar" do Belmont): se um campo privado ou
   um trecho de nota privada aparecer no que vai para o jogador, não entrega. */
const PROIBIDOS = ['privateNote', 'private_note', 'visibility', 'hidden', 'createdBy', 'created_by', 'fichaId', 'ficha_id'];
async function conferirPublico(c, cr, texto) {
  for (const k of PROIBIDOS) if (texto.includes('"' + k + '"')) throw new Error('campo privado "' + k + '" na visão do jogador');
  const agulhas = [];
  for (const t of ['mapa_pontos', 'mapa_bairros', 'mapa_personagens']) {
    (await c.query(`select private_note from ${t} where cronica_id = $1 and private_note <> ''`, [cr])).rows
      .forEach(r => agulhas.push(r.private_note));
  }
  (await c.query("select body from mapa_eventos where cronica_id = $1 and visibility = 'private'", [cr])).rows
    .forEach(r => agulhas.push(r.body));
  for (const bruto of agulhas) {
    const s = String(bruto).trim();
    if (s.length < 12) continue; /* texto curto demais dá falso positivo */
    if (texto.includes(JSON.stringify(s.slice(0, 80)).slice(1, -1))) {
      const e = new Error('trecho de nota privada num texto público: "' + s.slice(0, 40) + '…"');
      e.trechoPrivado = true;
      throw e;
    }
  }
}

/* geometria da cidade: o jogador só recebe o desenho do que foi revelado */
function cidadeDoJogador(publico) {
  const cidade = Object.assign({}, CIDADE);
  delete cidade.pois;
  const manter = new Set(publico.districts.map(d => d.id));
  cidade.districts = {};
  Object.keys(CIDADE.districts || {}).forEach(id => { if (manter.has(id)) cidade.districts[id] = CIDADE.districts[id]; });
  cidade.footprints = (CIDADE.footprints || []).filter(f => {
    const nums = String(f).match(/-?\d+(\.\d+)?/g) || [];
    if (nums.length < 2) return false;
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i + 1 < nums.length; i += 2) { sx += +nums[i]; sy += +nums[i + 1]; n++; }
    const cx = sx / n, cy = sy / n;
    return publico.pois.some(p => Math.abs(p.x - cx) < 45 && Math.abs(p.y - cy) < 45);
  });
  return cidade;
}

module.exports = async function rotasMapa(app) {
  const { pool, erro } = app;
  app.addHook('preHandler', app.autenticar);

  /* papel na crônica: 'narrador', 'jogador' ou erro 404 */
  async function papel(req) {
    const cr = req.params.cr;
    if (!new RegExp(UUID).test(cr)) throw erro(404, 'crônica não encontrada');
    const { rows: [m] } = await pool.query(
      `select m.papel, c.mapa_ativo, c.nome from cronica_membros m join cronicas c on c.id = m.cronica_id
        where m.cronica_id = $1 and m.usuario_id = $2`, [cr, req.usuario.id]);
    if (!m) throw erro(404, 'crônica não encontrada');
    return m;
  }
  async function mestre(req) {
    const m = await papel(req);
    if (m.papel !== 'narrador') throw erro(403, 'só o mestre da crônica pode fazer isso');
    if (!m.mapa_ativo && !/\/(ativar|importar)$/.test(req.routeOptions.url)) throw erro(409, 'o mapa desta crônica ainda não foi aberto');
    return m;
  }
  /* qualquer mudança avisa os jogadores (o front deles compara este número) */
  const tocar = (c, cr) => c.query('update cronicas set mapa_atualizado_em = $2 where id = $1', [cr, Date.now()]);
  async function locaisDe(c, cr, ids) {
    const mapa = {};
    if (!ids.length) return mapa;
    (await c.query('select npc_id, poi_id, relation from mapa_personagem_locais where cronica_id = $1 and npc_id = any($2) order by relation, poi_id',
      [cr, ids])).rows.forEach(l => (mapa[l.npc_id] = mapa[l.npc_id] || []).push({ poiId: l.poi_id, relation: l.relation }));
    return mapa;
  }
  const quem = req => req.usuario.nome || req.usuario.email;

  /* ---------- estado, abertura e importação ---------- */
  app.get('/mapa/:cr/estado', async (req) => {
    const m = await papel(req);
    const { rows: [c] } = await pool.query('select mapa_atualizado_em from cronicas where id = $1', [req.params.cr]);
    return { ativo: m.mapa_ativo, papel: m.papel, cronica: m.nome, atualizadoEm: c.mapa_atualizado_em };
  });

  /* abre o mapa com a cidade de Belmont, do jeito que o Belmont semeava */
  app.post('/mapa/:cr/ativar', async (req) => {
    await mestre(req);
    const cr = req.params.cr;
    return transacao(pool, async c => {
      const { rows: [{ n }] } = await c.query('select count(*)::int n from mapa_bairros where cronica_id = $1', [cr]);
      const agora = Date.now();
      if (!n) {
        for (const d of base.DISTRICTS) {
          await c.query(`insert into mapa_bairros (cronica_id, id, name, sub, faction, blurb, updated_at) values ($1,$2,$3,$4,$5,$6,$7)`,
            [cr, d.id, d.name || '', d.sub || '', d.faction || 'neutral', d.blurb || '', agora]);
        }
        for (const p of base.BASE_POIS) {
          const geo = CIDADE.pois[p.id];
          if (!geo || geo.x == null) continue;
          await c.query(`insert into mapa_pontos (cronica_id, id, name, icon, faction, type, district, domain, blurb, x, y, private_note, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [cr, p.id, p.name || '', p.icon || 'star', p.faction || 'neutral', p.type || base.ICON_TYPE[p.icon] || 'outro',
              geo.district || '', p.domain || '', p.blurb || '', geo.x, geo.y, p.privateNote || '', agora]);
        }
      }
      await c.query('update cronicas set mapa_ativo = true, mapa_atualizado_em = $2 where id = $1', [cr, agora]);
      return { ok: true, ativo: true };
    });
  });

  /* Importa o banco do Belmont antigo (arquivo gerado pelo EXPORTAR_BELMONT).
     Substitui o mapa inteiro desta crônica numa transação só. */
  app.post('/mapa/:cr/importar', {
    bodyLimit: 8 * 1024 * 1024,
    schema: { body: { type: 'object', required: ['formato'], properties: {
      formato: { const: 'belmont-export-1' },
      pois: { type: 'array' }, districts: { type: 'array' }, npcs: { type: 'array' },
      npc_locations: { type: 'array' }, events: { type: 'array' }, scenes: { type: 'array' } } } }
  }, async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body, agora = Date.now();
    const num = v => (v == null || v === '' || !isFinite(Number(v))) ? null : Number(v);
    const bool = v => !!(v === true || v === 1 || v === '1');
    return transacao(pool, async c => {
      for (const t of ['mapa_eventos', 'mapa_cenas', 'mapa_personagem_locais', 'mapa_personagens', 'mapa_pontos', 'mapa_bairros', 'mapa_tracos']) {
        await c.query(`delete from ${t} where cronica_id = $1`, [cr]);
      }
      await c.query("update cronicas set mapa_removidos = '[]' where id = $1", [cr]);
      /* bancos antigos do Belmont não tinham a tabela de bairros: usa a base */
      const bairros = (b.districts && b.districts.length) ? b.districts
        : base.DISTRICTS.map(d => Object.assign({ revealed: 0, masquerade: 0 }, d));
      for (const d of bairros) {
        if (FORA_DA_BASE.districts.has(String(d.id))) continue;
        await c.query(`insert into mapa_bairros (cronica_id, id, name, sub, faction, blurb, domain, private_note, masquerade, revealed, updated_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [cr, txt(d.id, 200), txt(d.name), txt(d.sub), FACTIONS.includes(d.faction) ? d.faction : 'neutral', txt(d.blurb),
            txt(d.domain), txt(d.private_note), Math.max(0, Math.min(MQ_MAX, num(d.masquerade) || 0)), bool(d.revealed), num(d.updated_at) || agora]);
      }
      for (const p of (b.pois || [])) {
        if (num(p.x) == null || num(p.y) == null || FORA_DA_BASE.pois.has(String(p.id))) continue;
        await c.query(`insert into mapa_pontos (cronica_id, id, name, icon, faction, type, district, domain, blurb, x, y, private_note, custom, revealed, updated_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [cr, txt(p.id, 200), txt(p.name), txt(p.icon || 'star', 40), txt(p.faction || 'neutral', 40), txt(p.type || 'outro', 40),
            FORA_DA_BASE.districts.has(String(p.district)) ? '' : txt(p.district, 200), txt(p.domain), txt(p.blurb), num(p.x), num(p.y), txt(p.private_note), bool(p.custom),
            bool(p.revealed), num(p.updated_at) || agora]);
      }
      for (const n of (b.npcs || [])) {
        await c.query(`insert into mapa_personagens (cronica_id, id, name, clan, faction, role, status, description, private_note, hidden, revealed, created_at, updated_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [cr, txt(n.id, 200), txt(n.name || 'Sem nome', 200), txt(n.clan, 80), FACTIONS.includes(n.faction) ? n.faction : 'neutral',
            txt(n.role, 200), STATUSES.includes(n.status) ? n.status : 'ativo', txt(n.description), txt(n.private_note),
            bool(n.hidden), bool(n.revealed), num(n.created_at) || agora, num(n.updated_at) || agora]);
      }
      const { rows: pts } = await c.query('select id from mapa_pontos where cronica_id = $1', [cr]);
      const { rows: ps } = await c.query('select id from mapa_personagens where cronica_id = $1', [cr]);
      const okP = new Set(pts.map(r => r.id)), okN = new Set(ps.map(r => r.id));
      for (const l of (b.npc_locations || [])) {
        if (!okP.has(l.poi_id) || !okN.has(l.npc_id)) continue;
        await c.query('insert into mapa_personagem_locais (cronica_id, npc_id, poi_id, relation) values ($1,$2,$3,$4) on conflict do nothing',
          [cr, l.npc_id, l.poi_id, RELATIONS.includes(l.relation) ? l.relation : 'dominio']);
      }
      for (const e of (b.events || [])) {
        if (!e.body || FORA_DA_BASE.districts.has(String(e.target_id)) || FORA_DA_BASE.pois.has(String(e.target_id))) continue;
        await c.query(`insert into mapa_eventos (cronica_id, id, target_type, target_id, kind, session, body, visibility, delta, created_by, created_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict do nothing`,
          [cr, txt(e.id, 200), e.target_type === 'district' ? 'district' : 'poi', txt(e.target_id, 200), e.kind === 'masquerade' ? 'masquerade' : 'note',
            txt(e.session, 200), txt(e.body), e.visibility === 'private' ? 'private' : 'public', num(e.delta),
            txt(e.created_by, 120), num(e.created_at) || agora]);
      }
      for (const s of (b.scenes || [])) {
        await c.query('insert into mapa_cenas (cronica_id, id, name, x, y, w, h, created_by, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing',
          [cr, txt(s.id, 200), txt(s.name || 'Cena', 200), num(s.x), num(s.y), num(s.w), num(s.h), txt(s.created_by, 120), num(s.created_at) || agora]);
      }
      await c.query('update cronicas set mapa_ativo = true, mapa_atualizado_em = $2 where id = $1', [cr, agora]);
      const contar = async t => (await c.query(`select count(*)::int n from ${t} where cronica_id = $1`, [cr])).rows[0].n;
      return { ok: true, importado: {
        bairros: await contar('mapa_bairros'), pontos: await contar('mapa_pontos'), personagens: await contar('mapa_personagens'),
        diario: await contar('mapa_eventos'), cenas: await contar('mapa_cenas') } };
    });
  });

  /* ---------- o que qualquer membro pode ler ---------- */
  app.get('/mapa/:cr/cidade', async (req, reply) => {
    const m = await papel(req);
    if (!m.mapa_ativo) throw erro(409, 'o mestre ainda não abriu o mapa desta crônica');
    reply.header('Cache-Control', 'no-store');
    const cr = req.params.cr;
    const { rows: [c] } = await pool.query('select mapa_removidos from cronicas where id = $1', [cr]);
    const removidos = (c && c.mapa_removidos) || [];
    if (m.papel === 'narrador') {
      const tracos = (await pool.query('select * from mapa_tracos where cronica_id = $1 order by ordem, id', [cr])).rows.map(tracoApi);
      return Object.assign({}, CIDADE, { editor: { removidos, tracos } });
    }
    /* jogador: só os traços visíveis, e sem nada além do desenho */
    const tracos = (await pool.query('select * from mapa_tracos where cronica_id = $1 and revealed order by ordem, id', [cr])).rows
      .map(r => ({ id: r.id, kind: r.kind, name: r.name, pts: r.pts, props: r.props || {} }));
    return Object.assign(cidadeDoJogador(await montarPublico(pool, cr)), { editor: { removidos, tracos } });
  });

  app.get('/mapa/:cr/publico', async (req, reply) => {
    const m = await papel(req);
    if (!m.mapa_ativo) throw erro(409, 'o mestre ainda não abriu o mapa desta crônica');
    const pub = await montarPublico(pool, req.params.cr);
    try { await conferirPublico(pool, req.params.cr, JSON.stringify(pub)); }
    catch (e) {
      req.log.error({ err: e.message, cronica: req.params.cr }, 'visão do jogador bloqueada');
      /* para o jogador, o mapa simplesmente não atualiza; o mestre vê o motivo */
      throw erro(409, m.papel === 'narrador'
        ? 'Os jogadores não estão recebendo o mapa: ' + e.message + '. Revise o texto público que copiou essa nota.'
        : 'o mapa está sendo atualizado pelo mestre; tente de novo em instantes');
    }
    reply.header('Cache-Control', 'no-store');
    return pub;
  });

  /* ---------- mestre: leitura completa ---------- */
  app.get('/mapa/:cr/pois', async (req) => {
    await mestre(req);
    return (await pool.query('select * from mapa_pontos where cronica_id = $1', [req.params.cr])).rows.map(r => poiApi(r, true));
  });
  app.get('/mapa/:cr/districts', async (req) => {
    await mestre(req);
    return (await pool.query('select * from mapa_bairros where cronica_id = $1', [req.params.cr])).rows.map(r => bairroApi(r, true));
  });
  app.get('/mapa/:cr/npcs', async (req) => {
    await mestre(req);
    const rows = (await pool.query('select * from mapa_personagens where cronica_id = $1 order by lower(name)', [req.params.cr])).rows;
    const locais = await locaisDe(pool, req.params.cr, rows.map(r => r.id));
    return rows.map(r => npcApi(r, locais[r.id], true));
  });
  app.get('/mapa/:cr/events', async (req) => {
    await mestre(req);
    const { targetType, targetId } = req.query;
    const limite = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 200));
    const params = [req.params.cr];
    let onde = 'cronica_id = $1';
    if (targetType && targetId) { params.push(String(targetType), String(targetId)); onde += ' and target_type = $2 and target_id = $3'; }
    return (await pool.query(`select * from mapa_eventos where ${onde} order by created_at desc limit ${limite}`, params)).rows.map(eventoApi);
  });
  app.get('/mapa/:cr/scenes', async (req) => {
    await mestre(req);
    return (await pool.query('select * from mapa_cenas where cronica_id = $1 order by created_at', [req.params.cr])).rows.map(cenaApi);
  });

  /* ---------- mestre: pontos ---------- */
  app.post('/mapa/:cr/pois', async (req, reply) => {
    await mestre(req);
    const b = req.body || {}, cr = req.params.cr;
    if (!b.name || !b.district || b.x == null || b.y == null) throw erro(400, 'Campos obrigatórios: nome, bairro e posição.');
    const id = novoId('poi');
    const r = await transacao(pool, async c => {
      const { rows: [p] } = await c.query(`insert into mapa_pontos (cronica_id, id, name, icon, faction, type, district, domain, blurb, x, y, private_note, custom, revealed, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,$14) returning *`,
        [cr, id, txt(b.name, 200), txt(b.icon || 'star', 40), txt(b.faction || 'neutral', 40), txt(b.type || 'outro', 40), txt(b.district, 200),
          txt(b.domain), txt(b.blurb), Number(b.x), Number(b.y), txt(b.privateNote), !!b.revealed, Date.now()]);
      await tocar(c, cr);
      return p;
    });
    reply.code(201);
    return poiApi(r, true);
  });
  app.put('/mapa/:cr/pois/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    return transacao(pool, async c => {
      const { rows: [e] } = await c.query('select * from mapa_pontos where cronica_id = $1 and id = $2 for update', [cr, req.params.id]);
      if (!e) throw erro(404, 'Ponto não encontrado.');
      const v = (k, col) => b[k] != null ? txt(b[k]) : e[col || k];
      const { rows: [p] } = await c.query(`update mapa_pontos set name=$3, icon=$4, faction=$5, type=$6, district=$7, domain=$8, blurb=$9,
          x=$10, y=$11, private_note=$12, revealed=$13, updated_at=$14 where cronica_id = $1 and id = $2 returning *`,
        [cr, e.id, v('name'), v('icon'), v('faction'), v('type'), v('district'), v('domain'), v('blurb'),
          b.x != null ? Number(b.x) : e.x, b.y != null ? Number(b.y) : e.y, v('privateNote', 'private_note'),
          b.revealed != null ? !!b.revealed : e.revealed, Date.now()]);
      await tocar(c, cr);
      return poiApi(p, true);
    });
  });
  app.delete('/mapa/:cr/pois/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr;
    return transacao(pool, async c => {
      const { rowCount } = await c.query('delete from mapa_pontos where cronica_id = $1 and id = $2', [cr, req.params.id]);
      if (!rowCount) throw erro(404, 'Ponto não encontrado.');
      await c.query("delete from mapa_eventos where cronica_id = $1 and target_type = 'poi' and target_id = $2", [cr, req.params.id]);
      await tocar(c, cr);
      return { ok: true };
    });
  });

  /* ---------- mestre: bairros e Máscara ---------- */
  app.put('/mapa/:cr/districts/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    return transacao(pool, async c => {
      const { rows: [e] } = await c.query('select * from mapa_bairros where cronica_id = $1 and id = $2 for update', [cr, req.params.id]);
      if (!e) throw erro(404, 'Bairro não encontrado.');
      const faccao = b.faction != null ? String(b.faction) : e.faction;
      if (!FACTIONS.includes(faccao)) throw erro(400, 'Facção inválida.');
      const nome = b.name != null ? txt(b.name, 200).trim() : e.name;
      if (!nome) throw erro(400, 'O bairro precisa de um nome.');
      const geom = 'geom' in b ? (b.geom === null ? null : JSON.stringify(limparPts(b.geom, 3, 3000, erro))) : (e.geom ? JSON.stringify(e.geom) : null);
      const rot = k => k in b ? (b[k] === null || !isFinite(Number(b[k])) ? null : Math.round(Number(b[k]) * 10) / 10) : e[k === 'labelX' ? 'label_x' : 'label_y'];
      const { rows: [d] } = await c.query(`update mapa_bairros set name=$3, sub=$4, faction=$5, blurb=$6, domain=$7, private_note=$8,
          revealed=$9, updated_at=$10, geom=$11, label_x=$12, label_y=$13 where cronica_id = $1 and id = $2 returning *`,
        [cr, e.id, nome, b.sub != null ? txt(b.sub) : e.sub, faccao, b.blurb != null ? txt(b.blurb) : e.blurb,
          b.domain != null ? txt(b.domain).trim() : e.domain, b.privateNote != null ? txt(b.privateNote) : e.private_note,
          b.revealed != null ? !!b.revealed : e.revealed, Date.now(), geom, rot('labelX'), rot('labelY')]);
      await tocar(c, cr);
      return bairroApi(d, true);
    });
  });
  /* bairro novo, desenhado no editor */
  app.post('/mapa/:cr/districts', async (req, reply) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    const nome = txt(b.name, 200).trim();
    if (!nome) throw erro(400, 'O bairro precisa de um nome.');
    const faccao = FACTIONS.includes(b.faction) ? b.faction : 'neutral';
    const geom = limparPts(b.geom, 3, 3000, erro);
    const num = v => v == null || !isFinite(Number(v)) ? null : Math.round(Number(v) * 10) / 10;
    return transacao(pool, async c => {
      let id = ID_BAIRRO.test(String(b.id || '')) ? String(b.id) : novoId('bairro');
      if ((await c.query('select 1 from mapa_bairros where cronica_id = $1 and id = $2', [cr, id])).rows[0]) id = novoId('bairro');
      const { rows: [d] } = await c.query(`insert into mapa_bairros (cronica_id, id, name, sub, faction, blurb, domain, private_note,
          masquerade, revealed, updated_at, geom, label_x, label_y, custom)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true) returning *`,
        [cr, id, nome, txt(b.sub), faccao, txt(b.blurb), txt(b.domain).trim(), txt(b.privateNote),
          Math.max(0, Math.min(MQ_MAX, Number(b.masquerade) || 0)), !!b.revealed, Date.now(), JSON.stringify(geom), num(b.labelX), num(b.labelY)]);
      await tocar(c, cr);
      reply.code(201);
      return bairroApi(d, true);
    });
  });
  /* apagar um bairro (da base ou desenhado): os pontos ficam, sem bairro */
  app.delete('/mapa/:cr/districts/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr;
    return transacao(pool, async c => {
      const { rows: [d] } = await c.query('delete from mapa_bairros where cronica_id = $1 and id = $2 returning *', [cr, req.params.id]);
      if (!d) throw erro(404, 'Bairro não encontrado.');
      await c.query("delete from mapa_eventos where cronica_id = $1 and target_type = 'district' and target_id = $2", [cr, d.id]);
      const { rowCount } = await c.query("update mapa_pontos set district = '' where cronica_id = $1 and district = $2", [cr, d.id]);
      await tocar(c, cr);
      return { ok: true, district: bairroApi(d, true), pontosSemBairro: rowCount };
    });
  });

  /* ---------- mestre: editor (traços desenhados e elementos da base apagados) ---------- */
  function camposTraco(b, e = {}) {
    const kind = b.kind != null ? String(b.kind) : e.kind;
    if (![...TIPOS_LINHA, ...TIPOS_AREA, ...TIPOS_TEXTO].includes(kind)) throw erro(400, 'Tipo de traço inválido.');
    const [min, max] = TIPOS_AREA.includes(kind) ? [3, 3000] : kind === 'rotulo' ? [1, 1] : [2, 3000];
    const pts = b.pts != null ? limparPts(b.pts, min, max, erro) : e.pts;
    if (!pts) throw erro(400, 'Faltam os pontos do desenho.');
    const name = b.name != null ? txt(b.name, 200).trim() : (e.name || '');
    if (kind === 'rotulo' && !name) throw erro(400, 'O texto não pode ficar vazio.');
    return { kind, name, pts, props: limparProps(kind, b.props != null ? b.props : e.props),
      revealed: b.revealed != null ? !!b.revealed : (e.revealed != null ? e.revealed : true),
      ordem: b.ordem != null && isFinite(Number(b.ordem)) ? Math.round(Number(b.ordem)) : (e.ordem != null ? e.ordem : Date.now()) };
  }
  app.get('/mapa/:cr/tracos', async (req) => {
    await mestre(req);
    return (await pool.query('select * from mapa_tracos where cronica_id = $1 order by ordem, id', [req.params.cr])).rows.map(tracoApi);
  });
  app.post('/mapa/:cr/tracos', async (req, reply) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {}, t = camposTraco(b);
    return transacao(pool, async c => {
      let id = ID_TRACO.test(String(b.id || '')) ? String(b.id) : novoId('traco');
      if ((await c.query('select 1 from mapa_tracos where cronica_id = $1 and id = $2', [cr, id])).rows[0]) id = novoId('traco');
      const { rows: [r] } = await c.query(`insert into mapa_tracos (cronica_id, id, kind, name, pts, props, revealed, ordem, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
        [cr, id, t.kind, t.name, JSON.stringify(t.pts), JSON.stringify(t.props), t.revealed, t.ordem, Date.now()]);
      await tocar(c, cr);
      reply.code(201);
      return tracoApi(r);
    });
  });
  app.put('/mapa/:cr/tracos/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr;
    return transacao(pool, async c => {
      const { rows: [e] } = await c.query('select * from mapa_tracos where cronica_id = $1 and id = $2 for update', [cr, req.params.id]);
      if (!e) throw erro(404, 'Traço não encontrado.');
      const t = camposTraco(req.body || {}, e);
      const { rows: [r] } = await c.query(`update mapa_tracos set kind=$3, name=$4, pts=$5, props=$6, revealed=$7, ordem=$8, updated_at=$9
        where cronica_id = $1 and id = $2 returning *`,
        [cr, e.id, t.kind, t.name, JSON.stringify(t.pts), JSON.stringify(t.props), t.revealed, t.ordem, Date.now()]);
      await tocar(c, cr);
      return tracoApi(r);
    });
  });
  app.delete('/mapa/:cr/tracos/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr;
    return transacao(pool, async c => {
      const { rows: [r] } = await c.query('delete from mapa_tracos where cronica_id = $1 and id = $2 returning *', [cr, req.params.id]);
      if (!r) throw erro(404, 'Traço não encontrado.');
      await tocar(c, cr);
      return { ok: true, traco: tracoApi(r) };
    });
  });
  /* elementos da cidade base apagados: { adicionar: [chaves], tirar: [chaves] } */
  app.put('/mapa/:cr/removidos', async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    const lista = v => (Array.isArray(v) ? v : []).map(String).filter(k => CHAVE_BASE.test(k));
    const mais = lista(b.adicionar), menos = new Set(lista(b.tirar));
    return transacao(pool, async c => {
      const { rows: [x] } = await c.query('select mapa_removidos from cronicas where id = $1 for update', [cr]);
      const atual = new Set((x && x.mapa_removidos) || []);
      mais.forEach(k => atual.add(k)); menos.forEach(k => atual.delete(k));
      if (atual.size > 30000) throw erro(400, 'Coisa demais apagada de uma vez.');
      const nova = [...atual];
      await c.query('update cronicas set mapa_removidos = $2 where id = $1', [cr, JSON.stringify(nova)]);
      await tocar(c, cr);
      return { removidos: nova };
    });
  });

  app.post('/mapa/:cr/districts/:id/masquerade', async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    return transacao(pool, async c => {
      const { rows: [e] } = await c.query('select * from mapa_bairros where cronica_id = $1 and id = $2 for update', [cr, req.params.id]);
      if (!e) throw erro(404, 'Bairro não encontrado.');
      const antes = e.masquerade || 0;
      let depois = b.level != null ? Number(b.level) : antes + Number(b.delta || 0);
      if (!isFinite(depois)) throw erro(400, 'Valor inválido.');
      depois = Math.max(0, Math.min(MQ_MAX, Math.round(depois)));
      const delta = depois - antes;
      if (!delta) return { district: bairroApi(e, true), event: null };
      const motivo = txt(b.reason, 2000).trim();
      const texto = (delta > 0 ? 'Quebra da Máscara +' + delta : 'Máscara restaurada ' + delta) +
        ' (' + antes + ' → ' + depois + ')' + (depois === MQ_MAX ? ' — CAÇADA' : '') + (motivo ? ': ' + motivo : '');
      const id = novoId('ev'), agora = Date.now();
      const { rows: [d] } = await c.query('update mapa_bairros set masquerade = $3, updated_at = $4 where cronica_id = $1 and id = $2 returning *',
        [cr, e.id, depois, agora]);
      await c.query(`insert into mapa_eventos (cronica_id, id, target_type, target_id, kind, session, body, visibility, delta, created_by, created_at)
        values ($1,$2,'district',$3,'masquerade',$4,$5,$6,$7,$8,$9)`,
        [cr, id, e.id, txt(b.session, 200).trim(), texto, b.visibility === 'private' ? 'private' : 'public', delta, quem(req), agora]);
      await tocar(c, cr);
      return { district: bairroApi(d, true), eventId: id };
    });
  });

  /* ---------- mestre: personagens ---------- */
  async function limparLocais(c, cr, lista) {
    if (!Array.isArray(lista)) return null;
    const { rows } = await c.query('select id from mapa_pontos where cronica_id = $1', [cr]);
    const existe = new Set(rows.map(r => r.id)), visto = new Set();
    return lista.filter(l => l && l.poiId && !visto.has(l.poiId) && existe.has(String(l.poiId)) && visto.add(l.poiId))
      .map(l => ({ poiId: String(l.poiId), relation: RELATIONS.includes(l.relation) ? l.relation : 'dominio' }));
  }
  async function gravarLocais(c, cr, npc, locais) {
    await c.query('delete from mapa_personagem_locais where cronica_id = $1 and npc_id = $2', [cr, npc]);
    for (const l of locais) {
      await c.query('insert into mapa_personagem_locais (cronica_id, npc_id, poi_id, relation) values ($1,$2,$3,$4)', [cr, npc, l.poiId, l.relation]);
    }
  }
  /* a ficha ligada ao personagem precisa ser do mestre ou estar nesta crônica */
  async function fichaValida(c, req, fichaId) {
    if (fichaId === undefined) return undefined;
    if (fichaId === null || fichaId === '') return null;
    if (!new RegExp(UUID).test(fichaId)) throw erro(400, 'ficha inválida');
    const { rows: [f] } = await c.query('select id from fichas where id = $1 and excluida_em is null and (dono_id = $2 or cronica_id = $3)',
      [fichaId, req.usuario.id, req.params.cr]);
    if (!f) throw erro(400, 'essa ficha não é sua nem desta crônica');
    return f.id;
  }
  function camposNpc(b, e = {}) {
    const pega = (k, col, padrao) => b[k] != null ? txt(b[k], 2000).trim() : (e[col] != null ? e[col] : padrao);
    const faccao = pega('faction', 'faction', 'neutral'), status = pega('status', 'status', 'ativo');
    return {
      name: pega('name', 'name', ''), clan: pega('clan', 'clan', ''), faction: FACTIONS.includes(faccao) ? faccao : 'neutral',
      role: pega('role', 'role', ''), status: STATUSES.includes(status) ? status : 'ativo',
      description: b.description != null ? txt(b.description) : (e.description || ''),
      private_note: b.privateNote != null ? txt(b.privateNote) : (e.private_note || ''),
      hidden: b.hidden != null ? !!b.hidden : !!e.hidden, revealed: b.revealed != null ? !!b.revealed : !!e.revealed
    };
  }
  app.post('/mapa/:cr/npcs', async (req, reply) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {}, f = camposNpc(b);
    if (!f.name) throw erro(400, 'O personagem precisa de um nome.');
    const r = await transacao(pool, async c => {
      const ficha = await fichaValida(c, req, b.fichaId);
      const id = novoId('npc'), agora = Date.now();
      const { rows: [n] } = await c.query(`insert into mapa_personagens (cronica_id, id, name, clan, faction, role, status, description, private_note,
          hidden, revealed, ficha_id, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) returning *`,
        [cr, id, f.name, f.clan, f.faction, f.role, f.status, f.description, f.private_note, f.hidden, f.revealed, ficha || null, agora]);
      const locais = (await limparLocais(c, cr, b.locations)) || [];
      await gravarLocais(c, cr, id, locais);
      await tocar(c, cr);
      return npcApi(n, locais, true);
    });
    reply.code(201);
    return r;
  });
  app.put('/mapa/:cr/npcs/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    return transacao(pool, async c => {
      const { rows: [e] } = await c.query('select * from mapa_personagens where cronica_id = $1 and id = $2 for update', [cr, req.params.id]);
      if (!e) throw erro(404, 'Personagem não encontrado.');
      const f = camposNpc(b, e);
      if (!f.name) throw erro(400, 'O personagem precisa de um nome.');
      const ficha = await fichaValida(c, req, b.fichaId);
      const { rows: [n] } = await c.query(`update mapa_personagens set name=$3, clan=$4, faction=$5, role=$6, status=$7, description=$8,
          private_note=$9, hidden=$10, revealed=$11, ficha_id=$12, updated_at=$13 where cronica_id = $1 and id = $2 returning *`,
        [cr, e.id, f.name, f.clan, f.faction, f.role, f.status, f.description, f.private_note, f.hidden, f.revealed,
          ficha === undefined ? e.ficha_id : ficha, Date.now()]);
      const locais = await limparLocais(c, cr, b.locations);
      if (locais) await gravarLocais(c, cr, e.id, locais);
      await tocar(c, cr);
      return npcApi(n, locais || (await locaisDe(c, cr, [e.id]))[e.id], true);
    });
  });
  app.delete('/mapa/:cr/npcs/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr;
    return transacao(pool, async c => {
      const { rowCount } = await c.query('delete from mapa_personagens where cronica_id = $1 and id = $2', [cr, req.params.id]);
      if (!rowCount) throw erro(404, 'Personagem não encontrado.');
      await c.query("delete from mapa_eventos where cronica_id = $1 and target_type = 'npc' and target_id = $2", [cr, req.params.id]);
      await tocar(c, cr);
      return { ok: true };
    });
  });

  /* ---------- mestre: diário ---------- */
  app.post('/mapa/:cr/events', async (req, reply) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    const tipo = String(b.targetType || ''), alvo = String(b.targetId || ''), texto = txt(b.body).trim();
    if (!['poi', 'district'].includes(tipo) || !alvo) throw erro(400, 'Local inválido.');
    if (!texto) throw erro(400, 'Escreva o que aconteceu.');
    const r = await transacao(pool, async c => {
      const t = tipo === 'poi' ? 'mapa_pontos' : 'mapa_bairros';
      const { rows: [x] } = await c.query(`select 1 from ${t} where cronica_id = $1 and id = $2`, [cr, alvo]);
      if (!x) throw erro(404, 'Local não encontrado.');
      const { rows: [e] } = await c.query(`insert into mapa_eventos (cronica_id, id, target_type, target_id, kind, session, body, visibility, delta, created_by, created_at)
        values ($1,$2,$3,$4,'note',$5,$6,$7,null,$8,$9) returning *`,
        [cr, novoId('ev'), tipo, alvo, txt(b.session, 200).trim(), texto, b.visibility === 'private' ? 'private' : 'public', quem(req), Date.now()]);
      await tocar(c, cr);
      return eventoApi(e);
    });
    reply.code(201);
    return r;
  });
  app.put('/mapa/:cr/events/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    return transacao(pool, async c => {
      const { rows: [e] } = await c.query('select * from mapa_eventos where cronica_id = $1 and id = $2 for update', [cr, req.params.id]);
      if (!e) throw erro(404, 'Entrada não encontrada.');
      const texto = b.body != null ? txt(b.body).trim() : e.body;
      if (!texto) throw erro(400, 'A entrada não pode ficar vazia.');
      const { rows: [x] } = await c.query('update mapa_eventos set body=$3, session=$4, visibility=$5 where cronica_id = $1 and id = $2 returning *',
        [cr, e.id, texto, b.session != null ? txt(b.session, 200).trim() : e.session,
          b.visibility != null ? (b.visibility === 'private' ? 'private' : 'public') : e.visibility]);
      await tocar(c, cr);
      return eventoApi(x);
    });
  });
  app.delete('/mapa/:cr/events/:id', async (req) => {
    await mestre(req);
    const cr = req.params.cr;
    return transacao(pool, async c => {
      const { rowCount } = await c.query('delete from mapa_eventos where cronica_id = $1 and id = $2', [cr, req.params.id]);
      if (!rowCount) throw erro(404, 'Entrada não encontrada.');
      await tocar(c, cr);
      return { ok: true };
    });
  });

  /* ---------- mestre: cenas (só do mestre, jogador não vê) ---------- */
  app.post('/mapa/:cr/scenes', async (req, reply) => {
    await mestre(req);
    const b = req.body || {}, nome = txt(b.name, 200).trim();
    if (!nome) throw erro(400, 'Nome da cena é obrigatório.');
    const { rows: [s] } = await pool.query(`insert into mapa_cenas (cronica_id, id, name, x, y, w, h, created_by, created_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [req.params.cr, novoId('scene'), nome, Number(b.x), Number(b.y), Number(b.w), Number(b.h), quem(req), Date.now()]);
    reply.code(201);
    return cenaApi(s);
  });
  app.delete('/mapa/:cr/scenes/:id', async (req) => {
    await mestre(req);
    const { rowCount } = await pool.query('delete from mapa_cenas where cronica_id = $1 and id = $2', [req.params.cr, req.params.id]);
    if (!rowCount) throw erro(404, 'Cena não encontrada.');
    return { ok: true };
  });

  /* ---------- mestre: revelar / ocultar em lote (aparece na hora para os jogadores) ---------- */
  app.post('/mapa/:cr/reveal', async (req) => {
    await mestre(req);
    const cr = req.params.cr, b = req.body || {};
    const itens = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
    if (!itens.length) throw erro(400, 'Nada para revelar.');
    const tabelas = { poi: 'mapa_pontos', district: 'mapa_bairros', npc: 'mapa_personagens' };
    const valor = !!b.revealed, agora = Date.now();
    return transacao(pool, async c => {
      let mudou = 0;
      for (const it of itens) {
        const t = it && tabelas[it.type];
        if (!t || !it.id) continue;
        mudou += (await c.query(`update ${t} set revealed = $3, updated_at = $4 where cronica_id = $1 and id = $2 and revealed <> $3`,
          [cr, String(it.id), valor, agora])).rowCount;
      }
      if (mudou) await tocar(c, cr);
      return { ok: true, changed: mudou, revealed: valor };
    });
  });
};
