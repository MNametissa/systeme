---
name: machine-redaction
description: Machine de rédaction — produire un document client GINUTECH à partir des gabarits éprouvés (PTF, contrat de prestation/maintenance/partenariat/sous-traitance, CDC, cahier de conception, approche de gestion). Déclencher quand on demande de produire, remplir, préparer ou mettre à jour un de ces documents pour un client ou un projet, ou de créer un gabarit depuis un document existant. PAS pour la rédaction libre (mails, README, specs de code).
---

# machine-redaction

Le document vient d'un gabarit éprouvé, jamais d'une génération libre : la mise
en page ne se régénère pas, les chiffres ne s'inventent pas.

La machine vit dans le dossier parent de ce skill :

```bash
MACHINE="$(dirname "$(realpath ~/.claude-mecid/skills/machine-redaction)")"
cd "$MACHINE"   # README.md = référence complète des six gestes
```

## Séquence de production

1. `python3 instruments/doctor.py` — machine cassée : s'arrêter et le dire.
2. Choisir le gabarit dans `templates/` (8 disponibles). Couverture ou coque
   partielle : `instruments/decouper_gabarit.py`.
3. `python3 instruments/variables_gabarit.py <gabarit>` — le contrat d'entrée.
4. Construire le contexte JSON depuis la base de faits. **Aucun montant, date,
   délai ou effectif inventé ou arrondi** : chaque valeur vient de
   l'utilisateur ou d'un document fourni ; ce qui manque se demande.
5. `python3 instruments/remplir_gabarit.py <gabarit> <contexte.json>
   livrables/<client>-<type>-<AAAAMMJJ>.docx` — un refus se corrige,
   ne se contourne jamais.
6. `python3 instruments/verif_livrable.py <sortie>` — juger chaque chiffre
   énuméré : source citée, ou le document ne part pas.

Sections nouvelles ou contenu hors gabarit : sous-document docxtpl
(README § Contenu libre) — jamais de mise en page reconstruite à la main.

## Créer ou améliorer un gabarit

Document nu ou modèle à re-baliser : écrire la carte (`cartes/*.json`,
littéral → variable), puis `instruments/baliser_gabarit.py` et
`instruments/convertir_gabarit.py`. La carte est le jugement, relisible ;
l'instrument applique et refuse le vide.
