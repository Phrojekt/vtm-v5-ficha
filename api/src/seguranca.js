/* Senhas com scrypt (nativo do Node, sem dependência compilada) e tokens
   aleatórios cujo hash é o que vai para o banco. */
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const N = 16384, R = 8, P = 1, TAM = 64;

async function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const h = await scrypt(senha.normalize('NFKC'), sal, TAM, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${h.toString('base64')}`;
}

async function conferirSenha(senha, guardado) {
  const partes = String(guardado || '').split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  const [, n, r, p, sal, h] = partes;
  const esperado = Buffer.from(h, 'base64');
  const obtido = await scrypt(senha.normalize('NFKC'), Buffer.from(sal, 'base64'), esperado.length,
    { N: Number(n), r: Number(r), p: Number(p) });
  return crypto.timingSafeEqual(esperado, obtido);
}

const novoToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest();

/* código de convite curto, sem letras que se confundem (0/O, 1/I/L) */
function codigoConvite() {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += alfabeto[b[i] % alfabeto.length];
  return s.slice(0, 4) + '-' + s.slice(4);
}

module.exports = { hashSenha, conferirSenha, novoToken, hashToken, codigoConvite };
