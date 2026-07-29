// Bout en bout REEL : Chromium, fixtures locales (file://), zero reseau.
// Fige les contre-epreuves qui ont attrape les deux defauts invisibles aux
// tests unitaires : le schema herite de l'environnement, le body exclu de la
// mesure. `npm run test:e2e` — plus lent que la suite unitaire, deterministe.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../src/extract.mjs';

try { findChrome(); } catch (e) {
  console.error(`E2E NON EXECUTABLE — ${e.message}`);
  process.exit(2); // refus du vide : pas de navigateur = pas un succes
}

const DM = fileURLToPath(new URL('../bin/dm.mjs', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'dm-e2e-'));
const dm = (...args) => spawnSync('node', [DM, ...args], { encoding: 'utf8', cwd: dir, timeout: 120000 });

let pass = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

writeFileSync(join(dir, 'scheme.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>duo</title><style>*{margin:0}
:root{--bg:#faf8f4;--ink:#181614;--card:#ffffff}
@media (prefers-color-scheme: dark){:root{--bg:#111111;--ink:#f0f0f0;--card:#1c1e20}}
body{background:var(--bg);color:var(--ink);font-family:Georgia,serif;font-size:16px;line-height:26px}
main{padding:48px}h1{font-size:32px;margin-bottom:24px}.card{background:var(--card);padding:24px;border-radius:8px}
</style></head><body><main><h1>Deux themes, un document</h1>
<p>Assez de texte pour peser dans la ponderation typographique du collecteur.</p>
<div class="card"><p>Une carte qui change de surface selon le theme, avec du contenu.</p></div>
</main></body></html>`);

writeFileSync(join(dir, 'aveugle.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>claire</title><style>*{margin:0}
body{background:#ffffff;color:#181614;font-family:Georgia,serif;font-size:16px;line-height:26px}
main{padding:48px}h1{font-size:32px;margin-bottom:24px}
</style></head><body><main><h1>Je reste claire</h1>
<p>Aucun prefers-color-scheme ici : en sombre je rends la meme chose.</p>
</main></body></html>`);

console.log('\ndesign-machine — e2e\n');

const url = f => `file://${join(dir, f)}`;

test('extract force le schema clair, quel que soit le theme de la machine', () => {
  const r = dm('extract', url('scheme.html'), '--label', 'S');
  assert.equal(r.status, 0, r.stderr);
  const p = JSON.parse(readFileSync(join(dir, 'sources/S.json'), 'utf8')).palette;
  assert.equal(p.background, '#faf8f4', 'le body compte, en clair');
  assert.ok(p.surfaces.includes('#ffffff'), 'la carte est une surface');
});

test('extract --scheme dark mesure le theme sombre', () => {
  const r = dm('extract', url('scheme.html'), '--scheme', 'dark', '--label', 'S-dark', '--out', 'sources/S-dark.json');
  assert.equal(r.status, 0, r.stderr);
  const p = JSON.parse(readFileSync(join(dir, 'sources/S-dark.json'), 'utf8')).palette;
  assert.equal(p.background, '#111111');
});

test('merge paletteDark ecrit le media query dans tokens.css', () => {
  const r = dm('merge', '--sources', 'sources',
    '--map', 'typography=S,palette=S,spatial=S,motion=S,surfaceStyle=S,paletteDark=S-dark');
  assert.equal(r.status, 0, r.stderr);
  const css = readFileSync(join(dir, 'design-system/tokens.css'), 'utf8');
  assert.ok(css.includes('@media (prefers-color-scheme: dark)'));
  assert.ok(css.includes(':root[data-theme="dark"]'));
});

test('gate verifie les deux schemas et ouvre sur un rendu fidele', () => {
  const r = dm('gate', url('scheme.html'), '--no-impeccable');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(r.stdout.includes('dm verify (sombre)'));
  assert.ok(r.stdout.includes('PORTE OUVERTE'));
});

test('un rendu aveugle au sombre echoue en schema sombre', () => {
  const r = dm('verify', url('aveugle.html'), '--scheme', 'dark');
  assert.equal(r.status, 1, r.stdout);
  assert.ok(r.stdout.includes('undeclared-background'));
});

test('juger en sombre un contrat sans volet est un REFUS, pas un verdict', () => {
  const r = dm('verify', url('aveugle.html'), '--scheme', 'dark', '--master', 'sources/S.json');
  assert.equal(r.status, 2, String(r.status));
  assert.ok(r.stderr.includes('volet sombre'));
});

test('lint attrape un litteral hors tokens, ignore les fichiers theme', () => {
  writeFileSync(join(dir, 'app.dart'), 'final c = Color(0xFF112233);');
  writeFileSync(join(dir, 'tokens.dart'), 'final bg = Color(0xFF262626);');
  const r = dm('lint', '.');
  assert.equal(r.status, 1, r.stdout);
  assert.ok(r.stdout.includes('app.dart'));
  assert.ok(!r.stdout.includes('tokens.dart:'));
});

console.log(`\n  ${pass} passes, ${fail} echecs\n`);
process.exit(fail ? 1 : 0);
