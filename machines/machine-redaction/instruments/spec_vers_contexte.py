#!/usr/bin/env python3
"""Pont spec-kit → CDC : la population des exigences, extraite puis fermée.

Usage :
  spec_vers_contexte.py spec.md contexte-amorce.json     # extraction
  spec_vers_contexte.py spec.md --verifier contexte.json # fermeture

Extraction — l'instrument énumère, le modèle structure :
- lit une spec au format spec-kit (`# Feature Specification:`, `FR-xxx`,
  Primary User Story, Key Entities) ;
- amorce le contexte CDC avec ce qui est dérivable (project_name,
  project_description) et dépose la population brute dans `_spec`
  (id, texte, ligne source de chaque exigence) ;
- le modèle organise ensuite les FR en modules/fonctionnalités du CDC,
  en citant chaque id (« … (FR-004) »).

Fermeture — le delta tranche :
- chaque FR de la spec doit apparaître dans le contexte final → absente =
  code 1 (le CDC oublie une exigence) ;
- chaque FR citée dans le contexte doit exister dans la spec → inconnue =
  code 2 (le CDC invente une exigence) ;
- spec sans FR = code 2, jamais un OK muet.
"""
import json
import re
import sys
from pathlib import Path

FR = re.compile(r"\*\*(FR-\d+)\*\*\s*:\s*(.+)")
FR_ID = re.compile(r"FR-\d+")


def lire_spec(chemin):
    lignes = chemin.read_text().splitlines()
    titre = ""
    exigences = []
    entites = []
    histoire = []
    section = ""
    for i, l in enumerate(lignes, 1):
        m = re.match(r"#\s*Feature Specification\s*:\s*(.+)", l)
        if m:
            titre = m.group(1).strip()
        if l.startswith("#"):
            section = l.lstrip("# ").strip().lower()
            continue
        m = FR.search(l)
        if m:
            exigences.append({"id": m.group(1), "texte": m.group(2).strip(),
                              "ligne": i})
            continue
        if exigences and l.startswith("  ") and l.strip() \
                and "requirements" in section:
            exigences[-1]["texte"] += " " + l.strip()
            continue
        if "key entities" in section:
            m = re.match(r"-\s*\*\*([^*]+)\*\*\s*:\s*(.+)", l)
            if m:
                entites.append({"nom": m.group(1).strip(), "description": m.group(2).strip()})
        if "primary user story" in section and l.strip():
            histoire.append(l.strip())
    return titre, exigences, entites, " ".join(histoire)


def main():
    if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and sys.argv[2] != "--verifier"):
        print(__doc__)
        return 1
    spec = Path(sys.argv[1])
    titre, exigences, entites, histoire = lire_spec(spec)

    if not exigences:
        print(f"ÉCHEC — aucune exigence FR-xxx dans {spec.name} : "
              "rien à porter au CDC n'est pas un succès")
        return 2

    if sys.argv[2] == "--verifier":
        contexte = json.loads(Path(sys.argv[3]).read_text())
        ids_spec = {e["id"] for e in exigences}
        # les ids cités dans le contexte, hors bloc _spec (la population brute
        # ne compte pas comme couverture : elle vient de l'instrument)
        ctx_sans_spec = {k: v for k, v in contexte.items() if k != "_spec"}
        ids_ctx = set(FR_ID.findall(json.dumps(ctx_sans_spec, ensure_ascii=False)))
        inventees = sorted(ids_ctx - ids_spec)
        manquantes = sorted(ids_spec - ids_ctx)
        for fr in inventees:
            print(f"ÉCHEC — {fr} citée dans le CDC mais absente de la spec (invention)")
        if inventees:
            return 2
        for fr in manquantes:
            texte = next(e["texte"] for e in exigences if e["id"] == fr)
            print(f"ÉCHEC — {fr} absente du CDC (delta) : {texte[:70]}")
        if manquantes:
            return 1
        print(f"fermeture : {len(ids_spec)}/{len(ids_spec)} exigences de "
              f"{spec.name} portées par le CDC, zéro invention")
        return 0

    sortie = Path(sys.argv[2])
    contexte = {
        "project_name": titre,
        "project_description": histoire,
        "_spec": {
            "source": str(spec),
            "exigences": exigences,
            "entites": entites,
        },
        "_af": [
            {"id": "AF-001", "chemin": "project_name",
             "source": f"{spec.name} — titre de la spécification"},
            {"id": "AF-002", "chemin": "project_description",
             "source": f"{spec.name} — Primary User Story"},
        ],
    }
    sortie.parent.mkdir(parents=True, exist_ok=True)
    sortie.write_text(json.dumps(contexte, ensure_ascii=False, indent=2))
    print(f"{len(exigences)} exigences extraites de {spec.name} → {sortie}")
    print(f"  entités : {len(entites)} ; histoire : {'oui' if histoire else 'non'}")
    print("  à faire : organiser les FR en functional_modules (citer chaque id),")
    print(f"  compléter les variables restantes (variables_gabarit.py), puis :")
    print(f"  spec_vers_contexte.py {spec} --verifier {sortie}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
