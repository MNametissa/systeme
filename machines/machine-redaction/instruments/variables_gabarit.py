#!/usr/bin/env python3
"""Énumère les variables qu'un gabarit docxtpl exige — le contrat d'entrée.

Usage : variables_gabarit.py gabarit.docx [--contexte contexte.json]

Sans --contexte : liste les variables de premier niveau et leur décompte.
Avec --contexte : vérifie la couverture — variable manquante = code 1,
clé en trop = signalée (le gabarit l'ignorera). Les attributs profonds
(item.use_case.actors) ne sont pas énumérables ici : c'est le rendu strict
de remplir_gabarit.py qui les attrape.

Gabarit sans variable = code 2 (c'est un document, pas un gabarit).
"""
import json
import sys
from pathlib import Path

from docxtpl import DocxTemplate


def variables_de(gabarit):
    return sorted(DocxTemplate(str(gabarit)).get_undeclared_template_variables())


def main():
    if len(sys.argv) not in (2, 4) or (len(sys.argv) == 4 and sys.argv[2] != "--contexte"):
        print(__doc__)
        return 1
    gabarit = Path(sys.argv[1])
    variables = variables_de(gabarit)
    if not variables:
        print(f"ÉCHEC — {gabarit.name} n'exige aucune variable : "
              "c'est un document, pas un gabarit")
        return 2

    print(f"{len(variables)} variables exigées par {gabarit.name} :")
    for v in variables:
        print(f"  {v}")

    if len(sys.argv) == 4:
        contexte = json.loads(Path(sys.argv[3]).read_text())
        manquantes = [v for v in variables if v not in contexte]
        en_trop = [c for c in sorted(contexte) if c not in variables]
        for c in en_trop:
            print(f"  SIGNALÉ — clé du contexte ignorée par le gabarit : {c}")
        if manquantes:
            for v in manquantes:
                print(f"ÉCHEC — variable absente du contexte : {v}")
            return 1
        print("contexte : couverture complète")
    return 0


if __name__ == "__main__":
    sys.exit(main())
