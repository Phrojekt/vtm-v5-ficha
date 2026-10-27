/* ============================================================
   Ficha de Sangue — arquétipos de contexto

   Cada entrada casa por raiz de palavra e empurra perícias,
   atributos, vantagens e defeitos; além disso sugere clã,
   tipo de predador, disciplina, ressonância, credo e ímpeto.
   Nada aqui é obrigatório: o que o jogador fixa na Forja manda.
   ============================================================ */

/* Disciplinas na criação — Guia Suplementar:
   "Escolha duas Disciplinas do seu clã. Atribua dois pontos a
   uma e um ponto a outra." O Predador acrescenta mais um ponto. */
const DISTRIB_DISCIPLINAS = { reparticao: [2, 1], total: 3 };

/* Amplitude de Disciplinas por geração.

   A criação é sempre 2+1 dentro do clã — isso não muda. O que muda é o
   depois: quanto mais forte o sangue, mais Disciplinas o vampiro acumula
   e mais longe da linhagem ele as aprende. Um neonato da 13ª vive com as
   três do Abraço; um ancião da 8ª teve dois séculos, diablerias e trocas
   com a corte para juntar outras. Por isso a geração governa duas coisas:

     teto — quantas Disciplinas diferentes a ficha pode acumular;
     fora — o apetite por abrir Disciplina fora do clã, de 0,05 a 0,80.

   Esses números são calibragem nossa, não tabela de livro: a v5 não
   imprime limite de Disciplinas por geração, só o custo maior (× 7) para
   aprender fora do clã. */
function amplitudeDisciplinas(geracao) {
  const g = Math.max(4, Math.min(16, Number(geracao) || 13));
  const teto = g >= 12 ? 3 : g >= 10 ? 4 : g >= 8 ? 5 : g >= 6 ? 6 : 7;
  const fora = Math.max(0.05, Math.min(0.80, (13 - g) * 0.11 + 0.05));
  return { teto, fora };
}

const CONTEXTO = [
  /* ---------------- lei e ordem ---------------- */
  { rot:'polícia', chaves:['policial','policia','polícia','delegad','detetive de polícia','guarda civil','viatura','radiopatrulha','investigador de polícia'],
    hab:{armasfogo:3,intimidacao:2,investigacao:3,manha:2,conducao:1}, atr:{determinacao:1},
    vant:{'Contatos':2,'Influência':2}, def:{'Inimigo':1},
    cla:['Banu Haqim','Ventrue','Brujah'], pred:['Extorsionário','Vira-lata'], disc:['Dominação','Potência'], res:'Colérica' },
  { rot:'militar', chaves:['militar','soldado','fuzileiro','exército','exercito','sargento','combatente','mercenári','veterano de guerra','forças especiais','paraquedist'],
    hab:{armasfogo:3,briga:2,atletismo:2,sobrevivencia:2,lideranca:2}, atr:{vigor:1,forca:1},
    vant:{'Aliados':2,'Contatos':1}, def:{'Fobia de Luto':1},
    cla:['Ventrue','Brujah','Gangrel'], pred:['Vira-lata','Sandman'], disc:['Potência','Fortitude'], res:'Colérica' },
  { rot:'direito', chaves:['advogad','jurídic','juridic','juiz','juíza','promotor','defensor públic','tribunal','advocacia'],
    hab:{erudicao:3,politica:2,persuasao:2,labia:2,financas:1}, atr:{inteligencia:1,manipulacao:1},
    vant:{'Recursos':2,'Influência':2,'Contatos':1}, def:{'Segredo Sombrio':1},
    cla:['Ventrue','Banu Haqim','Lasombra'], pred:['Extorsionário','Sereia'], disc:['Dominação','Presença'], res:'Fleumática' },
  { rot:'segurança', chaves:['segurança','seguranca','leão de chácara','bouncer','guarda-costas','vigilante','porteiro de boate'],
    hab:{intimidacao:3,briga:2,prontidao:2,manha:1}, atr:{forca:1,vigor:1},
    vant:{'Contatos':1}, def:{},
    cla:['Brujah','Nosferatu'], pred:['Vira-lata','Extorsionário'], disc:['Potência','Fortitude'], res:'Colérica' },

  /* ---------------- saúde ---------------- */
  { rot:'medicina', chaves:['médic','medic','cirurgi','clínic','pronto-socorro','hospital','doutor','doutora','plantão'],
    hab:{medicina:3,ciencias:2,perspicacia:2,erudicao:1}, atr:{inteligencia:1,autocontrole:1},
    vant:{'Recursos':2,'Contatos':1,'Refúgio':1}, def:{'Fobia de Luto':1},
    cla:['Tremere','Salubri','Tzimisce'], pred:['Sandman','Consensual'], disc:['Auspícios','Fortitude'], res:'Fleumática' },
  { rot:'enfermagem', chaves:['enfermeir','paramédic','paramedic','samu','ambulância','cuidador'],
    hab:{medicina:3,perspicacia:2,atletismo:1,persuasao:1}, atr:{autocontrole:1,vigor:1},
    vant:{'Contatos':1,'Aliados':1}, def:{},
    cla:['Salubri','Tremere'], pred:['Consensual','Sandman'], disc:['Auspícios','Fortitude'], res:'Melancólica' },
  { rot:'psiquiatria', chaves:['psiquiatr','psicólog','psicolog','terapeuta','manicômi','saúde mental'],
    hab:{medicina:2,perspicacia:3,erudicao:2,persuasao:2}, atr:{inteligencia:1,autocontrole:1},
    vant:{'Contatos':2,'Recursos':1}, def:{'Segredo Sombrio':1},
    cla:['Malkavian','Tremere','Salubri'], pred:['Consensual','Sandman'], disc:['Auspícios','Dominação'], res:'Fleumática' },
  { rot:'legista', chaves:['legist','perit criminal','necrotéri','necroteri','iml','autópsia','autopsia','patologist'],
    hab:{medicina:3,ciencias:2,investigacao:2,ocultismo:1}, atr:{inteligencia:1,autocontrole:1},
    vant:{'Contatos':1,'Influência':1}, def:{},
    cla:['Hecata','Tremere'], pred:['Ladrão de Túmulos','Sacoleiro'], disc:['Oblívio','Auspícios'], res:'Melancólica' },
  { rot:'funerário', chaves:['funerári','funerari','coveiro','cemitéri','cemiteri','velóri','embalsamad'],
    hab:{medicina:2,ocultismo:2,erudicao:1,perspicacia:1,etiqueta:1}, atr:{autocontrole:1},
    vant:{'Refúgio':2,'Recursos':1}, def:{'Segredo Sombrio':1},
    cla:['Hecata','Nosferatu'], pred:['Ladrão de Túmulos','Sacoleiro'], disc:['Oblívio','Fortitude'], res:'Melancólica' },

  /* ---------------- conhecimento ---------------- */
  { rot:'academia', chaves:['professor','professora','acadêmic','academic','pesquisad','universi','doutorad','mestrad','historiad','bibliotecári'],
    hab:{erudicao:3,investigacao:2,ocultismo:1,politica:1}, atr:{inteligencia:1,determinacao:1},
    vant:{'Refúgio':2,'Contatos':1,'Influência':1}, def:{'Faminto por Saber':1},
    cla:['Tremere','Toreador','Ventrue'], pred:['Sandman','Consensual'], disc:['Auspícios','Dominação'], res:'Fleumática' },
  { rot:'ciência', chaves:['cientist','químic','quimic','físic','biólog','biolog','laboratóri','laboratori','farmacêutic'],
    hab:{ciencias:3,erudicao:2,tecnologia:2,medicina:1}, atr:{inteligencia:1},
    vant:{'Refúgio':2,'Recursos':1}, def:{'Faminto por Saber':1},
    cla:['Tremere','Tzimisce'], pred:['Sacoleiro','Sandman'], disc:['Feitiçaria de Sangue','Auspícios'], res:'Fleumática' },
  { rot:'arqueologia', chaves:['arqueólog','arqueolog','antropólog','escavaç','museu','curador'],
    hab:{erudicao:3,ocultismo:2,investigacao:2,sobrevivencia:1}, atr:{inteligencia:1,vigor:1},
    vant:{'Contatos':1,'Recursos':1,'Refúgio':1}, def:{'Inimigo':1},
    cla:['Tremere','Hecata','Ravnos'], pred:['Ladrão de Túmulos','Osíris'], disc:['Auspícios','Oblívio'], res:'Melancólica' },
  { rot:'ocultismo', chaves:['ocultist','esotéric','esoteric','bruxa','bruxo','vidente','tarô','taro','místic','mistic','espírita','espirita','médium','umbanda','terreiro'],
    hab:{ocultismo:3,erudicao:2,perspicacia:2,atuacao:1}, atr:{determinacao:1,manipulacao:1},
    vant:{'Contatos':2,'Fama':1}, def:{'Segredo Sombrio':1},
    cla:['Tremere','Hecata','Ministério'], pred:['Osíris','Ladrão de Túmulos'], disc:['Feitiçaria de Sangue','Oblívio'], res:'Melancólica' },
  { rot:'jornalismo', chaves:['jornalist','repórter','reporter','imprensa','podcast','documentar','blogueir','apurador'],
    hab:{investigacao:3,perspicacia:2,persuasao:2,tecnologia:1,erudicao:1}, atr:{raciocinio:1,carisma:1},
    vant:{'Contatos':3,'Fama':1}, def:{'Inimigo':1},
    cla:['Nosferatu','Malkavian','Toreador'], pred:['Sandman','Rainha da Cena'], disc:['Ofuscação','Auspícios'], res:'Colérica' },
  { rot:'tecnologia', chaves:['hacker','programad','tecnolog','desenvolvedor','engenheir de software','analista de sistemas','informátic','cibersegurança'],
    hab:{tecnologia:3,ciencias:2,investigacao:2,furto:1}, atr:{inteligencia:1,raciocinio:1},
    vant:{'Recursos':2,'Máscara':2,'Contatos':1}, def:{'Segredo Sombrio':1},
    cla:['Nosferatu','Malkavian','Tremere'], pred:['Sacoleiro','Sandman'], disc:['Ofuscação','Auspícios'], res:'Fleumática' },

  /* ---------------- fé ---------------- */
  { rot:'clero', chaves:['padre','pastor','sacerdot','teólog','teolog','freira','igreja','monge','capelão','seminarist','rabino','imã'],
    hab:{ocultismo:2,erudicao:2,persuasao:2,perspicacia:2,lideranca:2}, atr:{autocontrole:1,carisma:1},
    vant:{'Aliados':2,'Influência':2,'Refúgio':1}, def:{'Segredo Sombrio':1},
    cla:['Lasombra','Salubri','Ministério'], pred:['Consensual','Osíris'], disc:['Dominação','Presença'], res:'Fleumática', credo:['Devoto'] },
  { rot:'culto', chaves:['culto','seita','guru','líder espiritual','pregador','profeta','messi'],
    hab:{persuasao:3,lideranca:3,ocultismo:2,labia:2}, atr:{carisma:1,manipulacao:1},
    vant:{'Rebanho':3,'Aliados':2,'Fama':1}, def:{'Inimigo':1},
    cla:['Ministério','Lasombra','Malkavian'], pred:['Osíris','Açougueiro'], disc:['Presença','Dominação'], res:'Sanguínea' },

  /* ---------------- poder e dinheiro ---------------- */
  { rot:'negócios', chaves:['empresári','executiv','ceo','corporat','negóci','negoci','investid','banqueir','financ','acionist'],
    hab:{financas:3,politica:2,persuasao:2,etiqueta:2,lideranca:2}, atr:{manipulacao:1,autocontrole:1},
    vant:{'Recursos':3,'Influência':2,'Lacaios':1}, def:{'Inimigo':1},
    cla:['Ventrue','Lasombra','Hecata'], pred:['Extorsionário','Sereia'], disc:['Dominação','Presença'], res:'Fleumática', credo:['Empreendedor'] },
  { rot:'política', chaves:['polític','vereador','deputad','prefeit','senador','assessor','campanha eleitoral','diplomat','sindicalist'],
    hab:{politica:3,persuasao:3,etiqueta:2,lideranca:2,labia:1}, atr:{manipulacao:1,carisma:1},
    vant:{'Influência':3,'Contatos':2,'Fama':1}, def:{'Inimigo':2},
    cla:['Ventrue','Lasombra','Toreador'], pred:['Sereia','Extorsionário'], disc:['Dominação','Presença'], res:'Fleumática' },
  { rot:'aristocracia', chaves:['nobre','aristocrat','herdeir','alta sociedade','velho dinheiro','fidalg','barão','condessa'],
    hab:{etiqueta:3,politica:2,financas:2,persuasao:1,erudicao:1}, atr:{carisma:1,manipulacao:1},
    vant:{'Recursos':3,'Status':2,'Refúgio':2,'Lacaios':1}, def:{'Inimigo':1},
    cla:['Ventrue','Toreador','Tzimisce','Lasombra'], pred:['Sereia','Osíris'], disc:['Presença','Dominação'], res:'Sanguínea' },

  /* ---------------- margem ---------------- */
  { rot:'crime', chaves:['criminos','ladrão','ladra','bandid','traficante','contraband','gatuno','assalt','arrombad','golpist','estelionatári'],
    hab:{furto:3,manha:3,furtividade:2,labia:2,intimidacao:1}, atr:{destreza:1,raciocinio:1},
    vant:{'Contatos':2,'Máscara':2,'Recursos':1}, def:{'Inimigo':2,'Inimigo':1},
    cla:['Brujah','Nosferatu','Ravnos','Caitiff'], pred:['Vira-lata','Sacoleiro'], disc:['Ofuscação','Celeridade'], res:'Colérica' },
  { rot:'máfia', chaves:['máfi','mafi','crime organizado','facção','faccao','agiota','chefe do tráfico','capo'],
    hab:{intimidacao:3,manha:3,financas:2,lideranca:2,armasfogo:1}, atr:{manipulacao:1,forca:1},
    vant:{'Aliados':3,'Recursos':2,'Influência':2}, def:{'Inimigo':2},
    cla:['Lasombra','Hecata','Brujah'], pred:['Extorsionário','Vira-lata'], disc:['Dominação','Potência'], res:'Colérica' },
  { rot:'rua', chaves:['sem-teto','periferia','favela','gangue','quebrada','morro','cracolândia','albergue','catador','morador de rua'],
    hab:{manha:3,furtividade:2,briga:2,sobrevivencia:2}, atr:{raciocinio:1,vigor:1},
    vant:{'Contatos':2,'Aliados':1}, def:{'Miserável':1},
    cla:['Nosferatu','Brujah','Caitiff','Ravnos'], pred:['Vira-lata','Sacoleiro'], disc:['Ofuscação','Animalismo'], res:'Colérica' },
  { rot:'espionagem', chaves:['espião','espia','espionagem','agente secret','inteligência','detetive particular','investigador particular','infiltrad'],
    hab:{investigacao:3,furtividade:3,labia:2,perspicacia:2,tecnologia:1}, atr:{raciocinio:1,manipulacao:1},
    vant:{'Máscara':2,'Contatos':2,'Recursos':1}, def:{'Segredo Sombrio':2},
    cla:['Nosferatu','Banu Haqim','Malkavian'], pred:['Sandman','Extorsionário'], disc:['Ofuscação','Auspícios'], res:'Fleumática' },
  { rot:'prisão', chaves:['presidiári','ex-presidiári','cadeia','penitenciári','condicional','detento','agente penitenciári'],
    hab:{intimidacao:3,briga:2,manha:3,labia:1}, atr:{vigor:1,forca:1},
    vant:{'Contatos':2,'Aliados':1}, def:{'Inimigo':2,'Inimigo':1},
    cla:['Brujah','Caitiff','Nosferatu'], pred:['Vira-lata','Extorsionário'], disc:['Potência','Fortitude'], res:'Colérica' },

  /* ---------------- arte e cena ---------------- */
  { rot:'arte', chaves:['artista','pintor','pintora','escultor','ilustrador','designer','poeta','escritor'],
    hab:{atuacao:3,erudicao:1,persuasao:1,perspicacia:2}, atr:{carisma:1,destreza:1},
    vant:{'Fama':2,'Contatos':1,'Refúgio':1}, def:{'Vício':1},
    cla:['Toreador','Malkavian','Tzimisce'], pred:['Osíris','Sereia'], disc:['Auspícios','Presença'], res:'Melancólica' },
  { rot:'música', chaves:['músic','music','cantor','cantora','banda','guitarrist','baterist','produtor musical','rapper'],
    hab:{atuacao:3,persuasao:2,manha:2,etiqueta:1}, atr:{carisma:1,destreza:1},
    vant:{'Fama':2,'Rebanho':2,'Contatos':1}, def:{'Vício':1},
    cla:['Toreador','Brujah','Ministério'], pred:['Rainha da Cena','Osíris'], disc:['Presença','Celeridade'], res:'Sanguínea' },
  { rot:'palco', chaves:['ator','atriz','teatro','dançarin','bailarin','performer','circo','comediant'],
    hab:{atuacao:3,labia:2,atletismo:2,etiqueta:1}, atr:{carisma:1,destreza:1},
    vant:{'Fama':2,'Contatos':1}, def:{'Vício':1},
    cla:['Toreador','Ravnos','Malkavian'], pred:['Osíris','Sereia'], disc:['Presença','Ofuscação'], res:'Sanguínea' },
  { rot:'noite', chaves:['boate','balada','nightclub','casa noturna','vida noturna','rave','bartender','barman',' dj'],
    hab:{manha:3,etiqueta:2,persuasao:2,atuacao:1}, atr:{carisma:1,autocontrole:1},
    vant:{'Rebanho':3,'Fama':1,'Contatos':1}, def:{'Vício':1},
    cla:['Toreador','Ministério','Brujah'], pred:['Rainha da Cena','Sereia'], disc:['Presença','Celeridade'], res:'Sanguínea' },
  { rot:'moda', chaves:['moda','estilist','model','passarela','grife','maquiad'],
    hab:{etiqueta:3,atuacao:2,persuasao:2,manha:1}, atr:{carisma:1,manipulacao:1},
    vant:{'Fama':2,'Recursos':2,'Visual (Belo)':2}, def:{},
    cla:['Toreador','Ventrue'], pred:['Sereia','Rainha da Cena'], disc:['Presença','Auspícios'], res:'Sanguínea' },

  /* ---------------- mãos ---------------- */
  { rot:'ofícios', chaves:['mecânic','mecanic','engenheir','eletricist','marcenei','construç','oficina','serralhei','soldador','pedreiro'],
    hab:{oficios:3,tecnologia:2,conducao:2,atletismo:1}, atr:{destreza:1,vigor:1},
    vant:{'Refúgio':2,'Contatos':1}, def:{},
    cla:['Nosferatu','Gangrel','Brujah'], pred:['Sacoleiro','Vira-lata'], disc:['Potência','Fortitude'], res:'Fleumática' },
  { rot:'direção', chaves:['motorist','piloto','caminhone','taxi','táxi','uber','entregador','motoboy'],
    hab:{conducao:3,manha:2,prontidao:2,oficios:1}, atr:{raciocinio:1,destreza:1},
    vant:{'Contatos':2,'Recursos':1}, def:{},
    cla:['Ravnos','Gangrel','Brujah'], pred:['Vira-lata','Sacoleiro'], disc:['Celeridade','Animalismo'], res:'Colérica' },
  { rot:'comércio', chaves:['comerciant','lojist','vendedor','penhor','feirant','ferro-velho','brechó','antiquári'],
    hab:{financas:2,persuasao:2,manha:2,labia:2,etiqueta:1}, atr:{manipulacao:1},
    vant:{'Recursos':2,'Contatos':2,'Refúgio':1}, def:{},
    cla:['Hecata','Ventrue','Ravnos'], pred:['Extorsionário','Sacoleiro'], disc:['Dominação','Presença'], res:'Fleumática' },

  /* ---------------- corpo e natureza ---------------- */
  { rot:'atletismo', chaves:['atleta','boxe','ginast','nadador','corredor','maratonist'],
    hab:{atletismo:3,briga:3,sobrevivencia:1}, atr:{forca:1,destreza:1,vigor:1},
    vant:{'Fama':2,'Aliados':1}, def:{'Vício':1},
    cla:['Brujah','Gangrel'], pred:['Vira-lata','Rainha da Cena'], disc:['Potência','Celeridade'], res:'Colérica' },
  { rot:'animais', chaves:['adestrad','tratador','fauna','bicho de estimacao'],
    hab:{adestramento:3,medicina:2,ciencias:2,sobrevivencia:1}, atr:{autocontrole:1},
    vant:{'Refúgio':2,'Contatos':1}, def:{},
    cla:['Gangrel','Tzimisce','Nosferatu'], pred:['Fazendeiro','Consensual'], disc:['Animalismo','Proteanismo'], res:'Sanguínea' },
  { rot:'mato', chaves:['rastreador','mateir','guia de trilha','sobrevivenc','floresta','sertão','caçador de recompensas','pescador','guarda florestal'],
    hab:{sobrevivencia:3,adestramento:2,atletismo:2,armasfogo:2,furtividade:1}, atr:{vigor:1,raciocinio:1},
    vant:{'Refúgio':1,'Contatos':1}, def:{},
    cla:['Gangrel','Ravnos'], pred:['Fazendeiro','Vira-lata'], disc:['Proteanismo','Animalismo'], res:'Colérica' },
  { rot:'resgate', chaves:['bombeir','resgate','salva-vidas','defesa civil','socorrist','brigadist'],
    hab:{atletismo:3,medicina:2,conducao:2,lideranca:2}, atr:{vigor:1,determinacao:1},
    vant:{'Aliados':2,'Contatos':1}, def:{'Fobia de Luto':1},
    cla:['Gangrel','Salubri','Brujah'], pred:['Consensual','Vira-lata'], disc:['Fortitude','Potência'], res:'Colérica' },

  /* ---------------- casa e vínculo ---------------- */
  { rot:'família', chaves:['pai de família','mãe de família','dona de casa','professor primári','pedagog','creche','babá'],
    hab:{perspicacia:2,persuasao:2,etiqueta:1,medicina:1,adestramento:1}, atr:{autocontrole:1,carisma:1},
    vant:{'Rebanho':2,'Aliados':2,'Refúgio':1}, def:{'Segredo Sombrio':1},
    cla:['Toreador','Ventrue','Salubri'], pred:['Açougueiro','Consensual'], disc:['Presença','Dominação'], res:'Sanguínea' },
  { rot:'serviço social', chaves:['assistente social','ong','voluntári','abrigo','conselho tutelar','educador social'],
    hab:{perspicacia:3,persuasao:2,politica:1,medicina:1}, atr:{autocontrole:1,carisma:1},
    vant:{'Contatos':2,'Aliados':2,'Influência':1}, def:{},
    cla:['Salubri','Toreador','Brujah'], pred:['Consensual','Açougueiro'], disc:['Auspícios','Presença'], res:'Melancólica' },
/* ---------------- acrescentados ---------------- */
  { rot:'porto e mar', chaves:['marinheir','estivador','docas','porto','navio','capitão de navio','capitao de navio','cais','contêiner','conteiner','armador'],
    hab:{atletismo:2,sobrevivencia:2,briga:2,manha:2,conducao:1}, atr:{vigor:1,forca:1},
    vant:{'Contatos':2,'Recursos':1}, def:{'Segredo Sombrio':1},
    cla:['Gangrel','Brujah','Ravnos'], pred:['Vira-lata','Sacoleiro'], disc:['Potência','Fortitude'], res:'Fleumática' },
  { rot:'aviação', chaves:['pilot de avia','aeromoça','aeromoca','comissári de bordo','aeroporto','aviador','aviadora','companhia aérea'],
    hab:{conducao:3,tecnologia:2,etiqueta:2,prontidao:2}, atr:{raciocinio:1,autocontrole:1},
    vant:{'Recursos':2,'Máscara':1,'Contatos':1}, def:{},
    cla:['Ventrue','Toreador'], pred:['Sacoleiro','Sereia'], disc:['Auspícios','Presença'], res:'Fleumática' },
  { rot:'construção', chaves:['pedreir','mestre de obras','engenheir civil','arquitet','canteiro de obras','empreiteir'],
    hab:{oficios:3,atletismo:2,ciencias:1,lideranca:1}, atr:{forca:1,vigor:1},
    vant:{'Recursos':1,'Contatos':1,'Refúgio':1}, def:{},
    cla:['Nosferatu','Brujah','Tzimisce'], pred:['Vira-lata','Fazendeiro'], disc:['Potência','Fortitude'], res:'Fleumática' },
  { rot:'cozinha', chaves:['chef','cozinheir','gastronom','restaurante','confeiteir','padeir','açougue','acougue'],
    hab:{oficios:3,etiqueta:2,perspicacia:1,lideranca:1}, atr:{destreza:1,autocontrole:1},
    vant:{'Recursos':2,'Contatos':1,'Rebanho':1}, def:{},
    cla:['Toreador','Hecata','Ventrue'], pred:['Sacoleiro','Osíris'], disc:['Auspícios','Presença'], res:'Sanguínea' },
  { rot:'bar', chaves:['garçom','garcom','garçonete','sommelier','dono de bar','botequim'],
    hab:{persuasao:2,perspicacia:2,manha:2,etiqueta:1,briga:1}, atr:{carisma:1,raciocinio:1},
    vant:{'Rebanho':2,'Contatos':2}, def:{'Vício':1},
    cla:['Toreador','Brujah','Malkavian'], pred:['Sereia','Rainha da Cena'], disc:['Presença','Auspícios'], res:'Sanguínea' },
  { rot:'hotelaria', chaves:['hotel','recepcionist','concierge','pousada','hospedagem','camareir'],
    hab:{etiqueta:3,perspicacia:2,persuasao:2,furto:1}, atr:{autocontrole:1,carisma:1},
    vant:{'Contatos':2,'Máscara':2,'Refúgio':1}, def:{},
    cla:['Ventrue','Toreador','Nosferatu'], pred:['Sereia','Sandman'], disc:['Dominação','Ofuscação'], res:'Fleumática' },
  { rot:'finanças', chaves:['contador','contadora','investidor','investidora','corretora de valores','auditor','economista','fundo de investimento'],
    hab:{financas:3,erudicao:2,politica:2,labia:1}, atr:{inteligencia:1,autocontrole:1},
    vant:{'Recursos':3,'Influência':2,'Contatos':1}, def:{'Inimigo':1},
    cla:['Ventrue','Lasombra','Hecata'], pred:['Extorsionário','Osíris'], disc:['Dominação','Presença'], res:'Fleumática' },
  { rot:'imobiliário', chaves:['corretor de imóveis','corretora de imóveis','imobiliári','incorporador','despejo','síndico','sindico','loteament'],
    hab:{persuasao:2,financas:2,politica:2,labia:2}, atr:{manipulacao:1,carisma:1},
    vant:{'Recursos':2,'Refúgio':2,'Influência':1}, def:{'Desprezado':1},
    cla:['Ventrue','Lasombra'], pred:['Extorsionário','Sereia'], disc:['Dominação','Presença'], res:'Fleumática' },
  { rot:'literatura', chaves:['escritora','poetisa','romancista','editor de livros','tradutor','tradutora','livreir','sebo'],
    hab:{erudicao:3,atuacao:1,perspicacia:2,ocultismo:1,investigacao:1}, atr:{inteligencia:1,determinacao:1},
    vant:{'Linguística':2,'Fama':1,'Refúgio':1}, def:{'Miserável':1},
    cla:['Toreador','Malkavian','Tremere'], pred:['Sandman','Consensual'], disc:['Auspícios','Presença'], res:'Melancólica' },
  { rot:'fotografia', chaves:['fotograf','cinegrafist','câmera','operador de câmera','diretor de fotografia'],
    hab:{oficios:2,prontidao:3,furtividade:2,tecnologia:1,investigacao:1}, atr:{raciocinio:1,destreza:1},
    vant:{'Contatos':2,'Fama':1}, def:{'Segredo Sombrio':1},
    cla:['Toreador','Nosferatu','Malkavian'], pred:['Sandman','Rainha da Cena'], disc:['Auspícios','Ofuscação'], res:'Melancólica' },
  { rot:'luta', chaves:['boxead','lutador','lutadora','mma','muay thai','jiu-jitsu','jiu jitsu','ringue','octógono','octogono','wrestling','capoeirist'],
    hab:{briga:3,atletismo:3,intimidacao:2,medicina:1}, atr:{forca:1,vigor:1,destreza:1},
    vant:{'Fama':2,'Contatos':1}, def:{'Vício':1},
    cla:['Brujah','Gangrel','Banu Haqim'], pred:['Vira-lata','Sanguessuga'], disc:['Potência','Celeridade'], res:'Colérica' },
  { rot:'jogo', chaves:['apostador','apostadora','cassino','pôquer','poquer','bookmaker','jogo do bicho','bicheiro','crupiê','croupier','carteado'],
    hab:{labia:3,perspicacia:2,financas:2,furto:1}, atr:{manipulacao:1,raciocinio:1},
    vant:{'Recursos':2,'Contatos':2}, def:{'Vício':1,'Inimigo':1},
    cla:['Ravnos','Ministério','Malkavian'], pred:['Sereia','Extorsionário'], disc:['Ofuscação','Presença'], res:'Sanguínea' },
  { rot:'trabalho sexual', chaves:['acompanhante de luxo','garota de programa','garoto de programa','prostitut','cafetão','cafetina','michê','strip','pole dance'],
    hab:{labia:3,perspicacia:3,atuacao:2,manha:2}, atr:{carisma:1,autocontrole:1},
    vant:{'Rebanho':2,'Contatos':2,'Máscara':1}, def:{'Segredo Sombrio':1,'Desprezado':1},
    cla:['Toreador','Ministério','Ravnos'], pred:['Sereia','Osíris'], disc:['Presença','Ofuscação'], res:'Sanguínea' },
  { rot:'ativismo', chaves:['ativist','militante','greve','manifestaç','movimento social','defensor de direitos'],
    hab:{lideranca:3,politica:2,persuasao:2,manha:1,erudicao:1}, atr:{carisma:1,determinacao:1},
    vant:{'Aliados':3,'Contatos':2,'Influência':1}, def:{'Inimigo':2},
    cla:['Brujah','Gangrel','Salubri'], pred:['Consensual','Vira-lata'], disc:['Presença','Potência'], res:'Colérica' },
  { rot:'diplomacia', chaves:['diplomata','embaixad','cônsul','consulado','adido','chancelaria','corpo diplomático'],
    hab:{etiqueta:3,politica:3,persuasao:2,erudicao:1}, atr:{manipulacao:1,autocontrole:1},
    vant:{'Status':2,'Influência':2,'Linguística':2,'Máscara':1}, def:{'Segredo Sombrio':1},
    cla:['Ventrue','Toreador','Lasombra'], pred:['Osíris','Sereia'], disc:['Dominação','Presença'], res:'Fleumática' },
  { rot:'antiquário', chaves:['colecionador','colecionadora','leiloeir','restaurador de arte','marchand','galerista'],
    hab:{erudicao:2,oficios:2,financas:2,ocultismo:2,perspicacia:1}, atr:{inteligencia:1,manipulacao:1},
    vant:{'Recursos':2,'Refúgio':2,'Contatos':1}, def:{'Faminto por Saber':1},
    cla:['Toreador','Tremere','Hecata'], pred:['Osíris','Ladrão de Túmulos'], disc:['Auspícios','Dominação'], res:'Melancólica' },
  { rot:'veterinária', chaves:['veterinári','zoológic','zoologic','canil','adestrador','adestradora','abrigo de animais','pet shop'],
    hab:{adestramento:3,medicina:3,ciencias:1,sobrevivencia:1}, atr:{autocontrole:1,inteligencia:1},
    vant:{'Rebanho':2,'Refúgio':1}, def:{'Fazendeiro':1},
    cla:['Gangrel','Nosferatu','Tzimisce'], pred:['Fazendeiro','Sacoleiro'], disc:['Animalismo','Proteanismo'], res:'Melancólica' },
  { rot:'funcionalismo', chaves:['servidor públic','servidora públic','cartóri','cartori','burocrat','repartiç','prefeitura','autarquia municipal','fiscal municipal'],
    hab:{politica:3,erudicao:2,financas:1,labia:1,investigacao:1}, atr:{autocontrole:1,inteligencia:1},
    vant:{'Influência':3,'Contatos':2,'Máscara':1}, def:{'Desprezado':1},
    cla:['Ventrue','Nosferatu','Lasombra'], pred:['Sandman','Extorsionário'], disc:['Dominação','Ofuscação'], res:'Fleumática' },
];

/* Temperamento e situação: modulam sem definir profissão */
const CONTEXTO_TOM = [
  { rot:'violento', chaves:['violent','brutal','agressiv','raiva','brigão','briguent','sanguinári','explosiv','pavio curto'],
    atr:{forca:2,vigor:1}, hab:{briga:2,intimidacao:2}, cla:['Brujah','Gangrel'], disc:['Potência'], res:'Colérica' },
  { rot:'sedutor', chaves:['sedutor','sedutora','charmos','carismátic','encantador','galanteador','irresistível'],
    atr:{carisma:2,manipulacao:1}, hab:{persuasao:2,labia:2}, vant:{'Visual (Belo)':2},
    cla:['Toreador','Ministério'], pred:['Sereia'], disc:['Presença'], res:'Sanguínea' },
  { rot:'frio e metódico', chaves:['frio','fria','metódic','metodic','racional','cerebral','meticulos'],
    atr:{inteligencia:2,autocontrole:1}, hab:{investigacao:2,erudicao:1},
    cla:['Tremere','Ventrue','Lasombra'], disc:['Dominação'], res:'Fleumática' },
  { rot:'discreto', chaves:['discret','sorrateir','silencios','invisível','invisivel','reservad','na sombra'],
    atr:{destreza:2}, hab:{furtividade:3,labia:1},
    cla:['Nosferatu','Lasombra'], pred:['Sandman'], disc:['Ofuscação'], res:'Fleumática' },
  { rot:'liderança', chaves:['líder','lider','comandante','chefe','capitão','patrão','mandachuva'],
    atr:{carisma:1,determinacao:1}, hab:{lideranca:3,intimidacao:1},
    cla:['Ventrue','Lasombra'], disc:['Dominação','Presença'] },
  { rot:'rebelde', chaves:['rebelde','anarquist','revolucionári','punk','contestador'],
    atr:{determinacao:2}, hab:{lideranca:2,manha:2,politica:1},
    cla:['Brujah','Caitiff'], disc:['Potência','Celeridade'], res:'Colérica' },
  { rot:'atormentado', chaves:['atormentad','culpad','traumatizad','luto','arrependid','assombrad'],
    atr:{determinacao:1,autocontrole:1}, hab:{ocultismo:1,perspicacia:2}, def:{'Fobia de Luto':1,'Segredo Sombrio':1},
    cla:['Malkavian','Hecata','Salubri'], disc:['Auspícios','Oblívio'], res:'Melancólica', impeto:['Expiação'] },
  { rot:'paranoico', chaves:['paranoic','paranóic','desconfiad','conspiraç','obcecad'],
    atr:{raciocinio:2}, hab:{prontidao:2,investigacao:2,tecnologia:1}, def:{'Faminto por Saber':1},
    cla:['Malkavian','Nosferatu'], disc:['Auspícios','Ofuscação'] },
  { rot:'jovem', chaves:['jovem','garot','adolescent','estudante','universitári','recém-formad'],
    atr:{destreza:1,raciocinio:1}, hab:{tecnologia:2,atletismo:1,manha:1}, cla:['Caitiff','Brujah'] },
  { rot:'veterano', chaves:['velh','idos','ancião','anciã','experient','aposentad','veterano'],
    atr:{inteligencia:1,determinacao:1}, hab:{erudicao:2,politica:1}, cla:['Ventrue','Tremere','Hecata'] },
  { rot:'nômade', chaves:['nômade','nomade','viajant','andarilh','sem raiz','estrada afora'],
    atr:{vigor:1,raciocinio:1}, hab:{sobrevivencia:2,conducao:2,manha:1},
    cla:['Ravnos','Gangrel'], disc:['Ofuscação','Proteanismo'] },
  { rot:'rico', chaves:['ric','milionári','bilionári','abastad','endinheirad','fortuna','luxo'],
    atr:{}, hab:{financas:2,etiqueta:2}, vant:{'Recursos':3,'Refúgio':2,'Lacaios':1}, cla:['Ventrue','Toreador'] },
  { rot:'pobre', chaves:['pobre','miserável','miseravel','sem dinheiro','endividad','falid'],
    atr:{}, hab:{manha:2,sobrevivencia:1}, def:{'Miserável':1}, cla:['Caitiff','Nosferatu'] },
  { rot:'famoso', chaves:['famos','celebridade','influencer','estrela','midiátic'],
    atr:{carisma:2}, hab:{atuacao:2,etiqueta:1}, vant:{'Fama':3,'Rebanho':1},
    cla:['Toreador','Ventrue'], pred:['Osíris','Rainha da Cena'] },
  { rot:'devoto', chaves:['devot','fé inabalável','crente','piedos','temente a deus'],
    atr:{determinacao:2}, hab:{ocultismo:1,persuasao:1},
    cla:['Lasombra','Salubri','Ministério'], credo:['Devoto'] },
  { rot:'vingativo', chaves:['vingan','vingativ','ressentid','ódio','acerto de contas','quer justiça'],
    atr:{determinacao:2,forca:1}, hab:{intimidacao:2,investigacao:1},
    credo:['Marcial'], impeto:['Vingança'], res:'Colérica' },
  { rot:'curioso', chaves:['curios','inquiet','questionador','quer entender','investigativ'],
    atr:{raciocinio:2,inteligencia:1}, hab:{investigacao:2,erudicao:1,ocultismo:1},
    credo:['Inquisitivo'], impeto:['Curiosidade'] },
  { rot:'ganancioso', chaves:['ganancios','quer dinheiro','interesseir'],
    atr:{manipulacao:2}, hab:{financas:2,labia:2},
    impeto:['Ganância'], credo:['Empreendedor'], cla:['Ventrue','Hecata'] },
/* ---------------- acrescentados ---------------- */
  { rot:'gentil', chaves:['gentil','bondos','generos','empátic','empatic','acolhedor','acolhedora','doce','afetuos','compassiv'],
    hab:{perspicacia:2,persuasao:1,medicina:1}, atr:{carisma:1,autocontrole:1},
    vant:{'Aliados':2,'Rebanho':1}, def:{},
    cla:['Salubri','Toreador'], pred:['Consensual','Sereia'], disc:['Auspícios','Fortitude'], res:'Melancólica' },
  { rot:'arrogante', chaves:['arrogante','soberb','prepotente','pretensios','esnobe','presunços','metid'],
    hab:{etiqueta:2,intimidacao:1,lideranca:1}, atr:{carisma:1,determinacao:1},
    vant:{'Status':2,'Recursos':1}, def:{'Desprezado':1},
    cla:['Ventrue','Toreador','Lasombra'], pred:['Osíris','Extorsionário'], disc:['Dominação','Presença'], res:'Colérica' },
  { rot:'melancólico', chaves:['melancólic','melancolic','triste','saudos','deprimid','de luto','amargurad','taciturn'],
    hab:{atuacao:1,ocultismo:1,perspicacia:1}, atr:{determinacao:1},
    vant:{}, def:{'Fobia de Luto':1},
    cla:['Hecata','Malkavian','Toreador'], pred:['Ladrão de Túmulos','Sandman'], disc:['Oblívio','Auspícios'], res:'Melancólica' },
  { rot:'expansivo', chaves:['alegre','extrovertid','expansiv','brincalhão','brincalhao','animad','falante','espalhafatos'],
    hab:{atuacao:2,persuasao:2,etiqueta:1}, atr:{carisma:1,manipulacao:1},
    vant:{'Fama':2,'Contatos':2}, def:{},
    cla:['Toreador','Brujah','Ravnos'], pred:['Rainha da Cena','Sereia'], disc:['Presença','Celeridade'], res:'Sanguínea' },
  { rot:'medroso', chaves:['covarde','medros','tímid','timid','inseguro','insegura','assustad','retraíd','retraid','acanhad'],
    hab:{furtividade:2,prontidao:2}, atr:{raciocinio:1},
    vant:{'Máscara':1}, def:{'Fobia de Luto':1,'Fraco de Vontade':1},
    cla:['Nosferatu','Malkavian'], pred:['Sandman','Fazendeiro'], disc:['Ofuscação','Auspícios'], res:'Fleumática' },
  { rot:'calculista', chaves:['calculist','ambicios','oportunist','maquiavélic','maquiavelic','estrategist','frio nos negócios'],
    hab:{politica:2,labia:2,financas:2,perspicacia:1}, atr:{inteligencia:1,manipulacao:1},
    vant:{'Influência':2,'Recursos':2,'Status':1}, def:{'Inimigo':1},
    cla:['Ventrue','Lasombra','Banu Haqim'], pred:['Extorsionário','Osíris'], disc:['Dominação','Ofuscação'], res:'Fleumática' },
  { rot:'imprevisível', chaves:['caótic','caotic','imprevisível','imprevisivel','impulsiv','errátic','erratic','instável','instavel','temperament'],
    hab:{manha:2,briga:1,atuacao:1}, atr:{destreza:1,carisma:1},
    vant:{}, def:{'Aventureiro':1},
    cla:['Malkavian','Brujah','Ravnos'], pred:['Vira-lata','Sanguessuga'], disc:['Dominação','Celeridade'], res:'Colérica' },
  { rot:'metódico do corpo', chaves:['disciplinad','metódico no treino','rotina rígida','ascétic','ascetic','regrado','regrada'],
    hab:{atletismo:2,sobrevivencia:1,medicina:1}, atr:{vigor:1,determinacao:1},
    vant:{'Refúgio':1}, def:{},
    cla:['Ventrue','Banu Haqim','Salubri'], pred:['Sandman','Consensual'], disc:['Fortitude','Celeridade'], res:'Fleumática' },
];

/* ============================================================
   MOTOR DE CONTEXTO

   Quatro camadas, da mais fraca para a mais forte:

     1. arquétipo  — "enfermeira" empurra Medicina, Autocontrole, um
        Rebanho, uma Ressonância. É inferência: pesa pouco.
     2. tom        — "fria e metódica" empurra atributos e defeitos.
     3. menção direta — o texto nomeou um traço do sistema: "usa
        Dominação", "é Ventrue", "tem Contatos na polícia". Quem
        escreveu sabia o que queria; vale bem mais que inferência.
     4. marcador   — idade, geração, seita e região do nome. Não
        empurram peso: decidem um parâmetro da Forja.

   Negação e passado são lidos antes de somar: "sem contatos" não
   vira Contatos, e "ex-policial" vale metade.
   ============================================================ */

const semAcento = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Duas buscas diferentes, porque os dois lados guardam coisas diferentes.

   `acharRaiz` casa início de palavra: as chaves dos arquétipos são raízes
   ("legist", "médic", "delegad") e precisam pegar legista, legistas, médico,
   médica. `acharTermo` casa palavra inteira: o dicionário guarda nomes de
   traço do sistema, e "Fama" não pode casar dentro de "famigerado". */
function acharRaiz(t, termo) {
  let i = t.indexOf(termo);
  while (i >= 0) {
    if (!/[a-z0-9]/.test(i === 0 ? ' ' : t[i - 1])) return i;
    i = t.indexOf(termo, i + 1);
  }
  return -1;
}
function acharTermo(t, termo) {
  let i = t.indexOf(termo);
  while (i >= 0) {
    const antes = i === 0 ? ' ' : t[i - 1];
    const depois = i + termo.length >= t.length ? ' ' : t[i + termo.length];
    if (!/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(depois)) return i;
    i = t.indexOf(termo, i + 1);
  }
  return -1;
}

/* "sem contatos", "não usa armas de fogo", "nunca mata" — o traço
   citado é justamente o que o personagem NÃO tem. */
const NEGACOES = /(^|\s)(nao|sem|nenhum|nenhuma|nada de|jamais|nunca|odeia|detesta|incapaz de|avesso a)\s+(\S+\s+){0,2}$/;
/* "ex-policial", "antigo padre", "aposentado" — houve, mas passou. */
const PASSADO = /(^|\s)(ex|antigo|antiga|aposentad\w*|ja foi|foi|era)[\s-]+(\S+\s+){0,1}$/;

function pesoDoTrecho(t, pos) {
  const antes = t.slice(Math.max(0, pos - 40), pos);
  if (NEGACOES.test(antes)) return 0;
  if (PASSADO.test(antes)) return 0.5;
  return 1;
}

/* Dicionário de menções diretas: todo nome de traço do sistema, em
   português e em inglês. Montado uma vez e guardado. */
let _dicContexto = null;
function dicionarioContexto() {
  if (_dicContexto) return _dicContexto;
  const d = [];
  const add = (campo, chave, rot, termos, peso) => termos.filter(Boolean).forEach(x => {
    const termo = semAcento(x);
    if (termo.length >= 4) d.push({ campo: campo, chave: chave, rot: rot, termo: termo, peso: peso });
  });
  HABILIDADES.forEach(g => g.itens.forEach(i => add('hab', i[0], i[1], [i[1], i[2]], 4)));
  ATRIBUTOS.forEach(g => g.itens.forEach(i => add('atr', i[0], i[1], [i[1], i[2]], 3)));
  Object.keys(DISCIPLINAS).forEach(n => add('disc', n, n, [n, DISCIPLINAS[n].en], 5));
  Object.keys(CLAS).forEach(n => add('cla', n, n, [n], 6));
  Object.keys(PREDADORES).forEach(n => {
    if (n !== 'Personalizado') add('pred', n, n, [n, PREDADORES[n].en], 4);
  });
  Object.keys(RESSONANCIAS).forEach(n => add('res', n, n, [n], 4));
  VANTAGENS.forEach(v => { if (v.so !== 'carnical') add('vant', v.pt, v.pt, [v.pt, v.en], 4); });
  DEFEITOS.forEach(v => { if (v.so !== 'carnical') add('def', v.pt, v.pt, [v.pt, v.en], 4); });
  Object.keys(CREDOS).forEach(n => add('credo', n, n, [n, CREDOS[n].en], 5));
  Object.keys(IMPETOS).forEach(n => add('impeto', n, n, [n, IMPETOS[n].en], 5));
  // do mais longo para o mais curto: "Armas de Fogo" antes de "Armas Brancas"
  _dicContexto = d.sort((a, b) => b.termo.length - a.termo.length);
  return _dicContexto;
}

/* ---- marcadores: decidem um parâmetro, não empurram peso ---- */

const MARCAS_IDADE = [
  { mar:'matusalem', rot:'milenar', chaves:['matusalem','milenar','milenio','milenios','antediluvian','faraon','antes de cristo','imperio romano','roma antiga','babilonia','sumeria'] },
  { mar:'anciao', rot:'antigo', chaves:['anciao','seculos','medieval','renascenca','renascentista','vitorian','colonial','barroco','inquisicao','cruzadas','idade media','1500','1600','1700','muito antigo','muito antiga','antiquissim'] },
  { mar:'ancillae', rot:'de algumas décadas', chaves:['ancillae','decadas','guerra mundial','anos 20','anos 30','anos 40','belle epoque','oitocentos','1800','1900','1910','1920','1930','pos-guerra','pos guerra'] },
  { mar:'neofita', rot:'recente', chaves:['neofita','neofito','recem-abracado','recem abracado','recem-abracada','recem abracada','anos 80','anos 90','jovem membro'] },
  { mar:'crianca', rot:'novíssimo', chaves:['abracado esse ano','abracada esse ano','abracado mes passado','acabou de ser abracado','acabou de ser abracada','novato absoluto'] },
  { mar:'ralo', rot:'sangue-ralo', chaves:['sangue ralo','sangue-ralo','sangue fino','duskborn','sangue diluido'] }
];

const MARCAS_ORIGEM = {
  'Brasil': ['brasil','brasileiro','brasileira','carioca','paulista','mineiro','mineira','baiano','baiana','pernambucano','gaucho','amazonia'],
  'Portugal & Espanha': ['portugues','portuguesa','lisboa','espanhol','espanhola','madri','barcelona','catalao','andaluz','iberico','iberica'],
  'EUA & Reino Unido': ['americano','americana','estadunidense','nova york','chicago','texas','londres','ingles','inglesa','britanico','britanica','escoces','irlandes','gales'],
  'França': ['frances','francesa','paris','parisiense','marselha','normandia','provenca'],
  'Itália': ['italiano','italiana','napoles','milao','siciliano','siciliana','veneza','florenca','toscana'],
  'Alemanha & Áustria': ['alemao','alema','alemanha','berlim','munique','austriaco','austriaca','viena','prussiano','baviera'],
  'Leste Europeu': ['russo','russa','moscou','polones','polonesa','ucraniano','ucraniana','tcheco','hungaro','romeno','romena','servio','croata','balcanico','eslavo','transilvania'],
  'Nórdico': ['nordico','nordica','sueco','sueca','norueguesa','noruegues','dinamarques','finlandes','islandes','viking','escandinavo','escandinava'],
  'Oriente Médio & Norte da África': ['arabe','egipcio','egipcia','cairo','persa','iraniano','turco','turca','otomano','libanes','sirio','marroquino','tunisiano','beduino'],
  'África Ocidental': ['nigeriano','nigeriana','ganes','senegales','ioruba','yoruba','malines','lagos','africano ocidental'],
  'Ásia Oriental': ['japones','japonesa','toquio','chines','chinesa','pequim','xangai','coreano','coreana','seul','mongol','samurai','yakuza','triade'],
  'Sul da Ásia': ['indiano','indiana','india','hindu','bengali','paquistanes','nepales','tamil','punjabi','sikh']
};

const MARCAS_SEITA = {
  'Camarilla': ['camarilla','torre de marfim','principe da cidade','tradicionalista'],
  'Anarquista': ['anarquista','anarch','barao anarquista','movimento anarquista'],
  'Sabbat': ['sabbat','espada de caim'],
  'Ashirra': ['ashirra','muculmano','muculmana'],
  'Autarca': ['autarca','autarquico'],
  'Nenhuma / independente': ['sem seita','fora da politica dos membros']
};

/* ---- a montagem dos pesos ---- */

function pesosContexto(texto) {
  const t = ' ' + semAcento(texto) + ' ';
  const r = { hab:{}, atr:{}, vant:{}, def:{}, cla:{}, pred:{}, disc:{}, res:{},
              credo:{}, impeto:{},
              mar:null, geracao:null, origem:null, seita:null,
              veto:{}, fixo:{}, casou:[], diretos:[], negados:[], marcas:[], texto:String(texto || "") };
  if (!String(texto || '').trim()) return r;

  const somar = (alvo, fonte, mult) => {
    if (fonte) for (const k in fonte) alvo[k] = (alvo[k] || 0) + fonte[k] * mult;
  };
  // numa lista, o primeiro nome pesa mais que o último
  const contar = (alvo, lista, mult) => {
    if (lista) lista.forEach((n, i) => alvo[n] = (alvo[n] || 0) + (lista.length - i) * mult);
  };

  // 1 e 2: arquétipos e tom. Quanto mais palavras da entrada aparecem
  // no texto, mais forte ela puxa — até um limite.
  CONTEXTO.concat(CONTEXTO_TOM).forEach(e => {
    let quantas = 0, atenua = 1;
    e.chaves.forEach(c => {
      const pos = acharRaiz(t, semAcento(c));
      if (pos < 0) return;
      const p = pesoDoTrecho(t, pos);
      if (!p) return;
      quantas++; atenua = Math.min(atenua, p);
    });
    if (!quantas) return;
    const mult = Math.min(1.75, 1 + (quantas - 1) * 0.25) * atenua;
    somar(r.hab, e.hab, mult); somar(r.atr, e.atr, mult);
    somar(r.vant, e.vant, mult); somar(r.def, e.def, mult);
    contar(r.cla, e.cla, mult); contar(r.pred, e.pred, mult); contar(r.disc, e.disc, mult);
    contar(r.credo, e.credo, mult); contar(r.impeto, e.impeto, mult);
    if (e.res) r.res[e.res] = (r.res[e.res] || 0) + mult;
    if (e.mar && !r.mar) r.mar = e.mar;
    r.casou.push(e.rot + (atenua < 1 ? ' (no passado)' : '') + (quantas > 1 ? ' ×' + quantas : ''));
  });

  // 3: menção direta ao nome de um traço. Pesa mais que inferência.
  const jaVisto = {};
  dicionarioContexto().forEach(d => {
    const chave = d.campo + '/' + d.chave;
    if (jaVisto[chave]) return;
    const pos = acharTermo(t, d.termo);
    if (pos < 0) return;
    jaVisto[chave] = 1;
    const p = pesoDoTrecho(t, pos);
    if (!p) {
      // "sem contatos" não é só ausência de peso: é veto. Vale contra
      // qualquer arquétipo que tenha empurrado o mesmo traço.
      (r.veto[d.campo] = r.veto[d.campo] || {})[d.chave] = true;
      r.negados.push(d.rot);
      return;
    }
    r[d.campo][d.chave] = (r[d.campo][d.chave] || 0) + d.peso * p;
    r.diretos.push(d.rot);
  });

  // o veto sobrepõe tudo que veio antes
  for (const campo in r.veto) {
    for (const chave in r.veto[campo]) r[campo][chave] = -50;
  }

  // Nomear um clã, um Tipo de Predador ou uma Ressonância não é sugerir: é
  // dizer. Peso não bastava — "Abraçada por uma Nosferatu" perdia para a soma
  // de "hospital" e "enfermeira", que puxam Tremere por três arquétipos.
  // Quando o texto cita exatamente um, ele fica decidido.
  ['cla', 'pred', 'res', 'credo', 'impeto'].forEach(campo => {
    const citados = Object.keys(r[campo]).filter(k => r[campo][k] > 0
      && dicionarioContexto().some(d => d.campo === campo && d.chave === k && acharTermo(t, d.termo) >= 0));
    if (citados.length === 1) r.fixo[campo] = citados[0];
  });

  // 4: marcadores
  for (const m of MARCAS_IDADE) {
    if (m.chaves.some(c => acharRaiz(t, semAcento(c)) >= 0)) {
      r.mar = m.mar; r.marcas.push('idade: ' + m.rot); break;
    }
  }
  const g = /(\d{1,2})\s*(?:a|ª)?\s*geracao/.exec(t) || /geracao\s*(\d{1,2})/.exec(t);
  if (g) {
    const n = Number(g[1]);
    if (n >= 4 && n <= 16) { r.geracao = n; r.marcas.push(n + 'ª geração'); }
  }
  for (const reg in MARCAS_ORIGEM) {
    if (MARCAS_ORIGEM[reg].some(c => acharRaiz(t, semAcento(c)) >= 0)) {
      r.origem = reg; r.marcas.push('nome: ' + reg); break;
    }
  }
  for (const s in MARCAS_SEITA) {
    if (MARCAS_SEITA[s].some(c => acharRaiz(t, semAcento(c)) >= 0)) {
      r.seita = s; r.marcas.push('seita: ' + s); break;
    }
  }
  return r;
}

/* Escolhe o item mais sugerido pelo contexto, entre os permitidos.
   Devolve null quando o contexto não disse nada de útil. */
function escolherPorContexto(tabela, permitidos) {
  const cands = (permitidos && permitidos.length ? permitidos : Object.keys(tabela))
    .filter(n => tabela[n] > 0);
  if (!cands.length) return null;
  return cands.map(n => ({ n: n, p: tabela[n] + Math.random() * 0.8 }))
              .sort((a, b) => b.p - a.p)[0].n;
}

/* Ordena uma lista pelo peso do contexto, com desempate aleatório. */
function ordenarLista(lista, tabela) {
  return lista.map(n => ({ n: n, p: (tabela[n] || 0) + Math.random() * 1.2 }))
              .sort((a, b) => b.p - a.p).map(x => x.n);
}

/* Ordena as chaves de um conjunto de grupos: peso do contexto,
   mais bônus do foco, mais um empurrãozinho aleatório para
   nunca sair igual duas vezes. */
function ordenarPorPeso(grupos, pesos, foco, concentrar) {
  // `concentrar` é o perfil da ficha: numa especialista o foco manda muito e
  // o acaso quase não entra; numa faz-tudo é o contrário. É isso que faz os
  // Atributos e as Habilidades puxarem para o mesmo lado.
  const c = concentrar || 1;
  return grupos
    .flatMap(g => g.itens.map(i => ({ k: i[0], cat: g.cat })))
    .map(x => ({
      k: x.k,
      p: (pesos[x.k] || 0) * 1.2 * c
       + (foco && x.cat === foco ? 2.2 * c : 0)
       + Math.random() * (1.6 / c)
    }))
    .sort((a, b) => b.p - a.p)
    .map(x => x.k);
}

/* ============================================================
   O CONTEXTO OTIMIZANDO A FICHA

   Tudo aqui existe para o mesmo fim: sair do sorteio com menos
   campo por preencher. Em vez de "a definir" em toda especialização
   e de uma distribuição de perícias tirada no dado, o texto de
   contexto decide — e só sobra ajuste fino.
   ============================================================ */

/* Especializações plausíveis por perícia. Serve de base quando o
   contexto não tem uma sugestão melhor: qualquer uma destas é mais
   útil que "a definir". */
const ESPECIALIDADES = {
  atletismo:    ['Corrida','Escalada','Natação','Salto','Parkour','Arremesso'],
  briga:        ['Agarrão','Boxe','Chutes','Luta suja','Artes marciais','Mordida'],
  oficios:      ['Marcenaria','Serralheria','Eletrônica','Costura','Restauro','Falsificação'],
  conducao:     ['Perseguição','Motocicleta','Carga pesada','Direção evasiva','Off-road','Barco'],
  armasfogo:    ['Pistola','Espingarda','Fuzil','Tiro a distância','Armas automáticas','Manutenção'],
  furto:        ['Arrombamento','Punga','Cofres','Segurança eletrônica','Furto de veículo','Contrabando'],
  armasbrancas: ['Faca','Espada','Improvisadas','Porrete','Machado','Desarme'],
  furtividade:  ['Esconderijo','Seguir alguém','Multidões','Invasão','Sombras','Silêncio'],
  sobrevivencia:['Mata','Cidade','Rastreamento','Abrigo','Caça','Orientação'],
  adestramento: ['Cães','Cavalos','Aves','Roedores','Predadores','Acalmar'],
  etiqueta:     ['Alta sociedade','Corte dos Membros','Negócios','Protocolo religioso','Submundo','Academia'],
  perspicacia:  ['Detectar mentira','Motivações','Interrogatório','Empatia','Emoções','Primeira impressão'],
  intimidacao:  ['Ameaça velada','Violência','Interrogatório','Presença física','Chantagem','Autoridade'],
  lideranca:    ['Comando','Oratória','Motivação','Disciplina','Coordenação','Improviso'],
  atuacao:      ['Teatro','Música','Dança','Canto','Improviso','Comédia'],
  persuasao:    ['Sedução','Barganha','Argumentação','Conforto','Venda','Diplomacia'],
  manha:        ['Mercado negro','Boatos','Gangues','Drogas','Rua','Achar quem se esconde','Contrabando'],
  labia:        ['Disfarce','Meias-verdades','Golpes','Mentir sob pressão','Fachada','Distração'],
  erudicao:     ['História','Literatura','Pesquisa','Direito','Teologia','Arquivos'],
  prontidao:    ['Emboscadas','Sobrenatural','Detalhes','Vigilância','Instinto','Ambiente'],
  financas:     ['Lavagem','Contabilidade','Mercado','Avaliação','Auditoria','Cobrança'],
  investigacao: ['Cena do crime','Pesquisa documental','Pessoas desaparecidas','Vigilância','Entrevistas','Pistas','Interrogatório'],
  medicina:     ['Primeiros socorros','Cirurgia','Farmacologia','Trauma','Autópsias','Psiquiatria'],
  ocultismo:    ['Rituais','Vampiros','Feitiçaria de Sangue','Mortos','Folclore','Grimórios'],
  politica:     ['Municipal','Camarilla','Anarquistas','Burocracia','Eleições','Corrupção'],
  ciencias:     ['Química','Biologia','Física','Genética','Forense','Toxicologia'],
  tecnologia:   ['Invasão','Redes','Vigilância','Hardware','Dados','Criptografia']
};

/* Especializações que cada arquétipo sugere. Vence a lista genérica.
   A chave é o `rot` da entrada de CONTEXTO ou CONTEXTO_TOM. */
const ESP_ARQUETIPO = {
  'polícia':        { armasfogo:'Pistola', investigacao:'Interrogatório', intimidacao:'Autoridade', manha:'Achar quem se esconde' },
  'militar':        { armasfogo:'Fuzil', atletismo:'Corrida', lideranca:'Comando', sobrevivencia:'Mata' },
  'direito':        { erudicao:'Direito', politica:'Burocracia', persuasao:'Argumentação', labia:'Meias-verdades' },
  'segurança':      { intimidacao:'Presença física', briga:'Luta suja', prontidao:'Vigilância' },
  'medicina':       { medicina:'Cirurgia', ciencias:'Biologia', perspicacia:'Primeira impressão' },
  'enfermagem':     { medicina:'Trauma', perspicacia:'Empatia', atletismo:'Corrida' },
  'psiquiatria':    { medicina:'Psiquiatria', perspicacia:'Motivações', erudicao:'Pesquisa' },
  'legista':        { medicina:'Autópsias', investigacao:'Cena do crime', ciencias:'Forense', ocultismo:'Mortos' },
  'funerário':      { medicina:'Autópsias', ocultismo:'Mortos', etiqueta:'Protocolo religioso' },
  'academia':       { erudicao:'Pesquisa', investigacao:'Pesquisa documental', politica:'Burocracia' },
  'ciência':        { ciencias:'Química', erudicao:'Pesquisa', tecnologia:'Dados' },
  'arqueologia':    { erudicao:'História', ocultismo:'Folclore', investigacao:'Pistas', sobrevivencia:'Orientação' },
  'ocultismo':      { ocultismo:'Rituais', erudicao:'Teologia', perspicacia:'Motivações' },
  'jornalismo':     { investigacao:'Entrevistas', perspicacia:'Detectar mentira', persuasao:'Argumentação' },
  'tecnologia':     { tecnologia:'Invasão', ciencias:'Física', investigacao:'Pesquisa documental', furto:'Segurança eletrônica' },
  'clero':          { erudicao:'Teologia', etiqueta:'Protocolo religioso', persuasao:'Conforto', ocultismo:'Rituais' },
  'culto':          { ocultismo:'Rituais', lideranca:'Oratória', persuasao:'Argumentação' },
  'negócios':       { financas:'Mercado', etiqueta:'Negócios', persuasao:'Barganha', politica:'Corrupção' },
  'política':       { politica:'Eleições', persuasao:'Diplomacia', lideranca:'Oratória', etiqueta:'Alta sociedade' },
  'aristocracia':   { etiqueta:'Alta sociedade', politica:'Corrupção', financas:'Avaliação' },
  'crime':          { manha:'Mercado negro', furto:'Arrombamento', intimidacao:'Chantagem', labia:'Golpes' },
  'máfia':          { intimidacao:'Ameaça velada', financas:'Lavagem', manha:'Gangues', armasfogo:'Pistola' },
  'rua':            { manha:'Rua', furtividade:'Multidões', sobrevivencia:'Cidade', furto:'Punga' },
  'espionagem':     { furtividade:'Seguir alguém', labia:'Disfarce', tecnologia:'Vigilância', investigacao:'Vigilância' },
  'prisão':         { intimidacao:'Violência', briga:'Luta suja', manha:'Gangues', prontidao:'Emboscadas' },
  'arte':           { atuacao:'Teatro', oficios:'Restauro', perspicacia:'Emoções' },
  'música':         { atuacao:'Música', persuasao:'Sedução', etiqueta:'Submundo' },
  'palco':          { atuacao:'Teatro', persuasao:'Sedução', lideranca:'Oratória' },
  'noite':          { manha:'Boatos', persuasao:'Sedução', perspicacia:'Primeira impressão' },
  'moda':           { etiqueta:'Alta sociedade', atuacao:'Improviso', persuasao:'Venda' },
  'ofícios':        { oficios:'Marcenaria', ciencias:'Física', financas:'Avaliação' },
  'direção':        { conducao:'Perseguição', manha:'Rua', oficios:'Eletrônica' },
  'comércio':       { financas:'Avaliação', persuasao:'Venda', manha:'Mercado negro' },
  'atletismo':      { atletismo:'Corrida', briga:'Artes marciais', medicina:'Primeiros socorros' },
  'animais':        { adestramento:'Cães', medicina:'Primeiros socorros', sobrevivencia:'Caça' },
  'mato':           { sobrevivencia:'Mata', adestramento:'Predadores', atletismo:'Escalada' },
  'resgate':        { medicina:'Trauma', atletismo:'Escalada', conducao:'Direção evasiva' },
  'família':        { perspicacia:'Empatia', persuasao:'Conforto', etiqueta:'Negócios' },
  'serviço social': { perspicacia:'Empatia', persuasao:'Conforto', politica:'Burocracia' },
  'porto e mar':    { sobrevivencia:'Orientação', atletismo:'Natação', manha:'Contrabando', conducao:'Barco' },
  'aviação':        { conducao:'Off-road', tecnologia:'Hardware', etiqueta:'Protocolo religioso' },
  'construção':     { oficios:'Marcenaria', atletismo:'Escalada', ciencias:'Física' },
  'cozinha':        { oficios:'Costura', etiqueta:'Negócios', perspicacia:'Primeira impressão' },
  'bar':            { persuasao:'Sedução', perspicacia:'Detectar mentira', manha:'Boatos' },
  'hotelaria':      { etiqueta:'Protocolo religioso', perspicacia:'Primeira impressão', furto:'Cofres' },
  'finanças':       { financas:'Auditoria', erudicao:'Pesquisa', politica:'Corrupção' },
  'imobiliário':    { persuasao:'Barganha', financas:'Avaliação', politica:'Municipal', labia:'Meias-verdades' },
  'literatura':     { erudicao:'Literatura', investigacao:'Pesquisa documental', atuacao:'Improviso' },
  'fotografia':     { prontidao:'Detalhes', oficios:'Eletrônica', furtividade:'Seguir alguém' },
  'luta':           { briga:'Boxe', atletismo:'Corrida', intimidacao:'Presença física' },
  'jogo':           { labia:'Golpes', perspicacia:'Detectar mentira', financas:'Mercado' },
  'trabalho sexual':{ labia:'Fachada', perspicacia:'Motivações', atuacao:'Improviso' },
  'ativismo':       { lideranca:'Oratória', politica:'Municipal', persuasao:'Argumentação' },
  'diplomacia':     { etiqueta:'Protocolo religioso', politica:'Burocracia', persuasao:'Diplomacia' },
  'antiquário':     { financas:'Avaliação', erudicao:'História', ocultismo:'Grimórios' },
  'veterinária':    { adestramento:'Acalmar', medicina:'Cirurgia', ciencias:'Biologia' },
  'funcionalismo':  { politica:'Burocracia', erudicao:'Arquivos', investigacao:'Pesquisa documental' },
  /* tom */
  'violento':       { briga:'Luta suja', intimidacao:'Violência' },
  'sedutor':        { persuasao:'Sedução', atuacao:'Improviso' },
  'frio e metódico':{ perspicacia:'Detectar mentira', investigacao:'Pistas' },
  'discreto':       { furtividade:'Sombras', labia:'Fachada' },
  'liderança':      { lideranca:'Comando', etiqueta:'Corte dos Membros' },
  'rebelde':        { manha:'Rua', intimidacao:'Autoridade' },
  'paranoico':      { prontidao:'Vigilância', tecnologia:'Criptografia' },
  'nômade':         { sobrevivencia:'Orientação', conducao:'Off-road' },
  'calculista':     { politica:'Corrupção', financas:'Mercado' },
  'devoto':         { erudicao:'Teologia', ocultismo:'Rituais' }
};

/* A especialização que faz mais sentido para esta perícia, dado o
   que o contexto reconheceu. */
function especialidadePara(chaveHab, pesos) {
  const rots = (pesos && pesos.casou) ? pesos.casou.map(r => r.replace(/ \(no passado\)| ×\d+/g, '')) : [];
  for (const rot of rots) {
    const sug = ESP_ARQUETIPO[rot];
    if (sug && sug[chaveHab]) return sug[chaveHab];
  }
  const lista = ESPECIALIDADES[chaveHab];
  return lista ? rnd(lista) : 'a definir';
}

/* A distribuição de Habilidades que combina com o contexto.

   Não é gosto: é a forma dos pesos. Um texto que concentra em poucas
   perícias pede Especialista; um que espalha pede Pau para toda obra.
   Sem contexto, sorteia como antes. */
function distribuicaoPorContexto(pesos) {
  const vals = Object.values(pesos.hab || {}).filter(v => v > 0).sort((a, b) => b - a);
  // menos de três perícias apontadas não é sinal, é ruído
  if (vals.length < 3) return rnd(Object.keys(DISTRIB_HABILIDADES));
  const soma = vals.reduce((t, v) => t + v, 0);
  const topo3 = vals.slice(0, 3).reduce((t, v) => t + v, 0) / soma;
  if (vals.length >= 9 && topo3 < 0.55) return 'faztudo';
  if (topo3 > 0.72 || vals.length <= 4) return 'especialista';
  return 'balanceado';
}

/* O foco de Atributos que combina com o contexto: a categoria que o
   texto mais empurrou, desde que empurre mesmo. */
function focoPorContexto(pesos) {
  const soma = { 'Físicos':0, 'Sociais':0, 'Mentais':0 };
  ATRIBUTOS.forEach(g => g.itens.forEach(i => { soma[g.cat] += (pesos.atr[i[0]] || 0); }));
  const ord = Object.entries(soma).sort((a, b) => b[1] - a[1]);
  const total = ord.reduce((t, x) => t + x[1], 0);
  if (!total || ord[0][1] < 1.5 || ord[0][1] / total < 0.5) return '';
  return ord[0][0];
}

/* Escolhe a semente (ambição, desejo, convicção) que mais conversa
   com o texto do contexto. Empate vai no dado. */
function semelhanteAoContexto(lista, texto) {
  const t = semAcento(texto || '');
  if (!t.trim()) return rnd(lista);
  const palavras = t.split(/[^a-z0-9]+/).filter(p => p.length >= 5);
  if (!palavras.length) return rnd(lista);
  const notas = lista.map(s => {
    const a = semAcento(s);
    let n = 0;
    palavras.forEach(p => { if (a.includes(p)) n += 2; });
    return { s, n: n + Math.random() * 1.8 };
  }).sort((a, b) => b.n - a.n);
  return notas[0].s;
}

/* Um Loresheet que combine com o clã e com o contexto. Devolve null
   quando nada se encaixa — Loresheet não é obrigatório. */
function escolherLoresheet(cla, pesos, livros) {
  const t = ' ' + semAcento((pesos && pesos.texto) || '') + ' ';
  const cands = LORESHEETS.filter(ls =>
    loresheetPermitido(ls, cla) && (!livros || livros.includes(ls.f)));
  if (!cands.length) return null;

  const comNota = cands.map(ls => {
    let n = 0;
    (ls.chaves || []).forEach(c => { if (acharRaiz(t, semAcento(c)) >= 0) n += 6; });
    // Loresheet preso a um clã é mais característico de quem é daquele clã
    if (ls.cla && ls.cla.length <= 2) n += 1.2;
    return { ls, n: n + Math.random() * 1.1 };
  }).sort((a, b) => b.n - a.n);

  // sem nada no texto, o Loresheet é exceção, não regra
  const citado = comNota[0].n >= 6;
  if (!citado && Math.random() > 0.35) return null;
  return comNota[0].ls;
}

/* ============================================================
   MOTIVOS E PILARES A PARTIR DO CONTEXTO

   Tentamos um modelo local nisto e ele não pagou: escrevia bem de vez
   em quando e inventava gente que a história não tinha no resto das
   vezes, custando dez segundos por ficha. O que ele fazia de útil era
   uma coisa só — tirar o Pilar do texto que você escreveu — e isso é
   reconhecimento de padrão, não interpretação.

   Então: Pilar sai do seu texto por varredura de parentesco e de
   convívio; Ambição, Desejo e Convicção saem de listas por arquétipo,
   com as genéricas de reserva. Determinístico, instantâneo e testável.
   ============================================================ */

/* Gente que serve de Pilar. Parentes primeiro: são os laços que a v5
   trata como âncora de Humanidade. */
const LACOS_PARENTESCO = [
  'irmão','irmã','filho','filha','mãe','pai','esposa','marido','mulher','companheiro',
  'companheira','cunhada','cunhado','sobrinha','sobrinho','neto','neta','avó','avô',
  'tia','tio','primo','prima','padrinho','madrinha','afilhado','afilhada','sogra','sogro',
  'enteado','enteada','namorada','namorado','noiva','noivo','bisneta','bisneto','gêmeo','gêmea'
];
const LACOS_CONVIVIO = [
  'padre','pastor','rabino','professora','professor','médico','médica','vizinha','vizinho',
  'sócio','sócia','parceiro','parceira','amigo','amiga','chefe','aluno','aluna','paciente',
  'cliente','advogada','advogado','enfermeira','enfermeiro','zelador','zeladora','motorista',
  'secretária','treinador','treinadora','sargento','capataz','gerente','viúva','viúvo',
  'testemunha','informante','senhoria','caseiro','babá','orientador','orientadora'
];

/* Palavras que dizem que essa pessoa já morreu. Pilar é âncora na vida:
   um irmão morto não serve. */
const MARCAS_DE_MORTE = /\b(morreu|morto|morta|morrera|falecid\w*|assassinad\w*|enterrad\w*|t[úu]mulo|velório|defunt\w*|cad[áa]ver)\b/i;

/* A morte tem de ser DAQUELA pessoa. Olhar sessenta caracteres em volta
   descartava a cunhada por causa de um "morreu" que falava de outra gente,
   três palavras depois da vírgula. Então a janela é a oração: do trecho
   até a próxima quebra, mais um pedaço curto antes para pegar
   "o falecido irmão". */
const QUEBRAS_DE_ORACAO = /[,;.!?]| desde que | porque | quando /;
function morreuNaMesmaOracao(t, ini, fim) {
  const antes = t.slice(Math.max(0, ini - 25), ini);
  const depois = t.slice(fim);
  const corte = depois.search(QUEBRAS_DE_ORACAO);
  return MARCAS_DE_MORTE.test(antes + ' ' + (corte < 0 ? depois : depois.slice(0, corte)));
}

/* Varre o texto atrás de gente que possa ancorar uma Convicção.
   Devolve os trechos como você escreveu: "a cunhada", "a filha que
   virou advogada trabalhista". */
function pilaresDoTexto(texto) {
  const t = String(texto || '');
  if (!t.trim()) return [];
  const achados = [];
  const tomados = [];   // faixas já usadas, para "advogada" não sair de dentro
                        // de "a filha que virou advogada trabalhista"

  [LACOS_PARENTESCO, LACOS_CONVIVIO].forEach((lista, camada) => {
    lista.forEach(termo => {
      // O artigo ou possessivo é obrigatório. Sem ele, "foi enfermeira de UTI"
      // entrava como Pilar — e essa enfermeira é a própria personagem.
      const re = new RegExp(
        '\\b(?:a|o|as|os|minha|meu|minhas|meus|sua|seu|uma|um|da|do|as minhas|os meus)\\s+'
        + termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        + '\\b(?:\\s+que\\s+[^,.;]{3,40})?', 'gi');
      let m;
      while ((m = re.exec(t)) !== null) {
        const ini = m.index, fim = m.index + m[0].length;
        if (tomados.some(f => ini < f[1] && fim > f[0])) continue;
        if (morreuNaMesmaOracao(t, ini, fim)) continue;
        tomados.push([ini, fim]);
        const trecho = m[0].trim().replace(/\s+/g, ' ')
          .replace(/^da\s+/i, 'a ').replace(/^do\s+/i, 'o ')   // "da mãe" -> "a mãe"
          .replace(/^(as minhas|os meus)\s+/i, m2 => m2.toLowerCase().includes('minhas') ? 'as ' : 'os ');
        achados.push({ texto: trecho, peso: camada === 0 ? 2 : 1, ini });
        break;   // um trecho por termo já basta
      }
    });
  });
  // parentesco antes de convívio; entre iguais, quem aparece primeiro no texto
  return achados.sort((a, b) => b.peso - a.peso || a.ini - b.ini).map(x => x.texto);
}

/* Ambições, desejos e convicções por arquétipo. A chave é o `rot` da
   entrada de CONTEXTO ou CONTEXTO_TOM. `{pilar}` é trocado pela pessoa
   que a varredura achou no seu texto; sem ninguém, a frase é descartada
   e o sorteio pega outra. */
const MOTIVOS_ARQUETIPO = {
  'polícia':        { amb:['Fechar o caso que me tiraram das mãos','Descobrir quem me entregou'], des:['Um nome que eu ainda não tenha'] },
  'militar':        { amb:['Terminar a missão que ninguém assumiu','Reunir os que voltaram comigo'], des:['Uma noite em que ninguém precise de mim'] },
  'direito':        { amb:['Ganhar a causa que me custou a vida mortal','Virar a lei a meu favor de uma vez'], des:['Uma assinatura que eu não consigo arrancar'] },
  'segurança':      { amb:['Deixar de ser o que apanha primeiro'], des:['Uma porta que ninguém atravesse hoje'] },
  'medicina':       { amb:['Entender o que o sangue faz comigo','Curar o que me tornaram'], des:['Um corpo que responda ao que eu sei fazer'] },
  'enfermagem':     { amb:['Proteger {pilar} do que eu virei','Cuidar de alguém até o fim, sem perder'], des:['Uma noite de plantão sem morte'] },
  'psiquiatria':    { amb:['Mapear a loucura antes que ela me mapeie'], des:['Um paciente que me diga a verdade'] },
  'legista':        { amb:['Fechar o laudo que ficou aberto','Saber de quem era o corpo sem nome'], des:['Uma autópsia que explique tudo'] },
  'funerário':      { amb:['Dar nome a todos os que enterrei sem um'], des:['Um enterro que não seja serviço'] },
  'academia':       { amb:['Publicar o que ninguém quer ver publicado','Achar o documento que falta'], des:['Uma noite inteira no arquivo'] },
  'ciência':        { amb:['Provar em laboratório o que sou'], des:['Um resultado que se repita'] },
  'arqueologia':    { amb:['Desenterrar o que enterraram de propósito'], des:['Uma peça com data anterior à minha'] },
  'ocultismo':      { amb:['Terminar o ritual que começaram em mim','Encontrar quem escreveu o que eu li'], des:['Uma resposta que não venha em enigma'] },
  'jornalismo':     { amb:['Publicar a matéria que me mataria de novo'], des:['Uma fonte que aceite falar hoje'] },
  'tecnologia':     { amb:['Apagar minha existência de todos os sistemas','Ver o que a Segunda Inquisição já sabe'], des:['Um acesso que ainda não fecharam'] },
  'clero':          { amb:['Descobrir se ainda posso ser perdoado','Manter a paróquia de pé sem mim'], des:['Uma noite em que a fé não doa'] },
  'culto':          { amb:['Levar o culto ao que ele prometeu ser'], des:['Um sinal de que estou certo'] },
  'negócios':       { amb:['Comprar a cidade antes que ela me compre'], des:['Fechar um negócio antes do amanhecer'] },
  'política':       { amb:['Sentar onde decidem, e não onde obedecem'], des:['Um voto que eu ainda não tenho'] },
  'aristocracia':   { amb:['Restaurar o nome da família','Ser reconhecido por quem me deserdou'], des:['Um convite que não pedi'] },
  'crime':          { amb:['Assumir a boca que era do meu chefe','Pagar a dívida que herdei'], des:['Sumir com um corpo sem deixar rastro'] },
  'máfia':          { amb:['Herdar a família inteira','Cobrar a traição de 1970'], des:['Um favor aceito sem perguntas'] },
  'rua':            { amb:['Nunca mais dormir onde me achem','Ter um canto que seja meu'], des:['Uma noite sem correr'] },
  'espionagem':     { amb:['Descobrir quem me operava de verdade'], des:['Sair de um lugar sem ser visto'] },
  'prisão':         { amb:['Provar que a condenação era mentira','Encontrar quem me pôs lá'], des:['Uma noite sem grade e sem dono'] },
  'arte':           { amb:['Terminar a obra que a morte interrompeu','Ser lembrado pelo que fiz, não pelo que virei'], des:['Uma plateia que sinta o que sinto'] },
  'música':         { amb:['Tocar de novo como antes do Abraço'], des:['Uma noite em que a música baste'] },
  'palco':          { amb:['Voltar ao papel que me tiraram'], des:['Um aplauso de quem não me conhece'] },
  'noite':          { amb:['Ser dono da noite que hoje me sustenta'], des:['Um vaso que venha até mim'] },
  'moda':           { amb:['Virar o nome que a cidade copia'], des:['Ser visto por quem importa'] },
  'ofícios':        { amb:['Construir algo que me sobreviva'], des:['Terminar a peça desta noite'] },
  'direção':        { amb:['Conhecer cada rota de fuga da cidade'], des:['Uma estrada vazia até o amanhecer'] },
  'comércio':       { amb:['Controlar o que entra e sai do meu território'], des:['Vender o que ninguém mais tem'] },
  'atletismo':      { amb:['Testar até onde este corpo vai'], des:['Uma disputa de verdade'] },
  'animais':        { amb:['Formar uma matilha que me obedeça por escolha'], des:['Uma caçada limpa'] },
  'mato':           { amb:['Encontrar terra onde ninguém me ache'], des:['Uma noite longe de gente'] },
  'resgate':        { amb:['Salvar mais do que o que já perdi'], des:['Chegar a tempo, uma vez que seja'] },
  'família':        { amb:['Proteger {pilar} sem que saiba de mim','Manter a casa de pé de longe'], des:['Ver {pilar} de longe, só uma vez'] },
  'serviço social': { amb:['Tirar alguém do buraco de onde me tiraram'], des:['Resolver um caso hoje'] },
  'porto e mar':    { amb:['Controlar o que desembarca nesta cidade'], des:['Um carregamento que passe limpo'] },
  'finanças':       { amb:['Montar a fortuna que me sobreviva por séculos'], des:['Fechar o balanço antes do amanhecer'] },
  'imobiliário':    { amb:['Ser dono do chão em que eles pisam'], des:['Uma escritura assinada hoje'] },
  'literatura':     { amb:['Escrever o que não posso assinar'], des:['Uma frase que preste'] },
  'fotografia':     { amb:['Registrar o que ninguém acredita existir'], des:['Uma imagem que prove'] },
  'luta':           { amb:['Vencer quem me venceu quando eu era vivo'], des:['Uma briga sem plateia'] },
  'jogo':           { amb:['Quebrar a banca que me quebrou'], des:['Uma mão que pague a noite'] },
  'trabalho sexual':{ amb:['Nunca mais depender de ninguém para comer','Comprar minha própria liberdade'], des:['Um cliente que não me deva nada'] },
  'ativismo':       { amb:['Ver a pauta vencer mesmo sem mim'], des:['Uma assembleia que decida certo'] },
  'diplomacia':     { amb:['Costurar o acordo que ninguém consegue'], des:['Uma conversa que não seja negociação'] },
  'antiquário':     { amb:['Reunir a coleção que me falta','Recuperar a peça que me tiraram'], des:['Uma aquisição antes que outro leve'] },
  'veterinária':    { amb:['Entender por que os bichos me sentem'], des:['Um animal que não fuja de mim'] },
  'funcionalismo':  { amb:['Ter meu nome fora de todos os cadastros'], des:['Um carimbo que abra a porta certa'] },
  /* tom */
  'vingativo':      { amb:['Cobrar o que me fizeram, custe o que custar'], des:['Achar quem eu procuro'] },
  'atormentado':    { amb:['Fazer as pazes com o que eu fiz'], des:['Uma noite sem lembrar'] },
  'devoto':         { amb:['Descobrir se ainda há salvação para mim'], des:['Um sinal, qualquer um'] },
  'paranoico':      { amb:['Saber quem me vigia'], des:['Uma noite sem ser seguido'] },
  'ganancioso':     { amb:['Ter mais do que preciso, por garantia'], des:['Um lucro fácil hoje'] },
  'rebelde':        { amb:['Derrubar quem manda nesta cidade'], des:['Desobedecer sem pagar por isso'] },
  'calculista':     { amb:['Estar três passos à frente de todos'], des:['Confirmar o que eu já suspeito'] },
  'melancólico':    { amb:['Entender por que continuo aqui'], des:['Uma noite que valha a pena'] },
  'medroso':        { amb:['Parar de ter medo de mim mesmo'], des:['Passar a noite sem ser notado'] },
  'gentil':         { amb:['Provar que não virei monstro'], des:['Fazer um bem hoje'] }
};

/* Convicções ancoradas: quando há Pilar, a frase pode citá-lo. */
/* O Pilar entra sempre como sujeito ou depois de vírgula: assim a frase
   funciona com "a cunhada" e com "a filha que virou advogada trabalhista",
   sem precisar contrair preposição. */
const CONVICCOES_COM_PILAR = [
  '{pilar} jamais vai saber o que eu virei',
  '{pilar} vem antes de mim, sempre',
  'Enquanto {pilar} estiver de pé, eu me seguro',
  'Protejo {pilar} de tudo, inclusive de mim',
  '{pilar} está sob minha guarda, e ninguém encosta'
];

/* A Ambição ou o Desejo que combina com o que o contexto reconheceu.
   `qual` é 'amb' ou 'des'. */
function motivoPorContexto(qual, P) {
  const pilares = P.pilares || [];
  const rots = (P.pesos.casou || []).map(r => r.replace(/ \(no passado\)| ×\d+/g, ''));
  const candidatas = [];
  rots.forEach(rot => {
    const m = MOTIVOS_ARQUETIPO[rot];
    if (m && m[qual]) candidatas.push(...m[qual]);
  });
  const usaveis = candidatas.filter(f => !f.includes('{pilar}') || pilares.length);
  if (usaveis.length) return rnd(usaveis).replace('{pilar}', pilares[0] || '');

  const lista = qual === 'amb'
    ? (P.antigo ? SEMENTES.ambicoesAntigas : SEMENTES.ambicoes)
    : (P.antigo ? SEMENTES.desejosAntigos : SEMENTES.desejos);
  return semelhanteAoContexto(lista, P.ctx);
}

/* Duas Convicções com seus Pilares. Pilar tirado do seu texto vem
   primeiro; o que faltar sai da lista de sementes. */
function conviccoesPorContexto(P) {
  const doTexto = P.pilares || [];
  const daLista = shuffle(P.antigo ? SEMENTES.pedrasAntigas : SEMENTES.pedras);
  const pedras = doTexto.concat(daLista.filter(p => !doTexto.includes(p)));

  const frases = [];
  // com Pilar do seu texto, a Convicção pode citá-lo pelo nome
  if (doTexto.length) {
    const frase = rnd(CONVICCOES_COM_PILAR).replace('{pilar}', doTexto[0]);
    frases.push(frase.charAt(0).toUpperCase() + frase.slice(1));
  }
  const primeira = semelhanteAoContexto(SEMENTES.conviccoes, P.ctx);
  if (!frases.includes(primeira)) frases.push(primeira);
  while (frases.length < 2) {
    const nova = rnd(SEMENTES.conviccoes);
    if (!frases.includes(nova)) frases.push(nova);
  }
  return frases.slice(0, 2).map((texto, i) => ({ texto, pedra: pedras[i] || '' }));
}
