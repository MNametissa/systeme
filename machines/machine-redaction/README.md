# machine-redaction

Transforme une base de faits en document livrable, sans jamais régénérer la
mise en page : le gabarit vient d'un vrai document envoyé, l'instrument le
convertit, docxtpl le remplit. Le contenu peut différer d'un projet à l'autre —
sections nouvelles comprises — sans toucher à la coque.

## Les six gestes

```bash
# 0. Baliser un document nu (ou re-baliser mieux un modèle existant) :
#    le jugement « qu'est-ce qui est variable » s'écrit dans une carte JSON
#    relisible (cartes/*.json : texte littéral → nom, occurrences ciblables),
#    l'instrument l'applique — entrée sans capture = refus code 2
python3 instruments/baliser_gabarit.py "../Modèles de docx/Contrat de prestation.docx" /tmp/balise.docx --carte cartes/contrat-prestation.json

# 1. Convertir un modèle {moustache} en gabarit docxtpl ({{ }}, {%tr %}, {%p %})
#    — gère les runs fragmentés par Word, les noms pointés ({use_case.actors}),
#      les boucles imbriquées (source préfixée item.) et refuse les accolades
#      hors convention plutôt que de livrer un gabarit corrompu
python3 instruments/convertir_gabarit.py "../Modèles de docx/PTF - GINUTECH.docx" templates/ptf-standard.docx

# 2. Découper un gabarit partiel (ex. couverture + en-têtes/pieds seulement)
python3 instruments/decouper_gabarit.py templates/ptf-standard.docx /tmp/couverture.docx --jusqua "Sommaire"

# 3. Le contrat d'entrée : quelles variables ce gabarit exige-t-il,
#    le contexte les couvre-t-il ? (manquante = code 1)
python3 instruments/variables_gabarit.py templates/ptf-standard.docx --contexte contexte.json

# 4. Remplir — sort le livrable en docx ET pdf ; trois gardes : jamais
#    d'écrasement (des deux formats), variable manquante = refus
#    avant rendu, StrictUndefined (un attribut profond absent lève au lieu de
#    laisser un blanc silencieux), zéro résidu dans la sortie
python3 instruments/remplir_gabarit.py templates/ptf-standard.docx contexte.json livrables/acme-ptf-20260728.docx

# 5. Vérifier le livrable avant qu'il parte : résidus bloquants (code 1),
#    chaque chiffre énuméré avec position et contexte (l'instrument énumère,
#    le modèle juge chiffre par chiffre qu'une source existe),
#    typographie française signalée (insécables)
python3 instruments/verif_livrable.py livrables/acme-ptf-20260728.docx
```

## Contenu libre — le gabarit est une coque, pas un formulaire

Toute variable peut recevoir un sous-document entier construit librement
(titres, paragraphes, tableaux) qui hérite des styles nommés du modèle :

```python
doc = DocxTemplate("templates/ptf-standard.docx")
sd = doc.new_subdoc()                      # sections qui n'existaient pas
sd.add_paragraph("Périmètre hors ERP")     # style via w:pStyle (Heading2…)
sd.add_table(rows=2, cols=2)
doc.render({**ctx, "solution_description": sd})
```

Sur un gabarit découpé (couverture seule), tout le corps se construit ainsi.

## Gabarits livrés

Les 8 modèles de `Modèles de docx/` sont convertis dans `templates/` :
ptf-standard, approche-gestion, cahier-conception, contrat-maintenance,
contrat-partenariat, contrat-prestation (balisé par carte, geste 0),
contrat-sous-traitance, modele-cdc.

## Ce que les instruments garantissent

- seule `word/document.xml` est réécrite : styles, en-têtes, pieds, médias
  identiques à l'octet ;
- les boucles débordent la mise en page d'origine (7 phases là où le modèle
  en montrait 6) ; la grille du macro planning reste vierge ;
- la découpe purge les relations d'images et médias orphelins ;
- zéro marqueur trouvé ou ancre introuvable = code 2, jamais un OK muet.

## Porte

```bash
python3 test/run.py   # 42 vérifications sur les 8 modèles réels, échec = code 1
```

## Installation — câblage en session

```bash
bash install.sh   # lien symbolique du skill vers ~/.claude-mecid/skills
                  # (copie canonique unique, idempotent), puis doctor
```

Le skill (`skill/SKILL.md`) est mince : il route les demandes de documents
client (PTF, contrats, CDC…) vers les six gestes et rappelle les deux règles
dures — aucun chiffre inventé, un refus d'instrument se corrige, ne se
contourne pas. Tout le reste vit dans ce README et les instruments.

## Doctor — la machine sait dire qu'elle est cassée

```bash
python3 instruments/doctor.py   # OK/ABSENT/SIGNALÉ ; requis manquant = code 1
```

Requis : `docxtpl`, `python-docx`, `jinja2`, `docxcompose` (pip),
`libreoffice`, `pdfinfo`, et `templates/` non vide. Chaque absence sort avec
sa commande d'installation. Signalés sans bloquer : `pandoc`, porte absente,
skills de l'ancien paquet posés au mauvais profil (`~/.claude/skills`).
À lancer avant le premier geste sur une machine neuve.

## Pont spec-kit → CDC

Une spec logicielle spec-kit (`FR-xxx`) devient la base de faits du gabarit
CDC : `instruments/spec_vers_contexte.py spec.md contexte.json` extrait la
population des exigences (id, texte, ligne source) ; le modèle les organise
en modules en citant chaque id ; `--verifier` ferme la population — exigence
absente du CDC = code 1, exigence inventée = code 2.
