"""Editar a ficha: abas, rolagem, foco, desfazer/refazer, ficha importada e redesenho parcial.
Sem conta. Requer o site servido em E2E_SITE (padrão http://localhost:8765/, o deploy/ do subir.sh;
`node servidor.js` também serve: E2E_SITE=http://localhost:4777/)."""
import asyncio, os
from playwright.async_api import async_playwright

SITE = os.environ.get('E2E_SITE', 'http://localhost:8765/')
FX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

async def nova(p, inicio='branco', sistema='vampiro'):
    await p.goto(SITE + '#/fichas'); await p.wait_for_timeout(500)
    await p.click('#tela-fichas .pg-h [data-acao=nova]')
    await p.check(f'input[name=sistema][value={sistema}]'); await p.check(f'input[name=inicio][value={inicio}]')
    await p.click('#form-nova button[value=criar]'); await p.wait_for_timeout(700)
    if inicio == 'sorteada': await p.click('#modo-editar'); await p.wait_for_timeout(300)

visiveis = "[...document.querySelectorAll('#col-main > .card')].filter(c => c.offsetParent).map(c => c.querySelector('h2').textContent)"
VIS_CSTATUS = "[...document.querySelectorAll('.cstatus')].filter(e => e.offsetParent).length"
dot = lambda k, i: f'#col-main [data-dot="atr.{k}"][data-i="{i}"]'

async def abas(p):
    print('Abas')
    await nova(p)
    ok('/editar' in p.url, 'ficha em branco abre em Editar')
    ok(await p.evaluate(visiveis) == ['Conceito & origem'], 'só a aba Identidade aparece')
    ok(await p.locator('#secnav [role=tab]').count() == 8, 'oito abas no desktop')
    ok(await p.locator('#secnav .aba-pend').count() == 5, 'ponto de pendência nas abas que faltam')
    await p.click('#aba-rodape .btn.primary'); await p.wait_for_timeout(200)
    ok(await p.evaluate(visiveis) == ['Atributos'], '"Próxima" abre Atributos')
    await p.focus('#aba-atributos'); await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(150)
    ok(await p.evaluate(visiveis) == ['Habilidades'] and await p.evaluate('document.activeElement.id') == 'aba-habilidades', 'seta para a direita troca de aba e leva o foco')
    await p.keyboard.press('End'); await p.wait_for_timeout(150)
    ok(await p.evaluate(visiveis) == ['Notas & experiência'], 'End vai para a última aba')
    await p.click('#aba-vantagens'); await p.wait_for_timeout(150)
    ok(await p.evaluate(visiveis) == ['Vantagens', 'Defeitos'], 'Vantagens e Defeitos na mesma aba')
    await p.click('#modo-ver'); await p.wait_for_timeout(300)
    ok(await p.locator('#secnav a').count() >= 6 and await p.locator('#secnav [role=tab]').count() == 0, 'no modo Ver a barra volta a ser de atalhos')
    await p.click('#modo-editar'); await p.wait_for_timeout(300)
    ok(await p.evaluate(visiveis) == ['Vantagens', 'Defeitos'], 'voltar para Editar mantém a aba')

async def rolagem_e_foco(p):
    print('Rolagem, foco e redesenho parcial')
    await nova(p)
    await p.click('#aba-atributos'); await p.wait_for_timeout(200)
    await p.evaluate('window.scrollTo(0, 120)')
    y0 = await p.evaluate('scrollY')
    outro = await p.evaluate_handle(f"document.querySelector('{dot('vigor', 1)}')")
    for k, i in [('forca', 4), ('destreza', 3), ('carisma', 3), ('inteligencia', 2)]:
        await p.click(dot(k, i)); await p.wait_for_timeout(80)
    ok(await p.evaluate('scrollY') == y0, f'clicar nas bolinhas não rola a página ({y0} → {await p.evaluate("scrollY")})')
    ok(await p.evaluate(f"document.activeElement.matches('{dot('inteligencia', 2)}')"), 'o foco fica na bolinha clicada')
    ok(await outro.evaluate('e => e.isConnected'), 'as bolinhas que não mudaram são o mesmo elemento (morph, não innerHTML)')
    ok(await p.evaluate('VISTA.ficha === true'), 'a folha do modo Ver não é montada enquanto se edita')
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    ok(await p.evaluate('VISTA.ficha === false'), 'antes de imprimir a folha é montada')
    await p.click(dot('vigor', 2)); await p.wait_for_timeout(80)
    await p.click('#modo-ver'); await p.wait_for_timeout(300)
    forca = await p.evaluate("[...document.querySelectorAll('#sheet .sh-line')].find(l => /^Força/.test(l.textContent)).querySelectorAll('.pips i.on').length")
    ok(forca == 4, 'ao abrir Ver, a folha mostra o valor atual (Força 4)')
    # tempo de um clique: o redesenho de agora × o de antes (as três vistas inteiras por innerHTML),
    # com a CPU normal e 4× mais lenta (perto de um celular médio)
    cdp = await p.context.new_cdp_session(p)
    t = []
    for lento in (1, 4):
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': lento})
        t.append(await p.evaluate("""() => {
          uiTrocarModo('editar');
          const medir = () => { const t0 = performance.now(); for (let i = 0; i < 15; i++) { render(); document.body.offsetHeight; } return (performance.now() - t0) / 15; };
          const novo = medir();
          const m0 = morph, g0 = garantirVistas;
          morph = (a, h) => { a.innerHTML = h; }; garantirVistas = () => { VISTA.tudo = true; montarMain(); montarFicha(); };
          const antigo = medir();
          morph = m0; garantirVistas = g0; render();
          return [novo, antigo]; }"""))
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    ok(all(n < a for n, a in t), 'o redesenho novo é mais rápido que o antigo')
    print(f'       por clique: {t[0][0]:.1f} ms agora × {t[0][1]:.1f} ms antes; CPU 4× mais lenta: {t[1][0]:.1f} ms × {t[1][1]:.1f} ms')

async def desfazer(p):
    print('Desfazer e refazer')
    await nova(p)
    ok(await p.is_disabled('#btn-hist-desfazer') and await p.is_disabled('#btn-hist-refazer'), 'botões começam desligados')
    await p.click('#aba-atributos')
    await p.click(dot('forca', 3)); await p.click(dot('destreza', 4)); await p.wait_for_timeout(100)
    atr = lambda: p.evaluate('[S.atr.forca, S.atr.destreza]')
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(100)
    ok(await atr() == [3, 1], 'Ctrl+Z desfaz a última bolinha')
    await p.click('#btn-hist-desfazer'); await p.wait_for_timeout(100)
    ok(await atr() == [1, 1] and await p.is_disabled('#btn-hist-desfazer'), 'o botão desfaz a anterior e desliga no começo')
    await p.keyboard.press('Control+Shift+z'); await p.wait_for_timeout(100)
    ok(await atr() == [3, 1], 'Ctrl+Shift+Z refaz')
    await p.keyboard.press('Control+y'); await p.wait_for_timeout(100)
    ok(await atr() == [3, 4] and await p.is_disabled('#btn-hist-refazer'), 'Ctrl+Y refaz a seguinte')
    await p.click('#btn-hist-desfazer'); await p.wait_for_timeout(100)
    await p.click(dot('vigor', 5)); await p.wait_for_timeout(100)
    ok(await p.is_disabled('#btn-hist-refazer'), 'mudar depois de desfazer apaga o "refazer"')
    # digitação seguida vira um passo só; Ctrl+Z dentro do campo é do navegador
    await p.click('#aba-identidade'); await p.click('#f-nome'); await p.keyboard.type('Lucia', delay=40); await p.wait_for_timeout(100)
    vigor = await p.evaluate('S.atr.vigor')
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(100)
    ok(await p.evaluate('S.atr.vigor') == vigor and await p.evaluate('document.activeElement.id') == 'f-nome', 'Ctrl+Z dentro do campo fica com o navegador (não desfaz a ficha)')
    await p.fill('#f-nome', ''); await p.keyboard.type('Lucia', delay=40); await p.wait_for_timeout(1500)
    await p.click('#aba-identidade'); await p.wait_for_timeout(50)
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(150)
    ok(await p.evaluate('S.meta.nome') == '' and await p.input_value('#f-nome') == '', 'digitar "Lucia" de uma vez desfaz num passo só')
    await p.keyboard.press('Control+Shift+z'); await p.wait_for_timeout(150)
    ok(await p.evaluate('S.meta.nome') == 'Lucia', 'e refaz')
    # o desfeito é o que fica salvo
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(150)
    await p.reload(); await p.wait_for_timeout(900)
    ok(await p.evaluate('S.meta.nome') == '', 'o estado desfeito é o que fica guardado no navegador')
    ok(await p.is_disabled('#btn-hist-desfazer'), 'outra ficha (ou recarregar) começa um histórico novo')
    # leitura: sem desfazer
    await p.click('#modo-ver'); await p.wait_for_timeout(200)
    ok(await p.locator('#btn-hist-desfazer').is_visible(), 'desfazer também no modo Ver (dano, Fome…)')

async def importada(p):
    print('Ficha importada')
    await p.goto(SITE + '#/fichas'); await p.wait_for_timeout(400)
    await p.click('#tela-fichas .pg-h [data-acao=importar]')
    await p.set_input_files('#arquivo-importar', os.path.join(FX, 'foundry.json'))
    await p.wait_for_selector('#dlg-conferir[open]', timeout=15000)
    await p.click('#imp-criar'); await p.wait_for_timeout(700)
    ok((await p.text_content('#validacao')).strip() == 'Ficha importada', 'faixa diz "Ficha importada", sem contar avisos')
    vistos = 0
    for aba in ['atributos', 'habilidades', 'disciplinas', 'vantagens']:
        await p.click('#aba-' + aba); await p.wait_for_timeout(80); vistos += await p.evaluate(VIS_CSTATUS)
    ok(vistos == 0, 'nenhuma aba mostra linha de criação')
    ok(await p.locator('#secnav .aba-pend').count() == 0 and await p.evaluate(VIS_CSTATUS) == 0, 'sem pontos de pendência nem linhas de criação')
    ok(await p.locator('#col-rail button[data-act="regras-criacao"]').count() == 1, 'lateral oferece "Conferir com as regras de criação"')
    await p.click('#col-rail button[data-act="regras-criacao"]'); await p.wait_for_timeout(200)
    ok('Criação' in await p.text_content('#validacao') and await p.evaluate(VIS_CSTATUS) > 0, 'ao pedir, as regras voltam a ser conferidas')
    await p.click('#col-rail button[data-act="regras-criacao"]'); await p.wait_for_timeout(200)
    ok((await p.text_content('#validacao')).strip() == 'Ficha importada', '"Parar de conferir" volta ao normal')
    await p.click('#btn-sortear'); await p.wait_for_timeout(500)
    ok('Criação' in await p.text_content('#validacao'), 'sortear de novo faz dela uma ficha comum')

async def celular(p):
    print('Celular')
    await nova(p)
    ok(await p.locator('#secnav [role=tab]').count() == 9 and not await p.locator('#col-rail').is_visible(), 'aba "Vitais e resumo" e lateral escondida')
    await p.click('#validacao'); await p.wait_for_timeout(300)
    ok(await p.locator('#col-rail').is_visible() and await p.evaluate(visiveis) == [], '"Base de criação" abre a aba de resumo')

BASE_VALIDA = """() => {
  S.meta.nome = 'Teste'; S.meta.cla = 'Brujah'; S.meta.predador = 'Vira-lata'; S.meta.geracao = 12;
  Object.assign(S.atr, {forca:4, destreza:3, vigor:3, carisma:3, manipulacao:2, autocontrole:2, inteligencia:2, raciocinio:2, determinacao:1});
  Object.keys(S.hab).forEach(k => S.hab[k] = 0);
  Object.assign(S.hab, {briga:3, intimidacao:3, atletismo:3, manha:2, furtividade:2, conducao:2, armasbrancas:2, lideranca:2, prontidao:1, persuasao:1, labia:1, perspicacia:1, etiqueta:1, politica:1, ocultismo:1});
  S.distribHab = 'balanceado'; Object.keys(S.esp).forEach(k => S.esp[k] = ''); S.esp.briga = 'Agarrões'; S.esp.intimidacao = 'Assaltos';
  S.disc = [{nome:'Potência', nivel:2, poderes:['Golpe Letal','Proeza'], rituais:''}, {nome:'Presença', nivel:1, poderes:['Deslumbrar'], rituais:''}, {nome:'Celeridade', nivel:1, poderes:['Graça Felina'], rituais:''}];
  S.vant = [{nome:'Contatos', pontos:3, nota:'', fonte:'user'}, {nome:'Recursos', pontos:2, nota:'', fonte:'user'}, {nome:'Refúgio', pontos:2, nota:'', fonte:'user'}];
  S.def = [{nome:'Inimigo', pontos:2, nota:'', fonte:'user'}];
  S.xpTotal = 0; S.xpGasto = 0; S.xpCompras = []; render(); }"""
chip = lambda p: p.evaluate("document.getElementById('validacao').textContent")

async def experiencia(p):
    print('Criação + experiência')
    await nova(p)
    await p.evaluate(BASE_VALIDA); await p.wait_for_timeout(100)
    ok('tudo certo' in await chip(p), 'ficha de criação válida: tudo certo')
    # subir à mão, sem registrar: Destreza 3→4 (20), Briga 3→4 (12), Ocultismo 1→2 (6), Fortitude nova (7), uma Vantagem (3) = 48
    await p.evaluate("""() => { S.atr.destreza = 4; S.hab.briga = 4; S.hab.ocultismo = 2;
      S.disc.push({nome:'Fortitude', nivel:1, poderes:['Resiliência'], rituais:''}); S.vant[0].pontos = 4; S.xpTotal = 70; render(); }""")
    x = await p.evaluate('orcamentoXP()')
    ok(x['atr']['xp'] == 20 and x['hab']['xp'] == 18 and x['vant']['xp'] == 3, f'custos pela tabela do livro (Atributos {x["atr"]["xp"]}, Habilidades {x["hab"]["xp"]}, Vantagens {x["vant"]["xp"]})')
    ok(x['disc']['xp'] == 7, f'Disciplinas: Celeridade é o ponto do Tipo de Predador; só Fortitude, de fora do clã, custa ×7 = 7 ({x["disc"]["xp"]})')
    ok((await chip(p)).strip() == 'Criação: 1 pendência', 'pontos acima da criação viram uma pendência só: o XP fora do gasto')
    await p.click('#aba-atributos'); await p.wait_for_timeout(80)
    ok('equivalem a 20 XP' in await p.evaluate(f"[...document.querySelectorAll('.cstatus')].filter(e => e.offsetParent).map(e => e.textContent).join()"), 'Atributos dizem "equivalem a 20 XP", não "falta/sobra"')
    ok(await p.locator('#aba-notas .aba-pend').count() == 1 and await p.locator('#aba-atributos .aba-pend').count() == 0, 'a pendência vai para Notas e XP')
    await p.click('#aba-notas'); await p.click('#col-main [data-act="xp-implicito"]'); await p.wait_for_timeout(200)
    ok(await p.evaluate('[S.xpTotal, S.xpGasto]') == [70, 48] and 'tudo certo' in await chip(p), '"Contar 48 XP como gastos": disponível 22 e tudo certo')
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(150)
    ok(await p.evaluate('S.xpGasto') == 0, 'dá para desfazer')
    await p.evaluate("() => { S.xpTotal = 0; render(); }")
    await p.click('#aba-notas')
    ok('Registrar 48 XP (total e gasto)' in await p.text_content('#col-main [data-act="xp-implicito"]'), 'sem XP total, oferece registrar total e gasto')
    await p.evaluate("() => { S.atr.forca = 3; S.atr.destreza = 3; render(); }")
    await p.click('#aba-atributos'); await p.wait_for_timeout(80)
    ok(await p.locator('#aba-atributos .aba-pend').count() == 1 and 'Falta 1 Atributo com 4' in await p.evaluate("[...document.querySelectorAll('.cstatus')].filter(e => e.offsetParent).map(e => e.textContent).join()"), 'falta de verdade (nenhum Atributo em 4) continua aviso')
    # fichas sorteadas, de todas as idades: experiência registrada pelo sorteio, sem aviso falso
    r = await p.evaluate("""() => { let ruins = []; for (const mar of Object.keys(MAR_DO_TEMPO)) for (let i = 0; i < 4; i++) {
        S.forja = novaForja(); S.forja.mar = mar; S.sistema = 'vampiro'; sortear();
        if (!/tudo certo/.test(document.getElementById('validacao').textContent)) ruins.push(mar); }
      for (let i = 0; i < 4; i++) { S.forja = novaForja(); S.forja.sistema = 'cacador'; S.sistema = 'cacador'; sortear();
        if (!/tudo certo/.test(document.getElementById('validacao').textContent)) ruins.push('cacador'); }
      return ruins; }""")
    ok(not r, f'fichas sorteadas de todas as idades e de Caçador saem "tudo certo" ({r})')

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        c = await b.new_context(viewport={'width': 1280, 'height': 860}); p = await c.new_page()
        erros = []; p.on('pageerror', lambda e: erros.append(str(e)))
        await p.goto(SITE); await p.wait_for_timeout(800)
        await abas(p); await rolagem_e_foco(p); await desfazer(p); await importada(p); await experiencia(p)
        cm = await b.new_context(viewport={'width': 390, 'height': 844}); pm = await cm.new_page()
        pm.on('pageerror', lambda e: erros.append(str(e)))
        await pm.goto(SITE); await pm.wait_for_timeout(800)
        await celular(pm)
        ok(not erros, 'sem erros de JavaScript ' + str(erros))
        await b.close()
    print('\n' + ('TUDO OK' if not falhas else f'{len(falhas)} FALHA(S)'))
    raise SystemExit(1 if falhas else 0)

asyncio.run(main())
