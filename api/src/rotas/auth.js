/* Contas: cadastro, entrar, sair, perfil e troca de senha */
const { hashSenha, conferirSenha, novoToken, hashToken } = require('../seguranca');

const EMAIL = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';

module.exports = async function rotasAuth(app) {
  const { pool, config, erro } = app;

  async function abrirSessao(usuarioId) {
    const token = novoToken();
    await pool.query(
      `insert into sessoes (token_hash, usuario_id, expira_em)
       values ($1, $2, now() + make_interval(days => $3))`,
      [hashToken(token), usuarioId, config.diasSessao]);
    return token;
  }

  /* login e cadastro têm limite próprio, bem menor que o global */
  const limiteConta = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

  app.post('/auth/cadastro', {
    ...limiteConta,
    schema: { body: {
      type: 'object', required: ['email', 'senha'], additionalProperties: false,
      properties: {
        email: { type: 'string', maxLength: 254, pattern: EMAIL },
        senha: { type: 'string', minLength: 8, maxLength: 200 },
        nome: { type: 'string', maxLength: 80 }
      } } }
  }, async (req, reply) => {
    if (!config.permitirCadastro) throw erro(403, 'cadastro fechado; peça um convite');
    const email = req.body.email.trim();
    const nome = (req.body.nome || '').trim() || email.split('@')[0];
    const senhaHash = await hashSenha(req.body.senha);
    let u;
    try {
      ({ rows: [u] } = await pool.query(
        'insert into usuarios (email, nome, senha_hash) values ($1, $2, $3) returning id, email, nome',
        [email, nome, senhaHash]));
    } catch (e) {
      if (e.code === '23505') throw erro(409, 'já existe uma conta com este email');
      throw e;
    }
    const token = await abrirSessao(u.id);
    reply.code(201);
    return { token, usuario: u };
  });

  app.post('/auth/entrar', {
    ...limiteConta,
    schema: { body: {
      type: 'object', required: ['email', 'senha'],
      properties: { email: { type: 'string', maxLength: 254 }, senha: { type: 'string', maxLength: 200 } } } }
  }, async (req) => {
    /* entra com o email; se não houver, aceita o apelido, desde que só uma conta o use */
    const alvo = req.body.email.trim();
    let { rows: [u] } = await pool.query(
      'select id, email, nome, senha_hash from usuarios where lower(email) = lower($1)', [alvo]);
    if (!u) {
      const { rows: porNome } = await pool.query(
        'select id, email, nome, senha_hash from usuarios where lower(nome) = lower($1) limit 2', [alvo]);
      if (porNome.length === 1) u = porNome[0];
    }
    /* mesma resposta para email inexistente e senha errada */
    const ok = u ? await conferirSenha(req.body.senha, u.senha_hash) : (await hashSenha('x'), false);
    if (!ok) throw erro(401, 'email ou senha incorretos');
    const token = await abrirSessao(u.id);
    return { token, usuario: { id: u.id, email: u.email, nome: u.nome } };
  });

  app.post('/auth/sair', { preHandler: app.autenticar }, async (req) => {
    const m = req.headers.authorization.match(/^Bearer\s+(\S+)$/i);
    await pool.query('delete from sessoes where token_hash = $1', [hashToken(m[1])]);
    return { ok: true };
  });

  app.get('/eu', { preHandler: app.autenticar }, async (req) => {
    const { rows: cronicas } = await pool.query(
      `select c.id, c.nome, m.papel from cronica_membros m join cronicas c on c.id = m.cronica_id
        where m.usuario_id = $1 order by c.nome`, [req.usuario.id]);
    return { usuario: req.usuario, cronicas };
  });

  app.patch('/eu', {
    preHandler: app.autenticar,
    schema: { body: { type: 'object', additionalProperties: false,
      properties: { nome: { type: 'string', minLength: 1, maxLength: 80 } } } }
  }, async (req) => {
    const { rows: [u] } = await pool.query(
      'update usuarios set nome = coalesce($2, nome) where id = $1 returning id, email, nome',
      [req.usuario.id, req.body.nome ? req.body.nome.trim() : null]);
    return { usuario: u };
  });

  app.put('/eu/senha', {
    preHandler: app.autenticar,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', required: ['atual', 'nova'],
      properties: { atual: { type: 'string', maxLength: 200 }, nova: { type: 'string', minLength: 8, maxLength: 200 } } } }
  }, async (req) => {
    const { rows: [u] } = await pool.query('select senha_hash from usuarios where id = $1', [req.usuario.id]);
    if (!(await conferirSenha(req.body.atual, u.senha_hash))) throw erro(403, 'senha atual incorreta');
    await pool.query('update usuarios set senha_hash = $2 where id = $1', [req.usuario.id, await hashSenha(req.body.nova)]);
    /* derruba as outras sessões; a atual continua */
    const m = req.headers.authorization.match(/^Bearer\s+(\S+)$/i);
    await pool.query('delete from sessoes where usuario_id = $1 and token_hash <> $2', [req.usuario.id, hashToken(m[1])]);
    return { ok: true };
  });
};
