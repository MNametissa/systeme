# Protocole — Audit adverse de sortie de tranche

**Origine** : le seul dispositif de stocktake ayant attrapé la classe
« théâtre » (AUDIT.md, 11 failles prouvées dont l'invariant central tombé).
Ce qui a marché n'était pas un skill : trois conditions de protocole.

## Les trois conditions (non négociables)

1. **Session neuve** — l'auditeur n'a pas écrit le code. Contexte vierge,
   aucun souvenir des intentions, seulement la spec et l'artefact.
2. **Faille = scénario exécutable** — chaque faille est prouvée par un
   scénario qu'on peut rejouer (commande, séquence d'écran, requête). Pas de
   « il me semble que ».
3. **Un manque sans scénario ne compte pas** — il est noté « à instrumenter »,
   jamais « faille ». Ça élimine le récit.

## Déclenchement

En **sortie de chaque tranche** de piste complète — pas en fin de projet.
Le coût d'une session d'audit est inférieur au coût d'une remarque client
(stocktake : trois défauts P1 découverts par le client, remarques #5, #6, #7).

## Ce que l'auditeur attaque, par type d'artefact (D-014)

| Artefact | Attaque |
|---|---|
| Code | scénarios métier contre la spec, dont : chaque option/seuil configurable est-il **effectif** (changer la valeur change le comportement, prouvé) — l'anti-théâtre |
| Document | exécution à froid : suivre le document sans rien deviner ; premier blocage = faille, avec l'étape citée |
| Spec | double implémentation mentale : deux lectures indépendantes ; toute divergence = ambiguïté prouvée, avec les deux lectures |
| Traduction / répétitif | delta de population : liste initiale moins liste traitée, par instrument |

## Sortie

Un fichier `AUDIT_<tranche>.md` : failles prouvées (scénario joint), corrigées
ou assumées ouvertes avec ID. **Aucune section « ouvert » ne décrit l'état du
code** — elle pointe des IDs de tickets/décisions, sinon elle périme (la
section « Ouvert » d'AUDIT.md de stocktake était déjà fausse au moment de
notre lecture).

## Critère d'acceptation

Sur les trois prochaines tranches auditées : zéro défaut de classe théâtre
découvert après la tranche par Marcel ou par un client.
