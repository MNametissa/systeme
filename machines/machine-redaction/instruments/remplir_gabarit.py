#!/usr/bin/env python3
"""Remplit un gabarit docxtpl en rendu strict — le geste de production.

Usage : remplir_gabarit.py gabarit.docx contexte.json sortie.docx

Trois gardes, dans l'ordre :
1. la sortie existe déjà → refus (ne jamais écraser une version produite) ;
2. variable de premier niveau absente du contexte → refus avant tout rendu ;
3. rendu en StrictUndefined : un attribut profond manquant lève au rendu
   au lieu de laisser un blanc silencieux dans le document.

Après rendu, zéro résidu de gabarit toléré dans la sortie.
"""
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

from docxtpl import DocxTemplate
from jinja2 import Environment, StrictUndefined

from variables_gabarit import variables_de

RESIDU = re.compile(r"\{\{|\{%|\{[#/]?[a-z_0-9]+(?:\.[a-z_0-9]+)*\}")


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        return 1
    gabarit, ctx_path, sortie = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])

    pdf = sortie.with_suffix(".pdf")
    for existant in (sortie, pdf):
        if existant.exists():
            print(f"ÉCHEC — {existant} existe déjà : on n'écrase jamais une "
                  "version produite. Changer le nom (ou dater la sortie).")
            return 1

    contexte = json.loads(ctx_path.read_text())
    manquantes = [v for v in variables_de(gabarit) if v not in contexte]
    if manquantes:
        for v in manquantes:
            print(f"ÉCHEC — variable absente du contexte : {v}")
        print("rien n'a été rendu ni écrit")
        return 1

    doc = DocxTemplate(str(gabarit))
    try:
        doc.render(contexte, jinja_env=Environment(undefined=StrictUndefined))
    except Exception as e:
        print(f"ÉCHEC — rendu strict : {e}")
        print("rien n'a été écrit")
        return 1

    sortie.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(sortie))

    with zipfile.ZipFile(sortie) as z:
        for n in z.namelist():
            if n.endswith(".xml"):
                txt = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>",
                                         z.read(n).decode("utf-8", errors="replace")))
                restes = RESIDU.findall(txt)
                if restes:
                    sortie.unlink()
                    print(f"ÉCHEC — résidus de gabarit dans {n} : {restes[:5]} ; "
                          "sortie supprimée")
                    return 1

    r = subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf",
                        "--outdir", str(sortie.parent), str(sortie)],
                       capture_output=True, text=True, timeout=120)
    if r.returncode != 0 or not pdf.exists() or pdf.stat().st_size == 0:
        sortie.unlink()
        print(f"ÉCHEC — conversion PDF : code {r.returncode}\n{r.stderr}")
        print("le docx a été supprimé : le livrable sort en deux formats ou pas du tout")
        return 1

    print(f"livrable produit : {sortie} + {pdf.name}")
    print(f"  {len(contexte)} clés de contexte, rendu strict, zéro résidu")
    print(f"  reste à faire : verif_livrable.py {sortie}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
