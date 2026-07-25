# Spec — Système de production assistée

**Lecteur** : Marcel, et toute session Claude Code démarrant sur un de mes projets.
**Tâche du lecteur** : savoir quoi installer, quoi câbler, quoi construire, dans quel ordre.

## Le problème racine

La sortie d'un modèle ne distingue pas ce qui a été vérifié de ce qui a été
généré. Toutes les défaillances constatées en découlent : audits racontés
(15 % lu, 100 % affirmé), corrections en rond avec résidus, tests utilisés
comme détecteurs de résidus, documents qui ont la forme sans la substance,
fonctionnalités-théâtre (seuil configurable inopérant, gel cosmétique —
constatés sur stocktake), contexte perdu entre sessions.

## Les cinq couches (de la plus forte à la plus faible)

1. **Instruments** — interrogent le réel de façon exhaustive : ripgrep, AST,
   registre Odoo chargé (muk_mcp / odoo shell), SQL, git. La preuve vient
   d'ici, jamais du modèle (D-004).
2. **Substrat** — fichiers du dépôt qui portent l'état entre sessions :
   DECISIONS.md (l'indérivable, D-005), PLAN.md à cases, specs. Formats
   contraints (D-008).
3. **Portes** — scripts qui échouent, câblés en hooks Claude Code
   (PreToolUse / PostToolUse / Stop) et en CI. Jamais volontaires (D-013).
4. **Pipelines** — enchaînent les étapes du travail de population hors du
   modèle (D-006).
5. **Posture** — Superpowers (D-007). Les skills maison sont réduits à trois
   pièces d'une page (ci-dessous).

## Adopté (à installer, pas à écrire)

| Outil | Rôle | Décision |
|---|---|---|
| Hooks Claude Code | portes câblées au cycle de l'agent | D-013 |
| Superpowers | posture : plan, TDD rouge-vert, cause racine avant correctif | D-007 |
| spec-kit (ou sa forme) | spec → plan → tâches, artefacts chaînés | D-008 |
| muk_mcp | introspection du registre Odoo résolu | D-009 |
| context7 | docs de bibliothèques à jour (Next.js, React…) | D-010 |
| PostgreSQL MCP | lecture directe des données | D-010 |

## À construire en propre (introuvable ailleurs)

Trois pièces, une page chacune, français courant, chacune finit par une
commande (D-015) :

- **Aiguillage** → `02_SPEC_AIGUILLAGE.md`
- **Fermeture de populations** → `03_SPEC_FERMETURE_POPULATIONS.md`
- **Mémoire des décisions** → `04_SPEC_MEMOIRE_DECISIONS.md`

Plus un protocole (pas un outil) : **l'audit adverse par tranche** →
`05_PROTOCOLE_AUDIT_ADVERSE.md` (D-011).

## Invariants du système lui-même

1. Aucune affirmation de couverture sans décompte d'instrument (D-004).
2. Aucun état uniquement en contexte : ce qui doit survivre est dans un
   fichier du dépôt avant la fin de session (D-005).
3. Aucune porte volontaire (D-013).
4. Aucune surface sans son moteur dans la même tranche (D-012, à éprouver).
5. La discipline est la même pour code, document, spec, traduction ; seuls
   les instruments changent (D-014).

## Ordre d'application

1. Essai témoin sur stocktake (`06_ESSAI_TEMOIN.md`) — éprouve D-007, D-013,
   la fermeture de population, sans rien construire de plus.
2. Selon verdict : câblage définitif (hooks + CI) sur stocktake, puis BAO.
3. muk_mcp évalué sur une instance de dev BAO (jamais prod d'abord).
4. Les trois pièces propres, écrites après l'essai, calibrées par ses
   constats.

## Critère d'acceptation du système

Sur trois tranches réelles consécutives : zéro défaut de la classe « théâtre »
découvert par le client ou après clôture de tranche ; tout résidu de
correction répétitive attrapé par différence d'ensembles avant les tests,
jamais par les tests.
