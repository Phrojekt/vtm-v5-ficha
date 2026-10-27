/* ============================================================
   Ficha de Sangue — base de dados (Vampiro: A Máscara 5ª ed.)
   Descrições são resumos próprios, não texto dos livros.
   Tudo é editável na interface: ajuste pelo seu material oficial.
   ============================================================ */

const ATRIBUTOS = [
  { cat: 'Físicos',  itens: [['forca','Força','Strength'],['destreza','Destreza','Dexterity'],['vigor','Vigor','Stamina']] },
  { cat: 'Sociais',  itens: [['carisma','Carisma','Charisma'],['manipulacao','Manipulação','Manipulation'],['autocontrole','Autocontrole','Composure']] },
  { cat: 'Mentais',  itens: [['inteligencia','Inteligência','Intelligence'],['raciocinio','Raciocínio','Wits'],['determinacao','Determinação','Resolve']] }
];

const HABILIDADES = [
  { cat: 'Físicas', itens: [
    ['armasbrancas','Armas Brancas','Melee'],['armasfogo','Armas de Fogo','Firearms'],['atletismo','Atletismo','Athletics'],
    ['briga','Briga','Brawl'],['conducao','Condução','Drive'],['furtividade','Furtividade','Stealth'],
    ['furto','Ladroagem','Larceny'],['oficios','Ofícios','Craft'],['sobrevivencia','Sobrevivência','Survival']
  ]},
  { cat: 'Sociais', itens: [
    ['adestramento','Empatia com Animais','Animal Ken'],['etiqueta','Etiqueta','Etiquette'],['intimidacao','Intimidação','Intimidation'],
    ['lideranca','Liderança','Leadership'],['manha','Manha','Streetwise'],['atuacao','Performance','Performance'],
    ['persuasao','Persuasão','Persuasion'],['perspicacia','Sagacidade','Insight'],['labia','Subterfúgio','Subterfuge']
  ]},
  { cat: 'Mentais', itens: [
    ['ciencias','Ciência','Science'],['erudicao','Erudição','Academics'],['financas','Finanças','Finance'],
    ['investigacao','Investigação','Investigation'],['medicina','Medicina','Medicine'],['ocultismo','Ocultismo','Occult'],
    ['prontidao','Percepção','Awareness'],['politica','Política','Politics'],['tecnologia','Tecnologia','Technology']
  ]}
];

/* Habilidades que ganham especialidade grátis se tiverem pontos */
const ESPECIALIDADE_GRATIS = ['erudicao','oficios','atuacao','ciencias'];

/* Distribuições de criação */
const DISTRIB_ATRIBUTOS = { 4:1, 3:3, 2:4, 1:1 };

const DISTRIB_HABILIDADES = {
  faztudo:      { nome:'Pau para toda obra', en:'Jack of All Trades', mapa:{ 3:1, 2:8, 1:10 } },
  balanceado:   { nome:'Equilibrado',        en:'Balanced',           mapa:{ 3:3, 2:5, 1:7  } },
  especialista: { nome:'Especialista',       en:'Specialist',         mapa:{ 4:1, 3:3, 2:3, 1:3 } }
};

/* Disciplinas e poderes moram em src/disciplinas.js, carregado antes deste arquivo. */


/* ------------------------------------------------------------
   CLÃS
------------------------------------------------------------ */
const CLAS = {
  'Brujah': { disc:['Celeridade','Potência','Presença'],
    bane:'Temperamento Violento — some a Severidade do Bane da parada de dados para resistir a frenesi de fúria.',
    comp:'Rebeldia — precisa se opor à ordem ou expectativa mais recente. −2 em todos os testes até fazer isso.',
    linha:'Os Aprendizes do Ódio. Raiva com causa.' },
  'Gangrel': { disc:['Animalismo','Fortitude','Proteanismo'],
    bane:'Sussurro da Besta — em frenesi ganha traços animais; −(Severidade do Bane) em testes Sociais por uma noite.',
    comp:'Impulsos Ferais — perde a fala articulada. −2 em testes de Manipulação e Inteligência.',
    linha:'As Feras. Mais perto do animal do que do homem.' },
  'Malkavian': { disc:['Auspícios','Dominação','Ofuscação'],
    bane:'Perspectiva Fraturada — escolha uma condição mental; quando ela aflora, −(Severidade do Bane) numa categoria de testes.',
    comp:'Delírio — alucinações tomam conta. −2 em testes de Destreza, Manipulação e Autocontrole.',
    linha:'Os Lunáticos. Enxergam o que não deveria ser visto.' },
  'Nosferatu': { disc:['Animalismo','Ofuscação','Potência'],
    bane:'Repulsivo — não pode ter Vantagens de Visual; −(Severidade do Bane) em testes Sociais, exceto Intimidação. Nunca passa por humano.',
    comp:'Criptofilia — precisa obter um segredo novo. −2 em tudo mais até conseguir.',
    linha:'Os Esgotos. Feios, invisíveis, bem informados.' },
  'Toreador': { disc:['Auspícios','Celeridade','Presença'],
    bane:'Fixação Estética — longe de algo belo, perde (Severidade do Bane) dados em um teste por cena, à escolha do Narrador.',
    comp:'Obsessão — fixa-se num objeto de beleza. −2 em tudo que não envolva a obsessão.',
    linha:'Os Degenerados. Escravos da beleza.' },
  'Tremere': { disc:['Auspícios','Dominação','Feitiçaria de Sangue'],
    bane:'Sangue Deficiente — seu vitae não cria Vínculo de Sangue normalmente: exige (Severidade do Bane) goles adicionais.',
    comp:'Perfeccionismo — −2 até conseguir um sucesso total ou crítico; a penalidade diminui a cada tentativa.',
    linha:'Os Feiticeiros. A pirâmide ruiu, o sangue continua.' },
  'Ventrue': { disc:['Dominação','Fortitude','Presença'],
    bane:'Gosto Refinado — só se alimenta de um tipo específico de presa; qualquer outro sangue exige Teste de Fome e pode ser vomitado.',
    comp:'Arrogância — precisa liderar e ser obedecido na situação atual. −2 até conseguir.',
    linha:'Os Reis. Nasceram para mandar e nunca esqueceram.' },
  'Hecata': { disc:['Auspícios','Fortitude','Oblívio'],
    bane:'Beijo Doloroso — sua mordida causa agonia, nunca êxtase. O vaso reage com dor e resistência.',
    comp:'Morbidez — obcecado pela morte de alguém ou de algo. −2 até "resolver" aquela morte.',
    linha:'A Família. Comerciantes da morte.' },
  'Lasombra': { disc:['Dominação','Oblívio','Potência'],
    bane:'Imagem Distorcida — reflexos e gravações se corrompem; −(Severidade do Bane) em testes com tecnologia e sensores falham perto de você.',
    comp:'Crueldade — precisa dobrar alguém por completo. −2 até vencer sem concessões.',
    linha:'Os Guardiões das Sombras. Vieram da Sabbat e assumiram a Camarilla.' },
  'Tzimisce': { disc:['Animalismo','Dominação','Proteanismo'],
    bane:'Enraizado — precisa dormir cercado por parte do seu domínio (terra, relíquias); sem isso, −(Severidade do Bane) em tudo.',
    comp:'Cobiça — precisa tomar posse do objeto de desejo. −2 até possuí-lo.',
    linha:'Os Dragões. Donos absolutos do que é seu.' },
  'Banu Haqim': { disc:['Celeridade','Feitiçaria de Sangue','Ofuscação'],
    bane:'Vício de Sangue — ao beber de outro Membro, teste de Vontade (dif. 2 + Severidade do Bane) ou continua até a Fome zerar.',
    comp:'Julgamento — precisa punir quem violou seu código, bebendo o sangue do culpado. −2 até executar a sentença.',
    linha:'Os Juízes. Antes assassinos, hoje árbitros.' },
  'Ministério': { disc:['Ofuscação','Presença','Proteanismo'],
    bane:'Abomina a Luz — sob luz forte, −(Severidade do Bane) em todos os testes, e sofre dano adicional de luz solar.',
    comp:'Transgressão — precisa levar alguém a quebrar um tabu ou princípio. −2 até corromper.',
    linha:'O Ministério. Libertação pela transgressão.' },
  'Ravnos': { disc:['Animalismo','Ofuscação','Presença'],
    bane:'Amaldiçoado — dormir duas vezes no mesmo lugar em sete noites causa dano agravado igual à Severidade do Bane.',
    comp:'Tentar o Destino — precisa enfrentar pessoalmente o caminho mais arriscado. −2 até assumir o risco.',
    linha:'Os Renegados. Sempre em movimento, nunca em casa.' },
  'Salubri': { disc:['Auspícios','Dominação','Fortitude'],
    bane:'Caçado — um terceiro olho se abre na testa e não pode ser escondido; sua condição atrai diabolistas e caçadores.',
    comp:'Empatia Afetiva — absorve a dor alheia e precisa aliviá-la. −2 até ajudar quem sofre.',
    linha:'Os Unicórnios. Quase extintos, quase santos.' },
  'Caitiff': { disc:[],
    bane:'Pária — cada nível de Disciplina custa +1 de XP. Não pode ter Status na Camarilla e sofre desconfiança geral.',
    comp:'—',
    linha:'Os Sem-Clã. Sangue sem herança nem proteção.' },
  'Sangue-ralo': { disc:['Alquimia de Sangue-ralo'],
    bane:'Sem maldição de clã fixa. Use os Méritos e Defeitos de Sangue-ralo para definir o que seu sangue diluído faz (ou não faz).',
    comp:'—',
    linha:'Os Duskborn. 14ª geração ou além — mal são vampiros.' }
};

const LISTA_CLAS = Object.keys(CLAS);

/* ------------------------------------------------------------
   TIPOS DE PREDADOR (Livro Básico)
   Estrutura: cada entrada pode conceder especialidade, disciplina,
   vantagens, defeitos e ajustes — com escolhas quando o livro permite.
------------------------------------------------------------ */
const PREDADORES = {
  'Vira-lata': { en:'Alleycat',
    desc:'Caça pela força. Encurrala, ameaça e toma o sangue.',
    esp:[['intimidacao','Assaltos'],['briga','Agarrões']],
    disc:['Celeridade','Potência'],
    ajustes:{ humanidade:-1 },
    vant:[{nome:'Contatos', pontos:3, nota:'criminosos'}],
    def:[] },
  'Sacoleiro': { en:'Bagger',
    desc:'Não caça: compra, rouba ou recolhe sangue já embalado.',
    esp:[['furto','Arrombamento'],['manha','Mercado negro']],
    disc:['Feitiçaria de Sangue','Ofuscação'],
    ajustes:{},
    vant:[{nome:'Esôfago de Ferro', pontos:3, nota:'mérito de alimentação'}],
    def:[{nome:'Inimigo', pontos:2, nota:'alguém acredita que você profanou um corpo'}] },
  'Sanguessuga': { en:'Blood Leech',
    desc:'Bebe de outros Membros. Perigoso, ilegal e viciante.',
    esp:[['briga','Contra Membros'],['furtividade','Contra Membros']],
    disc:['Celeridade','Proteanismo'],
    ajustes:{ humanidade:-1, potenciaSangue:1 },
    vant:[],
    def:[{nome:'Segredo Sombrio', pontos:2, nota:'diablerista (ou Rejeitado ••)'},
         {nome:'Exclusão de Presa', pontos:2, nota:'mortais'}] },
  'Açougueiro': { en:'Cleaver',
    desc:'Mantém uma família mortal como fonte secreta e permanente.',
    esp:[['persuasao','Manipulação psicológica'],['labia','Encobrir rastros']],
    disc:['Animalismo','Dominação'],
    ajustes:{},
    vant:[{nome:'Rebanho', pontos:2, nota:'família / círculo próximo'}],
    def:[{nome:'Segredo Sombrio', pontos:1, nota:'Açougueiro'}] },
  'Consensual': { en:'Consensualist',
    desc:'Só bebe de quem consente. Quebra a Máscara para isso.',
    esp:[['medicina','Flebotomia'],['persuasao','Vasos']],
    disc:['Auspícios','Fortitude'],
    ajustes:{ humanidade:1 },
    vant:[],
    def:[{nome:'Segredo Sombrio', pontos:1, nota:'violador da Máscara'},
         {nome:'Exclusão de Presa', pontos:1, nota:'não-consentintes'}] },
  'Fazendeiro': { en:'Farmer',
    desc:'Recusa sangue humano. Alimenta-se de animais e paga o preço.',
    esp:[['adestramento','Um animal específico'],['sobrevivencia','Caça']],
    disc:['Animalismo','Proteanismo'],
    ajustes:{ humanidade:1 },
    vant:[],
    def:[{nome:'Fazendeiro', pontos:2, nota:'defeito de alimentação'}] },
  'Osíris': { en:'Osiris',
    desc:'Celebridade ou líder de culto: o rebanho vem até você.',
    esp:[['ocultismo','Uma tradição religiosa'],['atuacao','Um gênero específico']],
    disc:['Feitiçaria de Sangue','Presença'],
    ajustes:{},
    vant:[{nome:'Fama', pontos:2, nota:''},{nome:'Rebanho', pontos:1, nota:'distribua 3 pontos entre Fama e Rebanho'}],
    def:[{nome:'Inimigo', pontos:2, nota:'distribua 2 pontos entre Inimigos e defeitos Míticos'}] },
  'Sandman': { en:'Sandman',
    desc:'Invade quartos e bebe de quem dorme. Ninguém acorda.',
    esp:[['medicina','Anestésicos'],['furtividade','Invasão']],
    disc:['Auspícios','Ofuscação'],
    ajustes:{},
    vant:[{nome:'Recursos', pontos:1, nota:''}],
    def:[] },
  'Rainha da Cena': { en:'Scene Queen',
    desc:'Reina sobre uma subcultura e se alimenta dentro dela.',
    esp:[['etiqueta','Uma cena específica'],['lideranca','Uma cena específica'],['manha','Uma cena específica']],
    disc:['Dominação','Potência'],
    ajustes:{},
    vant:[{nome:'Fama', pontos:1, nota:'dentro da cena'},{nome:'Contatos', pontos:1, nota:''}],
    def:[{nome:'Influência', pontos:1, nota:'malvisto fora da subcultura'}] },
  'Sereia': { en:'Siren',
    desc:'Seduz e bebe no meio do ato. A vítima raramente reclama.',
    esp:[['persuasao','Sedução'],['labia','Sedução']],
    disc:['Fortitude','Presença'],
    ajustes:{},
    vant:[{nome:'Visual (Belo)', pontos:2, nota:''}],
    def:[{nome:'Inimigo', pontos:1, nota:'amante rejeitado ou parceiro ciumento'}] },
  'Personalizado': { en:'—',
    desc:'Para os tipos dos suplementos (Companion, Sabbat, Cults) ou um seu. Preencha à mão.',
    esp:[], disc:[], ajustes:{}, vant:[], def:[] }
};

const LISTA_PREDADORES = Object.keys(PREDADORES);

/* ------------------------------------------------------------
   VANTAGENS (antecedentes e méritos) e DEFEITOS
------------------------------------------------------------ */
/* Vantagens e Defeitos moram em src/vantagens.js, carregado antes deste arquivo. */


/* ------------------------------------------------------------
   POTÊNCIA DE SANGUE  (Livro Básico, tabela de Potência)
------------------------------------------------------------ */
const POTENCIA_SANGUE = {
  0:  { surto:1, recuperado:1, bonusPoder:0, rerrolagem:0, gravidade:0, alimentacao:'Nenhum efeito.' },
  1:  { surto:2, recuperado:1, bonusPoder:0, rerrolagem:1, gravidade:2, alimentacao:'Nenhum efeito.' },
  2:  { surto:2, recuperado:2, bonusPoder:1, rerrolagem:1, gravidade:2, alimentacao:'Sangue animal ou ensacado sacia meia Fome.' },
  3:  { surto:3, recuperado:2, bonusPoder:1, rerrolagem:2, gravidade:3, alimentacao:'Sangue animal ou ensacado não sacia nenhuma Fome.' },
  4:  { surto:3, recuperado:3, bonusPoder:2, rerrolagem:2, gravidade:3, alimentacao:'Sangue animal ou ensacado não sacia nada. Sacia 1 a menos de Fome por humano.' },
  5:  { surto:4, recuperado:3, bonusPoder:2, rerrolagem:3, gravidade:4, alimentacao:'Animal/ensacado não sacia. Sacia 1 a menos por humano. Precisa drenar e matar para baixar a Fome abaixo de 2.' },
  6:  { surto:4, recuperado:3, bonusPoder:3, rerrolagem:3, gravidade:4, alimentacao:'Animal/ensacado não sacia. Sacia 2 a menos por humano. Precisa drenar e matar para baixar a Fome abaixo de 2.' },
  7:  { surto:5, recuperado:3, bonusPoder:3, rerrolagem:4, gravidade:5, alimentacao:'Animal/ensacado não sacia. Sacia 2 a menos por humano. Precisa drenar e matar para baixar a Fome abaixo de 2.' },
  8:  { surto:5, recuperado:4, bonusPoder:4, rerrolagem:4, gravidade:5, alimentacao:'Animal/ensacado não sacia. Sacia 2 a menos por humano. Precisa drenar e matar para baixar a Fome abaixo de 3.' },
  9:  { surto:6, recuperado:4, bonusPoder:4, rerrolagem:5, gravidade:6, alimentacao:'Animal/ensacado não sacia. Sacia 2 a menos por humano. Precisa drenar e matar para baixar a Fome abaixo de 3.' },
  10: { surto:6, recuperado:5, bonusPoder:5, rerrolagem:5, gravidade:6, alimentacao:'Animal/ensacado não sacia. Sacia 3 a menos por humano. Precisa drenar e matar para baixar a Fome abaixo de 3.' }
};

function potenciaPorGeracao(g) {
  if (g >= 14) return 0;
  if (g >= 12) return 1;
  if (g >= 10) return 2;
  if (g >= 8)  return 3;
  if (g >= 6)  return 4;
  return 5;
}

const RESSONANCIAS = {
  'Colérica':  'Raiva, violência, paixão. Fortalece Celeridade, Potência, Proteanismo.',
  'Melancólica':'Tristeza, culpa, introspecção. Fortalece Fortitude, Oblívio, Feitiçaria de Sangue.',
  'Fleumática':'Calma, letargia, controle. Fortalece Auspícios, Dominação, Ofuscação.',
  'Sanguínea': 'Alegria, desejo, entusiasmo. Fortalece Animalismo, Presença, Feitiçaria de Sangue.',
  'Vazia':     'Sem carga emocional. Sem benefício.'
};

/* Quais Disciplinas cada Ressonância fortalece. O sorteio escolhe a
   Ressonância depois das Disciplinas, para o sangue combinar com o que
   o personagem realmente sabe fazer. */
const RESSONANCIA_DISC = {
  'Colérica':   ['Celeridade','Potência','Proteanismo'],
  'Melancólica':['Fortitude','Oblívio','Feitiçaria de Sangue'],
  'Fleumática': ['Auspícios','Dominação','Ofuscação'],
  'Sanguínea':  ['Animalismo','Presença','Feitiçaria de Sangue'],
  'Vazia':      []
};

const SEITAS = ['Camarilla','Anarquista','Autarca','Sabbat','Ashirra','Nenhuma / independente'];

/* ------------------------------------------------------------
   NOMES — pools por região cultural
------------------------------------------------------------ */
const NOMES = {
  'Brasil': {
    a: ['Alice','Bruno','Camila','Diego','Elisa','Fábio','Gabriela','Henrique','Isadora','João','Karina','Lucas','Mariana','Nelson','Olívia','Renata','Sérgio','Tatiana','Vitor','Yara','Caio','Beatriz'],
    b: ['Aragão','Bittencourt','Carvalho','Dantas','Esteves','Fontenelle','Guimarães','Hollanda','Lacerda','Mesquita','Negrão','Pontes','Queiroz','Rangel','Sampaio','Torres','Valadares','Xavier']
  },
  'Portugal & Espanha': {
    a: ['Álvaro','Beatriz','Cristina','Duarte','Elena','Fernando','Guiomar','Inês','Joaquim','Leonor','Matias','Nuria','Paloma','Rodrigo','Sancha','Teodoro','Ximena'],
    b: ['Aguilar','Bragança','Cárdenas','Delgado','Escobar','Figueroa','Herrera','Iglesias','Larrea','Montoya','Navarrete','Olivares','Peralta','Salazar','Vasconcelos','Zúñiga']
  },
  'EUA & Reino Unido': {
    a: ['Adrian','Beatrice','Clara','Desmond','Eleanor','Franklin','Gwen','Harold','Imogen','Jasper','Kendra','Lionel','Marguerite','Nathaniel','Ophelia','Quentin','Rosalind','Theodore','Vivienne','Walter'],
    b: ['Ashcroft','Blackwood','Carrow','Dunmore','Everly','Fairbanks','Grantham','Hollis','Kingsley','Lockhart','Merriweather','Northcote','Pemberton','Radcliffe','Sinclair','Thornbury','Vance','Whitlock']
  },
  'França': {
    a: ['Amélie','Bastien','Céline','Damien','Éloise','Fabrice','Geneviève','Hugo','Isabelle','Jérôme','Lucienne','Mathieu','Noémie','Olivier','Perrine','Rémy','Sylvie','Thibault'],
    b: ['Aubertin','Beauchamp','Chevalier','Delacroix','Escoffier','Fontaine','Gaultier','Hachette','Lamarque','Montclair','Nivelle','Perrault','Roussel','Saint-Clair','Thibodeaux','Vaillant']
  },
  'Itália': {
    a: ['Alessia','Bartolomeo','Chiara','Dario','Eleonora','Fiorenzo','Giulia','Ignazio','Lorenzo','Marcella','Nicoletta','Ottavio','Pietro','Rosalia','Salvatore','Teresa','Vincenzo'],
    b: ['Aliprandi','Barbarigo','Contarini','Dandolo','Esposito','Falcone','Gattuso','Lombardi','Malatesta','Neri','Orsini','Pallavicino','Rizzoli','Sforza','Tagliaferro','Visconti']
  },
  'Alemanha & Áustria': {
    a: ['Anneliese','Bernhard','Clara','Dieter','Elfriede','Friedrich','Gerda','Heinrich','Ingrid','Jürgen','Katharina','Lukas','Magdalena','Otto','Renate','Sieglinde','Tobias','Ulrich'],
    b: ['Aschenbach','Brandt','Eichhorn','Falkenrath','Grunewald','Hartmann','Kessler','Lindqvist','Metzger','Nachtigall','Oberhauser','Reinhardt','Schaffer','Steinberg','Vogelsang','Wintermann']
  },
  'Leste Europeu': {
    a: ['Anka','Bogdan','Dragoslav','Elena','Grigore','Irina','Jelena','Kazimierz','Liliana','Miroslav','Nadia','Ondrej','Petra','Radomir','Svetlana','Tomasz','Vasile','Zora'],
    b: ['Bathory','Cernescu','Dragovic','Ferenczy','Grigorescu','Horvath','Jankovic','Kowalczyk','Lazarescu','Milosevic','Novak','Petrescu','Rakoczy','Stoianov','Vukovic','Zamoyski']
  },
  'Nórdico': {
    a: ['Aslaug','Birger','Dagny','Eirik','Freja','Gunnar','Halvard','Ingeborg','Jorunn','Kjell','Liv','Magnus','Njal','Ragnhild','Sigrid','Torsten','Vigdis'],
    b: ['Aalborg','Bjornsson','Dalgaard','Eriksen','Fjeldstad','Grimsdottir','Haugen','Ingvarsson','Kjaergaard','Lindholm','Nyborg','Ravnkilde','Solheim','Thorsen','Vestergaard']
  },
  'Oriente Médio & Norte da África': {
    a: ['Amira','Bassam','Dalia','Faris','Ghada','Hakim','Ilham','Jamila','Karim','Layla','Mahmoud','Nadira','Omar','Rashid','Samira','Tariq','Yasmin','Zayd'],
    b: ['Al-Badawi','Al-Hakim','Al-Rashid','Barakat','Darwish','El-Masri','Farouk','Ghannam','Haddad','Ibrahim','Jabari','Khalidi','Mansour','Nasrallah','Qassim','Suleiman','Zaidan']
  },
  'África Ocidental': {
    a: ['Abeni','Chidi','Dayo','Efua','Folasade','Ibrahima','Kofi','Lamine','Mariama','Nneka','Obi','Rokia','Sekou','Thandiwe','Uchenna','Yaa','Zuri'],
    b: ['Achebe','Bamba','Cisse','Diallo','Eze','Fofana','Gueye','Iwu','Keita','Mensah','Ndiaye','Obiora','Okonkwo','Sanogo','Toure','Yeboah']
  },
  'Ásia Oriental': {
    a: ['Aiko','Baoyu','Chen','Daiki','Eun-ji','Haruka','Hyun-woo','Jia','Kenji','Lian','Mei','Noboru','Qiang','Ryo','Seo-yeon','Takeshi','Wen','Yumi'],
    b: ['Arakawa','Chiang','Fujimori','Han','Ishikawa','Jiang','Kwon','Liang','Matsuda','Nakamura','Ono','Park','Shimizu','Tanaka','Wei','Yamashita','Zhao']
  },
  'Sul da Ásia': {
    a: ['Aditya','Bhavani','Chandrika','Devendra','Esha','Farhan','Gauri','Hemant','Indira','Jyoti','Kiran','Lakshmi','Manoj','Nila','Prakash','Ravi','Sunita','Vikram'],
    b: ['Acharya','Bhattacharya','Chatterjee','Deshmukh','Gopalan','Iyengar','Joshi','Kulkarni','Mahadevan','Nair','Rajagopal','Sengupta','Thakur','Varma','Wadia']
  }
};

const LISTA_ORIGENS = Object.keys(NOMES);

/* Regiões que combinam com a origem histórica de cada clã */
const ORIGEM_POR_CLA = {
  'Tzimisce': 'Leste Europeu',
  'Banu Haqim': 'Oriente Médio & Norte da África',
  'Ministério': 'Oriente Médio & Norte da África',
  'Salubri': 'Oriente Médio & Norte da África',
  'Lasombra': 'Portugal & Espanha',
  'Hecata': 'Itália',
  'Toreador': 'França',
  'Tremere': 'Alemanha & Áustria',
  'Ventrue': 'EUA & Reino Unido',
  'Ravnos': 'Sul da Ásia',
  'Gangrel': 'Nórdico',
  'Brujah': 'Portugal & Espanha'
};

/* Foco de atributos e habilidades no sorteio */
const FOCOS = {
  '':        'Equilibrado (sem foco)',
  'Físicos': 'Físico — força bruta e reflexo',
  'Sociais': 'Social — voz, rosto e influência',
  'Mentais': 'Mental — cabeça, estudo e método'
};

/* Sementes para o sorteio */
const SEMENTES = {
  conceitos: ['jornalista investigativo','enfermeira de UTI noturna','ex-policial expulso','DJ de casa noturna','advogada criminalista','mecânico de oficina 24h','professor de história','motorista de aplicativo','segurança de boate','pesquisador de arquivo','tatuador','despachante aduaneiro','fotógrafo de cena de crime','agente funerário','estudante de medicina','lutador de MMA aposentado','corretor de imóveis','padre afastado','programadora freelancer','dona de ferro-velho'],
  ambicoes: ['Descobrir quem ordenou meu Abraço','Tomar um domínio só meu','Proteger minha família mortal do que eu virei','Subir ao Primogênito do meu clã','Encontrar uma cura','Vingar meu senhor','Provar que os Anarquistas podem governar','Destruir o vampiro que me criou','Reunir minha coterie antiga','Arrancar um segredo dos Anciões'],
  desejos: ['Passar uma noite sem sentir fome','Ser reconhecido por um Ancião','Rever alguém da minha vida mortal','Dominar um poder que ainda me escapa','Encontrar sangue com a ressonância certa','Fazer alguém confiar em mim de verdade','Ganhar uma briga que eu deveria perder','Que ninguém descubra o que fiz','Dormir em segurança','Sentir prazer em alguma coisa'],
  conviccoes: ['Nunca me alimento de crianças','Uma dívida sempre é paga','Nunca traio quem confia em mim','Não mato para comer','Protejo quem não pode se proteger','Minha palavra vale mais que meu sangue','Nunca deixo um insulto passar','Jamais abandono a coterie','Não uso meus poderes em inocentes','A Máscara vem antes de mim'],
  pedras: ['minha irmã mais nova','um velho amigo do colégio','a médica que salvou minha vida','meu antigo parceiro de trabalho','a filha que nunca vou poder ver','o padre da minha infância','a mulher do meu prédio','meu ex-treinador','o dono do bar da esquina','minha professora de piano'],
  tenets: ['Não crie mais monstros do que a noite já tem.','O sangue paga o sangue.','O que resta de humano é o que resta de valor.','A Máscara protege a todos — inclusive de você.'],

  /* Sementes para quem foi Abraçado há muito tempo. Um conceito de
     "motorista de aplicativo" não combina com 8ª geração. */
  conceitosAntigos: ['oficial de cavalaria que nunca desmontou','boticário que virou toxicologista','copista de mosteiro','comerciante de especiarias virado importador','agiota de porto','cirurgião-barbeiro','cartógrafo de rotas que não existem mais','professor de latim aposentado à força','contrabandista de bebida dos anos 20','dona de casa de penhores há seis gerações','juiz de comarca que nunca se aposentou','ourives que ainda trabalha à mão','maestro de orquestra provinciana','capataz que virou latifundiário','senhoria de cortiço','arquivista de cartório','negociante de antiguidades','médium de salão do século XIX','coronel da guarda nacional','mestre de obras de catedral'],
  ambicoesAntigas: ['Recuperar o domínio que perdi há um século','Ver meu clã de volta ao conselho da cidade','Enterrar a última testemunha do que eu fiz','Encontrar o corpo do meu senhor','Manter a cidade exatamente como ela está','Preparar quem vai me substituir','Descobrir por que os meus mais velhos sumiram','Impedir que a Segunda Inquisição chegue aqui','Cobrar uma dívida de duzentos anos','Acordar antes que a Gehenna me encontre dormindo'],
  desejosAntigos: ['Sentir alguma coisa nova','Que alguém me trate como gente e não como instituição','Ouvir meu nome mortal de novo','Que a cidade continue de pé mais uma noite','Um sono sem sonhos','Saber se ainda sou capaz de piedade','Uma conversa que não seja negociação','Ver o rosto de quem me traiu','Que este século acabe logo','Encontrar um sangue que ainda me sacie'],
  pedrasAntigas: ['a bisneta do meu último criado','o zelador que cuida do meu refúgio','a restauradora que trata dos meus livros','o médico que assina meus atestados falsos','a família que herdou minha casa mortal','o padre da paróquia que eu financio','a arquivista que me conhece pelo nome errado','o motorista que me leva há trinta anos','a viúva do meu último gerente','o neto do homem que eu deveria ter matado']
};
