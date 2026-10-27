/* Gera as fichas de teste da importação (node testes-e2e/fixtures/gerar.js).
   en-nomes.pdf      ficha em inglês com campos de nome legível (Strength1, Discipline1Dot2…)
   en-genericos.pdf  a mesma ficha com todos os campos genéricos (Text12, Check Box37):
                     só dá para ler pela posição dos rótulos impressos
   achatado.pdf      ficha sem campos, só texto (lida como texto)
   foundry.json e texto-es.txt são escritos à mão. */
const { PDFDocument, StandardFonts } = require('../../src/pdf-lib.min.js');
const fs = require('fs');
async function achatado() { const d=await PDFDocument.create(); const p=d.addPage([612,792]); const f=await d.embedFont(StandardFonts.Helvetica);
const L=(s,x,y)=>p.drawText(s,{x,y,size:10,font:f});
L('Name: Victor Hale',40,750); L('Clan: Gangrel',250,750); L('Generation: 12',420,750);
L('Strength',40,700); L('3',140,700); L('Charisma',220,700); L('1',320,700); L('Intelligence',400,700); L('2',500,700);
L('Dexterity',40,685); L('3',140,685); L('Manipulation',220,685); L('2',320,685); L('Wits',400,685); L('3',500,685);
L('Stamina',40,670); L('4',140,670); L('Composure',220,670); L('2',320,670); L('Resolve',400,670); L('2',500,670);
L('Survival 3   Brawl 3   Animal Ken 2   Athletics 2   Awareness 2',40,640);
L('Disciplines',40,610); L('Protean 2',40,595); L('Animalism 1',40,580);
L('Humanity 7    Hunger 1',40,550);
fs.writeFileSync(__dirname + '/achatado.pdf', await d.save()); }
async function gerar(generico, arquivo) {
  const doc = await PDFDocument.create();
  const pg = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  let nT = 0, nC = 0;
  const T = (nome, x, y, w, v, h = 14) => { const f = form.createTextField(generico ? 'Text' + (++nT) : nome); f.addToPage(pg, { x, y, width: w, height: h, font }); if (h > 20) f.enableMultiline(); if (v) f.setText(v); return f; };
  const C = (nome, x, y, on) => { const c = form.createCheckBox(generico ? 'Check Box' + (++nC) : nome); c.addToPage(pg, { x, y, width: 8, height: 8 }); if (on) c.check(); };
  const L = (s, x, y, sz = 9) => pg.drawText(s, { x, y, size: sz, font });
  const dots = (base, x, y, n, max = 5) => { for (let i = 1; i <= max; i++) C(base + i, x + (i - 1) * 11, y, i <= n); };
  // identidade
  const ids = [['Name', 'Marcus Vale'], ['Player', 'Bruno'], ['Chronicle', 'Nights of Lisbon'], ['Concept', 'Disgraced banker'], ['Ambition', 'Own the city council'], ['Desire', 'Humiliate his rival'], ['Clan', 'Ventrue'], ['Generation', '11th'], ['Sire', 'Lady Ashworth'], ['Predator', 'Consensualist']];
  ids.forEach(([l, v], i) => { const x = 40 + (i % 3) * 190, y = 750 - Math.floor(i / 3) * 22; L(l, x, y + 3); T(l, x + 52, y, 120, v); });
  L('ATTRIBUTES', 260, 650, 11);
  const atr = [['Strength', 2], ['Dexterity', 2], ['Stamina', 3], ['Charisma', 3], ['Manipulation', 2], ['Composure', 4], ['Intelligence', 3], ['Wits', 2], ['Resolve', 1]];
  atr.forEach(([l, v], i) => { const col = Math.floor(i / 3), row = i % 3; const x = 40 + col * 190, y = 630 - row * 14; L(l, x, y); dots(l, x + 90, y, v); });
  L('SKILLS', 270, 580, 11);
  const sk = [['Athletics', 1], ['Brawl', 0], ['Craft', 0], ['Drive', 1], ['Firearms', 2], ['Larceny', 0], ['Melee', 0], ['Stealth', 1], ['Survival', 0],
              ['Animal Ken', 0], ['Etiquette', 3], ['Insight', 2], ['Intimidation', 1], ['Leadership', 2], ['Performance', 0], ['Persuasion', 3], ['Streetwise', 0], ['Subterfuge', 2],
              ['Academics', 1], ['Awareness', 1], ['Finance', 3], ['Investigation', 1], ['Medicine', 0], ['Occult', 0], ['Politics', 2], ['Science', 0], ['Technology', 1]];
  sk.forEach(([l, v], i) => { const col = Math.floor(i / 9), row = i % 9; const x = 40 + col * 190, y = 560 - row * 14; L(l, x, y); dots(l.replace(' ', ''), x + 90, y, v); });
  L('Specialties', 40, 420); T('Specialties', 100, 416, 450, 'Etiquette (Elysium), Finance (Banking)');
  L('DISCIPLINES', 260, 395, 11);
  const disc = [['Dominate', 2, ['Compel', 'Mesmerize']], ['Presence', 1, ['Awe']], ['Fortitude', 1, ['Resilience']]];
  disc.forEach(([n, v, pw], i) => { const x = 40 + i * 190, y = 375; T('Discipline' + (i + 1), x, y - 3, 90, n); dots('Discipline' + (i + 1) + 'Dot', x + 95, y, v);
    pw.forEach((p, j) => T('Discipline' + (i + 1) + 'Power' + (j + 1), x, y - 22 - j * 18, 150, p)); });
  L('ADVANTAGES', 40, 290, 11); L('FLAWS', 330, 290, 11);
  [['Resources', 3], ['Retainers', 2], ['Influence (Banks)', 2]].forEach(([n, v], i) => { const y = 270 - i * 18; T('Merit' + (i + 1), 40, y - 3, 150, n); dots('Merit' + (i + 1) + 'Dot', 200, y, v); });
  [['Prey Exclusion (the poor)', 1], ['Dark Secret', 1]].forEach(([n, v], i) => { const y = 270 - i * 18; T('Flaw' + (i + 1), 330, y - 3, 150, n); dots('Flaw' + (i + 1) + 'Dot', 490, y, v); });
  L('Humanity', 40, 200); dots('Humanity', 40, 186, 6, 10);
  L('Hunger', 200, 190); dots('Hunger', 245, 190, 2);
  L('Health', 330, 200); dots('Health', 330, 186, 0, 10);
  L('Blood Potency', 40, 165); dots('BloodPotency', 120, 165, 2, 10);
  L('Touchstones & Convictions', 40, 140); T('Touchstones', 40, 95, 520, 'Never betray a debt -> Old Mr. Pires, his first client\nNo harm to children -> Ana, his niece', 40);
  L('Notes', 40, 80); T('Notes', 40, 40, 520, 'Keeps a ledger of favours.', 36);
  L('Total XP', 400, 20); T('TotalXP', 450, 16, 40, '25'); L('Spent XP', 495, 20); T('SpentXP', 545, 16, 40, '12');
  fs.writeFileSync(arquivo, await doc.save());
}
(async () => { await gerar(false, __dirname + '/en-nomes.pdf'); await gerar(true, __dirname + '/en-genericos.pdf'); await achatado(); console.log('fixtures geradas em', __dirname); })();
