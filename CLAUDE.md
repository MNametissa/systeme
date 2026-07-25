# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Instructions — travail sur ce dépôt

## Nature du dépôt

Ce dépôt EST le système : specs, instruments, journal. Pas d'application, pas
de build, pas de suite de tests. Le livrable est un socle que `bootstrap.sh`
copie dans les *autres* projets (sous `.systeme/`). Modifier un fichier ici
change donc le comportement de tous les projets bootstrappés ensuite.

Pas de dépôt git ici pour l'instant (`git init` non fait) — le dépôt n'est pas
sous contrôle de version, contrairement à ce que le bootstrap impose aux
projets qu'il crée.

## Deux CLAUDE.md, à ne pas confondre

| Fichier | Pour qui |
|---|---|
| `CLAUDE.md` (celui-ci) | la session qui modifie **le système** |
| `templates/CLAUDE.project.md` | copié en `CLAUDE.md` dans **chaque projet** bootstrappé |

Une règle destinée aux projets va dans le template, jamais ici.

## Règles de session

1. Lis `DECISIONS.md` d'abord. Toute proposition contraire à une décision
   `active` cite son ID et argumente le renversement.
2. Les specs restent à une page, français courant, critère d'acceptation
   falsifiable, et finissent par une commande quand elles décrivent un geste
   (D-015).
3. Avant d'ajouter un skill où que ce soit : un script peut-il l'exécuter ?
   Superpowers/spec-kit couvrent-ils le jugement ? (voir
   `analyses/01_AUTOPSIE_SKILLS.md`).
4. Toute étape ajoutée au bootstrap nomme, dans
   `analyses/02_ANALYSE_BOOTSTRAP.md`, la défaillance qu'elle empêche. Une
   étape sans défaillance associée est de la liturgie — on ne l'ajoute pas.
5. Toute décision structurante prise en session atterrit dans `DECISIONS.md`
   avant la clôture.

## L'architecture en une lecture

Le problème racine (`specs/01_SPEC_SYSTEME.md`) : la sortie d'un modèle ne
distingue pas ce qui a été vérifié de ce qui a été généré. Tout le reste en
découle.

Hiérarchie de force des contraintes (D-002), du plus fort au plus faible —
c'est l'arbitre de toute proposition d'ajout :

1. **Instruments** — interrogent le réel exhaustivement (AST, ripgrep, SQL,
   registre Odoo). La preuve vient d'ici, jamais du modèle (D-004).
2. **Substrat** — fichiers qui portent l'état entre sessions : `DECISIONS.md`
   (l'indérivable seulement, D-005), `PLAN.md`, specs à format contraint.
3. **Portes** — scripts qui échouent, câblés en hooks et CI. Jamais
   volontaires (D-013).
4. **Pipelines** — orchestrent le travail de population hors du modèle (D-006).
5. **Posture** — Superpowers (D-007). Le barreau le plus faible : c'est du
   texte qui se dilue. Un skill maison ne se justifie qu'ici, et jamais si un
   barreau supérieur peut porter la contrainte.

Distinction opératoire (D-003) : **travail de population** (la justesse = la
couverture → fermeture par instrument, `specs/03`) vs **travail de jugement**
(contestable, non vérifiable). Formuler en comptable dès que possible.

L'ordre de lecture des specs est celui de leur numérotation : 01 vue
d'ensemble → 02 aiguillage (quelle profondeur de processus) → 03 fermeture de
populations → 04 mémoire des décisions → 05 protocole d'audit adverse → 06
essai témoin.

## État — ne pas court-circuiter

Cinq décisions sont `à éprouver` (D-007, D-008, D-009, D-012, D-017) : elles
attendent le verdict de l'essai témoin sur stocktake
(`specs/06_ESSAI_TEMOIN.md`). Tant qu'il n'a pas eu lieu :

- ne pas bootstrapper de vrai projet ;
- ne pas écrire les trois pièces propres annoncées en `specs/01` (aiguillage,
  fermeture, mémoire sont des specs, pas encore des outils) ;
- ne pas trancher ces décisions sans mesures issues de l'essai.

## Commandes

```bash
# Démarrer un projet sur le socle (crée le dossier, ou `.` pour l'existant)
bash bootstrap.sh mon-projet

# Fermer la population Float/Monetary d'un dépôt d'addons Odoo (liste + décompte)
python3 instruments/close_float_population.py <addons_dir>

# Décisions en vigueur (exclut renversées et caduques)
rg "^\| D-" DECISIONS.md | rg -v "renversée|caduque"
```

L'instrument sort en code 2 sur zéro élément — un « OK » sur population vide
est un échec d'instrument, jamais un succès. Le tester en le pointant sur un
dépôt d'addons réel, pas sur ce dépôt-ci (il n'y a pas de Python Odoo ici).
