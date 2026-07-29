---
name: design-machine
description: Machine de design — extraire des tokens de sites réels, composer un système (MASTER, tokens.css), vérifier tout rendu contre ce contrat. Déclencher sur toute demande de création ou refonte d'interface (écran, page, composant, landing, dashboard), de direction visuelle, de palette, de typographie ou de tokens — et avant d'écrire la moindre UI dans un projet qui contient design-system/MASTER.md.
---

# design-machine

La direction visuelle vient de sites réels extraits, jamais du goût du modèle.

La commande `dm` est dans le PATH (`~/.local/bin/dm`) ; le code vit dans
`~/development/systeme/machines/design-machine`. Au moindre doute sur les
préconditions (machine neuve, comportement étrange) : `dm doctor` — il nomme
ce qui manque et le geste pour chaque absent.

## Si `design-system/MASTER.md` existe

Le lire : c'est le contrat. Le vocabulaire autorisé est `design-system/tokens.css` —
aucune couleur, taille, rayon ou durée en dur. Une valeur manquante ne s'invente
pas : le dire et proposer d'étendre le contrat. `DESIGN.md` est un dérivé, ne
jamais l'éditer.

## Si le MASTER n'existe pas — interroger avant de produire

Ne proposer aucune direction visuelle. Obtenir du demandeur, une question à la fois :

1. **L'intention** (Creative North Star) — une phrase, écrite par lui.
   Aucune extraction ne produit une intention.
2. **Deux ou trois sites de référence de STYLE** (URL), ceux dont le rendu lui plaît.
3. **La référence d'INTENSITÉ, séparément** — le style et l'énergie viennent
   rarement du même endroit. Demander : « quelle énergie, et d'où vient-elle ? »
   Un site → l'extraire aussi, c'est lui que `dm compare` prendra pour cible.
   Un médium non-web (manga, jeu de combat, film) → transposer en EFFETS NOMMÉS
   observables (frappes brèves à overshoot, impact frames, secousses,
   onomatopées surgissantes, contraste calme/burst…) et les faire valider
   AVANT d'implémenter. La chorégraphie est ensuite libre : seul le choix des
   valeurs reste contraint par les tokens.
   Pas de référence sous la main → CHASSER : protocole complet dans
   `~/development/systeme/machines/design-machine/CHASSE.md` (réflexion →
   WebSearch → `dm density` par candidat → le demandeur choisit sur pièces).
4. **L'affectation couche → source** : typography, palette, spatial, motion,
   surfaceStyle — chaque couche vient d'UNE source. Les composants ne se
   composent pas (intersection de couches, refusé par `dm merge`).
5. **Les contraintes** : viewport(s) visé(s), mode sombre ou non, polices
   imposées ou sous licence, nature du livrable (app, landing, dashboard).
   Mode sombre voulu → extraire aussi en `--scheme dark` (source possiblement
   différente) et affecter `paletteDark=<label>` au merge : la porte jugera
   alors les DEUX schémas.

Puis dérouler, sans réinventer :

```
dm extract <url> --label A --motion   # une commande par site source
dm merge --sources sources --map typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A
dm design-md --north-star "<la phrase du demandeur>"
```

`--motion` capture aussi keyframes, loaders, apparitions au scroll et survols
mesurés ; le mouvement JS pur (rAF) est signalé « non instrumenté » dans le
MASTER — le documenter à la main, jamais l'estimer.

## Avant de livrer, et après toute modification d'UI

```
dm gate <url du rendu>                        # conformité au contrat ; sortie 1 = porte fermée
dm compare <ref intensité> <url du rendu>     # densité mesurée (animations, profondeur, collage)
```

`gate` vérifie le vocabulaire ; `compare` vérifie que le rendu porte la densité
de la RÉFÉRENCE D'INTENSITÉ (un rendu plat peut être conforme) — comparer à la
source de style ne donne que son plancher à elle. Un ÉCART se corrige en
composition, pas en désactivant l'instrument. Si l'intensité vient d'un médium
non-web, `compare` ne chiffre que le plancher : le juge des effets transposés
est le demandeur, écran par écran.

L'accessibilité est une porte séparée (D-033) : après un travail d'UI
substantiel, lancer le skill `accesslint:diff` (baseline puis violations
NOUVELLES seulement) — la porte design ne la couvre pas.

Une panne (tokens corrompus, capture qui lève) ferme la porte ; seul un outil
absent la laisse ouverte. Une dérive signalée se corrige en revenant aux tokens ;
si la dérive est voulue, on régénère le MASTER — on ne contourne jamais la porte.

## Stacks non-web

Electron/Ionic/PWA : chaîne complète sur le localhost de dev. React Native :
via Expo Web (proxy, le dire). Flutter : rendu canvas invisible aux instruments
— la porte est `dm lint <dir>` (littéraux de couleur hors tokens/theme) et la
consommation `dm export dart` (`dm export ts` pour RN/Electron). Mobile :
ajouter `--mobile` (émulation device réelle) aux extract/verify/gate/compare.

Commencer par :

```
cat design-system/MASTER.md 2>/dev/null || dm help
```
