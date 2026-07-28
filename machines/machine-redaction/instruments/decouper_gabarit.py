#!/usr/bin/env python3
"""Découpe un gabarit docx : garde les blocs avant une ancre, purge le reste.

Usage : decouper_gabarit.py source.docx sortie.docx --jusqua "TEXTE"

Garde tous les blocs (paragraphes, tableaux) situés avant le premier bloc
contenant l'ancre, ainsi que la section finale — donc en-têtes, pieds de
page et styles restent intacts. Les relations d'images du corps supprimé
et les médias devenus orphelins sont purgés du paquet.

Ancre introuvable ou zéro bloc gardé = code 2, jamais un OK muet.
"""
import re
import sys
import zipfile
from pathlib import Path

import docx
from docx.oxml.ns import qn

W_SECTPR = qn("w:sectPr")
W_T = qn("w:t")


def main():
    if len(sys.argv) != 5 or sys.argv[3] != "--jusqua":
        print(__doc__)
        return 1
    source, sortie, ancre = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[4]

    doc = docx.Document(str(source))
    body = doc.element.body
    blocs = [b for b in body if b.tag != W_SECTPR]

    coupe = None
    for k, bloc in enumerate(blocs):
        if ancre in "".join(t.text or "" for t in bloc.iter(W_T)):
            coupe = k
            break
    if coupe is None:
        print(f"ÉCHEC — ancre {ancre!r} introuvable dans {source.name}")
        return 2
    if coupe == 0:
        print(f"ÉCHEC — l'ancre {ancre!r} est dans le premier bloc : rien à garder")
        return 2

    for bloc in blocs[coupe:]:
        body.remove(bloc)

    # purge des relations d'images que le corps restant ne référence plus
    xml_corps = doc.part.blob.decode("utf-8")
    ids_utilises = set(re.findall(r'(?:embed|id|link)="(rId\d+)"', xml_corps))
    with zipfile.ZipFile(source) as z:
        rels = z.read("word/_rels/document.xml.rels").decode("utf-8")
        membres = z.infolist()
    purgees = 0
    for rel in re.findall(r"<Relationship [^>]*/>", rels):
        rid = re.search(r'Id="(rId\d+)"', rel).group(1)
        type_ = re.search(r'Type="([^"]+)"', rel).group(1)
        if type_.endswith("/image") and rid not in ids_utilises:
            rels = rels.replace(rel, "")
            purgees += 1

    # médias que plus aucune relation (corps, en-têtes, pieds) ne cite
    with zipfile.ZipFile(source) as z:
        cites = set()
        for n in z.namelist():
            if n.endswith(".rels"):
                contenu = rels if n == "word/_rels/document.xml.rels" else z.read(n).decode("utf-8")
                cites |= set(re.findall(r'Target="media/([^"]+)"', contenu))
    orphelins = 0
    sortie.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as zin, \
         zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in membres:
            n = item.filename
            if n.startswith("word/media/") and n.split("/")[-1] not in cites:
                orphelins += 1
                continue
            if n == "word/document.xml":
                data = doc.part.blob
            elif n == "word/_rels/document.xml.rels":
                data = rels.encode("utf-8")
            else:
                data = zin.read(n)
            zout.writestr(item, data)

    print(f"{coupe} blocs gardés, {len(blocs) - coupe} retirés (ancre : {ancre!r})")
    print(f"  relations d'images purgées : {purgees}")
    print(f"  médias orphelins retirés   : {orphelins}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
