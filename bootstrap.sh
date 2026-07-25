#!/usr/bin/env bash
# bootstrap.sh — démarre un projet sur mon socle système. Remplace cmar-bootstrap.
#
#   bootstrap.sh <nom-projet>          # crée le dossier à côté
#   bootstrap.sh .                     # dans un dossier existant
#
# SYSTEME_SRC : chemin de ce dépôt (défaut : dossier de ce script).
set -euo pipefail

PROJET="${1:?usage: bootstrap.sh <nom-projet|.>}"
SYSTEME_SRC="${SYSTEME_SRC:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

[ "$PROJET" != "." ] && { mkdir -p "$PROJET"; cd "$PROJET"; }
[ -d .git ] || git init -q

# 1. spec-kit — averti si absent, ne casse pas le reste
if command -v specify >/dev/null 2>&1; then
  [ -d .specify ] || specify init . --integration claude || \
    echo "AVERTISSEMENT : specify init a échoué — vérifier les flags (specify init --help)."
else
  echo "AVERTISSEMENT : specify absent. Installer : uv tool install specify-cli"
fi

# 2. Le socle système (specs + instruments), sans écraser l'existant
if [ ! -d .systeme ]; then
  mkdir -p .systeme
  cp -r "$SYSTEME_SRC/specs" "$SYSTEME_SRC/analyses" "$SYSTEME_SRC/instruments" .systeme/
fi
[ -f CLAUDE.md ] || cp "$SYSTEME_SRC/templates/CLAUDE.project.md" CLAUDE.md

# 3. Journal des décisions vierge, format hérité
if [ ! -f DECISIONS.md ]; then
  cat > DECISIONS.md <<'EOF'
# Journal des décisions

Statuts : active · à éprouver · renversée par D-xxx · caduque.
Une décision renversée change de statut, ne disparaît jamais.

| ID | Date | Décision | Motif | Statut | Condition de renversement |
|---|---|---|---|---|---|
EOF
fi

# 4. PLAN.md — le journal de reprise à cases, lu par le hook SessionStart
if [ ! -f PLAN.md ]; then
  cat > PLAN.md <<'EOF'
# Plan — journal de reprise

Les cases sont l'état réel du travail : la session suivante reprend ici.
Une tranche = moteur avant surface, finit sur la porte.

- [ ] (aucune tranche définie — passer par /speckit.tasks)
EOF
fi

# 5. La porte existe dès le commit 1, même triviale
[ -f Makefile ] || printf 'check:\n\ttrue\n' > Makefile

# 6. Câblage des hooks — lecture d'état au démarrage, porte à la clôture
mkdir -p .claude
if [ ! -f .claude/settings.json ]; then
  cat > .claude/settings.json <<'EOF'
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command",
      "command": "cat DECISIONS.md PLAN.md 2>/dev/null; true"}]}],
    "Stop": [{"hooks": [{"type": "command",
      "command": "make check || exit 2; bash .systeme/instruments/decision_gate.sh || exit 2"}]}]
  }
}
EOF
else
  echo "AVERTISSEMENT : .claude/settings.json existe — câbler les hooks à la main."
fi

git add -A
git commit -qm "bootstrap: socle système (journal, porte, hooks, specs)" || true

echo "OK : $(pwd)"
echo "Suivant, en session Claude Code :"
echo "  1. /speckit.specify   — le quoi/pourquoi, invariants en français courant"
echo "  2. reconnaissance par instruments AVANT le plan (échelle de réutilisation)"
echo "  3. /speckit.plan      — chaque choix structurant => une ligne de DECISIONS.md"
echo "  4. /speckit.tasks     — tranches moteur-avant-surface"
