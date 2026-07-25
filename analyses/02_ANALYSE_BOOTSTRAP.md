# Analyse — le bootstrap

**Lecteur** : moi, avant de modifier `bootstrap.sh` ou d'être tenté d'en faire
un skill.
**Tâche** : savoir pourquoi chaque étape existe et quelle défaillance elle
empêche.

## Pourquoi un script et pas un skill

Le bootstrap est entièrement déterministe : aucune décision en route. La
hiérarchie de force (D-002) impose alors le barreau 1 — un script qui échoue
bruyamment — et interdit le barreau 4 — un texte que la session peut
paraphraser, sauter ou réinterpréter. Un skill de bootstrap serait
cmar-bootstrap qui renaît.

## Ce que chaque étape empêche

| Étape | Défaillance empêchée |
|---|---|
| `git init` + commit initial | travail hors historique, état non reprenable |
| `specify init` | specs libres → documents creux ; le format contraint est le barreau 2 |
| `.systeme/` copié | règles et instruments absents du dépôt → la session improvise |
| `CLAUDE.md` (du template) | posture réexpliquée à chaque session, dérive entre sessions |
| `DECISIONS.md` vierge | décisions prises en session et mortes avec elle (D-005) |
| `PLAN.md` vierge | le hook le lisait et le template exigeait d'y cocher, mais rien ne le créait : le journal de reprise n'avait pas de maison — la session suivante repartait de mémoire |
| `decision_gate.sh` dans le hook Stop | la spec 04 détectait la décision non journalisée « par question directe à la session » : auto-certification par le processus qui affabule (D-019) |
| `Makefile` avec `check` dès le commit 1 | la porte « arrivera plus tard » — elle n'arrive jamais ; stocktake en est la preuve |
| Hook `SessionStart` | session qui démarre sans lire l'état → re-propose l'approche rejetée |
| Hook `Stop` sur `make check` | porte volontaire = instruction déguisée (D-013) ; c'est le chaînon qui manquait aux 7 portes de stocktake |

## Limites connues, assumées

- Les flags de `specify` bougent (v0.10 : `--integration`) : le script avertit
  et n'invente pas — vérifier `specify init --help` en cas d'échec.
- Superpowers s'installe via `/plugin` (menu interactif) : hors script,
  volontairement — un script qui simule une interaction est fragile.
- Le commit initial échoue sans identité git configurée : voulu, le script
  continue et le dit.
- Le hook Stop ne protège pas des sous-agents ni d'un échec silencieux de
  hook (limite documentée de Claude Code) : la CI reste le dernier verrou —
  à câbler dès que le dépôt a un remote.

## Évolution

Toute modification du bootstrap qui ajoute une étape doit dire, dans ce
fichier, quelle défaillance constatée elle empêche. Une étape sans défaillance
associée est de la liturgie — on ne l'ajoute pas.
