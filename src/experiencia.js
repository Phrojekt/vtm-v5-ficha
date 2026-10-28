/* ============================================================
   Ficha de Sangue — experiência

   Dois caminhos, um registro só:

   1. Modo Evoluir, na própria ficha. Liga-se pelo botão "Evoluir" (faixa
      de Editar, Na mesa ou o diálogo). Os pontos de Atributos, Habilidades
      e Disciplinas mostram o custo do próximo nível; clicar num ponto acima
      do atual prepara a compra, clicar num ponto comprado com XP prepara a
      devolução. A barra de baixo confirma. Nada muda sem confirmar.

   2. Diálogo Experiência (menu Mais, aba Notas e XP): saldo, registrar o
      XP ganho na sessão com uma nota, as compras que não têm ponto na
      ficha (Especialização, Disciplina nova, Ritual, Vantagem, Potência de
      Sangue) e o livro de experiência: ganhos e gastos numa linha do tempo,
      com devolução de qualquer compra que ainda esteja de pé.

   Cada compra entra em S.xpCompras (o mesmo registro que o sorteio usa para
   o Mar do Tempo), então a Base de criação desconta o que veio de XP e não
   acusa erro. Ganhos entram em S.xpLog.

   Custos (Livro Básico / Guia Suplementar):
     Atributo: novo nível × 5 · Habilidade: novo nível × 3 · Especialização: 3
     Disciplina: novo nível × 5 (clã), × 7 (outra), × 6 (Caitiff)
     Ritual de Feitiçaria / Cerimônia: nível × 3 · Fórmula de Sangue-ralo: nível × 3
     Vantagem: 3 por ponto · Potência de Sangue: novo nível × 10

   Carregado depois de app.js e antes de interface.js.
   ============================================================ */

const XP = { cat: 'esp', espHab: '', espTxt: '', qtd: 1 };
const EVO = { on: false, pend: null };

const xpDisponivel = () => (Number(S.xpTotal) || 0) - (Number(S.xpGasto) || 0);
const xpMultDisc = nome => S.meta.cla === 'Caitiff' ? 6 : (discDoCla().includes(nome) ? 5 : 7);
const xpRotAtr = k => { for (const g of ATRIBUTOS) for (const i of g.itens) if (i[0] === k) return i[1]; return k; };
const xpData = iso => { try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };

/* ---------- o que um ponto da ficha representa ---------- */
function evoAlvo(path) {
  let m;
  if ((m = /^atr\.(\w+)$/.exec(path))) return { tipo: 'atr', k: m[1], rot: xpRotAtr(m[1]), min: 1, passo: n => n * 5 };
  if ((m = /^hab\.(\w+)$/.exec(path))) return { tipo: 'hab', k: m[1], rot: rotuloHab(m[1]), min: 0, passo: n => n * 3 };
  if ((m = /^disc\.(\d+)\.nivel$/.exec(path))) {
    const d = S.disc[Number(m[1])];
    if (!d) return null;
    const mult = xpMultDisc(d.nome);
    return { tipo: 'disc', k: d.nome, rot: d.nome, min: 1, passo: n => n * mult, mult };
  }
  return null;
}
const evoAtivo = () => EVO.on && EVO.id === S._id && !ehCacador() && typeof UI !== 'undefined' && UI.tela === 'ficha' && UI.modo === 'editar' && !NV.leitura;

/* custo de subir de `de` até `para`, nível a nível */
function evoCusto(a, de, para) {
  let t = 0;
  for (let n = de + 1; n <= para; n++) t += a.passo(n);
  return t;
}
/* as compras de XP que levaram o traço de `alvo` até `atual`, da mais nova à mais velha;
   null se algum desses níveis não veio de experiência */
function evoComprasAte(a, atual, alvo) {
  const lista = S.xpCompras || [], achadas = [];
  for (let n = atual; n > alvo; n--) {
    let j = -1;
    for (let i = lista.length - 1; i >= 0; i--) {
      const c = lista[i];
      if (c.tipo === a.tipo && c.k === a.k && Number(c.para) === n && !achadas.includes(i)) { j = i; break; }
    }
    if (j < 0) return null;
    achadas.push(j);
  }
  return achadas;
}

/* clique num ponto com o modo ligado. Devolve true se tratou. */
function evoClique(path, i) {
  if (!evoAtivo()) return false;
  const a = evoAlvo(path);
  if (!a) return false;
  const atual = Number(getPath(path)) || 0;
  if (i > atual) {
    EVO.pend = { modo: 'comprar', path, de: atual, para: i, custo: evoCusto(a, atual, i), rot: a.rot };
  } else {
    const alvo = Math.max(a.min, atual === i ? i - 1 : i);
    if (alvo >= atual) { EVO.pend = null; return true; }
    const idx = evoComprasAte(a, atual, alvo);
    if (!idx) {
      EVO.pend = { modo: 'criacao', path, de: atual, para: alvo, rot: a.rot };
    } else {
      const custo = idx.reduce((t, j) => t + (Number(S.xpCompras[j].custo) || 0), 0);
      EVO.pend = { modo: 'devolver', path, de: atual, para: alvo, custo, rot: a.rot, idx };
    }
  }
  render();
  const b = el('evo-ok'); if (b && !b.disabled) b.focus({ preventScroll: true });
  return true;
}

function evoConfirmar() {
  const p = EVO.pend;
  if (!p) return;
  const a = evoAlvo(p.path);
  if (!a) { EVO.pend = null; return render(); }
  if (p.modo === 'comprar') {
    if (p.custo > xpDisponivel()) return;
    const em = new Date().toISOString();
    const novas = [];
    for (let n = p.de + 1; n <= p.para; n++) {
      novas.push({ tipo: a.tipo, k: a.k, de: n - 1, para: n, custo: a.passo(n), rot: `${a.rot} ${n - 1} → ${n}${a.mult ? ` (× ${a.mult})` : ''}`, manual: true, em });
    }
    S.xpCompras = (S.xpCompras || []).concat(novas);
    S.xpGasto = (Number(S.xpGasto) || 0) + p.custo;
    setPath(p.path, p.para);
    EVO.pend = null;
    render();
    uiAviso(`${a.rot} ${p.de} → ${p.para}: ${p.custo} XP. Sobram ${xpDisponivel()}.`, { rotulo: 'Desfazer', fn: () => histDesfazer() });
    if (a.tipo === 'disc') setTimeout(() => uiAviso(`${a.rot} subiu: escolha o poder novo no quadro da Disciplina.`, { rotulo: 'Ver Disciplinas', fn: () => uiIrSecao('disciplinas') }), 50);
    return;
  }
  if (p.modo === 'devolver') {
    S.xpCompras = S.xpCompras.filter((c, j) => !p.idx.includes(j));
    S.xpGasto = Math.max(0, (Number(S.xpGasto) || 0) - p.custo);
    setPath(p.path, p.para);
    if (a.tipo === 'disc') {
      const d = S.disc.find(x => x.nome === a.k);
      if (d && (d.poderes || []).length > d.nivel) uiAviso(`${a.k} tem mais poderes que pontos agora: tire um no quadro da Disciplina.`);
    }
    EVO.pend = null;
    render();
    uiAviso(`Devolvido: ${a.rot} ${p.de} → ${p.para}, +${p.custo} XP.`, { rotulo: 'Desfazer', fn: () => histDesfazer() });
  }
}
function evoLigar(on) {
  EVO.on = on != null ? !!on : !(EVO.on && EVO.id === S._id);
  EVO.id = S._id;
  EVO.pend = null;
  if (EVO.on && typeof UI !== 'undefined' && UI.modo !== 'editar') uiTrocarModo('editar');
  if (EVO.on && typeof UI !== 'undefined' && !['atributos', 'habilidades', 'disciplinas'].includes(UI.secaoAtual)) uiIrSecao('atributos');
  render();
}

/* marcação dos pontos: chamada por dots() em app.js */
function evoDots(path, valor, max) {
  if (!evoAtivo()) return null;
  const a = evoAlvo(path);
  if (!a) return null;
  const p = EVO.pend && EVO.pend.path === path ? EVO.pend : null;
  const disp = xpDisponivel();
  const classe = i => {
    if (p && p.modo === 'comprar' && i > p.de && i <= p.para) return ' evo-pend';
    if (p && (p.modo === 'devolver' || p.modo === 'criacao') && i > p.para && i <= p.de) return ' evo-sai';
    if (i === valor + 1) return ' evo-prox';
    return '';
  };
  const prox = valor < max ? a.passo(valor + 1) : 0;
  const etiqueta = prox ? `<span class="evo-custo${prox > disp ? ' falta' : ''}" title="${esc(a.rot)} ${valor} → ${valor + 1}">${prox} XP</span>` : '<span class="evo-custo max">máx.</span>';
  return { classe, etiqueta };
}

/* a barra do modo, fixa no rodapé */
function evoBarra() {
  const b = el('evo-barra');
  if (!b) return;
  const ativo = evoAtivo();
  b.hidden = !ativo;
  document.body.classList.toggle('evo-on', ativo);
  const btn = el('btn-evoluir');
  if (btn) {
    btn.hidden = ehCacador() || !!NV.leitura;
    btn.setAttribute('aria-pressed', EVO.on ? 'true' : 'false');
    btn.innerHTML = `Evoluir <b>${xpDisponivel()} XP</b>`;
  }
  if (!ativo) { b.innerHTML = ''; return; }
  const disp = xpDisponivel(), p = EVO.pend;
  let meio, acoes;
  if (p && p.modo === 'comprar') {
    const falta = p.custo - disp;
    const a = evoAlvo(p.path), o = orcamento();
    const aberta = a && criacaoConferida() && (a.tipo === 'disc' ? o.disc.atual < o.disc.alvo : !o[a.tipo].ok);
    meio = `<b>${esc(p.rot)} ${p.de} → ${p.para}</b><span>${p.custo} XP${falta > 0 ? ` · <em>faltam ${falta}</em>` : ` · sobram ${disp - p.custo}`}</span>${aberta
      ? `<span class="evo-alerta">A criação de ${a.tipo === 'atr' ? 'Atributos' : a.tipo === 'hab' ? 'Habilidades' : 'Disciplinas'} ainda não fechou: este ponto vai contar como XP, não como criação. Para distribuir a criação, saia do Evoluir.</span>` : ''}`;
    acoes = `<button type="button" class="btn primary" id="evo-ok" data-evo="ok"${falta > 0 ? ' disabled' : ''}>Comprar</button><button type="button" class="btn ghost" data-evo="cancelar">Cancelar</button>`;
  } else if (p && p.modo === 'devolver') {
    meio = `<b>Devolver ${esc(p.rot)} ${p.de} → ${p.para}</b><span>+${p.custo} XP de volta</span>`;
    acoes = `<button type="button" class="btn primary" id="evo-ok" data-evo="ok">Devolver</button><button type="button" class="btn ghost" data-evo="cancelar">Cancelar</button>`;
  } else if (p && p.modo === 'criacao') {
    meio = `<b>${esc(p.rot)} ${p.de}</b><span>Esse ponto é da criação, não de experiência. Para corrigir a criação, saia do modo Evoluir.</span>`;
    acoes = `<button type="button" class="btn ghost" data-evo="cancelar">Entendi</button>`;
  } else {
    meio = `<b>Evoluir · ${disp} XP disponíveis</b><span>Clique no ponto que quer comprar em Atributos, Habilidades ou Disciplinas. O custo aparece ao lado de cada traço.</span>`;
    acoes = `<button type="button" class="btn" data-acao="xp">Outras compras e histórico</button><button type="button" class="btn primary" data-evo="sair">Concluir</button>`;
  }
  b.innerHTML = `<div class="evo-in" role="region" aria-label="Modo Evoluir" aria-live="polite"><div class="evo-txt">${meio}</div><div class="evo-acoes">${acoes}</div></div>`;
  document.body.style.setProperty('--evo-h', b.offsetHeight + 'px');
}

/* ---------- compras sem ponto na ficha ---------- */
const XP_CATEGORIAS = [
  ['esp',  'Especialização',      '3 XP cada. Uma Habilidade pode ter várias.'],
  ['disc', 'Disciplina',          'Novo nível × 5 XP se for do clã, × 7 se não for, × 6 para Caitiff. Disciplina nova fora do clã pede um professor e beber o sangue dele.'],
  ['rit',  'Ritual ou Cerimônia', 'Nível × 3 XP, nunca acima da sua Feitiçaria de Sangue ou do seu Oblívio.'],
  ['vant', 'Vantagem',            '3 XP por ponto. Vantagens novas entram no mínimo que pedem.'],
  ['bp',   'Potência de Sangue',  'Novo nível × 10 XP. Na maior parte das crônicas, sobe com a idade e com o Narrador.'],
  ['atr',  'Atributo',            'Novo nível × 5 XP. Mais rápido pelo modo Evoluir, direto na ficha.'],
  ['hab',  'Habilidade',          'Novo nível × 3 XP. Mais rápido pelo modo Evoluir, direto na ficha.']
];

/* o que dá para comprar em cada categoria, com o custo já calculado */
function xpOpcoes(cat) {
  const o = [];
  if (cat === 'atr') {
    ATRIBUTOS.forEach(g => g.itens.forEach(([k, pt]) => {
      const a = S.atr[k] || 1;
      if (a < 5) o.push({ id: k, grupo: g.cat, rot: `${pt} ${a} → ${a + 1}`, custo: (a + 1) * 5,
        compra: { tipo: 'atr', k, de: a, para: a + 1 }, aplicar: () => { S.atr[k] = a + 1; } });
    }));
  }
  if (cat === 'hab') {
    HABILIDADES.forEach(g => g.itens.forEach(([k, pt]) => {
      const a = S.hab[k] || 0;
      if (a < 5) o.push({ id: k, grupo: g.cat, rot: `${pt} ${a} → ${a + 1}`, custo: (a + 1) * 3,
        compra: { tipo: 'hab', k, de: a, para: a + 1 }, aplicar: () => { S.hab[k] = a + 1; } });
    }));
  }
  if (cat === 'disc') {
    S.disc.forEach(d => {
      if (d.nivel >= 5) return;
      const m = xpMultDisc(d.nome);
      o.push({ id: 'd:' + d.nome, grupo: 'Que você já tem', rot: `${d.nome} ${d.nivel} → ${d.nivel + 1}`, nota: `× ${m}`, custo: (d.nivel + 1) * m, disc: d.nome,
        compra: { tipo: 'disc', k: d.nome, de: d.nivel, para: d.nivel + 1 }, aplicar: () => { d.nivel++; } });
    });
    if (S.meta.cla !== 'Sangue-ralo') {
      const tidas = S.disc.map(d => d.nome);
      LISTA_DISCIPLINAS.filter(n => !tidas.includes(n) && n !== 'Alquimia de Sangue-ralo').forEach(nome => {
        const m = xpMultDisc(nome);
        o.push({ id: 'n:' + nome, grupo: m === 5 ? 'Nova, do clã' : (m === 6 ? 'Nova (Caitiff)' : 'Nova, fora do clã'),
          rot: `${nome} 0 → 1`, nota: m === 7 ? '× 7 · precisa de um professor e de beber o sangue dele' : `× ${m}`, custo: m, disc: nome, nova: true,
          compra: { tipo: 'disc', k: nome, de: 0, para: 1, nova: true },
          aplicar: () => { S.disc.push({ nome, nivel: 1, poderes: [], rituais: '' }); } });
      });
    }
  }
  if (cat === 'rit') {
    S.disc.forEach(d => {
      const r = ritosDe(d);
      if (!r) return;
      const tidos = new Set(r.tidos.map(t => t.replace(/\s*\(.*$/, '')));
      r.cat.lista.filter(x => x.lv <= d.nivel && !tidos.has(x.pt)).forEach(x => {
        const falta = x.ex && !(d.poderes || []).includes(x.ex);
        o.push({ id: d.nome + ':' + x.pt, grupo: `${r.cat.rotulo} (${d.nome})`, rot: `${x.pt}`, nota: `nível ${x.lv}${falta ? ' · exige ' + x.ex : ''}`,
          custo: x.lv * 3, bloqueio: falta ? `Exige o poder ${x.ex}.` : '',
          compra: { tipo: 'rit', k: x.pt, de: 0, para: x.lv, disc: d.nome },
          aplicar: () => { const rr = ritosDe(d); rr.tidos.push(`${x.pt} (${rr.cat.rotulo} ${x.lv})`); d.rituais = rr.tidos.join('\n'); } });
      });
    });
  }
  if (cat === 'vant') {
    S.vant.forEach(v => {
      if (!v.nome) return;
      const lim = (POR_NOME[v.nome] || { max: 5 }).max || 5;
      const p = Number(v.pontos) || 0;
      if (p < Math.min(lim, 5)) o.push({ id: 'v:' + v.nome, grupo: 'Que você já tem', rot: `${v.nome} ${p} → ${p + 1}`, custo: 3,
        compra: { tipo: 'vant', k: v.nome, de: p, para: p + 1 }, aplicar: () => { v.pontos = p + 1; } });
    });
    const tem = new Set(S.vant.map(v => v.nome));
    const cla = S.meta.cla;
    VANTAGENS.filter(v => !tem.has(v.pt) && v.cat !== 'Loresheet'
        && (!v.so || (v.so === 'ralo' && cla === 'Sangue-ralo') || (v.so === 'caitiff' && cla === 'Caitiff')))
      .forEach(v => {
        const min = Math.max(1, v.min || 1);
        const okReq = typeof requisitoOk !== 'function' || requisitoOk(v.req);
        o.push({ id: 'nv:' + v.pt, grupo: 'Nova: ' + (v.cat || 'Diversas'), rot: v.pt, nota: `${min}${v.max > min ? '–' + v.max : ''} ponto${v.max > 1 ? 's' : ''}${v.req ? ' · exige ' + v.req : ''}`,
          custo: min * 3, bloqueio: okReq ? '' : `Exige ${v.req}.`,
          compra: { tipo: 'vant', k: v.pt, de: 0, para: min },
          aplicar: () => { S.vant.push({ nome: v.pt, pontos: min, nota: '', fonte: 'user' }); } });
      });
  }
  if (cat === 'bp') {
    const a = potencia();
    if (a < 10) o.push({ id: 'bp', grupo: '', rot: `Potência de Sangue ${a} → ${a + 1}`, nota: 'na prática, só sobe com a idade e o Narrador', custo: (a + 1) * 10,
      compra: { tipo: 'bp', k: 'Potência de Sangue', de: a, para: a + 1 }, aplicar: () => { S.bpOverride = a + 1; } });
  }
  return o;
}

function xpTabela() {
  return `<table class="xp-tab">
    <caption class="sr">Custos de experiência</caption>
    <thead><tr><th scope="col">Traço</th><th scope="col">Custo em XP</th></tr></thead>
    <tbody>${CUSTOS_XP.map(([n, f]) => `<tr><th scope="row">${esc(n)}</th><td>${esc(f)}</td></tr>`).join('')}</tbody>
  </table>`;
}

/* ---------- livro de experiência ---------- */
/* ganhos e gastos numa linha só, do mais novo ao mais velho */
/* movimentos avulsos de S.xpLog: o que cada um faz com o total e o gasto */
const XP_MOV = {
  ganho:    { rot: 'Ganhar',              txt: 'Experiência da sessão',          total: +1, gasto: 0,  sinal: '+' },
  retirada: { rot: 'Tirar',               txt: 'XP retirado',                    total: -1, gasto: 0,  sinal: '−' },
  gasto:    { rot: 'Disponível → gasto',  txt: 'Gasto fora da ficha',            total: 0,  gasto: +1, sinal: '−' },
  volta:    { rot: 'Gasto → disponível',  txt: 'Gasto que voltou ao disponível', total: 0,  gasto: -1, sinal: '+' }
};
const tipoMov = g => XP_MOV[g && g.tipo] ? g.tipo : 'ganho';
/* XP gasto que não está preso a nenhuma compra registrada: só esse pode voltar */
const xpGastoSolto = () => Math.max(0, (Number(S.xpGasto) || 0) - (S.xpCompras || []).reduce((t, c) => t + (Number(c.custo) || 0), 0));

function xpLivro() {
  const movs = (S.xpLog || []).map((g, i) => {
    const tp = tipoMov(g), m = XP_MOV[tp], n = Number(g.xp) || 0;
    return { t: 'g', tp, em: g.em, n, sinal: m.sinal, txt: g.nota || m.txt, i };
  });
  const gastos = (S.xpCompras || []).map((c, i) => ({ t: 'c', em: c.em || '', n: Number(c.custo) || 0, sinal: '−', txt: c.rot, i, c }));
  const tudo = movs.concat(gastos).sort((a, b) => (b.em || '').localeCompare(a.em || '') || (a.t === b.t ? b.i - a.i : (a.t === 'c' ? -1 : 1)));
  const noLivro = movs.reduce((t, g) => t + XP_MOV[g.tp].total * g.n, 0);
  const anterior = (Number(S.xpTotal) || 0) - noLivro;
  return { tudo, anterior };
}

/* ganhar, tirar, passar para gasto, voltar para disponível */
function xpMover(tipo, n, nota) {
  const m = XP_MOV[tipo];
  n = Math.round(Number(n) || 0);
  if (!m || n <= 0) return uiAviso('Escolha uma quantidade de XP maior que zero.');
  const disp = xpDisponivel();
  if ((tipo === 'retirada' || tipo === 'gasto') && n > disp)
    return uiAviso(disp > 0 ? `Só há ${disp} XP disponíve${disp > 1 ? 'is' : 'l'}.` : 'Não há XP disponível.');
  if (tipo === 'volta') {
    const solto = xpGastoSolto();
    if (n > solto) return uiAviso(solto > 0
      ? `Só ${solto} XP do gasto estão soltos. O resto está preso a compras: devolva pelo livro de experiência.`
      : 'Todo o XP gasto está preso a compras. Para recuperar, devolva a compra no livro de experiência.');
  }
  S.xpLog = (S.xpLog || []).concat([{ em: new Date().toISOString(), xp: n, nota: nota || '', tipo }]);
  S.xpTotal = Math.max(0, (Number(S.xpTotal) || 0) + m.total * n);
  S.xpGasto = Math.max(0, (Number(S.xpGasto) || 0) + m.gasto * n);
  render(); xpRedesenhar();
  const verbo = { ganho: `+${n} XP`, retirada: `−${n} XP`, gasto: `${n} XP passaram para gasto`, volta: `${n} XP voltaram ao disponível` }[tipo];
  uiAviso(`${verbo}${nota ? ' (' + nota + ')' : ''}. Disponível agora: ${xpDisponivel()}.`, { rotulo: 'Desfazer', fn: () => { histDesfazer(); xpRedesenhar(); } });
}
function xpApagarMov(i) {
  const g = (S.xpLog || [])[i];
  if (!g) return;
  const m = XP_MOV[tipoMov(g)], n = Number(g.xp) || 0;
  S.xpLog = S.xpLog.filter((x, j) => j !== i);
  S.xpTotal = Math.max(0, (Number(S.xpTotal) || 0) - m.total * n);
  S.xpGasto = Math.max(0, (Number(S.xpGasto) || 0) - m.gasto * n);
  render(); xpRedesenhar();
  uiAviso(`Registro apagado: ${g.nota || m.txt}.`, { rotulo: 'Desfazer', fn: () => { histDesfazer(); xpRedesenhar(); } });
}

/* o controle de quantidade: em Na mesa, no quadro de Notas e no diálogo */
function xpMovHtml(variante) {
  const disp = xpDisponivel(), solto = xpGastoSolto();
  const b = (tipo, txt, off, dica) => `<button type="button" aria-label="${esc(XP_MOV[tipo].rot)}" class="btn sm${tipo === 'ganho' ? ' primary' : ''}" data-xp="mov" data-m="${tipo}"${off ? ` disabled title="${esc(dica)}"` : ` title="${esc(dica)}"`}>${txt}</button>`;
  return `<div class="xp-mov xp-mov-${variante}" role="group" aria-label="Mexer no XP">
    <div class="xp-mov-q">
      <span class="xp-qtd"><button type="button" data-xp="qtd" data-d="-1" aria-label="Menos XP">−</button><input class="xp-qtd-in" type="number" min="1" max="999" inputmode="numeric" value="${XP.qtd}" aria-label="Quantidade de XP"><button type="button" data-xp="qtd" data-d="1" aria-label="Mais XP">+</button></span>
      ${variante === 'mesa' ? '<span class="xp-mov-u">XP</span>' : `<input class="f xp-nota-in" type="text" maxlength="80" placeholder="Nota (opcional): sessão 4, o resgate no porto" aria-label="Nota do registro">`}
    </div>
    <div class="xp-mov-b">
      ${b('ganho', '+ Ganhar', false, 'Soma ao XP ganho')}
      ${b('retirada', '− Tirar', disp <= 0, disp > 0 ? 'Tira do XP ganho (só do disponível)' : 'Não há XP disponível')}
      ${b('gasto', variante === 'mesa' ? '→ Gasto' : 'Disponível → gasto', disp <= 0, disp > 0 ? 'Marca como gasto sem escolher o que comprou' : 'Não há XP disponível')}
      ${b('volta', variante === 'mesa' ? '← Disponível' : 'Gasto → disponível', solto <= 0, solto > 0 ? `Até ${solto} XP de gasto avulso podem voltar` : 'Todo o gasto está preso a compras: devolva pelo livro')}
    </div>
  </div>`;
}
/* uma compra pode ser devolvida se o traço ainda está no nível que ela deu
   e se nenhuma compra posterior depende dela */
function xpPodeDevolver(i) {
  const c = (S.xpCompras || [])[i];
  if (!c) return '';
  const depois = S.xpCompras.slice(i + 1);
  const mesmo = x => x.tipo === c.tipo && x.k === c.k;
  if (['atr', 'hab', 'disc', 'vant', 'bp'].includes(c.tipo) && depois.some(mesmo)) return 'Devolva antes a compra mais nova deste traço.';
  if (c.tipo === 'atr' && (S.atr[c.k] || 1) !== c.para) return 'O Atributo não está mais nesse nível.';
  if (c.tipo === 'hab' && (S.hab[c.k] || 0) !== c.para) return 'A Habilidade não está mais nesse nível.';
  if (c.tipo === 'disc') { const d = S.disc.find(x => x.nome === c.k); if (!d || d.nivel !== c.para) return 'A Disciplina não está mais nesse nível.'; }
  if (c.tipo === 'vant') { const v = S.vant.find(x => x.nome === c.k); if (!v || (Number(v.pontos) || 0) !== c.para) return 'A Vantagem não está mais nesse nível.'; }
  if (c.tipo === 'bp' && potencia() !== c.para) return 'A Potência de Sangue mudou.';
  if (c.tipo === 'esp') { const txt = String(c.rot).replace(/^.*?:\s*/, ''); if (!listaEsp(c.k).includes(txt)) return 'A especialização não está mais na ficha.'; }
  if (c.tipo === 'rit' && !S.disc.some(d => (d.rituais || '').split('\n').some(l => l.trim().replace(/\s*\(.*$/, '') === c.k))) return 'O ritual não está mais na ficha.';
  return 'ok';
}
function xpDevolver(i) {
  const c = (S.xpCompras || [])[i];
  if (!c || xpPodeDevolver(i) !== 'ok') return;
  if (c.tipo === 'atr') S.atr[c.k] = c.de;
  if (c.tipo === 'hab') S.hab[c.k] = c.de;
  if (c.tipo === 'disc') {
    const j = S.disc.findIndex(x => x.nome === c.k);
    if (c.de === 0) S.disc.splice(j, 1); else S.disc[j].nivel = c.de;
  }
  if (c.tipo === 'vant') {
    const j = S.vant.findIndex(x => x.nome === c.k);
    if (c.de === 0) S.vant.splice(j, 1); else S.vant[j].pontos = c.de;
  }
  if (c.tipo === 'bp') S.bpOverride = c.de;
  if (c.tipo === 'esp') { const txt = String(c.rot).replace(/^.*?:\s*/, ''); S.esp[c.k] = listaEsp(c.k).filter(x => x !== txt).join(', '); }
  if (c.tipo === 'rit') S.disc.forEach(d => { d.rituais = (d.rituais || '').split('\n').filter(l => l.trim().replace(/\s*\(.*$/, '') !== c.k).join('\n'); });
  S.xpCompras = S.xpCompras.filter((x, j) => j !== i);
  S.xpGasto = Math.max(0, (Number(S.xpGasto) || 0) - (Number(c.custo) || 0));
  render(); xpRedesenhar();
  uiAviso(`Devolvido: ${c.rot}, +${c.custo} XP.`, { rotulo: 'Desfazer', fn: () => { histDesfazer(); xpRedesenhar(); } });
}

/* ---------- o diálogo ---------- */
function xpHtml() {
  const disp = xpDisponivel();
  const saldo = `<div class="xp-saldo">
      <div class="disp"><span class="olho">Disponível</span><b>${disp}</b></div>
      <div><span class="olho">Ganho</span><b>${Number(S.xpTotal) || 0}</b></div>
      <div><span class="olho">Gasto</span><b>${Number(S.xpGasto) || 0}</b></div>
    </div>
    ${xpMovHtml('cheio')}`;
  if (ehCacador()) {
    return saldo + xpHistoricoHtml() + `<p class="note" style="margin:14px 0 0">A compra passo a passo usa a tabela de Vampiro. Em Caçador, suba os traços em <strong>Editar</strong> e ajuste o XP gasto em <em>Notas &amp; experiência</em>.</p>`;
  }
  return saldo + `
    <div class="xp-evo-cta">
      <div><b>Atributos, Habilidades e Disciplinas</b><span>Compre direto na ficha: ligue o modo Evoluir e clique no ponto que quer.</span></div>
      <button type="button" class="btn primary" data-evo="entrar">Evoluir na ficha</button>
    </div>
    ${xpComprarHtml(disp)}
    ${xpHistoricoHtml()}
    <details class="xp-ref"><summary class="olho">Tabela de custos</summary>${xpTabela()}
      <p class="note" style="margin:6px 0 0">"Novo nível" é o nível que o traço vai ter: subir Força de 2 para 3 custa 3 × 5 = 15. Disciplina fora do clã também pede um professor e beber o sangue dele.</p></details>`;
}

function xpComprarHtml(disp) {
  if (!XP_CATEGORIAS.some(([k]) => k === XP.cat)) XP.cat = 'esp';
  const chips = `<div class="xp-chips" role="tablist" aria-label="O que comprar">${XP_CATEGORIAS.map(([k, t]) =>
    `<button type="button" role="tab" class="xp-chip" data-xp-cat="${k}" aria-selected="${XP.cat === k}">${t}</button>`).join('')}</div>`;
  const regra = (XP_CATEGORIAS.find(([k]) => k === XP.cat) || [])[2] || '';
  let corpo;
  if (XP.cat === 'esp') {
    const comPontos = HABILIDADES.flatMap(g => g.itens.filter(([k]) => (S.hab[k] || 0) > 0).map(([k, pt]) => [k, pt]));
    if (!comPontos.some(([k]) => k === XP.espHab)) XP.espHab = (comPontos[0] || [])[0] || '';
    const pode = comPontos.length && disp >= 3;
    corpo = comPontos.length ? `<div class="fields c2 xp-esp">
        <div><label class="lbl" for="xp-esp-hab">Habilidade</label>
          <select class="f" id="xp-esp-hab">${comPontos.map(([k, pt]) => `<option value="${k}"${k === XP.espHab ? ' selected' : ''}>${esc(pt)}${listaEsp(k).length ? ' — já tem: ' + esc(listaEsp(k).join(', ')) : ''}</option>`).join('')}</select></div>
        <div><label class="lbl" for="xp-esp-txt">Especialização</label>
          <input class="f" id="xp-esp-txt" list="xp-esp-sug" autocomplete="off" placeholder="Escreva ou escolha" value="${esc(XP.espTxt || '')}">
          <datalist id="xp-esp-sug">${sugestoesEsp(XP.espHab).map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
      </div>
      <div class="xp-fim"><p class="xp-msg${disp < 3 ? ' ruim' : ''}" role="status">${disp < 3 ? `Custa 3 XP — faltam ${3 - disp}.` : 'Custa 3 XP.'}</p>
        <button type="button" class="btn primary" data-xp="esp"${pode ? '' : ' disabled'}>Comprar por 3 XP</button></div>`
      : '<p class="note" style="margin:0">Ponha pontos numa Habilidade antes de especializar.</p>';
  } else {
    const ops = xpOpcoes(XP.cat);
    if (!ops.length) {
      corpo = `<p class="note" style="margin:0">${XP.cat === 'rit' ? 'Nenhum Ritual ou Cerimônia disponível: é preciso ter Feitiçaria de Sangue ou Oblívio, e o nível do rito não passa o da Disciplina.' : 'Nada para subir aqui: tudo já está no máximo.'}</p>`;
    } else {
      const grupos = [];
      ops.forEach(x => { let g = grupos.find(y => y.nome === x.grupo); if (!g) grupos.push(g = { nome: x.grupo, itens: [] }); g.itens.push(x); });
      corpo = `<div class="xp-lista">${grupos.map(g => `${g.nome ? `<h4 class="xp-g">${esc(g.nome)}</h4>` : ''}<ul>${g.itens.map(x => {
        const falta = x.custo - disp;
        const motivo = x.bloqueio || (falta > 0 ? `faltam ${falta} XP` : '');
        return `<li${motivo ? ' class="nao"' : ''}><span class="xp-it"><b>${esc(x.rot)}</b>${x.nota ? `<small>${esc(x.nota)}</small>` : ''}${motivo ? `<small class="ruim">${esc(motivo)}</small>` : ''}</span>
          <button type="button" class="btn sm${motivo ? '' : ' primary'}" data-xp="comprar" data-id="${esc(x.id)}"${motivo ? ' disabled' : ''} aria-label="Comprar ${esc(x.rot)} por ${x.custo} XP">${x.custo} XP</button></li>`;
      }).join('')}</ul>`).join('')}</div>`;
    }
  }
  return `<section class="xp-comprar" aria-label="Outras compras">
    <h3 class="nv-h3">Comprar</h3>
    ${chips}
    <p class="note xp-regra">${esc(regra)}</p>
    ${corpo}
  </section>`;
}

function xpHistoricoHtml() {
  const { tudo, anterior } = xpLivro();
  if (!tudo.length && !anterior) return '';
  return `<section class="xp-livro" aria-label="Livro de experiência">
    <h3 class="nv-h3">Livro de experiência</h3>
    <ol>${tudo.slice(0, 40).map(x => {
      if (x.t === 'g') return `<li class="g ${x.tp}"><span class="xp-d">${x.em ? esc(xpData(x.em)) : ''}</span><span class="xp-t">${esc(x.txt)}${x.tp === 'gasto' || x.tp === 'volta' ? ` <small>(${esc(XP_MOV[x.tp].rot)})</small>` : ''}</span><b>${x.sinal}${x.n}</b>
        <button type="button" class="x" data-xp="rm-mov" data-i="${x.i}" aria-label="Apagar este registro e desfazer o efeito">✕</button></li>`;
      const pode = xpPodeDevolver(x.i);
      return `<li class="c"><span class="xp-d">${x.em ? esc(xpData(x.em)) : 'criação'}</span><span class="xp-t">${esc(x.txt)}</span><b>−${x.n}</b>
        ${x.em ? `<button type="button" class="btn sm ghost" data-xp="devolver" data-i="${x.i}"${pode === 'ok' ? '' : ` disabled title="${esc(pode)}"`}>Devolver</button>` : '<span></span>'}</li>`;
    }).join('')}
    ${anterior > 0 ? `<li class="g anterior"><span class="xp-d">—</span><span class="xp-t">Antes do livro (ganho anotado à mão)</span><b>+${anterior}</b><span></span></li>` : ''}</ol>
    <p class="note" style="margin:6px 0 0">O ✕ apaga o registro e desfaz o efeito dele no saldo.</p>
  </section>`;
}

function xpRedesenhar(focoId) {
  const b = el('dlg-xp-b');
  if (!b || !el('dlg-xp').open) return;
  const ativo = focoId || (document.activeElement && b.contains(document.activeElement) ? document.activeElement.id : '');
  const rolagem = b.scrollTop;
  b.innerHTML = xpHtml();
  b.scrollTop = rolagem;
  const f = ativo && el(ativo);
  if (f) f.focus();
}
function xpAbrir() {
  if (NV.leitura) return;
  XP.espTxt = '';
  el('dlg-xp-t').textContent = 'Experiência · ' + (S.meta.nome || 'Sem nome');
  el('dlg-xp-b').innerHTML = xpHtml();
  uiAbrirDialogo('dlg-xp');
}

function xpComprar(id) {
  const disp = xpDisponivel();
  let op;
  if (XP.cat === 'esp') {
    const k = XP.espHab, txt = String((el('xp-esp-txt') || {}).value || '').trim().replace(/[,;]+/g, ' ');
    if (!k) return;
    if (!txt) { const c = el('xp-esp-txt'); if (c) c.focus(); const m = el('dlg-xp-b').querySelector('.xp-msg'); if (m) { m.textContent = 'Escreva a especialização.'; m.classList.add('ruim'); } return; }
    op = { rot: `especialização em ${rotuloHab(k)}: ${txt}`, custo: 3, compra: { tipo: 'esp', k, de: listaEsp(k).length, para: listaEsp(k).length + 1 },
           aplicar: () => { S.esp[k] = listaEsp(k).concat([txt]).join(', '); } };
  } else {
    op = xpOpcoes(XP.cat).find(x => x.id === id);
  }
  if (!op || op.bloqueio || op.custo > disp) return;
  op.aplicar();
  S.xpCompras = (S.xpCompras || []).concat([Object.assign({}, op.compra, { custo: op.custo, rot: op.rot, manual: true, em: new Date().toISOString() })]);
  S.xpGasto = (Number(S.xpGasto) || 0) + op.custo;
  XP.espTxt = '';
  render();
  xpRedesenhar();
  uiAviso(`Comprado: ${op.rot} por ${op.custo} XP.`, { rotulo: 'Desfazer', fn: () => { histDesfazer(); xpRedesenhar(); } });
  if (op.compra.tipo === 'disc') setTimeout(() => uiAviso(`Escolha o poder novo de ${op.compra.k} no quadro da Disciplina.`, { rotulo: 'Escolher agora', fn: () => {
    uiFecharDialogos(); uiTrocarModo('editar'); uiIrSecao('disciplinas');
  } }), 50);
}

function xpQtd(n) {
  XP.qtd = Math.max(1, Math.min(999, Math.round(Number(n) || 1)));
  document.querySelectorAll('.xp-qtd-in').forEach(c => { if (c !== document.activeElement) c.value = XP.qtd; });
}

/* ---------- eventos ---------- */
document.addEventListener('change', ev => {
  const t = ev.target;
  if (!t || !t.closest || !t.closest('#dlg-xp')) return;
  if (t.id === 'xp-esp-hab') { XP.espHab = t.value; XP.espTxt = (el('xp-esp-txt') || {}).value || ''; return xpRedesenhar('xp-esp-hab'); }
});
document.addEventListener('click', ev => {
  const e = ev.target.closest && ev.target.closest('[data-evo]');
  if (e) {
    ev.preventDefault();
    const a = e.dataset.evo;
    if (a === 'ok') return evoConfirmar();
    if (a === 'cancelar') { EVO.pend = null; return render(); }
    if (a === 'sair') return evoLigar(false);
    if (a === 'entrar') { if (el('dlg-xp').open) uiFecharDialogos(); return evoLigar(true); }
    return;
  }
  const c = ev.target.closest && ev.target.closest('[data-xp-cat]');
  if (c) { XP.cat = c.dataset.xpCat; return xpRedesenhar(); }
  const t = ev.target.closest && ev.target.closest('[data-xp]');
  if (!t) return;
  ev.preventDefault();
  const a = t.dataset.xp;
  if (a === 'comprar') return xpComprar(t.dataset.id);
  if (a === 'esp') return xpComprar();
  if (a === 'devolver') return xpDevolver(Number(t.dataset.i));
  if (a === 'rm-mov') return xpApagarMov(Number(t.dataset.i));
  if (a === 'qtd') return xpQtd(XP.qtd + Number(t.dataset.d));
  if (a === 'mov') {
    const box = t.closest('.xp-mov');
    const q = box && box.querySelector('.xp-qtd-in');
    if (q) xpQtd(q.value);
    const nota = String(((box && box.querySelector('.xp-nota-in')) || {}).value || '').trim();
    return xpMover(t.dataset.m, XP.qtd, nota);
  }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t && t.classList && t.classList.contains('xp-qtd-in')) { const n = Math.round(Number(t.value)); if (n >= 1) XP.qtd = Math.min(999, n); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && EVO.pend && evoAtivo() && !document.querySelector('dialog[open]')) { EVO.pend = null; render(); return; }
  if (ev.key !== 'Enter' || !ev.target) return;
  if (ev.target.classList && (ev.target.classList.contains('xp-qtd-in') || ev.target.classList.contains('xp-nota-in'))) {
    ev.preventDefault();
    const g = ev.target.closest('.xp-mov'); const b = g && g.querySelector('[data-m="ganho"]');
    if (b) b.click();
  }
  if (ev.target.id === 'xp-esp-txt') { ev.preventDefault(); xpComprar(); }
});

{ const b = document.getElementById('btn-evoluir'); if (b) b.addEventListener('click', () => evoLigar()); }
