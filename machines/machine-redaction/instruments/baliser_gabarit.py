#!/usr/bin/env python3
"""Balise un document réel : texte littéral → marqueur {moustache}, par carte.

Usage : baliser_gabarit.py source.docx sortie.docx --carte carte.json

La carte est la trace relisible du jugement « qu'est-ce qui est variable » :

    [
      {"texte": "ACME SARL", "nom": "client_name"},
      {"texte": "17 Avril 2026", "nom": "invoice_date", "occurrences": [1]},
      {"texte": "17 Avril 2026", "nom": "signature_date", "occurrences": [2]}
    ]

Sans "occurrences", toutes les occurrences sont balisées. Les occurrences se
comptent sur le document d'origine, en ordre de lecture. Les littéraux coupés
entre runs par Word sont recollés avant remplacement.

Une entrée qui ne capture rien = code 2, jamais un OK muet.
La sortie est un gabarit moustache : enchaîner avec convertir_gabarit.py.
"""
import json
import sys
import zipfile
from pathlib import Path

import docx

from convertir_gabarit import W_P, W_T


def remplacer_dans_paragraphe(ts, litteral, rempl_pour_occ, vu):
    """Remplace les occurrences du littéral dans un paragraphe (liste de w:t).

    `rempl_pour_occ(k)` donne le marqueur pour la k-ième occurrence globale
    (1-based) ou None pour la laisser. Retourne le nouveau compte global."""
    depuis = 0
    while True:
        textes_l = [t.text or "" for t in ts]
        joint = "".join(textes_l)
        i = joint.find(litteral, depuis)
        if i < 0:
            return vu
        vu += 1
        marqueur = rempl_pour_occ(vu)
        if marqueur is None:
            depuis = i + len(litteral)
            continue
        debut, fin = i, i + len(litteral)
        pos, couverts = 0, []
        for idx, txt in enumerate(textes_l):
            a, b = pos, pos + len(txt)
            if a < fin and debut < b:
                couverts.append((idx, a))
            pos = b
        premier, a0 = couverts[0]
        dernier, ad = couverts[-1]
        if premier == dernier:
            textes_l[premier] = (textes_l[premier][:debut - a0] + marqueur
                                 + textes_l[premier][fin - a0:])
        else:
            textes_l[premier] = textes_l[premier][:debut - a0] + marqueur
            textes_l[dernier] = textes_l[dernier][fin - ad:]
            for idx, _ in couverts[1:-1]:
                textes_l[idx] = ""
        for t, txt in zip(ts, textes_l):
            t.text = txt
        depuis = i + len(marqueur)


def main():
    if len(sys.argv) != 5 or sys.argv[3] != "--carte":
        print(__doc__)
        return 1
    source, sortie = Path(sys.argv[1]), Path(sys.argv[2])
    entrees = json.loads(Path(sys.argv[4]).read_text())
    if not entrees:
        print("ÉCHEC — carte vide : rien à baliser")
        return 2

    # entrées regroupées par littéral : une seule passe de comptage par texte,
    # les occurrences se répartissent entre les noms
    groupes = {}
    for e in entrees:
        groupes.setdefault(e["texte"], []).append(e)

    doc = docx.Document(str(source))
    body = doc.element.body
    paragraphes = [list(p.iter(W_T)) for p in body.iter(W_P)]
    captures = {id(e): 0 for e in entrees}

    for litteral in sorted(groupes, key=len, reverse=True):
        membres = groupes[litteral]

        def rempl_pour_occ(k):
            for e in membres:
                if "occurrences" not in e or k in e["occurrences"]:
                    captures[id(e)] += 1
                    return "{" + e["nom"] + "}"
            return None

        vu = 0
        for ts in paragraphes:
            if ts:
                vu = remplacer_dans_paragraphe(ts, litteral, rempl_pour_occ, vu)

    muettes = [e for e in entrees if captures[id(e)] == 0]
    if muettes:
        for e in muettes:
            print(f"ÉCHEC — entrée sans capture : {e['texte']!r} → {e['nom']}")
        return 2

    sortie.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as zin, \
         zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = doc.part.blob if item.filename == "word/document.xml" \
                else zin.read(item.filename)
            zout.writestr(item, data)

    total = sum(captures.values())
    print(f"{total} occurrences balisées → {sortie}")
    for e in entrees:
        occ = f" (occurrences {e['occurrences']})" if "occurrences" in e else ""
        print(f"  {e['nom']:<24} ×{captures[id(e)]}{occ}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
