// Derive un volet clair depuis le sombre, ou l'inverse — DETERMINISTE et
// prouvable : teinte et saturation conservees (OKLab), clarte du fond
// inversee, et chaque couleur resolue par dichotomie pour REPRODUIRE son
// rapport de contraste WCAG d'origine contre le nouveau fond. Le rapport de
// fidelite est imprime ; un ecart (couleur hors gamut) est avoue, pas masque.
//
// Un volet derive n'est PAS une mesure : il est marque `derived`, sa
// provenance le dit, et il ne remplace jamais un volet extrait sans --force.

import { contrastRatio } from './palette.mjs';

// --- sRGB <-> OKLab (Björn Ottosson, domaine public) ---

const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = c => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

export function hexToOklab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}

export function oklabToHex({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bb = gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return '#' + [r, g, bb].map(v => v.toString(16).padStart(2, '0')).join('');
}

// --- inversion a contraste preserve ---

const splitAlpha = c => {
  const [hex, alpha] = String(c).split(' / ');
  return { hex: hex.toLowerCase(), alpha: alpha ? ` / ${alpha}` : '' };
};

// Cherche la clarte (teinte/saturation fixees) qui reproduit `target` contre
// `bgHex`, du cote `lighter` (plus clair ou plus sombre que le fond).
function solveL(ab, bgHex, target, lighter) {
  const bgL = hexToOklab(bgHex).L;
  let lo = lighter ? bgL : 0;
  let hi = lighter ? 1 : bgL;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const ratio = contrastRatio(oklabToHex({ L: mid, a: ab.a, b: ab.b }), bgHex);
    // le contraste croit en s'eloignant du fond
    if (ratio < target === lighter) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function invertPalette(palette) {
  const bg = splitAlpha(palette.background);
  const bgLab = hexToOklab(bg.hex);
  // Inversion PURE de la clarte : un fond creme (L 0.98) donne un fond quasi
  // noir — stark mais deterministe, et les contrastes restent bien definis.
  // Toute borne « esthetique » ici decalerait le fond au retour et ferait
  // deborder les ratios du gamut (prouve par le test d'aller-retour).
  const bgOut = oklabToHex({ L: 1 - bgLab.L, a: bgLab.a, b: bgLab.b });
  const report = [{ role: 'background', from: palette.background, to: bgOut + bg.alpha, avant: null, apres: null }];

  const derive = (c, role) => {
    if (!c) return c;
    const { hex, alpha } = splitAlpha(c);
    const ab = hexToOklab(hex);
    const avant = contrastRatio(hex, bg.hex);
    // la polarite s'inverse : ce qui etait plus sombre que le fond devient plus clair
    const lighter = ab.L < bgLab.L;
    const out = oklabToHex({ L: solveL(ab, bgOut, avant, lighter), a: ab.a, b: ab.b });
    const apres = contrastRatio(out, bgOut);
    report.push({ role, from: c, to: out + alpha, avant: +avant.toFixed(2), apres: +apres.toFixed(2) });
    return out + alpha;
  };

  return {
    palette: {
      background: bgOut + bg.alpha,
      surfaces: (palette.surfaces || []).map((c, i) => derive(c, `surface-${i + 1}`)),
      ink: derive(palette.ink, 'ink'),
      muted: derive(palette.muted, 'muted'),
      accents: (palette.accents || []).map((c, i) => derive(c, `accent-${i + 1}`)),
      derived: true
    },
    report
  };
}

export function formatSchemeReport(report, sens) {
  const l = [`VOLET ${sens} DERIVE — teinte/saturation conservees, contrastes reproduits`, ''];
  for (const r of report) {
    // tolerance : 5 % relatif, ou 0.1 absolu pres du ratio 1 (arrondi 8 bits)
    const fid = r.avant === null ? '' :
      Math.abs(r.apres - r.avant) <= Math.max(0.05 * r.avant, 0.1)
        ? `  contraste ${r.avant} → ${r.apres}`
        : `  contraste ${r.avant} → ${r.apres}  ! hors gamut, ecart avoue`;
    l.push(`  ${r.role.padEnd(12)} ${String(r.from).padEnd(18)} → ${r.to}${fid}`);
  }
  l.push('');
  l.push('  Un volet derive n\'est pas une mesure : si la source a un vrai theme');
  l.push('  oppose, extraire avec --scheme et re-merger vaut toujours mieux.');
  return l.join('\n');
}
