const { Pool, types } = require('pg');

/* bigint (int8) volta como número: o mapa guarda horários em milissegundos */
types.setTypeParser(20, v => Number(v));

function criarPool(url) {
  return new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30000 });
}

/* transação curta: fn recebe o client e o que ela devolver é o resultado */
async function transacao(pool, fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    try { await c.query('rollback'); } catch (_) {}
    throw e;
  } finally {
    c.release();
  }
}

module.exports = { criarPool, transacao };
