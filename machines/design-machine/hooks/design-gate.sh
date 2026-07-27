#!/usr/bin/env bash
# Porte unifiee. A cabler en Stop (fin de tour), pas en PostToolUse : lancer
# Chromium a chaque ecriture de fichier rend la porte insupportable, et une
# porte insupportable finit desactivee.
#
# Principe : ne jamais bloquer sur une baseline absente ou un serveur eteint.

set -uo pipefail

DEV_URL="${DM_DEV_URL:-http://localhost:3000}"
MASTER="${DM_MASTER:-design-system/tokens.json}"
DM="${DM_BIN:-dm}"

# Rien a verifier tant que le contrat n'existe pas.
[ -f "$MASTER" ] || exit 0

# Serveur eteint : sortie silencieuse.
if ! curl -sSf -o /dev/null --max-time 2 "$DEV_URL" 2>/dev/null; then
  exit 0
fi

REPORT="$($DM gate "$DEV_URL" --master "$MASTER" 2>&1)"
STATUS=$?

[ $STATUS -eq 0 ] && exit 0

# Code 2 : Claude Code renvoie stderr a l'agent, qui corrige dans la foulee.
{
  echo "$REPORT"
  echo ""
  echo "Corriger avec les variables de design-system/tokens.css."
  echo "Si la derive est voulue, regenerer le MASTER — ne pas contourner la porte."
} >&2
exit 2
