"""Teste de ponta a ponta da biblioteca + sincronização, com a API local.
Requer: API em http://localhost:3010 (banco vazio) e o site em http://localhost:8765."""
import asyncio, json, os, re, sys, urllib.request
from playwright.async_api import async_playwright

# E2E_SITE / E2E_API permitem rodar contra outra montagem (ex.: o ensaio com os dois Nginx,
# em que o site chama /api no próprio endereço, como na Vercel)
SITE = os.environ.get('E2E_SITE', 'http://localhost:8765/')
API = os.environ.get('E2E_API', 'http://localhost:3010')
API_DIRETA = os.environ.get('E2E_API_DIRETA', API)   # para as chamadas feitas pelo próprio teste
INIT = "try{localStorage.setItem('ficha-de-sangue:conta:api', JSON.stringify('%s'))}catch(e){}" % API
falhas = []
def ok(cond, txt):
    print(('  ok   ' if cond else '  FALHA ') + txt)
    if not cond: falhas.append(txt)

async def nova_aba(b, offline=False):
    ctx = await b.new_context(accept_downloads=True)
    await ctx.add_init_script(INIT)
    pg = await ctx.new_page()
    pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept(getattr(pg, 'resposta', '') or None)))
    await pg.goto(SITE); await pg.wait_for_timeout(900)
    return ctx, pg

async def sincronizado(pg, t=8000):
    await pg.wait_for_function("""() => !NV.sincronizando && NV.conta && NV.conta.token &&
        Object.values(NV.indice.fichas).filter(m => m.conta === NV.conta.usuario.id).every(m => !m.sujo)""", timeout=t)

async def entrar(pg, email, senha, nome=None):
    # a conta agora entra pela mesma porta da pagina /entrar/: chama a API, grava a sessao e recarrega
    await pg.evaluate("""async ([email,senha,nome])=>{
      const api=(JSON.parse(localStorage.getItem('ficha-de-sangue:conta:api')||'null'))||'';
      const r=await fetch(api+(nome?'/auth/cadastro':'/auth/entrar'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(nome?{email,senha,nome}:{email,senha})});
      const d=await r.json(); if(!r.ok) throw new Error(d.erro||('erro '+r.status));
      const prev=JSON.parse(localStorage.getItem('ficha-de-sangue:conta')||'null');
      const mesma=prev&&prev.usuario&&prev.usuario.id===d.usuario.id;
      localStorage.setItem('ficha-de-sangue:conta',JSON.stringify({api,token:d.token,usuario:d.usuario,ultimaSync:mesma?(prev.ultimaSync||null):null}));
      localStorage.setItem('ficha-de-sangue:adotar','1');
    }""", [email, senha, nome])
    await pg.reload(); await pg.wait_for_timeout(900)
    await pg.wait_for_function('NV.conta && NV.conta.token', timeout=5000)
    await sincronizado(pg)

async def editar(pg):
    if await pg.get_attribute('#modo-editar', 'aria-pressed') != 'true':
        await pg.click('#modo-editar'); await pg.wait_for_timeout(150)

async def nomear(pg, nome):
    await editar(pg)
    await pg.fill('[data-bind="meta.nome"]', nome)
    await pg.wait_for_timeout(100)

async def nova_ficha(pg, inicio='sorteada'):
    await pg.goto(SITE + '#/fichas'); await pg.wait_for_timeout(200)
    await pg.click('#tela-fichas .pg-h [data-acao=nova]')
    await pg.check('#form-nova input[name=inicio][value=%s]' % inicio)
    await pg.click('#form-nova button[value=criar]'); await pg.wait_for_timeout(500)
    return await pg.evaluate('S._id')

async def abrir_ficha(pg, fid, modo=''):
    await pg.goto(SITE + '#/ficha/' + fid + modo); await pg.wait_for_timeout(400)

async def dialogo_ficha(pg):
    await pg.click('#btn-ficha-mais'); await pg.click('#menu-ficha [data-acao=compartilhar]')
    await pg.wait_for_selector('#dlg-ficha[open]')

async def avisos(pg):
    return ' | '.join(await pg.locator('.aviso p').all_inner_texts())

def api_get(caminho, token):
    r = urllib.request.Request(API_DIRETA + caminho, headers={'Authorization': 'Bearer ' + token})
    return json.loads(urllib.request.urlopen(r).read())

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        print('1. sem conta: biblioteca local')
        ca, a = await nova_aba(b)
        n = await a.evaluate('Object.keys(NV.indice.fichas).length')
        ok(n == 0, 'abre em Minhas fichas, sem sortear nada sozinho (%d)' % n)
        ok(await a.locator('#tela-fichas .vazio').is_visible(), 'lista vazia convida a criar a primeira ficha')
        id1 = await nova_ficha(a)
        ok('#/ficha/' + id1 in a.url, 'a ficha nova abre em página própria')
        await nomear(a, 'Lúcia Arantes')
        await a.click('#btn-sortear'); await a.wait_for_timeout(300)
        ok(await a.evaluate('S._id') == id1, 'Sortear mantém a mesma ficha')
        ok(await a.is_visible('#btn-desfazer'), 'aparece Desfazer sorteio')
        await a.click('#btn-desfazer'); await a.wait_for_timeout(200)
        ok(await a.evaluate('S.meta.nome') == 'Lúcia Arantes', 'Desfazer volta a ficha')
        await nova_ficha(a, 'branco')
        await nomear(a, 'Bento Ferraz')
        n = await a.evaluate('nvFichasVisiveis().length')
        ok(n == 2, 'Nova cria outra ficha sem apagar a anterior (%d)' % n)
        await a.reload(); await a.wait_for_timeout(800)
        ok(await a.evaluate('S.meta.nome') == 'Bento Ferraz', 'recarregar continua na mesma ficha')
        ok((await a.text_content('#nv-status')).lower() == 'só neste navegador', 'status: só neste navegador')
        await a.goto(SITE + '#/fichas'); await a.wait_for_timeout(300)
        ok(await a.locator('.fcard').count() == 2, 'Minhas fichas mostra as duas')

        print('2. cadastro: fichas locais sobem para a conta')
        await entrar(a, 'ana@teste.com', 'senha-da-ana', 'Ana')
        token_a = await a.evaluate('NV.conta.token')
        srv = api_get('/fichas', token_a)['fichas']
        ok(sorted(f['nome'] for f in srv) == ['Bento Ferraz', 'Lúcia Arantes'], 'servidor tem as 2 fichas: %s' % [f['nome'] for f in srv])
        ok((await a.text_content('#nv-status')).lower().startswith('sincronizado'), 'status: sincronizado')

        print('3. segundo aparelho vê as mesmas fichas')
        cb, bb = await nova_aba(b)
        await entrar(bb, 'ana@teste.com', 'senha-da-ana')
        nomes = await bb.evaluate("nvFichasVisiveis().filter(m => m.conta).map(m => m.nome).sort()")
        ok(sorted(nomes) == ['Bento Ferraz', 'Lúcia Arantes'], 'B recebeu as fichas, sem levar a sorteada automática: %s' % nomes)
        await bb.goto(SITE + '#/fichas'); await bb.wait_for_timeout(300)
        ok(await bb.locator('.fcard').count() == 2, 'B vê as duas em Minhas fichas')

        print('4. edição em A aparece em B')
        id_bento = await a.evaluate("nvFichasVisiveis().find(m => m.nome === 'Bento Ferraz').id")
        await abrir_ficha(a, id_bento, '/editar')
        await nomear(a, 'Bento Ferraz Jr.')
        await a.evaluate('nvAgendar(0)'); await sincronizado(a)
        await bb.evaluate('nvSincronizar()'); await sincronizado(bb)
        nomes = await bb.evaluate("nvFichasVisiveis().map(m => m.nome)")
        ok('Bento Ferraz Jr.' in nomes, 'B vê o nome novo')

        print('5. offline em B: edita, conflita com A, nada se perde')
        await abrir_ficha(bb, id_bento, '/editar')
        await cb.set_offline(True)
        await nomear(bb, 'Bento (editado offline)')
        await bb.wait_for_timeout(300)
        st = await bb.text_content('#nv-status')
        ok('offline' in st.lower(), 'status offline: "%s"' % st)
        await nomear(a, 'Bento (editado em A)')
        await a.evaluate('nvAgendar(0)'); await sincronizado(a)
        await cb.set_offline(False)
        await bb.evaluate('nvSincronizar()'); await bb.wait_for_timeout(1500); await sincronizado(bb)
        nomes = await bb.evaluate("nvFichasVisiveis().map(m => m.nome)")
        ok('Bento (editado em A)' in nomes, 'B ficou com a versão do servidor no id original')
        ok(any(n.startswith('Bento (editado offline) (conflito') for n in nomes), 'a edição offline virou cópia: %s' % nomes)
        await a.evaluate('nvSincronizar()'); await sincronizado(a)
        nomes_a = await a.evaluate("nvFichasVisiveis().map(m => m.nome)")
        ok(any('(conflito' in n for n in nomes_a), 'A também recebe a cópia do conflito')

        print('6. histórico: marcar, restaurar')
        await abrir_ficha(a, id_bento)
        a.resposta = 'antes do XP'
        await dialogo_ficha(a); await a.wait_for_selector('[data-nv="v-marcar"]')
        await a.click('[data-nv="v-marcar"]'); await a.wait_for_timeout(800)
        await a.evaluate("S.xpTotal = 77; render(); NV.conta && nvAgendar(0)")
        await sincronizado(a)
        await a.evaluate("NV.versoes = null; nvRedesenhar()"); await a.wait_for_timeout(1200)
        vers = await a.evaluate('NV.versoes.map(v => [v.versao, v.rotulo])')
        ok(any(r == 'antes do XP' for _, r in vers), 'versão marcada aparece: %s' % vers)
        alvo = [v for v, r in vers if r == 'antes do XP'][0]
        await a.click('[data-nv="v-restaurar"][data-v="%d"]' % alvo); await a.wait_for_timeout(1200)
        ok(await a.evaluate('S.xpTotal') != 77, 'restaurar voltou o XP (%s) msg=%s vers=%s' % (await a.evaluate('S.xpTotal'), await a.evaluate('NV.msg'), await a.evaluate('JSON.stringify(NV.versoes.map(v=>[v.versao,v.rotulo,v.xp_total]))')))

        print('7. crônica: Bia narra, Ana entra, Bia lê a ficha')
        await a.keyboard.press('Escape')
        cc, c = await nova_aba(b)
        await entrar(c, 'bia@teste.com', 'senha-da-bia', 'Bia')
        await c.goto(SITE + '#/cronicas'); await c.wait_for_selector('#nv-cr-nome')
        await c.fill('#nv-cr-nome', 'Noites de Recife'); await c.click('[data-nv="cr-criar"]')
        await c.wait_for_selector('.nv-codigo'); codigo = await c.inner_text('.nv-codigo')
        ok(len(codigo) == 9, 'código de convite: ' + codigo)
        await a.goto(SITE + '#/cronicas'); await a.wait_for_selector('#nv-cr-codigo')
        await a.fill('#nv-cr-codigo', codigo.lower()); await a.click('[data-nv="cr-entrar"]'); await a.wait_for_selector('#cr-por-sel')
        await a.select_option('#cr-por-sel', id_bento); await a.click('[data-nv="cr-por-ficha"]'); await a.wait_for_timeout(300); await sincronizado(a)
        await c.reload(); await c.wait_for_selector('[data-nv="cr-ler"]', timeout=8000)
        await c.click('[data-nv="cr-ler"]'); await c.wait_for_timeout(800)
        ok(await c.evaluate("document.body.classList.contains('nv-leitura')"), 'narradora em modo leitura')
        titulo = await c.inner_text('#nv-leitura-titulo')
        ok('Bento' in titulo, 'título da leitura: ' + titulo)
        ok(not await c.is_visible('.editor'), 'editor escondido na leitura')
        n_bia = await c.evaluate("Object.keys(NV.indice.fichas).filter(id => NV.indice.fichas[id].nome.startsWith('Bento')).length")
        ok(n_bia == 0, 'ficha da jogadora não entrou na biblioteca da narradora')
        await c.click('[data-nv="leitura-sair"]'); await c.wait_for_timeout(300)
        ok(not await c.evaluate("document.body.classList.contains('nv-leitura')"), 'saiu da leitura')

        print('8. link de leitura sem conta')
        await abrir_ficha(a, id_bento)
        await dialogo_ficha(a); await a.wait_for_selector('[data-nv="l-criar"]')
        await a.click('[data-nv="l-criar"]'); await a.wait_for_timeout(1000)
        url = await a.evaluate('(NV.links[0] || {}).url')
        ok(bool(url) and '?ver=' in url, 'link: %s msg=%s' % (url, await a.evaluate('NV.msg')))
        if not url: raise SystemExit(1)
        cd, d = await nova_aba(b)
        base = re.sub(r'[^/]*$', '', SITE)   # o link aponta para o site público; aqui, para a montagem de teste
        await d.goto(re.sub(r'^https?://[^/]+/', base, url)); await d.wait_for_timeout(1500)
        ok(await d.evaluate("document.body.classList.contains('nv-leitura')"), 'visitante vê em leitura')
        ok('bento' in (await d.inner_text('#view-ficha')).lower(), 'a ficha aparece')
        await a.click('[data-nv="l-revogar"]'); await a.wait_for_timeout(800)
        await d.reload(); await d.wait_for_timeout(1500)
        ok(not await d.evaluate("document.body.classList.contains('nv-leitura')"), 'link desligado não abre mais')

        print('9. PDF: abrir o mesmo PDF atualiza a ficha; com a ficha mudada, entra como nova')
        await a.evaluate('window.showSaveFilePicker = undefined')
        await a.keyboard.press('Escape')
        antes = await a.evaluate('nvFichasVisiveis().length')
        await a.click('#btn-exportar')
        async with a.expect_download() as dl: await a.click('#menu-exportar [data-acao=pdf]')
        caminho = '/tmp/bento.pdf'; await (await dl.value).save_as(caminho)
        await a.set_input_files('#arquivo-importar', caminho); await a.wait_for_timeout(1200)
        ok(await a.evaluate('nvFichasVisiveis().length') == antes, 'mesmo PDF não duplica')
        await nomear(a, 'Bento mudou depois do PDF')
        await a.set_input_files('#arquivo-importar', caminho); await a.wait_for_timeout(1200)
        ok(await a.evaluate('nvFichasVisiveis().length') == antes + 1, 'PDF antigo entra como ficha nova')
        ok('ficha nova' in await avisos(a), 'mensagem avisa: ' + await avisos(a))

        print('10. sair da conta')
        await sincronizado(a)
        # Sair fica no menu da conta (canto superior direito)
        await a.click('#btn-conta'); await a.wait_for_timeout(150)
        await a.click('#menu-conta [data-nv="sair"]'); await a.wait_for_timeout(800)
        n = await a.evaluate('nvFichasVisiveis().length')
        ok(not await a.evaluate("Object.values(NV.indice.fichas).some(m => m.conta)"), 'fichas da conta saem do navegador (%d local restante)' % n)
        await a.goto(SITE + '#/fichas'); await a.wait_for_timeout(300)
        ok(await a.locator('.fcard').count() == n, 'Minhas fichas mostra só o que ficou neste navegador')

        for nome, pg in (('A', a), ('B', bb), ('C', c), ('D', d)):
            ok(not pg.errs, 'sem erros de página em %s %s' % (nome, pg.errs[:2]))
        await b.close()
    print('\n%d falha(s)' % len(falhas))
    sys.exit(1 if falhas else 0)

asyncio.run(main())
