/* ============================================================
   Ficha de Sangue — gastar experiência

   A tabela de custos do livro e uma compra guiada: escolher o que subir,
   ver o custo, comprar. Cada compra entra em S.xpCompras — o mesmo registro
   que o sorteio usa para o Mar do Tempo —, então a "Base de criação" continua
   descontando o que veio da experiência e não acusa erro de distribuição.

   Custos (Livro Básico / Guia Suplementar):
     Atributo: novo nível × 5 · Habilidade: novo nível × 3 · Especialização: 3
     Disciplina: novo nível × 5 (clã), × 7 (outra), × 6 (Caitiff)
     Ritual de Feitiçaria / Cerimônia: nível × 3 · Fórmula de Sangue-ralo: nível × 3
     Vantagem: 3 por ponto · Potência de Sangue: novo nível × 10

   Carregado depois de app.js e antes de interface.js.
   ============================================================ */

const XP = { cat: 'atr', item: '', pilha: [] };

const xpDisponivel = () => (Number(S.xpTotal) || 0) - (Number(S.xpGasto) || 0);
const xpMultDisc = nome => S.meta.cla === 'Caitiff' ? 6 : (discDoCla().includes(nome) ? 5 : 7);
const xpRotAtr = k => { for (const g of ATRIBUTOS) for (const i of g.itens) if (i[0] === k) return i[1]; return k; };

const XP_CATEGORIAS = [
  ['atr',  'Atributo',           'novo nível × 5'],
  ['hab',  'Habilidade',         'novo nível × 3'],
  ['esp',  'Especialização',     '3'],
  ['disc', 'Disciplina',         'novo nível × 5 do clã, × 7 outra, × 6 Caitiff'],
  ['rit',  'Ritual ou Cerimônia', 'nível × 3'],
  ['vant', 'Vantagem',           '3 por ponto'],
  ['bp',   'Potência de Sangue', 'novo nível × 10']
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
      o.push({ id: 'd:' + d.nome, grupo: 'Que você já tem', rot: `${d.nome} ${d.nivel} → ${d.nivel + 1} (× ${m})`, custo: (d.nivel + 1) * m, disc: d.nome,
        compra: { tipo: 'disc', k: d.nome, de: d.nivel, para: d.nivel + 1 }, aplicar: () => { d.nivel++; } });
    });
    if (S.meta.cla !== 'Sangue-ralo') {
      const tidas = S.disc.map(d => d.nome);
      LISTA_DISCIPLINAS.filter(n => !tidas.includes(n) && n !== 'Alquimia de Sangue-ralo').forEach(nome => {
        const m = xpMultDisc(nome);
        o.push({ id: 'n:' + nome, grupo: m === 5 ? 'Nova, do clã' : (m === 6 ? 'Nova (Caitiff)' : 'Nova, fora do clã'),
          rot: `${nome} 0 → 1 (× ${m})`, custo: m, disc: nome, nova: true,
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
        o.push({ id: d.nome + ':' + x.pt, grupo: `${r.cat.rotulo} (${d.nome})`, rot: `${x.pt} — nível ${x.lv}${falta ? ' · exige ' + x.ex : ''}`,
          custo: x.lv * 3, bloqueio: falta ? `Exige o poder ${x.ex}.` : '',
          compra: { tipo: 'rit', k: x.pt, de: 0, para: x.lv },
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
        o.push({ id: 'nv:' + v.pt, grupo: 'Nova: ' + (v.cat || 'Diversas'), rot: `${v.pt} (${min}${v.max > min ? '–' + v.max : ''})${v.req ? ' · exige ' + v.req : ''}`,
          custo: min * 3, bloqueio: okReq ? '' : `Exige ${v.req}.`,
          compra: { tipo: 'vant', k: v.pt, de: 0, para: min },
          aplicar: () => { S.vant.push({ nome: v.pt, pontos: min, nota: '', fonte: 'user' }); } });
      });
  }
  if (cat === 'bp') {
    const a = potencia();
    if (a < 10) o.push({ id: 'bp', grupo: '', rot: `Potência de Sangue ${a} → ${a + 1}`, custo: (a + 1) * 10,
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

/* corpo do diálogo, refeito a cada mudança */
function xpHtml() {
  const disp = xpDisponivel();
  const saldo = `<div class="xp-saldo">
      <div><span class="olho">Total</span><b>${Number(S.xpTotal) || 0}</b></div>
      <div><span class="olho">Gasto</span><b>${Number(S.xpGasto) || 0}</b></div>
      <div class="disp"><span class="olho">Disponível</span><b>${disp}</b></div>
    </div>
    <form class="xp-ganhar" onsubmit="return false">
      <label class="lbl" for="xp-ganho">Ganhou experiência na sessão?</label>
      <div class="linha"><input class="f" id="xp-ganho" type="number" min="1" max="999" inputmode="numeric" placeholder="Ex.: 3">
        <button type="button" class="btn" data-xp="ganhar">Somar ao total</button></div>
    </form>`;
  if (ehCacador()) {
    return saldo + `<p class="note" style="margin:14px 0 0">A compra passo a passo usa a tabela de Vampiro. Em Caçador, suba os traços em <strong>Editar</strong> e anote o XP gasto em <em>Notas &amp; experiência</em>.</p>`;
  }
  if (!XP_CATEGORIAS.some(([k]) => k === XP.cat)) XP.cat = 'atr';
  const ops = XP.cat === 'esp' ? [] : xpOpcoes(XP.cat);
  if (!ops.some(x => x.id === XP.item)) XP.item = (ops.find(x => x.custo <= disp && !x.bloqueio) || ops[0] || {}).id || '';
  const op = ops.find(x => x.id === XP.item);
  const grupos = [];
  ops.forEach(x => { let g = grupos.find(y => y.nome === x.grupo); if (!g) grupos.push(g = { nome: x.grupo, itens: [] }); g.itens.push(x); });

  let escolha, custo = 0, bloqueio = '';
  if (XP.cat === 'esp') {
    const comPontos = HABILIDADES.flatMap(g => g.itens.filter(([k]) => (S.hab[k] || 0) > 0).map(([k, pt]) => [k, pt, g.cat]));
    if (!comPontos.some(([k]) => k === XP.espHab)) XP.espHab = (comPontos[0] || [])[0] || '';
    custo = 3;
    if (!comPontos.length) bloqueio = 'Ponha pontos numa Habilidade antes de especializar.';
    escolha = comPontos.length ? `
      <div><label class="lbl" for="xp-esp-hab">Habilidade</label>
        <select class="f" id="xp-esp-hab">${comPontos.map(([k, pt]) => `<option value="${k}"${k === XP.espHab ? ' selected' : ''}>${esc(pt)}${listaEsp(k).length ? ' — já tem: ' + esc(listaEsp(k).join(', ')) : ''}</option>`).join('')}</select></div>
      <div><label class="lbl" for="xp-esp-txt">Especialização</label>
        <input class="f" id="xp-esp-txt" list="xp-esp-sug" autocomplete="off" placeholder="Escreva ou escolha uma sugestão" value="${esc(XP.espTxt || '')}">
        <datalist id="xp-esp-sug">${sugestoesEsp(XP.espHab).map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>` : '';
  } else if (!ops.length) {
    escolha = `<p class="note" style="margin:0">${XP.cat === 'rit' ? 'Nenhum Ritual ou Cerimônia disponível: é preciso ter Feitiçaria de Sangue ou Oblívio, e o nível do rito não passa o da Disciplina.' : 'Nada para subir aqui — tudo já está no máximo.'}</p>`;
  } else {
    custo = op ? op.custo : 0;
    bloqueio = op && op.bloqueio || '';
    escolha = `<div><label class="lbl" for="xp-item">Qual</label>
      <select class="f" id="xp-item">${grupos.map(g => {
        const opts = g.itens.map(x => `<option value="${esc(x.id)}"${x.id === XP.item ? ' selected' : ''}>${esc(x.rot)} — ${x.custo} XP${x.custo > disp ? ' (falta XP)' : ''}</option>`).join('');
        return g.nome ? `<optgroup label="${esc(g.nome)}">${opts}</optgroup>` : opts;
      }).join('')}</select></div>`;
  }
  const falta = custo - disp;
  const pode = custo > 0 && falta <= 0 && !bloqueio && (XP.cat !== 'esp' || XP.espHab);
  const msg = bloqueio ? bloqueio : (custo ? (falta > 0 ? `Custa ${custo} XP — faltam ${falta}.` : `Custa ${custo} XP. Depois sobram ${disp - custo}.`) : '');

  const compras = (S.xpCompras || []).slice().reverse();
  return saldo + `
    <fieldset class="xp-comprar"><legend class="olho">Comprar</legend>
      <div class="xp-cats" role="radiogroup" aria-label="O que subir">
        ${XP_CATEGORIAS.map(([k, t, f]) => `<label class="xp-cat"><input type="radio" name="xp-cat" value="${k}"${XP.cat === k ? ' checked' : ''}><span><b>${t}</b><small>${esc(f)}</small></span></label>`).join('')}
      </div>
      <div class="fields xp-escolha">${escolha}</div>
      <div class="xp-fim">
        <p class="xp-msg${falta > 0 || bloqueio ? ' ruim' : ''}" role="status">${esc(msg)}</p>
        <button type="button" class="btn primary" data-xp="comprar"${pode ? '' : ' disabled'}>Comprar${custo ? ' por ' + custo + ' XP' : ''}</button>
      </div>
    </fieldset>
    ${compras.length ? `<h3 class="nv-h3">Compras com experiência</h3>
      <ul class="xp-hist">${compras.slice(0, 12).map(c => `<li><span>${esc(c.rot)}</span><small>${c.em ? esc(new Date(c.em).toLocaleDateString('pt-BR')) : 'na criação (Mar do Tempo)'}</small><b>${c.custo} XP</b></li>`).join('')}</ul>
      ${XP.pilha.length && XP.pilha[XP.pilha.length - 1].id === S._id ? `<button type="button" class="btn sm ghost" data-xp="desfazer">Desfazer a última compra</button>` : ''}` : ''}
    <details class="xp-ref" open><summary class="olho">Tabela de custos</summary>${xpTabela()}
      <p class="note" style="margin:6px 0 0">"Novo nível" é o nível que o traço vai ter: subir Força de 2 para 3 custa 3 × 5 = 15. Livro Básico e Guia Suplementar.</p></details>`;
}

function xpRedesenhar(focoId) {
  const b = el('dlg-xp-b');
  if (!b) return;
  const ativo = focoId || (document.activeElement && b.contains(document.activeElement) ? document.activeElement.id : '');
  b.innerHTML = xpHtml();
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

function xpComprar() {
  const disp = xpDisponivel();
  let op;
  if (XP.cat === 'esp') {
    const k = XP.espHab, txt = String((el('xp-esp-txt') || {}).value || '').trim().replace(/[,;]+/g, ' ');
    if (!k) return;
    if (!txt) { const c = el('xp-esp-txt'); if (c) c.focus(); el('dlg-xp-b').querySelector('.xp-msg').textContent = 'Escreva a especialização.'; return; }
    op = { rot: `especialização em ${rotuloHab(k)}: ${txt}`, custo: 3, compra: { tipo: 'esp', k, de: listaEsp(k).length, para: listaEsp(k).length + 1 },
           aplicar: () => { S.esp[k] = listaEsp(k).concat([txt]).join(', '); } };
  } else {
    op = xpOpcoes(XP.cat).find(x => x.id === XP.item);
  }
  if (!op || op.bloqueio || op.custo > disp) return;
  const tok = Date.now() + ':' + Math.random();
  XP.pilha.push({ id: S._id, json: JSON.stringify(S), rot: op.rot, tok });
  if (XP.pilha.length > 20) XP.pilha.shift();
  op.aplicar();
  S.xpCompras = (S.xpCompras || []).concat([Object.assign({}, op.compra, { custo: op.custo, rot: op.rot, manual: true, em: new Date().toISOString() })]);
  S.xpGasto = (Number(S.xpGasto) || 0) + op.custo;
  XP.espTxt = '';
  render();
  xpRedesenhar();
  uiAviso(`Comprado: ${op.rot} por ${op.custo} XP.`, { rotulo: 'Desfazer', fn: () => xpDesfazer(tok) });
  if (op.compra.tipo === 'disc') uiAviso(`Escolha o poder novo de ${op.compra.k} em Editar → Disciplinas.`, { rotulo: 'Escolher agora', fn: () => {
    uiFecharDialogos(); uiTrocarModo('editar');
    uiIrSecao('disciplinas');
  } });
}
function xpDesfazer(tok) {
  const u = XP.pilha[XP.pilha.length - 1];
  if (!u || u.id !== S._id) return uiAviso('Não há compra para desfazer nesta ficha.');
  if (tok && u.tok !== tok) return uiAviso('Só dá para desfazer a compra mais recente — use "Desfazer a última compra" em Gastar experiência.');
  XP.pilha.pop();
  S = adotar(JSON.parse(u.json));
  S._id = u.id;
  render();
  if (el('dlg-xp').open) xpRedesenhar();
  uiAviso('Compra desfeita: ' + u.rot + '.');
}

document.addEventListener('change', ev => {
  const t = ev.target;
  if (!t || !t.closest || !t.closest('#dlg-xp')) return;
  if (t.name === 'xp-cat') { XP.cat = t.value; XP.item = ''; return xpRedesenhar(); }
  if (t.id === 'xp-item') { XP.item = t.value; return xpRedesenhar('xp-item'); }
  if (t.id === 'xp-esp-hab') { XP.espHab = t.value; XP.espTxt = (el('xp-esp-txt') || {}).value || ''; return xpRedesenhar('xp-esp-hab'); }
});
document.addEventListener('click', ev => {
  const t = ev.target.closest && ev.target.closest('[data-xp]');
  if (!t) return;
  ev.preventDefault();
  const a = t.dataset.xp;
  if (a === 'comprar') return xpComprar();
  if (a === 'desfazer') return xpDesfazer();
  if (a === 'ganhar') {
    const n = Math.round(Number((el('xp-ganho') || {}).value) || 0);
    if (n <= 0) { const c = el('xp-ganho'); if (c) c.focus(); return; }
    S.xpTotal = (Number(S.xpTotal) || 0) + n;
    render(); xpRedesenhar();
    uiAviso(`+${n} XP. Disponível agora: ${xpDisponivel()}.`);
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter' || !ev.target) return;
  if (ev.target.id === 'xp-ganho') { ev.preventDefault(); el('dlg-xp').querySelector('[data-xp="ganhar"]').click(); }
  if (ev.target.id === 'xp-esp-txt') { ev.preventDefault(); xpComprar(); }
});
