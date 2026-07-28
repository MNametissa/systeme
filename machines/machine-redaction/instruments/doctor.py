#!/usr/bin/env python3
"""Doctor de la machine-redaction — dit « je ne peux pas fonctionner ici »
AVANT qu'un livrable échoue, au lieu de s'installer cassé en silence.

Usage : doctor.py [--racine DIR]

REQUIS (un manque = code 1) : les modules python et binaires dont les six
gestes dépendent, et templates/ non vide. SIGNALÉ (n'empêche pas le code 0) :
confort absent, skills posés au mauvais profil.
"""
import importlib.util
import shutil
import sys
from pathlib import Path

REQUIS_MODULES = [
    ("docxtpl", "pip3 install --user --break-system-packages docxtpl"),
    ("docx", "pip3 install --user --break-system-packages docxtpl  # fournit python-docx"),
    ("jinja2", "pip3 install --user --break-system-packages docxtpl  # fournit jinja2"),
    ("docxcompose", "pip3 install --user --break-system-packages docxcompose"),
]
REQUIS_BINAIRES = [
    ("libreoffice", "apt install libreoffice"),
    ("pdfinfo", "apt install poppler-utils"),
]
SIGNALE_BINAIRES = [
    ("pandoc", "apt install pandoc", "inspection des documents sources"),
]
# les 8 skills de l'ancien paquet : au mauvais profil, ils ne se chargent jamais
ANCIENS_SKILLS = {"livrable-client", "template-engine", "proposal-writer",
                  "french-language", "office-to-md", "md-to-office",
                  "diataxis-audit", "diataxis-documentation"}
MAUVAIS_PROFIL = Path.home() / ".claude" / "skills"


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--racine":
        racine = Path(sys.argv[2])
    elif len(sys.argv) == 1:
        racine = Path(__file__).resolve().parent.parent
    else:
        print(__doc__)
        return 1

    manquants = 0

    def ligne(etat, quoi, remede=""):
        print(f"{etat:<8}{quoi}" + (f" — {remede}" if remede else ""))

    for module, remede in REQUIS_MODULES:
        if importlib.util.find_spec(module):
            ligne("OK", f"{module} (module python)")
        else:
            ligne("ABSENT", f"{module} (module python)", remede)
            manquants += 1

    for binaire, remede in REQUIS_BINAIRES:
        if shutil.which(binaire):
            ligne("OK", f"{binaire} (binaire)")
        else:
            ligne("ABSENT", f"{binaire} (binaire)", remede)
            manquants += 1

    gabarits = sorted((racine / "templates").glob("*.docx")) \
        if (racine / "templates").is_dir() else []
    if gabarits:
        ligne("OK", f"templates/ ({len(gabarits)} gabarits)")
    else:
        ligne("ABSENT", f"templates/ vide ou manquant dans {racine}",
              "voir README (gestes 0 et 1) — sans gabarit la machine n'a pas d'objet")
        manquants += 1

    if (racine / "test" / "run.py").exists():
        ligne("OK", "porte (test/run.py)")
    else:
        ligne("SIGNALÉ", "porte absente — rien ne prouve que la machine marche ici")

    for binaire, remede, usage in SIGNALE_BINAIRES:
        if shutil.which(binaire):
            ligne("OK", f"{binaire} (confort : {usage})")
        else:
            ligne("SIGNALÉ", f"{binaire} absent ({usage})", remede)

    if MAUVAIS_PROFIL.is_dir():
        egares = sorted(ANCIENS_SKILLS & {p.name for p in MAUVAIS_PROFIL.iterdir()})
        if egares:
            ligne("SIGNALÉ", f"skills de l'ancien paquet au mauvais profil "
                  f"({MAUVAIS_PROFIL}) : {', '.join(egares)}",
                  "les sessions lisent ~/.claude-mecid/skills — jamais chargés")

    if manquants:
        print(f"\nMACHINE CASSÉE — {manquants} requis manquant(s), code 1")
        return 1
    print("\nMACHINE OPÉRATIONNELLE — tous les requis présents")
    return 0


if __name__ == "__main__":
    sys.exit(main())
