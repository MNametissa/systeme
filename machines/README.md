
## Contrat de forme

`forme.json` fige la forme des gabarits — police unique, échelle de tailles,
palette fermée, puce, micro-textes. `instruments/normaliser_gabarit.py
source.docx sortie.docx --forme forme.json` l'applique ; la porte vérifie le
résultat sur le PDF rendu (`pdffonts` sans famille étrangère, fonds et tailles
dans le contrat, métadonnées renseignées). Appliqué à la source PTF ;
les 7 autres modèles restent à normaliser (vérification visuelle requise).
