#!/usr/bin/env bash
# Installe le skill de session — lien symbolique vers la copie canonique du
# dépôt (jamais de copie qui dérive), au bon profil (~/.claude-mecid, D11/R9).
# Idempotent : relancer ne change rien.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
PROFIL="${CLAUDE_PROFIL:-$HOME/.claude-mecid}"

mkdir -p "$PROFIL/skills"
ln -sfn "$ICI/skill" "$PROFIL/skills/machine-redaction"
echo "skill installé : $PROFIL/skills/machine-redaction -> $ICI/skill"

python3 "$ICI/instruments/doctor.py" --racine "$ICI"
