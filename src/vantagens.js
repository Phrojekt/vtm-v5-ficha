/* ============================================================
   Ficha de Sangue — Vantagens e Defeitos

   Mesma procedência das Disciplinas: a faixa de pontos, a categoria,
   os pré-requisitos e o livro de origem foram conferidos na wiki
   oficial da Paradox, https://vtm.paradoxwikis.com/ — são dados de
   regra. As descrições em `ds` são resumos próprios.

   Campos:
     pt/en  nome em português e em inglês
     min/max faixa de pontos
     ds     resumo próprio
     cat    categoria (ver CATEGORIAS)
     req    pré-requisito em texto — clã, outra Vantagem, ser
            sangue-ralo, pertencer a um culto…
     so     restringe a quem: 'ralo', 'caitiff', 'carnical', 'culto'
     par    o Defeito ou Vantagem que é o espelho desta entrada
     f      livro (ver FONTES, em disciplinas.js)
     errata 1 quando a wiki registra correção

   `so` é o que mantém o sorteio honesto: Defeito de Sangue-ralo não
   cai em Ventrue, Vantagem de carniçal não cai em vampiro, e rito de
   culto só aparece para quem declarou o culto.
   ============================================================ */

const CATEGORIAS = {
  'Antecedentes':  'Antecedentes',
  'Refúgio':       'Refúgio',
  'Aparência':     'Aparência',
  'Alimentação':   'Alimentação',
  'Vínculo':       'Vínculo de Sangue',
  'Míticas':       'Míticas',
  'Psicológicas':  'Psicológicas',
  'Substâncias':   'Substâncias',
  'Arcaicas':      'Arcaicas',
  'Laços':         'Laços de Sangue',
  'Diablerie':     'Diablerie',
  'Contágio':      'Contágio',
  'Linguística':   'Linguística',
  'Diversas':      'Diversas',
  'Caitiff':       'Caitiff',
  'Sangue-ralo':   'Sangue-ralo',
  'Carniçais':     'Carniçais',
  'Cultos':        'Cultos',
  'Loresheet':     'Loresheets'
};

/* V(pt, en, min, max, ds, extras) */
const V = (pt, en, min, max, ds, m) => Object.assign({ pt, en, min, max, ds, cat:'Diversas', f:'Básico' }, m || {});

const VANTAGENS = [
  /* ---------------- Antecedentes ---------------- */
  V('Aliados','Allies',2,6,'Um grupo de mortais que age por você. Divida os pontos entre Efetividade e Lealdade.',{cat:'Antecedentes'}),
  V('Contatos','Contacts',1,3,'Gente que consegue informação, bens ou acesso.',{cat:'Antecedentes'}),
  V('Fama','Fame',1,5,'Reconhecimento no mundo mortal — e o risco que vem junto.',{cat:'Antecedentes'}),
  V('Influenciador','Influencer',1,1,'Sua base de fãs faz o que você sugere.',{cat:'Antecedentes', req:'Fama 2+', f:'Succubus Club'}),
  V('Fama Duradoura','Enduring Fame',1,1,'Amado demais para cair em desgraça: a fama não se apaga.',{cat:'Antecedentes', req:'Fama 3+', f:'Succubus Club'}),
  V('Influência','Influence',1,5,'Peso dentro de instituições mortais: política, dinheiro, imprensa.',{cat:'Antecedentes'}),
  V('Rebanho','Herd',1,5,'Vasos de confiança, dos quais você bebe sem caçar.',{cat:'Antecedentes'}),
  V('Máscara','Mask',1,2,'Identidade falsa com lastro documental.',{cat:'Antecedentes'}),
  V('Zerado','Zeroed',1,1,'Seu eu anterior foi apagado de todos os sistemas.',{cat:'Antecedentes', req:'Máscara 2'}),
  V('Sapateiro','Cobbler',1,1,'Sabe fabricar ou encomendar Máscaras. Cada uma leva três dias por ponto.',{cat:'Antecedentes', req:'Máscara 1+'}),
  V('Mawla','Mawla',1,5,'Um Membro mais velho que te apadrinhou.',{cat:'Antecedentes'}),
  V('Recursos','Resources',1,5,'Renda e patrimônio, de bico noturno a fortuna herdada.',{cat:'Antecedentes'}),
  V('Lacaios','Retainers',1,3,'Servidores leais, às vezes carniçais, às vezes sob vínculo.',{cat:'Antecedentes'}),
  V('Status','Status',1,5,'Nome feito dentro da sua facção.',{cat:'Antecedentes'}),
  V('Segredos da Cidade','City Secrets',1,3,'Você conhece a estrutura de poder dos Membros da cidade.',{cat:'Antecedentes', f:'Guia do Jogador'}),

  /* ---------------- Refúgio ---------------- */
  V('Refúgio','Haven',1,3,'Um abrigo diurno seu. Sem pontos, você improvisa todas as noites.',{cat:'Refúgio'}),
  V('Localização','Location',1,1,'O lugar em si ajuda: +2 dados ou +2 de dificuldade para quem invadir.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Luxo','Luxury',1,1,'Bem decorado e caro. Impressiona e serve de moeda social.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Arsenal Escondido','Hidden Armory',1,5,'Cada ponto guarda uma pistola e uma arma longa, bem escondidas.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Cela','Cell',1,5,'Cabem dois prisioneiros; cada ponto a mais amplia ou reforça.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Vigias','Watchmen',1,5,'Cada ponto põe quatro mortais comuns e um capaz de olho no lugar.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Laboratório','Laboratory',1,5,'Cada ponto soma um dado a uma perícia de Ciência ou Tecnologia ali dentro.',{cat:'Refúgio', req:'Refúgio 1+', f:'Guia do Jogador'}),
  V('Biblioteca','Library',1,5,'Cada ponto soma um dado a Erudição, Investigação ou Ocultismo ali dentro.',{cat:'Refúgio', req:'Refúgio 1+', f:'Succubus Club'}),
  V('Oficina','Machine Shop',1,5,'Cada ponto soma um dado a Ofícios ali dentro.',{cat:'Refúgio', req:'Refúgio 1+', f:'Guia do Jogador'}),
  V('Cirurgia','Surgery',1,1,'Soma dois dados a testes médicos feitos no refúgio.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Sistema de Segurança','Security System',1,5,'Cada ponto soma um dado para barrar quem não foi convidado.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Saída de Serviço','Postern',1,5,'Uma rota de fuga que ninguém conhece.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Selo Místico','Warding',1,5,'Uma proteção mágica que repele entidades sobrenaturais.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Solo Sagrado','Holy Ground',1,1,'O refúgio tem valor para o seu culto.',{cat:'Refúgio', req:'Refúgio 1+', so:'culto', f:'Filhos do Sangue'}),
  V('Santuário','Shrine',1,3,'Um altar no refúgio, que soma dados a buscas e trabalhos do culto.',{cat:'Refúgio', req:'Refúgio 1+', so:'culto', f:'Filhos do Sangue'}),
  V('Ponto Comercial','Business Establishment',2,3,'O refúgio funciona como negócio, alugado ou tocado por você.',{cat:'Refúgio', req:'Refúgio 1+', f:'Guia do Jogador'}),
  V('Furcus','Furcus',1,3,'O refúgio fica sobre veios da terra ou num ponto fino do Véu.',{cat:'Refúgio', req:'Refúgio 1+', f:'Guia do Jogador'}),
  V('Refúgio Móvel','Mobile',1,3,'Carro, van, barco, avião. Os pontos dizem o tamanho.',{cat:'Refúgio', f:'Succubus Club'}),
  V('Blindado','Armored',1,1,'Painéis reforçados, travas e pneus à prova.',{cat:'Refúgio', req:'Refúgio Móvel', f:'Succubus Club'}),
  V('Compartimento Secreto','Smugglers Stash',1,2,'Um esconderijo dentro do refúgio móvel.',{cat:'Refúgio', req:'Refúgio Móvel', f:'Succubus Club'}),
  V('Placas Reserva','Spare Plates',2,2,'Jogo extra de placas e identificação para o refúgio móvel.',{cat:'Refúgio', req:'Refúgio Móvel', f:'Succubus Club'}),

  /* ---------------- Aparência ---------------- */
  V('Visual (Belo)','Beautiful',2,2,'Soma um dado às paradas Sociais em que a aparência conta.',{cat:'Aparência', par:'Feio'}),
  V('Visual (Deslumbrante)','Stunning',4,4,'Soma dois dados às paradas Sociais em que a aparência conta.',{cat:'Aparência', par:'Repulsivo'}),
  V('Traço Marcante','Remarkable Feature',1,1,'Um detalhe raro e memorável: cor dos olhos, uma cicatriz, a pele.',{cat:'Aparência', f:'Guia do Jogador'}),
  V('Rosto Famoso','Famous Face',1,1,'Parece alguém famoso. Dois dados quando isso ajuda.',{cat:'Aparência', f:'Guia do Jogador'}),
  V('Ingênuo','Ingénue',1,1,'Cara de quem não fez nada. Dois dados para escapar de suspeita.',{cat:'Aparência', f:'Guia do Jogador'}),
  V('Semblante de Matusalém','Semblance of the Methuselah',1,2,'A cara é parecida demais com a de um matusalém, e isso abre portas.',{cat:'Aparência', f:'Religiões Proibidas'}),
  V('Noite Adentro','Up All Night',2,4,'Conta a Humanidade como um nível acima — dois, se pagar quatro pontos.',{cat:'Aparência', f:'Amor Manchado'}),
  V('Cria da Cena','Scene Kid',1,1,'Encarna uma subcultura específica. Um dado a mais dentro dela.',{cat:'Aparência', f:'Succubus Club'}),

  /* ---------------- Alimentação ---------------- */
  V('Sabujo','Bloodhound',1,1,'Fareja a Ressonância sem precisar provar.',{cat:'Alimentação'}),
  V('Esôfago de Ferro','Iron Gullet',3,3,'Bebe sangue rançoso, de bolsa ou fracionado sem enjoar.',{cat:'Alimentação'}),
  V('Reconhecer o Vaso','Vessel Recognition',1,1,'Com Determinação + Percepção, sabe se um mortal já foi bebido.',{cat:'Alimentação', f:'Guia do Jogador'}),
  V('Bebida no Balcão','Drive-thru',1,1,'Alimenta-se em movimento, sem parar e sem deixar rastro.',{cat:'Alimentação', f:'Succubus Club'}),

  /* ---------------- Vínculo de Sangue ---------------- */
  V('Resistência a Vínculo','Bond Resistance',1,3,'Um dado a mais por ponto para resistir ao Laço de Sangue.',{cat:'Vínculo', par:'Viciado em Vínculo'}),
  V('Vínculo Curto','Short Bond',2,2,'Seus laços caem dois níveis por mês se não forem reforçados.',{cat:'Vínculo', par:'Vínculo Longo'}),
  V('Invinculável','Unbondable',5,5,'Não é possível te vincular.',{cat:'Vínculo', par:'Escravo de Vínculo'}),
  V('Laços de Fidelidade','Bonds of Fealty',3,3,'Sua Dominação dispensa contato visual em quem está vinculado a você.',{cat:'Vínculo', f:'Guerra da Gehenna'}),
  V('Vínculo Duradouro','Enduring Bond',1,1,'Os laços que você cria só enfraquecem a cada dois meses.',{cat:'Vínculo', f:'Guerra da Gehenna'}),

  /* ---------------- Míticas ---------------- */
  V('Comer Comida','Eat Food',2,2,'Come sem passar mal — depois precisa expelir antes de descansar.',{cat:'Míticas'}),
  V('Fome Fria e Morta','Cold Dead Hunger',3,3,'Dois dados a mais para resistir ao frenesi de fome.',{cat:'Míticas', f:'Religiões Proibidas'}),
  V('Diablerie de Alcateia','Pack Diablerie',2,2,'Numa diablerie em grupo, a alma é sempre sua, salvo se abrir mão.',{cat:'Míticas', f:'Religiões Proibidas'}),
  V('Sorte do Diabo','Luck of the Devil',4,4,'Uma vez por sessão, o azar vai para alguém perto de você.',{cat:'Míticas', f:'Guia do Jogador'}),
  V('Modo Nuit','Nuit Mode',2,2,'O corpo não volta ao estado de morte toda noite.',{cat:'Míticas', f:'Guia do Jogador'}),
  V('Objeto de Poder','Object of Power',1,3,'Um item raro e potente. Um ponto rerrola um dado por história; três dão mais.',{cat:'Míticas', f:'In Memoriam'}),
  V('Sanguessuga de Linha Ley','Ley Line Leach',1,1,'Segue caminhos antigos de poder e se recupera neles.',{cat:'Míticas', f:'Succubus Club'}),
  V('Rubor Persistente','Persistent Blush',3,3,'Um único Rubor da Vida dura uma semana.',{cat:'Míticas', f:'Succubus Club'}),

  /* ---------------- Psicológicas ---------------- */
  V('Vontade Profana','Unholy Will',2,4,'Dados a mais contra quem usa Fé Verdadeira contra você.',{cat:'Psicológicas', so:'culto', f:'Cultos'}),
  V('Zelotia','Zealotry',1,3,'Uma vez por sessão por ponto, transforma um sucesso comum em crítico.',{cat:'Psicológicas', so:'culto', f:'Cultos'}),
  V('Penitência','Penitence',1,5,'Troca dano superficial em si mesmo por um sucesso onde precisa.',{cat:'Psicológicas', so:'culto', f:'Cultos'}),
  V('Besta Aplacada','Soothed Beast',1,1,'Com um mortal por obsessão, ignora uma falha bestial por sessão.',{cat:'Psicológicas', f:'Amor Manchado'}),
  V('Falso Amor','False Love',1,1,'Perto do objeto da sua obsessão, conta a Humanidade como maior.',{cat:'Psicológicas', f:'Amor Manchado'}),

  /* ---------------- Laços de Sangue ---------------- */
  V('Sentido Consanguíneo','Consanguineous Sense',2,2,'Sente quem é da sua linhagem direta.',{cat:'Laços', f:'Guerra da Gehenna'}),
  V('Influência Consanguínea','Consanguineous Influence',2,2,'Um dado a mais nas Disciplinas mentais contra vampiros do seu clã.',{cat:'Laços', f:'Guerra da Gehenna'}),
  V('Pecados do Pai','Sins of the Father',2,3,'Diablerie em ancestral ou descendente direto não deixa marca.',{cat:'Laços', f:'Guerra da Gehenna'}),

  /* ---------------- Substâncias / Arcaicas ---------------- */
  V('Viciado Funcional','High Functioning Addict',1,1,'Um dado a mais numa categoria quando o último sangue tinha a droga.',{cat:'Substâncias'}),
  V('Guardião da História','Custodian of History',1,1,'+1 em perícias ligadas a um período ou personagem que você viveu.',{cat:'Arcaicas', f:'In Memoriam'}),

  /* ---------------- Linguística ---------------- */
  V('Linguística','Linguistics',1,5,'Cada ponto dá um idioma lido, escrito e falado com fluência.',{cat:'Linguística', par:'Analfabeto'}),

  /* ---------------- Diversas ---------------- */
  V('Olha no Porta-Malas','Check the Trunk',1,1,'Acesso fácil a um arsenal ou a um estoque de ferramentas.',{cat:'Diversas', f:'Guia do Jogador'}),
  V('Fazedor de Bico','Side Hustler',2,2,'Uma vez por sessão, arruma um item, uma informação ou um acesso.',{cat:'Diversas', f:'Guia do Jogador'}),
  V('Vontade Temperada','Tempered Will',3,3,'Percebe sempre que tentam usar Dominação ou Presença em você.',{cat:'Diversas', par:'Fraco de Vontade'}),
  V('Intocável','Untouchable',5,5,'Uma vez por história, escapa de qualquer punição oficial.',{cat:'Diversas'}),
  V('Místico do Vazio','Mystic of the Void',1,2,'Conta como conhecendo um poder de Oblívio que você não tem.',{cat:'Diversas', f:'Fachada Esfarrapada'}),

  /* ---------------- Caitiff ---------------- */
  V('Sangue Favorecido','Favored Blood',4,4,'Compra qualquer Disciplina sem nunca ter provado o vitae de quem a tem.',{cat:'Caitiff', so:'caitiff'}),
  V('Marca de Caim','Mark of Caine',2,2,'Dois dados para intimidar vampiros que acreditam na marca.',{cat:'Caitiff', so:'caitiff'}),
  V('Passarinho Imitador','Mockingbird',3,3,'Bebendo de outro vampiro, usa uma Disciplina dele por uma noite.',{cat:'Caitiff', so:'caitiff'}),
  V('Marcado pelo Sol','Sun-Scarred',5,5,'O primeiro turno sob o sol não causa dano; depois, um agravado por turno.',{cat:'Caitiff', so:'caitiff'}),
  V('Tio Presas','Uncle Fangs',3,3,'Acesso fácil a uma coterie de três a cinco sangues-ralos.',{cat:'Caitiff', so:'caitiff'}),

  /* ---------------- Sangue-ralo ---------------- */
  V('Camaradas Anarquistas','Anarch Comrades',1,1,'Fez amizade com um grupo Anarquista: vale como Mawla Anarquista 1.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Contato na Camarilla','Camarilla Contact',1,1,'Alguém da Camarilla te tolera: vale como Mawla da Camarilla 1.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Sangue Concatenante','Catenating Blood',1,1,'Consegue criar Laços de Sangue e Abraçar outros sangues-ralos.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Bebedor Diurno','Day Drinker',1,1,'Anda ao sol. A luz corta sua Vitalidade pela metade e trava Disciplinas.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Afinidade com Disciplina','Discipline Affinity',1,1,'Um ponto numa Disciplina, que pode continuar subindo.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Parece Vivo','Lifelike',1,1,'Tem pulso, come, sente prazer. Passa na maioria dos exames médicos.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Alquimista de Sangue-ralo','Thin-blood Alchemist',1,1,'Um ponto de Alquimia de Sangue-ralo e uma fórmula.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Resiliência Vampírica','Vampiric Resilience',1,1,'Sofre dano como um vampiro pleno.',{cat:'Sangue-ralo', so:'ralo', par:'Fragilidade Mortal'}),
  V('Sangue Abominável','Abhorrent Blood',1,1,'Seu sangue é tão ruim que beber dele custa Força de Vontade.',{cat:'Sangue-ralo', so:'ralo'}),
  V('À Prova de Fé','Faith-Proof',1,1,'Mortal demais para a Fé Verdadeira te alcançar.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Pouco Apetite','Low Appetite',1,1,'Acordando com Fome 0 ou 1, rola dois dados na Provocação e fica o melhor.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Sonhador Lúcido','Lucid Dreamer',1,1,'Uma vez por sessão, tira uma pista das memórias da noite anterior.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Ares de Mortal','Mortality’s Mien',1,1,'Nada sobrenatural denuncia o que você é.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Bebedor Veloz','Swift Feeder',1,1,'Sacia uma Fome num turno e ainda lambe a ferida fechada.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),

  /* ---------------- Carniçais ---------------- */
  V('Empatia de Sangue','Blood Empathy',2,2,'Sente quando o domitor está em perigo ou precisa de você.',{cat:'Carniçais', so:'carnical'}),
  V('Aura Imprópria','Unseemly Aura',2,2,'Sua aura já não se distingue da de um Membro.',{cat:'Carniçais', so:'carnical'}),

  /* ---------------- Cultos ---------------- */
  V('Textos Apócrifos','Apocryphal Texts',1,1,'Guarda escritos de um líder ou fundador do culto.',{cat:'Cultos', so:'culto', f:'Cultos'}),
  V('Artista Inspirado','Inspired Artist',2,2,'Sua arte carrega os símbolos do culto e mexe com quem vê.',{cat:'Cultos', so:'culto', f:'Cultos'}),
  V('Pregador Itinerante','Traveling Preacher',2,2,'Espalhou a mensagem do culto por onde passou.',{cat:'Cultos', so:'culto', f:'Cultos'}),
  V('Memórias dos Caídos','Memories of the Fallen',2,2,'Em Alquimia ligada a Ashe, cada 10 rolado conta por dois.',{cat:'Cultos', so:'ralo', req:'Ashfinders', f:'Cultos'}),
  V('Transmissor','Streamer',2,2,'Uma vez por história, a plateia faz algo pequeno por você.',{cat:'Cultos', so:'culto', req:'Ashfinders', f:'Cultos'}),
  V('Jardineiro','Gardener',1,5,'Equivale a Rebanho, mas entre os fiéis.',{cat:'Cultos', so:'culto', req:'Bahari', f:'Cultos'}),
  V('Canto da Mãe Sombria','Dark Mother’s Song',2,2,'Três dados a mais para convencer alguém a cultuar Lilith.',{cat:'Cultos', so:'culto', req:'Bahari', f:'Cultos'}),
  V('Resistente ao Fogo','Fire Resistant',1,1,'Converte parte do dano agravado de fogo em superficial.',{cat:'Cultos', so:'culto', req:'Igreja de Caim', f:'Cultos'}),
  V('Vigilante','Vigilant',2,2,'Sabe quando está sendo observado, salvo por meios sobrenaturais.',{cat:'Cultos', so:'culto', req:'Igreja de Set', f:'Cultos'}),
  V('Resolvedor','Fixer',2,2,'Uma vez por história, cobra um favor ou ameaça um ex-cliente.',{cat:'Cultos', so:'culto', req:'Igreja de Set', f:'Cultos'}),
  V('Sumir do Mapa','Go to Ground',1,1,'Dois dados a mais para despistar perseguição.',{cat:'Cultos', so:'culto', req:'Igreja de Set', f:'Cultos'}),
  V('Sussurros Insidiosos','Insidious Whispers',2,2,'Ao minar uma Convicção alheia, cada 10 rolado conta por dois.',{cat:'Cultos', so:'culto', req:'Culto de Shalim', f:'Cultos'}),
  V('Gematria','Gematria',1,1,'Lê e escreve uma cifra que só o culto entende.',{cat:'Cultos', so:'culto', req:'Culto de Shalim', f:'Cultos'}),
  V('Matador de Touros','Bull-Slayer',3,3,'Em testes estendidos, rerrola até três dados comuns.',{cat:'Cultos', so:'culto', req:'Mistérios Mitraicos', f:'Cultos'}),
  V('Negociador','Bargainer',1,1,'Reduz em 1 a dificuldade para avaliar uma transação.',{cat:'Cultos', so:'culto', req:'Mistérios Mitraicos', f:'Cultos'}),
  V('Graça do Arcanjo','Archangel’s Grace',3,3,'Troca Atletismo por Performance, ou o contrário, quando faz sentido.',{cat:'Cultos', so:'culto', req:'Nephilim', f:'Cultos'})
];

const DEFEITOS = [
  /* ---------------- Antecedentes ---------------- */
  V('Inimigo','Enemy',1,5,'O avesso de Aliados: vale dois pontos a menos que a efetividade dele.',{cat:'Antecedentes', par:'Aliados'}),
  V('Segredo Sombrio','Dark Secret',1,5,'O que você fez ainda é segredo — menos para um ou dois inimigos motivados.',{cat:'Antecedentes'}),
  V('Infâmia','Infamy',1,5,'Você fez algo atroz e todo mundo sabe.',{cat:'Antecedentes', f:'In Memoriam'}),
  V('Banido de','Banned From',1,3,'Proibido de entrar numa cidade. Um ponto por porte.',{cat:'Antecedentes', f:'Succubus Club'}),
  V('Desprezado','Disliked',1,1,'Um dado a menos em testes Sociais com grupos fora do seu.',{cat:'Antecedentes', par:'Influência'}),
  V('Odiado','Despised',2,2,'Um grupo ou bairro inteiro trabalha para arruinar seus planos.',{cat:'Antecedentes'}),
  V('Predador Manifesto','Obvious Predator',2,2,'Dois dados a menos em qualquer parada de caça que não seja emboscada.',{cat:'Antecedentes', par:'Rebanho'}),
  V('Cadáver Conhecido','Known Corpse',1,1,'As pessoas sabem que você morreu, e reagem de acordo.',{cat:'Antecedentes', par:'Máscara'}),
  V('Corpo Fichado','Known Blankbody',2,2,'Nome, histórico e contatos já estão em banco de dados de agência.',{cat:'Antecedentes'}),
  V('Adversário','Adversary',1,5,'Um Membro que já gostou de você e agora trabalha contra.',{cat:'Antecedentes', par:'Mawla'}),
  V('Mestre Secreto','Secret Master',1,1,'Seu Mawla te passa tarefas que precisam ser feitas em silêncio.',{cat:'Antecedentes', req:'Mawla 1+', f:'In Memoriam'}),
  V('Cria Vergonhosa','Shameful Childe',1,1,'Você Abraçou alguém e abandonou.',{cat:'Antecedentes', f:'In Memoriam'}),
  V('Pilar Abraçado pelo Inimigo','Touchstone Embraced by your Enemies',2,2,'Um antigo Pilar não morreu — alguém o Abraçou.',{cat:'Antecedentes', f:'In Memoriam'}),
  V('Miserável','Destitute',1,1,'Sem dinheiro, sem casa, sem nada além de si mesmo.',{cat:'Antecedentes', par:'Recursos'}),
  V('Perseguidores','Stalkers',1,1,'Você atrai gente que se apega demais e não larga.',{cat:'Antecedentes', par:'Lacaios'}),
  V('Suspeito','Suspect',1,1,'Quebrou uma regra ou fugiu de uma dívida. A facção reparou.',{cat:'Antecedentes', par:'Status'}),
  V('Rejeitado','Shunned',2,2,'Uma seita inteira te detesta por algo que não se perdoa.',{cat:'Antecedentes'}),
  V('Fingidor de Mortal','Mortal Pretender',1,1,'Insiste em levar vida de mortal, e isso incomoda os Membros.',{cat:'Antecedentes'}),
  V('Dívidas de Prestação','Prestation Debts',1,1,'Você deve favores, e eles continuam aparecendo mesmo depois de pagos.',{cat:'Antecedentes', f:'Guia do Jogador'}),

  /* ---------------- Refúgio ---------------- */
  V('Sem Refúgio','No Haven',1,1,'Toda noite precisa de um teste para achar onde dormir.',{cat:'Refúgio', par:'Refúgio'}),
  V('Sinistro','Creepy',1,1,'Dois dados a menos em testes Sociais com mortais dentro do refúgio.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Assombrado','Haunted',1,5,'Alguma manifestação sobrenatural tomou conta do refúgio.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Comprometido','Compromised',2,2,'O refúgio está em alguma lista e já pode ter sido invadido.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Dividido','Shared',1,2,'O refúgio não é só seu.',{cat:'Refúgio', req:'Refúgio 1+'}),
  V('Nos Trilhos','On the Rails',1,1,'O refúgio móvel anda, mas não para onde você quer.',{cat:'Refúgio', req:'Refúgio Móvel', f:'Succubus Club'}),
  V('Temperamental','Temperamental',1,1,'O veículo é pouco confiável: falha de Condução vira avaria.',{cat:'Refúgio', req:'Refúgio Móvel', f:'Succubus Club'}),

  /* ---------------- Aparência ---------------- */
  V('Feio','Ugly',1,1,'Um dado a menos nas paradas Sociais em que a aparência conta.',{cat:'Aparência', par:'Visual (Belo)'}),
  V('Repulsivo','Repulsive',2,2,'Dois dados a menos nas paradas Sociais em que a aparência conta.',{cat:'Aparência', par:'Visual (Deslumbrante)'}),
  V('Fedor','Stench',1,1,'Hálito e cheiro sobrenaturalmente ruins. Um dado a menos em sedução.',{cat:'Aparência'}),
  V('Transparente','Transparent',1,1,'Não consegue mentir: ou é péssimo ator, ou tem mania de verdade.',{cat:'Aparência', f:'Guia do Jogador'}),
  V('Semblante Fixo','Unblinking Visage',2,2,'Conta a Humanidade como dois níveis abaixo ao fingir estar vivo.',{cat:'Aparência', f:'Guia do Jogador'}),

  /* ---------------- Alimentação ---------------- */
  V('Exclusão de Presa','Prey Exclusion',1,1,'Não bebe de um tipo de gente; se quebrar, ganha Máculas.',{cat:'Alimentação'}),
  V('Sede de Matusalém','Methuselah’s Thirst',1,1,'Só sangue sobrenatural zera sua Fome.',{cat:'Alimentação'}),
  V('Fazendeiro','Farmer',2,2,'Gasta duas Forças de Vontade para beber de humano. Ventrue não pode ter.',{cat:'Alimentação', par:'Rebanho'}),
  V('Organívoro','Organovore',2,2,'Só sacia comendo carne e órgãos humanos junto.',{cat:'Alimentação'}),
  V('Puxador de Veia','Vein Tapper',1,1,'A alimentação é íntima demais: precisa ser alguém adormecido ou indefeso.',{cat:'Alimentação', f:'Guia do Jogador'}),
  V('Preferência Ultrapassada','Outdated Preference',2,2,'Só sacia num tipo de vítima que quase não existe mais.',{cat:'Alimentação', f:'Guia do Jogador'}),
  V('Sensibilidade a Ressonância','Resonance Sensitivity',1,1,'Uma Ressonância te desmonta e provoca uma compulsão própria.',{cat:'Alimentação', f:'Succubus Club'}),
  V('Bebedor Desleixado','Sloppy Feeder',2,2,'O padrão das suas mordidas é reconhecível. Uma mordida já é pista.',{cat:'Alimentação', f:'Succubus Club'}),

  /* ---------------- Vínculo de Sangue ---------------- */
  V('Viciado em Vínculo','Bond Junkie',1,1,'O laço é doce demais: um dado a menos para agir contra o regente.',{cat:'Vínculo', par:'Resistência a Vínculo'}),
  V('Vínculo Longo','Long Bond',1,1,'Seus laços só enfraquecem a cada três meses.',{cat:'Vínculo', par:'Vínculo Curto'}),
  V('Escravo de Vínculo','Bondslave',2,2,'Vincula-se com um único gole, não três.',{cat:'Vínculo', par:'Invinculável'}),
  V('Dois Senhores','Two Masters',1,1,'Está vinculado a duas pessoas ao mesmo tempo.',{cat:'Vínculo', f:'Amor Manchado'}),

  /* ---------------- Míticas ---------------- */
  V('Ruína Folclórica','Folkloric Bane',1,1,'Um objeto do folclore vampírico te causa dano agravado ao toque.',{cat:'Míticas'}),
  V('Bloqueio Folclórico','Folkloric Block',1,1,'Precisa gastar Força de Vontade ou se afastar de um objeto específico.',{cat:'Míticas'}),
  V('Estigmas','Stigmata',1,1,'Sangra das mãos, dos pés e da testa quando chega a Fome 4.',{cat:'Míticas'}),
  V('Isca de Estaca','Stake Bait',2,2,'Estaca no coração significa morte final para você.',{cat:'Míticas'}),
  V('Decadência Faminta','Starving Decay',2,2,'A partir de Fome 3 o corpo apodrece: dois dados a menos em Social.',{cat:'Míticas'}),
  V('Objeto Amaldiçoado','Cursed Object',1,1,'Uma vez por sessão, um sucesso seu precisa ser rerrolado.',{cat:'Míticas', f:'In Memoriam'}),
  V('Duas Vezes Amaldiçoado','Twice Cursed',2,2,'Carrega a Perdição variante do clã além da comum.',{cat:'Míticas', f:'Guia do Jogador'}),
  V('Rubor Resistente','Resistant Blush',1,1,'Na Provocação do Rubor da Vida, rola dois dados e fica com o pior.',{cat:'Míticas', f:'Succubus Club'}),
  V('Preso à Terra','Land Locked',1,1,'Não consegue deixar sua terra sem um teste de frenesi de medo.',{cat:'Míticas', f:'Succubus Club'}),
  V('Carne Cadavérica','Corpse Flesh',2,2,'Não consegue usar o Rubor da Vida.',{cat:'Míticas', f:'Succubus Club'}),

  /* ---------------- Psicológicas ---------------- */
  V('Farol de Profanação','Beacon of Profanity',1,1,'Mortais com qualquer Fé Verdadeira sentem sua presença.',{cat:'Psicológicas', so:'culto', f:'Cultos'}),
  V('Crise de Fé','Crisis of Faith',1,1,'Toda falha bestial custa um ponto superficial de Força de Vontade.',{cat:'Psicológicas', so:'culto', f:'Cultos'}),
  V('Cicatrizes da Penitência','Horrible Scars of Penitence',1,1,'Fora do culto, conta como Repulsivo.',{cat:'Psicológicas', so:'culto', f:'Cultos'}),
  V('Verme Rastejante','Groveling Worm',2,2,'Precisa flagelar a própria carne uma vez por sessão.',{cat:'Psicológicas', so:'culto', f:'Cultos'}),

  /* ---------------- Substâncias / Arcaicas ---------------- */
  V('Vício','Addiction',1,1,'Um dado a menos em tudo enquanto não conseguir a droga.',{cat:'Substâncias'}),
  V('Vício Irremediável','Hopeless Addiction',2,2,'Dois dados a menos em tudo enquanto não conseguir a droga.',{cat:'Substâncias'}),
  V('Vivendo no Passado','Living in the Past',1,1,'Não entende o mundo moderno; uma Convicção é de outra era.',{cat:'Arcaicas', f:'In Memoriam'}),
  V('Arcaico','Archaic',2,2,'Não usa computador nem celular. Tecnologia é sempre 0.',{cat:'Arcaicas'}),
  V('Fobia de Luto','Grief Phobia',1,1,'Um dado a menos perto do que dispara a sua fobia.',{cat:'Arcaicas'}),
  V('Truques Velhos','Old Tricks',1,1,'Todas as suas especializações precisam ser arcaicas.',{cat:'Arcaicas', f:'In Memoriam'}),

  /* ---------------- Linguística / Diversas ---------------- */
  V('Analfabeto','Illiterate',2,2,'Não lê nem escreve. Ciência e Erudição travam.',{cat:'Linguística', par:'Linguística'}),
  V('Faminto por Saber','Knowledge Hungry',1,1,'Escolha um assunto: quando ele aparece, você larga tudo para estudar.',{cat:'Diversas', f:'Guia do Jogador'}),
  V('Aventureiro','Risk-Taker',1,1,'Diante de uma tentação arriscada e inédita, precisa ceder ou gastar Vontade.',{cat:'Diversas', f:'Guia do Jogador', errata:1}),
  V('Fraco de Vontade','Weak-Willed',2,2,'Mesmo sabendo que estão te manipulando, não consegue reagir.',{cat:'Diversas', par:'Vontade Temperada'}),

  /* ---------------- Contágio / Diablerie ---------------- */
  V('Vetor de Doença','Disease Vector',1,1,'Bebendo de um doente, sempre pega e sempre transmite.',{cat:'Contágio'}),
  V('Portador da Praga','Plaguebringer',1,2,'Carrega no vitae uma doença que não sai.',{cat:'Contágio'}),
  V('Diabolista Evidente','Blatant Diablerist',1,1,'Qualquer poder que detecte diablerie encontra a sua.',{cat:'Diablerie', f:'Guerra da Gehenna'}),
  V('Perdição Herdada','Inherited Bane',2,2,'Carrega a Perdição de outro clã além da sua.',{cat:'Diablerie', f:'Guerra da Gehenna'}),

  /* ---------------- Caitiff ---------------- */
  V('Vitae Corruptor','Befouling Vitae',2,2,'Todo mortal que você Abraça ou mata bebendo volta como wight.',{cat:'Caitiff', so:'caitiff'}),
  V('Maldição de Clã','Clan Curse',2,2,'Sofre a Perdição de um clã à sua escolha, sem os benefícios.',{cat:'Caitiff', so:'caitiff'}),
  V('Devedor','Debt Peon',2,2,'Deve favores a um vampiro de alto Status, e a conta nunca fecha.',{cat:'Caitiff', so:'caitiff'}),
  V('Liquidante','Liquidator',1,1,'Dois dados a menos em testes Sociais com sangues-ralos.',{cat:'Caitiff', so:'caitiff'}),
  V('Sangue Turvo','Muddled Blood',1,1,'Para usar a Disciplina, precisa antes beber de alguém que a tenha.',{cat:'Caitiff', so:'caitiff'}),
  V('Presságio Ambulante','Walking Omen',2,2,'Toda profecia e premonição aponta você como a desgraça anunciada.',{cat:'Caitiff', so:'caitiff'}),
  V('Marcado por Palavras','Word-Scarred',1,1,'O corpo é coberto por texto vampírico antigo.',{cat:'Caitiff', so:'caitiff'}),

  /* ---------------- Sangue-ralo ---------------- */
  V('Rejeitado pelos Anarquistas','Shunned by the Anarchs',1,1,'Os Anarquistas te evitam e te entregariam se precisassem.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Marcado pela Camarilla','Branded by the Camarilla',1,1,'Uma marca que não cicatriza denuncia o que você é.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Temperamento Bestial','Bestial Temper',1,1,'Faz teste de frenesi como um vampiro pleno.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Maldição de Clã (ralo)','Clan Curse',1,1,'Carrega a Perdição de um clã, com Gravidade 1.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Dependência de Vitae','Vitae Dependency',1,1,'Precisa de sangue de vampiro toda semana ou perde os poderes.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Carne Morta','Dead Flesh',1,1,'Exame médico aponta cadáver. Um dado a menos para se passar por vivo.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Dentes de Leite','Baby Teeth',1,1,'Presas curtas demais: morder exige uma lâmina.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Fragilidade Mortal','Mortal Frailty',1,1,'Cura como mortal e não consegue provocar o sangue.',{cat:'Sangue-ralo', so:'ralo', par:'Resiliência Vampírica'}),
  V('Heliofobia','Heliophobia',1,1,'Teme o sol como um vampiro pleno, com frenesi de terror.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Terrores Noturnos','Night Terrors',1,1,'Uma vez por sessão, um dado a menos em tudo por causa dos pesadelos.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Portador de Praga','Plague Bearers',1,1,'Ainda pega doença de gente, e passa adiante ao se alimentar.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Bebedor Atrapalhado','Sloppy Drinker',1,1,'Alimentar-se exige Destreza + Medicina para não rasgar demais.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Desbotado pelo Sol','Sun-Faded',1,1,'Alquimia e Disciplinas não funcionam sob luz do dia.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Sinal Sobrenatural','Supernatural Tell',1,1,'Criaturas sobrenaturais te reconhecem de longe.',{cat:'Sangue-ralo', so:'ralo', f:'Guia do Jogador'}),
  V('Presença Crepuscular','Twilight Presence',1,1,'Mortais e Membros acham desagradável ficar perto de você.',{cat:'Sangue-ralo', so:'ralo'}),
  V('Fome Sem Fim','Unending Hunger',1,1,'Cada cena de alimentação sacia uma Fome a menos.',{cat:'Sangue-ralo', so:'ralo'}),

  /* ---------------- Carniçais ---------------- */
  V('Sangue Maldito','Baneful Blood',1,2,'Sofre a Perdição do primeiro domitor, mesmo tendo trocado.',{cat:'Carniçais', so:'carnical', errata:1}),
  V('Maldição da Anciã','Crone’s Curse',2,2,'Aparenta pelo menos uma década a mais do que tem.',{cat:'Carniçais', so:'carnical', errata:1}),
  V('Presas Perturbadoras','Distressing Fangs',1,1,'Criou presas: um dado a menos em paradas Sociais com mortais.',{cat:'Carniçais', so:'carnical', errata:1}),

  /* ---------------- Cultos ---------------- */
  V('Excomungado','Excommunicated',1,2,'Foi expulso. Dois dados a menos com quem ainda é do culto.',{cat:'Cultos', so:'culto', f:'Cultos'}),
  V('Descrente','Faithless',2,2,'Está no culto pelo proveito. Dois dados a menos para fingir devoção.',{cat:'Cultos', so:'culto', f:'Cultos'}),
  V('Vício em Ashe','Ashe Addiction',2,2,'Toda Alquimia malsucedida cobra o preço do vício em Ashe.',{cat:'Cultos', so:'culto', req:'Ashfinders', f:'Cultos'}),
  V('Cisma','Schism',1,1,'Dois dados a menos em testes Sociais dentro do próprio culto.',{cat:'Cultos', so:'culto', req:'Igreja de Caim', f:'Cultos'}),
  V('Alarme Falso','False Alarm',1,1,'Toda falha em Percepção conta como falha total.',{cat:'Cultos', so:'culto', req:'Igreja de Set', f:'Cultos'}),
  V('Vazio','Empty',1,1,'As pessoas arrumam desculpa para sair de perto de você.',{cat:'Cultos', so:'culto', req:'Culto de Shalim', f:'Cultos'}),
  V('Iniciado Falho','Failed Initiate',1,1,'Falhou na iniciação e ficou com a tarefa que ninguém quer.',{cat:'Cultos', so:'culto', req:'Mistérios Mitraicos', f:'Cultos'}),
  V('Saudade','Yearning',1,1,'Sente falta do mestre: gasta duas Forças de Vontade para agir contra ele.',{cat:'Cultos', so:'culto', req:'Nephilim', f:'Cultos'})
];

/* Defeitos presos a uma Disciplina: só existem para quem a tem.
   Todos valem um ponto e vêm do Guia do Jogador. */
const DEFEITOS_DISCIPLINA = [
  { disc:'Animalismo',          pt:'Indomado',      en:'Untamed',            ds:'Em frenesi, falhar em Cavalgar a Onda custa duas Máculas.' },
  { disc:'Auspícios',           pt:'Pesadelos Diurnos', en:'Daymares',       ds:'Ao acordar, faz duas Provocações em vez de uma.' },
  { disc:'Feitiçaria de Sangue',pt:'Animismo Sanguinário', en:'Sanguinary Animism', ds:'Dois dados a menos em paradas Sociais e Mentais enquanto o sangue sussurra.' },
  { disc:'Celeridade',          pt:'Colapso',       en:'Breakdown',          ds:'Falha na Provocação de Celeridade custa um ponto de dano agravado.' },
  { disc:'Dominação',           pt:'Rombudo',       en:'Blunt',              ds:'Não pode gastar Força de Vontade para rerrolar teste Social.' },
  { disc:'Fortitude',           pt:'Tecido Cicatricial', en:'Scar Tissue',   ds:'Curar com o sangue deixa marcas visíveis e permanentes.' },
  { disc:'Ofuscação',           pt:'Apagado',       en:'Faded',              ds:'Um dado a menos em testes de Remorso.' },
  { disc:'Oblívio',             pt:'Monstruoso',    en:'Monstrous',          ds:'Conta a Humanidade como três níveis abaixo para efeitos de aparência.' },
  { disc:'Potência',            pt:'Instinto Assassino', en:'Killer Instinct', ds:'Falha na Provocação de Potência dispara teste de frenesi de fúria.' },
  { disc:'Presença',            pt:'Egomaníaco',    en:'Egomaniac',          ds:'Crítico sujo ou falha numa disputa Social dispara frenesi de fúria.' },
  { disc:'Proteanismo',         pt:'Estase',        en:'Stasis',             ds:'Falha na Provocação de Proteanismo trava a forma até o pôr do sol seguinte.' }
];

/* Pares que não podem sair na mesma ficha. Nenhum livro proíbe — é
   coerência: Visual (Belo) com Feio, ou Invinculável com Escravo de
   Vínculo, é ficha que se contradiz sozinha. Vale nos dois sentidos,
   porque o Tipo de Predador já pode ter entregue um lado do par. */
const CONTRADICOES = [
  ['Visual (Belo)', 'Feio'],
  ['Visual (Belo)', 'Repulsivo'],
  ['Visual (Deslumbrante)', 'Feio'],
  ['Visual (Deslumbrante)', 'Repulsivo'],
  ['Linguística', 'Analfabeto'],
  ['Resistência a Vínculo', 'Viciado em Vínculo'],
  ['Invinculável', 'Escravo de Vínculo'],
  ['Invinculável', 'Viciado em Vínculo'],
  ['Invinculável', 'Dois Senhores'],
  ['Vínculo Curto', 'Vínculo Longo'],
  ['Recursos', 'Miserável'],
  ['Refúgio', 'Sem Refúgio'],
  ['Rebanho', 'Fazendeiro'],
  ['Status', 'Rejeitado'],
  ['Vontade Temperada', 'Fraco de Vontade'],
  ['Resiliência Vampírica', 'Fragilidade Mortal'],
  ['Máscara', 'Cadáver Conhecido'],
  ['Esôfago de Ferro', 'Sede de Matusalém'],
  ['Parece Vivo', 'Carne Morta'],
  ['Bebedor Diurno', 'Heliofobia'],
  ['Vício', 'Vício Irremediável'],
  ['Comer Comida', 'Organívoro']
];

/* Índices por nome, para achar rápido. */
const POR_NOME = {};
VANTAGENS.forEach(v => POR_NOME[v.pt] = v);
DEFEITOS.forEach(v => { if (!POR_NOME[v.pt]) POR_NOME[v.pt] = v; });

/* Agrupa uma lista por categoria, na ordem de CATEGORIAS. */
function agruparPorCategoria(lista) {
  const ordem = Object.keys(CATEGORIAS);
  const mapa = {};
  lista.forEach(v => { (mapa[v.cat] = mapa[v.cat] || []).push(v); });
  return ordem.filter(c => mapa[c]).map(c => ({ g: CATEGORIAS[c], cat: c, itens: mapa[c] }));
}
