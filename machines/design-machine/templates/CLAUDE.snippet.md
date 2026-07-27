<!-- A coller dans le CLAUDE.md du projet, pas dans un skill. -->

## Systeme de design

Avant d'ecrire ou de modifier la moindre UI, lire `design-system/MASTER.md`.

- Les valeurs de `design-system/tokens.css` sont le seul vocabulaire autorise.
  Pas de couleur, de taille de texte ou de rayon en dur.
- Si une valeur manque au MASTER, ce n'est pas une occasion d'inventer :
  le dire, et proposer d'etendre le MASTER explicitement.
- Le MASTER n'est jamais edite a la main. Il se regenere :
  `dm merge --sources sources --map <affectations>`.
- Si `design-system/MASTER.md` n'existe pas, s'arreter et demander les sources
  avant de proposer une direction visuelle.

La porte `dm verify` tourne apres chaque edition. Une derive signalee se corrige
en revenant aux tokens, pas en desactivant la porte.
