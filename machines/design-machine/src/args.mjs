// Parseur d'arguments de la CLI. Un drapeau booleen ne consomme pas le token
// suivant ; un drapeau a valeur si. Sans cette distinction, le positionnel
// place apres un booleen (`dm gate --json <url>`) disparaissait et la commande
// retombait sur sa cible par defaut.

export const BOOL_FLAGS = new Set(['headed', 'json', 'warn-only', 'no-impeccable', 'dry-run', 'motion', 'full-page', 'mobile']);

export function parseArgs(tokens, boolFlags = BOOL_FLAGS) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t.startsWith('--')) { positional.push(t); continue; }
    const name = t.slice(2);
    if (boolFlags.has(name)) { flags[name] = true; continue; }
    const next = tokens[i + 1];
    if (next !== undefined && !next.startsWith('--')) { flags[name] = next; i++; }
    else flags[name] = true;
  }
  return { flags, positional };
}
