"""Na mesa e criação: dano progressivo (superficial/agravado), Teste de Fome, cartões de poder
com anotações e os avisos de distribuição de pontos. Sem conta.
Requer o site servido em E2E_SITE (padrão http://localhost:8765/; `node servidor.js` serve em 4777)."""
import asyncio, os
from playwright.async_api import async_playwright

SITE = os.environ.get('E2E_SITE', 'http://localhost:8765/')
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

async def nova(p, inicio='branco'):
    await p.goto(SITE + '#/fichas'); await p.wait_for_timeout(500)
    await p.click('#tela-fichas .pg-h [data-acao=nova]')
    await p.check('input[name=sistema][value=vampiro]'); await p.check(f'input[name=inicio][value={inicio}]')
    await p.click('#form-nova button[value=criar]'); await p.wait_for_timeout(700)

STATUS = "[...document.querySelectorAll('.cstatus')].filter(e => e.offsetParent).map(e => e.textContent).join(' ')"
dot = lambda k, i: f'#col-main [data-dot="atr.{k}"][data-i="{i}"]'
RAIL = '#col-rail [data-mesa]'

async def distribuicao(p):
    print('Distribuição de pontos')
    await nova(p)
    await p.click('#aba-atributos'); await p.wait_for_timeout(150)
    t = await p.evaluate(STATUS)
    ok('Faltam 1 Atributo com 4, 3 com 3 e 4 com 2.' in t, 'ficha em branco: diz o que falta em português, sem "sobra 8× 1"')
    rail = await p.evaluate("[...document.querySelectorAll('#col-rail .budget .bline')].map(e => e.textContent.replace(/\\s+/g, ' ').trim())")
    ok(not any('sobra' in r for r in rail), 'a lateral também não fala em "sobra"')
    await p.click(dot('forca', 4)); await p.click(dot('destreza', 4)); await p.wait_for_timeout(100)
    t = await p.evaluate(STATUS)
    ok('2 Atributos com 4: a criação permite só um.' in t, 'dois Atributos em 4: aponta o excesso')
    await p.evaluate("() => { S.atr = {forca:4, destreza:3, vigor:3, carisma:3, manipulacao:2, autocontrole:2, inteligencia:2, raciocinio:2, determinacao:5}; render(); }")
    t = await p.evaluate(STATUS)
    ok('XP' not in t and 'máximo é 4' in t, f'sem XP registrado, Determinação 5 é erro de criação, não "XP acima da criação" ({t.strip()[:90]})')
    ok(await p.locator('.medidor .md-g[data-estado=over]').count() >= 1, 'o medidor marca o nível que passou')
    await p.click('#aba-notas'); await p.wait_for_timeout(100)
    ok(await p.locator('#col-main [data-act="xp-implicito"]').count() == 1, 'Notas e XP oferece registrar como experiência')

async def dano(p):
    print('Dano progressivo')
    await nova(p)
    await p.evaluate("() => { S.atr.vigor = 2; render(); }")  # Vitalidade 5
    b = lambda n, tipo, d: f'{RAIL} [data-act=dano][data-trilha={n}][data-tipo={tipo}][data-d="{d}"]'
    q = lambda n, d: f'{RAIL} [data-act=dano-qtd][data-trilha={n}][data-d="{d}"]'
    ordem = await p.evaluate("[...document.querySelectorAll('#col-rail [data-mesa] .qtd button')].slice(0, 2).map(b => b.dataset.d)")
    ok(ordem == ['1', '-1'], f'no seletor de quantidade, o + vem em cima ({ordem})')
    for _ in range(3): await p.click(q('saude', 1))
    await p.click(b('saude', 'sup', 1))
    ok(await p.evaluate('[S.saude.sup, S.saude.agg]') == [2, 0], 'vampiro: 4 superficiais viram 2 (metade, arredondada para cima)')
    await p.click(f'{RAIL} [data-act=dano-metade]')
    for _ in range(2): await p.click(q('saude', 1))
    await p.click(b('saude', 'sup', 1))
    ok(await p.evaluate('[S.saude.sup, S.saude.agg]') == [5, 0], 'sem a metade: 3 superficiais entram inteiros e enchem a trilha')
    ok('Debilitado' in await p.inner_text(f'{RAIL} .vital-dano'), 'trilha cheia: Debilitado')
    await p.click(b('saude', 'sup', 1))
    ok(await p.evaluate('[S.saude.sup, S.saude.agg]') == [4, 1], 'trilha cheia: superficial novo vira agravado')
    await p.click(b('saude', 'agg', -1))
    ok(await p.evaluate('[S.saude.sup, S.saude.agg]') == [4, 0], 'curar agravado')
    await p.click(b('vontade', 'agg', 1))
    ok(await p.evaluate('S.vontade.agg') == 1, 'Força de Vontade aceita agravado')
    ok(await p.evaluate('S.registroMesa.length') >= 4, 'cada marca entra no registro da cena')
    await p.click('#modo-ver'); await p.wait_for_timeout(300)
    ok(await p.locator('#mesa [data-act=dano]').count() >= 8, 'os mesmos controles aparecem em Jogar (Na mesa)')

async def fome(p):
    print('Teste de Fome')
    await nova(p)
    await p.evaluate("Math.random = () => 0.05")  # dado 1: falha
    await p.click(f'{RAIL} [data-act=teste-fome]'); await p.wait_for_timeout(100)
    ok(await p.evaluate('S.fome') == 2, 'falhou: Fome sobe')
    await p.evaluate("Math.random = () => 0.95")  # dado 10: passa
    await p.click(f'{RAIL} [data-act=teste-fome]'); await p.wait_for_timeout(100)
    ok(await p.evaluate('S.fome') == 2, 'passou: Fome fica')
    await p.evaluate("() => { S.fome = 5; render(); }")
    ok(await p.locator(f'{RAIL} [data-act=teste-fome]').is_disabled(), 'com Fome 5 o botão fica desligado')

async def poderes(p):
    print('Cartões de poder')
    await nova(p)
    await p.evaluate("() => { S.meta.cla = 'Brujah'; S.disc = [{nome:'Potência', nivel:2, poderes:['Corpo Letal'], rituais:''}, {nome:'Celeridade', nivel:1, poderes:[], rituais:''}]; render(); }")
    await p.click('#aba-disciplinas'); await p.wait_for_timeout(150)
    ok(await p.locator('#col-main .pw-card').count() == 1, 'o poder escolhido vira cartão')
    ok(await p.locator('#col-main details.pw-escolher[open]').count() >= 1, 'faltando poder, a lista para escolher já vem aberta')
    txt = await p.evaluate("document.body.innerText")
    ok('Provocaç' not in txt, 'nenhum "Provocação" na tela')
    await p.fill('#col-main .pw-card textarea', 'Soco que racha concreto.'); await p.wait_for_timeout(100)
    ok('Soco que racha concreto.' in await p.evaluate("JSON.stringify(S.notasPoder)"), 'anotação do poder salva na ficha')
    await p.click('#modo-ver'); await p.wait_for_timeout(300)
    ok(await p.locator('#sheet .pw-card').count() == 1 and 'Soco que racha concreto.' in await p.inner_text('#sheet .pw-card'), 'Jogar mostra o cartão com a anotação')
    ok(await p.locator('#sheet .pw-card dl.pw-mec dt').count() >= 1, 'cartão traz custo/parada/duração')
    ok(await p.locator('#sheet .pw-card .pw-sis').count() == 1, 'cartão explica como o poder funciona')
    await p.click('#modo-editar'); await p.wait_for_timeout(200)
    await p.evaluate("() => { S.disc = [{nome:'Dominação', nivel:1, poderes:['Compelir'], rituais:''}]; render(); }")
    await p.click('#aba-disciplinas'); await p.wait_for_timeout(150)
    res = await p.inner_text('#col-main .pw-card .pw-res')
    ok('Inteligência + Determinação' in res and 'desprevenido' in res, 'Compelir diz quem resiste e como')
    ok(await p.locator('#col-main .disc-regras li').count() >= 5, 'Dominação traz as regras gerais (olhar, geração, falha total…)')
    ok(await p.evaluate("Object.values(DISCIPLINAS).every(d => d.poderes.every(p => p.sis))"), 'todo poder do catálogo tem sistema')
    ok(await p.locator('#col-main .pw-escolher .pw-l-sis').count() >= 1, 'a lista de escolha também mostra o sistema')

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        c = await b.new_context(viewport={'width': 1280, 'height': 860}); p = await c.new_page()
        erros = []; p.on('pageerror', lambda e: erros.append(str(e)))
        for t in (distribuicao, dano, fome, poderes): await t(p)
        ok(not erros, f'sem erros de JavaScript ({erros[:2]})')
        await b.close()
    print('\nTUDO OK' if not falhas else f'\nFALHAS: {falhas}')

asyncio.run(main())
