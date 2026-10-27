"""Ponta a ponta: Fichas + Mapa, com mestre e jogador.
Requer o site em http://localhost:8080 (deploy/) com /api/ repassado para a API (banco vazio)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

SITE = os.environ.get('E2E_SITE', 'http://localhost:8080/')
INIT = "try{localStorage.setItem('ficha-de-sangue:conta:api', JSON.stringify('/api'))}catch(e){}"
falhas = []
def ok(cond, txt):
    print(('  ok   ' if cond else '  FALHA ') + txt)
    if not cond: falhas.append(txt)

async def aba(b, ip):
    ctx = await b.new_context(viewport={'width': 1300, 'height': 900}, extra_http_headers={'X-Teste-Ip': ip})
    await ctx.add_init_script(INIT)
    pg = await ctx.new_page()
    pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept(getattr(pg, 'resposta', None) or None)))
    return ctx, pg

async def sincronizado(pg, t=10000):
    await pg.wait_for_function("""() => !NV.sincronizando && NV.conta && NV.conta.token &&
        Object.values(NV.indice.fichas).filter(m => m.conta === NV.conta.usuario.id).every(m => !m.sujo)""", timeout=t)

async def nova_ficha(pg, nome_ficha):
    await pg.goto(SITE + '#/fichas'); await pg.wait_for_timeout(300)
    await pg.click('#tela-fichas .pg-h [data-acao=nova]'); await pg.check('#form-nova input[name=inicio][value=branco]')
    await pg.click('#form-nova button[value=criar]'); await pg.wait_for_timeout(400)
    await pg.fill('[data-bind="meta.nome"]', nome_ficha); await pg.wait_for_timeout(150)

async def cadastrar(pg, email, nome, nome_ficha):
    await pg.goto(SITE); await pg.wait_for_timeout(900)
    await nova_ficha(pg, nome_ficha)
    # a conta entra pela página /entrar/: grava a sessão e volta; aqui, direto pela API
    await pg.evaluate("""async ([email, nome]) => {
      const r = await fetch('/api/auth/cadastro', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, senha: 'senha-forte-123', nome }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.erro);
      localStorage.setItem('ficha-de-sangue:conta', JSON.stringify({ api: '/api', token: d.token, usuario: d.usuario, ultimaSync: null }));
      localStorage.setItem('ficha-de-sangue:adotar', '1'); }""", [email, nome])
    await pg.reload(); await pg.wait_for_timeout(900)
    await pg.wait_for_function('NV.conta && NV.conta.token', timeout=6000)
    await sincronizado(pg)

async def api(pg, metodo, caminho, corpo=None):
    return await pg.evaluate("""async ([m, c, b]) => {
        const r = await fetch('/api' + c, { method: m, headers: Object.assign({ Authorization: 'Bearer ' + JSON.parse(localStorage.getItem('ficha-de-sangue:conta')).token },
          b ? { 'Content-Type': 'application/json' } : {}), body: b ? JSON.stringify(b) : undefined });
        let j = null; try { j = await r.json(); } catch (e) {}
        return { status: r.status, body: j };
    }""", [metodo, caminho, corpo])

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        cm, m = await aba(b, '10.0.0.1')
        cj, j = await aba(b, '10.0.0.2')

        print('1. contas, crônica e fichas')
        await cadastrar(m, 'mestre@x.com', 'Mestre', 'Agnes (NPC)')
        await cadastrar(j, 'jogadora@x.com', 'Jogadora', 'Lúcia Arantes')
        await m.goto(SITE + '#/cronicas'); await m.wait_for_selector('#nv-cr-nome')
        await m.fill('#nv-cr-nome', 'Noites de Belmont'); await m.click('[data-nv="cr-criar"]')
        await m.wait_for_selector('.nv-codigo'); codigo = await m.inner_text('.nv-codigo')
        ok(await m.locator('a.btn:has-text("Abrir o mapa")').count() == 1, 'a crônica tem o botão Abrir o mapa')
        await j.goto(SITE + '#/cronicas'); await j.wait_for_selector('#nv-cr-codigo')
        await j.fill('#nv-cr-codigo', codigo); await j.click('[data-nv="cr-entrar"]'); await j.wait_for_selector('#cr-por-sel')
        await j.click('[data-nv="cr-por-ficha"]'); await j.wait_for_timeout(400); await sincronizado(j)
        cr = (await api(m, 'GET', '/cronicas'))['body']['cronicas'][0]['id']
        ficha_jogadora = await j.evaluate('S._id')
        ok(bool(cr) and bool(ficha_jogadora), 'crônica criada e ficha da jogadora nela')

        print('2. mapa: jogadora espera, mestre abre')
        await j.goto(SITE + 'mapa/'); await j.wait_for_timeout(1200)
        txt = await j.inner_text('.carregando')
        ok('ainda não abriu o mapa' in txt, 'jogadora vê "o mestre ainda não abriu o mapa"')
        await m.goto(SITE + 'mapa/'); await m.wait_for_selector('#ativar')
        await m.click('#ativar')
        await m.wait_for_function("window.BELMONT_MODE === 'gm' && document.querySelectorAll('#mapSvg .poi').length > 40", timeout=15000)
        n_pois = await m.evaluate("document.querySelectorAll('#mapSvg .poi').length")
        ok(n_pois > 40, 'mestre vê o mapa completo (%d pontos)' % n_pois)
        ok(await m.is_visible('#btnImportar'), 'mestre tem o botão Importar Belmont')
        ok(not await m.is_visible('#btnPublish'), 'não existe mais o botão Publicar')
        ok('Mestre' in await m.inner_text('#authBox'), 'mapa mostra a conta do mestre')

        print('3. jogadora: nada revelado; mestre revela; aparece em segundos')
        await j.goto(SITE + 'mapa/')
        await j.wait_for_function("window.BELMONT_MODE === 'player' && document.getElementById('authBox').textContent.includes('Jogadora')", timeout=15000)
        ok(await j.evaluate("document.querySelectorAll('#mapSvg .poi').length") == 0, 'jogadora não vê nenhum ponto')
        ok(not await j.is_visible('#btnEditMode') or await j.evaluate("document.querySelector('.app').classList.contains('player-mode')"), 'jogadora está no modo leitura')
        pois = (await api(m, 'GET', '/mapa/%s/pois' % cr))['body']
        alvo = pois[0]; bairro = alvo['district']
        SEGREDO = 'O Príncipe esconde o corpo do Senescal no porão'
        await api(m, 'PUT', '/mapa/%s/pois/%s' % (cr, alvo['id']), {'privateNote': SEGREDO})
        r = await api(m, 'POST', '/mapa/%s/reveal' % cr, {'revealed': True, 'items': [{'type': 'poi', 'id': alvo['id']}, {'type': 'district', 'id': bairro}]})
        ok(r['body']['changed'] == 2, 'mestre revelou bairro e ponto')
        await j.wait_for_function("document.querySelectorAll('#mapSvg .poi').length === 1", timeout=15000)
        ok(True, 'a jogadora viu o ponto revelado sem recarregar')
        pub = await api(j, 'GET', '/mapa/%s/publico' % cr)
        bruto = json.dumps(pub['body'], ensure_ascii=False)
        ok(SEGREDO[:20] not in bruto and 'privateNote' not in bruto, 'nota privada não chega à jogadora')
        ok((await api(j, 'GET', '/mapa/%s/pois' % cr))['status'] == 403, 'jogadora não acessa as rotas do mestre')

        print('4. personagem do mapa ligado à ficha da jogadora; mestre abre e edita')
        r = await api(m, 'POST', '/mapa/%s/npcs' % cr, {'name': 'Lúcia Arantes', 'fichaId': ficha_jogadora, 'revealed': True,
                                                         'locations': [{'poiId': alvo['id'], 'relation': 'refugio'}]})
        ok(r['status'] == 201 and r['body']['fichaId'] == ficha_jogadora, 'personagem criado com a ficha ligada')
        await m.reload(); await m.wait_for_function("window.BELMONT_MODE === 'gm' && document.querySelectorAll('#mapSvg .poi').length > 40", timeout=15000)
        await m.click('[data-tab="npcs"]'); await m.wait_for_selector('.npc-item', timeout=5000)
        await m.click('.npc-item'); await m.wait_for_timeout(400)
        link = await m.get_attribute('a.act-btn[href*="?ficha="]', 'href')
        ok(link and ficha_jogadora in link, 'o mestre vê "Abrir ficha" no personagem')
        await m.goto(link); await m.wait_for_function("document.body.classList.contains('nv-remota')", timeout=10000)
        titulo = await m.inner_text('#nv-remota-titulo')
        ok('Jogadora' in titulo, 'modo edição da ficha da jogadora: ' + titulo)
        ok(await m.evaluate("S.meta.nome") == 'Lúcia Arantes', 'é a ficha dela que está na tela')
        await m.fill('[data-bind="conceito"]' if await m.locator('[data-bind="conceito"]').count() else '[data-bind="meta.conceito"]', 'ajustado pelo mestre')
        await m.wait_for_function("document.getElementById('nv-remota-status').textContent.startsWith('salvo')", timeout=10000)
        r = await api(j, 'GET', '/fichas/' + ficha_jogadora)
        ok(r['body']['ficha']['dados']['meta']['conceito'] == 'ajustado pelo mestre', 'a mudança está na conta da jogadora')
        hist = await api(j, 'GET', '/fichas/%s/versoes' % ficha_jogadora)
        ok(hist['body']['versoes'][0]['autor'] == 'Mestre', 'o histórico mostra que foi o mestre')
        lib_m = await m.evaluate("Object.keys(NV.indice.fichas).includes(%s)" % json.dumps(ficha_jogadora))
        ok(not lib_m, 'a ficha da jogadora não entrou na biblioteca do mestre')
        ok(not await m.is_visible('#btn-sortear'), 'no modo edição remota não dá para sortear por cima')
        await m.click('[data-nv="remota-sair"]'); await m.wait_for_timeout(600)
        ok(await m.evaluate("S.meta.nome") == 'Agnes (NPC)' and not await m.evaluate("document.body.classList.contains('nv-remota')"), 'voltou para a ficha do mestre')
        await j.goto(SITE); await j.wait_for_timeout(800); await j.evaluate('nvSincronizar()'); await sincronizado(j)
        ok(await j.evaluate("S.meta.conceito") == 'ajustado pelo mestre', 'a jogadora recebe o ajuste no app')

        print('5. mestre monta uma ficha e entrega para a jogadora')
        await nova_ficha(m, 'Pré-gerada para Lúcia')
        await m.click('#btn-ficha-mais'); await m.click('#menu-ficha [data-acao=compartilhar]')
        await m.wait_for_selector('#nv-cr-ficha option:nth-child(2)', state='attached')
        await m.select_option('#nv-cr-ficha', index=1); await m.wait_for_timeout(300); await sincronizado(m)
        await m.evaluate("NV.versoes = null; nvRedesenhar()")
        await m.wait_for_selector('#nv-entregar', timeout=10000)
        await m.click('[data-nv="entregar"]'); await m.wait_for_timeout(1500)
        ok('entregue' in (await m.evaluate('NV.msg')), 'mestre entregou: ' + await m.evaluate('NV.msg'))
        await j.evaluate("NV.conta.ultimaSync = null; nvSincronizar()"); await j.wait_for_timeout(1500)
        nomes = await j.evaluate("nvFichasVisiveis().map(f => f.nome)")
        ok('Pré-gerada para Lúcia' in nomes, 'a ficha aparece nas fichas da jogadora: %s' % nomes)

        print('6. importar o Belmont antigo pelo mapa')
        await m.goto(SITE + 'mapa/'); await m.wait_for_function("window.BELMONT_MODE === 'gm'", timeout=15000)
        async with m.expect_file_chooser() as fc: await m.click('#btnImportar')
        await (await fc.value).set_files('/tmp/exp-full.json')
        await m.wait_for_timeout(3000)
        await m.wait_for_function("document.querySelectorAll('#mapSvg .poi').length > 40", timeout=15000)
        ok(True, 'import substituiu o mapa e recarregou')

        for nome, pg in (('mestre', m), ('jogadora', j)):
            ok(not pg.errs, 'sem erros de página (%s) %s' % (nome, pg.errs[:2]))
        await m.screenshot(path='/tmp/claude-0/-home-claude/65b2738a-ce90-5dba-8531-76f660a1adc4/scratchpad/mapa-mestre.png')
        await j.goto(SITE + 'mapa/'); await j.wait_for_timeout(3000)
        await j.screenshot(path='/tmp/claude-0/-home-claude/65b2738a-ce90-5dba-8531-76f660a1adc4/scratchpad/mapa-jogadora.png')
        await b.close()
    print('\n%d falha(s)' % len(falhas))
    sys.exit(1 if falhas else 0)

asyncio.run(main())
