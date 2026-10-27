"""Editor de mapa de ponta a ponta: desenhar rua, área, texto e bairro; editar pontos;
apagar com clique e com a borracha; desfazer; e o que o jogador recebe.
Requer API em :3010 e deploy/ servido em :8765 (subir.sh)."""
import asyncio, json, os, time, urllib.request
from playwright.async_api import async_playwright
SITE = os.environ.get('E2E_SITE', 'http://localhost:8765'); API = os.environ.get('E2E_API', 'http://localhost:3010')
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

def api(m, c, t=None, b=None):
    h = {'Content-Type': 'application/json'}
    if t: h['Authorization'] = 'Bearer ' + t
    return json.loads(urllib.request.urlopen(urllib.request.Request(API + c, method=m, headers=h,
        data=json.dumps(b).encode() if b is not None else None)).read())

async def abrir(b, conta, cr, viewport=None):
    ctx = await b.new_context(viewport=viewport or {'width': 1500, 'height': 1000})
    await ctx.add_init_script("localStorage.setItem('ficha-de-sangue:conta', JSON.stringify(%s));" % json.dumps(
        {'api': API, 'token': conta['token'], 'usuario': conta['usuario']}))
    pg = await ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    await pg.goto(SITE + '/mapa/?cronica=' + cr); await pg.wait_for_selector('#districtsLayer .district-g', timeout=15000)
    await pg.wait_for_timeout(500)
    return pg

async def tela(pg, x, y):
    return await pg.evaluate("""([x,y]) => { const s = document.getElementById('mapSvg'); const p = s.createSVGPoint(); p.x = x; p.y = y;
        const q = p.matrixTransform(s.getScreenCTM()); return [q.x, q.y]; }""", [x, y])

async def clicar(pg, x, y):
    sx, sy = await tela(pg, x, y); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(80)

async def zoom(pg, x, y, w):
    await pg.evaluate('([x,y,w]) => window.mapaIrPara(x,y,w)', [x, y, w])
    await pg.wait_for_timeout(120)

async def main():
    sfx = str(int(time.time() * 1000))
    m = api('POST', '/auth/cadastro', b={'email': 'mestre%s@t.com' % sfx, 'senha': 'senha12345', 'nome': 'Mestre'})
    j = api('POST', '/auth/cadastro', b={'email': 'jog%s@t.com' % sfx, 'senha': 'senha12345', 'nome': 'Jogadora'})
    cr = api('POST', '/cronicas', m['token'], {'nome': 'Belmont'})['cronica']
    api('POST', '/cronicas/entrar', j['token'], {'codigo': cr['codigo_convite']})
    api('POST', '/mapa/%s/ativar' % cr['id'], m['token'], {})
    # revela tudo para o jogador enxergar a cidade
    ds = api('GET', '/mapa/%s/districts' % cr['id'], m['token'])
    api('POST', '/mapa/%s/reveal' % cr['id'], m['token'], {'revealed': True, 'items': [{'type': 'district', 'id': d['id']} for d in ds]})

    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        N = await abrir(b, m, cr['id'])
        print('0. a ilha sumiu')
        ok(await N.locator('#districtsLayer [data-id="ilha-do-zwart"]').count() == 0, 'sem o bairro Ilha do Zwart')
        ok('Ilha do Zwart' not in await N.inner_text('#index'), 'nem no índice')

        await N.click('#btnEditMode'); await N.wait_for_timeout(200)
        ok(await N.locator('#editToolbar [data-tool]').count() == 8, 'barra com as ferramentas')
        await zoom(N, 2050, 1150, 520)

        print('1. rua')
        await N.click('[data-tool="linha"]')
        for x, y in [(2100, 1250), (2200, 1265), (2320, 1300)]: await clicar(N, x, y)
        ok('3 pontos' in (await N.inner_text('#detail')).lower(), 'painel conta os pontos')
        await N.keyboard.press('Enter'); await N.wait_for_selector('#tfName')
        await N.select_option('#tfKind', 'avenida'); await N.fill('#tfName', 'Rua das Lanternas')
        await N.click('#tfSave'); await N.wait_for_timeout(500)
        ok(await N.locator('#featuresLayer .feat.f-avenida').count() == 1, 'avenida desenhada')
        ok(await N.locator('#featuresLayer textPath', has_text='Rua das Lanternas').count() == 1, 'nome ao longo da rua')

        print('2. área de água, só para o mestre')
        await N.click('[data-tool="area"]')
        pts = [(2120, 1380), (2220, 1370), (2240, 1450), (2130, 1460)]
        for x, y in pts: await clicar(N, x, y)
        await clicar(N, *pts[0])  # clicar no primeiro ponto fecha
        await N.wait_for_selector('#tfKind')
        await N.select_option('#tfKind', 'agua'); await N.fill('#tfName', 'Lago Negro'); await N.uncheck('#tfRevealed')
        await N.click('#tfSave'); await N.wait_for_timeout(500)
        ok(await N.locator('#featuresLayer .feat.f-agua.f-oculto').count() == 1, 'lago desenhado, marcado como oculto')

        print('3. texto e desfazer')
        await N.click('[data-tool="texto"]'); await clicar(N, 2400, 1220)
        await N.wait_for_selector('#tfName'); await N.fill('#tfName', 'Morro do Enforcado'); await N.fill('#tfTam', '22')
        await N.click('#tfSave'); await N.wait_for_timeout(500)
        ok(await N.locator('#featTextLayer text', has_text='Morro do Enforcado').count() == 1, 'texto no mapa')
        await N.click('#btnUndo'); await N.wait_for_timeout(600)
        ok(await N.locator('#featTextLayer text', has_text='Morro do Enforcado').count() == 0, 'desfazer tira o texto')

        print('4. editar pontos de um traço')
        await N.click('[data-tool="selecionar"]')
        sx, sy = await tela(N, 2200, 1265); await N.mouse.click(sx, sy); await N.wait_for_timeout(300)
        ok(await N.input_value('#tfName') == 'Rua das Lanternas', 'clicar na rua abre o traço')
        await N.click('#tfVert'); await N.wait_for_timeout(200)
        ok(await N.locator('#editLayer .ed-h').count() == 3, 'três alças')
        await N.locator('#editLayer .ed-mid').first.dispatch_event('pointerdown', {'button': 0, 'clientX': 0, 'clientY': 0})
        await N.evaluate("document.dispatchEvent(new PointerEvent('pointerup'))")
        await N.wait_for_timeout(500)
        ok(await N.locator('#editLayer .ed-h').count() == 4, 'clicar no meio cria um ponto')
        await N.wait_for_timeout(400)
        h = N.locator('#editLayer .ed-h').last; bb = await h.bounding_box()
        await N.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await N.mouse.down()
        await N.mouse.move(bb['x'] + 40, bb['y'] + 30, steps=5); await N.mouse.up(); await N.wait_for_timeout(600)
        tr = api('GET', '/mapa/%s/tracos' % cr['id'], m['token'])
        rua = next(t for t in tr if t['name'] == 'Rua das Lanternas')
        ok(len(rua['pts']) == 4 and abs(rua['pts'][-1][0] - 2320) > 5, 'pontos salvos no servidor: %s' % rua['pts'])
        await N.click('#vtFim')

        print('5. apagar uma quadra da base, desfazer')
        await zoom(N, 820, 560, 360)
        await N.click('[data-tool="apagar"]')
        alvo = await N.evaluate("""() => { const els = [...document.querySelectorAll('#blocksLayer [data-k]')];
            const vis = els.find(e => { const r = e.getBoundingClientRect(); const s = document.getElementById('mapSvg').getBoundingClientRect();
              const cx = r.x + r.width/2, cy = r.y + r.height/2;
              if (r.width < 8 || cx < s.x + 300 || cx > s.right - 80 || cy < s.y + 120 || cy > s.bottom - 40) return false;
              const top = document.elementFromPoint(cx, cy); return top === e; });
            if (!vis) return null; const r = vis.getBoundingClientRect(); return { k: vis.getAttribute('data-k'), x: r.x + r.width/2, y: r.y + r.height/2 }; }""")
        ok(bool(alvo), 'achei uma quadra visível para clicar')
        if alvo:
            await N.mouse.move(alvo['x'], alvo['y']); await N.wait_for_timeout(100)
            ok(await N.locator('.del-hover').count() >= 1, 'passar o mouse acende o alvo')
            await N.mouse.click(alvo['x'], alvo['y']); await N.wait_for_timeout(600)
            ok(await N.locator('[data-k="%s"]' % alvo['k']).count() == 0, 'quadra apagada')
            rem = api('GET', '/mapa/%s/cidade' % cr['id'], m['token'])['editor']['removidos']
            ok(alvo['k'] in rem, 'servidor guardou a chave')
            await N.keyboard.press('Control+z'); await N.wait_for_timeout(1200)
            ok(await N.locator('[data-k="%s"]' % alvo['k']).count() == 1, 'Ctrl+Z traz a quadra de volta')

        print('6. borracha')
        antes = await N.locator('#blocksLayer [data-k]').count()
        await N.click('[data-tool="borracha"]')
        for x, y in [(860, 600), (960, 600), (960, 680), (860, 680)]: await clicar(N, x, y)
        await N.keyboard.press('Enter'); await N.wait_for_selector('.confirm-overlay.show')
        txt = await N.inner_text('.confirm-box p')
        ok('quadra' in txt, 'confirmação resume o que sai: ' + txt[:80])
        await N.click('#cdOk'); await N.wait_for_timeout(1000)
        depois = await N.locator('#blocksLayer [data-k]').count()
        ok(depois < antes, 'borracha tirou %d quadras' % (antes - depois))
        removidos_borracha = api('GET', '/mapa/%s/cidade' % cr['id'], m['token'])['editor']['removidos']

        print('7. bairro novo, contorno e nome')
        await N.click('[data-tool="selecionar"]')
        await zoom(N, 2050, 1150, 520)
        await N.click('[data-tool="regiao"]')
        for x, y in [(2300, 1360), (2440, 1360), (2440, 1470), (2300, 1470)]: await clicar(N, x, y)
        await N.keyboard.press('Enter'); await N.wait_for_selector('#nbName')
        await N.fill('#nbName', 'Vila Nova'); await N.select_option('#nbFaction', 'anarch')
        await N.click('#nbSave'); await N.wait_for_timeout(900)
        ok(await N.locator('#districtsLayer [data-id^="bairro-"]').count() == 1, 'bairro desenhado no mapa')
        ok('Vila Nova' in await N.inner_text('#detail'), 'painel do bairro aberto')
        ds = api('GET', '/mapa/%s/districts' % cr['id'], m['token']); vila = next(d for d in ds if d['name'] == 'Vila Nova')
        ok(vila['custom'] and len(vila['geom']) == 4 and vila['faction'] == 'anarch', 'bairro salvo com contorno')
        await N.click('#dcPontos'); await N.wait_for_timeout(200)
        h = N.locator('#editLayer .ed-h').first; bb = await h.bounding_box()
        await N.mouse.move(bb['x'] + 5, bb['y'] + 5); await N.mouse.down(); await N.mouse.move(bb['x'] - 30, bb['y'] - 20, steps=4); await N.mouse.up()
        await N.wait_for_timeout(700)
        vila2 = next(d for d in api('GET', '/mapa/%s/districts' % cr['id'], m['token']) if d['id'] == vila['id'])
        ok(vila2['geom'][0] != vila['geom'][0], 'arrastar o vértice muda o contorno no servidor')
        await N.click('#vtFim'); await N.wait_for_timeout(300)
        await N.click('#dcNome'); await clicar(N, 2380, 1400); await N.wait_for_timeout(700)
        vila3 = next(d for d in api('GET', '/mapa/%s/districts' % cr['id'], m['token']) if d['id'] == vila['id'])
        ok(abs(vila3['labelX'] - 2380) < 2, 'nome do bairro movido')

        print('8. redesenhar e voltar ao contorno original de um bairro da base')
        await zoom(N, 1600, 880, 520)
        await N.evaluate("""() => { const g = document.querySelector('#districtsLayer [data-id="praia-do-corvo"] .d-hit'); g.dispatchEvent(new MouseEvent('click', {bubbles:true})); }""")
        await N.wait_for_selector('#dcRedesenhar')
        await N.click('#dcRedesenhar')
        for x, y in [(1700, 950), (1800, 950), (1800, 1060)]: await clicar(N, x, y)
        await N.keyboard.press('Enter'); await N.wait_for_timeout(900)
        pc = next(d for d in api('GET', '/mapa/%s/districts' % cr['id'], m['token']) if d['id'] == 'praia-do-corvo')
        ok(pc['geom'] and len(pc['geom']) == 3, 'contorno redesenhado')
        await N.wait_for_selector('#dcOriginal'); await N.click('#dcOriginal'); await N.wait_for_timeout(800)
        pc = next(d for d in api('GET', '/mapa/%s/districts' % cr['id'], m['token']) if d['id'] == 'praia-do-corvo')
        ok(pc['geom'] is None, 'voltou ao contorno original')

        print('9. apagar bairro e desfazer')
        await N.evaluate("""(id) => { document.querySelector('#districtsLayer [data-id="'+id+'"] .d-hit').dispatchEvent(new MouseEvent('click', {bubbles:true})); }""", vila['id'])
        await N.wait_for_selector('#dcApagar'); await N.click('#dcApagar')
        await N.wait_for_selector('.confirm-overlay.show'); await N.click('#cdOk'); await N.wait_for_timeout(900)
        ok(await N.locator('#districtsLayer [data-id="%s"]' % vila['id']).count() == 0, 'bairro apagado')
        await N.click('#btnUndo'); await N.wait_for_timeout(1000)
        ok(any(d['name'] == 'Vila Nova' for d in api('GET', '/mapa/%s/districts' % cr['id'], m['token'])), 'desfazer recria o bairro')

        print('10. o jogador')
        J = await abrir(b, j, cr['id'])
        ok(await J.locator('#featuresLayer .feat.f-avenida').count() == 1, 'jogador vê a avenida')
        ok(await J.locator('#featuresLayer .feat.f-agua').count() == 0, 'jogador não vê o lago oculto')
        ok(await J.locator('#editToolbar').is_visible() is False, 'jogador não tem ferramentas')
        sobrou = await J.evaluate("ks => ks.filter(k => document.querySelector('[data-k=\"'+k+'\"]')).length", removidos_borracha)
        ok(sobrou == 0, 'o que a borracha tirou some também para o jogador')
        ok(await J.locator('#districtsLayer [data-id^="bairro-"]').count() == 0, 'bairro novo (oculto) não aparece para o jogador')
        ok(await J.locator('#districtsLayer [data-id="ilha-do-zwart"]').count() == 0, 'nem a ilha')
        await N.screenshot(path='/tmp/editor-mestre.png')

        print('11. celular: a barra cabe')
        C = await abrir(b, m, cr['id'], {'width': 390, 'height': 800})
        await C.click('#btnEditMode'); await C.wait_for_timeout(200)
        ok(await C.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'sem rolagem lateral com a barra aberta')
        await C.screenshot(path='/tmp/editor-celular.png')

        for nome, pg in (('mestre', N), ('jogador', J), ('celular', C)):
            ok(not pg.errs, 'sem erros de JS (%s) %s' % (nome, pg.errs[:3]))
        await b.close()
    print('\nFALHAS:', falhas if falhas else 'nenhuma'); raise SystemExit(1 if falhas else 0)
asyncio.run(main())
