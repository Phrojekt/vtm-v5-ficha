/* Servidor estático simples para abrir a ficha no navegador: node servidor.js */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = 4777;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/ficha.html';
  const arq = path.join(__dirname, path.normalize(p).replace(/^[\\/]+/, ''));
  if (!arq.startsWith(__dirname) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
    res.writeHead(404); return res.end('não encontrado');
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
  fs.createReadStream(arq).pipe(res);
}).listen(PORTA, () => console.log('http://localhost:' + PORTA));
