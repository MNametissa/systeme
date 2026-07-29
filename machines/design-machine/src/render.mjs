// Deux sorties depuis le meme jeu de tokens :
//   MASTER.md   -> ce que l'agent lit
//   tokens.css  -> ce que le code consomme
// Les deux doivent dire la meme chose, sinon la porte n'a aucun sens.

const list = a => (a && a.length ? a.join(', ') : '—');

export function renderMaster(t) {
  const p = t.provenance || {};
  const src = layer => (p[layer] ? `${p[layer].source} · ${p[layer].url}` : '—');

  const lines = [];
  lines.push('# MASTER — systeme de design');
  lines.push('');
  lines.push(`Genere le ${t.generatedAt}. Ne pas editer a la main : regenerer via \`dm merge\`.`);
  lines.push('');
  lines.push('Ce fichier est le contrat. Toute valeur absente d\'ici ne doit pas apparaitre dans le code.');
  lines.push('');

  if (t.warnings?.length) {
    lines.push('## Avertissements');
    lines.push('');
    for (const w of t.warnings) lines.push(`- ${w}`);
    lines.push('');
  }

  lines.push('## Provenance');
  lines.push('');
  lines.push('| Couche | Source |');
  lines.push('| --- | --- |');
  for (const layer of ['typography', 'palette', 'spatial', 'motion', 'surfaceStyle']) {
    lines.push(`| ${layer} | ${src(layer)} |`);
  }
  if (t.paletteDark) lines.push(`| paletteDark | ${src('paletteDark')} |`);
  lines.push('');

  const ty = t.typography || {};
  lines.push('## Typographie');
  lines.push('');
  lines.push(`- Familles autorisees : ${list((ty.families || []).map(f => f.primary))}`);
  lines.push(`- Echelle (px) : ${list((ty.scale || []).map(String))}`);
  lines.push(`- Ratio median : ${ty.medianRatio ?? '—'}`);
  lines.push(`- Graisses : ${list(ty.weights)}`);
  lines.push(`- Interlignes : ${list(ty.lineHeights)}`);
  lines.push(`- Approche : ${list(ty.tracking)}`);
  if (ty.licenceReview?.length) {
    lines.push(`- **Licence a verifier** : ${list(ty.licenceReview)}`);
  }
  lines.push('');

  const pa = t.palette || {};
  lines.push('## Palette');
  lines.push('');
  lines.push(`- Fond dominant : \`${pa.background ?? '—'}\``);
  lines.push(`- Surfaces : ${list((pa.surfaces || []).map(c => `\`${c}\``))}`);
  lines.push(`- Encre : \`${pa.ink ?? '—'}\``);
  lines.push(`- Attenue : \`${pa.muted ?? '—'}\``);
  lines.push(`- Accents : ${list((pa.accents || []).map(c => `\`${c}\``))}`);
  const pd = t.paletteDark;
  if (pd) {
    lines.push('');
    lines.push('### Volet sombre');
    lines.push('');
    lines.push(`- Fond dominant : \`${pd.background ?? '—'}\``);
    lines.push(`- Surfaces : ${list((pd.surfaces || []).map(c => `\`${c}\``))}`);
    lines.push(`- Encre : \`${pd.ink ?? '—'}\``);
    lines.push(`- Attenue : \`${pd.muted ?? '—'}\``);
    lines.push(`- Accents : ${list((pd.accents || []).map(c => `\`${c}\``))}`);
  }
  lines.push('');

  const sp = t.spatial || {};
  lines.push('## Spatial');
  lines.push('');
  lines.push(`- Maille : ${sp.unit ? `${sp.unit}px` : '—'} (couverture ${sp.coverage ?? '—'})`);
  lines.push(`- Paliers observes : ${list((sp.steps || []).slice(0, 12).map(String))}`);
  lines.push('');

  const mo = t.motion || {};
  lines.push('## Motion');
  lines.push('');
  lines.push(`- Durees : ${list((mo.durations || []).map(d => `${d.ms}ms`))}`);
  lines.push(`- Courbes : ${list(mo.easings)}`);
  const x = mo.extended;
  if (x) {
    lines.push(`- Keyframes declarees : ${list(x.keyframes.map(k => `${k.name} (${k.properties.join('/')})`))}`);
    if (x.loaders.length) lines.push(`- Loaders (au chargement) : ${list(x.loaders.map(l => `${l.name} ${l.duration}ms ×${l.iterations} sur ${l.target}`))}`);
    if (x.onScroll.length) lines.push(`- Au defilement : ${list(x.onScroll.map(s => `${s.name} ${s.duration}ms (${s.easing}) sur ${s.target}`))}`);
    if (x.interactions.length) lines.push(`- Survol mesure : ${list(x.interactions.slice(0, 6).map(i => `${i.target} → ${i.transitions.map(tr => `${tr.property} ${tr.duration}ms`).join(', ')}`))}`);
    lines.push(`- Etats declares (:hover/:focus/:active) : ${x.hoverDeclared.length} regle(s)`);
    if (x.unmeasured.jsAnimationSuspected) {
      lines.push(`- **Mouvement non instrumente detecte** (${x.unmeasured.rafTicks} ticks rAF, ${x.unmeasured.styleMutations} mutations de style inline) — a documenter a la main, jamais estime`);
    }
    if (x.unmeasured.blockedSheets) {
      lines.push(`- ${x.unmeasured.blockedSheets} feuille(s) de style cross-origin illisible(s) : le declare est incomplet`);
    }
  }
  lines.push('');

  const su = t.surfaceStyle || {};
  lines.push('## Surface');
  lines.push('');
  lines.push(`- Rayons : ${list(su.radii)}`);
  lines.push(`- Bordures : ${list(su.borderWidths)} en ${list(su.borderColors)}`);
  lines.push(`- Ombres : ${(su.shadows || []).length ? '\n' + su.shadows.map(s => `  - \`${s}\``).join('\n') : ' —'}`);
  lines.push('');

  lines.push('## Regles de conformite');
  lines.push('');
  lines.push('Verifiees par `dm verify` :');
  lines.push('');
  lines.push('- Aucune famille de police hors de la liste ci-dessus');
  lines.push('- Aucune taille de texte hors echelle (tolerance 1px)');
  lines.push('- Aucune couleur de fond non declaree occupant plus de 2 % de la surface');
  lines.push('- Aucune duree de transition hors du jeu declare (avertissement)');
  lines.push('');

  return lines.join('\n');
}

export function renderCss(t) {
  const ty = t.typography || {}, pa = t.palette || {}, sp = t.spatial || {}, mo = t.motion || {}, su = t.surfaceStyle || {};
  const l = [];
  l.push(`/* Genere par design-machine le ${t.generatedAt}. Ne pas editer. */`);
  l.push(':root {');

  (ty.families || []).forEach((f, i) => l.push(`  --font-${i === 0 ? 'display' : i === 1 ? 'body' : i}: ${f.stack};`));
  (ty.scale || []).forEach((s, i) => l.push(`  --text-${i}: ${s}px;`));
  if (ty.medianRatio) l.push(`  --type-ratio: ${ty.medianRatio};`);

  if (pa.background) l.push(`  --bg: ${pa.background.split(' / ')[0]};`);
  (pa.surfaces || []).forEach((c, i) => l.push(`  --surface-${i + 1}: ${c.split(' / ')[0]};`));
  if (pa.ink) l.push(`  --ink: ${pa.ink.split(' / ')[0]};`);
  if (pa.muted) l.push(`  --ink-muted: ${pa.muted.split(' / ')[0]};`);
  (pa.accents || []).forEach((c, i) => l.push(`  --accent-${i + 1}: ${c.split(' / ')[0]};`));

  if (sp.unit) {
    l.push(`  --space-unit: ${sp.unit}px;`);
    [1, 2, 3, 4, 6, 8, 12].forEach(n => l.push(`  --space-${n}: ${sp.unit * n}px;`));
  }

  (mo.durations || []).slice(0, 3).forEach((d, i) => l.push(`  --dur-${i}: ${d.ms}ms;`));
  (mo.easings || []).slice(0, 2).forEach((e, i) => l.push(`  --ease-${i}: ${e};`));
  (su.radii || []).slice(0, 3).forEach((r, i) => l.push(`  --radius-${i}: ${r};`));
  (su.shadows || []).slice(0, 2).forEach((s, i) => l.push(`  --shadow-${i}: ${s};`));

  l.push('}');

  const pd = t.paletteDark;
  if (pd) {
    const overrides = [];
    if (pd.background) overrides.push(`  --bg: ${pd.background.split(' / ')[0]};`);
    (pd.surfaces || []).forEach((c, i) => overrides.push(`  --surface-${i + 1}: ${c.split(' / ')[0]};`));
    if (pd.ink) overrides.push(`  --ink: ${pd.ink.split(' / ')[0]};`);
    if (pd.muted) overrides.push(`  --ink-muted: ${pd.muted.split(' / ')[0]};`);
    (pd.accents || []).forEach((c, i) => overrides.push(`  --accent-${i + 1}: ${c.split(' / ')[0]};`));
    l.push('');
    l.push('@media (prefers-color-scheme: dark) {');
    l.push('  :root {');
    overrides.forEach(o => l.push('  ' + o));
    l.push('  }');
    l.push('}');
    l.push(':root[data-theme="dark"] {');
    overrides.forEach(o => l.push(o));
    l.push('}');
  }
  return l.join('\n');
}
