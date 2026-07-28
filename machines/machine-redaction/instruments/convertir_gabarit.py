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

NOM = r"[a-z_0-9]+(?:\.[a-z_0-9]+)*"
MARQUEUR = re.compile(r"\{([#/])?(" + NOM + r")\}")
BORNE_OUVRANTE = re.compile(r"\{#(" + NOM + r")\}[\s.;:]*")
BORNE_FERMANTE = re.compile(r"\{/(" + NOM + r")\}[\s.;:]*")
W_T = qn("w:t")
W_TR = qn("w:tr")
W_TBL = qn("w:tbl")
W_P = qn("w:p")
W_BODY = qn("w:body")


def textes(element):
    return "".join(t.text or "" for t in element.iter(W_T))


def poser_tag_unique(element, tag):
    """Vide tous les w:t de l'élément et pose le tag dans le premier."""
    ts = list(element.iter(W_T))
    for t in ts:
        t.text = ""
    ts[0].text = tag


def recoller_marqueurs(body):
    """Réunit dans un seul w:t les marqueurs que Word a coupés entre runs."""
    recolles = 0
    for p in body.iter(W_P):
        ts = list(p.iter(W_T))
        if len(ts) < 2:
            continue
        while _recoller_un(ts):
            recolles += 1
    return recolles


def _recoller_un(ts):
    textes_l = [t.text or "" for t in ts]
    joint = "".join(textes_l)
    for m in MARQUEUR.finditer(joint):
        debut, fin = m.span()
        pos, couverts = 0, []
        for idx, txt in enumerate(textes_l):
            a, b = pos, pos + len(txt)
            if a < fin and debut < b:
                couverts.append((idx, a))
            pos = b
        if len(couverts) > 1:
            premier, a0 = couverts[0]
            dernier, ad = couverts[-1]
            textes_l[premier] = textes_l[premier][:debut - a0] + m.group(0)
            textes_l[dernier] = textes_l[dernier][fin - ad:]
            for idx, _ in couverts[1:-1]:
                textes_l[idx] = ""
            for t, txt in zip(ts, textes_l):
                t.text = txt
            return True
    return False


def borne_de_ligne(p, nom):
    """La borne appartient-elle à une boucle de ligne (ouverture et fermeture
    dans la même w:tr) ?"""
    parent = p.getparent()
    while parent is not None and parent.tag != W_BODY:
        if parent.tag == W_TR:
            txt = textes(parent)
            return f"{{#{nom}}}" in txt and f"{{/{nom}}}" in txt
        parent = parent.getparent()
    return False


def profondeur_par_paragraphe(paragraphes):
    """Profondeur d'imbrication des boucles de paragraphe au début de chaque
    w:p — sert à préfixer `item.` les sources de boucles imbriquées.

    Prend une liste matérialisée : les proxys lxml doivent rester vivants
    pour que id() soit stable entre le calcul et la consultation."""
    prof, n = {}, 0
    for p in paragraphes:
        prof[id(p)] = n
        txt = textes(p).strip()
        m = BORNE_OUVRANTE.fullmatch(txt)
        if m and not borne_de_ligne(p, m.group(1)):
            n += 1
            continue
        m = BORNE_FERMANTE.fullmatch(txt)
        if m and not borne_de_ligne(p, m.group(1)):
            n -= 1
    return prof


def variable_seule(compte, prefixe):
    def rempl(m):
        # jamais une borne : un {#x}/{/x} non reconnu doit rester visible
        # pour faire échouer la conversion, pas devenir une variable
        if m.group(1):
            return m.group(0)
        compte["variables"] += 1
        return f"{{{{ {prefixe}{m.group(2)} }}}}"
    return rempl


def convertir_boucles_tableau(body, compte):
    paragraphes = list(body.iter(W_P))   # garde les proxys vivants (id stables)
    prof = profondeur_par_paragraphe(paragraphes)
    for tr in list(body.iter(W_TR)):
        txt = textes(tr)
        ouvertures = re.findall(r"\{#(" + NOM + r")\}", txt)
        for nom in ouvertures:
            if f"{{/{nom}}}" not in txt:
                continue  # fermeture ailleurs : pas une boucle de ligne
            premier_p = next(tr.iter(W_P), None)
            dedans = premier_p is not None and prof.get(id(premier_p), 0) > 0
            source = f"item.{nom}" if dedans else nom
            avant = copy.deepcopy(tr)
            poser_tag_unique(avant, f"{{%tr for item in {source} %}}")
            apres = copy.deepcopy(tr)
            poser_tag_unique(apres, "{%tr endfor %}")
            tr.addprevious(avant)
            tr.addnext(apres)
            for t in tr.iter(W_T):
                if t.text:
                    t.text = re.sub(r"\{[#/]" + re.escape(nom) + r"\}\s*", "", t.text)
                    t.text = MARQUEUR.sub(variable_seule(compte, "item."), t.text)
            compte["boucles_tableau"] += 1


def convertir_boucles_paragraphe(body, compte):
    """Paragraphe {#x} seul → {%p for %} ; variables converties selon la portée."""
    pile = []
    for p in list(body.iter(W_P)):
        txt = textes(p).strip()
        # une borne peut traîner une ponctuation ou une espace résiduelle
        m = BORNE_OUVRANTE.fullmatch(txt)
        if m:
            source = f"item.{m.group(1)}" if pile else m.group(1)
            poser_tag_unique(p, f"{{%p for item in {source} %}}")
            pile.append(m.group(1))
            compte["boucles_paragraphe"] += 1
            continue
        if BORNE_FERMANTE.fullmatch(txt) and pile:
            poser_tag_unique(p, "{%p endfor %}")
            pile.pop()
            continue
        prefixe = "item." if pile else ""
        for t in p.iter(W_T):
            if t.text and "{" in t.text:
                t.text = MARQUEUR.sub(variable_seule(compte, prefixe), t.text)


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

    recolles = recoller_marqueurs(body)
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

    # une accolade hors convention casserait le prétraitement docxtpl
    # (il recolle `{` + tag par-dessus les frontières de paragraphes)
    hors_tags = re.sub(r"\{\{.*?\}\}|\{%.*?%\}", "", textes(body))
    if "{" in hors_tags or "}" in hors_tags:
        exemples = [e.strip() for e in re.findall(r".{0,30}[{}].{0,30}", hors_tags)[:5]]
        print(f"ÉCHEC — accolade hors convention dans le texte : {exemples}")
        print("  (échapper avec {{ '{' }} si l'accolade est voulue dans le document)")
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
    if recolles:
        print(f"  marqueurs recollés (runs fragmentés) : {recolles}")
    print(f"  variables hors boucle : {compte['variables']}")
    print(f"  boucles de tableau    : {compte['boucles_tableau']}")
    print(f"  boucles de paragraphe : {compte['boucles_paragraphe']}")
    if compte["planning"]:
        print(f"  lignes planning       : {compte['planning']} → 1 ligne bouclée")
    return 0


if __name__ == "__main__":
    sys.exit(main())
