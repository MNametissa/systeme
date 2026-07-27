# machine-redaction — défauts relevés (2026-07-27)

Source : `~/Documents/Personnels/machine-redaction.zip`, 29 fichiers, 8 skills,
~120 Ko de prose. Aucun script, aucun test, aucune porte.

## Structurels — la machine ne peut rien vérifier

- [ ] **R1. Zéro instrument, zéro test, zéro porte.** Les 8 pièces sont des
      SKILL.md, c'est-à-dire le barreau le plus faible : du texte qui conseille.
      À comparer à design-machine (3 commandes, 26 tests, 1 skill de 60 lignes).
      Un livrable sorti d'ici n'est vérifié par rien.
- [ ] **R2. Les règles fortes n'ont aucun mécanisme** — « aucun montant inventé
      ou arrondi sans le dire », « un seul quadrant par document », « espaces
      insécables avant ; : ! ? », « ne jamais écraser une version envoyée ».
      Les quatre sont vérifiables par script ; aucune ne l'est. Correctif :
      un `verif_livrable.sh` (insécables, `{{ }}` non remplis, montants sans
      source, quadrants mélangés, collision de nom de fichier) — la seule pièce
      qui manque vraiment au paquet.
- [ ] **R3. Les skills ne s'appellent pas entre eux.** `livrable-client` décrit
      des chaînes (`proposal-writer` → `doc-coauthoring` → `docx`) et dit
      « charger french-language avant la mise en forme ». Un skill ne charge pas
      un autre skill : le déclenchement se fait par correspondance de description.
      La chaîne décrite est un vœu, pas un pipeline.

## Déclenchement — collisions garanties

- [ ] **R4. Deux descriptions quasi universelles.** `livrable-client` se
      déclenche « dès que l'utilisateur demande de rédiger, produire, mettre en
      forme ou livrer un document — même sans nommer le format » ;
      `french-language` sur « generating any text-based file in a French-language
      project ». Les deux tirent sur presque toute demande d'écriture.
- [ ] **R5. `diataxis-audit` vs `diataxis-documentation`** — renommer le dossier
      (fait) ne règle pas le recouvrement des descriptions : les deux parlent de
      classification et de types de documentation.
- [ ] **R6. Frontmatter de 46 à 49 lignes** sur les 4 skills office (« Enhanced
      Metadata v2.0 » + bandeaux ASCII) — coût de contexte permanent, format non
      standard.

## Dépendances — la moitié manque sur cette machine

- [ ] **R7. Binaires absents, non détectés** *(vérifié le 2026-07-27)* :
      `markitdown` ABSENT (office-to-md), `docxtpl` ABSENT (template-engine),
      `python-docx` ABSENT, `python-pptx` ABSENT. Présents : pandoc, openpyxl,
      libreoffice. `install.sh` ne les installe ni ne les vérifie.
- [ ] **R8. Quatre skills du routeur sont externes** — `docx`, `xlsx`, `pdf`,
      `doc-coauthoring` viennent du marketplace Anthropic. Si les trois `/plugin`
      ne sont pas tapés, la moitié des chaînes du routeur pointent dans le vide,
      sans aucune détection.
- [ ] **R9. `install.sh` vise `~/.claude/skills`** — mauvais profil : les sessions
      tournent sur `~/.claude-mecid/skills`. Même défaut que design-machine D11
      (mais ici sans variable d'environnement pour corriger).

## Contenu

- [ ] **R10. `proposal-writer` est un squelette anglo-saxon** (Overview, How to
      Use, Investment, Payment Terms). Ni PTF francophone, ni SYSCOHADA, ni
      fiscalité camerounaise. Le README l'admet. Le comblement annoncé est un
      `.docx` dans `templates/` — **et `templates/` est vide**. La machine est
      donc livrée sans la pièce qui fait sa valeur.
- [ ] **R11. Référence périmée** — `livrable-client` cite `/specify` et `/plan` ;
      les commandes réelles de spec-kit sont `/speckit-specify`, `/speckit-plan`.
      La chaîne « cahier de conception » ne se lance pas telle quelle.
- [ ] **R12. Corps des skills tiers en anglais** alors que la règle impose un
      livrable français : les gabarits de section sortent en anglais et doivent
      être retraduits à chaque usage.

## Ce qui est bon, à garder

- **La relecture §3** — donner le fichier seul à une session sans contexte et
  demander ce qu'elle comprend du besoin, du périmètre et du prix ; ce qu'elle ne
  reformule pas est un trou dans le document. C'est l'exécution à froid, et c'est
  la seule vraie porte du paquet — reste à la rendre non volontaire.
- **`NOTICE.md` exemplaire** : licences tracées, modifications listées une par
  une, refus argumenté de redistribuer les skills propriétaires Anthropic.
- **Le « trou connu » est nommé** au lieu d'être masqué, et le correctif proposé
  (un `.docx` réel plutôt qu'un skill de plus) est le bon.
- **Deux descriptions cassées en amont** (`description: ">"`, skills qui ne
  pouvaient jamais se déclencher) réparées — vrai travail de terrain.
- Sortie versionnée `livrables/<client>-<type>-<AAAAMMJJ>`, sans écrasement.
