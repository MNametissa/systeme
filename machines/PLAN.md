# Plan — les trois machines

État au 2026-07-27. Les cases sont l'état réel : la session suivante reprend ici.

## Le cadre

Trois fabriques, définies par ce qu'elles transforment en quoi. Chacune démarre
seule, sans supposer qu'une autre est passée avant. Elles se composent dans
n'importe quel ordre (Design → Rédaction (specs) → Coding → Rédaction (guides)).

| Machine | Entrée | Sortie | État |
|---|---|---|---|
| **Design** | intention + contraintes + sites de référence | forme (MASTER, tokens, écrans) | livrée, 13 défauts |
| **Rédaction** | base de faits | document (spec, PTF, guide) | livrée, 12 défauts |
| **Coding** | intention ou spec | code qui tourne | pas encore reçue |

Défaut commun aux deux premières : **elles s'installent cassées en silence** et
n'ont aucun moyen de dire « je ne peux pas fonctionner ici ».

Diagnostic croisé : design-machine **mesure** sans savoir juger le goût ;
machine-redaction **juge** sans rien mesurer. Chacune a ce qui manque à l'autre.
La correction n'est pas de les fusionner, mais de donner à Rédaction son
équivalent de `dm verify`.

---

## T1 — Le `.docx` de PTF *(à faire par Marcel, pas par une session)*

Le seul défaut qui rend la machine de rédaction inutilisable pour son cas d'usage
principal (R10). Son propre README le dit : aucun skill ne remplacera ce fichier.

- [ ] Prendre une PTF réellement envoyée, la copier, vider le contenu variable
- [ ] Nommer les styles : Titre 1, Titre 2, Corps, Tableau chiffrage
      (c'est ce que le skill `docx` lit ; sans styles nommés, il reconstruit)
- [ ] Garder page de garde, en-têtes, pieds de page, mentions légales
- [ ] Remplacer les valeurs par `{{ client }}`, `{{ montant_ht }}`, `{{ date }}`…
- [ ] Déposer dans `machine-redaction/templates/` sous `ptf-standard.docx`
- [ ] Refaire le même geste pour `devis.docx` si la structure diffère

**Critère d'acceptation** : `template-engine` produit une PTF complète à partir du
modèle sans qu'aucune mise en page ne soit régénérée.

---

## T2 — `verif_livrable.sh` : la porte manquante de la Rédaction

Ferme R2 (les règles fortes sans mécanisme). Principe : l'instrument **énumère**,
le modèle **juge**, le delta tranche. Aucun jugement dans le script.

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

## T3 — `doctor` pour les deux machines

Ferme R7, R8, R9 et D8, D11 d'un coup. Une commande qui vérifie les préconditions
et **échoue bruyamment** au lieu de laisser la machine s'installer cassée.

- [ ] **Rédaction** : `markitdown`, `docxtpl`, `python-docx`, `python-pptx`,
      `pandoc` présents ? (constat 2026-07-27 : les quatre premiers ABSENTS,
      pandoc/openpyxl/libreoffice présents)
- [ ] **Rédaction** : les 4 skills externes du routeur (`docx`, `xlsx`, `pdf`,
      `doc-coauthoring`) sont-ils installés ? Sinon la moitié des chaînes pointent
      dans le vide, aujourd'hui sans aucune détection
- [ ] **Rédaction** : `templates/` non vide (sinon T1 n'est pas fait)
- [ ] **Design** : Chromium trouvable, `design-system/tokens.json` présent,
      `impeccable` disponible ou explicitement absent
- [ ] **Les deux** : skills posés dans le **bon profil** — le défaut est réel,
      `~/.claude/skills` est codé en dur alors que les sessions tournent sur
      `~/.claude-mecid/skills`
- [ ] Sortie : liste `OK / ABSENT / À INSTALLER` + code de sortie non nul si un
      élément requis manque

**Critère d'acceptation** : sur une machine neuve, `doctor` nomme exactement ce
qui manque avant qu'un livrable échoue.

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

## T5 — Les trois correctifs durs de design-machine

Détail complet et scénarios dans `DEFAUTS_design-machine.md`.

- [ ] **D1** — `spaceUnit` : pondérer par la taille de l'unité (score = hits × u)
      ou voter sur les paliers. Aujourd'hui la maille répond « 2px » dès qu'une
      valeur impaire traîne, avec `coverage 1.00`. Ajouter ce mode d'échec aux
      limites du README.
- [ ] **D2** — parseur d'arguments qui distingue drapeau booléen et drapeau à
      valeur. Aujourd'hui `dm gate --json <url>` vérifie **localhost:3000** et
      rend CONFORME sur la mauvaise cible.
- [ ] **D3** — séparer `skip` (outil absent → porte ouverte, c'est voulu) de
      `error` (tokens.json corrompu, capture qui lève, timeout → porte **fermée**).
      Aujourd'hui toute panne ouvre la porte.
- [ ] Un test par correctif, sur le modèle existant

**Critère d'acceptation** : les trois scénarios de `DEFAUTS_design-machine.md`
rejoués donnent le comportement inverse ; `npm test` reste vert.

---

## T6 — Câblage et périmètres (à trancher, pas à coder)

- [ ] **D5** — déplacer la porte design de `PostToolUse` (Chromium à chaque
      écriture de fichier) vers `Stop` ou pre-commit
- [ ] **D4** — décider si le contraste entre dans `dm gate` ou reste chez
      AccessLint. En l'état, la porte bénit un contrat illisible.
- [ ] **D7** — `--no-sandbox` alors que le cas d'usage est d'ouvrir des sites
      tiers : à retirer ou à justifier explicitement
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

## Ordre

1. **T1** par Marcel — rien ne le remplace, tout en dépend
2. **T2** puis **T3** — la porte manquante, puis la détection des préconditions
3. **T5** — la machine Design cesse de pouvoir mentir
4. **T4**, **T6** — conventions et câblage
5. **T7** — confort

La machine **Coding** n'est pas encore reçue : ce plan est incomplet par
construction, et la troisième pièce peut le réordonner.
