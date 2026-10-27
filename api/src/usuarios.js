/* Lista as contas e quantas fichas cada uma tem.
   Na VPS:  docker exec -it fichas-api node src/usuarios.js */
const config = require('./config')();
const { criarPool } = require('./db');
(async () => {
  const pool = criarPool(config.bancoUrl);
  const { rows } = await pool.query(
    `select u.email, u.nome, to_char(u.criado_em, 'DD/MM/YYYY') as desde,
            count(f.id) filter (where f.excluida_em is null)::int as fichas,
            max(s.usado_em) as ultimo_acesso
       from usuarios u left join fichas f on f.dono_id = u.id left join sessoes s on s.usuario_id = u.id
      group by u.id order by u.criado_em`);
  console.table(rows.map(r => ({ ...r, ultimo_acesso: r.ultimo_acesso ? new Date(r.ultimo_acesso).toLocaleString('pt-BR') : '—' })));
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
