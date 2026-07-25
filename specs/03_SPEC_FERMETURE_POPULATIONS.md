# Spec — Fermeture de populations

**Lecteur** : la session, avant toute correction répétitive, traduction,
migration, mise en conformité, ou audit.
**Tâche** : remplacer « je vais tout regarder » par une liste finie produite
par un instrument.

## Règle

Avant de toucher au premier site :

1. **Écrire le prédicat** qui définit la population, en une phrase. Exemple :
   « tout champ `fields.Float` du dépôt hors tests ».
2. **L'exécuter par instrument** (AST, ripgrep, SQL, registre Odoo — jamais
   le modèle). La sortie est une liste `fichier:ligne, élément, attributs`
   avec un **décompte**.
3. **Juger chaque élément** (là, le modèle) : dans le périmètre / hors
   périmètre, avec le motif en un mot.
4. **Traiter**, puis produire le **delta** : population initiale moins
   population traitée. Delta non vide = travail non fini, quels que soient
   les tests.

Les tests viennent **après** le delta nul, jamais comme détecteur de résidus.

**Le delta nul prouve la couverture, pas le jugement** (D-020). Chaque site a
été visité ; rien ne dit que chaque site a été bien classé. Un élément marqué
« hors périmètre » à tort rend le delta nul menteur. D'où : un échantillon des
éléments classés hors périmètre est re-jugé en session neuve (protocole 05) ;
un seul désaccord → re-jugement complet de la population.

## Preuve que ça paie (instance exécutée, 2026-07-25)

Sur stocktake, prédicat « champs Float hors tests » : **26 éléments** par AST.
Jugement : 24 légitimes (quantités UoM, pourcentages, géo, scores) ; le
refactor monétaire post-audit avait déjà produit 14 Monetary corrects ; **un
résidu** : `inventory.validation.level.threshold_value` (validation.py:32),
seuil de valeur resté Float — invisible au récit, visible au décompte.
Instrument livré : `instruments/close_float_population.py`.

## Anti-règles

- Pas de population « de tête » : si aucun instrument ne peut exécuter le
  prédicat, on construit l'instrument d'abord, ou on requalifie le travail en
  jugement.
- Un « OK » sur zéro élément examiné est un échec de l'instrument, pas un
  succès (règle héritée de run-all.sh, la seule qu'on garde telle quelle).

## Critère d'acceptation

Sur la prochaine chasse à bug répétitif réelle : zéro résidu découvert par
les tests ou par le client après le delta nul.

## Commande

```bash
python3 instruments/close_float_population.py addons/   # liste + décompte
```
