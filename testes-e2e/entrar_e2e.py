"""Teste da página /entrar/ (login e cadastro). Requer API em :3010 (banco vazio) e deploy/ servido em :8765."""
import asyncio, time
from playwright.async_api import async_playwright
SITE='http://localhost:8765'; API='http://localhost:3010'
INIT="try{if(!sessionStorage.getItem('i')){localStorage.setItem('ficha-de-sangue:conta:api', JSON.stringify('%s'));sessionStorage.setItem('i','1')}}catch(e){}"%API
falhas=[]
def ok(c,t):
    print(('  ok   ' if c else '  FALHA ')+t)
    if not c: falhas.append(t)
async def ctx(b, **kw):
    c=await b.new_context(**kw); await c.add_init_script(INIT); p=await c.new_page()
    p.errs=[]; p.on('pageerror',lambda e:p.errs.append(str(e))); return c,p
async def aviso(p,i=0):
    return (await p.locator('[data-aviso]:visible').first.inner_text()).strip()
async def main():
    email='jogador%d@teste.com'%int(time.time())
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        # 1. ficha local antes de ter conta
        c,p=await ctx(b)
        await p.goto(SITE+'/'); await p.wait_for_timeout(900)
        n_locais=await p.evaluate("Object.values(NV.indice.fichas).filter(m=>!m.conta&&!m.excluida).length")
        # sem fichas, o site abre em Minhas fichas vazio; cria uma em branco pelo diálogo
        await p.click('#tela-fichas .pg-h [data-acao=nova]'); await p.check('#form-nova input[value=branco]')
        await p.click('#form-nova button[value=criar]'); await p.wait_for_timeout(500)
        await p.fill('[data-bind="meta.nome"]','Ficha Antes da Conta'); await p.wait_for_timeout(500)
        await p.goto(SITE+'/entrar/'); await p.wait_for_timeout(500)
        ok(await p.locator('#f-entrar').is_visible(), 'abre na aba Entrar')
        # 2. login inexistente
        await p.fill('#e-email','naoexiste@teste.com'); await p.fill('#e-senha','senhaerrada1')
        await p.click('#f-entrar .btn'); await p.wait_for_selector('#f-entrar .aviso.erro')
        ok('incorretos' in await aviso(p),'login errado: "email ou senha incorretos"')
        await p.click('#f-entrar .btn'); 
        # campos vazios
        await p.fill('#e-email',''); await p.click('#f-entrar .btn')
        ok('email' in (await aviso(p)).lower(),'email vazio avisa')
        # mostrar senha
        await p.fill('#e-senha','abc'); await p.click('[data-ver=e-senha]')
        ok(await p.get_attribute('#e-senha','type')=='text','mostrar senha')
        # 3. cadastro: validações
        await p.click('#aba-criar'); await p.wait_for_timeout(200)
        ok(await p.locator('#f-criar').is_visible() and not await p.locator('#f-entrar').is_visible(),'aba Criar conta')
        await p.fill('#c-nome','Jogador Teste'); await p.fill('#c-email',email); await p.fill('#c-senha','curta'); await p.fill('#c-senha2','curta')
        await p.click('#f-criar .btn'); ok('8' in await aviso(p),'senha curta bloqueia')
        await p.fill('#c-senha','senhaboa123'); await p.fill('#c-senha2','outra12345'); await p.click('#f-criar .btn')
        ok('iguais' in await aviso(p),'senhas diferentes bloqueiam')
        await p.fill('#c-senha2','senhaboa123'); await p.click('#f-criar .btn')
        await p.wait_for_url(SITE+'/', timeout=8000); await p.wait_for_timeout(1500)
        tok=await p.evaluate("NV.conta && NV.conta.token && NV.conta.usuario.nome")
        ok(tok=='Jogador Teste','cadastro cria a sessão e volta para o site ('+str(tok)+')')
        await p.wait_for_function("!NV.sincronizando && Object.values(NV.indice.fichas).filter(m=>!m.excluida).every(m=>m.conta&&!m.sujo)",timeout=8000)
        nomes=await p.evaluate("Object.values(NV.indice.fichas).map(m=>m.nome)")
        ok('Ficha Antes da Conta' in nomes,'a ficha feita antes da conta foi para a conta e sincronizou '+str(nomes))
        ok(await p.evaluate("localStorage.getItem('ficha-de-sangue:adotar')")is None,'flag de adoção consumida')
        ok(not p.errs,'sem erros de JS no site '+str(p.errs))
        # 4. já logada
        await p.goto(SITE+'/entrar/'); await p.wait_for_timeout(800)
        ok(await p.locator('#logada').is_visible(),'logada vê "Você já está dentro"')
        # 5. email duplicado em outro navegador
        c2,p2=await ctx(b); await p2.goto(SITE+'/entrar/#criar'); await p2.wait_for_timeout(400)
        await p2.fill('#c-email',email.upper()); await p2.fill('#c-senha','senhaboa123'); await p2.fill('#c-senha2','senhaboa123'); await p2.click('#f-criar .btn')
        await p2.wait_for_selector('#f-criar .aviso.erro'); ok('Já existe' in await aviso(p2),'email repetido avisa')
        await p2.click('#f-criar .aviso button.link'); await p2.wait_for_timeout(200)
        ok(await p2.input_value('#e-email')==email.upper() and await p2.locator('#f-entrar').is_visible(),'"Entrar com ele" troca de aba')
        # 6. login em outro navegador, voltando para o mapa
        await p2.goto(SITE+'/entrar/?voltar=/mapa/'); await p2.wait_for_timeout(300)
        await p2.fill('#e-email',email); await p2.fill('#e-senha','senhaboa123'); await p2.click('#f-entrar .btn')
        await p2.wait_for_url(SITE+'/mapa/', timeout=8000); ok(True,'login com ?voltar=/mapa/ vai para o mapa')
        # 7. voltar de fora é ignorado
        c3,p3=await ctx(b); await p3.goto(SITE+'/entrar/?voltar=https://evil.example/x'); await p3.wait_for_timeout(300)
        await p3.fill('#e-email',email); await p3.fill('#e-senha','senhaboa123'); await p3.click('#f-entrar .btn')
        await p3.wait_for_url(SITE+'/', timeout=8000); ok(True,'voltar para fora do site é ignorado')
        # 8. celular: sem rolagem horizontal
        c4,p4=await ctx(b, viewport={'width':360,'height':700}); await p4.goto(SITE+'/entrar/#criar'); await p4.wait_for_timeout(500)
        ok(await p4.evaluate("document.documentElement.scrollWidth<=innerWidth"),'360px sem rolagem horizontal')
        await p4.screenshot(path='/tmp/entrar-mobile.png')
        c5,p5=await ctx(b, viewport={'width':1100,'height':760}); await p5.goto(SITE+'/entrar/'); await p5.wait_for_timeout(500)
        await p5.screenshot(path='/tmp/entrar-desk.png')
        # 9. servidor fora do ar
        c6,p6=await ctx(b); await p6.goto(SITE+'/entrar/'); await p6.evaluate("localStorage.setItem('ficha-de-sangue:conta:api', JSON.stringify('http://localhost:3999'))")
        await p6.goto(SITE+'/entrar/'); await p6.fill('#e-email','a@b.com'); await p6.fill('#e-senha','12345678'); await p6.click('#f-entrar .btn')
        await p6.wait_for_selector('#f-entrar .aviso.erro'); ok('servidor' in await aviso(p6),'API fora do ar: mensagem clara')
        ok(not p.errs and not p2.errs,'sem erros de JS')
        await b.close()
    print('\nFALHAS:',falhas if falhas else 'nenhuma'); raise SystemExit(1 if falhas else 0)
asyncio.run(main())
