import { LAYERS } from './normalize.mjs';

// Une couche vient d'une seule source. C'est la regle qui empeche le collage.
// Toute tentative de composer au niveau composant est refusee : un composant
// est une intersection de couches, pas une dimension.

const FORBIDDEN = ['component', 'components', 'hero', 'card', 'nav', 'header', 'footer'];

// Le volet sombre est une variante de la palette, pas une sixieme couche :
// il est optionnel, et sa source peut differer de celle du clair.
const VARIANTS = ['paletteDark'];

export function parseMap(str) {
  const map = {};
  for (const pair of String(str).split(',')) {
    const [layer, src] = pair.split('=').map(s => s && s.trim());
    if (!layer || !src) throw new Error(`Paire invalide : "${pair}". Attendu couche=source.`);
    if (FORBIDDEN.includes(layer.toLowerCase())) {
      throw new Error(
        `"${layer}" n'est pas une couche mais une intersection de couches. ` +
        `Composables : ${LAYERS.join(', ')}.`
      );
    }
    if (!LAYERS.includes(layer) && !VARIANTS.includes(layer)) {
      throw new Error(`Couche inconnue "${layer}". Attendu : ${[...LAYERS, ...VARIANTS].join(', ')}.`);
    }
    map[layer] = src;
  }
  return map;
}

export function merge(sources, map) {
  const bySource = Object.fromEntries(sources.map(s => [s.label, s]));
  const missingLayer = LAYERS.filter(l => !map[l]);
  if (missingLayer.length) {
    throw new Error(`Couches non affectees : ${missingLayer.join(', ')}. Chaque couche exige une source.`);
  }

  const out = { generatedAt: new Date().toISOString(), provenance: {}, warnings: [] };

  for (const layer of LAYERS) {
    const label = map[layer];
    const src = bySource[label];
    if (!src) throw new Error(`Source "${label}" absente. Disponibles : ${Object.keys(bySource).join(', ') || 'aucune'}.`);
    out[layer] = structuredClone(src[layer]);
    out.provenance[layer] = { source: label, url: src.url, title: src.title };
  }

  if (map.paletteDark) {
    const src = bySource[map.paletteDark];
    if (!src) throw new Error(`Source "${map.paletteDark}" absente. Disponibles : ${Object.keys(bySource).join(', ') || 'aucune'}.`);
    out.paletteDark = structuredClone(src.palette);
    out.provenance.paletteDark = { source: map.paletteDark, url: src.url, title: src.title };
  }

  const used = new Set(Object.values(map));
  if (used.size > 3) {
    out.warnings.push(`${used.size} sources melangees. Au-dela de 3, aucune couche ne domine assez pour produire une identite.`);
  }

  // Alerte licence : toute famille non systeme est une police sous licence
  // tant que tu n'as pas prouve le contraire.
  const SYSTEM = /^(-apple-system|BlinkMacSystemFont|Segoe UI|system-ui|ui-sans-serif|ui-serif|ui-monospace|sans-serif|serif|monospace|Arial|Helvetica|Times|Georgia|Courier)/i;
  const suspect = (out.typography.families || [])
    .map(f => f.primary)
    .filter(name => name && !SYSTEM.test(name));

  if (suspect.length) {
    out.warnings.push(
      `Polices a verifier avant usage client : ${suspect.join(', ')}. ` +
      `Extraire un nom de famille ne confere aucune licence.`
    );
  }
  out.typography.licenceReview = suspect;

  return out;
}
