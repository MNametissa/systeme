#!/usr/bin/env python3
"""Applique le contrat de forme (forme.json) à un docx — l'équivalent
Rédaction des tokens de la design-machine.

Usage : normaliser_gabarit.py source.docx sortie.docx --forme forme.json

- police unique : la police par défaut du document (docDefaults) et celle des
  puces deviennent celle du contrat — plus aucun repli silencieux vers une
  fonte absente (Aptos → Noto Sans, symboles → DejaVu) ;
- puces : les glyphes lourds (● ○ ▪ ■) deviennent la puce du contrat ;
- tailles : remappées sur l'échelle autorisée ;
- couleurs : texte et fonds remappés sur la palette fermée ;
- micro-textes : remplacements exacts listés au contrat ;
- justification : tout paragraphe de prose assez long non justifié le devient.

Rien corrigé ET rien à corriger = code 0 avec décomptes nuls ; le contrat est
vérifié en aval par la porte, pas ici.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

import docx
from docx.oxml.ns import qn

from convertir_gabarit import W_P, W_T, textes

PUCES_LOURDES = "●○▪■"


def normaliser_document(doc, forme, compte):
    body = doc.element.body
    m_tailles = {k: str(v) for k, v in forme["mapping_tailles"].items()}
    m_couleurs = forme["mapping_couleurs"]

    for sz in body.iter(qn("w:sz"), qn("w:szCs")):
        val = sz.get(qn("w:val"))
        if val in m_tailles:
            sz.set(qn("w:val"), m_tailles[val])
            compte["tailles"] += 1
    for col in body.iter(qn("w:color")):
        val = (col.get(qn("w:val")) or "").lower()
        if val in m_couleurs:
            col.set(qn("w:val"), m_couleurs[val])
            compte["couleurs"] += 1
    for shd in body.iter(qn("w:shd")):
        val = (shd.get(qn("w:fill")) or "").lower()
        if val in m_couleurs:
            shd.set(qn("w:fill"), m_couleurs[val])
            compte["couleurs"] += 1

    seuil = forme["justifier_a_partir_de"]
    for p in body.iter(W_P):
        for t in p.iter(W_T):
            if not t.text:
                continue
            for r in forme["remplacements"]:
                if r["de"] in t.text:
                    t.text = t.text.replace(r["de"], r["vers"])
                    compte["micro_textes"] += 1
        if len(textes(p).strip()) >= seuil:
            pPr = p.find(qn("w:pPr"))
            if pPr is None:
                pPr = p.makeelement(qn("w:pPr"), {})
                p.insert(0, pPr)
            jc = pPr.find(qn("w:jc"))
            if jc is None or jc.get(qn("w:val")) == "left":
                if jc is None:
                    jc = pPr.makeelement(qn("w:jc"), {})
                    rPr = pPr.find(qn("w:rPr"))
                    pPr.insert(list(pPr).index(rPr) if rPr is not None else len(pPr), jc)
                jc.set(qn("w:val"), "both")
                compte["justifies"] += 1


def normaliser_numerotation(xml, forme, compte):
    for lourde in PUCES_LOURDES:
        n = xml.count(f'w:val="{lourde}"')
        if n:
            xml = xml.replace(f'w:val="{lourde}"', f'w:val="{forme["puce"]}"')
            compte["puces"] += n
    def rempl(m):
        compte["polices"] += 1
        return re.sub(r'w:(ascii|hAnsi|eastAsia|cs)="[^"]*"',
                      r'w:\1="%s"' % forme["police"], m.group(0))
    xml = re.sub(r"<w:rFonts [^/]*/>", rempl, xml)
    return xml


def main():
    if len(sys.argv) != 5 or sys.argv[3] != "--forme":
        print(__doc__)
        return 1
    source, sortie = Path(sys.argv[1]), Path(sys.argv[2])
    forme = json.loads(Path(sys.argv[4]).read_text())
    compte = {"polices": 0, "puces": 0, "tailles": 0, "couleurs": 0,
              "micro_textes": 0, "justifies": 0}

    doc = docx.Document(str(source))
    normaliser_document(doc, forme, compte)

    with zipfile.ZipFile(source) as z:
        styles = z.read("word/styles.xml").decode("utf-8")
        numerotation = z.read("word/numbering.xml").decode("utf-8") \
            if "word/numbering.xml" in z.namelist() else None
        membres = z.infolist()

    # seule la police PAR DÉFAUT bascule dans styles.xml : les styles qui
    # nomment explicitement une police du contrat restent intacts
    def defaut(m):
        seg = m.group(0)
        if f'w:ascii="{forme["police"]}"' not in seg:
            compte["polices"] += 1
            seg = re.sub(r'w:(ascii|hAnsi|eastAsia|cs)="[^"]*"',
                         r'w:\1="%s"' % forme["police"], seg)
        return seg
    styles = re.sub(r"(<w:docDefaults>.*?</w:docDefaults>)",
                    lambda m: re.sub(r"<w:rFonts [^/]*/>", defaut, m.group(1)),
                    styles, flags=re.S)
    if numerotation is not None:
        numerotation = normaliser_numerotation(numerotation, forme, compte)

    sortie.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as zin, \
         zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in membres:
            if item.filename == "word/document.xml":
                data = doc.part.blob
            elif item.filename == "word/styles.xml":
                data = styles.encode("utf-8")
            elif item.filename == "word/numbering.xml" and numerotation is not None:
                data = numerotation.encode("utf-8")
            else:
                data = zin.read(item.filename)
            zout.writestr(item, data)

    print(f"contrat de forme appliqué → {sortie}")
    for k, v in compte.items():
        print(f"  {k:<14}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
