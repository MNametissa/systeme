// Une image comme source de palette MESUREE : les pixels sont une population
// fermee. Les roles sont attribues par des regles deterministes et documentees
// — part de surface et contraste — jamais au gout :
//   background = la couleur la plus couvrante
//   ink        = la plus contrastee avec le fond (part >= 0.5 %)
//   muted      = la contrastee suivante (ratio >= 3) ET peu saturee — une
//                couleur vive n'est pas une encre affaiblie, c'est un accent
//   surfaces   = les couvrantes restantes (part >= 5 %)
//   accents    = le reste des couleurs notables (part >= 0.5 %)
// On derive des regles, pas des actifs : l'image n'entre jamais au livrable.

import { readFileSync } from 'node:fs';
import { resolve, extname, basename } from 'node:path';
import { findChrome } from './extract.mjs';

// --- pur, testable sans navigateur ---

export function relLuminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

export function contrastRatio(a, b) {
  const [l1, l2] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function rolesFromCounts(counts) {
  const total = Object.values(counts).reduce((n, c) => n + c, 0) || 1;
  const ranked = Object.entries(counts)
    .map(([hex, n]) => ({ hex, share: n / total }))
    .sort((a, b) => b.share - a.share);
  if (!ranked.length) return null;

  const background = ranked[0].hex;
  const rest = ranked.slice(1).filter(c => c.share >= 0.005);

  const saturation = hex => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const max = Math.max(...ch);
    return max ? (max - Math.min(...ch)) / max : 0;
  };
  const byContrast = [...rest].sort((a, b) => contrastRatio(b.hex, background) - contrastRatio(a.hex, background));
  const ink = byContrast[0]?.hex ?? null;
  const muted = byContrast.find(c =>
    c.hex !== ink && contrastRatio(c.hex, background) >= 3 && saturation(c.hex) < 0.35
  )?.hex ?? null;

  const taken = new Set([background, ink, muted].filter(Boolean));
  const surfaces = rest.filter(c => !taken.has(c.hex) && c.share >= 0.05).slice(0, 3).map(c => c.hex);
  surfaces.forEach(s => taken.add(s));
  const accents = rest.filter(c => !taken.has(c.hex)).slice(0, 4).map(c => c.hex);

  return {
    background, ink, muted, surfaces, accents,
    evidence: ranked.slice(0, 12).map(c => ({ hex: c.hex, share: +c.share.toFixed(4) }))
  };
}

export function formatPalette(p, label = '') {
  const l = [`PALETTE MESUREE${label ? ` — ${label}` : ''}`, ''];
  l.push(`  fond      ${p.background}`);
  l.push(`  encre     ${p.ink ?? '—'}`);
  l.push(`  attenue   ${p.muted ?? '—'}`);
  l.push(`  surfaces  ${p.surfaces.join(', ') || '—'}`);
  l.push(`  accents   ${p.accents.join(', ') || '—'}`);
  l.push('');
  l.push('  couverture :');
  for (const e of p.evidence) l.push(`    ${e.hex}  ${(e.share * 100).toFixed(1)} %`);
  l.push('');
  l.push('  Roles par regles (surface, contraste) — a re-affecter si le sens visuel differe.');
  return l.join('\n');
}

// --- navigateur : compter les pixels via canvas ---

// Executee dans la page ; l'image arrive en data URI (jamais de canvas taint).
function countPixels(dataUri) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 240; // borne le travail, garde les proportions
      const k = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * k));
      const h = Math.max(1, Math.round(img.height * k));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      const counts = {};
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue; // pixel transparent
        // quantification 4 bits par canal, representant au centre du seau
        const hex = '#' + [d[i], d[i + 1], d[i + 2]]
          .map(v => ((v & 0xF0) | 0x08).toString(16).padStart(2, '0')).join('');
        counts[hex] = (counts[hex] || 0) + 1;
      }
      res({ counts, width: img.width, height: img.height });
    };
    img.onerror = () => rej(new Error('image illisible'));
    img.src = dataUri;
  });
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

export async function paletteFromImage(path) {
  const ext = extname(path).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`Format non gere : ${ext || '(sans extension)'}. Attendu : ${Object.keys(MIME).join(', ')}.`);
  const dataUri = `data:${mime};base64,${readFileSync(resolve(path)).toString('base64')}`;

  const { default: puppeteer } = await import('puppeteer-core');
  const args = ['--disable-dev-shm-usage'];
  if (process.env.DM_NO_SANDBOX === '1') args.push('--no-sandbox');
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new', args });
  try {
    const page = await browser.newPage();
    const { counts, width, height } = await page.evaluate(countPixels, dataUri);
    const roles = rolesFromCounts(counts);
    if (!roles) throw new Error('aucun pixel opaque mesure');
    return { ...roles, width, height, sampledPixels: Object.values(counts).reduce((n, c) => n + c, 0) };
  } finally {
    await browser.close();
  }
}

export function toSource(p, label, path) {
  return {
    label,
    url: `file://${resolve(path)}`,
    title: basename(path),
    sampled: p.sampledPixels,
    palette: {
      background: p.background,
      surfaces: p.surfaces,
      ink: p.ink,
      muted: p.muted,
      accents: p.accents,
      evidence: { backgrounds: p.evidence, texts: [] }
    }
  };
}
