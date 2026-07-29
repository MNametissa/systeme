// Projections natives du contrat : tokens.json -> tokens.dart (Flutter),
// tokens.ts (React Native / Electron / Ionic). Le contrat reste tokens.json ;
// ces fichiers en sont des derives, regeneres par `dm export`, jamais edites.

const px = v => parseFloat(String(v)) || 0;

// '#262626' -> '0xFF262626' · '#000000 / 0.5' -> '0x80000000'
export function hexToDart(hex) {
  const [h, alpha] = String(hex).split(' / ');
  const rgb = h.replace('#', '').slice(0, 6).toUpperCase();
  if (rgb.length !== 6 || /[^0-9A-F]/.test(rgb)) return null;
  const a = alpha ? Math.round(parseFloat(alpha) * 255) : 255;
  return `0x${a.toString(16).toUpperCase().padStart(2, '0')}${rgb}`;
}

// Un rayon extrait peut valoir 33 554 432px (rounded-full) : au-dela de 9999,
// c'est une pilule, pas une mesure.
const radius = v => Math.min(px(v), 9999);

export function renderDart(t) {
  const pa = t.palette || {}, ty = t.typography || {}, sp = t.spatial || {}, mo = t.motion || {}, su = t.surfaceStyle || {};
  const l = [];
  l.push(`// Genere par design-machine le ${t.generatedAt}. Ne pas editer : dm export dart.`);
  l.push(`import 'dart:ui';`);
  l.push('');
  l.push('abstract final class DesignTokens {');
  const color = (name, hex) => {
    const d = hexToDart(hex);
    if (d) l.push(`  static const Color ${name} = Color(${d});`);
  };
  if (pa.background) color('bg', pa.background);
  if (pa.ink) color('ink', pa.ink);
  if (pa.muted) color('inkMuted', pa.muted);
  (pa.surfaces || []).forEach((c, i) => color(`surface${i + 1}`, c));
  (pa.accents || []).forEach((c, i) => color(`accent${i + 1}`, c));
  l.push('');
  (ty.scale || []).forEach((s, i) => l.push(`  static const double text${i} = ${s};`));
  if (sp.unit) l.push(`  static const double spaceUnit = ${sp.unit};`);
  l.push('');
  (mo.durations || []).forEach((d, i) => l.push(`  static const Duration dur${i} = Duration(milliseconds: ${Math.round(d.ms)});`));
  (su.radii || []).forEach((r, i) => l.push(`  static const double radius${i} = ${radius(r)};`));
  l.push('}');
  const pd = t.paletteDark;
  if (pd) {
    l.push('');
    l.push('abstract final class DesignTokensDark {');
    const dcolor = (name, hex) => {
      const d = hexToDart(hex);
      if (d) l.push(`  static const Color ${name} = Color(${d});`);
    };
    if (pd.background) dcolor('bg', pd.background);
    if (pd.ink) dcolor('ink', pd.ink);
    if (pd.muted) dcolor('inkMuted', pd.muted);
    (pd.surfaces || []).forEach((c, i) => dcolor(`surface${i + 1}`, c));
    (pd.accents || []).forEach((c, i) => dcolor(`accent${i + 1}`, c));
    l.push('}');
  }
  return l.join('\n') + '\n';
}

export function renderTs(t) {
  const pa = t.palette || {}, ty = t.typography || {}, sp = t.spatial || {}, mo = t.motion || {}, su = t.surfaceStyle || {};
  const strip = c => String(c).split(' / ')[0];
  const obj = {
    bg: pa.background ? strip(pa.background) : null,
    ink: pa.ink ? strip(pa.ink) : null,
    inkMuted: pa.muted ? strip(pa.muted) : null,
    surfaces: (pa.surfaces || []).map(strip),
    accents: (pa.accents || []).map(strip),
    fontFamilies: (ty.families || []).map(f => f.primary),
    textScale: ty.scale || [],
    spaceUnit: sp.unit ?? null,
    durationsMs: (mo.durations || []).map(d => Math.round(d.ms)),
    easings: mo.easings || [],
    radii: (su.radii || []).map(radius),
    ...(t.paletteDark ? {
      dark: {
        bg: t.paletteDark.background ? strip(t.paletteDark.background) : null,
        ink: t.paletteDark.ink ? strip(t.paletteDark.ink) : null,
        inkMuted: t.paletteDark.muted ? strip(t.paletteDark.muted) : null,
        surfaces: (t.paletteDark.surfaces || []).map(strip),
        accents: (t.paletteDark.accents || []).map(strip)
      }
    } : {})
  };
  return `// Genere par design-machine le ${t.generatedAt}. Ne pas editer : dm export ts.\n` +
    `export const tokens = ${JSON.stringify(obj, null, 2)} as const;\n`;
}
