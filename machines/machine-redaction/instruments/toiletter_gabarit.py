#!/usr/bin/env python3
"""Toilettage typographique d'un docx — mécanique, jamais de jugement.

Usage : toiletter_gabarit.py source.docx sortie.docx

Corrige, dans les textes seulement (styles et mise en page intacts) :
- espaces multiples → une seule (y compris à cheval sur deux runs) ;
- espace insécable avant ; ! ? : (ajoutée si absente devant ; ! ?) ;
- espaces insécables à l'intérieur des guillemets « » ;

Zéro paragraphe à examiner = code 2. Le décompte des corrections est imprimé.
"""
import re
import sys
import zipfile
from pathlib import Path

import docx

from convertir_gabarit import W_P, W_T


def toiletter_texte(t):
    """Retourne (texte corrigé, nb de corrections)."""
    n = 0
    avant = t
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r" +([;!?:])", "\u00a0\\1", t)
    t = re.sub(r"([^\s\u00a0])([;!?])(?=\s)", "\\1\u00a0\\2", t)
    t = re.sub(r"«[ \u00a0]*", "«\u00a0", t)
    t = re.sub(r"[ \u00a0]*»", "\u00a0»", t)
    if t != avant:
        n = 1
    return t, n


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    source, sortie = Path(sys.argv[1]), Path(sys.argv[2])
    doc = docx.Document(str(source))
    body = doc.element.body

    paragraphes = 0
    corrections = 0
    for p in body.iter(W_P):
        ts = list(p.iter(W_T))
        if not ts:
            continue
        paragraphes += 1
        for t in ts:
            if t.text:
                t.text, n = toiletter_texte(t.text)
                corrections += n
        # espace double à cheval sur deux runs
        for a, b in zip(ts, ts[1:]):
            while (a.text or "").endswith(" ") and (b.text or "").startswith(" "):
                b.text = b.text[1:]
                corrections += 1

    if paragraphes == 0:
        print(f"ÉCHEC — aucun paragraphe dans {source.name} : rien à toiletter "
              "n'est pas un succès")
        return 2

    sortie.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as zin, \
         zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = doc.part.blob if item.filename == "word/document.xml" \
                else zin.read(item.filename)
            zout.writestr(item, data)

    print(f"{corrections} corrections typographiques sur {paragraphes} paragraphes → {sortie}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
