/* O que mudou de uma versão da ficha para a seguinte, em frases curtas
   ("Força 2 → 3", "+ Dominação 1", "Fome 1 → 3"). É guardado junto com a
   versão, para o histórico e o painel do narrador não precisarem baixar
   as fichas inteiras. Nada aqui é regra de jogo: só comparação. */

const ATR = {
  forca: 'Força', destreza: 'Destreza', vigor: 'Vigor',
  carisma: 'Carisma', manipulacao: 'Manipulação', autocontrole: 'Autocontrole',
  inteligencia: 'Inteligência', raciocinio: 'Raciocínio', determinacao: 'Determinação'
};
const HAB = {
  armasbrancas: 'Armas Brancas', armasfogo: 'Armas de Fogo', atletismo: 'Atletismo', briga: 'Briga',
  conducao: 'Condução', furtividade: 'Furtividade', furto: 'Ladroagem', oficios: 'Ofícios', sobrevivencia: 'Sobrevivência',
  adestramento: 'Empatia com Animais', etiqueta: 'Etiqueta', intimidacao: 'Intimidação', lideranca: 'Liderança',
  manha: 'Manha', atuacao: 'Performance', persuasao: 'Persuasão', perspicacia: 'Sagacidade', labia: 'Subterfúgio',
  ciencias: 'Ciência', erudicao: 'Erudição', financas: 'Finanças', investigacao: 'Investigação', medicina: 'Medicina',
  ocultismo: 'Ocultismo', prontidao: 'Percepção', politica: 'Política', tecnologia: 'Tecnologia'
};
const META = {
  nome: 'Nome', jogador: 'Jogador', cronica: 'Crônica', conceito: 'Conceito', ambicao: 'Ambição', desejo: 'Desejo',
  cla: 'Clã', geracao: 'Geração', senhor: 'Senhor', seita: 'Seita', predador: 'Predador',
  ressonancia: 'Ressonância', aparencia: 'Aparência'
};
const NUM = {
  humanidade: 'Humanidade', manchas: 'Máculas', fome: 'Fome', xpTotal: 'XP total', xpGasto: 'XP gasto',
  desespero: 'Desespero', perigo: 'Perigo', bpOverride: 'Potência de Sangue'
};
const TEXTO = {
  notas: 'Notas', tenets: 'Princípios da crônica', bane: 'Perdição do clã', comp: 'Compulsão',
  credo: 'Credo', impeto: 'Ímpeto', org: 'Organização', mar: 'Mar do Tempo', loresheet: 'Loresheet'
};
/* coisas internas do app, que não interessam a quem lê o histórico */
const IGNORAR = new Set(['_id', '_etapas', '_perfil', '_foco', '_pred', 'forja', 'distribHab', 'xpCompras', 'sistema', 'extra']);

const curto = (v, n = 40) => {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const vazio = v => v == null || v === '' ;
const num = v => (v == null || v === '' ? 0 : Number(v) || 0);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function porNome(lista) {
  const m = new Map();
  (Array.isArray(lista) ? lista : []).forEach((x, i) => {
    if (!x || typeof x !== 'object') return;
    const k = String(x.nome || '').trim() || '#' + i;
    m.set(k, x);
  });
  return m;
}

function diffFicha(antes, depois, { max = 14 } = {}) {
  const a = antes && typeof antes === 'object' ? antes : {};
  const d = depois && typeof depois === 'object' ? depois : {};
  const itens = [];
  const add = (g, t) => itens.push({ g, t });

  /* identidade */
  const ma = a.meta || {}, md = d.meta || {};
  for (const k of Object.keys(META)) {
    if (igual(ma[k] ?? '', md[k] ?? '')) continue;
    if (k === 'geracao') add('identidade', `Geração ${ma[k] || '—'}ª → ${md[k] || '—'}ª`);
    else if (vazio(ma[k])) add('identidade', `${META[k]}: ${curto(md[k])}`);
    else if (vazio(md[k])) add('identidade', `${META[k]} apagado`);
    else add('identidade', `${META[k]}: ${curto(ma[k], 24)} → ${curto(md[k], 24)}`);
  }

  /* atributos e habilidades */
  for (const [k, n] of Object.entries(ATR)) {
    const x = num((a.atr || {})[k]), y = num((d.atr || {})[k]);
    if (x !== y && (a.atr || d.atr)) add('atributos', `${n} ${x} → ${y}`);
  }
  for (const [k, n] of Object.entries(HAB)) {
    const x = num((a.hab || {})[k]), y = num((d.hab || {})[k]);
    if (x !== y) add('habilidades', `${n} ${x} → ${y}`);
    const ex = String((a.esp || {})[k] || '').trim(), ey = String((d.esp || {})[k] || '').trim();
    if (ex !== ey) add('habilidades', ey ? `Especialização em ${n}: ${curto(ey, 30)}` : `Especialização em ${n} removida`);
  }

  /* disciplinas e poderes */
  const da = porNome(a.disc), dd = porNome(d.disc);
  for (const [k, x] of dd) {
    const y = da.get(k);
    if (!y) { add('disciplinas', `+ ${k} ${num(x.nivel)}`); continue; }
    if (num(y.nivel) !== num(x.nivel)) add('disciplinas', `${k} ${num(y.nivel)} → ${num(x.nivel)}`);
    const pa = new Set((y.poderes || []).map(String)), pd = new Set((x.poderes || []).map(String));
    for (const p of pd) if (!pa.has(p)) add('disciplinas', `+ poder ${curto(p, 30)} (${k})`);
    for (const p of pa) if (!pd.has(p)) add('disciplinas', `− poder ${curto(p, 30)} (${k})`);
    if (String(y.rituais || '') !== String(x.rituais || '')) add('disciplinas', `Rituais de ${k} editados`);
  }
  for (const k of da.keys()) if (!dd.has(k)) add('disciplinas', `− ${k}`);

  /* vantagens, defeitos e trunfos (Caçador) */
  for (const [campo, g, rot] of [['vant', 'vantagens', ''], ['def', 'defeitos', 'defeito '], ['trunfos', 'vantagens', 'trunfo ']]) {
    const xa = porNome(a[campo]), xd = porNome(d[campo]);
    for (const [k, x] of xd) {
      const y = xa.get(k);
      const nome = k.startsWith('#') ? 'sem nome' : k;
      if (!y) { add(g, `+ ${rot}${curto(nome, 30)}${x.pontos != null ? ' ' + num(x.pontos) : ''}`); continue; }
      if (x.pontos != null && num(y.pontos) !== num(x.pontos)) add(g, `${rot}${curto(nome, 30)} ${num(y.pontos)} → ${num(x.pontos)}`);
      else if (!igual(y, x)) add(g, `${rot}${curto(nome, 30)} editado`);
    }
    for (const k of xa.keys()) if (!xd.has(k)) add(g, `− ${rot}${k.startsWith('#') ? 'sem nome' : curto(k, 30)}`);
  }

  /* convicções */
  const ca = Array.isArray(a.conv) ? a.conv : [], cd = Array.isArray(d.conv) ? d.conv : [];
  if (cd.length > ca.length) add('conviccoes', `+ ${cd.length - ca.length} convicção(ões)`);
  else if (cd.length < ca.length) add('conviccoes', `− ${ca.length - cd.length} convicção(ões)`);
  else if (!igual(ca, cd)) add('conviccoes', 'Convicções ou pilares editados');

  /* vitais e números */
  for (const [k, n] of Object.entries(NUM)) {
    if (!(k in a) && !(k in d)) continue;
    if (k === 'bpOverride') { if (!igual(a[k] ?? null, d[k] ?? null)) add('vitais', `Potência de Sangue ${a[k] ?? 'auto'} → ${d[k] ?? 'auto'}`); continue; }
    const x = num(a[k]), y = num(d[k]);
    if (x !== y) add(k.startsWith('xp') ? 'xp' : 'vitais', `${n} ${x} → ${y}`);
  }
  for (const [k, n] of [['saude', 'Vitalidade'], ['vontade', 'Força de Vontade']]) {
    const x = a[k] || {}, y = d[k] || {};
    if (num(x.sup) !== num(y.sup) || num(x.agg) !== num(y.agg)) {
      add('vitais', `${n}: ${num(y.sup)} superficial, ${num(y.agg)} agravado`);
    }
  }
  if (!igual(a.xpCompras || [], d.xpCompras || [])) {
    const n = (d.xpCompras || []).length - (a.xpCompras || []).length;
    add('xp', n > 0 ? `+ ${n} compra(s) com XP` : n < 0 ? `− ${-n} compra(s) com XP` : 'Compras com XP editadas');
  }

  /* textos longos: só avisa que mudou */
  for (const [k, n] of Object.entries(TEXTO)) {
    if (String(a[k] || '') !== String(d[k] || '')) add('notas', `${n} ${vazio(a[k]) ? 'preenchido' : vazio(d[k]) ? 'apagado' : 'editado'}`);
  }
  if (!igual(a.extra || {}, d.extra || {})) add('notas', 'Dados da página 2 editados');

  /* o que sobrar e não for interno */
  const conhecidos = new Set(['meta', 'atr', 'hab', 'esp', 'disc', 'vant', 'def', 'trunfos', 'conv', 'saude', 'vontade',
    ...Object.keys(NUM), ...Object.keys(TEXTO)]);
  const outros = [...new Set([...Object.keys(a), ...Object.keys(d)])]
    .filter(k => !conhecidos.has(k) && !IGNORAR.has(k) && !igual(a[k], d[k]));
  if (outros.length) add('outros', 'Outros campos: ' + outros.slice(0, 4).join(', '));
  if (a.sistema !== d.sistema && a.sistema && d.sistema) add('identidade', `Sistema: ${a.sistema} → ${d.sistema}`);

  return { itens: itens.slice(0, max), mais: Math.max(0, itens.length - max), total: itens.length };
}

module.exports = { diffFicha };
