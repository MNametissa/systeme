// Porte statique pour les stacks dont le rendu ne se mesure pas (Flutter,
// natif) — et second filet pour les autres. Population fermee : TOUT litteral
// de couleur hors des fichiers tokens/theme, avec fichier:ligne et decompte.
// L'instrument enumere ; zero element examine = echec d'instrument, jamais OK.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

export const EXTENSIONS = new Set([
  '.dart', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.scss', '.sass',
  '.less', '.html', '.vue', '.svelte', '.kt', '.swift'
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.dart_tool',
  'Pods', 'DerivedData', '.gradle', 'design-system', 'coverage'
]);

// Un fichier tokens/theme est le SEUL endroit legitime pour un litteral.
const isTokenFile = name => /token|theme|palette/i.test(name);

const PATTERNS = [
  { name: 'hex', re: /#[0-9a-fA-F]{3,8}\b/g },
  { name: 'rgb', re: /\brgba?\([^)]{3,40}\)/g },
  { name: 'hsl', re: /\bhsla?\([^)]{3,40}\)/g },
  { name: 'dart-color', re: /\bColor\(0x[0-9a-fA-F]{6,8}\)/g }
];

export function scanContent(content) {
  const found = [];
  const lines = String(content).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/design-machine|dm-lint-ignore/.test(line)) continue;
    for (const p of PATTERNS) {
      for (const m of line.matchAll(p.re)) {
        found.push({ line: i + 1, kind: p.name, literal: m[0].slice(0, 60) });
      }
    }
  }
  return found;
}

export function lintDir(root) {
  const findings = [];
  let scanned = 0;
  const walk = dir => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(e) && !e.startsWith('.')) walk(full);
        continue;
      }
      if (!EXTENSIONS.has(extname(e)) || isTokenFile(basename(e))) continue;
      scanned++;
      const hits = scanContent(readFileSync(full, 'utf8'));
      for (const h of hits) findings.push({ file: full, ...h });
    }
  };
  walk(root);
  return { scanned, findings };
}

export function formatLint({ scanned, findings }, root) {
  const l = [];
  if (!scanned) {
    l.push(`AUCUN FICHIER EXAMINE sous ${root} — echec d'instrument, pas un succes.`);
    return l.join('\n');
  }
  l.push(findings.length
    ? `${findings.length} litteral/aux de couleur hors tokens — ${scanned} fichier(s) examine(s)`
    : `AUCUN litteral de couleur hors tokens — ${scanned} fichier(s) examine(s)`);
  for (const f of findings.slice(0, 80)) {
    l.push(`  ${f.file}:${f.line}  ${f.literal}`);
  }
  if (findings.length > 80) l.push(`  … et ${findings.length - 80} de plus`);
  if (findings.length) {
    l.push('');
    l.push('Corriger en consommant les tokens (tokens.css / tokens.ts / tokens.dart).');
    l.push('Un litteral assume se marque `dm-lint-ignore` sur sa ligne, avec sa raison.');
  }
  return l.join('\n');
}
