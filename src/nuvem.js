/* ============================================================
   Ficha de Sangue — biblioteca de fichas e sincronização

   Biblioteca local: cada ficha fica numa chave própria do navegador
   (ficha-de-sangue:f:<id>) e um índice pequeno guarda nome, resumo e
   estado de sincronização. Funciona sem conta e sem internet.

   Com conta: as fichas sobem para a API (pasta api/). Cada ficha tem
   um id definitivo criado aqui mesmo, e uma `versao` que é a última
   que o servidor confirmou. Ao salvar, mandamos essa versão junto; se o
   servidor estiver em outra (editaram em outro aparelho), nada se perde:
   a versão do servidor fica com o id original e a edição daqui vira uma
   cópia "(conflito …)".

   Depende do app.js (S, render, adotar, novoEstado, esc, el), que é
   carregado depois; aqui só se declaram funções.
   ============================================================ */

/* Endereço da API. Publicado na Vercel, o site chama /api no próprio endereço e a
   Vercel repassa para a VPS (deploy/vercel.json). Aberto de outro jeito (arquivo,
   servidor local), fica só no navegador, a menos que se escolha um servidor no painel. */
const NV_API_PADRAO = (() => {
  try { return /\.vercel\.app$/i.test(location.hostname) ? '/api' : ''; } catch (e) { return ''; }
})();

const NV_CHAVE = {
  indice: 'ficha-de-sangue:biblioteca',
  ficha:  'ficha-de-sangue:f:',
  conta:  'ficha-de-sangue:conta',
  antiga: 'ficha-de-sangue:v1',
  adotar: 'ficha-de-sangue:adotar'
};

const NV = {
  indice: { atual: null, fichas: {} },  /* id → meta */
  conta: null,          /* { api, token, usuario, ultimaSync } */
  painel: false,
  aba: 'fichas',        /* fichas | cronicas | ficha */
  status: '',           /* texto curto da barra */
  msg: '',              /* mensagem do painel */
  sincronizando: false,
  timer: null,
  ultimo: {},           /* id → JSON salvo por último (para não marcar sujo à toa) */
  cronicas: null, cronica: null, versoes: null, links: null,
  leitura: null,        /* { titulo, antes, ... } quando se lê uma ficha alheia */
  remota: null,         /* { id, versao, dono, ... } quando o mestre edita a ficha de um jogador */
  membros: {},          /* crônica → membros, para entregar fichas */
  carregando: {},
  desfazer: null
};

/* ---------- utilitários ---------- */
function nvUuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function nvLer(chave, padrao) {
  try { const r = localStorage.getItem(chave); return r ? JSON.parse(r) : padrao; } catch (e) { return padrao; }
}
function nvGravar(chave, valor) {
  try { localStorage.setItem(chave, typeof valor === 'string' ? valor : JSON.stringify(valor)); return true; }
  catch (e) { NV.status = 'sem espaço no navegador'; return false; }
}
function nvApagar(chave) { try { localStorage.removeItem(chave); } catch (e) {} }
const nvApi = () => (NV.conta && NV.conta.api) || nvLer(NV_CHAVE.conta + ':api', '') || NV_API_PADRAO;
const nvLogado = () => !!(NV.conta && NV.conta.token);
const nvAgora = () => new Date().toISOString();

function nvQuando(iso) {
  if (!iso) return '';
  const d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return 'há ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h';
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* resumo que aparece na lista, tirado da própria ficha */
function nvResumo(s) {
  const m = s.meta || {};
  return {
    sistema: s.sistema === 'cacador' ? 'cacador' : 'vampiro',
    cla: s.sistema === 'cacador' ? (s.credo || '') : (m.cla || ''),
    conceito: m.conceito || '', jogador: m.jogador || ''
  };
}

/* ---------- biblioteca local ---------- */
function nvGravarIndice() { nvGravar(NV_CHAVE.indice, NV.indice); }
function nvDadosLocais(id) { return nvLer(NV_CHAVE.ficha + id, null); }

/* Na subida: lê o índice, migra a ficha única antiga e põe a atual em S.
   Devolve false se a biblioteca está vazia (o app então sorteia uma). */
function bibliotecaCarregar() {
  NV.indice = nvLer(NV_CHAVE.indice, null) || { atual: null, fichas: {} };
  NV.conta = nvLer(NV_CHAVE.conta, null);

  /* versão anterior guardava uma ficha só */
  const antiga = nvLer(NV_CHAVE.antiga, null);
  if (antiga && !Object.keys(NV.indice.fichas).length) {
    const id = antiga._id || nvUuid();
    antiga._id = id;
    nvGravar(NV_CHAVE.ficha + id, antiga);
    NV.indice.fichas[id] = nvMetaNova(id, antiga);
    NV.indice.atual = id;
    nvGravarIndice();
  }
  if (antiga) nvApagar(NV_CHAVE.antiga);

  let id = NV.indice.atual;
  if (!id || !NV.indice.fichas[id] || NV.indice.fichas[id].excluida) id = nvFichasVisiveis()[0] && nvFichasVisiveis()[0].id;
  const dados = id && nvDadosLocais(id);
  if (!dados) { NV.indice.atual = null; NV.semFicha = true; return false; }
  S = adotar(dados);
  S._id = id;
  NV.indice.atual = id;
  NV.ultimo[id] = JSON.stringify(S);
  return true;
}

function nvMetaNova(id, s) {
  return {
    id, nome: (s.meta && s.meta.nome) || '', resumo: nvResumo(s),
    versao: null,          /* última versão confirmada pelo servidor */
    sujo: true, rev: 1,    /* rev: conta edições locais, para saber se mudou durante o envio */
    conta: nvLogado() ? NV.conta.usuario.id : null,
    cronica_id: null, cronicaMudou: false,
    atualizadoEm: nvAgora(), excluida: false
  };
}

/* Chamado pelo salvar() do app a cada mudança. Só grava se a ficha mudou. */
function bibliotecaGuardar() {
  if (NV.remota) return nvAgendarRemota(); /* ficha de jogador aberta pelo mestre: salva direto na conta dele */
  if (NV.leitura) return;                 /* ficha alheia: não entra na biblioteca */
  if (NV.semFicha) { if (!S._id) return; NV.semFicha = false; }  /* nenhuma ficha aberta: nada a guardar */
  if (!S._id) S._id = NV.indice.atual || nvUuid();
  const id = S._id;
  const json = JSON.stringify(S);
  if (NV.ultimo[id] === json && NV.indice.fichas[id]) { NV.indice.atual = id; return; }
  if (!nvGravar(NV_CHAVE.ficha + id, json)) return;
  NV.ultimo[id] = json;
  let m = NV.indice.fichas[id];
  if (!m) m = NV.indice.fichas[id] = nvMetaNova(id, S);
  m.nome = (S.meta && S.meta.nome) || '';
  m.resumo = nvResumo(S);
  m.sujo = true; m.rev = (m.rev || 0) + 1; m.atualizadoEm = nvAgora();
  if (m.excluida) m.excluida = false;
  if (!m.conta && nvLogado()) m.conta = NV.conta.usuario.id;
  NV.indice.atual = id;
  nvGravarIndice();
  nvAgendar();
  nvBarra();
}

/* as fichas que esta pessoa vê: as da conta dela e as que ainda são só daqui */
function nvFichasVisiveis() {
  const minha = nvLogado() ? NV.conta.usuario.id : null;
  return Object.values(NV.indice.fichas)
    .filter(m => !m.excluida && (!m.conta || m.conta === minha))
    .sort((a, b) => String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)));
}

/* troca a ficha da tela (sem marcar a nova como editada) */
function nvVisivel(id) {
  const m = NV.indice.fichas[id];
  const minha = nvLogado() ? NV.conta.usuario.id : null;
  return !!(m && !m.excluida && (!m.conta || m.conta === minha));
}
function nvAbrir(id) {
  /* só as fichas desta pessoa: a de outra conta que ficou no navegador não abre */
  if (!nvVisivel(id)) { nvMsg('Essa ficha não está entre as suas.'); return false; }
  const dados = nvDadosLocais(id);
  if (!dados) { nvMsg('Esta ficha não está mais neste navegador.'); return false; }
  NV.semFicha = false;
  nvEsquecerDesfazer();
  nvSairLeitura(false);
  S = adotar(dados);
  S._id = id;
  NV.indice.atual = id;
  NV.ultimo[id] = JSON.stringify(S);
  nvGravarIndice();
  NV.versoes = null; NV.links = null;
  render();
  return true;
}

/* a ficha que o app sorteia sozinho quando a biblioteca está vazia */
function nvMarcarAutomatica() {
  const m = NV.indice.fichas[S._id];
  if (m) { m.auto = m.rev; nvGravarIndice(); }   /* guarda em que edição estava */
}

/* ficha nova em branco, ou a partir de dados (cópia, importação) */
function nvNova(dados) {
  nvSairLeitura(false);
  S = dados ? adotar(dados) : novoEstado();
  if (!dados) { S.sistema = ehCacador() ? 'cacador' : 'vampiro'; S.forja.sistema = S.sistema; }
  S._id = nvUuid();
  NV.semFicha = false;
  nvEsquecerDesfazer();
  NV.indice.atual = S._id;
  NV.versoes = null; NV.links = null;
  render();
  return S._id;
}

/* nenhuma ficha aberta (a última foi excluída, saiu da conta…): volta para a lista */
function nvSemFicha() {
  S = novoEstado();
  delete S._id;
  NV.semFicha = true;
  NV.indice.atual = null;
  nvGravarIndice();
  if (typeof uiIr === 'function' && /^#\/(ficha|leitura|remota)/.test(location.hash)) uiIr('#/fichas', true);
  else if (typeof uiRedesenharTela === 'function') uiRedesenharTela();
}

/* Dados que chegam de fora (PDF sem anexo, JSON colado): se não trazem
   identidade, viram ficha nova em vez de sobrescrever a atual. */
function nvIdentidade(estado) {
  if (!estado._id) estado._id = nvUuid();
  return estado;
}

function nvDuplicar(id) {
  const d = nvDadosLocais(id);
  if (!d) return;
  d.meta = d.meta || {};
  d.meta.nome = (d.meta.nome || 'Sem nome') + ' (cópia)';
  delete d._id;
  const novo = nvNova(d);
  nvMsg('Cópia criada: ' + d.meta.nome + '.');
  if (typeof uiIr === 'function') uiIr('#/ficha/' + novo);
}

function nvExcluir(id) {
  const m = NV.indice.fichas[id];
  if (!m) return;
  if (!confirm('Excluir "' + (m.nome || 'Sem nome') + '"?' + (m.versao ? ' Ela some também da sua conta (dá para recuperar pelo servidor).' : ''))) return;
  if (m.versao && nvLogado()) { m.excluida = true; m.sujo = true; m.rev++; }   /* a exclusão sobe na próxima sincronização */
  else { delete NV.indice.fichas[id]; nvApagar(NV_CHAVE.ficha + id); }
  delete NV.ultimo[id];
  nvGravarIndice();
  /* a ficha excluída era a aberta: não abre outra sozinho, volta para a lista */
  if (S._id === id) nvSemFicha();
  nvRedesenhar();
  nvMsg('"' + (m.nome || 'Sem nome') + '" foi excluída.');
  nvAgendar();
}

/* ---------- desfazer o sorteio ---------- */
/* o desfazer vale só para a ficha em que se sorteou: trocar de ficha o esquece */
function nvEsquecerDesfazer() { NV.desfazer = null; const b = el('btn-desfazer'); if (b) b.hidden = true; }
function nvAntesDeSortear() {
  NV.desfazer = { id: S._id, json: JSON.stringify(S) };
  const b = el('btn-desfazer'); if (b) b.hidden = false;
}
function nvDesfazer() {
  if (!NV.desfazer || NV.desfazer.id !== S._id) return nvEsquecerDesfazer();
  S = adotar(JSON.parse(NV.desfazer.json));
  S._id = NV.desfazer.id;
  NV.desfazer = null;
  const b = el('btn-desfazer'); if (b) b.hidden = true;
  render();
}

/* ============================================================
   CONVERSA COM A API
   ============================================================ */
async function nvChamar(metodo, caminho, corpo, { semToken } = {}) {
  const api = nvApi();
  if (!api) throw Object.assign(new Error('servidor não configurado'), { semServidor: true });
  /* sem corpo, sem Content-Type: o Fastify recusa JSON vazio */
  const h = corpo === undefined ? {} : { 'Content-Type': 'application/json' };
  if (!semToken && NV.conta && NV.conta.token) h.Authorization = 'Bearer ' + NV.conta.token;
  let r;
  try {
    r = await fetch(api.replace(/\/+$/, '') + caminho, {
      method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
  } catch (e) {
    throw Object.assign(new Error('sem conexão com o servidor'), { offline: true });
  }
  let json = null;
  try { json = await r.json(); } catch (e) {}
  if (r.status === 401 && !semToken && NV.conta) {
    NV.conta.token = null; nvGravar(NV_CHAVE.conta, NV.conta);
    nvMsg('Sua sessão expirou. Entre de novo; as fichas continuam salvas aqui.');
  }
  return { status: r.status, ok: r.ok, body: json || {} };
}
const nvErro = r => (r.body && r.body.erro) || ('erro ' + r.status);

/* fichas que eram só deste navegador passam a ser da conta — menos a que o
   app sorteou sozinho na primeira visita e ninguém mexeu */
/* vindo da página /entrar/: a sessão já está gravada. Faz o mesmo que entrar pelo painel:
   adota as fichas locais, sincroniza e abre uma ficha da conta (não a sorteada automática). */
async function nvEntrarAoCarregar() {
  try { if (!localStorage.getItem(NV_CHAVE.adotar)) return; localStorage.removeItem(NV_CHAVE.adotar); } catch (e) { return; }
  if (!nvLogado()) return;
  const { adotadas, descartada } = nvAdotarLocais(NV.conta.usuario.id);
  NV.cronicas = null;
  if (adotadas) nvMsg('Olá, ' + NV.conta.usuario.nome + '! ' + adotadas + ' ficha(s) deste navegador vão para a sua conta.');
  try { await nvSincronizar(); } catch (e) {}
  if (descartada) nvSemFicha();
  nvRedesenhar();
}

function nvAdotarLocais(usuarioId) {
  let adotadas = 0, descartada = false;
  for (const m of Object.values(NV.indice.fichas)) {
    if (m.conta) continue;
    if (m.auto && m.rev <= m.auto) {   /* ninguém mexeu desde o sorteio automático */
      delete NV.indice.fichas[m.id]; nvApagar(NV_CHAVE.ficha + m.id);
      if (S && S._id === m.id) descartada = true;
      continue;
    }
    m.conta = usuarioId; m.sujo = true; adotadas++;
  }
  nvGravarIndice();
  return { adotadas, descartada };
}

/* ---------- conta ---------- */
async function nvEntrar(cadastro) {
  const email = (el('nv-email') || {}).value || '';
  const senha = (el('nv-senha') || {}).value || '';
  const nome = (el('nv-nome') || {}).value || '';
  if (!email || !senha) return nvMsg('Preencha email e senha.');
  nvMsg(cadastro ? 'Criando a conta…' : 'Entrando…');
  try {
    const r = await nvChamar('POST', cadastro ? '/auth/cadastro' : '/auth/entrar',
      cadastro ? { email, senha, nome } : { email, senha }, { semToken: true });
    if (!r.ok) return nvMsg(nvErro(r));
    const trocouConta = NV.conta && NV.conta.usuario && NV.conta.usuario.id !== r.body.usuario.id;
    NV.conta = { api: nvApi(), token: r.body.token, usuario: r.body.usuario, ultimaSync: trocouConta ? null : (NV.conta && NV.conta.ultimaSync) || null };
    nvGravar(NV_CHAVE.conta, NV.conta);
    const { adotadas, descartada } = nvAdotarLocais(r.body.usuario.id);
    nvGravarIndice();
    NV.cronicas = null;
    nvMsg('Olá, ' + r.body.usuario.nome + '!' + (adotadas ? ' ' + adotadas + ' ficha(s) deste navegador vão para a sua conta.' : ''));
    await nvSincronizar();
    if (descartada || !NV.indice.fichas[S._id]) {
      const outra = nvFichasVisiveis()[0];
      if (outra) nvAbrir(outra.id); else nvSemFicha();
    }
  } catch (e) { nvMsg(e.message); }
}

async function nvTrocarSenha() {
  const atual = (el('nv-senha-atual') || {}).value || '';
  const nova = (el('nv-senha-nova') || {}).value || '';
  const erro = t => { const e = el('senha-msg'); if (e) e.textContent = t; };
  if (nova.length < 8) return erro('A senha nova precisa de pelo menos 8 caracteres.');
  try {
    const r = await nvChamar('PUT', '/eu/senha', { atual, nova });
    if (!r.ok) return erro(nvErro(r));
    erro('');
    uiFecharDialogos();
    nvMsg('Senha trocada. Os outros aparelhos vão pedir para entrar de novo.');
  } catch (e) { nvMsg(e.message); }
}

async function nvSair() {
  const pendentes = Object.values(NV.indice.fichas).filter(m => m.conta === NV.conta.usuario.id && m.sujo);
  if (pendentes.length && !confirm(pendentes.length + ' ficha(s) ainda não subiram para o servidor e ficariam só neste navegador. Sair mesmo assim?')) return;
  try { await nvChamar('POST', '/auth/sair'); } catch (e) {}
  /* as fichas da conta saem deste navegador (estão no servidor); as pendentes ficam como locais */
  const id = NV.conta.usuario.id;
  for (const m of Object.values(NV.indice.fichas)) {
    if (m.conta !== id) continue;
    if (m.sujo) { m.conta = null; m.versao = null; continue; }
    delete NV.indice.fichas[m.id]; nvApagar(NV_CHAVE.ficha + m.id); delete NV.ultimo[m.id];
  }
  NV.conta = { api: NV.conta.api, token: null, usuario: null, ultimaSync: null };
  nvGravar(NV_CHAVE.conta, NV.conta);
  NV.cronicas = null; NV.cronica = null; NV.versoes = null; NV.links = null;
  nvGravarIndice();
  const resta = nvFichasVisiveis()[0];
  if (S._id && !NV.indice.fichas[S._id]) nvSemFicha();
  void resta;
  nvMsg('Você saiu. As fichas da conta continuam no servidor.');
}

/* ============================================================
   SINCRONIZAÇÃO
   ============================================================ */
function nvAgendar(ms) {
  if (!nvLogado()) return;
  clearTimeout(NV.timer);
  NV.timer = setTimeout(nvSincronizar, ms == null ? 2500 : ms);
}

/* a edição local não pôde entrar no id original: vira uma ficha nova */
function nvVirarCopia(m, motivo) {
  const dados = nvDadosLocais(m.id);
  if (!dados) return null;
  const novoId = nvUuid();
  const quando = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  dados._id = novoId;
  dados.meta = dados.meta || {};
  dados.meta.nome = (dados.meta.nome || 'Sem nome') + ' (' + motivo + ' ' + quando + ')';
  nvGravar(NV_CHAVE.ficha + novoId, dados);
  NV.indice.fichas[novoId] = Object.assign(nvMetaNova(novoId, dados), { conta: m.conta });
  if (S._id === m.id) { S = adotar(dados); S._id = novoId; NV.indice.atual = novoId; NV.ultimo[novoId] = JSON.stringify(S); }
  return novoId;
}

/* grava no índice o que veio do servidor */
function nvAceitarDoServidor(f) {
  const dados = f.dados;
  dados._id = f.id;
  nvGravar(NV_CHAVE.ficha + f.id, dados);
  const m = NV.indice.fichas[f.id] || nvMetaNova(f.id, dados);
  Object.assign(m, {
    nome: f.nome, resumo: nvResumo(dados), versao: f.versao, sujo: false, conta: f.dono_id || m.conta,
    cronica_id: f.cronica_id, cronicaMudou: false, atualizadoEm: f.atualizado_em, excluida: false
  });
  NV.indice.fichas[f.id] = m;
  if (S._id === f.id && !NV.leitura) {
    S = adotar(dados); S._id = f.id; NV.ultimo[f.id] = JSON.stringify(S);
    return true;  /* a ficha da tela mudou */
  }
  return false;
}

async function nvSincronizar() {
  if (!nvLogado() || NV.sincronizando) return;
  if (!navigator.onLine) { NV.status = 'offline · salvo neste navegador'; return nvBarra(); }
  NV.sincronizando = true; NV.status = 'sincronizando…'; nvBarra();
  const conflitos = [];
  let telaMudou = false;
  try {
    const minha = NV.conta.usuario.id;
    /* 1. envia o que mudou aqui */
    for (const m of Object.values(NV.indice.fichas)) {
      if (m.conta !== minha || !m.sujo) continue;
      if (m.excluida) {
        const r = await nvChamar('DELETE', '/fichas/' + m.id);
        if (r.ok || r.status === 404) { delete NV.indice.fichas[m.id]; nvApagar(NV_CHAVE.ficha + m.id); }
        continue;
      }
      const dados = nvDadosLocais(m.id);
      if (!dados) { delete NV.indice.fichas[m.id]; continue; }
      const rev = m.rev;
      const corpo = { dados, versao_base: m.versao };
      if (m.cronicaMudou) corpo.cronica_id = m.cronica_id || null;
      const r = await nvChamar('PUT', '/fichas/' + m.id, corpo);
      if (r.ok) {
        m.versao = r.body.ficha.versao; m.cronica_id = r.body.ficha.cronica_id; m.cronicaMudou = false;
        if (m.rev === rev) m.sujo = false;  /* se editaram durante o envio, continua sujo */
      } else if (r.status === 409) {
        /* outro aparelho mexeu antes (ou excluiu): a edição daqui vira cópia */
        nvVirarCopia(m, r.body.conflito === 'excluida' ? 'recuperada' : 'conflito');
        m.sujo = false;
        if (r.body.conflito === 'versao' && r.body.atual) { if (nvAceitarDoServidor(r.body.atual)) telaMudou = true; }
        else { delete NV.indice.fichas[m.id]; nvApagar(NV_CHAVE.ficha + m.id); }
        conflitos.push(m.nome || 'Sem nome');
        telaMudou = telaMudou || S._id !== m.id;
      } else if (r.status === 403 || r.status === 404) {
        /* o id é de outra pessoa: guarda como ficha nova */
        nvVirarCopia(m, 'cópia');
        delete NV.indice.fichas[m.id]; nvApagar(NV_CHAVE.ficha + m.id);
        telaMudou = true;
      } else if (r.status === 401) {
        break;
      } else {
        NV.status = 'erro ao enviar: ' + nvErro(r);
      }
    }
    nvGravarIndice();
    if (!nvLogado()) throw new Error('sessão expirada');

    /* 2. traz o que mudou no servidor */
    const desde = NV.conta.ultimaSync ? '&desde=' + encodeURIComponent(NV.conta.ultimaSync) : '';
    const r = await nvChamar('GET', '/fichas?dados=1' + desde);
    if (!r.ok) throw new Error(nvErro(r));
    for (const f of r.body.fichas) {
      const m = NV.indice.fichas[f.id];
      if (f.excluida_em) {
        if (m && !m.sujo) {
          delete NV.indice.fichas[f.id]; nvApagar(NV_CHAVE.ficha + f.id);
          if (S._id === f.id) telaMudou = 'removida';
        }
        continue;
      }
      if (m && m.sujo) continue;                    /* edição local ainda não enviada vence; vai na próxima */
      if (m && m.versao === f.versao) { m.cronica_id = f.cronica_id; continue; }
      if (nvAceitarDoServidor(f)) telaMudou = true;
    }
    NV.conta.ultimaSync = r.body.agora;
    nvGravar(NV_CHAVE.conta, NV.conta);
    nvGravarIndice();
    NV.status = 'sincronizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (conflitos.length) nvAgendar(1500);
    if (conflitos.length) nvMsg('A ficha "' + conflitos.join('", "') + '" tinha sido mudada em outro aparelho. ' +
      'A versão do servidor ficou com o nome original e a sua edição virou uma cópia "(conflito…)".');
  } catch (e) {
    NV.status = e.offline ? 'offline · salvo neste navegador' : (e.semServidor ? 'servidor não configurado' : 'não sincronizou: ' + e.message);
  } finally {
    NV.sincronizando = false;
  }
  if (telaMudou === 'removida') { nvSemFicha(); nvMsg('A ficha que estava aberta foi excluída em outro aparelho.'); }
  else if (telaMudou) render();
  else nvRedesenhar();
  nvBarra();
}

/* ============================================================
   CRÔNICAS, HISTÓRICO, LINKS
   ============================================================ */
async function nvCarregarCronicas() {
  if (!nvLogado() || NV.carregando.cronicas) return;
  NV.carregando.cronicas = true;
  try {
    const r = await nvChamar('GET', '/cronicas');
    NV.cronicas = r.ok ? r.body.cronicas : (NV.cronicas || []);
  } catch (e) { NV.cronicas = NV.cronicas || []; NV.msg = e.message; }
  NV.carregando.cronicas = false;
  nvRedesenhar();
}
async function nvAbrirCronica(id) {
  NV.carregando.cronica = true;
  try {
    const r = await nvChamar('GET', '/cronicas/' + id);
    NV.carregando.cronica = false;
    if (!r.ok) { nvMsg(nvErro(r)); if (location.hash.indexOf('#/cronicas/' + id) === 0) uiIr('#/cronicas', true); return; }
    if (!NV.cronica || NV.cronica.cronica.id !== id) NV.crAba = 'fichas';
    NV.cronica = r.body;
    if (r.body.papel === 'narrador') { if (!NV.np || NV.np.id !== id) NV.np = null; nvCarregarPainel(!!NV.np); }
  } catch (e) { NV.carregando.cronica = false; nvMsg(e.message); }
  nvRedesenhar();
}
async function nvCriarCronica() {
  const nome = (el('nv-cr-nome') || {}).value || '';
  if (!nome.trim()) return nvMsg('Dê um nome à crônica.');
  try {
    const r = await nvChamar('POST', '/cronicas', { nome });
    if (!r.ok) return nvMsg(nvErro(r));
    const ci = el('nv-cr-nome'); if (ci) ci.value = '';
    nvMsg('Crônica criada. Passe o código de convite para os jogadores.');
    await nvCarregarCronicas();
    uiIr('#/cronicas/' + r.body.cronica.id);
  } catch (e) { nvMsg(e.message); }
}
async function nvEntrarCronica() {
  const codigo = (el('nv-cr-codigo') || {}).value || '';
  if (!codigo.trim()) return nvMsg('Digite o código que o narrador passou.');
  try {
    const r = await nvChamar('POST', '/cronicas/entrar', { codigo });
    if (!r.ok) return nvMsg(nvErro(r));
    const ci = el('nv-cr-codigo'); if (ci) ci.value = '';
    nvMsg('Você entrou em "' + r.body.cronica.nome + '". Agora ponha uma ficha sua nela.');
    await nvCarregarCronicas();
    uiIr('#/cronicas/' + r.body.cronica.id);
  } catch (e) { nvMsg(e.message); }
}
async function nvCronicaAcao(acao, id, extra) {
  try {
    let r;
    if (acao === 'convite') r = await nvChamar('POST', '/cronicas/' + id + '/convite');
    if (acao === 'remover') {
      if (!confirm(extra === NV.conta.usuario.id ? 'Sair desta crônica? Suas fichas saem dela.' : 'Tirar este jogador da crônica?')) return;
      r = await nvChamar('DELETE', '/cronicas/' + id + '/membros/' + extra);
    }
    if (acao === 'excluir') {
      if (!confirm('Excluir a crônica? As fichas continuam com os donos, só saem dela.')) return;
      r = await nvChamar('DELETE', '/cronicas/' + id);
    }
    if (r && !r.ok) return nvMsg(nvErro(r));
    if (acao === 'excluir' || (acao === 'remover' && extra === NV.conta.usuario.id)) { NV.cronica = null; NV.cronicas = null; uiIr('#/cronicas'); await nvCarregarCronicas(); return; }
    await nvAbrirCronica(id);
  } catch (e) { nvMsg(e.message); }
}

/* a ficha atual entra (ou sai) de uma crônica: sobe na próxima sincronização */
function nvDefinirCronica(cronicaId, fichaId) {
  const m = NV.indice.fichas[fichaId || S._id];
  if (!m) return;
  m.cronica_id = cronicaId || null; m.cronicaMudou = true; m.sujo = true; m.rev++;
  nvGravarIndice(); nvAgendar(100);
  nvMsg(cronicaId ? '"' + (m.nome || 'Sem nome') + '" vai aparecer para o narrador.' : 'A ficha saiu da crônica.');
}

/* lê uma ficha que não é sua (narrador, link). Não entra na biblioteca. */
function nvEntrarLeitura(dados, titulo, opcoes) {
  if (!NV.leitura) NV.leitura = { antes: { S, id: S._id }, voltar: /^#\/(leitura|remota)/.test(location.hash) ? '' : location.hash };
  NV.leitura.titulo = titulo;
  NV.leitura.publica = !!(opcoes && opcoes.publica);
  S = adotar(dados);
  delete S._id;
  document.body.classList.add('nv-leitura');
  const b = el('nv-leitura-titulo'); if (b) b.textContent = titulo;
  render();
  uiIr('#/leitura');
}
function nvSairLeitura(redesenhar = true) {
  if (!NV.leitura) return;
  const { antes, voltar } = NV.leitura;
  NV.leitura = null;
  document.body.classList.remove('nv-leitura');
  if (antes && antes.S) { S = antes.S; if (antes.id) S._id = antes.id; else delete S._id; }
  if (redesenhar) { render(); uiIr(voltar || '#/fichas'); }
}
function nvGuardarCopiaDaLeitura() {
  const d = JSON.parse(JSON.stringify(S));
  delete d._id;
  NV.leitura = null;
  document.body.classList.remove('nv-leitura');
  const id = nvNova(d);
  nvMsg('Cópia guardada nas suas fichas.');
  uiIr('#/ficha/' + id);
}
async function nvLerFichaDaCronica(id) {
  try {
    const r = await nvChamar('GET', '/fichas/' + id);
    if (!r.ok) return nvMsg(nvErro(r));
    const f = r.body.ficha;
    nvEntrarLeitura(f.dados, (f.nome || 'Sem nome') + ' · ficha de jogador, só leitura');
  } catch (e) { nvMsg(e.message); }
}

/* antes de mexer em histórico e links, a ficha precisa estar no servidor */
async function nvGarantirNoServidor() {
  const m = NV.indice.fichas[S._id];
  if (!m) return false;
  if (m.sujo || !m.versao) await nvSincronizar();
  const m2 = NV.indice.fichas[S._id];
  if (!m2 || !m2.versao || m2.sujo) { NV.msg = 'A ficha ainda não subiu para o servidor. Confira a conexão.'; return false; }
  return true;
}
async function nvCarregarVersoes() {
  if (NV.carregando.versoes) return;
  NV.carregando.versoes = true;
  try { await nvCarregarVersoesJa(); } finally { NV.carregando.versoes = false; }
  nvRedesenhar();
}
async function nvCarregarVersoesJa() {
  if (!(await nvGarantirNoServidor())) { NV.versoes = []; NV.links = []; return; }
  try {
    const r = await nvChamar('GET', '/fichas/' + S._id + '/versoes');
    NV.versoes = r.ok ? r.body.versoes : []; if (!r.ok) nvMsg(nvErro(r));
    const l = await nvChamar('GET', '/fichas/' + S._id + '/links');
    NV.links = l.ok ? l.body.links : [];
  } catch (e) { NV.versoes = NV.versoes || []; NV.links = NV.links || []; NV.msg = e.message; }
}
async function nvVersaoAcao(acao, versao) {
  try {
    if (acao === 'marcar') {
      if (!(await nvGarantirNoServidor())) return;
      const rotulo = prompt('Nome para esta versão (ex.: "antes de gastar XP"):');
      if (!rotulo) return;
      const r = await nvChamar('POST', '/fichas/' + S._id + '/versoes', { rotulo });
      if (!r.ok) return nvMsg(nvErro(r));
      nvMsg('Versão marcada. Ela não é apagada pela limpeza automática.');
    }
    if (acao === 'ver') {
      const r = await nvChamar('GET', '/fichas/' + S._id + '/versoes/' + versao);
      if (!r.ok) return nvMsg(nvErro(r));
      nvEntrarLeitura(r.body.versao.dados, 'Versão ' + versao + (r.body.versao.rotulo ? ' · ' + r.body.versao.rotulo : '') + ' · só leitura');
      return;
    }
    if (acao === 'restaurar') {
      if (!(await nvGarantirNoServidor())) return;
      if (!confirm('Voltar a ficha para a versão ' + versao + '? A atual continua no histórico.')) return;
      const r = await nvChamar('POST', '/fichas/' + S._id + '/versoes/' + versao + '/restaurar');
      if (!r.ok) return nvMsg(nvErro(r));
      nvAceitarDoServidor(r.body.ficha);
      nvGravarIndice();
      render();
      nvMsg('Ficha restaurada para a versão ' + versao + '.');
    }
  } catch (e) { nvMsg(e.message); }
  await nvCarregarVersoes();
}
async function nvLinkAcao(acao, token) {
  try {
    if (acao === 'criar') {
      if (!(await nvGarantirNoServidor())) return;
      const r = await nvChamar('POST', '/fichas/' + S._id + '/links');
      if (!r.ok) return nvMsg(nvErro(r));
      try { await navigator.clipboard.writeText(r.body.url); nvMsg('Link criado e copiado. Quem tiver o link vê a ficha sem precisar de conta.'); }
      catch (e) { nvMsg('Link criado: ' + r.body.url); }
    }
    if (acao === 'copiar') {
      const l = (NV.links || []).find(x => x.token === token);
      try { await navigator.clipboard.writeText(l.url); nvMsg('Link copiado.'); } catch (e) { nvMsg(l.url); }
      return;
    }
    if (acao === 'revogar') {
      const r = await nvChamar('DELETE', '/fichas/' + S._id + '/links/' + token);
      if (!r.ok) return nvMsg(nvErro(r));
      nvMsg('Link desligado. Quem tinha o link não vê mais a ficha.');
    }
  } catch (e) { nvMsg(e.message); }
  await nvCarregarVersoes();
}

/* link público: ?ver=<token> abre a ficha só para leitura */
async function nvAbrirLinkPublico() {
  let token = null;
  try { token = new URLSearchParams(location.search).get('ver'); } catch (e) {}
  if (!token) return false;
  try {
    const r = await nvChamar('GET', '/publico/' + encodeURIComponent(token), undefined, { semToken: true });
    if (!r.ok) { nvMsg('Este link não vale mais: ' + nvErro(r) + '.'); return false; }
    const f = r.body.ficha;
    nvEntrarLeitura(f.dados, (f.nome || 'Sem nome') + ' · ficha de ' + f.dono + ', só leitura', { publica: true });
    return true;
  } catch (e) { nvMsg(e.message); return false; }
}


/* ============================================================
   MESTRE: EDITAR A FICHA DE UM JOGADOR, ENTREGAR FICHAS
   ============================================================ */

/* abre ?ficha=<id> (vem do mapa): sua → biblioteca; de jogador da sua crônica → edição remota */
async function nvAbrirPorLink(id) {
  if (nvVisivel(id)) return nvAbrir(id);
  if (!nvLogado()) { nvMsg('Entre na conta para abrir essa ficha.'); return false; }
  try {
    const r = await nvChamar('GET', '/fichas/' + id);
    if (!r.ok) { nvMsg(r.status === 404 ? 'Essa ficha não existe ou não é sua.' : nvErro(r)); return false; }
    if (r.body.permissao === 'dono') { nvAceitarDoServidor(r.body.ficha); nvGravarIndice(); return nvAbrir(id); }
    await nvEditarRemota(id, r.body);
    return 'remota';
  } catch (e) { nvMsg(e.message); return false; }
}

async function nvEditarRemota(id, ja) {
  let r = ja;
  if (!r) {
    try { const x = await nvChamar('GET', '/fichas/' + id); if (!x.ok) return nvMsg(nvErro(x)); r = x.body; }
    catch (e) { return nvMsg(e.message); }
  }
  if (r.permissao === 'dono') { nvAceitarDoServidor(r.ficha); nvGravarIndice(); uiIr('#/ficha/' + id); return true; }
  await nvSairRemota(false);
  nvSairLeitura(false);
  const antes = { S, id: S._id };
  NV.remota = { id, versao: r.ficha.versao, dono: r.ficha.dono || 'jogador', nome: r.ficha.nome, antes, timer: null, ultimo: '',
    voltar: /^#\/(leitura|remota|ficha)/.test(location.hash) ? '' : location.hash };
  S = adotar(r.ficha.dados);
  S._id = id;
  NV.remota.ultimo = JSON.stringify(S);
  document.body.classList.add('nv-remota');
  const t = el('nv-remota-titulo');
  if (t) t.textContent = 'Editando a ficha de ' + NV.remota.dono + ' — cada mudança salva na conta dele(a) e fica no histórico com o seu nome.';
  nvRemotaStatus('');
  render();
  uiIr('#/remota/' + id + '/editar');
  return true;
}

function nvRemotaStatus(t) { const e = el('nv-remota-status'); if (e) e.textContent = t; }

function nvAgendarRemota() {
  const R = NV.remota;
  if (!R) return;
  const json = JSON.stringify(S);
  if (json === R.ultimo) return;
  nvRemotaStatus('salvando…');
  clearTimeout(R.timer);
  R.timer = setTimeout(nvSalvarRemota, 1200);
}

async function nvSalvarRemota() {
  const R = NV.remota;
  if (!R || R.salvando) return;
  const json = JSON.stringify(S);
  if (json === R.ultimo) { nvRemotaStatus('salvo'); return; }
  R.salvando = true;
  try {
    const r = await nvChamar('PUT', '/fichas/' + R.id, { dados: JSON.parse(json), versao_base: R.versao });
    if (r.ok) {
      R.versao = r.body.ficha.versao; R.ultimo = json;
      nvRemotaStatus('salvo ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } else if (r.status === 409 && r.body.atual && r.body.atual.dados) {
      /* o jogador mexeu ao mesmo tempo: vale a versão dele; o mestre refaz a mudança */
      R.versao = r.body.atual.versao;
      S = adotar(r.body.atual.dados); S._id = R.id; R.ultimo = JSON.stringify(S);
      render();
      nvRemotaStatus('o jogador mudou a ficha agora: carreguei a versão dele, refaça sua última mudança');
    } else {
      nvRemotaStatus('não salvou: ' + nvErro(r));
    }
  } catch (e) {
    nvRemotaStatus(e.offline ? 'sem conexão: a mudança ainda não foi salva' : 'não salvou: ' + e.message);
  } finally {
    R.salvando = false;
    if (NV.remota === R && JSON.stringify(S) !== R.ultimo && !R.timer) nvAgendarRemota();
  }
}

async function nvSairRemota(redesenhar = true) {
  const R = NV.remota;
  if (!R) return;
  clearTimeout(R.timer); R.timer = null;
  if (JSON.stringify(S) !== R.ultimo) await nvSalvarRemota();
  NV.remota = null;
  document.body.classList.remove('nv-remota');
  if (R.antes && R.antes.S) { S = R.antes.S; if (R.antes.id) S._id = R.antes.id; else delete S._id; }
  if (NV.np && NV.np.id) nvCarregarPainel(true);
  if (redesenhar) { render(); uiIr(R.voltar || (NV.cronica ? '#/cronicas/' + NV.cronica.cronica.id : '#/cronicas')); }
}

/* aba "Esta ficha": o mestre entrega uma ficha sua a um jogador da crônica */
function nvBlocoEntregar(m) {
  const cr = m && m.cronica_id && (NV.cronicas || []).find(c => c.id === m.cronica_id);
  if (!cr || cr.papel !== 'narrador' || !m.versao) return '';
  const membros = NV.membros[cr.id];
  if (!membros) {
    nvChamar('GET', '/cronicas/' + cr.id).then(r => { if (r.ok) { NV.membros[cr.id] = r.body.membros; nvRedesenhar(); } }).catch(() => {});
    return '';
  }
  const jogadores = membros.filter(p => p.papel !== 'narrador');
  if (!jogadores.length) return '';
  return `<h3 class="nv-h3">Entregar a um jogador</h3>
    <div class="adder" style="margin-top:0;border-top:0;padding-top:0">
      <label class="sr" for="nv-entregar">Jogador</label><select class="f" id="nv-entregar">${jogadores.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select>
      <button type="button" class="btn" data-nv="entregar">Entregar</button>
    </div>
    <p class="note" style="margin:4px 0 0">A ficha passa a ser do jogador. Você continua vendo e editando pela crônica.</p>`;
}

async function nvEntregar() {
  const m = NV.indice.fichas[S._id];
  const sel = el('nv-entregar');
  if (!m || !sel || !sel.value) return;
  const nome = sel.options[sel.selectedIndex].text;
  if (!confirm('Entregar "' + (m.nome || 'Sem nome') + '" para ' + nome + '? A ficha sai da sua lista e passa a ser dele.')) return;
  if (!(await nvGarantirNoServidor())) return nvMsg(NV.msg || 'A ficha ainda não subiu para o servidor.');
  try {
    const r = await nvChamar('POST', '/fichas/' + m.id + '/transferir', { usuario_id: sel.value, cronica_id: m.cronica_id });
    if (!r.ok) return nvMsg(nvErro(r));
    delete NV.indice.fichas[m.id]; nvApagar(NV_CHAVE.ficha + m.id); delete NV.ultimo[m.id];
    nvGravarIndice();
    nvSemFicha();
    nvMsg('Ficha entregue a ' + r.body.para + '. Ela aparece em Crônicas, nas fichas do grupo, para você continuar acompanhando.');
  } catch (e) { nvMsg(e.message); }
}

/* ============================================================
   INTERFACE — telas Minhas fichas, Crônicas e Conta
   (a casca, as rotas e os menus ficam em interface.js)
   ============================================================ */
function nvMsg(t) { NV.msg = t || ''; if (t && typeof uiAviso === 'function') uiAviso(t); }

/* instalar como app: o botão só aparece quando dá para instalar (ou no iPhone, com a dica) */
function nvPodeInstalar() {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return '';
    if (window.__fsInstalar) return 'prompt';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios && /^https:$/.test(location.protocol) ? 'ios' : '';
  } catch (e) { return ''; }
}
async function nvInstalar() {
  const tipo = nvPodeInstalar();
  if (tipo === 'prompt') {
    const p = window.__fsInstalar; window.__fsInstalar = null;
    try { p.prompt(); const r = await p.userChoice; if (r && r.outcome === 'accepted') nvMsg('Instalado. Agora a Ficha de Sangue abre como um app.'); } catch (e) {}
    nvBarra();
    return nvRedesenhar();
  }
  if (tipo === 'ios') nvMsg('No iPhone ou iPad: toque em Compartilhar (o quadrado com a seta) e depois em "Adicionar à Tela de Início".');
}
document.addEventListener('fs-instalavel', () => nvRedesenhar());

const NV_ICONE = {
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
  senha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H4"/></svg>',
  instalar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/></svg>',
  tema: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  copiar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  mais1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  importar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  cadeado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  nuvem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9Z"/></svg>'
};

/* ---------- conta (canto direito da barra) ---------- */
function nvContaTopo() {
  const z = el('conta-topo');
  if (!z) return;
  if (!nvApi()) { z.innerHTML = ''; return; }
  if (!nvLogado()) {
    z.innerHTML = '<a class="btn sm" href="entrar/">Entrar</a> <a class="btn sm primary" href="entrar/#criar">Criar conta</a>';
    return;
  }
  const u = NV.conta.usuario;
  const ini = esc((u.nome || u.email || '?').trim().charAt(0).toUpperCase());
  z.innerHTML =
    '<div class="menu-w conta-wrap">' +
      '<button type="button" class="conta-chip" id="btn-conta" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-conta">' +
        '<span class="ava" aria-hidden="true">' + ini + '</span><span class="conta-nome">' + esc(u.nome || u.email) + '</span><span class="sr">— menu da conta</span>' +
      '</button>' +
      '<div class="menu" id="menu-conta" role="menu" aria-label="Sua conta" hidden>' +
        '<div class="menu-cab" aria-hidden="true"><strong>' + esc(u.nome) + '</strong><span>' + esc(u.email) + '</span></div>' +
        nvItensConta(true) +
      '</div>' +
    '</div>';
}
/* os mesmos itens no menu (desktop) e na tela Conta (celular) */
function nvItensConta(menu) {
  const r = menu ? ' role="menuitem"' : '';
  const it = (acao, ic, t, sub, extra) => `<button type="button" class="mi${extra || ''}"${r} data-nv="${acao}">${NV_ICONE[ic]}<span><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const inst = nvPodeInstalar();
  return [
    nvLogado() ? it('sync', 'sync', 'Sincronizar agora', esc(nvTextoStatus())) : '',
    nvLogado() ? it('senha-abrir', 'senha', 'Trocar senha') : '',
    inst && !menu ? it('instalar', 'instalar', 'Instalar o app', 'Abre direto, como um aplicativo') : '',
    menu ? '' : it('tema', 'tema', 'Tema claro ou escuro'),
    nvLogado() ? (menu ? '<hr>' : '') + it('sair', 'sair', 'Sair da conta', 'As fichas continuam no servidor', ' perigo') : ''
  ].join('');
}

function nvTextoStatus() {
  const pend = nvLogado() ? Object.values(NV.indice.fichas).filter(m => m.sujo && m.conta === NV.conta.usuario.id).length : 0;
  if (!nvApi()) return '';
  if (!nvLogado()) return 'Só neste navegador';
  if (NV.sincronizando) return 'Sincronizando…';
  if (!navigator.onLine) return 'Offline · ' + (pend ? pend + ' para enviar' : 'tudo salvo aqui');
  if (pend) return pend + ' para enviar';
  if (/^(sincronizado|não sincronizou|erro|servidor|sem espaço)/.test(NV.status)) return NV.status.charAt(0).toUpperCase() + NV.status.slice(1);
  return 'Sincronizado';
}

function nvBarra() {
  const b = el('nv-status');
  if (b) {
    const pend = nvLogado() ? Object.values(NV.indice.fichas).filter(m => m.sujo && m.conta === NV.conta.usuario.id).length : 0;
    const t = nvTextoStatus();
    if (b.textContent !== t) { b.textContent = t; b.title = t; }
    b.dataset.estado = !nvLogado() ? 'local' : (!navigator.onLine ? 'offline' : (NV.sincronizando ? 'sync' : (pend ? 'pendente' : 'ok')));
  }
  const bi = el('btn-instalar'); if (bi) bi.hidden = !nvPodeInstalar();
  const chip = el('btn-conta');
  if (!chip || !nvLogado() || chip.dataset.u !== NV.conta.usuario.id) { nvContaTopo(); const c = el('btn-conta'); if (c && nvLogado()) c.dataset.u = NV.conta.usuario.id; }
}

/* redesenha só a tela aberta (e o diálogo da ficha), sem refazer a ficha inteira */
function nvRedesenhar() {
  nvBarra();
  if (typeof uiRedesenharTela === 'function') uiRedesenharTela();
}

function nvEtiqueta(m) {
  if (!nvLogado() || !m.conta) return '';
  if (m.sujo) return '<span class="selo alerta">a enviar</span>';
  return '';
}

/* ---------- Minhas fichas ---------- */
const NV_FILTRO_CHAVE = 'ficha-de-sangue:filtro';
function nvFiltro() {
  if (!NV.filtro) NV.filtro = Object.assign({ q: '', sis: '', cronica: '', ordem: 'recentes' }, nvLer(NV_FILTRO_CHAVE, {}) || {}, { q: '' });
  return NV.filtro;
}
function nvGuardarFiltro() { const f = nvFiltro(); nvGravar(NV_FILTRO_CHAVE, { sis: f.sis, cronica: f.cronica, ordem: f.ordem }); }
const nvNorm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* nome, clã/credo, geração e conceito, tirados da ficha guardada (o índice antigo não tinha geração) */
function nvCartao(m) {
  const d = nvDadosLocais(m.id) || {};
  const meta = d.meta || {};
  const cac = d.sistema === 'cacador' || (m.resumo && m.resumo.sistema === 'cacador');
  return {
    id: m.id, nome: meta.nome || m.nome || '', cac,
    cla: cac ? (d.credo || (m.resumo && m.resumo.cla) || '') : (meta.cla || (m.resumo && m.resumo.cla) || ''),
    geracao: cac ? '' : (meta.geracao || ''),
    conceito: meta.conceito || (m.resumo && m.resumo.conceito) || '',
    m
  };
}

function nvTelaFichas() {
  const F = nvFiltro();
  const nomeCr = id => { const c = (NV.cronicas || []).find(x => x.id === id); return c ? c.nome : ''; };
  if (nvLogado() && NV.cronicas == null) nvCarregarCronicas();
  const todas = nvFichasVisiveis().map(nvCartao);
  const q = nvNorm(F.q);
  let lista = todas.filter(c =>
    (!F.sis || (F.sis === 'cacador') === c.cac) &&
    (!F.cronica || (F.cronica === '_sem' ? !c.m.cronica_id : c.m.cronica_id === F.cronica)) &&
    (!q || nvNorm([c.nome, c.cla, c.conceito].join(' ')).includes(q)));
  if (F.ordem === 'nome') lista.sort((a, b) => (a.nome || '~').localeCompare(b.nome || '~', 'pt-BR'));
  const filtrando = !!(F.q || F.sis || F.cronica);
  const usadas = [...new Set(todas.map(c => c.m.cronica_id).filter(Boolean))];
  const opCr = (NV.cronicas || []).filter(c => usadas.includes(c.id));

  const cartao = c => {
    const atual = c.id === S._id && !NV.semFicha && !NV.leitura && !NV.remota;
    const sub = c.cac ? 'Caçador' + (c.cla ? ' · ' + c.cla : '') : (c.cla || 'Sem clã') + (c.geracao ? ' · ' + c.geracao + 'ª geração' : '');
    const letra = esc(((c.cla || c.nome || '?').trim().charAt(0) || '?').toUpperCase());
    const nome = esc(c.nome || 'Sem nome');
    const cr = c.m.cronica_id && nomeCr(c.m.cronica_id);
    return `<article class="fcard${atual ? ' atual' : ''}" aria-labelledby="fc-${c.id}">
      <div class="fcard-b">
        <div class="fcard-id"><span class="mono${c.cac ? '' : ' v'}" aria-hidden="true">${letra}</span>
          <div style="min-width:0"><h2 id="fc-${c.id}"><a href="#/ficha/${c.id}">${nome}</a></h2><div class="cla">${esc(sub)}</div></div></div>
        ${c.conceito ? `<p class="conc">${esc(c.conceito)}</p>` : ''}
        <div class="selos">${cr ? `<span class="selo">${esc(cr)}</span>` : ''}${nvEtiqueta(c.m)}${atual ? '<span class="selo sangue">aberta por último</span>' : ''}<span class="quando">editada ${esc(nvQuando(c.m.atualizadoEm))}</span></div>
      </div>
      <div class="fcard-p">
        <a class="btn ver${atual ? ' primary' : ''}" href="#/ficha/${c.id}">Ver ficha<span class="sr"> de ${nome}</span></a>
        <div class="menu-w">
          <button type="button" class="icob" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-c-${c.id}" aria-label="Mais ações para ${nome}">${NV_ICONE.mais}</button>
          <div class="menu" id="menu-c-${c.id}" role="menu" aria-label="Ações de ${nome}" hidden>
            <a class="mi" role="menuitem" href="#/ficha/${c.id}/editar">${NV_ICONE.editar}<span><b>Editar</b></span></a>
            <button type="button" class="mi" role="menuitem" data-nv="duplicar" data-id="${c.id}">${NV_ICONE.copiar}<span><b>Duplicar</b></span></button>
            <hr>
            <button type="button" class="mi perigo" role="menuitem" data-nv="excluir" data-id="${c.id}">${NV_ICONE.lixo}<span><b>Excluir</b></span></button>
          </div>
        </div>
      </div>
    </article>`;
  };

  const faixa = !nvApi() ? `<div class="faixa">${NV_ICONE.cadeado}<p>As fichas ficam salvas neste navegador.</p></div>`
    : !nvLogado() ? `<div class="faixa" role="note">${NV_ICONE.nuvem}<p><strong>Suas fichas estão só neste navegador.</strong> Entre na conta para guardá-las, usar em qualquer aparelho e participar de crônicas.</p>
        <div class="acoes"><a class="btn sm" href="entrar/">Entrar</a><a class="btn sm primary" href="entrar/#criar">Criar conta</a></div></div>` : '';

  const seg = (v, t) => `<button type="button" class="btn seg-b" data-nv="filtro-sis" data-v="${v}" aria-pressed="${F.sis === v}">${t}</button>`;
  return `
    <div class="pg-h">
      <div class="t"><div class="olho">${nvLogado() ? 'Na sua conta' : 'Neste navegador'} · ${todas.length} ficha${todas.length === 1 ? '' : 's'}</div>
        <h1 id="t-fichas">Minhas fichas</h1></div>
      <button type="button" class="btn" data-acao="importar">${NV_ICONE.importar}Importar</button>
      <button type="button" class="btn primary" data-acao="nova">${NV_ICONE.mais1}Nova ficha</button>
    </div>
    ${faixa}
    ${todas.length ? `
    <form class="filtros" role="search" aria-label="Filtrar fichas" onsubmit="return false">
      <label class="campo busca"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <span class="sr">Buscar fichas</span><input type="search" id="f-busca" value="${esc(F.q)}" placeholder="Buscar por nome, clã ou conceito" autocomplete="off"></label>
      <div class="seg" role="group" aria-label="Sistema">${seg('', 'Todas')}${seg('vampiro', 'Vampiro')}${seg('cacador', 'Caçador')}</div>
      ${opCr.length || F.cronica ? `<label class="campo"><span class="olho">Crônica</span><select id="f-cronica">
        <option value="">Todas</option>${opCr.map(c => `<option value="${c.id}"${F.cronica === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        <option value="_sem"${F.cronica === '_sem' ? ' selected' : ''}>Sem crônica</option></select></label>` : ''}
      <label class="campo"><span class="olho">Ordem</span><select id="f-ordem">
        <option value="recentes"${F.ordem !== 'nome' ? ' selected' : ''}>Editadas por último</option>
        <option value="nome"${F.ordem === 'nome' ? ' selected' : ''}>Nome (A–Z)</option></select></label>
      <span class="contagem" aria-live="polite">${filtrando ? lista.length + ' de ' + todas.length : ''}</span>
    </form>` : ''}
    <div id="fichas-resultado">
    ${!todas.length ? `<div class="vazio"><h2>Nenhuma ficha ainda</h2>
        <p>Comece uma ficha sorteada — completa e válida em um clique — ou monte a sua do zero.</p>
        <div class="acoes"><button type="button" class="btn lg primary" data-acao="nova">${NV_ICONE.mais1}Criar a primeira ficha</button>
          <button type="button" class="btn lg" data-acao="importar">${NV_ICONE.importar}Importar PDF ou JSON</button></div></div>`
      : !lista.length ? `<div class="vazio"><h2>Nada encontrado</h2><p>Nenhuma ficha combina com esses filtros.</p>
        <div class="acoes"><button type="button" class="btn" data-nv="filtro-limpar">Limpar filtros</button></div></div>`
      : `<div class="fichas-grade">${lista.map(cartao).join('')}
          ${filtrando ? '' : `<button type="button" class="nova-cartao" data-acao="nova">${NV_ICONE.mais1}Nova ficha<small>sorteada, pela Forja ou em branco</small></button>`}</div>`}
    </div>
    <p class="rodape-nota">${NV_ICONE.cadeado}Só você vê estas fichas. O narrador vê as que você colocar numa crônica dele.</p>`;
}

/* ---------- Crônicas ---------- */
function nvTelaCronicas(idPedido) {
  const cab = `<div class="pg-h"><div class="t"><div class="olho">Grupos de jogo</div><h1 id="t-cronicas">Crônicas</h1></div></div>`;
  if (!nvApi()) return cab + '<div class="cr-vazio">As crônicas usam a conta na nuvem, que não está ligada neste site.</div>';
  if (!nvLogado()) return cab + `<div class="vazio"><h2>Entre para jogar em grupo</h2>
      <p>Numa crônica, o narrador acompanha as fichas do grupo e abre o mapa da cidade para todos.</p>
      <div class="acoes"><a class="btn lg" href="entrar/">Entrar</a><a class="btn lg primary" href="entrar/#criar">Criar conta</a></div></div>`;
  if (NV.cronicas == null) { nvCarregarCronicas(); return cab + '<p class="note">Carregando…</p>'; }

  const c = NV.cronica && idPedido && NV.cronica.cronica.id === idPedido ? NV.cronica : null;
  if (idPedido && !c && !NV.carregando.cronica) nvAbrirCronica(idPedido);
  const lista = `
    <aside class="cr-lista${idPedido ? ' com-sel' : ''}" aria-label="Suas crônicas">
      ${NV.cronicas.length ? NV.cronicas.map(x => `
        <a class="cr-item" href="#/cronicas/${x.id}"${idPedido === x.id ? ' aria-current="page"' : ''}><strong>${esc(x.nome)}</strong>
          <span>${x.papel === 'narrador' ? 'Você narra' : 'Narrada por ' + esc(x.narrador) + ' · você joga'} · ${x.membros} pessoa${x.membros == 1 ? '' : 's'} · ${x.fichas} ficha${x.fichas == 1 ? '' : 's'}</span></a>`).join('')
        : '<p class="note" style="margin:0">Você ainda não está em nenhuma crônica.</p>'}
      <form class="cr-form" onsubmit="return false" aria-labelledby="cr-entrar-t">
        <label class="olho" id="cr-entrar-t" for="nv-cr-codigo">Entrar com o código do narrador</label>
        <div class="linha"><span class="campo"><input id="nv-cr-codigo" placeholder="Ex.: K7QM-3XRA" autocomplete="off" autocapitalize="characters"></span><button type="button" class="btn" data-nv="cr-entrar">Entrar</button></div>
      </form>
      <form class="cr-form" onsubmit="return false" aria-labelledby="cr-criar-t">
        <label class="olho" id="cr-criar-t" for="nv-cr-nome">Narrar uma crônica nova</label>
        <div class="linha"><span class="campo"><input id="nv-cr-nome" placeholder="Nome da crônica" autocomplete="off"></span><button type="button" class="btn" data-nv="cr-criar">Criar</button></div>
      </form>
    </aside>`;
  let det;
  if (!idPedido) det = `<div class="cr-det cr-placeholder"><div class="cr-vazio">${NV.cronicas.length ? 'Escolha uma crônica ao lado para ver o grupo, as fichas e o mapa.' : 'Entre com o código que o narrador passou, ou crie uma crônica para narrar.'}</div></div>`;
  else if (!c) det = '<div class="cr-det"><p class="note">Carregando a crônica…</p></div>';
  else det = `<section class="cr-det" aria-labelledby="cr-t">${nvHtmlCronica(c)}</section>`;
  return cab + `<div class="cr-layout${idPedido ? ' tem-sel' : ''}">${lista}${det}</div>`;
}

function nvHtmlCronica(c) {
  const narra = c.papel === 'narrador';
  const id = c.cronica.id;
  const resumo = (NV.cronicas || []).find(x => x.id === id) || {};
  const abas = narra ? [['fichas', 'Fichas do grupo'], ['jogadores', 'Jogadores'], ['atividade', 'Atividade'], ['config', 'Configurar']]
                     : [['fichas', 'Fichas do grupo'], ['pessoas', 'Pessoas']];
  if (!abas.some(([k]) => k === NV.crAba)) NV.crAba = 'fichas';
  const aba = NV.crAba;
  const corpo = narra ? nvPainelAba(c, aba) : nvJogadorAba(c, aba);
  return `
    <a class="migalha cr-voltar" href="#/cronicas"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>Todas as crônicas</a>
    <div class="cr-cab">
      <div class="t"><div class="olho sangue">${narra ? 'Você narra' : 'Narrada por ' + esc(resumo.narrador || 'outra pessoa') + ' · você joga'}</div><h2 id="cr-t">${esc(c.cronica.nome)}</h2></div>
      <a class="btn lg primary" href="mapa/?cronica=${esc(id)}">${NV_ICONE.mapa}Abrir o mapa</a>
    </div>
    ${narra ? nvPainelStats(c) : ''}
    <div class="abas" role="tablist" aria-label="${esc(c.cronica.nome)}">
      ${abas.map(([k, t]) => `<button type="button" role="tab" id="cra-${k}" aria-controls="crp-${k}" aria-selected="${aba === k}" tabindex="${aba === k ? 0 : -1}" data-nv="cr-aba" data-aba="${k}">${t}</button>`).join('')}
    </div>
    <div role="tabpanel" id="crp-${aba}" aria-labelledby="cra-${aba}" tabindex="0">${corpo}</div>`;
}

/* jogador: vê o grupo (só nomes), abre as próprias fichas e põe uma ficha sua na crônica */
function nvJogadorAba(c, aba) {
  const eu = NV.conta.usuario.id;
  if (aba === 'pessoas') {
    return c.membros.map(p => `<div class="np-jog"><strong>${esc(p.nome)}</strong> <span class="tag">${p.papel === 'narrador' ? 'narrador' : 'jogador'}</span>
      ${p.id === eu && p.papel !== 'narrador' ? `<button type="button" class="btn sm danger" style="margin-left:auto" data-nv="cr-remover" data-id="${c.cronica.id}" data-u="${p.id}">Sair da crônica</button>` : ''}</div>`).join('');
  }
  const minhasFora = nvFichasVisiveis().filter(m => m.conta === eu && m.cronica_id !== c.cronica.id);
  return `
    ${c.fichas.length ? c.fichas.map(f => {
      const minha = f.dono_id === eu;
      return `<div class="np-ficha">
        <div class="np-f-nome"><strong>${esc(f.nome || 'Sem nome')}</strong>
          <span class="nv-sub">${esc([minha ? 'sua' : f.dono, f.resumo && f.resumo.cla].filter(Boolean).join(' · '))}</span></div>
        <div></div><div class="nv-sub">mudou ${esc(nvQuando(f.atualizado_em))}</div>
        <div class="np-f-a">${minha ? `<a class="btn sm" href="#/ficha/${f.id}">Abrir</a>` : '<span class="nv-sub" title="Só o dono e o narrador abrem a ficha completa">ficha privada</span>'}</div></div>`;
    }).join('') : '<p class="note">Nenhuma ficha nesta crônica ainda.</p>'}
    ${minhasFora.length ? `<div class="adder">
      <label class="sr" for="cr-por-sel">Ficha sua para pôr nesta crônica</label>
      <select class="f" id="cr-por-sel">${minhasFora.map(m => `<option value="${m.id}">${esc(m.nome || 'Sem nome')}</option>`).join('')}</select>
      <button type="button" class="btn" data-nv="cr-por-ficha" data-id="${c.cronica.id}">Pôr nesta crônica</button></div>
      <p class="note" style="margin:6px 0 0">O narrador passa a ver e acompanhar a ficha. Você pode tirar quando quiser, em Ficha → Crônica e compartilhar.</p>` : ''}`;
}

function nvPainelDados(c) {
  const P = NV.np && NV.np.id === c.cronica.id ? NV.np : null;
  if (!P) { nvCarregarPainel(); return null; }
  return P;
}
function nvPainelStats(c) {
  const P = nvPainelDados(c);
  const conv = `<div class="stat convite"><span class="olho">Código de convite</span>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px"><code class="nv-codigo">${esc(c.cronica.codigo_convite)}</code>
      <button type="button" class="btn sm" data-nv="cr-copiar-codigo" data-codigo="${esc(c.cronica.codigo_convite)}">Copiar</button></div></div>`;
  if (!P || !P.dados) return `<div class="stats">${conv}</div>`;
  const D = P.dados, eu = NV.conta.usuario.id;
  const jogadores = D.membros.filter(p => p.papel !== 'narrador');
  const dosJog = D.fichas.filter(f => f.dono_id !== eu).map(f => Object.assign({}, f, { sit: nvSituacao(f.dados) }));
  const comPend = dosJog.filter(f => f.sit.pend.length).length;
  const ativos = jogadores.filter(p => p.ativo).length;
  return `<div class="stats">
    <div class="stat"><b>${jogadores.length}</b><span>jogador${jogadores.length === 1 ? '' : 'es'}${ativos ? ` · ${ativos} ativo${ativos > 1 ? 's' : ''}` : ''}</span></div>
    <div class="stat"><b>${dosJog.length}</b><span>ficha${dosJog.length === 1 ? '' : 's'} de jogador</span></div>
    <div class="stat${comPend ? ' alerta' : ''}"><b>${comPend}</b><span>com pendência</span></div>
    ${conv}</div>`;
}

/* narrador: cada aba do painel */
function nvPainelAba(c, aba) {
  if (aba === 'config') {
    return `<div class="np-at"><strong>Código de convite</strong><p class="note" style="margin:4px 0 8px">Gerar outro faz o código antigo parar de funcionar — útil se ele vazou.</p>
        <button type="button" class="btn" data-nv="cr-convite" data-id="${c.cronica.id}">Gerar outro código</button></div>
      <div class="np-at"><strong>Excluir a crônica</strong><p class="note" style="margin:4px 0 8px">As fichas continuam com os donos; só saem da crônica. O mapa desta crônica é apagado.</p>
        <button type="button" class="btn danger" data-nv="cr-excluir" data-id="${c.cronica.id}">Excluir crônica</button></div>`;
  }
  const P = nvPainelDados(c);
  if (!P || (!P.dados && !P.erro)) return '<p class="note">Carregando o painel…</p>';
  if (!P.dados) return `<p class="err">${esc(P.erro)}</p><div class="adder"><button type="button" class="btn sm" data-nv="np-atualizar">Tentar de novo</button></div>`;
  const D = P.dados, eu = NV.conta.usuario.id;
  const atualizado = `<div class="np-h"><span class="nv-sub" style="display:inline">${P.carregando ? 'atualizando…' : 'atualizado ' + esc(nvQuando(new Date(P.em).toISOString()))}</span>
      <button type="button" class="btn sm ghost" data-nv="np-atualizar" style="margin-left:auto">Atualizar</button></div>`;
  const jogadores = D.membros.filter(p => p.papel !== 'narrador');
  if (aba === 'jogadores') {
    const visto = p => p.ativo ? 'ativo agora' : p.ultimo_acesso ? 'visto ' + nvQuando(p.ultimo_acesso) : 'ainda não entrou';
    return atualizado + (jogadores.length ? jogadores.map(p => {
      const fs = D.fichas.filter(f => f.dono_id === p.id);
      return `<div class="np-jog"><span class="np-dot${p.ativo ? ' on' : ''}" aria-hidden="true"></span>
        <span><strong>${esc(p.nome)}</strong> <span class="nv-sub" style="display:inline">${esc(visto(p))}</span></span>
        <span class="nv-sub" style="display:inline">${fs.length ? esc(fs.map(f => f.nome || 'Sem nome').join(', ')) : 'sem ficha na crônica'}</span>
        <button type="button" class="btn sm ghost danger" style="margin-left:auto" data-nv="cr-remover" data-id="${c.cronica.id}" data-u="${p.id}">Remover</button></div>`;
    }).join('') : `<p class="note">Ninguém entrou ainda. Passe o código <code class="nv-codigo">${esc(c.cronica.codigo_convite)}</code> para os jogadores.</p>`);
  }
  if (aba === 'atividade') {
    return atualizado + (D.atividade.length ? D.atividade.slice(0, 20).map(a => `<div class="np-at">
        <div class="np-at-h"><strong>${esc(a.autor || 'alguém')}</strong> ${a.mudancas && a.mudancas.criada ? 'criou' : 'mudou'}
          <strong>${esc(a.ficha || 'Sem nome')}</strong>${a.dono && a.dono !== a.autor ? ` <span class="nv-sub" style="display:inline">(de ${esc(a.dono)})</span>` : ''}
          <span class="nv-sub" style="display:inline">· ${esc(nvQuando(a.criado_em))} · v${a.versao}</span>
          <button type="button" class="btn sm ghost" style="margin-left:auto" data-nv="h-abrir" data-id="${a.ficha_id}" data-nome="${esc(a.ficha || 'Sem nome')}">Histórico</button></div>
        ${nvHtmlMudancas(a.mudancas, { max: 6 })}</div>`).join('') : '<p class="note">Nada mudou ainda.</p>');
  }
  const fichas = D.fichas.map(f => Object.assign({}, f, { sit: nvSituacao(f.dados) }));
  const dosJog = fichas.filter(f => f.dono_id !== eu), minhas = fichas.filter(f => f.dono_id === eu);
  const linhaFicha = f => {
    const s = f.sit, deJog = f.dono_id !== eu;
    const num = (r, v, t) => v == null ? '' : `<span class="np-num" title="${esc(t || r)}"><span>${esc(r)}</span><b>${esc(v)}</b></span>`;
    return `<div class="np-ficha${s.pend.length ? ' np-pend' : ''}">
      <div class="np-f-nome"><strong>${esc(f.nome || 'Sem nome')}</strong>
        <span class="nv-sub">${esc([deJog ? f.dono : 'sua (NPC ou a entregar)', s.cacador ? 'Caçador' : f.resumo && f.resumo.cla, f.resumo && f.resumo.conceito].filter(Boolean).join(' · '))}</span></div>
      <div class="np-nums">${num('XP', s.xpDisp, 'XP para gastar')}${num('Hum', s.hum, 'Humanidade')}${num('Fome', s.fome)}${s.dano ? `<span class="np-dano">${esc(s.dano)}</span>` : ''}</div>
      <div class="np-f-st">${s.pend.length ? `<span class="tag blood">${s.pend.length} pendência${s.pend.length > 1 ? 's' : ''}</span>` : '<span class="tag np-ok">criação ok</span>'}
        <span class="nv-sub" style="display:inline">mudou ${esc(nvQuando(f.atualizado_em))}${f.ultimo_autor ? ' · ' + esc(f.ultimo_autor) : ''}</span></div>
      ${s.pend.length ? `<div class="np-pend-l">${s.pend.map(esc).join(' · ')}</div>` : ''}
      <div class="np-f-a">
        ${deJog ? `<button type="button" class="btn sm" data-nv="cr-ler" data-id="${f.id}">Ver</button>
                   <button type="button" class="btn sm" data-nv="cr-editar" data-id="${f.id}" title="Cada mudança salva na conta do jogador e fica no histórico com o seu nome">Editar</button>`
                : `<a class="btn sm" href="#/ficha/${f.id}">Abrir</a>`}
        <button type="button" class="btn sm ghost" data-nv="h-abrir" data-id="${f.id}" data-nome="${esc(f.nome || 'Sem nome')}">Histórico</button>
      </div></div>`;
  };
  return atualizado +
    (dosJog.length ? dosJog.map(linhaFicha).join('') : '<p class="note">Nenhuma ficha de jogador nesta crônica ainda. O jogador põe a ficha dele na crônica pela tela da crônica ou pelo menu Ficha.</p>') +
    (minhas.length ? `<h3 class="np-t">Suas fichas na crônica</h3>${minhas.map(linhaFicha).join('')}` : '');
}

/* diálogo "Crônica e compartilhar" da ficha aberta */
function nvAbaFicha() {
  if (!nvApi()) return '<p class="note" style="margin:0">Crônica, histórico e link de leitura usam a conta na nuvem, que não está ligada neste site.</p>';
  if (!nvLogado()) return `<p class="note" style="margin:0 0 12px">Entre na conta para pôr esta ficha numa crônica, ter histórico de versões e criar um link de leitura.</p>
    <div style="display:flex;gap:8px"><a class="btn" href="entrar/">Entrar</a><a class="btn primary" href="entrar/#criar">Criar conta</a></div>`;
  const m = NV.indice.fichas[S._id] || {};
  if (NV.cronicas == null) nvCarregarCronicas();
  if (NV.versoes == null) { nvCarregarVersoes(); }
  const opcoes = (NV.cronicas || []).map(c => `<option value="${c.id}"${m.cronica_id === c.id ? ' selected' : ''}>${esc(c.nome)}${c.papel === 'narrador' ? ' (você narra)' : ''}</option>`).join('');
  return `
    <h3 class="nv-h3" style="margin-top:0">Crônica</h3>
    <label class="lbl" for="nv-cr-ficha">Crônica desta ficha</label>
    <select class="f" id="nv-cr-ficha"><option value="">Nenhuma</option>${opcoes}</select>
    <p class="note" style="margin:6px 0 0">${(NV.cronicas || []).length ? 'Quem narra a crônica vê e acompanha a ficha.' : 'Você ainda não está em nenhuma crônica. Entre com um código em <a href="#/cronicas">Crônicas</a>.'}</p>
    ${nvBlocoEntregar(m)}
    <h3 class="nv-h3">Link de leitura</h3>
    ${(NV.links || []).map(l => `<div class="row" style="align-items:center">
        <code class="nv-link" style="flex:1;max-width:none">${esc(l.url)}</code>
        <button type="button" class="btn sm" data-nv="l-copiar" data-t="${esc(l.token)}">Copiar</button>
        <button type="button" class="btn sm ghost danger" data-nv="l-revogar" data-t="${esc(l.token)}">Desligar</button>
      </div>`).join('') || '<p class="note" style="margin:0">Nenhum link ativo.</p>'}
    <div class="adder"><button type="button" class="btn" data-nv="l-criar">Criar link</button>
      <span class="note">Quem tiver o link vê a ficha, sem conta e sem poder editar.</span></div>
    <h3 class="nv-h3">Versões</h3>
    ${NV.versoes == null ? '<p class="note">Carregando…</p>' : NV.versoes.length ? NV.versoes.slice(0, 5).map(v => `
      <div class="row" style="align-items:center">
        <span><strong>v${v.versao}</strong>${v.rotulo ? ` <span class="tag blood">${esc(v.rotulo)}</span>` : ''}
          <span class="nv-sub" style="display:inline">${esc(nvQuando(v.criado_em))}${v.autor ? ' · ' + esc(v.autor) : ''}</span></span>
        <span style="margin-left:auto;display:flex;gap:6px">
          <button type="button" class="btn sm ghost" data-nv="v-ver" data-v="${v.versao}">Ver</button>
          ${v.versao !== m.versao ? `<button type="button" class="btn sm" data-nv="v-restaurar" data-v="${v.versao}">Restaurar</button>` : '<span class="tag">atual</span>'}
        </span>
        <div class="nv-v-mud">${nvHtmlMudancas(v.mudancas)}</div>
      </div>`).join('') : '<p class="note">Sem versões ainda.</p>'}
    <div class="adder"><button type="button" class="btn" data-nv="v-marcar">Marcar esta versão</button>
      <button type="button" class="btn ghost" data-nv="h-abrir" data-id="${esc(S._id)}" data-nome="${esc(S.meta.nome || 'Sem nome')}">Histórico completo</button></div>
    <p class="note" style="margin:6px 0 0">Edições seguidas viram uma versão a cada 10 minutos. Marcar guarda uma com nome (ex.: "antes de gastar XP").</p>`;
}

/* ---------- Conta (tela própria no celular) ---------- */
function nvTelaConta() {
  const cab = `<div class="pg-h"><div class="t"><div class="olho">Preferências</div><h1 id="t-conta">Conta</h1></div></div>`;
  let topo;
  if (!nvApi()) {
    topo = `<div class="faixa">${NV_ICONE.cadeado}<p>As fichas ficam salvas neste navegador. A conta na nuvem ainda não foi ligada neste site.</p></div>
      <details style="margin:0 0 14px"><summary class="olho" style="cursor:pointer">Servidor</summary>
        <div class="adder"><label class="sr" for="nv-api">Endereço da API</label><input class="f" id="nv-api" placeholder="https://api…" value="${esc(nvApi())}"><button type="button" class="btn sm" data-nv="api">Usar</button></div></details>`;
  } else if (!nvLogado()) {
    topo = `<div class="conta-cab"><span class="ava" aria-hidden="true">?</span><div style="flex:1"><strong>Sem conta</strong><div class="nv-sub">As fichas ficam só neste navegador</div></div></div>
      <div style="display:flex;gap:10px;margin-bottom:14px"><a class="btn lg" href="entrar/" style="flex:1">Entrar</a><a class="btn lg primary" href="entrar/#criar" style="flex:1">Criar conta</a></div>`;
  } else {
    const u = NV.conta.usuario;
    topo = `<div class="conta-cab"><span class="ava" aria-hidden="true">${esc((u.nome || u.email || '?').trim().charAt(0).toUpperCase())}</span>
      <div style="flex:1;min-width:0"><strong style="font-family:var(--f-disp);font-size:20px">${esc(u.nome)}</strong><div class="nv-sub">${esc(u.email)}</div></div></div>`;
  }
  return cab + `<div class="conta-tela">${topo}<div class="lista-acoes">${nvItensConta(false)}</div></div>`;
}

/* ---------- eventos ---------- */
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-nv]');
  if (!t) return;
  const a = t.dataset.nv, id = t.dataset.id;
  ev.preventDefault();
  if (typeof uiFecharMenus === 'function') uiFecharMenus();
  if (a === 'abrir') return uiIr('#/ficha/' + id);
  if (a === 'duplicar') return nvDuplicar(id);
  if (a === 'excluir') return nvExcluir(id);
  if (a === 'filtro-sis') { nvFiltro().sis = t.dataset.v; nvGuardarFiltro(); return nvRedesenhar(); }
  if (a === 'filtro-limpar') { Object.assign(nvFiltro(), { q: '', sis: '', cronica: '' }); nvGuardarFiltro(); return nvRedesenhar(); }
  if (a === 'sair') return nvSair();
  if (a === 'senha-abrir') return uiAbrirDialogo('dlg-senha');
  if (a === 'sync') return nvSincronizar();
  if (a === 'tema') return uiAlternarTema();
  if (a === 'api') {
    const v = ((el('nv-api') || {}).value || '').trim().replace(/\/+$/, '');
    nvGravar(NV_CHAVE.conta + ':api', JSON.stringify(v));
    if (NV.conta) { NV.conta.api = v; nvGravar(NV_CHAVE.conta, NV.conta); }
    nvMsg(v ? 'Servidor: ' + v : 'Servidor padrão.');
    return nvRedesenhar();
  }
  if (a === 'instalar') return nvInstalar();
  if (a === 'h-abrir') { uiFecharDialogos(); return nvAbrirHistorico(id, t.dataset.nome); }
  if (a === 'h-remota') return NV.remota && nvAbrirHistorico(NV.remota.id, NV.remota.nome || NV.remota.dono);
  if (a === 'h-fechar') return nvFecharHist();
  if (a === 'h-ver') return nvHistAcao('ver', Number(t.dataset.v));
  if (a === 'h-restaurar') return nvHistAcao('restaurar', Number(t.dataset.v));
  if (a === 'np-atualizar') return nvCarregarPainel(true);
  if (a === 'cr-aba') { NV.crAba = t.dataset.aba; nvRedesenhar(); const b = el('cra-' + NV.crAba); if (b) b.focus(); return; }
  if (a === 'cr-criar') return nvCriarCronica();
  if (a === 'cr-entrar') return nvEntrarCronica();
  if (a === 'cr-convite') return nvCronicaAcao('convite', id);
  if (a === 'cr-remover') return nvCronicaAcao('remover', id, t.dataset.u);
  if (a === 'cr-excluir') return nvCronicaAcao('excluir', id);
  if (a === 'cr-ler') return nvLerFichaDaCronica(id);
  if (a === 'cr-editar') return nvEditarRemota(id);
  if (a === 'cr-por-ficha') {
    const sel = el('cr-por-sel'); if (!sel || !sel.value) return;
    nvDefinirCronica(id, sel.value);
    setTimeout(() => nvAbrirCronica(id), 1500);
    return;
  }
  if (a === 'remota-sair') return nvSairRemota();
  if (a === 'entregar') return nvEntregar();
  if (a === 'cr-copiar-codigo') { try { navigator.clipboard.writeText(t.dataset.codigo); nvMsg('Código copiado.'); } catch (e) {} return; }
  if (a === 'v-marcar') return nvVersaoAcao('marcar');
  if (a === 'v-ver') { uiFecharDialogos(); return nvVersaoAcao('ver', Number(t.dataset.v)); }
  if (a === 'v-restaurar') return nvVersaoAcao('restaurar', Number(t.dataset.v));
  if (a === 'l-criar') return nvLinkAcao('criar');
  if (a === 'l-copiar') return nvLinkAcao('copiar', t.dataset.t);
  if (a === 'l-revogar') return nvLinkAcao('revogar', t.dataset.t);
  if (a === 'leitura-sair') return nvSairLeitura();
  if (a === 'leitura-copia') return nvGuardarCopiaDaLeitura();
});

document.addEventListener('change', ev => {
  const t = ev.target;
  if (!t) return;
  if (t.id === 'nv-cr-ficha') nvDefinirCronica(t.value);
  if (t.id === 'f-cronica') { nvFiltro().cronica = t.value; nvGuardarFiltro(); nvRedesenhar(); }
  if (t.id === 'f-ordem') { nvFiltro().ordem = t.value; nvGuardarFiltro(); nvRedesenhar(); }
});
/* a busca filtra enquanto se digita, sem perder o foco do campo */
document.addEventListener('input', ev => {
  if (ev.target && ev.target.id === 'f-busca') { nvFiltro().q = ev.target.value; nvRedesenhar(); }
});
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter' || !ev.target) return;
  if (ev.target.id === 'nv-cr-codigo') { ev.preventDefault(); nvEntrarCronica(); }
  if (ev.target.id === 'nv-cr-nome') { ev.preventDefault(); nvCriarCronica(); }
});

/* volta a internet: sincroniza; aba volta a ficar visível: confere o servidor */
window.addEventListener('online', () => { NV.status = ''; nvBarra(); nvAgendar(300); });
window.addEventListener('offline', () => { NV.status = ''; nvBarra(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') nvAgendar(500); });
setInterval(() => { if (document.visibilityState === 'visible') nvAgendar(0); }, 60000);

/* outra aba deste navegador mexeu na biblioteca */
window.addEventListener('storage', ev => {
  if (ev.key === NV_CHAVE.indice) {
    NV.indice = nvLer(NV_CHAVE.indice, NV.indice);
    nvRedesenhar();
  }
  if (ev.key === NV_CHAVE.conta) { NV.conta = nvLer(NV_CHAVE.conta, null); nvBarra(); }
});

/* ============================================================
   HISTÓRICO DE ALTERAÇÕES E PAINEL DO NARRADOR
   ============================================================ */
const NV_GRUPO_MUD = { identidade: 'Identidade', atributos: 'Atributos', habilidades: 'Habilidades', disciplinas: 'Disciplinas',
  vantagens: 'Vantagens', defeitos: 'Defeitos', conviccoes: 'Convicções', vitais: 'Vitais', xp: 'Experiência', notas: 'Notas', outros: 'Outros' };

/* as mudanças de uma versão em etiquetas curtas ("Força 2 → 3") */
function nvHtmlMudancas(m, { max = 8 } = {}) {
  if (!m) return '<span class="muds"><span class="mud mud-mais">alterações sem detalhe</span></span>';
  const partes = [];
  if (m.criada) partes.push('<span class="mud mud-criada">ficha criada</span>');
  if (m.restaurada) partes.push(`<span class="mud mud-rest">voltou para a v${esc(m.restaurada)}</span>`);
  const itens = m.itens || [];
  itens.slice(0, max).forEach(i => partes.push(`<span class="mud mud-${esc(i.g)}" title="${esc(NV_GRUPO_MUD[i.g] || i.g)}">${esc(i.t)}</span>`));
  const resto = Math.max(0, itens.length - max) + (m.mais || 0);
  if (resto) partes.push(`<span class="mud mud-mais">+${resto}</span>`);
  if (!partes.length) partes.push('<span class="mud mud-mais">sem mudança na ficha</span>');
  return `<span class="muds">${partes.join('')}</span>`;
}

/* ---------- janela do histórico (qualquer ficha que a pessoa pode ler) ---------- */
async function nvAbrirHistorico(id, nome) {
  if (!id) return;

  NV.hist = { id, nome: nome || 'ficha', versoes: null, erro: '', volta: document.activeElement };
  nvDesenharHist(true);
  try {
    const r = await nvChamar('GET', '/fichas/' + id + '/versoes');
    if (NV.hist && NV.hist.id === id) { if (r.ok) NV.hist.versoes = r.body.versoes; else NV.hist.erro = nvErro(r); }
  } catch (e) { if (NV.hist && NV.hist.id === id) NV.hist.erro = e.message; }
  nvDesenharHist();
}
function nvDesenharHist(focar) {
  let o = el('nv-hist');
  const H = NV.hist;
  if (!H) { if (o) o.remove(); document.body.classList.remove('nv-hist-aberto'); return; }
  if (!o) {
    o = document.createElement('div');
    o.id = 'nv-hist'; o.className = 'nv-hist no-print';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'nv-hist-t');
    document.body.appendChild(o);
  }
  const atual = H.versoes && H.versoes.length ? H.versoes[0].versao : null;
  const podeVer = !NV.remota;   /* abrir outra ficha só para leitura no meio de uma edição remota confundiria o salvamento */
  o.innerHTML = `<div class="nv-hist-caixa">
    <div class="nv-hist-h"><h2 id="nv-hist-t">Histórico · ${esc(H.nome)}</h2>
      <button class="btn ghost" data-nv="h-fechar" id="nv-hist-fechar">Fechar</button></div>
    <div class="nv-hist-b">
      ${H.erro ? `<p class="err">${esc(H.erro)}</p>` : ''}
      ${H.versoes == null ? (H.erro ? '' : '<p class="note">Carregando…</p>') : !H.versoes.length ? '<p class="note">Sem versões ainda.</p>' :
        H.versoes.map(v => `<div class="nv-hv">
          <div class="nv-hv-h"><strong>v${v.versao}</strong>${v.rotulo ? ` <span class="tag blood">${esc(v.rotulo)}</span>` : ''}
            <span class="nv-sub" style="display:inline">${esc(nvQuando(v.criado_em))}${v.autor ? ' · ' + esc(v.autor) : ''}</span>
            <span class="nv-hv-a">${podeVer ? `<button class="btn sm ghost" data-nv="h-ver" data-v="${v.versao}">Ver</button>` : ''}
              ${v.versao === atual ? '<span class="tag">atual</span>' : `<button class="btn sm" data-nv="h-restaurar" data-v="${v.versao}">Voltar para esta</button>`}</span>
          </div>
          ${nvHtmlMudancas(v.mudancas, { max: 40 })}
        </div>`).join('')}
    </div>
    <p class="note nv-hist-p">Cada linha é uma versão: o que mudou nela e quem mudou. Voltar para uma versão antiga cria uma versão nova, então nada se perde.</p>
  </div>`;
  document.body.classList.add('nv-hist-aberto');
  if (focar) { const b = el('nv-hist-fechar'); if (b) b.focus(); }
}
function nvFecharHist() {
  const volta = NV.hist && NV.hist.volta;
  NV.hist = null; nvDesenharHist();
  if (volta && document.body.contains(volta)) try { volta.focus(); } catch (e) {}
}
async function nvHistAcao(acao, versao) {
  const H = NV.hist;
  if (!H) return;
  try {
    if (acao === 'ver') {
      const r = await nvChamar('GET', `/fichas/${H.id}/versoes/${versao}`);
      if (!r.ok) { H.erro = nvErro(r); return nvDesenharHist(); }
      nvFecharHist();
      nvEntrarLeitura(r.body.versao.dados, `${H.nome} · versão ${versao} · só leitura`);
      return;
    }
    if (acao === 'restaurar') {
      if (!confirm(`Voltar "${H.nome}" para a versão ${versao}? A versão atual continua no histórico.`)) return;
      const R = NV.remota && NV.remota.id === H.id ? NV.remota : null;
      if (R) { clearTimeout(R.timer); R.timer = null; if (JSON.stringify(S) !== R.ultimo) await nvSalvarRemota(); }
      const minha = NV.indice.fichas[H.id];
      if (minha && minha.sujo) await nvSincronizar();
      const r = await nvChamar('POST', `/fichas/${H.id}/versoes/${versao}/restaurar`);
      if (!r.ok) { H.erro = nvErro(r); return nvDesenharHist(); }
      if (R && NV.remota === R) {
        R.versao = r.body.ficha.versao;
        S = adotar(r.body.ficha.dados); S._id = H.id; R.ultimo = JSON.stringify(S);
        render(); nvRemotaStatus('voltou para a versão ' + versao);
      } else if (minha) {
        if (nvAceitarDoServidor(r.body.ficha)) render();
        nvGravarIndice();
      }
      NV.versoes = null;
      nvMsg(`"${H.nome}" voltou para a versão ${versao}.`);
      if (NV.np && NV.np.id) nvCarregarPainel(true);
      return nvAbrirHistorico(H.id, H.nome);
    }
  } catch (e) { H.erro = e.message; nvDesenharHist(); }
}
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && NV.hist) { ev.preventDefault(); nvFecharHist(); } });
document.addEventListener('click', ev => { if (NV.hist && ev.target && ev.target.id === 'nv-hist') nvFecharHist(); });

/* ---------- painel do narrador ---------- */
async function nvCarregarPainel(silencioso) {
  const c = NV.cronica;
  if (!c || c.papel !== 'narrador') return;
  const id = c.cronica.id;
  if (!silencioso || !NV.np || NV.np.id !== id) NV.np = { id, dados: null, erro: '' };
  NV.np.carregando = true;
  try {
    const r = await nvChamar('GET', `/cronicas/${id}/painel`);
    if (NV.cronica && NV.cronica.cronica.id === id) {
      NV.np = { id, dados: r.ok ? r.body : (NV.np && NV.np.dados), erro: r.ok ? '' : nvErro(r), em: Date.now() };
    }
  } catch (e) { if (NV.np) { NV.np.erro = e.message; NV.np.carregando = false; } }
  nvRedesenhar();
}

/* XP, vitais e o que falta na criação, calculados com as mesmas regras da tela */
function nvSituacao(dados) {
  const salvo = S;
  const sit = { pend: [], xpDisp: null, hum: null, fome: null, dano: '', cacador: false };
  try {
    S = adotar(dados || {});
    sit.cacador = S.sistema === 'cacador';
    const m = S.meta || {};
    const faltam = [['nome', 'nome'], ['conceito', 'conceito'], ['ambicao', 'ambição'], ['desejo', 'desejo']];
    if (!sit.cacador) faltam.push(['cla', 'clã'], ['predador', 'predador']);
    const vazios = faltam.filter(([k]) => !String(m[k] || '').trim()).map(([, n]) => n);
    if (sit.cacador) { if (!String(S.credo || '').trim()) vazios.push('credo'); if (!String(S.impeto || '').trim()) vazios.push('ímpeto'); }
    if (vazios.length) sit.pend.push('falta ' + vazios.join(', '));
    if (!sit.cacador) {
      const o = orcamento();
      if (!o.atr.ok) sit.pend.push('Atributos fora da distribuição');
      if (!o.hab.ok) sit.pend.push('Habilidades fora da distribuição');
      if (o.disc.atual !== o.disc.alvo) sit.pend.push(`Disciplinas ${o.disc.atual}/${o.disc.alvo}`);
      else if (o.disc.avisos.length) sit.pend.push(o.disc.avisos[0]);
      if (o.vant.atual !== o.vant.alvo) sit.pend.push(`Vantagens ${o.vant.atual}/${o.vant.alvo}`);
      if (o.def.atual !== o.def.alvo) sit.pend.push(`Defeitos ${o.def.atual}/${o.def.alvo}`);
      sit.hum = S.humanidade; sit.fome = S.fome;
    }
    if (!(S.conv || []).some(c => String(c.texto || '').trim())) sit.pend.push(sit.cacador ? 'sem anotações de motivação' : 'sem convicções');
    sit.xpDisp = (Number(S.xpTotal) || 0) - (Number(S.xpGasto) || 0);
    const sd = S.saude || {}, vt = S.vontade || {};
    const d = [];
    if ((sd.sup || 0) + (sd.agg || 0)) d.push(`Vit ${(sd.sup || 0) + (sd.agg || 0)}/${maxSaude()}${sd.agg ? ' (' + sd.agg + ' agr.)' : ''}`);
    if ((vt.sup || 0) + (vt.agg || 0)) d.push(`FV ${(vt.sup || 0) + (vt.agg || 0)}/${maxVontade()}`);
    sit.dano = d.join(' · ');
  } catch (e) { sit.erro = true; }
  finally { S = salvo; }
  return sit;
}
