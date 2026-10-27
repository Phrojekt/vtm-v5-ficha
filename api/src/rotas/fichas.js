/* Fichas: listar, ler, salvar (com controle de versão), excluir,
   histórico de versões e links de leitura. */
const { transacao } = require('../db');
const { novoToken } = require('../seguranca');
const { diffFicha } = require('../mudancas');

const UUID = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const paramId = { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: UUID } } };

/* o que aparece na lista sem precisar baixar a ficha inteira */
function resumoDe(d) {
  const m = (d && d.meta) || {};
  const corta = (s, n) => String(s || '').slice(0, n);
  return {
    cla: corta(m.cla, 60), conceito: corta(m.conceito, 160), geracao: Number(m.geracao) || null,
    jogador: corta(m.jogador, 80), credo: corta(d && d.credo, 60), impeto: corta(d && d.impeto, 60),
    seita: corta(m.seita, 60)
  };
}
const nomeDe = d => String((d && d.meta && d.meta.nome) || '').slice(0, 120);
const sistemaDe = d => (d && d.sistema === 'cacador') ? 'cacador' : 'vampiro';

module.exports = async function rotasFichas(app) {
  const { pool, config, erro } = app;
  app.addHook('preHandler', app.autenticar);

  /* Quem pode o quê: o dono e o mestre (narrador) da crônica da ficha leem e editam.
     Excluir, compartilhar e mudar de crônica: só o dono. */
  async function acesso(c, fichaId, usuarioId, { travar = false } = {}) {
    const { rows: [f] } = await c.query(
      `select f.*, (f.dono_id = $2) as eh_dono,
              exists (select 1 from cronica_membros m
                       where m.cronica_id = f.cronica_id and m.usuario_id = $2 and m.papel = 'narrador') as eh_narrador
         from fichas f where f.id = $1 ${travar ? 'for update of f' : ''}`,
      [fichaId, usuarioId]);
    return f || null;
  }
  async function exigirLeitura(fichaId, usuarioId) {
    const f = await acesso(pool, fichaId, usuarioId);
    if (!f || (!f.eh_dono && !f.eh_narrador)) throw erro(404, 'ficha não encontrada');
    return f;
  }
  async function exigirMembro(c, cronicaId, usuarioId) {
    const { rows } = await c.query(
      'select 1 from cronica_membros where cronica_id = $1 and usuario_id = $2', [cronicaId, usuarioId]);
    if (!rows[0]) throw erro(403, 'você não participa desta crônica');
  }
  const publica = f => ({
    id: f.id, nome: f.nome, sistema: f.sistema, cronica_id: f.cronica_id, resumo: f.resumo,
    versao: f.versao, criado_em: f.criado_em, atualizado_em: f.atualizado_em, excluida_em: f.excluida_em,
    dono_id: f.dono_id
  });

  /* Grava uma nova versão da ficha (dentro de uma transação, com a linha travada).
     Salvamentos seguidos do mesmo autor reaproveitam a última versão sem rótulo. */
  async function gravarVersao(c, fichaId, versao, dados, autorId, { antes = null, nota = null } = {}) {
    const { rows: [ult] } = await c.query(
      `select versao, autor_id, rotulo, criado_em > now() - make_interval(mins => $2) as recente,
              coalesce((mudancas->>'restaurada') is not null, false) as restauracao
         from ficha_versoes where ficha_id = $1 order by versao desc limit 1`,
      [fichaId, config.minutosPorVersao]);
    /* voltar para uma versão antiga é sempre uma versão própria, e nada se junta a ela depois */
    const juntar = ult && ult.recente && !ult.rotulo && ult.autor_id === autorId && !ult.restauracao && !(nota && nota.restaurada);
    /* base da comparação: a versão anterior a esta (quando junta com a última, a de antes dela) */
    let base = antes, criada = !ult;
    if (juntar) {
      const { rows: [ant] } = await c.query(
        'select dados from ficha_versoes where ficha_id = $1 and versao < $2 order by versao desc limit 1', [fichaId, ult.versao]);
      base = ant ? ant.dados : null; criada = !ant;
    }
    const mudancas = criada ? { itens: [], mais: 0, total: 0, criada: true } : diffFicha(base, dados);
    if (nota && nota.restaurada) mudancas.restaurada = nota.restaurada;
    if (juntar) {
      await c.query('update ficha_versoes set versao = $3, dados = $4, mudancas = $5 where ficha_id = $1 and versao = $2',
        [fichaId, ult.versao, versao, dados, mudancas]);
    } else {
      await c.query('insert into ficha_versoes (ficha_id, versao, dados, autor_id, mudancas) values ($1, $2, $3, $4, $5)',
        [fichaId, versao, dados, autorId, mudancas]);
    }
    /* poda: guarda as N mais novas sem rótulo, e todas com rótulo */
    await c.query(
      `delete from ficha_versoes where ficha_id = $1 and rotulo is null and versao not in (
         select versao from ficha_versoes where ficha_id = $1 and rotulo is null order by versao desc limit $2)`,
      [fichaId, config.maxVersoes]);
  }

  /* núcleo do salvamento, usado pelo PUT e pelo "restaurar versão" */
  async function salvar(c, { id, usuarioId, dados, versaoBase, cronicaId, mudaCronica, nota }) {
    const tamanho = Buffer.byteLength(JSON.stringify(dados));
    if (tamanho > config.maxFichaBytes) throw erro(413, 'ficha grande demais');
    const f = await acesso(c, id, usuarioId, { travar: true });
    if (mudaCronica && cronicaId) await exigirMembro(c, cronicaId, usuarioId);

    if (!f) {
      const { rows: [nova] } = await c.query(
        `insert into fichas (id, dono_id, cronica_id, nome, sistema, resumo, dados)
         values ($1, $2, $3, $4, $5, $6, $7) returning *`,
        [id, usuarioId, mudaCronica ? cronicaId : null, nomeDe(dados), sistemaDe(dados), resumoDe(dados), dados]);
      await gravarVersao(c, id, 1, dados, usuarioId);
      return { ficha: nova, criada: true };
    }
    /* o dono edita; o mestre da crônica da ficha também (cada versão guarda quem mudou) */
    if (!f.eh_dono && !f.eh_narrador) throw erro(404, 'ficha não encontrada');
    if (!f.eh_dono && mudaCronica && (cronicaId || null) !== (f.cronica_id || null)) throw erro(403, 'só o dono muda a crônica da ficha');
    if (f.excluida_em) throw erro(409, 'esta ficha foi excluída', { conflito: 'excluida', atual: publica(f) });
    if (versaoBase !== f.versao) {
      throw erro(409, 'a ficha mudou em outro lugar', {
        conflito: 'versao', atual: Object.assign(publica(f), { dados: f.dados })
      });
    }
    const versao = f.versao + 1;
    const { rows: [nova] } = await c.query(
      `update fichas set dados = $2, nome = $3, sistema = $4, resumo = $5, versao = $6, atualizado_em = now(),
              cronica_id = case when $7 then $8::uuid else cronica_id end
        where id = $1 returning *`,
      [id, dados, nomeDe(dados), sistemaDe(dados), resumoDe(dados), versao, !!mudaCronica, cronicaId || null]);
    await gravarVersao(c, id, versao, dados, usuarioId, { antes: f.dados, nota });
    return { ficha: nova, criada: false };
  }

  /* lista das minhas fichas. ?desde=ISO traz também as excluídas depois dessa data
     (é o que a sincronização usa); ?dados=1 inclui o conteúdo. */
  app.get('/fichas', {
    schema: { querystring: { type: 'object', properties: {
      desde: { type: 'string', format: 'date-time' }, dados: { type: 'string' } } } }
  }, async (req) => {
    const comDados = req.query.dados === '1';
    const desde = req.query.desde || null;
    const { rows } = await pool.query(
      `select f.*, now() as agora from fichas f
        where f.dono_id = $1
          and ($2::timestamptz is null and f.excluida_em is null
               or $2::timestamptz is not null and greatest(f.atualizado_em, coalesce(f.excluida_em, f.atualizado_em)) > $2::timestamptz)
        order by f.atualizado_em desc`,
      [req.usuario.id, desde]);
    const { rows: [{ agora }] } = await pool.query('select now() as agora');
    return {
      agora, /* o cliente guarda e manda de volta como ?desde= na próxima vez */
      fichas: rows.map(f => comDados ? Object.assign(publica(f), { dados: f.dados }) : publica(f))
    };
  });

  app.get('/fichas/:id', { schema: { params: paramId } }, async (req) => {
    const f = await exigirLeitura(req.params.id, req.usuario.id);
    const { rows: [d] } = await pool.query('select nome from usuarios where id = $1', [f.dono_id]);
    return { ficha: Object.assign(publica(f), { dados: f.dados, dono: d ? d.nome : '' }), permissao: f.eh_dono ? 'dono' : 'narrador' };
  });

  /* Salvar. versao_base = a versão que o navegador tinha quando começou a editar
     (null para ficha nova). Se o servidor estiver em outra, devolve 409 com a atual. */
  app.put('/fichas/:id', {
    schema: {
      params: paramId,
      body: { type: 'object', required: ['dados'], properties: {
        dados: { type: 'object' },
        versao_base: { type: ['integer', 'null'] },
        cronica_id: { anyOf: [{ type: 'string', pattern: UUID }, { type: 'null' }] }
      } }
    }
  }, async (req, reply) => {
    const r = await transacao(pool, c => salvar(c, {
      id: req.params.id.toLowerCase(), usuarioId: req.usuario.id, dados: req.body.dados,
      versaoBase: req.body.versao_base == null ? null : req.body.versao_base,
      cronicaId: req.body.cronica_id || null, mudaCronica: 'cronica_id' in req.body
    }));
    if (r.criada) reply.code(201);
    return { ficha: publica(r.ficha) };
  });

  app.delete('/fichas/:id', { schema: { params: paramId } }, async (req) => {
    return transacao(pool, async c => {
      const f = await acesso(c, req.params.id, req.usuario.id, { travar: true });
      if (!f || !f.eh_dono) throw erro(404, 'ficha não encontrada');
      if (f.excluida_em) return { ficha: publica(f) };
      const { rows: [x] } = await c.query(
        `update fichas set excluida_em = now(), versao = versao + 1, atualizado_em = now() where id = $1 returning *`, [f.id]);
      await c.query('update compartilhamentos set revogado_em = now() where ficha_id = $1 and revogado_em is null', [f.id]);
      return { ficha: publica(x) };
    });
  });

  app.post('/fichas/:id/restaurar', { schema: { params: paramId } }, async (req) => {
    const { rows: [x] } = await pool.query(
      `update fichas set excluida_em = null, versao = versao + 1, atualizado_em = now()
        where id = $1 and dono_id = $2 returning *`, [req.params.id, req.usuario.id]);
    if (!x) throw erro(404, 'ficha não encontrada');
    return { ficha: publica(x) };
  });

  /* ---------- histórico ---------- */
  app.get('/fichas/:id/versoes', { schema: { params: paramId } }, async (req) => {
    await exigirLeitura(req.params.id, req.usuario.id);
    await preencherMudancas(req.params.id);
    const { rows } = await pool.query(
      `select v.versao, v.rotulo, v.criado_em, u.nome as autor, v.autor_id, v.mudancas,
              v.dados->'meta'->>'nome' as nome, (v.dados->>'xpTotal')::text as xp_total
         from ficha_versoes v left join usuarios u on u.id = v.autor_id
        where v.ficha_id = $1 order by v.versao desc`, [req.params.id]);
    return { versoes: rows };
  });

  /* versões gravadas antes do histórico legível: calcula uma vez e guarda */
  async function preencherMudancas(fichaId) {
    const { rows: faltam } = await pool.query(
      'select versao from ficha_versoes where ficha_id = $1 and mudancas is null order by versao desc limit 40', [fichaId]);
    if (!faltam.length) return;
    const ate = faltam[0].versao, desde = faltam[faltam.length - 1].versao;
    const { rows } = await pool.query(
      `select versao, dados from ficha_versoes where ficha_id = $1 and versao <= $2 and versao >= coalesce(
         (select max(versao) from ficha_versoes where ficha_id = $1 and versao < $3), $3)
        order by versao`, [fichaId, ate, desde]);
    const precisa = new Set(faltam.map(x => x.versao));
    /* rows[0] é a versão logo antes da janela (se existir); sem ela, a primeira da janela é a criação */
    for (let i = 0; i < rows.length; i++) {
      if (!precisa.has(rows[i].versao)) continue;
      const m = i === 0 ? { itens: [], mais: 0, total: 0, criada: true } : diffFicha(rows[i - 1].dados, rows[i].dados);
      await pool.query('update ficha_versoes set mudancas = $3 where ficha_id = $1 and versao = $2 and mudancas is null',
        [fichaId, rows[i].versao, m]);
    }
  }

  app.get('/fichas/:id/versoes/:versao', {
    schema: { params: { type: 'object', properties: { id: { type: 'string', pattern: UUID }, versao: { type: 'integer' } } } }
  }, async (req) => {
    await exigirLeitura(req.params.id, req.usuario.id);
    const { rows: [v] } = await pool.query(
      'select versao, rotulo, criado_em, dados from ficha_versoes where ficha_id = $1 and versao = $2',
      [req.params.id, req.params.versao]);
    if (!v) throw erro(404, 'versão não encontrada');
    return { versao: v };
  });

  /* marca a versão atual com um rótulo ("antes de gastar XP"): nunca é podada */
  app.post('/fichas/:id/versoes', {
    schema: { params: paramId, body: { type: 'object', required: ['rotulo'],
      properties: { rotulo: { type: 'string', minLength: 1, maxLength: 80 } } } }
  }, async (req) => {
    return transacao(pool, async c => {
      const f = await acesso(c, req.params.id, req.usuario.id, { travar: true });
      if (!f || !f.eh_dono) throw erro(404, 'ficha não encontrada');
      await c.query(
        `insert into ficha_versoes (ficha_id, versao, dados, autor_id, rotulo) values ($1, $2, $3, $4, $5)
         on conflict (ficha_id, versao) do update set rotulo = excluded.rotulo`,
        [f.id, f.versao, f.dados, req.usuario.id, req.body.rotulo.trim()]);
      return { ok: true, versao: f.versao };
    });
  });

  /* volta a ficha para uma versão antiga, criando uma versão nova (nada se perde) */
  app.post('/fichas/:id/versoes/:versao/restaurar', {
    schema: { params: { type: 'object', properties: { id: { type: 'string', pattern: UUID }, versao: { type: 'integer' } } } }
  }, async (req) => {
    return transacao(pool, async c => {
      const f = await acesso(c, req.params.id, req.usuario.id, { travar: true });
      if (!f || (!f.eh_dono && !f.eh_narrador)) throw erro(404, 'ficha não encontrada');
      const { rows: [v] } = await c.query(
        'select dados from ficha_versoes where ficha_id = $1 and versao = $2', [f.id, req.params.versao]);
      if (!v) throw erro(404, 'versão não encontrada');
      if (f.excluida_em) await c.query('update fichas set excluida_em = null where id = $1', [f.id]);
      const r = await salvar(c, { id: f.id, usuarioId: req.usuario.id, dados: v.dados, versaoBase: f.versao, nota: { restaurada: req.params.versao } });
      return { ficha: Object.assign(publica(r.ficha), { dados: r.ficha.dados }) };
    });
  });

  /* Entregar a ficha a um jogador: o mestre monta e passa a ficha. Quem recebe
     precisa estar na crônica; a ficha entra nela, então o mestre continua editando. */
  app.post('/fichas/:id/transferir', {
    schema: { params: paramId, body: { type: 'object', required: ['usuario_id', 'cronica_id'], properties: {
      usuario_id: { type: 'string', pattern: UUID }, cronica_id: { type: 'string', pattern: UUID } } } }
  }, async (req) => {
    return transacao(pool, async c => {
      const f = await acesso(c, req.params.id, req.usuario.id, { travar: true });
      if (!f || !f.eh_dono) throw erro(404, 'ficha não encontrada');
      if (f.excluida_em) throw erro(409, 'esta ficha foi excluída');
      const { rows: [eu] } = await c.query(
        "select 1 from cronica_membros where cronica_id = $1 and usuario_id = $2 and papel = 'narrador'", [req.body.cronica_id, req.usuario.id]);
      if (!eu) throw erro(403, 'só o mestre da crônica entrega fichas');
      const { rows: [alvo] } = await c.query(
        `select u.id, u.nome from cronica_membros m join usuarios u on u.id = m.usuario_id
          where m.cronica_id = $1 and m.usuario_id = $2`, [req.body.cronica_id, req.body.usuario_id]);
      if (!alvo) throw erro(400, 'essa pessoa não está na crônica');
      const { rows: [x] } = await c.query(
        `update fichas set dono_id = $2, cronica_id = $3, versao = versao + 1, atualizado_em = now() where id = $1 returning *`,
        [f.id, alvo.id, req.body.cronica_id]);
      await gravarVersao(c, f.id, x.versao, x.dados, req.usuario.id);
      return { ficha: publica(x), para: alvo.nome };
    });
  });

  /* ---------- links de leitura ---------- */
  const url = token => config.siteUrl + '/?ver=' + token;

  app.get('/fichas/:id/links', { schema: { params: paramId } }, async (req) => {
    const f = await exigirLeitura(req.params.id, req.usuario.id);
    if (!f.eh_dono) throw erro(403, 'só o dono compartilha a ficha');
    const { rows } = await pool.query(
      `select token, criado_em from compartilhamentos
        where ficha_id = $1 and revogado_em is null order by criado_em desc`, [f.id]);
    return { links: rows.map(r => ({ token: r.token, url: url(r.token), criado_em: r.criado_em })) };
  });

  app.post('/fichas/:id/links', { schema: { params: paramId } }, async (req, reply) => {
    const f = await exigirLeitura(req.params.id, req.usuario.id);
    if (!f.eh_dono) throw erro(403, 'só o dono compartilha a ficha');
    if (f.excluida_em) throw erro(409, 'esta ficha foi excluída');
    const token = novoToken(18);
    await pool.query('insert into compartilhamentos (token, ficha_id, criado_por) values ($1, $2, $3)',
      [token, f.id, req.usuario.id]);
    reply.code(201);
    return { token, url: url(token) };
  });

  app.delete('/fichas/:id/links/:token', {
    schema: { params: { type: 'object', properties: { id: { type: 'string', pattern: UUID }, token: { type: 'string', maxLength: 64 } } } }
  }, async (req) => {
    const { rowCount } = await pool.query(
      `update compartilhamentos c set revogado_em = now() from fichas f
        where c.token = $1 and c.ficha_id = $2 and f.id = c.ficha_id and f.dono_id = $3 and c.revogado_em is null`,
      [req.params.token, req.params.id, req.usuario.id]);
    if (!rowCount) throw erro(404, 'link não encontrado');
    return { ok: true };
  });
};

module.exports.resumoDe = resumoDe;
