"""App instalável (PWA): manifesto, ícones, service worker, funcionamento sem internet e botão Instalar.
Requer deploy/ servido em :8765 (e a API em :3010 para a parte da conta)."""
import asyncio, json, os, urllib.request
from playwright.async_api import async_playwright
SITE = os.environ.get('E2E_SITE', 'http://localhost:8765'); API = 'http://localhost:3010'
INIT = "try{localStorage.setItem('ficha-de-sangue:conta:api', JSON.stringify('%s'))}catch(e){}" % API
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

async def main():
    m = json.loads(urllib.request.urlopen(SITE + '/manifest.webmanifest').read())
    ok(m['display'] == 'standalone' and m['start_url'] == '/', 'manifesto: standalone, abre em /')
    for i in m['icons']:
        r = urllib.request.urlopen(SITE + i['src']); ok(r.status == 200 and r.headers['content-type'] == 'image/png', 'ícone ' + i['src'])
    ok(any(i.get('purpose') == 'maskable' for i in m['icons']), 'tem ícone maskable (Android)')
    sw = urllib.request.urlopen(SITE + '/sw.js').read().decode()
    ok('__VERSAO__' not in sw and "'/api/'" in sw, 'sw.js com versão e sem mexer na /api')

    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(); await ctx.add_init_script(INIT)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(SITE + '/'); await pg.wait_for_timeout(800)
        await pg.evaluate("navigator.serviceWorker.ready")
        await pg.reload(); await pg.wait_for_timeout(800)
        ok(await pg.evaluate("!!navigator.serviceWorker.controller"), 'service worker controla a página')
        await pg.click('#tela-fichas .pg-h [data-acao=nova]'); await pg.check('#form-nova input[value=branco]')
        await pg.click('#form-nova button[value=criar]'); await pg.wait_for_timeout(500)
        fid = await pg.evaluate('S._id')
        await pg.fill('[data-bind="meta.nome"]', 'Ficha Offline'); await pg.wait_for_timeout(300)
        # carrega as outras páginas uma vez (o SW guarda)
        for u in ['/entrar/', '/mapa/']:
            await pg.goto(SITE + u); await pg.wait_for_timeout(500)
        cache = await pg.evaluate("caches.keys()")
        ok(any(k.startswith('ficha-de-sangue-') and k != 'ficha-de-sangue-fontes' for k in cache), 'cache versionado criado: %s' % cache)

        print('sem internet')
        await ctx.set_offline(True)
        await pg.goto(SITE + '/'); await pg.wait_for_timeout(1000)
        ok('Ficha de Sangue' in await pg.title(), 'o site abre sem internet')
        ok(await pg.locator('#tela-fichas h2:has-text("Ficha Offline")').count() == 1, 'a ficha guardada aparece em Minhas fichas sem internet')
        await pg.goto(SITE + '/#/ficha/' + fid + '/editar'); await pg.wait_for_timeout(500)
        ok(await pg.evaluate("S.meta.nome") == 'Ficha Offline', 'a ficha abre sem internet')
        await pg.fill('[data-bind="meta.nome"]', 'Editada Offline'); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("nvFichasVisiveis().some(m=>m.nome==='Editada Offline')"), 'dá para editar sem internet')
        await pg.goto(SITE + '/entrar/'); await pg.wait_for_timeout(500)
        ok('Entrar' in await pg.title(), 'página de entrar abre sem internet')
        await pg.fill('#e-email', 'a@b.com'); await pg.fill('#e-senha', '12345678'); await pg.click('#f-entrar .btn')
        await pg.wait_for_selector('#f-entrar .aviso.erro')
        ok('servidor' in (await pg.inner_text('#f-entrar .aviso')), 'login sem internet dá a mensagem certa (a API não é servida do cache)')
        await pg.goto(SITE + '/mapa/?cronica=x'); await pg.wait_for_timeout(600)
        ok('Mapa' in await pg.title(), 'mapa abre sem internet (com aviso de conta/servidor)')
        await ctx.set_offline(False)

        print('botão Instalar')
        await pg.goto(SITE + '/'); await pg.wait_for_timeout(800)
        ok(not await pg.locator('#btn-instalar').is_visible(), 'sem botão quando o navegador não oferece instalar')
        await pg.evaluate("""() => { const e = new Event('beforeinstallprompt', { cancelable: true });
            e.prompt = () => { window.__pediu = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' });
            window.dispatchEvent(e); }""")
        await pg.wait_for_timeout(200)
        ok(await pg.locator('#btn-instalar').is_visible(), 'botão "Instalar app" aparece no topo')
        await pg.click('#btn-instalar'); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("window.__pediu === true"), 'clicar chama a instalação do navegador')
        ok(not await pg.locator('#btn-instalar').is_visible(), 'botão some depois')
        ok(not errs, 'sem erros de JS ' + str(errs[:2]))

        print('versão nova chega a quem já instalou')
        v1 = [k for k in await pg.evaluate("caches.keys()") if k.startswith('ficha-de-sangue-') and k != 'ficha-de-sangue-fontes']
        ok(len(v1) == 1, 'só um cache de versão ativo')
        await b.close()
    print('\nFALHAS:', falhas if falhas else 'nenhuma'); raise SystemExit(1 if falhas else 0)
asyncio.run(main())
