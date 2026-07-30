// Import / export d'un design : UN fichier JSON portable qui transporte
// l'INDERIVABLE seulement — le contrat (tokens.json, provenance comprise),
// les sources mesurees (les preuves), le North Star (l'intention humaine).
// Les derives (MASTER.md, tokens.css, DESIGN.md) se REGENERENT a l'import :
// deux verites divergeraient en silence si on les transportait.
//
// La somme de controle protege le transport ; un contrat existant ne
// s'ecrase jamais sans --force.

import { createHash } from 'node:crypto';
import { renderMaster, renderCss } from './render.mjs';
import { renderDesignMd, renderDesignJson } from './designmd.mjs';

export const PACK_FORMAT = 'design-machine/pack';
export const PACK_VERSION = 1;

const sha = payload => createHash('sha256').update(JSON.stringify(payload)).digest('hex');

export function buildPack({ tokens, sources = [], northStar = null }) {
  if (!tokens) throw new Error('Aucun contrat (tokens.json) — rien a exporter.');
  const payload = { tokens, sources, northStar };
  return {
    format: PACK_FORMAT,
    version: PACK_VERSION,
    packedAt: new Date().toISOString(),
    checksum: sha(payload),
    ...payload
  };
}

// Pur : valide le paquet et retourne la liste des fichiers a ecrire.
export function applyPack(pack) {
  if (pack?.format !== PACK_FORMAT) {
    throw new Error(`Format inconnu : ${pack?.format ?? 'aucun'} — attendu ${PACK_FORMAT}.`);
  }
  if (pack.version !== PACK_VERSION) {
    throw new Error(`Version de paquet ${pack.version} non geree (machine en v${PACK_VERSION}).`);
  }
  const { tokens, sources = [], northStar = null } = pack;
  if (sha({ tokens, sources, northStar }) !== pack.checksum) {
    throw new Error('Somme de controle invalide : paquet altere ou tronque — import refuse.');
  }

  const files = [];
  const warnings = [];
  for (const s of sources) {
    if (!s.label) { warnings.push('source sans label ignoree'); continue; }
    files.push({ path: `sources/${s.label}.json`, content: JSON.stringify(s, null, 2) });
  }
  if (!sources.length) warnings.push('paquet sans sources : contrat transporte sans ses preuves');

  files.push({ path: 'design-system/tokens.json', content: JSON.stringify(tokens, null, 2) });
  files.push({ path: 'design-system/MASTER.md', content: renderMaster(tokens) });
  files.push({ path: 'design-system/tokens.css', content: renderCss(tokens) });
  if (northStar) {
    files.push({ path: 'DESIGN.md', content: renderDesignMd(tokens, { northStar }) });
    files.push({ path: '.impeccable/design.json', content: JSON.stringify(renderDesignJson(tokens, { northStar }), null, 2) });
  } else {
    warnings.push('pas de North Star dans le paquet : DESIGN.md non regenere');
  }
  return { files, warnings };
}
