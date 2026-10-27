"""Importar fichas de Vampiro feitas em outros lugares (src/importar.js), sem conta.

Requer o site servido em E2E_SITE (padrão http://localhost:8765/, o deploy/ do subir.sh;
`node servidor.js` também serve: E2E_SITE=http://localhost:4777/).
As fichas de teste ficam em testes-e2e/fixtures (node testes-e2e/fixtures/gerar.js recria os PDFs).

Confere, para cada fonte, que a conferência abre, o que ela reconhece e a ficha criada:
  - PDF em inglês com campos de nome legível
  - o mesmo PDF com todos os campos genéricos (Check Box 37): leitura pela posição
  - PDF sem campos (lido como texto)
  - JSON do Foundry VTT (WoD5e)
  - texto colado em espanhol
e que a ficha do próprio app (PDF e JSON) continua entrando direto, sem conferência."""
import asyncio, os, base64, json
from playwright.async_api import async_playwright

SITE = os.environ.get('E2E_SITE', 'http://localhost:8765/')
FX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
falhas = []
def ok(c, t):
    print(('  ok   ' if c else '  FALHA ') + t)
    if not c: falhas.append(t)

ESTADO = """() => ({ meta: S.meta, atr: S.atr, hab: S.hab, esp: S.esp, disc: S.disc, vant: S.vant, def: S.def,
  conv: S.conv, hum: S.humanidade, man: S.manchas, fome: S.fome, xp: [S.xpTotal, S.xpGasto], tenets: S.tenets,
  notas: S.notas, importada: !!S.importada })"""

async def importar(p, arquivo=None, texto=None):
    await p.goto(SITE + '#/fichas'); await p.wait_for_timeout(500)
    await p.click('#tela-fichas .pg-h [data-acao=importar]')
    if texto is not None:
        await p.fill('#importar-texto', texto); await p.click('[data-acao=importar-texto]')
    else:
        await p.set_input_files('#arquivo-importar', os.path.join(FX, arquivo))
    try:
        await p.wait_for_selector('#dlg-conferir[open]', timeout=25000)
    except Exception:
        return None
    return {
        'resumo': ' '.join((await p.text_content('.imp-resumo')).split()),
        'sobras': await p.evaluate("IMP_P.sobras.map(x => x.rotulo + ' = ' + x.valor)"),
        'aprox': await p.locator('#dlg-conferir .aprox').count(),
    }

async def criar(p):
    await p.click('#imp-criar'); await p.wait_for_timeout(700)
    return await p.evaluate(ESTADO)

def disc(s, nome): return next((d for d in s['disc'] if d['nome'] == nome), None)
def vant(s, nome, tipo='vant'): return next((v for v in s[tipo] if v['nome'] == nome), None)

async def ficha_en(p, arquivo, como):
    c = await importar(p, arquivo)
    ok(c is not None, f'{arquivo}: abre a conferência')
    if not c: return
    ok(not c['sobras'], f'{arquivo}: nada sem reconhecer ({c["sobras"]})')
    ok(como in c['resumo'], f'{arquivo}: lido {como} ({c["resumo"][:90]})')
    s = await criar(p)
    ok(s['meta']['nome'] == 'Marcus Vale' and s['meta']['cla'] == 'Ventrue' and s['meta']['geracao'] == 11, f'{arquivo}: nome, clã, geração')
    ok(s['meta']['predador'] == 'Consensual', f'{arquivo}: "Consensualist" vira Consensual')
    ok(s['atr'] == {'forca': 2, 'destreza': 2, 'vigor': 3, 'carisma': 3, 'manipulacao': 2, 'autocontrole': 4, 'inteligencia': 3, 'raciocinio': 2, 'determinacao': 1}, f'{arquivo}: os nove Atributos')
    ok(s['hab']['etiqueta'] == 3 and s['hab']['financas'] == 3 and s['hab']['armasfogo'] == 2 and s['hab']['briga'] == 0, f'{arquivo}: Habilidades')
    ok(s['esp'].get('etiqueta') == 'Elysium' and s['esp'].get('financas') == 'Banking', f'{arquivo}: especializações separadas por vírgula')
    d = disc(s, 'Dominação')
    ok(d and d['nivel'] == 2 and d['poderes'] == ['Compelir', 'Hipnotizar'], f'{arquivo}: Dominate 2 com Compel e Mesmerize traduzidos')
    ok(disc(s, 'Presença') and disc(s, 'Fortitude'), f'{arquivo}: as três Disciplinas')
    r = vant(s, 'Recursos'); inf = vant(s, 'Influência')
    ok(r and r['pontos'] == 3 and inf and inf['nota'] == 'Banks', f'{arquivo}: Vantagens com pontos e detalhe')
    ok(vant(s, 'Exclusão de Presa', 'def') and vant(s, 'Segredo Sombrio', 'def'), f'{arquivo}: Defeitos')
    ok(s['hum'] == 6 and s['fome'] == 2 and s['xp'] == [25, 12], f'{arquivo}: Humanidade, Fome e XP')
    ok(len(s['conv']) == 2 and s['conv'][0]['pedra'].startswith('Old Mr. Pires'), f'{arquivo}: "convicção -> pilar" separado')
    ok(s['importada'], f'{arquivo}: marcada como importada')

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        c = await b.new_context(viewport={'width': 1280, 'height': 900}); p = await c.new_page()
        erros = []; p.on('pageerror', lambda e: erros.append(str(e)))
        await p.goto(SITE); await p.wait_for_timeout(800)

        print('PDF de outros lugares')
        await ficha_en(p, 'en-nomes.pdf', 'pelo nome do campo')
        await ficha_en(p, 'en-genericos.pdf', 'pela posição na página')

        print('PDF sem campos')
        cf = await importar(p, 'achatado.pdf')
        ok(cf and 'lido como texto' in cf['resumo'], 'achatado.pdf: lido como texto, com aviso')
        if cf:
            s = await criar(p)
            ok(s['meta']['cla'] == 'Gangrel' and s['atr']['vigor'] == 4 and s['hab']['sobrevivencia'] == 3, 'achatado.pdf: clã, Atributos, Habilidades')
            ok(disc(s, 'Proteanismo') and disc(s, 'Proteanismo')['nivel'] == 2, 'achatado.pdf: Protean 2')

        print('Foundry VTT')
        cf = await importar(p, 'foundry.json')
        ok(cf and 'Foundry' in cf['resumo'] and not cf['sobras'], 'foundry.json: reconhecido como Foundry, nada sobrando')
        if cf:
            s = await criar(p)
            ok(s['meta']['cla'] == 'Toreador' and s['meta']['predador'] == 'Sereia', 'foundry.json: clã e predador (Siren → Sereia) dos itens')
            pr = disc(s, 'Presença')
            ok(pr and pr['nivel'] == 3 and set(pr['poderes']) == {'Deslumbrar', 'Fascinar', 'Amedrontar'}, 'foundry.json: Presença 3 com poderes')
            ok(s['esp'].get('atuacao') == 'Singing', 'foundry.json: especialização dos bônus')
            ok(vant(s, 'Predador Manifesto', 'def') and vant(s, 'Rebanho'), 'foundry.json: features viram Vantagens e Defeitos')
            ok(s['man'] == 1 and s['xp'] == [20, 15] and 'Elysium' in s['tenets'], 'foundry.json: máculas, XP e princípios')

        print('Texto colado (espanhol)')
        cf = await importar(p, texto=open(os.path.join(FX, 'texto-es.txt'), encoding='utf-8').read())
        ok(cf is not None, 'texto: abre a conferência')
        ok(cf and cf['aprox'] >= 1, 'texto: termo aproximado marcado em âmbar ("Contactos")')
        if cf:
            s = await criar(p)
            ok(s['meta']['cla'] == 'Lasombra' and s['meta']['seita'] == 'Anarquista' and s['meta']['predador'] == 'Vira-lata', 'texto: clã, seita, "Gato callejero" → Vira-lata')
            ok(s['atr']['vigor'] == 4 and s['atr']['raciocinio'] == 3 and s['hab']['briga'] == 3 and s['hab']['manha'] == 2, 'texto: ●●●○○ e números')
            ob = disc(s, 'Oblívio')
            ok(ob and ob['nivel'] == 2 and 'Manto Sombrio' in ob['poderes'], 'texto: Oblivion 2 e o poder entre parênteses')
            ok(s['conv'] and s['conv'][0]['pedra'] == 'Diego, su hermano', 'texto: convicção → pilar')

        print('Ficha deste app continua entrando direto')
        await p.goto(SITE + '#/fichas'); await p.wait_for_timeout(400)
        await p.click('#tela-fichas .pg-h [data-acao=nova]'); await p.click('#form-nova button[value=criar]'); await p.wait_for_timeout(700)
        nome = await p.evaluate('S.meta.nome'); js = await p.evaluate('JSON.stringify(S)')
        b64 = await p.evaluate("""async () => { await garantirPdf(() => {}); const by = await gerarPdf(S, dadosPdf(), PDFLib);
            let s = ''; by.forEach(x => s += String.fromCharCode(x)); return btoa(s); }""")
        proprio = os.path.join(FX, '..', 'proprio-tmp.pdf')
        open(proprio, 'wb').write(base64.b64decode(b64))
        await p.goto(SITE + '#/fichas'); await p.wait_for_timeout(400)
        await p.click('#tela-fichas .pg-h [data-acao=importar]'); await p.set_input_files('#arquivo-importar', proprio); await p.wait_for_timeout(2500)
        ok(await p.locator('#dlg-conferir[open]').count() == 0 and await p.evaluate('S.meta.nome') == nome, 'PDF do app: abre direto, sem conferência')
        ok(not await p.evaluate('!!S.importada'), 'PDF do app: não é marcada como importada')
        os.remove(proprio)
        r = await importar(p, texto=js)
        ok(r is None and await p.evaluate('S.meta.nome') == nome, 'JSON do app: entra direto')

        ok(not erros, 'sem erros de JavaScript ' + str(erros))
        await b.close()
    print('\n' + ('TUDO OK' if not falhas else f'{len(falhas)} FALHA(S)'))
    raise SystemExit(1 if falhas else 0)

asyncio.run(main())
