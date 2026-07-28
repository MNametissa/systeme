# Plan — les trois machines

État au 2026-07-27. Les cases sont l'état réel : la session suivante reprend ici.

## Le cadre

Trois fabriques, définies par ce qu'elles transforment en quoi. Chacune démarre
seule, sans supposer qu'une autre est passée avant. Elles se composent dans
n'importe quel ordre (Design → Rédaction (specs) → Coding → Rédaction (guides)).

| Machine | Entrée | Sortie | État |
|---|---|---|---|
| **Design** | intention + contraintes + sites de référence | forme (MASTER, tokens, écrans) | **opérationnelle** — T5 fait, installée (dm au PATH, skill mecid), 5 défauts restants |
| **Rédaction** | base de faits | document (spec, PTF, guide) | livrée, 12 défauts |
| **Coding** | intention ou spec | code qui tourne | pas encore reçue |

Défaut commun aux deux premières : **elles s'installent cassées en silence** et
n'ont aucun moyen de dire « je ne peux pas fonctionner ici ».

Diagnostic croisé : design-machine **mesure** sans savoir juger le goût ;
machine-redaction **juge** sans rien mesurer. Chacune a ce qui manque à l'autre.
La correction n'est pas de les fusionner, mais de donner à Rédaction son
équivalent de `dm verify`.

---

## T0 — Exhumer la morgue *(à faire en premier : ça change T2 et T5)*

**Constat du 2026-07-27** : `~/.claude-mecid/skills/_morgue/` ne contient pas que
de la doctrine morte. Elle contient **39 scripts exécutables** — le barreau 1 de
D-002, le plus fort. L'autopsie (`analyses/01`) n'a compté que la prose et a
conclu « ce qui était bon est devenu bootstrap.sh » : vrai du texte, faux de
l'outillage. Trois portes lancées à l'instant répondent correctement :

```
ears-conforme.py    → PORTE 1 — ÉCHEC : syntaxe EARS (nfr.template.md:9)
etats.py            → ATTAQUE 1 — TENUE : tout état atteignable, aucun piège
no-placeholders.sh  → PORTE 1 — OK : aucun placeholder
```

- [ ] **Supprimer les 3 `SKILL.md`** (16 Ko de doctrine chacun) — D-001 tient :
      c'est le langage privé qui a échoué, pas l'outillage
- [ ] **Supprimer `spec-forge/scripts/mermaid/node_modules`** — 172 Mo sur les
      173 Mo de la morgue. Le vrai code tient dans le dernier mégaoctet.
- [ ] **Supprimer `registry-complete.py` et `flag-charter-sync.sh`** — couplées à
      `CMAR.md`, déjà condamnées par D-017
- [ ] **Sortir les scripts vers `instruments/`**, par famille :
      - cmar (11) : `no-placeholders`, `red-first`, `layer-direction`,
        `deps-verified`, `debt-report`, `strangler-ratchet`, `run-all`,
        `install-hooks` — ce sont les portes que D-017 propose de réécrire ;
        **elles existent, il faut les éprouver, pas les réécrire**
      - spec-forge (10 portes de documents) : `provenance-verifiable`,
        `falsifiabilite`, `tracabilite`, `anti-duplication`, `matrice-fermee`,
        `inconnues-registre`, `use-cases-complets`, `ears-conforme`,
        `diagrammes-compilent`
      - spec-audit (6 attaques exécutables) : `etats`, `autorisation`, `bornes`,
        `concurrence`, `attaque`, `common` — le protocole 05 exige « faille =
        scénario exécutable » ; celles-ci le sont
- [ ] **Éprouver chacun sur un cas réel**, garder ce qui capture, jeter le reste
      (méthode du noyau : zéro capture après trois tranches → suppression)
- [ ] **Corriger `analyses/01_AUTOPSIE_SKILLS.md`** : l'autopsie a manqué les
      instruments. Écrire ce qu'elle a manqué et pourquoi (elle jugeait la
      doctrine, pas le dossier).
- [ ] Trancher **D-017** au journal une fois les portes éprouvées

**Critère d'acceptation** : chaque script conservé a tourné sur un cas réel du
dépôt, avec sa sortie citée ; chaque script jeté a une ligne qui dit pourquoi.

---

## T1 — Le `.docx` de PTF — **FAIT (2026-07-28)**

Marcel a livré 8 modèles réels dans `Modèles de docx/` (PTF, contrats, CDC,
cahier de conception), la PTF déjà à moitié templatisée en syntaxe moustache
(`{var}`, `{#boucle}{/boucle}`). Le reste est fait par instruments dans
`machine-redaction/` :

- [x] `instruments/convertir_gabarit.py` — moustache → docxtpl : 35 marqueurs,
      2 boucles de tableau (`{%tr %}`), 2 de paragraphe (`{%p %}`), planning
      6 lignes en dur → 1 ligne bouclée à grille vierge. Seule `document.xml`
      est réécrite : 14 parties (styles, en-têtes, médias) identiques à l'octet.
- [x] `templates/ptf-standard.docx` déposé, rendu éprouvé sur contexte 7 phases
      (le 6 codé en dur déborde), PDF LibreOffice vérifié à l'œil.
- [x] **Contenu libre prouvé** : une variable reçoit un sous-document entier
      (sections nées au rendu, styles nommés hérités) — le gabarit est une
      coque, pas un formulaire.
- [x] `instruments/decouper_gabarit.py` — gabarit partiel (couverture +
      en-têtes/pieds seuls), purge des rels d'images et médias orphelins
      (1 média gardé sur 7), refus code 2 si ancre introuvable.
- [x] **Les 7 modèles balisés convertis** dans `templates/` (2026-07-28) —
      6 étaient déjà à moitié balisés par Marcel. Il a fallu généraliser
      l'instrument : recollage des marqueurs fragmentés entre runs Word
      (62 dans le CDC), noms pointés (`{use_case.actors}`), boucles imbriquées
      4 niveaux (source préfixée `item.`, prouvée au rendu), refus des
      accolades hors convention (elles font dérailler le prétraitement docxtpl,
      qui avalait 27 tags d'un coup). Piège notable : indexer par `id()` de
      proxys lxml non matérialisés — identifiants instables, profondeurs
      perdues puis réattribuées au hasard.
- [x] Porte : `test/run.py`, 28 vérifications sur les 8 modèles réels.
- [x] **`instruments/baliser_gabarit.py`** (2026-07-28) — le geste « document
      nu → gabarit » : le jugement (qu'est-ce qui est variable) s'écrit dans
      une **carte** JSON relisible (`cartes/*.json` : littéral → nom,
      occurrences ciblables), l'instrument l'applique en recollant les runs ;
      entrée sans capture = refus code 2. Éprouvé sur
      `Contrat de prestation.docx` (21 entrées, dont une double espace dans
      « 17 Avril  2026 » que le refus a nommée) : chaîne carte → balisage →
      conversion → rendu, données du contrat d'origine purgées, PDF vérifié à
      l'œil. Sert aussi à re-baliser mieux un modèle déjà paramétré.

**Critère d'acceptation atteint** : docxtpl produit une PTF complète à partir du
modèle sans qu'aucune mise en page ne soit régénérée (préservation à l'octet
vérifiée par la porte). Dépendances nouvelles pour T3 : `docxtpl`, `docxcompose`.

---

## T2 — La porte manquante de la Rédaction : **éprouver avant d'écrire**

Ferme R2 (les règles fortes sans mécanisme). Principe : l'instrument **énumère**,
le modèle **juge**, le delta tranche. Aucun jugement dans le script.

> **T2.b largement couvert le 2026-07-28**, avant T2.a (l'occasion a primé sur
> l'ordre : le trou « docxtpl rend une variable absente comme chaîne vide, sans
> erreur » rendait tout livrable suspect). Trois instruments dans
> `machine-redaction/instruments/` :
> - `variables_gabarit.py` — le contrat d'entrée : variables exigées énumérées
>   (`get_undeclared_template_variables`), couverture du contexte vérifiée,
>   manquante = code 1, gabarit sans variable = code 2 ;
> - `remplir_gabarit.py` — production gardée : jamais d'écrasement (la règle
>   « ne jamais écraser une version envoyée » a enfin un mécanisme), refus
>   avant rendu si variable manquante, **StrictUndefined** (attribut profond
>   absent → échec au rendu, pas un blanc), zéro résidu sinon sortie supprimée ;
> - `verif_livrable.py` — porte de sortie : résidus bloquants, **population des
>   chiffres** énumérée (position + contexte, 48 sur la PTF fixture — le modèle
>   juge, le delta tranche), typographie française signalée (insécables).
> Porte à 37 vérifications. Reste de T2.b : rien. Reste de T2 : T2.a (éprouver
> les portes de la morgue — provenance, falsifiabilité, traçabilité — sur un
> livrable réel), qui relève du fond, pas de la forme.

> **Requalifié le 2026-07-27.** La morgue contient déjà 10 portes de documents
> (`spec-forge/scripts/gates/`), dont trois qui portent exactement ce besoin :
> `provenance-verifiable.py`, `falsifiabilite.py`, `tracabilite.py`. Écrire avant
> de les avoir lancées, c'est violer l'échelle de réutilisation. Voir T0.

### T2.a — D'abord : les lancer sur un livrable réel *(1 h, pas une session)*

- [ ] `provenance-verifiable.py` sur un vrai document — fait-il le travail de
      « chaque affirmation a une source » ?
- [ ] `falsifiabilite.py` — attrape-t-il les affirmations non réfutables ?
- [ ] `tracabilite.py` — suit-il une exigence de bout en bout ?
- [ ] Verdict écrit : ce qui est couvert, ce qui manque. **Ce qui manque
      seulement** devient T2.b.

### T2.b — Ensuite : écrire le complément, et lui seul

- [ ] **Population des affirmations chiffrées** — énumérer tout nombre du document
      (montants, délais, pourcentages, versions, effectifs) avec sa position.
      Sortie : `fichier:ligne, valeur, contexte` + décompte. C'est la spec 03
      appliquée au texte : le modèle juge chaque chiffre (source citée / à sourcer),
      **delta non nul = le document ne part pas**.
- [ ] **Typographie française** — espaces insécables avant `; : ! ?` et dans les
      guillemets `« »`, `N°` et non `#`, majuscules accentuées, séparateur de
      milliers insécable. Vérifiable ligne par ligne, aucune ambiguïté.
- [ ] **Marqueurs non remplis** — tout `{{ … }}` restant est un échec dur.
- [ ] **Collision de version** — `livrables/<client>-<type>-<AAAAMMJJ>.<ext>`
      existe déjà → refus (la règle « ne jamais écraser une version envoyée »
      n'est aujourd'hui qu'une phrase).
- [ ] **Refus du vide** — zéro élément examiné = échec d'instrument, jamais un OK
      (règle héritée de `run-all.sh`, la seule qu'on garde telle quelle).
- [ ] Tests sur fixtures, sans binaire externe, sur le modèle de `test/run.mjs`
      de design-machine (26 tests déterministes).

**Critère d'acceptation** : sur un livrable réel, le script sort la liste des
chiffres avec décompte, et bloque sur un `{{ }}` oublié et sur une collision de nom.

---

## T3 — `doctor` pour les deux machines — **Rédaction FAIT (2026-07-28)**

Ferme R7, R8, R9 et D8, D11 d'un coup. Une commande qui vérifie les préconditions
et **échoue bruyamment** au lieu de laisser la machine s'installer cassée.

- [x] **Rédaction** : `machine-redaction/instruments/doctor.py` — requis :
      `docxtpl`, `python-docx`, `jinja2`, `docxcompose`, `libreoffice`,
      `pdfinfo`, `templates/` non vide ; chaque absence sort avec sa commande
      d'installation, code 1. Signalés : `pandoc`, porte absente, anciens
      skills au mauvais profil (`~/.claude/skills`). Éprouvé dans la porte :
      PATH amputé → libreoffice nommé ABSENT ; templates vides → refus.
      La liste des requis a changé depuis le constat de 2026-07-27 : les six
      gestes n'ont plus besoin de `markitdown`/`python-pptx` (ancienne
      machine), ni des 4 skills marketplace du vieux routeur — R8 devient
      sans objet pour la nouvelle machine.
- [ ] **Design** : Chromium trouvable, `design-system/tokens.json` présent,
      `impeccable` disponible ou explicitement absent — sa place naturelle
      est `dm doctor`, pas ici
- [ ] **Noyau** (N3) : outils des recettes (`vulture`, `madge`, `knip`,
      `pylint`) — à traiter avec T8

**Critère d'acceptation** : sur une machine neuve, `doctor` nomme exactement ce
qui manque avant qu'un livrable échoue. **Atteint pour Rédaction** (simulé :
PATH vide et templates absents, refus nommés dans les deux cas).

---

## T4 — Numéroter les affirmations (`AF-xxx`)

Rend la relecture §3 opposable au lieu d'impressionniste. Transposition directe de
ce qui a marché sur la tranche B : les `FR-001` numérotés ont permis à l'audit
d'opposer un scénario à une exigence précise, au lieu de « ça me semble flou ».

- [ ] Convention : toute affirmation engageante d'un livrable porte un ID
      (`AF-001 : le montant de X FCFA vient de la grille tarifaire v3`)
- [ ] Le relecteur sans contexte ne dit plus « c'est confus » mais
      « AF-004 n'est pas déductible du document »
- [ ] L'ajouter à `livrable-client` §3, en deux lignes — pas un skill de plus
- [ ] Lier au delta de T2 : un chiffre sans `AF` correspondant est un delta

**Critère d'acceptation** : sur un livrable réel, une session neuve produit une
liste d'IDs non déductibles, pas un avis.

---

## T5 — Les trois correctifs durs de design-machine — **FAIT (2026-07-27)**

Détail complet et scénarios dans `DEFAUTS_design-machine.md`. Code dans
`machines/design-machine/` (copie canonique, D-029).

- [x] **D1** — `spaceUnit` : la maille est la plus grande unité couvrant ≥ 0.8,
      repli sur meilleur score avec couverture avouée. Le correctif « hits × u »
      envisagé ici était faux (élisait 16 sur une maille 8 — prouvé par fixture).
      Mode d'échec documenté aux limites du README.
- [x] **D2** — parseur `src/args.mjs`, booléens vs valeurs. Rejoué :
      `dm gate --json <url>` vérifie l'url passée.
- [x] **D3** — `error` distinct de `skip` : une panne ferme la porte (D-030).
      Rejoué sur tokens.json corrompu : PORTE FERMÉE, code 1.
- [x] 6 tests ajoutés (32 verts). En prime : D7 (sandbox actif par défaut),
      D8/D11 (un seul chemin d'installation, bon profil), D12 (compte de tests),
      D5 (hook en `Stop`).

**Critère d'acceptation atteint** : scénarios rejoués en réel avec comportement
inverse ; chaîne complète extract → merge → design-md → verify → gate verte sur
fixture locale, bac à sable actif.

---

## T5bis — Couche motion étendue : interactions, loaders, animations — **FAIT (2026-07-27)**

`dm extract --motion` : trois instruments navigateur, un refus (`src/motion.mjs`).

- [x] **États `:hover`/`:focus`/`:active`** — CSSOM (déclaré) + survol
      programmatique avec `getAnimations()` (durées réelles mesurées)
- [x] **`@keyframes`** — énumération CSSOM : nom, étapes, propriétés
- [x] **`getAnimations()` échantillonné** — sonde installée avant navigation,
      marques temporelles : chargement (loaders) / déroulé (scroll) / survol
- [x] **Refus du point 4** : rAF et mutations de style inline comptés et
      SIGNALÉS (« mouvement non instrumenté »), jamais estimés (D-031)

**Critère d'acceptation atteint** : fixture 4 mouvements → loader `spin 900ms
×infinite`, scroll `400ms ease-out`, survol `200ms` mesurés ; rAF signalé
(207 ticks) sans token. Page statique : zéro invention (test). 38 tests verts.
Éprouvé sur site réel (bonito-flakes-for-pets.com, 545 éléments) : 20 keyframes
nommées, 5 boucles infinies, survol 500ms mesuré, 30 règles hover, Lenis/GSAP
signalé (1581 ticks rAF). Deux défauts réels attrapés par l'essai : timeout sur
réseau jamais apaisé (repli sur `document.readyState`), courbes `cubic-bezier`
coupées aux virgules internes (corrigé).

---

## T5ter — `dm compare` : la densité mesurée, source vs rendu — **FAIT (2026-07-27)**

« Trop plat, pas assez intense » décomposé en décomptes (`src/intensity.mjs` +
`src/compare.mjs`) : animés/visibles, boucles infinies, rotations, ombres dures
+ blocs décalés (la profondeur manga sans box-shadow), chevauchements hors
parenté (l'occlusion), saut typographique max/base. Rendu < 50 % de la source
sur une métrique = ÉCART, sortie 1. Le seuil est une heuristique assumée ; le
North Star reste juge humain (strate 3 non mesurable, D-003).

Éprouvé en réel : bonito vs shoguna → 1 écart (chevauchements 474 % → 130 %),
qui a nommé le manque exact (le collage) là où « le feeling ne matche pas » ne
nommait rien. 42 tests verts.

---

## T6 — Câblage et périmètres (à trancher, pas à coder)

- [x] **D5** — porte design câblée en `Stop` (snippet + hook mis à jour, D-030)
- [ ] **D4** — décider si le contraste entre dans `dm gate` ou reste chez
      AccessLint. En l'état, la porte bénit un contrat illisible.
- [x] **D7** — `--no-sandbox` retiré ; `DM_NO_SANDBOX=1` réservé aux conteneurs
- [ ] **spec-kit** : périmètre arrêté — cahier de conception et spécification
      uniquement (là où il a fait ses preuves, tranche B). Pas sur PTF, devis,
      guide, rapport : forme logicielle inadaptée. Il s'installe par projet, donc
      ne coûte rien là où on ne l'initie pas.
- [ ] **R11** — corriger `/specify` → `/speckit-specify` dans `livrable-client`

---

## T7 — Confort, si le temps le permet

Ne fait échouer aucun livrable ; à ne traiter qu'après T1-T5.

- [ ] R4 — resserrer les descriptions de `livrable-client` et `french-language`,
      aujourd'hui quasi universelles : elles se déclenchent sur presque tout
- [ ] R5 — départager `diataxis-audit` et `diataxis-documentation` (le renommage
      du dossier n'a pas réglé le recouvrement des descriptions)
- [ ] R6 — dégraisser les frontmatters office (46-49 lignes, bandeaux ASCII)
- [ ] R12 — traduire les gabarits de section anglais des skills tiers
- [ ] D6 — la question ouverte : rien ne contraint le niveau composant, là où le
      slop apparaît. Aucune solution évidente — à instrumenter avant de décider.
- [ ] D9/D10 — `install-stack.sh` n'exécute que l'étape 1 et avale les échecs
- [ ] D12 — README : 17 tests annoncés, 26 réels

---

## T8 — Le noyau (16 règles) et le ménage des skills

Détail dans `DEFAUTS_noyau.md`. Le noyau n'est pas une machine : c'est une
doctrine à test binaire, qui va dans `CLAUDE.md` et ne coûte aucune description.

- [ ] **N1** — le grep F7 rate sa cible : `except.*:\s*pass` n'attrape que la forme
      une-ligne, pas `except Exception:` + `pass` indenté (testé : 1 sur 2).
      Correctif : `ruff` (S110/S112) ou `grep -Pzo`
- [ ] **N4** — installation non idempotente (`cat >>` deux fois = deux copies) et
      mauvais profil (`~/.claude/` au lieu de `~/.claude-mecid/`)
- [ ] **N3** — aucun outil des recettes installé (`vulture`, `madge`, `knip`,
      `pylint` tous absents) : à intégrer au `doctor` de T3
- [ ] **N2** — retirer ou sourcer les 16 citations orphelines de `reference/` :
      le document qui énonce F8 ne peut pas reposer sur des chiffres invérifiables
- [ ] **N5** — porter sur S8 l'avertissement Odoo (champs XML, méthodes ORM
      apparaissent morts) : c'est S8 qui autorise à supprimer
- [ ] Décider : le noyau **remplace-t-il** une partie de `templates/CLAUDE.project.md` ?
      Recouvrement réel sur F8/F2/F6, et le noyau est mieux écrit. À garder en
      propre : moteur avant surface, fermeture de population, journal avant clôture
- [ ] Ouvrir le **journal des reprises** que le noyau réclame (une ligne par
      reprise + la règle qui aurait dû l'attraper). Sans lui, son propre critère de
      réfutation est inapplicable — même trou que l'essai témoin

### Ménage des skills *(inventaire du 2026-07-27)*

Actif en session `mecid` : 2 skills perso + 14 Superpowers = **16**.
Dormants dans `~/.claude/skills/` : **15**, jamais chargés (mauvais profil).

- [ ] `n8n-workflow-router.md` — lien symbolique vers un **fichier**, pas un
      dossier avec `SKILL.md` : chargeable par aucun profil. Cassé depuis mars.
- [ ] Trancher le sort des 15 dormants : rapatrier ou enterrer. S'ils sont
      rapatriés, ils importent **six doublons** de Superpowers (`tdd`,
      `diagnose`, `write-a-skill`, `grill-me`/`grill-with-docs`,
      `to-prd`/`to-issues`/`triage`) et **un conflit doctrinal** :
      `improve-codebase-architecture` note l'architecture, ce que le noyau rejette
      nommément. Candidats au rapatriement : `caveman`, `zoom-out`.
- [ ] Règle de tri — celle du noyau, appliquée aux skills : *deux règles sur le
      même mode d'échec se cannibalisent*. Test de suppression = test d'ajout :
      mode d'échec non couvert ? déclencheur observable ? test binaire ?

### `odoo-doc-pdf` — à garder, et à prendre pour modèle

Le seul paquet opérationnel tel quel (`wkhtmltopdf 0.12.5`, `pdftoppm`, `fc-list`
tous présents). Instrument-d'abord : `gen_reference.py` (AST + SQL de la base
installée), `build_pdf.sh` avec grep bloquant, vérification du **rendu** page à
page. Sa thèse — « une doc fausse a exactement la même tête qu'une doc juste ;
chaque affirmation a une source désignée, rien ne vient de la mémoire » — est le
problème racine, retrouvé indépendamment.

- [ ] S'en servir de gabarit pour ce que `machine-redaction` doit devenir :
      un skill + deux instruments, pas huit skills et zéro
- [ ] Surveiller : SQL couplé au schéma **Odoo 19** (isolé, assumé) ;
      `wkhtmltopdf` **abandonné en amont** — fonctionne, ne recevra plus de
      correctif

---

## Ordre

1. **T0** — exhumer la morgue. En premier, parce que ça change T2 et T5 : on
   n'écrit pas ce qui existe déjà et qu'on n'a pas éprouvé.
2. **T1** par Marcel — rien ne le remplace, tout en dépend
3. **T2.a** — lancer les portes exhumées sur un livrable réel, avant d'écrire
4. **T3** — `doctor` sur les trois paquets (préconditions, outils, profil)
5. **T5** — la machine Design cesse de pouvoir mentir
6. **T2.b**, **T4**, **T6**, **T8** — le complément, les conventions, le câblage
7. **T7** — confort

La machine **Coding** n'existe pas comme machine : elle a des règles (noyau),
une méthode (Superpowers), une forme amont (spec-kit) — et **un seul instrument**
(`deps.py`). C'est le vrai trou du dispositif, et T0 est le premier endroit où
chercher de quoi le combler.
