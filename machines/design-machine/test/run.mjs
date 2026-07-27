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
  sizes: { 16: 300, 133: 4 }
};
const rawPlat = {
  visible: 120, animated: 2, infiniteLoops: 0, rotated: 0,
  hardShadows: 0, darkPseudo: 0, overlapPairs: 2, sampled: 60,
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

test('parseArgs survit aux valeurs repetees', () => {
  // indexOf cassait des qu'un positionnel et une valeur de drapeau etaient egaux.
  const r = parseArgs(['sources/A.json', '--out', 'sources/A.json'], BOOL_FLAGS);
  assert.deepEqual(r.positional, ['sources/A.json']);
  assert.equal(r.flags.out, 'sources/A.json');
});

console.log(`\n  ${pass} passes, ${fail} echecs\n`);
process.exit(fail ? 1 : 0);
