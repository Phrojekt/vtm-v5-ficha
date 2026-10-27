/* ============================================================
   Ficha de Sangue — dados dos suplementos + Caçador: A Revanche
   Resumos próprios. Valores mecânicos conferidos nos livros:
   · Guia Suplementar (Companion) — poderes, errata, XP, Mar do Tempo
   · Cultos dos Deuses de Sangue — tipos de predador
   · Caçador: A Revanche — credos, ímpetos, trunfos
   ============================================================ */

/* ------------------------------------------------------------
   TIPOS DE PREDADOR — Cultos dos Deuses de Sangue
------------------------------------------------------------ */
const PREDADORES_CULTOS = {
  'Extorsionário': { en:'Extortionist', livro:'Cultos dos Deuses de Sangue',
    desc:'Vende proteção e cobra em sangue. Às vezes a ameaça é real; às vezes é ele mesmo.',
    parada:'Força ou Manipulação + Intimidação',
    esp:[['intimidacao','Coerção'],['furto','Segurança']],
    disc:['Dominação','Potência'],
    ajustes:{},
    vant:[{nome:'Contatos', pontos:2, nota:'distribua 3 pontos entre Contatos e Recursos'},
          {nome:'Recursos', pontos:1, nota:''}],
    def:[{nome:'Inimigo', pontos:2, nota:'a polícia ou uma vítima que escapou e quer vingança'}] },
  'Ladrão de Túmulos': { en:'Graverobber', livro:'Cultos dos Deuses de Sangue',
    desc:'Bebe de cadáveres frescos e dos enlutados que os choram. A ressonância melancólica é o atrativo.',
    parada:'Determinação + Medicina para vasculhar os mortos; Manipulação + Sagacidade entre os vivos',
    esp:[['ocultismo','Rituais do Túmulo'],['medicina','Cadáveres']],
    disc:['Fortitude','Oblívio'],
    ajustes:{},
    vant:[{nome:'Esôfago de Ferro', pontos:3, nota:'qualidade de alimentação'},
          {nome:'Refúgio', pontos:1, nota:''}],
    def:[{nome:'Predador Manifesto', pontos:2, nota:'defeito de Rebanho: sua frieza perturba ao caçar'}] }
};

/* Variante do livro: Hecata que escolhe Sacoleiro pode pegar
   Oblívio no lugar de Feitiçaria de Sangue. */
const VARIANTE_SACOLEIRO_HECATA = 'Oblívio';

/* ------------------------------------------------------------
   CUSTOS DE EXPERIÊNCIA — Companion
------------------------------------------------------------ */
const CUSTOS_XP = [
  ['Aumento de Atributo',     'Novo nível × 5',  n => n * 5],
  ['Aumento de Habilidade',   'Novo nível × 3',  n => n * 3],
  ['Nova Especialização',     '3',               () => 3],
  ['Disciplina de Clã',       'Novo nível × 5',  n => n * 5],
  ['Outra Disciplina',        'Novo nível × 7',  n => n * 7],
  ['Disciplina Caitiff',      'Novo nível × 6',  n => n * 6],
  ['Ritual de Feitiçaria',    'Nível × 3',       n => n * 3],
  ['Fórmula Sangue-Ralo',     'Nível × 3',       n => n * 3],
  ['Vantagem',                '3 por ponto',     n => n * 3],
  ['Potência de Sangue',      'Novo nível × 10', n => n * 10]
];

/* ------------------------------------------------------------
   O MAR DO TEMPO — idade do personagem

   Criança, Neófita, Ancillae e Sangue-ralo são as faixas do Guia
   Suplementar. Ancião e Matusalém NÃO estão no livro: são a mesma
   escada estendida, para gerar NPCs antigos, e ficam marcadas com
   "†" na interface. `peso` é a chance de cada faixa quando a idade
   fica solta no sorteio — a maioria das fichas é de NPC, e nem todo
   NPC é recém-Abraçado.
------------------------------------------------------------ */
const MAR_DO_TEMPO = {
  '': { nome:'Não definida', geracoes:[11,12,13], xp:0, vantagens:0, defeitos:0, humanidade:0,
        oficial:true, peso:0, epoca:'', desc:'' },
  'crianca': { nome:'Criança', geracoes:[12,13], xp:0, vantagens:0, defeitos:0, humanidade:0,
        oficial:true, peso:6, epoca:'Abraçada nos últimos 15 anos',
        desc:'Abraçada nos últimos 15 anos. 12ª ou 13ª geração, Potência de Sangue 1.' },
  'neofita': { nome:'Neófita', geracoes:[12,13], xp:15, vantagens:0, defeitos:0, humanidade:0,
        oficial:true, peso:26, epoca:'Abraçada entre 1940 e uma década atrás',
        desc:'Abraçada entre 1940 e uma década atrás. 12ª ou 13ª geração, Potência de Sangue 1, mais 15 de experiência.' },
  'ancillae': { nome:'Ancillae', geracoes:[10,11], xp:35, vantagens:2, defeitos:2, humanidade:-1,
        oficial:true, peso:33, epoca:'Abraçada entre 1780 e 1940',
        desc:'Abraçada entre 1780 e 1940. 10ª ou 11ª geração, Potência de Sangue 2, +2 de Vantagens, +2 de Defeitos, −1 de Humanidade e 35 de experiência.' },
  'anciao': { nome:'Ancião †', geracoes:[8,9], xp:220, vantagens:4, defeitos:4, humanidade:-2,
        oficial:false, peso:27, epoca:'Abraçada antes de 1780',
        desc:'Abraçada antes de 1780. 8ª ou 9ª geração, Potência de Sangue 3, +4 de Vantagens, +4 de Defeitos, −2 de Humanidade e 220 de experiência. † Faixa fora do Guia Suplementar: a escada do Mar do Tempo estendida para NPCs antigos.' },
  'matusalem': { nome:'Matusalém †', geracoes:[5,6,7], xp:480, vantagens:6, defeitos:6, humanidade:-3,
        oficial:false, peso:5, epoca:'Abraçada antes do ano 1000',
        desc:'Abraçada antes do ano 1000. 5ª a 7ª geração, Potência de Sangue 4 ou 5, +6 de Vantagens, +6 de Defeitos, −3 de Humanidade e 480 de experiência. † Faixa fora do Guia Suplementar: a escada do Mar do Tempo estendida para NPCs antigos.' },
  'ralo': { nome:'Sangue-ralo', geracoes:[14,15,16], xp:0, vantagens:0, defeitos:0, humanidade:0,
        oficial:true, peso:0, epoca:'Sangue diluído demais para contar gerações',
        desc:'14ª, 15ª ou 16ª geração. Potência de Sangue 0.' }
};

/* Perícias que desmentem um Defeito — tanto na hora de sortear quanto na hora
   de gastar experiência. Um erudito de trezentos anos não é analfabeto, e não
   se chega a Medicina 5 ou Ocultismo 5 sem ler. Política e Finanças ficam de
   fora da lista: dá para operar as duas na base da conversa e do dinheiro. */
const DEFEITO_DESMENTIDO = {
  'Analfabeto': ['erudicao', 'ciencias', 'ocultismo', 'medicina']
};

/* A faixa de idade que a geração implica. Serve para o caminho inverso:
   quando a geração é fixada — na Forja ou citada no contexto — é ela que
   manda na idade, porque não existe Matusalém de 9ª geração. */
function idadePorGeracao(g) {
  const n = Number(g) || 13;
  if (n >= 14) return 'ralo';
  if (n >= 12) return 'neofita';
  if (n >= 10) return 'ancillae';
  if (n >= 8)  return 'anciao';
  return 'matusalem';
}

/* Sorteia uma faixa de idade pela `peso` de cada uma. */
function sortearIdade() {
  const faixas = Object.entries(MAR_DO_TEMPO).filter(([, v]) => v.peso > 0);
  const soma = faixas.reduce((t, [, v]) => t + v.peso, 0);
  let n = Math.random() * soma;
  for (const [k, v] of faixas) { n -= v.peso; if (n <= 0) return k; }
  return 'neofita';
}

/* ============================================================
   CAÇADOR: A REVANCHE — 5ª edição
   Mesmos Atributos e Habilidades de Vampiro.
   ============================================================ */

const CREDOS = {
  'Clandestino':  { en:'Underground',   desc:'Astúcia, subterfúgio e conhecer as pessoas certas.' },
  'Devoto':       { en:'Faithful',      desc:'Crença em poderes superiores e uma visão de mundo guiada pelo divino.' },
  'Empreendedor': { en:'Entrepreneurial',desc:'Inovações ousadas e abordagens experimentais.' },
  'Inquisitivo':  { en:'Inquisitive',   desc:'Reunir informações e compreender a presa.' },
  'Marcial':      { en:'Martial',       desc:'Combater o sobrenatural por meio de armas e táticas.' }
};

const IMPETOS = {
  'Curiosidade': { en:'Curiosity',  desc:'O que os monstros fazem e por quê?' },
  'Expiação':    { en:'Atonement',  desc:'Compensar por ter ajudado o sobrenatural no passado.' },
  'Ganância':    { en:'Greed',      desc:'Obter para si os ganhos ilícitos que os monstros roubaram.' },
  'Inveja':      { en:'Envy',       desc:'Juntar-se à noite ou morrer tentando.' },
  'Juramento':   { en:'Oath',       desc:'Uma promessa obriga o Caçador a honrá-la.' },
  'Orgulho':     { en:'Pride',      desc:'O mundo pertence aos humanos, não ao sobrenatural.' },
  'Vingança':    { en:'Vengeance',  desc:'Acertar as contas com o sobrenatural.' }
};

/* Trunfos: 12 no total, quatro por família.
   Na criação: dois Trunfos, ou um Trunfo e duas Distinções. */
const TRUNFOS = {
  'Aptidões': {
    desc:'Talentos e equipamentos que excedem o mundano sem sair dele.',
    itens: {
      'Acesso Global': { en:'Global Access', parada:'Inteligência + Tecnologia',
        desc:'Contorna segurança convencional e entra em praticamente qualquer sistema.',
        dist:['Grande Irmão Vigilante','Passe Universal','Hack Financeiro','A Letra da Lei'] },
      'Equipamento Improvisado': { en:'Improvised Gear', parada:'Inteligência + Ofícios, Tecnologia ou Ciência',
        desc:'Monta ferramentas úteis e de curta duração com o que estiver à mão.',
        dist:['Frugal','Produção em Massa','Especialização','Criação Veloz'] },
      'Encantador de Feras': { en:'Beast Whisperer', parada:'Carisma + Empatia com Animais (comandos); Autocontrole + Empatia com Animais (treino)',
        desc:'Entende e comanda animais, que o seguem com lealdade real.',
        dist:['Incorruptível','Zoológico','Comandos Complexos','Incógnito'] },
      'Jóquei de Drones': { en:'Drone Jockey', parada:'Raciocínio + Tecnologia (controlar); Inteligência + Ofícios (consertar)',
        desc:'Opera drones de vigilância e combate muito além do que o mercado oferece.',
        dist:['Autônomo','Variantes','Habilidade Especializada','Armamentos','Carga'] }
    }
  },
  'Ativos': {
    desc:'Não é o que você sabe, é o que você tem e quem você conhece.',
    itens: {
      'Arsenal': { en:'Arsenal', parada:'Inteligência + Ofícios; ou Manipulação + Manha',
        desc:'Acesso a armas que o público não alcança — nada de explosivos.',
        dist:['Requisição Coletiva','Características Especiais','Exóticas','Irrastreável'] },
      'Artilharia': { en:'Ordnance', parada:'Autocontrole + Ciência; ou Autocontrole + Manha',
        desc:'Constrói ou consegue explosivos: minas, C4, cargas de demolição.',
        dist:['Cargas Múltiplas','Munição Não Letal','Exóticas','Entrega Disfarçada'] },
      'Biblioteca': { en:'Library', parada:'Determinação + Erudição',
        desc:'Acervo sobre o sobrenatural, de códices centenários a bases de dados encriptadas.',
        dist:['Onde Eles Se Escondem','Quem Eles São','Como Detê-los','Como Feri-los'] },
      'Frota': { en:'Fleet', parada:'Inteligência + Tecnologia; ou Manipulação + Persuasão',
        desc:'Veículos a curto prazo, da garagem própria ou de contatos leais.',
        dist:['Armadura','Desempenho','Vigilância','Irrastreável'] }
    }
  },
  'Dotes': {
    desc:'Estes desafiam o natural. Em Vampiro, correspondem à Fé Verdadeira. Quase todos dependem de um objeto de foco.',
    itens: {
      'Artefato': { en:'Artifact', parada:'Inteligência + Ocultismo ou Ciência',
        desc:'Uma relíquia com propriedades que objetos semelhantes não têm.',
        dist:['Fortalecer','Atração','Detecção','Escudo'] },
      'Frustrar o Sobrenatural': { en:'Thwart the Unnatural', parada:'Autocontrole + Ocultismo ou Ciência',
        desc:'Resiste a poderes sobrenaturais e efeitos mentais enquanto segura o foco.',
        dist:['Especialização em Criatura','Guardar','Reconhecimento'] },
      'Repelir o Sobrenatural': { en:'Repel the Unnatural', parada:'Determinação + Ocultismo ou Ciência',
        desc:'Brande o objeto de foco e afasta criaturas sobrenaturais.',
        dist:['Guardar','Ferir','Mãos Livres'] },
      'Sentir o Sobrenatural': { en:'Sense the Unnatural', parada:'Raciocínio + Ocultismo ou Ciência',
        desc:'Percebe a presença de criaturas sobrenaturais nas proximidades.',
        dist:['Especialização em Criatura','Alcance','Mãos Livres'] }
    }
  }
};

const LISTA_TRUNFOS = Object.entries(TRUNFOS)
  .flatMap(([fam, g]) => Object.keys(g.itens).map(n => ({ nome:n, familia:fam })));

/* Vantagens e defeitos de Caçador: usa a lista mortal, sem as de Membro.
   Acrescentamos os específicos da caçada. */
const VANTAGENS_CACADOR = [
  { g:'Antecedentes', itens:[
    ['Aliados','1–6','Grupo mortal que age por você.'],
    ['Contatos','1–3','Gente que vende informação, bens ou acesso.'],
    ['Fama','1–5','Reconhecimento no mundo mortal.'],
    ['Refúgio','1–5','Base da célula: tamanho e segurança.'],
    ['Influência','1–5','Peso dentro de instituições mortais.'],
    ['Máscara','1–2','Identidade falsa com lastro documental.'],
    ['Recursos','1–5','Renda e patrimônio.'],
    ['Lacaios','1–3','Auxiliares leais.'],
    ['Status','1–5','Posição dentro da sua org.'],
    ['Contato na Org','1–3','Alguém de dentro que atende suas ligações.']
  ]},
  { g:'Qualidades', itens:[
    ['Visual (Belo)','2','+1 dado em testes Sociais ligados à aparência.'],
    ['Visual (Deslumbrante)','4','+2 dados em testes Sociais ligados à aparência.'],
    ['Linguística','1+','Um idioma adicional por ponto.'],
    ['Viciado Funcional','1','Opera normalmente sob efeito da sua droga.'],
    ['Nervos de Aço','2','Resiste melhor ao terror do sobrenatural.'],
    ['Treinamento Formal','1–3','Formação militar, policial ou paramédica.']
  ]}
];

const DEFEITOS_CACADOR = [
  { g:'Aparência e corpo', itens:[
    ['Feio','1','−1 dado em testes Sociais ligados à aparência.'],
    ['Repulsivo','2','−2 dados em testes Sociais ligados à aparência.'],
    ['Deficiência Crônica','1–2','Uma condição física que cobra seu preço em campo.']
  ]},
  { g:'Mente e conduta', itens:[
    ['Vício','1','Precisa da droga para funcionar.'],
    ['Vício Irremediável','2','A necessidade domina tudo.'],
    ['Pesadelos','1','O que você viu não deixa você dormir.'],
    ['Obsessão','2','Uma presa específica ocupa todo o seu juízo.'],
    ['Gatilho','1','Uma cena, um cheiro, um som e você trava.']
  ]},
  { g:'Mundo e reputação', itens:[
    ['Segredo Sombrio','1–2','Algo que destruiria você se viesse à tona.'],
    ['Inimigo','1–3','Alguém quer você morto.'],
    ['Procurado','2','A lei tem seu nome e seu rosto.'],
    ['Marcado pela Presa','2','Um monstro sabe exatamente quem você é.'],
    ['Sem Apoio','1','Nenhuma org atende suas ligações.']
  ]}
];

/* Sementes de sorteio para Caçador */
const SEMENTES_CACADOR = {
  conceitos: ['enfermeira de pronto-socorro','ex-fuzileiro dispensado','padre suspenso','perita criminal','jornalista de podcast investigativo','professor de folclore','hacker de chapéu cinza','dono de loja de penhores','bombeiro aposentado','veterinária de zoológico','arqueóloga sem verba','motorista de ambulância','segurança de hospital psiquiátrico','pesquisador de cemitérios','despachante de polícia','ex-presidiário em condicional','fotógrafo de ocultismo','dona de funerária','instrutor de tiro','estudante de teologia'],
  ambicoes: ['Descobrir o que matou meu irmão','Provar que eles existem','Proteger meu bairro até o fim','Encontrar quem me recrutou','Destruir o ninho da zona leste','Levar um deles vivo para a org','Manter minha célula inteira','Recuperar o que me tiraram','Impedir que outro se torne um deles','Fazer alguém acreditar em mim'],
  desejos: ['Dormir uma noite inteira','Que minha família nunca saiba','Olhar um deles nos olhos sem tremer','Ter uma arma que funcione de verdade','Conseguir provas que ninguém negue','Ser levado a sério pela minha org','Voltar a ter uma vida normal','Salvar pelo menos um','Descobrir se ainda sou humano','Que alguém assuma meu lugar'],
  conviccoes: ['Nunca deixo um civil para trás','Monstro que fala ainda é monstro','Não mato quem ainda pode ser salvo','A célula vem antes de mim','Não uso os métodos deles','Toda morte precisa ser explicada','Nunca caço sozinho','Não negocio com o sobrenatural','A verdade tem que sobreviver a mim','Protejo quem não tem como se proteger'],
  pilares: ['minha filha mais nova','o parceiro que eu perdi','a professora que acreditou em mim','meu irmão mais velho','a vizinha que cuida do meu cachorro','o padre que me ouviu','minha ex-mulher','o dono da oficina','minha sobrinha','o sargento que me treinou'],
  tenets: ['O que caça monstros não pode virar um.','Nenhuma vida humana é aceitável como perda.','A verdade vale o risco de contá-la.','Ninguém cai sozinho.'],
  orgs: ['Divisão de Assuntos Especiais','Escritório de Conscientização Informacional','Sociedade de São Leopoldo','O Arcanum','BOPE-RJ (BOES)','Monster-X','Os Cravos de Cristo','A Ordem da Rosa','Grupo Orfeu','Re:Venge','Célula independente']
};


/* ------------------------------------------------------------
   FUSÃO com a base do Livro Básico
------------------------------------------------------------ */
Object.entries(PREDADORES_CULTOS).forEach(([nome, p]) => { PREDADORES[nome] = p; });

/* "Personalizado" fica sempre por último na lista */
(function reordenarPredadores() {
  const p = PREDADORES['Personalizado'];
  delete PREDADORES['Personalizado'];
  PREDADORES['Personalizado'] = p;
})();

LISTA_PREDADORES.length = 0;
Object.keys(PREDADORES).forEach(n => LISTA_PREDADORES.push(n));
