import asyncio,time
from playwright.async_api import async_playwright
SITE='http://localhost:8765';API='http://localhost:3010'
INIT="try{localStorage.setItem('ficha-de-sangue:conta:api',JSON.stringify('%s'))}catch(e){}"%API
async def main():
  fail=[]
  def ok(c,t):
    print(('  ok   ' if c else '  FALHA ')+t)
    if not c: fail.append(t)
  async with async_playwright() as pw:
    b=await pw.chromium.launch()
    c=await b.new_context(viewport={'width':1200,'height':820}); await c.add_init_script(INIT)
    p=await c.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)))
    await p.goto(SITE+'/'); await p.wait_for_timeout(1000)
    ok(await p.locator('#conta-topo a:has-text("Entrar")').is_visible(),'deslogado: botão Entrar no topo')
    ok(await p.locator('#conta-topo a:has-text("Criar conta")').is_visible(),'deslogado: botão Criar conta no topo')
    # posição à direita
    box=await p.locator('#conta-topo').bounding_box(); ok(box['x']>700,'conta-topo no lado direito (x=%d)'%box['x'])
    await p.screenshot(path='/tmp/nav-desk-out.png')
    # Entrar leva para a página /entrar/
    await p.locator('#conta-topo a:has-text("Entrar")').first.click()
    await p.wait_for_url('**/entrar/**',timeout=5000); ok(True,'Entrar abre /entrar/')
    # cadastro e volta
    email='nav%d@t.com'%int(time.time())
    await p.click('#aba-criar'); await p.wait_for_timeout(300)
    await p.fill('#c-email',email); await p.fill('#c-senha','senha12345'); await p.fill('#c-senha2','senha12345'); await p.fill('#c-nome','Narrador Teste')
    await p.click('#f-criar .btn'); await p.wait_for_url(SITE+'/',timeout=8000); await p.wait_for_timeout(1200)
    ok(await p.locator('#conta-topo .conta-chip').is_visible(),'logado: chip da conta no topo')
    ok('Narrador Teste' in await p.locator('.conta-nome').inner_text(),'chip mostra o nome')
    await p.screenshot(path='/tmp/nav-desk-in.png')
    # menu da conta: abre, fecha fora, teclado
    await p.click('#btn-conta'); await p.wait_for_timeout(200)
    ok(await p.locator('#menu-conta').is_visible(),'menu abre ao clicar no chip')
    ok(await p.locator('#menu-conta [data-nv=sair]').is_visible(),'menu tem Sair')
    ok(await p.evaluate("document.activeElement.closest('#menu-conta')!==null"),'foco vai para o primeiro item do menu')
    await p.screenshot(path='/tmp/nav-menu.png')
    await p.mouse.click(300,500); await p.wait_for_timeout(200)
    ok(not await p.locator('#menu-conta').is_visible(),'menu fecha ao clicar fora')
    await p.focus('#btn-conta'); await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(100)
    ok(await p.locator('#menu-conta').is_visible(),'seta para baixo abre o menu')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(100)
    ok(not await p.locator('#menu-conta').is_visible() and await p.evaluate("document.activeElement.id")=='btn-conta','Esc fecha e devolve o foco ao botão')
    # navegação principal: Fichas, Crônicas, Mapa, sempre no mesmo lugar
    for t in ['Fichas','Crônicas','Mapa']:
      ok(await p.locator('.navl a:has-text("%s")'%t).is_visible(),'navegação tem %s'%t)
    ok((await p.locator('.navl a[aria-current=page]').text_content()).strip()=='Fichas','na lista, Fichas está marcada')
    await p.click('.navl a:has-text("Crônicas")'); await p.wait_for_timeout(400)
    ok('#/cronicas' in p.url and (await p.locator('.navl a[aria-current=page]').text_content()).strip()=='Crônicas','Crônicas abre e fica marcada')
    # a ficha em página própria: modo, Exportar e Ficha separados; criação só em Editar
    await p.goto(SITE+'/#/fichas'); await p.wait_for_timeout(400)
    await p.click('#tela-fichas .pg-h [data-acao=nova]'); await p.click('#form-nova button[value=criar]'); await p.wait_for_timeout(700)
    ok('#/ficha/' in p.url,'nova ficha abre em página própria')
    for bid in ['modo-ver','modo-editar','btn-exportar','btn-ficha-mais']:
      ok(await p.locator('#'+bid).is_visible(),'#%s visível na ficha'%bid)
    ok(not await p.locator('#btn-sortear').is_visible(),'Sortear escondido no modo Ver')
    await p.click('#btn-exportar'); await p.wait_for_timeout(150)
    ok(await p.locator('#menu-exportar [data-acao=pdf]').is_visible() and await p.locator('#menu-exportar [data-acao=baixar-json]').is_visible(),'Exportar tem PDF e .json')
    await p.keyboard.press('Escape')
    await p.click('#modo-editar'); await p.wait_for_timeout(200)
    ok(p.url.endswith('/editar'),'Editar fica no endereço')
    for bid in ['sis-vampiro','sis-cacador','btn-sortear','btn-forja']:
      ok(await p.locator('#'+bid).is_visible(),'#%s visível no modo Editar'%bid)
    # mobile
    cm=await b.new_context(viewport={'width':360,'height':720}); await cm.add_init_script(INIT); pm=await cm.new_page()
    await pm.goto(SITE+'/'); await pm.wait_for_timeout(900)
    ok(await pm.locator('.tabbar').is_visible(),'mobile: barra de abas embaixo')
    await pm.click('.tabbar a:has-text("Conta")'); await pm.wait_for_timeout(300)
    ok(await pm.locator('#tela-conta a:has-text("Entrar")').is_visible(),'mobile: Entrar na aba Conta')
    ok(await pm.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile: sem rolagem horizontal da página')
    await pm.goto(SITE+'/#/fichas'); await pm.wait_for_timeout(300)
    await pm.click('#tela-fichas .pg-h [data-acao=nova]'); await pm.click('#form-nova button[value=criar]'); await pm.wait_for_timeout(700)
    ok(await pm.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile: ficha sem rolagem horizontal')
    await pm.screenshot(path='/tmp/nav-mobile.png')
    ok(not errs,'sem erros de JS '+str(errs))
    await b.close()
  print('\nFALHAS:',fail if fail else 'nenhuma'); raise SystemExit(1 if fail else 0)
asyncio.run(main())
