#!/usr/bin/env bash
# baseline_reprises.sh — extrait d'un historique git les nombres comparables
# exigés par l'essai témoin (D-018). Prédicats sur les sujets de commit,
# écrits ici, exécutés par git/grep — jamais estimés de tête (D-004).
#
# Usage : baseline_reprises.sh <chemin-du-depot>
set -euo pipefail
REPO="${1:?usage: baseline_reprises.sh <depot>}"
cd "$REPO"

REPRISE='^(fix|correctif|hotfix)|r[eé]sidu|r[eé]gression|oubli'
THEATRE='th[eé][aâ]tre|cosm[eé]tique|factice|inop[eé]rant|ne v[eé]rifiait rien'
CLIENT='remarque'

total=$(git log --oneline | wc -l)
sujets=$(git log --format='%s')

n_reprise=$(echo "$sujets" | grep -icE "$REPRISE" || true)
n_theatre=$(echo "$sujets" | grep -icE "$THEATRE" || true)
n_client=$(echo "$sujets" | grep -icE "$CLIENT" || true)
remarques=$(echo "$sujets" | grep -ioE "remarque[^#]*#[0-9]+" | grep -oE "[0-9]+" | sort -un | tr '\n' ' ')

echo "Dépôt        : $REPO ($total commits)"
echo "Reprises     : $n_reprise commits ($(( n_reprise * 100 / total ))%)  [prédicat: $REPRISE]"
echo "Théâtre      : $n_theatre commits  [prédicat: $THEATRE]"
echo "Remarques client citées : $n_client commits — numéros distincts : ${remarques:-aucun}"
echo
echo "Fichiers les plus repris (dans les commits 'reprise') :"
git log --format='%H %s' | while read -r h s; do
    echo "$s" | grep -qiE "$REPRISE" && git show --format= --name-only "$h"
  done | grep -v '^$' | sort | uniq -c | sort -rn | head -10

echo
echo "Détail des commits 'théâtre' :"
echo "$sujets" | grep -iE "$THEATRE" | sed 's/^/  - /' || echo "  (aucun)"
