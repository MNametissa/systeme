# Porte du dépôt système (D-013 appliqué à soi-même).
# check échoue = la session ne se clôt pas (hook Stop).

check: syntaxe une-page refs
	@echo "PORTE : OK"

# Les scripts parsent ; l'instrument compile.
syntaxe:
	@bash -n bootstrap.sh
	@bash -n instruments/decision_gate.sh
	@python3 -m py_compile instruments/close_float_population.py

# D-015 : une spec = une page (80 lignes max, marge comprise).
une-page:
	@err=0; for f in specs/*.md templates/*.md; do \
	  n=$$(wc -l < $$f); \
	  if [ $$n -gt 80 ]; then echo "PORTE : $$f fait $$n lignes (>80) — doctrine qui renaît, on coupe (D-015)"; err=1; fi; \
	done; exit $$err

# Les specs ne citent que des fichiers qui existent (le nom du journal a déjà divergé une fois).
refs:
	@if grep -rn "00_DECISIONS" specs/ templates/ bootstrap.sh 2>/dev/null; then \
	  echo "PORTE : référence à 00_DECISIONS.md — le journal s'appelle DECISIONS.md"; exit 1; fi
	@for f in DECISIONS.md bootstrap.sh templates/CLAUDE.project.md \
	  instruments/close_float_population.py instruments/decision_gate.sh; do \
	  [ -f $$f ] || { echo "PORTE : $$f manquant"; exit 1; }; done

.PHONY: check syntaxe une-page refs
