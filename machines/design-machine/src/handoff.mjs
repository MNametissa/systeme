// Livrable AUTONOME pour un agent (ou un humain) qui n'a pas la machine :
// un seul Markdown auto-suffisant — contrat lisible, variables CSS embarquees,
// grammaire, intention, regles d'usage. Rien a installer, rien a regenerer.
//
// C'est un INSTANTANE derive : la verite reste tokens.json chez l'emetteur.
// Le document le dit, avec sa date et l'empreinte du contrat — pour que la
// divergence soit detectable, jamais silencieuse.

import { createHash } from 'node:crypto';
import { renderMaster, renderCss } from './render.mjs';

export function renderHandoff({ tokens, northStar = null, notes = null }) {
  const empreinte = createHash('sha256').update(JSON.stringify(tokens)).digest('hex').slice(0, 12);
  const l = [];

  l.push('# Design — dossier de transmission');
  l.push('');
  l.push(`> INSTANTANE derive le ${new Date().toISOString()} — empreinte du contrat \`${empreinte}\`.`);
  l.push('> La source de verite reste le \`tokens.json\` du projet emetteur : ne pas');
  l.push('> editer ce document, demander un nouveau dossier si le design evolue.');
  l.push('');

  l.push('## Intention (Creative North Star)');
  l.push('');
  l.push(northStar ? `« ${northStar} »` : '**Non fournie** — la demander avant tout choix de composition.');
  l.push('');

  l.push('## Regles d\'usage — pour l\'agent qui consomme ce dossier');
  l.push('');
  l.push('1. Les variables CSS ci-dessous sont le SEUL vocabulaire autorise :');
  l.push('   aucune couleur, taille, rayon ou duree en dur.');
  l.push('2. Une valeur manquante ne s\'invente pas : la signaler et demander.');
  l.push('3. La grammaire (plus bas) prime sur ton gout par defaut ; l\'intention');
  l.push('   arbitre ce que la grammaire ne tranche pas.');
  l.push('4. Les polices listees peuvent etre sous licence : verifier avant usage.');
  l.push('');

  l.push('---');
  l.push('');
  l.push(renderMaster(tokens));
  l.push('');

  if (notes) {
    l.push('---');
    l.push('');
    l.push(notes.trim());
    l.push('');
  }

  l.push('---');
  l.push('');
  l.push('## tokens.css — a copier tel quel dans le projet');
  l.push('');
  l.push('```css');
  l.push(renderCss(tokens));
  l.push('```');
  l.push('');
  return l.join('\n');
}
