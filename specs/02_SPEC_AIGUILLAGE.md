# Spec — Aiguillage

**Lecteur** : la session Claude Code, à la réception de toute demande.
**Tâche** : choisir la profondeur du processus avant de rien produire.

## Règle

La profondeur ne dépend ni du type de tâche ni de sa taille, mais du **rayon
d'impact** : trois questions, réponses oui/non.

1. **Réversible ?** — un `git revert` suffit-il à tout annuler (pas de
   migration de données, pas de document parti chez un client) ?
2. **Local ?** — le changement touche-t-il un seul module/artefact, sans que
   d'autres en dépendent (vérifié par instrument : grep `_inherit`,
   `depends`, imports — jamais de mémoire) ?
3. **Hors production ?** — rien de ce qui tourne chez un client n'est affecté
   avant une porte de validation ?

Trois oui → **piste courte** : population fermée si travail répétitif, faire,
porte de vérification. Rien d'autre.
Au moins un non → **piste complète** : spec (format spec-kit), analyse
d'impact par instrument, tranches moteur-avant-surface (D-012), audit adverse
en sortie (05).

## Ce qui ne se saute jamais

Quelle que soit la piste : la porte de vérification câblée, et l'écriture au
journal des décisions si une décision structurante a été prise.

## Ce qui se saute en piste courte

La spec formelle, l'analyse d'impact étendue, l'audit adverse.

## Anti-règle

L'agent ne décide pas seul de requalifier une piste complète en courte. Le
doute se résout par les trois questions, posées avec leurs preuves
d'instrument ; si l'une reste sans preuve, c'est un non.

## Critère d'acceptation

Sur dix demandes réelles étiquetées a posteriori par Marcel, l'aiguillage a
choisi la même piste que lui au moins neuf fois ; aucune piste courte n'a
produit de défaut découvert après clôture.

## Commande

```bash
# Répond OUI/NON à « local ? » pour un module Odoo donné, preuves à l'appui.
rg -l "_inherit.*'<modele>'|'<module>'" addons/ --type py; \
rg "depends" addons/*/__manifest__.py | rg "<module>"
```
