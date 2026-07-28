# machine-redaction

Transforme une base de faits en document livrable, sans jamais régénérer la
mise en page : le gabarit vient d'un vrai document envoyé, l'instrument le
convertit, docxtpl le remplit. Le contenu peut différer d'un projet à l'autre —
sections nouvelles comprises — sans toucher à la coque.

## Les trois gestes

```bash
# 1. Convertir un modèle {moustache} en gabarit docxtpl ({{ }}, {%tr %}, {%p %})
#    — gère les runs fragmentés par Word, les noms pointés ({use_case.actors}),
#      les boucles imbriquées (source préfixée item.) et refuse les accolades
#      hors convention plutôt que de livrer un gabarit corrompu
python3 instruments/convertir_gabarit.py "../Modèles de docx/PTF - GINUTECH.docx" templates/ptf-standard.docx

# 2. Découper un gabarit partiel (ex. couverture + en-têtes/pieds seulement)
python3 instruments/decouper_gabarit.py templates/ptf-standard.docx /tmp/couverture.docx --jusqua "Sommaire"

# 3. Remplir
python3 - << 'EOF'
import json
from docxtpl import DocxTemplate
doc = DocxTemplate("templates/ptf-standard.docx")
ctx = json.load(open("test/fixtures/contexte_ptf.json"))   # la base de faits
doc.render(ctx)
doc.save("ptf-client.docx")
EOF
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

7 des 8 modèles de `Modèles de docx/` sont convertis dans `templates/` :
ptf-standard, approche-gestion, cahier-conception, contrat-maintenance,
contrat-partenariat, contrat-sous-traitance, modele-cdc. Manque
`Contrat de prestation.docx` : source non balisée (0 marqueur, refus code 2).

## Ce que les instruments garantissent

- seule `word/document.xml` est réécrite : styles, en-têtes, pieds, médias
  identiques à l'octet ;
- les boucles débordent la mise en page d'origine (7 phases là où le modèle
  en montrait 6) ; la grille du macro planning reste vierge ;
- la découpe purge les relations d'images et médias orphelins ;
- zéro marqueur trouvé ou ancre introuvable = code 2, jamais un OK muet.

## Porte

```bash
python3 test/run.py   # 25 vérifications sur les 7 modèles réels, échec = code 1
```

## Dépendances

`docxtpl` et `docxcompose` (pip), `libreoffice` + `pdfinfo` pour la
vérification PDF de la porte. À intégrer au `doctor` (T3).
