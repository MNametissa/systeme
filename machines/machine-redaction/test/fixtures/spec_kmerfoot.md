# Feature Specification: Application mobile de suivi des championnats et paris

**Feature Branch**: `001-suivi-paris`
**Created**: 2026-07-30
**Status**: Draft

## User Scenarios & Testing

### Primary User Story
Un parieur suit en direct les championnats de football camerounais et place
des paris sur les matchs à venir depuis son mobile, avec dépôt et retrait
par Mobile Money.

### Acceptance Scenarios
1. **Given** un utilisateur inscrit et vérifié, **When** il sélectionne un
   match à venir et mise 500 FCFA, **Then** le pari est enregistré et son
   solde débité.
2. **Given** un match terminé, **When** le résultat est officiel, **Then**
   les gains sont crédités automatiquement.

### Edge Cases
- Que se passe-t-il si le match est reporté après la prise de paris ?
- Comment le système gère-t-il un dépôt Mobile Money interrompu ?

## Requirements

### Functional Requirements
- **FR-001**: Le système DOIT afficher calendriers, scores en temps réel et
  classements des championnats suivis.
- **FR-002**: Le système DOIT permettre la prise de paris avant-match et en
  direct avec cotes affichées.
- **FR-003**: Le système DOIT régler automatiquement les gains à l'officialisation
  du résultat.
- **FR-004**: Le système DOIT permettre dépôts et retraits via MTN MoMo et
  Orange Money.
- **FR-005**: Le système DOIT vérifier l'identité de l'utilisateur (KYC) avant
  le premier retrait.
- **FR-006**: Le back-office DOIT permettre la gestion des compétitions, des
  cotes et du risque.

### Key Entities
- **Utilisateur**: parieur inscrit, portefeuille, statut KYC.
- **Match**: rencontre d'un championnat, cotes, résultat officiel.
- **Pari**: mise d'un utilisateur sur un marché d'un match.
