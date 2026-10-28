"""Edição direta contabilizada pela tabela de XP, devoluções, avisos que somem.
Ficha de criação completa (Brujah) montada no próprio teste. Sem conta.
Requer o site servido em E2E_SITE (padrão http://localhost:8765/; `node servidor.js` serve em 4777)."""
import asyncio, os
from playwright.async_api import async_playwright

SITE = os.environ.get('E2E_SITE', 'http://localhost:8765/')
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

MONTAR = """() => {
  S.meta.cla = 'Brujah'; S.meta.predador = ''; S._pred = null; S.mar = '';
  const ka = ATRIBUTOS.flatMap(g => g.itens.map(i => i[0])), va = [4,3,3,3,2,2,2,2,1];
  ka.forEach((k, i) => S.atr[k] = va[i]);
  const kh = HABILIDADES.flatMap(g => g.itens.map(i => i[0])), vh = multiconjunto(DISTRIB_HABILIDADES[S.distribHab].mapa).sort((a, b) => b - a);
  kh.forEach((k, i) => S.hab[k] = vh[i] || 0);
  S.esp = {};
  const gr = 1 + ESPECIALIDADE_GRATIS.filter(k => S.hab[k] > 0).length;
  const comPts = kh.filter(k => S.hab[k] > 0);
  for (let i = 0; i < gr; i++) S.esp[comPts[i]] = 'Esp' + i;
  S.disc = [{nome:'Celeridade', nivel:2, poderes:['Graça Felina','Ligeireza'], rituais:''}, {nome:'Potência', nivel:1, poderes:['Corpo Letal'], rituais:''}];
  S.vant = [{nome:'Recursos', pontos:3, nota:'', fonte:'user'}, {nome:'Aliados', pontos:4, nota:'', fonte:'user'}];
  S.xpTotal = 50; S.xpGasto = 0; S.xpCompras = []; S.xpLog = [];
  render();
  return [orcamento().atr.ok, orcamento().hab.ok, criacaoFechada('atr'), criacaoFechada('hab'), criacaoFechada('disc'), criacaoFechada('vant'), criacaoFechada('esp')];
}"""
G = "[S.xpTotal, S.xpGasto, S.xpCompras.length]"

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await (await b.new_context(viewport={'width': 1300, 'height': 900})).new_page()
        await pg.route(lambda u: 'fonts.g' in u, lambda r: r.abort())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(SITE + '#/fichas'); await pg.wait_for_timeout(500)
        await pg.click('#tela-fichas .pg-h [data-acao=nova]'); await pg.check('#form-nova input[value=branco]')
        await pg.click('#form-nova button[value=criar]'); await pg.wait_for_timeout(500)
        fechada = await pg.evaluate(MONTAR)
        ok(all(fechada), f'ficha de criação completa montada {fechada}')
        ultimo = await pg.evaluate("ATRIBUTOS.flatMap(g => g.itens.map(i => i[0]))[8]")   # o Atributo em 1
        quatro = await pg.evaluate("ATRIBUTOS.flatMap(g => g.itens.map(i => i[0]))[0]")   # o Atributo em 4
        dot = lambda p, i: f'#col-main [data-dot="{p}"][data-i="{i}"]'
        toasts_xp = "document.querySelectorAll('#avisos .aviso[data-grupo=xp]').length"

        print('Atributos e Habilidades')
        await pg.click('#aba-atributos'); await pg.wait_for_timeout(150)
        await pg.click(dot('atr.' + ultimo, 2)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate(G) == [50, 10, 1], 'criação fechada: subir 1 → 2 cobra 10 pela tabela')
        ok(await pg.evaluate("S.xpCompras[0].direto === true && S.xpCompras[0].para === 2"), 'a compra fica registrada como edição direta')
        await pg.click(dot('atr.' + ultimo, 3)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate(G) == [50, 25, 2], 'subir 2 → 3 cobra mais 15')
        ok(await pg.evaluate(toasts_xp) == 1, 'um aviso de XP por vez: o novo substitui o anterior')
        ok(await pg.locator(dot('atr.' + ultimo, 2) + '.xp').count() == 1, 'os pontos comprados ficam dourados')
        await pg.click(dot('atr.' + ultimo, 1)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate(G) == [50, 0, 0] and await pg.evaluate(f"S.atr.{ultimo}") == 1, 'baixar para 1 devolve os 25')
        ok(await pg.evaluate("orcamento().atr.ok"), 'e a criação continua certa')

        await pg.evaluate("S.xpTotal = 5; render()")
        await pg.click(dot('atr.' + quatro, 5)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate(f"S.atr.{quatro}") == 4 and await pg.evaluate(G) == [5, 0, 0], 'sem XP bastante (25 > 5), nada muda')
        btn = pg.locator('#avisos .aviso[data-grupo=xp] [data-aviso-acao="0"]')
        ok('Comprar assim mesmo' in await pg.inner_text('#avisos .aviso[data-grupo=xp]'), 'e também comprar assim mesmo')
        ok('Registrar 20 XP e comprar' in await btn.inner_text(), 'o aviso oferece registrar o que falta')
        await btn.click(); await pg.wait_for_timeout(200)
        ok(await pg.evaluate(f"S.atr.{quatro}") == 5 and await pg.evaluate(G) == [25, 25, 1], 'registrou 20 e comprou 4 → 5')
        ok(await pg.evaluate("S.xpLog.length == 1 && S.xpLog[0].tipo == 'ganho' && S.xpLog[0].xp == 20"), 'o ganho entrou no livro')
        await pg.click(dot('atr.' + quatro, 4)); await pg.wait_for_timeout(150)
        await pg.evaluate("S.xpTotal = 50; S.xpLog = []; render()")

        await pg.click('#aba-habilidades'); await pg.wait_for_timeout(150)
        zero = await pg.evaluate("HABILIDADES.flatMap(g => g.itens.map(i => i[0])).find(k => !S.hab[k])")
        antes = await pg.evaluate("S.xpGasto")
        await pg.click(dot('hab.' + zero, 1)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == antes + 3, 'Habilidade 0 → 1 cobra 3')
        await pg.click(dot('hab.' + zero, 1)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == antes, 'clicar de novo no mesmo ponto devolve')

        print('Criação aberta não cobra')
        await pg.click('#aba-atributos'); await pg.wait_for_timeout(150)
        tres = await pg.evaluate("ATRIBUTOS.flatMap(g => g.itens.map(i => i[0]))[1]")
        dois = await pg.evaluate("ATRIBUTOS.flatMap(g => g.itens.map(i => i[0]))[4]")
        g0 = await pg.evaluate("S.xpGasto")
        await pg.click(dot('atr.' + tres, 2)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 and not await pg.evaluate("orcamento().atr.ok"), 'baixar um ponto da criação abre a criação, sem XP')
        await pg.click(dot('atr.' + dois, 3)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 and await pg.evaluate("orcamento().atr.ok"), 'com a criação aberta, subir é criação: troca feita sem cobrar')

        await pg.evaluate("S.xpTotal = 0; S.xpGasto = 0; S.xpCompras = []; S.xpLog = []; render()")
        await pg.click(dot('atr.' + ultimo, 2)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate(G) == [0, 0, 0] and await pg.evaluate(f"S.atr.{ultimo}") == 2, 'ficha sem XP registrado: edição direta é criação, não cobra')
        await pg.click(dot('atr.' + ultimo, 2)); await pg.wait_for_timeout(100)
        await pg.evaluate("S.xpTotal = 50; render()")

        print('Disciplinas, Vantagens, Especializações')
        await pg.click('#aba-disciplinas'); await pg.wait_for_timeout(150)
        g0 = await pg.evaluate("S.xpGasto")
        await pg.select_option('#add-disc', 'Presença'); await pg.click('[data-act=add-disc]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 + 5 and await pg.evaluate("S.xpCompras.some(c => c.tipo == 'disc' && c.k == 'Presença' && c.de == 0)"), 'Disciplina nova do clã: 1 × 5 = 5')
        await pg.click(dot('disc.2.nivel', 2)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 + 15, 'Presença 1 → 2: mais 10')
        await pg.click('#col-main [data-act=rm-disc][data-i="2"]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 and not await pg.evaluate("S.disc.some(d => d.nome == 'Presença')"), 'tirar a Disciplina devolve os 15')

        await pg.click('#aba-vantagens'); await pg.wait_for_timeout(150)
        g0 = await pg.evaluate("S.xpGasto")
        await pg.click(dot('vant.0.pontos', 4)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 + 3, 'Vantagem 3 → 4: 3 XP')
        await pg.click(dot('vant.0.pontos', 4)); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 and await pg.evaluate("S.vant[0].pontos") == 3, 'baixar devolve')
        nome = await pg.evaluate("el('add-vant').value")
        await pg.click('[data-act=add-vant]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 + 3, f'Vantagem nova ({nome}): 3 XP')
        await pg.click('#col-main [data-act=rm][data-t=vant][data-i="2"]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 and await pg.evaluate("S.vant.length") == 2, 'tirar a Vantagem devolve')

        await pg.click('#aba-especializacoes'); await pg.wait_for_timeout(150)
        g0 = await pg.evaluate("S.xpGasto")
        k = await pg.evaluate("el('add-esp-hab').value")
        await pg.fill('#add-esp-txt', 'Nova'); await pg.click('[data-act=add-esp]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0 + 3, 'Especialização além das grátis: 3 XP')
        i = await pg.evaluate(f"listaEsp('{k}').indexOf('Nova')")
        await pg.click(f'#col-main [data-act=rm-esp][data-k="{k}"][data-i="{i}"]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == g0, 'tirar a Especialização comprada devolve')

        print('Avisos e conta')
        await pg.click('#aba-atributos'); await pg.wait_for_timeout(150)
        await pg.click(dot('atr.' + ultimo, 2)); await pg.wait_for_timeout(150)
        ok(await pg.locator('#avisos .aviso[data-versao]').count() == 1, 'aviso com Desfazer depois da compra')
        await pg.click('#aba-identidade'); await pg.wait_for_timeout(100)
        await pg.fill('#f-nome', 'Teste'); await pg.wait_for_timeout(1400)
        ok(await pg.locator('#avisos .aviso[data-versao]').count() == 0, 'mexer na ficha depois tira o aviso: o Desfazer não desfaz outra coisa')
        await pg.click('#aba-notas'); await pg.wait_for_timeout(150)
        txt = await pg.inner_text('#col-main .xp-saldo')
        ok('compras 10' in txt and 'no livro' in txt, 'o saldo mostra de onde vem o gasto e o ganho')
        await pg.evaluate("S.xpGasto = 2; render()")
        ok(await pg.locator('#col-main [data-xp=acertar]').count() == 1, 'gasto menor que as compras: oferece acertar')
        await pg.click('#col-main [data-xp=acertar]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == 10 and await pg.locator('#col-main [data-xp=acertar]').count() == 0, 'acertado, o alerta some')
        await pg.evaluate("S.xpTotal = 4; render()")
        await pg.click('#col-main [data-xp=cobrir]'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpTotal") == 10 and await pg.locator('#col-main [data-xp=cobrir]').count() == 0, 'disponível negativo: registrar o que falta, e o alerta some')
        ok(await pg.locator('#col-main .xp-impl').count() == 0, 'sem pendência de XP, o quadro de pendência não aparece')

        print('Campos do saldo')
        await pg.evaluate("S.xpTotal = 20; S.xpGasto = 10; S.xpLog = []; S.xpCompras = [{tipo:'atr',k:'forca',de:1,para:2,custo:8,rot:'x',manual:true,em:new Date().toISOString()}]; render()")
        c = lambda k: f'#col-main [data-xp-campo={k}]'
        await pg.fill(c('ganho'), '25'); await pg.press(c('ganho'), 'Enter'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("[S.xpTotal, S.xpLog.at(-1).tipo, S.xpLog.at(-1).xp]") == [25, 'ganho', 5], 'Ganho 20 → 25 no campo entra no livro como +5')
        await pg.fill(c('gasto'), '12'); await pg.press(c('gasto'), 'Enter'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("[S.xpGasto, S.xpLog.at(-1).tipo, S.xpLog.at(-1).xp]") == [12, 'gasto', 2], 'Gasto 10 → 12 entra como gasto avulso de 2')
        await pg.fill(c('gasto'), '9'); await pg.press(c('gasto'), 'Enter'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("[S.xpGasto, S.xpLog.at(-1).tipo]") == [9, 'volta'], 'Gasto 12 → 9 volta 3 ao disponível')
        await pg.fill(c('disp'), '20'); await pg.press(c('disp'), 'Enter'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("[S.xpTotal, S.xpGasto, xpDisponivel()]") == [29, 9, 20], 'Disponível 16 → 20 ajusta o ganho em +4')
        ok('editado' in await pg.evaluate("S.xpLog.at(-1).nota"), 'a nota diz que foi editado à mão')
        await pg.fill(c('gasto'), '5'); await pg.press(c('gasto'), 'Enter'); await pg.wait_for_timeout(150)
        ok(await pg.evaluate("S.xpGasto") == 5, 'gasto abaixo das compras (8) é gravado: o sistema não limita')
        ok(await pg.locator('#col-main [data-xp=acertar]').count() == 1, 'e o saldo oferece acertar')
        await pg.click('#col-main .xp-alerta [data-act=aceitar]'); await pg.wait_for_timeout(150)
        ok(await pg.locator('#col-main .xp-alerta').count() == 0 and await pg.evaluate("S.xpGasto") == 5, 'A contagem está correta: o alerta some e o número fica')
        ok(await pg.locator('#col-main .xp-aceito').count() == 1, 'fica um "Conferir de novo"')
        await pg.fill(c('gasto'), '6'); await pg.press(c('gasto'), 'Enter'); await pg.wait_for_timeout(150)
        ok(await pg.locator('#col-main [data-xp=acertar]').count() == 1, 'se os números mudam, o aviso volta')

        print('Criação marcada como correta')
        await pg.click('#aba-atributos'); await pg.wait_for_timeout(150)
        await pg.evaluate("S.xpTotal = 0; S.xpGasto = 0; S.xpCompras = []; S.xpLog = []; render()")
        await pg.click(dot('atr.' + quatro, 5)); await pg.wait_for_timeout(150)
        pend = await pg.inner_text('#validacao')
        ok(await pg.locator('#col-main .cstatus [data-act=aceitar][data-sec=atr]').count() == 1, 'régua com erro oferece "A contagem está correta"')
        await pg.click('#col-main .cstatus [data-act=aceitar][data-sec=atr]'); await pg.wait_for_timeout(150)
        ok(await pg.locator('#col-main .cstatus[data-estado=aceito]').count() == 1, 'a régua mostra "Marcado como correto"')
        ok(await pg.inner_text('#validacao') != pend, f'e deixa de contar como pendência ({pend} → {await pg.inner_text("#validacao")})')
        await pg.click('#col-main .cstatus [data-act=desaceitar]'); await pg.wait_for_timeout(150)
        ok(await pg.locator('#col-main .cstatus [data-act=aceitar][data-sec=atr]').count() == 1, 'Conferir de novo traz o aviso de volta')

        ok(not errs, 'sem erros de JS ' + str(errs[:2]))
        await b.close()
    print('\nTUDO OK' if not falhas else f'\nFALHAS: {falhas}')
    raise SystemExit(1 if falhas else 0)

asyncio.run(main())
