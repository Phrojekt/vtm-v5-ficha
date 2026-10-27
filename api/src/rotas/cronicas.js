/* Crônicas: o narrador cria, convida com um código, e vê as fichas do grupo */
const { transacao } = require('../db');
const { codigoConvite } = require('../seguranca');

const UUID = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const paramId = { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: UUID } } };

module.exports = async function rotasCronicas(app) {
  const { pool, erro } = app;
  app.addHook('preHandler', app.autenticar);

  async function papel(cronicaId, usuarioId) {
    const { rows: [m] } = await pool.query(
      'select papel from cronica_membros where cronica_id = $1 and usuario_id = $2', [cronicaId, usuarioId]);
    return m ? m.papel : null;
  }
  async function exigirNarrador(id, usuarioId) {
    const p = await papel(id, usuarioId);
    if (!p) throw erro(404, 'crônica não encontrada');
    if (p !== 'narrador') throw erro(403, 'só o narrador pode fazer isso');
  }

  /* código único: tenta de novo na colisão (raríssima) */
  async function novoCodigo(c) {
    for (let i = 0; i < 5; i++) {
      const cod = codigoConvite();
      const { rows } = await c.query('select 1 from cronicas where codigo_convite = $1', [cod]);
      if (!rows[0]) return cod;
    }
    throw erro(500, 'não consegui gerar um código de convite');
  }

  app.get('/cronicas', async (req) => {
    const { rows } = await pool.query(
      `select c.id, c.nome, c.descricao, m.papel, n.nome as narrador,
              (select count(*) from cronica_membros x where x.cronica_id = c.id)::int as membros,
              (select count(*) from fichas f where f.cronica_id = c.id and f.excluida_em is null)::int as fichas
         from cronica_membros m join cronicas c on c.id = m.cronica_id join usuarios n on n.id = c.narrador_id
        where m.usuario_id = $1 order by c.nome`, [req.usuario.id]);
    return { cronicas: rows };
  });

  app.post('/cronicas', {
    schema: { body: { type: 'object', required: ['nome'], additionalProperties: false, properties: {
      nome: { type: 'string', minLength: 1, maxLength: 120 }, descricao: { type: 'string', maxLength: 2000 } } } }
  }, async (req, reply) => {
    const c = await transacao(pool, async c => {
      const { rows: [cr] } = await c.query(
        `insert into cronicas (nome, descricao, narrador_id, codigo_convite) values ($1, $2, $3, $4) returning *`,
        [req.body.nome.trim(), (req.body.descricao || '').trim(), req.usuario.id, await novoCodigo(c)]);
      await c.query(`insert into cronica_membros (cronica_id, usuario_id, papel) values ($1, $2, 'narrador')`,
        [cr.id, req.usuario.id]);
      return cr;
    });
    reply.code(201);
    return { cronica: c };
  });

  /* detalhes: membros e fichas. O código de convite só o narrador vê. */
  app.get('/cronicas/:id', { schema: { params: paramId } }, async (req) => {
    const p = await papel(req.params.id, req.usuario.id);
    if (!p) throw erro(404, 'crônica não encontrada');
    const { rows: [c] } = await pool.query('select * from cronicas where id = $1', [req.params.id]);
    const { rows: membros } = await pool.query(
      `select u.id, u.nome, m.papel, m.entrou_em from cronica_membros m join usuarios u on u.id = m.usuario_id
        where m.cronica_id = $1 order by m.papel desc, u.nome`, [c.id]);
    /* o jogador não vê as fichas que o mestre guarda na crônica (NPCs, fichas a entregar) */
    const { rows: fichas } = await pool.query(
      `select f.id, f.nome, f.sistema, f.resumo, f.versao, f.atualizado_em, f.dono_id, u.nome as dono
         from fichas f join usuarios u on u.id = f.dono_id
        where f.cronica_id = $1 and f.excluida_em is null and ($2 = 'narrador' or f.dono_id <> $3)
        order by u.nome, f.nome`, [c.id, p, c.narrador_id]);
    return {
      cronica: { id: c.id, nome: c.nome, descricao: c.descricao, narrador_id: c.narrador_id, criado_em: c.criado_em,
                 mapa_ativo: c.mapa_ativo,
                 codigo_convite: p === 'narrador' ? c.codigo_convite : undefined },
      papel: p, membros, fichas
    };
  });

  /* Painel do narrador: quem está por aí, as fichas do grupo (com o conteúdo, para o
     navegador calcular XP e pendências) e o que mudou por último. Só o narrador vê. */
  app.get('/cronicas/:id/painel', { schema: { params: paramId } }, async (req) => {
    await exigirNarrador(req.params.id, req.usuario.id);
    const { rows: [c] } = await pool.query('select id, nome, codigo_convite, narrador_id, mapa_ativo from cronicas where id = $1', [req.params.id]);
    const { rows: membros } = await pool.query(
      `select u.id, u.nome, m.papel, m.entrou_em,
              (select max(s.usado_em) from sessoes s where s.usuario_id = u.id) as ultimo_acesso,
              coalesce((select max(s.usado_em) from sessoes s where s.usuario_id = u.id) > now() - interval '10 minutes', false) as ativo
         from cronica_membros m join usuarios u on u.id = m.usuario_id
        where m.cronica_id = $1 order by m.papel desc, u.nome`, [c.id]);
    const { rows: fichas } = await pool.query(
      `select f.id, f.nome, f.sistema, f.resumo, f.versao, f.atualizado_em, f.dono_id, u.nome as dono, f.dados,
              (select a.nome from ficha_versoes v join usuarios a on a.id = v.autor_id
                where v.ficha_id = f.id order by v.versao desc limit 1) as ultimo_autor
         from fichas f join usuarios u on u.id = f.dono_id
        where f.cronica_id = $1 and f.excluida_em is null
        order by (f.dono_id = $2), u.nome, f.nome`, [c.id, c.narrador_id]);
    const { rows: atividade } = await pool.query(
      `select v.ficha_id, f.nome as ficha, d.nome as dono, f.dono_id, v.versao, v.criado_em, v.rotulo, v.mudancas,
              a.nome as autor, v.autor_id
         from ficha_versoes v join fichas f on f.id = v.ficha_id
         join usuarios d on d.id = f.dono_id left join usuarios a on a.id = v.autor_id
        where f.cronica_id = $1 and f.excluida_em is null
        order by v.criado_em desc limit 40`, [c.id]);
    return { cronica: c, membros, fichas, atividade, agora: new Date().toISOString() };
  });

  app.patch('/cronicas/:id', {
    schema: { params: paramId, body: { type: 'object', additionalProperties: false, properties: {
      nome: { type: 'string', minLength: 1, maxLength: 120 }, descricao: { type: 'string', maxLength: 2000 } } } }
  }, async (req) => {
    await exigirNarrador(req.params.id, req.usuario.id);
    const { rows: [c] } = await pool.query(
      `update cronicas set nome = coalesce($2, nome), descricao = coalesce($3, descricao) where id = $1
       returning id, nome, descricao`,
      [req.params.id, req.body.nome ? req.body.nome.trim() : null, req.body.descricao != null ? req.body.descricao.trim() : null]);
    return { cronica: c };
  });

  /* novo código: o antigo deixa de funcionar */
  app.post('/cronicas/:id/convite', { schema: { params: paramId } }, async (req) => {
    await exigirNarrador(req.params.id, req.usuario.id);
    const codigo = await transacao(pool, async c => {
      const cod = await novoCodigo(c);
      await c.query('update cronicas set codigo_convite = $2 where id = $1', [req.params.id, cod]);
      return cod;
    });
    return { codigo_convite: codigo };
  });

  app.post('/cronicas/entrar', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', required: ['codigo'], properties: { codigo: { type: 'string', maxLength: 20 } } } }
  }, async (req) => {
    const cod = req.body.codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.{4})$/, '$1-$2');
    const { rows: [c] } = await pool.query('select id, nome from cronicas where codigo_convite = $1', [cod]);
    if (!c) throw erro(404, 'código de convite inválido');
    await pool.query(
      `insert into cronica_membros (cronica_id, usuario_id, papel) values ($1, $2, 'jogador')
       on conflict do nothing`, [c.id, req.usuario.id]);
    return { cronica: c };
  });

  /* o narrador tira alguém, ou o próprio jogador sai. As fichas dele saem da crônica. */
  app.delete('/cronicas/:id/membros/:usuario', {
    schema: { params: { type: 'object', properties: {
      id: { type: 'string', pattern: UUID }, usuario: { type: 'string', pattern: UUID } } } }
  }, async (req) => {
    const meu = await papel(req.params.id, req.usuario.id);
    if (!meu) throw erro(404, 'crônica não encontrada');
    const alvo = req.params.usuario;
    if (alvo !== req.usuario.id && meu !== 'narrador') throw erro(403, 'só o narrador remove jogadores');
    if ((await papel(req.params.id, alvo)) === 'narrador') throw erro(400, 'o narrador não sai da própria crônica; exclua a crônica');
    await transacao(pool, async c => {
      await c.query('delete from cronica_membros where cronica_id = $1 and usuario_id = $2', [req.params.id, alvo]);
      await c.query('update fichas set cronica_id = null where cronica_id = $1 and dono_id = $2', [req.params.id, alvo]);
    });
    return { ok: true };
  });

  app.delete('/cronicas/:id', { schema: { params: paramId } }, async (req) => {
    await exigirNarrador(req.params.id, req.usuario.id);
    await pool.query('delete from cronicas where id = $1', [req.params.id]);
    return { ok: true };
  });
};
