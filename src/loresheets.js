/* ============================================================
   Ficha de Sangue — Loresheets

   Loresheet é uma Vantagem comprada de 1 a 5 pontos, e cada ponto
   entrega um benefício diferente. Os benefícios por nível estão nos
   livros e não são reproduzidos aqui: o que guardamos é o catálogo —
   nome, restrição, livro e um resumo próprio do tema — mais as
   chaves que ligam cada Loresheet ao texto de contexto.

   Nome, restrição e livro conferidos em https://vtm.paradoxwikis.com/
   Só entraram os Loresheets dos livros que temos em mãos.

   Campos:
     nome   como aparece no livro (nomes próprios ficam no original)
     ds     resumo próprio do tema
     cla    lista de clãs que podem pegar; ausente = qualquer um
     naoCla clãs que não podem
     culto  exige pertencer a um culto — fica fora do sorteio
     chaves raízes de palavra que o contexto reconhece
     f      livro
   ============================================================ */

const L = (nome, ds, m) => Object.assign({ nome, ds, f:'Básico', cat:'Loresheet' }, m || {});

/* Clãs Altos e Baixos, como o Livro Básico os define para esses dois
   Loresheets. A lista varia por domínio; usamos a mais comum. */
const CLAS_ALTOS = ['Lasombra','Toreador','Tzimisce','Ventrue','Brujah','Hecata'];
const CLAS_BAIXOS = ['Gangrel','Malkavian','Nosferatu','Tremere'];

const LORESHEETS = [
  /* ---------------- Livro Básico ---------------- */
  L('The Bahari','O culto de Lilith: a Mãe Sombria, a dor como caminho e os jardins dela.',
    {culto:'Bahari', chaves:['bahari','lilith','mae sombria','jardim de lilith']}),
  L('Theo Bell','O Brujah que matou um Justicar e virou símbolo Anarquista.',
    {chaves:['theo bell','brujah anarquista','desertor anarquista']}),
  L('Cainite Heresy','A Igreja de Caim: heresia, diaconato e a caça a quem a denuncia.',
    {culto:'Igreja de Caim', chaves:['heresia cainita','igreja de caim','diacon']}),
  L('Carna','A Casa de Carna, dissidente Tremere, e a feitiçaria fora da Pirâmide.',
    {cla:['Tremere'], chaves:['carna','casa de carna','tremere dissidente']}),
  L('The Circulatory System','A rede que move sangue, corpos e segredos entre domínios.',
    {chaves:['sistema circulatorio','trafico de pessoas','contrabando de sangue','mercado de vasos']}),
  L('Convention of Thorns','A convenção que fundou a Camarilla e encerrou a Revolta Anarquista.',
    {chaves:['convencao de thorns','tratado de thorns','fundacao da camarilla']}),
  L('The First Inquisition','A caçada medieval que quase acabou com os Membros — e o que ela ensinou.',
    {chaves:['primeira inquisicao','inquisicao medieval','caca as bruxas']}),
  L('Golconda','O caminho da transcendência, e o pouco que sobrou de quem o buscou.',
    {chaves:['golconda','transcendencia','redencao do sangue','iluminacao']}),
  L('Descendant of Hardestadt','A linhagem do fundador da Camarilla, e a autoridade que ela carrega.',
    {cla:['Ventrue'], chaves:['hardestadt','descendente de hardestadt']}),
  L('Descendant of Helena','A linhagem de Helena, a Toreador que colecionava artistas.',
    {cla:['Toreador'], chaves:['helena','descendente de helena']}),
  L('Sect War Veteran','Você atravessou a guerra entre Camarilla e Sabá e sabe onde ficaram os corpos.',
    {chaves:['guerra de seitas','veterano de guerra de seita','guerra contra o saba']}),
  L('The Trinity','Constantinopla e a utopia vampírica que existiu e ruiu.',
    {chaves:['trindade','constantinopla','bizanci']}),
  L('Jeanette/Therese Voerman','As irmãs Voerman e o Asylum: a boate que serve aos dois lados.',
    {chaves:['voerman','jeanette','therese','asylum']}),
  L('The Week of Nightmares','A semana em que os Ravnos morreram e a Gehenna pareceu começar.',
    {chaves:['semana de pesadelos','week of nightmares','gehenna começou']}),
  L('Rudi','O organizador que transforma revolta difusa em ação coletiva.',
    {chaves:['rudi','organizador anarquista','sindicato de membros']}),
  L('Descendant of Tyler','A linhagem de Tyler, que derrubou um Ancião e começou a Revolta.',
    {cla:['Brujah'], chaves:['tyler','descendente de tyler']}),
  L('Descendant of Zelios','A linhagem do arquiteto Nosferatu: refúgios, labirintos e linhas de poder.',
    {cla:['Nosferatu'], chaves:['zelios','descendente de zelios','arquiteto nosferatu']}),
  L('Descendant of Vasantasena','A linhagem da Malkavian que sobrevive ao caos e desfaz Laços de Sangue.',
    {cla:['Malkavian'], chaves:['vasantasena','descendente de vasantasena']}),
  L('High Clan','Você nasceu do lado certo da hierarquia, e todo mundo sabe disso.',
    {cla:CLAS_ALTOS, chaves:['cla alto','clã alto','alta linhagem','nobreza membro']}),
  L('Low Clan','Você nasceu do lado errado da hierarquia, e aprendeu a usar isso.',
    {cla:CLAS_BAIXOS, chaves:['cla baixo','clã baixo','baixa linhagem','pária do cla']}),
  L('Ambrus Maropis','O chefe de segurança da Camarilla e a rede de informações dele.',
    {chaves:['ambrus maropis','seguranca da camarilla']}),
  L('Carmelita Neillson','A arqueóloga Toreador que escava a história dos Membros.',
    {chaves:['carmelita neillson','arqueologia membro','escavacao de relíquias']}),
  L('Fiorenza Savona','A Ventrue que opera nas cúpulas mortais: Davos, lobby, dinheiro grande.',
    {chaves:['fiorenza','savona','alta financa mortal','lobby internacional']}),
  L('Descendant of Karl Schrekt','A linhagem do Justicar Tremere, linha-dura contra o sobrenatural.',
    {cla:['Tremere'], chaves:['karl schrekt','schrekt','descendente de schrekt']}),
  L('Descendant of Xaviar','A linhagem do Gangrel que avisou sobre os Antediluvianos e sumiu.',
    {cla:['Gangrel'], chaves:['xaviar','descendente de xaviar']}),

  /* ---------------- Anarquistas ---------------- */
  L('Salvador Garcia','O veterano da Revolta de 1944 e o ideal Anarquista que ele ainda defende.',
    {f:'Anarquistas', chaves:['salvador garcia','revolta anarquista de 1944']}),
  L('Agata Starek','A Anarquista que expõe a fraqueza dos poderosos e arma os fracos.',
    {f:'Anarquistas', chaves:['agata starek']}),
  L('Hesha Ruhadze','O Ministro colecionador de relíquias e os tratados que ele guarda.',
    {f:'Anarquistas', chaves:['hesha','ruhadze','relíquia do ministerio']}),
  L('The Church of Set','A Igreja de Set e a libertação pela transgressão.',
    {culto:'Igreja de Set', f:'Anarquistas', chaves:['igreja de set','setita','church of set']}),
  L('Ruins of Carthage','Cartago: a cidade que os Brujah dizem ter sido o paraíso, e Roma a destruiu.',
    {f:'Anarquistas', chaves:['cartago','carthage','ruinas de cartago']}),
  L('Blood Plagued','A praga que passa de vampiro para vampiro, e o que ela faz com o sangue.',
    {f:'Anarquistas', chaves:['praga de sangue','blood plague','peste do vitae']}),
  L('Anarch Revolt','A queda dos príncipes tiranos e a ascensão dos barões.',
    {f:'Anarquistas', chaves:['revolta anarquista','queda do principe','barao anarquista']}),

  /* ---------------- Camarilla ---------------- */
  L('Fatima al-Faqadi','A assassina Banu Haqim e a Teia Estendida que ela opera.',
    {f:'Camarilla', chaves:['fatima','al-faqadi','assassina banu haqim']}),
  L('Pure Ventrue Lineage','Sangue Ventrue sem mistura, com a nobreza e o peso que isso traz.',
    {cla:['Ventrue'], f:'Camarilla', chaves:['linhagem ventrue pura','nobreza ventrue']}),
  L('The Cult of Mithras','O culto do deus-touro e a hierarquia iniciática dele.',
    {culto:'Mistérios Mitraicos', f:'Camarilla', chaves:['mithras','mitra','culto de mithras']}),
  L('The Pyramid','A Pirâmide Tremere: o que ruiu, o que sobrou e quem está reconstruindo.',
    {cla:['Tremere'], f:'Camarilla', chaves:['piramide tremere','pyramid','capela tremere']}),
  L('Victoria Ash','A Toreador que transforma sedução em moeda de corte.',
    {f:'Camarilla', chaves:['victoria ash','casamento de victoria']}),

  /* ---------------- Chicago by Night ---------------- */
  L('Annabelle','A Anarquista de Chicago que puxa cordas para quem precisa.',
    {f:'Chicago', chaves:['annabelle']}),
  L('Ballard Industries','Um dos pilares da economia de Chicago, e o dinheiro que ele move.',
    {f:'Chicago', chaves:['ballard industries','industria de chicago']}),
  L('Blacksite 24','A instalação militar e médica que a FIRSTLIGHT controla.',
    {f:'Chicago', chaves:['blacksite','sitio negro','instalacao militar secreta']}),
  L('The Blue Velvet','A boate que é ponto de encontro da noite Membro de Chicago.',
    {f:'Chicago', chaves:['blue velvet','boate dos membros']}),
  L('The Book of Nod','O Livro de Nod: fragmentos, cópias e as histórias de Caim.',
    {f:'Chicago', chaves:['livro de nod','book of nod','fragmentos de nod']}),
  L('Capone Gang','A herança da máfia de Capone e o que sobrou dela na cidade.',
    {f:'Chicago', chaves:['capone','mafia de chicago','gangue de capone']}),
  L('The Cobweb','A Teia: a força mística que liga todos os Malkavianos.',
    {cla:['Malkavian'], f:'Chicago', chaves:['teia malkaviana','cobweb','a teia']}),
  L('Cultivar','O culto que cultiva, parente próximo dos Bahari.',
    {culto:'Cultivar', f:'Chicago', chaves:['cultivar']}),
  L('Cult of Shalim','Os Shalimitas e o esvaziamento deliberado da alma.',
    {culto:'Culto de Shalim', f:'Chicago', chaves:['shalim','shalimita','culto de shalim']}),
  L('Descendant of Lodin','A linhagem do antigo Príncipe de Chicago.',
    {cla:['Ventrue'], f:'Chicago', chaves:['lodin','descendente de lodin']}),
  L('Descendant of Montano','A linhagem do Lasombra que atravessou séculos com prestígio intacto.',
    {cla:['Lasombra'], f:'Chicago', chaves:['montano','descendente de montano']}),
  L('Fires and Floods and the Devil’s Night','Os desastres de Chicago: o Grande Incêndio, a enchente, a Noite do Diabo.',
    {f:'Chicago', chaves:['grande incendio','enchente de chicago','noite do diabo','desastre urbano']}),
  L('Firstlight','A organização de caçadores que opera com orçamento e tecnologia.',
    {f:'Chicago', chaves:['firstlight','cacadores organizados','segunda inquisicao']}),
  L('Kevin Jackson','O Príncipe de Chicago e a rede de escolas e favores dele.',
    {f:'Chicago', chaves:['kevin jackson','principe de chicago']}),
  L('Kindred Iconography','Os símbolos que os Membros deixam nas paredes para quem sabe ler.',
    {f:'Chicago', chaves:['iconografia membro','simbolos de kindred','pichacao de membro']}),
  L('The Labyrinth','Os túneis abandonados sob Chicago e quem vive neles.',
    {f:'Chicago', chaves:['labirinto','tuneis sob a cidade','subterraneo de chicago']}),
  L('Lupine Expert','Você encontrou os Lupinos e sobreviveu para contar.',
    {f:'Chicago', chaves:['lupino','lobisomem','garou','licantropo']}),
  L('Nathaniel Bordruff','A influência que Nathaniel espalhou pela cidade — e o preço de usá-la.',
    {f:'Chicago', chaves:['nathaniel bordruff','bordruff']}),
  L('The Painted Lady','O estúdio de tatuagem, piercing e BDSM que também é ponto de encontro.',
    {f:'Chicago', chaves:['painted lady','estudio de tatuagem','bdsm']}),
  L('Revenant Family: Ducheski','A família revenante que serve aos Tremere.',
    {cla:['Tremere'], f:'Chicago', chaves:['ducheski','revenante','familia revenante']}),
  L('The Society of St. Leopold','A ordem de caçadores ligada à Igreja e ao que ela sabe.',
    {f:'Chicago', chaves:['sao leopoldo','st leopold','sociedade de sao leopoldo']}),
  L('Talley','O Lasombra caçador de recompensas conhecido como a Sombra.',
    {f:'Chicago', chaves:['talley','a sombra','cacador de recompensas membro']}),
  L('Wauneka','O corretor de informações que protege quem a cidade descartou.',
    {f:'Chicago', chaves:['wauneka','corretor de informacoes']}),

  /* ---------------- Cultos dos Deuses de Sangue ---------------- */
  L('Bankers of Dunsirn','A linhagem Dunsirn: banco, dinheiro velho e apetites piores.',
    {cla:['Hecata'], f:'Cultos', chaves:['dunsirn','banqueiros hecata']}),
  L('Children of Tenochtitlan','A linhagem Pisanob e a necromancia mesoamericana dela.',
    {cla:['Hecata'], f:'Cultos', chaves:['tenochtitlan','pisanob']}),
  L('The Nation of Blood','A linhagem Samedi: os cadáveres que andam e o que eles sabem.',
    {cla:['Hecata'], f:'Cultos', chaves:['samedi','nasyon san an','nacao de sangue'], errata:1}),
  L('Flesh-Eaters','A linhagem Nagaraja, que come carne junto com o sangue.',
    {cla:['Hecata'], f:'Cultos', chaves:['nagaraja','comedores de carne']}),
  L('Harbingers of Ashur','A linhagem Arauto e as máscaras que marcam posição.',
    {cla:['Hecata'], f:'Cultos', chaves:['arautos de ashur','harbinger','ashur']}),
  L('La Famiglia Giovanni','A família Giovanni: nepotismo, comércio e morte.',
    {cla:['Hecata'], f:'Cultos', chaves:['giovanni','famiglia','familia giovanni']}),
  L('The Criminal Puttanesca','A linhagem Puttanesca e os laços dela com o crime organizado.',
    {cla:['Hecata'], f:'Cultos', chaves:['puttanesca']}),
  L('The Gorgons','A linhagem Lamia: doença, Ressonância e a herança da serpente.',
    {cla:['Hecata'], f:'Cultos', chaves:['lamia','gorgonas','gorgon']}),
  L('Calling the Family Reunion','A Reunião de Família que juntou as linhagens e apagou os anciões delas.',
    {cla:['Hecata'], f:'Cultos', chaves:['reuniao de familia','family reunion']}),
  L('Child of the Angel Michael','O culto que quer erguer Constantinopla de novo, custe o que custar.',
    {naoCla:['Nosferatu'], culto:'Filhos do Anjo Miguel', f:'Cultos', chaves:['anjo miguel','filho do anjo','michael']}),
  L('Servitor of Irad','O culto que acredita que os Antediluvianos querem os anciões fracos.',
    {culto:'Servos de Irad', f:'Cultos', chaves:['irad','servo de irad']}),
  L('The Promise of 1528','O acordo de 500 anos entre a Camarilla e os Hecata, e o que vem quando vencer.',
    {f:'Cultos', chaves:['promessa de 1528','acordo com os hecata','tratado de 1528']})
];

/* Esta ficha pode pegar este Loresheet? */
function loresheetPermitido(ls, cla) {
  if (ls.culto) return false;                       // exige culto declarado: escolha da mesa
  if (ls.cla && !ls.cla.includes(cla)) return false;
  if (ls.naoCla && ls.naoCla.includes(cla)) return false;
  return true;
}

/* Loresheets entram no catálogo de Vantagens como qualquer outra:
   custam pontos de 1 a 5 e aparecem na mesma lista, agrupados. */
function loresheetsComoVantagens() {
  return LORESHEETS.map(ls => ({
    pt: ls.nome, en: ls.nome, min: 1, max: 5, ds: ls.ds,
    cat: 'Loresheet', f: ls.f,
    req: ls.cla ? ls.cla.join('/') + ' apenas'
       : ls.naoCla ? 'menos ' + ls.naoCla.join('/')
       : ls.culto ? ls.culto : '',
    errata: ls.errata
  }));
}
