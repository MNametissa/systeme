# Autopsie — les skills abandonnés (juillet 2026)

**Lecteur** : moi dans six mois, tenté de réécrire un skill de doctrine.
**Tâche** : comprendre pourquoi ils ont échoué, pour ne pas les recréer sous
un autre nom.

## Le verdict d'ensemble

Trois skills de process (cmar-bootstrap, spec-forge, spec-audit) ont été
retirés après constat d'inefficacité sur le terrain (stocktake). La cause
n'est pas un défaut d'écriture — c'est trois défauts de **nature** :

1. **Un skill est le barreau le plus faible.** C'est du texte en concurrence
   avec tout le contexte ; il conseille, rien ne l'exécute. Les jours de
   pression — ceux où il servirait — il se dilue. Preuve : les 7 portes de
   stocktake existaient en scripts et n'étaient câblées à rien ; le théâtre
   est passé.
2. **Un langage privé produit de la conformité de surface.** Face à une
   doctrine difficile (crans, tranches, chartes), le modèle performe le
   vocabulaire sans porter la chose. Preuve matérielle : le CMAR.md de
   stocktake — tableaux de crans « [décidé] », registre vide — posé au-dessus
   d'un seuil configurable qui ne faisait rien (`config-theatre`, commit
   b2351f7). La liturgie du skill et le théâtre du code sont le même défaut,
   à deux étages.
3. **Le skill portait la contrainte lui-même** au lieu de pointer vers des
   instruments. Vingt pages de posture pèsent moins qu'un script de trente
   lignes qui sort en code 1.

## Par skill

**cmar-bootstrap** — voulait imposer une doctrine d'ingénierie au démarrage.
Ce qui était bon dedans (démarrage propre, porte dès le début, invariants) est
devenu : `bootstrap.sh` (script, déterministe), `templates/CLAUDE.project.md`
(une page, français courant), et la pratique « invariants en clair dans la
spec ». Ce qui meurt : le vocabulaire, les chartes, les crans.

**spec-forge** — produisait des specs à la forme parfaite et au contenu
générique : le défaut « document creux » industrialisé. Remplacé par la forme
spec-kit (formats contraints, artefacts consommés par la phase suivante) plus
deux exigences propres : base de faits extraite du réel avant rédaction,
lecteur et tâche nommés (D-016).

**spec-audit** — produisait des audits narratifs : « lu, cartographié,
compris » sans preuve, la couverture invérifiable par construction. Le seul
audit de stocktake qui a marché (AUDIT.md, 11 failles prouvées) ne devait rien
au skill : il devait trois conditions de protocole — session neuve, faille =
scénario exécutable, un manque sans scénario ne compte pas. Ces trois lignes
sont conservées (`specs/05_PROTOCOLE_AUDIT_ADVERSE.md`) ; le skill meurt.
Nota : la section « Ouvert » de cet AUDIT.md était déjà périmée à la
relecture (elle niait des champs Monetary présents dans le code) — d'où D-005 :
un document ne décrit jamais l'état du code, il pointe des IDs.

## Ce qui n'est pas mis en cause

`file-analysis` et `adaptive-teaching` : skills de chat, hors process de dev,
conservés.

## La règle de non-récidive (D-015)

Avant tout skill futur : un script peut-il l'exécuter ? Oui → script.
Superpowers/spec-kit couvrent le jugement ? Oui → rien à écrire. Sinon
seulement : une page, français courant, se termine par une commande. Au-delà
d'une page, c'est une doctrine qui renaît — on coupe.
