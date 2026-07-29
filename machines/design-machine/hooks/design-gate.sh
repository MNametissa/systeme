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

# Porte statique d'abord : rapide, sans navigateur, couvre aussi les projets
# sans serveur de dev (Flutter, natif). Code 2 (aucun fichier) = silencieux.
LINT_OUT="$($DM lint . 2>&1)"
if [ $? -eq 1 ]; then
  {
    echo "$LINT_OUT"
    echo ""
    echo "Consommer les tokens (tokens.css / tokens.ts / tokens.dart)."
    echo "Un litteral assume se marque dm-lint-ignore sur sa ligne, avec sa raison."
  } >&2
  exit 2
fi

# Identite du serveur : ne JAMAIS juger le rendu d'un autre projet. Le port
# par defaut est partage entre tous les projets de la machine — on exige que
# le processus qui ecoute ait son cwd dans CE projet. Une DM_DEV_URL declaree
# est souveraine (une declaration est un fait). Identite improuvable (pas de
# lsof, conteneur) : silence — ne pas pouvoir identifier n'autorise pas a juger.
if [ -z "${DM_DEV_URL:-}" ]; then
  PORT="${DEV_URL##*:}"; PORT="${PORT%%/*}"
  MATCH=0
  for pid in $(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null); do
    case "$(readlink "/proc/$pid/cwd" 2>/dev/null)" in
      "$PWD"|"$PWD"/*) MATCH=1 ;;
    esac
  done
  [ "$MATCH" -eq 1 ] || exit 0
fi

# Serveur eteint : la porte rendue ne peut pas tourner, sortie silencieuse.
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
