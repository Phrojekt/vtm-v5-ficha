/* ============================================================
   Ficha de Sangue — Disciplinas e poderes

   Os valores mecânicos (custo, duração, parada de dados, parada
   oposta, nível exato do Amálgama, poder exigido, livro de origem
   e marca de errata) foram conferidos na wiki oficial da Paradox,
   https://vtm.paradoxwikis.com/ — são dados de regra, não texto.
   As descrições em `ds` são resumos próprios, escritos para caber
   na tela; não são o texto dos livros. Todos os campos da ficha
   são editáveis: cole a redação exata quando precisar dela.

   Campos de cada poder:
     lv     nível de 1 a 5
     pt/en  nome em português e em inglês
     ds     resumo próprio do que o poder faz
     am     Amálgama: 'Disciplina N' — exige N pontos nessa outra
     ex     poder que precisa ter sido aprendido antes
     c      custo
     dur    duração
     pool   parada de dados
     vs     parada oposta, quando há
     f      livro de origem (ver FONTES)
     errata 1 quando a wiki marca o poder como corrigido por errata
   ============================================================ */

/* Livros. `padrao` marca os que entram no sorteio automático —
   são os que temos em mãos. Os demais continuam na lista, para
   escolha manual, e podem ser ligados na Forja. */
const FONTES = {
  'Básico':                      { nome:'Livro Básico',                 padrao:true,  grupo:'principal' },
  'Guia Suplementar':            { nome:'Guia Suplementar (Companion)', padrao:true,  grupo:'principal' },
  'Guia do Jogador':             { nome:'Guia do Jogador',              padrao:true,  grupo:'principal' },
  'Cultos':                      { nome:'Cultos dos Deuses de Sangue',  padrao:true,  grupo:'principal' },
  'Chicago':                     { nome:'Chicago by Night',             padrao:true,  grupo:'principal' },
  'Anarquistas':                 { nome:'Anarquistas',                  padrao:true,  grupo:'principal' },
  'Camarilla':                   { nome:'Camarilla',                    padrao:true,  grupo:'principal' },
  'Queda de Londres':            { nome:'A Queda de Londres',           padrao:false, grupo:'outros' },
  'Sabá':                        { nome:'Sabá',                         padrao:false, grupo:'outros' },
  'Guerra da Gehenna':           { nome:'Guerra da Gehenna',            padrao:false, grupo:'outros' },
  'In Memoriam':                 { nome:'In Memoriam',                  padrao:false, grupo:'outros' },
  'Religiões Proibidas':         { nome:'Religiões Proibidas',          padrao:false, grupo:'outros' },
  'Filhos do Sangue':            { nome:'Filhos do Sangue',             padrao:false, grupo:'outros' },
  'Amor Manchado':               { nome:'Blood Stained Love',           padrao:false, grupo:'outros' },
  'Succubus Club':               { nome:'Live from the Succubus Club',  padrao:false, grupo:'outros' },
  'Fachada Esfarrapada':         { nome:'Tattered Façade',              padrao:false, grupo:'outros' },
  'Ruas em Vermelho':            { nome:'Let the Streets Run Red',      padrao:false, grupo:'outros' },
  'Cortes dos Condenados':       { nome:'Courts of the Damned',         padrao:false, grupo:'outros' },
  'Winter’s Teeth':              { nome:'Winter’s Teeth',               padrao:false, grupo:'outros' }
};

const P = (lv, pt, en, ds, m) => Object.assign({ lv, pt, en, ds, f:'Básico' }, m || {});

const DISCIPLINAS = {

'Animalismo': { en:'Animalism', poderes:[
  P(1,'Vínculo com Fâmulo','Bond Famulus','Liga um animal a você como companheiro permanente. Na criação já está feito.',
    {c:'Três Testes de Fome, em noites diferentes', dur:'Só a morte desfaz', pool:'Carisma + Empatia com Animais'}),
  P(1,'Sentir a Besta','Sense the Beast','Percebe fúria, fome e sobrenatureza em quem está por perto.',
    {c:'Livre', dur:'Passiva', pool:'Determinação + Animalismo', vs:'Autocontrole + Subterfúgio'}),
  P(2,'Mensageiro Animal','Animal Messenger','Manda o fâmulo levar um recado a alguém.',
    {am:'Auspícios 1', c:'Um Teste de Fome por noite', dur:'O tempo da busca', f:'Guia do Jogador'}),
  P(2,'Atavismo','Atavism','Devolve um animal ao instinto puro: ele foge ou ataca.',
    {c:'Um Teste de Fome', dur:'Margem +1 rodadas, ou a cena inteira num crítico', pool:'Autocontrole + Animalismo', f:'Guia do Jogador'}),
  P(2,'Sussurros Selvagens','Feral Whispers','Conversa com animais ou os convoca.',
    {c:'Um Teste de Fome por tipo de animal', dur:'Uma cena', pool:'Manipulação ou Carisma + Animalismo'}),
  P(3,'Comando do Mensageiro','Messenger’s Command','Usa Compelir ou Hipnotizar através do fâmulo.',
    {am:'Dominação 1', ex:'Mensageiro Animal', c:'Como o poder usado', dur:'Como Mensageiro Animal', pool:'Como Compelir ou Hipnotizar', f:'Guia do Jogador'}),
  P(3,'Suculência Animal','Animal Succulence','Sangue animal sacia muito mais.',
    {c:'Livre', dur:'Passiva'}),
  P(3,'Praga de Bestas','Plague of Beasts','Marca alguém: os bichos passam a persegui-lo.',
    {c:'Um Teste de Fome', dur:'Uma noite', pool:'Manipulação + Animalismo', vs:'Autocontrole + Empatia com Animais', f:'Guia do Jogador'}),
  P(3,'Dominar a Besta','Quell the Beast','Faz a Besta de um vampiro adormecer, ou deixa um mortal apático.',
    {c:'Um Teste de Fome', dur:'Uma cena', pool:'Carisma + Animalismo', vs:'Vigor + Determinação'}),
  P(3,'Colmeia Não-Viva','Unliving Hive','Estende o Animalismo a enxames de insetos.',
    {am:'Ofuscação 2', c:'Livre', dur:'Passiva'}),
  P(4,'Subjugar o Espírito','Subsume the Spirit','Toma o corpo de um animal.',
    {c:'Um Teste de Fome', dur:'Uma cena ou indefinida', pool:'Manipulação + Animalismo'}),
  P(4,'Comandar o Bando','Sway the Flock','Faz os animais de uma área inteira se comportarem de um jeito.',
    {c:'Um ou mais Testes de Fome', dur:'Uma noite', pool:'Autocontrole + Animalismo', f:'Guia do Jogador'}),
  P(5,'Domínio Animal','Animal Dominion','Comanda bandos e matilhas inteiros.',
    {c:'Dois Testes de Fome', dur:'Uma cena ou até a ordem se cumprir', pool:'Carisma + Animalismo'}),
  P(5,'Afagar o Temperamento Bestial','Coax the Bestial Temper','Cantarolando, facilita ou dificulta o frenesi de quem está perto.',
    {c:'Um Teste de Fome', dur:'Enquanto continuar cantarolando', pool:'Manipulação + Animalismo', f:'Guia do Jogador'}),
  P(5,'Extrair a Besta','Drawing Out the Beast','Passa o próprio frenesi para outra pessoa.',
    {c:'Um Teste de Fome', dur:'O tempo do frenesi', pool:'Raciocínio + Animalismo', vs:'Autocontrole + Determinação'})
]},

'Auspícios': { en:'Auspex', poderes:[
  P(1,'Sentidos Aguçados','Heightened Senses','Amplia os cinco sentidos a níveis sobre-humanos e soma Auspícios a percepção.',
    {c:'Livre', dur:'Até desativar', pool:'Raciocínio + Determinação'}),
  P(1,'Sentir o Invisível','Sense the Unseen','Detecta o oculto, o velado e o sobrenatural.',
    {c:'Livre', dur:'Passiva', pool:'Raciocínio ou Determinação + Auspícios'}),
  P(2,'Panaceia','Panacea','Acalma um alvo agitado e devolve Força de Vontade a ele.',
    {am:'Fortitude 1', c:'Um Teste de Fome', pool:'Autocontrole + Auspícios', f:'Guia Suplementar', errata:1}),
  P(2,'Premonição','Premonition','Lampejos do que ainda vai acontecer.',
    {c:'Livre, ou um Teste de Fome se for provocado', dur:'Passiva', pool:'Determinação + Auspícios'}),
  P(2,'Revelar o Temperamento','Reveal Temperament','Fareja a Ressonância do alvo e se há Discrasia.',
    {c:'Um Teste de Fome', dur:'Uma cena', pool:'Inteligência + Auspícios', vs:'Autocontrole + Subterfúgio', f:'Guia do Jogador'}),
  P(3,'Falha Fatal','Fatal Flaw','Enxerga a fraqueza do alvo.',
    {am:'Oblívio 1', c:'Um Teste de Fome', dur:'Uma cena', pool:'Inteligência + Auspícios', vs:'Autocontrole ou Vigor + Subterfúgio', f:'Guia do Jogador'}),
  P(3,'Sondar a Alma','Scry the Soul','Lê a aura: emoções, doenças, natureza sobrenatural.',
    {c:'Um Teste de Fome', dur:'Um turno', pool:'Inteligência + Auspícios', vs:'Autocontrole + Subterfúgio'}),
  P(3,'Compartilhar os Sentidos','Share the Senses','Enxerga e escuta pelos sentidos de outra pessoa.',
    {c:'Um Teste de Fome', dur:'Uma cena', pool:'Determinação + Auspícios'}),
  P(3,'Visão Vermínia','Vermin Vision','Vê pelos olhos dos bichos de uma região.',
    {am:'Animalismo 2', c:'Um Teste de Fome', dur:'Uma cena', pool:'Determinação + Animalismo', f:'Queda de Londres', errata:1}),
  P(4,'Toque do Espírito','Spirit’s Touch','Lê o resíduo emocional de um objeto ou lugar.',
    {c:'Um Teste de Fome', dur:'Um turno', pool:'Inteligência + Auspícios'}),
  P(5,'Clarividência','Clairvoyance','Percebe um local inteiro à distância.',
    {c:'Um Teste de Fome', dur:'De minutos a uma noite', pool:'Inteligência + Auspícios'}),
  P(5,'Possessão','Possession','Toma o corpo de um mortal.',
    {am:'Dominação 3', c:'Dois Testes de Fome', dur:'Até encerrar', pool:'Determinação + Auspícios', vs:'Determinação + Inteligência'}),
  P(5,'Telepatia','Telepathy','Lê a mente e projeta pensamentos.',
    {c:'Um Teste de Fome; uma Força de Vontade contra vampiro que não consente', dur:'Um minuto por Teste de Fome', pool:'Determinação + Auspícios', vs:'Raciocínio + Subterfúgio'}),
  P(5,'Aliviando a Alma Bestial','Unburdening the Bestial Soul','Remove Máculas de outro Membro e o protege de novas.',
    {am:'Dominação 3', c:'Dois Testes de Fome e uma Mácula', dur:'Uma sessão', pool:'Autocontrole + Auspícios', f:'Guia Suplementar'})
]},

'Celeridade': { en:'Celerity', poderes:[
  P(1,'Graça Felina','Cat’s Grace','Nunca perde o equilíbrio.',
    {c:'Livre', dur:'Passiva'}),
  P(1,'Reflexos Rápidos','Rapid Reflexes','Reage mais rápido e ganha ações menores de graça.',
    {c:'Livre', dur:'Passiva'}),
  P(2,'Ligeireza','Fleetness','Soma Celeridade a testes de Destreza fora de combate e à defesa.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(2,'Trabalho Relâmpago','Rush Job','Faz em segundos o que levaria horas.',
    {c:'Um Teste de Fome', dur:'Uma cena', f:'Guia do Jogador'}),
  P(3,'Piscar','Blink','Cobre a distância como se teleportasse.',
    {c:'Um Teste de Fome', dur:'Um turno', pool:'Destreza + Atletismo'}),
  P(3,'Travessia','Traversal','Corre por paredes e sobre a água.',
    {c:'Um Teste de Fome', dur:'Um turno', pool:'Destreza + Atletismo'}),
  P(3,'Esquiva Tecida','Weaving','Ignora a penalidade de se esquivar de vários atiradores.',
    {c:'Um Teste de Fome', dur:'Uma cena', f:'Guia do Jogador'}),
  P(4,'Ímpeto Borrado','Blurred Momentum','Ataques com menos sucessos que sua Celeridade simplesmente erram.',
    {c:'Um Teste de Fome por turno', dur:'Até deixar passar', f:'Guia do Jogador'}),
  P(4,'Gole de Elegância','Draught of Elegance','Seu vitae concede Celeridade a quem bebe.',
    {c:'Um Teste de Fome', dur:'Uma noite'}),
  P(4,'Pontaria Infalível','Unerring Aim','O mundo desacelera e o tiro não erra.',
    {am:'Auspícios 2', c:'Um Teste de Fome', dur:'Um único ataque'}),
  P(5,'Golpe Relâmpago','Lightning Strike','Ataca antes que qualquer um perceba.',
    {c:'Um Teste de Fome', dur:'Um único ataque'}),
  P(5,'Fração de Segundo','Split Second','Reescreve um instante da cena a seu favor.',
    {c:'Um Teste de Fome', dur:'Uma ação, a critério do Narrador'})
]},

'Dominação': { en:'Dominate', poderes:[
  P(1,'Nublar a Memória','Cloud Memory','Apaga o momento presente da lembrança do alvo.',
    {c:'Livre', dur:'Indefinida', pool:'Carisma + Dominação', vs:'Raciocínio + Determinação'}),
  P(1,'Compelir','Compel','Uma ordem curta, obedecida na hora.',
    {c:'Livre', dur:'No máximo uma cena', pool:'Carisma + Dominação', vs:'Inteligência + Determinação'}),
  P(1,'Devoção Servil','Slavish Devotion','Quem já está sob sua Dominação resiste melhor à de outros.',
    {am:'Fortitude 1', c:'Livre', dur:'Passiva', f:'Cultos', errata:1}),
  P(2,'Hipnotizar','Mesmerize','Ordens complexas, cumpridas com método.',
    {c:'Um Teste de Fome', dur:'Até cumprir a ordem ou a cena acabar', pool:'Manipulação + Dominação', vs:'Inteligência + Determinação'}),
  P(2,'Alienação','Dementation','Empurra a vítima para a loucura.',
    {am:'Ofuscação 2', c:'Um Teste de Fome por alvo por cena', dur:'Uma cena', pool:'Manipulação + Dominação', vs:'Autocontrole + Inteligência'}),
  P(2,'Favor do Domitor','Domitor’s Favor','Servos sob Laço de Sangue têm muito mais dificuldade de desobedecer.',
    {c:'Um Teste de Fome', dur:'Um mês', f:'Guia Suplementar'}),
  P(3,'A Mente Esquecida','Forgetful Mind','Reescreve memórias inteiras.',
    {c:'Um Teste de Fome', dur:'Indefinida', pool:'Manipulação + Dominação', vs:'Inteligência + Determinação'}),
  P(3,'Diretriz Submersa','Submerged Directive','Deixa a ordem plantada para disparar depois.',
    {c:'Livre', dur:'Passiva'}),
  P(4,'Domínio Ancestral','Ancestral Dominion','Comanda um descendente do próprio sangue, contra a vontade dele.',
    {am:'Feitiçaria de Sangue 2', c:'Um Teste de Fome', dur:'Até cumprir a ordem ou a cena acabar', pool:'Manipulação + Dominação', vs:'Determinação + Ocultismo', f:'Cultos', errata:1}),
  P(4,'Implantar Sugestão','Implant Suggestion','Muda temporariamente a personalidade ou a opinião do alvo.',
    {am:'Presença 1', c:'Um Teste de Fome', dur:'Uma cena', pool:'Manipulação + Dominação', vs:'Autocontrole + Determinação', f:'Guia do Jogador'}),
  P(4,'Racionalizar','Rationalize','A vítima acredita que a ideia sempre foi dela.',
    {c:'Livre', dur:'Indefinida'}),
  P(5,'Manipulação em Massa','Mass Manipulation','Estende a Dominação a uma multidão.',
    {c:'Um Teste de Fome além do poder ampliado', dur:'Como o poder ampliado'}),
  P(5,'Decreto Terminal','Terminal Decree','A ordem passa por cima do instinto de sobrevivência.',
    {c:'Livre, mas gera Máculas', dur:'Passiva'})
]},

'Fortitude': { en:'Fortitude', poderes:[
  P(1,'Resiliência','Resilience','Soma Fortitude à trilha de Vitalidade.',
    {c:'Livre', dur:'Passiva'}),
  P(1,'Mente Inabalável','Unswayable Mind','Soma Fortitude a tudo que tente dobrar sua vontade.',
    {c:'Livre', dur:'Passiva'}),
  P(2,'Perseverança da Terra','Earth’s Perseverance','Fica impossível de tirar do lugar.',
    {c:'Um Teste de Fome', dur:'Uma cena ou até soltar', f:'Guia do Jogador'}),
  P(2,'Bestas Resistentes','Enduring Beasts','Empresta sua resistência aos animais.',
    {am:'Animalismo 1', c:'Um Teste de Fome', dur:'Uma cena', pool:'Vigor + Animalismo'}),
  P(2,'Vitae Revigorante','Invigorating Vitae','Seu sangue cura mortais mais rápido.',
    {am:'Auspícios 1', c:'Só os Testes de Fome de ceder sangue', dur:'Passiva', f:'Guia do Jogador'}),
  P(2,'Rijeza','Toughness','Subtrai Fortitude do dano superficial antes de dividir pela metade.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(3,'Desafiar a Ruína','Defy Bane','Converte dano agravado em superficial.',
    {c:'Um Teste de Fome', dur:'Uma cena ou até gastar', pool:'Raciocínio + Sobrevivência'}),
  P(3,'Fortificar a Fachada Interior','Fortify the Inner Façade','Blinda a mente contra leitura e invasão.',
    {c:'Livre', dur:'Uma cena'}),
  P(3,'Valeren','Valeren','Projeta sua Fortitude para curar outro vampiro.',
    {am:'Auspícios 1', c:'Um Teste de Fome', pool:'Inteligência + Fortitude', f:'Guia Suplementar'}),
  P(4,'Gole de Resistência','Draught of Endurance','Seu vitae concede Fortitude a quem bebe.',
    {c:'Um Teste de Fome, mais os de quem bebe', dur:'Uma noite'}),
  P(4,'Escamas da Górgona','Gorgon’s Scales','A Ressonância do sangue vira uma proteção diferente a cada tipo.',
    {c:'Um Teste de Fome', dur:'Uma cena ou até perder a Ressonância', f:'Guia do Jogador'}),
  P(4,'Estilhaçar','Shatter','O dano que a Rijeza absorve volta para quem bateu.',
    {c:'Um Teste de Fome', dur:'Uma cena ou até ser atingido', f:'Cultos'}),
  P(5,'Carne de Mármore','Flesh of Marble','Ignora a primeira fonte de dano físico de cada turno.',
    {c:'Dois Testes de Fome', dur:'Uma cena'}),
  P(5,'Vigor da Dor','Prowess from Pain','Sem penalidade por ferimento, e cada nível de dano vira Atributo.',
    {c:'Um Teste de Fome', dur:'Uma cena'})
]},

'Ofuscação': { en:'Obfuscate', poderes:[
  P(1,'Manto de Sombras','Cloak of Shadows','Some no cenário enquanto ficar parado.',
    {c:'Livre', dur:'Uma cena'}),
  P(1,'Silêncio da Morte','Silence of Death','Anula todo som que você produz.',
    {c:'Livre', dur:'Uma cena'}),
  P(2,'Quimerismo','Chimerstry','Alucinações curtas e convincentes.',
    {am:'Presença 1', c:'Um Teste de Fome', dur:'Um turno', pool:'Manipulação + Ofuscação', vs:'Autocontrole + Raciocínio', f:'Guia Suplementar'}),
  P(2,'Passagem Invisível','Unseen Passage','Move-se sem ser notado.',
    {c:'Um Teste de Fome', dur:'Uma cena ou até ser descoberto'}),
  P(2,'Ventriloquismo','Ventriloquism','Projeta a voz só para quem escolher.',
    {am:'Auspícios 2', c:'Um Teste de Fome', dur:'Uma cena', pool:'Raciocínio + Ofuscação', vs:'Determinação + Autocontrole', f:'Queda de Londres', errata:1}),
  P(3,'Fata Morgana','Fata Morgana','Ilusões elaboradas que enganam todos os sentidos.',
    {am:'Presença 2', c:'Um Teste de Fome', dur:'Uma cena', pool:'Manipulação + Ofuscação', f:'Guia Suplementar'}),
  P(3,'Fantasma na Máquina','Ghost in the Machine','Some também de câmeras e transmissões ao vivo.',
    {c:'Livre', dur:'Como o poder usado'}),
  P(3,'Máscara de Mil Faces','Mask of a Thousand Faces','Assume um rosto anônimo e plausível, e pode conversar.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(3,'Labirinto Mental','Mental Maze','Tira da vítima todo senso de direção e de lugar.',
    {am:'Dominação 1', c:'Um ou três Testes de Fome', dur:'Uma noite', pool:'Carisma + Ofuscação', vs:'Raciocínio + Determinação', f:'Cultos'}),
  P(3,'Máscara da Mente','Mind Masque','Troca as emoções e os pensamentos que os outros conseguem ler.',
    {am:'Dominação 2', c:'Um Teste de Fome', dur:'Uma cena', pool:'Inteligência + Ofuscação', f:'Guia do Jogador'}),
  P(4,'Ocultar','Conceal','Esconde um objeto inanimado, ou um lugar.',
    {am:'Auspícios 3', c:'Um Teste de Fome', dur:'Uma noite, mais uma por ponto de margem', pool:'Inteligência + Ofuscação'}),
  P(4,'Desaparecer','Vanish','Aciona o Manto ou a Passagem mesmo estando sob observação.',
    {c:'Como o poder ampliado', dur:'Como o poder ampliado', pool:'Raciocínio + Ofuscação', vs:'Raciocínio + Percepção'}),
  P(5,'Encobrir a Reunião','Cloak the Gathering','Estende a Ofuscação aos companheiros.',
    {c:'Um Teste de Fome além do poder estendido', dur:'Como o poder estendido'}),
  P(5,'Disfarce do Impostor','Impostor’s Guise','Copia o rosto e a voz de uma pessoa específica.',
    {c:'Um Teste de Fome', dur:'Uma cena', pool:'Raciocínio + Ofuscação', vs:'Manipulação + Performance'})
]},

'Potência': { en:'Potence', poderes:[
  P(1,'Corpo Letal','Lethal Body','Mãos nuas causam dano agravado a mortais e ignoram parte da armadura.',
    {c:'Livre', dur:'Passiva'}),
  P(1,'Salto Elevado','Soaring Leap','Salta muito mais alto e mais longe.',
    {c:'Livre', dur:'Passiva'}),
  P(2,'Proeza','Prowess','Soma Potência ao dano desarmado e a feitos de Força.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(2,'Agarre Implacável','Relentless Grasp','Uma pegada que não cede.',
    {c:'Um Teste de Fome', dur:'Uma cena', f:'Guia do Jogador'}),
  P(3,'Alimentação Brutal','Brutal Feed','Drena um vaso em segundos, de forma violenta e suja.',
    {c:'Livre', dur:'Uma alimentação'}),
  P(3,'Faísca de Fúria','Spark of Rage','Soma Potência para incendiar a raiva de alguém ou de uma multidão.',
    {am:'Presença 3', c:'Um Teste de Fome', dur:'Uma cena'}),
  P(3,'Aderência Sobrenatural','Uncanny Grip','Agarra-se a quase qualquer superfície e escala sem apoio.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(3,'Demolidor','Wrecker','Dobra a Potência em feitos de força bruta.',
    {ex:'Proeza', c:'Livre', dur:'Como a Proeza', f:'Guia do Jogador'}),
  P(4,'Gole de Poder','Draught of Might','Seu vitae concede Potência a quem bebe.',
    {c:'Um Teste de Fome', dur:'Uma noite'}),
  P(4,'Impacto','Crash Down','Cai do salto causando dano em área.',
    {ex:'Salto Elevado', c:'Um Teste de Fome', pool:'Força + Potência', vs:'Destreza + Atletismo', f:'Guia do Jogador'}),
  P(5,'Abalo Sísmico','Earth Shock','Um golpe no chão derruba todo mundo em volta.',
    {c:'Dois Testes de Fome', dur:'Um uso'}),
  P(5,'Punho de Caim','Fist of Caine','Golpes desarmados causam dano agravado até em Membros.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(5,'Martelo Sutil','Subtle Hammer','Concentra toda a força num ponto do corpo.',
    {c:'Livre', dur:'Passiva', f:'Guia do Jogador'})
]},

'Presença': { en:'Presence', poderes:[
  P(1,'Deslumbrar','Awe','Soma Presença a Persuasão, Performance e testes de Carisma.',
    {c:'Livre', dur:'Uma cena ou até encerrar'}),
  P(1,'Amedrontar','Daunt','Soma Presença a Intimidação; todos preferem sair do caminho.',
    {c:'Livre', dur:'Uma cena ou até encerrar'}),
  P(1,'Olhos da Serpente','Eyes of the Serpent','Prende a vítima com o olhar.',
    {am:'Proteanismo 1', c:'Livre', dur:'Enquanto durar o olhar', pool:'Carisma + Presença', vs:'Raciocínio + Autocontrole', f:'Anarquistas'}),
  P(2,'Beijo Persistente','Lingering Kiss','A mordida vicia o vaso e melhora os Atributos Sociais dele por uma noite.',
    {c:'Livre', dur:'Noites iguais à sua Presença'}),
  P(2,'Melpomínia','Melpominee','Usa Presença só com a voz, sem precisar ver o alvo.',
    {c:'Livre', pool:'Carisma + Presença', f:'Guia do Jogador'}),
  P(3,'Olhar Terrível','Dread Gaze','Um olhar que faz a vítima fugir de pavor.',
    {c:'Um Teste de Fome', dur:'Um turno', pool:'Carisma + Presença', vs:'Autocontrole + Determinação'}),
  P(3,'Fascinar','Entrancement','A vítima passa a querer agradar você acima de tudo.',
    {c:'Um Teste de Fome', dur:'Uma hora, mais uma por ponto de margem', pool:'Carisma + Presença', vs:'Autocontrole + Raciocínio'}),
  P(3,'Voz Projetada','Thrown Voice','Deixa a própria voz num ponto qualquer à vista.',
    {am:'Auspícios 1', c:'Um Teste de Fome', dur:'Uma cena', f:'Guia do Jogador'}),
  P(3,'Rosto do Amor Verdadeiro','True Love’s Face','A vítima vê em você alguém por quem tem laço afetivo forte.',
    {am:'Ofuscação 3', c:'Um Teste de Fome', dur:'Uma cena', pool:'Manipulação + Presença', vs:'Autocontrole + Raciocínio', f:'Cultos'}),
  P(4,'Voz Irresistível','Irresistible Voice','A voz sozinha já basta para usar Dominação.',
    {am:'Dominação 1', c:'Sem custo adicional', dur:'Passiva'}),
  P(4,'Impregnar o Edifício','Suffuse the Edifice','Deixa a Presença impregnada num prédio inteiro.',
    {c:'Como o poder transmitido', dur:'Como o poder transmitido', f:'Guia do Jogador'}),
  P(4,'Convocar','Summon','Chama alguém que já provou seu sangue ou sua Presença, de qualquer distância.',
    {c:'Um Teste de Fome', dur:'Uma noite', pool:'Manipulação + Presença', vs:'Autocontrole + Inteligência'}),
  P(5,'Majestade','Majesty','Quem olha para você fica sem reação, a não ser fugir.',
    {c:'Dois Testes de Fome', dur:'Uma cena', pool:'Carisma + Presença', vs:'Autocontrole + Determinação'}),
  P(5,'Magnetismo Estelar','Star Magnetism','A Presença atravessa transmissões ao vivo.',
    {c:'Um Teste de Fome adicional', dur:'Como o poder usado'})
]},

'Proteanismo': { en:'Protean', poderes:[
  P(1,'Olhos da Besta','Eyes of the Beast','Enxerga na escuridão total.',
    {c:'Livre', dur:'Enquanto quiser'}),
  P(1,'Peso da Pena','Weight of the Feather','Torna-se quase sem peso.',
    {c:'Livre', dur:'Enquanto quiser', pool:'Raciocínio + Sobrevivência'}),
  P(2,'Armas Ferais','Feral Weapons','Garras ou presas que rasgam até Membros.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(2,'Vicissitude','Vicissitude','Esculpe a própria carne: feições, armas, armadura.',
    {am:'Dominação 2', c:'Um Teste de Fome', dur:'Permanente', pool:'Determinação + Proteanismo', f:'Guia Suplementar'}),
  P(3,'Fusão com a Terra','Earth Meld','Afunda no solo nu e dorme em segurança.',
    {c:'Um Teste de Fome', dur:'Um dia ou mais, ou até ser perturbado'}),
  P(3,'Modelagem de Carne','Fleshcrafting','Estende a Vicissitude ao corpo dos outros.',
    {am:'Dominação 2', ex:'Vicissitude', c:'Um Teste de Fome', dur:'Permanente', pool:'Determinação + Proteanismo', vs:'Vigor + Determinação', f:'Guia Suplementar'}),
  P(3,'Metamorfose','Shapechange','Vira um animal de massa parecida com a sua.',
    {c:'Um Teste de Fome', dur:'Uma cena, salvo se encerrar antes'}),
  P(4,'Forma Horrenda','Horrid Form','Assume uma forma monstruosa.',
    {am:'Dominação 2', ex:'Vicissitude', c:'Um Teste de Fome', dur:'Uma cena', f:'Guia Suplementar'}),
  P(4,'Transmutação','Metamorphosis','Ganha uma segunda forma animal, sem limite de tamanho.',
    {ex:'Metamorfose', c:'Um Teste de Fome', dur:'Uma cena'}),
  P(5,'Forma de Névoa','Mist Form','Dissolve-se em neblina.',
    {c:'De uma a três Testes de Fome', dur:'Uma cena'}),
  P(5,'Um com a Terra','One with the Land','Funde-se ao solo de todo o seu Domínio.',
    {am:'Animalismo 2', ex:'Fusão com a Terra', c:'Dois Testes de Fome', dur:'Um dia ou mais', f:'Guia Suplementar'}),
  P(5,'O Coração das Trevas','The Heart of Darkness','Arranca o próprio coração e o guarda fora do corpo.',
    {am:'Fortitude 2', c:'Livre', dur:'Permanente, até o coração voltar ou ser destruído', f:'Cultos'}),
  P(5,'O Coração Desprendido','The Unfettered Heart','O coração se move no peito: estacas não o encontram.',
    {c:'Livre', dur:'Passiva'})
]},

'Feitiçaria de Sangue': { en:'Blood Sorcery', ritual:'Rituais', poderes:[
  P(1,'Vitae Corrosivo','Corrosive Vitae','Seu sangue queima matéria como ácido.',
    {c:'Um ou mais Testes de Fome'}),
  P(1,'Um Gosto pelo Sangue','A Taste for Blood','Prova o sangue e lê quem é o dono.',
    {c:'Livre', pool:'Determinação + Feitiçaria de Sangue'}),
  P(2,'Extinguir o Vitae','Extinguish Vitae','Queima o sangue armazenado de outro Membro e aumenta a Fome dele.',
    {c:'Um Teste de Fome', pool:'Inteligência + Feitiçaria de Sangue', vs:'Vigor + Autocontrole'}),
  P(2,'Vasculhar Segredos','Scour Secrets','Varre um volume enorme de texto em minutos.',
    {c:'Um Teste de Fome', dur:'Uma noite ou até achar', pool:'Inteligência + Feitiçaria de Sangue', f:'Guia do Jogador', errata:1}),
  P(3,'Sangue de Potência','Blood of Potency','Eleva a própria Potência de Sangue por um tempo.',
    {c:'Um Teste de Fome', dur:'Uma cena ou uma noite', pool:'Determinação + Feitiçaria de Sangue'}),
  P(3,'Toque do Escorpião','Scorpion’s Touch','Transforma o próprio vitae em veneno paralisante.',
    {c:'Um ou mais Testes de Fome', dur:'Uma cena', pool:'Força + Feitiçaria de Sangue', vs:'Vigor + Ocultismo ou Fortitude'}),
  P(4,'Roubo de Vitae','Theft of Vitae','Arranca o sangue da vítima pelo ar.',
    {c:'Um Teste de Fome', dur:'Uma alimentação', pool:'Raciocínio + Feitiçaria de Sangue', vs:'Raciocínio + Ocultismo'}),
  P(4,'Égide de Sangue','Blood Aegis','Ergue uma barreira de sangue.',
    {c:'Um ou mais Testes de Fome', dur:'Uma cena ou até absorver o dano', f:'Guia do Jogador'}),
  P(5,'Carícia de Baal','Baal’s Caress','Uma arma envenenada com seu vitae causa dano agravado.',
    {c:'Um ou mais Testes de Fome', dur:'Uma cena', pool:'Força + Feitiçaria de Sangue', vs:'Vigor + Ocultismo ou Fortitude'}),
  P(5,'Caldeirão de Sangue','Cauldron of Blood','Ferve o sangue dentro da vítima.',
    {c:'Um Teste de Fome e Máculas', dur:'Um turno', pool:'Determinação + Feitiçaria de Sangue', vs:'Autocontrole + Ocultismo ou Fortitude'})
]},

'Oblívio': { en:'Oblivion', ritual:'Cerimônias', poderes:[
  P(1,'Cinzas às Cinzas','Ashes to Ashes','Dissolve um cadáver.',
    {c:'Um Teste de Fome', dur:'Variável', pool:'Vigor + Oblívio', vs:'Vigor + Medicina ou Fortitude', f:'Cultos'}),
  P(1,'Elo de Ligação','Binding Fetter','Reconhece pelos sentidos o objeto a que um espectro está preso.',
    {c:'Livre', dur:'Uma cena', pool:'Raciocínio + Oblívio', f:'Cultos', errata:1}),
  P(1,'Visão do Oblívio','Oblivion Sight','Enxerga no escuro e vê os mortos que estão ali.',
    {c:'Livre', dur:'Uma cena', f:'Chicago'}),
  P(1,'Manto Sombrio','Shadow Cloak','As sombras se ajustam a você: bônus em Furtividade e em Intimidação.',
    {c:'Livre', dur:'Passiva', f:'Chicago'}),
  P(2,'Braços de Ahriman','Arms of Ahriman','Tentáculos de sombra que agarram e esmagam.',
    {am:'Potência 2', c:'Um Teste de Fome', dur:'Uma cena ou até serem destruídos', pool:'Raciocínio + Oblívio', f:'Chicago'}),
  P(2,'Precognição Fatal','Fatal Precognition','Vê a morte de alguém que não é vampiro.',
    {am:'Auspícios 2', c:'Um Teste de Fome', dur:'Até se cumprir ou ser evitada', pool:'Determinação + Oblívio', f:'Cultos'}),
  P(2,'Projetar Sombra','Shadow Cast','Cria uma sombra onde não deveria haver.',
    {c:'Um Teste de Fome', dur:'Uma cena', f:'Chicago'}),
  P(2,'Onde o Véu se Adelgaça','Where the Veil Thins','Mede a espessura da Mortalha ali.',
    {c:'Um Teste de Fome', dur:'Um turno', pool:'Inteligência + Oblívio', f:'Cultos', errata:1}),
  P(3,'Aura de Decadência','Aura of Decay','Ao redor, plantas murcham, gente adoece e comida estraga.',
    {c:'Um Teste de Fome', dur:'Uma cena', pool:'Vigor + Oblívio', vs:'Vigor + Medicina ou Fortitude', f:'Cultos'}),
  P(3,'Banquete de Paixão','Passion Feast','Sacia a Fome na paixão dos espectros.',
    {am:'Fortitude 2', c:'Livre', dur:'Passiva', pool:'Determinação + Oblívio', vs:'Determinação + Autocontrole', f:'Cultos'}),
  P(3,'Perspectiva das Sombras','Shadow Perspective','Projeta os sentidos numa sombra à vista.',
    {c:'Um Teste de Fome', dur:'Até uma cena', f:'Chicago'}),
  P(3,'Servo das Sombras','Shadow Servant','Usa uma sombra para espiar ou aterrorizar.',
    {am:'Auspícios 1', c:'Um Teste de Fome', dur:'Uma cena', f:'Guia do Jogador'}),
  P(3,'Toque do Oblívio','Touch of Oblivion','Um toque que necrosa o membro.',
    {c:'Um Teste de Fome', dur:'Um turno', f:'Chicago'}),
  P(4,'Praga Necrótica','Necrotic Plague','Impõe uma doença degenerativa.',
    {c:'Um Teste de Fome', dur:'Variável', pool:'Inteligência + Oblívio', vs:'Vigor + Medicina ou Fortitude', f:'Cultos', errata:1}),
  P(4,'Mortalha Estígia','Stygian Shroud','Escuridão jorra de uma sombra e engole a área.',
    {c:'Um Teste de Fome', dur:'Uma cena', f:'Chicago'}),
  P(5,'Passo das Sombras','Shadow Step','Entra numa sombra e sai por outra à vista.',
    {c:'Um Teste de Fome', dur:'Um turno', f:'Chicago'}),
  P(5,'Skuld Cumprido','Skuld Fulfilled','Devolve à vítima uma doença ou ferida da qual ela já se curou.',
    {c:'Dois Testes de Fome', dur:'Variável', pool:'Vigor + Oblívio', vs:'Vigor + Vigor ou Fortitude', f:'Cultos', errata:1}),
  P(5,'Avatar Tenebroso','Tenebrous Avatar','Torna-se sombra viva.',
    {c:'Dois Testes de Fome', dur:'Uma cena', f:'Chicago'}),
  P(5,'Espírito Definhante','Withering Spirit','Corrói o espírito da vítima até sobrar uma casca.',
    {c:'Dois Testes de Fome e Máculas', dur:'Um turno', pool:'Determinação + Oblívio', vs:'Determinação + Ocultismo ou Fortitude', f:'Cultos'})
]},

'Alquimia de Sangue-ralo': { en:'Thin-blood Alchemy', poderes:[
  P(1,'Alcance Distante','Far Reach','Empurra, puxa e segura coisas com a mente.',
    {c:'Um Teste de Fome', dur:'Um turno, ou enquanto mantiver', pool:'Determinação + Alquimia', vs:'Força + Atletismo'}),
  P(1,'Neblina','Haze','Levanta um nevoeiro que acompanha você.',
    {c:'Um Teste de Fome', dur:'Uma cena'}),
  P(2,'Envolver','Envelop','Uma névoa que gruda na vítima e sufoca.',
    {c:'Um Teste de Fome', dur:'Uma cena', pool:'Raciocínio + Alquimia', vs:'Vigor + Sobrevivência'}),
  P(2,'Falsificar Disciplina (1 ponto)','Counterfeit Discipline','Imita um poder de Disciplina de nível 1.',
    {c:'Como o poder imitado', dur:'Como o poder imitado', pool:'Como o poder imitado'}),
  P(3,'Desfracionar','Defractionate','Devolve sangue de bolsa ao estado que sacia qualquer Membro.',
    {c:'Livre'}),
  P(3,'Hieros Gamos Profano','Profane Hieros Gamos','Remodela o corpo na forma humana que quiser.',
    {c:'Um Teste de Fome, ou dano agravado para mudanças maiores', dur:'Permanente', pool:'Vigor + Determinação'}),
  P(3,'Falsificar Disciplina (2 pontos)','Counterfeit Discipline','Imita um poder de Disciplina de nível 2.',
    {c:'Como o poder imitado', dur:'Como o poder imitado', pool:'Como o poder imitado'}),
  P(4,'Ímpeto Aéreo','Airborne Momentum','Voa.',
    {c:'Um Teste de Fome', dur:'Uma cena', pool:'Força + Alquimia', vs:'Força + Atletismo'}),
  P(4,'Falsificar Disciplina (3 pontos)','Counterfeit Discipline','Imita um poder de Disciplina de nível 3.',
    {c:'Como o poder imitado', dur:'Como o poder imitado', pool:'Como o poder imitado'}),
  P(5,'Despertar o Adormecido','Awaken the Sleeper','Tira um vampiro do torpor.',
    {c:'Um Teste de Fome'}),
  P(5,'Falsificar Disciplina (4 pontos)','Counterfeit Discipline','Imita um poder de Disciplina de nível 4.',
    {c:'Como o poder imitado', dur:'Como o poder imitado', pool:'Como o poder imitado'})
]}

};

/* Poderes de suplementos que não estavam no catálogo. Mesma
   procedência dos demais (valores da wiki oficial, resumos próprios).
   Ficam fora do sorteio quando o livro não está ligado na Forja. */
const PODERES_EXTRA = {
  'Auspícios': [
    P(2,'Rastro Infalível','Unerring Pursuit','Marca alguém e sabe onde ele está, noite após noite.',
      {am:'Dominação 1', c:'Um Teste de Fome', dur:'Uma noite, mais uma por sucesso', pool:'Determinação + Auspícios', f:'Sabá'})
  ],
  'Dominação': [
    P(2,'A Voz Roubada','The Stolen Voice','Tira da vítima a fala, a escrita e os gestos.',
      {c:'Um Teste de Fome', dur:'Uma cena', pool:'Autocontrole + Dominação', vs:'Determinação + Performance', f:'Fachada Esfarrapada'}),
    P(3,'Cadeia de Comando','Chain of Command','O Hipnotizado cumpre ordens complexas com consciência e arregimenta ajuda.',
      {ex:'Hipnotizar', c:'Um Teste de Fome', dur:'Até cumprir a ordem ou a cena acabar', f:'Cortes dos Condenados'}),
    P(4,'Tabula Rasa','Tabula Rasa','Apaga a memória até a vítima não saber quem é.',
      {c:'Dois Testes de Fome', dur:'Permanente', pool:'Determinação + Dominação', vs:'Autocontrole + Determinação', f:'Sabá'}),
    P(5,'Chamado de Lete','Lethe’s Call','Apaga semanas de memória. Exige Nublar a Memória ou A Mente Esquecida.',
      {c:'Um Teste de Fome', dur:'Indefinida', pool:'Manipulação + Dominação', vs:'Inteligência + Determinação', f:'Guerra da Gehenna'})
  ],
  'Fortitude': [
    P(2,'Obstinado','Obdurate','Mantém o pé firme contra impactos enormes.',
      {am:'Potência 2', c:'Um Teste de Fome', dur:'Uma cena', pool:'Raciocínio + Sobrevivência', f:'Winter’s Teeth'}),
    P(2,'Autoconfiança','Self-Assurance','Absorve dano de Força de Vontade em combate social.',
      {ex:'Mente Inabalável', c:'Um Teste de Fome', dur:'Uma cena ou até esgotar', f:'Succubus Club'}),
    P(3,'Selar a Boca da Besta','Seal the Beast’s Maw','Ignora a Fome por uma cena, ao custo de dados.',
      {c:'Dois Testes de Fome', dur:'Uma cena', f:'Religiões Proibidas'}),
    P(3,'Alma Calejada','Calloused Soul','Aceita Máculas antes da hora para se blindar contra as próximas.',
      {c:'Duas Máculas', dur:'Uma noite', f:'Fachada Esfarrapada'}),
    P(5,'Escudos de Carne','Meat Shields','Mortais frágeis por perto reforçam sua Fortitude.',
      {c:'Um Teste de Fome', dur:'Uma cena ou até se afastar deles', f:'Fachada Esfarrapada'})
  ],
  'Ofuscação': [
    P(1,'Encobrir','Ensconce','Objetos pequenos no corpo passam despercebidos.',
      {c:'Livre', dur:'Uma cena', f:'Guerra da Gehenna'}),
    P(1,'Máscara das Eras','Mask of Ages','Parece mais velho ou mais jovem.',
      {c:'Um Teste de Fome', dur:'Até o amanhecer', f:'Succubus Club'}),
    P(2,'Esconderijo','Cache','Esconde objetos que você não está segurando.',
      {ex:'Encobrir', c:'Um Teste de Fome', dur:'Uma cena ou até o amanhecer', f:'Guerra da Gehenna'}),
    P(2,'Passagem do Fantasma','Ghost’s Passing','Apaga o rastro de um animal.',
      {am:'Animalismo 1', c:'Um Teste de Fome', dur:'Uma sessão', f:'Religiões Proibidas'}),
    P(2,'Conversa Dupla','Doubletalk','Diz uma coisa e passa outra, em segredo.',
      {am:'Auspícios 1', c:'Um Teste de Fome', dur:'Uma fala', pool:'Autocontrole + Ofuscação', vs:'Raciocínio + Auspícios', f:'Amor Manchado'}),
    P(3,'Máscara do Isolamento','Mask of Isolation','Ninguém reconhece a vítima.',
      {am:'Dominação 1', ex:'Máscara de Mil Faces', c:'Um Teste de Fome', dur:'Uma noite, mais uma por ponto de margem', pool:'Manipulação + Ofuscação', vs:'Carisma + Intuição', f:'Sabá'}),
    P(3,'Disfarce do Falecido','Guise of the Departed','Copia um mortal morto há pouco.',
      {am:'Oblívio 1', c:'Um Teste de Fome', dur:'Até o amanhecer', pool:'Raciocínio + Ofuscação', f:'Fachada Esfarrapada'}),
    P(4,'Reclusão','Seclusion','A vítima deixa de ver e ouvir qualquer ser.',
      {am:'Dominação 1', c:'Um Teste de Fome', dur:'Margem em cenas ou noites', pool:'Manipulação + Ofuscação', vs:'Determinação + Prontidão', f:'Fachada Esfarrapada'})
  ],
  'Potência': [
    P(3,'Exuberância','Exuberance','Potência conta dois níveis acima, com risco.',
      {c:'Livre', dur:'Passiva', f:'Fachada Esfarrapada'})
  ],
  'Presença': [
    P(2,'Isca do Predador','Predator’s Lure','O alvo sente uma curiosidade irresistível e vem até você.',
      {c:'Um Teste de Fome', dur:'Uma cena ou até chegar a 3 metros', pool:'Carisma + Liderança', vs:'Autocontrole + Determinação', f:'Cortes dos Condenados'}),
    P(3,'Limpar o Campo','Clear the Field','Esvazia o lugar, com calma e em ordem.',
      {am:'Dominação 3', c:'Um Teste de Fome', pool:'Autocontrole + Presença', vs:'Raciocínio + Autocontrole', f:'Queda de Londres', errata:1}),
    P(3,'Sanguessuga de Paixão','Passion Leech','Suga a paixão de um mortal e vive como se tivesse Humanidade 10.',
      {am:'Auspícios 2', c:'Um Teste de Fome', dur:'Até o amanhecer; três noites para a vítima', pool:'Autocontrole + Auspícios', f:'Fachada Esfarrapada'}),
    P(3,'Exibição Revigorante','Invigorating Display','Inala a energia de uma multidão.',
      {ex:'Deslumbrar', c:'Um Teste de Fome', dur:'Uma cena', pool:'Autocontrole + Presença', f:'Succubus Club'}),
    P(4,'Inflamar o Desejo','Inflame Desire','O desejo do momento vira obsessão.',
      {am:'Ofuscação 1', c:'Um Teste de Fome', dur:'Uma cena', pool:'Manipulação + Presença', vs:'Autocontrole + Determinação', f:'Fachada Esfarrapada'}),
    P(4,'Magnum Opus','Magnum Opus','Impregna Presença numa obra de arte.',
      {am:'Auspícios 3', c:'Um ou mais Testes de Fome', pool:'Carisma ou Manipulação + Ofícios', f:'Winter’s Teeth'}),
    P(4,'Parceiro','Wingman','Empresta um poder de Presença a outra pessoa.',
      {c:'Um Teste de Fome, mais o do poder', dur:'Como o poder usado', f:'Amor Manchado'})
  ],
  'Proteanismo': [
    P(1,'Contorcer','Squirm','Passa por frestas impossíveis.',
      {c:'Livre, ou um Teste de Fome', dur:'Enquanto quiser', f:'Fachada Esfarrapada'}),
    P(2,'O Beijo da Serpente','Serpent’s Kiss','Injeta o próprio vitae ao morder.',
      {c:'Um Teste de Fome', dur:'Uma cena', f:'Amor Manchado'}),
    P(2,'O Gole Falso','The False Sip','Bebe sem que o sangue entre no corpo.',
      {am:'Fortitude 1', c:'Um Teste de Fome', dur:'Uma cena ou mais', f:'Amor Manchado'}),
    P(3,'Absorção Visceral','Visceral Absorption','Absorve corpos e sangue, limpando a cena.',
      {am:'Feitiçaria de Sangue 2', c:'Um Teste de Fome', dur:'Um turno por corpo', pool:'Força + Proteanismo', f:'Sabá'}),
    P(3,'Máscara da Morte','Masque of Death','Vira um cadáver aparente.',
      {am:'Oblívio 2', c:'Um Teste de Fome', dur:'Até encerrar ou o amanhecer', f:'Succubus Club'}),
    P(5,'Forma de Sangue','Blood Form','Vira uma massa de sangue.',
      {am:'Feitiçaria de Sangue 2', c:'Um Teste de Fome', dur:'Uma cena', f:'Guerra da Gehenna'}),
    P(5,'Mestre das Formas','Master of Forms','Qualquer forma animal.',
      {ex:'Metamorfose', c:'O Teste de Fome da Metamorfose', dur:'Como a Metamorfose', f:'Guerra da Gehenna'}),
    P(5,'Enxame','Swarm','Vira um enxame.',
      {ex:'Metamorfose', c:'Dois Testes de Fome', dur:'Uma cena', f:'Fachada Esfarrapada'}),
    P(5,'Rosto da Vítima','Face of the Victim','Assume o rosto de quem acabou de beber.',
      {ex:'Vicissitude', c:'Um Teste de Fome', dur:'Até Fome 5 ou usar de novo', f:'Succubus Club'})
  ],
  'Feitiçaria de Sangue': [
    P(1,'Moldar o Sacramento Sanguíneo','Shape the Sanguine Sacrament','Dá forma e imagem ao sangue.',
      {c:'Livre, ou um Teste de Fome com o seu sangue', dur:'Uma cena', pool:'Manipulação + Feitiçaria de Sangue', f:'Fachada Esfarrapada'}),
    P(2,'Maldição do Sangue','Blood’s Curse','Agrava a perdição de outro vampiro.',
      {c:'Um Teste de Fome', dur:'Até o amanhecer', pool:'Inteligência + Feitiçaria de Sangue', vs:'Vigor + Ocultismo ou Fortitude', f:'Guerra da Gehenna'}),
    P(2,'Vinculum Magnum','Vinculum Magnum','Mantém mais Laços de Sangue.',
      {c:'Livre', dur:'Passiva', f:'Cortes dos Condenados'}),
    P(3,'Laço Transitivo','Transitive Bond','O Laço passa adiante pelo sangue.',
      {c:'Um Teste de Fome', f:'Sabá'}),
    P(3,'Ondas do Coração','Ripples of the Heart','Muda a Ressonância de um mortal.',
      {c:'Um Teste de Fome', f:'Amor Manchado'}),
    P(4,'Vitae Fulminante','Fulminating Vitae','Uma bomba de vitae.',
      {c:'Dois Testes de Fome', dur:'Até o amanhecer', pool:'Vigor + Feitiçaria de Sangue', vs:'Raciocínio + Atletismo', f:'Fachada Esfarrapada'}),
    P(4,'Marionete','Marionette','Move um corpo pelo sangue dentro dele.',
      {ex:'Moldar o Sacramento Sanguíneo', c:'Um ou mais Testes de Fome', dur:'Um turno por ponto de margem', pool:'Manipulação + Feitiçaria de Sangue', vs:'Vigor + Ocultismo ou Fortitude', f:'Fachada Esfarrapada'}),
    P(5,'Recuperação de Vitae','Reclamation of Vitae','Toma de volta o sangue dos seus carniçais.',
      {c:'Uma ou mais Máculas', f:'Sabá'})
  ],
  'Oblívio': [
    P(2,'Predição Fatal','Fatal Prediction','Atrai acidentes para um mortal.',
      {am:'Auspícios 2', c:'Um Teste de Fome', dur:'24 horas', pool:'Determinação + Oblívio', vs:'Raciocínio + Ocultismo', f:'Guia do Jogador'}),
    P(4,'Profanar o Santificado','Profane the Sanctified','Anula a Fé Verdadeira e corrói o sagrado.',
      {c:'Um Teste de Fome', dur:'Um turno; permanente em símbolos', pool:'Determinação + Oblívio', vs:'Força de Vontade', f:'Fachada Esfarrapada'}),
    P(4,'Agarre Umbroso','Umbrous Clutch','Puxa a vítima pela própria sombra.',
      {c:'Um Teste de Fome e uma Mácula', dur:'Instantânea', pool:'Raciocínio + Oblívio', vs:'Destreza + Raciocínio', f:'Sabá'}),
    P(5,'A Escuridão Interior','The Darkness Within','Desperta na vítima uma entidade que a destrói.',
      {c:'Dois Testes de Fome', dur:'Uma cena', pool:'Manipulação + Oblívio', vs:'Autocontrole + Determinação', f:'Fachada Esfarrapada'})
  ]
};
Object.keys(PODERES_EXTRA).forEach(d => {
  const lista = DISCIPLINAS[d].poderes;
  PODERES_EXTRA[d].forEach(p => { if (!lista.some(x => x.pt === p.pt)) lista.push(p); });
  lista.sort((a, b) => a.lv - b.lv);   // sort estável: dentro do nível, a ordem antiga fica
});

const LISTA_DISCIPLINAS = Object.keys(DISCIPLINAS);

/* Lê o Amálgama de um poder: { disc, nivel } ou null.
   Agora o nível vem escrito no dado, não mais adivinhado do texto. */
function amalgamaDe(p) {
  if (!p || !p.am) return null;
  const m = /^(.+?)\s+(\d)$/.exec(String(p.am).trim());
  return m ? { disc: m[1].trim(), nivel: Number(m[2]) } : { disc: String(p.am).trim(), nivel: 1 };
}

/* Rótulo curto do Amálgama para a interface. */
const rotuloAmalgama = (p) => p && p.am ? 'Amálgama: ' + p.am : '';

/* Livros ligados por padrão no sorteio. */
const FONTES_PADRAO = Object.keys(FONTES).filter(k => FONTES[k].padrao);

/* ============================================================
   RITUAIS (Feitiçaria de Sangue) e CERIMÔNIAS (Oblívio)

   Mesma procedência dos poderes: valores mecânicos conferidos na
   wiki oficial, descrições próprias. A v5 dá um ritual ou uma
   cerimônia de nível 1 na criação a quem tem a Disciplina, e os
   demais custam nível × 3 de experiência, nunca acima da pontuação
   da Disciplina.

   Rituais rolam Inteligência + Feitiçaria de Sangue, salvo quando
   o campo `pool` diz outra coisa. Cerimônias rolam Determinação +
   Oblívio e exigem um poder de Oblívio específico — esse é o campo
   `ex`, e o sorteio o respeita.

   `culto` marca os que pertencem a um culto específico: existem,
   mas ficam fora do sorteio automático.
   ============================================================ */

const R = (lv, pt, en, ds, m) => Object.assign({ lv, pt, en, ds, c:'Um Teste de Fome', f:'Básico' }, m || {});

const RITUAIS = [
  R(1,'Caminhar no Sangue','Blood Walk','Prova o sangue e lê geração, nome e senhor.'),
  R(1,'Agarre do Inseto','Clinging of the Insect','Escala paredes e tetos como um inseto.'),
  R(1,'Forjar Pedra de Sangue','Craft Bloodstone','Cria uma pedra que aponta sempre para um lugar.'),
  R(1,'Despertar com o Frescor da Noite','Wake with Evening’s Freshness','Acorda ao menor sinal de perigo durante o dia.'),
  R(1,'Proteção contra Carniçais','Ward Against Ghouls','Um objeto protegido fere o carniçal que o toca.'),
  R(1,'Selar a Marca','Seal the Brand','Fixa uma tatuagem na pele de um vampiro.', {f:'Guia do Jogador'}),
  R(1,'Afagar o Jardim','Coax the Garden','As plantas do lugar passam a defender você.', {f:'Cultos', culto:'Bahari'}),
  R(1,'Apagar o Medo','Douse the Fear','Suspende por um tempo o próprio medo do fogo.', {f:'Cultos', culto:'Igreja de Caim', errata:1}),

  R(2,'Comunicar-se com o Senhor','Communicate with Kindred Sire','Abre um canal telepático com quem te Abraçou, a qualquer distância.'),
  R(2,'Olhos de Babel','Eyes of Babel','Consumindo olhos e língua, ganha os idiomas de quem morreu.'),
  R(2,'Iluminar a Trilha da Presa','Illuminate Trail of Prey','Faz brilhar o rastro de uma pessoa específica.'),
  R(2,'Verdade do Sangue','Truth of Blood','Separa a verdade da mentira.', {pool:'Determinação + Feitiçaria de Sangue'}),
  R(2,'Proteção contra Espíritos','Ward against Spirits','Um objeto protegido repele espíritos.'),
  R(2,'Círculo de Proteção contra Carniçais','Warding Circle against Ghouls','Protege uma área inteira contra carniçais.', {c:'Três Testes de Fome'}),
  R(2,'Como Névoa sobre a Água','As Fog on Water','Anda sobre a água, sem ruído.', {f:'Guia do Jogador'}),
  R(2,'Calix Secretus','Calix Secretus','Guarda vitae para usar depois.', {c:'Um Teste de Fome, mais os do sangue guardado', f:'Guia do Jogador'}),
  R(2,'Toque Soporífero','Soporific Touch','Uma dose de vitae deixa a vítima mole a manipulações comuns.', {f:'Guia do Jogador', errata:1}),

  R(3,'Chamado de Dagon','Dagon’s Call','Rompe os vasos sanguíneos da vítima à distância.', {pool:'Determinação + Feitiçaria de Sangue'}),
  R(3,'Desvio da Ruína de Madeira','Deflection of Wooden Doom','A estaca não encontra o coração.'),
  R(3,'Essência do Ar','Essence of Air','Voa.'),
  R(3,'Caminhante de Fogo','Firewalker','Você e os seus resistem ao fogo.'),
  R(3,'Proteção contra Lupinos','Ward against Lupines','Um objeto protegido fere lobisomens.'),
  R(3,'Círculo de Proteção contra Espíritos','Warding Circle against Spirits','Protege uma área inteira contra espíritos.', {c:'Três Testes de Fome'}),
  R(3,'Um com a Lâmina','One with the Blade','Toma posse de uma arma e a protege de dano.', {c:'Testes de Fome bastantes para submergir a arma', f:'Guia do Jogador'}),
  R(3,'Fogo no Sangue','Fire in the Blood','Acende no sangue da vítima a agonia do fogo.', {f:'Cultos', culto:'Igreja de Caim'}),

  R(4,'Defesa do Refúgio Sagrado','Defense of the Sacred Haven','Escurece o refúgio contra a luz do sol.'),
  R(4,'Olhos do Falcão Noturno','Eyes of the Nighthawk','Assume o controle de uma ave de rapina.'),
  R(4,'Passagem Incorpórea','Incorporeal Passage','O corpo atravessa matéria como um fantasma.'),
  R(4,'Proteção contra Cainitas','Ward against Cainites','Um objeto protegido fere outros Membros.'),
  R(4,'Círculo de Proteção contra Lupinos','Warding Circle against Lupines','Protege uma área inteira contra lobisomens.', {c:'Três Testes de Fome'}),
  R(4,'Banquete de Cinzas','Feast of Ashes','Impede outro Membro de beber sangue por uma noite.', {f:'Guia do Jogador'}),
  R(4,'Memória Guiada','Guided Memory','Pelo sangue de outro vampiro, vive as memórias que ele escolher mostrar.', {f:'Guia do Jogador'}),
  R(4,'Correntes Invisíveis','Invisible Chains of Binding','Prende a vítima a um único ponto.', {f:'Guia do Jogador'}),
  R(4,'Inocência do Coração Infantil','Innocence of the Child’s Heart','Esconde diablerie e outros traços da leitura de aura.', {f:'Chicago'}),

  R(5,'Fuga para o Santuário Verdadeiro','Escape to True Sanctuary','Abre um portal de mão única para um lugar preparado.', {c:'Doze Testes de Fome no total'}),
  R(5,'Coração de Pedra','Heart of Stone','Petrifica o próprio coração: estaca não pega, e a emoção some junto.'),
  R(5,'Estaca da Dissolução Tardia','Shaft of Belated Dissolution','Uma estaca que procura sozinha o coração da vítima.', {c:'Dois Testes de Fome'}),
  R(5,'Círculo de Proteção contra Cainitas','Warding Circle against Cainites','Protege uma área inteira contra Membros.', {c:'Três Testes de Fome'}),
  R(5,'Domínio','Dominion','Anula Animalismo, Auspícios, Dominação e Presença dentro de um prédio.', {c:'Um ou mais Testes de Fome', f:'Guia do Jogador'}),
  R(5,'Generosidade do Éden','Eden’s Bounty','Drena o sangue de tudo que estiver por perto.', {c:'Um Teste de Fome e possíveis Máculas', f:'Cultos', culto:'Bahari'}),
  R(5,'Antebrachia Ignium','Antebrachia Ignium','Põe os próprios braços em chamas.', {f:'Cultos', culto:'Igreja de Caim', errata:1})
];

const C = (lv, pt, en, ds, ex, m) => Object.assign({ lv, pt, en, ds, ex, c:'Um Teste de Fome',
                                                     pool:'Determinação + Oblívio', f:'Cultos' }, m || {});

const CERIMONIAS = [
  C(1,'Dádiva da Falsa Vida','Gift of False Life','Ergue um cadáver para tarefas simples e repetitivas.','Cinzas às Cinzas'),
  C(1,'Convocar Espírito','Summon Spirit','Chama um espectro do Submundo.','Elo de Ligação'),
  C(1,'Chamado do Viajante','Traveler’s Call','Convoca outro membro do culto.','Visão do Oblívio', {culto:'Shalim'}),
  C(2,'Despertar o Servo Homuncular','Awaken the Homuncular Servant','Faz espiões de partes de corpo ou bichos pequenos.','Onde o Véu se Adelgaça'),
  C(2,'Compelir Espírito','Compel Spirit','Dobra um espectro à sua vontade.','Onde o Véu se Adelgaça'),
  C(3,'Hospedar Espírito','Host Spirit','Abre o próprio corpo à possessão de um fantasma.','Aura de Decadência'),
  C(3,'Nome do Pai','Name of the Father','Atinge a mente da vítima com o vazio do Oblívio e a deixa paralisada.','Perspectiva das Sombras'),
  C(3,'Hordas Cambaleantes','Shambling Hordes','Levanta um grupo de mortos agressivos.','Aura de Decadência',
    {c:'Um Teste de Fome e possíveis Máculas'}),
  C(4,'Vincular o Espírito','Bind the Spirit','Prende um espectro a um lugar ou a uma pessoa.','Praga Necrótica',
    {c:'Um Teste de Fome e possíveis Máculas'}),
  C(4,'Rasgar o Véu','Split the Veil','Abre um rasgo na Mortalha por onde os espectros passam.','Praga Necrótica',
    {c:'Um Teste de Fome e possíveis Máculas', errata:1}),
  C(5,'Ex Nihilo','Ex Nihilo','Entra nas Terras das Sombras em pessoa.','Espírito Definhante',
    {c:'Três Testes de Fome e um ponto de Força de Vontade'}),
  C(5,'Bênção Lazarena','Lazarene Blessing','Devolve a vida a um cadáver fresco.','Skuld Cumprido',
    {c:'Um Teste de Fome e possíveis Máculas'}),
  C(5,'Poço da Contemplação','Pit of Contemplation','Lança um inimigo dentro do próprio Oblívio.','Avatar Tenebroso',
    {c:'Um Teste de Fome e possíveis Máculas'})
];

/* Qual catálogo pertence a qual Disciplina. */
const CATALOGO_RITUAL = {
  'Feitiçaria de Sangue': { lista: RITUAIS,    rotulo: 'Ritual',    plural: 'Rituais' },
  'Oblívio':              { lista: CERIMONIAS, rotulo: 'Cerimônia', plural: 'Cerimônias' }
};
