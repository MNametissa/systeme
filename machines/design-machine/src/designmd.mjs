// Rend un DESIGN.md au format attendu par Impeccable : six sections, ordre fixe,
// noms fixes. Le MASTER reste la source de verite ; ce fichier en est un derive.
// Ne jamais editer DESIGN.md a la main : il sera ecrase au prochain `dm design-md`.

const SECTIONS = ['01 Overview', '02 Colors', '03 Typography', '04 Elevation', '05 Components', "06 Do's and Don'ts"];

const bullet = (label, value) => `- **${label}** — ${value ?? '—'}`;

export function renderDesignMd(t, opts = {}) {
  const ty = t.typography || {}, pa = t.palette || {}, sp = t.spatial || {}, su = t.surfaceStyle || {}, mo = t.motion || {};
  const northStar = opts.northStar || null;
  const l = [];

  l.push('# DESIGN.md');
  l.push('');
  l.push('> Derive de `design-system/MASTER.md`. Regenere par `dm design-md`. Ne pas editer.');
  l.push('');

  l.push(`## ${SECTIONS[0]}`);
  l.push('');
  if (northStar) {
    l.push(`Creative North Star : "${northStar}"`);
  } else {
    l.push('Creative North Star : **TODO** — une phrase, ecrite par un humain.');
    l.push('');
    l.push('Aucune extraction ne produit une intention. Relancer avec `--north-star "..."`.');
  }
  l.push('');
  const provs = Object.entries(t.provenance || {}).map(([k, v]) => `${k} de ${v.source}`);
  if (provs.length) l.push(`Systeme compose par extraction : ${provs.join(', ')}.`);
  l.push('');

  l.push(`## ${SECTIONS[1]}`);
  l.push('');
  l.push(bullet('background', `\`${pa.background ?? '—'}\``));
  (pa.surfaces || []).forEach((c, i) => l.push(bullet(`surface-${i + 1}`, `\`${c}\``)));
  l.push(bullet('ink', `\`${pa.ink ?? '—'}\``));
  l.push(bullet('ink-muted', `\`${pa.muted ?? '—'}\``));
  (pa.accents || []).forEach((c, i) => l.push(bullet(`accent-${i + 1}`, `\`${c}\``)));
  l.push('');

  l.push(`## ${SECTIONS[2]}`);
  l.push('');
  (ty.families || []).forEach((f, i) => l.push(bullet(i === 0 ? 'display' : i === 1 ? 'body' : `family-${i}`, `${f.primary} — \`${f.stack}\``)));
  l.push(bullet('echelle', (ty.scale || []).map(s => `${s}px`).join(' · ') || '—'));
  l.push(bullet('ratio', ty.medianRatio ?? '—'));
  l.push(bullet('graisses', (ty.weights || []).join(', ') || '—'));
  l.push(bullet('interlignes', (ty.lineHeights || []).join(', ') || '—'));
  l.push(bullet('approche', (ty.tracking || []).join(', ') || '—'));
  if (ty.licenceReview?.length) {
    l.push('');
    l.push(`Licences a verifier avant tout usage client : ${ty.licenceReview.join(', ')}.`);
  }
  l.push('');

  l.push(`## ${SECTIONS[3]}`);
  l.push('');
  l.push(bullet('rayons', (su.radii || []).join(', ') || '—'));
  l.push(bullet('bordures', `${(su.borderWidths || []).join(', ') || '—'} en ${(su.borderColors || []).join(', ') || '—'}`));
  if ((su.shadows || []).length) {
    (su.shadows || []).forEach((s, i) => l.push(bullet(`shadow-${i}`, `\`${s}\``)));
  } else {
    l.push(bullet('ombres', 'aucune — plat par defaut'));
  }
  l.push(bullet('durees', (mo.durations || []).map(d => `${d.ms}ms`).join(', ') || '—'));
  l.push(bullet('courbes', (mo.easings || []).join(', ') || '—'));
  l.push(bullet('maille', sp.unit ? `${sp.unit}px` : '—'));
  l.push('');

  l.push(`## ${SECTIONS[4]}`);
  l.push('');
  l.push("Non derivable par extraction. Un composant est une intersection de couches, pas une dimension.");
  l.push('');
  l.push('Remplir avec `/impeccable document` une fois qu\'au moins un bouton et une carte existent dans le code.');
  l.push('');

  l.push(`## ${SECTIONS[5]}`);
  l.push('');
  l.push('**Do**');
  l.push('');
  l.push(`- N'utiliser que les familles declarees en 03 : ${(ty.families || []).map(f => f.primary).join(', ') || '—'}`);
  l.push(`- Ne prendre les tailles que dans l'echelle : ${(ty.scale || []).map(s => `${s}px`).join(', ') || '—'}`);
  if (sp.unit) l.push(`- Espacer par multiples de ${sp.unit}px`);
  l.push('- Consommer les variables de `design-system/tokens.css`, jamais de valeur en dur');
  l.push('');
  l.push("**Don't**");
  l.push('');
  l.push('- Aucune couleur absente de la section 02');
  l.push('- Aucune taille de texte hors echelle');
  l.push('- Ne pas editer ce fichier : editer les sources, puis regenerer');
  if (ty.licenceReview?.length) l.push(`- Ne pas livrer ${ty.licenceReview.join(', ')} sans licence verifiee`);
  l.push('');

  return l.join('\n');
}

// Sidecar machine-lisible, aligne sur le meme contenu que le markdown.
export function renderDesignJson(t, opts = {}) {
  const ty = t.typography || {}, pa = t.palette || {}, sp = t.spatial || {}, su = t.surfaceStyle || {}, mo = t.motion || {};
  return {
    version: 'alpha',
    generatedBy: 'design-machine',
    generatedAt: t.generatedAt,
    northStar: opts.northStar || null,
    colors: {
      background: pa.background, surfaces: pa.surfaces || [],
      ink: pa.ink, inkMuted: pa.muted, accents: pa.accents || []
    },
    typography: {
      families: (ty.families || []).map(f => ({ role: f === ty.families[0] ? 'display' : 'body', name: f.primary, stack: f.stack })),
      scale: ty.scale || [], ratio: ty.medianRatio ?? null,
      weights: ty.weights || [], lineHeights: ty.lineHeights || [], tracking: ty.tracking || [],
      licenceReview: ty.licenceReview || []
    },
    elevation: { radii: su.radii || [], shadows: su.shadows || [], borders: { widths: su.borderWidths || [], colors: su.borderColors || [] } },
    motion: { durations: (mo.durations || []).map(d => d.ms), easings: mo.easings || [] },
    spacing: { unit: sp.unit ?? null, steps: sp.steps || [] },
    components: null,
    provenance: t.provenance || {}
  };
}

export { SECTIONS };
