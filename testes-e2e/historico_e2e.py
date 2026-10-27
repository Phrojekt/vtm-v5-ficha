"""Histórico de alterações + painel do narrador, de ponta a ponta.
Requer API em :3010 (banco vazio) e deploy/ servido em :8765."""
import asyncio, json, os, time, urllib.request
from playwright.async_api import async_playwright
SITE = os.environ.get('E2E_SITE', 'http://localhost:8765/'); API = os.environ.get('E2E_API', 'http://localhost:3010')
INIT = "try{localStorage.setItem('ficha-de-sangue:conta:api', JSON.stringify('%s'))}catch(e){}" % API
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

def api(metodo, caminho, token=None, corpo=None):
    h = {'Content-Type': 'application/json'}
    if token: h['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(API + caminho, method=metodo, headers=h, data=json.dumps(corpo).encode() if corpo is not None else None)
    return json.loads(urllib.request.urlopen(r).read())

async def aba(b, viewport=None):
    ctx = await b.new_context(viewport=viewport or {'width': 1250, 'height': 900})
    await ctx.add_init_script(INIT)
    pg = await ctx.new_page(); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.goto(SITE); await pg.wait_for_timeout(800)
    return pg

async def entrar(pg, tok, usuario):
    await pg.evaluate("""([t,u])=>{const api=JSON.parse(localStorage.getItem('ficha-de-sangue:conta:api'));
      localStorage.setItem('ficha-de-sangue:conta',JSON.stringify({api,token:t,usuario:u,ultimaSync:null}));
      localStorage.setItem('ficha-de-sangue:adotar','1');}""", [tok, usuario])
    await pg.reload(); await pg.wait_for_timeout(1500)

async def main():
    sfx = str(int(time.time()))
    bia = api('POST', '/auth/cadastro', corpo={'email': f'bia{sfx}@t.com', 'senha': 'senha12345', 'nome': 'Bia'})
    ana = api('POST', '/auth/cadastro', corpo={'email': f'ana{sfx}@t.com', 'senha': 'senha12345', 'nome': 'Ana'})
    cr = api('POST', '/cronicas', bia['token'], {'nome': 'Belmont Noturno'})['cronica']
    api('POST', '/cronicas/entrar', ana['token'], {'codigo': cr['codigo_convite']})

    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        print('1. jogadora monta a ficha e põe na crônica')
        A = await aba(b); await entrar(A, ana['token'], ana['usuario'])
        await A.click('#tela-fichas .pg-h [data-acao=nova]'); await A.check('#form-nova input[value=branco]')
        await A.click('#form-nova button[value=criar]'); await A.wait_for_timeout(500)
        await A.fill('[data-bind="meta.nome"]', 'Odete Marçal'); await A.wait_for_timeout(200)
        await A.evaluate("S.fome = 1; salvar()")
        await A.click('#btn-ficha-mais'); await A.click('#menu-ficha [data-acao=compartilhar]')
        await A.wait_for_selector('#nv-cr-ficha option:nth-child(2)', state='attached')
        await A.select_option('#nv-cr-ficha', label='Belmont Noturno'); await A.wait_for_timeout(400)
        await A.keyboard.press('Escape')
        await A.evaluate("nvSincronizar()"); await A.wait_for_timeout(1200)
        fid = await A.evaluate("S._id")
        ok(bool(fid), 'ficha da Ana sincronizada')

        print('2. painel do narrador')
        N = await aba(b); await entrar(N, bia['token'], bia['usuario'])
        await N.click('.navl a:has-text("Crônicas")'); await N.wait_for_selector('.cr-item')
        await N.click('.cr-item'); await N.wait_for_selector('.stats .stat b', timeout=8000); await N.wait_for_selector('.np-ficha', timeout=8000)
        stats = await N.locator('.stat b').all_inner_texts()
        ok(stats[0] == '1' and stats[1] == '1', 'estatísticas: 1 jogador, 1 ficha (%s)' % stats)
        ok('Odete Marçal' in await N.locator('.np-ficha').first.inner_text(), 'ficha da Ana no painel')
        ok(await N.locator('.np-ficha .tag.blood, .np-ficha .np-ok').count() == 1, 'pendências calculadas')
        ok(await N.locator('[data-nv="cr-ler"]').count() >= 1, 'narrador pode ver a ficha da jogadora')
        await N.click('[role=tab]:has-text("Jogadores")'); await N.wait_for_timeout(200)
        ok(await N.locator('.np-jog .np-dot.on').count() == 1, 'Ana aparece ativa agora')
        await N.click('[role=tab]:has-text("Atividade")'); await N.wait_for_timeout(200)
        ok(await N.locator('.np-at').count() >= 1, 'atividade recente listada')
        await N.click('[role=tab]:has-text("Fichas do grupo")'); await N.wait_for_timeout(200)
        await N.screenshot(path='/tmp/painel-narrador.png', full_page=False)

        print('3. narradora edita a ficha da jogadora')
        await N.click('.np-ficha [data-nv="cr-editar"]'); await N.wait_for_timeout(800)
        ok(await N.evaluate("document.body.classList.contains('nv-remota')"), 'modo edição remota')
        await N.evaluate("S.fome = 3; S.atr.forca = (S.atr.forca||1) + 1; salvar()")
        await N.wait_for_function("document.getElementById('nv-remota-status').textContent.startsWith('salvo')", timeout=8000)

        print('4. histórico mostra o que mudou e quem mudou')
        await N.click('[data-nv="h-remota"]'); await N.wait_for_selector('.nv-hv', timeout=8000)
        primeira = await N.locator('.nv-hv').first.inner_text()
        ok('Bia' in primeira and 'Fome 1 → 3' in primeira, 'última versão: Bia, Fome 1 → 3 (%s)' % primeira.replace('\n', ' ')[:120])
        ok('Força' in primeira, 'mudança de Força aparece')
        ok(await N.locator('[data-nv="h-ver"]').count() == 0, 'sem "Ver" durante edição remota')
        await N.screenshot(path='/tmp/historico.png')
        await N.keyboard.press('Escape'); await N.wait_for_timeout(200)
        ok(await N.locator('#nv-hist').count() == 0, 'Esc fecha o histórico')

        print('5. voltar para a versão anterior')
        await N.click('[data-nv="h-remota"]'); await N.wait_for_selector('[data-nv="h-restaurar"]')
        await N.locator('[data-nv="h-restaurar"]').first.click(); await N.wait_for_timeout(1500)
        ok(await N.evaluate("S.fome") == 1, 'ficha aberta voltou (Fome 1)')
        topo = await N.locator('.nv-hv').first.inner_text()
        ok('voltou para a v' in topo, 'versão nova marcada como restauração')
        await N.click('[data-nv="h-fechar"]')
        await N.click('[data-nv="remota-sair"]'); await N.wait_for_timeout(800)
        srv = api('GET', '/fichas/' + fid, bia['token'])['ficha']['dados']
        ok(srv['fome'] == 1, 'no servidor também voltou')

        print('6. jogadora vê o histórico na própria ficha')
        await A.evaluate("nvSincronizar()"); await A.wait_for_timeout(1500)
        ok(await A.evaluate("S.fome") == 1, 'Ana recebeu a ficha restaurada')
        await A.click('#btn-ficha-mais'); await A.click('#menu-ficha [data-acao=compartilhar]')
        await A.wait_for_selector('.nv-v-mud .mud', timeout=8000)
        await A.wait_for_timeout(800)
        txt = await A.locator('.nv-v-mud').all_inner_texts()
        ok(any('Fome' in t for t in txt), 'aba Esta ficha mostra as mudanças %s' % txt[:4])
        ok(await A.locator('.stats').count() == 0, 'jogadora não vê o painel do narrador')
        await A.click('[data-nv="h-abrir"]'); await A.wait_for_selector('.nv-hv')
        ok(await A.locator('[data-nv="h-ver"]').count() >= 1, 'jogadora pode ver versões antigas')
        await A.locator('[data-nv="h-ver"]').last.click(); await A.wait_for_timeout(600)
        ok(await A.evaluate("document.body.classList.contains('nv-leitura')"), 'versão antiga aberta só para leitura')
        await A.click('[data-nv="leitura-sair"]')

        print('7. celular')
        M = await aba(b, {'width': 380, 'height': 760}); await entrar(M, bia['token'], bia['usuario'])
        await M.click('.tabbar a:has-text("Crônicas")'); await M.wait_for_selector('.cr-item')
        await M.click('.cr-item'); await M.wait_for_selector('.np-ficha', timeout=8000)
        ok(await M.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'painel sem rolagem lateral em 380px')
        await M.locator('.np-ficha').first.scroll_into_view_if_needed(); await M.screenshot(path='/tmp/painel-mobile.png')

        for nome, pg in (('Ana', A), ('Bia', N), ('celular', M)):
            ok(not pg.errs, 'sem erros de JS (%s) %s' % (nome, pg.errs[:2]))
        await b.close()
    print('\nFALHAS:', falhas if falhas else 'nenhuma'); raise SystemExit(1 if falhas else 0)
asyncio.run(main())
