# design-machine — défauts relevés (2026-07-27)

Source : `~/Documents/Personnels/design-machine.zip`, 21 fichiers, 26 tests verts.
Chaque entrée « prouvé » a été exécutée, pas déduite.

## Bloquants — la machine ment sans le dire

- [ ] **D1. Maille d'espacement dégénérée** *(prouvé)* — `spaceUnit` vote sur
      `[2,4,5,6,8,10,12,16]` ; tout multiple de 8 étant multiple de 2 et 4, les
      petites unités gagnent mécaniquement. Maille 8 pure → `unit 8` ; la même
      + `10px`/`14px` → `unit 2, coverage 1.00`. La couverture est MAXIMALE quand
      la réponse est vide de sens. Correctif : pondérer par la taille de l'unité
      (score = hits × u) ou voter sur les paliers, pas sur les valeurs brutes.
      Et ajouter ce mode d'échec aux limites du README.
- [ ] **D2. `dm gate --json <url>` vérifie la mauvaise page** *(prouvé)* — le
      parseur exclut tout positionnel précédé d'un flag : `["gate","--json",url]`
      → `positional = []` → retombe sur `localhost:3000` et rend CONFORME sur une
      autre cible. Correctif : parseur d'arguments qui distingue drapeaux
      booléens et drapeaux à valeur (`indexOf` casse aussi sur valeurs répétées).
- [ ] **D3. La porte ne peut jamais échouer fermée** — dans `bin/dm.mjs`, toute
      erreur devient `skip` : tokens.json corrompu, `capture()` qui lève, page en
      erreur, timeout → PORTE OUVERTE. « Une étape absente ne ferme pas la porte »
      vaut pour un outil absent, pas pour une panne. Séparer `skip` (outil absent)
      de `error` (panne) — l'erreur doit fermer.

## Conception

- [ ] **D4. Aucun contraste ni accessibilité dans le verdict** — la porte vérifie
      la conformité au contrat, jamais que le contrat est utilisable. Extraire
      d'un site à faible contraste fait hériter du défaut, et la porte le bénit.
      AccessLint est hors `dm gate`.
- [ ] **D5. Câblage du hook intenable** — `PostToolUse` sur `Edit|Write|MultiEdit`
      lance Chromium à chaque écriture de fichier (chargement + déroulé complet +
      styles calculés). Le README dit « une porte insupportable finit désactivée »
      et livre ce câblage. Déplacer en `Stop` ou pre-commit.
- [ ] **D6. Le MASTER ne contraint rien au niveau composant** — section Components
      vide (refus assumé, honnête). Un écran peut être 100 % conforme et laid.
- [ ] **D7. `--no-sandbox` sur des URL tierces** — `extract.mjs` désactive le bac
      à sable alors que le cas d'usage central est d'ouvrir des sites arbitraires.

## Installation

- [ ] **D8. Trois chemins d'installation contradictoires** — README `npm link` ·
      snippet de hook `$CLAUDE_PROJECT_DIR/node_modules/design-machine/...` ·
      hook `npx --no-install dm`. Au moins deux échouent.
- [ ] **D9. `install-stack.sh` n'installe que l'étape 1** — les sections 2 à 5
      (Impeccable, AccessLint, Vercel, audit) n'appellent que `step` = `printf`.
      Même avec `--apply`, rien ne s'exécute. Le nom promet plus que le fichier.
- [ ] **D10. `run()` avale les échecs** (`|| return 0`) — un `npm test` rouge
      n'interrompt pas l'installation : la machine s'installe cassée en silence.
- [ ] **D11. Skill copié dans le mauvais profil** — `SKILLS_DIR` par défaut
      `~/.claude/skills`, alors que les sessions tournent sur `~/.claude-mecid/skills`.

## Documentation

- [ ] **D12. README annonce 17 tests, il y en a 26** *(prouvé)*.
- [ ] **D13. Dépendances externes non vérifiées** — `impeccable ignores add-value`
      (sous-commande supposée) ; AccessLint (STACK.md admet que les noms ont bougé) ;
      flag Vercel `--skill` (documenté ailleurs, pas sur ce dépôt).

## Limites documentées — correctes, à connaître

Viewport unique · état au repos seulement · mode sombre non séparé · pas d'OKLCH ·
surface des fonds comptée avec recouvrement (donc le seuil de 2 % est arbitraire) ·
avertissement au-delà de 3 sources.

## Ce qui est bon, à ne pas casser en corrigeant

Le même collecteur sert à extraire ET à vérifier (contrat opposable) · fonds
pondérés par surface, typo par volume de texte · une couche = une source, avec
refus explicite des composants · refus assumés : Components vide, North Star
jamais inventé, alerte de licence sur les polices.
