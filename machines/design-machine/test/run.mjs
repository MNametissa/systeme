import assert from 'node:assert/strict';
import { normalize, typeScale, spaceUnit, toHex, motionLayerExt } from '../src/normalize.mjs';
import { merge, parseMap } from '../src/merge.mjs';
import { renderMaster, renderCss } from '../src/render.mjs';
import { verify } from '../src/verify.mjs';

let pass = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

const siteA = {
  url: 'https://a.test', title: 'Editorial A', elements: 420,
  viewport: { w: 1440, h: 900 }, headings: [], fontSources: [],
  fontFaces: [{ family: 'Editorial New', weight: '400', style: 'normal', status: 'loaded' }],
  raw: {
    family: { '"Editorial New", serif': 900, '"Inter", sans-serif': 40 },
    size: { '16px': 300, '20px': 90, '32px': 40, '52px': 12, '13px': 60 },
    weight: { '400': 800, '600': 120 },
    lineHeight: { '26px': 500, '38px': 60 },
    tracking: { '-0.01em': 400 },
    ink: { 'rgb(24, 22, 20)': 700, 'rgb(120, 116, 110)': 200 },
    bg: { 'rgb(250, 248, 244)': 9000, 'rgb(24, 22, 20)': 800, 'rgb(212, 96, 48)': 60 },
    radius: { '4px': 40, '12px': 8 },
    shadow: { 'rgba(0, 0, 0, 0.08) 0px 1px 2px 0px': 30 },
    borderWidth: { '1px': 50 }, borderColor: { 'rgb(228, 224, 216)': 50 },
    duration: { '0.2s': 40, '0.4s': 6 }, easing: { 'cubic-bezier(0.4, 0, 0.2, 1)': 40 },
    space: { '24px': 120, '48px': 60, '8px': 90, '16px': 140, '96px': 20 }
  }
};

const siteB = {
  url: 'https://b.test', title: 'Product B', elements: 610,
  viewport: { w: 1440, h: 900 }, headings: [], fontSources: [],
  fontFaces: [],
  raw: {
    family: { 'Arial, sans-serif': 700 },
    size: { '14px': 400, '18px': 100, '28px': 30 },
    weight: { '400': 600 }, lineHeight: { '20px': 400 }, tracking: {},
    ink: { 'rgb(15, 23, 42)': 600, 'rgb(100, 116, 139)': 180 },
    bg: { 'rgb(255, 255, 255)': 12000, 'rgb(241, 245, 249)': 2200, 'rgb(37, 99, 235)': 400 },
    radius: { '6px': 200 }, shadow: {}, borderWidth: { '1px': 300 },
    borderColor: { 'rgb(226, 232, 240)': 300 },
    duration: { '0.15s': 300 }, easing: { 'ease-out': 300 },
    space: { '12px': 300, '24px': 200, '6px': 120, '36px': 40 }
  }
};

const siteC = {
  url: 'https://c.test', title: 'Motion C', elements: 200,
  viewport: { w: 1440, h: 900 }, headings: [], fontSources: [], fontFaces: [],
  raw: {
    family: { 'Arial, sans-serif': 100 }, size: { '16px': 100 }, weight: {},
    lineHeight: {}, tracking: {}, ink: { 'rgb(0, 0, 0)': 100 }, bg: { 'rgb(255, 255, 255)': 500 },
    radius: {}, shadow: {}, borderWidth: {}, borderColor: {},
    duration: { '0.6s': 90, '0.9s': 40 }, easing: { 'cubic-bezier(0.16, 1, 0.3, 1)': 90 },
    space: { '32px': 50 }
  }
};

const siteD = {
  url: 'https://d.test', title: 'Dark D', elements: 100,
  viewport: { w: 1440, h: 900 }, headings: [], fontSources: [], fontFaces: [],
  raw: {
    family: { 'Arial, sans-serif': 100 }, size: { '16px': 100 }, weight: { '400': 100 },
    lineHeight: {}, tracking: {}, ink: { 'rgb(240, 240, 240)': 100 },
    bg: { 'rgb(17, 17, 17)': 8000 }, radius: {}, shadow: {}, borderWidth: {},
    borderColor: {}, duration: { '0.2s': 10 }, easing: { 'ease': 10 },
    space: { '8px': 50, '16px': 30 }
  }
};

console.log('\ndesign-machine — tests\n');

test('toHex convertit rgb en hexadecimal', () => {
  assert.equal(toHex('rgb(250, 248, 244)'), '#faf8f4');
  assert.equal(toHex('rgba(0, 0, 0, 0.5)'), '#000000 / 0.5');
});

test('typeScale trie et calcule les ratios', () => {
  const r = typeScale({ '16px': 300, '32px': 40, '20px': 90 });
  assert.deepEqual(r.scale, [16, 20, 32]);
  assert.equal(r.ratios[0], 1.25);
});

test('typeScale ecarte les valeurs marginales quand il reste assez de paliers', () => {
  const r = typeScale({ '16px': 300, '20px': 90, '32px': 40, '17px': 1 });
  assert.ok(!r.scale.includes(17));
});

test('spaceUnit trouve la maille dominante', () => {
  const r = spaceUnit(siteA.raw.space);
  assert.equal(r.unit, 8);
  assert.ok(r.coverage >= 0.9);
});

test('spaceUnit ne laisse pas une valeur hors maille elire l unite 2', () => {
  // Maille 8 pure + un 10px parasite : l'ancien vote aux hits bruts rendait
  // unit 2, coverage 1.00 — couverture maximale pour une reponse vide de sens.
  const r = spaceUnit({ '8px': 90, '16px': 140, '24px': 120, '32px': 40, '40px': 20, '10px': 5 });
  assert.equal(r.unit, 8);
  assert.ok(r.coverage < 1, 'la couverture doit avouer la valeur hors maille');
});

test('spaceUnit garde une couverture honnete de 1.00 sur maille pure', () => {
  const r = spaceUnit({ '8px': 50, '24px': 30, '64px': 10 });
  assert.equal(r.unit, 8);
  assert.equal(r.coverage, 1);
});

test('normalize produit les cinq couches', () => {
  const n = normalize(siteA, 'A');
  for (const k of ['typography', 'palette', 'spatial', 'motion', 'surfaceStyle']) assert.ok(n[k], k);
  assert.equal(n.palette.background, '#faf8f4');
  assert.equal(n.typography.families[0].primary, 'Editorial New');
});

test('normalize pondere les fonds par surface, pas par occurrence', () => {
  const n = normalize(siteB, 'B');
  assert.equal(n.palette.background, '#ffffff');
  assert.ok(n.palette.surfaces.includes('#f1f5f9'));
});

test('parseMap refuse une couche composant', () => {
  assert.throws(() => parseMap('hero=A,palette=B'), /intersection de couches/);
});

test('parseMap refuse une couche inconnue', () => {
  assert.throws(() => parseMap('vibes=A'), /Couche inconnue/);
});

test('merge exige que toutes les couches soient affectees', () => {
  const sources = [normalize(siteA, 'A'), normalize(siteB, 'B')];
  assert.throws(() => merge(sources, { typography: 'A' }), /non affectees/);
});

test('merge prend chaque couche chez sa source', () => {
  const sources = [normalize(siteA, 'A'), normalize(siteB, 'B'), normalize(siteC, 'C')];
  const t = merge(sources, parseMap('typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A'));
  assert.equal(t.typography.families[0].primary, 'Editorial New');
  assert.equal(t.palette.background, '#ffffff');
  assert.equal(t.provenance.motion.source, 'C');
  assert.equal(t.motion.durations[0].ms, 600);
  assert.equal(t.surfaceStyle.radii[0], '4px');
});

test('merge signale les polices sous licence', () => {
  const sources = [normalize(siteA, 'A'), normalize(siteB, 'B'), normalize(siteC, 'C')];
  const t = merge(sources, parseMap('typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A'));
  assert.ok(t.typography.licenceReview.includes('Editorial New'));
  assert.ok(t.warnings.some(w => /licence/i.test(w)));
});

test('renderMaster et renderCss sortent le meme contrat', () => {
  const sources = [normalize(siteA, 'A'), normalize(siteB, 'B'), normalize(siteC, 'C')];
  const t = merge(sources, parseMap('typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A'));
  const md = renderMaster(t), css = renderCss(t);
  assert.ok(md.includes('Editorial New'));
  assert.ok(md.includes('#ffffff'));
  assert.ok(css.includes('--font-display'));
  assert.ok(css.includes('--bg: #ffffff'));
  assert.ok(css.includes('--space-unit'));
});

test('verify passe sur une cible identique au MASTER', () => {
  const sources = [normalize(siteB, 'B')];
  const t = merge(sources, parseMap('typography=B,palette=B,spatial=B,motion=B,surfaceStyle=B'));
  const res = verify(siteB, t);
  assert.equal(res.pass, true, JSON.stringify(res.findings));
});

test('verify echoue sur une police hors contrat', () => {
  const t = merge([normalize(siteB, 'B')], parseMap('typography=B,palette=B,spatial=B,motion=B,surfaceStyle=B'));
  const drift = structuredClone(siteB);
  drift.raw.family = { '"Comic Sans MS", cursive': 700 };
  const res = verify(drift, t);
  assert.equal(res.pass, false);
  assert.ok(res.findings.some(f => f.rule === 'font-family'));
});

test('verify echoue sur un fond non declare au-dela du seuil', () => {
  const t = merge([normalize(siteB, 'B')], parseMap('typography=B,palette=B,spatial=B,motion=B,surfaceStyle=B'));
  const drift = structuredClone(siteB);
  drift.raw.bg['rgb(255, 0, 128)'] = 6000;
  const res = verify(drift, t);
  assert.equal(res.pass, false);
  assert.ok(res.findings.some(f => f.rule === 'undeclared-background'));
});

test('verify ignore un fond non declare sous le seuil', () => {
  const t = merge([normalize(siteB, 'B')], parseMap('typography=B,palette=B,spatial=B,motion=B,surfaceStyle=B'));
  const drift = structuredClone(siteB);
  drift.raw.bg['rgb(255, 0, 128)'] = 30;
  const res = verify(drift, t);
  assert.ok(!res.findings.some(f => f.rule === 'undeclared-background'));
});

test('verify n echoue pas sur une derive de motion, il avertit', () => {
  const t = merge([normalize(siteB, 'B')], parseMap('typography=B,palette=B,spatial=B,motion=B,surfaceStyle=B'));
  const drift = structuredClone(siteB);
  drift.raw.duration = { '0.7s': 300 };
  const res = verify(drift, t);
  assert.equal(res.counts.warn > 0, true);
  assert.equal(res.findings.filter(f => f.rule === 'motion-duration' && f.severity === 'FAIL').length, 0);
});


// --- integration Impeccable ---

const { renderDesignMd, renderDesignJson, SECTIONS } = await import('../src/designmd.mjs');
const { waiversFromTokens, parseDetect } = await import('../src/impeccable.mjs');
const { composeVerdict, formatVerdict } = await import('../src/gate.mjs');

const tokensA = merge(
  [normalize(siteA, 'A'), normalize(siteB, 'B'), normalize(siteC, 'C')],
  parseMap('typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A')
);
const tokensB = merge([normalize(siteB, 'B')], parseMap('typography=B,palette=B,spatial=B,motion=B,surfaceStyle=B'));

test('DESIGN.md a les six sections dans l ordre fixe', () => {
  const md = renderDesignMd(tokensA, { northStar: 'Le sanctuaire editorial' });
  let cursor = -1;
  for (const s of SECTIONS) {
    const at = md.indexOf(`## ${s}`);
    assert.ok(at > -1, `section manquante : ${s}`);
    assert.ok(at > cursor, `section hors ordre : ${s}`);
    cursor = at;
  }
});

test('DESIGN.md signale une intention manquante au lieu de l inventer', () => {
  const md = renderDesignMd(tokensA, {});
  assert.ok(md.includes('TODO'));
  assert.ok(!renderDesignMd(tokensA, { northStar: 'X' }).includes('North Star : **TODO**'));
});

test('DESIGN.md refuse de deriver les composants', () => {
  const md = renderDesignMd(tokensA, { northStar: 'X' });
  const part = md.slice(md.indexOf('## 05 Components'), md.indexOf("## 06 Do's"));
  assert.ok(/intersection de couches/.test(part));
});

test('DESIGN.md ne contredit jamais le MASTER', () => {
  const md = renderDesignMd(tokensA, { northStar: 'X' });
  assert.ok(md.includes(tokensA.palette.background));
  assert.ok(md.includes(tokensA.typography.families[0].primary));
  for (const s of tokensA.typography.scale) assert.ok(md.includes(`${s}px`), `taille absente : ${s}`);
});

test('design.json porte le meme contenu que le markdown', () => {
  const j = renderDesignJson(tokensA, { northStar: 'X' });
  assert.equal(j.colors.background, tokensA.palette.background);
  assert.deepEqual(j.typography.scale, tokensA.typography.scale);
  assert.equal(j.components, null);
});

test('les derogations ne couvrent que les polices declarees et surexploitees', () => {
  // A declare "Editorial New" et "Inter" : seule la seconde est surexploitee.
  const wa = waiversFromTokens(tokensA);
  assert.equal(wa.length, 1);
  assert.equal(wa[0].value, 'Inter');
  assert.ok(!wa.some(w => w.value === 'Editorial New'));

  const w = waiversFromTokens(tokensB);
  assert.equal(w.length, 1);
  assert.equal(w[0].value, 'Arial');
  assert.ok(/MASTER/.test(w[0].reason));

  // Une police jamais declaree ne recoit aucune derogation.
  const bare = structuredClone(tokensB);
  bare.typography.families = [{ primary: 'Editorial New', stack: 'x' }];
  assert.deepEqual(waiversFromTokens(bare), []);
});

test('parseDetect tolere plusieurs formes de sortie', () => {
  assert.equal(parseDetect('[{"rule":"a","severity":"error"}]').errors, 1);
  assert.equal(parseDetect('{"findings":[{"id":"b","level":"warn"}]}').total, 1);
  assert.equal(parseDetect('pas du json'), null);
});

test('une etape absente ne ferme jamais la porte', () => {
  const v = composeVerdict([
    { name: 'dm verify', status: 'pass' },
    { name: 'impeccable detect', status: 'skip', reason: 'non installe' }
  ]);
  assert.equal(v.pass, true);
  assert.equal(v.skipped, 1);
  assert.ok(formatVerdict(v).includes('PORTE OUVERTE'));
});

test('un seul echec ferme la porte et le verdict le nomme', () => {
  const v = composeVerdict([
    { name: 'dm verify', status: 'pass' },
    { name: 'impeccable detect', status: 'fail', detail: '[error] overused-font' }
  ]);
  assert.equal(v.pass, false);
  assert.deepEqual(v.failed, ['impeccable detect']);
  assert.ok(formatVerdict(v).includes('PORTE FERMEE'));
});

test('une panne ferme la porte — skip vaut pour un outil absent, pas pour une erreur', () => {
  const v = composeVerdict([
    { name: 'dm verify', status: 'error', reason: 'tokens.json corrompu' },
    { name: 'impeccable detect', status: 'skip', reason: 'non installe' }
  ]);
  assert.equal(v.pass, false);
  assert.deepEqual(v.failed, ['dm verify']);
  const out = formatVerdict(v);
  assert.ok(out.includes('PORTE FERMEE'));
  assert.ok(out.includes('PANNE'));
});


// --- volet sombre (paletteDark) ---

// Contrat mixte : clair depuis B (blanc), sombre depuis D (#111111)
const tokensMixte = merge(
  [normalize(siteB, 'B'), normalize(siteD, 'D')],
  parseMap('typography=D,palette=B,spatial=D,motion=D,surfaceStyle=D,paletteDark=D')
);

test('merge accepte paletteDark avec sa propre source et sa provenance', () => {
  assert.equal(tokensMixte.paletteDark.background, '#111111');
  assert.equal(tokensMixte.palette.background, '#ffffff');
  assert.equal(tokensMixte.provenance.paletteDark.source, 'D');
});

test('verify en schema sombre juge contre le volet sombre, pas le clair', () => {
  // Rendu sombre (#111) : NON CONFORME contre le contrat clair (blanc)…
  const clair = verify(siteD, tokensMixte);
  assert.equal(clair.pass, false);
  assert.ok(clair.findings.some(f => f.rule === 'undeclared-background'));
  // …CONFORME contre le volet sombre.
  const sombre = verify(siteD, tokensMixte, { scheme: 'dark' });
  assert.equal(sombre.pass, true, JSON.stringify(sombre.findings));
});

test('verify en sombre REFUSE un contrat sans volet, plutot que juger faux', () => {
  const sansVolet = merge([normalize(siteD, 'D')], parseMap('typography=D,palette=D,spatial=D,motion=D,surfaceStyle=D'));
  assert.throws(() => verify(siteD, sansVolet, { scheme: 'dark' }), /volet sombre/);
});

test('tokens.css emet le media query et data-theme pour le volet sombre', () => {
  const css = renderCss(tokensMixte);
  assert.ok(css.includes('@media (prefers-color-scheme: dark)'));
  assert.ok(css.includes(':root[data-theme="dark"]'));
  assert.ok(css.includes('--bg: #111111'));
  assert.ok(!renderCss(tokensB).includes('prefers-color-scheme'), 'pas de volet = pas de media query');
});

test('le MASTER porte le volet sombre et sa provenance', () => {
  const md = renderMaster(tokensMixte);
  assert.ok(md.includes('Volet sombre'));
  assert.ok(md.includes('| paletteDark | D'));
});


// --- couche motion etendue ---

const motionExtFixture = {
  probe: {
    markSettled: 2000, markHover: 6000, rafTicks: 4, styleMutations: 2,
    samples: [
      { type: 'CSSAnimation', name: 'spin', duration: 900, easing: 'linear', iterations: 'infinite', target: 'DIV.loader', firstAt: 300, seen: 6 },
      { type: 'CSSTransition', name: 'opacity', duration: 400, easing: 'ease-out', iterations: 1, target: 'SECTION.reveal', firstAt: 3500, seen: 2 }
    ]
  },
  statics: {
    sheetsTotal: 2, sheetsBlocked: 1,
    keyframes: [{ name: 'spin', steps: 2, properties: ['transform'] }],
    pseudo: [{ selector: '.btn:hover', state: 'hover', properties: ['background-color'] }]
  },
  hover: [{ target: 'A.btn', transitions: [{ name: 'background-color', duration: 200, easing: 'ease' }] }]
};

test('motionLayerExt classe loaders (avant stabilisation) et scroll (apres)', () => {
  const x = motionLayerExt(motionExtFixture);
  assert.equal(x.loaders.length, 1);
  assert.equal(x.loaders[0].name, 'spin');
  assert.equal(x.loaders[0].iterations, 'infinite');
  assert.equal(x.onScroll.length, 1);
  assert.equal(x.onScroll[0].duration, 400);
});

test('motionLayerExt porte le mesure du survol et le declare du CSSOM', () => {
  const x = motionLayerExt(motionExtFixture);
  assert.equal(x.interactions[0].target, 'A.btn');
  assert.equal(x.interactions[0].transitions[0].duration, 200);
  assert.equal(x.keyframes[0].name, 'spin');
  assert.equal(x.hoverDeclared[0].state, 'hover');
  assert.equal(x.unmeasured.blockedSheets, 1);
});

test('motionLayerExt n invente rien sur une page statique', () => {
  const x = motionLayerExt({ probe: { markSettled: 2000, rafTicks: 3, styleMutations: 0, samples: [] }, statics: { keyframes: [], pseudo: [], sheetsBlocked: 0 }, hover: [] });
  assert.equal(x.loaders.length + x.onScroll.length + x.interactions.length + x.keyframes.length, 0);
  assert.equal(x.unmeasured.jsAnimationSuspected, false);
});

test('motionLayerExt signale le mouvement rAF sans l estimer', () => {
  const x = motionLayerExt({ probe: { markSettled: 2000, rafTicks: 900, styleMutations: 450, samples: [] }, statics: { keyframes: [], pseudo: [] }, hover: [] });
  assert.equal(x.unmeasured.jsAnimationSuspected, true);
  assert.equal(x.loaders.length, 0, 'detecter n est pas inventer des tokens');
});

test('normalize embarque la couche etendue seulement si elle a ete captee', () => {
  const sans = normalize(siteA, 'A');
  assert.equal(sans.motion.extended, undefined);
  const avec = normalize({ ...siteA, motionExt: motionExtFixture }, 'A');
  assert.equal(avec.motion.extended.loaders[0].name, 'spin');
});

test('le MASTER rend la motion etendue et avoue le non-instrumente', () => {
  const src = normalize({ ...siteA, motionExt: motionExtFixture }, 'A');
  const t = merge([src], parseMap('typography=A,palette=A,spatial=A,motion=A,surfaceStyle=A'));
  const md = renderMaster(t);
  assert.ok(md.includes('spin 900ms ×infinite'));
  assert.ok(md.includes('Survol mesure'));
  assert.ok(md.includes('cross-origin'));
  // rafTicks 4 : pas de faux soupcon sur une page sage
  assert.ok(!md.includes('Mouvement non instrumente'));
  const suspect = structuredClone(t);
  suspect.motion.extended.unmeasured.jsAnimationSuspected = true;
  assert.ok(renderMaster(suspect).includes('Mouvement non instrumente detecte'));
});


// --- comparaison de densite ---

const compareMod = await import('../src/compare.mjs');
const { deriveIntensity, compareIntensity, formatCompare } = compareMod;

const rawBonito = {
  visible: 500, animated: 60, infiniteLoops: 8, rotated: 25,
  hardShadows: 30, darkPseudo: 10, overlapPairs: 40, sampled: 200,
  chromatic: 90, hueBuckets: { 0: 40, 1: 20, 4: 10, 7: 5 },
  sizes: { 16: 300, 133: 4 }
};
const rawPlat = {
  visible: 120, animated: 2, infiniteLoops: 0, rotated: 0,
  hardShadows: 0, darkPseudo: 0, overlapPairs: 2, sampled: 60,
  chromatic: 2, hueBuckets: { 0: 2 },
  sizes: { 16: 80, 76: 3 }
};

test('deriveIntensity produit des ratios, pas des impressions', () => {
  const d = deriveIntensity(rawBonito);
  assert.equal(d.animRatio, 60 / 500);
  assert.equal(d.offsetBlocks, 40);
  assert.equal(d.typeJump, 8.31);
});

test('compareIntensity marque ECART quand le rendu porte moins de la moitie', () => {
  const rows = compareIntensity(rawBonito, rawPlat);
  const parCle = Object.fromEntries(rows.map(r => [r.key, r]));
  assert.equal(parCle.animRatio.ecart, true);
  assert.equal(parCle.infiniteLoops.ecart, true);
  assert.equal(parCle.offsetBlocks.ecart, true);
  // saut typographique 8.31 → 4.75 : au-dessus de la moitie, pas un ecart
  assert.equal(parCle.typeJump.ecart, false);
});

test('un rendu noir et blanc face a une source coloree est un ECART chiffre', () => {
  // Le reproche « ca tourne trop au N&B » devient deux nombres : part
  // d'elements satures (18 % → 1.7 %) et teintes distinctes (4 → 1).
  const rows = compareIntensity(rawBonito, rawPlat);
  const parCle = Object.fromEntries(rows.map(r => [r.key, r]));
  assert.equal(parCle.chromaRatio.ecart, true);
  assert.equal(parCle.hues.ecart, true);
  assert.equal(parCle.hues.source, 4);
});

test('compareIntensity ne signale rien entre deux pages equivalentes', () => {
  const rows = compareIntensity(rawBonito, rawBonito);
  assert.equal(rows.filter(r => r.ecart).length, 0);
  assert.ok(formatCompare(rows).includes('DENSITE COMPARABLE'));
});

test('formatCompare nomme les ecarts et garde le juge humain', () => {
  const out = formatCompare(compareIntensity(rawBonito, rawPlat));
  assert.ok(out.includes('ECART'));
  assert.ok(out.includes('North Star'));
});

test('formatDensity jauge une page seule (chasse aux references)', () => {
  const { formatDensity } = compareMod;
  const out = formatDensity(rawBonito, 'https://candidat.test');
  assert.ok(out.includes('DENSITE MESUREE'));
  assert.ok(out.includes('candidat.test'));
  assert.ok(out.includes('12.0 %'));
});


// --- projections natives + porte statique ---

const { hexToDart, renderDart, renderTs } = await import('../src/native.mjs');
const { scanContent, lintDir, formatLint } = await import('../src/lint.mjs');

test('hexToDart convertit avec et sans alpha, refuse le non-hex', () => {
  assert.equal(hexToDart('#262626'), '0xFF262626');
  assert.equal(hexToDart('#000000 / 0.5'), '0x80000000');
  assert.equal(hexToDart('transparent'), null);
});

test('export dart et ts portent le meme contrat que tokens.json', () => {
  const dart = renderDart(tokensB);
  assert.ok(dart.includes('Color(0xFFFFFFFF)'), 'fond');
  assert.ok(dart.includes('static const double spaceUnit = 6;'));
  assert.ok(dart.includes('Duration(milliseconds: 150)'));
  const ts = renderTs(tokensB);
  assert.ok(ts.includes(`"bg": "#ffffff"`));
  assert.ok(ts.includes(`"spaceUnit": 6`));
  // rounded-full de Tailwind : une pilule, pas 33 554 432px
  const pill = renderTs({ ...tokensB, surfaceStyle: { radii: ['3.35544e+07px'] } });
  assert.ok(pill.includes('9999'));
});

test('les projections natives portent le volet sombre, et lui seul', () => {
  const dart = renderDart(tokensMixte);
  assert.ok(dart.includes('DesignTokensDark'));
  assert.ok(dart.includes('Color(0xFF111111)'));
  assert.ok(renderTs(tokensMixte).includes('"dark"'));
  assert.ok(!renderDart(tokensB).includes('DesignTokensDark'), 'pas de volet = pas de classe sombre');
  assert.ok(!renderTs(tokensB).includes('"dark"'));
});

test('scanContent attrape hex, rgb et Color(0x…) avec leur ligne', () => {
  const hits = scanContent('a { color: #ee1b2b; }\nconst c = Color(0xFF262626);\nx = rgba(0, 0, 0, 0.5)');
  assert.equal(hits.length, 3);
  assert.equal(hits[0].line, 1);
  assert.equal(hits[1].kind, 'dart-color');
});

test('scanContent respecte dm-lint-ignore', () => {
  const hits = scanContent('bad: #fff;\nok: #fff; // dm-lint-ignore — fond du canvas natif');
  assert.equal(hits.length, 1);
});

const { mkdtempSync, mkdirSync: mkd, writeFileSync: wf } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');

test('lintDir enumere hors tokens/theme et refuse le vide', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dm-lint-'));
  wf(join(dir, 'app.dart'), 'final c = Color(0xFF112233);');
  wf(join(dir, 'tokens.dart'), 'final bg = Color(0xFF262626);');
  mkd(join(dir, 'node_modules'));
  wf(join(dir, 'node_modules', 'x.js'), 'c = "#123456"');
  const res = lintDir(dir);
  assert.equal(res.scanned, 1, 'tokens.dart et node_modules exclus');
  assert.equal(res.findings.length, 1);
  assert.ok(res.findings[0].file.endsWith('app.dart'));
  mkd(join(dir, 'vide'));
  const vide = lintDir(join(dir, 'vide'));
  assert.equal(vide.scanned, 0);
  assert.ok(formatLint(vide, 'x').includes("echec d'instrument"));
});


// --- parseur d'arguments ---

const { parseArgs, BOOL_FLAGS } = await import('../src/args.mjs');

test('parseArgs garde le positionnel apres un drapeau booleen', () => {
  // L'ancien parseur perdait l'url de `dm gate --json <url>` et verifiait
  // localhost:3000 — verdict CONFORME sur la mauvaise cible.
  const r = parseArgs(['--json', 'http://cible:8080'], BOOL_FLAGS);
  assert.deepEqual(r.positional, ['http://cible:8080']);
  assert.equal(r.flags.json, true);
});

test('parseArgs associe la valeur au drapeau qui la precede', () => {
  const r = parseArgs(['http://cible', '--label', 'A', '--headed'], BOOL_FLAGS);
  assert.deepEqual(r.positional, ['http://cible']);
  assert.equal(r.flags.label, 'A');
  assert.equal(r.flags.headed, true);
});

test('parseArgs accepte la forme --drapeau=valeur', () => {
  const r = parseArgs(['http://cible', '--label=A', '--width=375'], BOOL_FLAGS);
  assert.deepEqual(r.positional, ['http://cible']);
  assert.equal(r.flags.label, 'A');
  assert.equal(r.flags.width, '375');
});

test('parseArgs survit aux valeurs repetees', () => {
  // indexOf cassait des qu'un positionnel et une valeur de drapeau etaient egaux.
  const r = parseArgs(['sources/A.json', '--out', 'sources/A.json'], BOOL_FLAGS);
  assert.deepEqual(r.positional, ['sources/A.json']);
  assert.equal(r.flags.out, 'sources/A.json');
});

// --- palette depuis image ---

const paletteMod = await import('../src/palette.mjs');
const { contrastRatio, rolesFromCounts, toSource } = paletteMod;

test('contrastRatio suit WCAG : noir/blanc = 21, identiques = 1', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
  assert.equal(contrastRatio('#888888', '#888888'), 1);
});

test('rolesFromCounts attribue par surface et contraste, pas au gout', () => {
  const p = rolesFromCounts({
    '#f8f8f8': 8000,  // le plus couvrant -> fond
    '#181818': 1500,  // le plus contraste -> encre
    '#ffffff': 900,   // couvrant restant -> surface
    '#787068': 400,   // contraste ET peu sature -> attenue
    '#d84818': 300,   // contraste MAIS sature -> accent, pas attenue
    '#e8e8e8': 20     // < 0.5 % : ignore des roles
  });
  assert.equal(p.background, '#f8f8f8');
  assert.equal(p.ink, '#181818');
  assert.equal(p.muted, '#787068');
  assert.ok(p.surfaces.includes('#ffffff'));
  assert.ok(p.accents.includes('#d84818'));
  assert.ok(!p.accents.includes('#e8e8e8'));
  assert.equal(p.evidence[0].share, +(8000 / 11120).toFixed(4));
});

test('toSource produit une source consommable par merge (palette d une image)', () => {
  const p = rolesFromCounts({ '#111118': 5000, '#f0f0f0': 800 });
  const src = toSource({ ...p, sampledPixels: 5800 }, 'affiche', '/tmp/affiche.png');
  assert.equal(src.palette.background, '#111118');
  assert.ok(src.url.startsWith('file://'), 'provenance tracee vers le fichier');
  // Cas d'usage reel : les couches structurelles d'un site, la palette sombre d'une affiche.
  const t = merge([normalize(siteB, 'B'), src],
    parseMap('typography=B,palette=B,spatial=B,motion=B,surfaceStyle=B,paletteDark=affiche'));
  assert.equal(t.paletteDark.background, '#111118');
  assert.equal(t.provenance.paletteDark.source, 'affiche');
});


test('visualFromAggregates chiffre l intensite d une image sans l inventer', () => {
  const { visualFromAggregates, formatVisual } = paletteMod;
  // 1000 pixels : 300 satures sur 3 teintes, 150 aretes, luminances bimodales
  const lumHist = new Array(16).fill(0);
  lumHist[1] = 500; lumHist[14] = 500; // sombre + clair -> contraste eleve
  const v = visualFromAggregates({
    opaque: 1000, satPixels: 300, hueBuckets: { 0: 200, 4: 60, 8: 40 },
    lumHist, edges: 150
  });
  assert.equal(v.chromaShare, 0.3);
  assert.equal(v.hues, 3);
  assert.equal(v.edgeDensity, 0.15);
  assert.ok(v.contrast > 0.7, `contraste ${v.contrast}`);
  const plat = visualFromAggregates({ opaque: 1000, satPixels: 0, hueBuckets: {}, lumHist: (() => { const h = new Array(16).fill(0); h[8] = 1000; return h; })(), edges: 5 });
  assert.equal(plat.chromaShare, 0);
  assert.ok(plat.contrast < 0.1, 'une image plate avoue sa platitude');
  assert.ok(formatVisual(v).includes('fourmillement'));
});


// --- derivation clair <-> sombre ---

const { hexToOklab, oklabToHex, invertPalette } = await import('../src/scheme.mjs');
const { formatSchemeReport } = await import('../src/scheme.mjs');

test('OKLab aller-retour restitue la couleur au pixel pres', () => {
  for (const hex of ['#faf8f4', '#181614', '#ee1b2b', '#015c56', '#888888']) {
    const back = oklabToHex(hexToOklab(hex));
    const [a, b] = [parseInt(hex.slice(1), 16), parseInt(back.slice(1), 16)];
    for (const shift of [16, 8, 0]) {
      assert.ok(Math.abs(((a >> shift) & 255) - ((b >> shift) & 255)) <= 1, `${hex} → ${back}`);
    }
  }
});

test('invertPalette inverse les clartes et REPRODUIT chaque contraste', () => {
  const { palette: sombre, report } = invertPalette({
    background: '#faf8f4', surfaces: ['#ffffff'], ink: '#181614',
    muted: '#787066', accents: ['#d46030']
  });
  assert.ok(hexToOklab(sombre.background).L < 0.2, `fond ${sombre.background} attendu sombre`);
  assert.ok(hexToOklab(sombre.ink).L > 0.7, `encre ${sombre.ink} attendue claire`);
  assert.equal(sombre.derived, true);
  for (const r of report.filter(x => x.avant !== null)) {
    assert.ok(Math.abs(r.apres - r.avant) <= Math.max(0.05 * r.avant, 0.1),
      `${r.role} : contraste ${r.avant} → ${r.apres}`);
  }
  assert.ok(formatSchemeReport(report, 'SOMBRE').includes('contrastes reproduits'));
});

test('la double inversion revient au point de depart — le « parfaitement »', () => {
  const clair = { background: '#faf8f4', surfaces: [], ink: '#181614', muted: '#787066', accents: ['#d46030'] };
  const retour = invertPalette(invertPalette(clair).palette).palette;
  // encre et attenue (hors zones degenerees) : retour au canal pres
  for (const role of ['ink', 'muted']) {
    const [a, b] = [parseInt(clair[role].slice(1), 16), parseInt(retour[role].slice(1), 16)];
    for (const shift of [16, 8, 0]) {
      const d = Math.abs(((a >> shift) & 255) - ((b >> shift) & 255));
      assert.ok(d <= 12, `${role} : ${clair[role]} → ${retour[role]} (delta canal ${d})`);
    }
  }
  // le fond frole le blanc absolu : la borne anti-degenerescence compresse,
  // le retour se juge en clarte OKLab, pas au canal pres
  const dL = Math.abs(hexToOklab(clair.background).L - hexToOklab(retour.background).L);
  assert.ok(dL <= 0.12, `fond : ${clair.background} → ${retour.background} (delta L ${dL.toFixed(3)})`);
  assert.ok(hexToOklab(retour.background).L > 0.8, 'le fond revient clair');
});

test('invertPalette preserve les suffixes alpha', () => {
  const { palette: p } = invertPalette({ background: '#ffffff', surfaces: [], ink: '#000000 / 0.8', muted: null, accents: [] });
  assert.ok(p.ink.endsWith(' / 0.8'), p.ink);
});


// --- import / export ---

const { buildPack, applyPack } = await import('../src/pack.mjs');
const handoffMod = await import('../src/handoff.mjs');

test('pack -> unpack restitue le contrat a l identique et regenere les derives', () => {
  const src = normalize(siteB, 'B');
  const pack = buildPack({ tokens: tokensB, sources: [src], northStar: 'Le comptoir clair', notes: '# Grammaire' });
  const { files, warnings } = applyPack(JSON.parse(JSON.stringify(pack)));
  const byPath = Object.fromEntries(files.map(f => [f.path, f.content]));
  assert.deepEqual(JSON.parse(byPath['design-system/tokens.json']), JSON.parse(JSON.stringify(tokensB)),
    'le contrat traverse sans perte');
  assert.equal(JSON.parse(byPath['sources/B.json']).label, 'B');
  assert.ok(byPath['design-system/MASTER.md'].includes('## Provenance'), 'MASTER regenere');
  assert.ok(byPath['design-system/tokens.css'].includes(':root'), 'css regenere');
  assert.ok(byPath['DESIGN.md'].includes('Le comptoir clair'), 'North Star transporte');
  assert.equal(warnings.length, 0);
});

test('un paquet altere ou d un format inconnu est REFUSE', () => {
  const pack = buildPack({ tokens: tokensB, sources: [], northStar: null });
  const altere = { ...pack, tokens: { ...pack.tokens, palette: { ...pack.tokens.palette, background: '#bad' } } };
  assert.throws(() => applyPack(altere), /Somme de controle/);
  assert.throws(() => applyPack({ format: 'autre-chose' }), /Format inconnu/);
  assert.throws(() => applyPack({ format: 'design-machine/pack', version: 99 }), /non geree/);
});

test('un paquet sans sources ou sans North Star le dit, sans bloquer', () => {
  const { warnings } = applyPack(buildPack({ tokens: tokensB, sources: [], northStar: null }));
  assert.ok(warnings.some(w => w.includes('sans ses preuves')));
  assert.ok(warnings.some(w => w.includes('North Star')));
  assert.ok(warnings.some(w => w.includes('grammaire')), 'le trou des regles de composition est nomme');
});

test('la grammaire (NOTES.md) voyage dans le pack et ressort telle quelle', () => {
  const grammaire = '# Grammaire\n\n- Profondeur = blocs pleins decales, jamais box-shadow.\n';
  const { files } = applyPack(buildPack({ tokens: tokensB, sources: [], northStar: null, notes: grammaire }));
  const notes = files.find(f => f.path === 'design-system/NOTES.md');
  assert.equal(notes.content, grammaire);
  // retro-compatibilite : un pack v1 sans notes garde un checksum valide
  const ancien = buildPack({ tokens: tokensB, sources: [], northStar: null });
  delete ancien.notes;
  assert.doesNotThrow(() => applyPack(ancien));
});


test('handoff : un seul Markdown autonome, complet et date', () => {
  const { renderHandoff } = handoffMod;
  const md = renderHandoff({ tokens: tokensMixte, northStar: 'Le comptoir clair', notes: '## Grammaire\n- blocs decales' });
  assert.ok(md.includes('INSTANTANE derive'), 'l instantane se date et s avoue');
  assert.ok(md.includes('empreinte du contrat'), 'la divergence est detectable');
  assert.ok(md.includes('Le comptoir clair'));
  assert.ok(md.includes('SEUL vocabulaire autorise'));
  assert.ok(md.includes('## Provenance'), 'le MASTER lisible est embarque');
  assert.ok(md.includes('blocs decales'), 'la grammaire est embarquee');
  assert.ok(md.includes('```css') && md.includes(':root'), 'tokens.css embarque');
  assert.ok(md.includes('prefers-color-scheme'), 'volet sombre compris');
});

test('handoff sans intention ni grammaire le DIT au destinataire', () => {
  const { renderHandoff } = handoffMod;
  const md = renderHandoff({ tokens: tokensB });
  assert.ok(md.includes('Non fournie'));
  assert.ok(!md.includes('## Grammaire'));
});


// --- doctor ---

const { doctorExitCode, formatDoctor } = await import('../src/doctor.mjs');

test('doctor echoue seulement sur un REQUIS manquant', () => {
  const ok = [{ name: 'Node', ok: true, requis: true, detail: '' },
    { name: 'impeccable', ok: false, requis: false, detail: 'geste' }];
  assert.equal(doctorExitCode(ok), 0);
  const casse = [{ name: 'Chromium', ok: false, requis: true, detail: 'geste' }];
  assert.equal(doctorExitCode(casse), 1);
});

test('doctor nomme chaque manque avec son geste', () => {
  const out = formatDoctor([
    { name: 'Chromium', ok: false, requis: true, detail: 'sudo apt install chromium' },
    { name: 'accesslint (optionnel)', ok: false, requis: false, detail: 'claude plugin install…' }
  ]);
  assert.ok(out.includes('MANQUE'));
  assert.ok(out.includes('sudo apt install chromium'));
  assert.ok(out.includes('REQUISE(S) manquante(s)'));
});


// D12 a recidive deux fois (17→26, 48→55) : le compte annonce est teste.
// Ce test doit rester LE DERNIER : le total attendu l'inclut.
const { readFileSync: rf } = await import('node:fs');
test('README et STACK annoncent le compte de tests reel', () => {
  const total = pass + fail + 1;
  for (const doc of ['../README.md', '../STACK.md']) {
    const txt = rf(new URL(doc, import.meta.url), 'utf8');
    for (const m of txt.matchAll(/(\d+) tests/g)) {
      assert.equal(+m[1], total, `${doc} annonce ${m[1]}, reel ${total}`);
    }
  }
});

console.log(`\n  ${pass} passes, ${fail} echecs\n`);
process.exit(fail ? 1 : 0);
