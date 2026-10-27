# Ficha de Sangue

Gerador e ficha interativa para **Vampiro: A Máscara** e **Caçador: A Revanche**, 5ª edição, em português.

## Como usar

**Offline:** duplo clique em `ficha.html`. Precisa de `disciplinas.js`, `vantagens.js`, `loresheets.js`, `dados.js`, `dados-extra.js`, `contexto.js`, `cacador.js` e `app.js` na mesma pasta (o build já coloca).

**Servidor local** (necessário se o navegador bloquear scripts em `file://`):

```bash
node servidor.js
```

Depois abra `http://localhost:4777`.

## A interface

Três lugares fixos, na barra de cima (no celular, nas abas de baixo): **Fichas**, **Crônicas** e **Mapa**. A conta fica no canto direito (no celular, na aba **Conta**). Cada lugar tem endereço próprio, então o Voltar do navegador e o recarregar funcionam.

| Endereço | O que é |
|---|---|
| `#/fichas` | **Minhas fichas**: só as suas — nome, clã (ou credo), geração e conceito, com **Ver ficha**. Busca, filtro por sistema e crônica e ordem ficam numa faixa própria; **Nova ficha** e **Importar** ficam no cabeçalho. |
| `#/ficha/<id>` | A ficha em página própria, no modo **Ver**. O painel *Na mesa* marca dano, Fome e Humanidade sem entrar em edição. |
| `#/ficha/<id>/editar` | O modo **Editar**. As ferramentas de criação (Vampiro/Caçador, *Sortear de novo*, *Forja*, *Desfazer sorteio* e o resumo da *Base de criação*) aparecem só aqui, numa faixa separada. |
| `#/cronicas`, `#/cronicas/<id>` | A lista de crônicas e o painel de uma delas: **Abrir o mapa**, convite, *Fichas do grupo*, *Jogadores*, *Atividade* e *Configurar* (narrador) ou *Fichas do grupo* e *Pessoas* (jogador). |
| `#/conta` | Sincronizar, trocar senha, tema, instalar o app e sair. |

Na ficha, os menus não se misturam: **Exportar** só baixa e imprime (PDF editável, `.json`, texto, impressão no modelo oficial ou do layout); **Ficha ⋯** cuida da ficha em si (*Crônica e compartilhar*, *Histórico de versões*, *Duplicar*, *Excluir*). As seções (Identidade, Atributos, Habilidades, Disciplinas/Trunfos, Vantagens, Moralidade, Notas) ficam numa barra fixa e servem aos dois modos; trocar de modo mantém a seção em que você estava.

Privacidade: Minhas fichas só lista as fichas da conta aberta (ou as que ainda são só deste navegador). Abrir `#/ficha/<id>` de outra pessoa não funciona — a API responde "não encontrada" e o app volta para a lista. O narrador abre as fichas da crônica dele pelo painel (*Ver* ou *Editar*); os jogadores veem só o nome dos personagens do grupo.

Acessibilidade: menus com teclado (setas, Home/End, Esc devolve o foco), diálogos nativos, *Pular para o conteúdo*, títulos em ordem, rótulos em todos os campos, contraste AA nos dois temas e alvos de toque maiores em tela de toque. Os avisos aparecem embaixo e são lidos por leitores de tela. As telas foram desenhadas antes no Claude Design (canvas "Ficha de Sangue — nova interface").

### Experiência e especializações

**Gastar experiência** (no painel *Na mesa*, em *Ficha ⋯* ou em *Notas & experiência*) abre a tabela de custos do livro e uma compra passo a passo: some o XP ganho na sessão, escolha o que subir (Atributo, Habilidade, Especialização, Disciplina, Ritual ou Cerimônia, Vantagem ou Potência de Sangue) e o app mostra o custo — Disciplina já com × 5 do clã, × 7 de fora ou × 6 Caitiff —, aplica e desconta. Sem XP suficiente, o botão fica desligado e diz quanto falta. Cada compra entra no mesmo registro do sorteio (`S.xpCompras`), então a *Base de criação* continua conferindo a ficha do dia do Abraço; dá para desfazer a última. Em Caçador o diálogo soma o XP, mas a compra guiada é só de Vampiro.

| Traço | Custo |
|---|---|
| Atributo | novo nível × 5 |
| Habilidade | novo nível × 3 |
| Especialização | 3 |
| Disciplina do clã / outra / Caitiff | novo nível × 5 / × 7 / × 6 |
| Ritual de Feitiçaria, Cerimônia | nível × 3 |
| Fórmula de Sangue-ralo | nível × 3 |
| Vantagem | 3 por ponto |
| Potência de Sangue | novo nível × 10 |

**Especializações** têm um quadro próprio no modo Editar (e uma lista no modo Ver): todas de uma vez, com sugestões por Habilidade, várias na mesma Habilidade e aviso quando falta a obrigatória de Ofícios, Erudição, Performance ou Ciência.

## Mapa da crônica (o antigo Belmont Noturno)

**Mapa** (na barra de cima, ou **Abrir o mapa** na tela da crônica) abre `vtmfichas.vercel.app/mapa/`, com a mesma conta e a mesma barra de navegação das fichas; as ferramentas do mapa ficam numa faixa só dele. O papel na crônica decide o que cada um vê:

- **Mestre (narrador):** edita bairros, pontos, personagens, diário, cenas e o nível de Quebra da Máscara; revela e oculta. O que ele revela aparece **na hora** para os jogadores (eles veem a mudança em até ~8 segundos) — não existe mais "Publicar".
- **Jogador:** vê só o que foi revelado e o diário público. A filtragem é feita na API, com lista fechada de campos; notas privadas, entradas "só o mestre", personagens ocultos e a geometria de lugares ocultos nunca saem do servidor para a conta de um jogador. Se um trecho de nota privada aparecer num texto público, a visão do jogador é bloqueada e o mestre vê o motivo (a mesma trava do Belmont).
- **Personagem ↔ ficha:** no formulário do personagem, o mestre liga uma ficha (de NPC dele ou de um jogador da crônica). **Abrir ficha** leva à ficha completa.
- **Mestre e fichas dos jogadores:** em *Crônicas → a crônica → Fichas do grupo*, **Editar** abre a ficha do jogador; cada mudança salva direto na conta dele e fica no histórico com o nome do mestre. Uma ficha do mestre pode ser **entregue** a um jogador da crônica (*Ficha ⋯ → Crônica e compartilhar → Entregar a um jogador*).
- **Primeira vez:** o mestre abre o mapa com a cidade de Belmont (tudo oculto) ou **importa** o Belmont antigo: no PC, dois cliques em `EXPORTAR_BELMONT.bat` (pasta do belmont-app) gera `belmont-export.json`; no mapa, **Importar Belmont** e escolha o arquivo.

O código do mapa está em `mapa/` (o `build.js` copia para `deploy/mapa/`) e as rotas em `api/src/rotas/mapa.js`.

## Fichas, conta e crônicas

**Minhas fichas** é a biblioteca. Cada ficha fica guardada no navegador (uma chave por ficha), então nada se apaga sem querer: **Nova ficha** pergunta o sistema e como começar (*Sorteada*, *Pela Forja* ou *Em branco*); *Sortear de novo* (modo Editar) refaz a ficha aberta e oferece **Desfazer**. Sem nenhuma ficha, o site abre na lista vazia, com o convite para criar a primeira — não sorteia nada sozinho.

Com conta (email e senha), as fichas sobem para a API em `api/` e aparecem em qualquer aparelho:

- **Offline:** dá para editar sem internet; a ficha sobe quando a conexão volta. O selo no canto da barra mostra *Sincronizado*, *N para enviar* ou *Offline*.
- **Conflito:** se a mesma ficha foi mudada em dois aparelhos, a versão do servidor fica com o nome original e a outra vira uma cópia "(conflito …)". Nada se perde.
- **Histórico:** edições seguidas viram uma versão a cada 10 minutos; *Marcar esta versão* guarda uma com nome (ex.: "antes de gastar XP") e *Restaurar* volta para qualquer uma.
- **Crônicas:** quem cria narra e recebe um código de convite; o jogador entra com o código em **Crônicas** e põe uma ficha dele ali (na própria tela da crônica, ou em *Ficha ⋯ → Crônica e compartilhar*). O narrador acompanha as fichas do grupo.
- **Link de leitura:** *Criar link* gera um endereço que mostra a ficha a quem não tem conta; *Desligar* revoga.
- **Importar** (em Minhas fichas) aceita o PDF salvo pelo app, um `.json` ou o texto colado. Um PDF de uma ficha que mudou depois de salvo entra como ficha nova, em vez de sobrescrever.
- **Desfazer / refazer**: botões no topo da ficha (Editar e Ver) e Ctrl+Z, Ctrl+Shift+Z ou Ctrl+Y. Guarda os últimos 40 passos da ficha aberta; digitação seguida conta como um passo; dentro de um campo de texto o atalho é o do navegador. O desfeito é o que fica salvo.
- **Ficha importada de outro lugar** não mostra avisos de criação (a faixa diz "Ficha importada"): ela pode já ter experiência gasta e o Tipo de Predador embutido, e as contas dariam avisos falsos. "Conferir com as regras de criação", na lateral, liga a conferência; sortear de novo transforma em ficha comum.
- **Fichas de outros lugares** (`src/importar.js`): qualquer PDF preenchível de Vampiro (oficial ou de fã, em português, inglês, espanhol, francês, alemão ou italiano), o JSON do Foundry VTT (sistema WoD5e) ou de outro app, e texto colado ("Strength 3", "Força ●●●○○", "Clan: Brujah"). Os campos são reconhecidos pelo nome; os de nome genérico ("Check Box 37") pela posição — o texto impresso à esquerda da fileira de bolinhas, ou o campo ao lado (nome da Disciplina, da Vantagem). Poderes, Vantagens, Defeitos, clãs e predadores são casados com as listas do app pelo nome em português ou inglês, com tolerância a um erro de digitação. PDF sem campos é lido como texto. Antes de criar a ficha abre **Conferir a importação**: mostra cada termo lido ("lido de “Strength”"), marca em âmbar o que veio por aproximação e lista o que não foi reconhecido, para a pessoa dizer o que é ou ignorar. O leitor de PDF é o [pdf.js](https://mozilla.github.io/pdf.js/) (Apache 2.0, `src/pdfjs.min.js` + `src/pdfjs.worker.min.js`, 1,4 MB), baixado só na hora de importar um PDF que não é deste app.

O endereço da API fica em `NV_API_PADRAO`, no começo de `src/nuvem.js` (ou em *Conta → Servidor*, quando o site não tem servidor). Instalação e rotas: `api/README.md`. Testes: `cd api && npm test` e `testes-e2e/nuvem_e2e.py`. Sem conta nem API, só com o site servido (`node servidor.js` e `E2E_SITE=http://localhost:4777/`, ou o `deploy/` do subir.sh): `testes-e2e/ficha_e2e.py` (abas, rolagem, foco, desfazer/refazer, ficha importada, tempo de redesenho) e `testes-e2e/importar_e2e.py` (as fichas de `testes-e2e/fixtures/`; `node testes-e2e/fixtures/gerar.js` recria os PDFs).

## PDF editável

**Exportar → PDF editável** (Vampiro) baixa a ficha no modelo oficial em duas páginas, com os campos de formulário preenchidos e ainda editáveis no Acrobat, Foxit, Edge ou Chrome. O modelo (`src/modelo-pdf.js`, base64) e a pdf-lib só são baixados na hora de exportar, imprimir no modelo ou importar um PDF — a página publicada caiu de 2,7 MB para 0,5 MB (160 KB comprimida); no arquivo único `ficha-de-sangue.html` eles continuam embutidos. O modelo é preenchido no navegador com a biblioteca [pdf-lib](https://pdf-lib.js.org/) (MIT, `src/pdf-lib.min.js`); nada é enviado a servidor.

- **O que vai para o PDF:** identidade, Atributos, Habilidades, Vitalidade, Força de Vontade, Humanidade, Fome, Disciplinas (nível e poderes), Vantagens e Defeitos, Potência de Sangue, Convicções e Pilares, Perdição e Compulsão do clã, Princípios da Crônica, XP, Aparência e Ressonância.
- **O que o modelo não tem onde guardar** vai para o campo *Notas*: Jogador, Seita, Especialidades, notas longas de Vantagens/Defeitos e o que passar de 6 Disciplinas ou 11 Vantagens/Defeitos.
- Defeitos entram na mesma lista das Vantagens, com o prefixo "Defeito:".
- Vitalidade e Força de Vontade marcam as caixas do máximo; Fome e Humanidade, o valor atual. O modelo não tem caixa para máculas.
- **Exportar → Imprimir no modelo oficial** (Vampiro) imprime esse mesmo PDF do modelo. Ele é carregado num quadro invisível e a impressão é chamada nele. Com a ficha aberta por duplo clique (`file://`) e no Safari, onde isso falha, o PDF abre numa aba nova para imprimir de lá. Se o navegador estiver configurado para baixar PDFs em vez de abri-los, ele avisa para imprimir o arquivo baixado. Dentro de janela embutida (Artifact) o Chrome não mostra PDF, então lá a impressão usa o layout da página; o modelo sai por *PDF editável*.
- O layout próprio da página continua disponível: **Exportar → O layout desta página** (ou Ctrl+P em qualquer modo).
- **Importar** (em Minhas fichas) traz a ficha de volta do PDF. O PDF salvo pelo app leva a ficha inteira anexada (`ficha-de-sangue.json`); ao abrir, o que foi mexido à mão nos campos (pontos, XP, nomes, notas, história…) é aplicado por cima. Um PDF do modelo preenchido em outro lugar, sem o anexo, é montado lendo só os campos. Vitalidade e Força de Vontade não voltam: são calculadas pelos Atributos.
- Caçador não tem modelo em PDF: **Exportar → Imprimir ou salvar PDF** imprime a página.
- Quem mexe nisso: o mapa campo → dado está em `src/pdf-ficha.js` (`mapaPdf`); depois de editar, rode `node build.js`.

## O que ela faz

### Os dois sistemas

O seletor na barra alterna entre **Vampiro** e **Caçador**. Atributos, Habilidades, Vantagens, Defeitos, Convicções e Pilares são compartilhados — o que muda é a metade de cima: clã, geração, Potência de Sangue, disciplinas e predador de um lado; credo, ímpeto, trunfos, Desespero e Perigo do outro.

### Forja — o sorteio que você controla

Painel de parâmetros. O que você fixa, o dado não decide; o que ficar em "Qualquer" ele resolve.

- **Contexto do personagem**: quatro camadas, descritas abaixo. O painel mostra tudo que reconheceu antes de você rolar, e o texto vira o Conceito da ficha.
- **Vampiro**: clã, idade, geração, tipo de predador, seita.
- **Caçador**: credo, ímpeto.
- **Ambos**: distribuição de habilidades, foco (físico/social/mental), região de origem do nome.
- **Preservar**: trave nome, conceito, ambição/desejo ou convicções e role de novo só a mecânica.

### Contexto — quatro camadas

O campo de contexto é lido em quatro camadas, da mais fraca para a mais forte.

**1. Arquétipo** — 57 profissões. "legista" empurra Medicina, Ciência, Investigação, Ocultismo, sugere Hecata, Ladrão de Túmulos e Ressonância Melancólica. Casa por **raiz de palavra**: a chave `legist` pega legista e legistas.

**2. Tom** — 26 temperamentos. "fria e metódica" empurra Autocontrole e Inteligência.

**3. Menção direta** — 593 termos: todo nome de perícia, atributo, Disciplina, clã, predador, Vantagem, Defeito, ressonância, credo e ímpeto, em português e em inglês. Casa por palavra inteira, para "Fama" não pegar dentro de "famigerado". Quem escreveu *"usa Dominação"* sabia o que queria, então isso pesa mais que qualquer inferência.

**4. Marcadores** — não empurram peso, decidem um parâmetro: **idade** ("séculos", "anos 30", "matusalém"), **geração** ("9ª geração"), **região do nome** ("japonês", "nigeriana", "siciliano") e **seita** ("Camarilla", "barão anarquista").

Antes de somar, o texto em volta do termo é lido:

| Você escreve | O que acontece |
|---|---|
| `sem Recursos`, `nunca usa armas`, `odeia política` | **veto** — o traço sai do sorteio, mesmo que um arquétipo o tenha empurrado |
| `ex-policial`, `antigo padre`, `aposentado` | vale **metade**, e o painel marca *(no passado)* |
| a mesma entrada casa por várias palavras | pesa até **75% a mais** |

Um exemplo real do painel, para *"corretor de imóveis calculista, ex-advogado, Ventrue da Camarilla, sem Recursos"*:

> **Arquétipos:** direito (no passado) · imobiliário · calculista
> **Citado no texto:** Ventrue
> **Parâmetros:** seita: Camarilla
> **Perícias:** Política, Subterfúgio, Finanças, Persuasão · **Clã:** Ventrue, Lasombra · **Vantagens:** Influência, Refúgio, Status

Medido em 120 fichas por caso, contra o mesmo sorteio sem contexto:

| Texto | Alvo | Com contexto | Sem |
|---|---|---|---|
| Ventrue da 9ª geração, usa Dominação, tem Influência | clã Ventrue | 100% | 8% |
| » | 9ª geração | 100% | 10% |
| » | Vantagem Influência | 100% | 19% |
| hacker paranoico, **sem contatos** nenhum | Vantagem Contatos | **0%** | 35% |
| legista fria e metódica | Medicina 3+ | 79% | 18% |
| matusalém adormecido desde a Babilônia | idade Matusalém | 100% | 4% |
| nobre japonês abraçado no período Edo | nome do Leste Asiático | 100% | 6% |
| barão anarquista que domina o porto | seita Anarquista | 100% | 28% |

### Motivos e Pilares vindos da sua história

Tentamos ligar um modelo local (Ollama) para ler o contexto. Não pagou: escrevia bem de vez em quando e inventava gente que a história não tinha no resto das vezes, a dez segundos por ficha. Foi removido.

O que ele fazia de útil era **uma** coisa — tirar o Pilar do texto que você escreveu — e isso é reconhecimento de padrão, não interpretação. Então virou motor:

**Pilares saem do seu texto.** Uma varredura de 40 termos de parentesco e 38 de convívio acha quem você citou e devolve o trecho como você escreveu:

| Você escreve | Pilares |
|---|---|
| *"o irmão dela chegou baleado e morreu na maca dela. Hoje sustenta a cunhada e a sobrinha"* | **a cunhada · a sobrinha** |
| *"protege a filha que virou advogada trabalhista"* | **a filha que virou advogada trabalhista** |
| *"financia a igreja, onde o padre a chama de benfeitora"* | **o padre** |
| *"mora sozinho, sem família, sem amigos"* | *(ninguém)* |

Duas travas que a varredura precisa ter:

- **Quem morreu não ancora nada.** Pilar é âncora na vida. Mas a checagem tem de ser da *mesma oração*: olhar sessenta caracteres em volta descartava a cunhada por causa de um "morreu" que falava de outra pessoa, três palavras depois da vírgula.
- **O artigo é obrigatório.** Sem exigir "a", "o", "minha", "da", o texto *"foi enfermeira de UTI"* entrava como Pilar — e essa enfermeira é a própria personagem.

**Ambição e Desejo por arquétipo.** 60 arquétipos têm os seus: legista quer *"fechar o laudo que ficou aberto"* e deseja *"uma autópsia que explique tudo"*; sindicalista quer *"ver a pauta vencer mesmo sem mim"*. Sem arquétipo reconhecido, cai na lista genérica.

**Convicções que citam o Pilar.** Havendo alguém no seu texto, a primeira Convicção fala dele: *"Protejo a cunhada de tudo, inclusive de mim"*.

Uma ficha inteira, em **16 ms**, a partir da história da Marina:

> **Nosferatu** · Neófita · distribuição Especialista
> **Ambição:** Entender o que o sangue faz comigo · **Desejo:** Uma autópsia que explique tudo
> **Convicções:** *Protejo a cunhada de tudo, inclusive de mim* → **a cunhada** · *Minha palavra vale mais que meu sangue* → **a sobrinha**
> **Especializações:** Medicina: Anestésicos · Ciência: Biologia · Sagacidade: Primeira impressão

### A criação por etapas

A ficha não sai de um bolo só: sai de **treze etapas em ordem**, e a ordem é a das dependências reais. Cada etapa só usa o que as anteriores decidiram, e **é conferida assim que termina** — quando algo quebra, o painel diz qual etapa quebrou.

| | Etapa | Por que vem aqui |
|---|---|---|
| 1 | **Intenção** | lê o contexto e decide idade, geração, **perfil** (especialista, equilibrada, faz-tudo) e foco. Tudo o mais trabalha a favor disso |
| 2 | Clã e seita | o clã limita Disciplinas, Perdição e Compulsão |
| 3 | Identidade | o nome depende do clã; o resto, da idade |
| 4 | Tipo de Predador | depende do clã e da geração |
| 5 | Atributos | o foco e o perfil decidem onde ficam o 4 e os 3 |
| 6 | Habilidades | o perfil dá a distribuição; o Predador já empurrou as perícias dele |
| 7 | Disciplinas e poderes | 2+1 do clã, o ponto do Predador, e então os poderes |
| 8 | Especializações | **depois** do Predador, para não repetir a que ele deu |
| 9 | Ressonância | **depois** das Disciplinas, para o sangue combinar com o que ele sabe fazer |
| 10 | Vantagens e Defeitos | depois de tudo que pode vetar uma entrada |
| 11 | Convicções e Pilares | |
| 12 | Experiência | por último entre as que gastam pontos |
| 13 | Fecho | ritos, Fome e a conferência final |

Três dessas posições são correções, não arrumação:

- a **Ressonância** era escolhida antes das Disciplinas existirem, e saía sem relação com elas. Agora combina em **100%** das fichas;
- as **Especializações** eram postas antes do Tipo de Predador entregar a dele, e podiam cair na mesma perícia;
- o **perfil** era decidido dentro da etapa das Habilidades, então os Atributos não o seguiam.

O painel lateral mostra as treze etapas numeradas. Verde é etapa que passou na conferência; vermelha diz o que deu errado.

### O perfil concentrando a ficha

O perfil decidido na etapa 1 vale para Atributos **e** Habilidades: numa ficha especialista o foco manda muito e o acaso quase não entra; numa faz-tudo é o contrário. Com o contexto *"cirurgião cardíaco brilhante, obcecado, inteligente e frio"*, medindo quantas das quatro perícias mais altas caem em Mentais:

| Perfil | Concentração |
|---|---|
| Especialista | **98%** |
| Equilibrado | 81% |
| Pau para toda obra | 52% |

### O contexto otimizando a ficha

O objetivo é sair do sorteio com menos campo por preencher. O que o contexto decide, além dos pesos:

**Especializações.** Antes toda ficha nascia com `a definir` em quatro ou cinco campos. Agora são **0%**: cada perícia tem de 6 a 7 especializações plausíveis, e 67 arquétipos trazem a sua própria sugestão — legista dá *Medicina: Autópsias*, *Ciência: Forense*, *Investigação: Cena do crime*; hacker dá *Tecnologia: Invasão*. As do Tipo de Predador continuam vindo do livro.

**Distribuição de Habilidades.** Não é sorteada: é a *forma* dos pesos do contexto. Texto que concentra em poucas perícias pede Especialista; texto que espalha pede Equilibrado ou Pau para toda obra.

| Contexto | Distribuição escolhida |
|---|---|
| *"cirurgião cardíaco, nada além do bisturi"* | Especialista, 100% |
| *"vira-lata que faz de tudo um pouco, catador, camelô, vigia"* | Equilibrado, 100% |
| sem contexto | sorteia: 31% / 28% / 41% |

**Foco de Atributos.** A categoria — Físicos, Sociais ou Mentais — que o texto mais empurrou, e só quando empurra de verdade (mais da metade do peso).

**Ambição, Desejo e a primeira Convicção.** Em vez de tirar no dado, escolhe a semente que mais conversa com as palavras do texto.

**Idade, geração, seita e região do nome** vêm dos marcadores, como descrito acima.

### Idade — a ficha não precisa ser de um recém-Abraçado

A maioria das fichas que a gente gera é de NPC, e a maioria dos NPCs de uma cidade não foi Abraçada mês passado. Com a idade solta, o sorteio distribui como numa população: **Ancillae 34% · Ancião 28% · Neófita 27% · Criança 6% · Matusalém 5%**.

| Faixa | Geração | Experiência | Vantagens | Defeitos | Humanidade |
|---|---|---|---|---|---|
| Criança | 12–13 | — | — | — | — |
| Neófita | 12–13 | 15 | — | — | — |
| Ancillae | 10–11 | 35 | +2 | +2 | −1 |
| Ancião † | 8–9 | 220 | +4 | +4 | −2 |
| Matusalém † | 5–7 | 480 | +6 | +6 | −3 |

**†** As duas últimas não estão no Guia Suplementar: são a mesma escada do Mar do Tempo estendida, calibrada por nós para gerar NPCs antigos. Ficam marcadas assim na interface.

A idade também escolhe as sementes. Um Ancião não sai com conceito de *motorista de aplicativo*: vem de uma lista própria de conceitos, ambições, desejos e pilares — *oficial de cavalaria que nunca desmontou*, *cobrar uma dívida de duzentos anos*, *o neto do homem que eu deveria ter matado*.

### Poderes com a mecânica inteira

Cada um dos **162 poderes** traz, além do nome e do resumo: **custo**, **duração**, **parada de dados**, **parada oposta**, **nível exato do Amálgama**, **poder exigido**, **livro de origem** e a marca de **errata** quando a wiki oficial registra que o poder foi corrigido. Isso aparece na tela e sai na ficha impressa:

> **•1 Compelir** *Compel* — Uma ordem curta, obedecida na hora.
> Custo: Livre · Parada: Carisma + Dominação · vs Inteligência + Determinação · Duração: No máximo uma cena

Os valores foram conferidos em [vtm.paradoxwikis.com](https://vtm.paradoxwikis.com/) — são dados de regra, não texto de livro. As descrições continuam sendo resumos próprios.

Ter o nível do Amálgama escrito no dado corrigiu erros que a versão anterior cometia adivinhando pelo texto:

| Poder | Antes exigia | O livro exige |
|---|---|---|
| Possessão | Dominação 5 | **Dominação 3** |
| Colmeia Não-Viva | Ofuscação 3 | **Ofuscação 2** |
| Bestas Resistentes | Animalismo 2 | **Animalismo 1** |
| Voz Irresistível | Dominação 4 | **Dominação 1** |
| Faísca de Fúria | Potência 3 | **Presença 3** |
| Ocultar | nada | **Auspícios 3** |

E "Obeah" era o nome errado: o poder do Guia Suplementar chama-se **Panaceia**.

### Rituais e Cerimônias

41 Rituais de Feitiçaria de Sangue e 13 Cerimônias de Oblívio, com custo, parada e livro. Quem tem a Disciplina ganha um de nível 1 na criação; os demais custam **nível × 3** e nunca passam da pontuação da Disciplina — o gasto de experiência compra alguns, então um feiticeiro antigo sai com repertório.

As Cerimônias **exigem um poder de Oblívio específico**, e o app respeita isso: *Vincular o Espírito* só aparece para quem tem Praga Necrótica. Na lista de escolha manual, as que você não sustenta ficam travadas com o motivo à mostra. Rituais de culto (Bahari, Igreja de Caim, Shalim) existem no catálogo mas ficam fora do sorteio — são escolha da mesa.

### Vantagens e Defeitos, o catálogo inteiro

**114 Vantagens e 105 Defeitos**, em 18 categorias, mais **11 Defeitos presos a Disciplina** — cada um com faixa de pontos, pré-requisito e livro, conferidos na mesma wiki. A lista de escolha mostra tudo:

> Aliados (2–6) · Influenciador (1) — *Fama 2+* · Banido de (1–3) — *Live from the Succubus Club* · Aventureiro (1) — *Guia do Jogador · errata*

O sorteio só oferece o que a ficha pode ter:

- **exclusivos** — Vantagem de Sangue-ralo não cai em Ventrue, a de Caitiff não cai em Tremere, a de carniçal não cai em vampiro nenhum, e as de culto ficam fora do automático porque não modelamos cultos;
- **pré-requisitos** — *Influenciador* exige Fama 2, *Placas Reserva* exige Refúgio Móvel, *Sapateiro* exige Máscara;
- **pisos do livro** — Aliados começa em 2, não em 1;
- **Defeitos de Disciplina** — *Rombudo* só existe para quem tem Dominação, *Estase* só para quem tem Proteanismo.

Antes disso o gerador trabalhava com uma lista escrita à mão de 12 Antecedentes. Numa amostra de 600 fichas agora saem **50 Vantagens e 68 Defeitos distintos**, contra pouco mais de uma dúzia.

### Coerência entre os traços

22 pares nunca saem juntos, nos dois sentidos: Visual (Belo) com Feio, Invinculável com Escravo de Vínculo, Recursos com Miserável, Refúgio com Sem Refúgio, Parece Vivo com Carne Morta, Bebedor Diurno com Heliofobia. A checagem vale também **dentro da mesma rodada** — era por isso que saía Vício junto de Vício Irremediável.

E um Defeito que as próprias perícias desmentem fica de fora: não sai Analfabeto em quem tem Erudição, Ciência, Ocultismo ou Medicina, e a experiência tampouco compra essas perícias para quem tem o Defeito.

### Loresheets

**72 Loresheets** dos livros que temos — Básico, Anarquistas, Camarilla, Chicago by Night e Cultos dos Deuses de Sangue — com nome, restrição e livro. O Loresheet é uma Vantagem comprada de 1 a 5 pontos e sai do **mesmo orçamento** das outras, como manda a regra.

Os benefícios por nível **não** estão aqui: eles ocupam meia página cada no livro, e o livro é seu. O que o app guarda é o catálogo, a restrição legível por máquina e um resumo do tema:

> **La Famiglia Giovanni** — *Hecata apenas* — A família Giovanni: nepotismo, comércio e morte.

A restrição vale no sorteio: *Descendant of Hardestadt* só sai em Ventrue, *The Cobweb* só em Malkavian, *Child of the Angel Michael* nunca em Nosferatu. Loresheets de culto ficam fora do automático, porque não modelamos cultos.

Escrever **"Hecata da família Giovanni"** no contexto faz esse Loresheet aparecer. Sem menção, ele entra em cerca de **um terço** das fichas — é tempero, não obrigação.

### Filtro de livros

A Forja tem caixas para ligar e desligar os livros que entram no **sorteio automático** de poderes. Vêm ligados os que temos em mãos: Básico, Guia Suplementar, Guia do Jogador, Cultos dos Deuses de Sangue, Chicago by Night e Anarquistas. Poderes de livros desligados continuam na lista e podem ser marcados à mão.

### Disciplinas — a geração manda

A criação é sempre 2+1 dentro do clã. O que muda depois é a **amplitude**, e ela vem da geração: sangue mais forte carrega mais Disciplinas e as aprende mais longe da linhagem.

| Geração | Teto de Disciplinas | Apetite por sair do clã |
|---|---|---|
| 12–16 | 3 | 0,05 |
| 10–11 | 4 | 0,27 |
| 8–9 | 5 | 0,49 |
| 6–7 | 6 | 0,71 |
| 4–5 | 7 | 0,80 |

O número governa três coisas: quantas Disciplinas o gasto de experiência pode abrir, se o ponto do Tipo de Predador reforça a linhagem ou abre uma nova, e se o Predador em si é escolhido entre os que conversam com o clã. Uma neófita da 13ª quase sempre fica nas do clã; um ancião da 8ª sai com uma ou duas de fora, compradas a × 7 como manda o livro. Esses limites são calibragem nossa — a v5 não imprime teto de Disciplinas por geração, só o custo maior fora do clã.

Com o repertório maior, os **Amálgamas** deixam de ser proibidos: um poder de Amálgama entra quando o personagem tem mesmo a outra Disciplina, no nível exato que o livro pede.

### Validação das regras

Trilha lateral fixa com duas leituras:

**Perfil** — para quem vai rodar o personagem na mesa: idade, experiência gasta, soma de pontos, maior parada de dados e as Disciplinas com quantas estão fora do clã.

**Base de criação** — a ficha no dia do Abraço, com a experiência e o Tipo de Predador descontados. Uma ficha de Matusalém passa aqui igual à de um recém-criado.

- **Atributos** — um 4, três 3, quatro 2 e um 1.
- **Habilidades** — as três distribuições oficiais.
- **Disciplinas** — dois pontos numa e um noutra, ambas do clã, mais o ponto do Predador. O validador avisa se nenhuma chegou a 2, se faltam poderes ou se alguma estaria fora do clã **na criação** — Disciplinas abertas depois, com experiência, são legítimas e ficam marcadas como *aprendida fora do clã*.
- **Trunfos** (Caçador) — 2 Trunfos, ou 1 Trunfo e 2 Distinções.
- **Vantagens e Defeitos** — 7 e 2, ajustados pela idade.

### Outros

- Derivados automáticos: Vitalidade, Força de Vontade e a tabela completa de Potência de Sangue.
- Trilhas clicáveis de dano superficial (`╱`) e agravado (`✕`), Humanidade com Máculas, Fome, Desespero e Perigo.
- Poderes de disciplina dos níveis 1 a 5, com a mecânica completa. Uma Disciplina com 2 pontos recebe **um poder de nível 1 e um de nível 2** — não dois de nível 1.
- **Gasto automático da experiência da idade**, pela tabela de custos oficial. O orçamento é repartido por categoria antes de comprar — sem isso o gasto desaba todo em Habilidades, que são 27 e as mais baratas. Quem viveu séculos gasta proporcionalmente mais no sangue: num ancião sai perto de 46% Disciplinas, 21% Habilidades, 19% Atributos e o resto em especializações, Vantagens e Potência de Sangue, com menos de 1% ocioso. Cerca de 30% dos anciãos compram um nível de Potência de Sangue acima do que a geração entrega — é exceção de propósito, senão a tabela de geração perderia o sentido. A ficha lista cada compra e o custo.
- Ficha limpa para impressão em A4, duas páginas, com layout próprio.
- Salva sozinha no navegador; exporta e importa por JSON.

## Conteúdo e fontes

Tudo foi conferido nos livros oficiais em português. **As descrições de poderes, perdições, compulsões, trunfos e credos são resumos próprios**, escritos para caber na tela — não o texto dos livros. Todos os campos são editáveis: cole a redação exata quando precisar dela na mesa.

| Fonte | O que entrou |
|---|---|
| Livro Básico | 16 clãs, 12 disciplinas, 10 tipos de predador, vantagens, qualidades e defeitos |
| Guia Suplementar (Companion) | Terminologia oficial da ficha, regra 2+1 das Disciplinas, tabela de Potência de Sangue corrigida, 8 poderes novos com Amálgama, custos de experiência, O Mar do Tempo |
| Cultos dos Deuses de Sangue | Tipos de predador Extorsionário e Ladrão de Túmulos, poderes e Cerimônias de Oblívio |
| Caçador: A Revanche | 5 credos, 7 ímpetos, 12 trunfos com paradas e distinções, distribuições e criação |
| Chicago by Night, Anarquistas, Guia do Jogador | Poderes de Disciplina e Rituais |
| [vtm.paradoxwikis.com](https://vtm.paradoxwikis.com/) | Custo, duração, parada de dados, parada oposta, nível dos Amálgamas, pré-requisitos, livro de origem e marcas de errata de poderes, Rituais, Cerimônias, Vantagens, Defeitos e Loresheets |

### Duas divergências que vale saber

**Gravidade da Perdição.** A tabela de Potência de Sangue do Companion (que é o livro de errata) traz 0, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6 — diferente do Livro Básico em inglês, que traz 1, 1, 2, 2, 3, 3, 4, 4, 5, 5. O app usa a do Companion, por ser a mais recente. Se sua mesa usa a outra, o campo é editável.

**Nomes dos tipos de predador.** Confirmei nos livros: Vira-lata, Sacoleiro, Sandman, Osíris, Extorsionário, Ladrão de Túmulos. Os demais estão com minha tradução e o nome em inglês ao lado, para não haver dúvida na mesa.

**O que é calibragem e não é livro.** As faixas Ancião e Matusalém, o teto de Disciplinas por geração, o apetite por Disciplina fora do clã e a lista de pares contraditórios são nossos. Nada disso contradiz uma regra impressa — preenche o que o livro deixa em aberto. Tudo é editável na ficha.

Os tipos de predador dos outros suplementos ficaram fora do preenchimento automático de propósito — aplicar pontos errados é pior que não aplicar. Use "Personalizado" e preencha à mão.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/pagina.html` | Fonte: marcação e estilos. Sem `<html>`/`<head>`/`<body>` — é a versão publicável como Artifact. |
| `src/disciplinas.js` | As 12 Disciplinas com os 162 poderes e a mecânica de cada um, mais 41 Rituais e 13 Cerimônias e a tabela de livros (`FONTES`). Carregado antes de todos. |
| `src/dados.js` | Base do Livro Básico: clãs, predadores, nomes por região, sementes de conceito, Potência de Sangue. |
| `src/dados-extra.js` | Suplementos e Caçador: predadores do Cultos, credos, ímpetos, trunfos, custos de XP e as faixas de idade. |
| `src/vantagens.js` | As 114 Vantagens, 105 Defeitos, os presos a Disciplina e a lista de pares contraditórios. |
| `src/loresheets.js` | Os 72 Loresheets com restrição de clã e chaves de contexto. |
| `src/contexto.js` | Os 83 arquétipos, o motor de contexto, as especializações por perícia e por arquétipo, a varredura de Pilares e as regras que o contexto decide (distribuição, foco, motivos, Loresheet). |
| `src/cacador.js` | Tudo de Caçador: cards, trilha lateral, ficha e sorteio. Carregado antes de `app.js`. |
| `src/app.js` | Estado, renderização, validador, as treze etapas do sorteio (`ETAPAS`) e a ficha impressa. |
| `src/experiencia.js` | Gastar experiência: a tabela de custos e a compra guiada (grava em `S.xpCompras`). |
| `src/interface.js` | A casca: rotas (`#/fichas`, `#/ficha/<id>`, `#/cronicas`…), menus acessíveis por teclado, diálogos, avisos, cabeçalho da ficha, seções e o painel *Na mesa*. Carregado por último; também dá a partida no app. |
| `build.js` | Gera `ficha.html` (standalone) e copia os `.js` para a raiz. |
| `servidor.js` | Servidor estático mínimo para desenvolvimento. |

Depois de editar qualquer coisa em `src/`, rode `node build.js`.

## Para estender

Quase tudo é dado declarativo:

- **Clã, predador, vantagem ou defeito:** `src/dados.js`, nos objetos `CLAS`, `PREDADORES`, `VANTAGENS`, `DEFEITOS`.
- **Poder de Disciplina:** `src/disciplinas.js`, com o ajudante `P(nível, nome, nome em inglês, descrição, mecânica)`. Na mecânica: `am` ("Ofuscação 2"), `ex` (poder exigido), `c` (custo), `dur`, `pool`, `vs`, `f` (livro) e `errata`.
- **Ritual ou Cerimônia:** `RITUAIS` e `CERIMONIAS` no mesmo arquivo. Cerimônia precisa de `ex`, o poder de Oblívio que ela exige.
- **Livro novo:** entrada em `FONTES`; `padrao:true` já o liga no sorteio.
- **Região de nomes:** entrada em `NOMES` com as listas `a` (prenomes) e `b` (sobrenomes); para ligá-la a um clã, acrescente o par em `ORIGEM_POR_CLA`.
- **Vantagem ou Defeito:** `src/vantagens.js`, com o ajudante `V(nome, nome em inglês, mínimo, máximo, descrição, extras)`. Nos extras: `cat` (categoria), `req` (pré-requisito), `so` (exclusivo de ralo/caitiff/carniçal/culto), `par` (o espelho), `f` (livro) e `errata`.
- **Arquétipo de contexto:** entrada em `CONTEXTO` ou `CONTEXTO_TOM` (`src/contexto.js`) com `rot` (rótulo legível), `chaves` (raízes de palavra; acentos são normalizados) e qualquer combinação de `hab`, `atr`, `vant`, `def`, `cla`, `pred`, `disc`, `res`, `credo`, `impeto` e `mar`. Em listas, o primeiro nome pesa mais que o último. As chaves precisam ser únicas entre entradas.
- **Marcador de contexto:** `MARCAS_IDADE`, `MARCAS_ORIGEM` e `MARCAS_SEITA`, no mesmo arquivo.
- **Etapa do sorteio:** entrada em `ETAPAS` (`src/app.js`) com `id`, `nome`, `roda(P)` e `confere(P)`. `P` é o contexto que atravessa as etapas; `confere` devolve o problema em texto, ou vazio.
- **Ambição, Desejo ou Convicção de um arquétipo:** entrada em `MOTIVOS_ARQUETIPO` (`src/contexto.js`), com `amb` e `des`. `{pilar}` é trocado por quem a varredura achou no texto; sem ninguém, a frase é descartada.
- **Termo de Pilar:** `LACOS_PARENTESCO` ou `LACOS_CONVIVIO`, no mesmo arquivo.
- **Especialização:** `ESPECIALIDADES` (por perícia) e `ESP_ARQUETIPO` (por arquétipo), em `src/contexto.js`. A sugestão do arquétipo precisa existir na lista da perícia — o teste confere.
- **Loresheet:** entrada em `LORESHEETS` (`src/loresheets.js`) com `nome`, `ds`, `chaves`, `f` e, quando houver, `cla`, `naoCla` ou `culto`.
- **Faixa de idade:** entrada em `MAR_DO_TEMPO` (`src/dados-extra.js`) com `geracoes`, `xp`, `vantagens`, `defeitos`, `humanidade`, `peso` (chance no sorteio; 0 mantém a faixa fora dele) e `epoca`.
- **Teto de Disciplinas por geração:** `amplitudeDisciplinas` em `src/contexto.js`.
- **Par contraditório:** entrada em `CONTRADICOES`; Defeito desmentido por perícia, em `DEFEITO_DESMENTIDO`.
- **Trunfo de Caçador:** entrada em `TRUNFOS`, dentro da família certa, com `parada`, `desc` e `dist`.

Vampiro: A Máscara e Caçador: A Revanche são marcas da Paradox Interactive; a edição em português é da Galápagos Jogos. Este é um utilitário de mesa, não-oficial, sem fins comerciais e sem redistribuição de conteúdo dos livros.
