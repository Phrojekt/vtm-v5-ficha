/* ============================================================
   Ficha de Sangue — importar fichas de Vampiro feitas em outro lugar

   Lê fichas que não saíram deste app e monta uma proposta de ficha,
   que a pessoa confere antes de criar (impConferir, mais abaixo).

   Fontes:
     PDF de formulário   qualquer ficha preenchível, em qualquer idioma.
                         Cada campo é reconhecido pelo nome; o que tem
                         nome genérico ("Check Box 37") é reconhecido
                         pela posição: o texto impresso à esquerda da
                         fileira de bolinhas diz o que ela é.
     PDF sem campos      lido como texto.
     JSON                Foundry VTT (sistema WoD5e) e JSON qualquer.
     Texto colado        "Strength 3", "Força ●●●○○", "Clan: Brujah"…

   Os termos são reconhecidos em português, inglês, espanhol, francês,
   alemão e italiano, sem acento e sem caixa, e com tolerância a um erro
   de digitação. O que veio por aproximação aparece marcado na conferência.
   ============================================================ */

/* ---------- normalização ---------- */
function impNorm(s) {
  return String(s == null ? '' : s)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function impDist(a, b, teto) {
  if (Math.abs(a.length - b.length) > teto) return teto + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < menor) menor = cur[j];
    }
    if (menor > teto) return teto + 1;
    ant = cur;
  }
  return ant[b.length];
}
const impTeto = n => n >= 9 ? 2 : (n >= 5 ? 1 : 0);

/* ---------- dicionário: rótulos ---------- */
/* atributos e habilidades: o nome em português e em inglês vêm de dados.js */
const IMP_ATR = {
  forca:        ['str', 'fuerza', 'force', 'korperkraft', 'starke attribut', 'forza', 'for'],
  destreza:     ['dex', 'dexterite', 'geschicklichkeit', 'destrezza', 'des'],
  vigor:        ['sta', 'stam', 'resistencia', 'vigueur', 'widerstandsfahigkeit', 'costituzione', 'vig'],
  carisma:      ['cha', 'char', 'charisme', 'cha'],
  manipulacao:  ['man', 'manip', 'manipulacion', 'persuasione', 'manipulation'],
  autocontrole: ['com', 'comp', 'compostura', 'sang froid', 'fassung', 'autocontrollo', 'aut', 'autocontrol'],
  inteligencia: ['int', 'intel', 'intelligenz', 'intelligenza'],
  raciocinio:   ['wit', 'astucia', 'astuce', 'geistesscharfe', 'prontezza', 'rac', 'raciocinio'],
  determinacao: ['res', 'resolucion', 'resolution', 'entschlossenheit', 'fermezza', 'det']
};
const IMP_HAB = {
  armasbrancas: ['pelea con armas', 'melee weapons', 'nahkampf', 'mischia', 'armas brancas'],
  armasfogo:    ['armas de fuego', 'armes a feu', 'schusswaffen', 'armi da fuoco', 'firearm', 'guns'],
  atletismo:    ['athletisme', 'sportlichkeit', 'atletica'],
  briga:        ['pelea', 'bagarre', 'handgemenge', 'rissa'],
  conducao:     ['conducir', 'conduite', 'fahren', 'guidare', 'driving'],
  furtividade:  ['sigilo', 'furtivite', 'heimlichkeit', 'furtivita'],
  furto:        ['latrocinio', 'larcin', 'diebeshandwerk', 'criminalita', 'ladinagem', 'furto', 'security'],
  oficios:      ['crafts', 'artesania', 'artisanat', 'handwerk', 'manualita', 'oficio'],
  sobrevivencia:['supervivencia', 'survie', 'uberleben', 'sopravvivenza'],
  adestramento: ['trato con animales', 'animaux', 'tierkunde', 'affinita animale', 'animal handling', 'empatia animal'],
  etiqueta:     ['etiquette', 'etikette', 'galateo'],
  intimidacao:  ['intimidacion', 'einschuchtern', 'intimidire'],
  lideranca:    ['liderazgo', 'commandement', 'anfuhren', 'autorita'],
  manha:        ['callejeo', 'experience de la rue', 'szenekenntnis', 'bassifondi'],
  atuacao:      ['interpretacion', 'representation', 'darbietung', 'espressivita', 'atuacao', 'expressao'],
  persuasao:    ['persuasion', 'uberzeugen', 'convincere'],
  perspicacia:  ['perspicacia', 'empathie', 'menschenkenntnis', 'intuito', 'empathy', 'empatia'],
  labia:        ['subterfugio', 'ausfluchte', 'sotterfugio', 'labia'],
  ciencias:     ['ciencia', 'sciences', 'naturwissenschaften', 'scienze', 'ciencias'],
  erudicao:     ['academicismo', 'erudition', 'geisteswissenschaften', 'accademiche', 'academicos', 'academics'],
  financas:     ['finanzas', 'finances', 'finanzen', 'finanza'],
  investigacao: ['investigacion', 'ermitteln', 'investigare'],
  medicina:     ['medecine', 'medizin'],
  ocultismo:    ['occultisme', 'okkultismus', 'occulto'],
  prontidao:    ['consciencia', 'vigilance', 'wahrnehmung', 'allerta', 'prontidao', 'alertness'],
  politica:     ['politique', 'politik'],
  tecnologia:   ['tecnologia', 'technologie', 'computer']
};
/* Disciplinas: o nome em português e em inglês vêm de disciplinas.js */
const IMP_DISC = {
  'Animalismo':           ['animalisme', 'tierhaftigkeit', 'animalita'],
  'Auspícios':            ['auspex'],
  'Celeridade':           ['celeridad', 'celerite', 'geschwindigkeit', 'velocita'],
  'Dominação':            ['dominacion', 'domination', 'beherrschung', 'dominazione', 'dominate', 'dominacao'],
  'Fortitude':            ['fortaleza', 'force d ame', 'seelenstarke', 'robustezza'],
  'Ofuscação':            ['ofuscacion', 'occultation', 'verdunkelung', 'oscurazione', 'obfuscate'],
  'Oblívio':              ['olvido', 'neant', 'vergessen', 'oblio', 'oblivion'],
  'Potência':             ['potencia', 'puissance', 'starke', 'potenza', 'potence'],
  'Presença':             ['presencia', 'presence', 'prasenz', 'ascendente'],
  'Proteanismo':          ['protean', 'proteisme', 'gestaltwandeln', 'proteide'],
  'Feitiçaria de Sangue': ['hechiceria de sangre', 'sorcellerie du sang', 'blutmagie', 'stregoneria del sangue', 'blood sorcery', 'thaumaturgy', 'taumaturgia', 'sorcery'],
  'Alquimia de Sangue-ralo': ['thin blood alchemy', 'thin blooded alchemy', 'alquimia sangue ralo', 'alquimia de sangre debil', 'alchimie du sang clair', 'alchemy', 'alquimia']
};
const IMP_CLAS = {
  'Banu Haqim': ['assamite', 'assamita', 'assamitas', 'children of haqim'],
  'Ministério': ['ministry', 'the ministry', 'ministerio', 'ministere', 'followers of set', 'setite', 'setites', 'seguidores de set'],
  'Hecata': ['giovanni', 'hecate'],
  'Sangue-ralo': ['thin blood', 'thin blooded', 'thinblood', 'sangue ralo', 'sangre debil', 'duskborn', 'sang clair'],
  'Caitiff': ['clanless', 'sem cla', 'sin clan'],
  'Lasombra': [], 'Tzimisce': [], 'Brujah': [], 'Gangrel': [], 'Malkavian': ['malkavianos', 'malkaviano'],
  'Nosferatu': [], 'Toreador': [], 'Tremere': [], 'Ventrue': [], 'Ravnos': [], 'Salubri': []
};
const IMP_SEITAS = {
  'Camarilla': ['camarilla', 'camarila', 'ivory tower'],
  'Anarquista': ['anarch', 'anarchs', 'anarquistas', 'anarquia', 'anarchici', 'anarchen'],
  'Autarca': ['autarkis', 'autarquico', 'autarca', 'autarcas'],
  'Sabbat': ['sabbat', 'saba', 'sword of caine'],
  'Ashirra': ['ashirra'],
  'Nenhuma / independente': ['independent', 'independente', 'none', 'nenhuma', 'ninguna', 'unaligned']
};
const IMP_RESS = {
  'Colérica': ['choleric', 'colerica', 'colerique', 'cholerisch', 'collerico'],
  'Melancólica': ['melancholic', 'melancolica', 'melancolique', 'melancholisch', 'malinconico'],
  'Fleumática': ['phlegmatic', 'flematica', 'fleumatica', 'flegmatique', 'phlegmatisch', 'flemmatico'],
  'Sanguínea': ['sanguine', 'sanguinea', 'sanguin', 'sanguinisch', 'sanguigno'],
  'Vazia': ['empty', 'vazia', 'vacia', 'vide', 'leer', 'vuota', 'none']
};

/* Rótulos que não são traços: identidade, trilhas, textos e "casas" de lista.
   A ordem não importa; o casamento tenta primeiro o trecho mais longo. */
const IMP_ROTULOS = {
  'meta.nome':       ['name', 'nome', 'nombre', 'nom', 'character', 'character name', 'nome do personagem', 'personagem', 'char name', 'charname', 'vampire name'],
  'meta.jogador':    ['player', 'player name', 'jogador', 'jugador', 'joueur', 'spieler', 'giocatore', 'nome do jogador'],
  'meta.cronica':    ['chronicle', 'cronica', 'chronique', 'chronik', 'campaign', 'campanha', 'chronicle name'],
  'meta.conceito':   ['concept', 'conceito', 'concepto', 'konzept', 'concetto'],
  'meta.ambicao':    ['ambition', 'ambicao', 'ambicion', 'ambizione', 'ehrgeiz'],
  'meta.desejo':     ['desire', 'desejo', 'deseo', 'desir', 'verlangen', 'desiderio'],
  'meta.cla':        ['clan', 'cla', 'clans', 'klan'],
  'meta.geracao':    ['generation', 'geracao', 'generacion', 'generazione', 'gen'],
  'meta.seita':      ['sect', 'seita', 'secta', 'secte', 'sekte', 'setta', 'faction', 'faccao'],
  'meta.senhor':     ['sire', 'senhor', 'erzeuger', 'erzeugerin', 'progenitor', 'mentor'],
  'meta.predador':   ['predator', 'predator type', 'predador', 'tipo de predador', 'depredador', 'predation', 'jagdverhalten', 'predatore', 'feeding style'],
  'meta.ressonancia':['resonance', 'ressonancia', 'resonancia', 'resonanz', 'risonanza', 'blood resonance', 'ressonancia preferida'],
  'meta.aparencia':  ['appearance', 'aparencia', 'apariencia', 'aussehen', 'aspetto', 'description', 'descricao'],
  'trilha.humanidade':['humanity', 'humanidade', 'humanidad', 'humanite', 'menschlichkeit', 'umanita'],
  'trilha.manchas':  ['stains', 'humanity stains', 'maculas', 'manchas', 'fletrissures', 'makel', 'macchie'],
  'trilha.fome':     ['hunger', 'fome', 'ansia', 'hambre', 'soif', 'fame hunger'],
  'trilha.potencia': ['blood potency', 'potencia de sangue', 'potencia de sangre', 'puissance du sang', 'blutmacht', 'potenza del sangue', 'bp'],
  'trilha.vitalidade':['health', 'vitalidade', 'saude', 'salud', 'sante', 'gesundheit', 'salute'],
  'trilha.vontade':  ['willpower', 'forca de vontade', 'fuerza de voluntad', 'volonte', 'willenskraft', 'volonta', 'wp'],
  'trilha.xpTotal':  ['total xp', 'xp total', 'total experience', 'experience total', 'experiencia total', 'xp', 'exp', 'experience', 'experiencia', 'total exp'],
  'trilha.xpGasto':  ['spent xp', 'xp spent', 'xp gasto', 'experiencia gasta', 'spent experience', 'experience spent', 'spent'],
  'trilha.xpResta':  ['remaining xp', 'xp remaining', 'xp restante', 'experiencia restante', 'available xp', 'xp disponivel', 'unspent xp'],
  'texto.tenets':    ['tenets', 'chronicle tenets', 'principios', 'principios da cronica', 'tenetes', 'grundsatze'],
  'texto.conv':      ['convictions', 'conviction', 'conviccoes', 'conviccao', 'convicciones', 'convictions et pierres de touche'],
  'texto.pedras':    ['touchstones', 'touchstone', 'pilares', 'pilar', 'piedras de toque', 'pierres de touche', 'pedras de toque'],
  'texto.conv_pedras':['touchstones convictions', 'touchstones and convictions', 'convictions touchstones', 'pilares e conviccoes', 'conviccoes e pilares', 'conviccoes pilares'],
  'texto.notas':     ['notes', 'notas', 'note', 'anotacoes', 'notizen', 'equipment', 'equipamento', 'possessions', 'posses', 'gear'],
  'texto.historia':  ['history', 'historia', 'biography', 'biografia', 'background story', 'backstory', 'geschichte', 'storia'],
  'texto.idadeAparente':['apparent age', 'idade aparente', 'edad aparente'],
  'texto.idade':     ['true age', 'idade real', 'age', 'idade', 'edad'],
  'texto.nascimento':['date of birth', 'birth', 'data de nascimento', 'nascimento', 'dob', 'born'],
  'texto.morte':     ['date of death', 'death', 'data de morte', 'morte', 'embrace', 'abraco', 'data do abraco', 'embraced'],
  'texto.tracos':    ['distinguishing features', 'distinguishing characteristics', 'tracos distintivos', 'features'],
  'texto.bane':      ['clan bane', 'bane', 'perdicao', 'perdicao do cla', 'maldicao', 'flagelo'],
  'texto.comp':      ['clan compulsion', 'compulsion', 'compulsao', 'compulsion del clan'],
  /* casas de lista: o valor é o nome do item; os pontos vêm da fileira ao lado */
  'lista.disc':      ['discipline', 'disciplines', 'disciplina', 'disciplinas', 'discipline name', 'disc'],
  'lista.poder':     ['power', 'powers', 'poder', 'poderes', 'discipline power', 'discipline powers', 'pouvoir', 'kraft'],
  'lista.ritual':    ['ritual', 'rituals', 'rituais', 'rituales', 'rituels', 'ceremony', 'ceremonies', 'cerimonia', 'cerimonias'],
  'lista.vant':      ['merit', 'merits', 'advantage', 'advantages', 'vantagem', 'vantagens', 'background', 'backgrounds', 'antecedente', 'antecedentes', 'merito', 'meritos', 'ventaja', 'ventajas', 'avantage', 'avantages', 'vorteil', 'vorteile', 'vantaggio', 'vantaggi', 'loresheet'],
  'lista.def':       ['flaw', 'flaws', 'defeito', 'defeitos', 'defecto', 'defectos', 'defaut', 'defauts', 'nachteil', 'nachteile', 'difetto', 'difetti'],
  'lista.vd':        ['advantages flaws', 'merits flaws', 'merits and flaws', 'vantagens e defeitos', 'vantagens defeitos', 'advantages and flaws', 'backgrounds merits flaws'],
  'lista.esp':       ['specialty', 'specialties', 'speciality', 'specialities', 'especializacao', 'especializacoes', 'especialidad', 'especialidades', 'specialite', 'specialites', 'spezialisierung', 'specialita', 'spec', 'specs'],
  /* títulos de seção: só servem para dar contexto às linhas seguintes */
  'secao.atr':       ['attributes', 'atributos', 'attributs', 'attribute', 'attributi', 'physical', 'social', 'mental', 'fisicos', 'sociais', 'mentais'],
  'secao.hab':       ['skills', 'habilidades', 'competences', 'fahigkeiten', 'abilita', 'abilities', 'pericias']
};
/* palavras que não carregam sentido num nome de campo */
const IMP_RUIDO = new Set(['attr', 'attrib', 'attribute', 'attributes', 'atributo', 'atributos', 'skill', 'skills', 'habilidade', 'habilidades', 'ability', 'abilities',
  'value', 'val', 'valor', 'dot', 'dots', 'box', 'boxes', 'check', 'checkbox', 'chk', 'cb', 'pip', 'pips', 'level', 'lvl', 'nivel', 'rating', 'score', 'field', 'text', 'txt', 'tf',
  'campo', 'the', 'de', 'do', 'da', 'dos', 'das', 'del', 'di', 'du', 'system', 'data', 'base', 'current', 'bubble', 'circle', 'circulo', 'ponto', 'pontos', 'bolinha', 'radio', 'button',
  'btn', 'mark', 'marca', 'fill', 'filled', 'vtm', 'v5', 'char', 'sheet', 'ficha', 'input', 'trait', 'traits', 'stat', 'stats', 'id']);

/* ---------- índices (montados na primeira vez) ---------- */
let IMP_IX = null;
function impIndices() {
  if (IMP_IX) return IMP_IX;
  const rot = new Map();
  const por = (mapa, alvo, nomes) => nomes.forEach(n => { const k = impNorm(n); if (k && !mapa.has(k)) mapa.set(k, alvo); });
  ATRIBUTOS.forEach(g => g.itens.forEach(([k, pt, en]) => por(rot, 'atr.' + k, [pt, en].concat(IMP_ATR[k] || []))));
  HABILIDADES.forEach(g => g.itens.forEach(([k, pt, en]) => por(rot, 'hab.' + k, [pt, en].concat(IMP_HAB[k] || []))));
  for (const alvo in IMP_ROTULOS) por(rot, alvo, IMP_ROTULOS[alvo]);
  const disc = new Map();
  LISTA_DISCIPLINAS.forEach(d => por(disc, d, [d, DISCIPLINAS[d].en || ''].concat(IMP_DISC[d] || [])));
  /* o nome da Disciplina como rótulo: "Auspex ●●" */
  disc.forEach((d, k) => { if (!rot.has(k)) rot.set(k, 'disc:' + d); });
  const cla = new Map();
  LISTA_CLAS.forEach(c => por(cla, c, [c].concat(IMP_CLAS[c] || [])));
  const pred = new Map();
  Object.entries(PREDADORES).forEach(([k, p]) => por(pred, k, [k, p.en && p.en !== '—' ? p.en : '']));
  /* nomes das edições em espanhol, francês, alemão e italiano */
  [['Vira-lata', 'gato callejero', 'chat de gouttiere', 'chat errant', 'streuner', 'randagio'], ['Sacoleiro', 'embolsador', 'ensacador', 'sacoleiro'],
   ['Sanguessuga', 'sanguijuela', 'sangsue', 'blutegel', 'sanguisuga'], ['Açougueiro', 'carnicero', 'boucher', 'schlachter', 'macellaio', 'cuchillo'],
   ['Consensual', 'consensuado', 'consentant', 'einvernehmlich', 'consensuale'], ['Fazendeiro', 'granjero', 'fermier', 'bauer', 'contadino'],
   ['Osíris', 'osiris'], ['Sandman', 'hombre de arena', 'marchand de sable', 'sandmann', 'uomo nero'], ['Rainha da Cena', 'reina de la escena', 'reine de la scene', 'szenekonigin', 'regina della scena'],
   ['Sereia', 'sirena', 'sirene']].forEach(([k, ...ns]) => { if (PREDADORES[k]) por(pred, k, ns); });
  const seita = new Map(); for (const s in IMP_SEITAS) por(seita, s, [s].concat(IMP_SEITAS[s]));
  const ress = new Map(); for (const r in IMP_RESS) por(ress, r, [r].concat(IMP_RESS[r]));
  const vant = new Map(), def = new Map();
  VANTAGENS.forEach(v => por(vant, v.pt, [v.pt, v.en]));
  (typeof LORESHEETS !== 'undefined' ? LORESHEETS : []).forEach(l => por(vant, l.nome, [l.nome]));
  DEFEITOS.concat(typeof DEFEITOS_DISCIPLINA !== 'undefined' ? DEFEITOS_DISCIPLINA : []).forEach(v => por(def, v.pt, [v.pt, v.en]));
  /* antecedentes com nome próprio em inglês que o app guarda com outro nome */
  por(vant, 'Refúgio', ['haven', 'refugio', 'refugium']);
  por(vant, 'Rebanho', ['herd', 'rebanho', 'rebano', 'troupeau']);
  por(vant, 'Recursos', ['resources', 'recursos', 'ressources', 'wealth']);
  por(vant, 'Status', ['status', 'estatus', 'statut']);
  por(vant, 'Lacaios', ['retainers', 'retainer', 'lacaios', 'servos']);
  por(vant, 'Máscara', ['mask', 'mascara', 'masque']);
  por(vant, 'Mawla', ['mawla']);
  por(vant, 'Influência', ['influence', 'influencia']);
  const poder = new Map();
  LISTA_DISCIPLINAS.forEach(d => (DISCIPLINAS[d].poderes || []).forEach(p => {
    [p.pt, p.en].forEach(n => { const k = impNorm(n); if (k && !poder.has(k)) poder.set(k, { disc: d, nome: p.pt, lv: p.lv }); });
  }));
  const ritual = new Map();
  if (typeof CATALOGO_RITUAL !== 'undefined') for (const d in CATALOGO_RITUAL) CATALOGO_RITUAL[d].lista.forEach(r => {
    [r.pt, r.en].forEach(n => { const k = impNorm(n); if (k && !ritual.has(k)) ritual.set(k, { disc: d, nome: r.pt, lv: r.lv }); });
  });
  const listaRot = [...rot.keys()];
  IMP_IX = { rot, listaRot, disc, cla, pred, seita, ress, vant, def, poder, ritual };
  return IMP_IX;
}

/* acha o valor de uma lista (clã, predador, vantagem…): exato, sem o que vem entre
   parênteses, ou com um erro de digitação */
function impValor(tipo, texto) {
  const ix = impIndices()[tipo];
  if (!ix || texto == null) return null;
  const bruto = String(texto).trim();
  const tentativas = [bruto, bruto.replace(/\(.*?\)|\[.*?\]/g, ''), bruto.split(/[:(\[–—]|\s-\s/)[0], bruto.replace(/[●•◉⬤■○◯◦□\d/]+/g, '')];
  for (const t of tentativas) {
    const k = impNorm(t);
    if (k && ix.has(k)) return { v: ix.get(k), aprox: false };
  }
  const k = impNorm(tentativas[2]);
  const teto = impTeto(k.length);
  if (!teto) return null;
  let melhor = null, dist = teto + 1;
  ix.forEach((v, chave) => {
    const d = impDist(k, chave, teto);
    if (d < dist) { dist = d; melhor = v; }
  });
  return melhor != null && dist <= teto ? { v: melhor, aprox: true } : null;
}

/* reconhece um rótulo (nome de campo, texto impresso, chave de JSON).
   Devolve { alvo, aprox, n } — n é o número da casa ("Discipline 2" → 2). */
function impRotulo(rotulo) {
  if (rotulo == null) return null;
  const ix = impIndices();
  const norm = impNorm(rotulo);
  if (!norm) return null;
  const nums = (norm.match(/\b\d+\b/g) || []).map(Number);
  const n = nums.length ? nums[0] : null;
  if (ix.rot.has(norm)) return { alvo: ix.rot.get(norm), aprox: false, n };
  const toks = norm.split(' ').filter(t => !/^\d+$/.test(t));
  const uteis = toks.filter(t => !IMP_RUIDO.has(t));
  for (const lista of [uteis, toks]) {
    const j = lista.join(' ');
    if (j && ix.rot.has(j)) return { alvo: ix.rot.get(j), aprox: false, n };
  }
  /* o trecho mais longo que é um termo conhecido: "Character Name" → nome, "Attr_Strength_3" → força */
  for (let tam = Math.min(uteis.length, 5); tam >= 1; tam--) {
    for (let i = 0; i + tam <= uteis.length; i++) {
      const j = uteis.slice(i, i + tam).join(' ');
      /* uma palavra curta solta no meio de um nome comprido é coincidência */
      if (tam === 1 && j.length < 4 && uteis.length > 2) continue;
      if (ix.rot.has(j)) return { alvo: ix.rot.get(j), aprox: false, n };
    }
  }
  /* um erro de digitação no rótulo inteiro */
  const j = uteis.join(' ');
  const teto = impTeto(j.length);
  if (teto) {
    let melhor = null, dist = teto + 1;
    for (const chave of ix.listaRot) {
      if (chave.length < 5) continue;
      const d = impDist(j, chave, teto);
      if (d < dist) { dist = d; melhor = chave; }
    }
    if (melhor && dist <= teto) return { alvo: ix.rot.get(melhor), aprox: true, n };
  }
  return null;
}

/* pontos escritos de qualquer jeito: "3", "●●●○○", "3/5", "•••", "x x x" */
function impPontos(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? Math.round(v) : null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v);
  const cheios = (s.match(/[●•◉⬤■⚫✦★■xX]/g) || []).length;
  if (/[●•◉⬤■○◯◦□⚪⚫]/.test(s)) return cheios;
  const m = s.match(/-?\d+/);
  return m ? Number(m[0]) : null;
}
/* separa "Allies (Effectiveness 2) ●●●" em nome, nota e pontos */
function impItem(texto) {
  const s = String(texto || '').trim();
  const pontos = (() => {
    const bolas = s.match(/[●•◉⬤○◯◦]+/);
    if (bolas) return (bolas[0].match(/[●•◉⬤]/g) || []).length;
    const m = s.match(/(?:^|[\s:(x×-])(\d)(?:\s*(?:pts?|pontos?|points?|dots?))?\s*\)?\s*$/i);
    return m ? Number(m[1]) : null;
  })();
  const nota = (s.match(/\(([^)]*)\)/) || [])[1] || '';
  const nome = s.replace(/\(.*?\)/g, '').replace(/[●•◉⬤○◯◦]+/g, '').replace(/[\s:–—-]*\d\s*(pts?|pontos?|points?|dots?)?\s*$/i, '').replace(/[\s:–—-]+$/, '').trim();
  return { nome, nota: nota.replace(/\b\d\b\s*(pts?|pontos?|points?)?$/i, '').trim(), pontos };
}

/* ============================================================
   A PROPOSTA: o que cada fonte achou, antes da conferência
   ============================================================ */
function impNovaProposta(origem) {
  return { origem, meta: {}, atr: {}, hab: {}, esp: {}, disc: [], vant: [], def: [], conv: [], trilhas: {}, textos: {},
           casas: {}, poderes: [], rituais: [], sobras: [], cont: { nome: 0, posicao: 0, texto: 0, ignorados: 0 }, avisos: [] };
}
/* registra um valor achado. `de` é o rótulo original (para a conferência mostrar
   "Strength → Força"). Devolve true se usou. */
function impAplicar(P, alvo, valor, de, aprox, n) {
  if (!alvo) return false;
  const [tipo, chave] = alvo.split(/[.:]/).length > 1 ? [alvo.slice(0, alvo.search(/[.:]/)), alvo.slice(alvo.search(/[.:]/) + 1)] : [alvo, ''];
  const txt = valor == null ? '' : String(valor).trim();
  const reg = (obj, k, v, extra) => { obj[k] = Object.assign({ v, de, aprox: !!aprox }, extra || {}); return true; };

  if (tipo === 'atr' || tipo === 'hab') {
    const p = impPontos(valor);
    if (p == null || p < 0) return false;
    const atual = P[tipo][chave];
    if (atual && atual.v >= p) return true;
    return reg(P[tipo], chave, Math.min(5, p));
  }
  if (tipo === 'disc') {
    const p = impPontos(valor);
    if (!p) return false;
    return impAddDisc(P, chave, p, de, aprox);
  }
  if (tipo === 'meta') {
    if (!txt) return false;
    if (chave === 'geracao') { const g = parseInt(txt, 10); return g >= 3 && g <= 16 ? reg(P.meta, 'geracao', g) : false; }
    const listas = { cla: 'cla', predador: 'pred', seita: 'seita', ressonancia: 'ress' };
    if (listas[chave]) {
      const r = impValor(listas[chave], txt);
      return reg(P.meta, chave, r ? r.v : txt, { bruto: txt, conhecido: !!r, aprox: !!aprox || !!(r && r.aprox) });
    }
    if (P.meta[chave] && P.meta[chave].v && P.meta[chave].v.length >= txt.length) return true;
    return reg(P.meta, chave, txt);
  }
  if (tipo === 'trilha') {
    const p = impPontos(valor);
    if (p == null) return false;
    const atual = P.trilhas[chave];
    if (atual && atual.v >= p && chave !== 'xpGasto' && chave !== 'xpResta') return true;
    return reg(P.trilhas, chave, p);
  }
  if (tipo === 'texto') {
    if (!txt) return false;
    if (chave === 'conv' || chave === 'pedras' || chave === 'conv_pedras') {
      impLinhas(txt).forEach((l, i) => impAddConv(P, chave, l, de, n != null ? n : i + 1));
      return true;
    }
    const atual = P.textos[chave];
    return reg(P.textos, chave, atual && atual.v && !atual.v.includes(txt) ? atual.v + '\n' + txt : txt);
  }
  if (tipo === 'lista') {
    if (!txt && impPontos(valor) == null) return false;
    const casa = impCasa(P, chave, n);
    if (/^-?\d+$/.test(txt) || /^[●•◉⬤○◯◦\s]+$/.test(txt)) { casa.pontos = Math.max(casa.pontos || 0, impPontos(txt)); casa.de = casa.de || de; return true; }
    if (chave === 'poder' || chave === 'ritual' || chave === 'esp') impItens(txt).forEach(l => casa.itens.push(l));
    else { casa.nome = casa.nome && casa.nome !== txt ? casa.nome + '\n' + txt : txt; casa.de = casa.de || de; casa.aprox = !!aprox; }
    return true;
  }
  if (tipo === 'vant' || tipo === 'def') {
    const p = impPontos(valor);
    P[tipo].push({ nome: chave, pontos: p || 1, nota: '', de, aprox: !!aprox, conhecido: true });
    return true;
  }
  return false;
}
const impLinhas = t => String(t).split(/\r?\n|;|•(?=\s)/).map(l => l.trim()).filter(Boolean);
/* "Etiquette (Elysium), Finance (Banking)": vírgulas fora dos parênteses separam itens */
function impItens(t) {
  const out = [];
  impLinhas(t).forEach(l => { let prof = 0, cur = ''; for (const ch of l) { if (ch === '(' || ch === '[') prof++; if (ch === ')' || ch === ']') prof = Math.max(0, prof - 1); if (ch === ',' && !prof) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); });
  return out.map(x => x.trim()).filter(Boolean);
}
function impCasa(P, tipo, n) {
  const k = tipo + ':' + (n == null ? 'x' + Object.keys(P.casas).length : n);
  return P.casas[k] = P.casas[k] || { tipo, n, nome: '', pontos: null, itens: [], de: '' };
}
function impAddConv(P, chave, linha, de, n) {
  /* "Conviction → Touchstone" ou "Touchstone: Conviction" numa linha só */
  let texto = '', pedra = '';
  const seta = linha.split(/\s*(?:→|->|=>|⇒)\s*/);
  const outro = linha.split(/\s*(?:\||\s–\s|\s—\s|\s-\s|:)\s*/);
  if (seta.length > 1) { texto = seta[0]; pedra = seta.slice(1).join(' '); }
  else if (outro.length > 1 && chave !== 'conv') {
    /* "Pilar: convicção" quando o campo é de Pilares; "Convicção – pilar" nos outros */
    if (chave === 'pedras') { pedra = outro[0]; texto = outro.slice(1).join(' '); }
    else { texto = outro[0]; pedra = outro.slice(1).join(' '); }
  }
  else if (chave === 'pedras') pedra = linha;
  else texto = linha;
  let c = P.conv.find(x => x.n === n && ((texto && !x.texto) || (pedra && !x.pedra)));
  if (!c) { c = { n, texto: '', pedra: '', de }; P.conv.push(c); }
  if (texto) c.texto = texto; if (pedra) c.pedra = pedra;
}
function impAddDisc(P, nome, nivel, de, aprox) {
  const d = P.disc.find(x => x.nome === nome);
  if (d) { if (nivel > d.nivel) d.nivel = nivel; return true; }
  P.disc.push({ nome, nivel: Math.min(5, nivel), poderes: [], rituais: [], de, aprox: !!aprox, conhecido: true });
  return true;
}

/* depois de ler tudo: as casas viram Disciplinas, Vantagens e Defeitos; os poderes
   soltos encontram a Disciplina deles pelo nome */
function impFechar(P) {
  const ordemTipo = { disc: 0, vant: 1, def: 1, vd: 1, poder: 2, ritual: 2, esp: 3 };
  const casas = Object.values(P.casas).sort((a, b) => (ordemTipo[a.tipo] - ordemTipo[b.tipo]) || ((a.n || 0) - (b.n || 0)));
  for (const c of casas) {
    if (c.tipo === 'disc' && c.nome && impLinhas(c.nome).length > 1) {
      impLinhas(c.nome).forEach(l => impItemDeSecao(P, 'lista.disc', l));
    } else if (c.tipo === 'disc' && c.nome) {
      const r = impValor('disc', c.nome);
      const nome = r ? r.v : impItem(c.nome).nome;
      const nivel = c.pontos != null ? c.pontos : (impItem(c.nome).pontos || 0);
      if (r) impAddDisc(P, nome, nivel || 1, c.de || c.nome, r.aprox);
      else P.disc.push({ nome, nivel: Math.min(5, nivel || 1), poderes: [], rituais: [], de: c.de || c.nome, aprox: false, conhecido: false });
      const alvo = P.disc.find(x => x.nome === nome);
      if (alvo) alvo._casa = c.n;
      c.itens.forEach(p => impPoderSolto(P, p, alvo));
    } else if ((c.tipo === 'vant' || c.tipo === 'def' || c.tipo === 'vd') && c.nome) {
      impLinhas(c.nome).forEach(l => impAddVant(P, c.tipo, l, c.pontos, c.de));
    } else if (c.tipo === 'poder' || c.tipo === 'ritual') {
      const disc = c.n != null ? P.disc.find(d => d._casa === c.n) : null;
      c.itens.concat(c.nome ? [c.nome] : []).forEach(p => impPoderSolto(P, p, disc, c.tipo === 'ritual'));
    } else if (c.tipo === 'esp') {
      c.itens.concat(c.nome ? [c.nome] : []).forEach(e => impEspSolta(P, e, c.de));
    } else if (c.nome || c.pontos) {
      P.sobras.push({ rotulo: c.de || c.tipo, valor: (c.nome || '') + (c.pontos ? ' (' + c.pontos + ')' : '') });
    }
  }
  P.casas = {};
  P.poderes.splice(0).forEach(p => impPoderSolto(P, p.texto, null, p.ritual));
  /* Disciplina com poderes mas sem pontos: o nível é o número de poderes */
  P.disc.forEach(d => { if (!d.nivel && d.poderes.length) d.nivel = Math.min(5, d.poderes.length); });
  /* uma Disciplina que veio pelo nome do poder e não tinha nível próprio */
  return P;
}
function impAddVant(P, tipo, linha, pontos, de) {
  const it = impItem(linha);
  if (!it.nome) return;
  const rv = impValor('vant', it.nome), rd = impValor('def', it.nome);
  let destino = tipo === 'def' ? 'def' : 'vant';
  let r = destino === 'def' ? (rd || rv) : (rv || rd);
  /* "Merits & Flaws" numa lista só: quem decide é o nome conhecido */
  if (tipo === 'vd' || tipo === 'vant' && !rv && rd) destino = rd && !rv ? 'def' : 'vant';
  if (tipo === 'def' && !rd && rv) r = rv;
  if (r === rv && destino === 'def' && rv && !rd) destino = 'vant';
  P[destino].push({ nome: r ? r.v : it.nome, pontos: it.pontos != null ? it.pontos : (pontos != null ? pontos : 1), nota: it.nota,
                    de: de ? de + ': ' + linha : linha, aprox: !!(r && r.aprox), conhecido: !!r, bruto: it.nome });
}
function impPoderSolto(P, texto, disc, ritual) {
  const nome = impItem(texto).nome || String(texto).trim();
  if (!nome) return;
  const rp = !ritual && impValor('poder', nome);
  const rr = impValor('ritual', nome);
  const r = rp || rr;
  if (r) {
    let d = disc && (!r.v.disc || disc.nome === r.v.disc || (rr && (disc.nome === 'Feitiçaria de Sangue' || disc.nome === 'Oblívio'))) ? disc : P.disc.find(x => x.nome === r.v.disc);
    if (!d) { d = { nome: r.v.disc, nivel: 0, poderes: [], rituais: [], de: texto, aprox: false, conhecido: true }; P.disc.push(d); }
    (rp ? d.poderes : d.rituais).push({ nome: r.v.nome, de: texto, aprox: r.aprox });
    return;
  }
  if (disc) disc.poderes.push({ nome, de: texto, aprox: false, desconhecido: true });
  else P.sobras.push({ rotulo: ritual ? 'Ritual' : 'Poder', valor: nome });
}
function impEspSolta(P, texto, de) {
  /* "Athletics (Running)", "Melee: Swords", "Investigação — cenas de crime" */
  const m = String(texto).match(/^(.+?)\s*(?:\(|:|–|—|-)\s*(.+?)\)?$/);
  if (m) {
    const r = impRotulo(m[1]);
    if (r && r.alvo.startsWith('hab.')) {
      const k = r.alvo.slice(4);
      (P.esp[k] = P.esp[k] || []).push(...m[2].split(/[,;\/]/).map(s => s.trim()).filter(Boolean));
      return;
    }
  }
  P.sobras.push({ rotulo: de || 'Especialização', valor: texto });
}

/* ============================================================
   FONTE 1 — PDF (pdf.js, carregado só quando alguém importa)
   ============================================================ */
let impCarregandoPdfjs = null;
async function impGarantirPdfjs(aviso) {
  if (typeof pdfjsLib !== 'undefined' && typeof pdfjsWorker !== 'undefined') return true;
  if (aviso) aviso('Carregando o leitor de PDF…');
  const arq = window.FS_PDF || {};
  impCarregandoPdfjs = impCarregandoPdfjs || (async () => {
    if (typeof pdfjsLib === 'undefined') await carregarScript(arq.pdfjs || 'pdfjs.min.js');
    /* o "worker" roda na própria página: funciona também aberto com duplo clique */
    if (typeof pdfjsWorker === 'undefined') await carregarScript(arq.pdfjsWorker || 'pdfjs.worker.min.js');
  })();
  try { await impCarregandoPdfjs; return true; }
  catch (e) { impCarregandoPdfjs = null; if (aviso) aviso('Não consegui carregar o leitor de PDF. Confira a internet e tente de novo.'); return false; }
}

/* lê campos (com posição e valor) e o texto impresso de cada página */
async function impLerPdfBruto(bytes) {
  const doc = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  const paginas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    const anots = await pg.getAnnotations({ intent: 'display' });
    const widgets = anots.filter(a => a.subtype === 'Widget' && a.fieldName).map(a => {
      const [x1, y1, x2, y2] = a.rect;
      const r = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
      let tipo = 'texto', marcado = false, valor = a.fieldValue;
      if (a.checkBox || a.radioButton) {
        tipo = 'marca';
        const v = a.fieldValue;
        if (a.radioButton) marcado = v != null && v === a.buttonValue;
        else marcado = v != null && v !== 'Off' && v !== '' && v !== false && (a.exportValue == null || v === a.exportValue || v === true || v === 'Yes' || v === 'On');
      } else if (a.fieldType === 'Ch') { valor = Array.isArray(valor) ? valor[0] : valor; }
      else if (a.fieldType === 'Btn') tipo = 'botao';
      return { pagina: p, nome: a.fieldName, dica: a.alternativeText || '', tipo, marcado, valor: valor == null ? '' : String(valor),
               exportValue: a.exportValue || a.buttonValue || '', ...r, cy: r.y + r.h / 2 };
    }).filter(w => w.tipo !== 'botao');
    const tc = await pg.getTextContent();
    const itens = tc.items.filter(i => i.str && i.str.trim()).map(i => {
      const h = Math.abs(i.transform[3]) || i.height || 8;
      return { s: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h };
    });
    paginas.push({ p, widgets, frases: impFrases(itens) });
  }
  return paginas;
}
/* junta pedaços de texto da mesma linha que estão colados: "Animal" + "Ken" */
function impFrases(itens) {
  const ord = itens.slice().sort((a, b) => (Math.abs(b.y - a.y) > Math.max(a.h, b.h) * 0.4 ? b.y - a.y : a.x - b.x));
  const out = [];
  for (const it of ord) {
    const u = out[out.length - 1];
    if (u && Math.abs(u.y - it.y) <= Math.max(u.h, it.h) * 0.4 && it.x - (u.x + u.w) < Math.max(u.h, it.h) * 0.8 && it.x >= u.x) {
      const gap = it.x - (u.x + u.w);
      u.s += (gap > it.h * 0.15 && !/\s$/.test(u.s) ? ' ' : '') + it.s; u.w = it.x + it.w - u.x; u.h = Math.max(u.h, it.h);
    } else out.push({ ...it });
  }
  return out.map(f => ({ ...f, s: f.s.replace(/\s+/g, ' ').trim(), cy: f.y + f.h * 0.35 })).filter(f => f.s);
}
/* nome do campo sem o índice do fim: "Strength_3" → "Strength", "Discipline 2 Dot 4" → "Discipline 2" */
function impBaseNome(nome) {
  let t = impNorm(nome).split(' ');
  const pontinhos = new Set(['dot', 'dots', 'box', 'pip', 'pips', 'check', 'checkbox', 'cb', 'chk', 'bubble', 'circle', 'ponto', 'bolinha', 'radio', 'mark', 'fill', 'level', 'lvl', 'nivel', 'value', 'val']);
  if (t.length > 1 && /^\d+$/.test(t[t.length - 1])) t.pop();
  while (t.length > 1 && pontinhos.has(t[t.length - 1])) t.pop();
  return t.join(' ');
}
const impGenerico = r => !r || r.alvo.startsWith('secao.');

async function impDePdf(bytes) {
  const paginas = await impLerPdfBruto(bytes);
  const total = paginas.reduce((t, p) => t + p.widgets.length, 0);
  const comValor = paginas.reduce((t, p) => t + p.widgets.filter(w => w.tipo === 'marca' ? w.marcado : w.valor.trim()).length, 0);
  /* PDF sem formulário (impresso, "achatado"): lê o texto */
  if (!total || !comValor) {
    const texto = paginas.map(p => impLinhasDaPagina(p.frases)).join('\n');
    if (!texto.trim()) throw new Error('o PDF não tem campos nem texto que eu consiga ler (pode ser uma imagem escaneada)');
    const P = impDeTexto(texto, total ? 'PDF com campos vazios (lido como texto)' : 'PDF sem campos (lido como texto)');
    P.avisos.push('Este PDF não tem campos preenchidos: li o texto impresso. Bolinhas desenhadas não dá para ler — confira os pontos.');
    return P;
  }
  const P = impNovaProposta('PDF de formulário');
  for (const pg of paginas) impPaginaPdf(P, pg);
  return impFechar(P);
}
function impLinhasDaPagina(frases) {
  const linhas = [];
  frases.slice().sort((a, b) => b.cy - a.cy || a.x - b.x).forEach(f => {
    const l = linhas.find(l => Math.abs(l.cy - f.cy) < f.h * 0.5);
    if (l) l.itens.push(f); else linhas.push({ cy: f.cy, itens: [f] });
  });
  return linhas.sort((a, b) => b.cy - a.cy).map(l => l.itens.sort((a, b) => a.x - b.x).map(f => f.s).join('\t')).join('\n');
}

function impPaginaPdf(P, pg) {
  const marcas = pg.widgets.filter(w => w.tipo === 'marca');
  const textos = pg.widgets.filter(w => w.tipo === 'texto');
  const usados = new Set();

  /* 1) marcas com nome que diz o que são: agrupa pelo nome sem o índice */
  const grupos = new Map();
  for (const w of marcas) {
    const base = impBaseNome(w.nome);
    let r = impRotulo(base);
    if (impGenerico(r) && w.dica) r = impRotulo(w.dica.replace(/\d+\s*$/, ''));
    if (impGenerico(r)) continue;
    const k = base + '|' + (r.alvo) + '|' + (r.n == null ? '' : r.n);
    if (!grupos.has(k)) grupos.set(k, { r, ws: [], de: w.dica || base });
    grupos.get(k).ws.push(w);
  }
  grupos.forEach(g => {
    const valor = impValorDeMarcas(g.ws);
    g.ws.forEach(w => usados.add(w));
    if (g.r.alvo.startsWith('lista.')) impAplicar(P, g.r.alvo, String(valor), g.de, g.r.aprox, g.r.n);
    else if (impAplicar(P, g.r.alvo, valor, g.de, g.r.aprox, g.r.n)) P.cont.nome++;
  });

  /* 2) textos com nome que diz o que são */
  const textosSemNome = [];
  for (const w of textos) {
    const v = w.valor.trim();
    if (!v) continue;
    let r = impRotulo(w.nome);
    if (impGenerico(r) && w.dica) r = impRotulo(w.dica);
    if (impGenerico(r)) { textosSemNome.push(w); continue; }
    usados.add(w);
    if (impAplicar(P, r.alvo, v, w.dica || w.nome, r.aprox, r.n)) P.cont.nome++;
  }

  /* 3) fileiras de marcas sem nome útil ("Check Box 37"): pela posição */
  const soltas = marcas.filter(w => !usados.has(w));
  for (const fileira of impFileiras(soltas)) {
    const valor = fileira.filter(w => w.marcado).length;
    const rot = impRotuloDaFileira(fileira, pg, textos);
    if (!rot) { if (valor) P.sobras.push({ rotulo: 'Fileira sem rótulo (página ' + pg.p + ')', valor: valor + ' marcada(s)' }); continue; }
    if (rot.campo) {
      /* a fileira ao lado de um campo de texto: o campo diz o nome (Disciplina, Vantagem…) */
      usados.add(rot.campo);
      const r = impRotulo(rot.campo.nome) || (rot.campo.dica && impRotulo(rot.campo.dica));
      const nome = rot.campo.valor.trim();
      if (!nome) continue;
      if (r && r.alvo.startsWith('lista.')) { impAplicar(P, r.alvo, nome, rot.campo.nome, r.aprox, r.n); impAplicar(P, r.alvo, String(valor), rot.campo.nome, false, r.n); P.cont.posicao++; continue; }
      if (impItemPorValor(P, nome, valor, 'campo ao lado das bolinhas', impRotuloAcima(rot.campo, pg))) P.cont.posicao++;
      else P.sobras.push({ rotulo: nome, valor: valor + ' ponto(s)' });
      continue;
    }
    const r = impRotulo(rot.texto);
    if (r && !impGenerico(r) && !r.alvo.startsWith('lista.') && !r.alvo.startsWith('texto.')) {
      if (impAplicar(P, r.alvo, valor, rot.texto, r.aprox, r.n)) { P.cont.posicao++; continue; }
    }
    /* "Haven ●●" impresso, sem campo: o texto é o nome do item */
    if (valor && impItemPorValor(P, rot.texto, valor, 'texto impresso', null)) { P.cont.posicao++; continue; }
    if (valor) P.sobras.push({ rotulo: rot.texto, valor: valor + ' marcada(s)' });
  }

  /* 4) textos sem nome útil: o rótulo impresso perto do campo */
  for (const w of textosSemNome) {
    if (usados.has(w)) continue;
    const v = w.valor.trim();
    const perto = impRotulosPerto(w, pg);
    let feito = false;
    for (const t of perto) {
      const r = impRotulo(t);
      if (r && !impGenerico(r)) { feito = impAplicar(P, r.alvo, v, t, r.aprox, r.n); if (feito) { P.cont.posicao++; break; } }
    }
    if (feito) continue;
    /* sem rótulo: o próprio valor pode dizer o que é (nome de poder, de clã…) */
    if (impItemPorValor(P, v, null, w.nome, perto[0])) { P.cont.posicao++; continue; }
    P.sobras.push({ rotulo: perto[0] || w.nome, valor: v });
  }
}
/* valor de um grupo de marcas: o número marcado, ou o valor exportado ("3") */
function impValorDeMarcas(ws) {
  const mesmos = ws.every(w => w.nome === ws[0].nome);
  if (mesmos && ws.length > 1) {
    const v = ws[0].valor;
    if (/^\d+$/.test(v)) return Number(v);
    const ord = ws.slice().sort((a, b) => a.x - b.x || b.y - a.y);
    const i = ord.findIndex(w => w.marcado);
    if (i >= 0 && ord.filter(w => w.marcado).length === 1 && ord.length <= 10) return Number(ord[i].exportValue) || i + 1;
  }
  return ws.filter(w => w.marcado).length;
}
/* marcas lado a lado, na mesma altura e com espaçamento de bolinhas */
function impFileiras(ws) {
  const ord = ws.slice().sort((a, b) => b.cy - a.cy || a.x - b.x);
  const linhas = [];
  for (const w of ord) {
    const l = linhas.find(l => Math.abs(l.cy - w.cy) <= Math.max(2, Math.min(l.h, w.h) * 0.5));
    if (l) l.ws.push(w); else linhas.push({ cy: w.cy, h: w.h, ws: [w] });
  }
  const fileiras = [];
  for (const l of linhas) {
    const ws2 = l.ws.sort((a, b) => a.x - b.x);
    let cur = [ws2[0]];
    for (let i = 1; i < ws2.length; i++) {
      const gap = ws2[i].x - (ws2[i - 1].x + ws2[i - 1].w);
      if (gap > Math.max(ws2[i].w * 2.5, 12)) { fileiras.push(cur); cur = []; }
      cur.push(ws2[i]);
    }
    fileiras.push(cur);
  }
  return fileiras;
}
/* o rótulo de uma fileira: o texto (ou campo) mais perto à esquerda, na mesma linha;
   senão, o texto logo acima (Vitalidade, Força de Vontade costumam vir assim) */
function impRotuloDaFileira(fileira, pg, textos) {
  const x0 = fileira[0].x, x1 = fileira[fileira.length - 1].x + fileira[fileira.length - 1].w;
  const cy = fileira.reduce((t, w) => t + w.cy, 0) / fileira.length, h = Math.max(...fileira.map(w => w.h));
  let melhor = null, folga = Infinity;
  for (const f of pg.frases) {
    const fim = f.x + f.w;
    if (fim > x0 + 3 || x0 - fim > 260) continue;
    if (Math.abs(f.cy - cy) > Math.max(h, f.h) * 0.8) continue;
    if (/^[\s●•○◯◦.·_-]+$/.test(f.s)) continue;
    if (x0 - fim < folga) { folga = x0 - fim; melhor = { texto: f.s }; }
  }
  for (const t of textos) {
    const fim = t.x + t.w;
    if (fim > x0 + 3 || x0 - fim > 60) continue;
    if (Math.abs(t.cy - cy) > Math.max(h, t.h) * 0.8) continue;
    if (x0 - fim <= folga) { folga = x0 - fim; melhor = { campo: t }; }
  }
  if (melhor) return melhor;
  /* acima, sobrepondo a fileira na horizontal */
  let acima = null, dist = Infinity;
  for (const f of pg.frases) {
    const d = f.y - (cy + h / 2);
    if (d < -1 || d > Math.max(24, h * 3)) continue;
    if (f.x > x1 || f.x + f.w < x0 - 20) continue;
    if (d < dist) { dist = d; acima = { texto: f.s }; }
  }
  return acima;
}
function impRotuloAcima(w, pg) {
  let melhor = null, dist = Infinity;
  for (const f of pg.frases) {
    const d = f.y - (w.y + w.h);
    if (d < -2 || d > 200) continue;
    if (f.x > w.x + w.w || f.x + f.w < w.x - 10) continue;
    const r = impRotulo(f.s);
    if (r && r.alvo.startsWith('lista.') && d < dist) { dist = d; melhor = r.alvo; }
  }
  return melhor;
}
/* rótulos impressos perto de um campo de texto: à esquerda, embaixo (linha de
   assinatura) e em cima, nessa ordem */
function impRotulosPerto(w, pg) {
  const esq = [], vert = [];
  for (const f of pg.frases) {
    const fim = f.x + f.w;
    if (Math.abs(f.cy - w.cy) <= Math.max(Math.min(w.h, 16), f.h) * 0.7 && fim <= w.x + 4 && w.x - fim < 160) esq.push([w.x - fim, f.s]);
    const sobrepoe = f.x < w.x + w.w && fim > w.x;
    const abaixo = w.y - (f.y + f.h), acima = f.y - (w.y + w.h);
    if (sobrepoe && abaixo >= -2 && abaixo < 14) vert.push([abaixo, f.s]);
    if (sobrepoe && acima >= -2 && acima < 16) vert.push([acima - 0.5, f.s]);
  }
  const ord = l => l.sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return [...ord(esq), ...ord(vert)];
}
/* o valor pelo que ele é: "Auspex" é Disciplina, "Allies" é Vantagem, "Brujah" é clã */
function impItemPorValor(P, texto, pontos, de, contexto) {
  const it = impItem(texto);
  const nome = it.nome || String(texto).trim();
  const p = pontos != null ? pontos : it.pontos;
  const ctx = contexto || '';
  const rd = impValor('disc', nome);
  if (rd && !['lista.vant', 'lista.def', 'lista.vd'].includes(ctx)) return impAddDisc(P, rd.v, p || 1, de + ': ' + texto, rd.aprox);
  if (ctx === 'lista.def') { impAddVant(P, 'def', texto, p, de); return true; }
  if (ctx === 'lista.vant' || ctx === 'lista.vd') { impAddVant(P, ctx === 'lista.vd' ? 'vd' : 'vant', texto, p, de); return true; }
  const rv = impValor('vant', nome), rf = impValor('def', nome);
  if ((rv || rf) && !(rv && rv.aprox && rf && rf.aprox)) { impAddVant(P, rv && !(rv.aprox && rf && !rf.aprox) ? 'vant' : 'def', texto, p, de); return true; }
  if (pontos == null) {
    const rp = impValor('poder', nome) || impValor('ritual', nome);
    if (rp && !rp.aprox) { P.poderes.push({ texto: nome, ritual: !impValor('poder', nome) }); return true; }
    const rc = impValor('cla', nome);
    if (rc && !rc.aprox && !P.meta.cla) return impAplicar(P, 'meta.cla', nome, de, false);
    const rpr = impValor('pred', nome);
    if (rpr && !rpr.aprox && !P.meta.predador) return impAplicar(P, 'meta.predador', nome, de, false);
  }
  return false;
}

/* ============================================================
   FONTE 2 — JSON (Foundry VTT WoD5e, ou um JSON qualquer)
   ============================================================ */
function impDeJson(o) {
  const ator = Array.isArray(o) ? o[0] : o;
  const sys = ator && (ator.system || ator.data);
  if (sys && (sys.attributes || sys.abilities) && sys.skills) return impDeFoundry(ator, sys);
  const P = impNovaProposta('JSON');
  impPlano(ator, []).forEach(([cam, v]) => {
    const r = impRotuloDoCaminho(cam);
    if (r && !impGenerico(r)) { if (impAplicar(P, r.alvo, v, cam.join('.'), r.aprox, r.n)) { P.cont.nome++; return; } }
    if (typeof v === 'string' && v.trim() && impItemPorValor(P, v, null, cam.join('.'), null)) { P.cont.nome++; return; }
    if (v !== '' && v != null && v !== false && v !== 0) P.sobras.push({ rotulo: cam.join('.'), valor: String(v) });
  });
  return impFechar(P);
}
function impPlano(o, cam, out) {
  out = out || [];
  if (o == null) return out;
  if (Array.isArray(o)) {
    if (o.every(x => typeof x !== 'object')) { out.push([cam, o.join('\n')]); return out; }
    o.forEach((x, i) => impPlano(x, cam.concat(String(i + 1)), out));
  } else if (typeof o === 'object') {
    /* {name: "Allies", value: 3} vira um par só */
    const nomeK = ['name', 'nome', 'label'].find(k => typeof o[k] === 'string');
    const valK = ['value', 'valor', 'level', 'dots', 'rating', 'points', 'pontos', 'nivel'].find(k => typeof o[k] === 'number' || typeof o[k] === 'string');
    if (nomeK && valK && Object.keys(o).length <= 6) { out.push([cam.concat(o[nomeK]), o[valK]]); return out; }
    for (const k in o) impPlano(o[k], cam.concat(k), out);
  } else out.push([cam, o]);
  return out;
}
function impRotuloDoCaminho(cam) {
  const sem = cam.filter(k => !IMP_RUIDO.has(impNorm(k)) && !/^\d+$/.test(k));
  for (let i = sem.length - 1; i >= 0; i--) {
    const r = impRotulo(sem.slice(i).join(' '));
    if (r && !impGenerico(r)) return r;
    const r2 = impRotulo(sem[i]);
    if (r2 && !impGenerico(r2)) return Object.assign({}, r2, { n: r2.n != null ? r2.n : Number(cam.find(k => /^\d+$/.test(k))) || null });
  }
  return null;
}
function impDeFoundry(ator, sys) {
  const P = impNovaProposta('Foundry VTT (WoD5e)');
  const ap = (alvo, v, de) => { if (impAplicar(P, alvo, v, de)) P.cont.nome++; };
  ap('meta.nome', ator.name, 'name');
  const h = sys.headers || {};
  [['concept', 'meta.conceito'], ['chronicle', 'meta.cronica'], ['ambition', 'meta.ambicao'], ['desire', 'meta.desejo'], ['sire', 'meta.senhor'],
   ['generation', 'meta.geracao'], ['tenets', 'texto.tenets'], ['touchstones', 'texto.conv_pedras']].forEach(([k, alvo]) => {
    const v = h[k] != null ? h[k] : sys[k];
    if (v) ap(alvo, impSemHtml(v), 'headers.' + k);
  });
  const attrs = sys.attributes || sys.abilities || {};
  for (const k in attrs) { const r = impRotulo(k); if (r && r.alvo.startsWith('atr.')) ap(r.alvo, attrs[k].value, 'attributes.' + k); }
  for (const k in sys.skills || {}) {
    const sk = sys.skills[k], r = impRotulo(k === 'animalken' ? 'animal ken' : k);
    if (!r || !r.alvo.startsWith('hab.')) continue;
    ap(r.alvo, sk.value, 'skills.' + k);
    const esp = [].concat((sk.bonuses || []).map(b => b && b.source), sk.specialties || [], sk.specialty ? [sk.specialty] : []).filter(Boolean);
    if (esp.length) P.esp[r.alvo.slice(4)] = esp.map(String);
  }
  for (const k in sys.disciplines || {}) {
    const d = sys.disciplines[k], r = impValor('disc', k === 'sorcery' ? 'blood sorcery' : k === 'alchemy' ? 'thin blood alchemy' : k);
    if (r && Number(d.value)) impAddDisc(P, r.v, Number(d.value), 'disciplines.' + k, false);
  }
  if (sys.hunger) ap('trilha.fome', sys.hunger.value, 'hunger');
  if (sys.humanity) { ap('trilha.humanidade', sys.humanity.value, 'humanity'); if (sys.humanity.stains) ap('trilha.manchas', sys.humanity.stains, 'humanity.stains'); }
  if (sys.blood && sys.blood.potency != null) ap('trilha.potencia', sys.blood.potency, 'blood.potency');
  if (sys.blood && sys.blood.generation) ap('meta.geracao', sys.blood.generation, 'blood.generation');
  if (sys.exp) { if (sys.exp.max) ap('trilha.xpTotal', sys.exp.max, 'exp.max'); if (sys.exp.max != null && sys.exp.value != null) ap('trilha.xpGasto', sys.exp.max - sys.exp.value, 'exp'); }
  if (sys.notes) ap('texto.notas', impSemHtml(sys.notes), 'notes');
  if (sys.biography || (sys.bio && sys.bio.history)) ap('texto.historia', impSemHtml(sys.biography || sys.bio.history), 'biography');
  if (sys.appearance) ap('meta.aparencia', impSemHtml(sys.appearance), 'appearance');
  for (const it of ator.items || []) {
    const s = it.system || it.data || {};
    const tipo = String(it.type || '').toLowerCase();
    if (tipo === 'clan') ap('meta.cla', it.name, 'item: clan');
    else if (tipo === 'predatortype') ap('meta.predador', it.name, 'item: predator type');
    else if (tipo === 'resonance') ap('meta.ressonancia', it.name, 'item: resonance');
    else if (tipo === 'power') {
      const rd = impValor('disc', s.discipline === 'sorcery' ? 'blood sorcery' : s.discipline === 'alchemy' ? 'thin blood alchemy' : s.discipline || '');
      const disc = rd ? P.disc.find(d => d.nome === rd.v) || (impAddDisc(P, rd.v, 0, 'item: power', false), P.disc.find(d => d.nome === rd.v)) : null;
      impPoderSolto(P, it.name, disc, s.discipline === 'rituals' || s.discipline === 'ceremonies');
      P.cont.nome++;
    } else if (tipo === 'feature') {
      const ft = String(s.featuretype || 'merit').toLowerCase();
      impAddVant(P, ft === 'flaw' ? 'def' : 'vant', it.name + (s.points ? ' ' + s.points : ''), Number(s.points) || null, 'item: ' + ft);
      P.cont.nome++;
    } else if (tipo === 'specialty') impEspSolta(P, (s.skill || '') + ' (' + it.name + ')', 'item: specialty');
  }
  return impFechar(P);
}
const impSemHtml = h => String(h || '').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();

/* ============================================================
   FONTE 3 — texto (colado, ou de um PDF sem campos)
   ============================================================ */
function impDeTexto(texto, origem) {
  const P = impNovaProposta(origem || 'Texto colado');
  let secao = '';
  const linhas = String(texto).replace(/\r/g, '').split('\n');
  for (let bruta of linhas) {
    const linha = bruta.replace(/ /g, ' ').trim();
    if (!linha) continue;
    /* título de seção sozinho na linha: "Merits", "DISCIPLINES", "Vantagens & Defeitos" */
    const soTitulo = linha.replace(/[:#*=_\-–—]+$/, '').replace(/^[#*=_\-–—\s]+/, '').trim();
    const rt = !/\d|[●•○]/.test(soTitulo) && soTitulo.split(' ').length <= 4 ? impRotulo(soTitulo) : null;
    if (rt && (rt.alvo.startsWith('lista.') || rt.alvo.startsWith('secao.') || rt.alvo.startsWith('texto.')) && !/[:=]\s*\S/.test(linha)) {
      secao = rt.alvo; continue;
    }
    const pedacos = linha.split(/\t+|\s{2,}|\s\|\s|;\s*|,\s+(?=[A-ZÀ-Ý][^,]*?(?:\d|[●•]))/).map(s => s.trim()).filter(Boolean);
    let usou = false;
    for (const pd of pedacos) usou = impPedacoTexto(P, pd, secao) || usou;
    if (!usou) {
      /* "Strength 3 Dexterity 2 Stamina 2" numa linha só */
      const re = /([A-Za-zÀ-ÿ'][A-Za-zÀ-ÿ' &\-]*?)\s*[:=\-–]?\s*(\d|[●•◉⬤][●•◉⬤○◯◦]*)(?=\s|$|,)/g;
      let m, achou = 0;
      while ((m = re.exec(linha))) {
        const r = impRotulo(m[1]);
        if (r && !impGenerico(r) && !r.alvo.startsWith('lista.') && impAplicar(P, r.alvo, m[2], m[1].trim(), r.aprox, r.n)) achou++;
      }
      if (achou) { P.cont.texto += achou; continue; }
      if (secao.startsWith('texto.')) { impAplicar(P, secao, linha, 'seção', false); continue; }
      P.sobras.push({ rotulo: secao ? '(' + secao.split('.')[1] + ')' : 'linha', valor: linha });
    }
  }
  return impFechar(P);
}
function impPedacoTexto(P, pd, secao) {
  /* "Rótulo: valor" */
  const m = pd.match(/^([^:=]{1,40}?)\s*[:=]\s*(.+)$/);
  if (m) {
    const r = impRotulo(m[1]);
    if (r && !impGenerico(r)) {
      if (r.alvo.startsWith('lista.')) {
        const tipo = r.alvo.slice(6);
        impLinhas(m[2].replace(/,\s*/g, ';')).forEach(item => impItemDeSecao(P, 'lista.' + tipo, item));
        P.cont.texto++; return true;
      }
      if (impAplicar(P, r.alvo, m[2], m[1].trim(), r.aprox, r.n)) {
        const esp = r.alvo.startsWith('hab.') && m[2].match(/\(([^)]+)\)/);
        if (esp) impEspSolta(P, m[1] + ' (' + esp[1] + ')');
        P.cont.texto++; return true;
      }
    }
  }
  /* "Rótulo ●●●○○" ou "Rótulo 3" ou "Rótulo 3/5" */
  const m2 = pd.match(/^(.+?)\s*[-–:]?\s*((?:[●•◉⬤○◯◦]\s*){1,10}|\d{1,2}(?:\s*\/\s*\d{1,2})?)\s*(\(.*\))?$/);
  if (m2) {
    const r = impRotulo(m2[1]);
    if (r && !impGenerico(r) && !r.alvo.startsWith('lista.') && !r.alvo.startsWith('texto.')) {
      if (impAplicar(P, r.alvo, m2[2], m2[1].trim(), r.aprox, r.n)) {
        if (m2[3] && r.alvo.startsWith('hab.')) impEspSolta(P, m2[1] + ' (' + m2[3].slice(1, -1) + ')');
        P.cont.texto++; return true;
      }
    }
  }
  if (secao && (secao.startsWith('lista.'))) { impItemDeSecao(P, secao, pd); P.cont.texto++; return true; }
  if (secao.startsWith('texto.')) { impAplicar(P, secao, pd, 'seção', false); return true; }
  return false;
}
function impItemDeSecao(P, secao, item) {
  const tipo = secao.slice(6);
  if (tipo === 'disc' && /^\s*[(\[-]|^\s*[•·*]/.test(item) && P.disc.length) {
    /* "(Awe, Daunt)" ou "- Awe" logo abaixo da Disciplina: são os poderes dela */
    const ult = P.disc[P.disc.length - 1];
    item.replace(/^[\s(\[•·*-]+|[)\]]+\s*$/g, '').split(/[,;?\/]+/).map(x => x.trim()).filter(Boolean).forEach(x => impPoderSolto(P, x, ult));
    return;
  }
  if (tipo === 'disc') { if (!impItem(item).nome) return; if (!impItemPorValor(P, item, null, 'Disciplinas', 'lista.disc')) { const it = impItem(item); P.disc.push({ nome: it.nome, nivel: it.pontos || 1, poderes: [], rituais: [], de: item, conhecido: false }); } }
  else if (tipo === 'vant' || tipo === 'def' || tipo === 'vd') impAddVant(P, tipo, item, null, '');
  else if (tipo === 'poder' || tipo === 'ritual') P.poderes.push({ texto: item, ritual: tipo === 'ritual' });
  else if (tipo === 'esp') impEspSolta(P, item);
  else P.sobras.push({ rotulo: secao, valor: item });
}

/* ============================================================
   CONFERÊNCIA — a pessoa vê o que foi lido, corrige e só então cria a ficha
   ============================================================ */
let IMP_P = null;
const IMP_META = [['nome', 'Nome'], ['jogador', 'Jogador'], ['cronica', 'Crônica'], ['conceito', 'Conceito'], ['ambicao', 'Ambição'], ['desejo', 'Desejo'],
  ['cla', 'Clã'], ['geracao', 'Geração'], ['seita', 'Seita'], ['senhor', 'Senhor (sire)'], ['predador', 'Tipo de Predador'], ['ressonancia', 'Ressonância']];
const IMP_TRILHAS = [['humanidade', 'Humanidade', 0, 10], ['manchas', 'Máculas', 0, 10], ['fome', 'Fome', 0, 5], ['potencia', 'Potência de Sangue', 0, 10],
  ['xpTotal', 'XP total', 0, 9999], ['xpGasto', 'XP gasto', 0, 9999]];
const IMP_TEXTOS = [['tenets', 'Princípios da crônica'], ['notas', 'Notas'], ['historia', 'História'], ['tracos', 'Traços distintivos'],
  ['idade', 'Idade real'], ['idadeAparente', 'Idade aparente'], ['nascimento', 'Nascimento'], ['morte', 'Morte / Abraço'], ['bane', 'Perdição (bane)'], ['comp', 'Compulsão']];
const impE = s => (typeof esc === 'function' ? esc : x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]))(s == null ? '' : s);

/* o que foi lido de onde: "Strength" → mostra só quando difere do nome daqui */
function impDe(o, aqui) {
  if (!o || !o.de) return '';
  const de = String(o.de);
  if (aqui && impNorm(de) === impNorm(aqui)) return o.aprox ? '<span class="imp-de aprox">confira</span>' : '';
  return `<span class="imp-de${o.aprox ? ' aprox' : ''}" title="${impE(de)}">${o.aprox ? 'confira · ' : ''}lido de “${impE(de.length > 40 ? de.slice(0, 38) + '…' : de)}”</span>`;
}
function impOpcoes(lista, atual, vazio) {
  const tem = lista.includes(atual);
  return (vazio != null ? `<option value="">${impE(vazio)}</option>` : '') +
    (!tem && atual ? `<option value="${impE(atual)}" selected>${impE(atual)} (como está)</option>` : '') +
    lista.map(x => `<option${x === atual ? ' selected' : ''}>${impE(x)}</option>`).join('');
}

function impTelaConferir(P) {
  const n = k => P.meta[k] ? P.meta[k].v : '';
  const aprox = [].concat(Object.values(P.meta), Object.values(P.atr), Object.values(P.hab), Object.values(P.trilhas), P.disc, P.vant, P.def).filter(x => x && x.aprox).length;
  const lidos = P.cont.nome + P.cont.posicao + P.cont.texto;
  const partes = [];
  if (P.cont.nome) partes.push(`${P.cont.nome} pelo nome do campo`);
  if (P.cont.posicao) partes.push(`${P.cont.posicao} pela posição na página`);
  if (P.cont.texto) partes.push(`${P.cont.texto} no texto`);

  const campoMeta = ([k, rot]) => {
    const o = P.meta[k], v = n(k);
    let ctrl;
    if (k === 'cla') ctrl = `<select class="f" data-imp="meta.cla">${impOpcoes(LISTA_CLAS, v, '—')}</select>`;
    else if (k === 'predador') ctrl = `<select class="f" data-imp="meta.predador">${impOpcoes(Object.keys(PREDADORES).filter(x => x !== 'Personalizado'), v, '—')}</select>`;
    else if (k === 'seita') ctrl = `<select class="f" data-imp="meta.seita">${impOpcoes(SEITAS, v, '—')}</select>`;
    else if (k === 'ressonancia') ctrl = `<select class="f" data-imp="meta.ressonancia">${impOpcoes(Object.keys(RESSONANCIAS), v, '—')}</select>`;
    else if (k === 'geracao') ctrl = `<select class="f" data-imp="meta.geracao">${Array.from({ length: 13 }, (_, i) => 4 + i).map(g => `<option value="${g}"${Number(v || 13) === g ? ' selected' : ''}>${g}ª</option>`).join('')}</select>`;
    else ctrl = `<input class="f" data-imp="meta.${k}" value="${impE(v)}">`;
    const naoAchou = o && o.conhecido === false ? `<span class="imp-de aprox">“${impE(o.bruto)}” não está na lista daqui</span>` : '';
    return `<div class="imp-campo${o && o.aprox ? ' aprox' : ''}${!o ? ' imp-vazio' : ''}"><label class="lbl">${rot}</label>${ctrl}${naoAchou || impDe(o, v)}</div>`;
  };
  const tracos = (grupos, tipo, min) => grupos.map(g => `<div class="imp-grupo"><div class="lbl">${impE(g.cat)}</div>${g.itens.map(([k, pt, en]) => {
    const o = P[tipo][k];
    return `<label class="imp-traco${o && o.aprox ? ' aprox' : ''}${!o ? ' imp-vazio' : ''}" title="${impE(o ? 'lido de “' + o.de + '”' : 'não encontrado na ficha')}">
      <span class="nm">${impE(pt)}<small>${impE(o && impNorm(o.de) !== impNorm(pt) && impNorm(o.de) !== impNorm(en) ? '“' + o.de + '”' : en)}</small></span>
      <input class="f" type="number" min="${min}" max="5" inputmode="numeric" data-imp="${tipo}.${k}" value="${o ? o.v : min}"></label>`;
  }).join('')}</div>`).join('');

  const esp = Object.entries(P.esp).filter(([, l]) => l.length);
  const nomeHab = k => { for (const g of HABILIDADES) for (const i of g.itens) if (i[0] === k) return i[1]; return k; };
  const sobras = P.sobras.filter(x => String(x.valor).trim());
  const destinos = [['', 'Ignorar'], ['notas', 'Pôr nas Notas'], ['vant', 'É uma Vantagem'], ['def', 'É um Defeito'], ['disc', 'É uma Disciplina'], ['poder', 'É um poder de Disciplina']]
    .concat(IMP_META.filter(([k]) => !['cla', 'predador', 'seita', 'ressonancia', 'geracao'].includes(k)).map(([k, r]) => ['meta.' + k, 'Campo: ' + r]))
    .concat(IMP_TEXTOS.map(([k, r]) => ['texto.' + k, 'Texto: ' + r]))
    .concat(ATRIBUTOS.flatMap(g => g.itens.map(([k, pt]) => ['atr.' + k, 'Atributo: ' + pt])))
    .concat(HABILIDADES.flatMap(g => g.itens.map(([k, pt]) => ['hab.' + k, 'Habilidade: ' + pt])));

  return `
  <div class="imp-resumo">
    <p><strong>${impE(P.origem)}.</strong> ${lidos ? `Reconheci ${lidos} ${lidos === 1 ? 'item' : 'itens'}${partes.length ? ' — ' + partes.join(', ') : ''}.` : 'Não reconheci quase nada: confira se é mesmo uma ficha de Vampiro.'}
    Confira abaixo e corrija o que precisar; nada é criado até você confirmar.</p>
    ${aprox ? `<p class="imp-alerta"><span class="pip under" aria-hidden="true"></span>${aprox} ${aprox === 1 ? 'termo foi reconhecido' : 'termos foram reconhecidos'} por aproximação e ${aprox === 1 ? 'está marcado' : 'estão marcados'} em âmbar.</p>` : ''}
    ${sobras.length ? `<p class="imp-alerta"><span class="pip under" aria-hidden="true"></span>${sobras.length} ${sobras.length === 1 ? 'item não foi reconhecido e está' : 'itens não foram reconhecidos e estão'} em “Não reconhecido”, no fim.</p>` : ''}
    ${P.avisos.map(a => `<p class="imp-alerta"><span class="pip under" aria-hidden="true"></span>${impE(a)}</p>`).join('')}
  </div>

  <section class="imp-sec"><h3>Identidade</h3><div class="fields c3">${IMP_META.map(campoMeta).join('')}</div></section>

  <section class="imp-sec"><h3>Atributos</h3><div class="imp-tracos">${tracos(ATRIBUTOS, 'atr', 1)}</div></section>
  <section class="imp-sec"><h3>Habilidades</h3><div class="imp-tracos">${tracos(HABILIDADES, 'hab', 0)}</div>
    ${esp.length ? `<div class="imp-lista" style="margin-top:12px"><div class="lbl">Especializações</div>${esp.map(([k, l]) => `<div class="imp-linha"><span class="imp-rot">${impE(nomeHab(k))}</span><input class="f grow" data-imp="esp.${k}" value="${impE(l.join(', '))}"></div>`).join('')}</div>` : ''}
  </section>

  <section class="imp-sec"><h3>Disciplinas <span class="imp-n">${P.disc.length}</span></h3>
    ${P.disc.length ? P.disc.map((d, i) => `<div class="imp-linha${d.aprox ? ' aprox' : ''}">
      <select class="f" data-imp="disc.${i}.nome" aria-label="Disciplina">${impOpcoes(LISTA_DISCIPLINAS, d.nome)}</select>
      <input class="f num" type="number" min="0" max="5" data-imp="disc.${i}.nivel" value="${d.nivel}" aria-label="Nível">
      <input class="f grow" data-imp="disc.${i}.poderes" value="${impE(d.poderes.map(p => p.nome).join(', '))}" placeholder="poderes, separados por vírgula" aria-label="Poderes">
      ${d.rituais.length ? `<input class="f grow" data-imp="disc.${i}.rituais" value="${impE(d.rituais.map(p => p.nome).join(', '))}" aria-label="Rituais">` : ''}
      <button type="button" class="x" data-imp-rm="disc.${i}" aria-label="Remover">✕</button>
      ${impDe(d, d.nome)}${d.conhecido === false ? '<span class="imp-de aprox">não é uma Disciplina daqui</span>' : ''}${d.poderes.some(p => p.desconhecido) ? '<span class="imp-de aprox">há poderes que não conheço: ficam como escritos</span>' : ''}
    </div>`).join('') : '<p class="note">Nenhuma Disciplina encontrada.</p>'}
  </section>

  <section class="imp-sec"><h3>Vantagens e Defeitos <span class="imp-n">${P.vant.length + P.def.length}</span></h3>
    ${P.vant.concat(P.def).length ? P.vant.map((v, i) => ['vant', v, i]).concat(P.def.map((v, i) => ['def', v, i])).map(([t, v, i]) => `<div class="imp-linha${v.aprox ? ' aprox' : ''}">
      <select class="f" data-imp="${t}.${i}.tipo" aria-label="Tipo"><option value="vant"${t === 'vant' ? ' selected' : ''}>Vantagem</option><option value="def"${t === 'def' ? ' selected' : ''}>Defeito</option></select>
      <input class="f grow" data-imp="${t}.${i}.nome" value="${impE(v.nome)}" list="imp-lista-vd" aria-label="Nome">
      <input class="f num" type="number" min="0" max="6" data-imp="${t}.${i}.pontos" value="${v.pontos}" aria-label="Pontos">
      <input class="f grow" data-imp="${t}.${i}.nota" value="${impE(v.nota)}" placeholder="detalhe" aria-label="Detalhe">
      <button type="button" class="x" data-imp-rm="${t}.${i}" aria-label="Remover">✕</button>
      ${v.conhecido ? impDe(v, v.nome) : `<span class="imp-de aprox">“${impE(v.bruto || v.nome)}” não está na lista daqui: fica como escrito</span>`}
    </div>`).join('') : '<p class="note">Nenhuma encontrada.</p>'}
    <datalist id="imp-lista-vd">${VANTAGENS.concat(DEFEITOS).map(v => `<option value="${impE(v.pt)}">`).join('')}</datalist>
  </section>

  <section class="imp-sec"><h3>Moralidade e trilhas</h3>
    <div class="imp-tracos imp-trilhas">${IMP_TRILHAS.map(([k, r, mi, ma]) => {
      const o = P.trilhas[k];
      const v = o ? o.v : (k === 'xpGasto' && P.trilhas.xpTotal && P.trilhas.xpResta ? Math.max(0, P.trilhas.xpTotal.v - P.trilhas.xpResta.v) : (k === 'humanidade' ? 7 : k === 'fome' ? 1 : k === 'potencia' ? '' : 0));
      return `<label class="imp-traco${o && o.aprox ? ' aprox' : ''}${!o ? ' imp-vazio' : ''}"><span class="nm">${r}${o && o.de ? `<small>“${impE(o.de)}”</small>` : ''}</span>
        <input class="f" type="number" min="${mi}" max="${ma}" data-imp="trilhas.${k}" value="${v}"${k === 'potencia' ? ' placeholder="pela geração"' : ''}></label>`;
    }).join('')}</div>
    ${P.conv.length ? `<div class="imp-lista" style="margin-top:12px"><div class="lbl">Convicções e Pilares</div>${P.conv.map((c, i) => `<div class="imp-linha">
      <input class="f grow" data-imp="conv.${i}.texto" value="${impE(c.texto)}" placeholder="convicção" aria-label="Convicção">
      <input class="f grow" data-imp="conv.${i}.pedra" value="${impE(c.pedra)}" placeholder="pilar" aria-label="Pilar">
      <button type="button" class="x" data-imp-rm="conv.${i}" aria-label="Remover">✕</button></div>`).join('')}</div>` : ''}
  </section>

  ${IMP_TEXTOS.some(([k]) => P.textos[k]) || P.meta.aparencia ? `<section class="imp-sec"><h3>Textos</h3><div class="fields c2">
    ${IMP_TEXTOS.filter(([k]) => P.textos[k]).map(([k, r]) => `<div><label class="lbl">${r}</label><textarea class="f" rows="3" data-imp="textos.${k}">${impE(P.textos[k].v)}</textarea>${impDe(P.textos[k], r)}</div>`).join('')}
    ${P.meta.aparencia ? `<div><label class="lbl">Aparência</label><textarea class="f" rows="3" data-imp="meta.aparencia">${impE(P.meta.aparencia.v)}</textarea></div>` : ''}
  </div></section>` : ''}

  ${sobras.length ? `<section class="imp-sec"><h3>Não reconhecido <span class="imp-n">${sobras.length}</span></h3>
    <p class="note" style="margin:0 0 8px">Diga o que cada um é, ou deixe em “Ignorar”. <button type="button" class="btn sm ghost" data-imp-todas="notas">Mandar tudo para as Notas</button></p>
    ${sobras.map((x, i) => `<div class="imp-linha"><span class="imp-rot" title="${impE(x.rotulo)}">${impE(x.rotulo)}</span><span class="imp-val" title="${impE(x.valor)}">${impE(x.valor)}</span>
      <select class="f" data-imp="sobras.${P.sobras.indexOf(x)}.destino" aria-label="Usar como">${destinos.map(([v, r]) => `<option value="${v}"${(x.destino || '') === v ? ' selected' : ''}>${impE(r)}</option>`).join('')}</select></div>`).join('')}
  </section>` : ''}`;
}

/* abre a conferência com uma proposta */
function impConferir(P) {
  IMP_P = P;
  const b = el('dlg-conferir-b');
  b.innerHTML = impTelaConferir(P);
  uiFecharDialogos();
  uiAbrirDialogo('dlg-conferir');
  b.scrollTop = 0;
}
function impRedesenhar() {
  const b = el('dlg-conferir-b'), top = b.scrollTop;
  b.innerHTML = impTelaConferir(IMP_P);
  b.scrollTop = top;
}
/* o que se muda na conferência vai para a proposta */
function impEditar(t) {
  const caminho = t.dataset.imp.split('.'), P = IMP_P;
  const v = t.value;
  const num = x => x === '' ? null : Math.max(Number(t.min || 0), Math.min(Number(t.max || 99), Number(x)));
  const [a, b, c] = caminho;
  if (a === 'meta') { P.meta[b] = Object.assign(P.meta[b] || {}, { v: b === 'geracao' ? Number(v) : v, aprox: false, conhecido: true }); return; }
  if (a === 'atr' || a === 'hab') { P[a][b] = Object.assign(P[a][b] || { de: '' }, { v: num(v) || 0, aprox: false }); return; }
  if (a === 'trilhas') { if (v === '') delete P.trilhas[b]; else P.trilhas[b] = Object.assign(P.trilhas[b] || { de: '' }, { v: num(v), aprox: false }); return; }
  if (a === 'textos') { P.textos[b] = Object.assign(P.textos[b] || {}, { v }); return; }
  if (a === 'esp') { P.esp[b] = v.split(',').map(x => x.trim()).filter(Boolean); return; }
  if (a === 'conv') { P.conv[b][c] = v; return; }
  if (a === 'sobras') { P.sobras[b].destino = v; return; }
  if (a === 'disc') {
    const d = P.disc[b];
    if (c === 'nome') { d.nome = v; d.aprox = false; d.conhecido = true; }
    else if (c === 'nivel') d.nivel = num(v) || 0;
    else if (c === 'poderes') d.poderes = v.split(',').map(x => x.trim()).filter(Boolean).map(nome => ({ nome }));
    else if (c === 'rituais') d.rituais = v.split(',').map(x => x.trim()).filter(Boolean).map(nome => ({ nome }));
    return;
  }
  if (a === 'vant' || a === 'def') {
    const it = P[a][b];
    if (c === 'tipo' && v !== a) { P[a].splice(Number(b), 1); P[v].push(it); impRedesenhar(); return; }
    if (c === 'pontos') it.pontos = num(v) || 0; else it[c] = v;
    if (c === 'nome') { const r = impValor(a, v); it.conhecido = !!r; it.aprox = false; }
  }
}

/* a ficha de verdade, a partir da proposta conferida */
function impMontarEstado(P) {
  const s = novoEstado();
  s.sistema = 'vampiro'; s.forja.sistema = 'vampiro';
  s.importada = { origem: P.origem, em: new Date().toISOString() };
  for (const k in P.meta) if (P.meta[k] && P.meta[k].v != null && P.meta[k].v !== '') s.meta[k] = P.meta[k].v;
  if (!s.meta.geracao) s.meta.geracao = 13;
  const cla = CLAS[s.meta.cla];
  if (cla) { s.bane = cla.bane; s.comp = cla.comp; }
  for (const k in P.atr) if (k in s.atr) s.atr[k] = Math.max(1, Math.min(5, P.atr[k].v || 1));
  for (const k in P.hab) if (k in s.hab) s.hab[k] = Math.max(0, Math.min(5, P.hab[k].v || 0));
  for (const k in P.esp) if (k in s.esp && P.esp[k].length) s.esp[k] = [...new Set(P.esp[k])].join(', ');
  const vistos = new Set();
  s.disc = P.disc.filter(d => d.nome && !vistos.has(d.nome) && vistos.add(d.nome)).map(d => ({
    nome: d.nome, nivel: Math.max(0, Math.min(5, d.nivel || 0)),
    poderes: [...new Set(d.poderes.map(p => p.nome))], rituais: [...new Set(d.rituais.map(p => p.nome))].join('\n')
  })).filter(d => d.nivel || d.poderes.length);
  s.vant = P.vant.filter(v => v.nome).map(v => ({ nome: v.nome, pontos: v.pontos, nota: v.nota || '', fonte: 'user' }));
  s.def = P.def.filter(v => v.nome).map(v => ({ nome: v.nome, pontos: v.pontos, nota: v.nota || '', fonte: 'user' }));
  s.conv = P.conv.filter(c => c.texto || c.pedra).map(c => ({ texto: c.texto || '', pedra: c.pedra || '' }));
  const tr = k => P.trilhas[k] ? P.trilhas[k].v : null;
  if (tr('humanidade') != null) s.humanidade = Math.max(0, Math.min(10, tr('humanidade')));
  if (tr('manchas') != null) s.manchas = Math.max(0, Math.min(10, tr('manchas')));
  if (tr('fome') != null) s.fome = Math.max(0, Math.min(5, tr('fome')));
  if (tr('potencia') != null && tr('potencia') !== potenciaPorGeracao(Number(s.meta.geracao) || 13)) s.bpOverride = Math.max(0, Math.min(10, tr('potencia')));
  if (tr('xpTotal') != null) s.xpTotal = tr('xpTotal');
  if (tr('xpGasto') != null) s.xpGasto = tr('xpGasto');
  else if (tr('xpTotal') != null && tr('xpResta') != null) s.xpGasto = Math.max(0, tr('xpTotal') - tr('xpResta'));
  const tx = k => P.textos[k] ? P.textos[k].v : '';
  s.tenets = tx('tenets');
  if (tx('bane')) s.bane = tx('bane');
  if (tx('comp')) s.comp = tx('comp');
  s.extra = { historia: tx('historia'), tracos: tx('tracos'), idadeAparente: tx('idadeAparente'), nascimento: tx('nascimento'), morte: tx('morte') };
  const notas = [tx('notas'), tx('idade') ? 'Idade: ' + tx('idade') : ''];
  /* o que a pessoa mandou de "Não reconhecido" para algum lugar */
  for (const x of P.sobras) {
    const d = x.destino;
    if (!d) continue;
    if (d === 'notas') notas.push(x.rotulo && !/^linha|^\(/.test(x.rotulo) ? x.rotulo + ': ' + x.valor : x.valor);
    else if (d === 'vant' || d === 'def') { const it = impItem(x.valor.match(/^\d/) ? x.rotulo + ' ' + x.valor : x.valor); const r = impValor(d, it.nome); s[d].push({ nome: r ? r.v : it.nome, pontos: it.pontos || impPontos(x.valor) || 1, nota: it.nota, fonte: 'user' }); }
    else if (d === 'disc') { const it = impItem(/^\d/.test(x.valor) ? x.rotulo + ' ' + x.valor : x.valor); const r = impValor('disc', it.nome); s.disc.push({ nome: r ? r.v : it.nome, nivel: it.pontos || impPontos(x.valor) || 1, poderes: [], rituais: '' }); }
    else if (d === 'poder') { const r = impValor('poder', x.valor); const alvo = r && s.disc.find(z => z.nome === r.v.disc); if (alvo) alvo.poderes.push(r.v.nome); else notas.push('Poder: ' + x.valor); }
    else if (d.startsWith('atr.') || d.startsWith('hab.')) { const p = impPontos(x.valor); if (p != null) s[d.slice(0, 3)][d.slice(4)] = Math.max(d.startsWith('atr') ? 1 : 0, Math.min(5, p)); }
    else if (d.startsWith('meta.')) s.meta[d.slice(5)] = x.valor;
    else if (d.startsWith('texto.')) { const k = d.slice(6); if (k === 'tenets') s.tenets = [s.tenets, x.valor].filter(Boolean).join('\n'); else if (k === 'notas') notas.push(x.valor); else if (k === 'bane' || k === 'comp') s[k] = x.valor; else s.extra[k] = [s.extra[k], x.valor].filter(Boolean).join('\n'); }
  }
  s.notas = notas.filter(Boolean).join('\n');
  /* a distribuição de Habilidades que mais se parece com a ficha (só muda o aviso de criação) */
  const conta = {}; Object.values(s.hab).forEach(v => { if (v) conta[v] = (conta[v] || 0) + 1; });
  let melhor = 'balanceado', erro = Infinity;
  for (const k in DISTRIB_HABILIDADES) {
    const m = DISTRIB_HABILIDADES[k].mapa;
    const e = [1, 2, 3, 4, 5].reduce((t, n) => t + Math.abs((conta[n] || 0) - (m[n] || 0)), 0);
    if (e < erro) { erro = e; melhor = k; }
  }
  s.distribHab = melhor;
  return s;
}

/* entradas: PDF que não é o modelo daqui, JSON que não é deste app, texto colado */
async function impAbrirPdfAlheio(bytes, aviso) {
  if (!(await impGarantirPdfjs(aviso))) return;
  aviso('Lendo a ficha…');
  try { impConferir(await impDePdf(bytes)); aviso(''); }
  catch (e) { aviso('Não consegui ler este PDF: ' + (e && e.message ? e.message : e) + '.'); }
}
function impAbrirTexto(texto) {
  const t = String(texto || '').trim();
  if (!t) return 'Cole o texto da ficha.';
  let json = null;
  if (/^[{\[]/.test(t)) { try { json = JSON.parse(t); } catch (e) { json = null; } }
  if (json && json.sistema && json.meta && json.atr) { uiImportar(json); return ''; }
  const P = json ? impDeJson(json) : impDeTexto(t);
  const achados = Object.keys(P.atr).length + Object.keys(P.hab).length + Object.keys(P.meta).length + P.disc.length + P.vant.length;
  if (!achados) return json ? 'Não reconheci nada de ficha de Vampiro neste JSON.' : 'Não reconheci nada de ficha de Vampiro neste texto. Confira se colou a ficha inteira.';
  impConferir(P);
  return '';
}

if (typeof document !== 'undefined' && document.getElementById('dlg-conferir')) {
  const b = el('dlg-conferir-b');
  b.addEventListener('change', ev => { const t = ev.target.closest('[data-imp]'); if (t) impEditar(t); });
  b.addEventListener('input', ev => { const t = ev.target.closest('[data-imp]'); if (t && t.tagName !== 'SELECT') impEditar(t); });
  b.addEventListener('click', ev => {
    const rm = ev.target.closest('[data-imp-rm]');
    if (rm) { const [a, i] = rm.dataset.impRm.split('.'); IMP_P[a].splice(Number(i), 1); impRedesenhar(); return; }
    const todas = ev.target.closest('[data-imp-todas]');
    if (todas) { IMP_P.sobras.forEach(x => { x.destino = todas.dataset.impTodas; }); impRedesenhar(); }
  });
  el('imp-criar').onclick = () => {
    if (!IMP_P) return;
    const novo = impMontarEstado(IMP_P);
    IMP_P = null;
    el('dlg-conferir').close();
    nvSairLeitura(false);
    S = nvIdentidade(novo);
    NV.semFicha = false;
    render();
    uiIr('#/ficha/' + S._id + '/editar');
    uiAviso('Ficha importada: ' + (S.meta.nome || 'Sem nome') + '. Confira os avisos de criação nas abas.');
  };
}


if (typeof module !== 'undefined') module.exports = { impNorm, impRotulo, impValor, impPontos, impItem, impDeTexto, impDeJson, impFileiras, impFrases };
