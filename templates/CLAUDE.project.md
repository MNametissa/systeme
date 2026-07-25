# Instructions permanentes de ce projet

Tu travailles sur un projet qui suit un système précis. Ces règles ne sont pas
des préférences : elles sont nées de défaillances constatées et documentées
(`.systeme/analyses/`). Les enfreindre reproduit ces défaillances.

## Avant tout travail

1. Lis `DECISIONS.md` et `PLAN.md` (le hook te les donne ; sinon, lis-les).
   Toute proposition contraire à une décision `active` doit citer son ID et
   argumenter le renversement — jamais l'ignorer.
2. Aiguille la demande — trois questions, preuves d'instrument à l'appui :
   réversible ? local ? hors production ? Trois oui = piste courte (faire +
   porte). Un non = piste complète (spec, impact, tranches, audit de sortie).
   Une question sans preuve compte comme un non.

## Pendant le travail

- **Aucune affirmation de couverture sans décompte d'instrument.** « J'ai tout
  vérifié » n'existe pas ; « l'instrument liste 26 sites, en voici le
  jugement » existe. Si aucun instrument ne peut fermer la population,
  construis l'instrument d'abord ou dis que le travail est du jugement.
- **Travail répétitif** (bug multi-sites, traduction, migration, conformité) :
  population fermée AVANT le premier correctif, delta publié AVANT les tests.
  Les tests valident ; ils ne détectent pas les résidus.
- **Moteur avant surface** : jamais d'écran, de vue ou de document de façade
  dont le mécanisme n'existe pas encore dans la même tranche. Un paramètre
  configurable doit être prouvé effectif (le changer change le comportement).
- **Réutilise avant d'écrire** : natif du framework → existant du projet →
  bibliothèque éprouvée → code neuf, la charge de la preuve augmentant à
  chaque descente. Vérifie par instrument (context7 pour les libs, registre
  chargé pour Odoo), pas de mémoire.
- **Documents** : base de faits extraite du réel d'abord ; lecteur et tâche
  nommés ; n'affirme rien qui ne soit dans la base. Un document est bon si un
  contexte neuf l'exécute sans deviner.
- Toute affirmation sur un outil, une version, une API : vérifie (docs,
  context7, essai) au lieu de générer une réponse plausible.

## Avant de clore

- La porte (`make check`) doit passer — le hook la lance, ne la contourne
  jamais (`--no-verify` interdit).
- Toute décision structurante prise en session (outil, architecture,
  convention, rejet d'une approche) a sa ligne dans `DECISIONS.md` — sinon
  elle meurt avec la session.
- Coche l'état réel dans `PLAN.md` : les cases sont le journal de reprise de
  la prochaine session, pas une formalité.
- Ne déclare jamais « fini » ce qui n'a pas passé la porte ; un delta de
  population non nul = pas fini, quels que soient les tests.

## Détails et raisons

Specs complètes dans `.systeme/specs/`, autopsie des échecs précédents dans
`.systeme/analyses/`. En cas de conflit entre ces instructions et une spec,
la spec fait foi et le conflit se signale.
