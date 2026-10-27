/* Gera a versão standalone (ficha.html) a partir de src/pagina.html.
   src/pagina.html é a versão publicável como Artifact — sem <html>/<head>/<body>,
   porque a plataforma adiciona esse invólucro. Localmente precisamos dele. */
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const pagina = fs.readFileSync(path.join(raiz, 'src', 'pagina.html'), 'utf8');

const corte = pagina.indexOf('</style>') + '</style>'.length;
if (corte < 10) throw new Error('não encontrei o bloco <style> em src/pagina.html');

const cabeca = pagina.slice(0, corte).trim();
const corpo = pagina.slice(corte).replace(/<script src="[^"]+"><\/script>\s*/g, '').trim();

const FONTES = ['disciplinas.js', 'disciplinas-sistema.js', 'vantagens.js', 'loresheets.js', 'dados.js',
                'dados-extra.js', 'contexto.js', 'cacador.js',
                'pdf-lib.min.js', 'modelo-pdf.js', 'pdfjs.min.js', 'pdfjs.worker.min.js',
                'pdf-ficha.js', 'nuvem.js', 'app.js', 'experiencia.js', 'interface.js', 'importar.js'];

const molde = (miolo) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${cabeca}
</head>
<body>
${corpo}
${miolo}
</body>
</html>
`;

/* O modelo do PDF (1,7 MB) e a pdf-lib (0,5 MB) são carregados só quando alguém exporta,
   imprime no modelo ou importa um PDF (garantirPdf, em app.js). Ficam fora da página
   publicada e do ficha.html; o arquivo único continua com tudo embutido. */
/* o pdf.js (1,4 MB) lê fichas de outros lugares na importação: também só sob demanda */
const SOB_DEMANDA = ['pdf-lib.min.js', 'modelo-pdf.js', 'pdfjs.min.js', 'pdfjs.worker.min.js'];
const NA_PAGINA = FONTES.filter(f => !SOB_DEMANDA.includes(f));
const crypto = require('crypto');

/* 1. versão do servidor local e do Artifact: scripts em arquivos separados */
const html = molde(NA_PAGINA.map(f => `<script src="${f}"></script>`).join('\n'));
fs.writeFileSync(path.join(raiz, 'ficha.html'), html, 'utf8');
for (const f of FONTES) fs.copyFileSync(path.join(raiz, 'src', f), path.join(raiz, f));

/* 2. versão de um arquivo só, para mandar para alguém: abre com dois cliques,
      sem servidor. "</script" dentro do código fecharia a tag cedo demais. */
const embutir = lista => lista.map(f => {
  const js = fs.readFileSync(path.join(raiz, 'src', f), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ${f} */\n${js}\n</script>`;
}).join('\n');
const unico = molde(embutir(FONTES));
fs.writeFileSync(path.join(raiz, 'ficha-de-sangue.html'), unico, 'utf8');

const kb = t => (t.length / 1024).toFixed(1) + ' KB';
console.log('ficha.html (' + kb(html) + ') + ' + FONTES.length + ' scripts');
console.log('ficha-de-sangue.html (' + kb(unico) + ') — arquivo único, para enviar');

/* 3. pasta pronta para arrastar num serviço de hospedagem (exigem index.html).
      A página leva o app embutido, mas não o PDF: ele fica em deploy/pdf/, com a versão
      no endereço (?v=), para o navegador guardar e só baixar de novo quando mudar. */
fs.mkdirSync(path.join(raiz, 'deploy', 'pdf'), { recursive: true });
const versaoArq = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(raiz, 'src', f))).digest('hex').slice(0, 10);
for (const f of SOB_DEMANDA) fs.copyFileSync(path.join(raiz, 'src', f), path.join(raiz, 'deploy', 'pdf', f));
const fsPdf = `<script>window.FS_PDF = { lib: 'pdf/pdf-lib.min.js?v=${versaoArq('pdf-lib.min.js')}', modelo: 'pdf/modelo-pdf.js?v=${versaoArq('modelo-pdf.js')}', pdfjs: 'pdf/pdfjs.min.js?v=${versaoArq('pdfjs.min.js')}', pdfjsWorker: 'pdf/pdfjs.worker.min.js?v=${versaoArq('pdfjs.worker.min.js')}' };</script>`;
const publicada = molde(fsPdf + '\n' + embutir(NA_PAGINA));
fs.writeFileSync(path.join(raiz, 'deploy', 'index.html'), publicada, 'utf8');
console.log('deploy/index.html (' + kb(publicada) + ', antes ' + kb(unico) + ') + deploy/pdf/ sob demanda');

/* 4. vercel.json: /api/* vai para a API na VPS; o index nunca fica em cache
      (todo mundo pega a versão nova na hora) e cabeçalhos de segurança. */
const pub = JSON.parse(fs.readFileSync(path.join(raiz, 'publicar.json'), 'utf8'));
const origem = String(pub.apiOrigem || '').replace(/\/+$/, '');
if (!/^https:\/\/[^/]+/.test(origem) || /DOMINIO-DO-PRECIFA/.test(origem)) {
  console.warn('ATENÇÃO: publicar.json → apiOrigem ainda não está preenchido; a conta não vai funcionar na Vercel.');
}
const seguranca = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' }
];
const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  cleanUrls: false,
  rewrites: [{ source: '/api/:caminho*', destination: origem + '/:caminho*' }],
  headers: [
    { source: '/api/:caminho*', headers: [
      { key: 'x-vercel-enable-rewrite-caching', value: '0' },
      { key: 'Cache-Control', value: 'no-store' } ] },
    { source: '/', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }].concat(seguranca) },
    { source: '/index.html', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }].concat(seguranca) }
  ]
};
/* 5. mapa da crônica (o antigo Belmont) em deploy/mapa/ */
fs.mkdirSync(path.join(raiz, 'deploy', 'mapa'), { recursive: true });
for (const f of ['index.html', 'app.js', 'carregar.js']) fs.copyFileSync(path.join(raiz, 'mapa', f), path.join(raiz, 'deploy', 'mapa', f));
/* 5b. página de login e cadastro em deploy/entrar/ */
fs.mkdirSync(path.join(raiz, 'deploy', 'entrar'), { recursive: true });
fs.copyFileSync(path.join(raiz, 'entrar', 'index.html'), path.join(raiz, 'deploy', 'entrar', 'index.html'));
vercel.redirects = [
  { source: '/mapa', destination: '/mapa/', permanent: false },
  { source: '/entrar', destination: '/entrar/', permanent: false }
];
vercel.headers.push({ source: '/entrar/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }].concat(seguranca) });
console.log('deploy/entrar/ — login e cadastro');
vercel.headers.push({ source: '/mapa/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }].concat(seguranca) });
console.log('deploy/mapa/ — mapa da crônica');

/* 6. instalar como app (PWA): manifesto, ícones e service worker, só na versão publicada.
      O nome do cache muda quando qualquer página muda, então quem instalou recebe a versão nova. */
const pwa = path.join(raiz, 'pwa');
fs.mkdirSync(path.join(raiz, 'deploy', 'icones'), { recursive: true });
for (const f of ['icone-192.png', 'icone-512.png', 'icone-maskable-512.png', 'apple-touch-icon.png', 'favicon-64.png']) {
  fs.copyFileSync(path.join(pwa, f), path.join(raiz, 'deploy', 'icones', f));
}
fs.copyFileSync(path.join(pwa, 'manifest.webmanifest'), path.join(raiz, 'deploy', 'manifest.webmanifest'));
const tagsPwa = fs.readFileSync(path.join(pwa, 'registrar.html'), 'utf8').trim();
const paginasPwa = ['index.html', 'entrar/index.html', 'mapa/index.html'];
const hash = crypto.createHash('sha256');
for (const rel of paginasPwa) {
  const arq = path.join(raiz, 'deploy', rel);
  let h = fs.readFileSync(arq, 'utf8');
  if (!h.includes('rel="manifest"')) {
    if (!/<\/head>/i.test(h)) throw new Error('sem </head> em deploy/' + rel);
    h = h.replace(/<\/head>/i, tagsPwa + '\n</head>');
    fs.writeFileSync(arq, h, 'utf8');
  }
  hash.update(h);
}
for (const f of ['mapa/app.js', 'mapa/carregar.js', 'manifest.webmanifest']) hash.update(fs.readFileSync(path.join(raiz, 'deploy', f)));
const versaoPwa = hash.digest('hex').slice(0, 12);
fs.writeFileSync(path.join(raiz, 'deploy', 'sw.js'),
  fs.readFileSync(path.join(pwa, 'sw.js'), 'utf8').replace(/__VERSAO__/g, versaoPwa), 'utf8');
vercel.headers.push(
  { source: '/sw.js', headers: [
    { key: 'Cache-Control', value: 'no-cache' },
    { key: 'Service-Worker-Allowed', value: '/' },
    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' } ] },
  { source: '/manifest.webmanifest', headers: [
    { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
    { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' } ] },
  { source: '/icones/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
  { source: '/pdf/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }
);
console.log('deploy/sw.js, manifest e ícones — app instalável (versão ' + versaoPwa + ')');

fs.writeFileSync(path.join(raiz, 'deploy', 'vercel.json'), JSON.stringify(vercel, null, 2) + '\n', 'utf8');
console.log('deploy/vercel.json — /api → ' + origem);
console.log('publicar: dentro da pasta deploy, rode  npx vercel --prod');
