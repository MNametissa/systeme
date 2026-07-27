// Transforme la sortie brute du collecteur en cinq couches orthogonales.
// Aucune dependance navigateur : testable seul, sur fixture.

const px = v => parseFloat(String(v)) || 0;
const sec = v => {
  const s = String(v).trim();
  if (s.endsWith('ms')) return parseFloat(s);
  if (s.endsWith('s')) return parseFloat(s) * 1000;
  return parseFloat(s) || 0;
};

export function toHex(color) {
  const m = String(color).match(/rgba?\(([^)]+)\)/);
  if (!m) return String(color);
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  const [r, g, b] = parts;
  const a = parts.length > 3 ? parts[3] : 1;
  const hex = '#' + [r, g, b].map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
  return a < 1 ? `${hex} / ${a}` : hex;
}

export function rank(bag, n = 8) {
  return Object.entries(bag || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, weight]) => ({ value, weight }));
}

// Ratios entre paliers consecutifs : c'est ca, l'echelle typographique.
export function typeScale(sizeBag) {
  const sizes = Object.entries(sizeBag || {})
    .map(([v, w]) => ({ px: px(v), weight: w }))
    .filter(s => s.px >= 8 && s.px <= 200)
    .sort((a, b) => a.px - b.px);

  const kept = [];
  for (const s of sizes) {
    const last = kept[kept.length - 1];
    if (last && Math.abs(s.px - last.px) < 0.6) { last.weight += s.weight; continue; }
    kept.push({ ...s });
  }
  const significant = kept.filter(s => s.weight >= 2);
  const scale = (significant.length >= 3 ? significant : kept).map(s => s.px);
  const ratios = scale.slice(1).map((v, i) => +(v / scale[i]).toFixed(3));
  const median = ratios.length ? [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)] : null;
  return { scale, ratios, medianRatio: median };
}

// Cherche le plus grand pas commun approximatif : la maille d'espacement.
export function spaceUnit(spaceBag) {
  const vals = Object.entries(spaceBag || {})
    .map(([v, w]) => ({ px: px(v), weight: w }))
    .filter(s => s.px > 0 && s.px <= 200)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 24)
    .map(s => s.px);

  if (!vals.length) return { unit: null, steps: [] };

  // La maille est la PLUS GRANDE unite qui couvre presque tout, pas celle qui
  // compte le plus de hits : 2 divise tout nombre pair, donc un vote aux hits
  // bruts elit l'unite 2 avec couverture 1.00 des qu'une valeur hors maille
  // traine — couverture maximale pour une reponse vide de sens. (Ponderer par
  // hits × u ne marche pas non plus : sur [8,16,24,48,96], 3 hits × 16 > 5 × 8.)
  const scored = [2, 4, 5, 6, 8, 10, 12, 16].map(u => {
    const hits = vals.filter(v => Math.abs(v % u) < 0.51 || Math.abs((v % u) - u) < 0.51).length;
    return { unit: u, hits, coverage: hits / vals.length };
  });
  const covered = scored.filter(s => s.coverage >= 0.8);
  const best = covered.length
    ? covered.reduce((a, b) => (b.unit > a.unit ? b : a))
    : scored.reduce((a, b) => (b.hits > a.hits || (b.hits === a.hits && b.unit > a.unit) ? b : a));
  const steps = [...new Set(vals.map(v => Math.round(v)))].sort((a, b) => a - b);
  return { unit: best.unit, coverage: +best.coverage.toFixed(2), steps };
}

export function normalize(payload, label) {
  const r = payload.raw || {};

  const families = rank(r.family, 4).map(f => ({
    stack: f.value,
    primary: f.value.split(',')[0].replace(/['"]/g, '').trim(),
    weight: f.weight
  }));

  const webfontFamilies = [...new Set((payload.fontFaces || []).map(f => f.family.replace(/['"]/g, '')))];

  const bg = rank(r.bg, 8).map(c => ({ hex: toHex(c.value), area: c.weight }));
  const ink = rank(r.ink, 6).map(c => ({ hex: toHex(c.value), weight: c.weight }));

  // Une surface occupe du terrain. Un accent non. Sans ce partage, la couleur
  // de bouton se retrouve declaree comme fond secondaire.
  const totalArea = bg.reduce((n, c) => n + c.area, 0) || 1;
  const withShare = bg.map(c => ({ ...c, share: c.area / totalArea }));
  const surfaces = withShare.slice(1).filter(c => c.share >= 0.03);
  const accentBg = withShare.slice(1).filter(c => c.share < 0.03);

  return {
    label,
    url: payload.url,
    title: payload.title,
    sampled: payload.elements,

    typography: {
      families,
      webfonts: webfontFamilies,
      fontSources: payload.fontSources || [],
      ...typeScale(r.size),
      weights: rank(r.weight, 5).map(w => w.value),
      lineHeights: rank(r.lineHeight, 5).map(l => l.value),
      tracking: rank(r.tracking, 4).map(t => t.value),
      headings: payload.headings || []
    },

    palette: {
      background: bg[0]?.hex ?? null,
      surfaces: surfaces.slice(0, 3).map(c => c.hex),
      ink: ink[0]?.hex ?? null,
      muted: ink[1]?.hex ?? null,
      accents: [...accentBg.slice(0, 3).map(c => c.hex), ...ink.slice(2, 4).map(c => c.hex)],
      evidence: { backgrounds: withShare, texts: ink }
    },

    spatial: {
      ...spaceUnit(r.space),
      viewport: payload.viewport
    },

    motion: {
      durations: rank(r.duration, 5).map(d => ({ value: d.value, ms: sec(d.value) })).filter(d => d.ms > 0),
      easings: rank(r.easing, 4).map(e => e.value)
    },

    surfaceStyle: {
      radii: rank(r.radius, 5).map(v => v.value),
      shadows: rank(r.shadow, 4).map(v => v.value),
      borderWidths: rank(r.borderWidth, 3).map(v => v.value),
      borderColors: rank(r.borderColor, 3).map(v => toHex(v.value))
    }
  };
}

export const LAYERS = ['typography', 'palette', 'spatial', 'motion', 'surfaceStyle'];
