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

            # experiência: ganhar, comprar, a validação não acusa, desfazer
            await pg.evaluate("S.atr.forca = 2; S.xpTotal = 0; S.xpGasto = 0; render()")
            base = await pg.evaluate("JSON.stringify(orcamento())")
            await pg.click('#btn-ficha-mais'); await pg.click('#menu-ficha [data-acao=xp]'); await pg.wait_for_selector('#dlg-xp[open]')
            ok(await pg.locator('#dlg-xp .xp-tab tbody tr').count() == 10, 'tabela de custos com as 10 linhas')
            await pg.fill('#xp-ganho', '20'); await pg.click('[data-xp=ganhar]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.xpTotal") == 20, 'ganhar XP soma ao total')
            await pg.select_option('#xp-item', 'forca')
            ok('15 XP' in await pg.inner_text('#dlg-xp .xp-msg'), 'Força 2 → 3 custa 15')
            await pg.click('[data-xp=comprar]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.atr.forca") == 3 and await pg.evaluate("S.xpGasto") == 15, 'compra aplicada e descontada')
            ok(await pg.evaluate("JSON.stringify(orcamento())") == base, 'a Base de criação desconta a compra (não acusa erro)')
            await pg.select_option('#xp-item', 'forca')
            ok(await pg.locator('[data-xp=comprar]').is_disabled(), 'sem XP suficiente, Comprar fica desligado')
            ok('faltam' in (await pg.inner_text('#dlg-xp .xp-msg')).lower(), 'e diz quanto falta')
            await pg.click('[data-xp=desfazer]'); await pg.wait_for_timeout(150)
            ok(await pg.evaluate("S.atr.forca") == 2 and await pg.evaluate("S.xpGasto") == 0, 'desfazer a última compra')
            await pg.check('#dlg-xp input[name=xp-cat][value=esp]'); await pg.wait_for_timeout(100)
            await pg.fill('#xp-esp-txt', 'Venenos'); await pg.click('[data-xp=comprar]'); await pg.wait_for_timeout(150)
            ok('Venenos' in await pg.evaluate("S.esp.medicina") and await pg.evaluate("S.xpGasto") == 3, 'especialização comprada por 3')
            ok(await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'sem rolagem lateral com o diálogo aberto')
            await pg.keyboard.press('Escape')

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
