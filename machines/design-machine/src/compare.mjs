// Compare la densite mesuree d'une source et d'un rendu. Transforme le
// « c'est trop plat » en deltas chiffres. Regle de verdict : le rendu porte
// moins de la moitie de la source sur une metrique → ECART. Le seuil de 50 %
// est une heuristique assumee : on compare des ordres de grandeur, pas des
// virgules. Le jugement final (North Star) reste humain.

export function deriveIntensity(raw) {
  const v = raw.visible || 1;
  const entries = Object.entries(raw.sizes || {}).map(([s, n]) => ({ px: +s, n }));
  const mode = entries.slice().sort((a, b) => b.n - a.n)[0]?.px ?? null;
  const max = entries.length ? Math.max(...entries.map(e => e.px)) : null;
  return {
    animRatio: (raw.animated || 0) / v,
    infiniteLoops: raw.infiniteLoops || 0,
    rotatedRatio: (raw.rotated || 0) / v,
    offsetBlocks: (raw.hardShadows || 0) + (raw.darkPseudo || 0),
    overlapRatio: raw.sampled ? (raw.overlapPairs || 0) / raw.sampled : 0,
    typeJump: mode && max ? +(max / mode).toFixed(2) : null,
    chromaRatio: (raw.chromatic || 0) / v,
    hues: Object.keys(raw.hueBuckets || {}).length
  };
}

const pct = x => `${(x * 100).toFixed(1)} %`;
const num = x => String(x);
const mult = x => (x == null ? '—' : `×${x}`);

const METRICS = [
  { key: 'animRatio', label: 'elements animes / visibles', fmt: pct },
  { key: 'infiniteLoops', label: 'boucles infinies (page)', fmt: num },
  { key: 'rotatedRatio', label: 'elements en rotation / visibles', fmt: pct },
  { key: 'offsetBlocks', label: 'ombres dures + blocs decales', fmt: num },
  { key: 'overlapRatio', label: 'chevauchements / echantillon', fmt: pct },
  { key: 'typeJump', label: 'saut typographique (max / base)', fmt: mult },
  { key: 'chromaRatio', label: 'elements en couleur saturee / visibles', fmt: pct },
  { key: 'hues', label: 'teintes distinctes (saturees)', fmt: num }
];

export function compareIntensity(rawSource, rawRendu) {
  const s = deriveIntensity(rawSource);
  const r = deriveIntensity(rawRendu);
  return METRICS.map(m => ({
    key: m.key,
    label: m.label,
    source: s[m.key],
    rendu: r[m.key],
    fmt: m.fmt,
    ecart: s[m.key] != null && r[m.key] != null && s[m.key] > 0 && r[m.key] < s[m.key] * 0.5
  }));
}

export function formatDensity(raw, label = '') {
  const d = deriveIntensity(raw);
  const l = [];
  l.push(`DENSITE MESUREE${label ? ` — ${label}` : ''}`);
  l.push('');
  for (const m of METRICS) l.push(`  ${m.label.padEnd(34)} ${m.fmt(d[m.key])}`);
  return l.join('\n');
}

export function formatCompare(rows, [labelA, labelB] = ['source', 'rendu']) {
  const l = [];
  const ecarts = rows.filter(r => r.ecart);
  l.push(ecarts.length
    ? `${ecarts.length} ECART(S) — le rendu porte moins de la moitie de la source`
    : 'DENSITE COMPARABLE — aucun ecart au-dela du seuil');
  l.push('');
  l.push(`  source : ${labelA}`);
  l.push(`  rendu  : ${labelB}`);
  l.push('');
  for (const r of rows) {
    const mark = r.ecart ? 'ECART' : 'ok   ';
    l.push(`  ${mark}  ${r.label.padEnd(34)} ${String(r.fmt(r.source)).padStart(9)}  →  ${r.fmt(r.rendu)}`);
  }
  l.push('');
  l.push('  Le seuil (50 %) compare des ordres de grandeur. Le North Star reste juge.');
  return l.join('\n');
}
