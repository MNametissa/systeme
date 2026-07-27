---
name: design-machine
description: Machine de design — extraire des tokens de sites réels, composer un système (MASTER, tokens.css), vérifier tout rendu contre ce contrat. Déclencher sur toute demande de création ou refonte d'interface (écran, page, composant, landing, dashboard), de direction visuelle, de palette, de typographie ou de tokens — et avant d'écrire la moindre UI dans un projet qui contient design-system/MASTER.md.
---

# design-machine

La direction visuelle vient de sites réels extraits, jamais du goût du modèle.

La commande `dm` est dans le PATH (`~/.local/bin/dm`) ; le code vit dans
`~/development/systeme/machines/design-machine`. Vérifier : `dm help`.
Préconditions : Node ≥ 20, Chrome ou Chromium installé.

## Si `design-system/MASTER.md` existe

Le lire : c'est le contrat. Le vocabulaire autorisé est `design-system/tokens.css` —
aucune couleur, taille, rayon ou durée en dur. Une valeur manquante ne s'invente
pas : le dire et proposer d'étendre le contrat. `DESIGN.md` est un dérivé, ne
jamais l'éditer.

## Si le MASTER n'existe pas — interroger avant de produire

Ne proposer aucune direction visuelle. Obtenir du demandeur, une question à la fois :

1. **L'intention** (Creative North Star) — une phrase, écrite par lui.
   Aucune extraction ne produit une intention.
2. **Deux ou trois sites de référence** (URL), ceux dont le rendu lui plaît.
3. **L'affectation couche → source** : typography, palette, spatial, motion,
   surfaceStyle — chaque couche vient d'UNE source. Les composants ne se
   composent pas (intersection de couches, refusé par `dm merge`).
4. **Les contraintes** : viewport(s) visé(s), mode sombre ou non, polices
   imposées ou sous licence, nature du livrable (app, landing, dashboard).

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
dm gate <url du rendu>                # sortie 1 = porte fermée
```

Une panne (tokens corrompus, capture qui lève) ferme la porte ; seul un outil
absent la laisse ouverte. Une dérive signalée se corrige en revenant aux tokens ;
si la dérive est voulue, on régénère le MASTER — on ne contourne jamais la porte.

Commencer par :

```
cat design-system/MASTER.md 2>/dev/null || dm help
```
