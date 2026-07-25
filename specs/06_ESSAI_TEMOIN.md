# Essai témoin — stocktake, avant toute construction

**But** : éprouver le remplacement (Superpowers + porte câblée + fermeture de
population) sur le terrain qui a tué les skills maison, **avant** d'investir
dans le reste. Éprouve D-007, D-013, et la spec 03.

## Les deux tranches (D-018)

**Tranche A — population** : corriger le résidu trouvé par l'instrument :
`inventory.validation.level.threshold_value` (validation.py:32) — seuil resté
`Float` après le refactor monétaire (à confirmer en ouverture : si la
sémantique n'est pas monétaire, prendre Arg-1, gel du coût, population =
chemins de valorisation). Petite exprès : elle mesure le processus.

**Tranche B — anti-théâtre** : un vrai paramètre configurable avec surface
(piste complète). C'est elle qui teste la classe de défaut qui a motivé tout
le système ; A seule validerait D-007/D-013 sans les avoir stressées.

**Préalable bloquant** : la baseline chiffrée est extraite de l'historique
stocktake par script (commits de reprise, remarques client, fixes par
feature) AVANT de lancer. Sans nombres, le verdict serait un récit (D-004).

## Montage

1. Installer Superpowers dans Claude Code (aucun skill maison chargé).
2. Câbler une porte minimale : hook `Stop` qui lance les tests du module
   touché + `close_float_population.py` et **bloque** (exit 2) si le delta
   Float-monétaires n'est pas nul.
3. Copier `DECISIONS.md` à la racine du dépôt d'essai.

## Déroulé imposé

1. La session ferme la population (spec 03) et publie le décompte.
2. Plan Superpowers, TDD rouge-vert, moteur avant surface (D-012).
3. Delta de population publié avant les tests.
4. Audit adverse de sortie (05, condition 1 : une session distincte).

## Mesures (contre la baseline chiffrée, jamais contre un souvenir)

- Nombre d'allers-retours Marcel↔session pour atteindre « fini » (compté
  depuis le transcript, pas déclaré).
- Échantillon des « hors périmètre » re-jugé en session neuve (D-020) —
  désaccords comptés ; teste aussi D-006.
- Résidus découverts **après** la clôture de tranche (cible : 0).
- Défauts de classe théâtre trouvés par l'audit de sortie (chaque trouvaille
  = le processus amont a laissé passer — à tracer).
- Décisions structurantes prises en session ET présentes au journal (cible :
  toutes).

## Verdict

- Mesures meilleures que l'historique stocktake → D-007, D-013 passent
  `active` ; on câble définitivement et on écrit les pièces restantes.
- Mesures équivalentes → le problème n'était pas (que) les skills ; on
  suspend la construction et on cherche la variable réelle avant de dépenser.
- Chaque issue s'écrit au journal, datée.

## Commande

```bash
# La baseline en nombres, régénérée depuis l'historique (D-005 : pas stockée).
# Au 2026-07-25 : 97 commits, 14 reprises (14 %), 5 théâtre, remarques #5-7.
bash instruments/baseline_reprises.sh <chemin-du-depot-stocktake>
```
