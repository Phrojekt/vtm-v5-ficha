/* Ponto de entrada: migra o banco e sobe a API */
const config = require('./config')();
const { criarPool } = require('./db');
const { migrar } = require('./migrar');
const { criarApp } = require('./app');

async function main() {
  const pool = criarPool(config.bancoUrl);
  /* o Postgres pode subir depois da API no docker compose: tenta por ~1 min */
  for (let i = 1; ; i++) {
    try { await pool.query('select 1'); break; }
    catch (e) {
      if (i >= 30) throw e;
      console.log('esperando o banco… (' + e.message + ')');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  await migrar(pool);
  const app = criarApp({ pool, config, logger: { level: process.env.LOG || 'info' } });
  /* limpa sessões vencidas uma vez por dia */
  setInterval(() => pool.query('delete from sessoes where expira_em < now()').catch(() => {}), 24 * 3600 * 1000).unref();
  const parar = async () => { await app.close(); await pool.end(); process.exit(0); };
  process.on('SIGTERM', parar);
  process.on('SIGINT', parar);
  await app.listen({ port: config.porta, host: config.host });
}

main().catch(e => { console.error(e); process.exit(1); });
