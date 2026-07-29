# design-machine — défauts relevés (2026-07-27)

Source : `~/Documents/Personnels/design-machine.zip`, 21 fichiers, 26 tests verts.
Chaque entrée « prouvé » a été exécutée, pas déduite.

**Corrigés le 2026-07-27** (session d'exhumation) : D1, D2, D3, D5, D7, D8, D11,
D12 — code dans `machines/design-machine/`, scénarios rejoués avec comportement
inverse. **Le 2026-07-29** : D4 (D-033, AccessLint installé), D9/D10
(install-stack réécrit), D13 (noms AccessLint et CLI Impeccable revérifiés sur
pièces). Reste ouvert : D6 seul (niveau composant — se ferme par la section 05
depuis le code du projet, quand un rendu satisfait).

## Bloquants — la machine ment sans le dire

- [x] **D1. Maille d'espacement dégénérée** *(prouvé — corrigé)* — `spaceUnit`
      votait sur les hits bruts ; les petites unités gagnaient mécaniquement.
      Maille 8 + `10px` → `unit 2, coverage 1.00`. Corrigé : la maille est la
      PLUS GRANDE unité couvrant ≥ 0.8 des valeurs, repli sur le meilleur score
      avec couverture avouée. **Le correctif suggéré ici (score = hits × u)
      était lui-même faux** : sur `[8,16,24,48,96]`, 3 hits × 16 = 48 > 5 × 8 =
      40 — il élisait une maille 16 avec couverture 0.6 (prouvé par la fixture
      siteA). Mode d'échec documenté aux limites du README.
- [x] **D2. `dm gate --json <url>` vérifie la mauvaise page** *(prouvé — corrigé)*
      — le parseur excluait tout positionnel précédé d'un flag et retombait sur
      `localhost:3000`. Corrigé : `src/args.mjs`, drapeaux booléens distingués
      des drapeaux à valeur, sans `indexOf`. Rejoué en réel : `gate --json <url>`
      vérifie l'url passée.
- [x] **D3. La porte ne peut jamais échouer fermée** *(corrigé)* — toute erreur
      devenait `skip` → porte ouverte. Corrigé : statut `error` distinct, une
      panne ferme (`PORTE FERMÉE`, code 1, marque `PANNE`), seul l'outil absent
      reste un `skip`. Rejoué en réel sur tokens.json corrompu. → D-030.

## Conception

- [ ] **D4. Aucun contraste ni accessibilité dans le verdict** — la porte vérifie
      la conformité au contrat, jamais que le contrat est utilisable. Extraire
      d'un site à faible contraste fait hériter du défaut, et la porte le bénit.
      AccessLint est hors `dm gate`.
- [x] **D5. Câblage du hook intenable** *(corrigé)* — snippet déplacé de
      `PostToolUse` vers `Stop` ; commentaire du hook aligné. → D-030.
- [ ] **D6. Le MASTER ne contraint rien au niveau composant** — section Components
      vide (refus assumé, honnête). Un écran peut être 100 % conforme et laid.
- [x] **D7. `--no-sandbox` sur des URL tierces** *(corrigé)* — bac à sable actif
      par défaut, `DM_NO_SANDBOX=1` réservé aux conteneurs. Extraction vérifiée
      sandbox actif sur cette machine.

## Installation

- [x] **D8. Trois chemins d'installation contradictoires** *(corrigé)* — un seul
      chemin : wrapper `~/.local/bin/dm` vers la copie canonique du dépôt
      (`machines/design-machine/`), hook par défaut `dm` du PATH (surcharge
      `DM_BIN`), README aligné. → D-029.
- [x] **D9. `install-stack.sh` n'installe que l'étape 1** *(corrigé 2026-07-29)*
      — réécrit en script honnête : 4 gestes réels (deps, tests, wrapper, skill),
      les étapes 2-5 explicitement déléguées à STACK.md (calibrer avant de
      câbler) et `dm doctor` en constat final. Éprouvé en réel.
- [x] **D10. `run()` avale les échecs** *(corrigé 2026-07-29)* — `set -euo
      pipefail` : tout échec interrompt bruyamment. La classe « s'installe
      cassée en silence » est fermée aux deux bouts (install + doctor).
- [x] **D11. Skill copié dans le mauvais profil** *(corrigé)* — `SKILLS_DIR` par
      défaut `~/.claude-mecid/skills` ; skill réécrit (intake des entrées :
      intention, sites de référence, affectation couche→source, contraintes) et
      installé — chargé par la session dès l'installation, vérifié.

## Documentation

- [x] **D12. README annonce 17 tests** *(prouvé — corrigé)* : 32 réels après
      les 6 tests des correctifs, README aligné.
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
