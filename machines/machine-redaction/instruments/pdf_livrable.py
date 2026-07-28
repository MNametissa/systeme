#!/usr/bin/env python3
"""Convertit un docx en PDF avec les champs RAFRAÎCHIS (sommaire réel).

Usage : pdf_livrable.py entree.docx sortie.pdf

`libreoffice --convert-to pdf` exporte le cache des champs tel quel : un
sommaire périmé sort périmé. Ici LibreOffice est piloté par UNO : chargement,
refresh du document, update() de chaque index, export PDF. Le sommaire du PDF
reflète le contenu réel, jamais le cache.
"""
import subprocess
import sys
import time
import uuid
from pathlib import Path


def convertir(entree, sortie, timeout=90):
    """Retourne None si OK, sinon le message d'échec."""
    import uno
    from com.sun.star.beans import PropertyValue

    entree, sortie = Path(entree).resolve(), Path(sortie).resolve()
    canal = f"mr-pdf-{uuid.uuid4().hex[:8]}"
    profil = f"/tmp/lo-profil-{canal}"
    proc = subprocess.Popen(
        ["soffice", "--headless", "--norestore", "--nologo",
         f"-env:UserInstallation=file://{profil}",
         f"--accept=pipe,name={canal};urp;"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def prop(nom, valeur):
        p = PropertyValue()
        p.Name, p.Value = nom, valeur
        return p

    try:
        local = uno.getComponentContext()
        resolveur = local.ServiceManager.createInstanceWithContext(
            "com.sun.star.bridge.UnoUrlResolver", local)
        contexte = None
        fin = time.monotonic() + timeout
        while time.monotonic() < fin:
            try:
                contexte = resolveur.resolve(
                    f"uno:pipe,name={canal};urp;StarOffice.ComponentContext")
                break
            except Exception:
                time.sleep(0.4)
        if contexte is None:
            return "LibreOffice injoignable (UNO)"
        bureau = contexte.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", contexte)
        doc = bureau.loadComponentFromURL(
            entree.as_uri(), "_blank", 0, (prop("Hidden", True),))
        if doc is None:
            return f"chargement impossible : {entree}"
        doc.refresh()
        for i in range(doc.DocumentIndexes.Count):
            doc.DocumentIndexes.getByIndex(i).update()
        doc.storeToURL(sortie.as_uri(),
                       (prop("FilterName", "writer_pdf_Export"),))
        doc.close(False)
        bureau.terminate()
    finally:
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
    if not sortie.exists() or sortie.stat().st_size == 0:
        return "PDF absent ou vide après export"
    return None


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    erreur = convertir(sys.argv[1], sys.argv[2])
    if erreur:
        print(f"ÉCHEC — {erreur}")
        return 1
    print(f"PDF produit (champs rafraîchis) : {sys.argv[2]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
