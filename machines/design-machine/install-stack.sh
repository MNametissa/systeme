#!/usr/bin/env bash
# Installe le NOYAU, et lui seul : dependances, tests, wrapper, skill.
# Echoue bruyamment (set -e) — une machine ne s'installe jamais cassee en
# silence. Idempotent : relancable sans casse.
#
# Le reste de la chaine (Impeccable, AccessLint, hook Stop, ordre de mise en
# route) est DOCUMENTE dans STACK.md, pas execute ici : chaque etape doit etre
# calibree avant d'etre cablee. `dm doctor` dit a tout moment ce qui manque.

set -euo pipefail
cd "$(dirname "$0")"

SKILLS_DIR="${CLAUDE_SKILLS_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude-mecid}/skills}"
BIN_DIR="${DM_BIN_DIR:-$HOME/.local/bin}"

echo "1/4 — dependances (puppeteer-core uniquement)"
npm install

echo "2/4 — tests"
npm test

echo "3/4 — wrapper $BIN_DIR/dm"
mkdir -p "$BIN_DIR"
printf '#!/usr/bin/env bash\nexec node "%s/bin/dm.mjs" "$@"\n' "$PWD" > "$BIN_DIR/dm"
chmod +x "$BIN_DIR/dm"

echo "4/4 — skill -> $SKILLS_DIR/design-machine"
mkdir -p "$SKILLS_DIR"
cp -r skill/design-machine "$SKILLS_DIR/"

echo
echo "Etat des preconditions (constat, pas un echec d'installation) :"
"$BIN_DIR/dm" doctor || true

echo
echo "Chaine complete (Impeccable, AccessLint, hook Stop) : voir STACK.md."
