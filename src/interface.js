/* ============================================================
   Ficha de Sangue — casca da interface

   Rotas (no endereço, para o Voltar do navegador e o recarregar funcionarem):
     #/fichas                 Minhas fichas (só as desta pessoa)
     #/ficha/<id>             a ficha em página própria, modo Ver
     #/ficha/<id>/editar      a mesma ficha, modo Editar
     #/cronicas[/<id>]        crônicas e o painel de uma delas
     #/conta                  conta e preferências (no celular é uma aba)
     #/leitura                ficha alheia só para leitura (narrador, link, versão antiga)
     #/remota/<id>[/editar]   o narrador editando a ficha de um jogador

   Também ficam aqui os menus suspensos (teclado: setas, Home/End, Esc),
   os diálogos, os avisos, o cabeçalho da ficha e a navegação por seções.
   Carregado depois de nuvem.js e app.js.
   ============================================================ */

const UI = { tela: '', arg: '', modo: 'ver', obs: null, pendente: false, ultimaRota: '' };

/* ---------- avisos (substituem as mensagens espalhadas pela tela) ---------- */
function uiAviso(texto, acao) {
  const z = el('avisos');
  if (!z || !texto) return;
  const ult = z.lastElementChild;
  if (ult && ult.dataset.t === texto) return;
  const d = document.createElement('div');
  d.className = 'aviso';
  d.dataset.t = texto;
  d.innerHTML = `<p>${esc(texto)}</p>${acao ? `<button type="button" class="btn sm" data-aviso-acao style="opacity:1;font-size:13px;color:inherit;border-color:currentColor;background:transparent">${esc(acao.rotulo)}</button>` : ''}<button type="button" data-aviso-fechar aria-label="Fechar aviso">×</button>`;
  d.querySelector('[data-aviso-fechar]').onclick = () => d.remove();
  if (acao) d.querySelector('[data-aviso-acao]').onclick = () => { d.remove(); acao.fn(); };
  z.appendChild(d);
  while (z.children.length > 3) z.firstElementChild.remove();
  setTimeout(() => d.remove(), Math.min(14000, 4500 + texto.length * 45) + (acao ? 4000 : 0));
}

/* ---------- menus suspensos (padrão "menu button" da WAI-ARIA) ---------- */
const uiItensMenu = m => [...m.querySelectorAll('[role="menuitem"]')].filter(x => !x.hidden && x.offsetParent !== null);
function uiFecharMenus(exceto) {
  let fechou = false;
  document.querySelectorAll('[aria-haspopup="menu"][aria-expanded="true"]').forEach(b => {
    if (b === exceto) return;
    b.setAttribute('aria-expanded', 'false');
    const m = el(b.getAttribute('aria-controls'));
    if (m) m.hidden = true;
    fechou = true;
  });
  if (fechou && UI.pendente) { UI.pendente = false; setTimeout(uiRedesenharTela, 0); }
}
function uiAbrirMenu(b, foco) {
  uiFecharMenus(b);
  const m = el(b.getAttribute('aria-controls'));
  if (!m) return;
  b.setAttribute('aria-expanded', 'true');
  m.hidden = false;
  m.classList.remove('esq');
  const r = m.getBoundingClientRect();
  if (r.left < 8) m.classList.add('esq');
  const itens = uiItensMenu(m);
  if (itens.length) (foco === 'ultimo' ? itens[itens.length - 1] : itens[0]).focus();
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[aria-haspopup="menu"]');
  if (b && b.getAttribute('aria-controls')) {
    ev.preventDefault();
    if (b.getAttribute('aria-expanded') === 'true') uiFecharMenus(); else uiAbrirMenu(b);
    return;
  }
  if (!ev.target.closest('.menu')) uiFecharMenus();
});
document.addEventListener('keydown', ev => {
  const b = ev.target.closest && ev.target.closest('[aria-haspopup="menu"]');
  if (b && b.getAttribute('aria-controls') && ['ArrowDown', 'ArrowUp'].includes(ev.key)) {
    ev.preventDefault(); uiAbrirMenu(b, ev.key === 'ArrowUp' ? 'ultimo' : 'primeiro'); return;
  }
  const m = ev.target.closest && ev.target.closest('.menu[role="menu"]');
  if (!m) return;
  const itens = uiItensMenu(m), i = itens.indexOf(document.activeElement);
  const botao = document.querySelector(`[aria-controls="${m.id}"]`);
  if (ev.key === 'ArrowDown') { ev.preventDefault(); itens[(i + 1) % itens.length].focus(); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); itens[(i - 1 + itens.length) % itens.length].focus(); }
  else if (ev.key === 'Home') { ev.preventDefault(); itens[0].focus(); }
  else if (ev.key === 'End') { ev.preventDefault(); itens[itens.length - 1].focus(); }
  else if (ev.key === 'Escape') { ev.preventDefault(); uiFecharMenus(); if (botao) botao.focus(); }
  else if (ev.key === 'Tab') uiFecharMenus();
});

/* ---------- diálogos (o <dialog> nativo prende o foco e fecha com Esc) ---------- */
function uiAbrirDialogo(id) {
  const d = el(id);
  if (!d) return;
  uiFecharMenus();
  if (!d.open) d.showModal();
}
function uiFecharDialogos() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
document.addEventListener('click', ev => {
  const f = ev.target.closest('[data-fechar]');
  if (f) { const d = f.closest('dialog'); if (d) d.close(); return; }
  if (ev.target.tagName === 'DIALOG' && ev.target.open) {
    /* clique no fundo escurecido fecha (o clique dentro da caixa tem outro alvo) */
    const r = ev.target.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) ev.target.close();
  }
});

/* ---------- tema ---------- */
function uiAlternarTema() {
  const r = document.documentElement;
  const escuroAgora = r.dataset.theme ? r.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = escuroAgora ? 'light' : 'dark';
  try { localStorage.setItem(CHAVE + ':tema', r.dataset.theme); } catch (e) {}
  uiAviso(escuroAgora ? 'Tema claro.' : 'Tema escuro.');
}
el('btn-tema').onclick = uiAlternarTema;

/* ============================================================
   ROTAS
   ============================================================ */
function uiIr(hash, substituir) {
  if (location.hash === hash) return uiRota();
  if (substituir) { try { history.replaceState(null, '', hash); } catch (e) { location.hash = hash; return; } uiRota(); }
  else location.hash = hash;
}
window.addEventListener('hashchange', () => uiRota());

let uiRotaN = 0;
async function uiRota() {
  const n = ++uiRotaN;
  const h = location.hash && location.hash !== '#' ? location.hash : '#/fichas';
  const [r, a, b] = h.replace(/^#\/?/, '').split('/');
  uiFecharMenus();
  uiFecharDialogos();

  /* saindo de uma ficha alheia ou da edição do narrador */
  if (NV.leitura && r !== 'leitura') { nvSairLeitura(false); render(); }
  if (NV.remota && !(r === 'remota' && a === NV.remota.id)) { await nvSairRemota(false); render(); }
  if (n !== uiRotaN) return;

  if (r === 'ficha' && a) {
    if (NV.semFicha || S._id !== a) {
      const res = nvVisivel(a) ? nvAbrir(a) : await nvAbrirPorLink(a);
      if (n !== uiRotaN) return;
      if (res === 'remota') return;
      if (!res) return uiIr('#/fichas', true);
    }
    uiMostrar('ficha', a);
    uiDefinirModo(b === 'editar' ? 'editar' : 'ver');
    return;
  }
  if (r === 'leitura') {
    if (!NV.leitura) return uiIr('#/fichas', true);
    uiMostrar('ficha', 'leitura');
    uiDefinirModo('ver');
    return;
  }
  if (r === 'remota' && a) {
    if (!NV.remota || NV.remota.id !== a) {
      if (!nvLogado()) return uiIr('#/cronicas', true);
      const ok = await nvEditarRemota(a);
      if (!ok && n === uiRotaN) uiIr('#/cronicas', true);
      return;
    }
    uiMostrar('ficha', 'remota');
    uiDefinirModo(b === 'ver' ? 'ver' : 'editar');
    return;
  }
  if (r === 'cronicas') {
    /* sempre confere o servidor ao entrar: o grupo muda sem avisar */
    if (nvLogado()) { nvCarregarCronicas(); if (a) nvAbrirCronica(a); }
    return uiMostrar('cronicas', a || '');
  }
  if (r === 'conta') return uiMostrar('conta');
  if (h !== '#/fichas' && r !== 'fichas') { try { history.replaceState(null, '', '#/fichas'); } catch (e) {} }
  uiMostrar('fichas');
}

const UI_TITULOS = { fichas: 'Minhas fichas', cronicas: 'Crônicas', conta: 'Conta' };
function uiMostrar(tela, arg) {
  const mudou = UI.tela !== tela || UI.arg !== (arg || '');
  UI.tela = tela; UI.arg = arg || '';
  for (const v of ['fichas', 'cronicas', 'conta', 'ficha']) el('view-' + v).hidden = v !== tela;
  /* item da navegação principal que corresponde a esta tela */
  const navAtual = tela === 'ficha' ? (NV.remota ? 'cronicas' : (NV.leitura ? '' : 'fichas')) : tela;
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === navAtual) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  /* o Mapa abre na crônica da ficha aberta, se houver */
  const m = !NV.semFicha && S && S._id && NV.indice.fichas[S._id];
  const cr = tela === 'cronicas' && arg ? arg : (m && m.cronica_id) || '';
  document.querySelectorAll('[data-nav="mapa"]').forEach(a => a.setAttribute('href', cr ? 'mapa/?cronica=' + encodeURIComponent(cr) : 'mapa/'));

  if (tela !== 'ficha') document.title = UI_TITULOS[tela] + ' · Ficha de Sangue';
  uiRedesenharTela(true);
  if (tela === 'ficha') uiDepoisDeRender();
  if (mudou) {
    window.scrollTo({ top: 0 });
    /* leitor de tela: anuncia a tela nova pelo título dela */
    const alvo = tela === 'ficha' ? el('fh-nome') : document.querySelector('#view-' + tela + ' h1');
    if (alvo && UI.ultimaRota) { alvo.setAttribute('tabindex', '-1'); alvo.focus({ preventScroll: true }); }
  }
  UI.ultimaRota = location.hash;
}

/* redesenha a tela aberta sem perder o que se digitava nem o foco */
function uiRedesenharTela(forcar) {
  const cont = { fichas: 'tela-fichas', cronicas: 'tela-cronicas', conta: 'tela-conta' }[UI.tela];
  const dlg = el('dlg-ficha');
  if (dlg && dlg.open) { el('dlg-ficha-b').innerHTML = nvAbaFicha(); }
  if (UI.tela === 'ficha') { uiCabecalho(); return; }
  const c = cont && el(cont);
  if (!c) return;
  if (!forcar && c.querySelector('[aria-expanded="true"]')) { UI.pendente = true; return; }
  const ativo = document.activeElement;
  const focoId = ativo && c.contains(ativo) ? ativo.id : '';
  const focoNav = ativo && c.contains(ativo) && !focoId ? (ativo.dataset.nv ? `[data-nv="${ativo.dataset.nv}"]${ativo.dataset.v != null ? `[data-v="${ativo.dataset.v}"]` : ''}${ativo.dataset.aba ? `[data-aba="${ativo.dataset.aba}"]` : ''}` : '') : '';
  const cursor = focoId && ativo.setSelectionRange && typeof ativo.selectionStart === 'number' ? ativo.selectionStart : null;
  const digitado = {};
  c.querySelectorAll('input[id]:not([type="search"])').forEach(i => { if (i.value) digitado[i.id] = i.value; });
  c.innerHTML = UI.tela === 'fichas' ? nvTelaFichas() : UI.tela === 'cronicas' ? nvTelaCronicas(UI.arg) : nvTelaConta();
  for (const id in digitado) { const i = el(id); if (i && !i.value) i.value = digitado[id]; }
  const volta = focoId ? el(focoId) : (focoNav ? c.querySelector(focoNav) : null);
  if (volta) { volta.focus({ preventScroll: true }); if (cursor != null) try { volta.setSelectionRange(cursor, cursor); } catch (e) {} }
}

/* ============================================================
   A FICHA: modo, cabeçalho, seções, "na mesa", validação
   ============================================================ */
function uiDefinirModo(m) {
  if (NV.leitura) m = 'ver';
  UI.modo = m;
  document.body.classList.toggle('view-sheet', m === 'ver');
  document.body.classList.toggle('modo-editar', m === 'editar');
  el('modo-ver').setAttribute('aria-pressed', String(m === 'ver'));
  el('modo-editar').setAttribute('aria-pressed', String(m === 'editar'));
  uiSecoes();
  if (typeof evoBarra === 'function') evoBarra();
}
/* o narrador ou a impressão pedem o modo de edição/leitura sem trocar de ficha */
function entrarViewFicha() { uiDefinirModo('ver'); }
function sairViewFicha() { uiDefinirModo('editar'); }

function uiTrocarModo(m) {
  if (UI.modo === m) return;
  let secao = UI.secaoAtual;
  if (secao === 'resumo') secao = 'identidade';
  const base = NV.remota ? '#/remota/' + NV.remota.id : '#/ficha/' + S._id;
  const hash = NV.remota ? base + (m === 'ver' ? '/ver' : '/editar') : base + (m === 'editar' ? '/editar' : '');
  try { history.replaceState(null, '', hash); } catch (e) {}
  UI.ultimaRota = hash;
  /* a aba de Editar é lembrada; ao voltar de Ver, só muda se a pessoa andou pela folha */
  if (m === 'ver') { UI.abaEditar = secao; UI.verMexeu = false; UI.navTravadaAte = Date.now() + 600; }
  else if (!UI.verMexeu && UI.abaEditar) secao = UI.abaEditar;
  UI.secaoAtual = secao;
  uiDefinirModo(m);
  /* fica na mesma seção ao trocar de modo: em Editar abre a aba, em Ver rola até ela */
  if (m === 'editar') { window.scrollTo({ top: 0 }); return; }
  const alvo = secao && document.querySelector(`#sheet [data-secao="${secao}"]`);
  if (alvo && secao !== 'identidade') alvo.scrollIntoView({ block: 'start' });
  else window.scrollTo({ top: 0 });
}
el('modo-ver').onclick = () => uiTrocarModo('ver');
el('modo-editar').onclick = () => uiTrocarModo('editar');

const nomeIdade = () => { const i = MAR_DO_TEMPO[S.mar]; return i && i.nome !== 'Não definida' ? i.nome.replace(' †', '') : ''; };
function uiCabecalho() {
  const m = S.meta || {};
  const nome = m.nome || 'Sem nome';
  el('fh-nome').textContent = nome;
  const meta = !NV.semFicha && S._id && NV.indice.fichas[S._id];
  const cr = meta && meta.cronica_id && (NV.cronicas || []).find(c => c.id === meta.cronica_id);
  const chip = (t, key) => t ? `<span class="fh-chip${key ? ' key' : ''}">${esc(t)}</span>` : '';
  el('fh-chips').innerHTML = ehCacador()
    ? chip(S.credo, 1) + chip(S.impeto) + chip(S.org) + chip(cr ? 'Crônica: ' + cr.nome : m.cronica)
    : chip(m.cla, 1) + chip(m.geracao ? m.geracao + 'ª geração' : '') + chip(nomeIdade()) + chip('Potência ' + potencia()) +
      chip(m.predador) + chip(m.seita) + chip(cr ? 'Crônica: ' + cr.nome : m.cronica);
  const voltar = el('fh-voltar'), vt = el('fh-voltar-t');
  if (NV.remota) { voltar.setAttribute('href', NV.remota.voltar || '#/cronicas'); vt.textContent = 'Voltar à crônica'; }
  else if (NV.leitura) { voltar.setAttribute('href', NV.leitura.voltar || '#/fichas'); vt.textContent = 'Voltar'; }
  else { voltar.setAttribute('href', '#/fichas'); vt.textContent = 'Minhas fichas'; }
  if (UI.tela === 'ficha') document.title = nome + ' · Ficha de Sangue';
}

/* seções: o mesmo nome no modo Ver e no Editar, para a navegação servir aos dois.
   Em Editar cada seção é uma aba (só ela aparece); em Ver a ficha é uma página
   corrida — a folha para ler e imprimir — e a barra só pula até a seção. */
const UI_SECOES_V = [['identidade', 'Identidade'], ['atributos', 'Atributos'], ['habilidades', 'Habilidades'], ['especializacoes', 'Especializações'], ['disciplinas', 'Disciplinas'], ['vantagens', 'Vantagens'], ['moralidade', 'Moralidade'], ['notas', 'Notas e XP']];
const UI_SECOES_C = [['identidade', 'Identidade'], ['atributos', 'Atributos'], ['habilidades', 'Habilidades'], ['especializacoes', 'Especializações'], ['disciplinas', 'Trunfos'], ['vantagens', 'Vantagens'], ['moralidade', 'Motivação'], ['notas', 'Notas e XP']];
/* no celular a coluna lateral (Vitais, Base de criação…) vira a última aba */
const UI_ABA_RESUMO = ['resumo', 'Vitais e resumo'];
UI.secoes = UI_SECOES_V;
const UI_SECAO_POR_TITULO = [
  [/^(conceito|identidade)/, 'identidade'], [/^atributos/, 'atributos'], [/^habilidades/, 'habilidades'], [/^especializa/, 'especializacoes'],
  [/^(disciplinas|trunfos)/, 'disciplinas'], [/^(vantagens|defeitos)/, 'vantagens'],
  [/^(convic|moralidade|perdi|motiva)/, 'moralidade'], [/^(notas|experi)/, 'notas']
];
const uiEstreito = () => matchMedia('(max-width:920px)').matches;
const uiAbas = () => UI.modo === 'editar';
function uiMarcarSecoes(raiz, seletor) {
  const vistos = new Set();
  let anterior = '';
  raiz.querySelectorAll(seletor).forEach(h => {
    const t = nvNorm(h.textContent).trim();
    const par = UI_SECAO_POR_TITULO.find(([re]) => re.test(t));
    const alvo = h.closest('.card') || h;
    /* em Editar, todo quadro pertence a uma aba (Defeitos fica com Vantagens);
       um quadro sem título conhecido fica na aba do anterior */
    const k = par ? par[1] : anterior;
    if (raiz.id === 'col-main' && k && !alvo.classList.contains('forja')) alvo.dataset.aba = k;
    if (par) anterior = par[1];
    if (!par || vistos.has(par[1])) return;
    vistos.add(par[1]);
    alvo.setAttribute('data-secao', par[1]);
  });
  const mast = raiz.querySelector('.sh-page .sh-cols');
  if (raiz.id === 'sheet' && mast && !vistos.has('identidade')) mast.setAttribute('data-secao', 'identidade');
}
/* o que falta em cada aba, para o indicador ao lado do nome */
function uiPendencias() {
  const p = {};
  if (!criacaoConferida()) return p;
  try {
    const o = orcamento(), x = orcamentoXP();
    if (!ehCacador()) p.identidade = !S.meta.cla || !S.meta.nome;
    else p.identidade = !S.meta.nome;
    p.atributos = !o.atr.ok && !x.atr.viavel;
    p.habilidades = !o.hab.ok && !x.hab.viavel;
    if (ehCacador()) p.disciplinas = !trunfosUsados().ok;
    else {
      const discXP = x.disc.julgavel && x.disc.viavel;
      p.disciplinas = !S.meta.cla || (o.disc.atual !== o.disc.alvo && !discXP) || o.disc.avisos.length > 0 || (o.disc.foraDoCla.length > 0 && !discXP);
      p.vantagens = o.vant.atual < o.vant.alvo || o.def.atual !== o.def.alvo;
    }
    if (ehCacador()) p.vantagens = o.vant.atual !== o.vant.alvo || o.def.atual !== o.def.alvo;
    /* XP que a ficha usou mas não está no gasto: resolve-se em Notas e XP */
    p.notas = !x.coberto;
  } catch (e) {}
  return p;
}
function uiSecoes() {
  garantirVistas();
  UI.secoes = ehCacador() ? UI_SECOES_C : UI_SECOES_V;
  uiMarcarSecoes(el('col-main'), '.card-h h2');
  uiMarcarSecoes(el('sheet'), '.sh-eyebrow, .sh-block > h3');
  /* só as seções que existem no modo aberto (a ficha de Caçador nem sempre tem Notas em Ver) */
  const raiz = UI.modo === 'ver' ? el('sheet') : el('col-main');
  const existe = new Set([...raiz.querySelectorAll('[data-secao]')].map(x => x.dataset.secao));
  const lista = UI.secoes.filter(([k]) => existe.has(k));
  if (uiAbas() && uiEstreito() && el('col-rail').children.length) lista.push(UI_ABA_RESUMO);
  UI.listaSecoes = lista;
  if (!lista.some(([k]) => k === UI.secaoAtual)) UI.secaoAtual = (lista[0] || UI.secoes[0])[0];
  const atual = UI.secaoAtual;
  const nav = el('secnav');
  if (uiAbas()) {
    const pend = uiPendencias();
    nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Seções da ficha');
    const conferir = criacaoConferida();
    nav.innerHTML = lista.map(([k, t], i) => {
      const sel = k === atual;
      const pronta = conferir && ['identidade', 'atributos', 'habilidades', 'disciplinas', 'vantagens'].includes(k) && k in pend && !pend[k];
      const n = k === 'resumo' ? '' : `<span class="aba-n" aria-hidden="true">${pronta ? '✓' : i + 1}</span>`;
      return `<button type="button" role="tab" id="aba-${k}" data-ir-secao="${k}" aria-controls="col-main" aria-selected="${sel}" tabindex="${sel ? 0 : -1}"${sel ? ' aria-current="true"' : ''}${pronta ? ' data-pronta' : ''}>${n}${esc(t)}${pend[k] ? '<span class="aba-pend" title="Falta completar"><span class="sr"> (falta completar)</span></span>' : (pronta ? '<span class="sr"> (pronta)</span>' : '')}</button>`;
    }).join('');
  } else {
    nav.removeAttribute('role');
    nav.innerHTML = lista.map(([k, t]) =>
      `<a href="#/ficha" data-ir-secao="${k}"${k === atual ? ' aria-current="true"' : ''}>${esc(t)}</a>`).join('');
  }
  uiAplicarAba();
  uiObservarSecoes();
}
/* Editar: mostra só os quadros da aba aberta e o rodapé Anterior/Próxima */
function uiAplicarAba() {
  const main = el('col-main'), abas = uiAbas();
  document.body.classList.toggle('com-abas', abas);
  document.body.classList.toggle('aba-resumo', abas && UI.secaoAtual === 'resumo');
  main.querySelectorAll(':scope > .card').forEach(c => {
    c.hidden = abas && !c.classList.contains('forja') && c.dataset.aba !== UI.secaoAtual;
  });
  const velho = el('aba-rodape'); if (velho) velho.remove();
  if (!abas) { main.removeAttribute('role'); main.removeAttribute('aria-labelledby'); return; }
  main.setAttribute('role', 'tabpanel'); main.setAttribute('aria-labelledby', 'aba-' + UI.secaoAtual);
  const lista = UI.listaSecoes || [], i = lista.findIndex(([k]) => k === UI.secaoAtual);
  const ant = lista[i - 1], prox = lista[i + 1];
  const rod = document.createElement('div');
  rod.id = 'aba-rodape'; rod.className = 'aba-rodape no-print';
  rod.innerHTML = (ant ? `<button type="button" class="btn" data-ir-secao="${ant[0]}">← ${esc(ant[1])}</button>` : '<span></span>') +
    (prox ? `<button type="button" class="btn primary" data-ir-secao="${prox[0]}">${esc(prox[1])} →</button>` : '');
  main.appendChild(rod);
}
/* abre uma seção: em Editar troca de aba, em Ver rola até ela */
function uiIrSecao(k, opts) {
  opts = opts || {};
  if (uiAbas()) {
    if (k === 'resumo' && !uiEstreito()) k = 'identidade';
    UI.secaoAtual = k;
    uiSecoes();
    /* volta ao começo da aba, sem esconder o cabeçalho da ficha se ele ainda estiver à vista */
    const topo = el('col-main').getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) - 8;
    if (window.scrollY > topo) window.scrollTo({ top: Math.max(0, topo) });
    if (opts.focarAba) { const b = el('aba-' + k); if (b) b.focus({ preventScroll: true }); }
    else if (opts.focarConteudo !== false) {
      const h = el('col-main').querySelector(`:scope > .card[data-aba="${k}"] .card-h h2`) || (k === 'resumo' && el('col-rail').querySelector('.card-h h2'));
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    uiMarcarSecaoAtual(k);
    return;
  }
  UI.verMexeu = true;
  const alvo = document.querySelector(`#sheet [data-secao="${k}"]`);
  if (alvo) {
    alvo.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const foco = alvo.querySelector('h2, h3, .sh-eyebrow') || alvo;
    foco.setAttribute('tabindex', '-1'); foco.focus({ preventScroll: true });
  }
  uiMarcarSecaoAtual(k);
  /* enquanto a rolagem suave corre, o observador veria as seções passando e
     trocaria a marca; segura até ela terminar (a última seção nem chega ao topo) */
  UI.navTravadaAte = Date.now() + 1200;
}
el('secnav').addEventListener('click', ev => {
  const a = ev.target.closest('[data-ir-secao]');
  if (!a) return;
  ev.preventDefault();
  uiIrSecao(a.dataset.irSecao, { focarAba: uiAbas(), focarConteudo: false });
});
/* teclado nas abas (padrão WAI-ARIA): setas, Home e End */
el('secnav').addEventListener('keydown', ev => {
  if (!uiAbas() || !ev.target.closest('[role="tab"]')) return;
  const lista = UI.listaSecoes || [], i = lista.findIndex(([k]) => k === UI.secaoAtual);
  let j = null;
  if (ev.key === 'ArrowRight') j = (i + 1) % lista.length;
  else if (ev.key === 'ArrowLeft') j = (i - 1 + lista.length) % lista.length;
  else if (ev.key === 'Home') j = 0;
  else if (ev.key === 'End') j = lista.length - 1;
  if (j == null) return;
  ev.preventDefault();
  uiIrSecao(lista[j][0], { focarAba: true });
});
/* rodapé Anterior/Próxima */
el('col-main').addEventListener('click', ev => {
  const b = ev.target.closest('#aba-rodape [data-ir-secao]');
  if (b) uiIrSecao(b.dataset.irSecao);
});
/* girar o celular ou redimensionar: a aba "Vitais e resumo" só existe na tela estreita */
matchMedia('(max-width:920px)').addEventListener('change', () => { if (UI.tela === 'ficha') uiSecoes(); });
function uiMarcarSecaoAtual(k) {
  UI.secaoAtual = k;
  el('secnav').querySelectorAll('[data-ir-secao]').forEach(a => {
    const sel = a.dataset.irSecao === k;
    if (a.getAttribute('role') === 'tab') { a.setAttribute('aria-selected', String(sel)); a.tabIndex = sel ? 0 : -1; }
    if (sel) {
      a.setAttribute('aria-current', 'true');
      /* rola só a barra de seções, na horizontal: scrollIntoView rolaria a página
         inteira (a barra é sticky) e fazia a ficha pular a cada clique */
      const bar = el('secnav'), ini = a.offsetLeft, fim = ini + a.offsetWidth;
      if (ini < bar.scrollLeft) bar.scrollLeft = ini - 8;
      else if (fim > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = fim - bar.clientWidth + 8;
    }
    else a.removeAttribute('aria-current');
  });
}
function uiObservarSecoes() {
  if (UI.obs) UI.obs.disconnect();
  /* em Editar as abas mandam: nada de marcar a seção pela rolagem */
  if (!('IntersectionObserver' in window) || UI.tela !== 'ficha' || uiAbas()) return;
  const raiz = el('sheet');
  const vis = new Map();
  UI.obs = new IntersectionObserver(ents => {
    ents.forEach(e => vis.set(e.target.dataset.secao, e.isIntersecting ? e.boundingClientRect.top : null));
    if (Date.now() < (UI.navTravadaAte || 0)) return;
    const ordem = UI.secoes.map(s => s[0]).filter(k => vis.get(k) != null);
    if (ordem.length && ordem[0] !== UI.secaoAtual) { UI.verMexeu = true; uiMarcarSecaoAtual(ordem[0]); }
  }, { rootMargin: '-112px 0px -55% 0px' });
  raiz.querySelectorAll('[data-secao]').forEach(x => UI.obs.observe(x));
}

/* "Na mesa": dano, Fome e Humanidade mudam no modo Ver, sem entrar em Editar */
function uiMesa() {
  const cards = el('col-rail').querySelectorAll(':scope > .card[data-mesa]');
  const d0 = el('mesa-d');
  if (d0) UI.mesaAberta = d0.open;
  if (!cards.length) { el('mesa').innerHTML = ''; return; }
  const largo = matchMedia('(min-width: 921px)').matches;
  const aberto = largo || UI.mesaAberta === true;
  const num = (r, v, cor) => `<span class="mesa-num"><span>${r}</span><b${cor ? ` style="color:${cor}"` : ''}>${v}</b></span>`;
  const resta = (o, max) => max - (o.sup || 0) - (o.agg || 0);
  const resumo = num('Vit', resta(S.saude, maxSaude()) + '/' + maxSaude()) + num('FV', resta(S.vontade, maxVontade()) + '/' + maxVontade()) +
    (ehCacador() ? num('Desesp.', S.desespero || 0, 'var(--hunger)') + num('Perigo', S.perigo || 0)
                 : num('Fome', S.fome, 'var(--hunger)') + num('Hum', S.humanidade)) + num('XP', xpDisponivel());
  el('mesa').innerHTML = `<details class="mesa-d" id="mesa-d"${aberto ? ' open' : ''}>
    <summary><span class="mesa-tit">Na mesa</span>${resumo}</summary>
    ${cards[0].outerHTML.replace(' data-mesa', '').replace('<h2>Vitais</h2>', '<h2>Na mesa</h2>')
      .replace('<div class="card-b">', '<div class="card-b"><p class="mesa-nota">Marque dano e os medidores aqui mesmo, sem entrar em Editar.</p>')
      .replace(/<\/div>\s*<\/div>\s*$/, `<div class="mesa-xp"><div class="mesa-xp-h"><span><b>${xpDisponivel()}</b> XP disponíveis<small>ganho ${Number(S.xpTotal) || 0} · gasto ${Number(S.xpGasto) || 0}</small></span><span class="mesa-xp-b"><button type="button" class="btn sm ghost" data-acao="xp">Livro</button>${ehCacador() ? '' : '<button type="button" class="btn sm primary" data-evo="entrar">Evoluir</button>'}</span></div>${xpMovHtml('mesa')}</div></div></div>`)}
  </details>`;
  el('mesa-d').addEventListener('toggle', e => { if (!matchMedia('(min-width: 921px)').matches) UI.mesaAberta = e.target.open; });
}

/* resumo da validação na faixa de criação */
function uiValidacao() {
  const b = el('validacao');
  if (!b) return;
  if (!criacaoConferida()) { b.dataset.estado = 'neutro'; b.textContent = 'Ficha importada'; return; }
  let avisos = 0;
  try {
    const o = orcamento(), x = orcamentoXP();
    /* pontos a mais que a experiência explica não são aviso; o XP fora do gasto é um só */
    if (!o.atr.ok && !x.atr.viavel) avisos++;
    if (!o.hab.ok && !x.hab.viavel) avisos++;
    if (ehCacador()) { if (!trunfosUsados().ok) avisos++; }
    else {
      const discXP = x.disc.julgavel && x.disc.viavel;
      if (o.disc.atual !== o.disc.alvo && !discXP) avisos++;
      avisos += o.disc.avisos.length + (o.disc.foraDoCla.length && !discXP ? 1 : 0);
      if (o.vant.atual < o.vant.alvo) avisos++;
    }
    if (o.def.atual !== o.def.alvo) avisos++;
    if (!x.coberto) avisos++;
  } catch (e) {}
  b.dataset.estado = avisos ? 'aviso' : 'ok';
  b.textContent = avisos ? `Criação: ${avisos} pendência${avisos > 1 ? 's' : ''}` : 'Criação: tudo certo';
}
el('validacao').onclick = () => {
  if (uiAbas() && uiEstreito()) uiIrSecao('resumo', { focarConteudo: false });
  const card = [...el('col-rail').querySelectorAll('.card')].find(c => /base de cria|pontos de cria|ficha importada/i.test(c.textContent.slice(0, 80)));
  if (card) { card.scrollIntoView({ block: 'center' }); card.setAttribute('tabindex', '-1'); card.focus({ preventScroll: true }); }
};

/* chamado no fim de cada render() do app.js */
function uiDepoisDeRender() {
  uiCabecalho();
  uiSecoes();
  uiMesa();
  uiValidacao();
  el('btn-forja').setAttribute('aria-pressed', String(!!painelForja));
}

/* ---------- ferramentas de criação (só no modo Editar) ---------- */
el('sis-vampiro').onclick = () => trocarSistema('vampiro');
el('sis-cacador').onclick = () => trocarSistema('cacador');
el('btn-sortear').onclick = () => {
  nvAntesDeSortear(); sortear();
  uiAviso('Ficha sorteada de novo.', { rotulo: 'Desfazer', fn: () => nvDesfazer() });
};
/* desfazer / refazer: botões no topo da ficha e Ctrl+Z, Ctrl+Shift+Z ou Ctrl+Y.
   Dentro de um campo de texto o atalho continua sendo o do navegador. */
function uiHist(refazer) {
  if (NV.leitura) return;
  const ok = refazer ? histRefazer() : histDesfazer();
  uiAviso(ok ? (refazer ? 'Refeito.' : 'Desfeito.') : (refazer ? 'Nada para refazer.' : 'Nada para desfazer.'));
}
el('btn-hist-desfazer').onclick = () => uiHist(false);
el('btn-hist-refazer').onclick = () => uiHist(true);
document.addEventListener('keydown', ev => {
  if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || UI.tela !== 'ficha') return;
  const k = ev.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  const t = ev.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName) && !/^(checkbox|radio|button|range)$/.test(t.type))) return;
  if (document.querySelector('dialog[open]')) return;
  ev.preventDefault();
  uiHist(k === 'y' || ev.shiftKey);
});
el('btn-desfazer').onclick = () => { nvDesfazer(); uiAviso('Voltou para a ficha de antes do sorteio.'); };
el('btn-forja').onclick = () => {
  painelForja = !painelForja;
  render();
  if (painelForja) { const c = document.querySelector('.card.forja'); if (c) { c.scrollIntoView({ block: 'start' }); const t = el('fj-contexto'); if (t) t.focus({ preventScroll: true }); } }
};

/* ============================================================
   AÇÕES (data-acao): exportar, ficha, nova, importar
   ============================================================ */
const nomeArquivo = ext => (S.meta.nome || 'ficha').replace(/[^\w\-]+/g, '_').toLowerCase() + ext;
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-acao]');
  if (!t) return;
  const a = t.dataset.acao;
  ev.preventDefault();
  uiFecharMenus();
  if (a === 'pdf') return salvarPdf(avisoFicha);
  if (a === 'imprimir') return ehCacador() ? imprimirPagina(avisoFicha) : imprimirModelo(avisoFicha);
  if (a === 'imprimir-pagina') return imprimirPagina(avisoFicha);
  if (a === 'baixar-json') return baixarArquivo(nomeArquivo('.json'), JSON.stringify(S, null, 1), 'application/json', avisoFicha);
  if (a === 'texto-json') { el('json-area').value = JSON.stringify(S, null, 1); el('json-msg').textContent = ''; return uiAbrirDialogo('dlg-json'); }
  if (a === 'copiar-json') {
    const ta = el('json-area'); ta.select();
    const ok = () => { el('json-msg').textContent = 'Copiado.'; };
    try { await navigator.clipboard.writeText(ta.value); ok(); } catch (e) { try { document.execCommand('copy'); ok(); } catch (e2) {} }
    return;
  }
  if (a === 'compartilhar') {
    NV.versoes = null; NV.links = null;
    el('dlg-ficha-t').textContent = (S.meta.nome || 'Sem nome') + ' · crônica e compartilhar';
    el('dlg-ficha-b').innerHTML = nvAbaFicha();
    return uiAbrirDialogo('dlg-ficha');
  }
  if (a === 'historico') {
    if (!nvLogado()) return uiAviso('O histórico de versões fica na conta. Entre para usar.');
    if (!(await nvGarantirNoServidor())) return uiAviso(NV.msg || 'A ficha ainda não subiu para o servidor.');
    return nvAbrirHistorico(S._id, S.meta.nome || 'Sem nome');
  }
  if (a === 'xp') return xpAbrir();
  if (a === 'duplicar') return nvDuplicar(S._id);
  if (a === 'excluir') return nvExcluir(S._id);
  if (a === 'nova') {
    const f = el('form-nova');
    const sis = nvFiltro().sis;
    if (sis) f.querySelector(`input[name="sistema"][value="${sis}"]`).checked = true;
    return uiAbrirDialogo('dlg-nova');
  }
  if (a === 'importar') { el('importar-msg').textContent = ''; el('importar-texto').value = ''; return uiAbrirDialogo('dlg-importar'); }
  if (a === 'escolher-arquivo') return el('arquivo-importar').click();
  if (a === 'importar-texto') {
    /* JSON deste app entra direto; texto ou JSON de outro lugar passa pela conferência */
    try { el('importar-msg').textContent = impAbrirTexto(el('importar-texto').value); }
    catch (e) { el('importar-msg').textContent = 'Não consegui ler este texto: ' + (e && e.message ? e.message : e); }
  }
});

/* nova ficha: sistema e jeito de começar, num passo só */
el('dlg-nova').addEventListener('close', () => {
  const d = el('dlg-nova');
  if (d.returnValue !== 'criar') return;
  const f = el('form-nova');
  const sis = f.querySelector('input[name="sistema"]:checked').value;
  const inicio = f.querySelector('input[name="inicio"]:checked').value;
  d.returnValue = '';
  nvNova();
  S.sistema = sis; S.forja = novaForja(); S.forja.sistema = sis;
  painelForja = inicio === 'forja';
  if (inicio === 'sorteada') sortear(); else render();
  const id = S._id || NV.indice.atual;
  uiIr('#/ficha/' + id + (inicio === 'sorteada' ? '' : '/editar'));
  if (inicio === 'sorteada') uiAviso('Ficha sorteada. Toque em Editar para ajustar.');
  if (inicio === 'forja') setTimeout(() => { const t = el('fj-contexto'); if (t) t.focus(); }, 60);
});

/* importar: entra sempre como ficha nova */
function uiImportar(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('vazio');
  nvSairLeitura(false);
  const novo = adotar(dados);
  if (novo._id && NV.indice.fichas[novo._id]) delete novo._id;
  S = nvIdentidade(novo);
  NV.semFicha = false;
  render();
  uiFecharDialogos();
  uiIr('#/ficha/' + S._id);
  uiAviso('Ficha importada: ' + (S.meta.nome || 'Sem nome') + '.');
}
el('arquivo-importar').onchange = e => {
  const arq = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!arq) return;
  if (/\.pdf$/i.test(arq.name) || arq.type === 'application/pdf') { uiFecharDialogos(); return abrirPdf(arq, avisoFicha); }
  const fr = new FileReader();
  fr.onload = () => {
    try { el('importar-msg').textContent = impAbrirTexto(fr.result); }
    catch (err) { el('importar-msg').textContent = 'Não consegui ler este arquivo: ' + (err && err.message ? err.message : err); }
  };
  fr.readAsText(arq);
};

el('form-senha').addEventListener('submit', ev => { ev.preventDefault(); nvTrocarSenha(); });
el('dlg-senha').addEventListener('close', () => { el('nv-senha-atual').value = ''; el('nv-senha-nova').value = ''; el('senha-msg').textContent = ''; });

/* ============================================================
   INÍCIO
   ============================================================ */
try { const tm = localStorage.getItem(CHAVE + ':tema'); if (tm) document.documentElement.dataset.theme = tm; } catch (e) {}
if (!bibliotecaCarregar()) { S = novoEstado(); delete S._id; NV.semFicha = true; }
trocarSistema(S.sistema || 'vampiro');
nvBarra();
nvEntrarAoCarregar();
(async () => {
  const q = new URLSearchParams(location.search);
  const limpar = () => { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} };
  if (q.get('ver')) { if (await nvAbrirLinkPublico()) return nvAgendar(800); }
  if (q.get('ficha')) {
    const id = q.get('ficha');
    limpar();
    const res = await nvAbrirPorLink(id);
    if (res === true) uiIr('#/ficha/' + id, true);
    else if (res !== 'remota') uiRota();
  } else if (q.get('cronica')) {
    const id = q.get('cronica');
    limpar();
    uiIr('#/cronicas/' + encodeURIComponent(id), true);
  } else {
    if (q.get('entrar')) limpar();
    uiRota();
  }
  nvAgendar(800);
})();

/* a tela de uma crônica se atualiza sozinha enquanto está aberta (jogadores entram, fichas mudam) */
setInterval(() => {
  if (document.visibilityState === 'visible' && UI.tela === 'cronicas' && UI.arg && nvLogado() && !document.querySelector('dialog[open]')) nvAbrirCronica(UI.arg);
}, 30000);
