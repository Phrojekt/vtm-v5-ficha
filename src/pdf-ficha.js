/* ============================================================
   Ficha de Sangue — PDF editável

   Preenche o modelo (modelo-pdf.js) com os dados da ficha. O PDF
   gerado continua sendo um formulário: dá para abrir no Acrobat,
   Foxit, Edge ou no Chrome e continuar editando os campos.

   Duas partes:
     mapaPdf(S, H)   puro, sem PDF: devolve o que vai em cada campo
     gerarPdf(S, H)  carrega o modelo, aplica o mapa e devolve os bytes
   `H` traz os derivados que vivem no app.js (Potência de Sangue,
   Vitalidade, Força de Vontade…), para este arquivo não depender de
   globais e poder ser testado fora do navegador.
   ============================================================ */

const PDF_ATRIBUTOS = {
  forca:'FOR', destreza:'DES', vigor:'VIG',
  carisma:'CAR', manipulacao:'MAN', autocontrole:'AUT',
  inteligencia:'INT', raciocinio:'RAC', determinacao:'DET'
};
const PDF_HABILIDADES = {
  armasbrancas:'ArBr', armasfogo:'ArFo', atletismo:'Atle', briga:'Brig', conducao:'Cond',
  furtividade:'Fund', furto:'Ladr', oficios:'Ofic', sobrevivencia:'Sobr',
  adestramento:'EmCA', etiqueta:'Etiq', intimidacao:'Inti', lideranca:'Lide', manha:'Manh',
  atuacao:'Perf', persuasao:'Pers', perspicacia:'Saga', labia:'Subt',
  ciencias:'Cien', erudicao:'Erud', financas:'Fina', investigacao:'Inve', medicina:'Medi',
  ocultismo:'Ocul', prontidao:'Perc', politica:'Poli', tecnologia:'Tecn'
};
const PDF_LIMITES = { disciplinas: 6, vantagens: 11 };
const PDF_META = {
  'NOME DO PERSONAGEM':'nome', 'CRÔNICA':'cronica', 'SENHOR':'senhor', 'CONCEITO':'conceito',
  'AMBIÇÃO':'ambicao', 'DESEJO':'desejo', 'PREDADOR':'predador', 'CLÃ':'cla',
  'Ressonância':'ressonancia', 'Aparência':'aparencia'
};
const PDF_EXTRAS = {
  'Idade Aparente':'idadeAparente', 'Data de Nascimento':'nascimento', 'Data de Morte':'morte',
  'Traços Distintivos':'tracos', 'História':'historia'
};
const PDF_ANEXO = 'ficha-de-sangue.json';

/* a décima caixa de cada trilha termina em 0, não em 10 */
const pdfCaixa = (prefixo, i) => prefixo + (i === 10 ? 0 : i);

function mapaPdf(S, H) {
  const texto = {};   /* campo → texto            */
  const marcas = {};  /* campo → true (caixa marcada) */
  const excedente = []; /* o que não coube vai para as Notas */
  const m = S.meta;

  const pontos = (prefixo, n, max) => {
    n = Math.max(0, Math.min(max || 5, Number(n) || 0));
    for (let i = 1; i <= n; i++) marcas[pdfCaixa(prefixo, i)] = true;
  };

  /* --- identidade --- */
  texto['NOME DO PERSONAGEM'] = m.nome || '';
  texto['CRÔNICA']  = m.cronica || '';
  texto['SENHOR']   = m.senhor || '';
  texto['CONCEITO'] = m.conceito || '';
  texto['AMBIÇÃO']  = m.ambicao || '';
  texto['DESEJO']   = m.desejo || '';
  texto['PREDADOR'] = m.predador || '';
  texto['CLÃ']      = m.cla || '';
  texto['GERAÇÃO']  = m.geracao ? m.geracao + 'ª' : '';
  texto['Ressonância'] = m.ressonancia || '';

  /* --- atributos e habilidades --- */
  for (const k in PDF_ATRIBUTOS)   pontos(PDF_ATRIBUTOS[k], S.atr[k]);
  for (const k in PDF_HABILIDADES) pontos(PDF_HABILIDADES[k], S.hab[k]);

  /* --- trilhas --- */
  pontos('VIT', H.maxSaude, 10);
  pontos('FdV', H.maxVontade, 10);
  pontos('Humanidade', S.humanidade, 10);
  pontos('Fome', S.fome, 5);
  pontos('PdS', H.potencia, 10);

  /* --- Potência de Sangue --- */
  const bp = H.bp;
  texto['Surto de Sangue'] = '+' + bp.surto;
  texto['Quantidade Recuperada'] = String(bp.recuperado);
  texto['Bônus de Poder'] = '+' + bp.bonusPoder;
  texto['Rerrolagem de Sangue'] = bp.rerrolagem ? 'Disciplinas até o nível ' + bp.rerrolagem : '—';
  texto['Penalidade de Alimentação'] = bp.alimentacao || '';
  texto['Gravidade da Perdição'] = String(bp.gravidade);

  /* --- disciplinas --- */
  const discs = S.disc.slice(0, PDF_LIMITES.disciplinas);
  discs.forEach((d, i) => {
    const n = i + 1;
    texto['DISCIPLINA ' + n] = d.nome;
    pontos('DSCP' + n + '.', d.nivel, 5);
    const info = (H.DISCIPLINAS[d.nome] || { poderes: [] }).poderes;
    const linhas = (d.poderes || []).map(nome => {
      const p = info.find(x => x.pt === nome);
      return { lv: p ? p.lv : 0, t: nome };
    }).sort((a, b) => a.lv - b.lv).map(x => (x.lv ? x.lv + ' · ' : '') + x.t);
    if (d.rituais) d.rituais.split('\n').map(s => s.trim()).filter(Boolean).forEach(r => linhas.push('Rito · ' + r));
    texto['Desc.Disc.' + n] = linhas.join('\n');
  });
  S.disc.slice(PDF_LIMITES.disciplinas).forEach(d => {
    excedente.push(d.nome + ' (' + Math.min(5, Number(d.nivel) || 0) + ')' +
      ((d.poderes || []).length ? ': ' + d.poderes.join(', ') : ''));
  });

  /* --- Vantagens & Defeitos: a lista do modelo é uma só --- */
  const lista = [].concat(
    S.vant.map(v => ({ v, def: false })),
    S.def.map(v => ({ v, def: true }))
  );
  /* a linha do modelo é curta: nota longa vai para as Notas, não encolhe a letra */
  const detalhes = [];
  const rotulo = (v, def) => {
    const nota = v.nota ? String(v.nota).trim() : '';
    if (nota.length > 24) detalhes.push(v.nome + ': ' + nota);
    return (def ? 'Defeito: ' : '') + v.nome + (nota && nota.length <= 24 ? ' (' + nota + ')' : '');
  };
  const pts = v => ' (' + Math.min(5, Number(v.pontos) || 0) + ')';
  lista.slice(0, PDF_LIMITES.vantagens).forEach(({ v, def }, i) => {
    const n = i + 1;
    texto['Vantagens e Defeitos ' + n] = rotulo(v, def);
    pontos('V&D' + n + '.', v.pontos, 5);
  });
  lista.slice(PDF_LIMITES.vantagens).forEach(({ v, def }) => {
    excedente.push((def ? 'Defeito: ' : 'Vantagem: ') + rotulo(v, false) + pts(v));
  });

  /* --- página 2 --- */
  texto['Princípios da Crônica'] = S.tenets || '';
  texto['Pilares & Convicções'] = S.conv.filter(c => c.texto || c.pedra)
    .map(c => '• ' + (c.texto || '—') + (c.pedra ? '\n   Pilar: ' + c.pedra : '')).join('\n');
  const cla = H.cla;
  const bane = S.bane || (cla ? cla.bane : '');
  const comp = S.comp || (cla ? cla.comp : '');
  texto['Perdição do Clã'] = [bane && 'Perdição: ' + bane, comp && 'Compulsão: ' + comp].filter(Boolean).join('\n\n');

  texto['XP Total'] = String(Number(S.xpTotal) || 0);
  texto['XP Gasta'] = String(Number(S.xpGasto) || 0);
  const ex = S.extra || {};
  texto['Idade Verdadeira'] = ex.idadeVerdadeira ||
    (H.idade && H.idade.nome && H.idade.nome !== 'Não definida' ? H.idade.nome.replace(/\s*†/, '') : '');
  texto['Aparência'] = m.aparencia || '';
  /* campos que só existem no PDF: guardados em S.extra para a volta não perder nada */
  for (const nome in PDF_EXTRAS) texto[nome] = ex[PDF_EXTRAS[nome]] || '';

  /* --- Notas: o que o modelo não tem onde guardar --- */
  const notas = [];
  if (m.jogador) notas.push('Jogador: ' + m.jogador);
  if (m.seita) notas.push('Seita: ' + m.seita);
  const esp = Object.keys(S.esp || {}).filter(k => S.esp[k]).map(k => {
    const h = H.nomeHabilidade ? H.nomeHabilidade(k) : k;
    return h + ' (' + S.esp[k] + ')';
  });
  if (esp.length) notas.push('Especialidades: ' + esp.join('; '));
  if (excedente.length) notas.push('Não coube na ficha:\n' + excedente.map(s => '• ' + s).join('\n'));
  if (detalhes.length) notas.push('Detalhes:\n' + detalhes.map(s => '• ' + s).join('\n'));
  if (S.notas) notas.push(S.notas);
  texto['Notas'] = notas.join('\n\n');

  return { texto, marcas };
}

/* ---------- geração ---------- */

const PDF_SUBST = {
  '‘':"'", '’':"'", '‚':',', '“':'"', '”':'"', '–':'-', '—':'-',
  '−':'-', '…':'...', ' ':' ', '→':'->', '←':'<-', '✕':'x', '╳':'x',
  '★':'*', '†':'+', 'º':'º'
};
function pdfLimpa(s, font) {
  const ok = font.getCharacterSet();
  const cs = new Set(ok);
  let r = '';
  /* quebras de linha do Windows/Mac viram \n; tabulação vira espaço */
  const txt = String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
  for (const ch of txt) {
    const c = ch.codePointAt(0);
    if (ch === '\n') r += ch;
    else if (cs.has(c)) r += ch;
    else r += PDF_SUBST[ch] != null ? PDF_SUBST[ch] : (/\s/.test(ch) ? ' ' : '?');
  }
  return r;
}

/* quebra de linha igual à do campo: por palavra, respeitando \n */
function pdfLinhas(t, font, tam, largura) {
  const out = [];
  t.split('\n').forEach(par => {
    let linha = '';
    par.split(' ').forEach(w => {
      const teste = linha ? linha + ' ' + w : w;
      if (linha && font.widthOfTextAtSize(teste, tam) > largura) { out.push(linha); linha = w; }
      else linha = teste;
    });
    out.push(linha);
  });
  return out.length;
}

async function gerarPdf(S, H, PDFLib) {
  const { PDFDocument, StandardFonts } = PDFLib;
  const bin = atob(MODELO_PDF_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { texto, marcas } = mapaPdf(S, H);
  const faltou = [];
  const campos = [];
  const escrito = {}; /* o texto exato que foi para cada campo, para comparar na volta */

  for (const nome in texto) {
    let campo;
    try { campo = form.getTextField(nome); } catch (e) { faltou.push(nome); continue; }
    let valor = pdfLimpa(texto[nome], font);
    /* campo de uma linha não aceita quebra: a fonte não codifica \n e o PDF trava */
    if (!campo.isMultiline()) valor = valor.replace(/\s*\n+\s*/g, ' ').trim();
    const r = campo.acroField.getWidgets()[0].getRectangle();
    if (campo.isMultiline()) {
      /* o modelo fixa 8 pt; reduzimos só o necessário para o texto caber */
      let tam = 8;
      while (tam > 5 && pdfLinhas(valor, font, tam, r.width - 6) * font.heightAtSize(tam) > r.height - 4) tam -= 0.5;
      campo.acroField.setDefaultAppearance("/Helv " + tam + " Tf 0 g");
    } else if (valor) {
      /* uma linha: tamanho único e legível, reduzido só se não couber na largura */
      let tam = Math.min(9.5, Math.max(6, r.height - 1.5));
      while (tam > 5 && font.widthOfTextAtSize(valor, tam) > r.width - 6) tam -= 0.5;
      campo.acroField.setDefaultAppearance("/Helv " + tam + " Tf 0 g");
    }
    campo.setText(valor || undefined);
    escrito[nome] = valor;
    campos.push(campo);
  }
  for (const nome in marcas) {
    try { form.getCheckBox(nome).check(); } catch (e) { faltou.push(nome); }
  }

  /* Só os campos de texto são redesenhados. As bolinhas e caixas do modelo
     ficam com o desenho original: redesenhá-las trocaria o círculo por quadrado. */
  campos.forEach(c => c.defaultUpdateAppearances(font));
  doc.setTitle('Ficha de Vampiro — ' + (S.meta.nome || 'Sem nome'));
  doc.setSubject('Vampiro: A Máscara 5ª edição — ficha editável');
  doc.setProducer('Ficha de Sangue');
  /* A ficha inteira vai anexada ao PDF. "Abrir PDF" lê esse anexo e compara os
     campos com o que foi escrito aqui: o que mudou foi editado à mão. */
  const pacote = { app: 'ficha-de-sangue', formato: 1, salvoEm: new Date().toISOString(),
                   estado: S, campos: { texto: escrito, marcas } };
  await doc.attach(new TextEncoder().encode(JSON.stringify(pacote)), PDF_ANEXO, {
    mimeType: 'application/json',
    description: 'Dados da Ficha de Sangue: permite abrir este PDF de volta no app'
  });
  const saida = await doc.save({ updateFieldAppearances: false });
  saida.faltou = faltou;
  return saida;
}


/* ============================================================
   ABRIR PDF — o caminho de volta
   lerPdf(bytes)          lê os campos e o anexo com a ficha (se houver)
   estadoDoPdf(lido, base, D)
                          aplica sobre `base` o que mudou nos campos.
   Com anexo, `base` é a ficha anexada e só o que foi editado à mão no
   PDF é aplicado. Sem anexo (o modelo preenchido em outro lugar), `base`
   é uma ficha vazia e tudo que estiver preenchido é lido.
   ============================================================ */

async function lerPdf(bytes, PDFLib) {
  const { PDFDocument, PDFTextField, PDFCheckBox } = PDFLib;
  let doc;
  try { doc = await PDFDocument.load(bytes, { ignoreEncryption: true }); }
  catch (e) { throw new Error('não consegui ler este arquivo como PDF'); }
  const form = doc.getForm();
  const nomes = new Set(form.getFields().map(f => f.getName()));
  if (!nomes.has('FOR1') || !nomes.has('NOME DO PERSONAGEM')) {
    throw new Error('este PDF não é o modelo da ficha de Vampiro');
  }
  const texto = {}, marcas = {};
  for (const f of form.getFields()) {
    const n = f.getName();
    try {
      /* instanceof, não constructor.name: na versão minificada os nomes das classes somem */
      if (f instanceof PDFTextField) texto[n] = (f.getText() || '').replace(/\r\n?/g, '\n');
      else if (f instanceof PDFCheckBox && f.isChecked()) marcas[n] = true;
    } catch (e) { /* campo estranho: ignora */ }
  }
  let pacote = null;
  try { pacote = pdfAnexo(doc, PDFLib); } catch (e) { pacote = null; }
  if (pacote && pacote.app !== 'ficha-de-sangue') pacote = null;
  return { pacote, campos: { texto, marcas } };
}

/* percorre a árvore de anexos (/Names /EmbeddedFiles) atrás do nosso JSON */
function pdfAnexo(doc, PDFLib) {
  const { PDFName, PDFDict, PDFArray, decodePDFRawStream } = PDFLib;
  const raiz = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  const ef = raiz && raiz.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict);
  if (!ef) return null;
  const visitar = (no) => {
    const pares = no.lookupMaybe(PDFName.of('Names'), PDFArray);
    if (pares) for (let i = 0; i + 1 < pares.size(); i += 2) {
      const nome = pares.lookup(i);
      const txt = nome && nome.decodeText ? nome.decodeText() : String(nome);
      if (txt !== PDF_ANEXO) continue;
      const spec = pares.lookup(i + 1, PDFDict);
      const efd = spec.lookup(PDFName.of('EF'), PDFDict);
      const fluxo = efd.lookup(PDFName.of('F'));
      const dados = decodePDFRawStream(fluxo).decode();
      return JSON.parse(new TextDecoder().decode(dados));
    }
    const filhos = no.lookupMaybe(PDFName.of('Kids'), PDFArray);
    if (filhos) for (let i = 0; i < filhos.size(); i++) {
      const r = visitar(filhos.lookup(i, PDFDict));
      if (r) return r;
    }
    return null;
  };
  return visitar(ef);
}

/* comparação sem acento e sem caixa, para casar "Celeridade" com "celeridade" */
const pdfChave = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function pdfAchar(lista, nome) {
  const k = pdfChave(nome);
  return lista.find(x => pdfChave(x) === k) || null;
}

function estadoDoPdf(lido, base, D) {
  const S = JSON.parse(JSON.stringify(base));
  S.extra = S.extra || {};
  const cur = lido.campos;
  const orig = lido.pacote ? lido.pacote.campos : { texto: {}, marcas: {} };
  const mudancas = [];
  const t = n => (cur.texto[n] || '').trim();
  const mudouT = n => (cur.texto[n] || '').trim() !== (orig.texto[n] || '').trim();
  const nivel = (marcas, prefixo, max) => {
    let n = 0;
    for (let i = 1; i <= max; i++) if (marcas[pdfCaixa(prefixo, i)]) n = i;
    return n;
  };
  const mudouN = (prefixo, max) => nivel(cur.marcas, prefixo, max) !== nivel(orig.marcas, prefixo, max);
  const nomeHab = k => { for (const g of D.HABILIDADES) for (const i of g.itens) if (i[0] === k) return i[1]; return k; };
  const nomeAtr = k => { for (const g of D.ATRIBUTOS) for (const i of g.itens) if (i[0] === k) return i[1]; return k; };

  /* identidade */
  for (const campo in PDF_META) if (mudouT(campo)) {
    let v = t(campo);
    if (campo === 'CLÃ') v = pdfAchar(Object.keys(D.CLAS), v) || v;
    S.meta[PDF_META[campo]] = v;
    mudancas.push(campo === 'NOME DO PERSONAGEM' ? 'Nome' : campo.charAt(0) + campo.slice(1).toLowerCase());
  }
  if (mudouT('GERAÇÃO')) {
    const g = parseInt(t('GERAÇÃO'), 10);
    if (g) { S.meta.geracao = g; mudancas.push('Geração'); }
  }

  /* atributos e habilidades */
  for (const k in PDF_ATRIBUTOS) if (mudouN(PDF_ATRIBUTOS[k], 5)) {
    S.atr[k] = Math.max(1, nivel(cur.marcas, PDF_ATRIBUTOS[k], 5));
    mudancas.push(nomeAtr(k) + ' ' + S.atr[k]);
  }
  for (const k in PDF_HABILIDADES) if (mudouN(PDF_HABILIDADES[k], 5)) {
    S.hab[k] = nivel(cur.marcas, PDF_HABILIDADES[k], 5);
    mudancas.push(nomeHab(k) + ' ' + S.hab[k]);
  }

  /* trilhas. Vitalidade e Força de Vontade são calculadas: não voltam. */
  if (mudouN('Humanidade', 10)) { S.humanidade = nivel(cur.marcas, 'Humanidade', 10); mudancas.push('Humanidade ' + S.humanidade); }
  if (mudouN('Fome', 5)) { S.fome = nivel(cur.marcas, 'Fome', 5); mudancas.push('Fome ' + S.fome); }
  if (mudouN('PdS', 10)) { S.bpOverride = nivel(cur.marcas, 'PdS', 10); mudancas.push('Potência de Sangue ' + S.bpOverride); }

  /* disciplinas: só as casas que mudaram são relidas */
  const discBase = (base.disc || []);
  const discs = [];
  for (let i = 1; i <= PDF_LIMITES.disciplinas; i++) {
    const nomeCampo = 'DISCIPLINA ' + i, descCampo = 'Desc.Disc.' + i, pref = 'DSCP' + i + '.';
    const mudou = mudouT(nomeCampo) || mudouT(descCampo) || mudouN(pref, 5);
    const antiga = discBase[i - 1];
    if (!mudou) { if (antiga) discs.push(antiga); continue; }
    const nome = t(nomeCampo);
    if (!nome) { if (antiga) mudancas.push('removida: ' + antiga.nome); continue; }
    const chave = pdfAchar(Object.keys(D.DISCIPLINAS), nome) || nome;
    const d = antiga && pdfChave(antiga.nome) === pdfChave(chave)
      ? JSON.parse(JSON.stringify(antiga)) : { nome: chave, nivel: 0, poderes: [], rituais: '' };
    d.nome = chave;
    d.nivel = nivel(cur.marcas, pref, 5);
    if (mudouT(descCampo) || !antiga || antiga.nome !== d.nome) {
      const info = (D.DISCIPLINAS[chave] || { poderes: [] }).poderes.map(p => p.pt);
      const poderes = [], ritos = [];
      t(descCampo).split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
        l = l.replace(/^[•\-–—*]\s*/, '');
        const rito = l.match(/^rito\s*[·:\-–]\s*(.+)$/i);
        if (rito) { ritos.push(rito[1].trim()); return; }
        l = l.replace(/^\d\s*[·.:\-–)]\s*/, '');
        poderes.push(pdfAchar(info, l) || l);
      });
      d.poderes = poderes;
      d.rituais = ritos.join('\n');
    }
    discs.push(d);
    mudancas.push('Disciplina ' + d.nome);
  }
  S.disc = discs.concat(discBase.slice(PDF_LIMITES.disciplinas));

  /* Vantagens & Defeitos: a lista do modelo é uma só */
  const listaBase = (base.vant || []).map(v => ({ v, def: false })).concat((base.def || []).map(v => ({ v, def: true })));
  const vant = [], def = [];
  for (let i = 1; i <= PDF_LIMITES.vantagens; i++) {
    const campo = 'Vantagens e Defeitos ' + i, pref = 'V&D' + i + '.';
    const antiga = listaBase[i - 1];
    if (!mudouT(campo) && !mudouN(pref, 5)) {
      if (antiga) (antiga.def ? def : vant).push(antiga.v);
      continue;
    }
    const linha = t(campo);
    if (!linha) { if (antiga) mudancas.push('removido: ' + antiga.v.nome); continue; }
    let item, ehDef;
    if (!mudouT(campo) && antiga) { item = JSON.parse(JSON.stringify(antiga.v)); ehDef = antiga.def; }
    else {
      ehDef = /^defeito\s*:/i.test(linha);
      const sem = linha.replace(/^(defeito|vantagem)\s*:\s*/i, '');
      const m = sem.match(/^(.*?)\s*\((.*)\)\s*$/);
      item = m ? { nome: m[1].trim(), nota: m[2].trim() } : { nome: sem, nota: '' };
    }
    item.pontos = nivel(cur.marcas, pref, 5);
    (ehDef ? def : vant).push(item);
    mudancas.push((ehDef ? 'Defeito ' : 'Vantagem ') + item.nome);
  }
  listaBase.slice(PDF_LIMITES.vantagens).forEach(({ v, def: d }) => (d ? def : vant).push(v));
  S.vant = vant; S.def = def;

  /* página 2 */
  if (mudouT('Princípios da Crônica')) { S.tenets = t('Princípios da Crônica'); mudancas.push('Princípios da Crônica'); }
  if (mudouT('Pilares & Convicções')) {
    const conv = [];
    t('Pilares & Convicções').split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      const pilar = l.match(/^pilar\s*:\s*(.*)$/i);
      if (pilar && conv.length) { conv[conv.length - 1].pedra = pilar[1].trim(); return; }
      conv.push({ texto: l.replace(/^[•\-–—*]\s*/, ''), pedra: '' });
    });
    S.conv = conv;
    mudancas.push('Convicções');
  }
  if (mudouT('Perdição do Clã')) {
    const tx = t('Perdição do Clã');
    const pb = tx.match(/perdição\s*:\s*([\s\S]*?)(?=\n\s*compulsão\s*:|$)/i);
    const pc = tx.match(/compulsão\s*:\s*([\s\S]*)$/i);
    S.bane = (pb ? pb[1] : (pc ? '' : tx)).trim();
    S.comp = pc ? pc[1].trim() : S.comp;
    mudancas.push('Perdição do clã');
  }
  const num = s => parseInt(String(s).replace(/[^\d-]/g, ''), 10) || 0;
  if (mudouT('XP Total')) { S.xpTotal = num(t('XP Total')); mudancas.push('XP total'); }
  if (mudouT('XP Gasta')) { S.xpGasto = num(t('XP Gasta')); mudancas.push('XP gasta'); }
  if (mudouT('Idade Verdadeira')) {
    /* se for o nome de uma faixa de idade (Neófita, Ancillae…), vira a idade da ficha */
    const iv = t('Idade Verdadeira');
    const faixa = D.MAR ? Object.keys(D.MAR).find(k => k && pdfChave(D.MAR[k].nome.replace(/\s*†/, '')) === pdfChave(iv)) : null;
    if (faixa) { S.mar = faixa; S.extra.idadeVerdadeira = ''; }
    else S.extra.idadeVerdadeira = iv;
    mudancas.push('Idade verdadeira');
  }
  for (const campo in PDF_EXTRAS) if (mudouT(campo)) { S.extra[PDF_EXTRAS[campo]] = t(campo); mudancas.push(campo); }

  /* Notas: devolve Jogador, Seita e Especialidades aos seus lugares */
  if (mudouT('Notas')) {
    const livres = [];
    let bloco = null;
    t('Notas').split('\n').forEach(l => {
      const s = l.trim();
      if (/^(não coube na ficha|detalhes)\s*:\s*$/i.test(s)) { bloco = 'ignorar'; return; }
      if (bloco === 'ignorar' && /^•/.test(s)) return;
      bloco = null;
      let m;
      if ((m = s.match(/^jogador\s*:\s*(.*)$/i))) { S.meta.jogador = m[1].trim(); return; }
      if ((m = s.match(/^seita\s*:\s*(.*)$/i))) { S.meta.seita = m[1].trim(); return; }
      if ((m = s.match(/^especialidades\s*:\s*(.*)$/i))) {
        const nomes = {};
        D.HABILIDADES.forEach(g => g.itens.forEach(([k, pt]) => { nomes[pdfChave(pt)] = k; }));
        for (const k in S.esp) S.esp[k] = '';
        m[1].split(';').forEach(par => {
          const mm = par.trim().match(/^(.*?)\s*\((.*)\)$/);
          if (mm && nomes[pdfChave(mm[1])]) S.esp[nomes[pdfChave(mm[1])]] = mm[2].trim();
        });
        return;
      }
      livres.push(l);
    });
    S.notas = livres.join('\n').replace(/^\s+|\s+$/g, '').replace(/\n{3,}/g, '\n\n');
    mudancas.push('Notas');
  }

  return { estado: S, mudancas, comAnexo: !!lido.pacote };
}

if (typeof module !== 'undefined') module.exports = { mapaPdf, gerarPdf, lerPdf, estadoDoPdf, PDF_ATRIBUTOS, PDF_HABILIDADES };
