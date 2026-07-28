#!/usr/bin/env python3
"""Porte de la machine-redaction — T1 gabarit PTF.

Éprouve instruments/convertir_gabarit.py sur la vraie PTF, puis le rendu
docxtpl sur un contexte à 7 phases (le 6 codé en dur doit déborder).
Sortie non nulle au premier échec. Zéro vérification exécutée = échec.
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent          # machine-redaction/
DEPOT = RACINE.parent        # machines/
INSTRUMENT = RACINE / "instruments" / "convertir_gabarit.py"
SOURCE = DEPOT / "Modèles de docx" / "PTF - GINUTECH.docx"
CONTEXTE = ICI / "fixtures" / "contexte_ptf.json"

MOUSTACHE = re.compile(r"\{[#/]?[a-z_0-9]+(?:\.[a-z_0-9]+)*\}")
JINJA = re.compile(r"\{\{|\{%")

verifs = 0
def ok(nom):
    global verifs
    verifs += 1
    print(f"  OK  {nom}")

def echec(nom, detail=""):
    print(f"ÉCHEC {nom}" + (f" — {detail}" if detail else ""))
    sys.exit(1)

def textes_docx(chemin):
    """Concatène les w:t de chaque partie XML du docx."""
    parties = {}
    with zipfile.ZipFile(chemin) as z:
        for n in z.namelist():
            if n.endswith(".xml"):
                xml = z.read(n).decode("utf-8", errors="replace")
                parties[n] = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", xml))
    return parties

def octets(chemin, membre):
    with zipfile.ZipFile(chemin) as z:
        return z.read(membre)

tmp = Path(tempfile.mkdtemp(prefix="mr-test-"))
gabarit = tmp / "ptf-standard.docx"

# ── 1. Conversion sur la vraie PTF ─────────────────────────────────────────
if not SOURCE.exists():
    echec("source", f"{SOURCE} absent")
r = subprocess.run([sys.executable, str(INSTRUMENT), str(SOURCE), str(gabarit)],
                   capture_output=True, text=True)
if r.returncode != 0:
    echec("conversion", f"code {r.returncode}\n{r.stdout}{r.stderr}")
if not re.search(r"\b\d+ marqueur", r.stdout):
    echec("conversion: décompte", f"pas de décompte dans la sortie:\n{r.stdout}")
ok("conversion: code 0 et décompte annoncé")

for nom, txt in textes_docx(gabarit).items():
    restes = MOUSTACHE.findall(txt)
    if restes:
        echec("conversion: marqueurs moustache restants", f"{nom}: {restes}")
ok("conversion: zéro marqueur {moustache} restant")

# ── 2. Mise en page intacte (styles, en-têtes, pieds, médias) ─────────────
with zipfile.ZipFile(SOURCE) as z:
    a_preserver = [n for n in z.namelist()
                   if n == "word/styles.xml"
                   or re.match(r"word/(header|footer)\d+\.xml$", n)
                   or n.startswith("word/media/")]
for membre in a_preserver:
    if octets(SOURCE, membre) != octets(gabarit, membre):
        echec("préservation", f"{membre} modifié par la conversion")
ok(f"préservation: {len(a_preserver)} parties identiques à l'octet")

# ── 3. Rendu docxtpl, 7 phases ────────────────────────────────────────────
from docxtpl import DocxTemplate
contexte = json.loads(CONTEXTE.read_text())
rendu = tmp / "ptf-rendu.docx"
doc = DocxTemplate(str(gabarit))
doc.render(contexte)
doc.save(str(rendu))
ok("rendu: docxtpl aboutit")

corps = textes_docx(rendu)["word/document.xml"]
residus = JINJA.findall(corps) + MOUSTACHE.findall(corps)
if residus:
    echec("rendu: résidus de gabarit", str(residus[:10]))
ok("rendu: zéro résidu {{ }} {% %} {moustache}")

for attendu in ["ACME SARL", "12 500 000", "Accompagnement",
                "Rapport d'optimisation", "Formateur"]:
    if attendu not in corps:
        echec("rendu: contenu fixture absent", attendu)
ok("rendu: valeurs du contexte présentes (dont la 7e phase)")

# ── 4. Les boucles débordent le 6 codé en dur ─────────────────────────────
if corps.count("Dossier de spécifications") != 1:
    echec("boucle financière", "ligne modèle dupliquée ou absente")
if len(re.findall(r"PHASE 7", corps)) < 1:
    echec("boucle phases", "PHASE 7 absente du rendu")
xml_rendu = zipfile.ZipFile(rendu).read("word/document.xml").decode("utf-8")
i = xml_rendu.find("Phases du projet")
fin = xml_rendu.find("</w:tbl>", i)
lignes_planning = len(re.findall(r"<w:tr[ >]", xml_rendu[xml_rendu.rfind("<w:tbl>", 0, i):fin]))
if lignes_planning != 2 + 7:   # en-tête durée + en-tête semaines + 7 phases
    echec("boucle planning", f"{lignes_planning} lignes au lieu de 9")
ok("boucles: 7 phases rendues (financier, prose, planning)")

tbl_planning = xml_rendu[xml_rendu.rfind("<w:tbl>", 0, i):fin]
for tr in re.findall(r"<w:tr[ >].*?</w:tr>", tbl_planning, re.S):
    txt_tr = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", tr))
    if txt_tr.strip().startswith("Phase") and "339933" in tr:
        echec("grille planning", f"ombrage Gantt hérité de la ligne modèle sur {txt_tr.strip()!r} "
              "(la grille des semaines doit rester vierge, à cocher à la main)")
ok("grille planning: semaines vierges sur les lignes bouclées")

# ── 5. Contenu libre : une variable reçoit un sous-document entier ────────
# (le gabarit est une coque, pas un formulaire : des sections nouvelles
#  peuvent naître au rendu, avec les styles nommés du modèle)
from docx.oxml.ns import qn
doc2 = DocxTemplate(str(gabarit))
sd = doc2.new_subdoc()
titre = sd.add_paragraph("Périmètre hors ERP")
pPr = titre._p.get_or_add_pPr()
ps = pPr.makeelement(qn("w:pStyle"), {qn("w:val"): "Heading2"})
pPr.append(ps)
sd.add_paragraph("Cette section n'existe pas dans le modèle : elle est née au rendu.")
t = sd.add_table(rows=2, cols=2)
t.rows[0].cells[0].text = "Sujet"
t.rows[0].cells[1].text = "Décision"
t.rows[1].cells[0].text = "Site vitrine"
t.rows[1].cells[1].text = "Reporté en phase 2"
contexte2 = dict(contexte, solution_description=sd)
rendu2 = tmp / "ptf-rendu-libre.docx"
doc2.render(contexte2)
doc2.save(str(rendu2))
xml2 = zipfile.ZipFile(rendu2).read("word/document.xml").decode("utf-8")
if "Périmètre hors ERP" not in xml2 or "Reporté en phase 2" not in xml2:
    echec("contenu libre", "section née au rendu absente")
i = xml2.find("Périmètre hors ERP")
pPr_seg = xml2[xml2.rfind("<w:p", 0, i):i]
if 'w:pStyle w:val="Heading2"' not in pPr_seg:
    echec("contenu libre", "le titre né au rendu ne porte pas le style Heading2")
ok("contenu libre: section + tableau nés au rendu, styles du modèle hérités")

# ── 6. Gabarit partiel : couverture seule, en-têtes/pieds conservés ───────
DECOUPE = RACINE / "instruments" / "decouper_gabarit.py"
coquille = tmp / "ptf-couverture.docx"
r = subprocess.run([sys.executable, str(DECOUPE), str(gabarit), str(coquille),
                    "--jusqua", "Sommaire"], capture_output=True, text=True)
if r.returncode != 0:
    echec("découpe", f"code {r.returncode}\n{r.stdout}{r.stderr}")
corps_coq = textes_docx(coquille)["word/document.xml"]
for present in ["PROPOSITION", "{{ client_name }}"]:
    if present not in corps_coq:
        echec("découpe: couverture amputée", present)
for absent in ["Sommaire", "Macro planning", "Le prestataire"]:
    if absent in corps_coq:
        echec("découpe: corps non retiré", absent)
ok("découpe: couverture gardée, corps retiré")

for membre in a_preserver:
    if not membre.startswith("word/media/"):
        if octets(SOURCE, membre) != octets(coquille, membre):
            echec("découpe: préservation", f"{membre} modifié")
ok("découpe: styles et en-têtes/pieds identiques à l'octet")

with zipfile.ZipFile(coquille) as z:
    noms = z.namelist()
    rels_refs = set()
    for n in noms:
        if n.endswith(".rels"):
            rels_refs |= set(re.findall(r'Target="media/([^"]+)"', z.read(n).decode()))
    medias = {n.split("/")[-1] for n in noms if n.startswith("word/media/")}
    doc_xml_coq = z.read("word/document.xml").decode()
    ids_utilises = set(re.findall(r'(?:embed|id|link)="(rId\d+)"', doc_xml_coq))
    rels_doc = z.read("word/_rels/document.xml.rels").decode()
    ids_declares = set(re.findall(r'Id="(rId\d+)"[^>]*Type="[^"]*/image"', rels_doc))
if medias - rels_refs:
    echec("découpe: médias orphelins", str(medias - rels_refs))
if ids_utilises & ids_declares != ids_declares & ids_utilises or not ids_declares <= ids_utilises:
    echec("découpe: rels d'images pendantes", str(ids_declares - ids_utilises))
if len(medias) >= 7:
    echec("découpe: propreté", f"{len(medias)} médias conservés sur 7 — rien purgé")
ok(f"découpe: propre ({len(medias)} médias conservés sur 7, zéro orphelin)")

doc3 = DocxTemplate(str(coquille))
doc3.render(contexte)
rendu3 = tmp / "couverture-rendue.docx"
doc3.save(str(rendu3))
txt3 = textes_docx(rendu3)["word/document.xml"]
if "ACME SARL" not in txt3 or JINJA.findall(txt3) or MOUSTACHE.findall(txt3):
    echec("découpe: rendu", "résidus ou contexte absent")
r = subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf",
                    "--outdir", str(tmp), str(rendu3)],
                   capture_output=True, text=True, timeout=120)
r2 = subprocess.run(["pdfinfo", str(tmp / "couverture-rendue.pdf")],
                    capture_output=True, text=True)
pages = int(re.search(r"Pages:\s+(\d+)", r2.stdout).group(1)) if r2.returncode == 0 else -1
if pages < 1 or pages > 2:
    echec("découpe: pdf", f"{pages} pages pour une couverture")
ok(f"découpe: la couverture rendue tient en {pages} page(s), PDF valide")

# ── 7. Refus d'une ancre introuvable : code 2 ─────────────────────────────
r = subprocess.run([sys.executable, str(DECOUPE), str(gabarit), str(tmp / "x.docx"),
                    "--jusqua", "TEXTE INTROUVABLE XYZ"], capture_output=True, text=True)
if r.returncode != 2:
    echec("découpe: ancre introuvable", f"code {r.returncode} au lieu de 2")
ok("découpe: ancre introuvable → code 2, jamais un OK muet")

# ── 8. Marqueurs fragmentés entre plusieurs runs (le cas Word réel) ───────
import docx
frag = tmp / "fragmente.docx"
d = docx.Document()
p = d.add_paragraph()
p.add_run("Le client ")
p.add_run("{cli")           # marqueur coupé en trois runs,
p.add_run("ent_na")         # comme Word le fait après édition
p.add_run("me} est engagé.")
d.save(str(frag))
r = subprocess.run([sys.executable, str(INSTRUMENT), str(frag), str(tmp / "frag-conv.docx")],
                   capture_output=True, text=True)
if r.returncode != 0:
    echec("fragmentation", f"code {r.returncode}\n{r.stdout}{r.stderr}")
txt_frag = textes_docx(tmp / "frag-conv.docx")["word/document.xml"]
if "{{ client_name }}" not in txt_frag or MOUSTACHE.findall(txt_frag):
    echec("fragmentation", f"marqueur coupé non converti : {txt_frag!r}")
ok("fragmentation: marqueur coupé en 3 runs converti")

# ── 9. Les autres modèles balisés se convertissent et se rendent ──────────
AUTRES = ["Approche de gestion.docx", "cahier de conception.docx",
          "Contrat de maintenance.docx", "Contrat partenariat.docx",
          "contrat-sous-traitance.docx", "Modèle CDC.docx"]
for nom_doc in AUTRES:
    src = DEPOT / "Modèles de docx" / nom_doc
    conv = tmp / ("conv-" + nom_doc)
    r = subprocess.run([sys.executable, str(INSTRUMENT), str(src), str(conv)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        echec(f"modèle {nom_doc}", f"conversion code {r.returncode}\n{r.stdout}{r.stderr}")
    for partie, txt in textes_docx(conv).items():
        if MOUSTACHE.findall(txt):
            echec(f"modèle {nom_doc}", f"moustaches restantes dans {partie}")
    with zipfile.ZipFile(src) as z:
        fixes = [n for n in z.namelist()
                 if n == "word/styles.xml" or re.match(r"word/(header|footer)\d+\.xml$", n)
                 or n.startswith("word/media/")]
    for membre in fixes:
        if octets(src, membre) != octets(conv, membre):
            echec(f"modèle {nom_doc}", f"{membre} modifié")
    dtpl = DocxTemplate(str(conv))
    dtpl.render({})          # variables absentes → vide, mais zéro résidu exigé
    vide_rendu = tmp / ("rendu-" + nom_doc)
    dtpl.save(str(vide_rendu))
    txt_r = textes_docx(vide_rendu)["word/document.xml"]
    if JINJA.findall(txt_r) or MOUSTACHE.findall(txt_r):
        echec(f"modèle {nom_doc}", f"résidus au rendu : {(JINJA.findall(txt_r) + MOUSTACHE.findall(txt_r))[:6]}")
    ok(f"modèle {nom_doc}: converti, préservé, rendu sans résidu")

# ── 9bis. CDC : les boucles imbriquées portent le contenu profond ─────────
ctx_cdc = {"functional_modules": [{
    "module_name": "GRC",
    "submodules": [{
        "submodule_name": "Prospection",
        "features": [{
            "feature_name": "Créer un prospect",
            "use_case": {
                "use_case_name": "Création d'une fiche prospect",
                "actors": "Agent commercial",
                "main_scenario_steps": [
                    {"step_number": "1", "step_description": "Ouvrir la fiche prospect"},
                    {"step_number": "2", "step_description": "Saisir les coordonnées"}],
                "alternative_scenarios": [
                    {"alt_step_number": "2a", "alt_description": "Le prospect existe déjà"}]}}]}]}]}
cdc_conv = tmp / "conv-Modèle CDC.docx"
dcdc = DocxTemplate(str(cdc_conv))
dcdc.render(ctx_cdc)
cdc_rendu = tmp / "cdc-profond.docx"
dcdc.save(str(cdc_rendu))
txt_cdc = textes_docx(cdc_rendu)["word/document.xml"]
for attendu in ["Ouvrir la fiche prospect", "Saisir les coordonnées",
                "Le prospect existe déjà", "Agent commercial"]:
    if attendu not in txt_cdc:
        echec("CDC imbriqué", f"contenu profond absent : {attendu}")
ok("CDC: 4 niveaux d'imbrication rendus (module→sous-module→feature→étapes)")

# ── 10. Refus d'une accolade hors convention (docxtpl la ferait exploser) ─
brace = tmp / "accolade.docx"
d = docx.Document()
d.add_paragraph("Un texte avec {marqueur_valide} et une { accolade perdue.")
d.save(str(brace))
r = subprocess.run([sys.executable, str(INSTRUMENT), str(brace), str(tmp / "b.docx")],
                   capture_output=True, text=True)
if r.returncode != 1 or "accolade" not in r.stdout.lower():
    echec("refus accolade", f"code {r.returncode}, sortie : {r.stdout!r}")
ok("refus accolade: { hors convention → code 1, nommée dans la sortie")

# ── 11. Refus du vide : docx sans marqueur → code 2 ───────────────────────
import docx
vide = tmp / "sans-marqueur.docx"
d = docx.Document()
d.add_paragraph("Document sans aucun marqueur.")
d.save(str(vide))
r = subprocess.run([sys.executable, str(INSTRUMENT), str(vide), str(tmp / "out.docx")],
                   capture_output=True, text=True)
if r.returncode != 2:
    echec("refus du vide", f"code {r.returncode} au lieu de 2")
ok("refus du vide: 0 marqueur → code 2")

# ── 12. Baliser : document nu + carte → gabarit moustache ─────────────────
BALISE = RACINE / "instruments" / "baliser_gabarit.py"
nu = tmp / "document-nu.docx"
d = docx.Document()
p = d.add_paragraph()
p.add_run("Contrat avec ")
p.add_run("ACME")            # littéral fragmenté entre runs, comme Word le fait
p.add_run(" SARL, signé le 5 mai. Paiement le 5 mai.")
d.save(str(nu))
carte = tmp / "carte.json"
carte.write_text(json.dumps([
    {"texte": "ACME SARL", "nom": "client_name"},
    {"texte": "5 mai", "nom": "date_paiement", "occurrences": [2]},
]))
r = subprocess.run([sys.executable, str(BALISE), str(nu), str(tmp / "balise.docx"),
                    "--carte", str(carte)], capture_output=True, text=True)
if r.returncode != 0:
    echec("balisage", f"code {r.returncode}\n{r.stdout}{r.stderr}")
txt_b = textes_docx(tmp / "balise.docx")["word/document.xml"]
if "{client_name}" not in txt_b:
    echec("balisage", f"littéral fragmenté non balisé : {txt_b!r}")
if "signé le 5 mai" not in txt_b or "Paiement le {date_paiement}" not in txt_b:
    echec("balisage: occurrences", f"restriction d'occurrence ignorée : {txt_b!r}")
ok("balisage: littéral fragmenté balisé, occurrence ciblée respectée")

carte_vide = tmp / "carte-vide.json"
carte_vide.write_text(json.dumps([{"texte": "TEXTE ABSENT DU DOCUMENT", "nom": "x"}]))
r = subprocess.run([sys.executable, str(BALISE), str(nu), str(tmp / "b2.docx"),
                    "--carte", str(carte_vide)], capture_output=True, text=True)
if r.returncode != 2 or "TEXTE ABSENT" not in r.stdout:
    echec("balisage: refus du vide", f"code {r.returncode}, sortie : {r.stdout!r}")
ok("balisage: entrée sans capture → code 2, nommée dans la sortie")

# ── 13. Chaîne complète sur le vrai Contrat de prestation ─────────────────
CARTE_CP = RACINE / "cartes" / "contrat-prestation.json"
src_cp = DEPOT / "Modèles de docx" / "Contrat de prestation.docx"
r = subprocess.run([sys.executable, str(BALISE), str(src_cp), str(tmp / "cp-balise.docx"),
                    "--carte", str(CARTE_CP)], capture_output=True, text=True)
if r.returncode != 0:
    echec("prestation: balisage", f"code {r.returncode}\n{r.stdout}{r.stderr}")
r = subprocess.run([sys.executable, str(INSTRUMENT), str(tmp / "cp-balise.docx"),
                    str(tmp / "cp-gabarit.docx")], capture_output=True, text=True)
if r.returncode != 0:
    echec("prestation: conversion", f"code {r.returncode}\n{r.stdout}{r.stderr}")
ctx_cp = {"contract_number": "CTR00099", "contract_date": "02/09/2026",
          "client_name": "M. ONANA", "client_company_name": "NKOULOU SARL",
          "project_name": "Refonte du portail RH", "total_amount_num": "1 200 000",
          "total_amount_text": "Un million deux cent mille"}
dcp = DocxTemplate(str(tmp / "cp-gabarit.docx"))
dcp.render(ctx_cp)
dcp.save(str(tmp / "cp-rendu.docx"))
txt_cp = textes_docx(tmp / "cp-rendu.docx")["word/document.xml"]
for attendu in ["CTR00099", "NKOULOU SARL", "Refonte du portail RH", "1 200 000"]:
    if attendu not in txt_cp:
        echec("prestation: rendu", f"valeur absente : {attendu}")
for interdit in ["CTR00005", "M. AZEBAZE", "750 000", "Globalys"]:
    if interdit in txt_cp:
        echec("prestation: rendu", f"donnée du contrat d'origine encore présente : {interdit}")
ok("prestation: chaîne carte → balisage → conversion → rendu, données d'origine purgées")

# ── 14. Le rendu se convertit en PDF (LibreOffice) ─────────────────────────
r = subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf",
                    "--outdir", str(tmp), str(rendu)],
                   capture_output=True, text=True, timeout=120)
pdf = tmp / "ptf-rendu.pdf"
if r.returncode != 0 or not pdf.exists() or pdf.stat().st_size < 10000:
    echec("pdf", f"code {r.returncode}, pdf={'présent' if pdf.exists() else 'absent'}")
ok("pdf: conversion LibreOffice aboutie")

if verifs == 0:
    echec("porte", "zéro vérification exécutée")
print(f"\nPORTE VERTE — {verifs} vérifications")
shutil.rmtree(tmp)
