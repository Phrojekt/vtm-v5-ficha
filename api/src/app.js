/* Monta a aplicação Fastify. Separado do servidor.js para os testes
   chamarem a API com app.inject(), sem abrir porta. */
const Fastify = require('fastify');
const { hashToken } = require('./seguranca');

class ErroApi extends Error {
  constructor(status, mensagem, extra) { super(mensagem); this.status = status; this.extra = extra; }
}
const erro = (status, mensagem, extra) => new ErroApi(status, mensagem, extra);

/* o Fastify descreve erros de validação em inglês; para o jogador, em português */
const CAMPOS = { email: 'o email', senha: 'a senha', nova: 'a senha nova', atual: 'a senha atual', nome: 'o nome',
                 codigo: 'o código', rotulo: 'o nome da versão', dados: 'a ficha', id: 'o identificador' };
function mensagemValidacao(v) {
  const campo = String(v.instancePath || '').split('/').pop() || (v.params && v.params.missingProperty) || '';
  const nome = CAMPOS[campo] || campo || 'um campo';
  if (v.keyword === 'required') return 'preencha ' + (CAMPOS[v.params.missingProperty] || v.params.missingProperty);
  if (v.keyword === 'minLength') return campo === 'senha' || campo === 'nova'
    ? nome + ' precisa de pelo menos ' + v.params.limit + ' caracteres' : 'preencha ' + nome;
  if (v.keyword === 'maxLength') return nome + ' passou do tamanho máximo (' + v.params.limit + ')';
  if (v.keyword === 'pattern' && campo === 'email') return 'esse email não parece válido';
  return 'confira ' + nome;
}

function criarApp({ pool, config, logger = false }) {
  const app = Fastify({
    logger,
    bodyLimit: config.maxFichaBytes + 64 * 1024,
    trustProxy: true /* atrás do proxy reverso da VPS: o IP real vem no X-Forwarded-For */
  });

  app.decorate('pool', pool);
  app.decorate('config', config);
  app.decorate('erro', erro);

  app.register(require('@fastify/cors'), {
    origin: (origem, cb) => {
      /* sem Origin = chamada que não é de navegador (curl, testes) */
      if (!origem || config.origens.includes(origem) || config.origens.includes('*')) return cb(null, true);
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
  });
  /* a geometria da cidade tem ~570 KB: comprimida, cai para uma fração */
  app.register(require('@fastify/compress'), { global: true, threshold: 2048 });
  app.register(require('@fastify/rate-limit'), {
    global: true, max: 300, timeWindow: '1 minute'
  });

  app.setErrorHandler((e, req, reply) => {
    if (e instanceof ErroApi) return reply.code(e.status).send(Object.assign({ erro: e.message }, e.extra || {}));
    if (e.validation) return reply.code(400).send({ erro: mensagemValidacao(e.validation[0] || {}) });
    if (e.statusCode === 429) return reply.code(429).send({ erro: 'muitas tentativas; espere um pouco' });
    if (e.statusCode && e.statusCode < 500) return reply.code(e.statusCode).send({ erro: e.message });
    req.log.error(e);
    reply.code(500).send({ erro: 'erro interno' });
  });

  /* Autenticação: "Authorization: Bearer <token>". Popula req.usuario. */
  app.decorateRequest('usuario', null);
  app.decorate('autenticar', async (req) => {
    const h = req.headers.authorization || '';
    const m = h.match(/^Bearer\s+(\S+)$/i);
    if (!m) throw erro(401, 'é preciso entrar na conta');
    const { rows } = await pool.query(
      `update sessoes s set usado_em = now(),
              expira_em = greatest(expira_em, now() + make_interval(days => $2))
         from usuarios u
        where s.token_hash = $1 and s.expira_em > now() and u.id = s.usuario_id
        returning u.id, u.email, u.nome`,
      [hashToken(m[1]), config.diasSessao]);
    if (!rows[0]) throw erro(401, 'sessão expirada; entre de novo');
    req.usuario = rows[0];
  });

  app.get('/saude', async () => {
    await pool.query('select 1');
    return { ok: true };
  });

  app.register(require('./rotas/auth'));
  app.register(require('./rotas/fichas'));
  app.register(require('./rotas/cronicas'));
  app.register(require('./rotas/publico'));
  app.register(require('./rotas/mapa'));

  return app;
}

module.exports = { criarApp, erro, ErroApi };
