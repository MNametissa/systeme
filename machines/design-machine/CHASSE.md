# Chasser des références — protocole

Quand le demandeur n'a pas d'URL à donner (« je veux l'énergie d'un manga »,
« un truc plus guerrier »), l'agent chasse. La recherche est libre ; le choix
final ne l'est pas : c'est le demandeur qui tranche, sur pièces chiffrées.

## 0. Réfléchir avant de chercher

Décomposer l'intention en qualités observables — pas de requête avant d'avoir
écrit 3 à 5 traits mesurables ou nommables. « Intensité comique guerrière » →
bursts brefs, onomatopées surgissantes, secousses d'impact, contraste
calme/explosion, typo qui crie. C'est la grille de lecture des candidats.

## 1. Chercher (WebSearch / WebFetch)

Là où vit chaque type d'énergie — requêtes qui marchent :

- vitrines primées : `awwwards <registre>`, `FWA <registre>`, `CSS Design Awards <registre>`
- Japon promo (l'habitat de l'intensité manga) : `<titre> アニメ 公式サイト`,
  `<jeu> 特設サイト`, `anime movie official website`, `fighting game official site`
- par studio/agence repérée : les crédits d'un site aimé mènent à ses frères

Collecter 3 à 6 URL. Une recherche qui ne cite pas ses requêtes n'est pas
rejouable — les noter.

## 2. Qualifier à l'instrument, pas à l'impression

Pour chaque candidat :

```
dm density <url>                              # la densité en 6 nombres
dm extract <url> --label cand-N --motion --screenshot cand-N.png --full-page
```

Écarter ce qui est mort (densité basse partout), noter ce que `--motion` révèle
(keyframes nommées, survols mesurés, rAF signalé). La capture pleine page est
la pièce visuelle du dossier.

Un candidat bloque l'extraction (anti-bot, page blanche) ? Escalade dans cet
ordre : `--headed`, puis le vrai Chrome de l'utilisateur via claude-in-chrome.
Toujours bloqué → écarter le candidat et le dire ; on n'ajoute pas d'outil de
contournement pour un seul site (D-010).

## 2 bis. Chasser aussi des IMAGES

Quand l'énergie ou la palette vit dans un médium figé (affiche, planche de
manga, jaquette, photo), la chasse ne s'arrête pas aux sites :

- **Chercher** : recherche d'images (affiches du registre visé, couvertures,
  planches), portfolios (Behance, ArtStation). Noter la provenance de chaque
  image retenue.
- **Rapatrier** dans `refs/` du projet (curl -o), jamais dans le livrable.
- **Qualifier aux pixels** : `dm palette refs/<image>` — palette mesurée
  (rôles par surface/contraste/saturation) ET intensité visuelle chiffrée :
  part de pixels saturés, teintes, densité d'arêtes (le fourmillement),
  contraste p5-p95. De quoi comparer des candidats sur des nombres.
- **Qualifier au regard** : l'agent OUVRE l'image (il voit) et en lit ce que
  les pixels ne chiffrent pas — cadrage, diagonales, onomatopées, alternance
  calme/explosion, superpositions. Cette lecture se TRANSPOSE en effets nommés
  observables (frappes, impact frames, collage, bursts…), présentés au
  demandeur pour validation AVANT d'implémenter — c'est ainsi qu'une image
  devient une source d'intensité, pas seulement de couleurs.
- **Câbler** : la palette élue entre au merge (`dm palette refs/affiche.jpg
  --label affiche` puis `palette=affiche` ou `paletteDark=affiche`) ; les
  effets validés entrent dans la grammaire du projet ; l'image reste dans
  `refs/` comme juge visuel de chaque itération (rendu capturé vs image,
  côte à côte).

Limite honnête : une image ne fournit ni motion mesurée, ni maille, ni
typographie identifiable — ses durées et ses polices se DÉCIDENT (nuancier,
sources web), elles ne s'extraient pas d'un pixel.

## 3. Présenter, faire choisir

Un tableau : URL · les 6 nombres · une ligne sur ce que ce site apporte · la
capture. Le demandeur choisit — c'est un jugement, il ne se délègue pas.

## 4. Câbler le choix

- La référence d'intensité choisie devient la cible : `dm compare <ref> <rendu>`.
- Si elle apporte aussi une couche de style (motion, surfaceStyle…), la
  réaffecter au merge — une couche, une source.

## Règle de licence

On dérive des règles, pas des actifs : échelles, durées, ratios, structures.
Aucune image, police ou illustration copiée depuis un candidat. Les captures
d'écran servent à l'analyse et au choix, jamais au livrable.
