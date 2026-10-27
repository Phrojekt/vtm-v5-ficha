/* ============================================================
   Ficha de Sangue — módulo de Caçador: A Revanche
   + motor de contexto (usado pelos dois sistemas)
   Carregado ANTES de app.js: só define funções, que rodam
   depois, quando S e os utilitários já existem.
   ============================================================ */

const ehCacador = () => S.sistema === 'cacador';

/* ------------------------------------------------------------
   MOTOR DE CONTEXTO
   Lê o texto livre do jogador e devolve pesos por traço.
------------------------------------------------------------ */
/* tira acento e caixa: "polícia" e "policia" casam igual */
/* O motor de contexto mora em src/contexto.js, carregado antes deste arquivo. */

function trunfosUsados() {
  // dois Trunfos, ou um Trunfo e duas Distinções
  const t = S.trunfos.length;
  const d = S.trunfos.reduce((n, x) => n + (x.dist || []).length, 0);
  return { trunfos: t, distincoes: d, ok: (t === 2 && d === 0) || (t === 1 && d === 2) };
}

/* ------------------------------------------------------------
   CARDS DO EDITOR
------------------------------------------------------------ */
function cardCredoImpeto() {
  const cr = CREDOS[S.credo], im = IMPETOS[S.impeto];
  return `
  <div class="card">
    <div class="card-h"><h2>Conceito &amp; chamado</h2></div>
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
        <div><label class="lbl" for="f-credo">Credo</label>
          <select class="f" id="f-credo" data-sel="credo">
            <option value="">—</option>
            ${Object.keys(CREDOS).map(c => `<option${c === S.credo ? ' selected' : ''}>${esc(c)}</option>`).join('')}
          </select></div>
        <div><label class="lbl" for="f-impeto">Ímpeto</label>
          <select class="f" id="f-impeto" data-sel="impeto">
            <option value="">—</option>
            ${Object.keys(IMPETOS).map(c => `<option${c === S.impeto ? ' selected' : ''}>${esc(c)}</option>`).join('')}
          </select></div>
        <div><label class="lbl" for="f-org">Org / célula</label><input class="f" id="f-org" data-bind="org" value="${esc(S.org)}" placeholder="a quem você responde"></div>
      </div>
      ${(cr || im) ? `<div style="margin-top:14px;padding:11px;background:var(--panel-2);border-radius:var(--r);border-left:3px solid var(--blood)">
        ${cr ? `<p class="note" style="margin:0 0 5px"><strong>${esc(S.credo)}</strong> <span class="tag">${esc(cr.en)}</span> — ${esc(cr.desc)}</p>` : ''}
        ${im ? `<p class="note" style="margin:0"><strong>${esc(S.impeto)}</strong> <span class="tag">${esc(im.en)}</span> — ${esc(im.desc)}</p>` : ''}
      </div>` : ''}
    </div>
  </div>`;
}

function cardTrunfos() {
  const u = trunfosUsados();
  const jaTem = S.trunfos.map(t => t.nome);
  const disponiveis = LISTA_TRUNFOS.filter(t => !jaTem.includes(t.nome));

  return `
  <div class="card">
    <div class="card-h"><h2>Trunfos</h2>
      <span class="hint">dois Trunfos, ou um Trunfo e duas Distinções</span></div>
    <div class="card-b">
      ${S.trunfos.length ? S.trunfos.map((t, idx) => {
        const fam = TRUNFOS[t.familia], info = fam && fam.itens[t.nome];
        if (!info) return '';
        const escolhidas = t.dist || [];
        return `<div class="disc">
          <div class="disc-h">
            <span class="dn">${esc(t.nome)}</span>
            <span class="tag">${esc(t.familia)}</span>
            <span class="tag blood">${esc(info.en)}</span>
            <button class="x" data-act="rm-trunfo" data-i="${idx}" aria-label="Remover ${esc(t.nome)}" style="margin-left:auto">✕</button>
          </div>
          <div class="disc-b">
            <p class="note" style="margin:0 0 6px">${esc(info.desc)}</p>
            <p class="note" style="margin:0 0 8px"><strong>Parada de Trunfo:</strong> ${esc(info.parada)}</p>
            <span class="lbl">Distinções</span>
            ${info.dist.map(d => `<div class="pw"><label>
              <input type="checkbox" data-dist="${idx}" data-nome="${esc(d)}"${escolhidas.includes(d) ? ' checked' : ''}>
              <span>${esc(d)}</span>
            </label></div>`).join('')}
          </div>
        </div>`;
      }).join('') : '<p class="note" style="margin:0">Nenhum Trunfo ainda.</p>'}

      <div class="adder">
        <select class="f" id="add-trunfo" aria-label="Trunfo a adicionar">
          ${Object.entries(TRUNFOS).map(([fam, g]) => {
            const itens = Object.keys(g.itens).filter(n => disponiveis.some(d => d.nome === n));
            return itens.length ? `<optgroup label="${esc(fam)}">${itens.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</optgroup>` : '';
          }).join('')}
        </select>
        <button class="btn" data-act="add-trunfo">Adicionar</button>
        <span class="note">${u.trunfos} Trunfo(s) · ${u.distincoes} Distinção(ões)${u.ok ? '' : ' — fora da conta de criação'}</span>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------
   TRILHA LATERAL
------------------------------------------------------------ */
function railCacador() {
  const o = orcamento(), u = trunfosUsados();
  const linha = (t, atual, alvo) => {
    const st = estadoNum(atual, alvo);
    return `<div class="bline"><span class="pip ${st}"></span><span class="t">${t}</span><span class="v ${st}">${atual}/${alvo}</span></div>`;
  };
  const linhaD = (t, d) => {
    const st = d.ok ? 'ok' : (d.nExcesso ? 'over' : 'under');
    const msg = d.ok ? 'certo' : [d.nFalta ? `falta${d.nFalta > 1 ? 'm' : ''} ${d.nFalta}` : '', d.nExcesso ? `${d.nExcesso} a mais` : ''].filter(Boolean).join(' · ');
    return `<div class="bline"><span class="pip ${st}"></span><span class="t">${t}</span><span class="v ${st}">${esc(msg)}</span></div>`;
  };
  const medidor = (nome, valor, cor) => `
    <div class="vital">
      <div class="vital-h"><span class="lbl">${esc(nome)}</span><span class="n"${cor ? ` style="color:${cor}"` : ''}>${valor}</span></div>
      <span class="dots">${[1,2,3,4,5].map(i => `<button type="button" class="dot${i <= valor ? ' temp' : ''}" data-dot="${nome === 'Desespero' ? 'desespero' : 'perigo'}" data-i="${i}" data-max="5" aria-label="${esc(nome)} ${i}"></button>`).join('')}</span>
    </div>`;

  morph(el('col-rail'), `
  <div class="card" data-mesa>
    <div class="card-h"><h2>Vitais</h2></div>
    <div class="card-b">
      ${blocoDano('saude')}
      ${blocoDano('vontade')}
      ${medidor('Desespero', S.desespero, 'var(--hunger)')}
      ${medidor('Perigo', S.perigo, 'var(--gold)')}
      ${blocoRegistro()}
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>Pontos de criação</h2></div>
    <div class="card-b">
      <div class="budget">
        ${linhaD('Atributos', o.atr)}
        ${linhaD('Habilidades', o.hab)}
        <div class="bline"><span class="pip ${u.ok ? 'ok' : 'under'}"></span><span class="t">Trunfos</span>
          <span class="v ${u.ok ? 'ok' : 'under'}">${u.trunfos}T + ${u.distincoes}D</span></div>
        ${linha('Vantagens', o.vant.atual, o.vant.alvo)}
        ${linha('Defeitos', o.def.atual, o.def.alvo)}
      </div>
      <p class="note" style="margin:9px 0 0">Na criação: <strong>2 Trunfos</strong>, ou <strong>1 Trunfo e 2 Distinções</strong>.</p>
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>A Revanche</h2></div>
    <div class="card-b" style="font-size:13px">
      <p class="note" style="margin:0 0 7px">Desespero e Perigo costumam ser da célula inteira, não só seus — combine com a mesa.</p>
      <div class="bline"><span class="t">Credo</span><span class="v">${esc(S.credo || '—')}</span></div>
      <div class="bline"><span class="t">Ímpeto</span><span class="v">${esc(S.impeto || '—')}</span></div>
      <div class="bline"><span class="t">Org</span><span class="v">${esc(S.org || '—')}</span></div>
    </div>
  </div>`);
}

/* ------------------------------------------------------------
   FICHA IMPRESSA
------------------------------------------------------------ */
function fichaCacador() {
  const m = S.meta;
  const chips = [
    S.credo ? `<span class="sh-chip key">${esc(S.credo)}</span>` : '',
    S.impeto ? `<span class="sh-chip">${esc(S.impeto)}</span>` : '',
    S.org ? `<span class="sh-chip">${esc(S.org)}</span>` : '',
    m.cronica ? `<span class="sh-chip">${esc(m.cronica)}</span>` : ''
  ].filter(Boolean).join('');

  morph(el('sheet'), `
  <div class="sh-page">
    <div class="sh-mast">
      <div class="sh-kicker">Caçador: A Revanche &middot; 5ª edição</div>
      <h1>${esc(m.nome || 'Sem nome')}</h1>
      <div class="sh-rule"></div>
      <div class="sh-chips">${chips}</div>
    </div>

    <h2 class="sr">Resumo</h2>
    <div class="sh-cols c3 sh-ident">
      <div class="sh-block txt"><h3>Identidade</h3>
        ${shTexto('Jogador', m.jogador)}
        ${shTexto('Conceito', m.conceito)}
        ${shTexto('Ambição', m.ambicao)}
        ${shTexto('Desejo', m.desejo)}
      </div>
      <div class="sh-block sh-estado"><h3>Estado</h3>
        <div class="sh-stat"><span class="k">Vitalidade</span><span class="num">${maxSaude()}</span></div>
        ${caixas(maxSaude(), S.saude.sup, S.saude.agg)}
        <div class="sh-stat" style="margin-top:9px"><span class="k">Força de Vontade</span><span class="num">${maxVontade()}</span></div>
        ${caixas(maxVontade(), S.vontade.sup, S.vontade.agg)}
        <div class="sh-stat" style="margin-top:9px"><span class="k">Desespero</span><span class="num" style="color:var(--hunger)">${S.desespero}</span></div>
        ${pips(S.desespero, 5, true)}
        <div class="sh-stat" style="margin-top:9px"><span class="k">Perigo</span><span class="num">${S.perigo}</span></div>
        ${pips(S.perigo, 5)}
      </div>
      <div class="sh-block"><h3>Chamado</h3>
        ${shLinha('Credo', esc(S.credo || '—'))}
        ${S.credo ? `<p class="sh-p" style="font-size:12.5px;font-style:italic;color:var(--ink-2)">${esc(CREDOS[S.credo].desc)}</p>` : ''}
        ${shLinha('Ímpeto', esc(S.impeto || '—'))}
        ${S.impeto ? `<p class="sh-p" style="font-size:12.5px;font-style:italic;color:var(--ink-2)">${esc(IMPETOS[S.impeto].desc)}</p>` : ''}
        ${shLinha('Org', esc(S.org || '—'))}
      </div>
    </div>

    <h2 class="sh-eyebrow">Atributos</h2>
    <div class="sh-cols c3">${blocoTracos(ATRIBUTOS, S.atr, null)}</div>

    <h2 class="sh-eyebrow">Habilidades <span style="font-weight:600;letter-spacing:.08em;text-transform:none;font-style:italic">${esc(DISTRIB_HABILIDADES[S.distribHab].nome)}</span></h2>
    <div class="sh-cols c3">${blocoTracos(HABILIDADES, S.hab, S.esp)}</div>
    ${blocoEspecializacoes()}
  </div>

  <div class="sh-page">
    <h2 class="sh-eyebrow">Trunfos &amp; recursos</h2>
    <div class="sh-cols c2u">
      <div class="sh-block">
        ${S.trunfos.length ? S.trunfos.map(t => {
          const info = TRUNFOS[t.familia] && TRUNFOS[t.familia].itens[t.nome];
          if (!info) return '';
          return `<div class="sh-disc">
            ${shLinha('<strong>' + esc(t.nome) + '</strong>', esc(t.familia))}
            <div class="sh-sub">Parada: ${esc(info.parada)}</div>
            ${(t.dist || []).map(d => `<div class="sh-sub">— ${esc(d)}</div>`).join('')}
          </div>`;
        }).join('') : '<p class="sh-p">—</p>'}
      </div>
      <div class="sh-block">
        <h3>Vantagens</h3>
        ${S.vant.length ? S.vant.map(v => shLinha(esc(v.nome), pips(Number(v.pontos) || 0, 5), v.nota ? `(${esc(v.nota)})` : '')).join('') : '<p class="sh-p">—</p>'}
        <h3 style="margin-top:11px">Defeitos</h3>
        ${S.def.length ? S.def.map(v => shLinha(esc(v.nome), pips(Number(v.pontos) || 0, 5), v.nota ? `(${esc(v.nota)})` : '')).join('') : '<p class="sh-p">—</p>'}
      </div>
    </div>

    <h2 class="sh-eyebrow">Convicções</h2>
    <div class="sh-cols c2">
      <div class="sh-block"><h3>Convicções &amp; Pilares</h3>
        ${S.conv.length ? S.conv.map(c => `<p class="sh-p">${esc(c.texto || '—')}${c.pedra ? `<br><i style="color:var(--ink-3)">Pilar: ${esc(c.pedra)}</i>` : ''}</p>`).join('') : '<p class="sh-p">—</p>'}
      </div>
      <div class="sh-block sh-note"><h3>Princípios da crônica</h3>
        <p class="sh-p">${esc(S.tenets || '—')}</p>
        ${m.aparencia ? `<p class="sh-p"><strong>Aparência</strong><br>${esc(m.aparencia)}</p>` : ''}
        ${S.notas ? `<p class="sh-p">${esc(S.notas)}</p>` : ''}
      </div>
    </div>
  </div>`);
}

/* ------------------------------------------------------------
   SORTEIO
------------------------------------------------------------ */
function sortearCacador(F, antes, pesos) {
  S.credo = F.credo || rnd(Object.keys(CREDOS));
  S.impeto = F.impeto || rnd(Object.keys(IMPETOS));
  S.org = rnd(SEMENTES_CACADOR.orgs);

  S.meta.nome = nomeAleatorio(F.origem || pesos.origem, '').nome;
  S.meta.conceito = String(F.contexto || '').trim() || rnd(SEMENTES_CACADOR.conceitos);
  S.meta.ambicao = rnd(SEMENTES_CACADOR.ambicoes);
  S.meta.desejo = rnd(SEMENTES_CACADOR.desejos);
  S.tenets = rnd(SEMENTES_CACADOR.tenets);

  // atributos e habilidades: mesma matemática de Vampiro
  const chAtr = ordenarPorPeso(ATRIBUTOS, pesos.atr, F.foco);
  [4, 3, 3, 3, 2, 2, 2, 2, 1].forEach((v, i) => S.atr[chAtr[i]] = v);

  S.distribHab = F.distrib || rnd(Object.keys(DISTRIB_HABILIDADES));
  const valHab = [];
  Object.entries(DISTRIB_HABILIDADES[S.distribHab].mapa).sort((a, b) => b[0] - a[0])
    .forEach(([n, q]) => { for (let i = 0; i < q; i++) valHab.push(Number(n)); });
  const focoHab = F.foco ? ({ 'Físicos':'Físicas', 'Sociais':'Sociais', 'Mentais':'Mentais' })[F.foco] : '';
  const chHab = ordenarPorPeso(HABILIDADES, pesos.hab, focoHab);
  chHab.forEach((k, i) => S.hab[k] = valHab[i] || 0);

  ESPECIALIDADE_GRATIS.forEach(k => { if (S.hab[k] > 0 && !S.esp[k]) S.esp[k] = 'a definir'; });
  const comPontos = chHab.filter(k => S.hab[k] >= 2 && !S.esp[k]);
  if (comPontos.length) S.esp[comPontos[0]] = 'a definir';

  // trunfos: 2 Trunfos, ou 1 Trunfo e 2 Distinções
  const pool = shuffle(LISTA_TRUNFOS);
  if (Math.random() < 0.6) {
    S.trunfos = pool.slice(0, 2).map(t => ({ nome: t.nome, familia: t.familia, dist: [] }));
  } else {
    const t = pool[0], info = TRUNFOS[t.familia].itens[t.nome];
    S.trunfos = [{ nome: t.nome, familia: t.familia, dist: shuffle(info.dist).slice(0, 2) }];
  }

  // vantagens e defeitos
  const catalogo = [['Recursos',3],['Contatos',3],['Refúgio',3],['Aliados',3],['Influência',2],
                    ['Status',2],['Contato na Org',2],['Linguística',1],['Treinamento Formal',2],['Visual (Belo)',2]];
  let restam = 7;
  shuffle(catalogo).forEach(([n, max]) => {
    if (restam <= 0 || S.vant.some(v => v.nome === n)) return;
    const p = Math.min(restam, 1 + Math.floor(Math.random() * max));
    S.vant.push({ nome: n, pontos: p, nota: '', fonte: 'user' });
    restam -= p;
  });
  if (restam > 0) S.vant.push({ nome: 'Contatos', pontos: restam, nota: '', fonte: 'user' });

  const defs = shuffle(DEFEITOS_CACADOR.flatMap(g => g.itens).filter(d => !d[1].includes('–')));
  let rd = 2;
  for (const d of defs) {
    if (rd <= 0) break;
    if (S.def.some(x => x.nome === d[0])) continue;
    const p = Math.min(rd, Number(d[1]) || 1);
    S.def.push({ nome: d[0], pontos: p, nota: '', fonte: 'user' });
    rd -= p;
  }

  const convs = shuffle(SEMENTES_CACADOR.conviccoes).slice(0, 2);
  const pil = shuffle(SEMENTES_CACADOR.pilares);
  S.conv = convs.map((c, i) => ({ texto: c, pedra: pil[i] }));
}
