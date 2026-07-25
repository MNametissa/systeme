#!/usr/bin/env python3
"""Ferme la population des champs Float/Monetary d'un répertoire d'addons Odoo.

Usage : close_float_population.py <addons_dir>
Sortie : liste fichier:ligne, modèle, champ, type, digits + décompte.
Un OK sur zéro élément examiné est signalé comme suspect, jamais comme succès.
"""
import ast, os, sys

def main(root: str) -> int:
    rows = []
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in ('.git', 'static', 'tests', '__pycache__')]
        for f in files:
            if not f.endswith('.py'):
                continue
            path = os.path.join(dirpath, f)
            try:
                tree = ast.parse(open(path, encoding='utf-8').read())
            except SyntaxError as e:
                print(f"ERREUR SYNTAXE (population non fermable) : {path}: {e}", file=sys.stderr)
                return 2
            for node in ast.walk(tree):
                # Angle mort connu : l'instrument ne voit que `fields.Float`.
                # Un alias (`from odoo import fields as f`) le rendrait aveugle
                # en silence — on le signale au lieu de le nier.
                if isinstance(node, ast.ImportFrom) and node.module == 'odoo':
                    for a in node.names:
                        if a.name == 'fields' and a.asname and a.asname != 'fields':
                            print(f"AVERTISSEMENT angle mort : {path} importe "
                                  f"fields sous l'alias '{a.asname}' — hors "
                                  f"population, à juger à la main", file=sys.stderr)
                if not isinstance(node, ast.ClassDef):
                    continue
                model = ''
                for stmt in node.body:
                    if isinstance(stmt, ast.Assign):
                        for t in stmt.targets:
                            if isinstance(t, ast.Name) and t.id in ('_name', '_inherit'):
                                if isinstance(stmt.value, ast.Constant):
                                    model = stmt.value.value
                for stmt in node.body:
                    if not isinstance(stmt, ast.Assign):
                        continue
                    v = stmt.value
                    if not (isinstance(v, ast.Call) and isinstance(v.func, ast.Attribute)):
                        continue
                    if not (isinstance(v.func.value, ast.Name) and v.func.value.id == 'fields'):
                        continue
                    if v.func.attr not in ('Float', 'Monetary'):
                        continue
                    fname = stmt.targets[0].id if isinstance(stmt.targets[0], ast.Name) else '?'
                    kw = {k.arg: (k.value.value if isinstance(k.value, ast.Constant) else 'expr')
                          for k in v.keywords if k.arg}
                    rows.append((path, stmt.lineno, model or node.name, fname,
                                 v.func.attr, str(kw.get('digits', '-'))))
    if not rows:
        print("SUSPECT : zéro élément examiné — mauvais chemin ou instrument aveugle.")
        return 2
    flo = sorted(r for r in rows if r[4] == 'Float')
    mon = sorted(r for r in rows if r[4] == 'Monetary')
    print(f"Population fermée : Float={len(flo)}  Monetary={len(mon)}")
    for p, l, m, f, t, d in flo + mon:
        print(f"{t:8} {p}:{l}  {m}.{f}  digits={d}")
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'addons'))
