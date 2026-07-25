# Spec — Mémoire des décisions

**Lecteur** : toute session, au démarrage (lecture) et avant clôture (écriture).
**Tâche** : faire survivre le jugement à la session qui l'a produit.

## Règle de partage (D-005)

- **S'écrit ici** : l'indérivable. Pourquoi une approche a été rejetée, une
  convention (`bao_inv_*`), un piège vécu (OpenUpgrade 17→18), une contrainte
  client, une décision d'architecture avec ses alternatives écartées.
- **Ne s'écrit jamais ici** : ce qu'un instrument régénère (liste de champs,
  héritages, état des vues). Preuve du danger : AUDIT.md de stocktake déclare
  « pas de monétaire » quand le code porte 14 champs Monetary — un document
  stocké a divergé du réel sans que personne ne le voie.

## Format

Le journal `DECISIONS.md` : une ligne par décision — ID, date, décision,
motif, statut, condition de renversement. Quatre statuts : `active`,
`à éprouver`, `renversée par D-xxx`, `caduque`.

## Cycle de vie

- Une décision renversée **change de statut, ne disparaît pas** — sinon
  l'approche rejetée sera re-proposée par une session future.
- En fin de tranche : les `à éprouver` touchées sont tranchées et datées.
- En début de session : la session lit le journal **avant** de proposer quoi
  que ce soit de structurant ; toute proposition contraire à une décision
  `active` doit citer son ID et argumenter le renversement.

## Câblage

Un hook SessionStart injecte le journal en contexte ; un hook Stop refuse la
clôture si des chemins structurants (Makefile, `.claude/`, manifestes,
`specs/`, `instruments/`…) ont changé sans que `DECISIONS.md` bouge —
détection **mécanique** par `instruments/decision_gate.sh` (D-019). La
« question directe à la session » est abandonnée : demander au processus qui
affabule de se certifier est l'anti-pattern que ce système combat (D-004).
Limite assumée : une décision purement orale ou déjà commitée passe — la CI
et le rituel de fin de tranche restent les verrous suivants.

## Critère d'acceptation

Une session neuve, à qui l'on demande « pourquoi N'utilise-t-on PAS l'approche
X ? » pour trois approches réellement rejetées, répond juste trois fois en
citant les IDs — sans que Marcel ré-explique.

## Commande

```bash
rg "^\| D-" DECISIONS.md | rg -v "renversée|caduque"   # décisions en vigueur
```
