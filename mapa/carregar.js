/* ============================================================
   Mapa da crônica — carregador

   Antes do app do mapa (app.js) subir: confere a conta da Ficha de Sangue
   (mesmo endereço, mesma sessão), escolhe a crônica, descobre se a pessoa é
   mestre ou jogadora e, se o mapa ainda não foi aberto, oferece abrir ou
   importar o Belmont antigo. Depois define window.BELMONT_MODE e window.MAPA
   e carrega o app.js.
   ============================================================ */
(function () {
  'use strict';
  var CHAVE_CONTA = 'ficha-de-sangue:conta';
  var CHAVE_CRONICA = 'ficha-de-sangue:mapa:cronica';
  var SITE = location.origin + location.pathname.replace(/\/mapa\/.*$/, '');

  function ler(chave) { try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { return null; } }
  function gravar(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* mesma regra do nuvem.js: publicado na Vercel, a API é /api no próprio endereço */
  var conta = ler(CHAVE_CONTA);
  var api = (conta && conta.api) || ler(CHAVE_CONTA + ':api') || (/\.vercel\.app$/i.test(location.hostname) ? '/api' : '');
  api = String(api || '').replace(/\/+$/, '');

  var tela = document.createElement('div');
  tela.className = 'carregando';
  function mostrar(html) {
    tela.innerHTML = '<div class="caixa">' + html + '</div>';
    if (!tela.parentNode) document.body.appendChild(tela);
  }
  function fechar() { if (tela.parentNode) tela.parentNode.removeChild(tela); }
  function entrarNaConta(motivo) {
    mostrar('<h2>MAPA DA CRÔNICA</h2><p>' + esc(motivo) + '</p>' +
      '<div class="acoes"><a class="btn" href="' + esc(SITE + '/entrar/?voltar=/mapa/') + '">Entrar na conta</a></div>');
  }

  function chamar(metodo, caminho, corpo) {
    var h = { Authorization: 'Bearer ' + conta.token };
    if (corpo !== undefined) h['Content-Type'] = 'application/json';
    return fetch(api + caminho, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.status === 401) { var e = new Error('sessão'); e.sessao = true; throw e; }
          if (!r.ok) throw new Error(d.erro || ('erro ' + r.status));
          return d;
        });
      });
  }

  function iniciar() {
    if (!api) { entrarNaConta('Este endereço não tem o servidor das fichas configurado.'); return; }
    if (!conta || !conta.token || !conta.usuario) { entrarNaConta('Entre na sua conta da Ficha de Sangue para ver o mapa da sua crônica.'); return; }
    mostrar('<h2>MAPA DA CRÔNICA</h2><p>Carregando…</p>');
    chamar('GET', '/eu').then(function (eu) {
      conta.usuario = eu.usuario;
      var cronicas = eu.cronicas || [];
      if (!cronicas.length) {
        mostrar('<h2>MAPA DA CRÔNICA</h2><p>Você ainda não está em nenhuma crônica. Peça o código ao mestre e entre em ' +
          '<b>Crônicas</b>; ou crie uma crônica para narrar.</p><div class="acoes"><a class="btn" href="' + esc(SITE + '/#/cronicas') + '">Ir para Crônicas</a></div>');
        return;
      }
      var pedida = new URLSearchParams(location.search).get('cronica') || ler(CHAVE_CRONICA);
      var escolhida = cronicas.filter(function (c) { return c.id === pedida; })[0] || (cronicas.length === 1 ? cronicas[0] : null);
      if (!escolhida) return escolher(cronicas);
      abrir(escolhida, cronicas);
    }).catch(function (e) {
      if (e.sessao) entrarNaConta('Sua sessão expirou. Entre de novo na conta da Ficha de Sangue.');
      else mostrar('<h2>MAPA DA CRÔNICA</h2><p>Não consegui falar com o servidor.</p><p class="erro">' + esc(e.message) + '</p>' +
        '<div class="acoes"><button onclick="location.reload()">Tentar de novo</button></div>');
    });
  }

  function escolher(cronicas) {
    mostrar('<h2>QUAL CRÔNICA?</h2><ul>' + cronicas.map(function (c) {
      return '<li><button data-id="' + esc(c.id) + '">' + esc(c.nome) + ' · ' + (c.papel === 'narrador' ? 'você narra' : 'você joga') + '</button></li>';
    }).join('') + '</ul>');
    tela.querySelectorAll('button[data-id]').forEach(function (b) {
      b.onclick = function () { abrir(cronicas.filter(function (c) { return c.id === b.dataset.id; })[0], cronicas); };
    });
  }

  function abrir(cr, cronicas) {
    gravar(CHAVE_CRONICA, cr.id);
    chamar('GET', '/mapa/' + cr.id + '/estado').then(function (st) {
      if (st.ativo) return subir(cr, cronicas, st.papel);
      if (st.papel !== 'narrador') {
        mostrar('<h2>' + esc(cr.nome.toUpperCase()) + '</h2><p>O mestre ainda não abriu o mapa desta crônica. Quando abrir, ele aparece aqui.</p>' +
          '<div class="acoes"><a class="btn sec" href="' + esc(SITE + '/#/cronicas/' + cr.id) + '">Voltar à crônica</a>' +
          (cronicas.length > 1 ? '<button class="sec" id="trocar">Outra crônica</button>' : '') + '</div>');
        var t = tela.querySelector('#trocar'); if (t) t.onclick = function () { escolher(cronicas); };
        return;
      }
      mostrar('<h2>' + esc(cr.nome.toUpperCase()) + '</h2><p>Esta crônica ainda não tem mapa. Você pode começar pela cidade de Belmont, ' +
        'com tudo oculto dos jogadores, ou trazer o mapa que você já montou no Belmont antigo.</p>' +
        '<div class="acoes"><button id="ativar">Abrir o mapa de Belmont</button><button class="sec" id="importar">Importar do Belmont antigo</button></div>' +
        '<p class="erro" id="msg"></p>');
      tela.querySelector('#ativar').onclick = function () {
        this.disabled = true;
        chamar('POST', '/mapa/' + cr.id + '/ativar').then(function () { subir(cr, cronicas, 'narrador'); })
          .catch(function (e) { tela.querySelector('#msg').textContent = e.message; });
      };
      tela.querySelector('#importar').onclick = function () { importar(cr, function () { subir(cr, cronicas, 'narrador'); }); };
    }).catch(function (e) {
      if (e.sessao) return entrarNaConta('Sua sessão expirou. Entre de novo na conta da Ficha de Sangue.');
      mostrar('<h2>MAPA DA CRÔNICA</h2><p class="erro">' + esc(e.message) + '</p><div class="acoes"><button onclick="location.reload()">Tentar de novo</button></div>');
    });
  }

  /* lê o belmont-export.json (gerado pelo EXPORTAR_BELMONT.bat) e manda para a API */
  function importar(cr, depois) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var dados;
        try { dados = JSON.parse(r.result); } catch (e) { return alert('Esse arquivo não é o export do Belmont (belmont-export.json).'); }
        if (dados.formato !== 'belmont-export-1') return alert('Esse arquivo não é o export do Belmont (belmont-export.json).');
        if (!confirm('Importar ' + (dados.pois || []).length + ' pontos, ' + (dados.npcs || []).length + ' personagens e ' +
          (dados.events || []).length + ' entradas de diário? O mapa atual desta crônica será substituído.')) return;
        chamar('POST', '/mapa/' + cr.id + '/importar', dados).then(function (res) {
          var i = res.importado || {};
          alert('Importado: ' + i.bairros + ' bairros, ' + i.pontos + ' pontos, ' + i.personagens + ' personagens, ' + i.diario + ' entradas de diário.');
          depois();
        }).catch(function (e) { alert('Não consegui importar: ' + e.message); });
      };
      r.readAsText(f);
    };
    inp.click();
  }

  function subir(cr, cronicas, papel) {
    var mestre = papel === 'narrador';
    window.BELMONT_MODE = mestre ? 'gm' : 'player';
    window.MAPA = {
      base: api + '/mapa/' + cr.id,
      token: conta.token,
      usuario: conta.usuario,
      cronica: cr,
      papel: papel,
      site: SITE,
      sessaoExpirada: function () { entrarNaConta('Sua sessão expirou. Entre de novo na conta da Ficha de Sangue.'); },
      /* fichas que o mestre pode ligar a um personagem: as dele e as da crônica */
      fichasParaLigar: function () {
        return Promise.all([chamar('GET', '/fichas'), chamar('GET', '/cronicas/' + cr.id)]).then(function (r) {
          var vistas = {}, lista = [];
          r[0].fichas.forEach(function (f) { vistas[f.id] = 1; lista.push({ id: f.id, nome: f.nome, dono: '' }); });
          r[1].fichas.forEach(function (f) { if (!vistas[f.id]) lista.push({ id: f.id, nome: f.nome, dono: f.dono }); });
          return lista.sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || ''); });
        });
      }
    };
    var nav = document.getElementById('navCronica');
    if (nav) {
      nav.innerHTML = cronicas.length > 1
        ? '<select aria-label="Crônica">' + cronicas.map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (c.id === cr.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>';
          }).join('') + '</select>'
        : esc(cr.nome) + (mestre ? ' · você narra' : '');
      if (cronicas.length > 1) nav.insertAdjacentHTML('afterbegin', '<span class="rot">Crônica</span>');
      var lc = document.getElementById('fsLinkCronica'); if (lc) lc.href = SITE + '/#/cronicas/' + cr.id;
      var sel = nav.querySelector('select');
      if (sel) sel.onchange = function () { gravar(CHAVE_CRONICA, sel.value); location.search = '?cronica=' + encodeURIComponent(sel.value); };
    }
    var bi = document.getElementById('btnImportar');
    if (bi && mestre) { bi.hidden = false; bi.onclick = function () { importar(cr, function () { location.reload(); }); }; }
    fechar();
    var s = document.createElement('script');
    s.src = 'app.js';
    document.body.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
