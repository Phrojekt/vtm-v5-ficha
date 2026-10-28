/* ============================================================
   Ficha de Sangue — aplicação
   ============================================================ */
'use strict';

const $  = (s, r) => (r || document).querySelector(s);
const el = (s) => document.getElementById(s);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const CHAVE = 'ficha-de-sangue:v1';

/* ---------- estado ---------- */
function novoEstado() {
  const atr = {}; ATRIBUTOS.forEach(g => g.itens.forEach(([k]) => atr[k] = 1));
  const hab = {}, esp = {}; HABILIDADES.forEach(g => g.itens.forEach(([k]) => { hab[k] = 0; esp[k] = ''; }));
  return {
    sistema: 'vampiro',
    meta: { nome:'', jogador:'', cronica:'', conceito:'', ambicao:'', desejo:'', cla:'', geracao:13,
            senhor:'', seita:'', predador:'', ressonancia:'', aparencia:'' },
    atr, hab, esp,
    disc: [], vant: [], def: [], conv: [],
    tenets:'', bane:'', comp:'', notas:'',
    humanidade: 7, manchas: 0, fome: 1,
    saude: { sup:0, agg:0 }, vontade: { sup:0, agg:0 },
    danoMetade: true, registroMesa: [], notasPoder: {},
    bpOverride: null, distribHab: 'balanceado',
    xpTotal: 0, xpGasto: 0, xpLog: [],
    /* Caçador: A Revanche */
    credo: '', impeto: '', org: '', trunfos: [], desespero: 0, perigo: 0,
    mar: '', xpCompras: [], loresheet: '',
    /* campos que só existem no PDF (idade aparente, datas, traços, história) */
    extra: {},
    /* registro do último sorteio: quais etapas correram e o que a etapa 1 decidiu */
    _etapas: [], _perfil: '', _foco: '',
    forja: novaForja(),
    _pred: null
  };
}
function novaForja() {
  return { sistema:'vampiro', cla:'', geracao:'', predador:'', distrib:'', seita:'', foco:'', origem:'',
           mar:'', contexto:'', credo:'', impeto:'', fontes:FONTES_PADRAO.slice(),
           manter:{ nome:false, conceito:false, motivos:false, conviccoes:false } };
}
let S = novoEstado();
let painelForja = false;

/* a ficha vai para a biblioteca do navegador (nuvem.js), que cuida de subir para a conta */
function salvar() { histRegistrar(); bibliotecaGuardar(); nvBarra(); }

/* ============================================================
   DESFAZER / REFAZER
   Cada mudança na ficha passa por salvar(): ali a ficha inteira é
   comparada com a anterior e, se mudou, a anterior vai para a pilha.
   Digitação seguida (menos de 1,2 s entre teclas) vira um passo só.
   O histórico é da ficha aberta; trocar de ficha recomeça.
   ============================================================ */
const HIST = { id: null, atual: null, antes: [], depois: [], ultimoT: 0, agrupar: false, restaurando: false, versao: 0 };
/* cada mudança da ficha ganha um número: um aviso com "Desfazer" só vale para a versão em que nasceu */
function histMudou() {
  HIST.versao++;
  document.querySelectorAll('.aviso[data-versao]').forEach(a => { if (Number(a.dataset.versao) !== HIST.versao) a.remove(); });
}
const HIST_MAX = 40;
function histRegistrar() {
  const agrupar = HIST.agrupar; HIST.agrupar = false;
  if (HIST.restaurando) return;
  const id = S._id || null, json = JSON.stringify(S);
  if (HIST.id !== id) { HIST.id = id; HIST.atual = json; HIST.antes = []; HIST.depois = []; histBotoes(); return; }
  if (json === HIST.atual) return;
  const agora = Date.now();
  if (!(agrupar && HIST.ultimoT && agora - HIST.ultimoT < 1200)) {
    HIST.antes.push(HIST.atual);
    if (HIST.antes.length > HIST_MAX) HIST.antes.shift();
  }
  HIST.ultimoT = agrupar ? agora : 0;
  HIST.atual = json; HIST.depois = [];
  histMudou();
  histBotoes();
}
function histAplicar(json) {
  HIST.restaurando = true;
  try { const id = S._id; S = adotar(JSON.parse(json)); S._id = id; HIST.atual = json; HIST.ultimoT = 0; render(); }
  finally { HIST.restaurando = false; }
  histMudou();
  /* o render acima não registrou: grava a ficha restaurada */
  bibliotecaGuardar(); nvBarra(); histBotoes();
}
function histDesfazer() {
  if (!HIST.antes.length || HIST.id !== (S._id || null)) return false;
  HIST.depois.push(HIST.atual); histAplicar(HIST.antes.pop()); return true;
}
function histRefazer() {
  if (!HIST.depois.length || HIST.id !== (S._id || null)) return false;
  HIST.antes.push(HIST.atual); histAplicar(HIST.depois.pop()); return true;
}
function histBotoes() {
  const d = document.getElementById('btn-hist-desfazer'), r = document.getElementById('btn-hist-refazer');
  if (d) d.disabled = !HIST.antes.length;
  if (r) r.disabled = !HIST.depois.length;
}

/* ficha importada de outro lugar: as regras de criação só são conferidas se a pessoa pedir
   (a ficha pode já ter experiência e Tipo de Predador embutidos, e os avisos seriam falsos) */
const criacaoConferida = () => !S.importada || !!S.regrasCriacao;
function adotar(bruto) {
  const s = Object.assign(novoEstado(), bruto);
  s.forja = Object.assign(novaForja(), s.forja);
  s.forja.manter = Object.assign(novaForja().manter, s.forja.manter);
  return s;
}
function setPath(path, val) {
  const p = path.split('.'); let o = S;
  for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
  o[p[p.length - 1]] = val;
}
function getPath(path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
}

/* ---------- derivados ---------- */
const potencia = () => S.bpOverride != null ? S.bpOverride : potenciaPorGeracao(Number(S.meta.geracao) || 13);
const tabelaBP  = () => POTENCIA_SANGUE[Math.max(0, Math.min(10, potencia()))];
const maxSaude  = () => (S.atr.vigor || 1) + 3;
const maxVontade= () => (S.atr.autocontrole || 1) + (S.atr.determinacao || 1);
const discDoCla = () => (CLAS[S.meta.cla] ? CLAS[S.meta.cla].disc : []);

/* ---------- componentes ---------- */
/* compras de XP de um traço, e o nível que ele tinha antes delas (o da criação) */
const comprasXP = (tipo, k) => (S.xpCompras || []).filter(c => c.tipo === tipo && c.k === k);
function nivelCriacao(tipo, k, atual) {
  const cs = comprasXP(tipo, k);
  return cs.length ? Math.min(atual, ...cs.map(c => Number(c.de) || 0)) : atual;
}
function traçoDoCaminho(path) {
  let m;
  if ((m = /^(atr|hab)\.(\w+)$/.exec(path))) return { tipo: m[1], k: m[2] };
  if ((m = /^disc\.(\d+)\.nivel$/.exec(path)) && S.disc[Number(m[1])]) return { tipo: 'disc', k: S.disc[Number(m[1])].nome };
  return null;
}
function dots(path, valor, max, extra) {
  /* modo Evoluir: marca o próximo ponto e mostra o custo (experiencia.js) */
  const evo = typeof evoDots === 'function' ? evoDots(path, valor, max) : null;
  /* pontos comprados com XP ficam dourados: a régua de criação não os conta */
  const tr = traçoDoCaminho(path);
  const base = tr ? nivelCriacao(tr.tipo, tr.k, valor) : valor;
  let h = `<span class="dots${evo ? ' evo' : ''}" role="group" aria-label="${esc(extra || '')}${base < valor ? `: ${base} da criação, ${valor - base} de XP` : ''}">`;
  for (let i = 1; i <= max; i++) {
    const xp = i > base && i <= valor;
    h += `<button type="button" class="dot${i <= valor ? ' on' : ''}${xp ? ' xp' : ''}${evo ? evo.classe(i) : ''}" data-dot="${esc(path)}" data-i="${i}" data-max="${max}" aria-label="${i}${xp ? ' (XP)' : ''}"${xp ? ' title="Comprado com experiência"' : ''}></button>`;
  }
  return h + '</span>' + (evo ? evo.etiqueta : '');
}
function trilha(nome, total, sup, agg) {
  let h = `<div class="track">`;
  for (let i = 0; i < total; i++) {
    const cls = i < agg ? 'agg' : (i < agg + sup ? 'sup' : '');
    const mk  = i < agg ? '✕' : (i < agg + sup ? '╱' : '');
    h += `<button type="button" class="bx ${cls}" data-box="${nome}" data-i="${i}" aria-label="caixa ${i + 1}">${mk}</button>`;
  }
  return h + '</div>';
}

/* ============================================================
   NA MESA: dano progressivo, Teste de Fome e registro
   Regras do V5: dano superficial preenche caixas vazias; sem caixa vazia,
   cada ponto novo transforma um superficial em agravado. Agravado também
   ocupa uma vazia ou converte um superficial. Trilha cheia = Debilitado
   (−2 dados); Vitalidade toda agravada = Torpor (vampiro).
   ============================================================ */
const MESA = { qtd: { saude: 1, vontade: 1 }, ultimoTeste: null };
const totalTrilha = n => n === 'saude' ? maxSaude() : maxVontade();
function aplicarDano(nome, tipo, n) {
  const o = S[nome], total = totalTrilha(nome);
  let feitos = 0;
  for (let k = 0; k < n; k++) {
    const livres = total - o.sup - o.agg;
    if (livres > 0) { o[tipo]++; feitos++; }
    else if (o.sup > 0) { o.sup--; o.agg++; feitos++; }
  }
  return feitos;
}
function estadoTrilha(nome) {
  const o = S[nome], total = totalTrilha(nome), marcado = o.sup + o.agg;
  if (nome === 'saude') {
    if (o.agg >= total) return { k: 'grave', t: ehCacador() ? 'Morrendo: a Vitalidade está toda agravada' : 'Torpor: a Vitalidade está toda agravada' };
    if (marcado >= total) return { k: 'debil', t: 'Debilitado: −2 dados em testes Físicos' };
    if (marcado) return { k: 'ferido', t: 'Ferido' };
    return { k: 'ok', t: 'Ileso' };
  }
  if (o.agg >= total) return { k: 'grave', t: 'Quebrado: a Força de Vontade está toda agravada' };
  if (marcado >= total) return { k: 'debil', t: 'Debilitado: −2 dados em testes Sociais e Mentais' };
  if (marcado) return { k: 'ferido', t: 'Abalado' };
  return { k: 'ok', t: 'Inteira' };
}
function registrarMesa(txt) {
  S.registroMesa = (S.registroMesa || []).concat([{ em: Date.now(), txt }]).slice(-12);
}
function blocoDano(nome) {
  const o = S[nome], total = totalTrilha(nome), st = estadoTrilha(nome), q = MESA.qtd[nome] || 1;
  const rot = nome === 'saude' ? 'Vitalidade' : 'Força de Vontade';
  const formula = nome === 'saude' ? 'Vigor + 3' : 'Autocontrole + Determinação';
  const vamp = nome === 'saude' && !ehCacador();
  const b = (tipo, d, txt, cls) => `<button type="button" class="btn sm ${cls || ''}" data-act="dano" data-trilha="${nome}" data-tipo="${tipo}" data-d="${d}">${txt}</button>`;
  return `<div class="vital vital-dano" data-k="${st.k}">
    <div class="vital-h"><span class="lbl">${rot}</span><span class="n" title="${formula}">${total - o.sup - o.agg}<small>/${total}</small></span></div>
    ${trilha(nome, total, o.sup, o.agg)}
    <p class="dano-st" data-k="${st.k}"><b>${esc(st.t)}</b>${o.sup || o.agg ? `<span>${o.sup} superficial · ${o.agg} agravado</span>` : ''}</p>
    <div class="dano-ctl" role="group" aria-label="Marcar dano em ${rot}">
      <span class="qtd"><button type="button" data-act="dano-qtd" data-trilha="${nome}" data-d="1" aria-label="Mais">+</button><output aria-label="Quantidade">${q}</output><button type="button" data-act="dano-qtd" data-trilha="${nome}" data-d="-1" aria-label="Menos">−</button></span>
      <span class="dano-l">Sofrer</span>${b('sup', 1, 'Superficial')}${b('agg', 1, 'Agravado', 'agg')}
      <span class="dano-l">Curar</span>${b('sup', -1, 'Superficial', 'ghost')}${b('agg', -1, 'Agravado', 'ghost')}
    </div>
    ${vamp ? `<div class="dano-extra">
      <label class="chk"><input type="checkbox" data-act="dano-metade"${S.danoMetade !== false ? ' checked' : ''}> Dividir superficial pela metade</label>
      <button type="button" class="btn sm" data-act="remendar" title="Um Teste de Fome cura ${tabelaBP().recuperado} de dano superficial">Remendar com sangue</button>
    </div>` : ''}
  </div>`;
}
const dadoFace = n => `<span class="d10${n >= 6 ? ' ok' : ''}${n === 10 ? ' crit' : ''}">${n}</span>`;
function blocoFome() {
  const u = MESA.ultimoTeste;
  return `<div class="vital vital-fome">
    <div class="vital-h"><span class="lbl">Fome</span><span class="n fome-n">${S.fome}<small>/5</small></span></div>
    <span class="dots gotas">${[1,2,3,4,5].map(i => `<button type="button" class="dot gota${i <= S.fome ? ' temp' : ''}" data-dot="fome" data-i="${i}" data-max="5" aria-label="Fome ${i}"></button>`).join('')}</span>
    <div class="fome-ctl">
      <button type="button" class="btn sm primary" data-act="teste-fome"${S.fome >= 5 ? ' disabled title="Com Fome 5 não há Teste de Fome: alimente-se ou teste o frenesi"' : ''}>Teste de Fome</button>
      ${u ? `<span class="ultimo" aria-live="polite">${u.dados.map(dadoFace).join('')} ${u.ok ? 'passou' : 'Fome +1'}</span>` : '<span class="ultimo note">1 dado: 6 ou mais passa</span>'}
    </div>
  </div>`;
}
function blocoRegistro() {
  const r = (S.registroMesa || []).slice(-4).reverse();
  if (!r.length) return '';
  const hora = ms => { try { return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  return `<div class="vital registro">
    <div class="vital-h"><span class="lbl">Registro da cena</span><button type="button" class="btn sm ghost" data-act="limpar-registro">Limpar</button></div>
    <ol>${r.map(x => `<li><time>${hora(x.em)}</time> ${esc(x.txt)}</li>`).join('')}</ol>
  </div>`;
}
/* Teste de Fome (Rouse Check): um dado; 6+ passa, senão a Fome sobe.
   Poder dentro da Rerrolagem de Sangue: rola dois e fica com o melhor. */
function testeDeFome(opts) {
  opts = opts || {};
  if (S.fome >= 5) {
    if (typeof uiAviso === 'function') uiAviso('Fome 5: não dá para fazer Teste de Fome. É hora de se alimentar ou de testar o frenesi.');
    return null;
  }
  const bp = tabelaBP();
  const rer = !!(opts.nivel && bp.rerrolagem && opts.nivel <= bp.rerrolagem);
  const rola = () => 1 + Math.floor(Math.random() * 10);
  const dados = rer ? [rola(), rola()] : [rola()];
  const ok = Math.max(...dados) >= 6;
  const antes = S.fome;
  if (!ok) S.fome = Math.min(5, S.fome + 1);
  MESA.ultimoTeste = { dados, ok };
  const quem = opts.poder ? opts.poder + ': ' : (opts.motivo ? opts.motivo + ': ' : '');
  registrarMesa(`${quem}Teste de Fome ${dados.join(' e ')} — ${ok ? 'passou' : `Fome ${antes} → ${S.fome}`}`);
  return { ok, dados, rer, fome: S.fome };
}
function avisoTeste(r, quem) {
  if (!r || typeof uiAviso !== 'function') return;
  const dados = r.dados.join(' e ');
  uiAviso(`${quem ? quem + ' — ' : ''}Teste de Fome: ${dados}${r.rer ? ' (Rerrolagem de Sangue)' : ''}. ${r.ok ? `Passou, a Fome continua em ${r.fome}.` : `Falhou, a Fome sobe para ${r.fome}.`}${!r.ok && r.fome >= 5 ? ' A Besta está à porta.' : ''}`,
    { rotulo: 'Desfazer', fn: () => histDesfazer() });
}

/* ---------- orçamento de criação ---------- */
function contagem(obj, chaves) {
  const c = {}; chaves.forEach(k => { const v = obj[k] || 0; c[v] = (c[v] || 0) + 1; }); return c;
}
function diffDistrib(atual, alvo) {
  const falta = [], sobra = [], faltaN = [], sobraN = [];
  const niveis = new Set([...Object.keys(alvo), ...Object.keys(atual)].map(Number).filter(n => n > 0));
  [...niveis].sort((a, b) => b - a).forEach(n => {
    const d = (atual[n] || 0) - (alvo[n] || 0);
    if (d < 0) { falta.push(`${-d}× ${n}`); faltaN.push({ n, q: -d }); }
    if (d > 0) { sobra.push(`${d}× ${n}`); sobraN.push({ n, q: d }); }
  });
  /* "sobra" num nível abaixo de um que ainda falta são só pontos que ainda não
     subiram (numa ficha em branco, oito Atributos em 1). Excesso de verdade é
     o que passa do nível mais alto que ainda falta preencher. */
  const maiorFalta = faltaN.length ? Math.max(...faltaN.map(x => x.n)) : 0;
  const excesso = sobraN.filter(x => x.n > maiorFalta);
  const nFalta = faltaN.reduce((t, x) => t + x.q, 0);
  const nExcesso = excesso.reduce((t, x) => t + x.q, 0);
  return { ok: !falta.length && !sobra.length, falta, sobra, faltaN, sobraN, excesso, nFalta, nExcesso, atual, alvo };
}
/* ficha sem experiência registrada: pontos acima da criação são erro de
   distribuição, não XP. Só uma ficha com XP (total ou compras) é lida como
   "criação + experiência". */
const usaXP = () => (Number(S.xpTotal) || 0) > 0 || (S.xpCompras || []).length > 0;
const NUM_EXT = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
/* "Faltam: 1 Atributo com 4, 3 com 3 e 4 com 2." — em português de mesa */
function textoDistrib(d, sing, plur) {
  if (d.ok) return '';
  const lista = itens => {
    const partes = itens.map((x, i) => `${x.q}${i === 0 ? ' ' + (x.q > 1 ? plur : sing) : ''} com ${x.n}`);
    return partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0];
  };
  const frases = [];
  if (d.faltaN.length) frases.push(`Falta${d.nFalta > 1 ? 'm' : ''} ${lista(d.faltaN)}.`);
  d.excesso.forEach(x => {
    const permite = d.alvo[x.n] || 0;
    const tem = (d.atual[x.n] || 0);
    frases.push(permite
      ? `${tem} ${tem > 1 ? plur : sing} com ${x.n}: a criação permite ${permite === 1 ? 'só um' : 'só ' + permite}.`
      : `${tem} ${tem > 1 ? plur : sing} com ${x.n}: na criação o máximo é ${Math.max(...Object.keys(d.alvo).map(Number))}.`);
  });
  return frases.join(' ');
}
/* o medidor: uma casa por traço que a criação pede em cada nível */
function medidorDistrib(d) {
  if (!d || !d.alvo) return '';
  const niveis = [...new Set([...Object.keys(d.alvo).map(Number), ...d.excesso.map(x => x.n)])].filter(n => n > 0).sort((a, b) => b - a);
  const maiorFalta = d.faltaN.length ? Math.max(...d.faltaN.map(x => x.n)) : 0;
  return `<div class="medidor" aria-hidden="true">${niveis.map(n => {
    const q = d.alvo[n] || 0, tem = d.atual[n] || 0;
    const cheias = Math.min(q, tem), extra = n > maiorFalta ? Math.max(0, tem - q) : 0;
    const st = extra ? 'over' : (cheias === q ? 'ok' : 'under');
    let casas = '';
    for (let i = 0; i < q; i++) casas += `<i class="${i < cheias ? 'on' : ''}"></i>`;
    for (let i = 0; i < extra; i++) casas += '<i class="mais"></i>';
    return `<span class="md-g" data-estado="${st}"><b>${n}</b>${casas}<small>${Math.min(tem, n > maiorFalta ? tem : q)}/${q}</small></span>`;
  }).join('')}</div>`;
}
function orcamento() {
  const extra = MAR_DO_TEMPO[S.mar] || { vantagens: 0, defeitos: 0 };
  const chAtr = ATRIBUTOS.flatMap(g => g.itens.map(i => i[0]));
  const chHab = HABILIDADES.flatMap(g => g.itens.map(i => i[0]));
  const atrBase = baseSemXP(S.atr, 'atr'), habBase = baseSemXP(S.hab, 'hab');
  const dAtr = diffDistrib(contagem(atrBase, chAtr), DISTRIB_ATRIBUTOS);
  const dHab = diffDistrib(contagem(habBase, chHab), DISTRIB_HABILIDADES[S.distribHab].mapa);

  // "Duas Disciplinas do clã: dois pontos numa e um ponto noutra."
  // O Tipo de Predador acrescenta mais um ponto. Sangue-ralo não tem nenhuma.
  const predConcedeDisc = !!(S._pred && S._pred.disc);
  const semDisciplinas = S.meta.cla === 'Sangue-ralo';
  const discAlvo = (semDisciplinas ? 0 : DISTRIB_DISCIPLINAS.total) + (predConcedeDisc ? 1 : 0);
  const xpDisc = (S.xpCompras || []).filter(c => c.tipo === 'disc').length;
  /* cada compra de Vantagem soma os pontos que trouxe (uma nova pode entrar com 2, como Aliados) */
  const xpVant = (S.xpCompras || []).filter(c => c.tipo === 'vant').reduce((t, c) => t + (((c.para || 0) - (c.de || 0)) || 1), 0);
  const discAtual = S.disc.reduce((t, d) => t + (d.nivel || 0), 0) - xpDisc;

  // avisos de forma: a repartição 2+1 e um poder por ponto
  const avisosDisc = [];
  if (!semDisciplinas && S.meta.cla) {
    if (S.disc.length < 2) avisosDisc.push('escolha duas Disciplinas');
    else if (!S.disc.some(d => d.nivel >= 2)) avisosDisc.push('uma delas precisa de dois pontos');
  }
  S.disc.forEach(d => {
    const n = (d.poderes || []).length;
    if (n !== d.nivel) avisosDisc.push(`${d.nome}: ${n} de ${d.nivel} poder(es)`);
  });

  const vantAtual = S.vant.filter(v => v.fonte !== 'predador').reduce((t, v) => t + (Number(v.pontos) || 0), 0);
  const defAtual  = S.def .filter(v => v.fonte !== 'predador').reduce((t, v) => t + (Number(v.pontos) || 0), 0);

  // Disciplinas abertas com experiência são legítimas — custam × 7 e é assim
  // que um vampiro antigo junta repertório. Só as que estariam na criação
  // contam como fora do clã.
  const abertasComXP = new Set((S.xpCompras || []).filter(c => c.tipo === 'disc' && c.de === 0).map(c => c.k));
  const foraDoCla = S.meta.cla && S.meta.cla !== 'Caitiff'
    ? S.disc.filter(d => !discDoCla().includes(d.nome)
                      && !(S._pred && S._pred.disc === d.nome)
                      && !abertasComXP.has(d.nome)).map(d => d.nome)
    : [];

  return {
    atr: dAtr, hab: dHab,
    disc: { atual: discAtual, alvo: discAlvo, foraDoCla, avisos: avisosDisc },
    vant: { atual: vantAtual - xpVant, alvo: 7 + extra.vantagens },
    def:  { atual: defAtual,  alvo: 2 + extra.defeitos }
  };
}
/* ============================================================
   CRIAÇÃO + EXPERIÊNCIA
   Uma ficha evoluída tem pontos acima da criação. Antes, só o que passava
   por "Gastar experiência" era descontado; o que se subia à mão (ou vinha
   de outra ficha) aparecia como "falta/sobra". Aqui a pergunta é outra:
   esta ficha cabe em "uma criação válida + experiência"? Se cabe, quanto
   XP custam os pontos a mais, pela tabela do livro (Atributo: novo nível
   × 5; Habilidade × 3; Disciplina do clã × 5, de fora × 7, Caitiff × 6;
   Vantagem 3 por ponto; Especialização 3).
   Como cada nível custa o mesmo não importa de onde se parta, o custo de
   Atributos e Habilidades é o mesmo para qualquer repartição que caiba:
   soma(custo até o nível atual) − soma(custo até o nível da criação).
   ============================================================ */
const triangular = n => n * (n + 1) / 2;
/* cabe? cada valor da criação precisa de um traço com pelo menos aquele nível */
function cabeNaCriacao(valores, criacao) {
  const v = valores.slice().sort((a, b) => b - a), c = criacao.slice().sort((a, b) => b - a);
  return c.every((x, i) => (v[i] || 0) >= x);
}
const multiconjunto = mapa => Object.entries(mapa).flatMap(([n, q]) => Array(q).fill(Number(n)));
let _xpMemo = { chave: null, r: null };
function orcamentoXP() {
  const chave = JSON.stringify([S.atr, S.hab, S.esp, S.disc, S.vant, S.def, S.meta.cla, S.meta.predador, S.meta.geracao, S.mar,
    S.xpCompras, S.xpTotal, S.xpGasto, S.distribHab, S.bpOverride, S.sistema, S._pred && S._pred.disc]);
  if (_xpMemo.chave === chave) return _xpMemo.r;
  const o = orcamento();
  const r = {};

  /* Atributos: todos começam em 1 */
  const va = Object.values(baseSemXP(S.atr, 'atr')).map(Number);
  const ca = multiconjunto(DISTRIB_ATRIBUTOS);
  r.atr = cabeNaCriacao(va, ca)
    ? { viavel: true, xp: 5 * (va.reduce((t, n) => t + triangular(n), 0) - ca.reduce((t, n) => t + triangular(n), 0)) }
    : { viavel: false, xp: 0 };
  r.atr.exato = o.atr.ok;

  /* Habilidades: a repartição que cabe com menos XP (a escolhida na ficha, se empatar) */
  const vh = Object.values(baseSemXP(S.hab, 'hab')).map(Number);
  const somaV = vh.reduce((t, n) => t + triangular(n), 0);
  let melhor = null;
  for (const k of [S.distribHab].concat(Object.keys(DISTRIB_HABILIDADES))) {
    const c = multiconjunto(DISTRIB_HABILIDADES[k].mapa);
    if (!cabeNaCriacao(vh, c)) continue;
    const xp = 3 * (somaV - c.reduce((t, n) => t + triangular(n), 0));
    if (!melhor || xp < melhor.xp) melhor = { viavel: true, xp, distrib: k };
  }
  r.hab = melhor || { viavel: false, xp: 0 };
  r.hab.exato = o.hab.ok;

  const compras = S.xpCompras || [];
  if (ehCacador()) {
    r.disc = { julgavel: false, viavel: true, xp: 0 }; r.vant = { viavel: true, xp: 0 }; r.esp = { xp: 0 }; r.bp = { xp: 0 };
  } else {
    const pred = PREDADORES[S.meta.predador];
    /* Disciplinas: 2 + 1 em Disciplinas do clã, +1 do Tipo de Predador numa das dele;
       o resto é experiência. Testa todas as reparticões e fica com a mais barata. */
    const cla = S.meta.cla;
    if (!cla || cla === 'Sangue-ralo' || !CLAS[cla]) r.disc = { julgavel: false, viavel: true, xp: 0 };
    else {
      const caitiff = cla === 'Caitiff', doCla = CLAS[cla].disc;
      const nivel = {};
      S.disc.forEach(d => { nivel[d.nome] = d.nivel || 0; });
      compras.filter(c => c.tipo === 'disc' && c.k in nivel).forEach(c => { nivel[c.k] = Math.min(nivel[c.k], c.de); });
      const nomes = Object.keys(nivel).filter(n => nivel[n] > 0);
      const mult = n => caitiff ? 6 : (doCla.includes(n) ? 5 : 7);
      const elegivel = n => caitiff || doCla.includes(n);
      const predOpcoes = S._pred && S._pred.disc ? [S._pred.disc] : (pred && pred.disc && pred.disc.length ? pred.disc : null);
      const custo = base => nomes.reduce((t, n) => {
        const b = base[n] || 0;
        if (b > nivel[n]) return Infinity;
        let c = 0; for (let l = b + 1; l <= nivel[n]; l++) c += l * mult(n);
        return t + c;
      }, 0);
      let menor = Infinity;
      for (const a of nomes) for (const b of nomes) {
        if (a === b || !elegivel(a) || !elegivel(b)) continue;
        const preds = predOpcoes ? predOpcoes.filter(p => nomes.includes(p)) : [null];
        for (const p of preds) {
          const base = { [a]: 2, [b]: 1 };
          if (p) base[p] = (base[p] || 0) + 1;
          menor = Math.min(menor, custo(base));
        }
      }
      r.disc = isFinite(menor) ? { julgavel: true, viavel: true, xp: menor } : { julgavel: true, viavel: false, xp: 0 };
    }

    /* Vantagens acima do previsto: 3 XP por ponto. Abaixo é falta de verdade. */
    const dv = o.vant.atual - o.vant.alvo;
    r.vant = { viavel: dv >= 0, xp: Math.max(0, dv) * 3, exato: dv === 0 };

    /* Especializações além das da criação: uma à escolha, uma em cada Ofícios/Erudição/
       Performance/Ciência com pontos e a do Tipo de Predador */
    const total = Object.values(S.esp || {}).reduce((t, v) => t + String(v || '').split(',').map(x => x.trim()).filter(Boolean).length, 0);
    const gratis = 1 + ESPECIALIDADE_GRATIS.filter(k => (S.hab[k] || 0) > 0).length + (pred && pred.esp && pred.esp.length ? 1 : 0);
    const espXP = compras.filter(c => c.tipo === 'esp').length;
    r.esp = { xp: Math.max(0, total - gratis - espXP) * 3 };

    /* Potência de Sangue não entra: nas idades antigas e no sangue-ralo ela vem da idade,
       não de experiência, e não há como separar uma coisa da outra pela ficha.
       Comprada em "Gastar experiência", já está no XP registrado. */
    r.bp = { xp: 0 };
  }

  /* sem XP na ficha, nada acima da criação é lido como experiência: aparece
     como erro de distribuição, e Notas e XP oferece registrar o XP se for o caso */
  const semXP = !usaXP();
  if (semXP) ['atr', 'hab', 'disc', 'vant'].forEach(k => { if (r[k].xp > 0) r[k] = Object.assign({}, r[k], { viavel: false }); });
  r.implicito = r.atr.xp + r.hab.xp + r.disc.xp + r.vant.xp + r.esp.xp + r.bp.xp;
  r.registrado = compras.reduce((t, c) => t + (Number(c.custo) || 0), 0);
  r.livre = Math.max(0, (Number(S.xpGasto) || 0) - r.registrado);
  r.faltaXP = Math.max(0, r.implicito - r.livre);
  r.semRegistro = semXP && r.implicito > 0;
  r.coberto = semXP ? true : r.faltaXP === 0;
  r.partes = [['Atributos', r.atr.xp], ['Habilidades', r.hab.xp], ['Disciplinas', r.disc.xp], ['Vantagens', r.vant.xp],
              ['Especializações', r.esp.xp], ['Potência de Sangue', r.bp.xp]].filter(x => x[1] > 0);
  _xpMemo = { chave, r };
  return r;
}
/* o resumo de experiência, na lateral e no quadro de Notas e XP */
function blocoXP(compacto) {
  const x = orcamentoXP();
  if (!x.implicito) return '';
  if (x.semRegistro) return compacto ? '' : `<div class="xp-impl" data-estado="under">
    <p><span class="pip under" aria-hidden="true"></span>A ficha tem pontos acima da criação (<strong>${x.implicito} XP</strong> pela tabela do livro) e nenhuma experiência registrada, por isso eles aparecem como erro nas abas. Se vieram de experiência, registre:</p>
    <button type="button" class="btn sm" data-act="xp-implicito">Registrar ${x.faltaXP} XP (total e gasto)</button>
  </div>`;
  /* coberto: não há nada a decidir, o quadro some */
  if (x.coberto) return '';
  const lista = x.partes.map(([t, v]) => `${t} ${v}`).join(' · ');
  const semTotal = (Number(S.xpTotal) || 0) < (x.registrado + x.implicito);
  return `<div class="xp-impl" data-estado="${x.coberto ? 'ok' : 'under'}">
    <p><span class="pip ${x.coberto ? 'ok' : 'under'}" aria-hidden="true"></span><strong>${x.implicito} XP</strong> em pontos acima da criação${compacto ? '' : ` <span class="note">(${esc(lista)})</span>`}.
    ${x.coberto ? 'Cabem no XP gasto.' : `${x.livre ? `Só ${x.livre} estão no XP gasto.` : 'Ainda não estão no XP gasto, por isso aparecem como disponíveis.'}`}</p>
    ${x.coberto ? '' : `<button type="button" class="btn sm" data-act="xp-implicito">${semTotal ? `Registrar ${x.faltaXP} XP (total e gasto)` : `Contar ${x.faltaXP} XP como gastos`}</button>`}
  </div>`;
}

/* linha de instrução ao vivo no topo de cada quadro da criação:
   diz o que ainda falta, em vez de só repetir a regra */
function statusCriacao(estado, texto, antes) {
  if (!criacaoConferida()) return '';
  const ok = estado === 'ok' && !texto;
  return `<div class="cstatus" data-estado="${estado}" role="status">${antes || ''}<p><span class="pip ${estado}" aria-hidden="true"></span>${ok ? 'Pronto para a criação.' : esc(texto)}</p></div>`;
}
/* "criação + experiência": pontos a mais viram XP; só o que falta é aviso */
function textoXP(xp) {
  const x = orcamentoXP();
  return `Os pontos acima da criação equivalem a ${xp} XP` + (x.coberto ? ', já contados no XP gasto.' : '. Registre esse XP em Notas e XP para fechar a conta.');
}
/* o que a régua de criação deixou de fora por ter vindo de XP, com o botão
   "Foi na criação" para quando o ponto, na verdade, foi da criação */
function blocoXPCriacao(tipo, d) {
  if (!criacaoConferida()) return '';
  const ks = [...new Set((S.xpCompras || []).filter(c => c.tipo === tipo).map(c => c.k))];
  if (!ks.length) return '';
  const atual = k => tipo === 'atr' ? (S.atr[k] || 1) : tipo === 'hab' ? (S.hab[k] || 0) : ((S.disc.find(x => x.nome === k) || {}).nivel || 0);
  const nome = k => tipo === 'atr' ? xpRotAtrApp(k) : tipo === 'hab' ? rotuloHab(k) : k;
  const aberto = d && !d.ok;
  /* criação fechada: os pontos dourados bastam, o quadro some */
  if (!aberto) return '';
  /* quais compras, se fossem da criação, fecham ou melhoram a conta */
  const erro = x => x ? x.nFalta + x.nExcesso : 0;
  const ajuda = k => {
    if (!d || d.ok || !d.alvo || tipo === 'disc') return '';
    const fonte = tipo === 'atr' ? S.atr : S.hab;
    const base = baseSemXP(fonte, tipo); base[k] = fonte[k] || 0;
    const chaves = (tipo === 'atr' ? ATRIBUTOS : HABILIDADES).flatMap(g => g.itens.map(i => i[0]));
    const nd = diffDistrib(contagem(base, chaves), d.alvo);
    return nd.ok ? 'fecha a criação' : (erro(nd) < erro(d) ? 'ajuda a fechar' : '');
  };
  const itens = ks.map(k => {
    const cs = comprasXP(tipo, k), custo = cs.reduce((t, c) => t + (Number(c.custo) || 0), 0);
    const a = atual(k), de = nivelCriacao(tipo, k, a), dica = ajuda(k);
    return `<li${dica ? ' class="ajuda"' : ''}><span><b>${esc(nome(k))} ${de} → ${a}</b> <small>${custo} XP${dica ? ' · <em>' + dica + '</em>' : ''}</small></span>
      ${aberto ? `<button type="button" class="btn sm${dica === 'fecha a criação' ? ' primary' : ''}" data-act="xp-para-criacao" data-tipo="${tipo}" data-k="${esc(k)}" title="O ponto fica; os ${custo} XP voltam ao disponível">Foi na criação</button>` : ''}</li>`;
  }).join('');
  return `<div class="xp-cria">
    <p><span class="xp-amostra" aria-hidden="true"></span>${aberto
      ? 'A régua acima conta a <b>criação</b>: os pontos dourados vieram de XP e ficam de fora. Se algum deles foi da criação, marque abaixo: o ponto fica e o XP volta.'
      : 'Os pontos dourados vieram de XP e ficam fora da conta da criação.'}</p>
    <ul>${itens}</ul>
  </div>`;
}
const xpRotAtrApp = k => { for (const g of ATRIBUTOS) for (const i of g.itens) if (i[0] === k) return i[1]; return k; };
/* "Foi na criação": tira as compras de XP do traço e devolve o XP; o ponto continua */
function xpParaCriacao(tipo, k) {
  const cs = comprasXP(tipo, k);
  if (!cs.length) return;
  const custo = cs.reduce((t, c) => t + (Number(c.custo) || 0), 0);
  S.xpCompras = S.xpCompras.filter(c => !(c.tipo === tipo && c.k === k));
  S.xpGasto = Math.max(0, (Number(S.xpGasto) || 0) - custo);
  render();
  if (typeof uiAviso === 'function') uiAviso(`${tipo === 'atr' ? xpRotAtrApp(k) : tipo === 'hab' ? rotuloHab(k) : k} agora conta como criação; ${custo} XP voltaram ao disponível.`, { rotulo: 'Desfazer', fn: () => histDesfazer() }, { grupo: 'xp' });
}
function statusDistrib(d, tipo) {
  const x = tipo ? orcamentoXP()[tipo] : null;
  const nomes = tipo === 'hab' ? ['Habilidade', 'Habilidades'] : ['Atributo', 'Atributos'];
  const xpBloco = tipo ? blocoXPCriacao(tipo, d) : '';
  if (d.ok) return statusCriacao('ok', '', medidorDistrib(d)) + xpBloco;
  if (x && x.viavel) return statusCriacao(orcamentoXP().coberto ? 'ok' : 'under', textoXP(x.xp)
    + (tipo === 'hab' && x.distrib !== S.distribHab ? ` (conta feita como ${DISTRIB_HABILIDADES[x.distrib].nome})` : '')) + xpBloco;
  return statusCriacao(d.nExcesso ? 'over' : 'under', (xpBloco ? 'Na criação: ' : '') + textoDistrib(d, nomes[0], nomes[1]), medidorDistrib(d)) + xpBloco;
}
function statusPontos(atual, alvo, nome) {
  const st = estadoNum(atual, alvo);
  if (st === 'over' && nome === 'Vantagens' && usaXP()) return statusCriacao(orcamentoXP().coberto ? 'ok' : 'under', textoXP((atual - alvo) * 3));
  const txt = st === 'under' ? `Falta${alvo - atual > 1 ? 'm' : ''} ${alvo - atual} ponto${alvo - atual > 1 ? 's' : ''} de ${nome}: ${atual} de ${alvo} usados.`
                             : `${atual - alvo} ponto${atual - alvo > 1 ? 's' : ''} de ${nome} a mais: a criação dá ${alvo}, a ficha tem ${atual}.`;
  return statusCriacao(st, st === 'ok' ? '' : txt);
}

function statusDisciplinas() {
  const o = orcamento().disc;
  if (!S.meta.cla) return statusCriacao('under', 'Escolha o clã em Identidade: ele define quais Disciplinas entram na criação.');
  const x = orcamentoXP().disc;
  const discXP = x.julgavel && x.viavel;
  const partes = [];
  /* com experiência, Disciplinas de fora do clã e pontos a mais são normais */
  if (discXP) { if (x.xp > 0) partes.push(textoXP(x.xp)); }
  else {
    if (o.atual < o.alvo) partes.push(`falta${o.alvo - o.atual > 1 ? 'm' : ''} ${o.alvo - o.atual} ponto${o.alvo - o.atual > 1 ? 's' : ''} (${o.atual} de ${o.alvo})`);
    if (o.atual > o.alvo) partes.push(`${o.atual - o.alvo} ponto${o.atual - o.alvo > 1 ? 's' : ''} a mais que a criação dá (${o.atual} de ${o.alvo})`);
    if (o.foraDoCla.length) partes.push('fora do clã na criação: ' + o.foraDoCla.join(', '));
  }
  const soXP = partes.length === 1 && discXP && x.xp > 0;
  partes.push(...o.avisos);
  const xpBloco = blocoXPCriacao('disc', { ok: o.atual >= o.alvo });
  if (!partes.length) return statusCriacao('ok') + xpBloco;
  const certo = soXP && partes.length === 1 && orcamentoXP().coberto;
  const txt = partes.join('; ');
  return statusCriacao(certo ? 'ok' : 'under', soXP ? txt : txt.charAt(0).toUpperCase() + txt.slice(1) + '.') + xpBloco;
}
function estadoNum(atual, alvo) { return atual === alvo ? 'ok' : (atual > alvo ? 'over' : 'under'); }

/* ============================================================
   RENDER — trilha lateral
   ============================================================ */
function renderRail() {
  const o = orcamento(), bp = tabelaBP();
  const linha = (t, atual, alvo) => {
    const st = estadoNum(atual, alvo);
    return `<div class="bline"><span class="pip ${st}"></span><span class="t">${t}</span><span class="v ${st}">${atual}/${alvo}</span></div>`;
  };
  const x = orcamentoXP();
  const linhaMais = (t, xp) => {
    const st = !xp || x.coberto ? 'ok' : 'under';
    return `<div class="bline"><span class="pip ${st}"></span><span class="t">${t}</span><span class="v ${st}">${xp ? '+' + xp + ' XP' : 'certo'}</span></div>`;
  };
  const linhaXP = (t, d, xi) => d.ok ? linhaD(t, d) : (xi && xi.viavel ? linhaMais(t, xi.xp) : linhaD(t, d));
  const linhaD = (t, d) => {
    const st = d.ok ? 'ok' : (d.nExcesso ? 'over' : 'under');
    const msg = d.ok ? 'certo' : [d.nFalta ? `falta${d.nFalta > 1 ? 'm' : ''} ${d.nFalta}` : '', d.nExcesso ? `${d.nExcesso} a mais` : ''].filter(Boolean).join(' · ');
    return `<div class="bline"><span class="pip ${st}"></span><span class="t">${t}</span><span class="v ${st}">${esc(msg)}</span></div>`;
  };

  morph(el('col-rail'), `
  ${!criacaoConferida() ? `<div class="card">
    <div class="card-h"><h2>Ficha importada</h2></div>
    <div class="card-b">
      <p class="note" style="margin:0 0 10px">Veio de ${esc(S.importada.origem || 'outro lugar')}. As regras de criação (pontos de Atributos, Habilidades, Disciplinas, Vantagens) não são conferidas: a ficha pode já ter experiência gasta e o Tipo de Predador embutido, e os avisos seriam falsos.</p>
      <button type="button" class="btn sm" data-act="regras-criacao">Conferir com as regras de criação</button>
    </div>
  </div>` : `<div class="card">
    <div class="card-h"><h2>Base de criação</h2>${S.importada ? '<button type="button" class="btn sm ghost" data-act="regras-criacao" style="margin-left:auto">Parar de conferir</button>' : ''}</div>
    <div class="card-b">
      <div class="budget">
        ${linhaXP('Atributos', o.atr, x.atr)}
        ${linhaXP('Habilidades', o.hab, x.hab)}
        ${x.disc.julgavel && x.disc.viavel ? linhaMais('Disciplinas', x.disc.xp) : linha('Disciplinas', o.disc.atual, o.disc.alvo)}
        ${o.vant.atual > o.vant.alvo && usaXP() ? linhaMais('Vantagens', x.vant.xp) : linha('Vantagens', o.vant.atual, o.vant.alvo)}
        ${linha('Defeitos', o.def.atual, o.def.alvo)}
      </div>
      ${o.disc.foraDoCla.length && !(x.disc.julgavel && x.disc.viavel) ? `<p class="err" style="margin:8px 0 0">Fora do clã na criação: ${esc(o.disc.foraDoCla.join(', '))}</p>` : ''}
      ${o.disc.avisos.length ? `<p class="err" style="margin:6px 0 0">${esc(o.disc.avisos.join(' · '))}</p>` : ''}
      ${blocoXP(true)}
      <p class="note" style="margin:9px 0 0">A conta parte da ficha no dia do Abraço. Pontos acima dela são lidos como experiência, pelo custo do livro; só o que nenhuma experiência explica (um ponto a menos, um nível que falta) vira aviso.</p>
    </div>
  </div>`}

  <div class="card" data-mesa>
    <div class="card-h"><h2>Vitais</h2></div>
    <div class="card-b">
      ${blocoDano('saude')}
      ${blocoDano('vontade')}
      ${blocoFome()}
      <div class="vital">
        <div class="vital-h"><span class="lbl">Humanidade</span><span class="n">${S.humanidade}<small> ${S.manchas ? S.manchas + ' mácula(s)' : ''}</small></span></div>
        <div class="track">${Array.from({length:10}, (_, i) => {
          const cls = i < S.humanidade ? 'hum' : (i >= 10 - S.manchas ? 'stain' : '');
          return `<button type="button" class="bx ${cls}" data-hum="${i}" aria-label="humanidade ${i + 1}"></button>`;
        }).join('')}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:7px">
          <span class="lbl" style="margin:0">Máculas</span>
          <button class="btn sm" data-act="mancha" data-d="-1" aria-label="Tirar uma mácula">−</button>
          <button class="btn sm" data-act="mancha" data-d="1" aria-label="Marcar uma mácula">+</button>
        </div>
      </div>
      ${blocoRegistro()}
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Potência de Sangue ${potencia()}</h2></div>
    <div class="card-b" style="font-size:13px">
      <div class="bline"><span class="t">Surto de Sangue</span><span class="v">+${bp.surto}</span></div>
      <div class="bline"><span class="t">Dano Recuperado</span><span class="v">${bp.recuperado}</span></div>
      <div class="bline"><span class="t">Bônus de Poder</span><span class="v">+${bp.bonusPoder}</span></div>
      <div class="bline"><span class="t">Rerrolagem de Sangue</span><span class="v">nível ${bp.rerrolagem || '—'}</span></div>
      <div class="bline"><span class="t">Gravidade da Perdição</span><span class="v">${bp.gravidade}</span></div>
      <p class="note" style="margin:8px 0 0">${esc(bp.alimentacao)}</p>
    </div>
  </div>

  ${cardPerfil()}
  ${cardEtapas()}`);
}

/* As etapas do último sorteio, na ordem em que correram. Cada uma é
   conferida assim que termina, então um problema aponta a culpada em vez
   de dizer só que a ficha está errada. */
function cardEtapas() {
  const et = S._etapas;
  if (!et || !et.length) return '';
  const ruins = et.filter(e => e.problema);
  const perfil = S._perfil ? DISTRIB_HABILIDADES[S._perfil].nome : '';

  return `
  <div class="card no-print">
    <div class="card-h"><h2>Etapas</h2>
      <span class="hint">${ruins.length ? ruins.length + ' com problema' : 'todas ok'}</span></div>
    <div class="card-b">
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${et.map((e, i) => `<span class="tag${e.problema ? ' blood' : ''}" title="${esc(e.problema || 'sem problema')}">${i + 1} ${esc(e.nome)}</span>`).join('')}
      </div>
      ${ruins.length ? `<p class="err" style="margin:8px 0 0">${ruins.map(e => esc(e.nome + ' — ' + e.problema)).join('<br>')}</p>` : ''}
      ${perfil ? `<p class="note" style="margin:8px 0 0">Perfil <strong>${esc(perfil)}</strong>${S._foco ? ', foco em ' + esc(S._foco) : ', sem foco'} — a intenção decidida na etapa 1, que os Atributos e as Habilidades seguiram.</p>` : ''}
    </div>
  </div>`;
}

/* Leitura rápida para quem vai rodar o personagem na mesa. */
function cardPerfil() {
  const mar = MAR_DO_TEMPO[S.mar];
  const rotAtr = {}; ATRIBUTOS.forEach(g => g.itens.forEach(([k, n]) => rotAtr[k] = n));
  const rotHab = {}; HABILIDADES.forEach(g => g.itens.forEach(([k, n]) => rotHab[k] = n));
  const somaAtr = Object.values(S.atr).reduce((t, v) => t + (v || 0), 0);
  const somaHab = Object.values(S.hab).reduce((t, v) => t + (v || 0), 0);
  const somaDisc = S.disc.reduce((t, d) => t + (d.nivel || 0), 0);

  const topAtr = Object.keys(S.atr).sort((a, b) => S.atr[b] - S.atr[a])[0];
  const topHab = Object.keys(S.hab).sort((a, b) => S.hab[b] - S.hab[a])[0];
  const parada = (S.atr[topAtr] || 0) + (S.hab[topHab] || 0);

  const fora = S.disc.filter(d => S.meta.cla && S.meta.cla !== 'Caitiff' && !discDoCla().includes(d.nome)).length;
  const discTxt = S.disc.length
    ? S.disc.slice().sort((a, b) => b.nivel - a.nivel).map(d => `${d.nome} ${d.nivel}`).join(' · ')
    : '—';

  return `
  <div class="card">
    <div class="card-h"><h2>Perfil</h2><span class="hint">para a mesa</span></div>
    <div class="card-b" style="font-size:13px">
      <div class="bline"><span class="t">Idade</span><span class="v">${esc(mar ? mar.nome : '—')}</span></div>
      <div class="bline"><span class="t">Experiência</span><span class="v">${S.xpGasto || 0} de ${S.xpTotal || 0}</span></div>
      <div class="bline"><span class="t">Pontos</span><span class="v">${somaAtr} atr &middot; ${somaHab} hab &middot; ${somaDisc} disc</span></div>
      <div class="bline"><span class="t">Maior parada</span><span class="v">${esc(rotAtr[topAtr] || '—')} + ${esc(rotHab[topHab] || '—')} = ${parada}</span></div>
      <p class="note" style="margin:8px 0 0"><strong>Disciplinas:</strong> ${esc(discTxt)}${fora ? ` <span class="tag blood">${fora} fora do clã</span>` : ''}</p>
      ${S.loresheet ? `<p class="note" style="margin:5px 0 0"><strong>Loresheet:</strong> ${esc(S.loresheet)}</p>` : ''}
      ${mar && mar.epoca ? `<p class="note" style="margin:5px 0 0">${esc(mar.epoca)}.</p>` : ''}
    </div>
  </div>`;
}

/* ============================================================
   RENDER — coluna principal
   ============================================================ */
function cardConceito() {
  const cla = CLAS[S.meta.cla];
  const pred = PREDADORES[S.meta.predador];
  return `
  <div class="card">
    <div class="card-h"><h2>Conceito &amp; origem</h2></div>
    <div class="card-b">
      <div class="fields c3">
        <div><label class="lbl" for="f-nome">Nome</label><input class="f" id="f-nome" data-bind="meta.nome" value="${esc(S.meta.nome)}"></div>
        <div><label class="lbl" for="f-jog">Jogador</label><input class="f" id="f-jog" data-bind="meta.jogador" value="${esc(S.meta.jogador)}"></div>
        <div><label class="lbl" for="f-cron">Crônica</label><input class="f" id="f-cron" data-bind="meta.cronica" value="${esc(S.meta.cronica)}"></div>
        <div><label class="lbl" for="f-conc">Conceito</label><input class="f" id="f-conc" data-bind="meta.conceito" value="${esc(S.meta.conceito)}"></div>
        <div><label class="lbl" for="f-amb">Ambição</label><input class="f" id="f-amb" data-bind="meta.ambicao" value="${esc(S.meta.ambicao)}"></div>
        <div><label class="lbl" for="f-des">Desejo</label><input class="f" id="f-des" data-bind="meta.desejo" value="${esc(S.meta.desejo)}"></div>
      </div>
      <div class="fields c3" style="margin-top:14px">
        <div><label class="lbl" for="f-cla">Clã</label>
          <select class="f" id="f-cla" data-sel="meta.cla">
            <option value="">—</option>
            ${LISTA_CLAS.map(c => `<option${c === S.meta.cla ? ' selected' : ''}>${esc(c)}</option>`).join('')}
          </select></div>
        <div><label class="lbl" for="f-ger">Geração</label>
          <select class="f" id="f-ger" data-sel="meta.geracao">
            ${Array.from({length:13}, (_, i) => 4 + i).map(g => `<option value="${g}"${Number(S.meta.geracao) === g ? ' selected' : ''}>${g}ª</option>`).join('')}
          </select></div>
        <div><label class="lbl" for="f-seita">Seita</label>
          <select class="f" id="f-seita" data-sel="meta.seita">
            <option value="">—</option>
            ${SEITAS.map(s => `<option${s === S.meta.seita ? ' selected' : ''}>${esc(s)}</option>`).join('')}
          </select></div>
        <div><label class="lbl" for="f-sire">Senhor (sire)</label><input class="f" id="f-sire" data-bind="meta.senhor" value="${esc(S.meta.senhor)}"></div>
        <div><label class="lbl" for="f-res">Ressonância preferida</label>
          <select class="f" id="f-res" data-sel="meta.ressonancia">
            <option value="">—</option>
            ${Object.keys(RESSONANCIAS).map(r => `<option${r === S.meta.ressonancia ? ' selected' : ''}>${esc(r)}</option>`).join('')}
          </select></div>
        <div><label class="lbl" for="f-bp">Potência de Sangue</label>
          <select class="f" id="f-bp" data-sel="bpOverride">
            <option value="">automática (${potenciaPorGeracao(Number(S.meta.geracao) || 13)})</option>
            ${Array.from({length:11}, (_, i) => `<option value="${i}"${S.bpOverride === i ? ' selected' : ''}>${i}</option>`).join('')}
          </select></div>
      </div>

      ${cla ? `<div style="margin-top:14px;padding:11px;background:var(--panel-2);border-radius:var(--r);border-left:3px solid var(--blood)">
        <p class="note" style="margin:0 0 7px"><strong>${esc(S.meta.cla)}</strong> — ${esc(cla.linha)} Disciplinas: <span class="tag blood">${cla.disc.length ? cla.disc.map(esc).join(' · ') : 'qualquer uma'}</span></p>
        <div class="fields c2">
          <div><label class="lbl" for="f-bane">Perdição do Clã</label><textarea class="f" id="f-bane" data-bind="bane">${esc(S.bane)}</textarea></div>
          <div><label class="lbl" for="f-comp">Compulsão</label><textarea class="f" id="f-comp" data-bind="comp">${esc(S.comp)}</textarea></div>
        </div>
      </div>` : ''}

      <div style="margin-top:14px">
        <label class="lbl" for="f-pred">Tipo de predador</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select class="f" id="f-pred" data-sel="meta.predador" style="flex:1;min-width:180px">
            <option value="">—</option>
            ${LISTA_PREDADORES.map(p => `<option${p === S.meta.predador ? ' selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
          ${pred && pred.esp.length ? `<button class="btn" data-act="reaplicar-pred">Reaplicar benefícios</button>` : ''}
        </div>
        ${pred ? `<p class="note" style="margin:8px 0 0">${esc(pred.desc)}${pred.en !== '—' ? ` <span class="tag">${esc(pred.en)}</span>` : ''}</p>` : ''}
        ${S._pred ? `<p class="note" style="margin:5px 0 0">Aplicado: especialização <strong>${esc(S._pred.espTexto || '—')}</strong> · disciplina <strong>${esc(S._pred.disc || '—')}</strong></p>
        ${S._pred.espSemPontos ? `<p class="err" style="margin:3px 0 0">A especialização do predador caiu numa Habilidade sem pontos. Gaste um ponto nela, ou troque a opção pelo livro.</p>` : ''}` : ''}
      </div>
    </div>
  </div>`;
}

function cardAtributos() {
  return `
  <div class="card">
    <div class="card-h"><h2>Atributos</h2><span class="hint">um em 4, três em 3, quatro em 2 e um em 1</span></div>
    <div class="card-b">${statusDistrib(orcamento().atr, 'atr')}<div class="fields c3">
      ${ATRIBUTOS.map(g => `<div>
        <div class="lbl" style="color:var(--blood-ink);border-bottom:1px solid var(--line-2);padding-bottom:3px;margin-bottom:6px">${esc(g.cat)}</div>
        ${g.itens.map(([k, pt, en]) => `<div class="trait has">
          <span class="nm">${esc(pt)}<small>${esc(en)}</small></span>
          ${dots('atr.' + k, S.atr[k], 5, pt)}
        </div>`).join('')}
      </div>`).join('')}
    </div></div>
  </div>`;
}

function cardHabilidades() {
  const dist = DISTRIB_HABILIDADES[S.distribHab];
  return `
  <div class="card">
    <div class="card-h"><h2>Habilidades</h2>
      <select class="f" data-sel="distribHab" style="width:auto;flex:none" aria-label="Distribuição de habilidades">
        ${Object.entries(DISTRIB_HABILIDADES).map(([k, v]) => `<option value="${k}"${k === S.distribHab ? ' selected' : ''}>${esc(v.nome)}</option>`).join('')}
      </select>
    </div>
    <div class="card-b">${statusDistrib(orcamento().hab, 'hab')}<div class="fields c3">
      ${HABILIDADES.map(g => `<div>
        <div class="lbl" style="color:var(--blood-ink);border-bottom:1px solid var(--line-2);padding-bottom:3px;margin-bottom:6px">${esc(g.cat)}</div>
        ${g.itens.map(([k, pt, en]) => {
          const v = S.hab[k] || 0;
          const precisa = ESPECIALIDADE_GRATIS.includes(k) && v > 0;
          return `<div class="trait${v ? ' has' : ''}">
            <span class="nm">${esc(pt)}<small>${esc(en)}${precisa ? ' · especialização grátis' : ''}</small></span>
            ${dots('hab.' + k, v, 5, pt)}
            ${S.esp[k] ? `<span class="spec">${esc(S.esp[k])}</span>` : ''}
          </div>`;
        }).join('')}
      </div>`).join('')}
    </div>
    <p class="note" style="margin:12px 0 0">As especializações ficam na aba Especializações.</p>
    </div>
  </div>`;
}

/* ============================================================
   ESPECIALIZAÇÕES — todas num lugar só: ver, acrescentar com sugestão, tirar
   (o dado continua em S.esp[chave], várias separadas por vírgula)
   ============================================================ */
const listaEsp = k => String((S.esp && S.esp[k]) || '').split(/\s*[,;]\s*/).filter(Boolean);
const rotuloHab = k => { for (const g of HABILIDADES) for (const i of g.itens) if (i[0] === k) return i[1]; return k; };
let espHabEscolhida = '';
function sugestoesEsp(k) {
  const tem = new Set(listaEsp(k).map(x => x.toLowerCase()));
  return (ESPECIALIDADES[k] || []).filter(x => !tem.has(x.toLowerCase()));
}
function cardEspecializacoes() {
  const linhas = [];
  HABILIDADES.forEach(g => g.itens.forEach(([k]) => listaEsp(k).forEach((e, i) => linhas.push({ k, e, i }))));
  const faltam = ESPECIALIDADE_GRATIS.filter(k => (S.hab[k] || 0) > 0 && !listaEsp(k).length).map(rotuloHab);
  const semPonto = Object.keys(S.esp || {}).filter(k => listaEsp(k).length && !((S.hab[k] || 0) > 0)).map(rotuloHab);
  const comPontos = HABILIDADES.map(g => ({ cat: g.cat, itens: g.itens.filter(([k]) => (S.hab[k] || 0) > 0) })).filter(g => g.itens.length);
  const todas = comPontos.flatMap(g => g.itens.map(i => i[0]));
  if (!todas.includes(espHabEscolhida)) espHabEscolhida = todas[0] || '';
  return `
  <div class="card">
    <div class="card-h"><h2>Especializações</h2>
      <span class="hint">${linhas.length ? linhas.length + ' na ficha' : 'nenhuma ainda'}</span></div>
    <div class="card-b">
      ${linhas.length ? `<ul class="esp-lista">${linhas.map(l => `<li>
          <span class="esp-h">${esc(rotuloHab(l.k))}</span>
          <span class="esp-t">${esc(l.e)}</span>
          <button type="button" class="x" data-act="rm-esp" data-k="${l.k}" data-i="${l.i}" aria-label="Tirar ${esc(l.e)} (${esc(rotuloHab(l.k))})">✕</button>
        </li>`).join('')}</ul>` : '<p class="note" style="margin:0">Nenhuma especialização ainda.</p>'}
      ${faltam.length ? `<p class="err" style="margin:8px 0 0">Falta especialização em ${esc(faltam.join(', '))} — obrigatória quando a Habilidade tem pontos.</p>` : ''}
      ${semPonto.length ? `<p class="err" style="margin:6px 0 0">Especialização em Habilidade sem pontos: ${esc(semPonto.join(', '))}.</p>` : ''}
      ${todas.length ? `<div class="adder">
        <label class="sr" for="add-esp-hab">Habilidade</label>
        <select class="f" id="add-esp-hab" style="flex:0 1 210px">
          ${comPontos.map(g => `<optgroup label="${esc(g.cat)}">${g.itens.map(([k, pt]) => `<option value="${k}"${k === espHabEscolhida ? ' selected' : ''}>${esc(pt)} (${S.hab[k]})</option>`).join('')}</optgroup>`).join('')}
        </select>
        <label class="sr" for="add-esp-txt">Especialização</label>
        <input class="f" id="add-esp-txt" list="esp-sug" placeholder="Escreva ou escolha uma sugestão" autocomplete="off" style="flex:1 1 200px">
        <datalist id="esp-sug">${sugestoesEsp(espHabEscolhida).map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        <button type="button" class="btn" data-act="add-esp">Adicionar</button>
      </div>` : '<p class="note" style="margin:8px 0 0">Ponha pontos numa Habilidade para poder especializar.</p>'}
      <p class="note" style="margin:10px 0 0">Na criação: uma grátis à escolha, mais uma em cada Ofícios, Erudição, Performance e Ciência que tenha pontos. Depois, cada nova custa <strong>3 XP</strong> (em <em>Gastar experiência</em>).</p>
    </div>
  </div>`;
}
/* na ficha de leitura: a lista inteira, para achar rápido na mesa */
function blocoEspecializacoes() {
  const itens = [];
  HABILIDADES.forEach(g => g.itens.forEach(([k, pt]) => listaEsp(k).forEach(e => itens.push(`<li><b>${esc(pt)}</b> ${esc(e)}</li>`))));
  if (!itens.length) return '';
  return `<div class="sh-block sh-esp-b"><h3>Especializações</h3><ul class="sh-esp">${itens.join('')}</ul></div>`;
}

/* poderes: as listas recolhidas lembram se estavam abertas entre um redesenho e outro */
const PW_ABERTOS = new Set();
document.addEventListener('toggle', ev => {
  const d = ev.target;
  if (!d.dataset || !d.dataset.pwAbrir) return;
  if (d.open) PW_ABERTOS.add(d.dataset.pwAbrir); else PW_ABERTOS.delete(d.dataset.pwAbrir);
}, true);
const chaveNotaPoder = (disc, poder) => (disc + '__' + poder).replace(/[.\s]+/g, '_');
const custaTesteFome = p => /Teste[s]? de Fome/i.test(p.c || '');
/* o cartão de um poder: o que faz, quanto custa, que dados rola, quanto dura e as anotações do jogador */
function cartaoPoder(d, p, o) {
  o = o || {};
  const a = amalgamaDe(p);
  const temAm = !a || (S.disc.find(x => x.nome === a.disc) || {}).nivel >= a.nivel;
  const k = chaveNotaPoder(d.nome, p.pt);
  const nota = (S.notasPoder || {})[k] || '';
  const mec = [
    ['Custo', p.c], ['Parada', p.pool], ['Parada oposta', p.vs], ['Duração', p.dur]
  ].filter(x => x[1]);
  const dl = mec.length ? `<dl class="pw-mec">${mec.map(([r, v]) => `<div><dt>${r}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
  const marcas = [p.am ? `<span class="tag ${temAm ? '' : 'blood'}">Amálgama: ${esc(p.am)}</span>` : '',
    p.ex ? `<span class="tag">exige ${esc(p.ex)}</span>` : '', p.f && p.f !== 'Básico' ? `<span class="tag">${esc(p.f)}</span>` : ''].join('');
  const botaoFome = custaTesteFome(p) && !o.impressao
    ? `<button type="button" class="btn sm no-print" data-act="teste-fome" data-poder="${esc(p.pt)}" data-nivel="${p.lv || 0}">Teste de Fome</button>` : '';
  return `<article class="pw-card">
    <header><span class="pw-lv" aria-label="nível ${p.lv}">${p.lv || '•'}</span><h4>${esc(p.pt)}</h4>${p.en ? `<span class="pw-en">${esc(p.en)}</span>` : ''}
      ${o.editar ? `<button type="button" class="x" data-act="rm-pw" data-i="${o.idx}" data-nome="${esc(p.pt)}" aria-label="Tirar ${esc(p.pt)}">✕</button>` : ''}</header>
    ${p.ds ? `<p class="pw-ds">${esc(p.ds)}</p>` : ''}
    ${dl}
    ${p.sis ? `<div class="pw-sis"><span class="pw-rot">Como funciona</span><p>${esc(p.sis)}</p></div>` : ''}
    ${p.res ? `<div class="pw-res"><span class="pw-rot">Quem resiste e como</span><p>${esc(p.res)}</p></div>` : ''}
    ${marcas ? `<div class="pw-tags">${marcas}</div>` : ''}
    ${o.editar
      ? `<label class="pw-nota"><span class="lbl">Suas anotações</span><textarea class="f" data-bind="notasPoder.${k}" rows="2" placeholder="Texto completo do livro, como você usa, efeitos de sistema…">${esc(nota)}</textarea></label>`
      : (nota ? `<p class="pw-nota-t">${esc(nota)}</p>` : '')}
    ${botaoFome ? `<div class="pw-acoes">${botaoFome}</div>` : ''}
  </article>`;
}

/* regras que valem para todos os poderes da Disciplina */
function blocoRegrasDisc(nome) {
  const r = (DISCIPLINAS[nome] || {}).regras || [];
  if (!r.length) return '';
  const k = 'regras:' + nome;
  return `<details class="disc-regras" data-pw-abrir="${esc(k)}"${PW_ABERTOS.has(k) ? ' open' : ''}>
    <summary>Regras gerais de ${esc(nome)} <span class="note">${r.length} ${r.length > 1 ? 'pontos' : 'ponto'}</span></summary>
    <ul>${r.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  </details>`;
}
/* linha curta de mecânica para a lista de escolha */
function mecCurta(p) {
  return [p.c, p.pool ? p.pool + (p.vs ? ' contra ' + p.vs : '') : (p.vs ? 'resistido por ' + p.vs : ''), p.dur].filter(Boolean).join(' · ');
}

function cardDisciplinas() {
  const doCla = discDoCla();
  const usadas = S.disc.map(d => d.nome);
  const disponiveis = LISTA_DISCIPLINAS.filter(d => !usadas.includes(d));
  const comXP = new Set((S.xpCompras || []).filter(c => c.tipo === 'disc' && c.de === 0).map(c => c.k));
  const amp = amplitudeDisciplinas(S.meta.geracao);
  return `
  <div class="card">
    <div class="card-h"><h2>Disciplinas</h2>
      <span class="hint">criação: dois pontos numa e um noutra, dentro do clã &middot; ${amp.teto} no total pela ${esc(S.meta.geracao || 13)}ª</span></div>
    <div class="card-b">${statusDisciplinas()}
      ${S.disc.length ? S.disc.map((d, idx) => {
        const info = DISCIPLINAS[d.nome] || { poderes: [] };
        const doPredador = !!(S._pred && S._pred.disc === d.nome);
        const aprendida = comXP.has(d.nome);
        const fora = doCla.length && !doCla.includes(d.nome) && !doPredador && !aprendida;
        const escolhidos = d.poderes || [];
        return `<div class="disc">
          <div class="disc-h">
            <span class="dn">${esc(d.nome)}</span>
            ${dots('disc.' + idx + '.nivel', d.nivel, 5, d.nome)}
            ${fora ? '<span class="tag blood">fora do clã</span>' : ''}
            ${doPredador && !doCla.includes(d.nome) ? '<span class="tag">via predador</span>' : ''}
            ${aprendida && !doCla.includes(d.nome) ? '<span class="tag">aprendida fora do clã</span>' : ''}
            <span class="tag">${escolhidos.length}/${d.nivel} poderes</span>
            <button class="x" data-act="rm-disc" data-i="${idx}" aria-label="Remover ${esc(d.nome)}" style="margin-left:auto">✕</button>
          </div>
          <div class="disc-b">
            ${blocoRegrasDisc(d.nome)}
            ${(() => {
              const meus = escolhidos.map(nome => info.poderes.find(p => p.pt === nome) || { pt: nome, lv: '', ds: '', f: 'Básico' });
              const livres = info.poderes.filter(p => !escolhidos.includes(p.pt) && p.lv <= d.nivel);
              const acima = info.poderes.filter(p => !escolhidos.includes(p.pt) && p.lv > d.nivel);
              const linhaPw = (p, bloq) => {
                const a = amalgamaDe(p);
                const temAm = !a || (S.disc.find(x => x.nome === a.disc) || {}).nivel >= a.nivel;
                return `<div class="pw${bloq ? ' locked' : ''}"><label>
                  <input type="checkbox" data-pw="${idx}" data-nome="${esc(p.pt)}"${bloq ? ' disabled' : ''}>
                  <span class="lv">${p.lv}</span>
                  <span><strong>${esc(p.pt)}</strong> <span class="d">${esc(p.ds)}</span>
                    ${p.am ? `<span class="tag ${temAm ? '' : 'blood'}">Amálgama: ${esc(p.am)}</span>` : ''}
                    ${p.ex ? `<span class="tag">exige ${esc(p.ex)}</span>` : ''}
                    ${p.f !== 'Básico' ? `<span class="tag">${esc(p.f)}</span>` : ''}
                    ${mecCurta(p) ? `<span class="pw-l-mec">${esc(mecCurta(p))}</span>` : ''}
                    ${p.sis ? `<span class="pw-l-sis">${esc(p.sis)}</span>` : ''}
                    ${p.res ? `<span class="pw-l-res"><b>Resistência:</b> ${esc(p.res)}</span>` : ''}</span>
                </label></div>`;
              };
              const falta = d.nivel - escolhidos.length;
              const chave = d.nome;
              return `${meus.length ? `<div class="pw-cards">${meus.map(p => cartaoPoder(d, p, { editar: true, idx })).join('')}</div>` : ''}
                ${livres.length ? `<details class="pw-escolher" data-pw-abrir="${esc(chave)}:livres"${falta > 0 || PW_ABERTOS.has(chave + ':livres') ? ' open' : ''}>
                  <summary>${falta > 0 ? `Escolha ${falta === 1 ? 'mais um poder' : `mais ${falta} poderes`}` : 'Trocar ou somar poderes'} <span class="note">${livres.length} disponíve${livres.length > 1 ? 'is' : 'l'} até o nível ${d.nivel}</span></summary>
                  ${livres.map(p => linhaPw(p, false)).join('')}
                </details>` : ''}
                ${acima.length ? `<details class="pw-escolher" data-pw-abrir="${esc(chave)}:acima"${PW_ABERTOS.has(chave + ':acima') ? ' open' : ''}>
                  <summary>Poderes de nível mais alto <span class="note">${acima.length}, abrem quando ${esc(d.nome)} subir</span></summary>
                  ${acima.map(p => linhaPw(p, true)).join('')}
                </details>` : ''}`;
            })()}
            ${(() => {
              const cat = CATALOGO_RITUAL[d.nome];
              if (!cat) return '';
              const tidos = new Set((d.rituais || '').split('\n').map(s => s.trim().replace(/\s*\(.*$/, '')).filter(Boolean));
              const opcoes = cat.lista.filter(x => !tidos.has(x.pt)).map(x => {
                const alto = x.lv > d.nivel;
                const semPoder = x.ex && !(d.poderes || []).includes(x.ex);
                const nota = [alto ? 'acima da Disciplina' : '', semPoder ? 'exige ' + x.ex : '',
                              x.culto ? x.culto : ''].filter(Boolean).join(', ');
                return `<option value="${esc(x.pt + ' (' + cat.rotulo + ' ' + x.lv + ')')}"${alto || semPoder ? ' disabled' : ''}>`
                     + `•${x.lv} ${esc(x.pt)}${nota ? ' — ' + esc(nota) : ''}</option>`;
              }).join('');
              return `<div style="margin-top:9px">
                <label class="lbl" for="rit-${idx}">${esc(cat.plural)} <span style="text-transform:none;letter-spacing:0;font-style:italic">— custam nível × 3 de experiência, nunca acima de ${d.nivel}</span></label>
                <textarea class="f" id="rit-${idx}" data-bind="disc.${idx}.rituais" placeholder="Um por linha.">${esc(d.rituais || '')}</textarea>
                <div class="adder" style="margin-top:7px;padding-top:7px">
                  <select class="f" id="add-rit-${idx}" aria-label="${esc(cat.rotulo)} a acrescentar">${opcoes}</select>
                  <button class="btn" data-act="add-rit" data-i="${idx}">Acrescentar</button>
                </div>
              </div>`;
            })()}
          </div>
        </div>`;
      }).join('') : '<p class="note" style="margin:0">Nenhuma disciplina ainda.</p>'}

      <div class="adder">
        <select class="f" id="add-disc" aria-label="Disciplina a adicionar">
          ${doCla.filter(d => disponiveis.includes(d)).map(d => `<option value="${esc(d)}">${esc(d)} — do clã</option>`).join('')}
          ${disponiveis.filter(d => !doCla.includes(d)).map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
        </select>
        <button class="btn" data-act="add-disc">Adicionar</button>
      </div>
    </div>
  </div>`;
}

/* Aceita os dois formatos: os grupos antigos de Caçador, com itens
   [nome, pontos, descrição], e as entradas novas de Vampiro, que são
   objetos com faixa de pontos, pré-requisito e livro. */
function listaOpcoes(grupos) {
  return grupos.map(g => {
    const itens = g.itens.map(it => {
      const o = Array.isArray(it) ? { pt: it[0], faixa: it[1], ds: it[2] } : it;
      const faixa = o.faixa != null ? o.faixa : (o.min === o.max ? String(o.min) : o.min + '–' + o.max);
      const marcas = [o.req, o.f && o.f !== 'Básico' ? o.f : '', o.errata ? 'errata' : ''].filter(Boolean).join(' · ');
      const rot = `${o.pt} (${faixa})${marcas ? ' — ' + marcas : ''}`;
      return `<option value="${esc(o.pt)}" data-desc="${esc(o.ds || '')}">${esc(rot)}</option>`;
    }).join('');
    return `<optgroup label="${esc(g.g)}">${itens}</optgroup>`;
  }).join('');
}

function cardVantagens() {
  const linhas = (arr, tipo) => arr.length ? arr.map((v, i) => `
    <div class="row">
      <input class="f grow" data-bind="${tipo}.${i}.nome" value="${esc(v.nome)}" aria-label="Nome">
      ${dots(tipo + '.' + i + '.pontos', Number(v.pontos) || 0, 6, v.nome)}
      <input class="f grow" data-bind="${tipo}.${i}.nota" value="${esc(v.nota || '')}" placeholder="detalhe…" aria-label="Detalhe">
      ${v.fonte === 'predador' ? '<span class="tag blood">predador</span>' : ''}
      <button class="x" data-act="rm" data-t="${tipo}" data-i="${i}" aria-label="Remover">✕</button>
    </div>`).join('') : '<p class="note" style="margin:0">Nada aqui ainda.</p>';

  return `
  <div class="card">
    <div class="card-h"><h2>Vantagens</h2><span class="hint">7 pontos</span></div>
    <div class="card-b">${ehCacador() ? '' : (o => statusPontos(o.vant.atual, o.vant.alvo, 'Vantagens'))(orcamento())}
      ${linhas(S.vant, 'vant')}
      <div class="adder">
        <select class="f" id="add-vant" aria-label="Vantagem">${listaOpcoes(ehCacador() ? VANTAGENS_CACADOR : agruparPorCategoria(VANTAGENS.concat(loresheetsComoVantagens())))}</select>
        <button class="btn" data-act="add-vant">Adicionar</button>
        <button class="btn ghost" data-act="add-vant-livre">Em branco</button>
      </div>
      <p class="note" id="desc-vant" style="margin:8px 0 0"></p>
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Defeitos</h2><span class="hint">2 pontos obrigatórios</span></div>
    <div class="card-b">${ehCacador() ? '' : (o => statusPontos(o.def.atual, o.def.alvo, 'Defeitos'))(orcamento())}
      ${linhas(S.def, 'def')}
      <div class="adder">
        <select class="f" id="add-def" aria-label="Defeito">${listaOpcoes(ehCacador() ? DEFEITOS_CACADOR : agruparPorCategoria(DEFEITOS.concat(DEFEITOS_DISCIPLINA.map(d => Object.assign({ min:1, max:1, cat:"Diversas", f:"Guia do Jogador", req:d.disc }, d)))))}</select>
        <button class="btn" data-act="add-def">Adicionar</button>
        <button class="btn ghost" data-act="add-def-livre">Em branco</button>
      </div>
      <p class="note" id="desc-def" style="margin:8px 0 0"></p>
    </div>
  </div>`;
}

function cardMoralidade() {
  return `
  <div class="card">
    <div class="card-h"><h2>Convicções &amp; Pilares</h2><span class="hint">de uma a três</span></div>
    <div class="card-b">
      <div style="margin-bottom:12px">
        <label class="lbl" for="f-ten">Princípios da crônica (tenets)</label>
        <textarea class="f" id="f-ten" data-bind="tenets" placeholder="O que a mesa combinou que é certo e errado nesta história.">${esc(S.tenets)}</textarea>
      </div>
      ${S.conv.length ? S.conv.map((c, i) => `<div class="row" style="align-items:flex-end">
        <div class="grow"><label class="lbl" for="conv-${i}-t">Convicção ${i + 1}</label><input class="f" id="conv-${i}-t" data-bind="conv.${i}.texto" value="${esc(c.texto)}"></div>
        <div class="grow"><label class="lbl" for="conv-${i}-p">Pilar</label><input class="f" id="conv-${i}-p" data-bind="conv.${i}.pedra" value="${esc(c.pedra)}" placeholder="quem ancora essa convicção"></div>
        <button class="x" data-act="rm" data-t="conv" data-i="${i}" aria-label="Remover">✕</button>
      </div>`).join('') : '<p class="note" style="margin:0">Sem convicções — um vampiro sem elas cai rápido.</p>'}
      <div class="adder"><button class="btn" data-act="add-conv">Adicionar convicção</button></div>
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Notas &amp; experiência</h2></div>
    <div class="card-b">
      ${blocoExperiencia()}
      <div class="fields c2">
        <div><label class="lbl" for="f-apar">Aparência &amp; distintivos</label><textarea class="f" id="f-apar" data-bind="meta.aparencia">${esc(S.meta.aparencia)}</textarea></div>
        <div><label class="lbl" for="f-not">Notas</label><textarea class="f" id="f-not" data-bind="notas">${esc(S.notas)}</textarea></div>
      </div>
    </div>
  </div>`;
}

/* resumo de experiência no quadro de Notas: saldo, os dois caminhos e o ajuste à mão */
function blocoExperiencia() {
  const disp = (Number(S.xpTotal) || 0) - (Number(S.xpGasto) || 0);
  const ultimo = (typeof xpLivro === 'function' ? xpLivro().tudo : [])[0];
  const cacador = ehCacador();
  return `<div class="xp-resumo">
      ${typeof xpSaldoHtml === 'function' ? xpSaldoHtml() : ''}
      ${typeof xpMovHtml === 'function' ? xpMovHtml('cheio') : ''}
      <div class="xp-resumo-a">
        ${cacador ? '' : `<button type="button" class="btn primary" data-evo="entrar">Evoluir na ficha</button>`}
        <button type="button" class="btn" data-acao="xp">${cacador ? 'Livro de experiência' : 'Outras compras e livro de experiência'}</button>
      </div>
      ${ultimo ? `<p class="note xp-ultimo">Último registro: ${esc(ultimo.txt)} (${ultimo.sinal}${ultimo.n} XP${ultimo.em ? ', ' + esc(xpData(ultimo.em)) : ''}).</p>` : ''}
    </div>
    ${blocoXP(false)}
`;
}

/* "neófita 26% · ancillae 33% · ancião 27% …" */
function distribuicaoIdades() {
  const f = Object.values(MAR_DO_TEMPO).filter(v => v.peso > 0);
  const soma = f.reduce((t, v) => t + v.peso, 0);
  return f.sort((a, b) => b.peso - a.peso)
          .map(v => `${v.nome.replace(' †', '')} ${Math.round(v.peso / soma * 100)}%`).join(' · ');
}

function cardForja() {
  if (!painelForja) return '';
  const F = S.forja;
  const opt = (v, rot, sel) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(rot)}</option>`;
  const campo = (id, rot, lista, valor, rotQualquer) => `
    <div><label class="lbl" for="${id}">${esc(rot)}</label>
      <select class="f" id="${id}" data-forja="${id.replace('fj-', '')}">
        ${opt('', rotQualquer || 'Qualquer', valor)}
        ${lista.map(([v, r]) => opt(v, r, valor)).join('')}
      </select></div>`;

  const marcar = (k, rot) => `<label style="display:flex;gap:7px;align-items:center;font-size:13.5px;cursor:pointer">
      <input type="checkbox" data-manter="${k}"${F.manter[k] ? ' checked' : ''} style="accent-color:var(--blood)">${esc(rot)}</label>`;

  const comuns = [
    F.distrib ? DISTRIB_HABILIDADES[F.distrib].nome : 'distribuição qualquer',
    F.foco ? 'foco ' + F.foco.toLowerCase() : 'sem foco',
    F.origem === 'cla' ? 'nome conforme o clã' : (F.origem || 'nome de qualquer região')
  ];
  const resumo = (F.sistema === 'cacador'
    ? ['Caçador', F.credo || 'credo qualquer', F.impeto || 'ímpeto qualquer']
    : ['Vampiro', F.cla || 'clã qualquer',
       F.mar ? MAR_DO_TEMPO[F.mar].nome.toLowerCase() : 'idade sorteada',
       F.geracao ? F.geracao + 'ª geração' : '',
       F.predador || 'predador qualquer']
  ).filter(Boolean).concat(comuns).join(' · ');

  return `
  <div class="card forja no-print">
    <div class="card-h"><h2>Forja</h2>
      <span class="hint">o que você fixa, o dado não decide</span>
      <button class="btn ghost" data-act="fechar-forja">Fechar</button></div>
    <div class="card-b">
      <div style="margin-bottom:14px">
        <label class="lbl" for="fj-contexto">Contexto do personagem</label>
        <textarea class="f" id="fj-contexto" data-forja="contexto" rows="2"
          placeholder="Ex.: enfermeira de pronto-socorro, fria e metódica, cresceu na periferia">${esc(F.contexto)}</textarea>
        <div class="note" id="ctx-hint" style="margin:6px 0 0">${resumoContexto(F.contexto)}</div>
      </div>

      <div class="fields c3">
        ${campo('fj-sistema', 'Sistema', [['vampiro','Vampiro: A Máscara'],['cacador','Caçador: A Revanche']], F.sistema, 'Vampiro: A Máscara')}
        ${campo('fj-distrib', 'Distribuição de habilidades', Object.entries(DISTRIB_HABILIDADES).map(([k, v]) => [k, v.nome]), F.distrib)}
        ${campo('fj-foco', 'Foco', Object.entries(FOCOS).filter(([k]) => k).map(([k, v]) => [k, v]), F.foco, FOCOS[''])}
        ${F.sistema === 'cacador' ? `
          ${campo('fj-credo', 'Credo', Object.keys(CREDOS).map(c => [c, c]), F.credo)}
          ${campo('fj-impeto', 'Ímpeto', Object.keys(IMPETOS).map(c => [c, c]), F.impeto)}
        ` : `
          ${campo('fj-cla', 'Clã', LISTA_CLAS.map(c => [c, c]), F.cla)}
          ${campo('fj-mar', 'Idade (Mar do Tempo)', Object.entries(MAR_DO_TEMPO).filter(([k]) => k).map(([k, v]) => [k, v.nome]), F.mar, 'Sorteia a idade')}
          ${campo('fj-geracao', 'Geração', Array.from({length:13}, (_, i) => [String(4 + i), (4 + i) + 'ª']), F.geracao, 'Pelo mar do tempo')}
          ${campo('fj-predador', 'Tipo de predador', LISTA_PREDADORES.filter(p => p !== 'Personalizado').map(p => [p, p]), F.predador)}
          ${campo('fj-seita', 'Seita', SEITAS.map(s => [s, s]), F.seita)}
        `}
        ${campo('fj-origem', 'Origem do nome', (F.sistema === 'cacador' ? [] : [['cla', 'Combinar com o clã']]).concat(LISTA_ORIGENS.map(o => [o, o])), F.origem, 'Qualquer região')}
      </div>
      ${F.sistema === 'cacador' ? '' : (F.mar && MAR_DO_TEMPO[F.mar]
        ? `<p class="note" style="margin:9px 0 0">${esc(MAR_DO_TEMPO[F.mar].desc)}</p>`
        : `<p class="note" style="margin:9px 0 0">Com a idade solta, o sorteio distribui como numa cidade: ${esc(distribuicaoIdades())}. A geração vem daí, e é a geração que decide quantas Disciplinas a ficha acumula e o quanto ela se afasta do clã. <strong>†</strong> marca as faixas que estendemos para além do Guia Suplementar.</p>`)}

      ${F.sistema === 'cacador' ? '' : `
      <div style="margin-top:14px">
        <span class="lbl">Livros que entram no sorteio</span>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px">
          ${Object.entries(FONTES).map(([k, v]) => {
            const ligado = (F.fontes && F.fontes.length ? F.fontes : FONTES_PADRAO).includes(k);
            return `<label style="display:flex;gap:6px;align-items:center;font-size:13.5px;cursor:pointer">
              <input type="checkbox" data-fonte="${esc(k)}"${ligado ? ' checked' : ''} style="accent-color:var(--blood)">${esc(v.nome)}</label>`;
          }).join('')}
        </div>
        <p class="note" style="margin:6px 0 0">Vale para poderes, Rituais, Vantagens e Defeitos. Só afeta o sorteio automático: o que é de livro desligado continua na lista e pode ser marcado à mão.</p>
      </div>`}

      <div style="margin-top:14px">
        <span class="lbl">Preservar no próximo sorteio</span>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px">
          ${marcar('nome', 'Nome')}
          ${marcar('conceito', 'Conceito')}
          ${marcar('motivos', 'Ambição e desejo')}
          ${marcar('conviccoes', 'Convicções e princípios')}
        </div>
        <p class="note" style="margin:7px 0 0">Jogador e crônica nunca são sorteados.</p>
      </div>

      <div class="adder">
        <button class="btn primary" data-act="sortear">Sortear com estes parâmetros</button>
        <button class="btn ghost" data-act="limpar-forja">Soltar tudo</button>
        <span class="note" style="flex:1;min-width:200px">${esc(resumo)}</span>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   REDESENHO: muda só o que mudou
   morph() compara o HTML novo com o que está na tela e mexe só nos nós
   diferentes. O resto continua sendo o mesmo elemento: foco, cursor,
   rolagem e o que o leitor de tela anunciava ficam onde estavam.
   ============================================================ */
const MORPH_TPL = document.createElement('template');
function morph(alvo, html) {
  MORPH_TPL.innerHTML = html;
  morphFilhos(alvo, MORPH_TPL.content);
  MORPH_TPL.innerHTML = '';
}
const morphMesmo = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.nodeType !== 1 || (a.id || '') === (b.id || ''));
function morphFilhos(de, para) {
  let atual = de.firstChild, novo = para.firstChild;
  while (novo) {
    const prox = novo.nextSibling;
    if (!atual) de.appendChild(novo);
    else if (morphMesmo(atual, novo)) { morphNo(atual, novo); atual = atual.nextSibling; }
    else { const velho = atual; atual = atual.nextSibling; de.replaceChild(novo, velho); }
    novo = prox;
  }
  while (atual) { const p = atual.nextSibling; de.removeChild(atual); atual = p; }
}
function morphNo(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  const tag = a.nodeName;
  if (tag === 'TEXTAREA') { const v = b.textContent; if (a.value !== v && a !== document.activeElement) a.value = v; return; }
  morphFilhos(a, b);
  if (tag === 'INPUT') {
    if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.hasAttribute('checked');
    else { const v = b.getAttribute('value') || ''; if (a.value !== v && a !== document.activeElement) a.value = v; }
  } else if (tag === 'SELECT' && !a.multiple) {
    const i = [...a.options].findIndex(o => o.hasAttribute('selected'));
    const alvo = i >= 0 ? i : 0;
    if (a.selectedIndex !== alvo) a.selectedIndex = alvo;
  }
}

/* A vista escondida (a folha de Ver enquanto se edita, os quadros de Editar
   enquanto se lê) não é montada a cada clique: fica marcada e é montada
   quando aparece, ou antes de imprimir. */
const VISTA = { tudo: true, sujos: new Set(), ficha: true };
const vistaAtual = () => (typeof UI !== 'undefined' && UI.tela === 'ficha') ? UI.modo : null;
/* a coluna de Editar em blocos: cada bloco vira um ou mais quadros (Vantagens traz Defeitos;
   Moralidade traz Notas). Só os blocos da aba aberta são montados; os outros ficam marcados
   e são montados quando a aba deles abre. */
const BLOCOS_V = [['forja', () => cardForja()], ['conceito', () => cardConceito()], ['atributos', () => cardAtributos()], ['habilidades', () => cardHabilidades()],
  ['especializacoes', () => cardEspecializacoes()], ['disciplinas', () => cardDisciplinas()], ['vantagens', () => cardVantagens()], ['moralidade', () => cardMoralidade()]];
const BLOCOS_C = [['forja', () => cardForja()], ['credo', () => cardCredoImpeto()], ['atributos', () => cardAtributos()], ['habilidades', () => cardHabilidades()],
  ['especializacoes', () => cardEspecializacoes()], ['trunfos', () => cardTrunfos()], ['vantagens', () => cardVantagens()], ['moralidade', () => cardMoralidade()]];
const blocosAtuais = () => ehCacador() ? BLOCOS_C : BLOCOS_V;
const marcaBloco = (k, html) => html.replace(/<div class="card(?=[\s"])/g, `<div data-bloco="${k}" class="card`);
function montarMain() {
  const main = el('col-main'), blocos = blocosAtuais();
  const atuais = [...main.children].filter(n => n.dataset.bloco);
  const seqDom = [...new Set(atuais.map(n => n.dataset.bloco))].join(',');
  const seqNova = blocos.filter(([k]) => k !== 'forja' || painelForja).map(([k]) => k).join(',');
  if (VISTA.tudo || seqDom !== seqNova) {
    morph(main, blocos.map(([k, f]) => marcaBloco(k, f())).join(''));
    VISTA.tudo = false; VISTA.sujos.clear();
    return;
  }
  const aba = typeof UI !== 'undefined' ? UI.secaoAtual : '';
  for (const [k, f] of blocos) {
    if (!VISTA.sujos.has(k)) continue;
    const nos = atuais.filter(n => n.dataset.bloco === k);
    if (!(k === 'forja' || nos.some(n => !n.dataset.aba || n.dataset.aba === aba))) continue;
    morphTrecho(main, nos, marcaBloco(k, f()));
    VISTA.sujos.delete(k);
  }
}
/* morph de um trecho da coluna: troca só os quadros de um bloco */
function morphTrecho(pai, velhos, html) {
  MORPH_TPL.innerHTML = html;
  const novos = [...MORPH_TPL.content.children];
  const ref = velhos.length ? velhos[velhos.length - 1].nextSibling : null;
  novos.forEach((n, i) => {
    const v = velhos[i];
    if (v && morphMesmo(v, n)) morphNo(v, n);
    else if (v) pai.replaceChild(n, v);
    else pai.insertBefore(n, ref);
  });
  velhos.slice(novos.length).forEach(v => v.remove());
  MORPH_TPL.innerHTML = '';
}
function montarFicha() { if (ehCacador()) fichaCacador(); else renderFicha(); VISTA.ficha = false; }
function garantirVistas(o) {
  o = o || {};
  const m = vistaAtual();
  if ((VISTA.tudo || VISTA.sujos.size) && (o.todas || m === 'editar')) { if (o.todas) VISTA.tudo = true; montarMain(); }
  if (VISTA.ficha && (o.todas || o.ficha || m === 'ver')) montarFicha();
}
window.addEventListener('beforeprint', () => garantirVistas({ ficha: true }));

/* render() troca o HTML das colunas inteiro: guarda qual controle tinha o foco
   para devolvê-lo depois, senão o foco cai no <body> a cada clique */
const ATTRS_FOCO = ['dot', 'i', 'box', 'hum', 'act', 'd', 't', 'sel', 'bind', 'pw', 'dist', 'nome', 'manter', 'fonte', 'forja'];
function chaveFoco() {
  const a = document.activeElement;
  if (!a || a === document.body || !(el('col-main').contains(a) || el('col-rail').contains(a))) return null;
  if (a.id) return '#' + CSS.escape(a.id);
  const sel = ATTRS_FOCO.filter(k => a.dataset[k] != null)
    .map(k => `[data-${k}="${CSS.escape(a.dataset[k])}"]`).join('');
  return sel ? a.tagName.toLowerCase() + sel : null;
}
function devolverFoco(chave) {
  if (!chave) return;
  let alvo = null;
  try { alvo = document.querySelector('#col-main ' + chave + ', #col-rail ' + chave); } catch (e) {}
  if (alvo) alvo.focus({ preventScroll: true });
}

function render() {
  const foco = chaveFoco();
  VISTA.sujos = new Set(blocosAtuais().map(b => b[0])); VISTA.ficha = true;
  garantirVistas();
  sincronizarSistema();
  if (ehCacador()) railCacador(); else renderRail();
  if (typeof uiDepoisDeRender === 'function') uiDepoisDeRender();
  if (typeof evoBarra === 'function') evoBarra();
  devolverFoco(foco);
  salvar();
}

/* ============================================================
   FICHA — visão de leitura e impressão
   ============================================================ */
function pips(n, max, sangue) {
  max = max || 5;
  let h = `<span class="pips${sangue ? ' blood' : ''}">`;
  for (let i = 1; i <= max; i++) h += `<i class="${i <= n ? 'on' : ''}"></i>`;
  return h + '</span>';
}
function caixas(total, sup, agg) {
  let h = '<span class="boxes">';
  for (let i = 0; i < total; i++) {
    if (i < agg) h += '<b class="agg">✕</b>';
    else if (i < agg + sup) h += '<b class="sup">╱</b>';
    else h += '<b></b>';
  }
  return h + '</span>';
}
function caixasHumanidade() {
  let h = '<span class="boxes">';
  for (let i = 0; i < 10; i++) {
    if (i < S.humanidade) h += '<b class="fill"></b>';
    else if (i >= 10 - S.manchas) h += '<b class="stain"></b>';
    else h += '<b></b>';
  }
  return h + '</span>';
}
/* linha com condutor pontilhado entre o nome e o valor */
function shLinha(nome, valor, extra) {
  return `<div class="sh-line"><span class="n">${nome}${extra ? ` <i>${extra}</i>` : ''}</span><span class="lead"></span><span class="p">${valor}</span></div>`;
}
function shTexto(rotulo, valor) {
  return `<div class="sh-line plain"><span class="n">${esc(rotulo)}</span><span class="v">${esc(valor || '—')}</span></div>`;
}
function blocoTracos(grupos, fonte, esps) {
  return grupos.map(g => `<div class="sh-block">
    <h3>${esc(g.cat)}</h3>
    ${g.itens.map(([k, pt]) => {
      const sp = esps && esps[k] ? esps[k] : '';
      return shLinha(esc(pt), pips(fonte[k] || 0, 5), sp ? `(${esc(sp)})` : '');
    }).join('')}
  </div>`).join('');
}

function renderFicha() {
  const m = S.meta, bp = tabelaBP(), cla = CLAS[m.cla];
  const idade = MAR_DO_TEMPO[S.mar];
  const chips = [
    m.cla ? `<span class="sh-chip key">${esc(m.cla)}</span>` : '',
    idade && idade.nome !== 'Não definida' ? `<span class="sh-chip">${esc(idade.nome.replace(' †', ''))}</span>` : '',
    m.geracao ? `<span class="sh-chip">${esc(m.geracao)}ª geração</span>` : '',
    `<span class="sh-chip">Potência de Sangue ${potencia()}</span>`,
    m.predador ? `<span class="sh-chip">${esc(m.predador)}</span>` : '',
    m.seita ? `<span class="sh-chip">${esc(m.seita)}</span>` : '',
    m.cronica ? `<span class="sh-chip">${esc(m.cronica)}</span>` : ''
  ].filter(Boolean).join('');

  morph(el('sheet'), `
  <div class="sh-page">
    <div class="sh-mast">
      <div class="sh-kicker">Vampiro: A Máscara &middot; 5ª edição</div>
      <h1>${esc(m.nome || 'Sem nome')}</h1>
      <div class="sh-rule"></div>
      <div class="sh-chips">${chips}</div>
    </div>

    <h2 class="sr">Resumo</h2>
    <div class="sh-cols c3 sh-ident">
      <div class="sh-block"><h3>Identidade</h3>
        ${shTexto('Jogador', m.jogador)}
        ${shTexto('Conceito', m.conceito)}
        ${shTexto('Senhor', m.senhor)}
        ${shTexto('Ambição', m.ambicao)}
        ${shTexto('Desejo', m.desejo)}
      </div>
      <div class="sh-block sh-estado"><h3>Estado</h3>
        <div class="sh-stat"><span class="k">Vitalidade</span><span class="num">${maxSaude()}</span></div>
        ${caixas(maxSaude(), S.saude.sup, S.saude.agg)}
        <div class="sh-stat" style="margin-top:9px"><span class="k">Força de Vontade</span><span class="num">${maxVontade()}</span></div>
        ${caixas(maxVontade(), S.vontade.sup, S.vontade.agg)}
        <div class="sh-stat" style="margin-top:9px"><span class="k">Humanidade</span><span class="num">${S.humanidade}${S.manchas ? ` <small style="font-size:11px;color:var(--ink-3)">${S.manchas} mácula(s)</small>` : ''}</span></div>
        ${caixasHumanidade()}
        <div class="sh-stat" style="margin-top:9px"><span class="k">Fome</span><span class="num" style="color:var(--hunger)">${S.fome}</span></div>
        ${pips(S.fome, 5, true)}
      </div>
      <div class="sh-block"><h3>Sangue</h3>
        ${shLinha('Surto de Sangue', '+' + bp.surto)}
        ${shLinha('Dano Recuperado', bp.recuperado)}
        ${shLinha('Bônus de Poder', '+' + bp.bonusPoder)}
        ${shLinha('Rerrolagem de Sangue', bp.rerrolagem ? 'nível ' + bp.rerrolagem : '—')}
        ${shLinha('Gravidade da Perdição', bp.gravidade)}
        ${shLinha('Ressonância', esc(m.ressonancia || '—'))}
        <p class="sh-p" style="margin-top:6px;font-size:12.5px;font-style:italic;color:var(--ink-2)">${esc(bp.alimentacao)}</p>
      </div>
    </div>

    <h2 class="sh-eyebrow">Atributos</h2>
    <div class="sh-cols c3">${blocoTracos(ATRIBUTOS, S.atr, null)}</div>

    <h2 class="sh-eyebrow">Habilidades <span style="font-weight:600;letter-spacing:.08em;text-transform:none;font-style:italic">${esc(DISTRIB_HABILIDADES[S.distribHab].nome)}</span></h2>
    <div class="sh-cols c3">${blocoTracos(HABILIDADES, S.hab, S.esp)}</div>
    ${blocoEspecializacoes()}
  </div>

  <div class="sh-page">
    <h2 class="sh-eyebrow">Disciplinas</h2>
    <div class="sh-discs">
      ${S.disc.length ? S.disc.map(d => {
        const info = DISCIPLINAS[d.nome] || { poderes: [] };
        const poderes = (d.poderes || []).map(nome => info.poderes.find(x => x.pt === nome) || { pt: nome, lv: '', ds: '' })
          .sort((a, b) => (a.lv || 0) - (b.lv || 0));
        return `<section class="sh-disc">
          <header class="sh-disc-h"><h3>${esc(d.nome)}</h3>${pips(d.nivel, 5)}</header>
          ${blocoRegrasDisc(d.nome)}
          ${poderes.length ? `<div class="pw-cards">${poderes.map(p => cartaoPoder(d, p)).join('')}</div>` : '<p class="sh-p note">Nenhum poder escolhido.</p>'}
          ${d.rituais ? `<p class="sh-p sh-rit"><strong>${esc((CATALOGO_RITUAL[d.nome] || {}).plural || 'Rituais')}</strong><br>${esc(d.rituais).replace(/\n/g, '<br>')}</p>` : ''}
        </section>`;
      }).join('') : '<p class="sh-p">—</p>'}
    </div>

    <h2 class="sh-eyebrow">Vantagens &amp; defeitos</h2>
    <div class="sh-cols c2">
      <div class="sh-block">
        <h3>Vantagens</h3>
        ${S.vant.length ? S.vant.map(v => shLinha(esc(v.nome), pips(Number(v.pontos) || 0, 5), v.nota ? `(${esc(v.nota)})` : '')).join('') : '<p class="sh-p">—</p>'}
      </div>
      <div class="sh-block">
        <h3>Defeitos</h3>
        ${S.def.length ? S.def.map(v => shLinha(esc(v.nome), pips(Number(v.pontos) || 0, 5), v.nota ? `(${esc(v.nota)})` : '')).join('') : '<p class="sh-p">—</p>'}
      </div>
    </div>

    <h2 class="sh-eyebrow">Moralidade</h2>
    <div class="sh-cols c2">
      <div class="sh-block"><h3>Convicções &amp; Pilares</h3>
        ${S.conv.length ? S.conv.map(c => `<p class="sh-p">${esc(c.texto || '—')}${c.pedra ? `<br><i style="color:var(--ink-3)">Pilar: ${esc(c.pedra)}</i>` : ''}</p>`).join('') : '<p class="sh-p">—</p>'}
        ${S.tenets ? `<h3 style="margin-top:11px">Princípios da crônica</h3><p class="sh-p">${esc(S.tenets)}</p>` : ''}
      </div>
      <div class="sh-block sh-note"><h3>Perdição &amp; compulsão</h3>
        <p class="sh-p"><strong>Perdição</strong><br>${esc(S.bane || (cla ? cla.bane : '—'))}</p>
        <p class="sh-p"><strong>Compulsão</strong><br>${esc(S.comp || (cla ? cla.comp : '—'))}</p>
      </div>
    </div>

    ${(m.aparencia || S.notas || S.xpTotal) ? `<h2 class="sh-eyebrow">Notas</h2>
    <div class="sh-cols c2">
      <div class="sh-block">
        ${m.aparencia ? `<p class="sh-p"><strong>Aparência</strong><br>${esc(m.aparencia)}</p>` : ''}
        ${S.notas ? `<p class="sh-p">${esc(S.notas)}</p>` : ''}
      </div>
      <div class="sh-block">
        ${shLinha('Experiência disponível', (Number(S.xpTotal) || 0) - (Number(S.xpGasto) || 0))}
        ${shLinha('Experiência total', Number(S.xpTotal) || 0)}
      </div>
    </div>` : ''}
  </div>`);
}

/* ============================================================
   TIPO DE PREDADOR
   ============================================================ */
function aplicarPredador(nome, escolhas) {
  const p = PREDADORES[nome];
  S.vant = S.vant.filter(v => v.fonte !== 'predador');
  S.def  = S.def .filter(v => v.fonte !== 'predador');
  S._pred = null;
  if (!p) return;

  const info = { esp: null, espTexto: '', disc: null };

  if (p.esp.length) {
    // prefere a opção em que o personagem já tem pontos — a especialização
    // do predador é grátis, o ponto de Habilidade não é.
    let e = escolhas && escolhas.esp;
    if (!e) {
      const comPontos = p.esp.filter(x => (S.hab[x[0]] || 0) > 0);
      e = comPontos.length ? rnd(comPontos) : rnd(p.esp);
    }
    const nomeHab = HABILIDADES.flatMap(g => g.itens).find(i => i[0] === e[0]);
    if (nomeHab) {
      S.esp[e[0]] = S.esp[e[0]] ? S.esp[e[0]] + ', ' + e[1] : e[1];
      info.esp = e;
      info.espTexto = nomeHab[1] + ' (' + e[1] + ')';
      info.espSemPontos = !(S.hab[e[0]] || 0);
    }
  }
  if (p.disc.length) {
    // O livro permite as duas coisas: mais um nível numa Disciplina que você já
    // tem, ou uma Disciplina nova. Qual das duas é a mais provável depende do
    // sangue: no neonato reforçar a linhagem, no ancião abrir uma terceira.
    let d = escolhas && escolhas.disc;
    if (!d) {
      const jaTem = p.disc.filter(x => S.disc.some(y => y.nome === x && y.nivel < 5));
      const doCla = p.disc.filter(x => discDoCla().includes(x));
      if (jaTem.length && Math.random() < 1 - amplitudeDisciplinas(S.meta.geracao).fora) {
        // entre as que já tem, sobe a mais fraca: 2+2 pesa mais que 3+1
        d = jaTem.sort((a, b) => (S.disc.find(x => x.nome === a).nivel) - (S.disc.find(x => x.nome === b).nivel))[0];
      } else {
        d = doCla.length ? rnd(doCla) : rnd(p.disc);
      }
    }
    const ex = S.disc.find(x => x.nome === d);
    if (ex) ex.nivel = Math.min(5, ex.nivel + 1);
    else S.disc.push({ nome: d, nivel: 1, poderes: [], rituais: '' });
    info.disc = d;
  }
  if (p.ajustes.humanidade) S.humanidade = Math.max(0, Math.min(10, S.humanidade + p.ajustes.humanidade));
  if (p.ajustes.potenciaSangue) S.bpOverride = Math.min(10, potencia() + p.ajustes.potenciaSangue);

  p.vant.forEach(v => S.vant.push(Object.assign({}, v, { fonte: 'predador' })));
  p.def .forEach(v => S.def .push(Object.assign({}, v, { fonte: 'predador' })));
  S._pred = info;
}

/* ============================================================
   SORTEIO
   ============================================================ */
/* origem: '' qualquer · 'cla' combina com o clã · nome de uma região */
function nomeAleatorio(origem, cla) {
  let regiao = origem;
  if (origem === 'cla') regiao = ORIGEM_POR_CLA[cla] || '';
  if (!regiao || !NOMES[regiao]) regiao = rnd(LISTA_ORIGENS);
  const p = NOMES[regiao];
  return { nome: rnd(p.a) + ' ' + rnd(p.b), regiao };
}

/* Ordena as chaves de um conjunto de grupos colocando o grupo em foco na frente.
   Sem foco, embaralha tudo junto. */
function chavesComFoco(grupos, foco) {
  if (!foco) return shuffle(grupos.flatMap(g => g.itens.map(i => i[0])));
  const dentro = grupos.filter(g => g.cat === foco).flatMap(g => g.itens.map(i => i[0]));
  const fora   = grupos.filter(g => g.cat !== foco).flatMap(g => g.itens.map(i => i[0]));
  return shuffle(dentro).concat(shuffle(fora));
}

/* ============================================================
   A CRIAÇÃO POR ETAPAS

   A ficha não sai de um bolo só: sai de treze etapas em ordem, e a
   ordem importa. Cada uma só usa o que as anteriores já decidiram,
   e cada uma é conferida assim que termina — quando algo quebra, o
   painel diz qual etapa quebrou, não só que a ficha está errada.

   A ordem foi escolhida pelas dependências reais:

     1  Intenção      lê o contexto e decide idade, geração, o perfil
                      da ficha (especialista, equilibrada, faz-tudo)
                      e o foco. Tudo o mais trabalha a favor disso.
     2  Clã e seita   o clã limita Disciplinas, Perdição e Compulsão.
     3  Identidade    o nome depende do clã; o resto, da idade.
     4  Predador      depende do clã e da geração.
     5  Atributos     o foco e o perfil decidem onde ficam o 4 e os 3.
     6  Habilidades   o perfil decide a distribuição; o Predador já
                      empurrou as perícias da especialização dele.
     7  Disciplinas   2+1 do clã, mais o ponto do Predador, mais os
                      poderes — que precisam das Disciplinas prontas.
     8  Especializações  depois do Predador, para não repetir a dele.
     9  Ressonância   depois das Disciplinas, para o sangue combinar
                      com o que o personagem sabe fazer.
     10 Vantagens     depois de tudo que pode vetar uma entrada:
                      clã, Disciplinas, perícias e o que o Predador deu.
     11 Convicções
     12 Experiência   por último entre as que gastam pontos.
     13 Fecho         ritos, Fome e a conferência final.
   ============================================================ */

/* Cada etapa: id, nome legível, o que faz e o que confere depois.
   `confere` devolve o problema em texto, ou '' quando está tudo certo. */
const ETAPAS = [
  { id:'intencao', nome:'Intenção',
    roda: etapaIntencao },

  { id:'cla', nome:'Clã e seita',
    roda: etapaCla,
    confere: (P) => !CLAS[S.meta.cla] ? 'clã inválido: ' + S.meta.cla : '' },

  { id:'identidade', nome:'Identidade',
    roda: etapaIdentidade,
    confere: () => !S.meta.nome ? 'ficou sem nome' : '' },

  { id:'predador', nome:'Tipo de Predador',
    roda: etapaPredador,
    confere: () => !PREDADORES[S.meta.predador] ? 'predador inválido: ' + S.meta.predador : '' },

  { id:'atributos', nome:'Atributos',
    roda: etapaAtributos,
    confere: () => orcamento().atr.ok ? '' : 'fora da distribuição um 4 / três 3 / quatro 2 / um 1' },

  { id:'habilidades', nome:'Habilidades',
    roda: etapaHabilidades,
    confere: () => orcamento().hab.ok ? '' : 'fora da distribuição ' + DISTRIB_HABILIDADES[S.distribHab].nome },

  { id:'disciplinas', nome:'Disciplinas e poderes',
    roda: etapaDisciplinas,
    confere: () => {
      const o = orcamento();
      if (o.disc.atual !== o.disc.alvo) return 'pontos de Disciplina ' + o.disc.atual + '/' + o.disc.alvo;
      if (o.disc.foraDoCla.length) return 'fora do clã na criação: ' + o.disc.foraDoCla.join(', ');
      return o.disc.avisos.length ? o.disc.avisos.join(' · ') : '';
    } },

  { id:'especialidades', nome:'Especializações',
    roda: etapaEspecialidades,
    confere: () => Object.entries(S.esp).some(([k, v]) => v && S.hab[k] === 0)
      ? 'especialização em perícia sem pontos' : '' },

  { id:'ressonancia', nome:'Ressonância',
    roda: etapaRessonancia,
    confere: () => RESSONANCIAS[S.meta.ressonancia] ? '' : 'ressonância inválida' },

  { id:'tracos', nome:'Vantagens e Defeitos',
    roda: etapaTracos,
    confere: () => {
      const o = orcamento();
      if (o.vant.atual !== o.vant.alvo) return 'Vantagens ' + o.vant.atual + '/' + o.vant.alvo;
      if (o.def.atual !== o.def.alvo) return 'Defeitos ' + o.def.atual + '/' + o.def.alvo;
      return '';
    } },

  { id:'conviccoes', nome:'Convicções e Pilares',
    roda: etapaConviccoes,
    confere: () => S.conv.length ? '' : 'ficou sem Convicção' },

  { id:'experiencia', nome:'Experiência',
    roda: etapaExperiencia,
    confere: () => (S.xpGasto || 0) > (S.xpTotal || 0)
      ? 'gastou ' + S.xpGasto + ' de ' + S.xpTotal : '' },

  { id:'fecho', nome:'Fecho',
    roda: etapaFecho,
    confere: () => {
      const mau = [];
      Object.entries(S.atr).forEach(([k, v]) => { if (v < 1 || v > 5) mau.push('atributo ' + k); });
      Object.entries(S.hab).forEach(([k, v]) => { if (v < 0 || v > 5) mau.push('perícia ' + k); });
      S.disc.forEach(d => { if (d.nivel < 1 || d.nivel > 5) mau.push('Disciplina ' + d.nome); });
      return mau.length ? 'valor fora da faixa: ' + mau.join(', ') : '';
    } }
];

/* ---------------- as etapas ---------------- */

/* 1. Intenção — o que esta ficha quer ser. */
function etapaIntencao(P) {
  // Idade e geração andam juntas, e uma decide a outra conforme o que foi
  // fixado. Sem isso sai Matusalém de 9ª geração — a idade era sorteada à
  // parte e contradizia a geração que o contexto tinha dito.
  const gFixa = P.F.geracao ? Number(P.F.geracao) : (P.pesos.geracao || 0);
  P.chaveMar = P.F.mar                                    // a Forja manda
    || (gFixa ? idadePorGeracao(gFixa)                    // geração fixada manda na idade
      : (P.pesos.mar                                      // senão, a idade citada no texto
        || (P.F.cla === 'Sangue-ralo' ? 'ralo' : sortearIdade())));
  P.mar = MAR_DO_TEMPO[P.chaveMar] || null;
  P.antigo = !!(P.mar && P.mar.xp >= 100);
  S.mar = P.chaveMar;

  if (gFixa) S.meta.geracao = gFixa;
  else if (P.mar && P.mar.geracoes.length) S.meta.geracao = rnd(P.mar.geracoes);
  else S.meta.geracao = rnd([11, 12, 13, 13, 13]);
  if (P.chaveMar === 'ralo' && !gFixa) S.meta.geracao = rnd([14, 15, 16]);
  P.amp = amplitudeDisciplinas(S.meta.geracao);

  // O perfil da ficha. É ele que faz Atributos e Habilidades puxarem
  // para o mesmo lado em vez de cada um para o seu.
  S.distribHab = P.F.distrib || distribuicaoPorContexto(P.pesosPuros);
  P.perfil = S.distribHab;
  P.foco = P.F.foco || focoPorContexto(P.pesosPuros);
  P.focoHab = P.foco ? ({ 'Físicos':'Físicas', 'Sociais':'Sociais', 'Mentais':'Mentais' })[P.foco] : '';
  // quanto o foco manda: numa ficha especialista, muito; numa faz-tudo, pouco
  P.concentrar = { especialista: 1.45, balanceado: 1, faztudo: 0.55 }[P.perfil] || 1;

  // Gente que o seu texto citou e que pode ancorar uma Convicção. Sai daqui
  // porque as etapas 3 e 11 usam a mesma lista.
  P.pilares = pilaresDoTexto(P.ctx);
}

/* 2. Clã e seita. */
function etapaCla(P) {
  const possiveis = P.chaveMar === 'ralo' ? ['Sangue-ralo'] : LISTA_CLAS.filter(c => c !== 'Sangue-ralo');
  const citado = P.pesos.fixo.cla;
  S.meta.cla = P.F.cla
    || (possiveis.includes(citado) ? citado : null)
    || escolherPorContexto(P.pesos.cla, possiveis)
    || rnd(possiveis);
  P.cla = CLAS[S.meta.cla];
  S.bane = P.cla.bane;
  S.comp = P.cla.comp;
  S.meta.seita = P.F.seita || P.pesos.seita || rnd(SEITAS.slice(0, 3));
}

/* 3. Identidade — o nome depende do clã; o resto, da idade. */
function etapaIdentidade(P) {
  const antigo = P.antigo;
  S.meta.nome = nomeAleatorio(P.F.origem || P.pesos.origem, S.meta.cla).nome;
  S.meta.conceito = P.ctx || rnd(antigo ? SEMENTES.conceitosAntigos : SEMENTES.conceitos);
  S.meta.ambicao = motivoPorContexto('amb', P);
  S.meta.desejo = motivoPorContexto('des', P);
  S.tenets = rnd(SEMENTES.tenets);
}

/* 4. Tipo de Predador — escolhido aqui, aplicado na etapa das Disciplinas,
   porque os benefícios dele precisam de perícias e Disciplinas já postas. */
function etapaPredador(P) {
  const possiveis = LISTA_PREDADORES.filter(p => p !== 'Personalizado');
  // Sem preferência declarada, prefere os predadores cuja Disciplina conversa
  // com o clã — mas só na medida em que o sangue é fraco. Um neonato da 13ª
  // caça como a linhagem ensinou; um ancião da 8ª teve séculos para aprender
  // de outro jeito, e aí a Disciplina estranha é o esperado, não o erro.
  const casam = possiveis.filter(p => (PREDADORES[p].disc || []).some(d => P.cla.disc.includes(d)));
  const citado = P.pesos.fixo.pred;
  S.meta.predador = P.F.predador
    || (possiveis.includes(citado) ? citado : null)
    || escolherPorContexto(P.pesos.pred, possiveis)
    || (casam.length && Math.random() < 1 - P.amp.fora ? rnd(casam) : rnd(possiveis));
  // as perícias da especialização dele passam a pesar no sorteio das Habilidades
  ((PREDADORES[S.meta.predador] || {}).esp || []).forEach(([k]) => {
    P.pesos.hab[k] = (P.pesos.hab[k] || 0) + 2;
  });
}

/* 5. Atributos — um 4, três 3, quatro 2, um 1. */
function etapaAtributos(P) {
  const ordem = ordenarPorPeso(ATRIBUTOS, P.pesos.atr, P.foco, P.concentrar);
  const valores = [4, 3, 3, 3, 2, 2, 2, 2, 1];
  ordem.forEach((k, i) => S.atr[k] = valores[i]);
  P.ordemAtr = ordem;
}

/* 6. Habilidades — na distribuição que o perfil escolheu. */
function etapaHabilidades(P) {
  const mapa = DISTRIB_HABILIDADES[S.distribHab].mapa;
  const valores = [];
  Object.entries(mapa).sort((a, b) => b[0] - a[0])
    .forEach(([n, q]) => { for (let i = 0; i < q; i++) valores.push(Number(n)); });
  P.ordemHab = ordenarPorPeso(HABILIDADES, P.pesos.hab, P.focoHab, P.concentrar);
  P.ordemHab.forEach((k, i) => S.hab[k] = valores[i] || 0);
}

/* 7. Disciplinas: dois pontos numa e um noutra, dentro do clã, mais o ponto
   do Predador. Sangues-ralos não têm Disciplinas intrínsecas. */
function etapaDisciplinas(P) {
  if (S.meta.cla !== 'Sangue-ralo') {
    const pool = P.cla.disc.length ? P.cla.disc
               : LISTA_DISCIPLINAS.filter(d => d !== 'Alquimia de Sangue-ralo');
    const ordem = ordenarLista(pool, P.pesos.disc);
    S.disc.push({ nome: ordem[0], nivel: DISTRIB_DISCIPLINAS.reparticao[0], poderes: [], rituais: '' });
    if (ordem[1]) S.disc.push({ nome: ordem[1], nivel: DISTRIB_DISCIPLINAS.reparticao[1], poderes: [], rituais: '' });
  }
  // agora sim: o Predador entrega especialização, ponto de Disciplina,
  // Vantagens e Defeitos — e para isso precisa de perícias e Disciplinas.
  aplicarPredador(S.meta.predador);
  // Um poder por nível. Com Disciplina 2, sai um de nível 1 e um de nível 2.
  S.disc.forEach(d => escolherPoderes(d));
}

/* 8. Especializações — as de graça, mais uma escolhida. A do Predador já
   está na ficha, então a escolhida não cai em cima dela. */
function etapaEspecialidades(P) {
  ESPECIALIDADE_GRATIS.forEach(k => {
    if (S.hab[k] > 0 && !S.esp[k]) S.esp[k] = especialidadePara(k, P.pesos);
  });
  const candidatas = P.ordemHab.filter(k => S.hab[k] >= 2 && !S.esp[k]);
  if (candidatas.length) S.esp[candidatas[0]] = especialidadePara(candidatas[0], P.pesos);
}

/* 9. Ressonância — o sangue que combina com as Disciplinas que ele tem.
   O contexto ainda manda mais, quando disse alguma coisa. */
function etapaRessonancia(P) {
  const citada = P.pesos.fixo.res || escolherPorContexto(P.pesos.res, Object.keys(RESSONANCIAS));
  if (citada && RESSONANCIAS[citada]) { S.meta.ressonancia = citada; return; }
  const tem = S.disc.map(d => d.nome);
  const nota = Object.keys(RESSONANCIAS).map(r => ({
    r, n: (RESSONANCIA_DISC[r] || []).filter(d => tem.includes(d)).length + Math.random() * 0.9
  })).sort((a, b) => b.n - a.n);
  S.meta.ressonancia = nota[0].r;
}

/* 10. Vantagens e Defeitos, Loresheet incluído — sai do mesmo orçamento. */
function etapaTracos(P) {
  let orc = 7 + (P.mar ? P.mar.vantagens : 0);
  const livros = (P.F.fontes && P.F.fontes.length) ? P.F.fontes : FONTES_PADRAO;
  const ls = escolherLoresheet(S.meta.cla, P.pesos, livros);
  if (ls && orc >= 3) {
    const pontos = Math.min(P.antigo ? 3 : 2, 1 + Math.floor(Math.random() * (P.antigo ? 3 : 2)));
    S.vant.push({ nome: ls.nome, pontos, nota: ls.ds, fonte: 'user' });
    S.loresheet = ls.nome;
    orc -= pontos;
  }
  gastarPontos(S.vant, catalogoTracos('vant', P.pesos), orc, P.pesos.vant, 'Contatos');
  gastarPontos(S.def, catalogoTracos('def', P.pesos), 2 + (P.mar ? P.mar.defeitos : 0), P.pesos.def, 'Segredo Sombrio');
}

/* 11. Convicções e os Pilares que as sustentam. */
function etapaConviccoes(P) {
  S.conv = conviccoesPorContexto(P);
}

/* 12. A experiência do Mar do Tempo. */
function etapaExperiencia(P) {
  if (!P.mar) return;
  S.humanidade = Math.max(0, Math.min(10, S.humanidade + P.mar.humanidade));
  S.xpTotal = P.mar.xp;
  S.xpCompras = gastarXP(P.mar.xp, P.pesos);
  S.xpGasto = S.xpCompras.reduce((t, c) => t + c.custo, 0);

  // Com as Disciplinas todas no lugar, os Amálgamas que o sangue agora
  // sustenta ficam visíveis. Enquanto a ficha subia nível a nível eles
  // passavam batido: o poder de Dominação 2 era escolhido quando o
  // personagem ainda tinha Ofuscação 1.
  S.disc.forEach(d => d.poderes = []);
  shuffle(S.disc.slice()).forEach(d => escolherPoderes(d, exigidosPorRitos(d)));
}

/* 13. Fecho: ritos, Fome e o que mais depende de tudo estar pronto. */
function etapaFecho(P) {
  S.disc.forEach(d => { podarRitos(d); if (!d.rituais) escolherRituais(d, 1); });
  S.fome = 1;
}

/* ---------------- o encadeamento ---------------- */

/* As treze etapas, uma atrás da outra, cada uma conferida ao terminar. */
function correrEtapas(P) {
  S._etapas = [];
  for (const etapa of ETAPAS) {
    etapa.roda(P);
    const problema = etapa.confere ? etapa.confere(P) : '';
    S._etapas.push({ id: etapa.id, nome: etapa.nome, problema });
  }
  S._perfil = P.perfil;
  S._foco = P.foco;
  aplicarPreservados(P.F, P.antes);
  render();
}

/* Devolve undefined quando o sorteio é imediato, e uma Promise só quando
   há modelo local para esperar. Isso importa: sem o modelo ligado a ficha
   fica pronta na mesma volta, como sempre esteve, e quem chama `sortear()`
   e lê `S` na linha seguinte continua lendo a ficha pronta. */
function sortear() {
  const F = S.forja || novaForja();
  const antes = {
    nome: S.meta.nome, conceito: S.meta.conceito,
    ambicao: S.meta.ambicao, desejo: S.meta.desejo,
    jogador: S.meta.jogador, cronica: S.meta.cronica,
    conv: S.conv, tenets: S.tenets
  };

  S = novoEstado();
  S.forja = F;
  S.sistema = F.sistema || 'vampiro';

  const pesos = pesosContexto(F.contexto);
  // cópia intocada: o Tipo de Predador vai somar peso em perícias mais
  // adiante, e isso não pode decidir a distribuição nem o foco
  const pesosPuros = { hab: Object.assign({}, pesos.hab), atr: Object.assign({}, pesos.atr) };

  if (S.sistema === 'cacador') {
    sortearCacador(F, antes, pesos);
    aplicarPreservados(F, antes);
    return render();
  }

  const P = { F, antes, pesos, pesosPuros, ctx: String(F.contexto || '').trim() };

  correrEtapas(P);
}




/* Texto do que o contexto reconheceu e do que ele vai empurrar. */
function resumoContexto(texto) {
  const p = pesosContexto(texto);
  if (!p.casou.length && !p.diretos.length && !p.marcas.length) {
    return 'Escreva em português corrido — profissão, temperamento, origem, época. '
         + 'Nomear um traço do sistema vale mais que descrever: <em>"Ventrue da 9ª geração, usa Dominação, '
         + 'tem Influência na prefeitura, sem Recursos"</em> é lido ao pé da letra. '
         + 'Negação conta: <em>"sem contatos"</em> tira Contatos. <em>"Ex-policial"</em> vale metade.';
  }
  const topo = (obj, n, rot) => {
    const l = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
    return l.length ? `<strong>${rot}:</strong> ${esc(l.join(', '))}` : '';
  };
  const nomeHab = {}; HABILIDADES.forEach(g => g.itens.forEach(([k, n]) => nomeHab[k] = n));
  const habTop = Object.entries(p.hab).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => nomeHab[x[0]] || x[0]);
  const nomeAtr = {}; ATRIBUTOS.forEach(g => g.itens.forEach(([k, n]) => nomeAtr[k] = n));
  const atrTop = Object.entries(p.atr).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => nomeAtr[x[0]] || x[0]);

  const linhas = [
    habTop.length ? `<strong>Perícias:</strong> ${esc(habTop.join(', '))}` : '',
    atrTop.length ? `<strong>Atributos:</strong> ${esc(atrTop.join(', '))}` : '',
    ehCacador() ? topo(p.credo, 1, 'Credo') : topo(p.cla, 2, 'Clã'),
    ehCacador() ? topo(p.impeto, 1, 'Ímpeto') : topo(p.pred, 2, 'Predador'),
    ehCacador() ? '' : topo(p.disc, 2, 'Disciplinas'),
    ehCacador() ? '' : topo(p.res, 1, 'Ressonância'),
    topo(p.vant, 3, 'Vantagens'),
    topo(p.def, 2, 'Defeitos')
  ].filter(Boolean);

  const bloco = (rot, lista, cls) => lista.length
    ? `<div style="margin-bottom:3px"><span class="lbl" style="display:inline;margin:0 6px 0 0">${rot}</span>`
      + lista.map(x => `<span class="tag ${cls}">${esc(x)}</span>`).join(' ') + '</div>'
    : '';

  return bloco('Arquétipos', p.casou, 'blood')
       + bloco('Citado no texto', p.diretos.slice(0, 14), '')
       + bloco('Parâmetros', p.marcas, 'blood')
       + (linhas.length ? '<div style="margin-top:4px">' + linhas.join(' &middot; ') + '</div>' : '');
}

/* ------------------------------------------------------------
   CATÁLOGO DE VANTAGENS E DEFEITOS PARA O SORTEIO

   Uma entrada só entra se a ficha pode mesmo tê-la:
   · `so` — Sangue-ralo, Caitiff e carniçal são exclusivos; os de culto
     ficam de fora do automático, porque não modelamos cultos aqui;
   · `req` — pré-requisito de outra Vantagem ("Fama 2+", "Refúgio Móvel");
   · `f` — livro desligado na Forja não sorteia;
   · CONTRADICOES — o que já está na ficha veta o oposto, nos dois sentidos;
   · DEFEITO_DESMENTIDO — Defeito que as próprias perícias desmentem;
   · DEFEITOS_DISCIPLINA — só para quem tem aquela Disciplina.
------------------------------------------------------------ */
function vetadosNaFicha() {
  const tidos = new Set(S.vant.map(v => v.nome).concat(S.def.map(v => v.nome)));
  const fora = new Set();
  CONTRADICOES.forEach(([a, b]) => { if (tidos.has(a)) fora.add(b); if (tidos.has(b)) fora.add(a); });
  return { tidos, fora };
}
function temPontos(nome, minimo) {
  const v = S.vant.find(x => x.nome === nome);
  return !!v && (Number(v.pontos) || 0) >= (minimo || 1);
}
function requisitoOk(req) {
  if (!req) return true;
  const m = /^(.+?)\s+(\d)\+?$/.exec(req);
  if (m) return temPontos(m[1].trim(), Number(m[2]));
  if (POR_NOME[req]) return temPontos(req, 1);
  return false;   // culto ou condição que o sorteio não sabe avaliar
}
function catalogoTracos(tipo, pesos) {
  const lista = tipo === 'vant' ? VANTAGENS : DEFEITOS;
  const { tidos, fora } = vetadosNaFicha();
  // "sem contatos" no texto de contexto é veto, não só ausência de peso
  const negado = (pesos && pesos.veto && pesos.veto[tipo]) || {};
  const ralo = S.meta.cla === 'Sangue-ralo';
  const caitiff = S.meta.cla === 'Caitiff';

  const cat = lista.filter(v => {
    if (tidos.has(v.pt) || fora.has(v.pt) || negado[v.pt]) return false;
    if (!fonteLigada(v)) return false;
    if (v.so === 'ralo' && !ralo) return false;
    if (v.so === 'caitiff' && !caitiff) return false;
    if (v.so === 'carnical' || v.so === 'culto') return false;
    if (ralo && v.cat === 'Caitiff') return false;
    if (!requisitoOk(v.req)) return false;
    if (tipo === 'def') {
      const habs = DEFEITO_DESMENTIDO[v.pt];
      if (habs && habs.some(h => (S.hab[h] || 0) >= 2)) return false;
    }
    return true;
  }).map(v => ({ n: v.pt, min: v.min, teto: v.max }));

  // Defeitos presos a Disciplina entram só para quem tem a Disciplina
  if (tipo === 'def') {
    DEFEITOS_DISCIPLINA.forEach(d => {
      if (!S.disc.some(x => x.nome === d.disc)) return;
      if (tidos.has(d.pt) || fora.has(d.pt) || negado[d.pt]) return;
      cat.push({ n: d.pt, min: 1, teto: 1 });
    });
  }
  return cat;
}

/* Distribui exatamente `total` pontos entre os itens do catálogo,
   preferindo o que o contexto sugeriu. `catalogo` é [{n, min, teto}, …]. */
function gastarPontos(lista, catalogo, total, pesos, reserva) {
  let restam = total;
  const ordem = catalogo
    .map(it => ({ n: it.n, min: it.min || 1, teto: it.teto, p: (pesos[it.n] || 0) * 1.5 + Math.random() }))
    .sort((a, b) => b.p - a.p);
  const meus = {};

  // o catálogo já veio filtrado, mas duas escolhas desta mesma rodada ainda
  // podem se contradizer entre si — Vício e Vício Irremediável, por exemplo
  const conflita = (nome) => CONTRADICOES.some(([a, b]) =>
    (a === nome && lista.some(v => v.nome === b)) || (b === nome && lista.some(v => v.nome === a)));

  for (const it of ordem) {
    if (restam <= 0) break;
    if (lista.some(v => v.nome === it.n) || conflita(it.n)) continue;
    // o piso da entrada é do livro: Aliados começa em 2, não em 1
    if (it.min > restam) continue;
    // o peso do contexto é fracionário desde que os arquétipos passaram a
    // escalar por número de palavras casadas; ponto de Vantagem não é
    const sugerido = Math.round(pesos[it.n] || 0);
    const teto = Math.min(it.teto, restam);
    const pts = Math.max(it.min, Math.min(teto, sugerido || (it.min + Math.floor(Math.random() * (teto - it.min + 1)))));
    const e = { nome: it.n, pontos: pts, nota: '', fonte: 'user' };
    lista.push(e); meus[it.n] = e; restam -= pts;
  }
  // sobra engorda o que já foi escolhido, respeitando o teto de cada um
  let guarda = 0;
  while (restam > 0 && guarda++ < 60) {
    const alvo = ordem.find(it => meus[it.n] && meus[it.n].pontos < it.teto);
    if (!alvo) break;
    meus[alvo.n].pontos++; restam--;
  }
  if (restam > 0) lista.push({ nome: reserva, pontos: restam, nota: '', fonte: 'user' });
}

/* ------------------------------------------------------------
   GASTO DE EXPERIÊNCIA — tabela de custos do Guia Suplementar.
   Usado pelo Mar do Tempo: compra pequenas melhorias que fazem
   sentido para o contexto do personagem.
------------------------------------------------------------ */
function gastarXP(orcado, pesos) {
  const compras = [];
  let saldo = orcado;
  const amp = amplitudeDisciplinas(S.meta.geracao);
  const velho = orcado >= 100;
  const podeBP = velho && Math.random() < 0.3;
  // um analfabeto não vai gastar experiência em Erudição
  const habVetadas = new Set();
  S.def.forEach(d => (DEFEITO_DESMENTIDO[d.nome] || []).forEach(h => habVetadas.add(h)));
  const rotHab = {}, rotAtr = {};
  HABILIDADES.forEach(g => g.itens.forEach(([k, n]) => rotHab[k] = n));
  ATRIBUTOS.forEach(g => g.itens.forEach(([k, n]) => rotAtr[k] = n));
  const custoDisc = (nome) => S.meta.cla === 'Caitiff' ? 6 : (discDoCla().includes(nome) ? 5 : 7);

  const opcoes = () => {
    const o = [];
    Object.keys(S.hab).forEach(k => {          // Habilidade: novo nível × 3
      const a = S.hab[k] || 0;
      if (a >= 5 || habVetadas.has(k)) return;
      o.push({ tipo:'hab', k, de:a, para:a + 1, custo:(a + 1) * 3,
               peso:(pesos.hab[k] || 0) + (a ? 1.5 : -1),
               rot:`${rotHab[k]} ${a} → ${a + 1}`, aplicar:() => S.hab[k] = a + 1 });
    });
    Object.keys(S.atr).forEach(k => {          // Atributo: novo nível × 5
      const a = S.atr[k] || 1;
      if (a >= 5) return;
      o.push({ tipo:'atr', k, de:a, para:a + 1, custo:(a + 1) * 5,
               peso:(pesos.atr[k] || 0),
               rot:`${rotAtr[k]} ${a} → ${a + 1}`, aplicar:() => S.atr[k] = a + 1 });
    });
    S.disc.forEach(d => {                      // Disciplina: × 5 clã, × 7 outra, × 6 Caitiff
      if (d.nivel >= 5) return;
      o.push({ tipo:'disc', k:d.nome, de:d.nivel, para:d.nivel + 1, custo:(d.nivel + 1) * custoDisc(d.nome),
               peso:(pesos.disc[d.nome] || 0) + 1.5,
               rot:`${d.nome} ${d.nivel} → ${d.nivel + 1}`,
               aplicar:() => { d.nivel++; escolherPoderes(d); } });
    });
    // Abrir uma Disciplina nova. É aqui que o repertório de um ancião se
    // afasta da linhagem: o teto e o apetite por sair do clã vêm da geração.
    if (S.meta.cla !== 'Sangue-ralo' && S.disc.length < amp.teto) {
      const tidas = S.disc.map(d => d.nome);
      LISTA_DISCIPLINAS
        .filter(n => !tidas.includes(n) && n !== 'Alquimia de Sangue-ralo' && DISCIPLINAS[n])
        .forEach(nome => {
          const dentro = discDoCla().includes(nome);
          // quanto mais folga existe sob o teto, mais atraente é abrir outra
          const folga = (amp.teto - S.disc.length) * 0.25;
          // A Disciplina do clã que ainda falta é a primeira compra óbvia: um
          // Tremere de trezentos anos sem Feitiçaria de Sangue não existe. Ela
          // pesa mais que subir de 4 para 5 numa que ele já tem.
          o.push({ tipo:'disc', k:nome, de:0, para:1, custo:custoDisc(nome), nova:true,
                   peso:(pesos.disc[nome] || 0) + folga + (dentro ? 2.4 : amp.fora * 3.4 - 1.3),
                   rot:`${nome} 0 → 1`,
                   aplicar:() => { const d = { nome, nivel:1, poderes:[], rituais:'' }; S.disc.push(d); escolherPoderes(d); } });
        });
    }
    // Ritual de Feitiçaria e Cerimônia de Oblívio: nível × 3, nunca acima da
    // pontuação da Disciplina. Um feiticeiro de trezentos anos tem repertório.
    S.disc.forEach(d => {
      const cat = CATALOGO_RITUAL[d.nome];
      if (!cat) return;
      ritosViaveis(d).forEach(x => {
        o.push({ tipo:'rit', k:x.pt, de:0, para:x.lv, custo:x.lv * 3,
                 peso:(pesos.disc[d.nome] || 0) + 0.4 + (5 - x.lv) * 0.25,
                 rot:`${cat.rotulo}: ${x.pt} (nível ${x.lv})`,
                 aplicar:() => {
                   const r = ritosDe(d);
                   r.tidos.push(`${x.pt} (${cat.rotulo} ${x.lv})`);
                   d.rituais = r.tidos.join('\n');
                 } });
      });
    });
    // Potência de Sangue: novo nível × 10. Só para quem teve séculos, e no
    // máximo um nível acima do que a geração já entrega. É exceção, não regra:
    // se todo ancião da 8ª andasse com Potência 4, a tabela de geração perdia
    // o sentido. Por isso a decisão é tomada uma vez, no início do gasto.
    if (podeBP) {
      const base = potenciaPorGeracao(Number(S.meta.geracao) || 13), atual = potencia();
      if (atual < base + 1 && atual < 10) {
        o.push({ tipo:'bp', k:'Potência de Sangue', de:atual, para:atual + 1, custo:(atual + 1) * 10,
                 peso:0.5, rot:`Potência de Sangue ${atual} → ${atual + 1}`,
                 aplicar:() => S.bpOverride = atual + 1 });
      }
    }
    Object.keys(S.hab).forEach(k => {          // Nova especialização: 3
      if ((S.hab[k] || 0) < 1 || S.esp[k]) return;
      o.push({ tipo:'esp', k, de:0, para:1, custo:3, peso:(pesos.hab[k] || 0) * 0.6,
               rot:`especialização em ${rotHab[k]}`, aplicar:() => S.esp[k] = especialidadePara(k, pesos) });
    });
    S.vant.filter(v => v.nome && v.fonte === 'user').forEach(v => {   // Vantagem: 3 por ponto
      const lim = (POR_NOME[v.nome] || { max: 5 }).max;
      if (v.pontos >= lim) return;
      o.push({ tipo:'vant', k:v.nome, de:v.pontos, para:v.pontos + 1, custo:3,
               peso:(pesos.vant[v.nome] || 0) * 0.8,
               rot:`${v.nome} ${v.pontos} → ${v.pontos + 1}`, aplicar:() => v.pontos++ });
    });
    return o;
  };

  // Escolher só pelo peso faz o gasto desabar todo em Habilidades: elas são
  // 27, são as mais baratas e ganham sempre. Então o orçamento é repartido
  // por categoria antes, e cada uma gasta a sua fatia. Quem viveu séculos
  // gasta proporcionalmente mais no sangue: é isso que faz um ancião parecer
  // um ancião, e não um neonato com perícias altas.
  const cotas = velho ? { disc: 0.42, hab: 0.21, atr: 0.19, esp: 0.05, vant: 0.06, rit: 0.04, bp: 0.03 }
                      : { disc: 0.33, hab: 0.27, atr: 0.20, esp: 0.08, vant: 0.09, rit: 0.03, bp: 0 };
  const gastoPor = { disc: 0, hab: 0, atr: 0, esp: 0, vant: 0, rit: 0, bp: 0 };
  const registrar = (esc) => {
    esc.aplicar();
    saldo -= esc.custo;
    gastoPor[esc.tipo] += esc.custo;
    compras.push({ tipo: esc.tipo, k: esc.k, de: esc.de, para: esc.para,
                   custo: esc.custo, rot: esc.rot, nova: !!esc.nova });
  };
  const melhor = (lista) => lista.map(x => ({ x, p: x.peso + Math.random() * 1.4 }))
                                 .sort((a, b) => b.p - a.p)[0].x;

  // As compras são grandes e irregulares — um nível de Disciplina custa até 35.
  // Uma passada só deixaria muito dinheiro parado, então as cotas são
  // afrouxadas a cada rodada e o saldo é quem manda parar.
  for (let rodada = 0; rodada < 4 && saldo > 0; rodada++) {
    for (const cat of shuffle(Object.keys(cotas))) {
      if (!cotas[cat]) continue;
      const cota = orcado * cotas[cat] * (1 + rodada * 0.6);
      let guarda = 0;
      while (saldo > 0 && guarda++ < 40) {
        // a primeira compra de cada categoria vale mesmo estourando a cota —
        // é o que permite um ponto de Disciplina caber num orçamento apertado
        if (gastoPor[cat] > 0 && gastoPor[cat] >= cota) break;
        const viaveis = opcoes().filter(x => x.tipo === cat && x.custo <= saldo);
        if (!viaveis.length) break;
        registrar(melhor(viaveis));
      }
    }
  }

  // Sobra: no máximo duas compras de troco. Sem esse limite tudo o que restar
  // vira ponto de Vantagem, que é o item mais barato da tabela.
  for (let i = 0; i < 2 && saldo > 0; i++) {
    const viaveis = opcoes().filter(x => x.custo <= saldo);
    if (!viaveis.length) break;
    // entre os baratos, especialização antes de Vantagem
    const ordem = { esp: 0, rit: 1, hab: 2, disc: 3, atr: 4, vant: 5, bp: 6 };
    registrar(viaveis.sort((a, b) => a.custo - b.custo || ordem[a.tipo] - ordem[b.tipo])[0]);
  }
  return compras;
}

/* Desfaz as compras de XP para conferir a ficha como ela saiu da criação. */
function baseSemXP(fonte, tipo) {
  const base = Object.assign({}, fonte);
  (S.xpCompras || []).forEach(c => {
    if (c.tipo !== tipo || !(c.k in base)) return;
    base[c.k] = Math.min(base[c.k], c.de);
  });
  return base;
}

/* O personagem sustenta este poder?

   O nível do Amálgama agora vem escrito no dado, conferido na wiki oficial —
   antes ele era adivinhado do texto, e a adivinhação errava para os dois
   lados: Possessão pedia Dominação 5 quando o livro pede 3, e Ocultar não
   pedia nada quando o livro pede Auspícios 3.

   `jaEscolhidos` são os poderes desta mesma Disciplina decididos agora, que
   ainda não foram gravados em S.disc. */
function cumpreAmalgama(p, jaEscolhidos) {
  const tem = (nome) => (jaEscolhidos || []).includes(nome)
                     || S.disc.some(x => (x.poderes || []).includes(nome));
  if (p.ex && !tem(p.ex)) return false;
  const a = amalgamaDe(p);
  if (!a) return true;
  const d = S.disc.find(x => x.nome === a.disc);
  return !!d && (d.nivel || 0) >= a.nivel;
}

/* O poder pode sair no sorteio? Só se o livro dele estiver ligado. */
function fonteLigada(p) {
  const livros = (S.forja && S.forja.fontes && S.forja.fontes.length) ? S.forja.fontes : FONTES_PADRAO;
  return livros.includes(p.f);
}

/* Um poder por nível, de 1 até a pontuação. Preserva o que já estava
   escolhido e só completa os níveis descobertos. */
function escolherPoderes(d, exigidosFora) {
  const info = DISCIPLINAS[d.nome];
  if (!info) return;
  const tem = (d.poderes || []).filter(nome => info.poderes.some(p => p.pt === nome));
  const nivelDe = (nome) => (info.poderes.find(p => p.pt === nome) || { lv: 0 }).lv;
  const noNivel = (lv) => info.poderes.filter(p => p.lv === lv && fonteLigada(p));

  // Há nível que só oferece poder com pré-requisito: Proteanismo 4 é só
  // Transmutação, que exige Metamorfose, lá no 3. Se o sorteio do nível 3
  // cair em Fusão com a Terra, o nível 4 fica vazio. Então os pré-requisitos
  // são reservados antes, de cima para baixo.
  // Reservas vindas de fora: uma Cerimônia já comprada exige um poder de
  // Oblívio, e refazer os poderes não pode derrubar o que ela precisa.
  const reservados = new Set(exigidosFora || []);
  for (let lv = d.nivel; lv >= 2; lv--) {
    const cands = noNivel(lv);
    if (!cands.length || cands.some(p => !p.ex)) continue;
    const alvo = cands.find(p => info.poderes.some(x => x.pt === p.ex && x.lv < lv));
    if (alvo) reservados.add(alvo.ex);
  }

  // Um slot por nível: assim dá para voltar e trocar a escolha de um nível
  // de baixo quando o de cima depende dela.
  const slot = new Array(d.nivel).fill(null);
  const postos = () => slot.filter(Boolean);

  for (let lv = 1; lv <= d.nivel; lv++) {
    const doNivel = noNivel(lv).filter(p => !postos().includes(p.pt));
    const validos = doNivel.filter(p => cumpreAmalgama(p, postos()));

    // o que o jogador já tinha marcado neste nível continua valendo
    const jaDesteNivel = tem.find(n => nivelDe(n) === lv && !postos().includes(n));
    const reservadoAqui = validos.find(p => reservados.has(p.pt));
    if (reservadoAqui) { slot[lv - 1] = reservadoAqui.pt; continue; }
    if (jaDesteNivel) { slot[lv - 1] = jaDesteNivel; continue; }

    if (validos.length) {
      const simples = validos.filter(p => !p.am);
      // O poder próprio da Disciplina é o caso comum; o Amálgama entra quando
      // o sangue já sustenta as duas — coisa de quem juntou repertório.
      const fonte = (simples.length && Math.random() < 0.7) ? simples : validos;
      slot[lv - 1] = rnd(fonte).pt;
      continue;
    }

    // Nível sem saída: tudo aqui exige um poder de nível menor que não foi
    // escolhido. Acontece quando a Disciplina sobe de uma em uma com a
    // experiência — Proteanismo 3 pode ter caído em Fusão com a Terra, e aí
    // o 4 não tem como existir. Troca a escolha de baixo pelo pré-requisito.
    const salva = doNivel.find(p => {
      const pre = p.ex && info.poderes.find(x => x.pt === p.ex && x.lv < lv);
      return pre && fonteLigada(pre) && cumpreAmalgama(pre, postos());
    });
    if (salva) {
      const pre = info.poderes.find(x => x.pt === salva.ex);
      slot[pre.lv - 1] = pre.pt;
      slot[lv - 1] = salva.pt;
    }
  }
  d.poderes = postos();
}

/* ------------------------------------------------------------
   RITUAIS E CERIMÔNIAS

   Quem tem Feitiçaria de Sangue ganha um Ritual de nível 1 na criação;
   quem tem Oblívio, uma Cerimônia. Os demais custam nível × 3 e nunca
   passam da pontuação da Disciplina. As Cerimônias exigem um poder de
   Oblívio específico — sem ele, não entram.
------------------------------------------------------------ */
function ritosDe(d) {
  const cat = CATALOGO_RITUAL[d.nome];
  if (!cat) return null;
  const tidos = (d.rituais || '').split('\n').map(s => s.trim()).filter(Boolean);
  return { cat, tidos };
}
/* Candidatos legais para esta Disciplina agora. */
function ritosViaveis(d, tetoNivel) {
  const r = ritosDe(d);
  if (!r) return [];
  const nomes = new Set(r.tidos.map(t => t.replace(/\s*\(.*$/, '')));
  return r.cat.lista.filter(x =>
    x.lv <= Math.min(tetoNivel == null ? d.nivel : tetoNivel, d.nivel)
    && !nomes.has(x.pt)
    && !x.culto                       // rito de culto é escolha da mesa, não sorteio
    && fonteLigada(x)
    && (!x.ex || (d.poderes || []).includes(x.ex)));
}
/* Poderes que os ritos já escolhidos exigem — reservas para o sorteio. */
function exigidosPorRitos(d) {
  const r = ritosDe(d);
  if (!r) return [];
  return r.tidos.map(t => (r.cat.lista.find(y => y.pt === t.replace(/\s*\(.*$/, '')) || {}).ex)
                 .filter(Boolean);
}
/* Rede de segurança: tira o rito que a ficha não sustenta mais. */
function podarRitos(d) {
  const r = ritosDe(d);
  if (!r || !r.tidos.length) return;
  const ok = r.tidos.filter(t => {
    const x = r.cat.lista.find(y => y.pt === t.replace(/\s*\(.*$/, ''));
    return x && x.lv <= d.nivel && (!x.ex || (d.poderes || []).includes(x.ex));
  });
  if (ok.length !== r.tidos.length) {
    d.rituais = ok.join('\n');
    escolherRituais(d, r.tidos.length - ok.length);
  }
}
function escolherRituais(d, quantos, tetoNivel) {
  const r = ritosDe(d);
  if (!r) return 0;
  let postos = 0;
  for (let i = 0; i < quantos; i++) {
    const viaveis = ritosViaveis(d, tetoNivel);
    if (!viaveis.length) break;
    const x = rnd(viaveis);
    r.tidos.push(`${x.pt} (${r.cat.rotulo} ${x.lv})`);
    d.rituais = r.tidos.join('\n');
    postos++;
  }
  return postos;
}

/* O que o jogador pediu para não sortear de novo. */
function aplicarPreservados(F, antes) {
  S.meta.jogador = antes.jogador;
  S.meta.cronica = antes.cronica;
  if (F.manter.nome && antes.nome) S.meta.nome = antes.nome;
  if (F.manter.conceito && antes.conceito) S.meta.conceito = antes.conceito;
  if (F.manter.motivos) {
    if (antes.ambicao) S.meta.ambicao = antes.ambicao;
    if (antes.desejo) S.meta.desejo = antes.desejo;
  }
  if (F.manter.conviccoes && antes.conv && antes.conv.length) {
    S.conv = antes.conv;
    if (antes.tenets) S.tenets = antes.tenets;
  }
}

/* ============================================================
   EVENTOS
   ============================================================ */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-dot],[data-box],[data-hum],[data-act]');
  if (!t) return;

  if (t.dataset.dot != null) {
    const path = t.dataset.dot, i = Number(t.dataset.i);
    if (typeof evoClique === 'function' && evoClique(path, i)) return;
    if (typeof contaDot === 'function' && contaDot(path, i)) return;
    if (path === 'fome' || path === 'desespero' || path === 'perigo') S[path] = (S[path] === i ? i - 1 : i);
    else {
      const atual = Number(getPath(path)) || 0;
      const min = path.startsWith('atr.') ? 1 : 0;
      setPath(path, Math.max(min, atual === i ? i - 1 : i));
    }
    return render();
  }

  if (t.dataset.box != null) {
    const n = t.dataset.box, i = Number(t.dataset.i), o = S[n];
    const total = n === 'saude' ? maxSaude() : maxVontade();
    const estadoAtual = i < o.agg ? 'agg' : (i < o.agg + o.sup ? 'sup' : 'vazio');
    if (estadoAtual === 'vazio') { if (o.sup + o.agg < total) o.sup++; }
    else if (estadoAtual === 'sup') { o.sup--; o.agg++; }
    else { o.agg--; }
    return render();
  }

  if (t.dataset.hum != null) {
    const i = Number(t.dataset.hum) + 1;
    S.humanidade = (S.humanidade === i ? i - 1 : i);
    return render();
  }

  const act = t.dataset.act;
  if (act === 'xp-para-criacao') return xpParaCriacao(t.dataset.tipo, t.dataset.k);
  if (act === 'dano-qtd') {
    const n = t.dataset.trilha;
    MESA.qtd[n] = Math.max(1, Math.min(10, (MESA.qtd[n] || 1) + Number(t.dataset.d)));
    return render();
  }
  if (act === 'dano') {
    const n = t.dataset.trilha, tipo = t.dataset.tipo, d = Number(t.dataset.d), o = S[n];
    let q = MESA.qtd[n] || 1;
    const rot = n === 'saude' ? 'Vitalidade' : 'Força de Vontade', nomeTipo = tipo === 'sup' ? 'superficial' : 'agravado';
    if (d > 0) {
      let txt = '';
      if (tipo === 'sup' && n === 'saude' && !ehCacador() && S.danoMetade !== false) { const m = Math.ceil(q / 2); if (m !== q) txt = ` (metade de ${q})`; q = m; }
      const f = aplicarDano(n, tipo, q);
      registrarMesa(`${rot}: +${q} ${nomeTipo}${txt}${f < q ? ' — trilha cheia' : ''}`);
    } else {
      const antes = o[tipo]; o[tipo] = Math.max(0, o[tipo] - q);
      if (antes !== o[tipo]) registrarMesa(`${rot}: curou ${antes - o[tipo]} ${nomeTipo}`);
    }
    MESA.qtd[n] = 1;
    return render();
  }
  if (act === 'dano-metade') { S.danoMetade = t.checked; return render(); }
  if (act === 'teste-fome') {
    const pw = t.dataset.poder, r = testeDeFome({ poder: pw, nivel: Number(t.dataset.nivel) || 0 });
    render(); avisoTeste(r, pw); return;
  }
  if (act === 'remendar') {
    if (!S.saude.sup) { if (typeof uiAviso === 'function') uiAviso('Não há dano superficial para remendar. Dano agravado só sai com tempo e sangue (veja o livro, Remendar dano agravado).'); return; }
    const r = testeDeFome({ motivo: 'Remendar' });
    if (!r) return;
    const cura = Math.min(S.saude.sup, tabelaBP().recuperado || 1);
    S.saude.sup -= cura;
    registrarMesa(`Remendou ${cura} superficial com sangue`);
    render(); avisoTeste(r, `Remendou ${cura} de dano superficial`); return;
  }
  if (act === 'limpar-registro') { S.registroMesa = []; return render(); }
  if (act === 'xp-implicito') {
    const x = orcamentoXP();
    if (!x.faltaXP) return;
    S.xpGasto = (Number(S.xpGasto) || 0) + x.faltaXP;
    if ((Number(S.xpTotal) || 0) < S.xpGasto) S.xpTotal = S.xpGasto;
    render();
    if (typeof uiAviso === 'function') uiAviso(`${x.faltaXP} XP contados como gastos. Disponível agora: ${(Number(S.xpTotal) || 0) - S.xpGasto}.`, { rotulo: 'Desfazer', fn: () => histDesfazer() }, { grupo: 'xp' });
    return;
  }
  if (act === 'regras-criacao') { S.regrasCriacao = !S.regrasCriacao; return render(); }
  if (act === 'mancha') { S.manchas = Math.max(0, Math.min(10, S.manchas + Number(t.dataset.d))); return render(); }
  if (act === 'rm')     {
    const i = Number(t.dataset.i), v = (S[t.dataset.t] || [])[i];
    const aplicar = () => S[t.dataset.t].splice(i, 1);
    /* Vantagem comprada com XP: tirar devolve o que foi pago */
    if (t.dataset.t === 'vant' && v && v.nome && typeof contaDevolver === 'function'
        && contaDevolver(c => c.tipo === 'vant' && c.k === v.nome, aplicar, `${v.nome} removida`)) return;
    aplicar(); return render();
  }
  if (act === 'rm-pw') {
    const d = S.disc[Number(t.dataset.i)];
    if (d) d.poderes = (d.poderes || []).filter(p => p !== t.dataset.nome);
    return render();
  }
  if (act === 'rm-disc'){
    const i = Number(t.dataset.i), d = S.disc[i];
    const aplicar = () => S.disc.splice(i, 1);
    if (d && typeof contaDevolver === 'function'
        && contaDevolver(c => (c.tipo === 'disc' && c.k === d.nome) || (c.tipo === 'rit' && c.disc === d.nome), aplicar, `${d.nome} removida`)) return;
    aplicar(); return render();
  }
  if (act === 'rm-trunfo'){ S.trunfos.splice(Number(t.dataset.i), 1); return render(); }
  if (act === 'add-trunfo') {
    const v = el('add-trunfo').value;
    const info = LISTA_TRUNFOS.find(x => x.nome === v);
    if (info && !S.trunfos.some(x => x.nome === v)) S.trunfos.push({ nome: v, familia: info.familia, dist: [] });
    return render();
  }

  if (act === 'add-disc') {
    const v = el('add-disc').value;
    if (!v || S.disc.some(d => d.nome === v)) return render();
    const aplicar = () => S.disc.push({ nome: v, nivel: 1, poderes: [], rituais: '' });
    /* com a criação de Disciplinas fechada, uma Disciplina nova é compra (nível 1 × multiplicador) */
    if (typeof contaCobrar === 'function' && contaCobrar({ tipo: 'disc', k: v, de: 0, para: 1, aplicar }, criacaoFechada('disc'))) return;
    aplicar(); return render();
  }
  if (act === 'add-rit') {
    const i = Number(t.dataset.i);
    const d = S.disc[i], sel = el('add-rit-' + i);
    if (!(d && sel && sel.value)) return render();
    const linhas = (d.rituais || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (linhas.includes(sel.value)) return render();
    const aplicar = () => { linhas.push(sel.value); d.rituais = linhas.join('\n'); };
    const cat = CATALOGO_RITUAL[d.nome], nome = sel.value.replace(/\s*\(.*$/, '');
    const x = cat && cat.lista.find(y => y.pt === nome);
    if (x && typeof contaCobrar === 'function' && contaCobrar({ tipo: 'rit', k: x.pt, de: 0, para: x.lv, custo: x.lv * 3, rot: `${x.pt} (${cat.rotulo} ${x.lv})`, disc: d.nome, aplicar },
        criacaoFechada('rit', { disc: d.nome }))) return;
    aplicar(); return render();
  }
  if (act === 'add-vant' || act === 'add-def') {
    const tipo = act === 'add-vant' ? 'vant' : 'def';
    const sel = el(act === 'add-vant' ? 'add-vant' : 'add-def');
    if (!sel.value) return render();
    const aplicar = () => S[tipo].push({ nome: sel.value, pontos: 1, nota: '', fonte: 'user' });
    if (tipo === 'vant' && typeof contaCobrar === 'function'
        && contaCobrar({ tipo: 'vant', k: sel.value, de: 0, para: 1, aplicar }, criacaoFechada('vant'))) return;
    aplicar(); return render();
  }
  if (act === 'add-vant-livre') { S.vant.push({ nome: '', pontos: 1, nota: '', fonte: 'user' }); return render(); }
  if (act === 'add-def-livre')  { S.def .push({ nome: '', pontos: 1, nota: '', fonte: 'user' }); return render(); }
  if (act === 'add-conv')       { S.conv.push({ texto: '', pedra: '' }); return render(); }
  if (act === 'add-esp') {
    const k = (el('add-esp-hab') || {}).value, campo = el('add-esp-txt');
    const txt = campo ? campo.value.trim().replace(/[,;]+/g, ' ') : '';
    if (!k) return;
    if (!txt) { if (campo) campo.focus(); return; }
    espHabEscolhida = k;
    if (!listaEsp(k).some(x => x.toLowerCase() === txt.toLowerCase())) {
      const n = listaEsp(k).length;
      const aplicar = () => { S.esp[k] = listaEsp(k).concat([txt]).join(', '); };
      /* com as especializações grátis já usadas, a nova custa 3 XP */
      if (!(typeof contaCobrar === 'function' && contaCobrar({ tipo: 'esp', k, de: n, para: n + 1, custo: 3, rot: `especialização em ${rotuloHab(k)}: ${txt}`, aplicar }, criacaoFechada('esp')))) {
        aplicar(); render();
      }
    } else render();
    const c = el('add-esp-txt'); if (c) c.focus();
    return;
  }
  if (act === 'rm-esp') {
    const k = t.dataset.k, l = listaEsp(k), i = Number(t.dataset.i), txt = l[i];
    const aplicar = () => { l.splice(i, 1); S.esp[k] = l.join(', '); };
    if (typeof contaDevolver === 'function'
        && contaDevolver(c => c.tipo === 'esp' && c.k === k && String(c.rot).replace(/^.*?:\s*/, '') === txt, aplicar, `Especialização ${txt} removida`)) return;
    aplicar(); return render();
  }
  if (act === 'reaplicar-pred') { aplicarPredador(S.meta.predador); return render(); }
  if (act === 'sortear')        { nvAntesDeSortear(); return sortear(); }
  if (act === 'fechar-forja')   { painelForja = false; el('btn-forja').setAttribute('aria-pressed', 'false'); return render(); }
  if (act === 'limpar-forja')   { S.forja = novaForja(); return render(); }

});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset && t.dataset.forja === 'contexto') {
    S.forja.contexto = t.value; HIST.agrupar = true; salvar();
    const alvo = el('ctx-hint');
    if (alvo) {
      alvo.innerHTML = resumoContexto(t.value);
    }
    return;
  }
  if (t.dataset && t.dataset.bind) {
    const v = t.type === 'number' ? (t.value === '' ? 0 : Number(t.value)) : t.value;
    setPath(t.dataset.bind, v);
    if (ehCacador()) railCacador(); else renderRail();
    VISTA.ficha = true; garantirVistas();
    /* o nome no topo e o contador de avisos acompanham o que se digita */
    if (typeof uiCabecalho === 'function') { uiCabecalho(); uiValidacao(); }
    HIST.agrupar = true;
    salvar();
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  /* Rituais escritos à mão: a linha de um ritual comprado que sumiu devolve o XP */
  if (t.dataset && /^disc\.\d+\.rituais$/.test(t.dataset.bind || '') && typeof contaDevolver === 'function') {
    const d = S.disc[Number(t.dataset.bind.split('.')[1])];
    if (d) {
      const tem = new Set((d.rituais || '').split('\n').map(x => x.trim().replace(/\s*\(.*$/, '')).filter(Boolean));
      if (contaDevolver(c => c.tipo === 'rit' && c.disc === d.nome && !tem.has(c.k), () => {}, 'Ritual tirado')) return;
    }
  }

  if (t.dataset && t.dataset.forja) {
    if (t.dataset.forja === 'contexto') return;
    S.forja[t.dataset.forja] = t.value;
    if (t.dataset.forja === 'sistema') S.sistema = t.value;
    return render();
  }
  if (t.dataset && t.dataset.manter) { S.forja.manter[t.dataset.manter] = t.checked; return render(); }
  if (t.dataset && t.dataset.fonte) {
    const atuais = (S.forja.fontes && S.forja.fontes.length) ? S.forja.fontes.slice() : FONTES_PADRAO.slice();
    const i = atuais.indexOf(t.dataset.fonte);
    if (t.checked && i < 0) atuais.push(t.dataset.fonte);
    if (!t.checked && i >= 0) atuais.splice(i, 1);
    S.forja.fontes = atuais;
    return render();
  }

  if (t.dataset && t.dataset.sel) {
    let v = t.value;
    if (t.dataset.sel === 'bpOverride') v = v === '' ? null : Number(v);
    if (t.dataset.sel === 'meta.geracao') v = Number(v);
    setPath(t.dataset.sel, v);
    if (t.dataset.sel === 'meta.cla') {
      const c = CLAS[v];
      if (c) { S.bane = c.bane; S.comp = c.comp; }
      S._pred = null;
    }
    if (t.dataset.sel === 'meta.predador') aplicarPredador(v);
    return render();
  }

  if (t.dataset && t.dataset.dist != null) {
    const tr = S.trunfos[Number(t.dataset.dist)], nome = t.dataset.nome;
    tr.dist = tr.dist || [];
    if (t.checked) { if (!tr.dist.includes(nome)) tr.dist.push(nome); }
    else tr.dist = tr.dist.filter(d => d !== nome);
    return render();
  }
  if (t.dataset && t.dataset.pw != null) {
    const d = S.disc[Number(t.dataset.pw)], nome = t.dataset.nome;
    d.poderes = d.poderes || [];
    if (t.checked) { if (!d.poderes.includes(nome)) d.poderes.push(nome); }
    else d.poderes = d.poderes.filter(p => p !== nome);
    return render();
  }

  if (t.id === 'add-esp-hab') {
    espHabEscolhida = t.value;
    const dl = el('esp-sug'); if (dl) dl.innerHTML = sugestoesEsp(t.value).map(x => `<option value="${esc(x)}">`).join('');
    return;
  }
  if (t.id === 'add-vant' || t.id === 'add-def') {
    const op = t.options[t.selectedIndex];
    const alvo = el(t.id === 'add-vant' ? 'desc-vant' : 'desc-def');
    if (alvo && op) alvo.textContent = op.dataset.desc || '';
    return;
  }

});

/* o sistema da ficha decide o que aparece nos menus (o PDF editável é só de Vampiro) */
function sincronizarSistema() {
  const c = ehCacador();
  el('sis-vampiro').setAttribute('aria-pressed', String(!c));
  el('sis-cacador').setAttribute('aria-pressed', String(c));
  el('fh-sistema').textContent = c ? 'Caçador: A Revanche · 5ª edição' : 'Vampiro: A Máscara · 5ª edição';
  el('mi-pdf').hidden = c;
  el('mi-imprimir').hidden = c;
  el('mi-imprimir-pagina').querySelector('b').textContent = c ? 'Imprimir ou salvar PDF' : 'O layout desta página';
}
function trocarSistema(s) {
  S.sistema = s;
  S.forja.sistema = s;
  render();
}

/* Dentro de iframe (Artifact), o navegador pode bloquear download e diálogo de
   impressão sem lançar erro nenhum. Tentamos em camadas e avisamos se travar. */
const EM_IFRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

function baixarArquivo(nome, texto, tipo, aviso) {
  const pronto = () => aviso && aviso('');
  /* 1) Save-as de verdade: resolve/rejeita, então dá pra confiar na resposta */
  if (window.showSaveFilePicker) {
    window.showSaveFilePicker({ suggestedName: nome, types: [{ accept: { [tipo]: ['.' + nome.split('.').pop()] } }] })
      .then(h => h.createWritable())
      .then(w => w.write(texto).then(() => w.close()))
      .then(() => aviso && aviso('Salvo.'))
      .catch(e => { if (e && e.name === 'AbortError') pronto(); else baixarPorLink(nome, texto, tipo, aviso); });
    return;
  }
  baixarPorLink(nome, texto, tipo, aviso);
}

function baixarPorLink(nome, texto, tipo, aviso) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  /* o bloqueio de download em iframe é silencioso: não há como confirmar. */
  if (aviso) aviso(EM_IFRAME
    ? 'Se o arquivo não baixou, esta janela está embutida e o navegador bloqueia downloads — use Copiar, ou abra a página em uma aba própria.'
    : '');
}

function imprimir(aviso) {
  let abriu = false;
  const marca = () => { abriu = true; };
  window.addEventListener('beforeprint', marca);
  try { window.print(); } catch (e) {}
  setTimeout(() => {
    window.removeEventListener('beforeprint', marca);
    if (!abriu && aviso) aviso('O navegador bloqueou a impressão nesta janela embutida. Abra a página em uma aba própria e imprima de lá (Ctrl+P).');
    else if (aviso) aviso('');
  }, 700);
}

const avisoFicha = m => { if (m) uiAviso(m); };

/* PDF no modelo oficial (pdf-ficha.js): os derivados que só o app.js conhece */
function dadosPdf() {
  return {
    bp: tabelaBP(), potencia: potencia(), maxSaude: maxSaude(), maxVontade: maxVontade(),
    cla: CLAS[S.meta.cla], idade: MAR_DO_TEMPO[S.mar], DISCIPLINAS,
    nomeHabilidade: k => { for (const g of HABILIDADES) for (const i of g.itens) if (i[0] === k) return i[1]; return k; }
  };
}
const pdfDisponivel = () => !ehCacador() && typeof PDFLib !== 'undefined' && typeof gerarPdf === 'function';

/* O modelo do PDF (1,7 MB) e a pdf-lib (0,5 MB) só são baixados quando alguém exporta,
   imprime no modelo ou importa um PDF — a página abre bem mais leve, sobretudo no celular.
   No arquivo único (ficha-de-sangue.html) os dois já vêm embutidos e nada é baixado. */
let carregandoPdf = null;
const carregarScript = src => new Promise((ok, falhou) => {
  const s = document.createElement('script');
  s.src = src; s.async = true;
  s.onload = ok; s.onerror = () => falhou(new Error('não carregou ' + src));
  document.head.appendChild(s);
});
async function garantirPdf(aviso) {
  if (typeof PDFLib !== 'undefined' && typeof MODELO_PDF_B64 !== 'undefined') return true;
  if (aviso) aviso('Carregando o modelo do PDF…');
  const arq = window.FS_PDF || { lib: 'pdf-lib.min.js', modelo: 'modelo-pdf.js' };
  carregandoPdf = carregandoPdf || Promise.all([
    typeof PDFLib === 'undefined' ? carregarScript(arq.lib) : null,
    typeof MODELO_PDF_B64 === 'undefined' ? carregarScript(arq.modelo) : null
  ]);
  try { await carregandoPdf; return true; }
  catch (e) { carregandoPdf = null; if (aviso) aviso('Não consegui baixar o modelo do PDF. Confira a internet e tente de novo.'); return false; }
}

/* Salvar: baixa o PDF preenchido, ainda editável */
async function salvarPdf(aviso) {
  if (ehCacador()) { aviso('O PDF editável existe só para Vampiro. Em Caçador, use Imprimir.'); return; }
  if (!(await garantirPdf(aviso))) return;
  if (!pdfDisponivel()) { aviso('A biblioteca de PDF não carregou. Recarregue a página.'); return; }
  aviso('Gerando o PDF…');
  try {
    const bytes = await gerarPdf(S, dadosPdf(), PDFLib);
    const nome = ('Ficha - ' + (S.meta.nome || 'Vampiro')).replace(/[\\/:*?"<>|]+/g, '').trim() + '.pdf';
    baixarArquivo(nome, bytes, 'application/pdf', m => aviso(m === '' || m == null ? 'PDF pronto: ' + nome : m));
  } catch (e) {
    aviso('Não consegui gerar o PDF: ' + (e && e.message ? e.message : e));
  }
}

/* Imprimir: em Vampiro, imprime o mesmo PDF do modelo, não o layout da página.
   1) carrega o PDF num iframe invisível e chama a impressão dele;
   2) onde isso não funciona (arquivo aberto com duplo clique, Safari), abre o PDF numa aba;
   3) em janela embutida, ou se a aba for bloqueada, imprime a página como antes. */
const EH_SAFARI = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
function imprimirPagina(aviso) { imprimir(aviso); }

async function imprimirModelo(aviso) {
  /* Dentro de janela embutida (Artifact) o Chrome não abre PDF em quadro nem em aba
     criada pela janela: só a impressão da página funciona. O modelo sai por "Salvar PDF". */
  if (ehCacador() || EM_IFRAME) { imprimirPagina(aviso); return; }
  if (!(await garantirPdf(aviso)) || !pdfDisponivel()) { imprimirPagina(aviso); return; }
  aviso('Preparando a impressão…');
  let url;
  try {
    const bytes = await gerarPdf(S, dadosPdf(), PDFLib);
    url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  } catch (e) {
    aviso('Não consegui montar o PDF do modelo; imprimindo a página.');
    imprimirPagina(); return;
  }

  const pelaAba = () => {
    let w = null;
    try { w = window.open(url, '_blank'); } catch (e) {}
    if (w) { aviso('A ficha abriu numa aba nova. Imprima de lá (Ctrl+P).'); setTimeout(() => URL.revokeObjectURL(url), 120000); }
    else { URL.revokeObjectURL(url); aviso('O navegador bloqueou a janela de impressão do PDF. Imprimindo a página.'); imprimirPagina(); }
  };
  /* em file:// o PDF fica com origem opaca e o iframe não deixa chamar a impressão */
  if (EH_SAFARI || location.protocol === 'file:') { pelaAba(); return; }

  const fr = document.createElement('iframe');
  fr.title = 'Impressão da ficha';
  fr.setAttribute('aria-hidden', 'true');
  fr.tabIndex = -1;
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  const limpar = () => setTimeout(() => { fr.remove(); URL.revokeObjectURL(url); }, 120000);
  let feito = false;
  fr.onload = () => setTimeout(() => {
    if (feito) return; feito = true;
    try { fr.contentWindow.focus(); fr.contentWindow.print(); aviso(''); limpar(); }
    catch (e) { fr.remove(); pelaAba(); }
  }, 500); /* o leitor de PDF do navegador termina de montar depois do onload */
  /* navegador configurado para baixar PDFs em vez de abrir: o quadro nunca carrega */
  setTimeout(() => {
    if (feito) return; feito = true;
    fr.remove();
    aviso('Seu navegador baixa PDFs em vez de abri-los. Abra o arquivo baixado e imprima de lá.');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }, 4000);
  fr.src = url;
  document.body.appendChild(fr);
}

/* Abrir PDF: o PDF salvo pelo app traz a ficha anexada; o que foi mexido à mão
   nos campos é aplicado por cima. Um PDF do modelo preenchido em outro lugar é
   lido só pelos campos. */
async function abrirPdf(arquivo, aviso) {
  if (!(await garantirPdf(aviso))) return;
  aviso('Lendo o PDF…');
  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    let lido;
    try { lido = await lerPdf(bytes, PDFLib); }
    catch (e) {
      /* não é o modelo daqui: outra ficha de Vampiro, lida campo a campo e conferida antes */
      if (/não é o modelo/.test(e && e.message)) return impAbrirPdfAlheio(bytes.slice(), aviso);
      throw e;
    }
    const base = lido.pacote ? adotar(lido.pacote.estado) : novoEstado();
    const r = estadoDoPdf(lido, base, { DISCIPLINAS, HABILIDADES, ATRIBUTOS, CLAS, MAR: MAR_DO_TEMPO });
    const novo = adotar(r.estado);
    novo.sistema = 'vampiro'; novo.forja.sistema = 'vampiro';
    /* O PDF traz o id da ficha de onde saiu. Se essa ficha está aqui e não mudou
       desde que o PDF foi salvo, o PDF a atualiza; se mudou (ou não há anexo),
       o PDF entra como ficha nova: nada é sobrescrito. */
    let mesma = false;
    if (lido.pacote && novo._id) {
      const local = nvDadosLocais(novo._id);
      const limpa = x => { const c = adotar(JSON.parse(JSON.stringify(x))); delete c._id; return JSON.stringify(c); };
      mesma = !!local && limpa(local) === limpa(lido.pacote.estado);
      if (!mesma && local) delete novo._id;
    }
    nvSairLeitura(false);
    S = nvIdentidade(novo);
    render();
    uiIr('#/ficha/' + S._id);
    const lista = r.mudancas.slice(0, 8).join(', ') + (r.mudancas.length > 8 ? ' e mais ' + (r.mudancas.length - 8) : '');
    aviso(r.comAnexo
      ? (r.mudancas.length ? 'Ficha aberta' + (mesma ? '' : ' como ficha nova') + '. Editado no PDF e aplicado: ' + lista + '.' : 'Ficha aberta' + (mesma ? '' : ' como ficha nova') + ', igual a quando o PDF foi salvo.')
      : 'PDF sem os dados do app: a ficha foi montada lendo os campos. Confira poderes e vantagens.');
  } catch (e) {
    aviso('Não consegui abrir: ' + (e && e.message ? e.message : e) + '.');
  }
}
/* os botões e o início do app ficam em interface.js */
