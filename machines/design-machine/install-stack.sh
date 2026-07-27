#!/usr/bin/env bash
# Installe la stack decrite dans STACK.md.
#
#   ./install-stack.sh              # affiche ce qui serait fait, ne touche a rien
#   ./install-stack.sh --apply      # execute
#   ./install-stack.sh --apply --minimal   # noyau seul, sans skills externes
#
# Idempotent : relancable sans casse.

set -uo pipefail
cd "$(dirname "$0")"

APPLY=0; MINIMAL=0
for a in "$@"; do
  case "$a" in
    --apply) APPLY=1 ;;
    --minimal) MINIMAL=1 ;;
    *) echo "option inconnue : $a"; exit 2 ;;
  esac
done

# Les sessions tournent sur le profil mecid, pas sur ~/.claude.
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude-mecid/skills}"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
step() { printf '  %s\n' "$*"; }
run()  {
  if [ "$APPLY" -eq 1 ]; then
    step "\$ $*"
    "$@" || { printf '  \033[31mechec\033[0m — etape ignoree, la suite continue\n'; return 0; }
  else
    step "\$ $*"
  fi
}

[ "$APPLY" -eq 0 ] && printf '\n\033[33mMode simulation.\033[0m Relance avec --apply pour executer.\n'

# ---------------------------------------------------------------- 0. runtime
say "0 — runtime"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  step "Node $NODE_MAJOR detecte. Il en faut 20 minimum. Arret."
  exit 1
fi
step "Node $NODE_MAJOR — ok"

CHROME=""
for p in "${CHROME_PATH:-}" /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome /usr/bin/google-chrome-stable /snap/bin/chromium; do
  [ -n "$p" ] && [ -x "$p" ] && { CHROME="$p"; break; }
done
if [ -z "$CHROME" ]; then
  step "Aucun Chromium trouve."
  step "  sudo apt install chromium    (ou export CHROME_PATH=...)"
else
  step "Chromium : $CHROME"
fi

# ------------------------------------------------------- 1. design-machine
say "1 — design-machine (noyau, requis)"
run npm install
run npm test
run npm link
run mkdir -p "$SKILLS_DIR"
run cp -r skill/design-machine "$SKILLS_DIR/"
step "Reste a faire a la main :"
step "  fusionner hooks/settings.snippet.json dans .claude/settings.json"
step "  ajouter templates/CLAUDE.snippet.md au CLAUDE.md du projet"

if [ "$MINIMAL" -eq 1 ]; then
  say "Mode minimal — les skills externes sont sautes."
  step "La machine est complete. dm gate fonctionnera avec une seule etape."
  exit 0
fi

# ---------------------------------------------------------- 2. Impeccable
say "2 — Impeccable (moteur de gout + detecteur)"
step "Deux niveaux, choisir :"
step "  npx impeccable detect .     -> detecteur seul, rien d'installe"
step "  npx impeccable install      -> + le skill et ses 23 commandes"
step ""
step "NE PAS installer frontend-design a cote : meme couche, directives concurrentes."
if [ "$APPLY" -eq 1 ]; then
  if [ -f design-system/tokens.json ]; then
    run node bin/dm.mjs waivers
  else
    step "design-system/tokens.json absent — lancer 'dm waivers' apres le premier merge."
  fi
fi

# ---------------------------------------------------------- 3. AccessLint
say "3 — AccessLint (porte d'accessibilite)"
step "claude plugin marketplace add accesslint/skills"
step "claude plugin install accesslint@accesslint"
step ""
step "Verifier les noms exacts via /plugin : le depot a ete restructure recemment."
step "Seul 'diff' porte la valeur — scan et audit se recouvrent avec lui."

# -------------------------------------------------------------- 4. Vercel
say "4 — Vercel agent-skills (patterns React)"
step "npx skills add vercel-labs/agent-skills"
step ""
step "A retirer ensuite — 4 descriptions chargees pour rien :"
step "  react-native-guidelines  writing-guidelines"
step "  vercel-deploy-claimable  vercel-optimize"
step "A garder : react-best-practices, composition-patterns"

# ------------------------------------------------------------- 5. securite
say "5 — audit"
step "uvx mcp-scan@latest --skills"

say "Ordre de mise en route"
step "1. npm test                        la machine tourne"
step "2. dm extract <site connu>         l'extraction dit-elle vrai ?"
step "3. dm merge puis lire MASTER.md    le contrat tient-il debout ?"
step "4. dm verify a la main             la porte est-elle juste ?"
step "5. seulement la : cabler le hook"
printf '\n'
