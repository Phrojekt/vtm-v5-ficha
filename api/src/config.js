/* Configuração por variáveis de ambiente (ver .env.exemplo) */
function lista(v) { return String(v || '').split(',').map(s => s.trim()).filter(Boolean); }

module.exports = function config(env = process.env) {
  return {
    porta: Number(env.PORTA || 3000),
    host: env.HOST || '0.0.0.0',
    bancoUrl: env.DATABASE_URL || 'postgres://fichas:fichas@localhost:5432/fichas',
    /* sites que podem chamar a API (Vercel, localhost do servidor.js) */
    origens: lista(env.ORIGENS || 'http://localhost:4777'),
    /* endereço público do site, para montar o link de compartilhamento */
    siteUrl: (env.SITE_URL || 'http://localhost:4777').replace(/\/+$/, ''),
    diasSessao: Number(env.DIAS_SESSAO || 60),
    /* limite do JSON de uma ficha */
    maxFichaBytes: Number(env.MAX_FICHA_BYTES || 1024 * 1024),
    /* salvamentos do mesmo autor dentro desta janela viram uma versão só */
    minutosPorVersao: Number(env.MINUTOS_POR_VERSAO || 10),
    maxVersoes: Number(env.MAX_VERSOES || 100),
    permitirCadastro: env.PERMITIR_CADASTRO !== 'nao'
  };
};
