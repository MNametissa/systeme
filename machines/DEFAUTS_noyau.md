# noyau — défauts relevés (2026-07-27)

Source : `~/Documents/Personnels/noyau.zip`, 7 fichiers, 16 règles (S1-S8, F1-F8),
1 instrument (`deps.py`), 5 recettes `make check`.

Nature : ce n'est pas une machine, c'est **une doctrine à test binaire**. Elle ne
transforme rien ; elle réduit la probabilité de certaines fautes et en câble cinq.

## Prouvés

- [ ] **N1. La porte F7 rate la forme dominante du défaut qu'elle vise** *(prouvé)*
      `grep -rn "except.*:\s*pass"` attrape `except: pass` (une ligne) mais **pas**
      la forme courante sur deux lignes (`except Exception:` puis `pass` indenté).
      Testé sur fixture : 1 avaleur détecté sur 2. Correctif : `grep -Pzo` multi-ligne,
      ou `ruff` (règles S110/S112, `try-except-pass`) qui le fait proprement.
      Le motif JS, lui, est correct — vérifié sans faux positif sur 4 formes.
- [ ] **N2. Les chiffres qui justifient le noyau reposent sur des citations orphelines**
      *(prouvé : 16 marqueurs `<cite index="...">` dans `reference/`, 3 dans
      `pourquoi-ces-seize.md`, 13 dans la carte)*. Ces marqueurs pointent vers des
      sources absentes du paquet, et ils portent précisément les nombres porteurs :
      « 30 bases de code, six semaines », « 78 % → 76 % », « 8 points », « observance
      autour de trois quarts ». **Le document qui énonce F8 (« n'affirme pas ce que
      tu n'as pas exécuté ») viole F8 sur ses propres fondations.** Correctif : citer
      les sources en clair (URL, date, auteur) ou requalifier les nombres en
      hypothèses non vérifiées.
- [ ] **N3. Aucun outil des recettes n'est installé** *(vérifié le 2026-07-27)* :
      `vulture`, `madge`, `knip`, `pylint` tous ABSENTS. Les cinq `make check` de
      `check-par-stack.md` ne sont donc exécutables sur aucune stack en l'état.
      Même trou que les deux autres machines : rien ne vérifie les préconditions.
- [ ] **N4. Installation non idempotente et mauvais profil** — `cat CLAUDE-noyau.md
      >> ~/.claude/CLAUDE.md` : deux exécutions produisent deux copies du noyau dans
      le fichier, et `~/.claude/` n'est pas le profil utilisé (`~/.claude-mecid/`).
      Troisième paquet, troisième fois le même défaut (cf. D11, R9).

## Conception

- [ ] **N5. S8 est dangereux tel quel sur Odoo** — « `grep` du nom renvoie une seule
      occurrence » condamne les champs référencés en XML et les méthodes appelées par
      l'ORM ou depuis les vues. Le doc porte l'avertissement pour `vulture` mais **pas
      sur la règle S8 elle-même**, alors que c'est la règle qui autorise à supprimer.
      Risque réel de suppression de code vivant.
- [ ] **N6. Cinq règles annoncées câblables, trois seulement câblées** — `noyau.md`
      liste S3, S2, S8, F7, F6 comme produisant un verdict sans jugement. Les recettes
      de `check-par-stack.md` ne couvrent que **S3, S8, F7**. Aucun `make check` ne
      contient le grep d'interdits par couche (S2) ni le mutation testing (F6).
- [ ] **N7. Motif Go faible** *(non testé — pas de fixture Go)* — `grep -rn "_ = err"`
      rate les deux formes courantes de l'erreur avalée en Go : ne pas assigner du
      tout, et `if err != nil {}` vide. `errcheck` fait le travail.
- [ ] **N8. Recette Python hors Odoo livrée non vérifiée** — le doc l'admet
      (« invocation `pylint` non exécutée de mon côté »). Honnête, mais une recette
      non exécutée reste une recette non exécutée.
- [ ] **N9. Contradiction mineure** — « il ne contient aucune règle de méthode »,
      puis « avant toute annonce de complétion : `make check` », qui en est une.
- [ ] **N10. La carte (31 Ko, 34 sections) est du poids mort dans le paquet** —
      assumé (« ne se lit pas en entier »), mais elle porte 13 citations orphelines
      et n'a aucun usage décrit hors consultation ponctuelle.

## Ce qui est bon — et supérieur au reste du lot

- **Le critère de tri est le meilleur des trois paquets** : « si un principe peut
  être satisfait par une explication, il ne tient pas ; il faut qu'il puisse être
  infirmé par un fait ». C'est le problème racine appliqué au choix des règles.
- **Chaque règle porte sa condition de violation observable.** Pas de « privilégie
  la cohésion » : « violation si un changement fonctionnel touche plus de deux
  dossiers ».
- **Le tableau des écartés** (SRP, OCP, KISS, DRY, Déméter, pyramide des tests,
  Clean Code, Postel) avec la raison de chaque rejet, et le bon diagnostic
  d'ensemble : « ils sont vrais, et inutilisables comme instruction ».
- **L'ordre d'arbitrage est tranché, pas décrit** (F avant S, S5>S1, S7>S6, S8>S4),
  et le document dit que c'est le seul endroit où il tranche.
- **Le critère de réfutation est explicite** : « si le taux de reprises n'a pas
  bougé après trois tranches, le noyau se supprime ». Un artefact qui prévoit sa
  propre mort — c'est ce qui en fait une hypothèse et pas une croyance.
- **Il dit ce qu'il ne fait pas** : ne remplace pas les portes (11 règles sur 16
  sont du texte), ne contient aucune règle de méthode, ne juge pas l'architecture.
- **`deps.py` fonctionne, vérifié dans les deux sens** : sortie 0 sans cycle sur les
  11 addons réels de stocktake, sortie 1 sur un cycle a→b→c→a fabriqué. Il calcule
  aussi l'instabilité I = sortantes/(entrantes+sortantes).
- **« L'invariant est le nom de la commande, pas son contenu »** — converge avec ce
  qu'on a déjà fait sans le savoir : `make check` existe dans stocktake et dans le
  dépôt système, avec des contenus qui n'ont rien à voir.
