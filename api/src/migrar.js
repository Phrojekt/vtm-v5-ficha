/* Aplica as migrações de migracoes/*.sql em ordem, uma única vez cada.
   Roda sozinho na subida do servidor; também dá para chamar: npm run migrar */
const fs = require('fs');
const path = require('path');
const { criarPool, transacao } = require('./db');

const PASTA = path.join(__dirname, '..', 'migracoes');

async function migrar(pool, log = console.log) {
  await pool.query(`create table if not exists _migracoes (
    nome text primary key, aplicada_em timestamptz not null default now())`);
  /* trava para duas instâncias subindo juntas não aplicarem a mesma migração */
  const c = await pool.connect();
  try {
    await c.query('select pg_advisory_lock(727001)');
    const feitas = new Set((await c.query('select nome from _migracoes')).rows.map(r => r.nome));
    const arquivos = fs.readdirSync(PASTA).filter(f => f.endsWith('.sql')).sort();
    for (const f of arquivos) {
      if (feitas.has(f)) continue;
      const sql = fs.readFileSync(path.join(PASTA, f), 'utf8');
      await c.query('begin');
      try {
        await c.query(sql);
        await c.query('insert into _migracoes (nome) values ($1)', [f]);
        await c.query('commit');
        log('migração aplicada: ' + f);
      } catch (e) {
        await c.query('rollback');
        throw new Error('falhou a migração ' + f + ': ' + e.message);
      }
    }
  } finally {
    try { await c.query('select pg_advisory_unlock(727001)'); } catch (_) {}
    c.release();
  }
}

module.exports = { migrar };

if (require.main === module) {
  const config = require('./config')();
  const pool = criarPool(config.bancoUrl);
  migrar(pool).then(() => pool.end()).catch(e => { console.error(e.message); process.exit(1); });
}
