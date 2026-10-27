import asyncio,time
from playwright.async_api import async_playwright
SITE='http://localhost:8765';API='http://localhost:3010'
INIT="try{localStorage.setItem('ficha-de-sangue:conta:api',JSON.stringify('%s'))}catch(e){}"%API
PDF={'Físicas':['Armas Brancas','Armas de Fogo','Atletismo','Briga','Condução','Furtividade','Ladroagem','Ofícios','Sobrevivência'],
'Sociais':['Empatia com Animais','Etiqueta','Intimidação','Liderança','Manha','Performance','Persuasão','Sagacidade','Subterfúgio'],
'Mentais':['Ciência','Erudição','Finanças','Investigação','Medicina','Ocultismo','Percepção','Política','Tecnologia']}
async def main():
  fail=[]
  def ok(c,t):
    print(('  ok   ' if c else '  FALHA ')+t); 
    if not c: fail.append(t)
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); c=await b.new_context(viewport={'width':1200,'height':900}); await c.add_init_script(INIT)
    p=await c.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)))
    await p.goto(SITE+'/'); await p.wait_for_timeout(900)
    # ordem das perícias, por coluna
    cols=await p.evaluate("""() => {
      const out={};
      document.querySelectorAll('.card').forEach(card=>{
        const h=card.querySelector('.card-h h2'); if(!h||!/HABILIDADES/i.test(h.textContent))return;
        card.querySelectorAll('div').forEach(()=>{});
        card.querySelectorAll('.trait').forEach(()=>{});
      });
      return out;
    }""")
    nomes=await p.evaluate("""() => {
      const card=[...document.querySelectorAll('.card')].find(c=>/HABILIDADES/i.test((c.querySelector('.card-h h2')||{}).textContent||''));
      return card ? [...card.querySelectorAll('.trait .nm')].map(n=>n.childNodes[0].textContent.trim()) : null; }""")
    if not nomes: ok(False,'não achei o card de HABILIDADES')
    else:
      for i,(cat,exp) in enumerate(PDF.items()):
        got=nomes[i*9:(i+1)*9]
        ok(got==exp, '%s na ordem do PDF'%cat + ('' if got==exp else ' -> '+str(got)))
    # Minhas fichas deslogado: sem segundo formulário de login, aponta para Entrar/Criar conta
    await p.goto(SITE+'/#/fichas'); await p.wait_for_timeout(400)
    ok(await p.locator('#view-fichas').is_visible(),'Minhas fichas abre')
    ok(await p.locator('#view-fichas #nv-email').count()==0,'deslogado: NÃO tem formulário de login (sem duplicidade)')
    ok(await p.locator('#tela-fichas .faixa a:has-text("Entrar")').count()==1,'deslogado: faixa aponta para Entrar')
    await p.screenshot(path='/tmp/ord-habil.png')
    # logado: a lista não repete Sair/Sincronizar (ficam no menu da conta)
    email='ord%d@t.com'%int(time.time())
    await p.goto(SITE+'/entrar/'); await p.click('#aba-criar'); await p.wait_for_timeout(300)
    await p.fill('#c-email',email); await p.fill('#c-senha','senha12345'); await p.fill('#c-senha2','senha12345'); await p.fill('#c-nome','Teste Ordem')
    await p.click('#f-criar .btn'); await p.wait_for_url(SITE+'/',timeout=8000); await p.wait_for_timeout(1000)
    ok(await p.locator('#tela-fichas [data-nv=sair]').count()==0,'logado: lista NÃO repete Sair (fica no menu da conta)')
    ok(await p.locator('#tela-fichas .faixa').count()==0,'logado: sem a faixa de "só neste navegador"')
    await p.screenshot(path='/tmp/ord-painel-logado.png')
    ok(not errs,'sem erros de JS '+str(errs))
    await b.close()
  print('\nFALHAS:',fail if fail else 'nenhuma'); raise SystemExit(1 if fail else 0)
asyncio.run(main())
