# systeme — mon socle de production assistée

Dépôt personnel. Renommer à ma guise ; rien ne dépend du nom.

**Lecteur** : moi, dans six mois, ou une session Claude qui travaille sur ce
dépôt lui-même.
**Tâche** : comprendre l'organisation en une minute et démarrer un projet en
dix.

## Contenu

| Chemin | Rôle |
|---|---|
| `DECISIONS.md` | journal des décisions du système lui-même (27 entrées, statuts vivants) |
| `bootstrap.sh` | démarre un projet : git, spec-kit, journal, porte, hooks, CLAUDE.md |
| `templates/CLAUDE.project.md` | posture permanente copiée dans chaque projet |
| `specs/` | les specs du système (01 vue d'ensemble → 06 essai témoin) |
| `analyses/` | pourquoi les anciens skills sont morts, pourquoi le bootstrap est un script |
| `instruments/` | scripts de fermeture de population et à venir |
| `Définir-les-skills-….md` | archive : la conversation d'origine (2026-07-25) qui a produit ce dépôt — genèse, pas référence ; en cas de conflit, `DECISIONS.md` et les specs font foi |

## Démarrer un projet

```bash
bash bootstrap.sh mon-projet    # ou `bash bootstrap.sh .` dans un dossier existant
```

Puis en session Claude Code : `/speckit-specify` → reconnaissance par
instruments → `/speckit-plan` (décisions au journal) → `/speckit-tasks` →
tranches (voir `specs/01_SPEC_SYSTEME.md`).

## État (2026-07-25)

Six décisions `à éprouver` (D-006, D-007, D-008, D-009, D-012, D-017) attendent le
verdict de l'essai témoin sur stocktake (`specs/06_ESSAI_TEMOIN.md`). Ne pas
bootstrapper de vrai projet avant.
