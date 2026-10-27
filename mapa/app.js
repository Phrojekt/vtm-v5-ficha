(function(){
  // 'player' = site público (Vercel): somente leitura, sem login, lê data/public.json.
  // 'gm'     = servidor local do mestre: API, login e edição.
  var PLAYER = window.BELMONT_MODE === 'player';
  if (PLAYER) document.querySelector('.app').classList.add('player-mode');
  var FACTION_LABEL = {camarilla:'Camarilla', anarch:'Anarch', neutral:'Neutro'};
  var TYPES = [['refugio','Refúgio'],['negocio','Negócio'],['poder','Governo & Poder'],
    ['cultura','Cultural & Histórico'],['perigo','Perigo & Ameaça'],['infra','Infraestrutura'],['outro','Outro']];
  var TYPE_LABEL = {}; TYPES.forEach(function(t){ TYPE_LABEL[t[0]] = t[1]; });
  var ICON_TYPE = { house:'refugio', warehouse:'negocio', business:'negocio', market:'negocio', nightlife:'negocio',
    shield:'poder', gov:'poder', clock:'poder', museum:'cultura', book:'cultura', theater:'cultura', church:'cultura',
    school:'cultura', park:'cultura', cemetery:'perigo', factory:'perigo', wheel:'perigo',
    tunnel:'infra', train:'infra', boat:'infra', medical:'infra', star:'outro' };

  var LABEL_POS = {
    'campus-ledeberg':[170,392],'groenveld':[512,236],'vila-ancoradouro':[690,306],'bovenstad':[1002,206],
    'jardins-van-doorn':[1702,112],'molhe-das-artes':[2160,590],'quartier-sainte-claire':[546,700],
    'necropole':[248,802],'centro-historico':[900,660],'begijnhof':[1256,742],'hoogpoort':[1420,500],
    'praia-do-corvo':[1740,1010],'distrito-diversao':[1486,1186],'vismarkt':[906,1026],
    'spoorwijk':[600,962],'kaaidistrict':[1306,962],'reederij':[1006,1188],'castelo-museu':[246,1180],
    'mata-sombria':[566,1206],'schrootveld':[168,1246],'sint-michiels':[218,1660],
    'distrito-montoya':[930,1640],'zwarthof':[1178,1290],
    'doca-sul':[1434,1690],'nieuwpoort':[1742,1786]
  };
  var ICONS = ['church','shield','museum','house','warehouse','nightlife','business','star','park',
    'wheel','cemetery','medical','gov','clock','book','boat','train','theater','tunnel','factory','market','school'];

  // Dados vivos do mapa: preenchidos por load() a partir de /data/city.json,
  // /data/districts.json e da API (/api/pois, /api/scenes, /api/auth/me).
  // Não há mais conceito de "override" — o que está no banco (SQLite) É o
  // dado atual; editar um ponto atualiza a linha diretamente pra todo mundo.
  var CITY = null;
  var DISTRICTS = [];
  var POIS = [];
  var districtById = {};
  var poiById = {};
  var scenesMap = {};
  var NPCS = [];
  var npcById = {};

  function mergeDistrictGeometry(){
    DISTRICTS.forEach(function(d){
      var g = CITY.districts[d.id];
      if (d.geom && d.geom.length >= 3){
        /* contorno desenhado no editor */
        d.d = ptsParaD(d.geom, true); var c = centroide(d.geom); d.cx = c[0]; d.cy = c[1];
      } else if (g){
        d.d = g.d; d.cx = g.cx; d.cy = g.cy;
        var lp = LABEL_POS[d.id];
        if (lp){ d.cx = lp[0]; d.cy = lp[1]; }
      }
      if (d.labelX != null && d.labelY != null){ d.cx = d.labelX; d.cy = d.labelY; }
    });
    DISTRICTS = DISTRICTS.filter(function(d){ return d.d; });
    districtById = {}; DISTRICTS.forEach(function(d){ districtById[d.id] = d; });
  }
  function indexPois(){
    POIS.forEach(function(p){ if (!p.type) p.type = ICON_TYPE[p.icon] || 'outro'; });
    poiById = {}; POIS.forEach(function(p){ poiById[p.id] = p; });
  }

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var geoL = document.getElementById('geoLayer'), blocksL = document.getElementById('blocksLayer'),
      detailL = document.getElementById('detailLayer'), minorL = document.getElementById('minorLabels'),
      distL = document.getElementById('districtsLayer'), labelsL = document.getElementById('labelsLayer'),
      poisL = document.getElementById('poisLayer'), chromeL = document.getElementById('chromeLayer');
  var tooltip = document.getElementById('tooltip'), mapWrap = document.getElementById('mapWrap'),
      detail = document.getElementById('detail'), indexEl = document.getElementById('index'),
      legendEl = document.getElementById('legend'), searchInput = document.getElementById('searchInput');
  var state = { faction:'all', type:'all', query:'', selected:null, indexTab:'territory' };
  var mapSvgEl = document.getElementById('mapSvg');

  // ---------- navegação (pan + zoom) ----------
  var VB_FULL = {x:0, y:0, w:2600, h:1820};
  var vb = {x:0, y:0, w:2600, h:1820};
  var MAX_SCALE = 7, MIN_SCALE = 1;
  function applyVB(){ mapSvgEl.setAttribute('viewBox', vb.x.toFixed(1)+' '+vb.y.toFixed(1)+' '+vb.w.toFixed(1)+' '+vb.h.toFixed(1)); aoMudarVB(); }
  /* enquadra o mapa numa região (x, y, largura); usado pelos testes e por atalhos */
  window.mapaIrPara = function(x, y, w){ vb.w = w; vb.h = w * VB_FULL.h / VB_FULL.w; vb.x = x; vb.y = y; clampVB(); applyVB(); };
  function clampVB(){
    if (vb.w > VB_FULL.w) vb.w = VB_FULL.w;
    if (vb.h > VB_FULL.h) vb.h = VB_FULL.h;
    if (vb.x < VB_FULL.x) vb.x = VB_FULL.x;
    if (vb.y < VB_FULL.y) vb.y = VB_FULL.y;
    if (vb.x + vb.w > VB_FULL.x + VB_FULL.w) vb.x = VB_FULL.x + VB_FULL.w - vb.w;
    if (vb.y + vb.h > VB_FULL.y + VB_FULL.h) vb.y = VB_FULL.y + VB_FULL.h - vb.h;
  }
  function zoomAt(factor, cx, cy){
    if (cx == null){ cx = vb.x + vb.w/2; cy = vb.y + vb.h/2; }
    var minW = VB_FULL.w / MAX_SCALE, maxW = VB_FULL.w / MIN_SCALE;
    var newW = Math.max(minW, Math.min(maxW, vb.w / factor));
    var newH = newW * (VB_FULL.h / VB_FULL.w);
    var ratio = newW / vb.w;
    vb.x = cx - (cx - vb.x) * ratio;
    vb.y = cy - (cy - vb.y) * ratio;
    vb.w = newW; vb.h = newH;
    clampVB(); applyVB(); updateNavState();
  }
  function resetVB(){ vb = {x:VB_FULL.x, y:VB_FULL.y, w:VB_FULL.w, h:VB_FULL.h}; applyVB(); updateNavState(); }
  // com preserveAspectRatio="xMidYMid meet" o conteúdo do svg fica centralizado
  // dentro do elemento com faixas vazias (letterbox) quando a proporção do
  // contêiner não bate com a do viewBox. Pra mapear pixel de tela -> coordenada
  // do mapa corretamente (clique, zoom no cursor, arraste de marcador) é preciso
  // calcular o retângulo real do conteúdo renderizado, não o do elemento inteiro.
  function svgContentRect(){
    var r = mapSvgEl.getBoundingClientRect();
    var svgAspect = VB_FULL.w / VB_FULL.h, boxAspect = r.width / r.height;
    var cw, ch, cx, cy;
    if (boxAspect > svgAspect){ ch = r.height; cw = ch * svgAspect; cx = r.left + (r.width - cw) / 2; cy = r.top; }
    else { cw = r.width; ch = cw / svgAspect; cx = r.left; cy = r.top + (r.height - ch) / 2; }
    return { left:cx, top:cy, width:cw, height:ch };
  }
  function svgPoint(ev){
    var r = svgContentRect();
    var scaleX = vb.w / r.width, scaleY = vb.h / r.height;
    return { x: vb.x + (ev.clientX - r.left) * scaleX, y: vb.y + (ev.clientY - r.top) * scaleY, r:r, scaleX:scaleX, scaleY:scaleY };
  }
  var navResetBtn = document.querySelector('.mapnav button.reset') || document.querySelector('.mapnav button[data-act="reset"]');
  function updateNavState(){
    var atFull = vb.w >= VB_FULL.w - .5;
    if (navResetBtn) navResetBtn.style.opacity = atFull ? '.4' : '1';
  }

  // arrastar (mouse + toque)
  // Importante: só chamamos setPointerCapture depois que o arraste é confirmado
  // (passou do limiar de movimento). Capturar já no pointerdown faz o navegador
  // retornar o "click" nativo pro elemento capturado em vez do alvo real,
  // quebrando a seleção de bairros/POIs num clique simples.
  var dragging = false, dragMoved = false, dragCaptured = false, dragStart = null, vbStart = null, dragPointerId = null;
  mapSvgEl.addEventListener('pointerdown', function(ev){
    if (ev.button != null && ev.button !== 0) return;
    dragging = true; dragMoved = false; dragCaptured = false;
    dragStart = { x: ev.clientX, y: ev.clientY };
    vbStart = { x: vb.x, y: vb.y };
    dragPointerId = ev.pointerId;
  });
  mapSvgEl.addEventListener('pointermove', function(ev){
    if (!dragging) return;
    var dx = ev.clientX - dragStart.x, dy = ev.clientY - dragStart.y;
    if (!dragMoved){
      if (Math.abs(dx) + Math.abs(dy) <= 3) return;
      dragMoved = true;
      dragCaptured = true;
      mapSvgEl.classList.add('grabbing');
      try{ mapSvgEl.setPointerCapture(dragPointerId); }catch(e){}
    }
    var r = svgContentRect();
    vb.x = vbStart.x - dx * (vb.w / r.width);
    vb.y = vbStart.y - dy * (vb.h / r.height);
    clampVB(); applyVB();
  });
  function endDrag(ev){
    if (!dragging) return;
    dragging = false;
    mapSvgEl.classList.remove('grabbing');
    if (dragMoved){ suppressClick = true; }
    if (dragCaptured){
      try{ if (ev && ev.pointerId != null) mapSvgEl.releasePointerCapture(ev.pointerId); else mapSvgEl.releasePointerCapture(dragPointerId); }catch(e){}
    }
    dragCaptured = false;
  }
  mapSvgEl.addEventListener('pointerup', endDrag);
  mapSvgEl.addEventListener('pointercancel', endDrag);
  mapSvgEl.addEventListener('pointerleave', function(ev){ if (dragging && dragCaptured) endDrag(ev); });
  // rede de segurança: se o ponteiro soltar fora do svg antes do limiar de arraste, ainda assim destrava
  window.addEventListener('pointerup', function(ev){ if (dragging && !dragCaptured) endDrag(ev); });

  // roda do mouse = zoom
  mapSvgEl.addEventListener('wheel', function(ev){
    ev.preventDefault();
    var pt = svgPoint(ev);
    zoomAt(ev.deltaY < 0 ? 1.22 : 1/1.22, pt.x, pt.y);
    hideHintSoon();
  }, { passive:false });

  // pinça (dois dedos) para zoom no toque
  var pinch = null;
  mapSvgEl.addEventListener('touchstart', function(ev){
    if (ev.touches.length === 2){
      dragging = false;
      var t0 = ev.touches[0], t1 = ev.touches[1];
      pinch = { d: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY), vbw: vb.w };
    }
  }, { passive:true });
  mapSvgEl.addEventListener('touchmove', function(ev){
    if (ev.touches.length === 2 && pinch){
      ev.preventDefault();
      var t0 = ev.touches[0], t1 = ev.touches[1];
      var d = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      var cx = (t0.clientX + t1.clientX) / 2, cy = (t0.clientY + t1.clientY) / 2;
      var pt = svgPoint({ clientX: cx, clientY: cy });
      zoomAt(d / pinch.d, pt.x, pt.y);
      pinch.d = d;
    }
  }, { passive:false });
  mapSvgEl.addEventListener('touchend', function(ev){ if (ev.touches.length < 2) pinch = null; });

  // duplo-clique = aproximar
  mapSvgEl.addEventListener('dblclick', function(ev){
    if (editMode && (draw || vert || tool !== 'selecionar')) return;
    var pt = svgPoint(ev);
    zoomAt(1.6, pt.x, pt.y);
  });

  // botoes de navegacao
  var mapNavEl = document.getElementById('mapNav');
  if (mapNavEl) mapNavEl.addEventListener('click', function(ev){
    var btn = ev.target.closest('button'); if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'in') zoomAt(1.5);
    else if (act === 'out') zoomAt(1/1.5);
    else if (act === 'reset') resetVB();
  });

  // dica de uso: aparece na primeira interação com o teclado/hover e some sozinha
  var mapHintEl = document.getElementById('mapHint'), hintTimer = null;
  function hideHintSoon(){ if (mapHintEl) mapHintEl.classList.remove('show'); }
  if (mapHintEl){
    mapWrap.addEventListener('mouseenter', function(){
      mapHintEl.classList.add('show');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(hideHintSoon, 2600);
    });
  }

  // suprime o clique de deselecionar/selecionar logo apos um arraste
  var suppressClick = false;
  mapSvgEl.addEventListener('click', function(ev){
    if (suppressClick){ ev.stopPropagation(); ev.preventDefault(); suppressClick = false; }
  }, true);

  // Desenha a geometria da cidade (terreno, vias, água) — de novo sempre que a
  // cidade muda (o mestre apaga algo no editor, ou o jogador recebe a versão nova).
  // Cada elemento que pode ser apagado leva data-k (a chave que vai para o servidor).
  var BASE_ITENS = []; // { k, rot, pts } — para a borracha saber o que cabe dentro da área
  function renderStaticGeo(){
  [geoL, blocksL, detailL, minorL, chromeL].forEach(function(L){ while (L.firstChild) L.removeChild(L.firstChild); });
  BASE_ITENS = [];
  function marca(e, k, rot){ e.setAttribute('data-k', k); e.setAttribute('data-rot', rot); e.classList.add('base-el'); return e; }
  function item(k, rot, pts){ BASE_ITENS.push({ k:k, rot:rot, pts:pts }); }
  // ---------- base ----------
  el('rect', {x:0, y:0, width:2600, height:1820, class:'sea'}, geoL);
  el('path', {d:CITY.bathy[2], class:'bathy-1'}, geoL);
  el('path', {d:CITY.bathy[1], class:'bathy-2'}, geoL);
  el('path', {d:CITY.bathy[0], class:'bathy-3'}, geoL);
  el('path', {d:CITY.land, class:'land'}, geoL);
  [['forest','mata','mata'],['park2','parque','parque'],['park3','parque','parque'],['beach','areia','areia'],['wasteland','baldio','terreno baldio']].forEach(function(c){
    subpaths(CITY[c[0]]).forEach(function(sp){
      var k = chave(c[1], sp); if (!vivo(k)) return;
      if (c[0] === 'beach'){ marca(el('path', {d:sp, class:'beach'}, geoL), k, c[2]); el('path', {d:sp, class:'beach-edge'}, geoL); }
      else marca(el('path', {d:sp, class:c[0] === 'wasteland' ? 'wasteland' : 'forest'}, geoL), k, c[2]);
      item(k, c[2], dParaPts(sp));
    });
  });

  CITY.blocks.forEach(function(b){
    var k = chave('quadra', b); if (!vivo(k)) return;
    marca(el('path', {d:b.d, class:'blk-'+b.t}, blocksL), k, 'quadra'); item(k, 'quadra', dParaPts(b.d));
  });
  (CITY.squares||[]).forEach(function(sq){
    var k = chave('praca', sq); if (!vivo(k)) return;
    marca(el('path', {d:sq.d, class:'square'}, blocksL), k, 'praça ' + (sq.nl || '')); item(k, 'praça', dParaPts(sq.d));
  });
  CITY.trees.forEach(function(t){
    var k = chave('arvore', t); if (!vivo(k)) return;
    marca(el('circle', {cx:t[0], cy:t[1], r:t[2], class:'tree'}, detailL), k, 'árvore'); item(k, 'árvore', [[t[0], t[1]]]);
  });

  // vias
  var kRail = chave('linha', 'rail'), kShore = chave('linha', 'shore_ave'), kRing = chave('linha', 'ring'), kExp = chave('linha', 'expressway');
  if (vivo(kRail)) marca(el('path', {d:CITY.rail, class:'rail'}, detailL), kRail, 'ferrovia');
  var avs = (CITY.avenues||[]).map(function(a){ return { a:a, k:chave('avenida', a) }; }).filter(function(x){ return vivo(x.k); });
  avs.forEach(function(x){ marca(el('path', {d:x.a.d, class:'road-casing arterial-casing'}, detailL), x.k, 'avenida ' + x.a.nl); item(x.k, 'avenida ' + x.a.nl, dParaPts(x.a.d)); });
  if (vivo(kShore)) marca(el('path', {d:CITY.shore_ave, class:'road-casing shore-casing'}, detailL), kShore, 'avenida da orla');
  if (vivo(kRing)) marca(el('path', {d:CITY.ring, class:'road-casing ring-casing'}, detailL), kRing, 'Ringlaan');
  avs.forEach(function(x){ marca(el('path', {d:x.a.d, class:'road-core arterial-core'}, detailL), x.k, 'avenida ' + x.a.nl); });
  if (vivo(kShore)) marca(el('path', {d:CITY.shore_ave, class:'road-core shore-core'}, detailL), kShore, 'avenida da orla');
  if (vivo(kRing)){
    marca(el('path', {d:CITY.ring, class:'road-core ring-core'}, detailL), kRing, 'Ringlaan');
    el('path', {d:CITY.ring, class:'ring-wall'}, detailL);
  }

  // viaduto de 1972
  if (vivo(kExp)){
    marca(el('path', {d:CITY.expressway, class:'expressway'}, detailL), kExp, 'viaduto');
    el('path', {d:CITY.expressway, class:'expressway-mid'}, detailL);
    (CITY.expw_piers||[]).forEach(function(p){ el('rect', {x:p[0]-3.4, y:p[1]-3.4, width:6.8, height:6.8, class:'expw-pier'}, detailL); });
  }

  // agua
  el('path', {d:CITY.river, class:'river'}, detailL);
  el('path', {d:CITY.docks, class:'river'}, detailL);
  el('path', {d:CITY.quays, class:'quay'}, detailL);
  el('path', {d:CITY.river, class:'river-edge'}, detailL);
  el('path', {d:CITY.docks, class:'river-edge'}, detailL);
  el('path', {d:CITY.coast, class:'coastline'}, detailL);

  // estruturas maritimas (todas ancoradas na costa)
  [['breakwater','breakwater','quebra-mar'],['marina','pier','marina'],['pier','pier','píer'],['pier_walk','road-core shore-core','passeio do píer']].forEach(function(c){
    var k = chave('linha', c[0]); if (!CITY[c[0]] || !vivo(k)) return;
    marca(el('path', {d:CITY[c[0]], class:c[1]}, detailL), k, c[2]);
  });
  (CITY.piles||[]).forEach(function(p){
    var k = chave('estaca', p); if (!vivo(k)) return;
    marca(el('circle', {cx:p[0], cy:p[1], r:2.8, fill:'#4b5364'}, detailL), k, 'estaca'); item(k, 'estaca', [[p[0], p[1]]]);
  });
  (CITY.boats||[]).forEach(function(b){
    var k = chave('barco', b); if (!vivo(k)) return;
    marca(el('rect', {x:b[0]-8, y:b[1]-2.6, width:16, height:5.2, rx:2.2, class:'boat',
      transform:'rotate('+(b[2]||0)+' '+b[0]+' '+b[1]+')'}, detailL), k, 'barco');
    item(k, 'barco', [[b[0], b[1]]]);
  });
  (CITY.lighthouses||[]).forEach(function(l){
    var k = chave('farol', l); if (!vivo(k)) return;
    var g = marca(el('g', {class:'lighthouse', transform:'translate('+l[0]+','+l[1]+')'}, detailL), k, 'farol');
    el('path', {d:'M0,0 L26,-15 L26,15 Z', class:'beam'}, g);
    el('circle', {r:5.2}, g);
    item(k, 'farol', [[l[0], l[1]]]);
  });

  // ferry + passarelas
  var kFerry = chave('linha', 'ferry');
  if (CITY.ferry && vivo(kFerry)) marca(el('line', {x1:CITY.ferry.x1, y1:CITY.ferry.y1, x2:CITY.ferry.x2, y2:CITY.ferry.y2, class:'ferry'}, detailL), kFerry, 'balsa');
  (CITY.footbridges||[]).forEach(function(f){
    var k = chave('passarela', f); if (!vivo(k)) return;
    marca(el('line', {x1:f.x1, y1:f.y1, x2:f.x2, y2:f.y2, class:'footbridge'}, detailL), k, 'passarela');
    item(k, 'passarela', [[f.x1, f.y1], [f.x2, f.y2]]);
  });

  // guindastes
  (CITY.cranes||[]).forEach(function(c){
    var k = chave('guindaste', c); if (!vivo(k)) return;
    var g = marca(el('g', {transform:'translate('+c[0]+','+c[1]+') rotate('+c[2]+')'}, detailL), k, 'guindaste');
    el('path', {d:'M0,0 L0,-21 L24,-21 M0,-21 L-7,-21', fill:'none', stroke:'#6a7386', 'stroke-width':2}, g);
    el('rect', {x:-4.2, y:-3.8, width:8.4, height:7, fill:'#3a4152'}, g);
    item(k, 'guindaste', [[c[0], c[1]]]);
  });

  (CITY.footprints||[]).forEach(function(f){
    var k = chave('predio', f); if (!vivo(k)) return;
    marca(el('path', {d:f, class:'footprint'}, detailL), k, 'prédio'); item(k, 'prédio', dParaPts(f));
  });
  var kGal = chave('linha', 'gallery');
  if (CITY.gallery && vivo(kGal)) marca(el('path', {d:CITY.gallery, class:'gallery'}, detailL), kGal, 'galeria');

  // pontes com pilares e nome
  CITY.bridges.forEach(function(b){
    var k = chave('ponte', b); if (!vivo(k)) return;
    var g = marca(el('g', {transform:'rotate('+(b.a+90)+' '+b.x+' '+b.y+')'}, detailL), k, 'ponte ' + b.pt);
    el('rect', {x:b.x-b.w/2-3, y:b.y-8, width:6, height:16, class:'bridge-pier'}, g);
    el('rect', {x:b.x+b.w/2-3, y:b.y-8, width:6, height:16, class:'bridge-pier'}, g);
    el('rect', {x:b.x-b.w/2, y:b.y-5, width:b.w, height:10, class:'bridge'}, g);
    var t = el('text', {x:b.x, y:b.y-13, class:'bridge-label', 'text-anchor':'middle',
      transform:'rotate('+(-(b.a+90))+' '+b.x+' '+(b.y-13)+')'}, minorL);
    t.textContent = b.pt + ' · ' + b.yr;
    item(k, 'ponte ' + b.pt, [[b.x, b.y]]);
  });

  // portoes da muralha
  (CITY.gates||[]).forEach(function(g){
    var k = chave('portao', g); if (!vivo(k)) return;
    var gg = marca(el('g', {class:'gate', transform:'translate('+g.x+','+g.y+') rotate('+g.a+')'}, detailL), k, 'portão ' + g.pt);
    el('rect', {x:-4, y:-11, width:8, height:22, rx:1.5}, gg);
    var t = el('text', {x:g.x, y:g.y-16, class:'minor-label gate', 'text-anchor':'middle'}, minorL);
    t.textContent = g.pt;
    item(k, 'portão', [[g.x, g.y]]);
  });

  // pracas
  (CITY.squares||[]).forEach(function(sq){
    if (!vivo(chave('praca', sq))) return;
    var t = el('text', {x:sq.cx, y:sq.cy+2, class:'minor-label', 'text-anchor':'middle'}, minorL);
    t.textContent = sq.nl;
  });

  // nomes de avenidas
  avs.forEach(function(x){
    var a = x.a, ang = a.a; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    var t = el('text', {x:a.x, y:a.y-5, class:'street-label', 'text-anchor':'middle',
      transform:'rotate('+ang+' '+a.x+' '+(a.y-5)+')'}, minorL);
    t.textContent = a.nl;
  });

  // nomes geográficos (dá para apagar cada um no editor)
  function geoLabel(x, y, txt, size, rot, cls, camada){
    var k = chave('rotulo', txt); if (!vivo(k)) return;
    var t = marca(el('text', {x:x, y:y, class:(camada ? 'minor-label' : 'geo-label '+(cls||'')), 'font-size':size, 'text-anchor':'middle',
      transform:'rotate('+(rot||0)+' '+x+' '+y+')'}, camada || detailL), k, 'nome "' + txt + '"');
    t.textContent = txt;
    item(k, 'nome', [[x, y]]);
  }
  geoLabel(2360, 330, 'Mar do Norte', 30, -10);
  geoLabel(2080, 1110, 'Enseada de Belmont', 18, 24);
  geoLabel(760, 1000, 'Rio Zwart', 18, 12);
  geoLabel(2020, 1610, 'Foz do Zwart', 15, 26);
  geoLabel(1800, 1060, 'Praia do Corvo', 15, 76, 'land-l');
  geoLabel(560, 1560, 'Reserva da Mata Sombria', 15, -4, 'land-l');
  geoLabel(1390, 415, 'Parque Municipal', 13, -6, 'land-l');
  geoLabel(480, 226, 'Parque de Groenveld', 12, -4, 'land-l');

  // rotulos do anel e do viaduto
  if (vivo(kRing)) geoLabel(1010, 238, 'Ringlaan · traçado da muralha 1287–1861', 11, 0, '', minorL);
  if (vivo(kExp)) geoLabel(430, 1245, 'Viaduto Sul · 1972', 10, 4, '', minorL);
  geoLabel(232, 1520, 'terreno baldio · têxtil demolida 1991', 9.5, 0, '', minorL);
  geoLabel(1136, 816, 'reconstrução 1944', 9, 0, '', minorL);
  if (CITY.ferry && vivo(kFerry)) geoLabel((CITY.ferry.x1+CITY.ferry.x2)/2, (CITY.ferry.y1+CITY.ferry.y2)/2 - 8, 'balsa do porto', 9, 0, '', minorL);

  for (var gx = 260; gx < 2600; gx += 260) el('line', {x1:gx, y1:0, x2:gx, y2:1820, class:'grid-line'}, chromeL);
  for (var gy = 260; gy < 1820; gy += 260) el('line', {x1:0, y1:gy, x2:2600, y2:gy, class:'grid-line'}, chromeL);
  ['A','B','C','D','E','F','G','H','I','J'].forEach(function(L, i){
    var t = el('text', {x:130+i*260, y:22, class:'grid-label', 'text-anchor':'middle'}, chromeL); t.textContent = L;
  });
  for (var i = 0; i < 7; i++){
    var t = el('text', {x:12, y:142+i*260, class:'grid-label'}, chromeL); t.textContent = (i+1);
  }

  var rose = el('g', {transform:'translate(2450,1660)', opacity:'.85'}, chromeL);
  el('circle', {r:44, fill:'none', stroke:'#d4a856', 'stroke-width':1.3, opacity:'.7'}, rose);
  el('circle', {r:31, fill:'none', stroke:'#d4a856', 'stroke-width':.8, opacity:'.4'}, rose);
  el('path', {d:'M0,-40 L8,0 L0,13 L-8,0 Z', fill:'#d4a856'}, rose);
  el('path', {d:'M0,40 L8,0 L0,-13 L-8,0 Z', fill:'#d4a856', opacity:'.35'}, rose);
  el('path', {d:'M-40,0 L0,-6 L13,0 L0,6 Z', fill:'#d4a856', opacity:'.25'}, rose);
  el('path', {d:'M40,0 L0,-6 L-13,0 L0,6 Z', fill:'#d4a856', opacity:'.25'}, rose);
  var nt = el('text', {y:-50, 'text-anchor':'middle', fill:'#d4a856', 'font-family':'var(--font-display)', 'font-size':19, 'font-weight':800}, rose);
  nt.textContent = 'N';

  renderFeatures();
  renderDistricts();
  } // fim de renderStaticGeo()

  // ---------- bairros (redesenhados sempre que a facção, o nome ou a Máscara mudam) ----------
  var MQ_MAX = 10;
  function mqInfo(level){
    level = level || 0;
    if (level >= MQ_MAX) return { label:'Caçada', cls:'mq-hunt' };
    if (level >= 7) return { label:'Alerta máximo', cls:'mq-high' };
    if (level >= 4) return { label:'Investigação', cls:'mq-mid' };
    if (level >= 1) return { label:'Rumores', cls:'mq-low' };
    return { label:'Intacta', cls:'mq-none' };
  }
  function renderDistricts(){
    var defs = document.querySelector('#mapSvg defs');
    defs.querySelectorAll('clipPath[id^="clip-"]').forEach(function(n){ n.parentNode.removeChild(n); });
    while (distL.firstChild) distL.removeChild(distL.firstChild);
    while (labelsL.firstChild) labelsL.removeChild(labelsL.firstChild);
    DISTRICTS.forEach(function(d){
      var mq = d.masquerade || 0, info = mqInfo(mq);
      var cp = el('clipPath', {id:'clip-'+d.id}, defs);
      el('path', {d:d.d}, cp);
      var p = el('g', {class:'district-g '+d.faction+' '+info.cls+(!PLAYER && !d.revealed?' unrevealed':''), 'data-id':d.id}, distL);
      el('path', {d:d.d, class:'d-fill'}, p);
      el('path', {d:d.d, class:'d-band band-a', 'clip-path':'url(#clip-'+d.id+')'}, p);
      el('path', {d:d.d, class:'d-band band-b', 'clip-path':'url(#clip-'+d.id+')'}, p);
      if (mq > 0){
        // calor da Máscara: mancha vermelha que cresce com o nível (pulsa em Caçada)
        var k = mq / MQ_MAX;
        el('path', {d:d.d, class:'d-heat', 'clip-path':'url(#clip-'+d.id+')',
          'fill-opacity':(0.03 + k * 0.11).toFixed(3), 'stroke-opacity':(0.08 + k * 0.27).toFixed(3)}, p);
      }
      el('path', {d:d.d, class:'d-edge'}, p);
      el('path', {d:d.d, class:'d-hit'}, p);
      p.addEventListener('click', function(ev){ ev.stopPropagation(); select('district', d.id); });
      p.addEventListener('mousemove', function(ev){
        showTip(ev, d.name + (mq ? ' · ' + (mq >= MQ_MAX ? 'CAÇADA' : 'Máscara ' + mq + '/' + MQ_MAX) : ''), d.faction);
      });
      p.addEventListener('mouseleave', hideTip);

      var g = el('g', {class:'d-label-g'+(!PLAYER && !d.revealed?' unrevealed':''), 'data-id':d.id}, labelsL);
      var t1 = el('text', {x:d.cx, y:d.cy, class:'d-label', 'text-anchor':'middle', 'font-size':24}, g);
      t1.textContent = d.name;
      var t2 = el('text', {x:d.cx, y:d.cy+19, class:'d-sub', 'text-anchor':'middle', 'font-size':11}, g);
      t2.textContent = d.sub;
      if (mq > 0){
        var t3 = el('text', {x:d.cx, y:d.cy+37, class:'d-mq '+info.cls, 'text-anchor':'middle'}, g);
        t3.textContent = mq >= MQ_MAX ? '☠ CAÇADA' : 'MÁSCARA ' + mq + '/' + MQ_MAX;
      }
      var bb = t1.getBBox();
      el('rect', {x:bb.x-22, y:d.cy-7, width:13, height:3.2, class:'d-tick '+d.faction}, g);
      el('rect', {x:bb.x+bb.width+9, y:d.cy-7, width:13, height:3.2, class:'d-tick '+d.faction}, g);
    });
  }

  function renderPOIMarkers(){
    while (poisL.firstChild) poisL.removeChild(poisL.firstChild);
    POIS.forEach(function(p){
      var g = el('g', {class:'poi '+p.faction+(editMode?' edit-target':'')+(!PLAYER && !p.revealed?' unrevealed':''), 'data-id':p.id, transform:'translate('+p.x+','+p.y+')'}, poisL);
      el('circle', {r:(editMode?23:17), class:'halo'}, g);
      el('circle', {r:12.5, class:'ring'}, g);
      var use = document.createElementNS(NS, 'use');
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#ic-'+p.icon);
      use.setAttribute('href', '#ic-'+p.icon);
      use.setAttribute('x', -7.4); use.setAttribute('y', -7.4);
      use.setAttribute('width', 14.8); use.setAttribute('height', 14.8);
      use.setAttribute('class', 'icon');
      g.appendChild(use);
      g.addEventListener('click', function(ev){
        ev.stopPropagation();
        if (poiDragMoved){ poiDragMoved = false; return; }
        select('poi', p.id);
      });
      g.addEventListener('mousemove', function(ev){ showTip(ev, p.name, p.faction); });
      g.addEventListener('mouseleave', hideTip);
      if (editMode) attachPoiDrag(g, p);
    });
  }

  document.getElementById('mapSvg').addEventListener('click', function(){ if (!addArmed) select(null, null); });

  function showTip(ev, text, faction){
    var r = mapWrap.getBoundingClientRect();
    tooltip.innerHTML = escHtml(text) + (faction ? '<span class="t-fx">'+FACTION_LABEL[faction]+'</span>' : '');
    tooltip.style.left = (ev.clientX - r.left) + 'px';
    tooltip.style.top = (ev.clientY - r.top) + 'px';
    tooltip.classList.add('show');
  }
  function hideTip(){ tooltip.classList.remove('show'); }
  function featHitLayerEl(){ return document.getElementById('featHitLayer'); }
  function select(type, id){ state.selected = type ? {type:type, id:id} : null; renderSelection(); }

  function homePanel(){
    var gmHint = (!PLAYER && isLoggedIn())
      ? '<br><br><b>Modo mestre.</b> Itens em itálico e tracejados estão <b>ocultos dos jogadores</b>. Revele pelo painel de cada bairro, ponto ou personagem — o que você revela aparece <b>na hora</b> para os jogadores.'
      : '';
    return '<div class="empty"><b>Belmont</b> — 340 mil almas na costa de Flandres, um porto em decadência, um Príncipe novo e um assassinato sem solução. Clique em um bairro ou marcador para ver facção, domínio, personagens, o diário de eventos e o nível de Quebra da Máscara.' + gmHint + '</div>';
  }

  function renderSelection(){
    if (!PLAYER) renderEdit();
    distL.querySelectorAll('.district-g').forEach(function(n){ n.classList.remove('selected'); });
    poisL.querySelectorAll('.poi').forEach(function(n){ n.classList.remove('selected', 'npc-hl'); });
    appEl.classList.remove('npc-focus');
    var sel = state.selected;
    if (!sel){ if (editMode) showEditHome(); else detail.innerHTML = homePanel(); return; }
    var lookup = { poi:poiById, district:districtById, npc:npcById, traco:tracoById }[sel.type];
    if (!lookup || !lookup[sel.id]){ state.selected = null; renderSelection(); return; }
    if (sel.type === 'traco'){
      if (!editMode){ state.selected = null; renderSelection(); return; }
      abrirFormTraco(tracoById[sel.id]);
      return;
    }
    if (sel.type === 'poi' && editMode){
      var n2b = poisL.querySelector('[data-id="'+sel.id+'"]'); if (n2b) n2b.classList.add('selected');
      openEditForm(poiById[sel.id]);
      return;
    }
    if (sel.type === 'district') renderDistrictDetail(districtById[sel.id]);
    else if (sel.type === 'npc') renderNpcDetail(npcById[sel.id]);
    else renderPoiDetail(poiById[sel.id]);
  }

  function renderDistrictDetail(d){
    var node = distL.querySelector('[data-id="'+d.id+'"]'); if (node) node.classList.add('selected');
    var pois = POIS.filter(function(p){ return p.district === d.id; }).sort(byName);
    var npcs = npcsInDistrict(d.id);
    detail.innerHTML =
      '<span class="badge '+d.faction+'">'+FACTION_LABEL[d.faction]+'</span>' + revealBadge(d) +
      '<h2>'+escHtml(d.name)+'</h2><div class="kind">Bairro &middot; '+escHtml(d.sub)+'</div>' +
      masqueradeBlock(d) +
      '<p class="blurb">'+escHtml(d.blurb)+'</p>' +
      '<div class="meta-row"><span class="pill domain">Domínio: <b>'+(d.domain ? escHtml(d.domain) : 'a definir')+'</b></span></div>' +
      privateNoteBlock(d.privateNote) +
      (isLoggedIn() ? '<div class="detail-actions">' + revealButtons(d, pois) + '<button type="button" class="act-btn" id="btnEditDistrict">Editar bairro</button></div>' : '') +
      blocoContorno(d) +
      (pois.length ? sectionHead('Pontos de interesse', pois.length) + '<div class="poi-list">' + pois.map(poiRowHtml).join('') + '</div>' : '') +
      (npcs.length ? sectionHead('Personagens ligados ao bairro', npcs.length) + npcListHtml(npcs) : '') +
      diaryShell('district', d.id);
    wireDetailLinks();
    var eb = detail.querySelector('#btnEditDistrict');
    if (eb) eb.addEventListener('click', function(){ openDistrictForm(d); });
    ligarContorno(d);
    wireReveal('district', d, pois);
    wireMasquerade(d);
    loadDiary('district', d.id);
  }

  function renderPoiDetail(p){
    var pd = districtById[p.district];
    var n2 = poisL.querySelector('[data-id="'+p.id+'"]'); if (n2) n2.classList.add('selected');
    var dn = pd && distL.querySelector('[data-id="'+pd.id+'"]'); if (dn) dn.classList.add('selected');
    var linked = npcsForPoi(p.id);
    var owners = linked.filter(function(l){ return l.relation === 'dominio'; });
    var domainHtml = owners.length
      ? owners.map(function(l){ return '<b class="lnk" data-npc="'+l.npc.id+'">'+escHtml(l.npc.name)+'</b>'; }).join(', ')
      : '<b>'+(p.domain ? escHtml(p.domain) : 'a definir')+'</b>';
    detail.innerHTML =
      '<span class="badge '+p.faction+'">'+FACTION_LABEL[p.faction]+'</span>' + revealBadge(p) +
      '<h2>'+escHtml(p.name)+'</h2><div class="kind">Ponto de interesse'+(pd ? ' &middot; '+escHtml(pd.name) : '')+(p.type ? ' &middot; '+TYPE_LABEL[p.type] : '')+'</div>' +
      '<p class="blurb">'+escHtml(p.blurb)+'</p>' +
      '<div class="meta-row">'+(pd ? '<span class="pill" data-district="'+pd.id+'">Bairro: <b>'+escHtml(pd.name)+'</b>'+(pd.masquerade ? ' <span class="mq-chip '+mqInfo(pd.masquerade).cls+'">'+(pd.masquerade >= MQ_MAX ? 'CAÇADA' : 'Máscara '+pd.masquerade)+'</span>' : '')+'</span>' : '')+
      '<span class="pill domain">Domínio: '+domainHtml+'</span></div>' +
      privateNoteBlock(p.privateNote) +
      (!PLAYER && isLoggedIn() ? '<div class="detail-actions">' + revealButtons(p) + '</div>' : '') +
      (linked.length ? sectionHead('Personagens', linked.length) + npcListHtml(linked.map(function(l){ return { npc:l.npc, relation:l.relation }; })) : '') +
      diaryShell('poi', p.id);
    wireDetailLinks();
    wireReveal('poi', p);
    loadDiary('poi', p.id);
  }

  function renderNpcDetail(n){
    appEl.classList.add('npc-focus');
    var locs = (n.locations || []).filter(function(l){ return poiById[l.poiId]; });
    locs.forEach(function(l){ var m = poisL.querySelector('[data-id="'+l.poiId+'"]'); if (m) m.classList.add('npc-hl'); });
    var byRel = {};
    locs.forEach(function(l){ (byRel[l.relation] = byRel[l.relation] || []).push(poiById[l.poiId]); });
    var locHtml = RELATIONS.map(function(r){
      var list = byRel[r[0]]; if (!list) return '';
      return '<div class="rel-head">'+r[1]+'</div><div class="poi-list">' + list.sort(byName).map(poiRowHtml).join('') + '</div>';
    }).join('');
    var st = NPC_STATUS_LABEL[n.status] || 'Ativo';
    detail.innerHTML =
      '<span class="badge '+n.faction+'">'+FACTION_LABEL[n.faction]+'</span> ' +
      '<span class="badge status st-'+n.status+'">'+st+'</span>' +
      revealBadge(n) +
      '<h2 class="'+(n.status === 'morte-final' ? 'dead' : '')+'">'+escHtml(n.name)+'</h2>' +
      '<div class="kind">Personagem'+(n.clan ? ' &middot; '+escHtml(n.clan) : '')+(n.role ? ' &middot; '+escHtml(n.role) : '')+'</div>' +
      (n.description ? '<p class="blurb">'+escHtml(n.description)+'</p>' : '<p class="blurb muted">Sem descrição.</p>') +
      privateNoteBlock(n.privateNote) +
      '<div class="detail-actions">' +
        (locs.length ? '<button type="button" class="act-btn" id="btnFitNpc">Enquadrar no mapa</button>' : '') +
        (isLoggedIn() ? revealButtons(n) + '<button type="button" class="act-btn" id="btnEditNpc">Editar personagem</button>' : '') +
        (isLoggedIn() && n.fichaId ? '<a class="act-btn" href="'+escAttr(M.site + '/?ficha=' + encodeURIComponent(n.fichaId))+'" target="_blank" rel="noopener">Abrir ficha &#8599;</a>' : '') +
      '</div>' +
      (locs.length ? sectionHead('Locais', locs.length) + locHtml : '<div class="diary-empty">Nenhum local vinculado.</div>');
    wireDetailLinks();
    var fb = detail.querySelector('#btnFitNpc');
    if (fb) fb.addEventListener('click', function(){ fitToPoints(locs.map(function(l){ return poiById[l.poiId]; })); });
    var eb = detail.querySelector('#btnEditNpc');
    if (eb) eb.addEventListener('click', function(){ openNpcForm(n); });
    wireReveal('npc', n);
  }

  var typeFilterEl = document.getElementById('typeFilter');
  function buildTypeFilter(){
    var counts = {}; POIS.forEach(function(p){ counts[p.type] = (counts[p.type]||0) + 1; });
    var opts = '<option value="all">Todos os tipos ('+POIS.length+')</option>' + TYPES.map(function(t){
      return '<option value="'+t[0]+'">'+t[1]+' ('+(counts[t[0]]||0)+')</option>';
    }).join('');
    typeFilterEl.innerHTML = opts;
    typeFilterEl.value = state.type;
  }
  typeFilterEl.addEventListener('change', function(){ state.type = typeFilterEl.value; applyFilters(); });

  function buildLegend(){
    var dc = {camarilla:0, anarch:0, neutral:0};
    DISTRICTS.forEach(function(d){ dc[d.faction]++; });
    var order = [['all','Todos'],['camarilla','Camarilla'],['anarch','Anarch'],['neutral','Neutro']];
    legendEl.innerHTML = order.map(function(o){
      var c = o[0] === 'all' ? DISTRICTS.length : dc[o[0]];
      return '<button class="chip '+(state.faction===o[0]?'active':'')+'" data-f="'+o[0]+'"><span class="dot"></span>'+o[1]+' <span class="count">'+c+'</span></button>';
    }).join('');
    legendEl.querySelectorAll('.chip').forEach(function(c){
      c.addEventListener('click', function(){ state.faction = c.getAttribute('data-f'); applyFilters(); buildLegend(); });
    });
  }

  function applyFilters(){
    var q = state.query.trim().toLowerCase();
    DISTRICTS.forEach(function(d){
      var fm = state.faction === 'all' || d.faction === state.faction;
      var tm = !q || d.name.toLowerCase().indexOf(q) > -1 || d.sub.toLowerCase().indexOf(q) > -1;
      var pm = POIS.some(function(p){
        var ptm = state.type === 'all' || p.type === state.type;
        return p.district === d.id && ptm && (!q || p.name.toLowerCase().indexOf(q) > -1);
      });
      var vis = fm && (state.type === 'all' ? (tm || pm) : pm);
      var n = distL.querySelector('[data-id="'+d.id+'"]');
      var l = labelsL.querySelector('[data-id="'+d.id+'"]');
      if (n) n.classList.toggle('dim', !vis);
      if (l) l.classList.toggle('dim', !vis);
    });
    POIS.forEach(function(p){
      var fm = state.faction === 'all' || p.faction === state.faction;
      var ptm = state.type === 'all' || p.type === state.type;
      var tm = !q || p.name.toLowerCase().indexOf(q) > -1;
      var n = poisL.querySelector('[data-id="'+p.id+'"]');
      if (n) n.classList.toggle('dim', !(fm && ptm && tm));
    });
    buildIndex();
  }

  function indexTabsHtml(){
    return '<div class="index-tabs">' +
      '<button type="button" data-tab="territory" class="'+(state.indexTab==='territory'?'active':'')+'">Território</button>' +
      '<button type="button" data-tab="npcs" class="'+(state.indexTab==='npcs'?'active':'')+'">Personagens <span class="ct">'+NPCS.length+'</span></button>' +
      '</div>';
  }
  function wireIndexTabs(){
    indexEl.querySelectorAll('[data-tab]').forEach(function(b){
      b.addEventListener('click', function(){
        state.indexTab = b.getAttribute('data-tab');
        searchInput.placeholder = state.indexTab === 'npcs' ? 'Buscar personagem, clã ou cargo\u2026' : 'Buscar bairro ou ponto de interesse\u2026';
        buildIndex();
      });
    });
  }
  function buildIndex(){
    if (state.indexTab === 'npcs'){ buildNpcIndex(indexTabsHtml()); wireIndexTabs(); return; }
    var q = state.query.trim().toLowerCase();
    var groups = DISTRICTS.map(function(d){
      var pois = POIS.filter(function(p){
        var fm = state.faction === 'all' || p.faction === state.faction;
        var ptm = state.type === 'all' || p.type === state.type;
        var tm = !q || p.name.toLowerCase().indexOf(q) > -1;
        return p.district === d.id && fm && ptm && tm;
      });
      var dfm = state.faction === 'all' || d.faction === state.faction;
      var dtm = !q || d.name.toLowerCase().indexOf(q) > -1 || d.sub.toLowerCase().indexOf(q) > -1;
      var vis = dfm && (state.type === 'all' ? (dtm || pois.length > 0) : pois.length > 0);
      return {d:d, pois:pois, vis: vis};
    }).filter(function(g){ return g.vis; });

    var FX_ORDER = ['camarilla','anarch','neutral'];
    var buckets = {camarilla:[], anarch:[], neutral:[]};
    groups.forEach(function(g){ buckets[g.d.faction].push(g); });
    FX_ORDER.forEach(function(fx){ buckets[fx].sort(function(a,b){ return a.d.name.localeCompare(b.d.name, 'pt'); }); });

    var html = indexTabsHtml();
    var any = false;
    FX_ORDER.forEach(function(fx){
      var list = buckets[fx];
      if (!list.length) return;
      any = true;
      html += '<div class="index-fx-head fx-'+fx+'"><span class="sw"></span>'+FACTION_LABEL[fx]+'<span class="ct">'+list.length+'</span></div>';
      html += list.map(function(g){
        return '<div class="index-item'+(!PLAYER && !g.d.revealed?' unrevealed':'')+'" data-district="'+g.d.id+'" title="'+escAttr(g.d.name)+'"><span class="sw" style="background:var(--'+g.d.faction+'-line)"></span><span class="nm">'+escHtml(g.d.name)+'</span>'+(g.d.masquerade?'<span class="mq-chip '+mqInfo(g.d.masquerade).cls+'">'+(g.d.masquerade>=MQ_MAX?'☠':g.d.masquerade)+'</span>':'')+(g.pois.length?'<span class="sub">'+g.pois.length+' pt'+(g.pois.length>1?'s':'')+'</span>':'')+'</div>' +
          g.pois.map(function(p){
            return '<div class="index-item index-poi'+(!PLAYER && !p.revealed?' unrevealed':'')+'" data-poi="'+p.id+'" title="'+escAttr(p.name)+'"><span class="sw" style="background:var(--'+p.faction+'-line)"></span><span class="nm">'+escHtml(p.name)+'</span></div>';
          }).join('');
      }).join('');
    });
    // pontos cujo bairro não está no mapa (no site dos jogadores: bairro ainda não revelado)
    var orphans = POIS.filter(function(p){
      if (districtById[p.district]) return false;
      var fm = state.faction === 'all' || p.faction === state.faction;
      var ptm = state.type === 'all' || p.type === state.type;
      return fm && ptm && (!q || p.name.toLowerCase().indexOf(q) > -1);
    }).sort(byName);
    if (orphans.length){
      any = true;
      html += '<div class="index-fx-head"><span class="sw" style="background:var(--accent)"></span>Outros locais<span class="ct">'+orphans.length+'</span></div>';
      html += orphans.map(function(p){
        return '<div class="index-item'+(!PLAYER && !p.revealed?' unrevealed':'')+'" data-poi="'+p.id+'" title="'+escAttr(p.name)+'"><span class="sw" style="background:var(--'+p.faction+'-line)"></span><span class="nm">'+escHtml(p.name)+'</span></div>';
      }).join('');
    }
    if (!any) html += '<div class="empty" style="padding:10px 0;color:var(--muted);font-size:13px;">'+(PLAYER && !DISTRICTS.length && !POIS.length ? 'Nada revelado ainda. Aguarde o mestre.' : 'Nada encontrado.')+'</div>';
    indexEl.innerHTML = html;
    wireIndexTabs();

    indexEl.querySelectorAll('[data-district]').forEach(function(n){
      n.addEventListener('click', function(){ select('district', n.getAttribute('data-district')); });
    });
    indexEl.querySelectorAll('[data-poi]').forEach(function(n){
      n.addEventListener('click', function(){ select('poi', n.getAttribute('data-poi')); });
    });
  }

  searchInput.addEventListener('input', function(){ state.query = searchInput.value; applyFilters(); });
  function updateTally(){
    var pc = {camarilla:0, anarch:0, neutral:0};
    POIS.forEach(function(p){ pc[p.faction]++; });
    document.getElementById('tally').textContent =
      DISTRICTS.length + ' bairros · ' + POIS.length + ' pontos · ' + NPCS.length + ' personagens · ' + pc.camarilla + ' Camarilla / ' + pc.anarch + ' Anarch / ' + pc.neutral + ' neutros' +
      (function(){ var h = DISTRICTS.filter(function(d){ return d.masquerade >= MQ_MAX; }).length; return h ? ' · ' + h + ' em Caçada' : ''; })() +
      (PLAYER && snapshotMeta.publishedAt ? ' · atualizado em ' + new Date(snapshotMeta.publishedAt).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : '');
  }

  // ======================================================================
  // Modo edição: adicionar, mover, editar e remover pontos de interesse.
  // Persistido no banco SQLite do servidor via API REST — compartilhado
  // entre todos os visitantes do mapa em tempo real (com um polling simples
  // a cada 20s pra manter abas abertas em sincronia).
  // ======================================================================
  var editMode = false, addArmed = false, moveArmed = null, poiDragMoved = false;
  var editToolbarEl = document.getElementById('editToolbar'), btnAddPoi = document.getElementById('btnAddPoi'),
      syncStatusEl = document.getElementById('syncStatus'), syncStatusText = document.getElementById('syncStatusText'),
      btnEditModeEl = document.getElementById('btnEditMode'), btnCleanViewEl = document.getElementById('btnCleanView'),
      authBoxEl = document.getElementById('authBox'),
      appEl = document.querySelector('.app');

  // ---------- avisos (toast) — substitui alert(), que pode não funcionar dentro do artefato ----------
  var toastStackEl = document.getElementById('toastStack');
  function toast(msg, opts){
    opts = opts || {};
    var t = document.createElement('div');
    t.className = 'toast' + (opts.type === 'error' ? ' err' : (opts.type === 'ok' ? ' ok' : ''));
    t.innerHTML = '<span class="tdot"></span><span class="tmsg"></span><button type="button" aria-label="Fechar">&times;</button>';
    t.querySelector('.tmsg').textContent = msg;
    toastStackEl.appendChild(t);
    requestAnimationFrame(function(){ t.classList.add('show'); });
    var dur = opts.duration || (opts.type === 'error' ? 6500 : 3200);
    var timer = setTimeout(remove, dur);
    function remove(){
      clearTimeout(timer);
      t.classList.remove('show');
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }
    t.querySelector('button').addEventListener('click', remove);
    return remove;
  }

  // ---------- confirmação customizada — substitui confirm(), que pode não funcionar dentro do artefato ----------
  function confirmDialog(message, opts){
    opts = opts || {};
    return new Promise(function(resolve){
      var overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = '<div class="confirm-box"><p></p><div class="confirm-actions">' +
        '<button type="button" class="ghost" id="cdCancel">Cancelar</button>' +
        '<button type="button" class="'+(opts.danger === false ? '' : 'danger')+'" id="cdOk">'+(opts.okLabel || 'Confirmar')+'</button>' +
        '</div></div>';
      overlay.querySelector('p').textContent = message;
      document.body.appendChild(overlay);
      requestAnimationFrame(function(){ overlay.classList.add('show'); });
      function close(val){
        overlay.classList.remove('show');
        setTimeout(function(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 180);
        resolve(val);
      }
      overlay.querySelector('#cdCancel').addEventListener('click', function(){ close(false); });
      overlay.querySelector('#cdOk').addEventListener('click', function(){ close(true); });
      var mouseDownOnOverlay = false;
      overlay.addEventListener('mousedown', function(ev){ mouseDownOnOverlay = (ev.target === overlay); });
      overlay.addEventListener('click', function(ev){ if (ev.target === overlay && mouseDownOnOverlay) close(false); });
    });
  }

  // ---------- mapa limpo ----------
  function setCleanView(on){
    appEl.classList.toggle('view-clean', on);
    btnCleanViewEl.classList.toggle('active', on);
    try{ localStorage.setItem('belmont_view_clean', on ? '1' : '0'); }catch(e){}
  }
  btnCleanViewEl.addEventListener('click', function(){ setCleanView(!appEl.classList.contains('view-clean')); });
  (function(){
    var saved = null;
    try{ saved = localStorage.getItem('belmont_view_clean'); }catch(e){}
    if (saved === '1') setCleanView(true);
  })();

  // ---------- painéis redimensionáveis ----------
  // Cada divisor grava um CSS custom property em .app e persiste o valor em px.
  // O mapa SVG usa preserveAspectRatio + getBoundingClientRect a cada interação,
  // então não precisa de recálculo explícito quando o contêiner muda de tamanho.
  (function(){
    var RZ_MIN_VIEWPORT = 901; // abaixo disso o layout vira coluna única (ver media query)

    var reclampAll = [];

    function makeResizer(el, cfg){
      if (!el) return;
      var dragging = false, startPos = 0, startVal = 0;

      // lê o tamanho renderizado do painel — o custom property pode estar em
      // unidades relativas (o default é vh), que parseFloat interpretaria errado.
      function currentVal(){
        var r = cfg.panel().getBoundingClientRect();
        return cfg.axis === 'x' ? r.width : r.height;
      }
      function apply(val, persist){
        val = Math.max(cfg.min(), Math.min(cfg.max(), val));
        appEl.style.setProperty(cfg.varName, val + 'px');
        if (persist){ try{ localStorage.setItem(cfg.key, String(Math.round(val))); }catch(e){} }
      }

      el.addEventListener('pointerdown', function(ev){
        if (ev.button !== 0 || window.innerWidth < RZ_MIN_VIEWPORT) return;
        dragging = true;
        startPos = cfg.axis === 'x' ? ev.clientX : ev.clientY;
        startVal = currentVal();
        el.setPointerCapture(ev.pointerId);
        el.classList.add('dragging');
        document.body.classList.add('rz-active', cfg.axis === 'x' ? 'rz-col' : 'rz-row');
        ev.preventDefault();
      });
      el.addEventListener('pointermove', function(ev){
        if (!dragging) return;
        var delta = (cfg.axis === 'x' ? ev.clientX : ev.clientY) - startPos;
        apply(startVal + delta * cfg.dir, false);
      });
      function end(ev){
        if (!dragging) return;
        dragging = false;
        try{ el.releasePointerCapture(ev.pointerId); }catch(e){}
        el.classList.remove('dragging');
        document.body.classList.remove('rz-active', 'rz-col', 'rz-row');
        apply(currentVal(), true);
      }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('dblclick', function(){
        appEl.style.removeProperty(cfg.varName);
        try{ localStorage.removeItem(cfg.key); }catch(e){}
      });

      var saved = null;
      try{ saved = localStorage.getItem(cfg.key); }catch(e){}
      if (saved !== null && isFinite(parseFloat(saved))) apply(parseFloat(saved), false);

      // um tamanho salvo em px pode não caber numa janela menor numa sessão
      // posterior; só reajusta quando o painel tem tamanho explícito definido.
      reclampAll.push(function(){
        if (!appEl.style.getPropertyValue(cfg.varName)) return;
        apply(currentVal(), false);
      });
    }

    function mainWidth(){ return document.querySelector('.main').getBoundingClientRect().width; }
    function belowWidth(){ return document.querySelector('.below-cols').getBoundingClientRect().width; }

    makeResizer(document.getElementById('rzLegend'), {
      varName:'--legend-w', key:'belmont_layout_legend_w', axis:'x', dir:-1,
      panel:function(){ return document.querySelector('.legend-side'); },
      min:function(){ return 130; },
      max:function(){ return Math.max(130, mainWidth() - 320); }
    });
    makeResizer(document.getElementById('rzMain'), {
      varName:'--main-h', key:'belmont_layout_main_h', axis:'y', dir:1,
      panel:function(){ return document.querySelector('.main'); },
      min:function(){ return 200; },
      max:function(){ return Math.max(200, window.innerHeight - 230); }
    });
    makeResizer(document.getElementById('rzIndex'), {
      varName:'--index-w', key:'belmont_layout_index_w', axis:'x', dir:1,
      panel:function(){ return document.querySelector('.index'); },
      min:function(){ return 220; },
      max:function(){ return Math.max(220, belowWidth() - 260); }
    });

    var reclampTimer = null;
    window.addEventListener('resize', function(){
      clearTimeout(reclampTimer);
      reclampTimer = setTimeout(function(){
        reclampAll.forEach(function(fn){ fn(); });
      }, 120);
    });
  })();

  // ---------- cliente da API REST (fetch) ----------
  // Substitui o antigo makeStore()/claude.use('db'): o SQLite do servidor é
  // a única fonte de verdade agora. Em qualquer 401, abre o modal de login
  // (exceto na própria chamada de login, que trata o erro no formulário).
  /* A API agora é a da Ficha de Sangue, na VPS. window.MAPA vem do carregar.js:
     base = <api>/mapa/<crônica>, token = sessão da conta. "/api/pois" vira base + "/pois". */
  var M = window.MAPA;
  function apiFetch(url, opts){
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers:{ Authorization: 'Bearer ' + M.token } };
    if (opts.body !== undefined){
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    var destino = url.indexOf('/api/') === 0 ? M.base + url.slice(4) : url;
    return fetch(destino, init).then(function(res){
      if (res.status === 401) M.sessaoExpirada();
      return res.json().catch(function(){ return {}; }).then(function(data){
        if (!res.ok){
          var err = new Error((data && (data.erro || data.error)) || 'Não foi possível completar a operação.');
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }
  var Api = {
    getPois: function(){ return apiFetch('/api/pois'); },
    createPoi: function(data){ return apiFetch('/api/pois', {method:'POST', body:data}); },
    updatePoi: function(id, data){ return apiFetch('/api/pois/'+encodeURIComponent(id), {method:'PUT', body:data}); },
    deletePoi: function(id){ return apiFetch('/api/pois/'+encodeURIComponent(id), {method:'DELETE'}); },
    getScenes: function(){ return apiFetch('/api/scenes'); },
    createScene: function(data){ return apiFetch('/api/scenes', {method:'POST', body:data}); },
    deleteScene: function(id){ return apiFetch('/api/scenes/'+encodeURIComponent(id), {method:'DELETE'}); },
    /* a conta é a da Ficha de Sangue: entrar e sair acontecem lá */
    login: function(){ M.sessaoExpirada(); return new Promise(function(){}); },
    logout: function(){ location.href = M.site + '/'; return new Promise(function(){}); },
    me: function(){ return Promise.resolve({ username: M.usuario.email, displayName: M.usuario.nome }); },
    getDistricts: function(){ return apiFetch('/api/districts'); },
    updateDistrict: function(id, data){ return apiFetch('/api/districts/'+encodeURIComponent(id), {method:'PUT', body:data}); },
    masquerade: function(id, data){ return apiFetch('/api/districts/'+encodeURIComponent(id)+'/masquerade', {method:'POST', body:data}); },
    getNpcs: function(){ return apiFetch('/api/npcs'); },
    createNpc: function(data){ return apiFetch('/api/npcs', {method:'POST', body:data}); },
    updateNpc: function(id, data){ return apiFetch('/api/npcs/'+encodeURIComponent(id), {method:'PUT', body:data}); },
    deleteNpc: function(id){ return apiFetch('/api/npcs/'+encodeURIComponent(id), {method:'DELETE'}); },
    getEvents: function(type, id){ return apiFetch('/api/events?targetType='+encodeURIComponent(type)+'&targetId='+encodeURIComponent(id)); },
    createEvent: function(data){ return apiFetch('/api/events', {method:'POST', body:data}); },
    deleteEvent: function(id){ return apiFetch('/api/events/'+encodeURIComponent(id), {method:'DELETE'}); },
    reveal: function(data){ return apiFetch('/api/reveal', {method:'POST', body:data}); },
    createDistrict: function(data){ return apiFetch('/api/districts', {method:'POST', body:data}); },
    deleteDistrict: function(id){ return apiFetch('/api/districts/'+encodeURIComponent(id), {method:'DELETE'}); },
    createTraco: function(data){ return apiFetch('/api/tracos', {method:'POST', body:data}); },
    updateTraco: function(id, data){ return apiFetch('/api/tracos/'+encodeURIComponent(id), {method:'PUT', body:data}); },
    deleteTraco: function(id){ return apiFetch('/api/tracos/'+encodeURIComponent(id), {method:'DELETE'}); },
    setRemovidos: function(data){ return apiFetch('/api/removidos', {method:'PUT', body:data}); },
    /* não há mais "Publicar": o que o mestre revela aparece na hora para os jogadores */
    publishStatus: function(){ return Promise.resolve({ pending: 0, lastPublishedAt: Date.now() }); },
    publish: function(){ return Promise.resolve({}); },
    fichasParaLigar: function(){ return M.fichasParaLigar(); }
  };

  // Jogador: tudo vem de <base>/publico — a visão filtrada montada no servidor.
  var snapshotMeta = { publishedAt: 0 };
  var snapshotPromise = null, snapshotFetchedAt = 0;
  function loadSnapshot(force){
    var now = Date.now();
    if (!force && snapshotPromise && now - snapshotFetchedAt < 5000) return snapshotPromise;
    snapshotFetchedAt = now;
    snapshotPromise = fetch(M.base + '/publico?t=' + now, { cache:'no-store', headers:{ Authorization: 'Bearer ' + M.token } }).then(function(r){
      if (r.status === 401) M.sessaoExpirada();
      if (!r.ok) return r.json().catch(function(){ return {}; }).then(function(d){ throw new Error(d.erro || 'O mapa não carregou.'); });
      return r.json();
    }).then(function(snap){ snapshotMeta.publishedAt = snap.publishedAt || 0; return snap; });
    snapshotPromise.catch(function(){ snapshotPromise = null; });
    return snapshotPromise;
  }
  if (PLAYER){
    var readOnly = function(){ return Promise.reject(new Error('Este mapa é somente leitura.')); };
    Api = {
      getPois: function(){ return loadSnapshot().then(function(s){ return s.pois || []; }); },
      getDistricts: function(){ return loadSnapshot().then(function(s){ return s.districts || []; }); },
      getNpcs: function(){ return loadSnapshot().then(function(s){ return s.npcs || []; }); },
      getEvents: function(type, id){
        return loadSnapshot().then(function(s){
          return (s.events || []).filter(function(e){ return e.targetType === type && e.targetId === id; });
        });
      },
      getScenes: function(){ return Promise.resolve([]); },
      me: function(){ return Promise.resolve({ user:null }); },
      fichasParaLigar: function(){ return Promise.resolve([]); },
      createPoi: readOnly, updatePoi: readOnly, deletePoi: readOnly, createScene: readOnly, deleteScene: readOnly,
      login: readOnly, logout: readOnly, updateDistrict: readOnly, masquerade: readOnly, createNpc: readOnly,
      updateNpc: readOnly, deleteNpc: readOnly, createEvent: readOnly, deleteEvent: readOnly, reveal: readOnly,
      createDistrict: readOnly, deleteDistrict: readOnly, createTraco: readOnly, updateTraco: readOnly, deleteTraco: readOnly, setRemovidos: readOnly,
      publishStatus: readOnly, publish: readOnly
    };
  }
  function reportWriteError(err){
    if (err && err.status === 401) return; // já tratado (modal de login foi aberto)
    toast((err && err.message) || 'Não foi possível completar a operação.', {type:'error'});
  }

  // force === false: atualização de fundo (polling) — não redesenha o painel
  // de detalhes se o mestre estiver no meio de um formulário.
  function applyPoisUpdate(list, force){
    POIS = list || [];
    indexPois();
    renderPOIMarkers();
    buildTypeFilter();
    applyFilters();
    updateTally();
    if (force === false && isDetailBusy()) return;
    if (state.selected && state.selected.type === 'poi' && !poiById[state.selected.id]) state.selected = null;
    renderSelection();
  }
  function refreshPois(force){
    return Api.getPois().then(function(list){ applyPoisUpdate(list, force); return list; });
  }

  var prevMq = null;
  function applyDistrictsUpdate(list, force){
    var keepSel = state.selected;
    DISTRICTS = list || [];
    mergeDistrictGeometry();
    // avisa quando um bairro acaba de entrar em Caçada (inclusive pra quem só está assistindo)
    if (prevMq){
      DISTRICTS.forEach(function(d){
        if (d.masquerade >= MQ_MAX && (prevMq[d.id] || 0) < MQ_MAX && force === false){
          toast('CAÇADA declarada em '+d.name+'!', {type:'error', duration:9000});
        }
      });
    }
    prevMq = {}; DISTRICTS.forEach(function(d){ prevMq[d.id] = d.masquerade || 0; });
    if (CITY && distL){ renderDistricts(); }
    buildLegend();
    applyFilters();
    updateTally();
    renderMqPanel();
    if (force === false && isDetailBusy()) return;
    state.selected = keepSel;
    renderSelection();
  }
  function refreshDistricts(force){
    return Api.getDistricts().then(function(list){ applyDistrictsUpdate(list, force); return list; });
  }

  function applyNpcsUpdate(list, force){
    NPCS = list || [];
    npcById = {}; NPCS.forEach(function(n){ npcById[n.id] = n; });
    buildIndex();
    updateTally();
    if (force === false && isDetailBusy()) return;
    renderSelection();
  }
  function refreshNpcs(force){
    return Api.getNpcs().then(function(list){ applyNpcsUpdate(list, force); return list; });
  }

  function rebuildScenes(list){
    scenesMap = {};
    (list || []).forEach(function(s){ scenesMap[s.id] = s; });
    renderScenesList();
  }
  function refreshScenes(){
    return Api.getScenes().then(function(list){ rebuildScenes(list); return list; });
  }

  // ======================================================================
  // Login — a edição e o cadastro de pontos só ficam disponíveis para quem
  // fizer login. As contas (usuário + hash bcrypt da senha) são cadastradas
  // diretamente no banco pelo administrador (`npm run seed:user`), sem
  // nenhuma rota pública de cadastro dentro do mapa.
  // ======================================================================
  var authProfile = null;
  function isLoggedIn(){ return !!authProfile; }

  function attemptLogin(username, password){
    username = (username || '').trim().toLowerCase();
    password = password || '';
    if (!username || !password) return Promise.reject(new Error('Preencha usuário e senha.'));
    return Api.login(username, password);
  }

  function setAuthProfile(p){
    authProfile = p;
    renderAuthBox();
    if (!p && editMode) setEditMode(false);
    renderScenesList();
    // private_note só vem da API quando autenticado — recarrega os POIs
    // pra refletir a mudança de sessão (login ganha notas, logout perde).
    refreshPois().catch(function(){});
    refreshDistricts().catch(function(){});
    refreshNpcs().catch(function(){});
  }

  function renderAuthBox(){
    appEl.classList.toggle('gm-in', !!authProfile && !PLAYER);
    if (authProfile) schedulePublishStatus();
    if (authProfile){
      authBoxEl.innerHTML = '<span class="auth-profile"><span>Logado como <b>'+escHtml(authProfile.displayName)+'</b></span>' +
        '<button type="button" id="btnLogout">Sair</button></span>';
      authBoxEl.querySelector('#btnLogout').addEventListener('click', function(){
        Api.logout().catch(function(){}).then(function(){
          setAuthProfile(null);
          toast('Sessão encerrada.');
        });
      });
    } else {
      authBoxEl.innerHTML = '<span class="auth-profile"><span>Jogando como <b>'+escHtml(M.usuario.nome)+'</b></span></span>';
    }
  }

  function openLoginModal(onSuccess){
    M.sessaoExpirada(); return;
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = '<div class="confirm-box">' +
      '<p>Entrar para editar o mapa, salvar cenas e ver notas privadas.</p>' +
      '<label>Usuário</label><input type="text" id="loginUser" autocomplete="username">' +
      '<label>Senha</label><input type="password" id="loginPass" autocomplete="current-password">' +
      '<div class="cd-error" id="loginError"></div>' +
      '<div class="confirm-actions"><button type="button" class="ghost" id="loginCancel">Cancelar</button>' +
      '<button type="button" class="danger" id="loginSubmit">Entrar</button></div></div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function(){ overlay.classList.add('show'); });
    function close(){
      overlay.classList.remove('show');
      setTimeout(function(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 180);
    }
    overlay.querySelector('#loginCancel').addEventListener('click', close);
    var mouseDownOnOverlay = false;
    overlay.addEventListener('mousedown', function(ev){ mouseDownOnOverlay = (ev.target === overlay); });
    overlay.addEventListener('click', function(ev){ if (ev.target === overlay && mouseDownOnOverlay) close(); });
    var userInput = overlay.querySelector('#loginUser'), passInput = overlay.querySelector('#loginPass'),
        errEl = overlay.querySelector('#loginError');
    function submit(){
      errEl.textContent = '';
      attemptLogin(userInput.value, passInput.value).then(function(profile){
        setAuthProfile(profile);
        toast('Login efetuado como '+profile.displayName+'.', {type:'ok'});
        close();
        if (onSuccess) onSuccess();
      }).catch(function(err){ errEl.textContent = (err && err.message) || 'Não foi possível entrar.'; });
    }
    overlay.querySelector('#loginSubmit').addEventListener('click', submit);
    passInput.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') submit(); });
    setTimeout(function(){ userInput.focus(); }, 50);
  }
  renderAuthBox();

  // ======================================================================
  // Marcadores de cena — salva a posição/zoom atual do mapa (vb) com um
  // nome, pra pular direto pra lá durante a sessão. Visível a qualquer
  // visitante; só quem estiver logado pode criar ou apagar marcadores.
  // ======================================================================
  var btnScenesEl = document.getElementById('btnScenes'), scenesPanelEl = document.getElementById('scenesPanel'),
      scenesListEl = document.getElementById('scenesList'), sceneAddRowEl = document.getElementById('sceneAddRow'),
      sceneNameInput = document.getElementById('sceneNameInput'), btnSceneSave = document.getElementById('btnSceneSave');
  function renderScenesList(){
    var ids = Object.keys(scenesMap);
    ids.sort(function(a,b){ return (scenesMap[a].createdAt||0) - (scenesMap[b].createdAt||0); });
    scenesListEl.innerHTML = ids.length ? ids.map(function(id){
      var s = scenesMap[id];
      return '<div class="scene-row" data-scene="'+id+'"><span class="nm">'+escHtml(s.name||'Sem nome')+'</span>' +
        (isLoggedIn() ? '<button type="button" data-del="'+id+'" title="Apagar marcador">&times;</button>' : '') + '</div>';
    }).join('') : '<div class="scenes-empty">Nenhuma cena salva ainda.</div>';
    scenesListEl.querySelectorAll('.scene-row').forEach(function(row){
      row.addEventListener('click', function(ev){
        if (ev.target.closest('[data-del]')) return;
        var s = scenesMap[row.getAttribute('data-scene')];
        if (!s) return;
        vb = {x:s.x, y:s.y, w:s.w, h:s.h}; clampVB(); applyVB(); updateNavState();
        scenesPanelEl.classList.remove('show');
      });
    });
    scenesListEl.querySelectorAll('[data-del]').forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        var id = btn.getAttribute('data-del');
        confirmDialog('Apagar o marcador "'+escHtml((scenesMap[id]||{}).name||'')+'"?', {okLabel:'Apagar'}).then(function(ok){
          if (!ok) return;
          Api.deleteScene(id).then(function(){ toast('Marcador apagado.', {type:'ok'}); return refreshScenes(); }).catch(reportWriteError);
        });
      });
    });
    sceneAddRowEl.style.display = isLoggedIn() ? 'flex' : 'none';
  }
  btnScenesEl.addEventListener('click', function(ev){
    ev.stopPropagation();
    scenesPanelEl.classList.toggle('show');
  });
  document.addEventListener('click', function(ev){
    if (scenesPanelEl.classList.contains('show') && !scenesPanelEl.contains(ev.target) && ev.target !== btnScenesEl && !btnScenesEl.contains(ev.target)){
      scenesPanelEl.classList.remove('show');
    }
  });
  btnSceneSave.addEventListener('click', function(){
    if (!isLoggedIn()){ openLoginModal(); return; }
    var name = sceneNameInput.value.trim();
    if (!name){ toast('Dê um nome pra essa cena.', {type:'error'}); return; }
    Api.createScene({ name:name, x:vb.x, y:vb.y, w:vb.w, h:vb.h })
      .then(function(){ toast('Cena salva.', {type:'ok'}); sceneNameInput.value = ''; return refreshScenes(); })
      .catch(reportWriteError);
  });
  sceneNameInput.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') btnSceneSave.click(); });

  // ---------- alternar modo edição ----------
  function setEditMode(on){
    if (on && !isLoggedIn()){ openLoginModal(function(){ setEditMode(true); }); return; }
    editMode = on;
    appEl.classList.toggle('edit-mode', on);
    btnEditModeEl.classList.toggle('active', on);
    if (!on){
      setAddArmed(false); setMoveArmed(null);
      draw = null; vert = null; umClique = null; tool = 'selecionar';
      appEl.classList.remove('tool-apagar', 'tool-desenho');
      toolButtons.forEach(function(b){ b.classList.toggle('armed', b.getAttribute('data-tool') === 'selecionar'); });
      if (state.selected && state.selected.type === 'traco') state.selected = null;
      limparHoverApagar();
    }
    renderPOIMarkers();
    renderEdit();
    if (on && (!state.selected)) showEditHome();
  }
  btnEditModeEl.addEventListener('click', function(){ setEditMode(!editMode); });

  function setAddArmed(on){
    if (on && (draw || vert || tool !== 'selecionar')) setTool('selecionar', { manterPainel:true });
    addArmed = on;
    if (on) setMoveArmed(null);
    mapSvgEl.classList.toggle('add-armed', on);
    btnAddPoi.classList.toggle('armed', on);
    btnAddPoi.textContent = on ? '× Cancelar' : '+ Ponto';
  }
  btnAddPoi.addEventListener('click', function(){ setAddArmed(!addArmed); });

  // ---------- mover por clique (alternativa ao arrastar, mais confiável em alguns navegadores) ----------
  function setMoveArmed(p){
    moveArmed = p || null;
    if (moveArmed) setAddArmed(false);
    mapSvgEl.classList.toggle('add-armed', !!moveArmed);
    if (moveArmed) showEditMoveHint(moveArmed);
  }
  function showEditMoveHint(p){
    detail.innerHTML = '<div class="empty"><b>Movendo "'+escHtml(p.name)+'".</b><br><br>Clique no novo local no mapa. '+
      '<button type="button" class="ghost" id="efMoveCancel" style="margin-top:10px;">Cancelar</button></div>';
    var cb = detail.querySelector('#efMoveCancel');
    if (cb) cb.addEventListener('click', function(){ setMoveArmed(null); renderSelection(); });
  }
  function districtAt(x, y){
    var pt = mapSvgEl.createSVGPoint(); pt.x = x; pt.y = y;
    for (var i = 0; i < DISTRICTS.length; i++){
      var node = distL.querySelector('[data-id="'+DISTRICTS[i].id+'"] .d-hit');
      if (node && node.isPointInFill(pt)) return DISTRICTS[i].id;
    }
    return DISTRICTS.length ? DISTRICTS[0].id : '';
  }

  featHitLayerEl().addEventListener('click', function(ev){
    if (!editMode || tool !== 'selecionar' || draw || vert || addArmed || moveArmed) return;
    var t = ev.target.closest && ev.target.closest('[data-traco]');
    if (!t) return;
    ev.stopPropagation();
    select('traco', t.getAttribute('data-traco'));
  });
  mapSvgEl.addEventListener('click', function(ev){
    if (!editMode || (!addArmed && !moveArmed)) return;
    if (suppressClick) return;
    ev.stopPropagation();
    var pt = svgPoint(ev);
    var did = districtAt(pt.x, pt.y);
    if (moveArmed){
      var mp = moveArmed;
      setMoveArmed(null);
      var nx = Math.round(pt.x), ny = Math.round(pt.y);
      state.selected = { type:'poi', id:mp.id };
      Api.updatePoi(mp.id, { x:nx, y:ny, district:did })
        .then(function(){ toast('Ponto movido.', {type:'ok'}); return refreshPois(); })
        .catch(reportWriteError);
      return;
    }
    setAddArmed(false);
    var id = 'custom-' + Date.now().toString(36) + Math.floor(Math.random()*99);
    openEditForm({ id:id, name:'Novo ponto', icon:'star', faction:(districtById[did]?districtById[did].faction:'neutral'),
      type:'outro', district:did, blurb:'', x:Math.round(pt.x), y:Math.round(pt.y), custom:true, isNew:true });
  }, true);

  // ---------- arrastar um marcador pra reposicionar ----------
  // Evita setPointerCapture em elementos <g> de SVG (suporte inconsistente entre navegadores,
  // sobretudo em iframes sandboxed) — em vez disso, segue o ponteiro via listeners no document
  // enquanto o gesto está ativo, como um drag "manual" clássico.
  var poiDrag = null; // {g, p, start:{x,y,px,py}, moved, pointerId}
  function attachPoiDrag(g, p){
    g.addEventListener('pointerdown', function(ev){
      if (ev.button != null && ev.button !== 0) return;
      ev.stopPropagation();
      ev.preventDefault();
      poiDrag = { g:g, p:p, start:{ x:ev.clientX, y:ev.clientY, px:p.x, py:p.y }, moved:false, pointerId:ev.pointerId };
    });
  }
  document.addEventListener('pointermove', function(ev){
    if (!poiDrag) return;
    if (poiDrag.pointerId != null && ev.pointerId != null && ev.pointerId !== poiDrag.pointerId) return;
    var dx = ev.clientX - poiDrag.start.x, dy = ev.clientY - poiDrag.start.y;
    if (!poiDrag.moved && Math.abs(dx)+Math.abs(dy) <= 3) return;
    poiDrag.moved = true; poiDragMoved = true;
    var r = svgContentRect();
    var nx = poiDrag.start.px + dx * (vb.w / r.width), ny = poiDrag.start.py + dy * (vb.h / r.height);
    poiDrag.p.x = nx; poiDrag.p.y = ny;
    poiDrag.g.setAttribute('transform', 'translate('+nx+','+ny+')');
  });
  function finishPoiDrag(ev){
    if (!poiDrag) return;
    var drag = poiDrag; poiDrag = null;
    if (!drag.moved) return;
    var p = drag.p;
    var did = districtAt(p.x, p.y);
    p.district = did;
    Api.updatePoi(p.id, { x: Math.round(p.x), y: Math.round(p.y), district: did })
      .then(function(){ toast('Ponto movido.', {type:'ok'}); return refreshPois(); })
      .catch(reportWriteError);
    setTimeout(function(){ poiDragMoved = false; }, 50);
  }
  document.addEventListener('pointerup', finishPoiDrag);
  document.addEventListener('pointercancel', finishPoiDrag);

  // ---------- formulário de edição ----------
  function iconButton(iconId, selected){
    return '<button type="button" class="icon-opt'+(selected?' sel':'')+'" data-icon="'+iconId+'" title="'+iconId+'">'+
      '<svg viewBox="0 0 24 24" fill="currentColor"><use href="#ic-'+iconId+'"></use></svg></button>';
  }

  function showEditHome(){
    detail.innerHTML = '<div class="empty"><b>Modo edição.</b> Tudo o que você faz fica salvo na hora; <b>Desfazer</b> (Ctrl+Z) volta.<br><br>' +
      '<b>Selecionar</b>: clique num bairro, ponto ou traço para editar; arraste um ponto para movê-lo.<br>' +
      '<b>+ Ponto</b>: marca um lugar novo.<br>' +
      '<b>Bairro</b>, <b>Rua</b>, <b>Área</b> e <b>Ponte</b>: clique ponto a ponto no mapa; duplo clique ou Enter conclui.<br>' +
      '<b>Texto</b>: escreve um nome no mapa.<br>' +
      '<b>Apagar</b>: clique no que quiser tirar (quadras, árvores, ruas, nomes, o que você desenhou).<br>' +
      '<b>Borracha</b>: desenhe uma área e tudo o que estiver inteiro dentro dela sai.<br><br>' +
      'Atalhos: V selecionar · B bairro · R rua · A área · O ponte · T texto · E apagar · L borracha · Esc cancela.</div>';
  }

  function openEditForm(p){
    var isNew = !!p.isNew;
    var districtOpts = DISTRICTS.slice().sort(function(a,b){ return a.name.localeCompare(b.name, 'pt'); }).map(function(d){
      return '<option value="'+d.id+'"'+(d.id===p.district?' selected':'')+'>'+d.name+'</option>';
    }).join('');
    var factionOpts = [['camarilla','Camarilla'],['anarch','Anarch'],['neutral','Neutro']].map(function(f){
      return '<option value="'+f[0]+'"'+(f[0]===p.faction?' selected':'')+'>'+f[1]+'</option>';
    }).join('');
    var typeOpts = TYPES.map(function(t){
      return '<option value="'+t[0]+'"'+(t[0]===p.type?' selected':'')+'>'+t[1]+'</option>';
    }).join('');
    var iconGrid = ICONS.map(function(ic){ return iconButton(ic, ic===p.icon); }).join('');
    detail.innerHTML =
      '<div class="edit-form">' +
      '<p class="edit-hint">'+(isNew ? 'Novo ponto de interesse — preencha e salve.' : (p.custom ? 'Ponto criado por você.' : 'Ponto original do mapa — editar aqui atualiza o mapa pra todo mundo.'))+'</p>' +
      '<div><label>Nome</label><input type="text" id="efName" value="'+escAttr(p.name)+'"></div>' +
      '<div><label>Ícone</label><div class="icon-grid" id="efIcons">'+iconGrid+'</div></div>' +
      '<div><label>Facção</label><select id="efFaction">'+factionOpts+'</select></div>' +
      '<div><label>Tipo de local</label><select id="efType">'+typeOpts+'</select></div>' +
      '<div><label>Bairro</label><select id="efDistrict">'+districtOpts+'</select></div>' +
      '<div><label>Domínio (personagem que controla este local)</label><input type="text" id="efDomain" value="'+escAttr(p.domain||'')+'" placeholder="Ex.: Marie, o Príncipe, ninguém reivindicou&hellip;"></div>' +
      '<div><label>Descrição</label><textarea id="efBlurb">'+escHtml(p.blurb||'')+'</textarea></div>' +
      '<label class="check"><input type="checkbox" id="efRevealed"'+(p.revealed ? ' checked' : '')+'> Revelado aos jogadores (aparece na hora para eles)</label>' +
      '<div><label>Notas privadas (só visíveis pra quem estiver logado)</label><textarea id="efPrivateNote" placeholder="Segredos, ganchos de trama, o que realmente está acontecendo aqui&hellip;">'+escHtml(p.privateNote||'')+'</textarea></div>' +
      '<div class="edit-actions">' +
      '<button type="button" class="primary" id="efSave">Salvar</button>' +
      (isNew ? '' : '<button type="button" class="ghost" id="efMove" title="Clique aqui e depois no novo local do mapa">Mover (clique no mapa)</button>') +
      (isNew ? '' : '<button type="button" class="ghost" id="efClearBlurb">Limpar descrição</button>') +
      (isNew ? '' : '<button type="button" class="danger" id="efDelete">Excluir ponto</button>') +
      '<button type="button" class="ghost" id="efCancel">Cancelar</button>' +
      '</div></div>';

    var selIcon = p.icon;
    detail.querySelector('#efIcons').addEventListener('click', function(ev){
      var b = ev.target.closest('.icon-opt'); if (!b) return;
      detail.querySelectorAll('.icon-opt').forEach(function(x){ x.classList.remove('sel'); });
      b.classList.add('sel'); selIcon = b.getAttribute('data-icon');
    });

    function collect(){
      return {
        name: detail.querySelector('#efName').value.trim() || 'Sem nome',
        icon: selIcon,
        faction: detail.querySelector('#efFaction').value,
        type: detail.querySelector('#efType').value,
        district: detail.querySelector('#efDistrict').value,
        domain: detail.querySelector('#efDomain').value.trim(),
        blurb: detail.querySelector('#efBlurb').value,
        privateNote: detail.querySelector('#efPrivateNote').value,
        revealed: detail.querySelector('#efRevealed').checked,
        x: Math.round(p.x), y: Math.round(p.y)
      };
    }
    detail.querySelector('#efSave').addEventListener('click', function(){
      var data = collect();
      var op = isNew ? Api.createPoi(data) : Api.updatePoi(p.id, data);
      op.then(function(result){
        state.selected = { type:'poi', id: isNew ? result.id : p.id };
        toast(isNew ? 'Ponto adicionado.' : 'Alterações salvas.', {type:'ok'});
        return refreshPois();
      }).catch(reportWriteError);
    });
    var moveBtn = detail.querySelector('#efMove');
    if (moveBtn) moveBtn.addEventListener('click', function(){ setMoveArmed(p); });
    var clearBtn = detail.querySelector('#efClearBlurb');
    if (clearBtn) clearBtn.addEventListener('click', function(){ detail.querySelector('#efBlurb').value = ''; });
    var delBtn = detail.querySelector('#efDelete');
    if (delBtn) delBtn.addEventListener('click', function(){
      confirmDialog('Excluir "'+p.name+'"? Essa ação não pode ser desfeita.', {okLabel:'Excluir'}).then(function(ok){
        if (!ok) return;
        state.selected = null;
        Api.deletePoi(p.id).then(function(){ toast('Ponto excluído.', {type:'ok'}); return refreshPois(); }).catch(reportWriteError);
      });
    });
    var cancelBtn = detail.querySelector('#efCancel');
    cancelBtn.addEventListener('click', function(){ state.selected = isNew ? null : {type:'poi', id:p.id}; renderSelection(); });
  }

  // ======================================================================
  // Campanha: Quebra da Máscara por bairro, diário de eventos por local,
  // personagens (NPCs) ligados a pontos do mapa e edição de bairros.
  // ======================================================================
  var CLANS = ['Banu Haqim','Brujah','Caitiff','Gangrel','Hecata','Lasombra','Malkavian','Ministry','Nosferatu',
    'Ravnos','Salubri','Sangue-ralo','Toreador','Tremere','Tzimisce','Ventrue','Carniçal','Mortal'];
  var NPC_STATUS = [['ativo','Ativo'],['desaparecido','Desaparecido'],['torpor','Em torpor'],['morte-final','Morte final']];
  var NPC_STATUS_LABEL = {}; NPC_STATUS.forEach(function(s){ NPC_STATUS_LABEL[s[0]] = s[1]; });
  var RELATIONS = [['dominio','Domínio'],['refugio','Refúgio'],['frequenta','Frequenta']];
  var RELATION_LABEL = {}; RELATIONS.forEach(function(r){ RELATION_LABEL[r[0]] = r[1]; });
  var FACTION_OPTS = [['camarilla','Camarilla'],['anarch','Anarch'],['neutral','Neutro']];

  function byName(a, b){ return a.name.localeCompare(b.name, 'pt'); }
  function optionsHtml(list, selected){
    return list.map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===selected?' selected':'')+'>'+o[1]+'</option>'; }).join('');
  }
  function sectionHead(title, count){
    return '<div class="sec-head">'+title+(count != null ? '<span class="ct">'+count+'</span>' : '')+'</div>';
  }
  function privateNoteBlock(text){
    return (isLoggedIn() && text) ? '<div class="private-note"><div class="pn-head">Notas privadas</div><div class="pn-body">'+escHtml(text)+'</div></div>' : '';
  }
  function poiRowHtml(p){
    return '<div class="poi-row" data-poi="'+p.id+'"><span class="sw" style="background:var(--'+p.faction+'-line)"></span><span class="nm">'+escHtml(p.name)+'</span><span class="fx">'+FACTION_LABEL[p.faction]+'</span></div>';
  }
  // items: [{npc, relation?}]
  function npcListHtml(items){
    return '<div class="poi-list">' + items.map(function(it){
      var n = it.npc || it;
      var extra = [n.clan, it.relation ? RELATION_LABEL[it.relation] : (it.where || '')].filter(Boolean).join(' · ');
      return '<div class="poi-row npc-row st-'+n.status+'" data-npc="'+n.id+'"><span class="sw round" style="background:var(--'+n.faction+'-line)"></span>' +
        '<span class="nm">'+escHtml(n.name)+'</span><span class="fx">'+escHtml(extra)+'</span></div>';
    }).join('') + '</div>';
  }
  function npcsForPoi(poiId){
    var out = [];
    NPCS.forEach(function(n){
      (n.locations || []).forEach(function(l){ if (l.poiId === poiId) out.push({ npc:n, relation:l.relation }); });
    });
    return out.sort(function(a, b){ return byName(a.npc, b.npc); });
  }
  function npcsInDistrict(districtId){
    var out = [];
    NPCS.forEach(function(n){
      var hits = (n.locations || []).filter(function(l){ var p = poiById[l.poiId]; return p && p.district === districtId; });
      if (hits.length) out.push({ npc:n, where: hits.map(function(l){ return poiById[l.poiId].name; }).join(', ') });
    });
    return out.sort(function(a, b){ return byName(a.npc, b.npc); });
  }
  function wireDetailLinks(){
    detail.querySelectorAll('[data-poi]').forEach(function(n){
      n.addEventListener('click', function(){ select('poi', n.getAttribute('data-poi')); });
    });
    detail.querySelectorAll('[data-npc]').forEach(function(n){
      n.addEventListener('click', function(ev){ ev.stopPropagation(); select('npc', n.getAttribute('data-npc')); });
    });
    detail.querySelectorAll('[data-district]').forEach(function(n){
      n.addEventListener('click', function(){ select('district', n.getAttribute('data-district')); });
    });
  }
  // enquadra o mapa num conjunto de pontos, mantendo a proporção do mapa
  function fitToPoints(points){
    points = points.filter(Boolean);
    if (!points.length) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(function(p){ minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    var pad = 170, aspect = VB_FULL.w / VB_FULL.h;
    var w = Math.max(maxX - minX + pad * 2, (maxY - minY + pad * 2) * aspect, VB_FULL.w / MAX_SCALE * 1.6);
    w = Math.min(w, VB_FULL.w);
    var h = w / aspect;
    vb = { x:(minX + maxX) / 2 - w / 2, y:(minY + maxY) / 2 - h / 2, w:w, h:h };
    clampVB(); applyVB(); updateNavState();
  }
  function lastSession(v){
    try{
      if (v != null) localStorage.setItem('belmont_last_session', v);
      return localStorage.getItem('belmont_last_session') || '';
    }catch(e){ return v || ''; }
  }
  // Atualizações automáticas (polling) não podem apagar um formulário que o
  // mestre está preenchendo no painel de detalhes.
  function isDetailBusy(){
    if (detail.querySelector('.edit-form')) return true;
    var a = document.activeElement;
    if (a && detail.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    var fields = detail.querySelectorAll('textarea, input[type="text"]');
    for (var i = 0; i < fields.length; i++){
      if (fields[i].value.trim() && !fields[i].hasAttribute('data-prefill')) return true;
    }
    return false;
  }

  // ---------- Quebra da Máscara ----------
  function masqueradeBlock(d){
    var mq = d.masquerade || 0, info = mqInfo(mq), segs = '';
    for (var i = 1; i <= MQ_MAX; i++) segs += '<span class="mq-seg'+(i <= mq ? ' on' : '')+'"></span>';
    return '<div class="mq-block '+info.cls+'">' +
      '<div class="mq-top"><span class="mq-title">Quebra da Máscara</span><span class="mq-val">'+mq+'/'+MQ_MAX+' &middot; '+info.label+'</span></div>' +
      '<div class="mq-meter">'+segs+'</div>' +
      (mq >= MQ_MAX ? '<div class="mq-hunt-msg">Caçada declarada. A Segunda Inquisição, a polícia e os caçadores estão de olho neste bairro, e qualquer Membro aqui corre risco.</div>' : '') +
      (isLoggedIn() ? '<div class="mq-actions"><button type="button" data-mq-dir="1" class="mq-up"'+(mq >= MQ_MAX ? ' disabled' : '')+'>+ Registrar quebra</button>' +
        '<button type="button" data-mq-dir="-1" class="mq-down"'+(mq <= 0 ? ' disabled' : '')+'>&minus; Restaurar</button></div><div class="mq-form" id="mqForm"></div>' : '') +
      '</div>';
  }
  function wireMasquerade(d){
    var formEl = detail.querySelector('#mqForm');
    if (!formEl) return;
    detail.querySelectorAll('[data-mq-dir]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var dir = parseInt(btn.getAttribute('data-mq-dir'), 10);
        var mq = d.masquerade || 0;
        var opts = [];
        if (dir > 0){ for (var i = 1; i <= Math.min(3, MQ_MAX - mq); i++) opts.push(['+'+i, '+'+i+' (fica '+(mq+i)+'/'+MQ_MAX+')']); }
        else { for (var j = 1; j <= Math.min(3, mq); j++) opts.push(['-'+j, '−'+j+' (fica '+(mq-j)+'/'+MQ_MAX+')']); opts.push(['zero', 'Zerar (Máscara restaurada)']); }
        formEl.innerHTML =
          '<div class="mq-form-row"><select id="mqAmount">'+optionsHtml(opts, opts[0][0])+'</select>' +
          '<select id="mqVis">'+optionsHtml([['public','Jogadores veem'],['private','Só o mestre']], 'public')+'</select></div>' +
          '<input type="text" id="mqReason" placeholder="'+(dir > 0 ? 'O que aconteceu? Ex.: frenesi no meio da feira' : 'Como a Máscara foi restaurada? Ex.: laudo do IML alterado')+'">' +
          '<input type="text" id="mqSession" data-prefill placeholder="Sessão (opcional)" value="'+escAttr(lastSession())+'">' +
          '<div class="mq-form-row"><button type="button" class="primary" id="mqOk">Confirmar</button><button type="button" class="ghost" id="mqCancel">Cancelar</button></div>';
        formEl.classList.add('open');
        formEl.querySelector('#mqReason').focus();
        formEl.querySelector('#mqCancel').addEventListener('click', function(){ formEl.innerHTML = ''; formEl.classList.remove('open'); });
        formEl.querySelector('#mqOk').addEventListener('click', function(){
          var amount = formEl.querySelector('#mqAmount').value;
          var session = formEl.querySelector('#mqSession').value.trim();
          lastSession(session);
          var body = { reason: formEl.querySelector('#mqReason').value.trim(), visibility: formEl.querySelector('#mqVis').value, session: session };
          if (amount === 'zero') body.level = 0; else body.delta = parseInt(amount, 10);
          Api.masquerade(d.id, body).then(function(res){
            var lvl = res && res.district ? res.district.masquerade : 0;
            if (lvl >= MQ_MAX) toast('CAÇADA declarada em '+d.name+'!', {type:'error', duration:9000});
            else toast('Máscara em '+d.name+': '+lvl+'/'+MQ_MAX+'.', {type:'ok'});
            return refreshDistricts().then(function(){ renderSelection(); });
          }).catch(reportWriteError);
        });
      });
    });
  }

  var mqPanelEl = document.getElementById('mqPanel');
  function renderMqPanel(){
    if (!mqPanelEl) return;
    var hot = DISTRICTS.filter(function(d){ return d.masquerade > 0; })
      .sort(function(a, b){ return (b.masquerade - a.masquerade) || byName(a, b); });
    var html = '<span class="hd">Quebra da Máscara</span>';
    if (!hot.length) html += '<div class="mqp-empty">Máscara intacta em toda a cidade.</div>';
    else html += hot.map(function(d){
      var info = mqInfo(d.masquerade);
      return '<div class="mqp-row '+info.cls+'" data-district="'+d.id+'" title="'+escAttr(d.name+' · '+info.label)+'">' +
        '<span class="nm">'+escHtml(d.name)+'</span><span class="mqp-bar"><span style="width:'+(d.masquerade / MQ_MAX * 100)+'%"></span></span>' +
        '<span class="v">'+(d.masquerade >= MQ_MAX ? '☠' : d.masquerade)+'</span></div>';
    }).join('');
    mqPanelEl.innerHTML = html;
    mqPanelEl.querySelectorAll('[data-district]').forEach(function(n){
      n.addEventListener('click', function(){ select('district', n.getAttribute('data-district')); });
    });
  }

  // ---------- diário de eventos ----------
  function diaryShell(type, id){
    var form = isLoggedIn()
      ? '<div class="diary-form">' +
          '<textarea class="diary-text" placeholder="O que aconteceu aqui? Ex.: Finnegan foi visto saindo pelos fundos às 3h."></textarea>' +
          '<div class="diary-form-row"><input type="text" class="diary-session" data-prefill placeholder="Sessão" value="'+escAttr(lastSession())+'">' +
          '<select class="diary-vis">'+optionsHtml([['public','Jogadores veem'],['private','Só o mestre']], 'public')+'</select>' +
          '<button type="button" class="diary-add">Registrar</button></div></div>'
      : '';
    return '<div class="diary" data-type="'+type+'" data-id="'+id+'">' + sectionHead('Diário de eventos') + form +
      '<div class="diary-list"><div class="diary-empty">Carregando&hellip;</div></div></div>';
  }
  function fmtDate(ts){
    try{ return new Date(ts).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }); }catch(e){ return ''; }
  }
  function loadDiary(type, id){
    var box = detail.querySelector('.diary');
    if (!box) return;
    var key = type + ':' + id;
    var addBtn = box.querySelector('.diary-add');
    if (addBtn) addBtn.addEventListener('click', function(){
      var text = box.querySelector('.diary-text').value.trim();
      if (!text){ toast('Escreva o que aconteceu.', {type:'error'}); return; }
      var session = box.querySelector('.diary-session').value.trim();
      lastSession(session);
      Api.createEvent({ targetType:type, targetId:id, body:text, session:session, visibility:box.querySelector('.diary-vis').value })
        .then(function(){ box.querySelector('.diary-text').value = ''; toast('Registrado no diário.', {type:'ok'}); fetchDiary(); })
        .catch(reportWriteError);
    });
    function fetchDiary(){
      Api.getEvents(type, id).then(function(list){
        var cur = detail.querySelector('.diary');
        if (!cur || cur.getAttribute('data-type') + ':' + cur.getAttribute('data-id') !== key) return;
        renderDiaryList(cur.querySelector('.diary-list'), list, fetchDiary);
      }).catch(function(){
        var cur = detail.querySelector('.diary-list');
        if (cur) cur.innerHTML = '<div class="diary-empty">Não foi possível carregar o diário.</div>';
      });
    }
    fetchDiary();
  }
  function renderDiaryList(listEl, list, reload){
    if (!list.length){ listEl.innerHTML = '<div class="diary-empty">Nada registrado aqui ainda.</div>'; return; }
    listEl.innerHTML = list.map(function(e){
      return '<div class="ev ev-'+e.kind+(e.visibility === 'private' ? ' ev-private' : '')+(e.kind === 'masquerade' && e.delta > 0 ? ' ev-up' : '')+'">' +
        '<div class="ev-meta">' + (e.session ? '<span class="ev-session">'+escHtml(e.session)+'</span>' : '') +
        '<span>'+fmtDate(e.createdAt)+'</span>' +
        (e.visibility === 'private' ? '<span class="ev-lock">só o mestre</span>' : '') +
        (isLoggedIn() ? '<button type="button" class="ev-del" data-ev="'+e.id+'" title="Apagar entrada">&times;</button>' : '') +
        '</div><div class="ev-body">'+escHtml(e.body)+'</div></div>';
    }).join('');
    listEl.querySelectorAll('.ev-del').forEach(function(btn){
      btn.addEventListener('click', function(){
        confirmDialog('Apagar esta entrada do diário?', {okLabel:'Apagar'}).then(function(ok){
          if (!ok) return;
          Api.deleteEvent(btn.getAttribute('data-ev')).then(function(){ toast('Entrada apagada.', {type:'ok'}); reload(); }).catch(reportWriteError);
        });
      });
    });
  }

  // ---------- editar bairro ----------
  function openDistrictForm(d){
    detail.innerHTML =
      '<div class="edit-form">' +
      '<p class="edit-hint">Editando o bairro. Mudar a facção recolore o território no mapa pra todo mundo.</p>' +
      '<div><label>Nome</label><input type="text" id="dfName" value="'+escAttr(d.name)+'"></div>' +
      '<div><label>Subtítulo</label><input type="text" id="dfSub" value="'+escAttr(d.sub)+'"></div>' +
      '<div><label>Facção que controla</label><select id="dfFaction">'+optionsHtml(FACTION_OPTS, d.faction)+'</select></div>' +
      '<div><label>Domínio (quem manda no bairro)</label><input type="text" id="dfDomain" value="'+escAttr(d.domain||'')+'" placeholder="Ex.: Príncipe George, o Barão Anarch&hellip;"></div>' +
      '<div><label>Descrição</label><textarea id="dfBlurb">'+escHtml(d.blurb||'')+'</textarea></div>' +
      '<label class="check"><input type="checkbox" id="dfRevealed"'+(d.revealed ? ' checked' : '')+'> Revelado aos jogadores (aparece na hora para eles)</label>' +
      '<div><label>Notas privadas (só visíveis pra quem estiver logado)</label><textarea id="dfPrivate">'+escHtml(d.privateNote||'')+'</textarea></div>' +
      '<div class="edit-actions"><button type="button" class="primary" id="dfSave">Salvar</button>' +
      '<button type="button" class="ghost" id="dfCancel">Cancelar</button></div></div>';
    detail.querySelector('#dfCancel').addEventListener('click', function(){ renderSelection(); });
    detail.querySelector('#dfSave').addEventListener('click', function(){
      Api.updateDistrict(d.id, {
        name: detail.querySelector('#dfName').value.trim(),
        sub: detail.querySelector('#dfSub').value.trim(),
        faction: detail.querySelector('#dfFaction').value,
        domain: detail.querySelector('#dfDomain').value.trim(),
        blurb: detail.querySelector('#dfBlurb').value,
        privateNote: detail.querySelector('#dfPrivate').value,
        revealed: detail.querySelector('#dfRevealed').checked
      }).then(function(){
        toast('Bairro atualizado.', {type:'ok'});
        return refreshDistricts().then(function(){ state.selected = { type:'district', id:d.id }; renderSelection(); });
      }).catch(reportWriteError);
    });
  }

  // ---------- personagens (NPCs) ----------
  function openNpcForm(n){
    var isNew = !n;
    n = n || { name:'', clan:'', faction:'neutral', role:'', status:'ativo', description:'', privateNote:'', hidden:false, revealed:false, locations:[] };
    var locs = (n.locations || []).filter(function(l){ return poiById[l.poiId]; }).map(function(l){ return { poiId:l.poiId, relation:l.relation }; });
    var poiOpts = POIS.slice().sort(byName).map(function(p){ return '<option value="'+p.id+'">'+escHtml(p.name)+'</option>'; }).join('');
    detail.innerHTML =
      '<div class="edit-form">' +
      '<p class="edit-hint">'+(isNew ? 'Novo personagem.' : 'Editando personagem.')+'</p>' +
      '<div><label>Nome</label><input type="text" id="nfName" value="'+escAttr(n.name)+'"></div>' +
      '<div class="ef-row"><div><label>Clã</label><input type="text" id="nfClan" list="nfClanList" value="'+escAttr(n.clan)+'" placeholder="Ex.: Ventrue">' +
        '<datalist id="nfClanList">'+CLANS.map(function(c){ return '<option value="'+c+'">'; }).join('')+'</datalist></div>' +
        '<div><label>Facção</label><select id="nfFaction">'+optionsHtml(FACTION_OPTS, n.faction)+'</select></div></div>' +
      '<div class="ef-row"><div><label>Cargo / função</label><input type="text" id="nfRole" value="'+escAttr(n.role)+'" placeholder="Ex.: Príncipe, Xerife, Barão"></div>' +
        '<div><label>Status</label><select id="nfStatus">'+optionsHtml(NPC_STATUS, n.status)+'</select></div></div>' +
      '<label class="check"><input type="checkbox" id="nfRevealed"'+(n.revealed && !n.hidden ? ' checked' : '')+'> Revelado aos jogadores (aparece na hora para eles)</label>' +
      '<div><label>Descrição (jogadores veem)</label><textarea id="nfDesc">'+escHtml(n.description)+'</textarea></div>' +
      '<div><label>Notas privadas (só o mestre)</label><textarea id="nfPrivate">'+escHtml(n.privateNote||'')+'</textarea></div>' +
      '<div><label>Ficha completa (só o mestre vê)</label><select id="nfFicha"><option value="">Nenhuma</option>' +
        (n.fichaId ? '<option value="'+escAttr(n.fichaId)+'" selected>Ficha ligada</option>' : '') + '</select></div>' +
      '<div><label>Locais ligados</label><div class="loc-list" id="nfLocs"></div>' +
        '<div class="loc-add"><select id="nfLocPoi"><option value="">Escolha um ponto&hellip;</option>'+poiOpts+'</select>' +
        '<select id="nfLocRel">'+optionsHtml(RELATIONS, 'dominio')+'</select><button type="button" id="nfLocAdd">Vincular</button></div></div>' +
      '<div class="edit-actions"><button type="button" class="primary" id="nfSave">Salvar</button>' +
      (isNew ? '' : '<button type="button" class="danger" id="nfDelete">Excluir personagem</button>') +
      '<button type="button" class="ghost" id="nfCancel">Cancelar</button></div></div>';

    var fichaSel = detail.querySelector('#nfFicha');
    Api.fichasParaLigar().then(function(lista){
      var atual = n.fichaId || '';
      fichaSel.innerHTML = '<option value="">Nenhuma</option>' + lista.map(function(f){
        return '<option value="'+escAttr(f.id)+'"'+(f.id === atual ? ' selected' : '')+'>'+escHtml(f.nome || 'Sem nome')+(f.dono ? ' — '+escHtml(f.dono) : '')+'</option>';
      }).join('') + (atual && !lista.some(function(f){ return f.id === atual; }) ? '<option value="'+escAttr(atual)+'" selected>Ficha ligada</option>' : '');
    }).catch(function(){});
    var locsEl = detail.querySelector('#nfLocs');
    function drawLocs(){
      locsEl.innerHTML = locs.length ? locs.map(function(l, i){
        return '<div class="loc-row"><span class="nm">'+escHtml(poiById[l.poiId].name)+'</span>' +
          '<select data-i="'+i+'">'+optionsHtml(RELATIONS, l.relation)+'</select>' +
          '<button type="button" data-rm="'+i+'" title="Remover vínculo">&times;</button></div>';
      }).join('') : '<div class="diary-empty">Nenhum local vinculado.</div>';
      locsEl.querySelectorAll('select[data-i]').forEach(function(s){
        s.addEventListener('change', function(){ locs[+s.getAttribute('data-i')].relation = s.value; });
      });
      locsEl.querySelectorAll('[data-rm]').forEach(function(b){
        b.addEventListener('click', function(){ locs.splice(+b.getAttribute('data-rm'), 1); drawLocs(); });
      });
    }
    drawLocs();
    detail.querySelector('#nfLocAdd').addEventListener('click', function(){
      var pid = detail.querySelector('#nfLocPoi').value;
      if (!pid) return;
      var rel = detail.querySelector('#nfLocRel').value;
      var existing = locs.filter(function(l){ return l.poiId === pid; })[0];
      if (existing) existing.relation = rel; else locs.push({ poiId:pid, relation:rel });
      detail.querySelector('#nfLocPoi').value = '';
      drawLocs();
    });
    detail.querySelector('#nfCancel').addEventListener('click', function(){
      if (isNew) state.selected = null;
      renderSelection();
    });
    detail.querySelector('#nfSave').addEventListener('click', function(){
      var data = {
        name: detail.querySelector('#nfName').value.trim(),
        clan: detail.querySelector('#nfClan').value.trim(),
        faction: detail.querySelector('#nfFaction').value,
        role: detail.querySelector('#nfRole').value.trim(),
        status: detail.querySelector('#nfStatus').value,
        revealed: detail.querySelector('#nfRevealed').checked,
        hidden: false,
        description: detail.querySelector('#nfDesc').value,
        privateNote: detail.querySelector('#nfPrivate').value,
        fichaId: fichaSel.value || null,
        locations: locs
      };
      if (!data.name){ toast('Dê um nome ao personagem.', {type:'error'}); return; }
      (isNew ? Api.createNpc(data) : Api.updateNpc(n.id, data)).then(function(res){
        toast(isNew ? 'Personagem criado.' : 'Personagem salvo.', {type:'ok'});
        return refreshNpcs().then(function(){ state.selected = { type:'npc', id: isNew ? res.id : n.id }; renderSelection(); });
      }).catch(reportWriteError);
    });
    var del = detail.querySelector('#nfDelete');
    if (del) del.addEventListener('click', function(){
      confirmDialog('Excluir "'+n.name+'"? Os vínculos com locais também somem.', {okLabel:'Excluir'}).then(function(ok){
        if (!ok) return;
        Api.deleteNpc(n.id).then(function(){
          toast('Personagem excluído.', {type:'ok'});
          state.selected = null;
          return refreshNpcs().then(function(){ renderSelection(); });
        }).catch(reportWriteError);
      });
    });
    setTimeout(function(){ var f = detail.querySelector('#nfName'); if (f && isNew) f.focus(); }, 30);
  }

  function buildNpcIndex(header){
    var q = state.query.trim().toLowerCase();
    var list = NPCS.filter(function(n){
      var fm = state.faction === 'all' || n.faction === state.faction;
      var tm = !q || [n.name, n.clan, n.role].join(' ').toLowerCase().indexOf(q) > -1;
      return fm && tm;
    });
    var html = header + (isLoggedIn() ? '<button type="button" class="index-add" id="btnNewNpc">+ Novo personagem</button>' : '');
    var buckets = { camarilla:[], anarch:[], neutral:[] };
    list.forEach(function(n){ (buckets[n.faction] || buckets.neutral).push(n); });
    ['camarilla','anarch','neutral'].forEach(function(fx){
      var b = buckets[fx].sort(byName);
      if (!b.length) return;
      html += '<div class="index-fx-head fx-'+fx+'"><span class="sw"></span>'+FACTION_LABEL[fx]+'<span class="ct">'+b.length+'</span></div>';
      html += b.map(function(n){
        return '<div class="index-item npc-item st-'+n.status+(!PLAYER && !n.revealed ? ' unrevealed' : '')+'" data-npc="'+n.id+'" title="'+escAttr(n.name)+'">' +
          '<span class="sw round" style="background:var(--'+n.faction+'-line)"></span><span class="nm">'+escHtml(n.name)+'</span>' +
          '<span class="sub">'+escHtml(n.clan || NPC_STATUS_LABEL[n.status] || '')+'</span></div>';
      }).join('');
    });
    if (!list.length){
      html += '<div class="empty" style="padding:10px 0;color:var(--muted);font-size:12px;line-height:1.6;">' +
        (NPCS.length ? 'Nenhum personagem encontrado.' : 'Nenhum personagem cadastrado ainda.' + (isLoggedIn() ? ' Use "+ Novo personagem" pra começar.' : '')) + '</div>';
    }
    indexEl.innerHTML = html;
    var nb = indexEl.querySelector('#btnNewNpc');
    if (nb) nb.addEventListener('click', function(){ state.selected = null; renderSelection(); openNpcForm(null); });
    indexEl.querySelectorAll('[data-npc]').forEach(function(n){
      n.addEventListener('click', function(){ select('npc', n.getAttribute('data-npc')); });
    });
  }


  // ======================================================================
  // Revelar aos jogadores + Publicar (site estático na Vercel)
  // ======================================================================
  function revealBadge(item){
    if (PLAYER || !isLoggedIn()) return '';
    return item.revealed && !item.hidden
      ? ' <span class="badge revealed-badge">Revelado</span>'
      : ' <span class="badge unrevealed-badge">Oculto dos jogadores</span>';
  }
  // extraPois: pontos do bairro, pra oferecer "revelar tudo de uma vez"
  function revealButtons(item, extraPois){
    if (PLAYER || !isLoggedIn()) return '';
    var on = item.revealed && !item.hidden;
    var html = '<button type="button" class="act-btn reveal-btn'+(on ? '' : ' to-reveal')+'" data-reveal="'+(on ? 0 : 1)+'">' +
      (on ? 'Ocultar dos jogadores' : 'Revelar aos jogadores') + '</button>';
    var hiddenPois = (extraPois || []).filter(function(p){ return !p.revealed; });
    if (hiddenPois.length){
      html += '<button type="button" class="act-btn reveal-btn to-reveal" data-reveal-all="1">Revelar bairro + '+hiddenPois.length+' ponto'+(hiddenPois.length > 1 ? 's' : '')+'</button>';
    }
    return html;
  }
  function wireReveal(type, item, extraPois){
    detail.querySelectorAll('[data-reveal]').forEach(function(b){
      b.addEventListener('click', function(){
        var to = b.getAttribute('data-reveal') === '1';
        doReveal([{ type:type, id:item.id }], to, to ? '"'+item.name+'" revelado: os jogadores já veem.' : '"'+item.name+'" ficou oculto dos jogadores.');
      });
    });
    var all = detail.querySelector('[data-reveal-all]');
    if (all) all.addEventListener('click', function(){
      var items = [{ type:type, id:item.id }].concat((extraPois || []).filter(function(p){ return !p.revealed; })
        .map(function(p){ return { type:'poi', id:p.id }; }));
      doReveal(items, true, 'Bairro e pontos revelados: os jogadores já veem.');
    });
  }
  function doReveal(items, to, msg){
    Api.reveal({ items:items, revealed:to }).then(function(){
      toast(msg, {type:'ok'});
      return Promise.all([refreshDistricts(), refreshPois(), refreshNpcs()]);
    }).then(function(){ renderSelection(); schedulePublishStatus(); }).catch(reportWriteError);
  }

  var btnPublishEl = document.getElementById('btnPublish'), pubLinkEl = document.getElementById('pubLink');
  var publishStatus = null, publishStatusTimer = null, publishing = false;
  function schedulePublishStatus(){
    if (PLAYER || !isLoggedIn()) return;
    clearTimeout(publishStatusTimer);
    publishStatusTimer = setTimeout(function(){
      Api.publishStatus().then(function(st){ publishStatus = st; renderPublishButton(); }).catch(function(){});
    }, 400);
  }
  function fmtWhen(ts){
    return new Date(ts).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  }
  function renderPublishButton(){
    if (!btnPublishEl) return;
    var st = publishStatus || {};
    var pending = st.lastPublishedAt ? st.pending : null;
    btnPublishEl.disabled = publishing;
    btnPublishEl.innerHTML = publishing ? 'Publicando&hellip;'
      : 'Publicar' + (pending ? ' <span class="pub-count">'+pending+'</span>' : (!st.lastPublishedAt ? ' <span class="pub-count new">1ª vez</span>' : ''));
    btnPublishEl.title = st.lastPublishedAt
      ? 'Última publicação: ' + fmtWhen(st.lastPublishedAt) + (pending ? ' · ' + pending + ' alteração(ões) ainda não publicada(s)' : ' · nada pendente')
      : 'O site dos jogadores ainda não foi publicado';
    if (pubLinkEl){
      if (st.lastUrl){ pubLinkEl.href = st.lastUrl; pubLinkEl.style.display = ''; }
      else pubLinkEl.style.display = 'none';
    }
  }
  function showLog(title, text){
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = '<div class="confirm-box wide"><p></p><pre class="log"></pre><div class="confirm-actions"><button type="button" id="logClose">Fechar</button></div></div>';
    overlay.querySelector('p').textContent = title;
    overlay.querySelector('pre').textContent = text || '';
    document.body.appendChild(overlay);
    requestAnimationFrame(function(){ overlay.classList.add('show'); });
    overlay.querySelector('#logClose').addEventListener('click', function(){
      overlay.classList.remove('show');
      setTimeout(function(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 180);
    });
  }
  if (btnPublishEl) btnPublishEl.addEventListener('click', function(){
    if (publishing) return;
    if (!isLoggedIn()){ openLoginModal(); return; }
    Api.publishStatus().then(function(st){
      publishStatus = st; renderPublishButton();
      var r = st.revealed || {};
      if (!st.tokenConfigured){
        return confirmDialog('Falta o VERCEL_TOKEN no arquivo .env, então dá pra gerar o site mas não enviar pra Vercel. Veja o README (seção "Publicar pros jogadores").', {okLabel:'Entendi', danger:false}).then(function(){ return false; });
      }
      return confirmDialog('Publicar pros jogadores? Vai pro ar: ' + r.districts + ' bairro(s), ' + r.pois + ' ponto(s) e ' + r.npcs +
        ' personagem(ns) revelados, com o nível da Máscara e as entradas públicas do diário. Notas privadas e itens ocultos não saem do seu computador.',
        {okLabel:'Publicar', danger:false});
    }).then(function(ok){
      if (!ok) return;
      publishing = true; renderPublishButton();
      var closeToast = toast('Publicando… pode levar até 1 minuto.', {duration:120000});
      return Api.publish().then(function(res){
        closeToast();
        if (res.deployed){
          toast('No ar' + (res.url ? ': ' + res.url : '!') + ' (' + res.counts.pois + ' pontos, ' + res.counts.districts + ' bairros, ' + res.counts.npcs + ' personagens)', {type:'ok', duration:9000});
        } else {
          toast(res.message || 'O site foi gerado, mas não foi enviado.', {type:'error', duration:9000});
          if (res.log) showLog(res.message || 'Detalhes do envio', res.log);
        }
      }, function(err){
        closeToast();
        reportWriteError(err);
      });
    }).catch(reportWriteError).then(function(){
      publishing = false;
      schedulePublishStatus();
      renderPublishButton();
    });
  });

  function escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s){ return escHtml(s).replace(/"/g,'&quot;'); }

  // ======================================================================
  // EDITOR DE MAPA — o mestre desenha bairros, ruas, áreas, pontes e textos,
  // e apaga o que quiser (o que ele desenhou ou o que veio da cidade base).
  // Tudo vai para o servidor na hora; "Desfazer" volta as últimas ações.
  // ======================================================================
  var EDIT = { tracos: [], removidos: new Set() };
  var tracoById = {};
  function carregarEditor(){
    var ed = (CITY && CITY.editor) || {};
    EDIT.tracos = (ed.tracos || []).slice();
    EDIT.removidos = new Set(ed.removidos || []);
    indexTracos();
  }
  function indexTracos(){ tracoById = {}; EDIT.tracos.forEach(function(t){ tracoById[t.id] = t; }); }

  /* ---------- geometria ---------- */
  function hashStr(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function chave(tipo, obj){ return tipo + ':' + hashStr(typeof obj === 'string' ? obj : JSON.stringify(obj)); }
  function vivo(k){ return !EDIT.removidos.has(k); }
  function subpaths(d){ return String(d || '').split(/(?=M )/).map(function(s){ return s.trim(); }).filter(Boolean); }
  function dParaPts(d){
    var out = [], m, re = /(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, s = subpaths(d)[0] || '';
    while ((m = re.exec(s))) out.push([+m[1], +m[2]]);
    if (out.length > 2 && out[0][0] === out[out.length-1][0] && out[0][1] === out[out.length-1][1]) out.pop();
    return out;
  }
  function ptsParaD(pts, fechar){
    if (!pts || !pts.length) return '';
    return 'M ' + pts.map(function(p){ return p[0] + ',' + p[1]; }).join(' L ') + (fechar ? ' Z' : '');
  }
  function centroide(pts){
    var a = 0, cx = 0, cy = 0;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++){
      var f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      a += f; cx += (pts[j][0] + pts[i][0]) * f; cy += (pts[j][1] + pts[i][1]) * f;
    }
    if (Math.abs(a) < 1e-6){
      var sx = 0, sy = 0; pts.forEach(function(p){ sx += p[0]; sy += p[1]; });
      return [sx / pts.length, sy / pts.length];
    }
    return [cx / (3 * a), cy / (3 * a)];
  }
  function dentro(p, poli){
    var x = p[0], y = p[1], ok = false;
    for (var i = 0, j = poli.length - 1; i < poli.length; j = i++){
      var xi = poli[i][0], yi = poli[i][1], xj = poli[j][0], yj = poli[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ok = !ok;
    }
    return ok;
  }
  var r1 = function(v){ return Math.round(v * 10) / 10; };
  function escalaTela(){ var r = svgContentRect(); return vb.w / r.width; } // unidades do mapa por pixel

  /* ---------- tipos de traço ---------- */
  var TIPOS = {
    linha: [['rua','Rua'],['avenida','Avenida'],['viela','Viela / caminho'],['trilho','Trilho de trem'],['muro','Muro'],['passarela','Passarela']],
    area:  [['quadra','Quadra (casario)'],['predio','Prédio'],['parque','Parque / mata'],['praca','Praça'],['agua','Água (rio, lago, canal)'],
            ['terreno','Terreno (aterra água)'],['areia','Areia / praia'],['baldio','Terreno baldio']],
    ponte: [['ponte','Ponte']],
    texto: [['rotulo','Texto']]
  };
  var NOME_TIPO = {}; Object.keys(TIPOS).forEach(function(f){ TIPOS[f].forEach(function(t){ NOME_TIPO[t[0]] = t[1]; }); });
  function familia(kind){
    for (var f in TIPOS) if (TIPOS[f].some(function(t){ return t[0] === kind; })) return f;
    return 'linha';
  }
  var AREA_CLS = { agua:'river', parque:'forest', terreno:'land', areia:'beach', praca:'square', quadra:'blk-2', predio:'footprint', baldio:'wasteland' };
  var LINHA_ESTILO = {
    avenida: { casing:8.4, core:4, cor:'#e0913f' },
    rua:     { casing:6.2, core:3.2, cor:'#bf8a56' },
    viela:   { casing:0, core:1.9, cor:'#8f7a60' }
  };

  /* ---------- desenhar os traços ---------- */
  var featL = document.getElementById('featuresLayer'), featTextL = document.getElementById('featTextLayer'),
      featHitL = document.getElementById('featHitLayer'), editL = document.getElementById('editLayer');
  function rotuloAoLongo(t, pts, g, cls){
    if (!t.name || pts.length < 2) return;
    var p = pts[0][0] <= pts[pts.length-1][0] ? pts : pts.slice().reverse(); // texto nunca de cabeça para baixo
    var id = 'fp-' + t.id;
    el('path', {id:id, d:ptsParaD(p, false), fill:'none', stroke:'none'}, g);
    var tx = el('text', {class:cls, dy:-6}, g);
    var tp = el('textPath', {href:'#' + id, startOffset:'50%', 'text-anchor':'middle'}, tx);
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + id);
    tp.textContent = t.name;
  }
  function renderFeatures(){
    [featL, featTextL, featHitL].forEach(function(L){ while (L.firstChild) L.removeChild(L.firstChild); });
    var ordem = { area:0, linha:1, ponte:2, texto:3 };
    var lista = EDIT.tracos.slice().sort(function(a, b){
      return (ordem[familia(a.kind)] - ordem[familia(b.kind)]) || ((a.ordem || 0) - (b.ordem || 0));
    });
    lista.forEach(function(t){
      var fam = familia(t.kind), pr = t.props || {}, larg = pr.largura || 1;
      var oculto = !PLAYER && t.revealed === false;
      var g = el('g', {class:'feat f-' + t.kind + (oculto ? ' f-oculto' : ''), 'data-traco':t.id}, fam === 'texto' ? featTextL : featL);
      var d = ptsParaD(t.pts, fam === 'area');
      if (fam === 'area'){
        el('path', {d:d, class:AREA_CLS[t.kind] || 'blk-2'}, g);
        if (t.kind === 'agua') el('path', {d:d, class:'river-edge'}, g);
        if (t.kind === 'areia') el('path', {d:d, class:'beach-edge'}, g);
        if (t.name){
          var c = centroide(t.pts);
          var lt = el('text', {x:c[0], y:c[1], class:'geo-label' + (t.kind === 'agua' ? '' : ' land-l'), 'font-size':13, 'text-anchor':'middle'}, featTextL);
          lt.textContent = t.name;
        }
      } else if (fam === 'linha'){
        var st = LINHA_ESTILO[t.kind];
        if (st){
          if (st.casing) el('path', {d:d, class:'road-casing', 'stroke-width':st.casing * larg}, g);
          el('path', {d:d, class:'road-core', stroke:st.cor, 'stroke-width':st.core * larg}, g);
          rotuloAoLongo(t, t.pts, g, 'street-label');
        } else if (t.kind === 'trilho'){
          el('path', {d:d, class:'rail', 'stroke-width':2.4 * larg}, g);
        } else if (t.kind === 'muro'){
          el('path', {d:d, fill:'none', stroke:'#5d554a', 'stroke-width':4.5 * larg, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, g);
          el('path', {d:d, class:'ring-wall'}, g);
        } else if (t.kind === 'passarela'){
          el('path', {d:d, class:'footbridge', fill:'none', 'stroke-width':2.6 * larg}, g);
        }
      } else if (fam === 'ponte'){
        el('path', {d:d, fill:'none', stroke:'#5c4630', 'stroke-width':15 * larg, 'stroke-linejoin':'round'}, g);
        el('path', {d:d, fill:'none', class:'f-ponte-core', 'stroke-width':10 * larg, 'stroke-linejoin':'round'}, g);
        rotuloAoLongo(t, t.pts, g, 'bridge-label');
      } else {
        var p0 = t.pts[0], tam = pr.tamanho || 14;
        var cls = { agua:'geo-label', terra:'geo-label land-l', menor:'minor-label', destaque:'f-destaque' }[pr.estilo || 'terra'];
        var tt = el('text', {x:p0[0], y:p0[1], class:cls, 'font-size':tam, 'text-anchor':'middle',
          transform:'rotate(' + (pr.rot || 0) + ' ' + p0[0] + ' ' + p0[1] + ')'}, g);
        tt.textContent = t.name;
      }
      if (PLAYER) return;
      /* alvo de clique (só em modo edição), acima dos bairros */
      if (fam === 'area') el('path', {d:d, class:'f-hit area', 'data-traco':t.id}, featHitL);
      else if (fam === 'texto'){
        var bb = g.getBBox();
        el('rect', {x:bb.x - 4, y:bb.y - 4, width:bb.width + 8, height:bb.height + 8, class:'f-hit area', 'data-traco':t.id,
          transform:'rotate(' + (pr.rot || 0) + ' ' + t.pts[0][0] + ' ' + t.pts[0][1] + ')'}, featHitL);
      }
      else el('path', {d:d, class:'f-hit linha', 'data-traco':t.id}, featHitL);
    });
    if (!PLAYER) renderEdit();
  }

  /* ---------- ferramentas ---------- */
  var tool = 'selecionar';
  var draw = null;   // { tool, pts, hover, alvo, pronto }
  var vert = null;   // { type:'traco'|'district', id, pts, fechado, sel, min }
  var umClique = null; // { tipo:'nome', id } — próxima clicada no mapa define algo
  var toolButtons = editToolbarEl ? editToolbarEl.querySelectorAll('[data-tool]') : [];
  var btnUndo = document.getElementById('btnUndo');
  var FERRAMENTA = {
    regiao:   { fechado:true,  min:3, nome:'bairro' },
    area:     { fechado:true,  min:3, nome:'área' },
    borracha: { fechado:true,  min:3, nome:'área a apagar' },
    linha:    { fechado:false, min:2, nome:'rua' },
    ponte:    { fechado:false, min:2, nome:'ponte' },
    texto:    { fechado:false, min:1, nome:'texto' }
  };
  function setTool(t, opts){
    opts = opts || {};
    if (!editMode) return;
    if (t !== 'ponto' && addArmed) setAddArmed(false);
    if (moveArmed) setMoveArmed(null);
    vert = null; umClique = null;
    tool = t;
    draw = FERRAMENTA[t] ? { tool:t, pts:[], hover:null, alvo:opts.alvo || null } : null;
    toolButtons.forEach(function(b){ b.classList.toggle('armed', b.getAttribute('data-tool') === t); });
    appEl.classList.toggle('tool-apagar', t === 'apagar');
    appEl.classList.toggle('tool-desenho', !!draw);
    mapSvgEl.classList.toggle('add-armed', !!draw || t === 'apagar');
    limparHoverApagar();
    renderEdit();
    if (draw) mostrarDicaDesenho();
    else if (t === 'apagar') mostrarDicaApagar();
    else if (!opts.manterPainel) renderSelection();
  }
  toolButtons.forEach(function(b){
    b.addEventListener('click', function(){ var t = b.getAttribute('data-tool'); setTool(tool === t && t !== 'selecionar' ? 'selecionar' : t); });
  });

  function mostrarDicaDesenho(){
    if (!draw) return;
    var f = FERRAMENTA[draw.tool], n = draw.pts.length;
    var redesenho = draw.alvo && draw.alvo.type === 'district' && districtById[draw.alvo.id];
    var titulo = redesenho ? 'Redesenhando o contorno de "' + escHtml(redesenho.name) + '"' : 'Desenhando ' + f.nome;
    var como = draw.tool === 'texto' ? 'Clique onde o texto deve ficar.'
      : 'Clique no mapa para marcar cada ponto' + (f.fechado ? '; clique no primeiro ponto para fechar.' : '.') +
        ' Duplo clique ou <b>Enter</b> conclui, <b>Backspace</b> tira o último ponto, <b>Esc</b> cancela. Dá para arrastar o mapa e dar zoom no meio do desenho.';
    detail.innerHTML = '<div class="empty ed-dica"><b>' + titulo + '</b><br><br>' + como +
      (draw.tool === 'texto' ? '' : '<div class="ed-cont">' + n + ' ponto' + (n === 1 ? '' : 's') + (n < f.min ? ' · mínimo ' + f.min : '') + '</div>') +
      '<div class="edit-actions">' +
      (draw.tool === 'texto' ? '' : '<button type="button" class="primary" id="edConcluir"' + (n < f.min ? ' disabled' : '') + '>Concluir</button>' +
        '<button type="button" class="ghost" id="edVoltaPonto"' + (n ? '' : ' disabled') + '>Tirar último ponto</button>') +
      '<button type="button" class="ghost" id="edCancelar">Cancelar</button></div></div>';
    var c = detail.querySelector('#edConcluir'); if (c) c.addEventListener('click', concluirDesenho);
    var v = detail.querySelector('#edVoltaPonto'); if (v) v.addEventListener('click', function(){ draw.pts.pop(); renderEdit(); mostrarDicaDesenho(); });
    detail.querySelector('#edCancelar').addEventListener('click', function(){ setTool('selecionar'); });
  }
  function mostrarDicaApagar(){
    detail.innerHTML = '<div class="empty ed-dica"><b>Apagar</b><br><br>Passe o mouse e clique em qualquer coisa do mapa: quadras, prédios, árvores, ruas, ' +
      'avenidas, pontes, nomes, ou o que você desenhou. Para tirar muita coisa de uma vez, use a <b>Borracha</b>. ' +
      'Bairros e pontos se apagam pelo painel de cada um. <b>Desfazer</b> (Ctrl+Z) traz de volta.' +
      '<div class="edit-actions"><button type="button" class="ghost" id="edSair">Voltar a selecionar</button></div></div>';
    detail.querySelector('#edSair').addEventListener('click', function(){ setTool('selecionar'); });
  }

  /* ---------- prévia do desenho, alças de vértice ---------- */
  var rafEdit = 0;
  function renderEditLogo(){ if (!rafEdit) rafEdit = requestAnimationFrame(function(){ rafEdit = 0; renderEdit(); }); }
  function aoMudarVB(){ if (editMode && (draw || vert)) renderEditLogo(); }
  function renderEdit(){
    if (!editL) return;
    while (editL.firstChild) editL.removeChild(editL.firstChild);
    if (!editMode) return;
    var s = escalaTela(), rPt = 4.5 * s, rH = 6.5 * s;
    var sel = state.selected;
    if (sel && sel.type === 'traco' && tracoById[sel.id] && !vert){
      var ts = tracoById[sel.id], fs = familia(ts.kind);
      el('path', {d:ptsParaD(ts.pts, fs === 'area'), class:'f-sel'}, editL);
      if (fs === 'texto') el('circle', {cx:ts.pts[0][0], cy:ts.pts[0][1], r:rH, class:'f-sel'}, editL);
    }
    if (draw){
      var f = FERRAMENTA[draw.tool], pts = draw.pts.slice();
      if (draw.hover && !draw.pronto) pts.push(draw.hover);
      if (pts.length > 1) el('path', {d:ptsParaD(pts, f.fechado && pts.length > 2), class:'ed-prev' + (draw.tool === 'borracha' ? ' borracha' : '') + (f.fechado ? ' fechado' : '')}, editL);
      draw.pts.forEach(function(p, i){
        el('circle', {cx:p[0], cy:p[1], r:(i === 0 && f.fechado && draw.pts.length >= 3) ? rH : rPt, class:'ed-pt' + (i === 0 ? ' primeiro' : '')}, editL);
      });
    }
    if (vert){
      el('path', {d:ptsParaD(vert.pts, vert.fechado), class:'ed-prev vert'}, editL);
      var n = vert.pts.length, lim = vert.fechado ? n : n - 1;
      for (var i = 0; i < lim; i++){
        var a = vert.pts[i], b = vert.pts[(i + 1) % n];
        var m = el('circle', {cx:(a[0] + b[0]) / 2, cy:(a[1] + b[1]) / 2, r:rPt * 0.9, class:'ed-mid', 'data-mid':i}, editL);
        m.addEventListener('pointerdown', inserirVertice);
      }
      vert.pts.forEach(function(p, i){
        var h = el('circle', {cx:p[0], cy:p[1], r:rH, class:'ed-h' + (vert.sel === i ? ' sel' : ''), 'data-v':i}, editL);
        h.addEventListener('pointerdown', iniciarArrasteVertice);
      });
    }
  }

  /* ---------- cliques no mapa ---------- */
  function pontoDoEvento(ev){ var p = svgPoint(ev); return { pt:[r1(p.x), r1(p.y)], s:p.scaleX }; }
  mapSvgEl.addEventListener('click', function(ev){
    if (!editMode || ev.defaultPrevented) return;
    /* editando pontos, ou com o formulário de um desenho aberto: o clique no mapa não seleciona nada */
    if (vert || (draw && draw.pronto)){ ev.stopPropagation(); ev.preventDefault(); return; }
    if (umClique){
      ev.stopPropagation(); ev.preventDefault();
      var u = umClique; umClique = null; mapSvgEl.classList.remove('add-armed');
      var q = pontoDoEvento(ev).pt;
      if (u.tipo === 'nome') moverNomeBairro(u.id, q);
      return;
    }
    if (tool === 'apagar'){
      ev.stopPropagation(); ev.preventDefault();
      var alvo = alvoApagar(ev.target);
      if (alvo) apagarAlvo(alvo);
      return;
    }
    if (!draw || draw.pronto) return;
    ev.stopPropagation(); ev.preventDefault();
    var e = pontoDoEvento(ev), pt = e.pt, f = FERRAMENTA[draw.tool];
    if (draw.tool === 'texto'){ draw.pts = [pt]; concluirDesenho(); return; }
    if (f.fechado && draw.pts.length >= 3){
      var p0 = draw.pts[0];
      if (Math.hypot(pt[0] - p0[0], pt[1] - p0[1]) / e.s < 11){ concluirDesenho(); return; }
    }
    var ult = draw.pts[draw.pts.length - 1];
    if (ult && Math.hypot(pt[0] - ult[0], pt[1] - ult[1]) / e.s < 4) return; // o segundo clique do duplo clique
    draw.pts.push(pt);
    renderEdit(); mostrarDicaDesenho();
  }, true);
  mapSvgEl.addEventListener('pointermove', function(ev){
    if (editMode && draw && !draw.pronto){ draw.hover = pontoDoEvento(ev).pt; renderEditLogo(); }
    if (editMode && tool === 'apagar') hoverApagar(ev);
  });
  mapSvgEl.addEventListener('pointerleave', function(){ if (draw){ draw.hover = null; renderEditLogo(); } limparHoverApagar(); });
  mapSvgEl.addEventListener('dblclick', function(ev){
    if (!editMode || !draw || draw.pronto) return;
    ev.preventDefault(); ev.stopPropagation();
    if (draw.pts.length >= FERRAMENTA[draw.tool].min) concluirDesenho();
  }, true);
  document.addEventListener('keydown', function(ev){
    if (!editMode) return;
    var a = document.activeElement, digitando = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    if (digitando) return;
    if (draw && !draw.pronto){
      if (ev.key === 'Enter'){ ev.preventDefault(); if (draw.pts.length >= FERRAMENTA[draw.tool].min) concluirDesenho(); return; }
      if (ev.key === 'Backspace'){ ev.preventDefault(); draw.pts.pop(); renderEdit(); mostrarDicaDesenho(); return; }
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'z' || ev.key === 'Z')){ ev.preventDefault(); draw.pts.pop(); renderEdit(); mostrarDicaDesenho(); return; }
    }
    if (ev.key === 'Escape'){
      if (draw || vert || tool !== 'selecionar' || umClique){ ev.preventDefault(); var eraVert = vert; setTool('selecionar', { manterPainel:!!eraVert }); if (eraVert) renderSelection(); }
      return;
    }
    if (vert && (ev.key === 'Delete' || ev.key === 'Backspace') && vert.sel != null){ ev.preventDefault(); apagarVertice(); return; }
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'z' || ev.key === 'Z')){ ev.preventDefault(); desfazer(); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var atalho = { v:'selecionar', b:'regiao', r:'linha', a:'area', o:'ponte', t:'texto', e:'apagar', l:'borracha' }[String(ev.key).toLowerCase()];
    if (atalho){ ev.preventDefault(); setTool(atalho); }
  });

  function concluirDesenho(){
    if (!draw) return;
    var f = FERRAMENTA[draw.tool], pts = [];
    draw.pts.forEach(function(p){ var u = pts[pts.length - 1]; if (!u || Math.hypot(p[0] - u[0], p[1] - u[1]) > 0.4) pts.push(p); });
    if (f.fechado && pts.length > 3){ var a = pts[0], z = pts[pts.length - 1]; if (Math.hypot(a[0] - z[0], a[1] - z[1]) < 0.4) pts.pop(); }
    if (pts.length < f.min){ toast('Faltam pontos: ' + f.nome + ' precisa de pelo menos ' + f.min + '.', {type:'error'}); return; }
    draw.pts = pts; draw.pronto = true; draw.hover = null;
    renderEdit();
    if (draw.tool === 'borracha') return apagarDentro(pts);
    if (draw.tool === 'regiao'){
      if (draw.alvo && draw.alvo.type === 'district') return salvarContorno(draw.alvo.id, pts);
      return abrirFormBairroNovo(pts);
    }
    abrirFormTraco(null, { kind:TIPOS[draw.tool][0][0], pts:pts, familia:draw.tool });
  }

  /* ---------- desfazer ---------- */
  var pilha = [];
  function empilhar(texto, fn){ pilha.push({ texto:texto, fn:fn }); if (pilha.length > 60) pilha.shift(); atualizarUndo(); }
  function atualizarUndo(){
    if (!btnUndo) return;
    btnUndo.disabled = !pilha.length;
    btnUndo.title = pilha.length ? 'Desfazer: ' + pilha[pilha.length - 1].texto + ' (Ctrl+Z)' : 'Nada para desfazer';
  }
  function desfazer(){
    var u = pilha.pop(); atualizarUndo();
    if (!u){ toast('Nada para desfazer.'); return; }
    Promise.resolve().then(u.fn).then(function(){ toast('Desfeito: ' + u.texto + '.', {type:'ok'}); }).catch(reportWriteError);
  }
  if (btnUndo) btnUndo.addEventListener('click', desfazer);
  atualizarUndo();

  /* ---------- traços: criar, editar, apagar ---------- */
  function guardarTraco(t){
    var i = EDIT.tracos.findIndex(function(x){ return x.id === t.id; });
    if (i >= 0) EDIT.tracos[i] = t; else EDIT.tracos.push(t);
    indexTracos(); renderFeatures();
  }
  function tirarTraco(id){ EDIT.tracos = EDIT.tracos.filter(function(x){ return x.id !== id; }); indexTracos(); renderFeatures(); }
  function dadosTraco(t){ return { id:t.id, kind:t.kind, name:t.name, pts:t.pts, props:t.props, revealed:t.revealed, ordem:t.ordem }; }
  function criarTraco(dados, texto){
    return Api.createTraco(dados).then(function(t){
      guardarTraco(t);
      empilhar(texto || ('criar ' + (NOME_TIPO[t.kind] || 'traço').toLowerCase()), function(){
        return Api.deleteTraco(t.id).then(function(){ tirarTraco(t.id); if (state.selected && state.selected.id === t.id){ state.selected = null; renderSelection(); } });
      });
      return t;
    });
  }
  function atualizarTraco(id, mud, texto){
    var antes = tracoById[id] && JSON.parse(JSON.stringify(tracoById[id]));
    return Api.updateTraco(id, mud).then(function(t){
      guardarTraco(t);
      if (antes) empilhar(texto || 'editar ' + (NOME_TIPO[t.kind] || 'traço').toLowerCase(), function(){
        return Api.updateTraco(id, dadosTraco(antes)).then(function(v){ guardarTraco(v); if (state.selected && state.selected.id === id) renderSelection(); });
      });
      return t;
    });
  }
  function apagarTraco(id){
    var antes = tracoById[id];
    return Api.deleteTraco(id).then(function(){
      tirarTraco(id);
      if (antes) empilhar('apagar ' + (NOME_TIPO[antes.kind] || 'traço').toLowerCase() + (antes.name ? ' "' + antes.name + '"' : ''), function(){
        return Api.createTraco(dadosTraco(antes)).then(guardarTraco);
      });
    });
  }

  function abrirFormTraco(t, novo){
    var ehNovo = !t;
    var kind = ehNovo ? novo.kind : t.kind, fam = ehNovo ? novo.familia : familia(t.kind);
    var pr = (t && t.props) || {}, nome = (t && t.name) || '';
    var revelado = t ? t.revealed !== false : true;
    var opcoes = TIPOS[fam].map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === kind ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    var ehTexto = fam === 'texto', temLargura = fam === 'linha' || fam === 'ponte';
    detail.innerHTML =
      '<div class="edit-form">' +
      '<p class="edit-hint">' + (ehNovo ? 'Novo traço no mapa. ' : '') + (ehTexto ? 'Um nome escrito no mapa (rio, morro, lugar).' :
        fam === 'area' ? 'Área desenhada: água cobre o que estiver embaixo; terreno aterra água.' : 'Linha desenhada no mapa; o nome aparece ao longo dela.') + '</p>' +
      (TIPOS[fam].length > 1 ? '<div><label>Tipo</label><select id="tfKind">' + opcoes + '</select></div>' : '') +
      '<div><label>' + (ehTexto ? 'Texto' : 'Nome (opcional)') + '</label><input type="text" id="tfName" maxlength="200" value="' + escAttr(nome) + '"' +
        (ehTexto ? ' placeholder="Ex.: Morro do Enforcado"' : ' placeholder="Ex.: Rua das Lanternas"') + '></div>' +
      (temLargura ? '<div><label>Largura <span id="tfLargV">' + (pr.largura || 1).toFixed(1) + '×</span></label><input type="range" id="tfLarg" min="0.4" max="3" step="0.1" value="' + (pr.largura || 1) + '"></div>' : '') +
      (ehTexto ? '<div class="ef-row"><div><label>Tamanho</label><input type="number" id="tfTam" min="6" max="80" value="' + (pr.tamanho || 14) + '"></div>' +
        '<div><label>Inclinação (°)</label><input type="number" id="tfRot" min="-180" max="180" value="' + (pr.rot || 0) + '"></div></div>' +
        '<div><label>Estilo</label><select id="tfEstilo">' + [['terra','Terra (itálico, ocre)'],['agua','Água (itálico, azul)'],['menor','Pequeno (cinza)'],['destaque','Destaque (branco)']].map(function(o){
          return '<option value="' + o[0] + '"' + ((pr.estilo || 'terra') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' : '') +
      '<label class="check"><input type="checkbox" id="tfRevealed"' + (revelado ? ' checked' : '') + '> Os jogadores veem (desmarque para só você ver)</label>' +
      '<div class="edit-actions"><button type="button" class="primary" id="tfSave">' + (ehNovo ? 'Criar' : 'Salvar') + '</button>' +
      (ehNovo ? '' : '<button type="button" class="ghost" id="tfVert">' + (ehTexto ? 'Mover' : 'Editar pontos') + '</button><button type="button" class="ghost danger-txt" id="tfDel">Apagar</button>') +
      '<button type="button" class="ghost" id="tfCancel">' + (ehNovo ? 'Descartar' : 'Fechar') + '</button></div></div>';
    var lg = detail.querySelector('#tfLarg');
    if (lg) lg.addEventListener('input', function(){ detail.querySelector('#tfLargV').textContent = Number(lg.value).toFixed(1) + '×'; });
    var nm = detail.querySelector('#tfName'); if (nm && ehNovo) setTimeout(function(){ try{ nm.focus(); }catch(e){} }, 30);
    function coletar(){
      var k = detail.querySelector('#tfKind') ? detail.querySelector('#tfKind').value : kind;
      var props = {};
      if (lg) props.largura = Number(lg.value);
      if (ehTexto){ props.tamanho = Number(detail.querySelector('#tfTam').value) || 14; props.rot = Number(detail.querySelector('#tfRot').value) || 0; props.estilo = detail.querySelector('#tfEstilo').value; }
      return { kind:k, name:nm.value.trim(), props:props, revealed:detail.querySelector('#tfRevealed').checked };
    }
    detail.querySelector('#tfSave').addEventListener('click', function(){
      var c = coletar();
      if (ehTexto && !c.name){ toast('Escreva o texto.', {type:'error'}); nm.focus(); return; }
      var btn = this; btn.disabled = true;
      var p = ehNovo ? criarTraco(Object.assign(c, { pts:novo.pts })) : atualizarTraco(t.id, c);
      p.then(function(x){
        toast(ehNovo ? (NOME_TIPO[x.kind] || 'Traço') + ' criado.' : 'Salvo.', {type:'ok'});
        draw = null; tool = 'selecionar'; setTool('selecionar', { manterPainel:true });
        state.selected = { type:'traco', id:x.id }; renderSelection();
      }).catch(function(e){ btn.disabled = false; reportWriteError(e); });
    });
    detail.querySelector('#tfCancel').addEventListener('click', function(){
      if (ehNovo){ draw = null; setTool('selecionar'); } else { state.selected = null; renderSelection(); }
    });
    if (!ehNovo){
      detail.querySelector('#tfVert').addEventListener('click', function(){ editarVertices('traco', t.id); });
      detail.querySelector('#tfDel').addEventListener('click', function(){
        apagarTraco(t.id).then(function(){ toast('Apagado. Ctrl+Z desfaz.', {type:'ok'}); state.selected = null; renderSelection(); }).catch(reportWriteError);
      });
    }
  }

  /* ---------- editar pontos (vértices) de um traço ou de um bairro ---------- */
  function editarVertices(type, id){
    var pts, fechado, min;
    if (type === 'traco'){
      var t = tracoById[id]; if (!t) return;
      var f = familia(t.kind);
      pts = t.pts.map(function(p){ return p.slice(); }); fechado = f === 'area'; min = f === 'area' ? 3 : f === 'texto' ? 1 : 2;
    } else {
      var d = districtById[id]; if (!d) return;
      pts = (d.geom && d.geom.length >= 3) ? d.geom.map(function(p){ return p.slice(); }) : dParaPts(d.d);
      fechado = true; min = 3;
    }
    setTool('selecionar', { manterPainel:true });
    vert = { type:type, id:id, pts:pts, fechado:fechado, sel:null, min:min };
    mostrarPainelVertices();
    renderEdit();
  }
  function mostrarPainelVertices(){
    if (!vert) return;
    var nome = vert.type === 'traco' ? (tracoById[vert.id] && (tracoById[vert.id].name || NOME_TIPO[tracoById[vert.id].kind])) : (districtById[vert.id] && districtById[vert.id].name);
    detail.innerHTML = '<div class="empty ed-dica"><b>Editando os pontos de "' + escHtml(nome || '') + '"</b><br><br>' +
      'Arraste os pontos brancos para mover. Clique num ponto dourado do meio para criar um ponto novo ali. ' +
      'Para tirar um ponto, clique nele e use <b>Apagar ponto</b> (ou Delete). Cada mudança já fica salva.' +
      '<div class="ed-cont">' + vert.pts.length + ' pontos</div>' +
      '<div class="edit-actions"><button type="button" class="ghost" id="vtDel"' + (vert.sel == null || vert.pts.length <= vert.min ? ' disabled' : '') + '>Apagar ponto</button>' +
      '<button type="button" class="primary" id="vtFim">Concluir</button></div></div>';
    detail.querySelector('#vtDel').addEventListener('click', apagarVertice);
    detail.querySelector('#vtFim').addEventListener('click', function(){
      var v = vert; vert = null; renderEdit();
      state.selected = { type:v.type === 'traco' ? 'traco' : 'district', id:v.id }; renderSelection();
    });
  }
  function salvarVertices(texto){
    var v = vert; if (!v) return Promise.resolve();
    var pts = v.pts.map(function(p){ return [r1(p[0]), r1(p[1])]; });
    if (v.type === 'traco') return atualizarTraco(v.id, { pts:pts }, texto || 'mover pontos').catch(reportWriteError);
    return salvarContorno(v.id, pts, true);
  }
  var arrasteV = null;
  function iniciarArrasteVertice(ev){
    if (ev.button != null && ev.button !== 0) return;
    ev.stopPropagation(); ev.preventDefault();
    var i = Number(ev.currentTarget.getAttribute('data-v'));
    vert.sel = i;
    arrasteV = { i:i, x0:ev.clientX, y0:ev.clientY, p0:vert.pts[i].slice(), moveu:false, id:ev.pointerId };
    mostrarPainelVertices(); renderEdit();
  }
  document.addEventListener('pointermove', function(ev){
    if (!arrasteV || !vert) return;
    var dx = ev.clientX - arrasteV.x0, dy = ev.clientY - arrasteV.y0;
    if (!arrasteV.moveu && Math.abs(dx) + Math.abs(dy) < 3) return;
    arrasteV.moveu = true;
    var s = escalaTela();
    vert.pts[arrasteV.i] = [arrasteV.p0[0] + dx * s, arrasteV.p0[1] + dy * s];
    renderEditLogo();
  });
  document.addEventListener('pointerup', function(){
    if (!arrasteV) return;
    var a = arrasteV; arrasteV = null;
    if (a.moveu){ suppressClick = true; setTimeout(function(){ suppressClick = false; }, 60); salvarVertices('mover ponto'); }
  });
  function inserirVertice(ev){
    ev.stopPropagation(); ev.preventDefault();
    var i = Number(ev.currentTarget.getAttribute('data-mid')), n = vert.pts.length;
    var a = vert.pts[i], b = vert.pts[(i + 1) % n];
    vert.pts.splice(i + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    vert.sel = i + 1;
    arrasteV = { i:i + 1, x0:ev.clientX, y0:ev.clientY, p0:vert.pts[i + 1].slice(), moveu:false };
    mostrarPainelVertices(); renderEdit();
    salvarVertices('criar ponto');
  }
  function apagarVertice(){
    if (!vert || vert.sel == null || vert.pts.length <= vert.min) return;
    vert.pts.splice(vert.sel, 1); vert.sel = null;
    mostrarPainelVertices(); renderEdit();
    salvarVertices('apagar ponto');
  }

  /* ---------- bairros: desenhar, redesenhar, mover o nome, apagar ---------- */
  function abrirFormBairroNovo(pts){
    var c = centroide(pts);
    detail.innerHTML =
      '<div class="edit-form">' +
      '<p class="edit-hint">Bairro novo. Ele começa oculto dos jogadores; revele quando quiser.</p>' +
      '<div><label>Nome</label><input type="text" id="nbName" maxlength="200" placeholder="Ex.: Vila dos Curtumes"></div>' +
      '<div><label>Subtítulo</label><input type="text" id="nbSub" placeholder="Ex.: Looierij · 1890"></div>' +
      '<div><label>Facção que controla</label><select id="nbFaction">' + optionsHtml(FACTION_OPTS, 'neutral') + '</select></div>' +
      '<div><label>Descrição</label><textarea id="nbBlurb"></textarea></div>' +
      '<label class="check"><input type="checkbox" id="nbRevealed"> Revelado aos jogadores</label>' +
      '<div><label>Notas privadas</label><textarea id="nbPrivate"></textarea></div>' +
      '<div class="edit-actions"><button type="button" class="primary" id="nbSave">Criar bairro</button>' +
      '<button type="button" class="ghost" id="nbCancel">Descartar</button></div></div>';
    var nm = detail.querySelector('#nbName'); setTimeout(function(){ try{ nm.focus(); }catch(e){} }, 30);
    detail.querySelector('#nbCancel').addEventListener('click', function(){ draw = null; setTool('selecionar'); });
    detail.querySelector('#nbSave').addEventListener('click', function(){
      var nome = nm.value.trim();
      if (!nome){ toast('Dê um nome ao bairro.', {type:'error'}); nm.focus(); return; }
      var btn = this; btn.disabled = true;
      var dados = { name:nome, sub:detail.querySelector('#nbSub').value.trim(), faction:detail.querySelector('#nbFaction').value,
        blurb:detail.querySelector('#nbBlurb').value, privateNote:detail.querySelector('#nbPrivate').value,
        revealed:detail.querySelector('#nbRevealed').checked, geom:pts, labelX:r1(c[0]), labelY:r1(c[1]) };
      Api.createDistrict(dados).then(function(d){
        empilhar('criar o bairro "' + d.name + '"', function(){ return Api.deleteDistrict(d.id).then(function(){ return refreshDistricts(); }); });
        draw = null; setTool('selecionar', { manterPainel:true });
        toast('Bairro criado.', {type:'ok'});
        return refreshDistricts().then(function(){ state.selected = { type:'district', id:d.id }; renderSelection(); });
      }).catch(function(e){ btn.disabled = false; reportWriteError(e); });
    });
  }
  function salvarContorno(id, pts, manterVert){
    var d = districtById[id]; if (!d) return Promise.resolve();
    var antes = d.geom ? d.geom.map(function(p){ return p.slice(); }) : null;
    return Api.updateDistrict(id, { geom:pts }).then(function(){
      empilhar('mudar o contorno de "' + d.name + '"', function(){
        return Api.updateDistrict(id, { geom:antes }).then(function(){ return refreshDistricts(); }).then(function(){ if (vert && vert.id === id) editarVertices('district', id); });
      });
      return refreshDistricts();
    }).then(function(){
      if (manterVert){ if (vert){ mostrarPainelVertices(); renderEdit(); } return; }
      draw = null; setTool('selecionar', { manterPainel:true });
      toast('Contorno salvo.', {type:'ok'});
      state.selected = { type:'district', id:id }; renderSelection();
    }).catch(reportWriteError);
  }
  function moverNomeBairro(id, pt){
    var d = districtById[id]; if (!d) return;
    var antes = { labelX:d.labelX != null ? d.labelX : null, labelY:d.labelY != null ? d.labelY : null };
    Api.updateDistrict(id, { labelX:pt[0], labelY:pt[1] }).then(function(){
      empilhar('mover o nome de "' + d.name + '"', function(){ return Api.updateDistrict(id, antes).then(function(){ return refreshDistricts(); }); });
      toast('Nome do bairro movido.', {type:'ok'});
      return refreshDistricts();
    }).then(function(){ state.selected = { type:'district', id:id }; renderSelection(); }).catch(reportWriteError);
  }
  function apagarBairro(d){
    var temOriginal = !!(CITY.districts && CITY.districts[d.id]);
    confirmDialog('Apagar o bairro "' + d.name + '" do mapa? Os pontos dele continuam no mapa, sem bairro. O diário do bairro é apagado junto' +
      ' (o "Desfazer" traz o bairro de volta, mas não o diário).', { okLabel:'Apagar bairro' }).then(function(ok){
      if (!ok) return;
      var copia = JSON.parse(JSON.stringify(d));
      Api.deleteDistrict(d.id).then(function(){
        empilhar('apagar o bairro "' + copia.name + '"', function(){
          var geom = (copia.geom && copia.geom.length >= 3) ? copia.geom : dParaPts(copia.d);
          var volta = { id:/^bairro-/.test(copia.id) ? copia.id : undefined, name:copia.name, sub:copia.sub, faction:copia.faction,
            blurb:copia.blurb, domain:copia.domain, privateNote:copia.privateNote, revealed:copia.revealed, masquerade:copia.masquerade,
            geom:geom, labelX:copia.cx, labelY:copia.cy };
          return Api.createDistrict(volta).then(function(){ return refreshDistricts(); });
        });
        toast('Bairro apagado.' + (temOriginal ? '' : '') + ' Ctrl+Z desfaz.', {type:'ok'});
        state.selected = null;
        return Promise.all([refreshDistricts(), refreshPois()]);
      }).catch(reportWriteError);
    });
  }
  /* botões do contorno no painel do bairro (só em modo edição) */
  function blocoContorno(d){
    if (!editMode || !isLoggedIn()) return '';
    var temOriginal = !!(CITY.districts && CITY.districts[d.id]);
    return '<div class="ed-contorno"><span class="lbl-mini">Contorno no mapa</span><div class="ed-contorno-b">' +
      '<button type="button" class="act-btn" id="dcRedesenhar">Redesenhar</button>' +
      '<button type="button" class="act-btn" id="dcPontos">Editar pontos</button>' +
      '<button type="button" class="act-btn" id="dcNome">Mover o nome</button>' +
      (d.geom && temOriginal ? '<button type="button" class="act-btn" id="dcOriginal">Contorno original</button>' : '') +
      '<button type="button" class="act-btn danger-txt" id="dcApagar">Apagar bairro</button></div></div>';
  }
  function ligarContorno(d){
    var q = function(s){ return detail.querySelector(s); };
    if (q('#dcRedesenhar')) q('#dcRedesenhar').addEventListener('click', function(){ setTool('regiao', { alvo:{ type:'district', id:d.id } }); });
    if (q('#dcPontos')) q('#dcPontos').addEventListener('click', function(){ editarVertices('district', d.id); });
    if (q('#dcNome')) q('#dcNome').addEventListener('click', function(){
      setTool('selecionar', { manterPainel:true }); umClique = { tipo:'nome', id:d.id }; mapSvgEl.classList.add('add-armed');
      toast('Clique no mapa onde o nome de "' + d.name + '" deve ficar.');
    });
    if (q('#dcOriginal')) q('#dcOriginal').addEventListener('click', function(){
      var antes = d.geom;
      Api.updateDistrict(d.id, { geom:null }).then(function(){
        empilhar('voltar ao contorno original de "' + d.name + '"', function(){ return Api.updateDistrict(d.id, { geom:antes }).then(function(){ return refreshDistricts(); }); });
        toast('Contorno original de volta.', {type:'ok'});
        return refreshDistricts();
      }).catch(reportWriteError);
    });
    if (q('#dcApagar')) q('#dcApagar').addEventListener('click', function(){ apagarBairro(d); });
  }

  /* ---------- apagar (clique) e borracha (área) ---------- */
  var hoverEl = null;
  function alvoApagar(node){
    if (!node || !node.closest) return null;
    var f = node.closest('[data-traco]');
    if (f) return { tipo:'traco', id:f.getAttribute('data-traco') };
    var b = node.closest('[data-k]');
    if (b) return { tipo:'base', k:b.getAttribute('data-k'), rot:b.getAttribute('data-rot') || 'elemento' };
    return null;
  }
  function limparHoverApagar(){
    if (hoverEl){ document.querySelectorAll('.del-hover').forEach(function(n){ n.classList.remove('del-hover'); }); hoverEl = null; }
    if (tool === 'apagar') hideTip();
  }
  function hoverApagar(ev){
    var a = alvoApagar(ev.target);
    var chaveHover = a ? (a.tipo === 'traco' ? 't:' + a.id : a.k) : null;
    if (chaveHover === hoverEl){ if (a) showTip(ev, 'Apagar ' + rotuloAlvo(a), 'neutral'); return; }
    document.querySelectorAll('.del-hover').forEach(function(n){ n.classList.remove('del-hover'); });
    hoverEl = chaveHover;
    if (!a){ hideTip(); return; }
    var sel = a.tipo === 'traco' ? '#featuresLayer [data-traco="' + a.id + '"], #featTextLayer [data-traco="' + a.id + '"]' : '[data-k="' + a.k + '"]';
    document.querySelectorAll(sel).forEach(function(n){ n.classList.add('del-hover'); });
    showTip(ev, 'Apagar ' + rotuloAlvo(a), 'neutral');
  }
  function rotuloAlvo(a){
    if (a.tipo === 'traco'){ var t = tracoById[a.id]; return t ? (NOME_TIPO[t.kind] || 'traço').toLowerCase() + (t.name ? ' "' + t.name + '"' : '') : 'traço'; }
    return a.rot;
  }
  function esconderBase(chaves){ chaves.forEach(function(k){ document.querySelectorAll('[data-k="' + k + '"]').forEach(function(n){ n.parentNode.removeChild(n); }); }); }
  function removerBase(chaves, texto){
    return Api.setRemovidos({ adicionar:chaves }).then(function(r){
      EDIT.removidos = new Set(r.removidos);
      esconderBase(chaves);
      if (texto) empilhar(texto, function(){
        return Api.setRemovidos({ tirar:chaves }).then(function(r2){ EDIT.removidos = new Set(r2.removidos); renderStaticGeo(); });
      });
    });
  }
  function apagarAlvo(a){
    limparHoverApagar();
    if (a.tipo === 'traco') return apagarTraco(a.id).then(function(){ toast('Apagado. Ctrl+Z desfaz.', {type:'ok'}); }).catch(reportWriteError);
    removerBase([a.k], 'apagar ' + a.rot).then(function(){ toast('Apagado: ' + a.rot + '. Ctrl+Z desfaz.', {type:'ok'}); }).catch(reportWriteError);
  }
  function apagarDentro(poli){
    var todos = function(pts){ return pts.length && pts.every(function(p){ return dentro(p, poli); }); };
    var visto = {}, chaves = [], tipos = {};
    BASE_ITENS.forEach(function(it){
      if (visto[it.k] || !vivo(it.k) || !todos(it.pts)) return;
      visto[it.k] = 1; chaves.push(it.k);
      var r = it.rot.split(' ')[0]; tipos[r] = (tipos[r] || 0) + 1;
    });
    var tracos = EDIT.tracos.filter(function(t){ return todos(t.pts); });
    if (tracos.length) tipos['desenhado(s)'] = tracos.length;
    var total = chaves.length + tracos.length;
    var fim = function(){ draw = null; setTool('borracha'); };
    if (!total){ toast('Nada inteiro dentro da área. A borracha só leva o que cabe por completo nela.'); return fim(); }
    var resumo = Object.keys(tipos).map(function(k){ return tipos[k] + ' ' + k; }).join(', ');
    confirmDialog('Apagar ' + total + ' ite' + (total === 1 ? 'm' : 'ns') + ' dentro da área? (' + resumo + ')', { okLabel:'Apagar' }).then(function(ok){
      if (!ok) return fim();
      var copias = tracos.map(function(t){ return JSON.parse(JSON.stringify(t)); });
      var p = chaves.length ? removerBase(chaves) : Promise.resolve();
      p.then(function(){
        return copias.reduce(function(acc, t){ return acc.then(function(){ return Api.deleteTraco(t.id).then(function(){ tirarTraco(t.id); }); }); }, Promise.resolve());
      }).then(function(){
        empilhar('apagar ' + total + ' itens com a borracha', function(){
          var q = chaves.length ? Api.setRemovidos({ tirar:chaves }).then(function(r){ EDIT.removidos = new Set(r.removidos); }) : Promise.resolve();
          return q.then(function(){
            return copias.reduce(function(acc, t){ return acc.then(function(){ return Api.createTraco(dadosTraco(t)).then(function(n){ EDIT.tracos.push(n); }); }); }, Promise.resolve());
          }).then(function(){ indexTracos(); renderStaticGeo(); });
        });
        toast(total + ' ite' + (total === 1 ? 'm apagado' : 'ns apagados') + '. Ctrl+Z desfaz.', {type:'ok'});
        fim();
      }).catch(function(e){ reportWriteError(e); fim(); });
    });
  }

  /* ---------- jogadores e outras abas recebem a cidade nova ---------- */
  function refreshCidade(){
    return fetch(M.base + '/cidade', { headers:{ Authorization: 'Bearer ' + M.token } }).then(function(r){
      if (!r.ok) throw new Error('mapa indisponível');
      return r.json();
    }).then(function(c){
      CITY = c; carregarEditor(); mergeDistrictGeometry(); renderStaticGeo();
    });
  }

  // ======================================================================
  // Boot: carrega a geometria estática (city.json/districts.json) e os
  // dados vivos (pois/scenes/auth via API) e então desenha o mapa inteiro.
  // Depois disso, um polling simples a cada 20s mantém abas abertas em
  // sincronia (sem exigir websockets — ver README).
  // ======================================================================
  function boot(){
    syncStatusText.textContent = 'carregando…';
    return Promise.all([
      fetch(M.base + '/cidade', { headers:{ Authorization: 'Bearer ' + M.token } }).then(function(r){
        if (r.status === 401) M.sessaoExpirada();
        if (!r.ok) throw new Error('mapa indisponível');
        return r.json();
      }),
      Api.getDistricts(),
      Api.getPois(),
      Api.getScenes(),
      Api.me(),
      Api.getNpcs()
    ]).then(function(results){
      CITY = results[0];
      carregarEditor();
      DISTRICTS = results[1];
      POIS = results[2];
      var scenesList = results[3];
      var me = results[4];
      NPCS = results[5] || [];
      npcById = {}; NPCS.forEach(function(n){ npcById[n.id] = n; });

      mergeDistrictGeometry();
      prevMq = {}; DISTRICTS.forEach(function(d){ prevMq[d.id] = d.masquerade || 0; });
      indexPois();
      rebuildScenes(scenesList);
      authProfile = (me && me.username) ? { username: me.username, displayName: me.displayName } : null;

      renderStaticGeo();
      renderPOIMarkers();
      renderAuthBox();
      renderScenesList();
      updateTally();
      buildLegend();
      buildTypeFilter();
      applyFilters();
      renderMqPanel();
      renderSelection();

      syncStatusEl.classList.remove('error');
      syncStatusText.textContent = 'sincronizado';

      if (PLAYER){
        var lastPub = snapshotMeta.publishedAt;
        updateTally();
        setInterval(function(){
          loadSnapshot(true).then(function(snap){
            if (snap.publishedAt === lastPub) return;
            lastPub = snap.publishedAt;
            refreshCidade().then(function(){ return refreshDistricts(false); }).catch(function(){});
            refreshPois(false).catch(function(){});
            refreshNpcs(false).catch(function(){});
          }).catch(function(){});
        }, 8000);
      } else {
        setInterval(function(){
          refreshPois(false).catch(function(){});
          refreshScenes().catch(function(){});
          refreshDistricts(false).catch(function(){});
          refreshNpcs(false).catch(function(){});
          schedulePublishStatus();
        }, 20000);
      }
    }).catch(function(err){
      console.error('Falha ao carregar o mapa:', err);
      syncStatusEl.classList.add('error');
      syncStatusText.textContent = 'erro ao carregar';
      toast('Não foi possível carregar o mapa. Recarregue a página.', {type:'error'});
    });
  }
  boot();
})();
