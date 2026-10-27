"""Gastar experiência e Especializações, sem conta.
Requer deploy/ servido em http://localhost:8765 (subir.sh). Também confere que o PDF
é baixado só na hora de exportar."""
import asyncio, os
from playwright.async_api import async_playwright
SITE = os.environ.get('E2E_SITE', 'http://localhost:8765/')
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for nome, vw in (('desktop', {'width': 1300, 'height': 900}), ('celular', {'width': 390, 'height': 844})):
            print(nome)
            ctx = await b.new_context(viewport=vw, accept_downloads=True)
            pg = await ctx.new_page(); errs = []; pedidos = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('request', lambda r: pedidos.append(r.url))
            await pg.goto(SITE); await pg.wait_for_timeout(600)
            ok(not any('/pdf/' in u for u in pedidos), 'a página abre sem baixar o modelo do PDF')
            await pg.click('#tela-fichas .pg-h [data-acao=nova]'); await pg.check('#form-nova input[value=branco]')
            await pg.click('#form-nova button[value=criar]'); await pg.wait_for_timeout(500)

            # especializações: acrescentar e tirar num quadro próprio
            await pg.evaluate("S.hab.medicina = 2; render()")
            await pg.click("#aba-especializacoes"); await pg.wait_for_timeout(150)
            await pg.select_option('#add-esp-hab', 'medicina')
            await pg.fill('#add-esp-txt', 'Anestésicos'); await pg.click('[data-act=add-esp]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.esp.medicina") == 'Anestésicos', 'especialização acrescentada pelo quadro')
            ok(await pg.evaluate("document.activeElement.id") == 'add-esp-txt', 'o foco volta ao campo para a próxima')
            await pg.fill('#add-esp-txt', 'Autópsias'); await pg.keyboard.press('Tab'); await pg.click('[data-act=add-esp]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.esp.medicina") == 'Anestésicos, Autópsias', 'duas na mesma Habilidade')
            await pg.click('.esp-lista [data-act=rm-esp][data-i="0"]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.esp.medicina") == 'Autópsias', 'tirar uma especialização')
            await pg.click('#modo-ver'); await pg.wait_for_timeout(200)
            ok('Autópsias' in await pg.inner_text('#sheet .sh-esp'), 'a lista aparece no modo Ver')

            # experiência: registrar a sessão, comprar, a validação não acusa, devolver
            await pg.evaluate("S.atr.forca = 2; S.xpTotal = 0; S.xpGasto = 0; S.xpLog = []; render()")
            base = await pg.evaluate("JSON.stringify(orcamento())")
            await pg.click('#btn-ficha-mais'); await pg.click('#menu-ficha [data-acao=xp]'); await pg.wait_for_selector('#dlg-xp[open]')
            ok(await pg.locator('#dlg-xp .xp-tab tbody tr').count() == 10, 'tabela de custos com as 10 linhas')
            await pg.fill('#xp-ganho', '20'); await pg.fill('#xp-nota', 'Sessão 1'); await pg.click('[data-xp=ganhar]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.xpTotal") == 20, 'ganhar XP soma ao total')
            ok(await pg.evaluate("S.xpLog.length == 1 && S.xpLog[0].nota == 'Sessão 1'"), 'o ganho entra no livro com a nota')
            ok('Sessão 1' in await pg.inner_text('#dlg-xp .xp-livro'), 'o livro mostra a sessão')
            await pg.click('#dlg-xp [data-xp-cat=atr]'); await pg.wait_for_timeout(100)
            bt = pg.locator('#dlg-xp [data-xp=comprar][data-id=forca]')
            ok('15 XP' in await bt.inner_text(), 'Força 2 → 3 custa 15, no próprio botão')
            await bt.click(); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.atr.forca") == 3 and await pg.evaluate("S.xpGasto") == 15, 'compra aplicada e descontada')
            ok(await pg.evaluate("JSON.stringify(orcamento())") == base, 'a Base de criação desconta a compra (não acusa erro)')
            bt = pg.locator('#dlg-xp [data-xp=comprar][data-id=forca]')
            ok(await bt.is_disabled(), 'sem XP suficiente, o botão fica desligado')
            ok('faltam 15' in (await pg.evaluate("document.querySelector('#dlg-xp [data-xp=comprar][data-id=forca]').closest('li').innerText")).lower(), 'e diz quanto falta')
            await pg.click('#dlg-xp .xp-livro [data-xp=devolver]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.atr.forca") == 2 and await pg.evaluate("S.xpGasto") == 0, 'devolver a compra pelo livro')
            await pg.click('#dlg-xp [data-xp-cat=esp]'); await pg.wait_for_timeout(100)
            await pg.fill('#xp-esp-txt', 'Venenos'); await pg.click('[data-xp=esp]'); await pg.wait_for_timeout(150)
            ok('Venenos' in await pg.evaluate("S.esp.medicina") and await pg.evaluate("S.xpGasto") == 3, 'especialização comprada por 3')
            ok(await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'sem rolagem lateral com o diálogo aberto')
            await pg.keyboard.press('Escape')

            # modo Evoluir: comprar e devolver clicando nos pontos
            await pg.evaluate("S.meta.cla = 'Brujah'; S.atr.destreza = 2; S.atr.forca = 2; S.disc = [{nome:'Potência', nivel:1, poderes:['Corpo Letal'], rituais:''}]; S.xpTotal = 60; S.xpGasto = 0; S.xpCompras = []; render()")
            base = await pg.evaluate("JSON.stringify(orcamento())")
            await pg.click('#modo-editar'); await pg.wait_for_timeout(150)
            await pg.click('#btn-evoluir'); await pg.wait_for_timeout(200)
            ok(await pg.locator('#evo-barra:not([hidden])').count() == 1, 'Evoluir liga a barra no rodapé')
            ok(await pg.locator('#col-main .evo-custo').count() >= 9, 'cada Atributo mostra o custo do próximo ponto')
            await pg.click('#col-main [data-dot="atr.destreza"][data-i="4"]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.atr.destreza") == 2, 'clicar no ponto só prepara: nada muda sem confirmar')
            ok('35 XP' in await pg.inner_text('#evo-barra'), 'Destreza 2 → 4 custa 15 + 20 = 35')
            await pg.click('#evo-ok'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("[S.atr.destreza, S.xpGasto, S.xpCompras.length]") == [4, 35, 2], 'confirmar compra os dois níveis, um registro por nível')
            ok(await pg.evaluate("JSON.stringify(orcamento())") == base, 'a Base de criação não acusa a compra')
            await pg.click('#col-main [data-dot="atr.destreza"][data-i="3"]'); await pg.wait_for_timeout(150)
            ok('+20' in await pg.inner_text('#evo-barra'), 'clicar abaixo prepara a devolução de 20')
            await pg.click('#evo-ok'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("[S.atr.destreza, S.xpGasto]") == [3, 15], 'devolução feita')
            await pg.click('#col-main [data-dot="atr.forca"][data-i="1"]'); await pg.wait_for_timeout(150)
            ok('criação' in await pg.inner_text('#evo-barra'), 'ponto da criação não é devolvido como XP')
            ok(await pg.evaluate("S.atr.forca") == 2, 'e não muda')
            await pg.click('#evo-barra [data-evo=cancelar]')
            await pg.click('#col-main [data-dot="atr.forca"][data-i="5"]'); await pg.wait_for_timeout(150)
            ok(await pg.locator('#evo-ok').is_disabled() and 'faltam' in await pg.inner_text('#evo-barra'), 'sem XP: Comprar desligado e diz quanto falta')
            await pg.click('#evo-barra [data-evo=cancelar]')
            await pg.click('#aba-disciplinas'); await pg.wait_for_timeout(150)
            await pg.click('#col-main [data-dot="disc.0.nivel"][data-i="2"]'); await pg.wait_for_timeout(150)
            ok('10 XP' in await pg.inner_text('#evo-barra'), 'Disciplina do clã: 2 × 5 = 10')
            await pg.click('#evo-ok'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.disc[0].nivel") == 2, 'Disciplina sobe')
            ok(await pg.locator('#col-main details.pw-escolher[open]').count() >= 1, 'e a escolha do poder novo já vem aberta')
            ok(await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'sem rolagem lateral no modo Evoluir')
            await pg.click('#evo-barra [data-evo=sair]'); await pg.wait_for_timeout(150)
            ok(await pg.locator('#evo-barra[hidden]').count() == 1 and await pg.locator('#col-main .evo-custo:visible').count() == 0, 'Concluir desliga o modo')
            await pg.click('#col-main [data-dot="disc.0.nivel"][data-i="3"]'); await pg.wait_for_timeout(100)
            ok(await pg.evaluate("[S.disc[0].nivel, S.xpGasto]") == [3, 25], 'fora do modo, o ponto volta a editar direto, sem cobrar')

            # PDF sob demanda
            if nome == 'desktop':
                await pg.evaluate('window.showSaveFilePicker = undefined')
                await pg.click('#btn-exportar')
                async with pg.expect_download() as dl: await pg.click('#menu-exportar [data-acao=pdf]')
                ok((await dl.value).suggested_filename.endswith('.pdf'), 'o PDF sai depois de baixar o modelo')
                ok(any('/pdf/modelo-pdf.js' in u for u in pedidos), 'o modelo foi baixado só agora')
            ok(not errs, 'sem erros de JS ' + str(errs[:2]))
            await ctx.close()
        await b.close()
    print('\nFALHAS:', falhas if falhas else 'nenhuma'); raise SystemExit(1 if falhas else 0)

asyncio.run(main())
