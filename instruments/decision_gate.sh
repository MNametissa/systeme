#!/usr/bin/env bash
# decision_gate.sh — bloque la clôture de session si des chemins structurants
# ont changé sans que DECISIONS.md ait bougé. Remplace la « question directe à
# la session » (spec 04) : demander au processus qui affabule de se certifier
# était l'anti-pattern que le système dénonce. Ici : détection mécanique.
#
# Limite documentée : ne voit que l'arbre de travail (git status). Un
# changement structurant déjà commité dans la même session passe — la CI
# reste le dernier verrou. Une décision purement orale reste invisible.
set -euo pipefail

STRUCTURANTS='^(Makefile|\.claude/|\.specify/|bootstrap\.sh|specs/|instruments/|pyproject\.toml|package\.json|.*__manifest__\.py|Dockerfile|docker-compose)'

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
CHANGES=$(git status --porcelain | awk '{print $NF}')
[ -n "$CHANGES" ] || exit 0
echo "$CHANGES" | grep -qE "$STRUCTURANTS" || exit 0
echo "$CHANGES" | grep -q "DECISIONS.md" && exit 0

echo "PORTE (decision_gate) : chemins structurants modifiés sans entrée au journal :" >&2
echo "$CHANGES" | grep -E "$STRUCTURANTS" | sed 's/^/  - /' >&2
echo "Écrire la décision dans DECISIONS.md (D-002, D-013) ou annuler le changement." >&2
exit 2
