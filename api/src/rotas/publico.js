/* Leitura pública por link: /publico/<token>. Sem conta. Só leitura. */
module.exports = async function rotasPublico(app) {
  const { pool, erro } = app;
  app.get('/publico/:token', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: { params: { type: 'object', properties: { token: { type: 'string', maxLength: 64 } } } }
  }, async (req, reply) => {
    const { rows: [f] } = await pool.query(
      `select f.nome, f.sistema, f.dados, f.atualizado_em, u.nome as dono
         from compartilhamentos c join fichas f on f.id = c.ficha_id join usuarios u on u.id = f.dono_id
        where c.token = $1 and c.revogado_em is null and f.excluida_em is null`, [req.params.token]);
    if (!f) throw erro(404, 'link inválido ou revogado');
    reply.header('Cache-Control', 'no-store');
    /* o jogador pode ter escrito notas privadas; o link mostra a ficha como ela é,
       mas sem o estado interno da Forja */
    const dados = Object.assign({}, f.dados);
    delete dados.forja;
    return { ficha: { nome: f.nome, sistema: f.sistema, dono: f.dono, atualizado_em: f.atualizado_em, dados } };
  });
};
