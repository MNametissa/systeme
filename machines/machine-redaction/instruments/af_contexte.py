#!/usr/bin/env python3
"""AF-xxx : chaque valeur chiffrée de la base de faits porte une source.

Usage : af_contexte.py contexte.json

Le contexte déclare ses affirmations sourcées dans `_af` :

    "_af": [
      {"id": "AF-001", "chemin": "total_amount_num", "source": "devis F005 du 17/04"},
      {"id": "AF-002", "chemin": "financial_table[*].cost", "source": "grille tarifaire v3"}
    ]

L'instrument énumère toute feuille du contexte contenant un chiffre, exige
qu'une entrée AF la couvre (chemin exact ou motif `[*]`), et imprime le
registre. Feuille chiffrée sans AF = delta = code 1 : le document ne part pas.
Entrée AF qui ne couvre rien = code 2 (une source qui ne source rien est un
mensonge en attente). Contexte sans aucune feuille chiffrée = code 2.

La relecture à froid s'appuie sur ce registre : le relecteur sans contexte
reçoit livrable + registre et nomme les AF non déductibles du document.
"""
import json
import re
import sys
from pathlib import Path


def feuilles_chiffrees(valeur, chemin=""):
    """Énumère (chemin, valeur) pour toute feuille contenant un chiffre."""
    if isinstance(valeur, dict):
        for k, v in valeur.items():
            if k.startswith("_"):
                continue
            yield from feuilles_chiffrees(v, f"{chemin}.{k}" if chemin else k)
    elif isinstance(valeur, list):
        for i, v in enumerate(valeur):
            yield from feuilles_chiffrees(v, f"{chemin}[{i}]")
    elif isinstance(valeur, (int, float)) or \
            (isinstance(valeur, str) and re.search(r"\d", valeur)):
        yield chemin, valeur


def controler(contexte):
    """Retourne (registre, non_sources, af_mortes, nb_feuilles).

    registre : liste (id, chemin, source, feuilles couvertes)."""
    feuilles = list(feuilles_chiffrees(contexte))
    entrees = contexte.get("_af", [])
    registre, couverts = [], set()
    af_mortes = []
    for e in entrees:
        motif = re.escape(e["chemin"]).replace(r"\[\*\]", r"\[\d+\]")
        prises = [(c, v) for c, v in feuilles if re.fullmatch(motif, c)]
        if not prises:
            af_mortes.append(e)
        couverts.update(c for c, _ in prises)
        registre.append((e["id"], e["chemin"], e["source"], prises))
    non_sources = [(c, v) for c, v in feuilles if c not in couverts]
    return registre, non_sources, af_mortes, len(feuilles)


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    contexte = json.loads(Path(sys.argv[1]).read_text())
    registre, non_sources, af_mortes, nb = controler(contexte)

    if nb == 0:
        print("ÉCHEC — aucune feuille chiffrée dans le contexte : "
              "rien à sourcer n'est pas un succès")
        return 2

    print(f"registre AF — {len(registre)} entrées, {nb} feuilles chiffrées :")
    for id_, chemin, source, prises in registre:
        etat = f"×{len(prises)}" if prises else "MORTE"
        print(f"  {id_}  {chemin} ({etat}) — {source}")

    if af_mortes:
        for e in af_mortes:
            print(f"ÉCHEC — {e['id']} ne couvre aucune feuille : {e['chemin']!r}")
        return 2
    if non_sources:
        for chemin, v in non_sources:
            print(f"ÉCHEC — valeur chiffrée sans source (delta) : {chemin} = {v!r}")
        return 1
    print("delta nul : toute valeur chiffrée est sourcée")
    return 0


if __name__ == "__main__":
    sys.exit(main())
