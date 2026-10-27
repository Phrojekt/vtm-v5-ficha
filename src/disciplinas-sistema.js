/* ============================================================
   Ficha de Sangue — sistema dos poderes

   O que `disciplinas.js` não diz: como o poder funciona na mesa
   (o que o teste decide, margem, crítico, limites) e quem pode
   resistir, com o quê, e o que anula o efeito.

   Resumos próprios, escritos a partir das regras do V5 (Livro
   Básico e suplementos) e da wiki oficial da Paradox
   (vtm.paradoxwikis.com). Não é o texto dos livros. Quando a
   mesa precisar da redação exata, o campo de anotações do
   cartão serve para isso.

   SISTEMA_PODER['Nome em português'] = [sistema, resistência]
   A resistência fica vazia quando não há ninguém para resistir
   (poderes passivos ou que só afetam o próprio vampiro).

   REGRAS_DISC['Disciplina'] = regras que valem para todos os
   poderes dela.
   ============================================================ */

const REGRAS_DISC = {
  'Animalismo': [
    'O animal precisa perceber você (ver, ouvir ou farejar) para a maioria dos poderes.',
    'O fâmulo (Vínculo com Fâmulo) dispensa o Teste de Fome de Sussurros Selvagens e de Subjugar o Espírito.',
    'Sem parada oposta, a Dificuldade vem do Narrador: um pedido simples a um animal manso é 2; mandar um cão de guarda trair o dono, 4 ou mais.'
  ],
  'Auspícios': [
    'Sentir o Invisível contra Ofuscação: Raciocínio + Auspícios contra Raciocínio + Ofuscação de quem se esconde.',
    'Sentidos aguçados cobram um preço: um clarão ou estrondo repentino pede Raciocínio + Determinação para não ficar atordoado.',
    'Visões são reais, mas vêm em símbolos; o Narrador decide o quanto revelam. Abusar delas abre caminho para a paranoia.'
  ],
  'Celeridade': [
    'Velocidade sobrenatural à vista de mortais é quebra da Máscara.',
    'Os bônus somam Celeridade a paradas de Destreza ou à defesa; não dão ações extras, a não ser que o poder diga.',
    'Golpe Relâmpago e Pontaria Infalível só podem ser defendidos por quem tem Celeridade 5 (Teste de Fome para reagir).'
  ],
  'Dominação': [
    'Exige contato visual com uma vítima por vez, voz em alto som e uma língua que ela entenda. Voz Irresistível dispensa o olhar; Telepatia dispensa a voz.',
    'Mortal desprevenido não testa nada: obedece. Testa se já foi Dominado nesta cena, se a ordem fere a natureza dele ou causa vergonha pública ou ferimento.',
    'Vampiro sempre contesta. Se for de geração menor (mais próximo de Caim) que você, pode gastar 1 de Força de Vontade para ignorar a tentativa.',
    'Ninguém pode ser mandado a se ferir gravemente ou se matar sem Decreto Terminal.',
    'Falha total contra um alvo: você não consegue mais Dominá-lo pelo resto da história.',
    'Mente Inabalável (Fortitude 1) soma Fortitude à parada de quem resiste.',
    'O Dominado vira marionete: cumpre a ordem sem iniciativa e não pode ser interrogado sobre ela.'
  ],
  'Fortitude': [
    'Os poderes que reduzem dano agem antes de dividir o superficial pela metade.',
    'Fortitude não protege do sol nem do fogo, a não ser que o poder diga.',
    'Mente Inabalável vale contra qualquer tentativa de dobrar sua vontade, sobrenatural ou não.'
  ],
  'Ofuscação': [
    'Não é invisibilidade: a mente de quem está perto ignora você e inventa um motivo para desviar.',
    'Afeta os cinco sentidos, salvo indicação. Câmeras e gravações mostram você, a não ser com Fantasma na Máquina.',
    'Quebra quando você ataca, faz barulho alto, fica encurralado num lugar por onde alguém precisa passar ou falha ao mexer num objeto.',
    'Só se ativa sem ninguém olhando, a não ser com Desaparecer.',
    'Quem tem Sentir o Invisível testa Raciocínio + Auspícios contra Raciocínio + Ofuscação; a vítima prestes a sofrer um ataque surpresa também pode testar.'
  ],
  'Potência': [
    'Força sobrenatural deixa rastro (portas arrancadas, marcas de dedos no concreto): cuidado com a Máscara.',
    'Os bônus de Potência entram no dano, não na parada de ataque, salvo indicação.'
  ],
  'Presença': [
    'O alvo precisa estar no local ou a uma distância em que ouve você. Não passa por vídeo ou telefone sem Magnetismo Estelar, e nunca por gravação.',
    'A vítima continua pensando por conta própria: Presença inclina emoções, não dá ordens.',
    'Poderes de Presença não se somam entre si.',
    'Quem já decidiu ferir você não pode ser encantado: contra inimigos violentos, só Olhar Terrível e Majestade funcionam.',
    'Mente Inabalável (Fortitude 1) soma Fortitude a testes de resistir. Sentir o Invisível percebe a Presença sendo usada.'
  ],
  'Proteanismo': [
    'Formas animais assumem os Atributos Físicos e os sentidos do animal; os Mentais e Sociais continuam os seus.',
    'Roupas e objetos não se transformam com você.',
    'Mudar de forma diante de mortais é quebra grave da Máscara.'
  ],
  'Feitiçaria de Sangue': [
    'É das Disciplinas mais visíveis: sangue que ferve, voa ou corrói é quebra imediata da Máscara.',
    'Venenos e maldições do sangue são resistidos com Vigor ou Autocontrole + Ocultismo, ou com Fortitude no lugar da Perícia.',
    'Rituais: um ritual de nível igual ou menor à sua Feitiçaria. Um de graça na criação; os outros custam experiência e tempo de estudo (no mínimo o quadrado do nível, em semanas).',
    'Lançar um ritual leva tempo (minutos a horas), um Teste de Fome e Inteligência + Feitiçaria de Sangue, salvo indicação.'
  ],
  'Oblívio': [
    'Todo Teste de Fome de Oblívio que mostrar 1 ou 10 dá uma Mácula, além da Fome. Com Rerrolagem de Sangue, você escolhe qual resultado fica.',
    'As sombras do Oblívio são planas: balas ricocheteiam. Luz forte e direta fere projeções e servos de sombra; uma sala sem sombras limita a Disciplina.',
    'Cerimônias exigem um poder específico de Oblívio e um mestre que já a conheça. Uma de graça na criação; as outras custam experiência e semanas de estudo.'
  ],
  'Alquimia de Sangue-ralo': [
    'Só sangues-ralos aprendem. Uma fórmula de graça por ponto de Alquimia; as outras vêm de estudo e experimentação, pagas com experiência.',
    'Destilar custa vitae (um Teste de Fome) e ativar tem o próprio custo. Onde um poder pede o nível da Disciplina, use a Alquimia.',
    'Athanor Corporis (no corpo): Vigor + Alquimia, uns três turnos de concentração; só uma fórmula ativa por vez.',
    'Calcinatio (num mortal): você dá seu vitae a um mortal e destila com Manipulação + Alquimia; depois bebe dele para usar.',
    'Fixatio (laboratório): prepara antes e rola Inteligência + Alquimia ao usar; leva fórmulas iguais a Raciocínio ou Destreza. Sem laboratório, só até nível 3.',
    'Cada estilo conta como uma Disciplina à parte: trocar de estilo é reaprender as fórmulas.'
  ]
};

const SISTEMA_PODER = {
/* ---------- Animalismo ---------- */
'Vínculo com Fâmulo': ['Faz de um animal seu carniçal, ligado a você até morrer. Você só pode ter um fâmulo por vez (outros animais carniçais não contam). Ele obedece sem teste e Sussurros Selvagens com ele não custa Teste de Fome; ordens difíceis pedem Carisma + Empatia com Animais.', ''],
'Sentir a Besta': ['Passivo: o Narrador avisa quando alguém por perto está hostil, faminto ou é sobrenatural. Ativo: vencendo o teste, você sabe se o alvo é vampiro, outro sobrenatural ou mortal, e o quanto a Besta (ou a raiva) dele está à flor da pele.', 'O alvo contesta com Autocontrole + Subterfúgio. Ofuscação ativa esconde a presença; Máscara da Mente engana a leitura.'],
'Mensageiro Animal': ['O fâmulo leva um recado ou objeto a alguém. Se você não sabe onde a pessoa está, ele testa Determinação + Manha ou Sobrevivência contra Dificuldade 2; se ela está se escondendo, Inteligência + Manha ou Sobrevivência.', 'Quem se esconde faz a busca do animal ficar mais difícil; Ofuscação esconde o alvo do bicho como de qualquer um.'],
'Atavismo': ['O animal volta ao instinto puro e foge ou ataca, à escolha do Narrador conforme a natureza dele. Dura margem + 1 rodadas; num crítico, a cena inteira. Dificuldade conforme o tamanho e o adestramento do bicho.', 'O animal precisa perceber você. Não há parada oposta.'],
'Sussurros Selvagens': ['Conversa nos dois sentidos com animais (Manipulação) ou chama os de um tipo que estão por perto (Carisma). Eles entendem ideias simples e respondem do jeito deles. A Dificuldade sobe com o tamanho do pedido.', 'Animais não resistem com teste, mas fazem só o que a natureza deles permite.'],
'Comando do Mensageiro': ['Através do fâmulo que leva o recado, você usa Compelir ou Hipnotizar em quem o recebe, olhando pelos olhos do animal. Sua Dominação usada assim não pode passar da sua Animalismo.', 'Como Compelir ou Hipnotizar: a vítima contesta normalmente.'],
'Suculência Animal': ['Sangue animal sacia mais: para a penalidade de alimentação, sua Potência de Sangue conta como dois níveis abaixo. Mesmo assim, sangue animal nunca leva a Fome a 0.', ''],
'Praga de Bestas': ['Marca uma pessoa: animais da cidade passam a cercá-la, latir e segui-la por uma noite. Ela sofre a margem como penalidade em paradas de Perícias não Físicas, e você a rastreia com facilidade.', 'A vítima contesta com Autocontrole + Empatia com Animais.'],
'Dominar a Besta': ['Mortal: fica apático, sem vontade de agir, por uma cena. Vampiro: a Besta dele adormece por margem + 1 turnos; ele não entra em frenesi e perde o ímpeto de violência enquanto durar.', 'O alvo contesta com Vigor + Determinação. Exige contato visual ou toque.'],
'Colmeia Não-Viva': ['Seus poderes de Animalismo passam a funcionar em enxames de insetos, tratados como uma criatura só.', ''],
'Subjugar o Espírito': ['Sua mente entra num animal e controla o corpo dele; o seu fica largado, indefeso. Dura uma cena, ou indefinidamente num crítico. No fâmulo, não custa Teste de Fome.', 'O animal não resiste. Seu corpo vazio é o ponto fraco: quem o encontrar pode estaqueá-lo.'],
'Comandar o Bando': ['Todos os animais de uma área passam a agir de um jeito (vigiar, atacar estranhos, sumir). Os sucessos decidem a força da influência; cada Teste de Fome extra amplia o alcance.', ''],
'Domínio Animal': ['Dá uma ordem a bandos e matilhas que já estão no lugar; não convoca ninguém. Vale por uma cena ou até a ordem se cumprir.', 'Os animais não resistem; ordens contra a natureza deles pedem Dificuldade maior.'],
'Afagar o Temperamento Bestial': ['Enquanto você cantarola, cada ponto de margem sobe ou desce em 1 a Dificuldade dos vampiros próximos para resistir ao frenesi.', 'Os afetados ainda testam o frenesi normalmente; só a Dificuldade muda.'],
'Extrair a Besta': ['Quando você entra em frenesi de fúria ou de terror, passa o frenesi a outra pessoa por perto; ela vive o frenesi no seu lugar. Não funciona com frenesi de fome.', 'A vítima contesta com Autocontrole + Determinação.'],

/* ---------- Auspícios ---------- */
'Sentidos Aguçados': ['Soma Auspícios a todos os testes de percepção. Vê no escuro parcial, ouve conversas pela parede. Ligado por muito tempo, o Narrador pode cobrar Força de Vontade.', 'Um clarão ou estrondo repentino pede Raciocínio + Determinação para não ficar atordoado.'],
'Sentir o Invisível': ['Detecta o sobrenatural oculto: Ofuscação, espíritos, poderes sendo usados ali. Passivo (o Narrador avisa) ou ativo, buscando com Determinação + Auspícios.', 'Contra Ofuscação: Raciocínio + Auspícios contra Raciocínio + Ofuscação.'],
'Panaceia': ['Pela conversa e pelo toque, acalma o alvo e cura Força de Vontade superficial igual aos sucessos. Cada alvo extra na mesma noite custa Força de Vontade igual à metade da margem.', 'Só funciona em quem aceita a ajuda.'],
'Premonição': ['O Narrador manda lampejos do que vai acontecer, sem custo. Para buscar uma visão de propósito, Teste de Fome e Determinação + Auspícios; os sucessos dão clareza.', ''],
'Revelar o Temperamento': ['Fareja a Ressonância do alvo e se há Discrasia. Num Membro, revela de quem ele bebeu por último.', 'O alvo contesta com Autocontrole + Subterfúgio.'],
'Rastro Infalível': ['Marca alguém e sabe onde ele está por uma noite, mais uma por sucesso.', 'A vítima pode testar Raciocínio + Prontidão para notar você uma vez.'],
'Falha Fatal': ['Enxerga o ponto fraco do alvo (físico ou mental). Ao explorá-lo, você soma a margem ao ataque físico ou social durante a cena.', 'O alvo contesta com Autocontrole + Subterfúgio (fraqueza mental) ou Vigor + Subterfúgio (física).'],
'Sondar a Alma': ['Lê a aura: emoção do momento, se é mortal, vampiro ou outra criatura, se está sob influência sobrenatural (Dominação, Laço) e, em vampiros, sinais de diablerie. Cada sucesso de margem responde a uma pergunta. Numa multidão, acha quem tem a característica que você procura.', 'O alvo contesta com Autocontrole + Subterfúgio. Máscara da Mente mostra uma aura falsa.'],
'Compartilhar os Sentidos': ['Vê e ouve pelos sentidos de outra pessoa, à distância, por uma cena.', 'O alvo não testa, mas, se tiver Sentir o Invisível, pode perceber que está sendo usado.'],
'Visão Vermínia': ['Vê pelos olhos de grupos de animais pequenos (ratos, pombos, baratas) de uma região por uma cena.', ''],
'Toque do Espírito': ['Toca um objeto ou lugar e lê as emoções e imagens deixadas nele, do mais recente para o mais antigo. Mais sucessos, mais longe no passado.', ''],
'Clarividência': ['Percebe um lugar conhecido à distância: o que acontece ali, quem entra e sai, por minutos ou uma noite. Mais sucessos, mais detalhes.', 'Ofuscação esconde quem está lá como se você estivesse presente.'],
'Possessão': ['Toma o corpo de um mortal olhando nos olhos dele. Você não lê a mente, não usa as Perícias dele e não imita o jeito dele. Seu corpo fica largado, indefeso. Dura até você encerrar.', 'Só mortais. A vítima contesta com Determinação + Inteligência.'],
'Telepatia': ['Lê pensamentos superficiais e envia os seus. Enviar pensamentos não exige teste. Cada Teste de Fome dá um minuto; com alvo que consente, a cena inteira.', 'Quem não consente contesta com Raciocínio + Subterfúgio; vampiro que não consente custa 1 de Força de Vontade a mais.'],
'Aliviando a Alma Bestial': ['Remove Máculas de outro Membro ou o protege de novas por uma sessão. Você paga com uma Mácula própria.', 'Só funciona em vampiros de Humanidade menor que a sua, e precisa de consentimento.'],

/* ---------- Celeridade ---------- */
'Graça Felina': ['Passa automaticamente em testes de equilíbrio: corre por um cabo, pula de telhado em telhado.', 'Não funciona se a superfície não aguenta o seu peso.'],
'Reflexos Rápidos': ['Ações menores (sacar arma, recarregar, levantar do chão) não contam como ação. Sem cobertura num tiroteio, você não leva a penalidade de defesa.', ''],
'Ligeireza': ['Soma Celeridade a testes de Destreza fora de combate e a uma defesa por turno (esquiva).', 'Não soma ao ataque.'],
'Trabalho Relâmpago': ['Uma tarefa de Perícia que levaria horas sai em segundos (vasculhar uma sala, arrombar várias trancas).', 'Não acelera ataques nem defesas.'],
'Piscar': ['Atravessa uma distância em linha reta como se teleportasse e já pode agir no fim do movimento (atacar, por exemplo). Terreno difícil pede teste de Destreza + Atletismo.', 'Obstáculos no caminho param você.'],
'Travessia': ['Corre por paredes, tetos e sobre líquidos durante o turno. O Narrador avisa antes se a distância é longa demais.', ''],
'Esquiva Tecida': ['Remove a penalidade de se esquivar de vários atiradores e soma Celeridade a esquivas de tiros.', ''],
'Ímpeto Borrado': ['Todo ataque com menos sucessos que sua Celeridade erra, mesmo poderes que não permitem defesa. Custa um Teste de Fome por turno.', 'Só um ataque com sucessos iguais ou maiores que sua Celeridade acerta.'],
'Gole de Elegância': ['Quem bebe seu vitae (mortal, carniçal ou vampiro) ganha os benefícios da sua Celeridade até a próxima alimentação dele, ou até Fome 5. Cada pessoa custa um Teste de Fome seu.', 'Beber vitae conta para o Laço de Sangue.'],
'Pontaria Infalível': ['O mundo desacelera para um ataque à distância: o alvo não pode se defender.', 'Só quem tem Celeridade 5 consegue se defender, fazendo um Teste de Fome.'],
'Golpe Relâmpago': ['Um ataque corpo a corpo rápido demais para reagir: o alvo não pode se defender.', 'Só quem tem Celeridade 5 consegue se defender, fazendo um Teste de Fome.'],
'Fração de Segundo': ['Interrompe algo que o Narrador acabou de descrever e age antes, desde que caiba em poucos segundos (pegar a granada, fechar a porta).', 'O Narrador decide se a ação é razoável.'],

/* ---------- Dominação ---------- */
'Nublar a Memória': ['A vítima esquece o momento presente (o último minuto, a conversa que acabou de ter).', 'Mortal desprevenido não testa. Os demais contestam com Raciocínio + Determinação.'],
'Compelir': ['Uma ordem de poucas palavras ("Pare!", "Saia daqui"), cumprida na hora. Não pode ser algo que leve mais de uma cena.', 'Mortal desprevenido não testa, a não ser que já tenha sido Dominado nesta cena ou que a ordem vá contra a natureza dele. Os demais contestam com Inteligência + Determinação.'],
'Devoção Servil': ['Quem já está sob a sua Dominação resiste melhor à dos outros: o outro vampiro perde dados iguais à sua Fortitude.', ''],
'Hipnotizar': ['Ordens complexas, de vários passos, que a vítima cumpre com método até acabar ou até a cena terminar. Com Diretriz Submersa, a ordem pode esperar um gatilho.', 'Mortal desprevenido não testa, a não ser que a ordem vá contra a natureza dele. Os demais contestam com Inteligência + Determinação.'],
'Alienação': ['Exige ter conversado antes com a vítima. Vencendo, ela perde o controle das emoções e age de modo irracional e errático durante a cena.', 'A vítima contesta com Autocontrole + Inteligência. Um Teste de Fome por alvo, por cena.'],
'Favor do Domitor': ['Quem está sob Laço de Sangue com você tem mais dificuldade de desobedecer: falha total num teste de desafio faz o Laço não enfraquecer naquele mês.', 'O servo ainda testa para desafiar, como de costume.'],
'A Voz Roubada': ['Tira da vítima a capacidade de falar, escrever ou gesticular por uma cena.', 'Mortais não testam. Os demais contestam com Determinação + Performance.'],
'A Mente Esquecida': ['Reescreve uma lembrança: você conta a nova versão enquanto a vítima escuta. Cada ponto de margem altera mais uma lembrança. A memória falsa é tão vívida quanto a real.', 'A vítima contesta com Inteligência + Determinação. Sondar a Alma ou Telepatia pode notar a costura.'],
'Diretriz Submersa': ['Suas ordens de Hipnotizar podem ficar adormecidas até um gatilho. Não expiram até serem cumpridas. Cada vítima carrega só uma por vez.', 'A resistência acontece quando você dá a ordem, não quando ela dispara.'],
'Cadeia de Comando': ['A vítima Hipnotizada cumpre ordens complexas com consciência e ganha bônus para convencer outros a ajudá-la. Você ainda faz o Teste de Fome e o teste de Hipnotizar.', 'Ela não ganha poderes de Dominação sobre os outros.'],
'Domínio Ancestral': ['Ordena a um descendente do seu sangue (cria, cria da cria) que aja mesmo contra a própria opinião.', 'O alvo contesta com Determinação + Ocultismo e ganha 1 dado por geração que separa vocês.'],
'Implantar Sugestão': ['Muda temporariamente a personalidade ou a opinião do alvo por uma cena.', 'Mortal desprevenido não testa, a não ser que a mudança vá contra as crenças mais fundas dele. Os demais contestam com Autocontrole + Determinação.'],
'Racionalizar': ['A vítima acredita que tudo o que fez Dominada foi ideia dela e defende isso.', 'Se for confrontada com a contradição, pode testar; vencendo, começa a duvidar.'],
'Tabula Rasa': ['Apaga a memória da vítima até ela não saber mais quem é. Costuma vir com uma série de mentiras para preencher o vazio.', 'A vítima contesta com Autocontrole + Determinação.'],
'Chamado de Lete': ['Apaga semanas de memória. Com uma ordem falada, apaga só o que envolve o assunto dito.', 'Mortal desprevenido não testa. Os demais contestam com Inteligência + Determinação.'],
'Manipulação em Massa': ['Estende outro poder de Dominação a várias pessoas ao mesmo tempo. Todas precisam ver seus olhos. Você rola uma vez, contra a mais resistente do grupo.', 'Rola contra a melhor parada de resistência do grupo; quem vencer escapa.'],
'Decreto Terminal': ['Libera ordens que ferem gravemente ou matam a própria vítima. Usar dá Máculas.', 'Ordens assim sempre permitem teste de resistência, mesmo a mortais desprevenidos.'],

/* ---------- Fortitude ---------- */
'Resiliência': ['Soma Fortitude às caixas de Vitalidade.', ''],
'Mente Inabalável': ['Soma Fortitude a todo teste de resistir a quem tenta dobrar sua vontade: Dominação, Presença, intimidação, sedução, tortura.', ''],
'Perseverança da Terra': ['Ninguém consegue tirar você do lugar: nem empurrões, nem arrastões, nem explosões.', 'Você ainda pode ser ferido, e o chão sob você pode ceder.'],
'Bestas Resistentes': ['Empresta sua resistência a animais: eles ganham sua Fortitude como caixas extras de Vitalidade por uma cena. No fâmulo, é automático e sem teste.', ''],
'Vitae Revigorante': ['Mortais que bebem seu sangue curam bem mais rápido.', 'Beber vitae ainda arrisca Laço de Sangue e transformar em carniçal.'],
'Obstinado': ['Mantém o pé firme contra impactos enormes. Dano superficial de queda ou pancada cai em Fortitude, antes de dividir pela metade.', ''],
'Rijeza': ['Subtrai Fortitude de todo dano superficial antes de dividir pela metade. O dano nunca cai abaixo de 1.', 'Não reduz dano agravado (fogo, sol, garras).'],
'Autoconfiança': ['Em combate social, reduz em Fortitude o dano superficial de Força de Vontade. O que sobrar pode anular dano agravado de Força de Vontade, mas aí o poder não se renova na cena.', ''],
'Desafiar a Ruína': ['Converte em superficial dano agravado (fogo, sol, garras, Disciplinas) até o número de sucessos, durante a cena.', 'O dano convertido não cura nesta cena.'],
'Fortificar a Fachada Interior': ['Poderes que leem ou invadem sua mente (Sondar a Alma, Telepatia) ficam com Dificuldade maior em metade da sua Fortitude. Quando a regra deixa você resistir, soma Fortitude à parada.', ''],
'Selar a Boca da Besta': ['Ignora os efeitos da Fome por uma cena, mas cada nível de Fome tira dados das suas paradas.', 'Se alguma parada chegar a 0, você testa frenesi de fúria.'],
'Valeren': ['Cura outro vampiro com o seu sangue e o toque; os sucessos decidem quanto dano é curado.', 'Cada alvo só pode receber uma vez por noite.'],
'Alma Calejada': ['Aceita Máculas antes da hora para se blindar: você ganha três Máculas agora (uma Convicção pode evitar uma) e evita ou reduz as próximas pelo resto da noite.', ''],
'Gole de Resistência': ['Quem bebe seu vitae ganha os benefícios da sua Fortitude por uma noite. Cada pessoa custa um Teste de Fome seu.', 'Beber vitae conta para o Laço de Sangue.'],
'Escamas da Górgona': ['A Ressonância do sangue que você bebeu vira proteção: Colérica impede a estaca de paralisar; Melancólica reduz dano de fogo; Fleumática fortalece contra Auspícios; Sanguínea reduz dano do sol.', 'Acaba se você perder a Ressonância.'],
'Estilhaçar': ['Quem acerta você leva o dano que a Rijeza absorveu. Armas quebram se o dano recebido igualar o modificador delas.', 'Exige Rijeza ativa.'],
'Carne de Mármore': ['Ignora a primeira fonte de dano físico de cada turno.', 'Não vale contra a luz do sol. Um ataque com vitória crítica atravessa a proteção.'],
'Vigor da Dor': ['Ignora a penalidade de Debilitado por Vitalidade. Para cada nível de dano marcado, você pode subir um Atributo em 1.', 'Limite: o valor do seu Surto de Sangue + 6.'],
'Escudos de Carne': ['Sua Fortitude sobe em metade do número de mortais frágeis por perto (arredondado para baixo), até 5.', 'Acaba quando você se afasta deles.'],

/* ---------- Ofuscação ---------- */
'Manto de Sombras': ['Parado, perto de cobertura ou sombra, você some do cenário. Ninguém nota você sem motivo.', 'Quebra se você se mover, atacar ou fizer barulho. Sentir o Invisível pode ver através.'],
'Encobrir': ['Objetos pequenos que você carrega no corpo passam despercebidos, até numa revista.', 'Sentir o Invisível revela.'],
'Silêncio da Morte': ['Anula todo som que você produz: passos, voz, tiro da sua arma.', 'Não abafa sons que você causa longe de si.'],
'Máscara das Eras': ['Parece mais velho ou mais jovem até o amanhecer.', ''],
'Esconderijo': ['Esconde objetos que você não está segurando por uma cena ou até o amanhecer.', 'Sentir o Invisível revela.'],
'Quimerismo': ['Uma alucinação curta e convincente (um som, um vulto, uma pessoa que não está lá) que dura um turno. Serve em combate, mas cada alvo só cai uma vez por conflito.', 'A vítima contesta com Autocontrole + Raciocínio.'],
'Passagem do Fantasma': ['Estende a Ofuscação às pegadas e ao rastro de um animal.', 'Sentir o Invisível nota sinais.'],
'Passagem Invisível': ['Move-se sem ser notado por uma cena, desde que ninguém esteja olhando direto para você quando ativar.', 'Quebra ao atacar, fazer barulho ou ficar encurralado. Sentir o Invisível vê através.'],
'Ventriloquismo': ['Fala só para uma pessoa que esteja à vista: ninguém mais ouve.', 'O alvo contesta com Determinação + Autocontrole para perceber o truque.'],
'Conversa Dupla': ['Diz uma coisa em voz alta e passa outra, escondida, para quem você quiser.', 'Os presentes podem contestar com Raciocínio + Auspícios.'],
'Fata Morgana': ['Ilusões elaboradas e estáticas, para todos os sentidos, que duram a cena se você mantiver. Se a ilusão puder provocar frenesi, o teste dele é 1 mais fácil que o real.', 'Quem interage de perto com a ilusão e desconfia pode contestar com Autocontrole + Raciocínio. Sentir o Invisível vê através.'],
'Fantasma na Máquina': ['Seus poderes de Ofuscação passam também por câmeras e transmissões ao vivo. Gravações ficam borradas e difíceis de identificar.', ''],
'Máscara de Mil Faces': ['Assume um rosto anônimo e plausível. Diferente de sumir, você pode conversar e interagir sem quebrar o efeito.', 'Sentir o Invisível vê o rosto verdadeiro.'],
'Máscara do Isolamento': ['Força Máscara de Mil Faces numa vítima: ninguém a reconhece por uma noite, mais uma por ponto de margem.', 'A vítima contesta com Carisma + Intuição. Acaba se ela descobrir o que está acontecendo.'],
'Labirinto Mental': ['A vítima perde todo senso de direção e de lugar num ambiente por uma noite. Exige contato visual para ativar.', 'A vítima contesta com Raciocínio + Determinação.'],
'Máscara da Mente': ['Esconde suas emoções e pensamentos e mostra outros a quem tentar lê-los, por meios comuns ou sobrenaturais (Sondar a Alma, Telepatia).', 'A Dificuldade sobe com a complexidade da farsa.'],
'Disfarce do Falecido': ['Copia aparência e trejeitos de um mortal morto há pouco, até o amanhecer.', 'Sentir o Invisível revela.'],
'Ocultar': ['Esconde um objeto inanimado ou um lugar (até uma casa de dois andares) por uma noite, mais uma por ponto de margem.', 'Não funciona em nada que se mova sozinho.'],
'Desaparecer': ['Ativa Manto de Sombras ou Passagem Invisível mesmo sob observação: você some diante dos olhos. Mortais ficam com a lembrança borrada.', 'Os observadores contestam com Raciocínio + Prontidão (rola o melhor). Vampiros não ficam com a lembrança borrada.'],
'Reclusão': ['A vítima deixa de ver e ouvir qualquer ser, vivo ou morto, por margem cenas ou noites.', 'A vítima contesta com Determinação + Prontidão. Sofrer dano físico dá a ela um novo teste.'],
'Encobrir a Reunião': ['Estende um poder de Ofuscação a um número de companheiros igual ao seu Raciocínio (mais com Testes de Fome extras).', 'Se um dos acobertados quebrar o efeito (atacar, gritar), só ele aparece.'],
'Disfarce do Impostor': ['Assume o rosto, a voz e o jeito de uma pessoa específica. Exige estudá-la pelo menos cinco minutos, de vários ângulos.', 'Quem conhece bem a pessoa contesta com Manipulação + Performance para perceber algo errado.'],

/* ---------- Potência ---------- */
'Corpo Letal': ['Golpes desarmados causam dano agravado a mortais e ignoram um nível de armadura por ponto de Potência.', 'Contra vampiros, o dano continua superficial (Punho de Caim muda isso).'],
'Salto Elevado': ['Salta até três vezes sua Potência em metros, na vertical ou na horizontal.', ''],
'Proeza': ['Soma Potência ao dano desarmado e a testes de Força; soma metade (para cima) ao dano com armas brancas.', ''],
'Agarre Implacável': ['A pegada não cede: depois de agarrar, ninguém solta você nem do que você segura.', 'Não ajuda no teste inicial de agarrar.'],
'Alimentação Brutal': ['Drena um vaso em segundos, de forma violenta e suja: sacia a Fome numa ação só. Contra vampiros, o número de ações para beber cai à metade.', 'Quase sempre mata ou deixa sinais óbvios: risco à Máscara e Máculas.'],
'Exuberância': ['Conta sua Potência como dois níveis acima para os poderes de Potência, podendo passar de 5.', 'Crítico ou falha no teste causa dano agravado a você.'],
'Faísca de Fúria': ['Soma Potência a testes de instigar uma pessoa ou multidão à violência.', 'Contra vampiros: Manipulação + Potência contra Inteligência + Autocontrole; vencendo, o alvo testa frenesi de fúria.'],
'Aderência Sobrenatural': ['Escala quase qualquer superfície e fica pendurado sem apoio por uma cena.', 'Deixa marcas óbvias de dedos na parede.'],
'Demolidor': ['Dobra a Potência em feitos de força bruta contra objetos (portas, muros, carros).', 'Não vale contra seres vivos.'],
'Gole de Poder': ['Quem bebe seu vitae ganha os benefícios da sua Potência por uma noite. Cada pessoa custa um Teste de Fome seu.', 'Beber vitae conta para o Laço de Sangue.'],
'Impacto': ['Ao cair de um Salto Elevado, causa dano numa área pequena. Quem leva 3 ou mais de dano, ou falha totalmente, cai no chão.', 'Quem está na área contesta com Destreza + Atletismo.'],
'Abalo Sísmico': ['Um golpe no chão gera uma onda de choque que derruba todos em volta. Uma vez por cena.', 'Quem está perto testa Destreza + Atletismo para não cair.'],
'Punho de Caim': ['Golpes desarmados causam dano agravado a qualquer um, mortal ou sobrenatural, por uma cena.', ''],
'Martelo Sutil': ['Concentra toda a força num ponto do corpo (um dedo, a cabeça): golpes com partes de pouco movimento ganham 4 dados ou mais.', 'Não dá para fazer outro ataque no mesmo movimento.'],

/* ---------- Presença ---------- */
'Deslumbrar': ['Soma Presença a Persuasão, Performance e testes de Carisma por uma cena. Todos ficam mais inclinados a concordar com você.', 'Quando o efeito passa, as pessoas voltam às opiniões de antes. Não funciona em quem já decidiu ferir você. Não se combina com Amedrontar.'],
'Amedrontar': ['Soma Presença a Intimidação por uma cena; as pessoas evitam cruzar seu caminho.', 'Não se combina com Deslumbrar. Não funciona em quem já decidiu ferir você.'],
'Olhos da Serpente': ['Imobiliza a vítima pelo olhar enquanto o contato visual durar.', 'A vítima contesta com Raciocínio + Autocontrole. Um vampiro pode gastar 1 de Força de Vontade em qualquer turno depois do primeiro para se soltar.'],
'Beijo Persistente': ['Ao se alimentar, a vítima ganha bônus num Atributo Social por noites iguais à sua Presença, e quer mais. Longe do vício, sofre a mesma penalidade.', 'Não funciona em quem está sob Laço de Sangue.'],
'Melpomínia': ['Usa Deslumbrar, Amedrontar, Olhar Terrível, Fascinar e Majestade só com a voz, sem ver o alvo, desde que ele ouça.', ''],
'Isca do Predador': ['Desperta curiosidade intensa: o alvo vem até você.', 'Mortais não resistem. Os demais contestam com Autocontrole + Determinação. Ninguém se arrisca nem larga tudo, e não funciona em combate.'],
'Limpar o Campo': ['Esvazia um lugar: as pessoas saem calmas e em ordem. Você pode isentar um número de pessoas igual ao seu Autocontrole.', 'Quem quer ficar contesta com Raciocínio + Autocontrole.'],
'Olhar Terrível': ['Um olhar que faz a vítima recuar ou fugir de pavor. Funciona até em inimigos violentos.', 'A vítima contesta com Autocontrole + Determinação. Num vampiro, uma vitória crítica provoca frenesi de terror (Dificuldade 3).'],
'Fascinar': ['A vítima fica encantada e faz o possível para agradar você, por uma hora mais uma por ponto de margem. Você soma Presença a testes sociais contra ela.', 'A vítima contesta com Autocontrole + Raciocínio. Se o pedido ferir ela, quem ela ama ou os princípios dela, testa de novo; vencendo, o efeito acaba.'],
'Sanguessuga de Paixão': ['Suga a paixão de um mortal: você ganha os benefícios de Humanidade 10 até o amanhecer; ele fica apagado por três noites.', 'Uma vez por noite.'],
'Voz Projetada': ['Lança a voz para qualquer ponto à vista e a deixa lá por uma cena.', ''],
'Rosto do Amor Verdadeiro': ['A vítima vê em você um mortal por quem tem laço forte, de amor ou ódio.', 'A vítima contesta com Autocontrole + Raciocínio. Se o rosto for uma Pedra de Toque dela, pode dar Máculas a ela.'],
'Exibição Revigorante': ['Depois de agitar uma multidão, você inala a energia dela e ganha uma Ressonância intensa (aguda num crítico).', ''],
'Inflamar o Desejo': ['Inflama o desejo do momento da vítima até ela só pensar em satisfazê-lo: ela sofre a Compulsão de Necessidade.', 'A vítima contesta com Autocontrole + Determinação.'],
'Voz Irresistível': ['Sua voz basta para usar Dominação: dispensa contato visual.', 'Não funciona por telefone, vídeo ou gravação.'],
'Magnum Opus': ['Impregna Presença numa obra de arte; quem a vê sente o efeito.', 'O público resiste com Autocontrole + Determinação.'],
'Impregnar o Edifício': ['Deixa um poder de Presença impregnado num prédio: quem entra sente o efeito. Se você estiver lá, vira o foco no lugar do prédio.', 'Como o poder transmitido.'],
'Convocar': ['Chama alguém que já provou seu sangue ou sofreu sua Presença. Ele vem até você o mais rápido que puder, sem se arriscar fisicamente nem se arruinar.', 'A vítima contesta com Autocontrole + Inteligência.'],
'Parceiro': ['Estende um poder de Presença a outra pessoa, que passa a usá-lo.', 'Usar o mesmo poder em vocês dois não dobra o bônus.'],
'Majestade': ['Quem olha para você fica sem reação: só pode agir para se proteger. Funciona até em inimigos violentos.', 'Cada um contesta com Autocontrole + Determinação; vencendo, ganha liberdade por um turno mais um por ponto de margem.'],
'Magnetismo Estelar': ['Seus poderes de Presença passam por transmissões ao vivo. Para Fascinar assim, você precisa dizer com clareza o nome do alvo.', 'Não passa por gravações.'],

/* ---------- Proteanismo ---------- */
'Olhos da Besta': ['Enxerga na escuridão total. Os olhos brilham: +2 dados em Intimidação contra mortais.', 'Olhos brilhando à vista de mortais é risco à Máscara.'],
'Contorcer': ['Carne e ossos ficam borrachudos: passa por frestas estreitas. Com um Teste de Fome, por buracos de uns cinco centímetros.', ''],
'Peso da Pena': ['Fica quase sem peso: cai de qualquer altura sem dano, não dispara sensores de pressão. Ativar como reação a uma queda pede Raciocínio + Sobrevivência.', ''],
'Armas Ferais': ['Garras (+2 de dano) ou presas (sem penalidade de ataque mirado). O dano superficial que você causa não é dividido pela metade.', ''],
'Vicissitude': ['Esculpe a própria carne: feições, ossos, armaduras. Cada sucesso permite uma mudança; o resultado é permanente até você mudar de novo.', ''],
'O Beijo da Serpente': ['Ao morder, injeta o próprio vitae na vítima. Também serve para aplicar poderes como Toque do Escorpião.', 'Conta para o Laço de Sangue.'],
'O Gole Falso': ['Nenhum sangue entra no seu sistema por uma cena: você precisa vomitá-lo antes que ela acabe, ou estender com outro Teste de Fome.', ''],
'Fusão com a Terra': ['Afunda no solo e vira parte dele: protegido do sol, dorme em segurança pelo dia.', 'Só em terra natural, não em concreto ou asfalto. Acaba se o lugar for perturbado (escavado).'],
'Modelagem de Carne': ['Estende a Vicissitude a outras pessoas. A margem é o número de mudanças.', 'Quem não quer contesta com Vigor + Determinação.'],
'Metamorfose': ['Vira um animal de massa parecida com a sua (lobo, cão grande). Usa os Atributos Físicos e os sentidos do animal; os Mentais e Sociais são seus.', 'Roupas e objetos não mudam junto.'],
'Absorção Visceral': ['Puxa para dentro de si o sangue e os restos de corpos, limpando a cena. Cada corpo leva um turno e baixa 1 de Fome, até sua Feitiçaria de Sangue.', 'A Fome nunca chega a 0 assim.'],
'Máscara da Morte': ['Assume a aparência de um cadáver: não se move nem fala, e só leva dano agravado.', 'Acaba ao amanhecer ou quando você encerrar.'],
'Forma Horrenda': ['Assume uma forma monstruosa com tantas mudanças quanto seu Proteanismo. Todo crítico conta como crítico bestial.', 'Testes de frenesi nessa forma têm +2 de Dificuldade.'],
'Transmutação': ['Ganha uma segunda forma animal, de qualquer tamanho (morcego, enxame não). Mesmas regras da Metamorfose.', ''],
'Forma de Sangue': ['Vira uma massa amorfa de sangue.', 'Pode ser bebido, e quem beber cria Laço com você normalmente.'],
'Mestre das Formas': ['Pode assumir qualquer forma animal, não só uma.', 'Mantém os limites de Metamorfose e Transmutação.'],
'Forma de Névoa': ['Vira névoa: passa por frestas, flutua e não sofre dano físico comum. Leva três turnos; cada Teste de Fome extra encurta um.', 'Fogo e sol continuam ferindo. Vento forte espalha você.'],
'Um com a Terra': ['Funde-se ao solo de qualquer parte do seu Domínio, mesmo artificial (concreto, asfalto). Mesmas regras de Fusão com a Terra.', ''],
'Enxame': ['Vira um enxame de insetos, répteis ou vermes. Ataca, por turno, um número de pessoas igual à sua Potência de Sangue.', ''],
'O Coração das Trevas': ['Arranca o próprio coração e o guarda fora do corpo: estacas no peito não paralisam você.', 'Se o coração levar dano agravado igual à sua Vitalidade, você entra em torpor. Só fogo ou sol o destroem.'],
'O Coração Desprendido': ['O coração se move dentro do peito: em combate corpo a corpo, a estaca só o atinge numa vitória crítica.', ''],
'Rosto da Vítima': ['Assume o rosto de quem você acabou de beber; precisa ativar na mesma cena em que saciou ao menos 1 de Fome dessa pessoa.', 'Acaba com Fome 5 ou ao usar o poder de novo.'],

/* ---------- Feitiçaria de Sangue ---------- */
'Vitae Corrosivo': ['Seu sangue corrói como ácido: madeira, metal, vidro. Mais Testes de Fome, mais material corroído.', 'Não afeta carne morta-viva (outros vampiros).'],
'Moldar o Sacramento Sanguíneo': ['Molda sangue numa forma ou imagem que dura a cena. Livre com sangue alheio; um Teste de Fome com o seu.', ''],
'Um Gosto pelo Sangue': ['Prova o sangue e descobre traços do dono: se é mortal ou vampiro, Fome, Potência de Sangue, geração aproximada, se bebeu de vampiros. Mais sucessos, mais detalhes.', ''],
'Feitiçaria Kolduna': ['Sintoniza-se com um elemento (água, terra, fogo, ar) e sente através dele por uma cena. Custa também dano agravado.', 'Quem se esconde contesta com Raciocínio ou Determinação + Ofuscação.'],
'Maldição do Sangue': ['Aumenta temporariamente a Gravidade da Perdição de outro vampiro até o amanhecer. Carniçal, sangue-ralo ou Caitiff ganha uma perdição de clã.', 'O alvo contesta com Vigor + Ocultismo ou Fortitude.'],
'Extinguir o Vitae': ['Queima o sangue armazenado de outro Membro à vista: a Fome dele sobe.', 'O alvo contesta com Vigor + Autocontrole. Se ele vir você, pode descobrir quem fez com Inteligência + Ocultismo contra seu Raciocínio + Subterfúgio.'],
'Vasculhar Segredos': ['Lê e entende grandes volumes de texto em minutos, até achar a informação ou um beco sem saída.', 'Não funciona em língua que você não entende.'],
'Vinculum Magnum': ['Aumenta o limite de Laços de Sangue que você pode manter sobre outros Membros.', 'Tremere e Nascidos-do-Crepúsculo não se beneficiam.'],
'Sangue de Potência': ['Eleva sua Potência de Sangue em 1 (2 num crítico) por uma cena ou noite, mesmo acima do limite da sua geração. Muda Surto, Rerrolagem e cura.', ''],
'Toque do Escorpião': ['Seu sangue vira veneno paralisante, cuspido ou passado numa lâmina ou nas presas. Cada Teste de Fome prepara uma dose. Mortal que leva dano desmaia.', 'A vítima contesta com Vigor + Ocultismo ou Fortitude.'],
'Laço Transitivo': ['Seu sangue passa o Laço adiante: quem bebe de alguém que bebeu de você também se liga a você.', ''],
'Ondas do Coração': ['Manipula o sangue de um mortal: muda a Ressonância dele ou planta Compulsões em quem beber dele.', ''],
'Roubo de Vitae': ['Arranca o sangue da vítima pelo ar até a sua boca, à distância de visão. Conta como alimentação, e a vítima sente o Beijo.', 'A vítima contesta com Raciocínio + Ocultismo.'],
'Égide de Sangue': ['Ergue uma barreira de sangue: cada Teste de Fome absorve 5 pontos de dano.', 'Acaba ao fim da cena ou quando o dano absorvido se esgotar.'],
'Vitae Fulminante': ['Faz uma bomba cheia de vitae que dura até o amanhecer: dano agravado em vampiros, superficial em mortais.', 'Quem está no alcance contesta com Raciocínio + Atletismo para escapar.'],
'Marionete': ['Controla o sangue dentro de um corpo vivo ou morto e o move como boneco por um turno por ponto de margem.', 'Vivos contestam com Vigor + Ocultismo ou Fortitude. Cadáveres: Dificuldade 2.'],
'Carícia de Baal': ['Seu sangue vira veneno letal, numa lâmina ou nas presas: o dano que ele causa é agravado. Mortal que leva 1 ponto de dano morre.', 'A vítima contesta com Vigor + Ocultismo ou Fortitude.'],
'Caldeirão de Sangue': ['Ferve o sangue da vítima pelo toque: ela leva dano agravado igual à margem. Mortal que leva dano morre gritando. Você ganha Máculas.', 'A vítima contesta com Autocontrole + Ocultismo ou Fortitude.'],
'Recuperação de Vitae': ['Toma de volta, à distância, o sangue que você usou para criar carniçais.', 'Fora do Sabá, dá Máculas.'],

/* ---------- Oblívio ---------- */
'Cinzas às Cinzas': ['Dissolve um corpo. Cadáver sem animação some em três turnos, sem teste.', 'Corpo animado (zumbi, mortal vivo) contesta com Vigor + Medicina ou Fortitude.'],
'Elo de Ligação': ['Reconhece pelos sentidos o objeto a que um espectro está preso.', 'Enquanto ativo, −2 em testes de Prontidão, Raciocínio e Determinação.'],
'Visão do Oblívio': ['Enxerga no escuro total e vê fantasmas presentes por uma cena.', 'Os olhos ficam estranhos: −2 em testes sociais com mortais.'],
'Manto Sombrio': ['As sombras se ajustam a você: +2 dados em Furtividade e em Intimidação contra mortais.', ''],
'Braços de Ahriman': ['Conjura tentáculos de sombra que agarram, seguram e esmagam, controlados com Raciocínio + Oblívio. Você não faz mais nada enquanto os controla.', 'Os tentáculos não têm Vitalidade; luz forte e direta os desfaz.'],
'Predição Fatal': ['Aumenta a chance de um mortal ser ferido por acaso nas próximas 24 horas: cada ponto de margem vira 1 de dano agravado ao longo do dia.', 'A vítima contesta com Raciocínio + Ocultismo. Você não pode interagir com ela, direta ou indiretamente, nesse tempo.'],
'Precognição Fatal': ['Tem a visão de como alguém que não é vampiro vai morrer.', 'Precisa ver ou ouvir o alvo ao usar.'],
'Projetar Sombra': ['Cria sombras a partir do corpo, até o dobro do seu Oblívio em metros. Quem está nelas leva mais dano de Força de Vontade em conflito social.', ''],
'Onde o Véu se Adelgaça': ['Mede a espessura da Mortalha no lugar: diz se é fácil ou difícil usar poderes que tocam o mundo dos mortos ali.', ''],
'Aura de Decadência': ['Ao redor, plantas murcham, gente e bichos adoecem e a comida estraga (comer causa 2 de dano superficial).', 'Quem é afetado contesta com Vigor + Medicina ou Fortitude. Você sofre −2 em todos os testes sociais enquanto ativa.'],
'Banquete de Paixão': ['Sacia a Fome com a paixão de espectros; a Fome saciada assim não volta na noite seguinte.', 'O espectro contesta com Determinação + Autocontrole.'],
'Perspectiva das Sombras': ['Projeta seus sentidos numa sombra à vista e vê e ouve de lá por até uma cena.', 'Só se nota com poderes como Sentir o Invisível.'],
'Servo das Sombras': ['Manda uma sombra espiar ou assustar. Ela não tem mente própria.', 'Luz forte que ela não aguenta a destrói.'],
'Toque do Oblívio': ['Murcha e necrosa a parte do corpo que você agarra.', 'Exige vencer o agarrão primeiro. O Narrador pode dar Máculas.'],
'Praga Necrótica': ['Impõe uma doença que nenhuma medicina trata; só beber vitae cura.', 'A vítima contesta com Vigor + Medicina ou Fortitude. Falha total não tem efeito.'],
'Profanar o Santificado': ['Atordoa quem tem Fé Verdadeira e anula os efeitos dela por um turno, ou corrói símbolos sagrados para sempre.', 'O alvo resiste com um teste de Força de Vontade.'],
'Mortalha Estígia': ['Escuridão jorra de uma sombra e cobre a área (até o dobro do seu Oblívio em metros) por uma cena: quem está dentro fica cego.', 'Visão do Oblívio enxerga dentro.'],
'Agarre Umbroso': ['Abre um portal na sombra da vítima e a faz cair nos seus braços. Mortal desprevenido fica aterrorizado.', 'A vítima contesta com Destreza + Raciocínio. Você testa frenesi (Dificuldade 4) depois.'],
'A Escuridão Interior': ['Invoca de dentro da vítima uma entidade sombria que só quer destruí-la. A entidade tem as Perícias e Disciplinas dela e sofre dano como vampiro.', 'A vítima contesta com Autocontrole + Determinação.'],
'Passo das Sombras': ['Entra numa sombra e sai por outra à vista. Pode levar alguém que aceite.', 'Se você ganhar Mácula, o passageiro também ganha.'],
'Skuld Cumprido': ['Devolve à vítima uma doença ou ferida de que ela já se curou. Num carniçal, tira a imunidade ao envelhecimento e o vitae do corpo.', 'A vítima contesta com Vigor + Vigor ou Fortitude.'],
'Avatar Tenebroso': ['O corpo vira sombra plana: desliza por qualquer superfície e por frestas.', 'Só sol e fogo ferem você nessa forma.'],
'Espírito Definhante': ['Corrói o espírito da vítima até ela virar casca. Se ela estiver Debilitada, não volta como espectro.', 'A vítima contesta com Determinação + Ocultismo ou Fortitude.'],

/* ---------- Alquimia de Sangue-ralo ---------- */
'Alcance Distante': ['Empurra, puxa ou arremessa objetos e pessoas com a mente. Manter algo suspenso pede Determinação + Alquimia a cada turno, Dificuldade 3. Ressonância: Colérica.', 'Uma pessoa contesta com Força + Atletismo.'],
'Neblina': ['Levanta um nevoeiro que acompanha você por uma cena: fica mais difícil acertar você com tiros e identificar quem é. Um Teste de Fome extra cobre até cinco pessoas. Ressonância: Fleumática.', 'Vento forte dispersa.'],
'Envolver': ['Uma névoa gruda numa vítima por vez: cega e sufoca. Mortais podem desmaiar ou morrer asfixiados. Ressonância: Melancólica ou Fleumática.', 'A vítima contesta com Vigor + Sobrevivência. Vampiros não respiram: ficam só cegos.'],
'Falsificar Disciplina (1 ponto)': ['Imita um poder de nível 1 de qualquer Disciplina. Custo, parada e duração são os do poder imitado, com Alquimia no lugar da Disciplina.', 'Como o poder imitado.'],
'Falsificar Disciplina (2 pontos)': ['Imita um poder de nível 2 de qualquer Disciplina, com Alquimia no lugar da Disciplina.', 'Como o poder imitado.'],
'Falsificar Disciplina (3 pontos)': ['Imita um poder de nível 3. Exige uma gota de vitae de um vampiro que tenha a Disciplina (ou do clã que a tem).', 'Como o poder imitado.'],
'Falsificar Disciplina (4 pontos)': ['Imita um poder de nível 4. Exige uma gota de vitae de um vampiro que tenha a Disciplina (ou do clã que a tem).', 'Como o poder imitado.'],
'Desfracionar': ['Transforma sangue conservado (bolsa, fracionado) num elixir que sacia qualquer Membro, não só sangues-ralos. Ressonância: Melancólica ou Sanguínea.', ''],
'Hieros Gamos Profano': ['Remodela o próprio corpo na forma humana ideal: sexo, idade aparente, traços. Permanente. Mudanças grandes em mortais custam dano agravado.', 'Não cura a perdição de um Nosferatu.'],
'Ímpeto Aéreo': ['Voa na velocidade de corrida por uma cena; carregando o peso de uma pessoa, na velocidade de caminhada. Só o alquimista voa.', 'Quem é carregado contra a vontade contesta com Força + Atletismo.'],
'Despertar o Adormecido': ['Tira um vampiro do torpor. Ressonância: Colérica ou Sanguínea.', '']
};

/* junta o sistema aos poderes: p.sis e p.res */
(function () {
  Object.keys(DISCIPLINAS).forEach(d => {
    DISCIPLINAS[d].regras = REGRAS_DISC[d] || [];
    (DISCIPLINAS[d].poderes || []).forEach(p => {
      const s = SISTEMA_PODER[p.pt];
      if (s) { p.sis = s[0]; if (s[1]) p.res = s[1]; }
    });
  });
})();
