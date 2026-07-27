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
