/* Deixa uma conta como narrador de uma crônica (cria a crônica se ainda não existe).
   Na VPS:
     docker exec -it fichas-api node src/mestre.js APELIDO_OU_EMAIL "Belmont Noturno"
   Opcional, para consertar uma conta criada direto no banco:
     ... mestre.js Beneviento "Belmont Noturno" --email beneviento@exemplo.com --senha "uma senha forte"
   Sem --email/--senha a conta fica como está. Se a conta não existir, precisa de --email e --senha para criá-la. */
const config = require('./config')();
const { criarPool, transacao } = require('./db');
const { hashSenha, codigoConvite } = require('./seguranca');

function ler(argv) {
  const pos = [], op = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) op[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]);
  }
  return { pos, op };
}

async function main() {
  const { pos: [quem, nomeCronica], op } = ler(process.argv.slice(2));
  if (!quem || !nomeCronica) {
    console.error('uso: node src/mestre.js <apelido-ou-email> "<nome da crônica>" [--email novo@x.com] [--senha "nova senha"]');
    process.exit(2);
  }
  if (op.senha && op.senha.length < 8) { console.error('a senha precisa de pelo menos 8 caracteres'); process.exit(2); }
  if (op.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(op.email)) { console.error('--email não parece um email válido'); process.exit(2); }

  const pool = criarPool(config.bancoUrl);
  try {
    const { rows } = await pool.query(
      'select id, email, nome from usuarios where lower(email) = lower($1) or lower(nome) = lower($1)', [quem.trim()]);
    let u = rows[0];
    if (rows.length > 1) {
      console.error('mais de uma conta combina com "' + quem + '":'); rows.forEach(r => console.error('  - ' + r.email + ' (' + r.nome + ')'));
      console.error('use o email exato.'); process.exitCode = 1; return;
    }
    if (!u) {
      if (!op.email || !op.senha) { console.error('nenhuma conta com "' + quem + '". Para criar: acrescente --email e --senha.'); process.exitCode = 1; return; }
      ({ rows: [u] } = await pool.query('insert into usuarios (email, nome, senha_hash) values ($1, $2, $3) returning id, email, nome',
        [op.email.trim(), quem.trim(), await hashSenha(op.senha)]));
      console.log('Conta criada: ' + u.nome + ' <' + u.email + '>');
    } else {
      if (op.email) { await pool.query('update usuarios set email = $2 where id = $1', [u.id, op.email.trim()]); u.email = op.email.trim(); console.log('Email da conta agora é ' + u.email); }
      if (op.senha) {
        await pool.query('update usuarios set senha_hash = $2 where id = $1', [u.id, await hashSenha(op.senha)]);
        await pool.query('delete from sessoes where usuario_id = $1', [u.id]);
        console.log('Senha redefinida (sessões antigas encerradas).');
      }
    }

    const cr = await transacao(pool, async c => {
      let { rows: [x] } = await c.query('select * from cronicas where narrador_id = $1 and lower(nome) = lower($2)', [u.id, nomeCronica.trim()]);
      if (!x) {
        let cod;
        for (let i = 0; i < 5; i++) {
          cod = codigoConvite();
          if (!(await c.query('select 1 from cronicas where codigo_convite = $1', [cod])).rows[0]) break;
        }
        ({ rows: [x] } = await c.query('insert into cronicas (nome, descricao, narrador_id, codigo_convite) values ($1, $2, $3, $4) returning *',
          [nomeCronica.trim(), '', u.id, cod]));
        x.nova = true;
      }
      await c.query(`insert into cronica_membros (cronica_id, usuario_id, papel) values ($1, $2, 'narrador')
                     on conflict (cronica_id, usuario_id) do update set papel = 'narrador'`, [x.id, u.id]);
      return x;
    });
    console.log((cr.nova ? 'Crônica criada: ' : 'Crônica já existia: ') + cr.nome);
    console.log(u.nome + ' <' + u.email + '> é o narrador. Código de convite dos jogadores: ' + cr.codigo_convite);
    console.log('Entre no site com esse email (ou apelido) e abra o Mapa.');
  } finally { await pool.end(); }
}
main().catch(e => { console.error(e.message); process.exit(1); });
