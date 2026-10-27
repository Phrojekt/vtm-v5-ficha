/* Redefine a senha de um jogador (enquanto não há "esqueci minha senha" por email).
   Na VPS:  docker exec -it fichas-api node src/redefinir-senha.js email@do.jogador
   Gera uma senha provisória, mostra na tela e encerra as sessões abertas dessa conta.
   Para escolher a senha:  ... redefinir-senha.js email@do.jogador "nova senha aqui"   */
const crypto = require('crypto');
const config = require('./config')();
const { criarPool } = require('./db');
const { hashSenha } = require('./seguranca');

async function main() {
  const [email, escolhida] = process.argv.slice(2);
  if (!email) { console.error('uso: node src/redefinir-senha.js <email> [nova senha]'); process.exit(2); }
  if (escolhida && escolhida.length < 8) { console.error('a senha precisa de pelo menos 8 caracteres'); process.exit(2); }
  /* sem letras que se confundem, fácil de ditar */
  const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
  const nova = escolhida || Array.from(crypto.randomBytes(10), b => alfabeto[b % alfabeto.length]).join('');
  const pool = criarPool(config.bancoUrl);
  try {
    const { rows: [u] } = await pool.query('select id, nome from usuarios where lower(email) = lower($1)', [email.trim()]);
    if (!u) { console.error('nenhuma conta com o email ' + email); process.exitCode = 1; return; }
    await pool.query('update usuarios set senha_hash = $2 where id = $1', [u.id, await hashSenha(nova)]);
    const { rowCount } = await pool.query('delete from sessoes where usuario_id = $1', [u.id]);
    console.log(`Senha de ${u.nome} <${email}> redefinida.`);
    if (!escolhida) console.log('Senha provisória: ' + nova);
    console.log(rowCount + ' sessão(ões) encerrada(s). Peça para trocar a senha depois de entrar (Fichas → conta).');
  } finally { await pool.end(); }
}
main().catch(e => { console.error(e.message); process.exit(1); });
