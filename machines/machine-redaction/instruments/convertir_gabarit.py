#!/usr/bin/env python3
"""Convertit un gabarit moustache {var} / {#boucle}{/boucle} en gabarit docxtpl.

Usage : convertir_gabarit.py source.docx sortie.docx

- {var}                  → {{ var }}   ({{ item.var }} dans une boucle)
- {#x}…{/x} même ligne   → ligne de tableau bouclée ({%tr for %} / {%tr endfor %})
- {#x} seul en paragraphe→ {%p for item in x %} / {%p endfor %}
- lignes « Phase N » consécutives d'un tableau → boucle sur project_phases

Seul word/document.xml est réécrit ; styles, en-têtes, pieds et médias
restent identiques à l'octet. Zéro marqueur trouvé = code 2, jamais un OK.
"""
import copy
import re
import sys
import zipfile
from pathlib import Path

import docx
from docx.oxml.ns import qn

MARQUEUR = re.compile(r"\{([#/])?([a-z_0-9]+)\}")
W_T = qn("w:t")
W_TR = qn("w:tr")
W_TBL = qn("w:tbl")
W_P = qn("w:p")


def textes(element):
    return "".join(t.text or "" for t in element.iter(W_T))


def poser_tag_unique(element, tag):
    """Vide tous les w:t de l'élément et pose le tag dans le premier."""
    ts = list(element.iter(W_T))
    for t in ts:
        t.text = ""
    ts[0].text = tag


def convertir_boucles_tableau(body, compte):
    for tr in list(body.iter(W_TR)):
        txt = textes(tr)
        ouvertures = re.findall(r"\{#([a-z_0-9]+)\}", txt)
        for nom in ouvertures:
            if f"{{/{nom}}}" not in txt:
                continue  # fermeture ailleurs : pas une boucle de ligne
            avant = copy.deepcopy(tr)
            poser_tag_unique(avant, f"{{%tr for item in {nom} %}}")
            apres = copy.deepcopy(tr)
            poser_tag_unique(apres, "{%tr endfor %}")
            tr.addprevious(avant)
            tr.addnext(apres)
            for t in tr.iter(W_T):
                if t.text:
                    t.text = re.sub(r"\{[#/]" + nom + r"\}\s*", "", t.text)
                    t.text = MARQUEUR.sub(lambda m: f"{{{{ item.{m.group(2)} }}}}", t.text)
            compte["boucles_tableau"] += 1


def convertir_boucles_paragraphe(body, compte):
    """Paragraphe {#x} seul → {%p for %} ; variables converties selon la portée."""
    pile = []
    for p in list(body.iter(W_P)):
        txt = textes(p).strip()
        m = re.fullmatch(r"\{#([a-z_0-9]+)\}", txt)
        if m:
            poser_tag_unique(p, f"{{%p for item in {m.group(1)} %}}")
            pile.append(m.group(1))
            compte["boucles_paragraphe"] += 1
            continue
        if re.fullmatch(r"\{/([a-z_0-9]+)\}", txt):
            poser_tag_unique(p, "{%p endfor %}")
            pile.pop()
            continue
        prefixe = "item." if pile else ""
        for t in p.iter(W_T):
            if t.text and "{" in t.text:
                avant = t.text
                t.text = MARQUEUR.sub(lambda m: f"{{{{ {prefixe}{m.group(2)} }}}}", t.text)
                compte["variables"] += len(MARQUEUR.findall(avant))


def convertir_planning(body, compte):
    """Lignes consécutives « Phase N » d'un tableau → boucle sur project_phases."""
    for tbl in body.iter(W_TBL):
        lignes = [tr for tr in tbl.findall(W_TR)
                  if re.fullmatch(r"Phase \d+", textes(tr).strip())]
        if len(lignes) < 2:
            continue
        modele = lignes[0]
        avant = copy.deepcopy(modele)
        poser_tag_unique(avant, "{%tr for item in project_phases %}")
        apres = copy.deepcopy(modele)
        poser_tag_unique(apres, "{%tr endfor %}")
        modele.addprevious(avant)
        modele.addnext(apres)
        poser_tag_unique(modele, "Phase {{ item.phase_number }}")
        # la grille des semaines reste vierge : l'ombrage Gantt du document
        # d'origine ne doit pas se répliquer sur chaque phase rendue
        for tc in modele.findall(qn("w:tc"))[1:]:
            for shd in tc.iter(qn("w:shd")):
                shd.getparent().remove(shd)
        for tr in lignes[1:]:
            tr.getparent().remove(tr)
        compte["planning"] += len(lignes)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    source, sortie = Path(sys.argv[1]), Path(sys.argv[2])
    doc = docx.Document(str(source))
    body = doc.element.body

    total_marqueurs = len(MARQUEUR.findall(textes(body)))
    compte = {"variables": 0, "boucles_tableau": 0, "boucles_paragraphe": 0, "planning": 0}

    convertir_boucles_tableau(body, compte)
    convertir_boucles_paragraphe(body, compte)
    convertir_planning(body, compte)

    if total_marqueurs == 0:
        print(f"ÉCHEC — 0 marqueur trouvé dans {source.name} : rien à convertir "
              "(un gabarit sans marqueur est un document, pas un modèle)")
        return 2

    restes = MARQUEUR.findall(textes(body))
    if restes:
        print(f"ÉCHEC — marqueurs non convertis : {sorted(set(m[1] for m in restes))}")
        return 1

    sortie.parent.mkdir(parents=True, exist_ok=True)
    # seul word/document.xml est réécrit : tout le reste du paquet reste
    # identique à l'octet (styles, en-têtes, pieds, médias)
    with zipfile.ZipFile(source) as zin, \
         zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = doc.part.blob if item.filename == "word/document.xml" \
                else zin.read(item.filename)
            zout.writestr(item, data)
    print(f"{total_marqueurs} marqueurs convertis → {sortie}")
    print(f"  variables hors boucle : {compte['variables']}")
    print(f"  boucles de tableau    : {compte['boucles_tableau']}")
    print(f"  boucles de paragraphe : {compte['boucles_paragraphe']}")
    print(f"  lignes planning       : {compte['planning']} → 1 ligne bouclée")
    return 0


if __name__ == "__main__":
    sys.exit(main())
